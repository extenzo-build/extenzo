import { createRequire } from "module";
import { resolve } from "path";
import { existsSync, statSync } from "fs";
import type { ExtenzoUserConfig, ExtenzoResolvedConfig, EntryInfo } from "./types.ts";
import {
  CONFIG_FILES,
  DEFAULT_OUT_DIR,
  DEFAULT_APP_DIR,
  EXTENZO_OUTPUT_ROOT,
} from "./constants.ts";
import {
  createConfigLoadError,
  createConfigNotFoundError,
  createManifestMissingError,
  createAppDirMissingError,
  createNoEntriesError,
} from "./errors.ts";
import { EntryDiscoverer } from "./entryDiscoverer.ts";
import { EntryResolver } from "./entryResolver.ts";
import { resolveManifestInput } from "./manifestLoader.ts";
import { logDoneTimed } from "./logger.ts";

const require = createRequire(
  typeof __filename !== "undefined" ? __filename : import.meta.url
);

function loadWithJiti(root: string, configPath: string): unknown {
  const isConfigRestart = process.env.EXO_CONFIG_RESTART === "1";
  const jitiOptions: Record<string, unknown> = { esmResolve: true };
  if (isConfigRestart) {
    jitiOptions.moduleCache = false;
    jitiOptions.requireCache = false;
  }
  const jitiFn = require("jiti")(root, jitiOptions) as (path: string) => unknown;
  return jitiFn(configPath);
}

function loadNativeJs(configPath: string): unknown {
  const mod = require(configPath) as { default?: unknown } | undefined;
  return mod != null && "default" in mod && mod.default !== undefined
    ? mod.default
    : mod;
}

/** Unwrap ESM default export so config has plugins, manifest, etc. at top level. */
function unwrapConfig(mod: unknown): ExtenzoUserConfig {
  if (mod == null) return {} as ExtenzoUserConfig;
  if (
    typeof mod === "object" &&
    "default" in mod &&
    (mod as { default: unknown }).default !== undefined
  ) {
    return ((mod as { default: unknown }).default ?? {}) as ExtenzoUserConfig;
  }
  return (mod ?? {}) as ExtenzoUserConfig;
}

function loadConfigModule(root: string, p: string, file: string): ExtenzoUserConfig {
  const isNativeJs = file.endsWith(".js") || file.endsWith(".mjs");
  if (isNativeJs) {
    try {
      return unwrapConfig(loadNativeJs(p));
    } catch {
      /* fall back to jiti for ESM .js or other edge cases */
    }
  }
  return unwrapConfig(loadWithJiti(root, p));
}

/** Config loader: loads exo.config from project root and resolves full config and entry list. */
export class ConfigLoader {
  constructor(
    private readonly configFiles: readonly string[] = CONFIG_FILES,
    private readonly entryResolver: EntryResolver = new EntryResolver(),
    private readonly entryDiscoverer: EntryDiscoverer = new EntryDiscoverer()
  ) {}

  loadConfigFile(root: string): ExtenzoUserConfig | null {
    for (const file of this.configFiles) {
      const p = resolve(root, file);
      if (!existsSync(p)) continue;
      try {
        return loadConfigModule(root, p, file);
      } catch (e) {
        throw createConfigLoadError(p, e);
      }
    }
    return null;
  }

  /** Path to the first existing config file under root, or null if none. */
  getResolvedConfigFilePath(root: string): string | null {
    for (const file of this.configFiles) {
      const p = resolve(root, file);
      if (existsSync(p)) return p;
    }
    return null;
  }

  resolve(root: string): {
    config: ExtenzoResolvedConfig;
    baseEntries: EntryInfo[];
    entries: EntryInfo[];
  } {
    const t0 = performance.now();
    const user = this.loadConfigFile(root);
    if (!user) throw createConfigNotFoundError(root);
    logDoneTimed("Parse exo.config", Math.round(performance.now() - t0));

    const appDir = resolve(root, user.appDir ?? user.srcDir ?? DEFAULT_APP_DIR);
    const entryDisabled = user.entry === false;
    if (!entryDisabled && (!existsSync(appDir) || !statSync(appDir).isDirectory())) {
      throw createAppDirMissingError(appDir);
    }
    const outDir = user.outDir ?? DEFAULT_OUT_DIR;
    const outputRoot = user.outputRoot ?? EXTENZO_OUTPUT_ROOT;
    const t1 = performance.now();
    const resolvedManifest = resolveManifestInput(user.manifest, root, appDir);
    if (!resolvedManifest) throw createManifestMissingError();
    logDoneTimed("Parse manifest", Math.round(performance.now() - t1));

    const config: ExtenzoResolvedConfig = {
      ...user,
      manifest: resolvedManifest,
      appDir,
      outDir,
      outputRoot,
      root,
    };
    const baseDir = appDir;
    const t2 = performance.now();
    const baseEntries = entryDisabled ? [] : this.entryDiscoverer.discover(baseDir);
    const entries = entryDisabled ? [] : this.entryResolver.resolve(user, root, baseDir);
    if (!entryDisabled && entries.length === 0) throw createNoEntriesError(baseDir);
    logDoneTimed("Parse entries", Math.round(performance.now() - t2));
    return { config, baseEntries, entries };
  }
}

const defaultLoader = new ConfigLoader();

export function loadConfigFile(root: string): ExtenzoUserConfig | null {
  return defaultLoader.loadConfigFile(root);
}

export function getResolvedConfigFilePath(root: string): string | null {
  return defaultLoader.getResolvedConfigFilePath(root);
}

/** Clear Node module cache for the config file so next resolve() can load fresh config. */
export function clearConfigCache(configFilePath: string): void {
  try {
    delete require.cache[configFilePath];
  } catch {
    // ignore
  }
  for (const key of Object.keys(require.cache)) {
    const mod = require.cache[key] as { filename?: string } | undefined;
    if (mod?.filename === configFilePath) {
      try {
        delete require.cache[key];
      } catch {
        // ignore
      }
    }
  }
}

export function resolveExtenzoConfig(root: string): {
  config: ExtenzoResolvedConfig;
  baseEntries: EntryInfo[];
  entries: EntryInfo[];
} {
  return defaultLoader.resolve(root);
}
