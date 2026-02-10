/**
 * Framework-level constants shared by config, discover, manifest, cli, etc.
 * Some behaviour can be overridden via ExtenzoUserConfig or environment variables.
 */

/** Supported config file names (in priority order) */
export const CONFIG_FILES = ["exo.config.ts", "exo.config.js", "exo.config.mjs"] as const;

/** Entry script extensions (.js preferred when both exist) */
export const SCRIPT_EXTS = [".js", ".jsx", ".ts", ".tsx"] as const;

/** Reserved entry names (not user-renamable): popup / options / sidepanel / offscreen / background / devtools / content */
export const RESERVED_ENTRY_NAMES = [
  "popup",
  "options",
  "sidepanel",
  "offscreen",
  "background",
  "devtools",
  "content",
] as const;

/** Entry names that require HTML (popup / options / sidepanel / devtools / offscreen) */
export const HTML_ENTRY_NAMES = ["popup", "options", "sidepanel", "devtools", "offscreen"] as const;

/** Script-only entry names (background / content) */
export const SCRIPT_ONLY_ENTRY_NAMES = ["background", "content"] as const;

/** Parent dir for build output (output path is outputRoot/outDir; avoids root dist being scanned by Tailwind v4 etc.) */
export const EXTENZO_OUTPUT_ROOT = ".extenzo";

/** Default output dir name under outputRoot (user can override via outDir) */
export const DEFAULT_OUT_DIR = "dist";

/** Default app directory (relative to root) */
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
} as const;

/** Placeholder [exo.xxx] key; must match MANIFEST_ENTRY_PATHS keys */
export type EntryKey = keyof typeof MANIFEST_ENTRY_PATHS;

/** Runtime list of entry keys (for placeholder replacement iteration) */
export const MANIFEST_ENTRY_KEYS: readonly EntryKey[] = Object.keys(
  MANIFEST_ENTRY_PATHS
) as EntryKey[];

/** Chromium-family only (excludes firefox); used for HMR etc. */
export type ChromiumLaunchTarget = Exclude<LaunchTarget, "firefox">;
