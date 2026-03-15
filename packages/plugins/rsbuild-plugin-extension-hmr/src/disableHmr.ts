import { resolve } from "path";
import { getEntryTag, HMR_INVALIDATE_PREPEND } from "./constants";
import type { ReloadManagerEntry } from "./types";

export function normalizePathForCompare(p: string): string {
  return resolve(p).replace(/\\/g, "/");
}

export function isReloadManagerEntryPath(resourcePath: string, entryPaths: string[]): boolean {
  if (entryPaths.length === 0) return false;
  const normalized = normalizePathForCompare(resourcePath);
  return entryPaths.some((entryPath) => normalizePathForCompare(entryPath) === normalized);
}

function findReloadManagerEntry(resourcePath: string, entries: ReloadManagerEntry[]): ReloadManagerEntry | null {
  if (entries.length === 0) return null;
  const normalized = normalizePathForCompare(resourcePath);
  return entries.find((e) => normalizePathForCompare(e.path) === normalized) ?? null;
}

function isReloadManagerEntriesList(
  v: ReloadManagerEntry[] | string[]
): v is ReloadManagerEntry[] {
  return (
    v.length > 0 &&
    typeof v[0] === "object" &&
    v[0] !== null &&
    "path" in v[0]
  );
}

/**
 * Transforms content/background entry modules:
 * - Injects entry tag comment (extenzo-entry:content / extenzo-entry:background) at top when entries have names.
 * - Prepends module.hot.invalidate() so reload is via reloadManager only.
 */
export function transformCodeToDisableHmr(
  resourcePath: string,
  entriesOrPaths: ReloadManagerEntry[] | string[],
  code: string
): string {
  const entries: ReloadManagerEntry[] = isReloadManagerEntriesList(entriesOrPaths)
    ? entriesOrPaths
    : (entriesOrPaths as string[]).map((path) => ({ name: "", path }));
  if (entries.length === 0) return code;

  const entry = findReloadManagerEntry(resourcePath, entries);
  if (!entry) return code;

  const tag = entry.name ? getEntryTag(entry.name) : "";
  const tagLine = tag ? `${tag}\n` : "";
  return tagLine + HMR_INVALIDATE_PREPEND + code;
}
