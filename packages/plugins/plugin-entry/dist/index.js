import { basename, resolve } from "path";
import { existsSync, readFileSync } from "fs";
const NO_HTML_ENTRIES = [
    "background",
    "content"
];
function isHmrPlugin(p) {
    if (!p || "object" != typeof p) return false;
    const obj = p;
    return obj.constructor?.name === "HotModuleReplacementPlugin" || "HotModuleReplacementPlugin" === obj.name;
}
function disableRspackHmrInPlace(config) {
    const devServer = config.devServer;
    if (devServer) devServer.hot = false;
    else config.devServer = {
        hot: false
    };
    const plugins = config.plugins;
    if (Array.isArray(plugins)) config.plugins = plugins.filter((p)=>!isHmrPlugin(p));
}
function buildTemplateMapFromEntries(entries) {
    const map = {};
    for (const e of entries)if (e.htmlPath) map[e.name] = e.htmlPath;
    return map;
}
function buildFilenameMap(entries) {
    const map = {
        popup: "popup/index.html",
        options: "options/index.html",
        sidepanel: "sidepanel/index.html",
        devtools: "devtools/index.html"
    };
    for (const e of entries)if (e.htmlPath && !map[e.name]) map[e.name] = `${e.name}/${basename(e.htmlPath)}`;
    return map;
}
function stripScriptsInTemplate(templatePath) {
    if (!existsSync(templatePath)) return "";
    let content = readFileSync(templatePath, "utf-8");
    content = content.replace(/<script[^>]*src="([^"]*)"[^>]*><\/script>/gi, (fullMatch, src)=>/^https?:\/\//i.test(src.trim()) ? fullMatch : "");
    return content;
}
function entryPlugin(resolvedConfig, entries) {
    const { outDir, outputRoot, root } = resolvedConfig;
    const publicDir = resolve(root, "public");
    const entry = {};
    for (const e of entries)entry[e.name] = e.scriptPath;
    const entryNames = new Set(Object.keys(entry));
    const templateMap = buildTemplateMapFromEntries(entries);
    const filenameMap = buildFilenameMap(entries);
    return {
        name: "extenzo-entry",
        setup (api) {
            api.modifyRsbuildConfig((config)=>{
                config.source = config.source ?? {};
                config.source.entry = {
                    ...config.source.entry,
                    ...entry
                };
                config.html = config.html ?? {};
                const prevTemplate = config.html.template;
                config.html.template = (opts)=>{
                    if (templateMap[opts.entryName]) return templateMap[opts.entryName];
                    if ("function" == typeof prevTemplate) return prevTemplate(opts);
                };
                config.html.outputStructure = config.html.outputStructure ?? "nested";
                config.tools = config.tools ?? {};
                const prevHtmlPlugin = config.tools.htmlPlugin;
                config.tools.htmlPlugin = (htmlConfig, ctx)=>{
                    if (prevHtmlPlugin && "function" == typeof prevHtmlPlugin) prevHtmlPlugin(htmlConfig, ctx);
                    if (filenameMap[ctx.entryName]) htmlConfig.filename = filenameMap[ctx.entryName];
                    const templatePath = htmlConfig.template;
                    if ("string" == typeof templatePath && existsSync(templatePath) && entries.some((e)=>e.htmlPath === templatePath)) {
                        const content = stripScriptsInTemplate(templatePath);
                        htmlConfig.templateContent = content;
                        htmlConfig.template = content;
                    }
                };
                config.output = config.output ?? {};
                const outputDir = `${outputRoot}/${outDir}`;
                const existingDistPath = config.output.distPath && "object" == typeof config.output.distPath ? config.output.distPath : {};
                config.output.distPath = {
                    ...existingDistPath,
                    root: outputDir
                };
                config.output.cleanDistPath = config.output.cleanDistPath ?? true;
                config.output.assetPrefix = config.output.assetPrefix ?? "/";
                if (existsSync(publicDir)) {
                    const copyRules = Array.isArray(config.output.copy) ? config.output.copy : [];
                    config.output.copy = [
                        ...copyRules,
                        {
                            from: publicDir
                        }
                    ];
                }
            });
            api.onBeforeCreateCompiler(async ({ bundlerConfigs })=>{
                const c = bundlerConfigs[0];
                if (!c) return;
                disableRspackHmrInPlace(c);
                const distPath = resolve(root, outputRoot, outDir);
                const watchOpts = c.watchOptions ?? {};
                const existingIgnored = watchOpts.ignored;
                const ignoredList = Array.isArray(existingIgnored) ? [
                    ...existingIgnored,
                    distPath
                ] : null != existingIgnored ? [
                    existingIgnored,
                    distPath
                ] : [
                    distPath
                ];
                c.watchOptions = {
                    ...watchOpts,
                    ignored: ignoredList
                };
                if (c.output) {
                    c.output.path = distPath;
                    const jsChunkName = (pathData)=>{
                        const name = pathData.chunk?.name ?? pathData.chunk?.id ?? "chunk";
                        return entryNames.has(String(name)) ? `${name}/index.js` : `static/js/${name}.js`;
                    };
                    const cssChunkName = (pathData)=>{
                        const name = pathData.chunk?.name ?? pathData.chunk?.id ?? "chunk";
                        return entryNames.has(String(name)) ? `${name}/index.css` : `static/css/${name}.css`;
                    };
                    c.output.filename = jsChunkName;
                    c.output.chunkFilename = c.output.chunkFilename ?? jsChunkName;
                    c.output.cssFilename = cssChunkName;
                    c.output.cssChunkFilename = c.output.cssChunkFilename ?? cssChunkName;
                    c.output.publicPath = "/";
                }
                if (c.optimization) {
                    c.optimization.runtimeChunk = false;
                    c.optimization.splitChunks = c.optimization.splitChunks ?? {};
                    c.optimization.splitChunks.chunks = "function" == typeof c.optimization.splitChunks.chunks ? c.optimization.splitChunks.chunks : (chunk)=>chunk.name ? !NO_HTML_ENTRIES.includes(chunk.name) : true;
                }
            });
        }
    };
}
export { entryPlugin };

//# sourceMappingURL=index.js.map