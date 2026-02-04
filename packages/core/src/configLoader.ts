import { createRequire } from "module";
import { resolve } from "path";
import { existsSync } from "fs";
import type { ExtenzoUserConfig, ExtenzoResolvedConfig, EntryInfo } from "./types.ts";
import {
  CONFIG_FILES,
  DEFAULT_OUT_DIR,
  DEFAULT_SRC_DIR,
  EXTENZO_OUTPUT_ROOT,
} from "./constants.ts";
import {
  createConfigLoadError,
  createConfigNotFoundError,
  createManifestMissingError,
  createNoEntriesError,
} from "./errors.ts";
import { EntryDiscoverer } from "./entryDiscoverer.ts";
import { EntryResolver } from "./entryResolver.ts";
import { resolveManifestInput } from "./manifestLoader.ts";

const require = createRequire(
  typeof __filename !== "undefined" ? __filename : import.meta.url
);

/** 配置加载器：从项目根目录加载 ext.config 并解析为完整配置与入口列表。 **/
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
    const user = this.loadConfigFile(root);
    if (!user) throw createConfigNotFoundError(root);

    const srcDir = resolve(root, user.srcDir ?? DEFAULT_SRC_DIR);
    const outDir = user.outDir ?? DEFAULT_OUT_DIR;
    const outputRoot = user.outputRoot ?? EXTENZO_OUTPUT_ROOT;
    const resolvedManifest = resolveManifestInput(user.manifest, root, srcDir);
    if (!resolvedManifest) throw createManifestMissingError();

    const config: ExtenzoResolvedConfig = {
      ...user,
      manifest: resolvedManifest,
      srcDir,
      outDir,
      outputRoot,
      root,
    };
    const baseDir = srcDir;
    const baseEntries = this.entryDiscoverer.discover(baseDir);
    const entries = this.entryResolver.resolve(user, root, baseDir);
    if (entries.length === 0) throw createNoEntriesError(baseDir);
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
