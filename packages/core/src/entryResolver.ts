import { resolve, dirname, basename } from "path";
import { existsSync } from "fs";
import type { ExtenzoUserConfig, EntryInfo } from "./types.js";
import { HTML_ENTRY_NAMES, SCRIPT_EXTS } from "./constants.js";
import { EntryDiscoverer } from "./entryDiscoverer.js";

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
  const indexScript = findScriptInDir(dir);
  if (indexScript) return indexScript;
  const stem = basename(htmlFilename, ".html");
  for (const ext of SCRIPT_EXTS) {
    const p = resolve(dir, `${stem}${ext}`);
    if (existsSync(p)) return p;
  }
  return undefined;
}

/**
 * 入口解析器：默认发现 popup/options/background 等，config.entry 为覆盖逻辑。
 * - 先按目录发现默认入口（background、content、popup、options、sidepanel、devtools）。
 * - 若存在 config.entry，则仅对其中出现的 key 用用户配置覆盖或追加；未出现的 key 仍用默认发现结果。
 * - value 为 .html：按 popup/options 处理（HTML 入口，同目录找脚本）。
 * - value 为 .js/.ts 等：按 background/content 处理（仅脚本入口；仅保留名 popup/options/sidepanel/devtools 时推断同目录 index.html）。
 */
export class EntryResolver {
  constructor(private readonly discoverer: EntryDiscoverer = new EntryDiscoverer()) {}

  resolve(
    config: Pick<ExtenzoUserConfig, "entry" | "srcDir">,
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
      }
    }

    return Array.from(entryMap.values());
  }

  /** 解析单个 entry 配置项，返回 null 表示路径不存在或无法解析 */
  private resolveOne(baseDir: string, name: string, pathStr: string): EntryInfo | null {
    const resolved = resolve(baseDir, pathStr);
    if (!existsSync(resolved)) return null;

    if (isHtmlPath(pathStr)) {
      const htmlPath = resolved;
      const dir = dirname(htmlPath);
      const scriptPath = findScriptForHtmlDir(dir, basename(htmlPath));
      if (!scriptPath) return null;
      return { name, scriptPath, htmlPath };
    }
    if (isScriptPath(pathStr)) {
      const scriptPath = resolved;
      const htmlPath = this.inferHtmlPathForReservedName(name, scriptPath);
      return { name, scriptPath, htmlPath };
    }
    return null;
  }

  /** 仅对 popup/options/sidepanel/devtools 在脚本路径下推断同目录 index.html */
  private inferHtmlPathForReservedName(entryName: string, scriptPath: string): string | undefined {
    if (!HTML_ENTRY_SET.has(entryName as (typeof HTML_ENTRY_NAMES)[number])) return undefined;
    const dir = dirname(scriptPath);
    const htmlPath = resolve(dir, "index.html");
    return existsSync(htmlPath) ? htmlPath : undefined;
  }
}

const defaultResolver = new EntryResolver();

export function resolveEntries(
  config: Pick<ExtenzoUserConfig, "entry" | "srcDir">,
  root: string,
  baseDir: string
): EntryInfo[] {
  return defaultResolver.resolve(config, root, baseDir);
}
