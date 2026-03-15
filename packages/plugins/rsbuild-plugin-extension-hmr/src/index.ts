/**
 * @extenzo/rsbuild-plugin-extension-hmr
 *
 * Dev mode: launch browser, WebSocket reload manager, and precise HMR/liveReload
 * control for content/background entries (reload via WS only).
 */

import type { RsbuildPlugin, RsbuildPluginAPI } from "@rsbuild/core";
import { clearOutdatedHotUpdateFiles } from "./hotUpdateCleanup";
import { transformCodeToDisableHmr } from "./disableHmr";
import { createHmrRspackPlugin, getLastCompiler, getModifiedFilesFromCompiler } from "./rspackPlugin";
import { getReloadManagerDecision, getReloadKindFromDecision } from "./reloadScope";
import { notifyReload } from "./wsServer";
import type { HmrPluginOptions, HmrPluginTestDeps } from "./types";

export type { HmrPluginOptions, HmrPluginTestDeps, ReloadManagerEntry } from "./types";
export { RELOAD_MANAGER_ENTRY_NAMES, RELOAD_ENTRY_NAMES, CONTENT_ENTRY_NAMES, getEntryTag } from "./constants";
export { clearOutdatedHotUpdateFiles } from "./hotUpdateCleanup";
export { getLaunchPathFromOptions, buildDefaultPaths, getBrowserPath, isChromiumBrowser } from "./browserPaths";
export type { LaunchPathOptions } from "./browserPaths";
export { startWebSocketServer, notifyReload } from "./wsServer";
export type { ExtensionErrorPayload } from "./wsServer";
export {
  getCompilationFromStats,
  getEntrypointSignature,
  getEntriesSignature,
  getReloadEntriesSignature,
  getContentEntriesSignature,
  getReloadManagerDecision,
  getReloadKindFromDecision,
  isContentChanged,
  getEntryToModulePaths,
  getEntriesForFile,
} from "./reloadScope";
export type { ReloadManagerDecision, ReloadKind } from "./reloadScope";
export { normalizePathForCompare, isReloadManagerEntryPath } from "./disableHmr";
export {
  getCacheTempRoot,
  getChromiumUserDataDir,
  getReloadManagerPath,
  findExistingReloadManager,
  ensureDistReady,
} from "./reloadManagerExtension";
export {
  launchBrowser,
  launchBrowserOnly,
  cleanup,
  registerCleanupHandlers,
  statsHasErrors,
} from "./launch";
export type { LaunchOnlyOptions, ChromiumRunnerOverride } from "./launch";
export { createTestWsServer } from "./testWsServer";
export { createHmrRspackPlugin } from "./rspackPlugin";

/**
 * Rsbuild plugin: in dev mode launches browser after first compile;
 * notifies reload only when content or background entry (or their dependencies) changed;
 * disables HMR/liveReload for content/background via transform and optional entry tag injection.
 */
export function hmrPlugin(
  options: HmrPluginOptions,
  testDeps?: HmrPluginTestDeps
): RsbuildPlugin {
  const entriesOrPaths =
    options.reloadManagerEntries?.length
      ? options.reloadManagerEntries
      : (options.reloadManagerEntryPaths ?? []).map((path) => ({ name: "", path }));

  return {
    name: "rsbuild-plugin-extension-hmr",
    setup(api: RsbuildPluginAPI) {
      api.onAfterDevCompile(async ({ stats }) => {
        await clearOutdatedHotUpdateFiles(options.distPath, stats);

        if (options.enableReload === false || !stats) return;

        const compiler = getLastCompiler();
        const modifiedFiles = getModifiedFilesFromCompiler(compiler);

        const { shouldNotify, contentChanged, backgroundChanged } = getReloadManagerDecision(stats, {
          compiler: { modifiedFiles: modifiedFiles.size > 0 ? modifiedFiles : undefined },
        });
        if (shouldNotify) {
          const kind = getReloadKindFromDecision(
            contentChanged,
            backgroundChanged,
            options.autoRefreshContentPage ?? false
          );
          notifyReload(kind);
        }
      });

      api.onBeforeStartDevServer(() => {
        if (entriesOrPaths.length === 0) return;
        api.transform(
          { test: /\.(js|ts)$/, environments: ["web"] },
          ({ resourcePath, code }) =>
            transformCodeToDisableHmr(resourcePath, entriesOrPaths, code)
        );
      });

      api.onBeforeCreateCompiler(async ({ bundlerConfigs }) => {
        const config = bundlerConfigs[0] as { plugins?: unknown[] } | undefined;
        if (!config) return;
        config.plugins = config.plugins ?? [];
        config.plugins.push(createHmrRspackPlugin(options, testDeps));
      });
    },
  };
}
