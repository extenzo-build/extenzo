import type { RsbuildPluginAPI } from "@rsbuild/core";
import type { ExtenzoResolvedConfig } from "@extenzo/core";
import type { EntryInfo } from "@extenzo/core";
export declare function entryPlugin(resolvedConfig: ExtenzoResolvedConfig, entries: EntryInfo[]): {
    name: string;
    setup(api: RsbuildPluginAPI): void;
};
