import type { EntryInfo } from "./types.js";
/** 入口发现器：在指定目录下发现 background、content、popup、options、sidepanel、devtools 入口。 */
export declare class EntryDiscoverer {
    private readonly scriptExts;
    private readonly scriptOnlyNames;
    private readonly htmlEntryNames;
    constructor(scriptExts?: readonly string[], scriptOnlyNames?: readonly string[], htmlEntryNames?: readonly string[]);
    discover(baseDir: string): EntryInfo[];
    getHtmlEntryNames(): string[];
    getScriptOnlyEntryNames(): string[];
}
export declare function discoverEntries(baseDir: string): EntryInfo[];
export declare function getHtmlEntryNames(): string[];
export declare function getScriptOnlyEntryNames(): string[];
