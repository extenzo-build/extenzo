import { RsbuildConfig } from '@rsbuild/core';

/** Manifest content; can be a single object or split by chromium/firefox */
type ManifestConfig = Record<string, unknown> | {
    chromium?: Record<string, unknown>;
    firefox?: Record<string, unknown>;
};
/** Extra page item for extraPages or preset 'video-roll' */
interface ExtraPageItem {
    name: string;
    scriptPath: string;
    htmlPath?: string;
    outHtml?: string;
}
/** User ext config */
interface ExtenzoUserConfig {
    /** Extension manifest; single object or chromium/firefox split */
    manifest: ManifestConfig;
    /** Rsbuild plugins array; use function calls like Vite, e.g. plugins: [vue()] */
    plugins?: RsbuildConfig["plugins"];
    /**
     * Override/extend Rsbuild config (like Vite's build.rollupOptions / esbuild).
     * Object: deep-merge with base; function: (base) => config for full control.
     */
    rsbuildConfig?: RsbuildConfig | ((base: RsbuildConfig) => RsbuildConfig | Promise<RsbuildConfig>);
    /** Extra page entries: preset 'video-roll' or custom array; merged by plugin-entry */
    extraPages?: ExtraPageItem[] | "video-roll";
    /** Source directory; default project root */
    srcDir?: string;
    /** Output directory; default "dist" */
    outDir?: string;
    /**
     * @deprecated Use rsbuildConfig instead. Kept for compatibility; only function form applies.
     */
    rsbuild?: (base: RsbuildConfig) => RsbuildConfig | Promise<RsbuildConfig>;
}
/** Resolved config with root and resolved srcDir/outDir */
interface ExtenzoResolvedConfig extends ExtenzoUserConfig {
    srcDir: string;
    outDir: string;
    root: string;
}
/** Discovered entry info */
interface EntryInfo {
    name: string;
    scriptPath: string;
    htmlPath?: string;
}

declare function defineConfig(config: ExtenzoUserConfig): ExtenzoUserConfig;

declare function resolveExtenzoConfig(root: string): {
    config: ExtenzoResolvedConfig;
    entries: EntryInfo[];
};

/**
 * Discover background, content, popup, options, sidepanel entries under baseDir
 */
declare function discoverEntries(baseDir: string): EntryInfo[];
declare function getHtmlEntryNames(): string[];
declare function getScriptOnlyEntryNames(): string[];

/** VideoRoll-style preset: capture / download / player / offscreen / favourites */
declare function getVideoRollExtraPages(root: string, srcDir: string): ExtraPageItem[];
declare function resolveExtraPages(extraPages: ExtraPageItem[] | "video-roll" | undefined, root: string, srcDirRelative: string): ExtraPageItem[];

/**
 * 根据配置与入口生成最终 manifest 对象（Chromium）
 */
declare function resolveManifestChromium(config: ManifestConfig, entries: EntryInfo[]): Record<string, unknown>;
/**
 * 根据配置与入口生成最终 manifest 对象（Firefox）
 */
declare function resolveManifestFirefox(config: ManifestConfig, entries: EntryInfo[]): Record<string, unknown>;

/**
 * Deep-merge user rsbuildConfig into base.
 * plugins arrays are concatenated (base.plugins then user.plugins); other keys deep-merge with user winning.
 */
declare function mergeRsbuildConfig(base: RsbuildConfig, user: RsbuildConfig): RsbuildConfig;

export { type EntryInfo, type ExtenzoResolvedConfig, type ExtenzoUserConfig, type ExtraPageItem, type ManifestConfig, defineConfig, discoverEntries, getHtmlEntryNames, getScriptOnlyEntryNames, getVideoRollExtraPages, mergeRsbuildConfig, resolveExtenzoConfig, resolveExtraPages, resolveManifestChromium, resolveManifestFirefox };
