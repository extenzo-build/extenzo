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
import { logDone } from "./logger.ts";

const require = createRequire(
  typeof __filename !== "undefined" ? __filename : import.meta.url
);

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
        const jiti = require("jiti")(root, { esmResolve: true });
        const mod = jiti(p);
        return mod.default ?? mod;
      } catch (e) {
        throw createConfigLoadError(p, e);
      }
    }
    return null;
  }

  resolve(root: string): {
    config: ExtenzoResolvedConfig;
    baseEntries: EntryInfo[];
    entries: EntryInfo[];
  } {
    logDone("Parse exo.config");
    const user = this.loadConfigFile(root);
    if (!user) throw createConfigNotFoundError(root);

    const appDir = resolve(root, user.appDir ?? user.srcDir ?? DEFAULT_APP_DIR);
    const entryDisabled = user.entry === false;
    if (!entryDisabled && (!existsSync(appDir) || !statSync(appDir).isDirectory())) {
      throw createAppDirMissingError(appDir);
    }
    const outDir = user.outDir ?? DEFAULT_OUT_DIR;
    const outputRoot = user.outputRoot ?? EXTENZO_OUTPUT_ROOT;
    logDone("Parse manifest");
    const resolvedManifest = resolveManifestInput(user.manifest, root, appDir);
    if (!resolvedManifest) throw createManifestMissingError();

    const config: ExtenzoResolvedConfig = {
      ...user,
      manifest: resolvedManifest,
      appDir,
      outDir,
      outputRoot,
      root,
    };
    const baseDir = appDir;
    logDone("Parse entries");
    const baseEntries = entryDisabled ? [] : this.entryDiscoverer.discover(baseDir);
    const entries = entryDisabled ? [] : this.entryResolver.resolve(user, root, baseDir);
    if (!entryDisabled && entries.length === 0) throw createNoEntriesError(baseDir);
    return { config, baseEntries, entries };
  }
}

const defaultLoader = new ConfigLoader();

export function loadConfigFile(root: string): ExtenzoUserConfig | null {
  return defaultLoader.loadConfigFile(root);
}

export function resolveExtenzoConfig(root: string): {
  config: ExtenzoResolvedConfig;
  baseEntries: EntryInfo[];
  entries: EntryInfo[];
} {
  return defaultLoader.resolve(root);
}
