import type {
  ManifestConfig,
  ManifestRecord,
  ChromiumFirefoxManifest,
  EntryInfo,
} from "./types.ts";
import { basename, extname } from "path";
import {
  MANIFEST_ENTRY_PATHS,
  MANIFEST_ENTRY_KEYS,
  SCRIPT_ONLY_ENTRY_NAMES,
} from "./constants.ts";
import type { BrowserTarget } from "./constants.ts";

/** Content script build output: multiple js and/or css files for the content entry. */
export interface ContentScriptOutput {
  js: string[];
  css: string[];
}

/** Placeholder format [exo.xxx]; xxx is a key from MANIFEST_ENTRY_PATHS */
const EXO_PLACEHOLDER_REGEX = /\[exo\.([a-z]+)\]/g;
const SCRIPT_KEYS_SET = new Set<string>(SCRIPT_ONLY_ENTRY_NAMES);

function isChromiumFirefoxManifest(m: ManifestConfig): m is ChromiumFirefoxManifest {
  return typeof m === "object" && m !== null && ("chromium" in m || "firefox" in m);
}

/** Pick manifest object for build by exo rules; returns warning text when target does not match. */
function pickManifestForTarget(
  config: ManifestConfig,
  target: BrowserTarget
): { manifest: ManifestRecord; warnMessage?: string } {
  if (!isChromiumFirefoxManifest(config)) {
    return { manifest: config };
  }
  const hasChromium = config.chromium != null && typeof config.chromium === "object";
  const hasFirefox = config.firefox != null && typeof config.firefox === "object";

  if (hasChromium && hasFirefox) {
    const match = config[target];
    if (match != null && typeof match === "object") {
      return { manifest: match };
    }
    const fallback = target === "firefox" ? config.chromium! : config.firefox!;
    return {
      manifest: fallback,
      warnMessage: `Build target is ${target} but manifest.${target} is missing; using ${target === "firefox" ? "chromium" : "firefox"} manifest.`,
    };
  }

  if (hasChromium) {
    const manifest = config.chromium!;
    const warnMessage =
      target === "firefox"
        ? "Build target is firefox but manifest only has chromium; using chromium manifest."
        : undefined;
    return { manifest, warnMessage };
  }

  if (hasFirefox) {
    const manifest = config.firefox!;
    const warnMessage =
      target === "chromium"
        ? "Build target is chromium but manifest only has firefox; using firefox manifest."
        : undefined;
    return { manifest, warnMessage };
  }

  const fallback: ManifestRecord | undefined = config.chromium ?? config.firefox;
  return {
    manifest: fallback ?? {},
    warnMessage: "Manifest has no chromium or firefox object; using fallback.",
  };
}

/** Build [exo.xxx] -> output path map from entries; only includes entries that exist. */
function buildPlaceholderMap(entries: EntryInfo[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const key of MANIFEST_ENTRY_KEYS) {
    const entry = entries.find((e) => e.name === key);
    if (!entry) continue;
    if (SCRIPT_KEYS_SET.has(key)) {
      map[key] = buildScriptOutputPath(entry);
    } else {
      map[key] = buildHtmlOutputPath(entry, MANIFEST_ENTRY_PATHS[key]);
    }
  }
  return map;
}

/** Replace [exo.xxx] in string with placeholderMap path; keep placeholder if no mapping. */
function replacePlaceholderInString(
  str: string,
  placeholderMap: Record<string, string>
): string {
  return str.replace(EXO_PLACEHOLDER_REGEX, (_, key: string) => {
    return key in placeholderMap ? placeholderMap[key] : `[exo.${key}]`;
  });
}

/** Deep-clone manifest and replace [exo.xxx] in all string values; unchanged if no placeholders. */
function replacePlaceholdersInValue(
  value: unknown,
  placeholderMap: Record<string, string>
): unknown {
  if (typeof value === "string") {
    return replacePlaceholderInString(value, placeholderMap);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replacePlaceholdersInValue(item, placeholderMap));
  }
  if (value !== null && typeof value === "object") {
    const out: ManifestRecord = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = replacePlaceholdersInValue(v, placeholderMap);
    }
    return out;
  }
  return value;
}

function isManifestRecord(value: unknown): value is ManifestRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const CONTENT_PLACEHOLDER = "[exo.content]";

/**
 * Resolve content_scripts [exo.content] placeholders: expand to js[] and css[].
 * If resolved css array is empty, delete the css field from that item.
 */
function resolveContentScriptsPlaceholders(
  manifest: ManifestRecord,
  placeholderMap: Record<string, string>,
  contentScriptOutput?: ContentScriptOutput
): ManifestRecord {
  const contentScripts = manifest.content_scripts;
  if (!Array.isArray(contentScripts)) return manifest;

  const defaultContentJs = placeholderMap.content != null ? [placeholderMap.content] : [];
  const defaultContentCss: string[] = [];

  const resolved = contentScripts.map((item: unknown) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return item;
    const obj = item as Record<string, unknown>;
    const out: Record<string, unknown> = { ...obj };

    if (Array.isArray(obj.js)) {
      const jsReplacement = contentScriptOutput?.js ?? defaultContentJs;
      out.js = (obj.js as unknown[]).flatMap((el) =>
        el === CONTENT_PLACEHOLDER ? jsReplacement : [el]
      );
    }

    if (Array.isArray(obj.css)) {
      const cssReplacement = contentScriptOutput?.css ?? defaultContentCss;
      const resolvedCss = (obj.css as unknown[]).flatMap((el) =>
        el === CONTENT_PLACEHOLDER ? cssReplacement : [el]
      );
      if (resolvedCss.length === 0) {
        delete out.css;
      } else {
        out.css = resolvedCss;
      }
    }

    return out;
  });

  return { ...manifest, content_scripts: resolved };
}

function buildForBrowser(
  manifest: ManifestRecord,
  entries: EntryInfo[],
  _browser: BrowserTarget,
  _onWarn?: (message: string) => void,
  contentScriptOutput?: ContentScriptOutput
): ManifestRecord {
  const placeholderMap = buildPlaceholderMap(entries);
  const afterContent = resolveContentScriptsPlaceholders(
    manifest,
    placeholderMap,
    contentScriptOutput
  );
  const out = replacePlaceholdersInValue(afterContent, placeholderMap);
  if (!isManifestRecord(out)) return manifest;
  return out;
}

function buildScriptOutputPath(entry: EntryInfo): string {
  const scriptStem = basename(entry.scriptPath, extname(entry.scriptPath));
  return scriptStem === entry.name ? `${entry.name}.js` : `${entry.name}/index.js`;
}

function buildHtmlOutputPath(entry: EntryInfo, fallback: string): string {
  if (!entry.htmlPath) return fallback;
  const htmlFile = basename(entry.htmlPath).toLowerCase();
  return htmlFile === `${entry.name}.html` ? `${entry.name}.html` : fallback;
}

/** Manifest builder: produces per-browser manifest from config and entries. */
export class ManifestBuilder {
  /**
   * Pick manifest by target and build output; optional onWarn when target mismatch.
   * contentScriptOutput: when provided, [exo.content] in content_scripts js/css is expanded to these arrays; empty css removes the css field.
   */
  buildForBrowser(
    config: ManifestConfig,
    entries: EntryInfo[],
    browser: BrowserTarget,
    onWarn?: (message: string) => void,
    contentScriptOutput?: ContentScriptOutput
  ): ManifestRecord {
    const { manifest, warnMessage } = pickManifestForTarget(config, browser);
    if (warnMessage && onWarn) onWarn(warnMessage);
    return buildForBrowser(manifest, entries, browser, onWarn, contentScriptOutput);
  }

  buildForChromium(config: ManifestConfig, entries: EntryInfo[]): ManifestRecord {
    return this.buildForBrowser(config, entries, "chromium");
  }

  buildForFirefox(config: ManifestConfig, entries: EntryInfo[]): ManifestRecord {
    return this.buildForBrowser(config, entries, "firefox");
  }
}

const defaultBuilder = new ManifestBuilder();

export function resolveManifestChromium(
  config: ManifestConfig,
  entries: EntryInfo[]
): ManifestRecord {
  return defaultBuilder.buildForChromium(config, entries);
}

export function resolveManifestFirefox(
  config: ManifestConfig,
  entries: EntryInfo[]
): ManifestRecord {
  return defaultBuilder.buildForFirefox(config, entries);
}

/**
 * Resolve manifest for current build target and produce output; onWarn when target mismatch.
 * contentScriptOutput: optional build output for content entry (js/css arrays); expands [exo.content] and removes css when empty.
 */
export function resolveManifestForTarget(
  config: ManifestConfig,
  entries: EntryInfo[],
  target: BrowserTarget,
  onWarn?: (message: string) => void,
  contentScriptOutput?: ContentScriptOutput
): ManifestRecord {
  return defaultBuilder.buildForBrowser(config, entries, target, onWarn, contentScriptOutput);
}
