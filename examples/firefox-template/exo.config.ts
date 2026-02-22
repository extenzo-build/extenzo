import { defineConfig } from "extenzo";

const chromiumManifest = {
  name: "Firefox Extension Template",
  version: "0.0.1",
  manifest_version: 3,
  description: "Firefox template with popup, content, background",
  permissions: ["storage", "activeTab"],
  host_permissions: ["<all_urls>"],
  action: {
    default_popup: "popup/index.html",
  },
  background: { service_worker: "background/index.js" },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["content/index.js"],
    },
  ],
};

const firefoxManifest = {
  name: "Firefox Extension Template",
  version: "0.0.1",
  manifest_version: 3,
  description: "Firefox template with popup, content, background",
  permissions: ["storage", "activeTab"],
  host_permissions: ["<all_urls>"],
  action: {
    default_popup: "popup/index.html",
  },
  background: { scripts: ["background/index.js"] },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["content/index.js"],
    },
  ],
  browser_specific_settings: {
    gecko: {
      id: "firefox-template@extenzo.local",
      strict_min_version: "109.0",
    },
  },
};

export default defineConfig({
  outDir: "dist",
  manifest: { chromium: chromiumManifest, firefox: firefoxManifest },
  // launch: {
  //   firefox: "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
  // },
});
