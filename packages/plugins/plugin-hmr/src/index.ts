import type { Compiler } from "@rspack/core";
import { resolve } from "path";
import { spawn, type ChildProcess } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "os";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

/** 未配置 launch 时，按系统尝试的默认 Chrome 可执行路径（按顺序取第一个存在的） */
const DEFAULT_CHROME_PATHS: Record<string, string[]> = {
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ],
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ],
};

/** 未配置 launch 时，按系统尝试的默认 Firefox 可执行路径（按顺序取第一个存在的） */
const DEFAULT_FIREFOX_PATHS: Record<string, string[]> = {
  win32: [
    "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
    "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe",
  ],
  darwin: ["/Applications/Firefox.app/Contents/MacOS/firefox"],
  linux: ["/usr/bin/firefox", "/usr/bin/firefox-esr"],
};

export interface HmrPluginOptions {
  distPath: string;
  autoOpen?: boolean;
  browser?: "chrome" | "firefox";
  /** Chrome executable path. From config.launch.chrome; else tries default OS paths. */
  chromePath?: string;
  /** Firefox executable path. From config.launch.firefox; else tries default OS paths. */
  firefoxPath?: string;
  wsPort?: number;
  enableReload?: boolean;
}

let chromeProcess: ChildProcess | null = null;
let firefoxProcess: ChildProcess | null = null;
let userDataDir: string | null = null;
let reloadManagerPath: string | null = null;
let browserLaunched = false;
let isCleaningUp = false;
let cleanupHandlersRegistered = false;
let wsServer: WebSocketServer | null = null;
let httpServer: ReturnType<typeof createServer> | null = null;

function normalizeForChrome(p: string): string {
  return p.replace(/\\/g, "/");
}

async function ensureDistReady(distPath: string, timeoutMs = 15000): Promise<boolean> {
  const manifestPath = resolve(distPath, "manifest.json");
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(manifestPath) && statSync(manifestPath).size > 0) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`dist not ready: ${manifestPath}`);
}

/**
 * 解析浏览器可执行路径：用户传入的 launch 路径优先，未传时才使用系统默认路径。
 */
function getBrowserPath(
  browser: "chrome" | "firefox",
  options: { chromePath?: string; firefoxPath?: string }
): string | null {
  const userPath = browser === "chrome" ? options.chromePath : options.firefoxPath;
  if (userPath != null && userPath.trim() !== "") return userPath.trim();

  const platform = process.platform;
  const paths = browser === "chrome"
    ? DEFAULT_CHROME_PATHS[platform]
    : DEFAULT_FIREFOX_PATHS[platform];
  if (!paths) return null;
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

function startWebSocketServer(port: number): WebSocketServer {
  if (wsServer) return wsServer;
  httpServer = createServer();
  wsServer = new WebSocketServer({ server: httpServer });
  wsServer.on("connection", (ws: WebSocket) => {
    if (ws.readyState === WebSocket.OPEN) ws.send("connected");
  });
  httpServer.listen(port, () => {
    console.log(`WebSocket started: ws://localhost:${port}`);
  });
  return wsServer;
}

export function notifyReload(): void {
  if (!wsServer) return;
  wsServer.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) client.send("reload-extension");
  });
}

async function createReloadManagerExtension(wsPort: number): Promise<string> {
  const extPath = resolve(tmpdir(), "reload-manager-extension");
  const bgJsPath = resolve(extPath, "bg.js");
  const portCachePath = resolve(extPath, ".port-cache");
  let needsUpdate = true;
  if (existsSync(portCachePath)) {
    try {
      const cached = parseInt(await readFile(portCachePath, "utf-8"), 10);
      if (cached === wsPort) needsUpdate = false;
    } catch {
      // ignore
    }
  }
  await mkdir(extPath, { recursive: true });
  if (needsUpdate) {
    await writeFile(
      resolve(extPath, "manifest.json"),
      JSON.stringify(
        { manifest_version: 3, name: "Reload Manager", version: "1.0", permissions: ["management", "tabs"], background: { service_worker: "bg.js" } },
        null,
        2
      ),
      "utf-8"
    );
    const bgJs = `
let ws=null,rt=null;
function connect(){
  try{if(ws)ws.close();
  ws=new WebSocket("ws://localhost:${wsPort}");
  ws.onopen=()=>{if(rt)clearInterval(rt);rt=null;};
  ws.onmessage=async(e)=>{
    if(e.data==="connected")return;
    if(e.data==="reload-extension"){
      const all=await chrome.management.getAll();
      for(const x of all){
        if(x.enabled&&x.installType==="development"&&x.id!==chrome.runtime.id){
          try{await chrome.management.setEnabled(x.id,false);
          await new Promise(r=>setTimeout(r,100));
          await chrome.management.setEnabled(x.id,true);}catch(err){}
        }
      }
    }
  };
  ws.onclose=()=>{if(!rt)rt=setInterval(connect,3000);};
  }catch(err){}
}
connect();
`;
    await writeFile(bgJsPath, bgJs, "utf-8");
    await writeFile(portCachePath, String(wsPort), "utf-8");
  }
  return extPath;
}

async function cleanup(): Promise<void> {
  if (isCleaningUp) return;
  isCleaningUp = true;
  if (chromeProcess && !chromeProcess.killed) {
    chromeProcess.kill("SIGTERM");
    await new Promise<void>((r) => {
      const t = setTimeout(() => {
        if (chromeProcess && !chromeProcess.killed) chromeProcess.kill("SIGKILL");
        r();
      }, 2000);
      chromeProcess?.on("exit", () => {
        clearTimeout(t);
        r();
      });
    });
    chromeProcess = null;
  }
  if (firefoxProcess && !firefoxProcess.killed) {
    firefoxProcess.kill("SIGTERM");
    firefoxProcess = null;
  }
  if (reloadManagerPath && existsSync(reloadManagerPath)) {
    await rm(reloadManagerPath, { recursive: true, force: true }).catch(() => {});
    reloadManagerPath = null;
  }
  if (userDataDir && existsSync(userDataDir)) {
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
    userDataDir = null;
  }
  if (wsServer) {
    wsServer.close();
    wsServer = null;
  }
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
}

async function launchBrowser(options: HmrPluginOptions): Promise<void> {
  const {
    distPath,
    browser = "chrome",
    chromePath,
    firefoxPath,
    wsPort = 23333,
    enableReload = true,
  } = options;
  const browserBinary = getBrowserPath(browser, { chromePath, firefoxPath });
  if (!browserBinary) {
    const launchKey = browser === "chrome" ? "launch.chrome" : "launch.firefox";
    console.warn(
      `${browser} path not found; set ${launchKey} in ext.config, or install the browser at a default location`
    );
    return;
  }
  if (browser === "firefox") {
    firefoxProcess = spawn(`web-ext run --source-dir=${distPath} --target firefox-desktop --firefox="${browserBinary}"`, { shell: true, stdio: "inherit" });
    firefoxProcess.on("exit", () => {
      firefoxProcess = null;
    });
    return;
  }
  userDataDir = resolve(tmpdir(), `chrome-dev-${Date.now()}`);
  await mkdir(userDataDir, { recursive: true });
  await ensureDistReady(distPath).catch((e: Error) => {
    console.error(e.message);
  });
  if (enableReload) {
    startWebSocketServer(wsPort);
    reloadManagerPath = await createReloadManagerExtension(wsPort);
  }
  const extPathChrome = normalizeForChrome(distPath);
  const reloadChrome = reloadManagerPath ? normalizeForChrome(reloadManagerPath) : "";
  const args = [
    `--user-data-dir=${normalizeForChrome(userDataDir)}`,
    "--no-first-run",
    "--no-default-browser-check",
  ];
  if (reloadManagerPath) {
    args.push(`--disable-extensions-except=${extPathChrome},${reloadChrome}`, `--load-extension=${extPathChrome}`, `--load-extension=${reloadChrome}`);
  } else {
    args.push(`--load-extension=${extPathChrome}`);
  }
  args.push("chrome://extensions/");
  chromeProcess = spawn(browserBinary, args, { stdio: ["ignore", "ignore", "ignore"] });
  chromeProcess.on("exit", () => {
    chromeProcess = null;
  });
  console.log("Chrome started, extension loaded");
}

function statsHasErrors(stats: unknown): boolean {
  if (!stats || typeof stats !== "object") return false;
  const s = stats as { hasErrors?: () => boolean };
  return Boolean(s.hasErrors?.());
}

/**
 * Rspack 插件：在 build watch 模式下，首次编译完成后启动浏览器，后续编译触发热重载。
 * 通过 tools.rspack.appendPlugins(hmrPlugin(options)) 注册，确保收到真实 compiler。
 */
export function hmrPlugin(options: HmrPluginOptions) {
  const {
    distPath,
    autoOpen = true,
    browser = "chrome",
    wsPort = 23333,
    enableReload = true,
  } = options;

  return {
    name: "extenzo-hmr",
    apply(compiler: Compiler) {
      const hooks = compiler?.hooks;
      if (!hooks?.done) return;

      if (enableReload) {
        let firstReload = true;
        hooks.done.tap("extenzo-hmr-reload", async (stats) => {
          if (firstReload) {
            firstReload = false;
            return;
          }
          await new Promise((r) => setTimeout(r, 500));
          notifyReload();
        });
      }

      if (!cleanupHandlersRegistered) {
        cleanupHandlersRegistered = true;
        const onSignal = () => {
          cleanup().then(() => process.exit(0)).catch(() => process.exit(1));
        };
        process.on("SIGINT", onSignal);
        process.on("SIGTERM", onSignal);
      }

      hooks.done.tap("extenzo-hmr", async (stats) => {
        if (!autoOpen || browserLaunched) return;
        if (statsHasErrors(stats)) return;
        browserLaunched = true;
        await new Promise((r) => setTimeout(r, 1000));
        try {
          await launchBrowser({
            distPath,
            autoOpen,
            browser,
            chromePath: options.chromePath,
            firefoxPath: options.firefoxPath,
            wsPort,
            enableReload,
          });
        } catch (e) {
          console.error("Failed to launch browser:", e);
        }
      });
    },
  };
}
