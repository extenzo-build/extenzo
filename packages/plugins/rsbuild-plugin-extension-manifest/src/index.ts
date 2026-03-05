import type { Compiler } from "@rspack/core";
import type { RsbuildPluginAPI } from "@rsbuild/core";
import { resolve } from "path";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import type {
  ExtenzoResolvedConfig,
  EntryInfo,
  BrowserTarget,
  ManifestRecord,
  ContentScriptOutput,
} from "@extenzo/core";
import { resolveManifestForTarget } from "@extenzo/core";

const CONTENT_CSS_GLOBAL_KEY = "__EXTENZO_CONTENT_CSS_FILES__";
const CONTENT_CSS_TEXTS_GLOBAL_KEY = "__EXTENZO_CONTENT_CSS_TEXTS__";
type ContentScriptOutputWithPolicy = ContentScriptOutput & {
  autoFillCssInManifest?: boolean;
};

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
    name: "rsbuild-plugin-extension-manifest",
    setup(api: RsbuildPluginAPI) {
      api.onBeforeCreateCompiler(async ({ bundlerConfigs }) => {
        const config = bundlerConfigs[0];
        if (!config) return;
        config.plugins = config.plugins ?? [];
        config.plugins.push({
          name: "rsbuild-plugin-extension-manifest:post-build",
          apply(compiler: Compiler) {
            compiler.hooks.afterEmit.tap("rsbuild-plugin-extension-manifest:post-build", (compilation) => {
              if (!existsSync(distPath)) mkdirSync(distPath, { recursive: true });
              const contentScriptOutput = collectContentScriptOutput(compilation, entries);
              injectContentCssRuntimeMeta(distPath, contentScriptOutput);
              const manifestObj = resolveManifestForTarget(
                manifest,
                entries,
                browser,
                (msg) => console.warn(msg),
                contentScriptOutput
              );
              const finalManifest = applyContentCssManifestPolicy(
                manifestObj,
                manifest,
                browser,
                contentScriptOutput
              );
              validateEntryHtmlRules(entries, finalManifest);
              writeFileSync(
                resolve(distPath, "manifest.json"),
                JSON.stringify(finalManifest, null, 2),
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
 * Collect content entry js and css for [exo.content] placeholder expansion.
 * Prefer compilation.entrypoints["content"].getFiles() so we get exactly the assets built from the content entry (including any CSS it imports). Fallback to naming-based collection if entrypoints are unavailable or return no CSS.
 */
function collectContentScriptOutput(
  compilation: { entrypoints?: unknown; assets?: Record<string, unknown> },
  entries: EntryInfo[]
): ContentScriptOutputWithPolicy | undefined {
  const hasContent = entries.some((e) => e.name === "content");
  if (!hasContent) return undefined;
  const autoFillCssInManifest = !shouldDisableManifestCssAutoFill(entries);

  const fromEntrypoint = tryGetContentEntryFiles(compilation);
  const byNames = collectContentScriptOutputByNames(compilation);

  if (fromEntrypoint && fromEntrypoint.js.length > 0) {
    const css =
      fromEntrypoint.css.length > 0
        ? fromEntrypoint.css
        : (byNames?.css ?? []);
    return { js: fromEntrypoint.js, css, autoFillCssInManifest };
  }

  if (!byNames) return undefined;
  return { ...byNames, autoFillCssInManifest };
}

function tryGetContentEntryFiles(compilation: { entrypoints?: unknown }): ContentScriptOutput | undefined {
  const ep = compilation.entrypoints;
  if (!ep) return undefined;
  const contentEntry =
    typeof (ep as Map<string, { getFiles?: () => ReadonlyArray<string> }>).get === "function"
      ? (ep as Map<string, { getFiles?: () => ReadonlyArray<string> }>).get("content")
      : (ep as Record<string, { getFiles?: () => ReadonlyArray<string> }>)["content"];
  if (!contentEntry || typeof contentEntry.getFiles !== "function") return undefined;
  let files: ReadonlyArray<string>;
  try {
    files = contentEntry.getFiles();
  } catch {
    return undefined;
  }
  if (!Array.isArray(files) || files.length === 0) return undefined;

  const js: string[] = [];
  const css: string[] = [];
  for (const name of files) {
    if (typeof name !== "string") continue;
    const n = name.replace(/\\/g, "/");
    if (n.endsWith(".js")) js.push(n);
    else if (n.endsWith(".css")) css.push(n);
  }
  return { js: js.sort(), css: css.sort() };
}

function collectContentScriptOutputByNames(compilation: {
  getAssets?: () => ReadonlyArray<{ filename?: string; name?: string }>;
  assets?: Record<string, unknown>;
}): ContentScriptOutput | undefined {
  let keys = compilation.assets ? Object.keys(compilation.assets) : [];
  if (keys.length === 0 && typeof compilation.getAssets === "function") {
    try {
      const list = compilation.getAssets();
      keys = Array.isArray(list)
        ? list.map((a: unknown) => (a as { filename?: string; name?: string })?.filename ?? (a as { name?: string })?.name).filter((s): s is string => typeof s === "string")
        : [];
    } catch {
      // keep keys []
    }
  }
  if (keys.length === 0) return undefined;

  const js = keys
    .filter(
      (k) =>
        (k.startsWith("content/") && k.endsWith(".js")) || k === "content.js"
    )
    .map((k) => k.replace(/\\/g, "/"))
    .sort();
  const css = keys
    .filter((k) => {
      const n = k.replace(/\\/g, "/");
      if (!n.endsWith(".css")) return false;
      if (n.startsWith("content/") || n === "content.css") return true;
      if (n.startsWith("static/css/content")) return true;
      return false;
    })
    .map((k) => k.replace(/\\/g, "/"))
    .sort();
  return { js, css };
}

function shouldDisableManifestCssAutoFill(entries: EntryInfo[]): boolean {
  const contentEntry = entries.find((entry) => entry.name === "content");
  if (!contentEntry) return false;
  return hasShadowOrIframeContentUIUsage(contentEntry.scriptPath);
}

function hasShadowOrIframeContentUIUsage(scriptPath: string): boolean {
  if (!existsSync(scriptPath)) return false;
  let source = "";
  try {
    source = readFileSync(scriptPath, "utf-8");
  } catch {
    return false;
  }
  if (/defineShadowContentUI|defineIframeContentUI/.test(source)) return true;
  return /wrapper\s*:\s*["'](?:shadow|iframe)["']/.test(source);
}

function applyContentCssManifestPolicy(
  outputManifest: ManifestRecord,
  inputManifest: ExtenzoResolvedConfig["manifest"],
  browser: BrowserTarget,
  contentScriptOutput?: ContentScriptOutputWithPolicy
): ManifestRecord {
  if (!contentScriptOutput || contentScriptOutput.autoFillCssInManifest !== false) {
    return outputManifest;
  }
  if (hasUserDefinedContentCss(inputManifest, browser)) return outputManifest;
  return removeContentScriptCss(outputManifest);
}

function hasUserDefinedContentCss(
  manifest: ExtenzoResolvedConfig["manifest"],
  browser: BrowserTarget
): boolean {
  const branch = pickManifestBranch(manifest, browser);
  if (!branch) return false;
  const scripts = branch.content_scripts;
  if (!Array.isArray(scripts)) return false;
  return scripts.some((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const css = (item as { css?: unknown }).css;
    return Array.isArray(css) && css.length > 0;
  });
}

function pickManifestBranch(
  manifest: ExtenzoResolvedConfig["manifest"],
  browser: BrowserTarget
): ManifestRecord | null {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return null;
  if (!("chromium" in manifest) && !("firefox" in manifest)) {
    return manifest as ManifestRecord;
  }
  const byBrowser = manifest as { chromium?: unknown; firefox?: unknown };
  const selected = browser === "firefox" ? byBrowser.firefox : byBrowser.chromium;
  if (selected && typeof selected === "object" && !Array.isArray(selected)) {
    return selected as ManifestRecord;
  }
  const fallback = browser === "firefox" ? byBrowser.chromium : byBrowser.firefox;
  if (fallback && typeof fallback === "object" && !Array.isArray(fallback)) {
    return fallback as ManifestRecord;
  }
  return null;
}

function removeContentScriptCss(manifest: ManifestRecord): ManifestRecord {
  const scripts = manifest.content_scripts;
  if (!Array.isArray(scripts)) return manifest;
  const next = scripts.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const out = { ...(item as Record<string, unknown>) };
    delete out.css;
    return out;
  });
  return { ...manifest, content_scripts: next };
}

function injectContentCssRuntimeMeta(
  distPath: string,
  contentScriptOutput?: ContentScriptOutputWithPolicy
): void {
  if (!contentScriptOutput) return;
  if (contentScriptOutput.css.length === 0 || contentScriptOutput.js.length === 0) return;
  const normalizedCss = contentScriptOutput.css.map((p) => p.replace(/\\/g, "/"));
  const cssTexts = normalizedCss.map((file) => readCssAssetText(distPath, file));
  const banner =
    `;globalThis.${CONTENT_CSS_GLOBAL_KEY}=${JSON.stringify(normalizedCss)};` +
    `globalThis.${CONTENT_CSS_TEXTS_GLOBAL_KEY}=${JSON.stringify(cssTexts)};\n`;

  for (const jsRel of contentScriptOutput.js) {
    const abs = resolve(distPath, jsRel);
    if (!existsSync(abs)) continue;
    const src = readFileSync(abs, "utf-8");
    if (
      src.includes(`globalThis.${CONTENT_CSS_GLOBAL_KEY}`) &&
      src.includes(`globalThis.${CONTENT_CSS_TEXTS_GLOBAL_KEY}`)
    ) {
      continue;
    }
    writeFileSync(abs, banner + src, "utf-8");
  }
}

function readCssAssetText(distPath: string, file: string): string {
  const abs = resolve(distPath, file);
  if (!existsSync(abs)) return "";
  try {
    return readFileSync(abs, "utf-8");
  } catch {
    return "";
  }
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
