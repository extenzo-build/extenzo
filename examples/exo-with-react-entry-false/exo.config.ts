import { defineConfig } from "extenzo";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "React Entry False Example",
  version: "0.0.1",
  manifest_version: 3,
  description: "React extension with entry: false, entries in rsbuildConfig",
  permissions: ["storage", "activeTab"],
  action: {
    default_popup: "popup/index.html",
    default_icon: { 16: "/icons/icon_16.png", 48: "/icons/icon_48.png" },
  },
  options_ui: { page: "options/index.html", open_in_tab: true },
  background: { service_worker: "background.js" },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["content.js"],
    },
  ],
};

export default defineConfig({
  entry: false,
  appDir: "app",
  outDir: "dist",
  debug: true,
  manifest: { chromium: manifest, firefox: { ...manifest } },
  plugins: [pluginReact()],
  rsbuildConfig: {
    source: {
      entry: {
        popup: "./app/popup/index.tsx",
        options: "./app/options/index.tsx",
        background: {
          import: "./app/background/index.ts",
          html: false,
        },
        content: {
          import: "./app/content/index.ts",
          html: false,
        },
      },
    },
    html: {
      outputStructure: "nested"
    },
    output: {
      filenameHash: false,
      distPath: { root: ".extenzo/dist", js: ".", css: "." },
      filename: {
        js: (pathData: { chunk?: { name?: string } }) => {
          const name = pathData.chunk?.name ?? "index";
          if (name === "background" || name === "content") return "[name].js";
          return "[name]/index.js";
        },
        css: (pathData: { chunk?: { name?: string } }) => {
          const name = pathData.chunk?.name ?? "index";
          if (name === "background" || name === "content") return "[name].css";
          return "[name]/index.css";
        },
      },
      copy: [{ from: "./public/icons", to: "./icons" }],
    },
  },
  persist: true
});
