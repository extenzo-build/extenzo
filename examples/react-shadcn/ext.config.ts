import { resolve } from "path";
import { defineConfig } from "extenzo";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "React + shadcn/ui Example",
  version: "0.0.1",
  manifest_version: 3,
  description: "Popup, options, content, background, sidepanel with React and shadcn/ui",
  permissions: ["storage", "activeTab", "sidePanel"],
  action: {
    default_icon: { 16: "/icons/icon_16.png", 48: "/icons/icon_48.png" },
  },
};

export default defineConfig({
  srcDir: "src",
  outDir: "dist",
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginReact()],
  rsbuildConfig: {
    resolve: { alias: { "@": resolve(process.cwd(), "src") } },
  },
  launch: { chrome: "C:\\Users\\GomiGXY\\Downloads\\chrome-win64\\chrome.exe" },
});
