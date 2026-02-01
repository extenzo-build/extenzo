import type { ManifestConfig, EntryInfo } from "./types.js";
import type { BrowserTarget } from "./constants.js";
/** Manifest 构建器：根据配置与入口生成各浏览器下的 manifest 对象。 */
export declare class ManifestBuilder {
    buildForBrowser(config: ManifestConfig, entries: EntryInfo[], browser: BrowserTarget): Record<string, unknown>;
    buildForChromium(config: ManifestConfig, entries: EntryInfo[]): Record<string, unknown>;
    buildForFirefox(config: ManifestConfig, entries: EntryInfo[]): Record<string, unknown>;
}
export declare function resolveManifestChromium(config: ManifestConfig, entries: EntryInfo[]): Record<string, unknown>;
export declare function resolveManifestFirefox(config: ManifestConfig, entries: EntryInfo[]): Record<string, unknown>;
