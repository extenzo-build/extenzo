import { defineConfig } from "extenzo";

const manifest = {
  name: "FFmpeg Worker Example",
  version: "0.0.1",
  manifest_version: 3,
  description: "Popup opens videopanel with ffmpeg.wasm (worker)",
  permissions: ["activeTab"],
  action: {
    default_popup: "popup/index.html",
  },
  background: { service_worker: "background/index.js" },
};

export default defineConfig({
  srcDir: "src",
  outDir: "dist",
  manifest: { chromium: manifest, firefox: { ...manifest } },
  entry: {
    videopanel: "videopanel/videopanel.html",
  },
  launch: {
    chrome: "C:\\Users\\GomiGXY\\Downloads\\chrome-win64\\chrome.exe",
  }
});
