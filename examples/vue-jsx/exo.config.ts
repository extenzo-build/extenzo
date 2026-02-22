
import { defineConfig } from "extenzo";
import vue from "@extenzo/plugin-vue";
import { pluginLess } from "@rsbuild/plugin-less";

const baseManifest = {
  name: "__MSG_extension_name__",
  version: "2.0.8",
  manifest_version: 3,
  description: "__MSG_extension_des__",
  default_locale: "en_US",
  icons: {
    16: "icons/icon_16.png",
    32: "icons/icon_32.png",
    48: "icons/icon_48.png",
    64: "icons/icon_64.png",
    128: "icons/icon_128.png",
    256: "icons/icon_256.png",
    512: "icons/icon_512.png",
  },
  host_permissions: ["http://*/*", "https://*/*", "<all_urls>"],
  web_accessible_resources: [
    {
      resources: [
        "content/*",
        "download/*",
        "player/*",
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
  action: {
    default_icon: {
      16: "icons/icon_16.png",
      32: "icons/icon_32.png",
      48: "icons/icon_48.png",
      64: "icons/icon_64.png",
      128: "icons/icon_128.png",
      256: "icons/icon_256.png",
      512: "icons/icon_512.png",
    },
    default_title: "Video Roll",
    default_popup: "[exo.popup]",
  },
  background: { service_worker: "[exo.background]" },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["[exo.content]"],
      run_at: "document_start",
    },
  ],
  options_ui: { page: "[exo.options]", open_in_tab: true },
  side_panel: { default_path: "[exo.sidepanel]" },
};

export default defineConfig({
  manifest: { chromium: baseManifest, firefox: { ...baseManifest } },
  plugins: [vue(), pluginLess()],
  entry: {
    capture: {
      src: "capture/index.ts",
      html: "capture/capture.html",
    },
    download: {
      src: "download/index.ts",
      html: "download/download.html",
    },
    player: {
      src: "player/index.ts",
      html: "player/player.html",
    }
  }
});
