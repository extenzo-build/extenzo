import { resolve } from "path";
import { existsSync, readdirSync } from "fs";
import type { EntryInfo } from "./types.ts";
import {
  SCRIPT_EXTS,
  HTML_ENTRY_NAMES,
  SCRIPT_ONLY_ENTRY_NAMES,
} from "./constants.ts";
import {
  getScriptInjectIfMatches,
  parseExtenzoEntryFromHtml,
  resolveScriptFromHtmlStrict,
} from "./htmlEntry.ts";
import { createEntryScriptFromHtmlError } from "./errors.ts";

interface DirContents {
  files: Set<string>;
  dirs: Set<string>;
}

/** Read directory contents, separating files from subdirectories. */
function readDirContents(dir: string): DirContents | null {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files = new Set<string>();
    const dirs = new Set<string>();
    for (const e of entries) {
      if (e.isDirectory()) dirs.add(e.name);
      else if (e.isFile()) files.add(e.name);
    }
    return { files, dirs };
  } catch {
    return null;
  }
}

/** Find an index script file in the directory (by extension priority). */
function findScriptInDir(dir: string, scriptExts: readonly string[]): string | undefined {
  const contents = readDirContents(dir);
  if (!contents) return undefined;
  for (const ext of scriptExts) {
    if (contents.files.has(`index${ext}`)) return resolve(dir, `index${ext}`);
  }
  return undefined;
}

/** Find an index script using pre-read directory contents to avoid redundant IO. */
function findScriptInDirFromContents(
  dirPath: string,
  contents: DirContents | null,
  scriptExts: readonly string[]
): string | undefined {
  if (!contents) return findScriptInDir(dirPath, scriptExts);
  for (const ext of scriptExts) {
    if (contents.files.has(`index${ext}`)) return resolve(dirPath, `index${ext}`);
  }
  return undefined;
}

/** Find a named script file in the base directory (e.g. popup.ts / popup.js). */
function findNamedScript(
  baseDir: string,
  name: string,
  scriptExts: readonly string[],
  baseContents: DirContents | null
): string | undefined {
  if (baseContents) {
    for (const ext of scriptExts) {
      if (baseContents.files.has(`${name}${ext}`)) return resolve(baseDir, `${name}${ext}`);
    }
    return undefined;
  }
  for (const ext of scriptExts) {
    const p = resolve(baseDir, `${name}${ext}`);
    if (existsSync(p)) return p;
  }
  return undefined;
}

/** Find a named HTML file in the base directory. */
function findNamedHtml(
  baseDir: string,
  name: string,
  baseContents: DirContents | null
): string | undefined {
  if (baseContents) {
    return baseContents.files.has(`${name}.html`) ? resolve(baseDir, `${name}.html`) : undefined;
  }
  const p = resolve(baseDir, `${name}.html`);
  return existsSync(p) ? p : undefined;
}

function isValidScriptExt(pathStr: string, scriptExts: readonly string[]): boolean {
  const lower = pathStr.trim().toLowerCase();
  return scriptExts.some((ext) => lower.endsWith(ext));
}

/**
 * Resolve script path from HTML data-extenzo-entry attribute.
 * Only relative paths accepted; file must exist. Throws ExtenzoError otherwise.
 */
function resolveScriptFromHtmlWithInjectStrict(
  htmlPath: string,
  scriptExts: readonly string[]
): { scriptPath: string; inject: EntryInfo["scriptInject"] } {
  const resolved = resolveScriptFromHtmlStrict(htmlPath);
  if (!isValidScriptExt(resolved.scriptPath, scriptExts)) {
    throw createEntryScriptFromHtmlError(
      htmlPath,
      `Resolved path is not a supported script: ${resolved.scriptPath}`
    );
  }
  return resolved;
}

/**
 * Try resolving entry from HTML data-extenzo-entry.
 * Returns undefined when no data-extenzo-entry; throws on invalid src or missing file.
 */
function tryResolveEntryFromHtml(
  htmlPath: string,
  scriptExts: readonly string[]
): { scriptPath: string; inject: EntryInfo["scriptInject"] } | undefined {
  let parsed: ReturnType<typeof parseExtenzoEntryFromHtml>;
  try {
    parsed = parseExtenzoEntryFromHtml(htmlPath);
  } catch {
    return undefined;
  }
  if (!parsed) return undefined;
  try {
    return resolveScriptFromHtmlWithInjectStrict(htmlPath, scriptExts);
  } catch (e) {
    throw createEntryScriptFromHtmlError(
      htmlPath,
      e instanceof Error ? e.message : String(e)
    );
  }
}

/**
 * Build an HTML entry from an HTML resolution result and a conventional script path.
 * Handles both data-extenzo-entry and conventional script discovery in one place,
 * eliminating the repeated pattern across discovery scenarios.
 */
function buildHtmlEntryInfo(
  name: string,
  htmlPath: string,
  conventionalScriptPath: string | undefined,
  scriptExts: readonly string[]
): EntryInfo | null {
  const fromHtml = tryResolveEntryFromHtml(htmlPath, scriptExts);
  if (fromHtml) {
    return {
      name,
      scriptPath: fromHtml.scriptPath,
      htmlPath,
      html: true,
      scriptInject: fromHtml.inject,
      outputFollowsScriptPath: true,
    };
  }
  if (!conventionalScriptPath) return null;
  return {
    name,
    scriptPath: conventionalScriptPath,
    htmlPath,
    html: true,
    scriptInject: getScriptInjectIfMatches(htmlPath, conventionalScriptPath),
  };
}

/** Entry discoverer: finds built-in entries (script-only + HTML entries) under a directory. */
export class EntryDiscoverer {
  constructor(
    private readonly scriptExts: readonly string[] = SCRIPT_EXTS,
    private readonly scriptOnlyNames: readonly string[] = SCRIPT_ONLY_ENTRY_NAMES,
    private readonly htmlEntryNames: readonly string[] = HTML_ENTRY_NAMES
  ) {}

  /** Scan directory and discover all built-in entries. */
  discover(baseDir: string): EntryInfo[] {
    const entries: EntryInfo[] = [];
    const baseContents = readDirContents(baseDir);

    for (const name of this.scriptOnlyNames) {
      const entry = this.discoverScriptOnlyEntry(baseDir, name, baseContents);
      if (entry) entries.push(entry);
    }

    for (const name of this.htmlEntryNames) {
      const entry = this.discoverHtmlEntry(baseDir, name, baseContents);
      if (entry) entries.push(entry);
    }

    return entries;
  }

  /** Discover a script-only entry (background / content): try single file first, then subdirectory. */
  private discoverScriptOnlyEntry(
    baseDir: string,
    name: string,
    baseContents: DirContents | null
  ): EntryInfo | null {
    const singleScript = findNamedScript(baseDir, name, this.scriptExts, baseContents);
    if (singleScript) return { name, scriptPath: singleScript, html: false };

    if (!baseContents?.dirs.has(name)) return null;
    const scriptPath = findScriptInDir(resolve(baseDir, name), this.scriptExts);
    return scriptPath ? { name, scriptPath, html: false } : null;
  }

  /**
   * Discover an HTML entry (popup / options / sidepanel etc.).
   * Priority: 1. flat files in base dir  2. subdirectory
   */
  private discoverHtmlEntry(
    baseDir: string,
    name: string,
    baseContents: DirContents | null
  ): EntryInfo | null {
    const flatEntry = this.discoverHtmlEntryFromFlat(baseDir, name, baseContents);
    if (flatEntry) return flatEntry;
    return this.discoverHtmlEntryFromDir(baseDir, name, baseContents);
  }

  /** Discover HTML entry from flat files in the base directory (e.g. popup.ts + popup.html). */
  private discoverHtmlEntryFromFlat(
    baseDir: string,
    name: string,
    baseContents: DirContents | null
  ): EntryInfo | null {
    const singleScript = findNamedScript(baseDir, name, this.scriptExts, baseContents);
    const singleHtml = findNamedHtml(baseDir, name, baseContents);

    if (singleScript && singleHtml) {
      return buildHtmlEntryInfo(name, singleHtml, singleScript, this.scriptExts);
    }
    if (singleHtml) {
      const conventional = findNamedScript(baseDir, name, this.scriptExts, baseContents);
      return buildHtmlEntryInfo(name, singleHtml, conventional, this.scriptExts);
    }
    return null;
  }

  /** Discover HTML entry from a subdirectory (e.g. popup/index.ts + popup/index.html). */
  private discoverHtmlEntryFromDir(
    baseDir: string,
    name: string,
    baseContents: DirContents | null
  ): EntryInfo | null {
    if (!baseContents?.dirs.has(name)) return null;

    const dirPath = resolve(baseDir, name);
    const subContents = readDirContents(dirPath);
    const htmlPath = subContents?.files.has("index.html")
      ? resolve(dirPath, "index.html")
      : undefined;
    const scriptPath = findScriptInDirFromContents(dirPath, subContents, this.scriptExts);

    if (scriptPath && htmlPath) {
      return buildHtmlEntryInfo(name, htmlPath, scriptPath, this.scriptExts);
    }
    if (scriptPath) {
      return {
        name,
        scriptPath,
        htmlPath,
        html: true,
        scriptInject: htmlPath
          ? getScriptInjectIfMatches(htmlPath, scriptPath)
          : undefined,
      };
    }
    if (!htmlPath) return null;
    return buildHtmlEntryInfo(name, htmlPath, undefined, this.scriptExts);
  }

  getHtmlEntryNames(): string[] {
    return [...this.htmlEntryNames];
  }

  getScriptOnlyEntryNames(): string[] {
    return [...this.scriptOnlyNames];
  }
}

const defaultDiscoverer = new EntryDiscoverer();

export function discoverEntries(baseDir: string): EntryInfo[] {
  return defaultDiscoverer.discover(baseDir);
}

export function getHtmlEntryNames(): string[] {
  return defaultDiscoverer.getHtmlEntryNames();
}

export function getScriptOnlyEntryNames(): string[] {
  return defaultDiscoverer.getScriptOnlyEntryNames();
}
