/**
 * 框架级常量，供 config、discover、manifest、cli 等复用。
 * 后续可通过 ExtenzoUserConfig 或环境变量覆盖部分行为。
 */
/** 支持的配置文件名称（按优先级） */
export declare const CONFIG_FILES: readonly ["ext.config.ts", "ext.config.js", "ext.config.mjs"];
/** 入口脚本扩展名（同时存在时优先 .js） */
export declare const SCRIPT_EXTS: readonly [".js", ".jsx", ".ts", ".tsx"];
/** 保留入口名（不可自定义命名）：popup / options / sidepanel / background / devtools / content */
export declare const RESERVED_ENTRY_NAMES: readonly ["popup", "options", "sidepanel", "background", "devtools", "content"];
/** 需要 HTML 的入口名称（popup / options / sidepanel / devtools） */
export declare const HTML_ENTRY_NAMES: readonly ["popup", "options", "sidepanel", "devtools"];
/** 仅脚本的入口名称（background / content） */
export declare const SCRIPT_ONLY_ENTRY_NAMES: readonly ["background", "content"];
/** 构建产物的父目录（输出路径为 outputRoot/outDir，避免根目录下 dist 被 Tailwind v4 等扫描导致循环构建） */
export declare const EXTENZO_OUTPUT_ROOT = ".extenzo";
/** 默认输出目录名（位于 outputRoot 下，用户可自定义 outDir） */
export declare const DEFAULT_OUT_DIR = "dist";
/** 默认源码目录（相对 root） */
export declare const DEFAULT_SRC_DIR = ".";
/** 开发模式 HMR WebSocket 端口 */
export declare const HMR_WS_PORT = 23333;
/** 默认目标浏览器 */
export declare const DEFAULT_BROWSER: "chromium";
/** 支持的浏览器目标 */
export declare const SUPPORTED_BROWSERS: readonly ["chromium", "firefox"];
export type BrowserTarget = (typeof SUPPORTED_BROWSERS)[number];
/** CLI 支持的命令 */
export declare const CLI_COMMANDS: readonly ["dev", "build"];
export type CliCommand = (typeof CLI_COMMANDS)[number];
/** manifest 中各入口产出路径（相对 outDir） */
export declare const MANIFEST_ENTRY_PATHS: {
    readonly background: "background/index.js";
    readonly content: "content/index.js";
    readonly contentScripts: readonly [{
        readonly matches: readonly ["<all_urls>"];
        readonly js: readonly ["content/index.js"];
        readonly run_at: "document_start";
    }];
    readonly popup: "popup/index.html";
    readonly options: "options/index.html";
    readonly optionsOpenInTab: true;
    readonly sidepanel: "sidepanel/index.html";
    readonly devtools: "devtools/index.html";
};
