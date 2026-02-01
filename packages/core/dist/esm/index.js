import { createRequire } from "module";
import { basename, dirname, resolve } from "path";
import { existsSync, statSync } from "fs";
function defineConfig(config) {
    return config;
}
const CONFIG_FILES = [
    "ext.config.ts",
    "ext.config.js",
    "ext.config.mjs"
];
const SCRIPT_EXTS = [
    ".js",
    ".jsx",
    ".ts",
    ".tsx"
];
const RESERVED_ENTRY_NAMES = [
    "popup",
    "options",
    "sidepanel",
    "background",
    "devtools",
    "content"
];
const HTML_ENTRY_NAMES = [
    "popup",
    "options",
    "sidepanel",
    "devtools"
];
const SCRIPT_ONLY_ENTRY_NAMES = [
    "background",
    "content"
];
const EXTENZO_OUTPUT_ROOT = ".extenzo";
const DEFAULT_BROWSER = "chromium";
const SUPPORTED_BROWSERS = [
    "chromium",
    "firefox"
];
const CLI_COMMANDS = [
    "dev",
    "build"
];
const MANIFEST_ENTRY_PATHS = {
    background: "background/index.js",
    content: "content/index.js",
    contentScripts: [
        {
            matches: [
                "<all_urls>"
            ],
            js: [
                "content/index.js"
            ],
            run_at: "document_start"
        }
    ],
    popup: "popup/index.html",
    options: "options/index.html",
    optionsOpenInTab: true,
    sidepanel: "sidepanel/index.html",
    devtools: "devtools/index.html"
};
const EXTENZO_ERROR_CODES = {
    CONFIG_NOT_FOUND: "EXTENZO_CONFIG_NOT_FOUND",
    CONFIG_LOAD_FAILED: "EXTENZO_CONFIG_LOAD_FAILED",
    MANIFEST_MISSING: "EXTENZO_MANIFEST_MISSING",
    NO_ENTRIES: "EXTENZO_NO_ENTRIES",
    INVALID_BROWSER: "EXTENZO_INVALID_BROWSER",
    UNKNOWN_COMMAND: "EXTENZO_UNKNOWN_COMMAND",
    RSBUILD_CONFIG_ERROR: "EXTENZO_RSBUILD_CONFIG_ERROR",
    BUILD_ERROR: "EXTENZO_BUILD_ERROR",
    ZIP_OUTPUT: "EXTENZO_ZIP_OUTPUT",
    ZIP_ARCHIVE: "EXTENZO_ZIP_ARCHIVE"
};
class ExtenzoError extends Error {
    code;
    details;
    hint;
    constructor(message, options){
        super(message);
        this.name = "ExtenzoError";
        this.code = options.code;
        this.details = options.details;
        this.hint = options.hint;
        if (void 0 !== options.cause) this.cause = options.cause;
    }
}
function formatError(err) {
    if (err instanceof ExtenzoError) {
        const parts = [
            `[${err.code}] ${err.message}`
        ];
        if (err.details) parts.push(`  详情: ${err.details}`);
        if (err.hint) parts.push(`  建议: ${err.hint}`);
        return parts.join("\n");
    }
    if (err instanceof Error) return err.stack ?? err.message;
    return String(err);
}
function exitWithError(err, exitCode = 1) {
    console.error("\n" + formatError(err));
    process.exit(exitCode);
}
function createConfigNotFoundError(root) {
    return new ExtenzoError("未找到 extenzo 配置文件", {
        code: EXTENZO_ERROR_CODES.CONFIG_NOT_FOUND,
        details: `在目录 ${root} 下未找到 ext.config.ts、ext.config.js 或 ext.config.mjs`,
        hint: "请在项目根目录执行命令，或新建 ext.config.ts / ext.config.js"
    });
}
function createConfigLoadError(filePath, cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return new ExtenzoError("加载配置文件失败", {
        code: EXTENZO_ERROR_CODES.CONFIG_LOAD_FAILED,
        details: `文件: ${filePath}，错误: ${message}`,
        hint: "检查 ext.config 语法与依赖是否正确",
        cause: cause instanceof Error ? cause : void 0
    });
}
function createManifestMissingError() {
    return new ExtenzoError("配置中缺少 manifest 字段", {
        code: EXTENZO_ERROR_CODES.MANIFEST_MISSING,
        details: "defineConfig 返回的对象必须包含 manifest（或 chromium / firefox 分支）",
        hint: "在 ext.config 中添加 manifest: { name, version, manifest_version, ... }"
    });
}
function createNoEntriesError(srcDir) {
    return new ExtenzoError("未发现任何入口", {
        code: EXTENZO_ERROR_CODES.NO_ENTRIES,
        details: `在 ${srcDir} 下未找到 background、content、popup、options 或 sidepanel 任一入口`,
        hint: "至少需要其一目录，且包含 index.ts / index.js 等入口文件"
    });
}
function createInvalidBrowserError(value) {
    return new ExtenzoError("不支持的浏览器参数", {
        code: EXTENZO_ERROR_CODES.INVALID_BROWSER,
        details: `当前值: "${value}"`,
        hint: "请使用 -b chrome 或 -b firefox，不传时默认 chrome"
    });
}
function createUnknownCommandError(cmd) {
    return new ExtenzoError("未知命令", {
        code: EXTENZO_ERROR_CODES.UNKNOWN_COMMAND,
        details: `命令: "${cmd}"`,
        hint: "支持: extenzo dev | extenzo build [-b chrome|firefox]"
    });
}
function findScriptInDir(dir, scriptExts) {
    for (const ext of scriptExts){
        const p = resolve(dir, `index${ext}`);
        if (existsSync(p)) return p;
    }
}
function hasIndexHtml(dir) {
    return existsSync(resolve(dir, "index.html"));
}
class EntryDiscoverer {
    scriptExts;
    scriptOnlyNames;
    htmlEntryNames;
    constructor(scriptExts = SCRIPT_EXTS, scriptOnlyNames = SCRIPT_ONLY_ENTRY_NAMES, htmlEntryNames = HTML_ENTRY_NAMES){
        this.scriptExts = scriptExts;
        this.scriptOnlyNames = scriptOnlyNames;
        this.htmlEntryNames = htmlEntryNames;
    }
    discover(baseDir) {
        const entries = [];
        for (const name of this.scriptOnlyNames){
            const dir = resolve(baseDir, name);
            if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
            const scriptPath = findScriptInDir(dir, this.scriptExts);
            if (scriptPath) entries.push({
                name,
                scriptPath
            });
        }
        for (const name of this.htmlEntryNames){
            const dir = resolve(baseDir, name);
            if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
            const scriptPath = findScriptInDir(dir, this.scriptExts);
            if (!scriptPath) continue;
            const htmlPath = hasIndexHtml(dir) ? resolve(dir, "index.html") : void 0;
            entries.push({
                name,
                scriptPath,
                htmlPath
            });
        }
        return entries;
    }
    getHtmlEntryNames() {
        return [
            ...this.htmlEntryNames
        ];
    }
    getScriptOnlyEntryNames() {
        return [
            ...this.scriptOnlyNames
        ];
    }
}
const defaultDiscoverer = new EntryDiscoverer();
function discoverEntries(baseDir) {
    return defaultDiscoverer.discover(baseDir);
}
function getHtmlEntryNames() {
    return defaultDiscoverer.getHtmlEntryNames();
}
function getScriptOnlyEntryNames() {
    return defaultDiscoverer.getScriptOnlyEntryNames();
}
const HTML_ENTRY_SET = new Set(HTML_ENTRY_NAMES);
function isHtmlPath(pathStr) {
    return pathStr.trim().toLowerCase().endsWith(".html");
}
function isScriptPath(pathStr) {
    const lower = pathStr.trim().toLowerCase();
    return SCRIPT_EXTS.some((ext)=>lower.endsWith(ext));
}
function entryResolver_findScriptInDir(dir) {
    for (const ext of SCRIPT_EXTS){
        const p = resolve(dir, `index${ext}`);
        if (existsSync(p)) return p;
    }
}
function findScriptForHtmlDir(dir, htmlFilename) {
    const indexScript = entryResolver_findScriptInDir(dir);
    if (indexScript) return indexScript;
    const stem = basename(htmlFilename, ".html");
    for (const ext of SCRIPT_EXTS){
        const p = resolve(dir, `${stem}${ext}`);
        if (existsSync(p)) return p;
    }
}
class EntryResolver {
    discoverer;
    constructor(discoverer = new EntryDiscoverer()){
        this.discoverer = discoverer;
    }
    resolve(config, _root, baseDir) {
        const defaultEntries = this.discoverer.discover(baseDir);
        const entryMap = new Map(defaultEntries.map((e)=>[
                e.name,
                e
            ]));
        const entryConfig = config.entry;
        if (entryConfig && Object.keys(entryConfig).length > 0) for (const [name, pathStr] of Object.entries(entryConfig)){
            const resolved = this.resolveOne(baseDir, name, pathStr);
            if (resolved) entryMap.set(name, resolved);
        }
        return Array.from(entryMap.values());
    }
    resolveOne(baseDir, name, pathStr) {
        const resolved = resolve(baseDir, pathStr);
        if (!existsSync(resolved)) return null;
        if (isHtmlPath(pathStr)) {
            const htmlPath = resolved;
            const dir = dirname(htmlPath);
            const scriptPath = findScriptForHtmlDir(dir, basename(htmlPath));
            if (!scriptPath) return null;
            return {
                name,
                scriptPath,
                htmlPath
            };
        }
        if (isScriptPath(pathStr)) {
            const scriptPath = resolved;
            const htmlPath = this.inferHtmlPathForReservedName(name, scriptPath);
            return {
                name,
                scriptPath,
                htmlPath
            };
        }
        return null;
    }
    inferHtmlPathForReservedName(entryName, scriptPath) {
        if (!HTML_ENTRY_SET.has(entryName)) return;
        const dir = dirname(scriptPath);
        const htmlPath = resolve(dir, "index.html");
        return existsSync(htmlPath) ? htmlPath : void 0;
    }
}
const defaultResolver = new EntryResolver();
function resolveEntries(config, root, baseDir) {
    return defaultResolver.resolve(config, root, baseDir);
}
const configLoader_require = createRequire("u" > typeof __filename ? __filename : import.meta.url);
class ConfigLoader {
    configFiles;
    entryResolver;
    entryDiscoverer;
    constructor(configFiles = CONFIG_FILES, entryResolver = new EntryResolver(), entryDiscoverer = new EntryDiscoverer()){
        this.configFiles = configFiles;
        this.entryResolver = entryResolver;
        this.entryDiscoverer = entryDiscoverer;
    }
    loadConfigFile(root) {
        for (const file of this.configFiles){
            const p = resolve(root, file);
            if (existsSync(p)) try {
                const jiti = configLoader_require("jiti")(root, {
                    esmResolve: true
                });
                const mod = jiti(p);
                return mod.default ?? mod;
            } catch (e) {
                throw createConfigLoadError(p, e);
            }
        }
        return null;
    }
    resolve(root) {
        const user = this.loadConfigFile(root);
        if (!user) throw createConfigNotFoundError(root);
        if (!user.manifest) throw createManifestMissingError();
        const srcDir = resolve(root, user.srcDir ?? ".");
        const outDir = user.outDir ?? "dist";
        const outputRoot = user.outputRoot ?? EXTENZO_OUTPUT_ROOT;
        const config = {
            ...user,
            srcDir,
            outDir,
            outputRoot,
            root
        };
        const baseDir = srcDir;
        const baseEntries = this.entryDiscoverer.discover(baseDir);
        const entries = this.entryResolver.resolve(user, root, baseDir);
        if (0 === entries.length) throw createNoEntriesError(baseDir);
        return {
            config,
            baseEntries,
            entries
        };
    }
}
const defaultLoader = new ConfigLoader();
function loadConfigFile(root) {
    return defaultLoader.loadConfigFile(root);
}
function resolveExtenzoConfig(root) {
    return defaultLoader.resolve(root);
}
function isChromiumFirefoxManifest(m) {
    return "object" == typeof m && null !== m && ("chromium" in m || "firefox" in m);
}
function buildForBrowser(manifest, entries, _browser) {
    const out = {
        ...manifest
    };
    if (entries.some((e)=>"background" === e.name)) out.background = {
        service_worker: MANIFEST_ENTRY_PATHS.background
    };
    if (entries.some((e)=>"content" === e.name)) out.content_scripts = MANIFEST_ENTRY_PATHS.contentScripts;
    if (entries.some((e)=>"popup" === e.name)) {
        out.action = out.action || {};
        const action = out.action;
        action.default_popup = MANIFEST_ENTRY_PATHS.popup;
    }
    if (entries.some((e)=>"options" === e.name)) out.options_ui = {
        page: MANIFEST_ENTRY_PATHS.options,
        open_in_tab: MANIFEST_ENTRY_PATHS.optionsOpenInTab
    };
    if (entries.some((e)=>"sidepanel" === e.name)) out.side_panel = {
        default_path: MANIFEST_ENTRY_PATHS.sidepanel
    };
    if (entries.some((e)=>"devtools" === e.name)) out.devtools_page = MANIFEST_ENTRY_PATHS.devtools;
    return out;
}
class ManifestBuilder {
    buildForBrowser(config, entries, browser) {
        const base = isChromiumFirefoxManifest(config) ? "firefox" === browser ? config.firefox ?? config.chromium ?? {} : config.chromium ?? config.firefox ?? {} : config;
        return buildForBrowser(base, entries, browser);
    }
    buildForChromium(config, entries) {
        return this.buildForBrowser(config, entries, "chromium");
    }
    buildForFirefox(config, entries) {
        return this.buildForBrowser(config, entries, "firefox");
    }
}
const defaultBuilder = new ManifestBuilder();
function resolveManifestChromium(config, entries) {
    return defaultBuilder.buildForChromium(config, entries);
}
function resolveManifestFirefox(config, entries) {
    return defaultBuilder.buildForFirefox(config, entries);
}
function isPlainObject(v) {
    return "object" == typeof v && null !== v && !Array.isArray(v);
}
function mergeRsbuildConfig(base, user) {
    const result = {
        ...base
    };
    for (const key of Object.keys(user)){
        const baseVal = base[key];
        const userVal = user[key];
        if ("plugins" === key) {
            const basePlugins = Array.isArray(baseVal) ? baseVal : [];
            const userPlugins = Array.isArray(userVal) ? userVal : [];
            result[key] = [
                ...basePlugins,
                ...userPlugins
            ];
            continue;
        }
        if (isPlainObject(baseVal) && isPlainObject(userVal)) {
            result[key] = mergeRsbuildConfig(baseVal, userVal);
            continue;
        }
        if (void 0 !== userVal) result[key] = userVal;
    }
    return result;
}
const BROWSER_FLAGS = [
    "-b",
    "--browser"
];
const BROWSER_ALIASES = {
    chrome: "chromium",
    chromium: "chromium",
    firefox: "firefox"
};
function parseBrowserValue(value) {
    const normalized = value.trim().toLowerCase();
    return BROWSER_ALIASES[normalized] ?? null;
}
class CliParser {
    parse(argv) {
        const cmdRaw = argv[0] ?? "dev";
        const command = CLI_COMMANDS.includes(cmdRaw) ? cmdRaw : null;
        if (null === command) throw createUnknownCommandError(cmdRaw);
        const { browser, unknown: unknownBrowser } = this.getBrowserFromArgv(argv);
        return {
            command,
            browser,
            unknownBrowser
        };
    }
    getBrowserFromArgv(argv) {
        for(let i = 0; i < argv.length; i++){
            const arg = argv[i];
            if (BROWSER_FLAGS.includes(arg)) {
                const value = argv[i + 1];
                if (value && !value.startsWith("-")) {
                    const target = parseBrowserValue(value);
                    if (target) return {
                        browser: target
                    };
                    return {
                        browser: DEFAULT_BROWSER,
                        unknown: value
                    };
                }
            }
            if (arg.startsWith("-b=") || arg.startsWith("--browser=")) {
                const value = arg.split("=")[1] ?? "";
                const target = parseBrowserValue(value);
                if (target) return {
                    browser: target
                };
                return {
                    browser: DEFAULT_BROWSER,
                    unknown: value
                };
            }
        }
        return {
            browser: DEFAULT_BROWSER
        };
    }
    assertSupportedBrowser(value) {
        const target = parseBrowserValue(value);
        if (target) return;
        throw createInvalidBrowserError(value);
    }
}
const defaultParser = new CliParser();
function parseCliArgs(argv) {
    return defaultParser.parse(argv);
}
function assertSupportedBrowser(value) {
    defaultParser.assertSupportedBrowser(value);
}
var src_DEFAULT_OUT_DIR = "dist";
var src_DEFAULT_SRC_DIR = ".";
var src_HMR_WS_PORT = 23333;
export { CLI_COMMANDS, CONFIG_FILES, CliParser, ConfigLoader, DEFAULT_BROWSER, EXTENZO_ERROR_CODES, EXTENZO_OUTPUT_ROOT, EntryDiscoverer, EntryResolver, ExtenzoError, HTML_ENTRY_NAMES, MANIFEST_ENTRY_PATHS, ManifestBuilder, RESERVED_ENTRY_NAMES, SCRIPT_EXTS, SCRIPT_ONLY_ENTRY_NAMES, SUPPORTED_BROWSERS, assertSupportedBrowser, createConfigLoadError, createConfigNotFoundError, createInvalidBrowserError, createManifestMissingError, createNoEntriesError, createUnknownCommandError, defineConfig, discoverEntries, exitWithError, getHtmlEntryNames, getScriptOnlyEntryNames, loadConfigFile, mergeRsbuildConfig, parseCliArgs, resolveEntries, resolveExtenzoConfig, resolveManifestChromium, resolveManifestFirefox, src_DEFAULT_OUT_DIR as DEFAULT_OUT_DIR, src_DEFAULT_SRC_DIR as DEFAULT_SRC_DIR, src_HMR_WS_PORT as HMR_WS_PORT };

//# sourceMappingURL=index.js.map