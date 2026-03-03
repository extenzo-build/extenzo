import type { Compiler } from "@rspack/core";
import { resolve } from "path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { rm } from "node:fs/promises";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { LaunchTarget, ChromiumLaunchTarget } from "@extenzo/core";
import { log, logDone, logDoneTimed, warn, error } from "@extenzo/core";
import { runChromiumRunner } from "./chromium-runner";
import type { ChromiumRunnerOptions } from "./chromium-runner";

/** Default Chrome executable paths when launch not configured (first existing wins) */
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

/** Default Edge executable paths when launch not configured (first existing wins) */
const DEFAULT_EDGE_PATHS: Record<string, string[]> = {
  win32: [
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ],
  darwin: ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"],
  linux: ["/usr/bin/microsoft-edge", "/usr/bin/microsoft-edge-stable"],
};

/** Default Brave executable paths when launch not configured (first existing wins) */
const DEFAULT_BRAVE_PATHS: Record<string, string[]> = {
  win32: [
    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  ],
  darwin: ["/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"],
  linux: ["/usr/bin/brave-browser", "/usr/bin/brave"],
};

/** Default Vivaldi executable paths when launch not configured (first existing wins) */
const DEFAULT_VIVALDI_PATHS: Record<string, string[]> = {
  win32: [
    "C:\\Program Files\\Vivaldi\\Application\\vivaldi.exe",
    "C:\\Program Files (x86)\\Vivaldi\\Application\\vivaldi.exe",
  ],
  darwin: ["/Applications/Vivaldi.app/Contents/MacOS/Vivaldi"],
  linux: ["/usr/bin/vivaldi-stable", "/usr/bin/vivaldi"],
};

/** Default Opera executable paths when launch not configured (first existing wins) */
const DEFAULT_OPERA_PATHS: Record<string, string[]> = {
  win32: [
    "C:\\Program Files\\Opera\\launcher.exe",
    "C:\\Program Files (x86)\\Opera\\launcher.exe",
  ],
  darwin: ["/Applications/Opera.app/Contents/MacOS/Opera"],
  linux: ["/usr/bin/opera", "/usr/bin/opera-stable"],
};

/** Default Santa executable paths when launch not configured (first existing wins) */
const DEFAULT_SANTA_PATHS: Record<string, string[]> = {
  win32: [
    "C:\\Program Files\\Santa Browser\\Application\\Santa Browser.exe",
    "C:\\Program Files (x86)\\Santa Browser\\Application\\Santa Browser.exe",
  ],
  darwin: ["/Applications/Santa Browser.app/Contents/MacOS/Santa Browser"],
  linux: ["/usr/bin/santa-browser"],
};

/** Default Firefox executable paths when launch not configured (first existing wins) */
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
  browser?: LaunchTarget;
  /** Chrome executable path. From config.launch.chrome; else tries default OS paths. */
  chromePath?: string;
  /** Edge executable path. From config.launch.edge; else tries default OS paths. */
  edgePath?: string;
  /** Brave executable path. From config.launch.brave; else tries default OS paths. */
  bravePath?: string;
  /** Vivaldi executable path. From config.launch.vivaldi; else tries default OS paths. */
  vivaldiPath?: string;
  /** Opera executable path. From config.launch.opera; else tries default OS paths. */
  operaPath?: string;
  /** Santa executable path. From config.launch.santa; else tries default OS paths. */
  santaPath?: string;
  /** Firefox executable path. From config.launch.firefox; else tries default OS paths. */
  firefoxPath?: string;
  /** Persist chromium user data dir between runs. */
  persist?: boolean;
  wsPort?: number;
  enableReload?: boolean;
  /** When true (default), content entry change triggers reload manager to refresh the active tab. */
  autoRefreshContentPage?: boolean;
}

/** Browser paths only; used by getBrowserPath and internal callers */
type LaunchPathOptions = Pick<
  HmrPluginOptions,
  | "chromePath"
  | "edgePath"
  | "bravePath"
  | "vivaldiPath"
  | "operaPath"
  | "santaPath"
  | "firefoxPath"
>;

/** For build -l: launch browser and load built output only; no reloadManager, no WebSocket */
export type LaunchOnlyOptions = Pick<
  HmrPluginOptions,
  | "distPath"
  | "browser"
  | "chromePath"
  | "edgePath"
  | "bravePath"
  | "vivaldiPath"
  | "operaPath"
  | "santaPath"
  | "firefoxPath"
  | "persist"
>;

/** Optional Chromium runner for tests; when set, used instead of runChromiumRunner. */
export type ChromiumRunnerOverride = (
  opts: ChromiumRunnerOptions
) => Promise<{ exit: () => Promise<void> }>;

/** Runner returned by web-ext cmd.run; call exit() during cleanup */
let extensionRunner: { exit: () => Promise<void> } | null = null;
let reloadManagerPath: string | null = null;
let browserLaunched = false;
let isCleaningUp = false;
let cleanupHandlersRegistered = false;
let wsServer: WebSocketServer | null = null;
let httpServer: ReturnType<typeof createServer> | null = null;
let lastDistPath: string | null = null;
let chromiumUserDataDirPath: string | null = null;
let lastChromiumBrowser: ChromiumLaunchTarget = "chrome";
let persistEnabled = false;

/** Exported for tests. */
export async function ensureDistReady(
  distPath: string,
  timeoutMs = 15000
): Promise<boolean> {
  const manifestPath = resolve(distPath, "manifest.json");
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(manifestPath) && statSync(manifestPath).size > 0) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`dist not ready: ${manifestPath}`);
}

/**
 * Resolve browser executable path: user launch path first, then system default paths.
 * Exported for tests.
 */
export function getBrowserPath(
  browser: LaunchTarget,
  options: LaunchPathOptions
): string | null {
  const userPath = getLaunchPathFromOptions(browser, options);
  if (userPath != null && userPath.trim() !== "") return userPath.trim();

  const platform = process.platform;
  const paths = buildDefaultPaths(browser, platform);
  if (!paths) return null;
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

/** Exported for tests. */
export function getLaunchPathFromOptions(
  browser: LaunchTarget,
  options: LaunchPathOptions
): string | undefined {
  const map: Record<LaunchTarget, string | undefined> = {
    chrome: options.chromePath,
    edge: options.edgePath,
    brave: options.bravePath,
    vivaldi: options.vivaldiPath,
    opera: options.operaPath,
    santa: options.santaPath,
    firefox: options.firefoxPath,
  };
  return map[browser];
}

/** Exported for tests. */
export function buildDefaultPaths(
  browser: LaunchTarget,
  platform: string
): string[] | undefined {
  if (browser === "chrome") return DEFAULT_CHROME_PATHS[platform];
  if (browser === "edge") return DEFAULT_EDGE_PATHS[platform];
  if (browser === "brave") return DEFAULT_BRAVE_PATHS[platform];
  if (browser === "vivaldi") {
    const base = DEFAULT_VIVALDI_PATHS[platform];
    if (platform === "win32") {
      const userProfile = process.env.USERPROFILE;
      if (userProfile) {
        return [
          resolve(userProfile, "AppData\\Local\\Vivaldi\\Application\\vivaldi.exe"),
          ...(base ?? []),
        ];
      }
    }
    return base;
  }
  if (browser === "opera") return DEFAULT_OPERA_PATHS[platform];
  if (browser === "santa") return DEFAULT_SANTA_PATHS[platform];
  return DEFAULT_FIREFOX_PATHS[platform];
}

/** Exported for tests. */
export function isChromiumBrowser(browser: LaunchTarget): browser is ChromiumLaunchTarget {
  return browser !== "firefox";
}

function startWebSocketServer(port: number, startTime?: number): WebSocketServer {
  if (wsServer) return wsServer;
  const t0 = startTime ?? performance.now();
  httpServer = createServer(handleHttpRequest);
  wsServer = new WebSocketServer({ server: httpServer });
  wsServer.on("connection", (ws: WebSocket) => {
    if (ws.readyState === WebSocket.OPEN) ws.send("connected");
  });
  httpServer.listen(port, () => {
    const ms = Math.round(performance.now() - t0);
    logDoneTimed("Hot reload WebSocket: ws://localhost:" + port, ms);
  });
  return wsServer;
}

/** Extension error payload from runtime (entry, type, message, stack, time, etc.). */
type ExtensionErrorPayload = {
  entry?: string;
  type?: string;
  message?: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  time?: number;
};

const RED = "\x1b[31m";
const RED_RESET = "\x1b[0m";

function formatExtensionErrorForTerminal(payload: ExtensionErrorPayload): string {
  const entry = typeof payload.entry === "string" && payload.entry.trim() ? payload.entry.trim() : "unknown";
  const errorType = typeof payload.type === "string" && payload.type.trim() ? payload.type.trim() : "error";
  const timeStr =
    payload.time != null && Number.isFinite(Number(payload.time))
      ? new Date(Number(payload.time)).toLocaleString()
      : new Date().toLocaleString();
  const message = payload.message != null ? String(payload.message) : "Unknown error";
  const stack = payload.stack && String(payload.stack).trim() ? String(payload.stack).trim() : "";
  const filename = payload.filename ? String(payload.filename) : "";
  const lineno = payload.lineno != null && Number.isFinite(Number(payload.lineno)) ? Number(payload.lineno) : undefined;
  const colno = payload.colno != null && Number.isFinite(Number(payload.colno)) ? Number(payload.colno) : undefined;
  const loc = filename ? (filename + (lineno != null ? `:${lineno}` : "") + (colno != null ? `:${colno}` : "")) : "";
  const lines: string[] = [
    "--- Extenzo extension error ---",
    `source: ${entry}`,
    `type: ${errorType}`,
    `time: ${timeStr}`,
    `message: ${message}`,
  ];
  if (loc) lines.push(`location: ${loc}`);
  if (stack) lines.push(`stack:\n${stack}`);
  lines.push("---------------------------");
  return lines.join("\n");
}

function logExtensionErrorToTerminal(payload: ExtensionErrorPayload): void {
  const text = formatExtensionErrorForTerminal(payload);
  const w = process.stderr.write.bind(process.stderr);
  for (const line of text.split("\n")) {
    w(RED + line + RED_RESET + "\n", "utf8");
  }
}

function handleHttpRequest(
  req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse
): void {
  if (req.method === "POST" && req.url === "/extenzo-error") {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body) as ExtensionErrorPayload;
        if (payload && (payload.entry != null || payload.message != null)) {
          logExtensionErrorToTerminal(payload);
        }
      } catch {
        // ignore parse error
      }
      res.writeHead(204).end();
    });
    return;
  }
  res.writeHead(404).end();
}

/** Message "reload-extension": dev extension calls chrome.runtime.reload(). "toggle-extension": reload manager does disable+enable. "toggle-extension-refresh-tab": same + refresh active tab (only when content entry changed). */
export function notifyReload(
  kind: "reload-extension" | "toggle-extension",
  opts?: { refreshTab?: boolean }
): void {
  if (!wsServer) return;
  const message =
    kind === "toggle-extension" && opts?.refreshTab ? "toggle-extension-refresh-tab" : kind;
  wsServer.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  });
  logDone("hotreload success", message, new Date().toLocaleString());
}

/** Entry names that require runtime.reload; only background. Content and others use disable+enable. */
const RELOAD_ENTRY_NAMES = new Set(["background"]);
/** Entry names that inject into pages; when they change, reload manager should refresh the active tab. */
const CONTENT_ENTRY_NAMES = new Set(["content"]);

/** Rspack compilation proxy: entrypoints Map, Entrypoint has chunks (Chunk[]), Chunk has hash. */
type CompilationLike = {
  entrypoints?: ReadonlyMap<string, EntrypointLike>;
};
type EntrypointLike = {
  chunks?: ReadonlyArray<{ hash?: string }>;
  getFiles?: () => ReadonlyArray<string>;
};

function getCompilationFromStats(stats: unknown): CompilationLike | null {
  if (!stats || typeof stats !== "object") return null;
  const comp = (stats as { compilation?: CompilationLike }).compilation;
  return comp && typeof comp === "object" ? comp : null;
}

/** Build signature from an entrypoint: prefer chunk hashes, else filenames from getFiles(). No toJson. */
function getEntrypointSignature(entrypoint: EntrypointLike | undefined, _entryName: string): string | null {
  if (!entrypoint) return null;
  const hashes: string[] = [];
  if (entrypoint.chunks && Array.isArray(entrypoint.chunks)) {
    for (const c of entrypoint.chunks) {
      if (c?.hash) hashes.push(c.hash);
    }
  }
  if (hashes.length > 0) {
    hashes.sort();
    return hashes.join(",");
  }
  const getFiles = entrypoint.getFiles;
  if (typeof getFiles === "function") {
    try {
      const files = getFiles();
      if (files && files.length > 0) {
        const list = [...files].sort();
        return list.join(",");
      }
    } catch {
      // proxy may throw
    }
  }
  return null;
}

/** Fast path: use compilation.entrypoints + chunk hash (or getFiles) to avoid stats.toJson(). */
function getReloadEntriesSignatureFromCompilation(compilation: CompilationLike): string | null {
  const entrypoints = compilation.entrypoints;
  if (!entrypoints || typeof entrypoints.get !== "function") return null;
  const hashes: string[] = [];
  for (const name of RELOAD_ENTRY_NAMES) {
    const sig = getEntrypointSignature(entrypoints.get(name), name);
    if (sig) hashes.push(sig);
  }
  return hashes.length > 0 ? hashes.sort().join("|") : null;
}

/** Fast path for content entry signature. */
function getContentEntriesSignatureFromCompilation(compilation: CompilationLike): string | null {
  const entrypoints = compilation.entrypoints;
  if (!entrypoints || typeof entrypoints.get !== "function") return null;
  const hashes: string[] = [];
  for (const name of CONTENT_ENTRY_NAMES) {
    const sig = getEntrypointSignature(entrypoints.get(name), name);
    if (sig) hashes.push(sig);
  }
  return hashes.length > 0 ? hashes.sort().join("|") : null;
}

/** Collect hash of chunks for background entry from compilation; only background triggers full reload. No toJson. */
function getReloadEntriesSignature(stats: unknown): string | null {
  const compilation = getCompilationFromStats(stats);
  if (!compilation) return null;
  return getReloadEntriesSignatureFromCompilation(compilation);
}

/** Collect hash of content entry chunks; when this changes, reload manager should refresh active tab. No toJson. */
function getContentEntriesSignature(stats: unknown): string | null {
  const compilation = getCompilationFromStats(stats);
  if (!compilation) return null;
  return getContentEntriesSignatureFromCompilation(compilation);
}

let lastReloadSignature: string | null = null;
let lastContentSignature: string | null = null;

/** Decide reload kind: if we can detect background change → reload-extension; else → toggle-extension (default, enable/disable). No toJson. */
export function getReloadKind(stats: unknown): "reload-extension" | "toggle-extension" {
  const sig = getReloadEntriesSignature(stats);
  if (sig === null) return "toggle-extension";
  const useReload = lastReloadSignature === null || sig !== lastReloadSignature;
  lastReloadSignature = sig;
  return useReload ? "reload-extension" : "toggle-extension";
}

/** True if content entry chunks changed (used to decide whether reload manager should refresh active tab). Returns false on first build. */
export function isContentChanged(stats: unknown): boolean {
  const sig = getContentEntriesSignature(stats);
  const changed = sig !== null && lastContentSignature !== null && sig !== lastContentSignature;
  if (sig !== null) lastContentSignature = sig;
  return changed;
}

/**
 * Create a standalone WebSocket server for e2e: same protocol as HMR (connected + reload-extension).
 * Exported for tests. Does not use or mutate the global wsServer.
 */
export function createTestWsServer(
  port: number
): Promise<{
  close: () => Promise<void>;
  notifyReload: () => void;
}> {
  const http = createServer();
  const wss = new WebSocketServer({ server: http });
  wss.on("connection", (ws: WebSocket) => {
    if (ws.readyState === WebSocket.OPEN) ws.send("connected");
  });
  return new Promise((resolve, reject) => {
    http.listen(port, () => {
      resolve({
        close: () =>
          new Promise((done) => {
            wss.close(() => {
              http.close(() => done());
            });
          }),
        notifyReload() {
          wss.clients.forEach((client: WebSocket) => {
            if (client.readyState === WebSocket.OPEN) client.send("reload-extension");
          });
        },
      });
    });
    http.on("error", reject);
  });
}

/** Exported for tests. */
export function getCacheTempRoot(distPath: string): string {
  return resolve(distPath, "..", "cache", "temp");
}

/** Exported for tests. */
export function getChromiumUserDataDir(
  distPath: string,
  browser: ChromiumLaunchTarget
): string {
  return resolve(getCacheTempRoot(distPath), `${browser}-user-data`);
}

/** Exported for tests. */
export function getReloadManagerPath(distPath: string): string {
  return resolve(getCacheTempRoot(distPath), "reload-manager-extension");
}

/** Exported for tests. */
export function findExistingReloadManager(distPath: string): string | null {
  const tempRoot = getCacheTempRoot(distPath);
  if (!existsSync(tempRoot)) return null;
  const extPath = getReloadManagerPath(distPath);
  const manifestPath = resolve(extPath, "manifest.json");
  const bgPath = resolve(extPath, "bg.js");
  if (existsSync(manifestPath) && existsSync(bgPath)) return extPath;
  return null;
}

async function createReloadManagerExtension(
  wsPort: number,
  distPath: string
): Promise<string> {
  const extPath = getReloadManagerPath(distPath);
  const bgJsPath = resolve(extPath, "bg.js");
  const portCachePath = resolve(extPath, ".port-cache");
  const scriptVersionPath = resolve(extPath, ".script-version");
  const RELOAD_MANAGER_SCRIPT_VERSION = 2;
  let needsUpdate = true;
  if (existsSync(portCachePath) && existsSync(scriptVersionPath)) {
    try {
      const cachedPort = parseInt(await readFile(portCachePath, "utf-8"), 10);
      const cachedVer = parseInt(await readFile(scriptVersionPath, "utf-8"), 10);
      if (cachedPort === wsPort && cachedVer === RELOAD_MANAGER_SCRIPT_VERSION) needsUpdate = false;
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
function canReloadTab(tab){
  if(!tab||!tab.url)return false;
  const u=tab.url;
  return u.startsWith("http://")||u.startsWith("https://")||u.startsWith("file://");
}
function connect(){
  try{if(ws)ws.close();
  ws=new WebSocket("ws://localhost:${wsPort}");
  ws.onopen=()=>{if(rt)clearInterval(rt);rt=null;};
  ws.onmessage=async(e)=>{
    if(e.data==="connected")return;
    if(e.data==="reload-extension")return;
    const refreshTab=e.data==="toggle-extension-refresh-tab";
    if(e.data==="toggle-extension"||refreshTab){
      const all=await chrome.management.getAll();
      for(const x of all){
        if(x.enabled&&x.installType==="development"&&x.id!==chrome.runtime.id){
          try{await chrome.management.setEnabled(x.id,false);
          await new Promise(r=>setTimeout(r,100));
          await chrome.management.setEnabled(x.id,true);}catch(err){}
        }
      }
      if(refreshTab){
        await new Promise(r=>setTimeout(r,200));
        try{
          const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
          if(tab?.id&&canReloadTab(tab))await chrome.tabs.reload(tab.id);
        }catch(err){}
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
    await writeFile(scriptVersionPath, String(RELOAD_MANAGER_SCRIPT_VERSION), "utf-8");
  }
  return extPath;
}

async function cleanup(): Promise<void> {
  if (isCleaningUp) return;
  isCleaningUp = true;
  if (extensionRunner) {
    await extensionRunner.exit();
    extensionRunner = null;
  }
  const userDataDir =
    chromiumUserDataDirPath ??
    (lastDistPath ? getChromiumUserDataDir(lastDistPath, lastChromiumBrowser) : null);
  if (!persistEnabled && userDataDir && existsSync(userDataDir)) {
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
  chromiumUserDataDirPath = null;
  if (reloadManagerPath) {
    reloadManagerPath = null;
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

/**
 * Start Firefox and load extension via web-ext cmd.run (dynamic import, no spawn/npx).
 * When Firefox is closed, runs onExit so the terminal task can terminate.
 * See: https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-run
 */
async function runFirefoxWebExt(
  distPath: string,
  browserBinary: string | undefined,
  onExit: () => void
): Promise<void> {
  const webExt = await import("web-ext");
  const runOptions: {
    sourceDir: string;
    target: "firefox-desktop";
    firefox?: string;
  } = {
    sourceDir: distPath,
    target: "firefox-desktop" as const,
  };
  if (browserBinary) {
    runOptions.firefox = browserBinary;
  }
  const runner = await webExt.default.cmd.run(runOptions, { shouldExitProgram: false });
  extensionRunner = runner;

  const firefoxExited = (): void => {
    log("Exiting because the browser was closed.");
    onExit();
  };

  const r = runner as unknown as Record<string, unknown>;
  if (typeof (r.exitPromise as Promise<void> | undefined)?.then === "function") {
    (r.exitPromise as Promise<void>).then(firefoxExited).catch(() => {});
    return;
  }
  const proc = r.browserProcess ?? r.process ?? r.firefoxProcess;
  if (proc && typeof (proc as { on?: (e: string, h: () => void) => void }).on === "function") {
    (proc as { on(event: string, handler: () => void): void }).on("exit", firefoxExited);
    return;
  }
  // When web-ext does not expose exitPromise or process, closing Firefox will not auto-exit; use Ctrl+C.
}

async function launchBrowser(
  options: HmrPluginOptions,
  chromiumRunnerOverride?: ChromiumRunnerOverride,
  ensureDistReadyOverride?: (distPath: string) => Promise<boolean>,
  getBrowserPathOverride?: (b: LaunchTarget, o: LaunchPathOptions) => string | null
): Promise<void> {
  const launchStart = performance.now();
  const {
    distPath,
    browser = "chrome",
    chromePath,
    edgePath,
    bravePath,
    vivaldiPath,
    operaPath,
    santaPath,
    firefoxPath,
    persist = false,
    wsPort = 23333,
    enableReload = true,
  } = options;
  persistEnabled = persist;
  lastDistPath = distPath;
  const pathOpts = {
    chromePath,
    edgePath,
    bravePath,
    vivaldiPath,
    operaPath,
    santaPath,
    firefoxPath,
  };
  const browserBinary = (getBrowserPathOverride ?? getBrowserPath)(browser, pathOpts);
  const readyFn = ensureDistReadyOverride ?? (() => ensureDistReady(distPath));
  await readyFn(distPath).catch((e: Error) => {
    error(e.message);
  });
  if (enableReload) {
    const wsStart = performance.now();
    startWebSocketServer(wsPort, wsStart);
    if (isChromiumBrowser(browser)) {
      reloadManagerPath = await createReloadManagerExtension(wsPort, distPath);
    }
  }
  if (isChromiumBrowser(browser)) {
    if (!browserBinary) {
      const launchKey = `launch.${browser}`;
      warn(
        browser,
        "path not found; set",
        launchKey,
        "in exo.config, or install the browser at a default location"
      );
      return;
    }
    lastChromiumBrowser = browser;
    chromiumUserDataDirPath = getChromiumUserDataDir(distPath, browser);
    await mkdir(chromiumUserDataDirPath, { recursive: true });
    const extensions = [distPath, reloadManagerPath].filter(Boolean) as string[];
    const runnerFn = chromiumRunnerOverride ?? runChromiumRunner;
    extensionRunner = await runnerFn({
      chromePath: browserBinary,
      userDataDir: chromiumUserDataDirPath,
      extensions,
      startUrl: "chrome://extensions",
      onExit: () => {
        log("Exiting because the browser was closed.");
        cleanup()
          .then(() => process.exit(0))
          .catch(() => process.exit(1));
      },
    });
    const ms = Math.round(performance.now() - launchStart);
    logDoneTimed(browser + " started via Chromium runner, extensions loaded.", ms);
    return;
  }
  const onFirefoxExit = (): void => {
    cleanup()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  };
  await runFirefoxWebExt(distPath, browserBinary || undefined, onFirefoxExit);
  const ms = Math.round(performance.now() - launchStart);
  logDoneTimed("Firefox started via web-ext cmd.run, extension loaded.", ms);
}

/**
 * For build -l: launch browser and load dist only; no reloadManager, no WebSocket.
 * Returned Promise: Chromium resolves when browser closes (then onExit calls process.exit); Firefox never resolves, process exits via SIGINT/SIGTERM.
 */
export function launchBrowserOnly(
  options: LaunchOnlyOptions,
  chromiumRunnerOverride?: ChromiumRunnerOverride
): Promise<void> {
  const {
    distPath,
    browser = "chrome",
    chromePath,
    edgePath,
    bravePath,
    vivaldiPath,
    operaPath,
    santaPath,
    firefoxPath,
    persist = false,
  } = options;
  persistEnabled = persist;
  lastDistPath = distPath;

  const pathOpts = {
    chromePath,
    edgePath,
    bravePath,
    vivaldiPath,
    operaPath,
    santaPath,
    firefoxPath,
  };
  const browserBinary = getBrowserPath(browser, pathOpts);

  if (!cleanupHandlersRegistered) {
    cleanupHandlersRegistered = true;
    const onSignal = () => {
      cleanup().then(() => process.exit(0)).catch(() => process.exit(1));
    };
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
  }

  let resolveClosed: () => void;
  const closedPromise = new Promise<void>((r) => {
    resolveClosed = r;
  });

  const runnerFn = chromiumRunnerOverride ?? runChromiumRunner;
  const doLaunch = async (): Promise<void> => {
    const launchStart = performance.now();
    await ensureDistReady(distPath).catch((e: Error) => {
      throw e;
    });
    if (isChromiumBrowser(browser)) {
      lastChromiumBrowser = browser;
      if (!browserBinary) {
        const launchKey = `launch.${browser}`;
        throw new Error(
          `${browser} path not found; set ${launchKey} in exo.config, or install the browser at a default location`
        );
      }
      chromiumUserDataDirPath = getChromiumUserDataDir(distPath, browser);
      await mkdir(chromiumUserDataDirPath, { recursive: true });
      const onExit = () => {
        log("Exiting because the browser was closed.");
        cleanup()
          .then(() => {
            resolveClosed();
            process.exit(0);
          })
          .catch(() => process.exit(1));
      };
      extensionRunner = await runnerFn({
        chromePath: browserBinary,
        userDataDir: chromiumUserDataDirPath,
        extensions: [distPath],
        startUrl: "chrome://extensions",
        onExit,
      });
      const ms = Math.round(performance.now() - launchStart);
      logDoneTimed(browser + " started (build launch), extension loaded.", ms);
      return;
    }
    const onFirefoxExit = (): void => {
      cleanup()
        .then(() => {
          resolveClosed();
          process.exit(0);
        })
        .catch(() => process.exit(1));
    };
    await runFirefoxWebExt(distPath, browserBinary ?? undefined, onFirefoxExit);
    const ms = Math.round(performance.now() - launchStart);
    logDoneTimed("Firefox started (build launch), extension loaded.", ms);
  };

  return doLaunch().then(() => closedPromise);
}

/** Exported for tests. */
export function statsHasErrors(stats: unknown): boolean {
  if (!stats || typeof stats !== "object") return false;
  const s = stats as { hasErrors?: () => boolean };
  return Boolean(s.hasErrors?.());
}

/** Optional deps for tests (e.g. mock Chromium runner, force dist ready to fail). */
export interface HmrPluginTestDeps {
  runChromiumRunner?: ChromiumRunnerOverride;
  /** When provided, used instead of ensureDistReady; e.g. () => Promise.reject() to test catch. */
  ensureDistReady?: (distPath: string) => Promise<boolean>;
  /** When provided, used instead of getBrowserPath; e.g. () => null to test "path not found" branch. */
  getBrowserPath?: (browser: LaunchTarget, opts: LaunchPathOptions) => string | null;
}

/**
 * Rspack plugin: in dev, start browser after first compile; on each compile (file change) trigger extension reload via WebSocket.
 * Register via tools.rspack.appendPlugins(hmrPlugin(options)) so the real compiler is used.
 */
export function hmrPlugin(
  options: HmrPluginOptions,
  testDeps?: HmrPluginTestDeps
) {
  const {
    distPath,
    autoOpen = true,
    browser = "chrome",
    wsPort = 23333,
    enableReload = true,
    autoRefreshContentPage = true,
  } = options;
  const runnerOverride = testDeps?.runChromiumRunner;
  const ensureDistReadyOverride = testDeps?.ensureDistReady;
  const getBrowserPathOverride = testDeps?.getBrowserPath;

  return {
    name: "extenzo-hmr",
    apply(compiler: Compiler) {
      const hooks = compiler?.hooks;
      if (!hooks?.done) return;

      if (enableReload) {
        hooks.done.tap("extenzo-hmr-reload", async (stats) => {
          // if (statsHasErrors(stats)) return;
          // Wait for build output to be written (especially background chunk) before notifying reload.
          await new Promise((r) => setTimeout(r, 60));
          const kind = getReloadKind(stats);
          const refreshTab =
            kind === "toggle-extension" &&
            isContentChanged(stats) &&
            autoRefreshContentPage;
          notifyReload(kind, refreshTab ? { refreshTab: true } : undefined);
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
          await launchBrowser(
            {
              distPath,
              autoOpen,
              browser,
              chromePath: options.chromePath,
              edgePath: options.edgePath,
              bravePath: options.bravePath,
              vivaldiPath: options.vivaldiPath,
              operaPath: options.operaPath,
              santaPath: options.santaPath,
              firefoxPath: options.firefoxPath,
              persist: options.persist,
              wsPort,
              enableReload,
            },
            runnerOverride,
            ensureDistReadyOverride,
            getBrowserPathOverride
          );
        } catch (e) {
          error("Failed to launch browser:", e);
        }
      });
    },
  };
}
