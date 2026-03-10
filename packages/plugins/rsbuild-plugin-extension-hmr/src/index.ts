import type { Compiler } from "@rspack/core";
import type { RsbuildPlugin, RsbuildPluginAPI } from "@rsbuild/core";
import { resolve } from "path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { rm } from "node:fs/promises";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { LaunchTarget, ChromiumLaunchTarget } from "@extenzo/core";
import { log, logDone, logDoneTimed, warn, error, writeExtensionErrorBlock, getExtenzoVersion } from "@extenzo/core";
import { runChromiumRunner } from "./chromium-runner";
import type { ChromiumRunnerOptions } from "./chromium-runner";

// ─── Browser path registry (single map for all browser default paths) ───

type PlatformPaths = Record<string, string[]>;

/** Default executable paths for all supported browsers, grouped by platform. */
const BROWSER_DEFAULT_PATHS: Record<LaunchTarget, PlatformPaths> = {
  chrome: {
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ],
    darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
    linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
  },
  edge: {
    win32: [
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ],
    darwin: ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"],
    linux: ["/usr/bin/microsoft-edge", "/usr/bin/microsoft-edge-stable"],
  },
  brave: {
    win32: [
      "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    ],
    darwin: ["/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"],
    linux: ["/usr/bin/brave-browser", "/usr/bin/brave"],
  },
  vivaldi: {
    win32: [
      "C:\\Program Files\\Vivaldi\\Application\\vivaldi.exe",
      "C:\\Program Files (x86)\\Vivaldi\\Application\\vivaldi.exe",
    ],
    darwin: ["/Applications/Vivaldi.app/Contents/MacOS/Vivaldi"],
    linux: ["/usr/bin/vivaldi-stable", "/usr/bin/vivaldi"],
  },
  opera: {
    win32: [
      "C:\\Program Files\\Opera\\launcher.exe",
      "C:\\Program Files (x86)\\Opera\\launcher.exe",
    ],
    darwin: ["/Applications/Opera.app/Contents/MacOS/Opera"],
    linux: ["/usr/bin/opera", "/usr/bin/opera-stable"],
  },
  santa: {
    win32: [
      "C:\\Program Files\\Santa Browser\\Application\\Santa Browser.exe",
      "C:\\Program Files (x86)\\Santa Browser\\Application\\Santa Browser.exe",
    ],
    darwin: ["/Applications/Santa Browser.app/Contents/MacOS/Santa Browser"],
    linux: ["/usr/bin/santa-browser"],
  },
  firefox: {
    win32: [
      "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
      "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe",
    ],
    darwin: ["/Applications/Firefox.app/Contents/MacOS/firefox"],
    linux: ["/usr/bin/firefox", "/usr/bin/firefox-esr"],
  },
};

// ─── Public types ───

export interface HmrPluginOptions {
  distPath: string;
  autoOpen?: boolean;
  browser?: LaunchTarget;
  chromePath?: string;
  edgePath?: string;
  bravePath?: string;
  vivaldiPath?: string;
  operaPath?: string;
  santaPath?: string;
  firefoxPath?: string;
  persist?: boolean;
  wsPort?: number;
  enableReload?: boolean;
  /** Whether reload manager should auto-refresh active tab when content entry changes. */
  autoRefreshContentPage?: boolean;
}

/** Browser path options subset. */
type LaunchPathOptions = Pick<
  HmrPluginOptions,
  "chromePath" | "edgePath" | "bravePath" | "vivaldiPath" | "operaPath" | "santaPath" | "firefoxPath"
>;

/** For build -l: launch browser and load built output only; no WebSocket/reloadManager. */
export type LaunchOnlyOptions = Pick<
  HmrPluginOptions,
  "distPath" | "browser" | "chromePath" | "edgePath" | "bravePath" | "vivaldiPath" | "operaPath" | "santaPath" | "firefoxPath" | "persist"
>;

export type ChromiumRunnerOverride = (
  opts: ChromiumRunnerOptions
) => Promise<{ exit: () => Promise<void> }>;

// ─── Browser path resolution ───

/** Extract user-configured path for the given browser from options. */
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

/** Build default path list for the given browser on the current platform. */
export function buildDefaultPaths(
  browser: LaunchTarget,
  platform: string
): string[] | undefined {
  const basePaths = BROWSER_DEFAULT_PATHS[browser]?.[platform];
  if (browser === "vivaldi" && platform === "win32") {
    const userProfile = process.env.USERPROFILE;
    if (userProfile) {
      return [
        resolve(userProfile, "AppData\\Local\\Vivaldi\\Application\\vivaldi.exe"),
        ...(basePaths ?? []),
      ];
    }
  }
  return basePaths;
}

/** Resolve browser executable path: user config first, then system default paths. */
export function getBrowserPath(
  browser: LaunchTarget,
  options: LaunchPathOptions
): string | null {
  const userPath = getLaunchPathFromOptions(browser, options);
  if (userPath != null && userPath.trim() !== "") return userPath.trim();

  const paths = buildDefaultPaths(browser, process.platform);
  if (!paths) return null;
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

export function isChromiumBrowser(browser: LaunchTarget): browser is ChromiumLaunchTarget {
  return browser !== "firefox";
}

// ─── WebSocket hot reload server ───

let wsServer: WebSocketServer | null = null;
let httpServer: ReturnType<typeof createServer> | null = null;

/** Extension error report payload structure. */
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

function buildExtensionErrorLines(payload: ExtensionErrorPayload): string[] {
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
  const extenzoVersion = getExtenzoVersion();
  const lines: string[] = [
    "--- Extenzo extension error ---",
    `extenzo version: ${extenzoVersion}`,
    `source: ${entry}`,
    `type: ${errorType}`,
    `time: ${timeStr}`,
    `message: ${message}`,
  ];
  if (loc) lines.push(`location: ${loc}`);
  if (stack) lines.push("stack:", ...stack.split("\n"));
  lines.push("---------------------------");
  return lines;
}

function logExtensionErrorToTerminal(payload: ExtensionErrorPayload): void {
  writeExtensionErrorBlock(buildExtensionErrorLines(payload));
}

function handleHttpRequest(
  req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse
): void {
  if (req.method === "POST" && req.url === "/extenzo-error") {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => { body += chunk; });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body) as ExtensionErrorPayload;
        if (payload && (payload.entry != null || payload.message != null)) {
          logExtensionErrorToTerminal(payload);
        }
      } catch { /* ignore JSON parse errors */ }
      res.writeHead(204).end();
    });
    return;
  }
  res.writeHead(404).end();
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

/**
 * Notify all WebSocket clients to reload the extension.
 * "reload-extension": via chrome.runtime.reload().
 * "toggle-extension": via disable+enable.
 * "toggle-extension-refresh-tab": same as above plus refresh active tab.
 */
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

// ─── Build signature and reload decision ───

/** Entry names that require runtime.reload (only background). */
const RELOAD_ENTRY_NAMES = new Set(["background"]);
/** Entry names injected into pages; when changed, reload manager should refresh active tab. */
const CONTENT_ENTRY_NAMES = new Set(["content"]);

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

/** Build signature from entrypoint chunk hashes or file list, avoiding toJson(). */
function getEntrypointSignature(entrypoint: EntrypointLike | undefined): string | null {
  if (!entrypoint) return null;
  const hashes: string[] = [];
  if (entrypoint.chunks && Array.isArray(entrypoint.chunks)) {
    for (const c of entrypoint.chunks) {
      if (c?.hash) hashes.push(c.hash);
    }
  }
  if (hashes.length > 0) return hashes.sort().join(",");

  if (typeof entrypoint.getFiles === "function") {
    try {
      const files = entrypoint.getFiles();
      if (files && files.length > 0) return [...files].sort().join(",");
    } catch { /* proxy may throw */ }
  }
  return null;
}

/** Collect signatures for a set of entry names from the compilation. */
function getEntriesSignature(compilation: CompilationLike, entryNames: Set<string>): string | null {
  const entrypoints = compilation.entrypoints;
  if (!entrypoints || typeof entrypoints.get !== "function") return null;
  const sigs: string[] = [];
  for (const name of entryNames) {
    const sig = getEntrypointSignature(entrypoints.get(name));
    if (sig) sigs.push(sig);
  }
  return sigs.length > 0 ? sigs.sort().join("|") : null;
}

function getReloadEntriesSignature(stats: unknown): string | null {
  const compilation = getCompilationFromStats(stats);
  return compilation ? getEntriesSignature(compilation, RELOAD_ENTRY_NAMES) : null;
}

function getContentEntriesSignature(stats: unknown): string | null {
  const compilation = getCompilationFromStats(stats);
  return compilation ? getEntriesSignature(compilation, CONTENT_ENTRY_NAMES) : null;
}

let lastReloadSignature: string | null = null;
let lastContentSignature: string | null = null;

/** Decide reload kind based on build signature: background change → reload-extension, otherwise → toggle-extension. */
export function getReloadKind(stats: unknown): "reload-extension" | "toggle-extension" {
  const sig = getReloadEntriesSignature(stats);
  if (sig === null) return "toggle-extension";
  const useReload = lastReloadSignature === null || sig !== lastReloadSignature;
  lastReloadSignature = sig;
  return useReload ? "reload-extension" : "toggle-extension";
}

/** True if content entry chunks changed (returns false on first build). */
export function isContentChanged(stats: unknown): boolean {
  const sig = getContentEntriesSignature(stats);
  const changed = sig !== null && lastContentSignature !== null && sig !== lastContentSignature;
  if (sig !== null) lastContentSignature = sig;
  return changed;
}

// ─── Test WebSocket server ───

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
            wss.close(() => { http.close(() => done()); });
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

// ─── Reload manager and browser lifecycle ───

let extensionRunner: { exit: () => Promise<void> } | null = null;
let reloadManagerPath: string | null = null;
let browserLaunched = false;
let isCleaningUp = false;
let cleanupHandlersRegistered = false;
let lastDistPath: string | null = null;
let chromiumUserDataDirPath: string | null = null;
let lastChromiumBrowser: ChromiumLaunchTarget = "chrome";
let persistEnabled = false;

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
    } catch { /* ignore read errors */ }
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
  reloadManagerPath = null;
  if (wsServer) { wsServer.close(); wsServer = null; }
  if (httpServer) { httpServer.close(); httpServer = null; }
}

/** Register process exit signal handlers (ensures single registration). */
function registerCleanupHandlers(): void {
  if (cleanupHandlersRegistered) return;
  cleanupHandlersRegistered = true;
  const onSignal = () => {
    cleanup().then(() => process.exit(0)).catch(() => process.exit(1));
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
}

// ─── Firefox launch ───

async function runFirefoxWebExt(
  distPath: string,
  browserBinary: string | undefined,
  onExit: () => void
): Promise<void> {
  const webExt = await import("web-ext");
  const runOptions: { sourceDir: string; target: "firefox-desktop"; firefox?: string } = {
    sourceDir: distPath,
    target: "firefox-desktop" as const,
  };
  if (browserBinary) runOptions.firefox = browserBinary;
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
  }
}

// ─── Core browser launch logic (shared by dev and build -l) ───

interface LaunchContext {
  distPath: string;
  browser: LaunchTarget;
  pathOpts: LaunchPathOptions;
  persist: boolean;
  enableReload: boolean;
  wsPort: number;
  chromiumRunnerOverride?: ChromiumRunnerOverride;
  ensureDistReadyOverride?: (distPath: string) => Promise<boolean>;
  getBrowserPathOverride?: (b: LaunchTarget, o: LaunchPathOptions) => string | null;
  onBrowserExit: () => void;
}

/** Shared browser launch implementation for both dev and build modes. */
async function launchBrowserCore(ctx: LaunchContext): Promise<void> {
  const launchStart = performance.now();
  persistEnabled = ctx.persist;
  lastDistPath = ctx.distPath;
  const browserBinary = (ctx.getBrowserPathOverride ?? getBrowserPath)(ctx.browser, ctx.pathOpts);

  const readyFn = ctx.ensureDistReadyOverride ?? (() => ensureDistReady(ctx.distPath));
  await readyFn(ctx.distPath).catch((e: Error) => { error(e.message); });

  if (ctx.enableReload) {
    startWebSocketServer(ctx.wsPort, performance.now());
    if (isChromiumBrowser(ctx.browser)) {
      reloadManagerPath = await createReloadManagerExtension(ctx.wsPort, ctx.distPath);
    }
  }

  if (isChromiumBrowser(ctx.browser)) {
    await launchChromiumBrowser(ctx, browserBinary, launchStart);
    return;
  }
  await launchFirefoxBrowser(ctx, browserBinary, launchStart);
}

async function launchChromiumBrowser(
  ctx: LaunchContext,
  browserBinary: string | null,
  launchStart: number
): Promise<void> {
  if (!browserBinary) {
    warn(ctx.browser, "path not found; set", `launch.${ctx.browser}`, "in exo.config, or install the browser at a default location");
    return;
  }
  lastChromiumBrowser = ctx.browser as ChromiumLaunchTarget;
  chromiumUserDataDirPath = getChromiumUserDataDir(ctx.distPath, ctx.browser as ChromiumLaunchTarget);
  await mkdir(chromiumUserDataDirPath, { recursive: true });

  const extensions = [ctx.distPath, reloadManagerPath].filter(Boolean) as string[];
  const runnerFn = ctx.chromiumRunnerOverride ?? runChromiumRunner;
  extensionRunner = await runnerFn({
    chromePath: browserBinary,
    userDataDir: chromiumUserDataDirPath,
    extensions,
    startUrl: "chrome://extensions",
    onExit: ctx.onBrowserExit,
  });
  logDoneTimed(ctx.browser + " started, extensions loaded.", Math.round(performance.now() - launchStart));
}

async function launchFirefoxBrowser(
  ctx: LaunchContext,
  browserBinary: string | null,
  launchStart: number
): Promise<void> {
  await runFirefoxWebExt(ctx.distPath, browserBinary || undefined, ctx.onBrowserExit);
  logDoneTimed("Firefox started via web-ext, extension loaded.", Math.round(performance.now() - launchStart));
}

// ─── Public API ───

/** Dev mode: launch browser after compilation completes. */
async function launchBrowser(
  options: HmrPluginOptions,
  chromiumRunnerOverride?: ChromiumRunnerOverride,
  ensureDistReadyOverride?: (distPath: string) => Promise<boolean>,
  getBrowserPathOverride?: (b: LaunchTarget, o: LaunchPathOptions) => string | null
): Promise<void> {
  const { distPath, browser = "chrome", persist = false, wsPort = 23333, enableReload = true } = options;
  const onBrowserExit = () => {
    log("Exiting because the browser was closed.");
    cleanup().then(() => process.exit(0)).catch(() => process.exit(1));
  };
  await launchBrowserCore({
    distPath,
    browser,
    pathOpts: {
      chromePath: options.chromePath, edgePath: options.edgePath, bravePath: options.bravePath,
      vivaldiPath: options.vivaldiPath, operaPath: options.operaPath, santaPath: options.santaPath,
      firefoxPath: options.firefoxPath,
    },
    persist,
    enableReload,
    wsPort,
    chromiumRunnerOverride,
    ensureDistReadyOverride,
    getBrowserPathOverride,
    onBrowserExit,
  });
}

/**
 * Build -l mode: launch browser and load dist only; no reloadManager / WebSocket.
 * Chromium: resolves when browser closes; Firefox: exits via SIGINT/SIGTERM.
 */
export function launchBrowserOnly(
  options: LaunchOnlyOptions,
  chromiumRunnerOverride?: ChromiumRunnerOverride
): Promise<void> {
  const { distPath, browser = "chrome", persist = false } = options;
  persistEnabled = persist;
  lastDistPath = distPath;
  registerCleanupHandlers();

  let resolveClosed: () => void;
  const closedPromise = new Promise<void>((r) => { resolveClosed = r; });

  const onBrowserExit = () => {
    log("Exiting because the browser was closed.");
    cleanup().then(() => { resolveClosed(); process.exit(0); }).catch(() => process.exit(1));
  };

  const doLaunch = async (): Promise<void> => {
    const browserBinary = getBrowserPath(browser, {
      chromePath: options.chromePath, edgePath: options.edgePath, bravePath: options.bravePath,
      vivaldiPath: options.vivaldiPath, operaPath: options.operaPath, santaPath: options.santaPath,
      firefoxPath: options.firefoxPath,
    });

    await ensureDistReady(distPath);

    if (isChromiumBrowser(browser)) {
      if (!browserBinary) {
        throw new Error(`${browser} path not found; set launch.${browser} in exo.config, or install the browser at a default location`);
      }
      lastChromiumBrowser = browser;
      chromiumUserDataDirPath = getChromiumUserDataDir(distPath, browser);
      await mkdir(chromiumUserDataDirPath, { recursive: true });
      const runnerFn = chromiumRunnerOverride ?? runChromiumRunner;
      extensionRunner = await runnerFn({
        chromePath: browserBinary,
        userDataDir: chromiumUserDataDirPath,
        extensions: [distPath],
        startUrl: "chrome://extensions",
        onExit: onBrowserExit,
      });
      const ms = Math.round(performance.now());
      logDoneTimed(browser + " started (build launch), extension loaded.", ms);
      return;
    }
    await runFirefoxWebExt(distPath, browserBinary ?? undefined, onBrowserExit);
    logDoneTimed("Firefox started (build launch), extension loaded.", 0);
  };

  return doLaunch().then(() => closedPromise);
}

/** Exported for tests. */
export function statsHasErrors(stats: unknown): boolean {
  if (!stats || typeof stats !== "object") return false;
  const s = stats as { hasErrors?: () => boolean };
  return Boolean(s.hasErrors?.());
}

/** Test dependency injection interface. */
export interface HmrPluginTestDeps {
  runChromiumRunner?: ChromiumRunnerOverride;
  ensureDistReady?: (distPath: string) => Promise<boolean>;
  getBrowserPath?: (browser: LaunchTarget, opts: LaunchPathOptions) => string | null;
}

function createHmrRspackPlugin(
  options: HmrPluginOptions,
  testDeps?: HmrPluginTestDeps
) {
  const { autoOpen = true, enableReload = true, autoRefreshContentPage = true } = options;

  return {
    name: "rsbuild-plugin-extension-hmr:rspack",
    apply(compiler: Compiler) {
      const hooks = compiler?.hooks;
      if (!hooks?.done) return;

      if (enableReload) {
        hooks.done.tap("rsbuild-plugin-extension-hmr:reload", async (stats) => {
          await new Promise((r) => setTimeout(r, 60));
          const kind = getReloadKind(stats);
          const refreshTab = kind === "toggle-extension" && isContentChanged(stats) && autoRefreshContentPage;
          notifyReload(kind, refreshTab ? { refreshTab: true } : undefined);
        });
      }

      registerCleanupHandlers();

      hooks.done.tap("rsbuild-plugin-extension-hmr:launch", async (stats) => {
        if (!autoOpen || browserLaunched) return;
        if (statsHasErrors(stats)) return;
        browserLaunched = true;
        await new Promise((r) => setTimeout(r, 1000));
        try {
          await launchBrowser(
            options,
            testDeps?.runChromiumRunner,
            testDeps?.ensureDistReady,
            testDeps?.getBrowserPath
          );
        } catch (e) {
          error("Failed to launch browser:", e);
        }
      });
    },
  };
}

/**
 * Rsbuild plugin: in dev mode, launches browser after first compile;
 * on each compile (file change), notifies extension reload via WebSocket.
 */
export function hmrPlugin(
  options: HmrPluginOptions,
  testDeps?: HmrPluginTestDeps
): RsbuildPlugin {
  return {
    name: "rsbuild-plugin-extension-hmr",
    setup(api: RsbuildPluginAPI) {
      api.onBeforeCreateCompiler(async ({ bundlerConfigs }) => {
        const config = bundlerConfigs[0] as { plugins?: unknown[] } | undefined;
        if (!config) return;
        config.plugins = config.plugins ?? [];
        config.plugins.push(createHmrRspackPlugin(options, testDeps));
      });
    },
  };
}
