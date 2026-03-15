import type { Compiler } from "@rspack/core";
import {
  launchBrowser,
  registerCleanupHandlers,
  statsHasErrors,
  setBrowserLaunched,
  getBrowserLaunched,
} from "./launch";
import type { HmrPluginOptions } from "./types";
import type { HmrPluginTestDeps } from "./types";

let lastCompiler: Compiler | null = null;

export function getLastCompiler(): Compiler | null {
  return lastCompiler;
}

/**
 * Collect modified file paths from compiler: prefers compiler.modifiedFiles when set by rspack,
 * otherwise from watchFileSystem.watcher.mtimes (or getTimes()). Used in onAfterDevCompile
 * together with stats/module graph to determine which entry (content/background) is affected.
 */
export function getModifiedFilesFromCompiler(compiler: Compiler | null): Set<string> {
  const out = new Set<string>();
  if (!compiler) return out;
  const c = compiler as { modifiedFiles?: ReadonlySet<string>; watchFileSystem?: { watcher?: { mtimes?: Map<string, number> | Record<string, number>; getTimes?: () => Map<string, number> | Record<string, number> } } };
  if (c.modifiedFiles?.size) {
    c.modifiedFiles.forEach((p) => out.add(p));
    return out;
  }
  const watcher = c.watchFileSystem?.watcher;
  if (!watcher) return out;
  try {
    const mtimes = watcher.mtimes ?? (typeof watcher.getTimes === "function" ? watcher.getTimes() : undefined);
    if (mtimes instanceof Map) {
      mtimes.forEach((_, key) => out.add(key));
    } else if (mtimes && typeof mtimes === "object") {
      Object.keys(mtimes).forEach((key) => out.add(key));
    }
  } catch {
    /* ignore */
  }
  return out;
}

export function createHmrRspackPlugin(
  options: HmrPluginOptions,
  testDeps?: HmrPluginTestDeps
): { name: string; apply(compiler: Compiler): void } {
  const { autoOpen = true } = options;

  return {
    name: "rsbuild-plugin-extension-hmr:rspack",
    apply(compiler: Compiler) {
      lastCompiler = compiler;
      const hooks = compiler?.hooks;
      if (!hooks?.done) return;

      registerCleanupHandlers();

      hooks.done.tap("rsbuild-plugin-extension-hmr:launch", async (stats) => {
        if (!autoOpen || getBrowserLaunched()) return;
        if (statsHasErrors(stats)) return;
        setBrowserLaunched(true);
        await new Promise((r) => setTimeout(r, 1000));
        try {
          await launchBrowser(
            options,
            testDeps?.runChromiumRunner,
            testDeps?.ensureDistReady,
            testDeps?.getBrowserPath
          );
        } catch (e) {
          const { error } = await import("@extenzo/core");
          error("Failed to launch browser:", e);
        }
      });
    },
  };
}
