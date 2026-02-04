#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import prompts from "prompts";
import { blue, green } from "kolorist";
import minimist from "minimist";
import { getScriptExt, getConfigContent, getPackageJson } from "./templates.ts";
import type { Framework, Language } from "./templates.ts";

const argv = minimist(process.argv.slice(2));
const targetDir = argv._[0] ?? "my-extension";

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
  writeFileSync(join(root, "package.json"), getPackageJson(framework, lang, targetDir));

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
