import { resolve, basename } from "path";
import { readFileSync, existsSync } from "fs";
import type { RsbuildPluginAPI } from "@rsbuild/core";
import type { ExtenzoResolvedConfig } from "@extenzo/core";
import type { EntryInfo } from "@extenzo/core";

const NO_HTML_ENTRIES = ["background", "content"];

function isHmrPlugin(p: unknown): boolean {
  if (!p || typeof p !== "object") return false;
  const obj = p as { constructor?: { name?: string }; name?: string };
  return (
    obj.constructor?.name === "HotModuleReplacementPlugin" ||
    obj.name === "HotModuleReplacementPlugin"
  );
}

/** Disable Rspack HMR so dist is not filled with *.hot-update.js (extension build watch). */
function disableRspackHmrInPlace(config: Record<string, unknown>): void {
  const devServer = config.devServer as Record<string, unknown> | undefined;
  if (devServer) devServer.hot = false;
  else config.devServer = { hot: false };
  const plugins = config.plugins;
  if (Array.isArray(plugins))
    config.plugins = plugins.filter((p: unknown) => !isHmrPlugin(p));
}

function buildTemplateMapFromEntries(entries: EntryInfo[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const e of entries) {
    if (e.htmlPath) map[e.name] = e.htmlPath;
  }
  return map;
}

function buildFilenameMap(entries: EntryInfo[]): Record<string, string> {
  const map: Record<string, string> = {
    popup: "popup/index.html",
    options: "options/index.html",
    sidepanel: "sidepanel/index.html",
    devtools: "devtools/index.html",
  };
  for (const e of entries) {
    if (e.htmlPath && !map[e.name])
      map[e.name] = `${e.name}/${basename(e.htmlPath)}`;
  }
  return map;
}

/** Remove local script tags only; keep scripts with src starting with http:// or https:// (e.g. CDN). */
function stripScriptsInTemplate(templatePath: string): string {
  if (!existsSync(templatePath)) return "";
  let content = readFileSync(templatePath, "utf-8");
  content = content.replace(
    /<script[^>]*src="([^"]*)"[^>]*><\/script>/gi,
    (fullMatch, src) => (/^https?:\/\//i.test(src.trim()) ? fullMatch : "")
  );
  return content;
}

export function entryPlugin(resolvedConfig: ExtenzoResolvedConfig, entries: EntryInfo[]) {
  const { outDir, outputRoot, root } = resolvedConfig;
  const publicDir = resolve(root, "public");

  const entry: Record<string, string | { import: string; html?: boolean }> = {};
  for (const e of entries) {
    const needsHtml = e.htmlPath != null && !NO_HTML_ENTRIES.includes(e.name);
    if (needsHtml) {
      entry[e.name] = e.scriptPath;
    } else {
      entry[e.name] = { import: e.scriptPath, html: false };
    }
  }
  const entryNames = new Set(Object.keys(entry));

  const templateMap = buildTemplateMapFromEntries(entries);
  const filenameMap = buildFilenameMap(entries);

  return {
    name: "extenzo-entry",
    setup(api: RsbuildPluginAPI) {
      api.modifyRsbuildConfig((config) => {
        config.source = config.source ?? {};
        const prevEntry = config.source.entry as Record<string, string | { import: string; html?: boolean }> | undefined;
        config.source.entry = { ...prevEntry, ...entry };

        config.html = config.html ?? {};
        const prevTemplate = config.html.template;
        config.html.template = (opts: { value: string; entryName: string }): string | void => {
          if (templateMap[opts.entryName]) return templateMap[opts.entryName];
          if (typeof prevTemplate === "function") return prevTemplate(opts);
          return undefined;
        };
        config.html.outputStructure = config.html.outputStructure ?? "nested";

        config.tools = config.tools ?? {};
        const prevHtmlPlugin = config.tools.htmlPlugin;
        config.tools.htmlPlugin = (
          htmlConfig: Record<string, unknown>,
          ctx: { entryName: string; entryValue: unknown }
        ) => {
          if (prevHtmlPlugin && typeof prevHtmlPlugin === "function")
            prevHtmlPlugin(htmlConfig, ctx as Parameters<NonNullable<typeof prevHtmlPlugin>>[1]);
          if (filenameMap[ctx.entryName])
            (htmlConfig as Record<string, string>).filename = filenameMap[ctx.entryName];
          const templatePath = (htmlConfig as { template?: string }).template;
          if (
            typeof templatePath === "string" &&
            existsSync(templatePath) &&
            entries.some((e) => e.htmlPath === templatePath)
          ) {
            const content = stripScriptsInTemplate(templatePath);
            (htmlConfig as Record<string, string>).templateContent = content;
            (htmlConfig as Record<string, unknown>).template = content;
          }
        };

        config.output = config.output ?? {};
        const outputDir = `${outputRoot}/${outDir}`;
        const existingDistPath =
          config.output.distPath && typeof config.output.distPath === "object"
            ? config.output.distPath
            : {};
        config.output.distPath = { ...existingDistPath, root: outputDir };
        config.output.cleanDistPath = config.output.cleanDistPath ?? true;
        config.output.assetPrefix = config.output.assetPrefix ?? "/";
        if (existsSync(publicDir)) {
          const copyRules = Array.isArray(config.output.copy) ? config.output.copy : [];
          config.output.copy = [...copyRules, { from: publicDir }];
        }
      });

      api.onBeforeCreateCompiler(async ({ bundlerConfigs }) => {
        const c = bundlerConfigs[0];
        if (!c) return;
        disableRspackHmrInPlace(c as Record<string, unknown>);
        const distPath = resolve(root, outputRoot, outDir);
        const watchOpts = c.watchOptions ?? {};
        const existingIgnored = watchOpts.ignored;
        const ignoredList: (string | RegExp)[] = Array.isArray(existingIgnored)
          ? [...existingIgnored, distPath]
          : existingIgnored != null
            ? [existingIgnored, distPath]
            : [distPath];
        c.watchOptions = { ...watchOpts, ignored: ignoredList as string[] };
        if (c.output) {
          c.output.path = distPath;
          const jsChunkName = (pathData: { chunk?: { name?: string; id?: string } }) => {
            const name = pathData.chunk?.name ?? pathData.chunk?.id ?? "chunk";
            return entryNames.has(String(name)) ? `${name}/index.js` : `static/js/${name}.js`;
          };
          const cssChunkName = (pathData: { chunk?: { name?: string; id?: string } }) => {
            const name = pathData.chunk?.name ?? pathData.chunk?.id ?? "chunk";
            return entryNames.has(String(name)) ? `${name}/index.css` : `static/css/${name}.css`;
          };
          c.output.filename = jsChunkName as unknown as string;
          c.output.chunkFilename = c.output.chunkFilename ?? jsChunkName;
          c.output.cssFilename = cssChunkName as unknown as string;
          c.output.cssChunkFilename = c.output.cssChunkFilename ?? cssChunkName;
          c.output.publicPath = "/";
        }
        if (c.optimization) {
          c.optimization.runtimeChunk = false;
          c.optimization.splitChunks = c.optimization.splitChunks ?? {};
          (c.optimization.splitChunks as Record<string, unknown>).chunks =
            typeof (c.optimization.splitChunks as Record<string, unknown>).chunks === "function"
              ? (c.optimization.splitChunks as Record<string, unknown>).chunks
              : (chunk: { name?: string }) =>
                  (chunk.name ? !NO_HTML_ENTRIES.includes(chunk.name) : true);
        }
      });
    },
  };
}
