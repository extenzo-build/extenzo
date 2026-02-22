export { defineConfig } from "./defineConfig.ts";
export { ConfigLoader, resolveExtenzoConfig, loadConfigFile } from "./configLoader.ts";
export {
  EntryDiscoverer,
  discoverEntries,
  getHtmlEntryNames,
  getScriptOnlyEntryNames,
} from "./entryDiscoverer.ts";
export { EntryResolver, resolveEntries } from "./entryResolver.ts";
export {
  ManifestBuilder,
  resolveManifestChromium,
  resolveManifestFirefox,
  resolveManifestForTarget,
} from "./manifestBuilder.ts";
export type { ContentScriptOutput } from "./manifestBuilder.ts";
export { mergeRsbuildConfig } from "@rsbuild/core";
export { CliParser, parseCliArgs, assertSupportedBrowser } from "./cliParser.ts";
export type { CliParseResult } from "./cliParser.ts";
export {
  ExtenzoError,
  exitWithError,
  createConfigNotFoundError,
  createConfigLoadError,
  createManifestMissingError,
  createAppDirMissingError,
  createNoEntriesError,
  createInvalidBrowserError,
  createUnknownCommandError,
  EXTENZO_ERROR_CODES,
} from "./errors.ts";
export type { ExtenzoErrorCode } from "./errors.ts";
export {
  DEFAULT_OUT_DIR,
  DEFAULT_APP_DIR,
  EXTENZO_OUTPUT_ROOT,
  HMR_WS_PORT,
  DEFAULT_BROWSER,
  SUPPORTED_BROWSERS,
  SUPPORTED_LAUNCH_TARGETS,
  CLI_COMMANDS,
  MANIFEST_ENTRY_PATHS,
  MANIFEST_ENTRY_KEYS,
  MANIFEST_DIR,
  MANIFEST_FILE_NAMES,
  CONFIG_FILES,
  SCRIPT_EXTS,
  HTML_ENTRY_NAMES,
  SCRIPT_ONLY_ENTRY_NAMES,
  RESERVED_ENTRY_NAMES,
} from "./constants.ts";
export { ManifestLoader, resolveManifestInput } from "./manifestLoader.ts";
export type { ManifestValidationTarget } from "./manifestLoader.ts";
export type {
  BrowserTarget,
  CliCommand,
  LaunchTarget,
  EntryKey,
  ChromiumLaunchTarget,
} from "./constants.ts";
export type {
  ExtenzoUserConfig,
  ExtenzoResolvedConfig,
  ManifestConfig,
  ManifestRecord,
  ChromiumFirefoxManifest,
  ManifestPathConfig,
  RsbuildConfigHelpers,
  EntryInfo,
  LifecycleHooks,
  PipelineContext,
  ScriptInjectPosition,
} from "./types.ts";
export { parseExtenzoEntryFromHtml } from "./htmlEntry.ts";
export type { ExtenzoEntryScriptResult } from "./htmlEntry.ts";
export { log, logDone, warn, error, setExoLoggerRawWrites } from "./logger.ts";