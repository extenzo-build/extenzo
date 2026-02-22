import { defineConfig } from "extenzo";

const manifest = {
  name: "Single File Entries Template",
  version: "0.0.1",
  manifest_version: 3,
  description: "Single file entries: popup.html, options.html, background.ts, content.ts",
  permissions: ["storage", "activeTab"],
  host_permissions: ["<all_urls>"],
  action: {
    default_popup: "popup.html",
  },
  options_ui: { page: "options.html", open_in_tab: true },
  background: { service_worker: "background.js" },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["content.js"],
    },
  ],
};

const firefoxManifest = {
  name: "Single File Entries Template",
  version: "0.0.1",
  manifest_version: 3,
  description: "Single file entries: popup.html, options.html, background.ts, content.ts",
  permissions: ["storage", "activeTab"],
  host_permissions: ["<all_urls>"],
  action: {
    default_popup: "popup.html",
  },
  options_ui: { page: "options.html", open_in_tab: true },
  background: { service_worker: "background.js" },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["content.js"],   
    },
  ],
  browser_specific_settings: {
    gecko: {
      id: "extenzo-example-single-file-template@extenzo.com",
    },
  },
};

export default defineConfig({
  outDir: "dist",
  manifest: { chromium: manifest, firefox: firefoxManifest},
  launch: {
    vivaldi: "C:\\apps\\browser\\Application\\vivaldi.exe",
  },
  persist: true,
});
