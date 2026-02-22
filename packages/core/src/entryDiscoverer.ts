import { resolve, dirname } from "path";
import { existsSync, statSync } from "fs";
import type { EntryInfo } from "./types.ts";
import {
  SCRIPT_EXTS,
  HTML_ENTRY_NAMES,
  SCRIPT_ONLY_ENTRY_NAMES,
} from "./constants.ts";
import { getScriptInjectIfMatches, parseExtenzoEntryFromHtml } from "./htmlEntry.ts";

function findScriptInDir(dir: string, scriptExts: readonly string[]): string | undefined {
  for (const ext of scriptExts) {
    const p = resolve(dir, `index${ext}`);
    if (existsSync(p)) return p;
  }
  return undefined;
}

function findNamedScript(
  baseDir: string,
  name: string,
  scriptExts: readonly string[]
): string | undefined {
  for (const ext of scriptExts) {
    const p = resolve(baseDir, `${name}${ext}`);
    if (existsSync(p)) return p;
  }
  return undefined;
}

function findNamedHtml(baseDir: string, name: string): string | undefined {
  const p = resolve(baseDir, `${name}.html`);
  return existsSync(p) ? p : undefined;
}

function hasIndexHtml(dir: string): boolean {
  return existsSync(resolve(dir, "index.html"));
}

function isValidScriptExt(pathStr: string, scriptExts: readonly string[]): boolean {
  const lower = pathStr.trim().toLowerCase();
  return scriptExts.some((ext) => lower.endsWith(ext));
}

function resolveScriptFromHtmlWithInject(
  htmlPath: string,
  scriptExts: readonly string[]
): { scriptPath: string; inject: EntryInfo["scriptInject"] } | undefined {
  try {
    const parsed = parseExtenzoEntryFromHtml(htmlPath);
    if (!parsed || !isValidScriptExt(parsed.src, scriptExts)) return undefined;
    const scriptPath = resolve(dirname(htmlPath), parsed.src);
    return existsSync(scriptPath)
      ? { scriptPath, inject: parsed.inject }
      : undefined;
  } catch {
    return undefined;
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
    for (const name of this.scriptOnlyNames) {
      const singleScript = findNamedScript(baseDir, name, this.scriptExts);
      if (singleScript) {
        entries.push({ name, scriptPath: singleScript, html: false });
        continue;
      }
      const dir = resolve(baseDir, name);
      if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
      const scriptPath = findScriptInDir(dir, this.scriptExts);
      if (scriptPath) entries.push({ name, scriptPath, html: false });
    }
    for (const name of this.htmlEntryNames) {
      const singleScript = findNamedScript(baseDir, name, this.scriptExts);
      const singleHtml = findNamedHtml(baseDir, name);
      if (singleScript && singleHtml) {
        const scriptInject = getScriptInjectIfMatches(singleHtml, singleScript);
        entries.push({
          name,
          scriptPath: singleScript,
          htmlPath: singleHtml,
          html: true,
          scriptInject,
        });
        continue;
      }
      if (singleHtml) {
        const resolved = resolveScriptFromHtmlWithInject(
          singleHtml,
          this.scriptExts
        );
        if (resolved) {
          entries.push({
            name,
            scriptPath: resolved.scriptPath,
            htmlPath: singleHtml,
            html: true,
            scriptInject: resolved.inject,
          });
        }
        continue;
      }
      const dir = resolve(baseDir, name);
      if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
      const scriptPath = findScriptInDir(dir, this.scriptExts);
      if (scriptPath) {
        const htmlPath = hasIndexHtml(dir) ? resolve(dir, "index.html") : undefined;
        const scriptInject = htmlPath
          ? getScriptInjectIfMatches(htmlPath, scriptPath)
          : undefined;
        entries.push({
          name,
          scriptPath,
          htmlPath,
          html: true,
          scriptInject,
        });
        continue;
      }
      const htmlPath = hasIndexHtml(dir) ? resolve(dir, "index.html") : undefined;
      if (!htmlPath) continue;
      const resolved = resolveScriptFromHtmlWithInject(
        htmlPath,
        this.scriptExts
      );
      if (resolved) {
        entries.push({
          name,
          scriptPath: resolved.scriptPath,
          htmlPath,
          html: true,
          scriptInject: resolved.inject,
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
