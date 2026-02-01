"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  defineConfig: () => defineConfig,
  discoverEntries: () => discoverEntries,
  getHtmlEntryNames: () => getHtmlEntryNames,
  getScriptOnlyEntryNames: () => getScriptOnlyEntryNames,
  getVideoRollExtraPages: () => getVideoRollExtraPages,
  mergeRsbuildConfig: () => mergeRsbuildConfig,
  resolveExtenzoConfig: () => resolveExtenzoConfig,
  resolveExtraPages: () => resolveExtraPages,
  resolveManifestChromium: () => resolveManifestChromium,
  resolveManifestFirefox: () => resolveManifestFirefox
});
module.exports = __toCommonJS(index_exports);

// src/defineConfig.ts
function defineConfig(config) {
  return config;
}

// src/config.ts
var import_module = require("module");
var import_path2 = require("path");
var import_fs2 = require("fs");

// src/discover.ts
var import_path = require("path");
var import_fs = require("fs");
var SCRIPT_EXTS = [".ts", ".tsx", ".js", ".jsx"];
var HTML_ENTRIES = ["popup", "options", "sidepanel"];
var SCRIPT_ONLY_ENTRIES = ["background", "content"];
function findScriptInDir(dir) {
  for (const ext of SCRIPT_EXTS) {
    const p = (0, import_path.resolve)(dir, `index${ext}`);
    if ((0, import_fs.existsSync)(p)) return p;
  }
  return void 0;
}
function hasIndexHtml(dir) {
  return (0, import_fs.existsSync)((0, import_path.resolve)(dir, "index.html"));
}
function discoverEntries(baseDir) {
  const entries = [];
  for (const name of SCRIPT_ONLY_ENTRIES) {
    const dir = (0, import_path.resolve)(baseDir, name);
    if (!(0, import_fs.existsSync)(dir) || !(0, import_fs.statSync)(dir).isDirectory()) continue;
    const scriptPath = findScriptInDir(dir);
    if (scriptPath) entries.push({ name, scriptPath });
  }
  for (const name of HTML_ENTRIES) {
    const dir = (0, import_path.resolve)(baseDir, name);
    if (!(0, import_fs.existsSync)(dir) || !(0, import_fs.statSync)(dir).isDirectory()) continue;
    const scriptPath = findScriptInDir(dir);
    if (!scriptPath) continue;
    const htmlPath = hasIndexHtml(dir) ? (0, import_path.resolve)(dir, "index.html") : void 0;
    entries.push({ name, scriptPath, htmlPath });
  }
  return entries;
}
function getHtmlEntryNames() {
  return HTML_ENTRIES;
}
function getScriptOnlyEntryNames() {
  return SCRIPT_ONLY_ENTRIES;
}

// src/config.ts
var import_meta = {};
var require2 = (0, import_module.createRequire)(
  typeof __filename !== "undefined" ? __filename : import_meta.url
);
var CONFIG_FILES = ["ext.config.ts", "ext.config.js", "ext.config.mjs"];
function loadConfigFile(root) {
  for (const file of CONFIG_FILES) {
    const p = (0, import_path2.resolve)(root, file);
    if (!(0, import_fs2.existsSync)(p)) continue;
    try {
      const jiti = require2("jiti")(root, { esmResolve: true });
      const mod = jiti(p);
      return mod.default ?? mod;
    } catch (e) {
      console.warn(`Failed to load ${file}:`, e);
      return null;
    }
  }
  return null;
}
function resolveExtenzoConfig(root) {
  const user = loadConfigFile(root);
  if (!user || !user.manifest) {
    throw new Error("ext.config.ts/js not found or manifest is missing in config");
  }
  const srcDir = (0, import_path2.resolve)(root, user.srcDir ?? ".");
  const outDir = user.outDir ?? "dist";
  const config = {
    ...user,
    srcDir,
    outDir,
    root
  };
  const entries = discoverEntries(srcDir);
  if (entries.length === 0) {
    throw new Error(
      `No entries found under ${srcDir} (expected at least one of: background, content, popup, options, sidepanel)`
    );
  }
  return { config, entries };
}

// src/extraPages.ts
var import_path3 = require("path");
function getVideoRollExtraPages(root, srcDir) {
  const base = (0, import_path3.resolve)(root, srcDir);
  return [
    { name: "capture", scriptPath: (0, import_path3.resolve)(base, "capture/index.ts"), htmlPath: (0, import_path3.resolve)(base, "capture/capture.html"), outHtml: "capture/capture.html" },
    { name: "download", scriptPath: (0, import_path3.resolve)(base, "download/index.ts"), htmlPath: (0, import_path3.resolve)(base, "download/download.html"), outHtml: "download/download.html" },
    { name: "player", scriptPath: (0, import_path3.resolve)(base, "player/index.ts"), htmlPath: (0, import_path3.resolve)(base, "player/player.html"), outHtml: "player/player.html" },
    { name: "offscreen", scriptPath: (0, import_path3.resolve)(base, "offscreen/offscreen.ts"), htmlPath: (0, import_path3.resolve)(base, "offscreen/offscreen.html"), outHtml: "offscreen/offscreen.html" },
    { name: "favourites", scriptPath: (0, import_path3.resolve)(base, "favourites/index.ts"), htmlPath: (0, import_path3.resolve)(base, "favourites/favourites.html"), outHtml: "favourites/favourites.html" }
  ];
}
function resolveExtraPages(extraPages, root, srcDirRelative) {
  if (!extraPages) return [];
  if (Array.isArray(extraPages)) return extraPages;
  if (extraPages === "video-roll") return getVideoRollExtraPages(root, srcDirRelative);
  return [];
}

// src/manifest.ts
function buildManifestForBrowser(manifest, entries, _browser) {
  const out = { ...manifest };
  const hasBackground = entries.some((e) => e.name === "background");
  const hasContent = entries.some((e) => e.name === "content");
  if (hasBackground) {
    out.background = {
      service_worker: "background/index.js"
    };
  }
  if (hasContent) {
    out.content_scripts = [
      {
        matches: ["<all_urls>"],
        js: ["content/index.js"],
        run_at: "document_start"
      }
    ];
  }
  const hasPopup = entries.some((e) => e.name === "popup");
  if (hasPopup) {
    out.action = out.action || {};
    const action = out.action;
    action.default_popup = "popup/index.html";
  }
  const hasOptions = entries.some((e) => e.name === "options");
  if (hasOptions) {
    out.options_ui = {
      page: "options/index.html",
      open_in_tab: true
    };
  }
  const hasSidepanel = entries.some((e) => e.name === "sidepanel");
  if (hasSidepanel) {
    out.side_panel = {
      default_path: "sidepanel/index.html"
    };
  }
  return out;
}
function isChromiumFirefoxManifest(m) {
  return typeof m === "object" && m !== null && ("chromium" in m || "firefox" in m);
}
function resolveManifestChromium(config, entries) {
  const base = isChromiumFirefoxManifest(config) ? config.chromium ?? config.firefox ?? {} : config;
  return buildManifestForBrowser(base, entries, "chromium");
}
function resolveManifestFirefox(config, entries) {
  const base = isChromiumFirefoxManifest(config) ? config.firefox ?? config.chromium ?? {} : config;
  return buildManifestForBrowser(base, entries, "firefox");
}

// src/mergeRsbuildConfig.ts
function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function mergeRsbuildConfig(base, user) {
  const result = { ...base };
  for (const key of Object.keys(user)) {
    const baseVal = base[key];
    const userVal = user[key];
    if (key === "plugins") {
      const basePlugins = Array.isArray(baseVal) ? baseVal : [];
      const userPlugins = Array.isArray(userVal) ? userVal : [];
      result[key] = [...basePlugins, ...userPlugins];
      continue;
    }
    if (isPlainObject(baseVal) && isPlainObject(userVal)) {
      result[key] = mergeRsbuildConfig(
        baseVal,
        userVal
      );
      continue;
    }
    if (userVal !== void 0) {
      result[key] = userVal;
    }
  }
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  defineConfig,
  discoverEntries,
  getHtmlEntryNames,
  getScriptOnlyEntryNames,
  getVideoRollExtraPages,
  mergeRsbuildConfig,
  resolveExtenzoConfig,
  resolveExtraPages,
  resolveManifestChromium,
  resolveManifestFirefox
});
//# sourceMappingURL=index.cjs.map