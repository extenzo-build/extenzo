import { defineConfig } from "extenzo";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "React Extension Template",
  version: "0.0.1",
  manifest_version: 3,
  description: "React template with popup, options, content, background",
  permissions: ["storage", "activeTab", "tabs"],
  action: {
    default_popup: "popup/index.html",
    default_icon: { 16: "/icons/icon_16.png", 48: "/icons/icon_48.png" },
  },
  options_ui: { page: "options/index.html", open_in_tab: true },
  background: { service_worker: "background/index.js" },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["content/index.js"],
    },
  ],
  "extension_pages": "script-src 'self' http://localhost:3000; object-src 'self'"
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginReact()],
  launch: {
    arc: 'C:\\Users\\GomiGXY\\AppData\\Local\\Microsoft\\WindowsApps\\Arc.exe',
    browseros: 'C:\\Users\\GomiGXY\\AppData\\Local\\BrowserOS\\BrowserOS\\Application\\chrome.exe',
  },
  hotReload: {
    autoRefreshContentPage: true,
  },
});
