import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import type { LaunchTarget, ChromiumLaunchTarget } from "@extenzo/core";
import { log, logDoneTimed, warn, error } from "@extenzo/core";
import { runChromiumRunner } from "./chromium-runner";
import type { ChromiumRunnerOptions } from "./chromium-runner";
import { getBrowserPath, isChromiumBrowser, type LaunchPathOptions } from "./browserPaths";
import { startWebSocketServer, closeWebSocketServer } from "./wsServer";
import {
  ensureDistReady,
  createReloadManagerExtension,
  getChromiumUserDataDir,
  getReloadManagerPath,
} from "./reloadManagerExtension";

let extensionRunner: { exit: () => Promise<void> } | null = null;
let reloadManagerPath: string | null = null;
let browserLaunched = false;
let isCleaningUp = false;
let cleanupHandlersRegistered = false;
let lastDistPath: string | null = null;
let chromiumUserDataDirPath: string | null = null;
let lastChromiumBrowser: ChromiumLaunchTarget = "chrome";
let persistEnabled = false;

export type ChromiumRunnerOverride = (
  opts: ChromiumRunnerOptions
) => Promise<{ exit: () => Promise<void> }>;

export interface LaunchContext {
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

export async function cleanup(): Promise<void> {
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
  closeWebSocketServer();
}

export function registerCleanupHandlers(): void {
  if (cleanupHandlersRegistered) return;
  cleanupHandlersRegistered = true;
  const onSignal = () => {
    cleanup().then(() => process.exit(0)).catch(() => process.exit(1));
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
}

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

export async function launchBrowserCore(ctx: LaunchContext): Promise<void> {
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

export interface HmrPluginOptionsForLaunch {
  distPath: string;
  browser?: LaunchTarget;
  persist?: boolean;
  wsPort?: number;
  enableReload?: boolean;
  chromePath?: string;
  chromiumPath?: string;
  edgePath?: string;
  bravePath?: string;
  vivaldiPath?: string;
  operaPath?: string;
  santaPath?: string;
  arcPath?: string;
  yandexPath?: string;
  browserosPath?: string;
  customPath?: string;
  firefoxPath?: string;
}

export async function launchBrowser(
  options: HmrPluginOptionsForLaunch,
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
      chromePath: options.chromePath,
      chromiumPath: options.chromiumPath,
      edgePath: options.edgePath,
      bravePath: options.bravePath,
      vivaldiPath: options.vivaldiPath,
      operaPath: options.operaPath,
      santaPath: options.santaPath,
      arcPath: options.arcPath,
      yandexPath: options.yandexPath,
      browserosPath: options.browserosPath,
      customPath: options.customPath,
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

export function setBrowserLaunched(value: boolean): void {
  browserLaunched = value;
}

export function getBrowserLaunched(): boolean {
  return browserLaunched;
}

export function statsHasErrors(stats: unknown): boolean {
  if (!stats || typeof stats !== "object") return false;
  const s = stats as { hasErrors?: () => boolean };
  return Boolean(s.hasErrors?.());
}

export {
  getReloadManagerPath,
  getChromiumUserDataDir,
  getCacheTempRoot,
  findExistingReloadManager,
  ensureDistReady,
} from "./reloadManagerExtension";

export async function launchBrowserOnly(
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
      chromePath: options.chromePath,
      chromiumPath: options.chromiumPath,
      edgePath: options.edgePath,
      bravePath: options.bravePath,
      vivaldiPath: options.vivaldiPath,
      operaPath: options.operaPath,
      santaPath: options.santaPath,
      arcPath: options.arcPath,
      yandexPath: options.yandexPath,
      browserosPath: options.browserosPath,
      customPath: options.customPath,
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
      logDoneTimed(browser + " started (build launch), extension loaded.", Math.round(performance.now()));
      return;
    }
    await runFirefoxWebExt(distPath, browserBinary ?? undefined, onBrowserExit);
    logDoneTimed("Firefox started (build launch), extension loaded.", 0);
  };
  return doLaunch().then(() => closedPromise);
}

export type LaunchOnlyOptions = Pick<
  HmrPluginOptionsForLaunch,
  "distPath" | "browser" | "chromePath" | "chromiumPath" | "edgePath" | "bravePath" | "vivaldiPath" | "operaPath" | "santaPath" | "arcPath" | "yandexPath" | "browserosPath" | "customPath" | "firefoxPath" | "persist"
>;
