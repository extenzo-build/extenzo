import {
  RELOAD_ENTRY_NAMES as RELOAD_NAMES,
  CONTENT_ENTRY_NAMES as CONTENT_NAMES,
  RELOAD_MANAGER_ENTRY_NAMES as RELOAD_MANAGER_NAMES,
} from "./constants";

type AssetLike = { filename?: string; info?: { contenthash?: string[]; chunkhash?: string[] } };
type ChunkLike = { id?: string; name?: string; hash?: string };
type EntrypointLike = {
  name?: string;
  chunks?: ReadonlyArray<ChunkLike>;
  getFiles?: () => ReadonlyArray<string>;
};
type CompilationLike = {
  entrypoints?: ReadonlyMap<string, EntrypointLike>;
  getAsset?: (name: string) => AssetLike | void;
  getAssets?: () => ReadonlyArray<AssetLike>;
  getStats?: () => { toJson: (opts?: unknown) => unknown };
};

/** Use first child stats when MultiCompiler produces MultiStats (stats.stats array). */
function getNormalizedStats(stats: unknown): unknown {
  if (!stats || typeof stats !== "object") return stats;
  const arr = (stats as { stats?: unknown[] }).stats;
  if (Array.isArray(arr) && arr.length > 0) return arr[0];
  return stats;
}

export function getCompilationFromStats(stats: unknown): CompilationLike | null {
  const s = getNormalizedStats(stats);
  if (!s || typeof s !== "object") return null;
  const comp = (s as { compilation?: CompilationLike }).compilation;
  return comp && typeof comp === "object" ? comp : null;
}

export function getEntrypointSignature(entrypoint: EntrypointLike | undefined): string | null {
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

function collectAssetHashes(asset: AssetLike | undefined): string[] {
  const info = asset?.info;
  if (info?.contenthash?.length) return [...info.contenthash];
  if (info?.chunkhash?.length) return [...info.chunkhash];
  return [];
}

/**
 * Signature from asset contenthash/chunkhash for this entry's output files only.
 * Stable when only other entries (e.g. options, popup) change — avoids fullHash pollution.
 */
function getEntrypointSignatureFromAssets(
  compilation: CompilationLike,
  entrypoint: EntrypointLike | undefined
): string | null {
  if (!entrypoint || typeof entrypoint.getFiles !== "function") return null;
  try {
    const files = entrypoint.getFiles();
    if (!files?.length) return null;
    const parts: string[] = [];
    const getAsset = compilation.getAsset;
    const getAssets = compilation.getAssets;
    for (const name of files) {
      const raw = typeof getAsset === "function" ? getAsset(name) : undefined;
      let asset: AssetLike | undefined =
        raw != null && typeof raw === "object" ? raw : undefined;
      if (!asset && typeof getAssets === "function") {
        const list = getAssets();
        asset = list?.find((a) => a?.filename === name);
      }
      parts.push(...collectAssetHashes(asset));
    }
    return parts.length > 0 ? [...parts].sort().join(",") : null;
  } catch {
    return null;
  }
}

export function getEntriesSignature(
  compilation: CompilationLike,
  entryNames: Set<string>
): string | null {
  const entrypoints = compilation.entrypoints;
  if (!entrypoints || typeof entrypoints.get !== "function") return null;
  const sigs: string[] = [];
  for (const name of entryNames) {
    const sig = getEntrypointSignature(entrypoints.get(name));
    if (sig) sigs.push(sig);
  }
  return sigs.length > 0 ? sigs.sort().join("|") : null;
}

export function getReloadEntriesSignature(stats: unknown): string | null {
  const compilation = getCompilationFromStats(stats);
  return compilation ? getEntriesSignature(compilation, RELOAD_NAMES) : null;
}

export function getContentEntriesSignature(stats: unknown): string | null {
  const compilation = getCompilationFromStats(stats);
  return compilation ? getEntriesSignature(compilation, CONTENT_NAMES) : null;
}

/** Single entry signature by entry name. Only use names in RELOAD_MANAGER_ENTRY_NAMES for reload scope. */
function getSingleEntrySignature(stats: unknown, entryName: string): string | null {
  if (!RELOAD_MANAGER_NAMES.has(entryName)) return null;
  const compilation = getCompilationFromStats(stats);
  if (!compilation?.entrypoints || typeof compilation.entrypoints.get !== "function") return null;
  const entrypoint = compilation.entrypoints.get(entryName) ?? undefined;
  const fromAssets = getEntrypointSignatureFromAssets(compilation, entrypoint);
  if (fromAssets) return fromAssets;
  return getEntrypointSignature(entrypoint);
}

/**
 * Entrypoint signature covers the whole dependency tree: when any file imported by the entry
 * (directly or indirectly) changes, the entry's chunk hash changes. So we only need to compare
 * content/background entrypoint signatures to know if "any related file" changed.
 */

let lastReloadSignature: string | null = null;
let lastContentSignature: string | null = null;
let lastBackgroundSignature: string | null = null;

export interface ReloadManagerDecision {
  /** True only when content or background entry output actually changed (precise). */
  shouldNotify: boolean;
  /** True when content entry changed (for toggle-extension-refresh-page). */
  contentChanged: boolean;
  /** True when background entry changed (for reload-extension). */
  backgroundChanged: boolean;
}

/** Normalize path for comparison (forward slashes). */
function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

type StatsJson = {
  chunks?: Array<{ id?: string; name?: string; names?: string[]; modules?: Array<{ name?: string; nameForCondition?: string; identifier?: string }> }>;
  modules?: Array<{ name?: string; nameForCondition?: string; identifier?: string; chunks?: (string | null | undefined)[] }>;
};

function getStatsJson(stats: unknown): StatsJson | null {
  try {
    const s = getNormalizedStats(stats);
    if (!s || typeof s !== "object") return null;
    const toJson = (s as { toJson?: (opts?: unknown) => unknown }).toJson;
    if (typeof toJson !== "function") return null;
    return toJson({ chunks: true, modules: true }) as StatsJson;
  } catch {
    return null;
  }
}

/**
 * Build chunkId -> entry names from Compilation.entrypoints (Rspack API).
 * entrypoints is Map<entryName, Entrypoint>, Entrypoint.chunks are the chunks for that entry.
 * See https://rspack.rs/zh/api/javascript-api/compilation
 */
function getChunkIdToEntryNamesFromCompilation(compilation: CompilationLike): Map<string, Set<string>> {
  const chunkIdToEntryNames = new Map<string, Set<string>>();
  const entrypoints = compilation.entrypoints;
  if (!entrypoints || typeof entrypoints.forEach !== "function") return chunkIdToEntryNames;
  try {
    entrypoints.forEach((entrypoint, entryName) => {
      const chunks = entrypoint?.chunks;
      if (!chunks || !Array.isArray(chunks)) return;
      for (const ch of chunks) {
        const id = ch?.id != null ? String(ch.id) : undefined;
        if (!id) continue;
        if (!chunkIdToEntryNames.has(id)) chunkIdToEntryNames.set(id, new Set());
        chunkIdToEntryNames.get(id)!.add(entryName);
      }
    });
  } catch {
    /* proxy may throw */
  }
  return chunkIdToEntryNames;
}

/**
 * Build mapping: entryName -> Set<normalized module path>.
 * Prefers Compilation API: compilation.entrypoints for entry->chunks, then compilation.getStats().toJson()
 * for module->chunks graph. Falls back to stats.toJson() chunk names when compilation.entrypoints is not available.
 */
export function getEntryToModulePaths(stats: unknown): Map<string, Set<string>> {
  const entryToPaths = new Map<string, Set<string>>();
  const compilation = getCompilationFromStats(stats);
  const json =
    compilation && typeof compilation.getStats === "function"
      ? (compilation.getStats()?.toJson?.({ chunks: true, modules: true }) as StatsJson)
      : getStatsJson(stats);
  if (!json?.chunks?.length) return entryToPaths;

  let chunkIdToEntryNames =
    compilation != null ? getChunkIdToEntryNamesFromCompilation(compilation) : new Map<string, Set<string>>();
  const fromCompilationEntrypoints = chunkIdToEntryNames.size > 0;

  if (!fromCompilationEntrypoints) {
    chunkIdToEntryNames = new Map<string, Set<string>>();
    for (const ch of json.chunks) {
      const names: string[] = Array.isArray(ch?.names) ? ch.names : ch?.name != null ? [ch.name] : [];
      if (ch.id == null) continue;
      const id = String(ch.id);
      if (!chunkIdToEntryNames.has(id)) chunkIdToEntryNames.set(id, new Set());
      names.forEach((n) => chunkIdToEntryNames.get(id)!.add(n));
    }
  }

  const addPathToEntries = (path: string, entryNames: Set<string>) => {
    const norm = normalizePath(path);
    for (const name of entryNames) {
      let set = entryToPaths.get(name);
      if (!set) {
        set = new Set();
        entryToPaths.set(name, set);
      }
      set.add(norm);
    }
  };

  if (Array.isArray(json.modules) && json.modules.length > 0) {
    for (const mod of json.modules) {
      const path = mod?.nameForCondition ?? mod?.name ?? mod?.identifier;
      if (!path || !mod?.chunks?.length) continue;
      const entryNames = new Set<string>();
      for (const id of mod.chunks) {
        if (id == null) continue;
        const names = chunkIdToEntryNames.get(String(id));
        if (names) names.forEach((n) => entryNames.add(n));
      }
      if (entryNames.size) addPathToEntries(path, entryNames);
    }
  } else {
    const chunksWithModules = json.chunks as Array<{ id?: string; names?: string[]; name?: string; modules?: Array<{ name?: string; nameForCondition?: string; identifier?: string }> }>;
    for (const ch of chunksWithModules) {
      const names: string[] = Array.isArray(ch?.names) ? ch.names : ch?.name != null ? [ch.name] : [];
      if (!Array.isArray(ch?.modules)) continue;
      const entryNames = new Set(names);
      for (const mod of ch.modules) {
        const path = mod?.nameForCondition ?? mod?.name ?? mod?.identifier;
        if (path && entryNames.size) addPathToEntries(path, entryNames);
      }
    }
  }
  return entryToPaths;
}

/** Which entry names contain this file path (using path normalization / endsWith). */
export function getEntriesForFile(
  entryToPaths: Map<string, Set<string>>,
  filePath: string
): string[] {
  const norm = normalizePath(filePath);
  const out: string[] = [];
  for (const [entryName, paths] of entryToPaths) {
    for (const p of paths) {
      const pn = normalizePath(p);
      if (norm === pn) {
        out.push(entryName);
        break;
      }
      if (pn.startsWith("./") && norm.endsWith(pn.slice(2))) {
        out.push(entryName);
        break;
      }
      if (norm.endsWith(pn) || pn.endsWith(norm)) {
        out.push(entryName);
        break;
      }
    }
  }
  return out;
}

/** Set of normalized module paths that belong to content or background chunks (from stats JSON). */
function getReloadManagerModulePaths(stats: unknown): Set<string> {
  const entryToPaths = getEntryToModulePaths(stats);
  const out = new Set<string>();
  for (const name of RELOAD_MANAGER_NAMES) {
    const paths = entryToPaths.get(name);
    if (paths) paths.forEach((p) => out.add(p));
  }
  return out;
}

/** Whether a single modified path matches any reload-manager module path (handles absolute vs relative). */
function pathMatchesReload(modifiedPath: string, reloadPaths: Set<string>): boolean {
  const norm = normalizePath(modifiedPath);
  if (reloadPaths.has(norm)) return true;
  for (const r of reloadPaths) {
    const rn = normalizePath(r);
    if (norm === rn) return true;
    if (rn.startsWith("./") && norm.endsWith(rn.slice(2))) return true;
    if (norm.endsWith(rn) || rn.endsWith(norm)) return true;
  }
  return false;
}

/** True if any path in modifiedFiles (normalized) is in the reload-manager module set. */
function modifiedFilesAffectReloadManager(
  modifiedFiles: ReadonlySet<string> | undefined,
  reloadPaths: Set<string>
): boolean {
  if (!modifiedFiles?.size) return false;
  if (reloadPaths.size === 0) return false;
  for (const f of modifiedFiles) {
    if (pathMatchesReload(f, reloadPaths)) return true;
  }
  return false;
}

/**
 * Using entry->module mapping: return true if any modified file belongs to content or background entry.
 */
function modifiedFilesAffectReloadManagerByEntry(
  modifiedFiles: ReadonlySet<string> | undefined,
  entryToPaths: Map<string, Set<string>>
): boolean {
  if (!modifiedFiles?.size) return false;
  for (const filePath of modifiedFiles) {
    const entries = getEntriesForFile(entryToPaths, filePath);
    if (entries.some((e) => RELOAD_MANAGER_NAMES.has(e))) return true;
  }
  return false;
}

function modifiedFilesAffectEntry(
  modifiedFiles: ReadonlySet<string> | undefined,
  entryToPaths: Map<string, Set<string>>,
  entryName: string
): boolean {
  if (!modifiedFiles?.size) return false;
  for (const filePath of modifiedFiles) {
    const entries = getEntriesForFile(entryToPaths, filePath);
    if (entries.includes(entryName)) return true;
  }
  return false;
}

/**
 * Single place to decide reloadManager WS notification and content-refresh.
 * Extension.js-style: when compiler.modifiedFiles is available, only notify if a modified file
 * belongs to content/background chunk. Otherwise fall back to signature comparison.
 */
export function getReloadManagerDecision(
  stats: unknown,
  context?: { compiler?: { modifiedFiles?: ReadonlySet<string> } }
): ReloadManagerDecision {
  const modifiedFiles = context?.compiler?.modifiedFiles;
  const entryToPaths = getEntryToModulePaths(stats);
  const reloadPaths = getReloadManagerModulePaths(stats);

  const contentSig = getSingleEntrySignature(stats, "content");
  const backgroundSig = getSingleEntrySignature(stats, "background");
  const signatureContentChanged = contentSig != null && lastContentSignature != null && contentSig !== lastContentSignature;
  const signatureBackgroundChanged = backgroundSig != null && lastBackgroundSignature != null && backgroundSig !== lastBackgroundSignature;
  const signatureShouldNotify =
    (contentSig != null && contentSig !== lastContentSignature) ||
    (backgroundSig != null && backgroundSig !== lastBackgroundSignature);

  if (contentSig != null) lastContentSignature = contentSig;
  if (backgroundSig != null) lastBackgroundSignature = backgroundSig;

  const useModifiedFiles =
    modifiedFiles != null && modifiedFiles.size > 0 && entryToPaths.size > 0;
  const fromModifiedFilesMatch =
    useModifiedFiles && modifiedFilesAffectReloadManagerByEntry(modifiedFiles, entryToPaths);
  const shouldNotify = useModifiedFiles ? fromModifiedFilesMatch : signatureShouldNotify;

  const contentChanged = shouldNotify && (useModifiedFiles
    ? modifiedFilesAffectEntry(modifiedFiles!, entryToPaths, "content")
    : signatureContentChanged);
  const backgroundChanged = shouldNotify && (useModifiedFiles
    ? modifiedFilesAffectEntry(modifiedFiles!, entryToPaths, "background")
    : signatureBackgroundChanged);

  return { shouldNotify, contentChanged, backgroundChanged };
}

export type ReloadKind = "reload-extension" | "toggle-extension" | "toggle-extension-refresh-page";

/**
 * Choose reload kind from decision and config.
 * - backgroundChanged → reload-extension (browser reload API).
 * - contentChanged + autoRefreshContentPage → toggle-extension-refresh-page (toggle + refresh current page).
 * - else → toggle-extension (toggle only).
 */
export function getReloadKindFromDecision(
  contentChanged: boolean,
  backgroundChanged: boolean,
  autoRefreshContentPage: boolean
): ReloadKind {
  if (backgroundChanged) return "reload-extension";
  if (contentChanged && autoRefreshContentPage) return "toggle-extension-refresh-page";
  return "toggle-extension";
}

/** True when content entry signature changed (uses same state as getReloadManagerDecision). */
export function isContentChanged(stats: unknown): boolean {
  const sig = getContentEntriesSignature(stats);
  const changed = sig !== null && lastContentSignature !== null && sig !== lastContentSignature;
  if (sig !== null) lastContentSignature = sig;
  return changed;
}
