import { defineConfig } from "@extenzo/core";

const manifest = {
  name: "DevTools Native TS Example",
  version: "0.0.1",
  manifest_version: 3,
  description: "Chrome DevTools panel in pure TypeScript",
  /** devtools 入口的 HTML（构建后为 devtools/index.html）即 DevTools Tab 中展示的页面 */
  devtools_page: "devtools/index.html",
  background: { service_worker: "background/index.js" },
};

export default defineConfig({
  srcDir: "src",
  outDir: "dist",
  manifest: { chromium: manifest, firefox: { ...manifest } },
  launch: { chrome: "C:\\Users\\GomiGXY\\Downloads\\chrome-win64\\chrome.exe" },
});
