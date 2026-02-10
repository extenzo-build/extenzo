import { resolve, dirname, basename } from "path";
import { existsSync } from "fs";
import type { ExtenzoUserConfig, EntryInfo, EntryConfigValue } from "./types.ts";
import { HTML_ENTRY_NAMES, SCRIPT_EXTS } from "./constants.ts";
import { EntryDiscoverer } from "./entryDiscoverer.ts";
import { getScriptInjectIfMatches, parseExtenzoEntryFromHtml } from "./htmlEntry.ts";

const HTML_ENTRY_SET = new Set(HTML_ENTRY_NAMES);

function isHtmlPath(pathStr: string): boolean {
  return pathStr.trim().toLowerCase().endsWith(".html");
}

function isScriptPath(pathStr: string): boolean {
  const lower = pathStr.trim().toLowerCase();
  return SCRIPT_EXTS.some((ext) => lower.endsWith(ext));
}

function findScriptInDir(dir: string): string | undefined {
  for (const ext of SCRIPT_EXTS) {
    const p = resolve(dir, `index${ext}`);
    if (existsSync(p)) return p;
  }
  return undefined;
}

function findScriptForHtmlDir(dir: string, htmlFilename: string): string | undefined {
  const stem = basename(htmlFilename, ".html");
  for (const ext of SCRIPT_EXTS) {
    const p = resolve(dir, `${stem}${ext}`);
    if (existsSync(p)) return p;
  }
  const indexScript = findScriptInDir(dir);
  if (indexScript) return indexScript;
  return undefined;
}

function isEntryConfigObject(value: EntryConfigValue): value is { src: string; html?: boolean | string } {
  return typeof value === "object" && value !== null && "src" in value;
}

/** Resolve script path from HTML when it has data-extenzo-entry with src. scriptInject is applied later via enrichEntryWithScriptInject. */
function resolveScriptFromHtml(htmlPath: string): string | undefined {
  try {
    const parsed = parseExtenzoEntryFromHtml(htmlPath);
    if (!parsed || !isScriptPath(parsed.src)) return undefined;
    const scriptPath = resolve(dirname(htmlPath), parsed.src);
    return existsSync(scriptPath) ? scriptPath : undefined;
  } catch {
    return undefined;
  }
}

function resolveHtmlPath(baseDir: string, htmlValue: string | undefined): string | undefined {
  if (!htmlValue) return undefined;
  const resolved = resolve(baseDir, htmlValue);
  if (!isHtmlPath(resolved)) return undefined;
  return existsSync(resolved) ? resolved : undefined;
}

function resolveHtmlFlag(
  entryName: string,
  htmlValue: boolean | string | undefined,
  hasTemplate: boolean
): boolean {
  if (htmlValue === false) return false;
  if (htmlValue === true) return true;
  if (typeof htmlValue === "string") return hasTemplate;
  return isHtmlEntryName(entryName);
}

function isHtmlEntryName(entryName: string): boolean {
  return HTML_ENTRY_SET.has(entryName as (typeof HTML_ENTRY_NAMES)[number]);
}

/** Given a complete entry (with scriptPath and optionally htmlPath), set scriptInject when HTML has data-extenzo-entry pointing to that script. */
function enrichEntryWithScriptInject(entry: EntryInfo): EntryInfo {
  if (!entry.htmlPath || !entry.scriptPath) return entry;
  const scriptInject = getScriptInjectIfMatches(entry.htmlPath, entry.scriptPath);
  return scriptInject ? { ...entry, scriptInject } : entry;
}

/**
 * Entry resolver: discovers popup/options/background etc by default; config.entry overrides.
 * - First discover default entries (background, content, popup, options, sidepanel, devtools) from dirs.
 * - If config.entry exists, only those keys are overridden/added; others keep discovered result.
 * - value is .html: find script via data-extenzo-entry or same dir; if no script exists the entry is skipped.
 * - value is .js/.ts etc: reserved html entries infer index.html; custom entries are script-only unless html is set.
 */
export class EntryResolver {
  constructor(private readonly discoverer: EntryDiscoverer = new EntryDiscoverer()) {}

  resolve(
    config: Pick<ExtenzoUserConfig, "entry" | "appDir" | "srcDir">,
    _root: string,
    baseDir: string
  ): EntryInfo[] {
    const defaultEntries = this.discoverer.discover(baseDir);
    const entryMap = new Map<string, EntryInfo>(defaultEntries.map((e) => [e.name, e]));

    const entryConfig = config.entry;
    if (entryConfig && Object.keys(entryConfig).length > 0) {
      for (const [name, pathStr] of Object.entries(entryConfig)) {
        const resolved = this.resolveOne(baseDir, name, pathStr);
        if (resolved) entryMap.set(name, resolved);
        else entryMap.delete(name);
      }
    }

    return Array.from(entryMap.values());
  }

  /** Resolve a single entry config; returns null if path missing or unresolvable */
  private resolveOne(
    baseDir: string,
    name: string,
    value: EntryConfigValue
  ): EntryInfo | null {
    if (isEntryConfigObject(value)) {
      const scriptPath = resolve(baseDir, value.src);
      if (!existsSync(scriptPath) || !isScriptPath(scriptPath)) return null;
      const htmlPath = resolveHtmlPath(baseDir, typeof value.html === "string" ? value.html : undefined);
      if (typeof value.html === "string" && !htmlPath) return null;
      const inferredHtml = htmlPath ?? this.inferHtmlPathForReservedName(name, scriptPath);
      const html = resolveHtmlFlag(name, value.html, Boolean(htmlPath));
      const entry: EntryInfo = { name, scriptPath, htmlPath: inferredHtml, html };
      return enrichEntryWithScriptInject(entry);
    }

    const pathStr = value;
    const resolved = resolve(baseDir, pathStr);
    if (!existsSync(resolved)) return null;

    if (isHtmlPath(pathStr)) {
      const htmlPath = resolved;
      const dir = dirname(htmlPath);
      const scriptPath =
        resolveScriptFromHtml(htmlPath) ?? findScriptForHtmlDir(dir, basename(htmlPath));
      if (!scriptPath) return null;
      const entry: EntryInfo = { name, scriptPath, htmlPath, html: true };
      return enrichEntryWithScriptInject(entry);
    }
    if (isScriptPath(pathStr)) {
      const scriptPath = resolved;
      const htmlPath = this.inferHtmlPathForReservedName(name, scriptPath);
      const html = isHtmlEntryName(name);
      const entry: EntryInfo = { name, scriptPath, htmlPath, html };
      return enrichEntryWithScriptInject(entry);
    }
    return null;
  }

  /** For popup/options/sidepanel/devtools only, infer same-dir index.html from script path */
  private inferHtmlPathForReservedName(entryName: string, scriptPath: string): string | undefined {
    if (!HTML_ENTRY_SET.has(entryName as (typeof HTML_ENTRY_NAMES)[number])) return undefined;
    const dir = dirname(scriptPath);
    const htmlPath = resolve(dir, "index.html");
    return existsSync(htmlPath) ? htmlPath : undefined;
  }
}

const defaultResolver = new EntryResolver();

export function resolveEntries(
  config: Pick<ExtenzoUserConfig, "entry" | "appDir" | "srcDir">,
  root: string,
  baseDir: string
): EntryInfo[] {
  return defaultResolver.resolve(config, root, baseDir);
}
