import type { Compiler } from "@rspack/core";
import type { RsbuildPluginAPI } from "@rsbuild/core";
import { resolve } from "path";
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import type { ExtenzoResolvedConfig } from "@extenzo/core";
import type { EntryInfo } from "@extenzo/core";
import { resolveManifestChromium, resolveManifestFirefox } from "@extenzo/core";

const NO_HTML_ENTRIES = ["background", "content"];

/**
 * Only generates manifest.json after build and removes stray HTML for background/content.
 * Entry and HTML are handled by plugin-entry.
 */
export function extensionPlugin(
  resolvedConfig: ExtenzoResolvedConfig,
  entries: EntryInfo[]
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
              for (const name of NO_HTML_ENTRIES) {
                const nestedPath = resolve(distPath, name, "index.html");
                const flatPath = resolve(distPath, `${name}.html`);
                for (const htmlPath of [nestedPath, flatPath]) {
                  if (existsSync(htmlPath)) {
                    try {
                      unlinkSync(htmlPath);
                    } catch {
                      // ignore
                    }
                  }
                }
              }
              const browser = (process.env.BROWSER as "chromium" | "firefox") || "chromium";
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
