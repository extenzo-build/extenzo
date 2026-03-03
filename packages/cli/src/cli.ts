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
import { launchBrowserOnly } from "@extenzo/plugin-extension-hmr";

const root = process.cwd();

function getVersion(): string {
  try {
    const pkgPath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "package.json"
    );
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** ANSI light purple for Rsbuild branding (256 color 141) */
const PURPLE = "\x1b[38;5;141m";
const RESET = "\x1b[0m";

function getRsbuildVersion(projectRoot: string): string {
  const require = createRequire(import.meta.url);
  const cliDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    () => {
      const p = resolve(projectRoot, "node_modules", "@rsbuild", "core", "package.json");
      return existsSync(p) ? p : null;
    },
    () => {
      try {
        return require.resolve("@rsbuild/core/package.json", { paths: [projectRoot] });
      } catch {
        return null;
      }
    },
    () => {
      try {
        return require.resolve("@rsbuild/core/package.json", { paths: [resolve(cliDir, ".."), resolve(cliDir, "..", "..")] });
      } catch {
        return null;
      }
    },
  ];
  for (const getPath of candidates) {
    const pkgPath = getPath();
    if (!pkgPath) continue;
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
      return pkg.version ?? "?";
    } catch {
      // continue to next candidate
    }
  }
  return "?";
}

function getDistSizeSync(dirPath: string): number {
  if (!existsSync(dirPath)) return -1;
  const stat = statSync(dirPath);
  if (!stat.isDirectory()) return stat.size;
  let total = 0;
  const names = readdirSync(dirPath);
  for (const name of names) {
    const full = resolve(dirPath, name);
    const s = statSync(full);
    total += s.isDirectory() ? getDistSizeSync(full) : s.size;
  }
  return total;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

/** Whether the final rsbuild config has JS source map enabled (any format). */
function isSourceMapEnabled(rsbuildConfig: { output?: { sourceMap?: unknown } }): boolean {
  const sm = rsbuildConfig?.output?.sourceMap;
  if (sm === true) return true;
  if (sm && typeof sm === "object" && typeof (sm as { js?: string }).js === "string") return true;
  return false;
}

/** Get total size of build output from rsbuild build result (stats.assets). */
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
    return {
      close() {
        try {
          watcher.close();
        } catch {
          // ignore
        }
      },
    };
  } catch {
    return { close() {} };
  }
}

/** Run dev server; on exo.config change, close server and watcher then re-run in-process (no browser kill). */
async function runDev(root: string, argv: string[]): Promise<void> {
  const pipelineStart = performance.now();
  const ctx = await runPipeline(root, argv);
  logDoneTimed("Pipeline ready", Math.round(performance.now() - pipelineStart));

  process.env.NODE_ENV = ctx.isDev ? "development" : "production";

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

  const configPath = getResolvedConfigFilePath(ctx.root);
  let devServerRef: Awaited<ReturnType<typeof rsbuild.startDevServer>> | null = null;
  let watcherRef: { close: () => void } | null = null;

  const onExoConfigChange = async (): Promise<void> => {
    if (watcherRef) {
      watcherRef.close();
      watcherRef = null;
    }
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
  const devMs = Math.round(performance.now() - devServerStart);
  const urls = devServerRef?.urls ?? [];
  const mainUrl = urls[0] ?? `http://localhost:${devServerRef?.port ?? "?"}`;
  logDoneTimed("Dev server " + mainUrl, devMs);

  const devDistDir = (rsbuild.context as { distPath?: string } | undefined)?.distPath ?? ctx.distPath;
  setTimeout(() => {
    const size = getDistSizeSync(devDistDir);
    if (size >= 0) {
      const sizeStr = formatBytes(size);
      const suffix = isSourceMapEnabled(ctx.rsbuildConfig) ? " (with inline-source-map)" : "";
      logDoneWithValue("Extension size:", sizeStr + suffix);
    }
  }, 2500);
}

async function main(): Promise<void> {
  wrapExtenzoOutput();
  setExoLoggerRawWrites(getRawWrites());
  log(
    "Extenzo " +
      getVersion() +
      " with " +
      PURPLE +
      "Rsbuild " +
      getRsbuildVersion(root) +
      RESET
  );

  if (!hasConfigFile()) throw createConfigNotFoundError(root);

  const argv = process.argv.slice(2);
  const parsed = parseCliArgs(argv);
  const isDev = parsed.command === "dev";

  process.env.NODE_ENV = isDev ? "development" : "production";

  if (isDev) {
    await runDev(root, argv);
    return;
  }

  const pipelineStart = performance.now();
  const ctx = await runPipeline(root, argv);
  logDoneTimed("Pipeline ready", Math.round(performance.now() - pipelineStart));

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

  const buildStart = performance.now();
  const buildResult = await rsbuild.build();
  logDoneTimed("Rsbuild build", Math.round(performance.now() - buildStart));
  setOutputPrefixExo();

  await ctx.config.hooks?.afterBuild?.(ctx);
  if (ctx.config.zip !== false) {
    const zipPath = await zipDist(ctx.distPath, ctx.root, ctx.config.outDir);
    logDone("Zipped output to", zipPath);
  }
  const distDir =
    (rsbuild.context as { distPath?: string } | undefined)?.distPath || ctx.distPath;
  const distSize = getBuildOutputSize(buildResult) ?? getDistSizeSync(distDir);
  if (distSize >= 0) {
    logDoneWithValue("Extension size:", formatBytes(distSize));
  }
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

main().catch((e) => exitWithError(e));
