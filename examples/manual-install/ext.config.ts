import { resolve } from "path";
import { defineConfig } from "@extenzo/core";
import vue from "@extenzo/plugin-vue";
import { pluginLess } from "@rsbuild/plugin-less";

const root = process.cwd();

const baseManifest = {
  name: "__MSG_extension_name__",
  version: "2.0.8",
  manifest_version: 3,
  description: "__MSG_extension_des__",
  default_locale: "en_US",
  icons: {
    "128": "/icons/icon_128.png",
    "16": "/icons/icon_16.png",
    "256": "/icons/icon_256.png",
    "32": "/icons/icon_32.png",
    "48": "/icons/icon_48.png",
    "512": "/icons/icon_512.png",
    "64": "/icons/icon_64.png",
  },
  host_permissions: ["http://*/*", "https://*/*", "<all_urls>"],
  web_accessible_resources: [
    {
      resources: [
        "content/*",
        "download/*",
        "player/*",
        "player/**/*.*",
        "options/*",
        "capture/*",
        "favourites/*",
      ],
      matches: ["<all_urls>"],
      extension_ids: ["*"],
    },
  ],
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
  },
  homepage_url: "https://videoroll.app",
  permissions: [
    "tabs",
    "storage",
    "unlimitedStorage",
    "activeTab",
    "scripting",
    "tabCapture",
    "offscreen",
    "webRequest",
    "declarativeNetRequest",
    "downloads",
    "sidePanel",
    "contextMenus",
  ],
};

const chromiumManifest = {
  ...baseManifest,
  action: {
    default_icon: {
      128: "/icons/icon_128.png",
      16: "/icons/icon_16.png",
      256: "/icons/icon_256.png",
      32: "/icons/icon_32.png",
      48: "/icons/icon_48.png",
      512: "/icons/icon_512.png",
      64: "/icons/icon_64.png",
    },
    default_title: "Video Roll",
    default_popup: "popup/index.html",
  },
  background: { service_worker: "background/index.js" },
  side_panel: { default_path: "sidepanel/index.html" },
  options_ui: { page: "options/index.html", open_in_tab: true },
};

const firefoxManifest = {
  ...baseManifest,
  manifest_version: 3,
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
  },
  action: {
    default_icon: {
      128: "/icons/icon_128.png",
      16: "/icons/icon_16.png",
      256: "/icons/icon_256.png",
      32: "/icons/icon_32.png",
      48: "/icons/icon_48.png",
      512: "/icons/icon_512.png",
      64: "/icons/icon_64.png",
    },
    default_title: "Video Roll",
    default_popup: "popup/index.html",
  },
  sidebar_action: { default_panel: "sidepanel/index.html" },
  background: { scripts: ["background/index.js"] },
  browser_specific_settings: {
    gecko: {
      id: "{98dc310a-d8a9-4fbd-9c15-587f1e9c0799}",
      strict_min_version: "58.0",
    },
  },
};

export default defineConfig({
  srcDir: "src",
  outDir: "dist",
  // 构建产物在 .extenzo/dist，浏览器加载该目录
  manifest: {
    chromium: chromiumManifest,
    firefox: firefoxManifest,
  },
  plugins: [vue(), pluginLess()],
  // 自定义入口：key 为入口名，value 为相对 srcDir 的路径；不传则按默认发现
  entry: {
    capture: "capture/capture.html",
    download: "download/download.html",
    player: "player/player.html",
    offscreen: "offscreen/offscreen.html",
  },
  launch: {
    chrome: "C:\\Users\\GomiGXY\\Downloads\\chrome-win64\\chrome.exe",
  },
  // rsbuildConfig: {
  //   resolve: {
  //     alias: {
  //       worker_threads: resolve(root, "src/shims/worker_threads.ts"),
  //     },
  //   },
  //   source: {
  //     define: { __NAME__: JSON.stringify("video-roll") },
  //   },
  // },
});
