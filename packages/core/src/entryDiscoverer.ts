import { resolve, dirname } from "path";
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

function readDirContents(dir: string): DirContents | null {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files = new Set<string>();
    const dirs = new Set<string>();
    for (const e of entries) {
      const name = e.name;
      if (e.isDirectory()) dirs.add(name);
      else if (e.isFile()) files.add(name);
    }
    return { files, dirs };
  } catch {
    return null;
  }
}

function findScriptInDir(dir: string, scriptExts: readonly string[]): string | undefined {
  const contents = readDirContents(dir);
  if (!contents) return undefined;
  for (const ext of scriptExts) {
    if (contents.files.has(`index${ext}`)) return resolve(dir, `index${ext}`);
  }
  return undefined;
}

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

function hasIndexHtmlInContents(contents: DirContents): boolean {
  return contents.files.has("index.html");
}

function isValidScriptExt(pathStr: string, scriptExts: readonly string[]): boolean {
  const lower = pathStr.trim().toLowerCase();
  return scriptExts.some((ext) => lower.endsWith(ext));
}

/**
 * When HTML has data-extenzo-entry with src: resolve script path (relative only, file must exist).
 * Throws ExtenzoError on invalid src or missing file.
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
 * If HTML has data-extenzo-entry with src, resolve script and return { scriptPath, inject }.
 * Throws on invalid src or missing file. Returns undefined when no data-extenzo-entry.
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

/** Entry discoverer: finds background, content, popup, options, sidepanel, devtools entries under a directory. */
export class EntryDiscoverer {
  constructor(
    private readonly scriptExts: readonly string[] = SCRIPT_EXTS,
    private readonly scriptOnlyNames: readonly string[] = SCRIPT_ONLY_ENTRY_NAMES,
    private readonly htmlEntryNames: readonly string[] = HTML_ENTRY_NAMES
  ) {}

  discover(baseDir: string): EntryInfo[] {
    const entries: EntryInfo[] = [];
    const baseContents = readDirContents(baseDir);

    for (const name of this.scriptOnlyNames) {
      const singleScript = findNamedScript(
        baseDir,
        name,
        this.scriptExts,
        baseContents
      );
      if (singleScript) {
        entries.push({ name, scriptPath: singleScript, html: false });
        continue;
      }
      if (!baseContents?.dirs.has(name)) continue;
      const dirPath = resolve(baseDir, name);
      const scriptPath = findScriptInDir(dirPath, this.scriptExts);
      if (scriptPath) entries.push({ name, scriptPath, html: false });
    }

    for (const name of this.htmlEntryNames) {
      const singleScript = findNamedScript(
        baseDir,
        name,
        this.scriptExts,
        baseContents
      );
      const singleHtml = findNamedHtml(baseDir, name, baseContents);
      if (singleScript && singleHtml) {
        const fromHtml = tryResolveEntryFromHtml(singleHtml, this.scriptExts);
        if (fromHtml) {
          entries.push({
            name,
            scriptPath: fromHtml.scriptPath,
            htmlPath: singleHtml,
            html: true,
            scriptInject: fromHtml.inject,
            outputFollowsScriptPath: true,
          });
        } else {
          const scriptInject = getScriptInjectIfMatches(singleHtml, singleScript);
          entries.push({
            name,
            scriptPath: singleScript,
            htmlPath: singleHtml,
            html: true,
            scriptInject,
          });
        }
        continue;
      }
      if (singleHtml) {
        const fromHtml = tryResolveEntryFromHtml(singleHtml, this.scriptExts);
        if (fromHtml) {
          entries.push({
            name,
            scriptPath: fromHtml.scriptPath,
            htmlPath: singleHtml,
            html: true,
            scriptInject: fromHtml.inject,
            outputFollowsScriptPath: true,
          });
          continue;
        }
        const conventional = findNamedScript(
          baseDir,
          name,
          this.scriptExts,
          baseContents
        );
        if (conventional) {
          const scriptInject = getScriptInjectIfMatches(singleHtml, conventional);
          entries.push({
            name,
            scriptPath: conventional,
            htmlPath: singleHtml,
            html: true,
            scriptInject,
          });
        }
        continue;
      }
      if (!baseContents?.dirs.has(name)) continue;
      const dirPath = resolve(baseDir, name);
      const subContents = readDirContents(dirPath);
      const htmlPathInDir =
        subContents && hasIndexHtmlInContents(subContents)
          ? resolve(dirPath, "index.html")
          : undefined;
      const scriptInDir = findScriptInDirFromContents(
        dirPath,
        subContents,
        this.scriptExts
      );
      if (scriptInDir && htmlPathInDir) {
        const fromHtml = tryResolveEntryFromHtml(htmlPathInDir, this.scriptExts);
        if (fromHtml) {
          entries.push({
            name,
            scriptPath: fromHtml.scriptPath,
            htmlPath: htmlPathInDir,
            html: true,
            scriptInject: fromHtml.inject,
            outputFollowsScriptPath: true,
          });
        } else {
          const scriptInject = getScriptInjectIfMatches(
            htmlPathInDir,
            scriptInDir
          );
          entries.push({
            name,
            scriptPath: scriptInDir,
            htmlPath: htmlPathInDir,
            html: true,
            scriptInject,
          });
        }
        continue;
      }
      if (scriptInDir) {
        entries.push({
          name,
          scriptPath: scriptInDir,
          htmlPath: htmlPathInDir,
          html: true,
          scriptInject: htmlPathInDir
            ? getScriptInjectIfMatches(htmlPathInDir, scriptInDir)
            : undefined,
        });
        continue;
      }
      if (!htmlPathInDir) continue;
      const fromHtml = tryResolveEntryFromHtml(htmlPathInDir, this.scriptExts);
      if (fromHtml) {
        entries.push({
          name,
          scriptPath: fromHtml.scriptPath,
          htmlPath: htmlPathInDir,
          html: true,
          scriptInject: fromHtml.inject,
          outputFollowsScriptPath: true,
        });
      }
    }
    return entries;
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
