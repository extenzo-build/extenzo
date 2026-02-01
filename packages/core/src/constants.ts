/**
 * 框架级常量，供 config、discover、manifest、cli 等复用。
 * 后续可通过 ExtenzoUserConfig 或环境变量覆盖部分行为。
 */

/** 支持的配置文件名称（按优先级） */
export const CONFIG_FILES = ["ext.config.ts", "ext.config.js", "ext.config.mjs"] as const;

/** 入口脚本扩展名（同时存在时优先 .js） */
export const SCRIPT_EXTS = [".js", ".jsx", ".ts", ".tsx"] as const;

/** 保留入口名（不可自定义命名）：popup / options / sidepanel / background / devtools / content */
export const RESERVED_ENTRY_NAMES = [
  "popup",
  "options",
  "sidepanel",
  "background",
  "devtools",
  "content",
] as const;

/** 需要 HTML 的入口名称（popup / options / sidepanel / devtools） */
export const HTML_ENTRY_NAMES = ["popup", "options", "sidepanel", "devtools"] as const;

/** 仅脚本的入口名称（background / content） */
export const SCRIPT_ONLY_ENTRY_NAMES = ["background", "content"] as const;

/** 构建产物的父目录（输出路径为 outputRoot/outDir，避免根目录下 dist 被 Tailwind v4 等扫描导致循环构建） */
export const EXTENZO_OUTPUT_ROOT = ".extenzo";

/** 默认输出目录名（位于 outputRoot 下，用户可自定义 outDir） */
export const DEFAULT_OUT_DIR = "dist";

/** 默认源码目录（相对 root） */
export const DEFAULT_SRC_DIR = ".";

/** 开发模式 HMR WebSocket 端口 */
export const HMR_WS_PORT = 23333;

/** 默认目标浏览器 */
export const DEFAULT_BROWSER = "chromium" as const;

/** 支持的浏览器目标 */
export const SUPPORTED_BROWSERS = ["chromium", "firefox"] as const;

export type BrowserTarget = (typeof SUPPORTED_BROWSERS)[number];

/** CLI 支持的命令 */
export const CLI_COMMANDS = ["dev", "build"] as const;

export type CliCommand = (typeof CLI_COMMANDS)[number];

/** manifest 中各入口产出路径（相对 outDir） */
export const MANIFEST_ENTRY_PATHS = {
  background: "background/index.js",
  content: "content/index.js",
  contentScripts: [{ matches: ["<all_urls>"], js: ["content/index.js"], run_at: "document_start" }],
  popup: "popup/index.html",
  options: "options/index.html",
  optionsOpenInTab: true,
  sidepanel: "sidepanel/index.html",
  devtools: "devtools/index.html",
} as const;
