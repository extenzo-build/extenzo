/**
 * Entry names and HMR snippets used across the HMR plugin.
 * RELOAD_MANAGER_ENTRY_NAMES is the single source of truth for "reload via WS only".
 */

/** Entry names that require chrome.runtime.reload() when changed (background). */
export const RELOAD_ENTRY_NAMES = new Set<string>(["background"]);

/** Entry names injected into pages; when changed, reload manager refreshes active tab. */
export const CONTENT_ENTRY_NAMES = new Set<string>(["content"]);

/**
 * Pure JS entries updated only via reloadManager (no Rsbuild HMR/liveReload).
 * Pipeline and plugin use this to decide reloadManagerEntries and WS notification scope.
 */
export const RELOAD_MANAGER_ENTRY_NAMES = new Set<string>(["content", "background"]);

/** Injected at top of entry module for precise identification; only content/background. */
export const EXTENZO_ENTRY_TAG_PREFIX = "/* extenzo-entry:";

/** Build entry tag comment for a given entry name (content/background). Used for precise entry identification in built output. */
export function getEntryTag(entryName: string): string {
  return RELOAD_MANAGER_ENTRY_NAMES.has(entryName)
    ? `${EXTENZO_ENTRY_TAG_PREFIX}${entryName} */`
    : "";
}

/** Prepended to content/background entry modules: force full invalidation so reload is via reloadManager only. */
export const HMR_INVALIDATE_PREPEND =
  "if(typeof module!=='undefined'&&module.hot){module.hot.invalidate();}\n";
