/**
 * 框架级常量，供 config、discover、manifest、cli 等模块共享使用。
 * 部分行为可通过 ExtenzoUserConfig 或环境变量覆盖。
 */

/** 支持的配置文件名（按优先级排序） */
export const CONFIG_FILES = ["exo.config.ts", "exo.config.js", "exo.config.mjs"] as const;

/** 入口脚本扩展名（同时存在时优先使用 .js） */
export const SCRIPT_EXTS = [".js", ".jsx", ".ts", ".tsx"] as const;

/** 保留入口名称（不可由用户重命名）：popup / options / sidepanel / offscreen / sandbox / newtab / bookmarks / history / background / devtools / content */
export const RESERVED_ENTRY_NAMES = [
  "popup",
  "options",
  "sidepanel",
  "offscreen",
  "sandbox",
  "newtab",
  "bookmarks",
  "history",
  "background",
  "devtools",
  "content",
] as const;

/** 需要 HTML 的入口名称（popup / options / sidepanel / devtools / offscreen / sandbox / newtab / bookmarks / history） */
export const HTML_ENTRY_NAMES = [
  "popup",
  "options",
  "sidepanel",
  "devtools",
  "offscreen",
  "sandbox",
  "newtab",
  "bookmarks",
  "history",
] as const;

/** 仅脚本入口名称（background / content） */
export const SCRIPT_ONLY_ENTRY_NAMES = ["background", "content"] as const;

/** 构建输出的父目录（输出路径为 outputRoot/outDir；避免根目录 dist 被 Tailwind v4 等工具扫描） */
export const EXTENZO_OUTPUT_ROOT = ".extenzo";

/** outputRoot 下的默认输出目录名（用户可通过 outDir 覆盖） */
export const DEFAULT_OUT_DIR = "extension";

/** 默认应用目录（相对于项目根目录） */
export const DEFAULT_APP_DIR = "app";

/** Dev mode HMR WebSocket port */
export const HMR_WS_PORT = 23333;

/** Default build target browser (manifest target) */
export const DEFAULT_BROWSER = "chromium" as const;

/** Supported build targets for -t/--target and manifest selection */
export const SUPPORTED_BROWSERS = ["chromium", "firefox"] as const;

export type BrowserTarget = (typeof SUPPORTED_BROWSERS)[number];

/** Supported launch browsers (CLI --launch / config.browser) */
export const SUPPORTED_LAUNCH_TARGETS = [
  "chrome",
  "edge",
  "brave",
  "vivaldi",
  "opera",
  "santa",
  "firefox",
] as const;

export type LaunchTarget = (typeof SUPPORTED_LAUNCH_TARGETS)[number];

/** CLI commands */
export const CLI_COMMANDS = ["dev", "build"] as const;

export type CliCommand = (typeof CLI_COMMANDS)[number];

/** Manifest subdir under appDir (second lookup: appDir/manifest/) */
export const MANIFEST_DIR = "manifest";

/** Manifest file names auto-read under appDir (base shared; chromium/firefox override) */
export const MANIFEST_FILE_NAMES = {
  base: "manifest.json",
  chromium: "manifest.chromium.json",
  firefox: "manifest.firefox.json",
} as const;

/** Output paths per entry in manifest (relative to outDir); key is placeholder [exo.xxx] name */
export const MANIFEST_ENTRY_PATHS = {
  background: "background/index.js",
  content: "content/index.js",
  popup: "popup/index.html",
  options: "options/index.html",
  sidepanel: "sidepanel/index.html",
  devtools: "devtools/index.html",
  offscreen: "offscreen/index.html",
  sandbox: "sandbox/index.html",
  newtab: "newtab/index.html",
  bookmarks: "bookmarks/index.html",
  history: "history/index.html",
} as const;

/** Placeholder [exo.xxx] key; must match MANIFEST_ENTRY_PATHS keys */
export type EntryKey = keyof typeof MANIFEST_ENTRY_PATHS;

/** Runtime list of entry keys (for placeholder replacement iteration) */
export const MANIFEST_ENTRY_KEYS: readonly EntryKey[] = Object.keys(
  MANIFEST_ENTRY_PATHS
) as EntryKey[];

/** Chromium-family only (excludes firefox); used for HMR etc. */
export type ChromiumLaunchTarget = Exclude<LaunchTarget, "firefox">;
