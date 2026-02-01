// src/defineConfig.ts
function defineConfig(config) {
  return config;
}

// src/config.ts
import { createRequire } from "module";
import { resolve as resolve2 } from "path";
import { existsSync as existsSync2 } from "fs";

// src/discover.ts
import { resolve } from "path";
import { existsSync, statSync } from "fs";
var SCRIPT_EXTS = [".ts", ".tsx", ".js", ".jsx"];
var HTML_ENTRIES = ["popup", "options", "sidepanel"];
var SCRIPT_ONLY_ENTRIES = ["background", "content"];
function findScriptInDir(dir) {
  for (const ext of SCRIPT_EXTS) {
    const p = resolve(dir, `index${ext}`);
    if (existsSync(p)) return p;
  }
  return void 0;
}
function hasIndexHtml(dir) {
  return existsSync(resolve(dir, "index.html"));
}
function discoverEntries(baseDir) {
  const entries = [];
  for (const name of SCRIPT_ONLY_ENTRIES) {
    const dir = resolve(baseDir, name);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    const scriptPath = findScriptInDir(dir);
    if (scriptPath) entries.push({ name, scriptPath });
  }
  for (const name of HTML_ENTRIES) {
    const dir = resolve(baseDir, name);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    const scriptPath = findScriptInDir(dir);
    if (!scriptPath) continue;
    const htmlPath = hasIndexHtml(dir) ? resolve(dir, "index.html") : void 0;
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
var require2 = createRequire(
  typeof __filename !== "undefined" ? __filename : import.meta.url
);
var CONFIG_FILES = ["ext.config.ts", "ext.config.js", "ext.config.mjs"];
function loadConfigFile(root) {
  for (const file of CONFIG_FILES) {
    const p = resolve2(root, file);
    if (!existsSync2(p)) continue;
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
  const srcDir = resolve2(root, user.srcDir ?? ".");
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
import { resolve as resolve3 } from "path";
function getVideoRollExtraPages(root, srcDir) {
  const base = resolve3(root, srcDir);
  return [
    { name: "capture", scriptPath: resolve3(base, "capture/index.ts"), htmlPath: resolve3(base, "capture/capture.html"), outHtml: "capture/capture.html" },
    { name: "download", scriptPath: resolve3(base, "download/index.ts"), htmlPath: resolve3(base, "download/download.html"), outHtml: "download/download.html" },
    { name: "player", scriptPath: resolve3(base, "player/index.ts"), htmlPath: resolve3(base, "player/player.html"), outHtml: "player/player.html" },
    { name: "offscreen", scriptPath: resolve3(base, "offscreen/offscreen.ts"), htmlPath: resolve3(base, "offscreen/offscreen.html"), outHtml: "offscreen/offscreen.html" },
    { name: "favourites", scriptPath: resolve3(base, "favourites/index.ts"), htmlPath: resolve3(base, "favourites/favourites.html"), outHtml: "favourites/favourites.html" }
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
export {
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
};
//# sourceMappingURL=index.js.map