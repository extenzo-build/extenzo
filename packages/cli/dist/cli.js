#!/usr/bin/env node
import { resolve } from "path";
import { createWriteStream, existsSync, readFileSync } from "fs";
import { CONFIG_FILES, CliParser, ConfigLoader, ExtenzoError, HMR_WS_PORT, createConfigNotFoundError, exitWithError, mergeRsbuildConfig } from "@extenzo/core";
import { entryPlugin } from "@extenzo/plugin-entry";
import { extensionPlugin } from "@extenzo/plugin-extension";
import { hmrPlugin } from "@extenzo/plugin-hmr";
import { getVueRsbuildPlugins } from "@extenzo/plugin-vue";
import { getReactRsbuildPlugins } from "@extenzo/plugin-react";
import { spawnSync } from "child_process";
import archiver from "archiver";
const EXTENSION_DEV_DEPS = [
    "@types/chrome"
];
const PLUGIN_PEER_DEPS = {
    "extenzo-vue": [
        "vue"
    ],
    "extenzo-react": [
        "react",
        "react-dom"
    ]
};
function detectPackageManager(root) {
    if (existsSync(resolve(root, "pnpm-lock.yaml"))) return "pnpm";
    if (existsSync(resolve(root, "bun.lockb"))) return "bun";
    if (existsSync(resolve(root, "yarn.lock"))) return "yarn";
    if (existsSync(resolve(root, "package-lock.json"))) return "npm";
    return "pnpm";
}
function readProjectPackageJson(root) {
    const p = resolve(root, "package.json");
    if (!existsSync(p)) return null;
    try {
        const raw = readFileSync(p, "utf-8");
        return JSON.parse(raw);
    } catch  {
        return null;
    }
}
function isPackageInManifest(root, name) {
    const pkg = readProjectPackageJson(root);
    if (!pkg) return false;
    const deps = {
        ...pkg.dependencies,
        ...pkg.devDependencies
    };
    return "object" == typeof deps && Object.prototype.hasOwnProperty.call(deps, name);
}
function getPluginNamesFromConfig(config) {
    const plugins = config.plugins;
    if (!plugins) return [];
    const list = Array.isArray(plugins) ? plugins : [
        plugins
    ];
    const names = [];
    for (const p of list)if (p && "object" == typeof p && "name" in p && "string" == typeof p.name) names.push(p.name);
    return names;
}
function collectPackagesToInstall(root, config) {
    const toInstall = [];
    for (const name of EXTENSION_DEV_DEPS)if (!isPackageInManifest(root, name)) toInstall.push(name);
    const pluginNames = getPluginNamesFromConfig(config);
    for (const [pluginName, peers] of Object.entries(PLUGIN_PEER_DEPS))if (pluginNames.includes(pluginName)) {
        for (const pkg of peers)if (!isPackageInManifest(root, pkg)) toInstall.push(pkg);
    }
    return [
        ...new Set(toInstall)
    ];
}
function runInstall(root, pm, packages, dev) {
    let cmd;
    let args;
    if ("npm" === pm) {
        cmd = "npm";
        args = dev ? [
            "install",
            "-D",
            ...packages
        ] : [
            "install",
            ...packages
        ];
    } else if ("bun" === pm) {
        cmd = "bun";
        args = dev ? [
            "add",
            "-d",
            ...packages
        ] : [
            "add",
            ...packages
        ];
    } else {
        cmd = pm;
        args = dev ? [
            "add",
            "-D",
            ...packages
        ] : [
            "add",
            ...packages
        ];
    }
    const result = spawnSync(cmd, args, {
        cwd: root,
        stdio: "inherit",
        shell: true
    });
    return 0 === result.status;
}
async function ensureDependencies(root, config, options) {
    if ("1" === process.env.EXTENZO_SKIP_DEPS) return {
        installed: []
    };
    const toInstall = collectPackagesToInstall(root, config);
    if (0 === toInstall.length) return {
        installed: []
    };
    if (!options?.silent) console.log(`[extenzo] Ensuring dev dependencies: ${toInstall.join(", ")}`);
    const pm = detectPackageManager(root);
    const ok = runInstall(root, pm, toInstall, true);
    if (!ok && !options?.silent) console.warn(`[extenzo] Failed to install some dependencies. You may run: ${pm} add -D ${toInstall.join(" ")}`);
    return {
        installed: ok ? toInstall : []
    };
}
function isHmrPlugin(p) {
    if (!p || "object" != typeof p) return false;
    const obj = p;
    const byConstructor = obj.constructor?.name === "HotModuleReplacementPlugin";
    const byName = "HotModuleReplacementPlugin" === obj.name;
    return Boolean(byConstructor || byName);
}
function disableRspackHmr(rspackConfig) {
    const c = rspackConfig;
    if (c.devServer) c.devServer.hot = false;
    else c.devServer = {
        hot: false
    };
    if (Array.isArray(c.plugins)) c.plugins = c.plugins.filter((p)=>!isHmrPlugin(p));
}
class Pipeline {
    configLoader;
    cliParser;
    constructor(configLoader = new ConfigLoader(), cliParser = new CliParser()){
        this.configLoader = configLoader;
        this.cliParser = cliParser;
    }
    async run(root, argv) {
        const parseResult = this.cliParser.parse(argv);
        if (parseResult.unknownBrowser) console.warn(`Unknown browser "${parseResult.unknownBrowser}", use chrome or firefox. Defaulting to chromium.`);
        process.env.BROWSER = parseResult.browser;
        const { config, baseEntries, entries } = this.configLoader.resolve(root);
        await ensureDependencies(root, config);
        const outDir = config.outDir;
        const outputRoot = config.outputRoot;
        const distPath = resolve(root, outputRoot, outDir);
        const isDev = "dev" === parseResult.command;
        let baseConfig = this.buildBaseRsbuildConfig({
            root,
            config,
            baseEntries,
            entries
        });
        baseConfig = await this.applyUserRsbuildConfig(baseConfig, config);
        baseConfig = this.injectHmrForDev(baseConfig, {
            root,
            command: parseResult.command,
            browser: parseResult.browser,
            config,
            baseEntries,
            entries,
            rsbuildConfig: baseConfig,
            isDev,
            distPath
        });
        const ctx = {
            root,
            command: parseResult.command,
            browser: parseResult.browser,
            config,
            baseEntries,
            entries,
            rsbuildConfig: baseConfig,
            isDev,
            distPath
        };
        await config.hooks?.afterCliParsed?.(ctx);
        await config.hooks?.afterConfigLoaded?.(ctx);
        await config.hooks?.beforeRsbuildConfig?.(ctx);
        await config.hooks?.beforeBuild?.(ctx);
        return ctx;
    }
    expandFrameworkPlugins(userPlugins, appRoot) {
        const out = [];
        const list = userPlugins ?? [];
        const arr = Array.isArray(list) ? list : [
            list
        ];
        for (const p of arr){
            const name = p?.name;
            if ("extenzo-vue" === name) {
                const vuePlugins = getVueRsbuildPlugins(appRoot);
                if (Array.isArray(vuePlugins)) out.push(...vuePlugins);
            }
            if ("extenzo-react" === name) {
                const reactPlugins = getReactRsbuildPlugins(appRoot);
                if (Array.isArray(reactPlugins)) out.push(...reactPlugins);
            }
            out.push(p);
        }
        return out;
    }
    buildBaseRsbuildConfig(ctx) {
        const expanded = this.expandFrameworkPlugins(ctx.config.plugins, ctx.root);
        const plugins = [
            entryPlugin(ctx.config, ctx.entries),
            ...expanded,
            extensionPlugin(ctx.config, ctx.entries)
        ];
        return {
            root: ctx.root,
            plugins
        };
    }
    async applyUserRsbuildConfig(base, config) {
        const user = config.rsbuildConfig ?? config.rsbuild;
        if ("function" == typeof user) return user(base);
        if (user && "object" == typeof user) return mergeRsbuildConfig(base, user);
        return base;
    }
    injectHmrForDev(baseConfig, ctx) {
        if (!ctx.isDev) return baseConfig;
        const prevRspack = baseConfig.tools?.rspack;
        const hmrOpts = {
            distPath: ctx.distPath,
            autoOpen: true,
            browser: ctx.browser,
            chromePath: ctx.config.launch?.chrome,
            firefoxPath: ctx.config.launch?.firefox,
            wsPort: HMR_WS_PORT,
            enableReload: true
        };
        return {
            ...baseConfig,
            dev: {
                ...baseConfig.dev,
                hmr: false,
                liveReload: false
            },
            tools: {
                ...baseConfig.tools,
                rspack: (rspackConfig, utils)=>{
                    let result = rspackConfig;
                    if ("function" == typeof prevRspack) result = prevRspack(rspackConfig, utils) ?? rspackConfig;
                    disableRspackHmr(result);
                    if (utils?.appendPlugins) utils.appendPlugins(hmrPlugin(hmrOpts));
                    return result;
                }
            }
        };
    }
}
const defaultPipeline = new Pipeline();
function runPipeline(root, argv) {
    return defaultPipeline.run(root, argv);
}
const PREFIX = "\x1b[36m[extenzo]\x1b[0m ";
function isEncoding(x) {
    return "string" == typeof x;
}
function createPrefixedWrite(stream, getPrefix) {
    const originalWrite = stream.write.bind(stream);
    let buffer = "";
    function flushIncomplete() {
        if (buffer.length > 0) {
            originalWrite(getPrefix() + buffer);
            buffer = "";
        }
    }
    const write = function(chunk, encodingOrCallback, callback) {
        const encoding = isEncoding(encodingOrCallback) ? encodingOrCallback : void 0;
        const cb = "function" == typeof encodingOrCallback ? encodingOrCallback : callback;
        const str = "string" == typeof chunk ? chunk : chunk.toString(encoding ?? "utf8");
        buffer += str;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines)originalWrite(getPrefix() + line + "\n", encoding);
        if ("function" == typeof cb) cb();
        return true;
    };
    write.flush = flushIncomplete;
    return write;
}
function wrapExtenzoOutput() {
    const prefix = ()=>PREFIX;
    const stdoutWrite = createPrefixedWrite(process.stdout, prefix);
    const stderrWrite = createPrefixedWrite(process.stderr, prefix);
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
    const flush = ()=>{
        const fOut = stdoutWrite.flush;
        const fErr = stderrWrite.flush;
        if (fOut) fOut();
        if (fErr) fErr();
    };
    process.once("exit", flush);
}
const ZIP_OUTPUT_CODE = "EXTENZO_ZIP_OUTPUT";
const ZIP_ARCHIVE_CODE = "EXTENZO_ZIP_ARCHIVE";
const ZIP_LEVEL = 9;
function zipDist(distPath, root, outDir) {
    const zipPath = resolve(root, `${outDir}.zip`);
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", {
        zlib: {
            level: ZIP_LEVEL
        }
    });
    return new Promise((resolvePromise, reject)=>{
        output.on("error", (err)=>reject(new ExtenzoError("Zip output stream failed", {
                code: ZIP_OUTPUT_CODE,
                details: err instanceof Error ? err.message : String(err),
                cause: err
            })));
        output.on("close", ()=>resolvePromise(zipPath));
        archive.on("error", (err)=>reject(new ExtenzoError("Zip archive failed", {
                code: ZIP_ARCHIVE_CODE,
                details: err instanceof Error ? err.message : String(err),
                cause: err
            })));
        archive.pipe(output);
        archive.directory(distPath, false);
        archive.finalize();
    });
}
const cli_root = process.cwd();
function hasConfigFile() {
    return CONFIG_FILES.some((file)=>existsSync(resolve(cli_root, file)));
}
async function main() {
    if (!hasConfigFile()) throw createConfigNotFoundError(cli_root);
    const argv = process.argv.slice(2);
    const ctx = await runPipeline(cli_root, argv);
    process.env.NODE_ENV = ctx.isDev ? "development" : "production";
    wrapExtenzoOutput();
    const { createRsbuild } = await import("@rsbuild/core");
    const rsbuild = await createRsbuild({
        rsbuildConfig: ctx.rsbuildConfig
    });
    if ("dev" === ctx.command) await rsbuild.build({
        watch: true
    });
    else {
        await rsbuild.build();
        await ctx.config.hooks?.afterBuild?.(ctx);
        if (false !== ctx.config.zip) {
            const zipPath = await zipDist(ctx.distPath, ctx.root, ctx.config.outDir);
            console.log(`Zipped output to ${zipPath}`);
        }
    }
}
main().catch((e)=>exitWithError(e));

//# sourceMappingURL=cli.js.map