import type { ManifestConfig, EntryInfo } from "./types.js";
import { MANIFEST_ENTRY_PATHS } from "./constants.js";
import type { BrowserTarget } from "./constants.js";

function isChromiumFirefoxManifest(
  m: ManifestConfig
): m is { chromium?: Record<string, unknown>; firefox?: Record<string, unknown> } {
  return typeof m === "object" && m !== null && ("chromium" in m || "firefox" in m);
}

function buildForBrowser(
  manifest: Record<string, unknown>,
  entries: EntryInfo[],
  _browser: BrowserTarget
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...manifest };
  if (entries.some((e) => e.name === "background")) {
    (out as Record<string, unknown>).background = {
      service_worker: MANIFEST_ENTRY_PATHS.background,
    };
  }
  if (entries.some((e) => e.name === "content")) {
    (out as Record<string, unknown>).content_scripts = MANIFEST_ENTRY_PATHS.contentScripts;
  }
  if (entries.some((e) => e.name === "popup")) {
    (out as Record<string, unknown>).action = (out as Record<string, unknown>).action || {};
    const action = (out as Record<string, unknown>).action as Record<string, unknown>;
    action.default_popup = MANIFEST_ENTRY_PATHS.popup;
  }
  if (entries.some((e) => e.name === "options")) {
    (out as Record<string, unknown>).options_ui = {
      page: MANIFEST_ENTRY_PATHS.options,
      open_in_tab: MANIFEST_ENTRY_PATHS.optionsOpenInTab,
    };
  }
  if (entries.some((e) => e.name === "sidepanel")) {
    (out as Record<string, unknown>).side_panel = {
      default_path: MANIFEST_ENTRY_PATHS.sidepanel,
    };
  }
  if (entries.some((e) => e.name === "devtools")) {
    (out as Record<string, unknown>).devtools_page = MANIFEST_ENTRY_PATHS.devtools;
  }
  return out;
}

/** Manifest 构建器：根据配置与入口生成各浏览器下的 manifest 对象。 */
export class ManifestBuilder {
  buildForBrowser(
    config: ManifestConfig,
    entries: EntryInfo[],
    browser: BrowserTarget
  ): Record<string, unknown> {
    const base = isChromiumFirefoxManifest(config)
      ? browser === "firefox"
        ? (config.firefox ?? config.chromium ?? {})
        : (config.chromium ?? config.firefox ?? {})
      : (config as Record<string, unknown>);
    return buildForBrowser(base as Record<string, unknown>, entries, browser);
  }

  buildForChromium(config: ManifestConfig, entries: EntryInfo[]): Record<string, unknown> {
    return this.buildForBrowser(config, entries, "chromium");
  }

  buildForFirefox(config: ManifestConfig, entries: EntryInfo[]): Record<string, unknown> {
    return this.buildForBrowser(config, entries, "firefox");
  }
}

const defaultBuilder = new ManifestBuilder();

export function resolveManifestChromium(
  config: ManifestConfig,
  entries: EntryInfo[]
): Record<string, unknown> {
  return defaultBuilder.buildForChromium(config, entries);
}

export function resolveManifestFirefox(
  config: ManifestConfig,
  entries: EntryInfo[]
): Record<string, unknown> {
  return defaultBuilder.buildForFirefox(config, entries);
}
