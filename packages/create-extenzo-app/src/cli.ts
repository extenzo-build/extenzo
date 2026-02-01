#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import prompts from "prompts";
import { blue, green } from "kolorist";
import minimist from "minimist";

type Framework = "vanilla" | "vue" | "react";
type Language = "js" | "ts";

const argv = minimist(process.argv.slice(2));
const targetDir = argv._[0] ?? "my-extension";

function getScriptExt(lang: Language): string {
  return lang === "ts" ? ".ts" : ".js";
}

function getConfigContent(framework: Framework, lang: Language): string {
  const importLine =
    framework === "vue"
      ? 'import vue from "@extenzo/plugin-vue";'
      : framework === "react"
        ? 'import react from "@extenzo/plugin-react";'
        : "";
  const pluginsLine =
    framework === "vue"
      ? "plugins: [vue()],"
      : framework === "react"
        ? "plugins: [react()],"
        : "";
  return `import { defineConfig } from "@extenzo/core";
${importLine}

export default defineConfig({
  srcDir: "src",
  outDir: "dist",
  // outputRoot 默认 ".extenzo"，构建产物在 .extenzo/dist
  manifest: {
    name: "My Extension",
    version: "1.0.0",
    manifest_version: 3,
    description: "Browser extension built with extenzo",
    permissions: ["storage", "activeTab"],
  },
  ${pluginsLine}
  // 需要覆盖 Rsbuild 配置时使用 rsbuildConfig（对象会深度合并，函数则完全控制）
  // rsbuildConfig: (config) => config,
});
`;
}

function getPackageJson(framework: Framework, lang: Language): string {
  const base: Record<string, unknown> = {
    name: targetDir.replace(/\s+/g, "-").toLowerCase(),
    version: "1.0.0",
    private: true,
    type: "module",
    scripts: {
      dev: "extenzo dev",
      build: "extenzo build",
    },
  };
  const deps: Record<string, string> = { "@extenzo/cli": "^0.1.0", "@rsbuild/core": "^1.6.0" };
  if (framework === "vue") {
    deps["vue"] = "^3.4.0";
    deps["@extenzo/plugin-vue"] = "^0.1.0";
    (base as any).devDependencies = {
      "@rsbuild/plugin-vue": "^1.2.0",
      "@rsbuild/plugin-vue-jsx": "^1.1.0",
      "@rsbuild/plugin-less": "^1.5.0",
      "@rsbuild/plugin-babel": "^1.0.6",
    };
  }
  if (framework === "react") {
    deps["react"] = "^18.2.0";
    deps["react-dom"] = "^18.2.0";
    deps["@extenzo/plugin-react"] = "^0.1.0";
    (base as any).devDependencies = {
      ...((base as any).devDependencies ?? {}),
      "@rsbuild/plugin-react": "^1.2.0",
    };
  }
  if (lang === "ts") {
    (base as any).devDependencies = {
      ...((base as any).devDependencies ?? {}),
      typescript: "^5.0.0",
    };
  }
  (base as any).dependencies = deps;
  return JSON.stringify(base, null, 2);
}

function getBackgroundContent(lang: Language): string {
  if (lang === "ts") {
    return `chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});
`;
  }
  return `chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});
`;
}

function getContentScriptContent(lang: Language): string {
  return `console.log("Content script loaded");
`;
}

function getPopupHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Popup</title>
</head>
<body>
  <div id="app"></div>
</body>
</html>
`;
}

function getPopupVanillaContent(lang: Language): string {
  const ext = getScriptExt(lang);
  return `document.getElementById("app").textContent = "Hello from popup";
`;
}

function getPopupVueContent(lang: Language): string {
  const ext = getScriptExt(lang);
  if (lang === "ts") {
    return `import { createApp } from "vue";
import App from "./App.vue";

createApp(App).mount("#app");
`;
  }
  return `import { createApp } from "vue";
import App from "./App.vue";

createApp(App).mount("#app");
`;
}

function getPopupReactContent(lang: Language): string {
  if (lang === "ts") {
    return `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = document.getElementById("app");
if (root) createRoot(root).render(React.createElement(App));
`;
  }
  return `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = document.getElementById("app");
if (root) createRoot(root).render(React.createElement(App));
`;
}

function getPopupEntryContent(framework: Framework, lang: Language): string {
  if (framework === "vanilla") return getPopupVanillaContent(lang);
  if (framework === "vue") return getPopupVueContent(lang);
  return getPopupReactContent(lang);
}

function getOptionsHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Options</title>
</head>
<body>
  <div id="app"></div>
</body>
</html>
`;
}

function getOptionsEntryContent(framework: Framework, lang: Language): string {
  return getPopupEntryContent(framework, lang);
}

function getSidepanelHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Side Panel</title>
</head>
<body>
  <div id="app"></div>
</body>
</html>
`;
}

function getSidepanelEntryContent(framework: Framework, lang: Language): string {
  return getPopupEntryContent(framework, lang);
}

function getVueAppContent(lang: Language): string {
  return `<template>
  <div>Hello from Vue</div>
</template>

<script setup>
</script>
`;
}

function getReactAppContent(lang: Language): string {
  const ext = getScriptExt(lang);
  if (lang === "ts") {
    return `export default function App() {
  return <div>Hello from React</div>;
}
`;
  }
  return `export default function App() {
  return <div>Hello from React</div>;
}
`;
}

async function main() {
  console.log(blue("\n  Create Extenzo App\n"));

  if (existsSync(resolve(process.cwd(), targetDir))) {
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: `目录 ${targetDir} 已存在，是否覆盖？`,
      initial: false,
    });
    if (!overwrite) process.exit(0);
  }

  const res = await prompts([
    {
      type: "select",
      name: "framework",
      message: "选择框架",
      choices: [
        { title: "Vanilla", value: "vanilla" },
        { title: "Vue", value: "vue" },
        { title: "React", value: "react" },
      ],
    },
    {
      type: "select",
      name: "language",
      message: "选择语言",
      choices: [
        { title: "JavaScript", value: "js" },
        { title: "TypeScript", value: "ts" },
      ],
    },
  ]);

  if (!res.framework || !res.language) process.exit(0);

  const framework = res.framework as Framework;
  const lang = res.language as Language;
  const scriptExt = getScriptExt(lang);
  const configExt = lang === "ts" ? "ts" : "js";

  const root = resolve(process.cwd(), targetDir);
  const src = join(root, "src");
  const dirs = [
    root,
    join(src, "background"),
    join(src, "content"),
    join(src, "popup"),
    join(src, "options"),
    join(src, "sidepanel"),
    join(root, "public", "icons"),
  ];

  for (const d of dirs) {
    mkdirSync(d, { recursive: true });
  }

  writeFileSync(
    join(root, `ext.config.${configExt}`),
    getConfigContent(framework, lang)
  );
  writeFileSync(join(root, "package.json"), getPackageJson(framework, lang));

  writeFileSync(
    join(src, "background", `index${scriptExt}`),
    getBackgroundContent(lang)
  );
  writeFileSync(
    join(src, "content", `index${scriptExt}`),
    getContentScriptContent(lang)
  );

  writeFileSync(join(src, "popup", "index.html"), getPopupHtml());
  writeFileSync(
    join(src, "popup", `index${scriptExt}`),
    getPopupEntryContent(framework, lang)
  );
  writeFileSync(join(src, "options", "index.html"), getOptionsHtml());
  writeFileSync(
    join(src, "options", `index${scriptExt}`),
    getOptionsEntryContent(framework, lang)
  );
  writeFileSync(join(src, "sidepanel", "index.html"), getSidepanelHtml());
  writeFileSync(
    join(src, "sidepanel", `index${scriptExt}`),
    getSidepanelEntryContent(framework, lang)
  );

  if (framework === "vue") {
    writeFileSync(join(src, "popup", "App.vue"), getVueAppContent(lang));
    writeFileSync(join(src, "options", "App.vue"), getVueAppContent(lang));
    writeFileSync(join(src, "sidepanel", "App.vue"), getVueAppContent(lang));
  }
  if (framework === "react") {
    const reactExt = lang === "ts" ? "tsx" : "jsx";
    writeFileSync(join(src, "popup", `App.${reactExt}`), getReactAppContent(lang));
    writeFileSync(join(src, "options", `App.${reactExt}`), getReactAppContent(lang));
    writeFileSync(join(src, "sidepanel", `App.${reactExt}`), getReactAppContent(lang));
  }

  writeFileSync(join(root, "public", "icons", ".gitkeep"), "");

  console.log(green("\n✓ 项目已生成\n"));
  console.log(`  cd ${targetDir}`);
  console.log("  pnpm install");
  console.log("  pnpm dev\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
