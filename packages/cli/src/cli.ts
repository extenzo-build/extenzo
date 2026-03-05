#!/usr/bin/env node
import { resolve, dirname } from "path";
import { existsSync, watch, readFileSync, statSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { runPipeline } from "./pipeline.ts";
import { wrapExtenzoOutput, getRawWrites, setOutputPrefixRsbuild, setOutputPrefixExo } from "./prefixStream.ts";
import { zipDist } from "./zipDist.ts";
import {
  exitWithError,
  createConfigNotFoundError,
  CONFIG_FILES,
  getResolvedConfigFilePath,
  clearConfigCache,
  log,
  logDone,
  logDoneTimed,
  logDoneWithValue,
  setExoLoggerRawWrites,
  parseCliArgs,
} from "@extenzo/core";
import type { PipelineContext } from "@extenzo/core";
import { launchBrowserOnly } from "@extenzo/rsbuild-plugin-extension-hmr";

const root = process.cwd();

/** ANSI light purple for Rsbuild branding (256 color 141). */
const PURPLE = "\x1b[38;5;141m";
const RESET = "\x1b[0m";

function getVersion(): string {
  try {
    const pkgPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function getRsbuildVersion(projectRoot: string): string {
  const require = createRequire(import.meta.url);
  const cliDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    () => {
      const p = resolve(projectRoot, "node_modules", "@rsbuild", "core", "package.json");
      return existsSync(p) ? p : null;
    },
    () => {
      try { return require.resolve("@rsbuild/core/package.json", { paths: [projectRoot] }); }
      catch { return null; }
    },
    () => {
      try { return require.resolve("@rsbuild/core/package.json", { paths: [resolve(cliDir, ".."), resolve(cliDir, "..", "..")] }); }
      catch { return null; }
    },
  ];
  for (const getPath of candidates) {
    const pkgPath = getPath();
    if (!pkgPath) continue;
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
      return pkg.version ?? "?";
    } catch { /* try next candidate */ }
  }
  return "?";
}

/** Recursively compute directory size in bytes. */
function getDistSizeSync(dirPath: string): number {
  if (!existsSync(dirPath)) return -1;
  const stat = statSync(dirPath);
  if (!stat.isDirectory()) return stat.size;
  let total = 0;
  for (const name of readdirSync(dirPath)) {
    const s = statSync(resolve(dirPath, name));
    total += s.isDirectory() ? getDistSizeSync(resolve(dirPath, name)) : s.size;
  }
  return total;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

/** Whether the final Rsbuild config has JS source map enabled (any format). */
function isSourceMapEnabled(rsbuildConfig: { output?: { sourceMap?: unknown } }): boolean {
  const sm = rsbuildConfig?.output?.sourceMap;
  if (sm === true) return true;
  if (sm && typeof sm === "object" && typeof (sm as { js?: string }).js === "string") return true;
  return false;
}

/** Get total size of build output from Rsbuild build result (stats.assets). */
function getBuildOutputSize(result: unknown): number | null {
  const stats = (result as { stats?: { toJson?: (opts: unknown) => { assets?: Array<{ size?: number }> } } })?.stats;
  if (!stats?.toJson) return null;
  try {
    const json = stats.toJson({ all: false, assets: true });
    const assets = json?.assets;
    if (!Array.isArray(assets)) return null;
    let total = 0;
    for (const a of assets) {
      if (a && typeof a.size === "number") total += a.size;
    }
    return total > 0 ? total : null;
  } catch {
    return null;
  }
}

function hasConfigFile(): boolean {
  return CONFIG_FILES.some((file) => existsSync(resolve(root, file)));
}

function printHelp(): void {
  const version = getVersion();
  console.log(`
  extenzo v${version}

  Build tool for browser extensions

  Usage:
    extenzo <command> [options]

  Commands:
    dev                        Start development server with HMR
    build                      Build for production

  Options:
    -t, --target <browser>     Target browser (chromium | firefox)  [default: chromium]
    -l, --launch <browser>     Launch browser after build (chrome | edge | brave | firefox | ...)
    -p, --persist              Persist browser profile between launches
    -r, --report               Enable Rsdoctor build report (opens analysis after build)
    --debug                    Enable debug mode
    --help                     Show this help message
    --version                  Show version number
`);
}

// ─── Shared Rsbuild instance creation ───

async function createRsbuildInstance(ctx: PipelineContext) {
  setOutputPrefixRsbuild();
  const createStart = performance.now();
  const { createRsbuild } = await import("@rsbuild/core");
  const rsbuild = await createRsbuild({
    rsbuildConfig: ctx.rsbuildConfig,
    cwd: ctx.root,
    loadEnv: {
      cwd: ctx.root,
      prefixes: ctx.config.envPrefix ?? [""],
    },
  });
  logDoneTimed("Create Rsbuild", Math.round(performance.now() - createStart));
  return rsbuild;
}

/** Log extension size info to terminal. */
function logExtensionSize(distDir: string, rsbuildConfig: { output?: { sourceMap?: unknown } }): void {
  const size = getDistSizeSync(distDir);
  if (size < 0) return;
  const sizeStr = formatBytes(size);
  const suffix = isSourceMapEnabled(rsbuildConfig) ? " (with inline-source-map)" : "";
  logDoneWithValue("Extension size:", sizeStr + suffix);
}

// ─── exo.config file watcher ───

const EXO_CONFIG_DEBOUNCE_MS = 300;

/**
 * Watch exo.config file; on change, run onRestart (e.g. close dev server and re-run dev in-process).
 * Returns the watcher so caller can close it before restarting.
 */
function watchExoConfig(
  configPath: string,
  onRestart: () => void | Promise<void>
): { close: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const run = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      Promise.resolve(onRestart()).catch((e) => exitWithError(e));
    }, EXO_CONFIG_DEBOUNCE_MS);
  };
  try {
    const watcher = watch(configPath, { persistent: true }, (eventType, filename) => {
      if (filename && (eventType === "change" || eventType === "rename")) run();
    });
    return { close() { try { watcher.close(); } catch { /* ignore */ } } };
  } catch {
    return { close() {} };
  }
}

// ─── Dev / Build commands ───

/** Dev mode: auto-restart dev server on exo.config change. */
async function runDev(root: string, argv: string[]): Promise<void> {
  const pipelineStart = performance.now();
  const ctx = await runPipeline(root, argv);
  logDoneTimed("Pipeline ready", Math.round(performance.now() - pipelineStart));

  process.env.NODE_ENV = ctx.isDev ? "development" : "production";
  const rsbuild = await createRsbuildInstance(ctx);

  const configPath = getResolvedConfigFilePath(ctx.root);
  let devServerRef: Awaited<ReturnType<typeof rsbuild.startDevServer>> | null = null;
  let watcherRef: { close: () => void } | null = null;

  const onExoConfigChange = async (): Promise<void> => {
    if (watcherRef) { watcherRef.close(); watcherRef = null; }
    if (devServerRef?.server?.close) await devServerRef.server.close();
    if (configPath) clearConfigCache(configPath);
    process.env.EXO_CONFIG_RESTART = "1";
    try {
      await runDev(root, argv);
    } finally {
      delete process.env.EXO_CONFIG_RESTART;
    }
  };

  if (configPath) watcherRef = watchExoConfig(configPath, onExoConfigChange);
  const devServerStart = performance.now();
  devServerRef = await rsbuild.startDevServer({ getPortSilently: true });
  const urls = devServerRef?.urls ?? [];
  const mainUrl = urls[0] ?? `http://localhost:${devServerRef?.port ?? "?"}`;
  logDoneTimed("Dev server " + mainUrl, Math.round(performance.now() - devServerStart));

  const devDistDir = (rsbuild.context as { distPath?: string } | undefined)?.distPath ?? ctx.distPath;
  setTimeout(() => logExtensionSize(devDistDir, ctx.rsbuildConfig), 2500);
}

/** Build mode: compile + optional zip + optional browser launch. */
async function runBuild(root: string, argv: string[]): Promise<void> {
  const pipelineStart = performance.now();
  const ctx = await runPipeline(root, argv);
  logDoneTimed("Pipeline ready", Math.round(performance.now() - pipelineStart));

  const rsbuild = await createRsbuildInstance(ctx);

  const buildStart = performance.now();
  const buildResult = await rsbuild.build();
  logDoneTimed("Rsbuild build", Math.round(performance.now() - buildStart));
  setOutputPrefixExo();

  await ctx.config.hooks?.afterBuild?.(ctx);
  if (ctx.config.zip !== false) {
    const zipPath = await zipDist(ctx.distPath, ctx.root, ctx.config.outDir);
    logDone("Zipped output to", zipPath);
  }

  const distDir = (rsbuild.context as { distPath?: string } | undefined)?.distPath || ctx.distPath;
  const distSize = getBuildOutputSize(buildResult) ?? getDistSizeSync(distDir);
  if (distSize >= 0) logDoneWithValue("Extension size:", formatBytes(distSize));

  if (ctx.launchRequested) {
    const launch = ctx.config.launch as Record<string, string | undefined> | undefined;
    await launchBrowserOnly({
      distPath: ctx.distPath,
      browser: ctx.launchTarget,
      chromePath: launch?.chrome,
      edgePath: launch?.edge,
      bravePath: launch?.brave,
      vivaldiPath: launch?.vivaldi,
      operaPath: launch?.opera,
      santaPath: launch?.santa,
      firefoxPath: launch?.firefox,
      persist: (ctx as { persist?: boolean }).persist,
    });
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }

  if (argv.includes("--version") || argv.includes("-v")) {
    console.log(getVersion());
    return;
  }

  wrapExtenzoOutput();
  setExoLoggerRawWrites(getRawWrites());
  log("Extenzo " + getVersion() + " with " + PURPLE + "Rsbuild " + getRsbuildVersion(root) + RESET);

  if (!hasConfigFile()) throw createConfigNotFoundError(root);

  const parsed = parseCliArgs(argv);
  process.env.NODE_ENV = parsed.command === "dev" ? "development" : "production";

  if (parsed.command === "dev") {
    await runDev(root, argv);
  } else {
    await runBuild(root, argv);
  }
}

main().catch((e) => exitWithError(e));
