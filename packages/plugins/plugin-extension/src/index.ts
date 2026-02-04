import type { Compiler } from "@rspack/core";
import type { RsbuildPluginAPI } from "@rsbuild/core";
import { resolve } from "path";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import type { ExtenzoResolvedConfig } from "@extenzo/core";
import type { EntryInfo } from "@extenzo/core";
import type { BrowserTarget } from "@extenzo/core";
import { resolveManifestChromium, resolveManifestFirefox } from "@extenzo/core";

/**
 * Writes manifest.json after build. Entry and HTML (html: false for background/content) are handled by plugin-entry.
 * Browser comes from CLI -b (config/constants), not from env.
 */
export function extensionPlugin(
  resolvedConfig: ExtenzoResolvedConfig,
  entries: EntryInfo[],
  browser: BrowserTarget
) {
  const { root, outDir, outputRoot, manifest } = resolvedConfig;
  const distPath = resolve(root, outputRoot, outDir);

  return {
    name: "extenzo-extension",
    setup(api: RsbuildPluginAPI) {
      api.onBeforeCreateCompiler(async ({ bundlerConfigs }) => {
        const config = bundlerConfigs[0];
        if (!config) return;
        config.plugins = config.plugins ?? [];
        config.plugins.push({
          name: "extenzo-extension-post-build",
          apply(compiler: Compiler) {
            compiler.hooks.afterEmit.tap("extenzo-extension-post-build", () => {
              if (!existsSync(distPath)) mkdirSync(distPath, { recursive: true });
              const manifestObj =
                browser === "firefox"
                  ? resolveManifestFirefox(manifest, entries)
                  : resolveManifestChromium(manifest, entries);
              writeFileSync(
                resolve(distPath, "manifest.json"),
                JSON.stringify(manifestObj, null, 2),
                "utf-8"
              );
            });
          },
        });
      });
    },
  };
}
