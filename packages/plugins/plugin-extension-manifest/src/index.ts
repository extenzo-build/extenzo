import type { Compiler } from "@rspack/core";
import type { RsbuildPluginAPI } from "@rsbuild/core";
import { resolve } from "path";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import type {
  ExtenzoResolvedConfig,
  EntryInfo,
  BrowserTarget,
  ManifestRecord,
  ContentScriptOutput,
} from "@extenzo/core";
import { resolveManifestForTarget } from "@extenzo/core";

/**
 * Writes manifest.json after build. Entry and HTML (html: false for background/content) are handled by plugin-extension-entry.
 * Browser comes from CLI -l/--launch (config/constants), not from env.
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
            compiler.hooks.afterEmit.tap("extenzo-extension-post-build", (compilation) => {
              if (!existsSync(distPath)) mkdirSync(distPath, { recursive: true });
              const contentScriptOutput = collectContentScriptOutput(compilation, entries);
              const manifestObj = resolveManifestForTarget(
                manifest,
                entries,
                browser,
                (msg) => console.warn(msg),
                contentScriptOutput
              );
              validateEntryHtmlRules(entries, manifestObj);
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

const REQUIRED_HTML_ENTRIES = new Set(["popup", "options", "sidepanel", "offscreen"]);

/**
 * Collect content entry js and css from compilation.assets for [exo.content] placeholder expansion.
 */
function collectContentScriptOutput(
  compilation: { assets?: Record<string, unknown> },
  entries: EntryInfo[]
): ContentScriptOutput | undefined {
  const hasContent = entries.some((e) => e.name === "content");
  if (!hasContent || !compilation.assets) return undefined;

  const keys = Object.keys(compilation.assets);
  const js = keys
    .filter(
      (k) =>
        (k.startsWith("content/") && k.endsWith(".js")) || k === "content.js"
    )
    .sort();
  const css = keys
    .filter(
      (k) =>
        k.endsWith(".css") &&
        (k.startsWith("static/css/content") ||
          k.startsWith("content/") ||
          k === "content.css")
    )
    .sort();

  return { js, css };
}

function validateEntryHtmlRules(entries: EntryInfo[], manifest: ManifestRecord): void {
  const mv = getManifestVersion(manifest);
  const errors: string[] = [];
  for (const entry of entries) {
    const htmlFlag = getEntryHtmlFlag(entry);
    if (REQUIRED_HTML_ENTRIES.has(entry.name) && htmlFlag === false) {
      errors.push(`entry "${entry.name}" must generate HTML; html:false is not allowed`);
    }
    if (mv === 3 && entry.name === "background" && htmlFlag === true) {
      errors.push(`entry "background" cannot generate HTML in MV3`);
    }
  }
  if (errors.length > 0) throw new Error(errors.join("; "));
}

function getManifestVersion(manifest: ManifestRecord): 2 | 3 | null {
  const mv = manifest.manifest_version;
  if (mv === 2 || mv === 3) return mv;
  return null;
}

function getEntryHtmlFlag(entry: EntryInfo): boolean | undefined {
  return (entry as EntryInfo & { html?: boolean }).html;
}
