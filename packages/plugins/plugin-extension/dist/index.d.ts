import type { RsbuildPluginAPI } from "@rsbuild/core";
import type { ExtenzoResolvedConfig } from "@extenzo/core";
import type { EntryInfo } from "@extenzo/core";
/**
 * Only generates manifest.json after build and removes stray HTML for background/content.
 * Entry and HTML are handled by plugin-entry.
 */
export declare function extensionPlugin(resolvedConfig: ExtenzoResolvedConfig, entries: EntryInfo[]): {
    name: string;
    setup(api: RsbuildPluginAPI): void;
};
