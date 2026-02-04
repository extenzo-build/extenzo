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
} from "./manifestBuilder.ts";
export { mergeRsbuildConfig } from "@rsbuild/core";
export { CliParser, parseCliArgs, assertSupportedBrowser } from "./cliParser.ts";
export type { CliParseResult } from "./cliParser.ts";
export {
  ExtenzoError,
  exitWithError,
  createConfigNotFoundError,
  createConfigLoadError,
  createManifestMissingError,
  createNoEntriesError,
  createInvalidBrowserError,
  createUnknownCommandError,
  EXTENZO_ERROR_CODES,
} from "./errors.ts";
export type { ExtenzoErrorCode } from "./errors.ts";
export {
  DEFAULT_OUT_DIR,
  DEFAULT_SRC_DIR,
  EXTENZO_OUTPUT_ROOT,
  HMR_WS_PORT,
  DEFAULT_BROWSER,
  SUPPORTED_BROWSERS,
  CLI_COMMANDS,
  MANIFEST_ENTRY_PATHS,
  MANIFEST_DIR,
  MANIFEST_FILE_NAMES,
  CONFIG_FILES,
  SCRIPT_EXTS,
  HTML_ENTRY_NAMES,
  SCRIPT_ONLY_ENTRY_NAMES,
  RESERVED_ENTRY_NAMES,
} from "./constants.ts";
export { ManifestLoader, resolveManifestInput } from "./manifestLoader.ts";
export type { BrowserTarget, CliCommand } from "./constants.ts";
export type {
  ExtenzoUserConfig,
  ExtenzoResolvedConfig,
  ManifestConfig,
  ManifestPathConfig,
  RsbuildConfigHelpers,
  EntryInfo,
  LifecycleHooks,
  PipelineContext,
} from "./types.ts";
