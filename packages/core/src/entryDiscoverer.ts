import { resolve } from "path";
import { existsSync, statSync } from "fs";
import type { EntryInfo } from "./types.js";
import {
  SCRIPT_EXTS,
  HTML_ENTRY_NAMES,
  SCRIPT_ONLY_ENTRY_NAMES,
} from "./constants.js";

function findScriptInDir(dir: string, scriptExts: readonly string[]): string | undefined {
  for (const ext of scriptExts) {
    const p = resolve(dir, `index${ext}`);
    if (existsSync(p)) return p;
  }
  return undefined;
}

function hasIndexHtml(dir: string): boolean {
  return existsSync(resolve(dir, "index.html"));
}

/** 入口发现器：在指定目录下发现 background、content、popup、options、sidepanel、devtools 入口。 */
export class EntryDiscoverer {
  constructor(
    private readonly scriptExts: readonly string[] = SCRIPT_EXTS,
    private readonly scriptOnlyNames: readonly string[] = SCRIPT_ONLY_ENTRY_NAMES,
    private readonly htmlEntryNames: readonly string[] = HTML_ENTRY_NAMES
  ) {}

  discover(baseDir: string): EntryInfo[] {
    const entries: EntryInfo[] = [];
    for (const name of this.scriptOnlyNames) {
      const dir = resolve(baseDir, name);
      if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
      const scriptPath = findScriptInDir(dir, this.scriptExts);
      if (scriptPath) entries.push({ name, scriptPath });
    }
    for (const name of this.htmlEntryNames) {
      const dir = resolve(baseDir, name);
      if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
      const scriptPath = findScriptInDir(dir, this.scriptExts);
      if (!scriptPath) continue;
      const htmlPath = hasIndexHtml(dir) ? resolve(dir, "index.html") : undefined;
      entries.push({ name, scriptPath, htmlPath });
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
