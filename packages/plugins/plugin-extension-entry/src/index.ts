import { resolve, basename, extname, dirname } from "path";
import { existsSync } from "fs";
import type { RsbuildPluginAPI } from "@rsbuild/core";
import type { ExtenzoResolvedConfig } from "@extenzo/core";
import type { EntryInfo, ScriptInjectPosition } from "@extenzo/core";
import { parseExtenzoEntryFromHtml } from "@extenzo/core";

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

function buildScriptInjectMap(
  entries: EntryInfo[]
): Record<string, ScriptInjectPosition> {
  const map: Record<string, ScriptInjectPosition> = {};
  for (const e of entries) {
    if (e.scriptInject) map[e.name] = e.scriptInject;
  }
  return map;
}

/** For entries with scriptInject: read htmlPath, strip data-extenzo-entry script, return content to use as template. */
function getStrippedTemplateContent(htmlPath: string): string | undefined {
  const parsed = parseExtenzoEntryFromHtml(htmlPath);
  return parsed?.strippedHtml;
}

function buildEntryOutputMap(entries: EntryInfo[]): {
  html: Record<string, string>;
  js: Record<string, string>;
  css: Record<string, string>;
} {
  const html: Record<string, string> = {};
  const js: Record<string, string> = {};
  const css: Record<string, string> = {};
  for (const e of entries) {
    const scriptStem = basename(e.scriptPath, extname(e.scriptPath));
    const htmlFile = e.htmlPath ? basename(e.htmlPath).toLowerCase() : null;
    const isSingleScript = scriptStem === e.name;
    js[e.name] = isSingleScript ? `${e.name}.js` : `${e.name}/index.js`;
    css[e.name] = isSingleScript ? `${e.name}.css` : `${e.name}/index.css`;
    if (e.htmlPath) {
      const entryDir = basename(dirname(e.htmlPath)).toLowerCase();
      const isEntryDir = entryDir === e.name.toLowerCase();
      const isSingleHtml = htmlFile === `${e.name}.html`;
      html[e.name] = isEntryDir ? `${e.name}/${htmlFile}` : isSingleHtml ? `${e.name}.html` : `${e.name}/${htmlFile}`;
    }
  }
  return { html, js, css };
}

/** Build JS chunk filename function for output. Exported for coverage of ?? fallback. */
export function buildJsChunkFilenameFn(
  outputMap: { js: Record<string, string> },
  entryNames: Set<string>
): (pathData: { chunk?: { name?: string; id?: string } }) => string {
  return (pathData) => {
    const name = pathData.chunk?.name ?? pathData.chunk?.id ?? "chunk";
    if (entryNames.has(String(name))) {
      const entryName = String(name);
      return outputMap.js[entryName] ?? `${entryName}/index.js`;
    }
    return `static/js/${name}.js`;
  };
}

/** Build CSS chunk filename function for output. Exported for coverage of ?? fallback. */
export function buildCssChunkFilenameFn(
  outputMap: { css: Record<string, string> },
  entryNames: Set<string>
): (pathData: { chunk?: { name?: string; id?: string } }) => string {
  return (pathData) => {
    const name = pathData.chunk?.name ?? pathData.chunk?.id ?? "chunk";
    if (entryNames.has(String(name))) {
      const entryName = String(name);
      return outputMap.css[entryName] ?? `${entryName}/index.css`;
    }
    return `static/css/${name}.css`;
  };
}


export function entryPlugin(resolvedConfig: ExtenzoResolvedConfig, entries: EntryInfo[]) {
  const { outDir, outputRoot, root } = resolvedConfig;
  const publicDir = resolve(root, "public");

  const entry: Record<string, string | { import: string; html?: boolean }> = {};
  for (const e of entries) {
    const isScriptOnly = NO_HTML_ENTRIES.includes(e.name);
    const needsHtml = !isScriptOnly && (e.html === true || e.htmlPath != null);
    if (needsHtml) {
      entry[e.name] = e.scriptPath;
    } else {
      entry[e.name] = { import: e.scriptPath, html: false };
    }
  }
  const entryNames = new Set(Object.keys(entry));

  const templateMap = buildTemplateMapFromEntries(entries);
  const scriptInjectMap = buildScriptInjectMap(entries);
  const outputMap = buildEntryOutputMap(entries);
  const entryByName = new Map(entries.map((e) => [e.name, e]));

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
        config.html.inject =
          Object.keys(scriptInjectMap).length > 0
            ? ({ entryName }: { entryName: string }) =>
                scriptInjectMap[entryName] ?? "head"
            : config.html.inject;
        config.html.outputStructure = config.html.outputStructure ?? "nested";

        config.tools = config.tools ?? {};
        const prevHtmlPlugin = config.tools.htmlPlugin;
        config.tools.htmlPlugin = (
          htmlConfig: Record<string, unknown>,
          ctx: { entryName: string; entryValue: unknown }
        ) => {
          if (prevHtmlPlugin && typeof prevHtmlPlugin === "function")
            prevHtmlPlugin(htmlConfig, ctx as Parameters<NonNullable<typeof prevHtmlPlugin>>[1]);
          if (outputMap.html[ctx.entryName])
            (htmlConfig as Record<string, string>).filename = outputMap.html[ctx.entryName];
          const entry = entryByName.get(ctx.entryName);
          if (entry?.scriptInject && entry.htmlPath && existsSync(entry.htmlPath)) {
            const content = getStrippedTemplateContent(entry.htmlPath);
            if (content) (htmlConfig as Record<string, string>).templateContent = content;
          }
        };

        // Watch HTML templates so editing e.g. popup.html triggers rebuild (template is not in module graph)
        const htmlPaths = entries.filter((e) => e.htmlPath).map((e) => e.htmlPath as string);
        if (htmlPaths.length > 0) {
          config.dev = config.dev ?? {};
          const prevWatch = config.dev.watchFiles as { paths?: string | string[]; options?: unknown } | undefined;
          const existingPaths = Array.isArray(prevWatch?.paths)
            ? prevWatch.paths
            : typeof prevWatch?.paths === "string"
              ? [prevWatch.paths]
              : [];
          config.dev.watchFiles = {
            ...(prevWatch && typeof prevWatch === "object" ? prevWatch : {}),
            paths: [...existingPaths, ...htmlPaths],
          } as typeof config.dev.watchFiles;
        }

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
        // Register HTML templates as file dependencies so watch mode rebuilds when they change
        const htmlPaths = entries.filter((e) => e.htmlPath).map((e) => e.htmlPath as string);
        if (htmlPaths.length > 0) {
          const rspackConfig = c as { plugins?: unknown[] };
          rspackConfig.plugins = rspackConfig.plugins ?? [];
          rspackConfig.plugins.push({
            name: "extenzo-watch-html-templates",
            apply(compiler: { hooks: { compilation: { tap: (name: string, fn: (compilation: { fileDependencies: { add: (p: string) => void } }) => void) => void } } }) {
              compiler.hooks.compilation.tap("extenzo-watch-html-templates", (compilation) => {
                for (const p of htmlPaths) {
                  if (existsSync(p)) compilation.fileDependencies.add(p);
                }
              });
            },
          });
        }
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
          const jsChunkName = buildJsChunkFilenameFn(outputMap, entryNames);
          const cssChunkName = buildCssChunkFilenameFn(outputMap, entryNames);
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
