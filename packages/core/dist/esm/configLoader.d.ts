import type { ExtenzoUserConfig, ExtenzoResolvedConfig } from "./types.js";
import type { EntryInfo } from "./types.js";
import { EntryDiscoverer } from "./entryDiscoverer.js";
import { EntryResolver } from "./entryResolver.js";
/** 配置加载器：从项目根目录加载 ext.config 并解析为完整配置与入口列表。 */
export declare class ConfigLoader {
    private readonly configFiles;
    private readonly entryResolver;
    private readonly entryDiscoverer;
    constructor(configFiles?: readonly string[], entryResolver?: EntryResolver, entryDiscoverer?: EntryDiscoverer);
    loadConfigFile(root: string): ExtenzoUserConfig | null;
    resolve(root: string): {
        config: ExtenzoResolvedConfig;
        baseEntries: EntryInfo[];
        entries: EntryInfo[];
    };
}
export declare function loadConfigFile(root: string): ExtenzoUserConfig | null;
export declare function resolveExtenzoConfig(root: string): {
    config: ExtenzoResolvedConfig;
    baseEntries: EntryInfo[];
    entries: EntryInfo[];
};
