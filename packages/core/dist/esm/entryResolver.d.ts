import type { ExtenzoUserConfig, EntryInfo } from "./types.js";
import { EntryDiscoverer } from "./entryDiscoverer.js";
/**
 * 入口解析器：默认发现 popup/options/background 等，config.entry 为覆盖逻辑。
 * - 先按目录发现默认入口（background、content、popup、options、sidepanel、devtools）。
 * - 若存在 config.entry，则仅对其中出现的 key 用用户配置覆盖或追加；未出现的 key 仍用默认发现结果。
 * - value 为 .html：按 popup/options 处理（HTML 入口，同目录找脚本）。
 * - value 为 .js/.ts 等：按 background/content 处理（仅脚本入口；仅保留名 popup/options/sidepanel/devtools 时推断同目录 index.html）。
 */
export declare class EntryResolver {
    private readonly discoverer;
    constructor(discoverer?: EntryDiscoverer);
    resolve(config: Pick<ExtenzoUserConfig, "entry" | "srcDir">, _root: string, baseDir: string): EntryInfo[];
    /** 解析单个 entry 配置项，返回 null 表示路径不存在或无法解析 */
    private resolveOne;
    /** 仅对 popup/options/sidepanel/devtools 在脚本路径下推断同目录 index.html */
    private inferHtmlPathForReservedName;
}
export declare function resolveEntries(config: Pick<ExtenzoUserConfig, "entry" | "srcDir">, root: string, baseDir: string): EntryInfo[];
