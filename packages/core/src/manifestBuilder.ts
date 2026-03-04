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
  /**
   * Whether content css assets should be auto-filled into manifest.content_scripts[].css.
   * Default true; set false for shadow/iframe UI where css is injected via runtime style.
   */
  autoFillCssInManifest?: boolean;
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
  const both = hasChromium && hasFirefox;
  const match = both ? config[target] : null;
  const matchOk = match != null && typeof match === "object";

  if (both && matchOk) return { manifest: match as ManifestRecord };
  if (both) {
    const fallback = target === "firefox" ? config.chromium! : config.firefox!;
    return {
      manifest: fallback,
      warnMessage: `Build target is ${target} but manifest.${target} is missing; using ${target === "firefox" ? "chromium" : "firefox"} manifest.`,
    };
  }
  if (hasChromium) {
    const manifest = config.chromium!;
    const warnMessage = target === "firefox"
      ? "Build target is firefox but manifest only has chromium; using chromium manifest."
      : undefined;
    return { manifest, warnMessage };
  }
  if (hasFirefox) {
    const manifest = config.firefox!;
    const warnMessage = target === "chromium"
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
    map[key] = SCRIPT_KEYS_SET.has(key)
      ? buildScriptOutputPath(entry)
      : buildHtmlOutputPath(entry, MANIFEST_ENTRY_PATHS[key]);
  }
  return map;
}

/** True when value is considered "not set" for manifest entry fields. */
function isEntryFieldEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

type FillAction = (out: ManifestRecord, path: string) => void;

function makeBackgroundFiller(mv: 2 | 3): FillAction {
  return (out, path) => {
    const bg = (out.background as Record<string, unknown>) ?? {};
    if (mv === 3) {
      if (isEntryFieldEmpty((bg as { service_worker?: string }).service_worker)) {
        out.background = { ...bg, service_worker: path };
      }
    } else {
      const scripts = (bg as { scripts?: string[] }).scripts;
      if (!Array.isArray(scripts) || scripts.length === 0) {
        out.background = { ...bg, scripts: [path] };
      }
    }
  };
}

function makePopupFiller(mv: 2 | 3): FillAction {
  return (out, path) => {
    if (mv === 3) {
      const action = (out.action as Record<string, unknown>) ?? {};
      if (isEntryFieldEmpty((action as { default_popup?: string }).default_popup)) {
        out.action = { ...action, default_popup: path };
      }
    } else {
      const ba = (out.browser_action as Record<string, unknown>) ?? {};
      if (isEntryFieldEmpty((ba as { default_popup?: string }).default_popup)) {
        out.browser_action = { ...ba, default_popup: path };
      }
    }
  };
}

function makeOptionsFiller(mv: 2 | 3): FillAction {
  return (out, path) => {
    if (mv === 3) {
      const opt = (out.options_ui as Record<string, unknown>) ?? {};
      if (isEntryFieldEmpty((opt as { page?: string }).page)) {
        out.options_ui = { ...opt, page: path };
      }
    } else if (isEntryFieldEmpty((out as { options_page?: string }).options_page)) {
      (out as Record<string, unknown>).options_page = path;
    }
  };
}

function fillSidepanel(out: ManifestRecord, path: string): void {
  const sp = (out.side_panel as Record<string, unknown>) ?? {};
  if (isEntryFieldEmpty((sp as { default_path?: string }).default_path)) {
    out.side_panel = { ...sp, default_path: path };
  }
}

function fillDevtools(out: ManifestRecord, path: string): void {
  if (isEntryFieldEmpty((out as { devtools_page?: string }).devtools_page)) {
    (out as Record<string, unknown>).devtools_page = path;
  }
}

function fillSandbox(out: ManifestRecord, path: string): void {
  const sandbox = out.sandbox;
  if (sandbox === null || typeof sandbox !== "object" || Array.isArray(sandbox)) {
    out.sandbox = { pages: [path] };
    return;
  }
  const pages = (sandbox as { pages?: unknown }).pages;
  if (!Array.isArray(pages) || pages.length === 0) {
    out.sandbox = { ...sandbox, pages: [path] };
  }
}

function fillContent(out: ManifestRecord, path: string): void {
  const cs = out.content_scripts;
  if (!Array.isArray(cs) || cs.length === 0) {
    out.content_scripts = [
      { matches: ["<all_urls>"], js: [path], run_at: "document_idle" },
    ] as ManifestRecord["content_scripts"];
  }
}

function ensurePermission(out: ManifestRecord, permission: string): void {
  const current = out.permissions;
  if (!Array.isArray(current)) {
    out.permissions = [permission];
    return;
  }
  const exists = current.some((item) => item === permission);
  if (exists) return;
  out.permissions = [...current, permission];
}

function fillChromeUrlOverrideField(
  out: ManifestRecord,
  field: "newtab" | "bookmarks" | "history",
  path: string
): void {
  const overrides = (out.chrome_url_overrides as Record<string, unknown>) ?? {};
  if (isEntryFieldEmpty(overrides[field])) {
    out.chrome_url_overrides = { ...overrides, [field]: path };
  }
}

function makeChromeUrlOverrideFiller(
  field: "newtab" | "bookmarks" | "history"
): FillAction {
  return (out, path) => {
    fillChromeUrlOverrideField(out, field, path);
    if (field === "history") ensurePermission(out, "history");
    if (field === "bookmarks") ensurePermission(out, "bookmarks");
  };
}

/** Build fillers for MV2/MV3; only entry keys present in placeholderMap are used. */
function buildAutoFillers(mv: 2 | 3): Record<string, FillAction> {
  const map: Record<string, FillAction> = {
    background: makeBackgroundFiller(mv),
    popup: makePopupFiller(mv),
    options: makeOptionsFiller(mv),
    devtools: fillDevtools,
    sandbox: fillSandbox,
    content: fillContent,
    newtab: makeChromeUrlOverrideFiller("newtab"),
    bookmarks: makeChromeUrlOverrideFiller("bookmarks"),
    history: makeChromeUrlOverrideFiller("history"),
  };
  if (mv === 3) map.sidepanel = fillSidepanel;
  return map;
}

/**
 * Auto-fill built-in entry fields when user did not set them.
 * Only adds/fills fields for which there is a corresponding entry (placeholderMap has the key).
 * Respects manifest_version (2 vs 3) for field names.
 */
function autoFillEntryFields(
  manifest: ManifestRecord,
  placeholderMap: Record<string, string>
): ManifestRecord {
  const mv = manifest.manifest_version === 2 ? 2 : 3;
  const out: ManifestRecord = { ...manifest };
  const fillers = buildAutoFillers(mv);

  for (const [key, path] of Object.entries(placeholderMap)) {
    const fill = fillers[key];
    if (fill) fill(out, path);
  }

  return out;
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

function hasNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Resolve content_scripts [exo.content] placeholders.
 * - Expand js placeholders using contentScriptOutput.js (or fallback content path).
 * - Expand css placeholders only when user already configured `css` in manifest.
 * - Auto-fill `css` only when contentScriptOutput.autoFillCssInManifest !== false.
 * - If an item has no js and no css but content entry exists, inject js so Chrome requirement is met.
 */
function resolveContentScriptsPlaceholders(
  manifest: ManifestRecord,
  placeholderMap: Record<string, string>,
  contentScriptOutput?: ContentScriptOutput
): ManifestRecord {
  const contentScripts = manifest.content_scripts;
  if (!Array.isArray(contentScripts)) return manifest;

  const defaultContentJs = placeholderMap.content != null ? [placeholderMap.content] : [];
  const shouldAutoFillCss = contentScriptOutput?.autoFillCssInManifest !== false;
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
      const cssReplacement = contentScriptOutput?.css ?? [];
      const resolvedCss = (obj.css as unknown[]).flatMap((el) =>
        el === CONTENT_PLACEHOLDER ? cssReplacement : [el]
      );
      if (resolvedCss.length > 0) out.css = resolvedCss;
      else delete out.css;
    }

    const hadJs = hasNonEmptyStringArray(out.js);
    const hadCss = hasNonEmptyStringArray(out.css);
    if (!hadJs && !hadCss && placeholderMap.content) {
      out.js = contentScriptOutput?.js ?? defaultContentJs;
    }

    const hasJs = hasNonEmptyStringArray(out.js);
    const hasCss = hasNonEmptyStringArray(out.css);
    const isContentItem =
      hasJs &&
      placeholderMap.content != null &&
      (out.js as string[]).includes(placeholderMap.content);
    if (
      shouldAutoFillCss &&
      isContentItem &&
      (contentScriptOutput?.css?.length ?? 0) > 0 &&
      !hasCss
    ) {
      out.css = contentScriptOutput!.css;
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
  const afterAutoFill = autoFillEntryFields(manifest, placeholderMap);
  const afterContent = resolveContentScriptsPlaceholders(
    afterAutoFill,
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
   * contentScriptOutput: when provided, [exo.content] in content_scripts js/css is expanded to these arrays; css auto-fill can be disabled by autoFillCssInManifest=false.
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
 * contentScriptOutput: optional build output for content entry (js/css arrays); expands [exo.content], and auto-fills css unless disabled.
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
