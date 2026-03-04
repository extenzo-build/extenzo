#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import prompts from "prompts";
import { blue, green } from "kolorist";
import minimist from "minimist";
import { getScriptExt, getEntryScriptExt, getConfigContent, getPackageJson } from "./templates.ts";
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

function getPopupHtml(framework: Framework, lang: Language): string {
  const entryExt = getEntryScriptExt(framework, lang);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Popup</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./index${entryExt}" data-extenzo-entry></script>
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
  return `import { createApp } from "vue";
import App from "./App.vue";

createApp(App).mount("#app");
`;
}

function getPopupReactContent(lang: Language): string {
  return `import { createRoot } from "react-dom/client";
import App from "./App";

const root = document.getElementById("app");
if (root) createRoot(root).render(<App />);
`;
}

function getPopupPreactContent(lang: Language): string {
  return `import { render, h } from "preact";
import App from "./App";

const root = document.getElementById("app");
if (root) render(h(App, null), root);
`;
}

function getPopupSvelteContent(lang: Language): string {
  return `import App from "./App.svelte";

const target = document.getElementById("app");
if (target) new App({ target });
`;
}

function getPopupSolidContent(lang: Language): string {
  return `import { render } from "solid-js/web";
import App from "./App";

const root = document.getElementById("app");
if (root) render(() => App(), root);
`;
}

function getPopupUnoContent(lang: Language): string {
  return `import "../uno.css";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = document.getElementById("app");
if (root) createRoot(root).render(<App />);
`;
}

const POPUP_ENTRY_MAP: Record<
  Exclude<Framework, "vanilla">,
  (lang: Language) => string
> = {
  vue: getPopupVueContent,
  react: getPopupReactContent,
  preact: getPopupPreactContent,
  svelte: getPopupSvelteContent,
  solid: getPopupSolidContent,
  uno: getPopupUnoContent,
};

function getPopupEntryContent(framework: Framework, lang: Language): string {
  if (framework === "vanilla") return getPopupVanillaContent(lang);
  return POPUP_ENTRY_MAP[framework](lang);
}

function getOptionsHtml(framework: Framework, lang: Language): string {
  const entryExt = getEntryScriptExt(framework, lang);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Options</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./index${entryExt}" data-extenzo-entry></script>
</body>
</html>
`;
}

function getOptionsEntryContent(framework: Framework, lang: Language): string {
  return getPopupEntryContent(framework, lang);
}

function getSidepanelHtml(framework: Framework, lang: Language): string {
  const entryExt = getEntryScriptExt(framework, lang);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Side Panel</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./index${entryExt}" data-extenzo-entry></script>
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
  return `export default function App() {
  return <div>Hello from React</div>;
}
`;
}

function getPreactAppContent(lang: Language): string {
  return `import { h } from "preact";

export default function App() {
  return <div>Hello from Preact</div>;
}
`;
}

function getSvelteAppContent(lang: Language): string {
  return `<script>
</script>

<div>Hello from Svelte</div>
`;
}

function getSolidAppContent(lang: Language): string {
  return `export default function App() {
  return <div>Hello from Solid</div>;
}
`;
}

function getUnoAppContent(lang: Language): string {
  return `export default function App() {
  return (
    <div className="p-4 font-sans">
      <h1 className="text-lg font-semibold mb-2">Hello from UnoCSS</h1>
      <p className="text-gray-600">Edit this component to get started.</p>
    </div>
  );
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
        { title: "React + UnoCSS", value: "uno" },
        { title: "Preact", value: "preact" },
        { title: "Svelte", value: "svelte" },
        { title: "Solid", value: "solid" },
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
  const entryExt = getEntryScriptExt(framework, lang);
  const configExt = lang === "ts" ? "ts" : "js";

  const root = resolve(process.cwd(), targetDir);
  const appDir = join(root, "app");
  const dirs = [
    root,
    join(appDir, "background"),
    join(appDir, "content"),
    join(appDir, "popup"),
    join(appDir, "options"),
    join(appDir, "sidepanel"),
    join(root, "public", "icons"),
  ];

  for (const d of dirs) {
    mkdirSync(d, { recursive: true });
  }

  writeFileSync(
    join(root, `exo.config.${configExt}`),
    getConfigContent(framework, lang)
  );
  writeFileSync(join(root, "package.json"), getPackageJson(framework, lang, targetDir));

  if (lang === "ts") {
    writeFileSync(
      join(root, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            module: "ESNext",
            moduleResolution: "bundler",
            strict: true,
            jsx: "react-jsx",
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            skipLibCheck: true,
            types: framework !== "vanilla" ? ["chrome", "webextension-polyfill"] : [],
          },
          include: ["app"],
        },
        null,
        2
      )
    );
  }

  writeFileSync(
    join(appDir, "background", `index${scriptExt}`),
    getBackgroundContent(lang)
  );
  writeFileSync(
    join(appDir, "content", `index${scriptExt}`),
    getContentScriptContent(lang)
  );

  writeFileSync(join(appDir, "popup", "index.html"), getPopupHtml(framework, lang));
  writeFileSync(
    join(appDir, "popup", `index${entryExt}`),
    getPopupEntryContent(framework, lang)
  );
  writeFileSync(join(appDir, "options", "index.html"), getOptionsHtml(framework, lang));
  writeFileSync(
    join(appDir, "options", `index${entryExt}`),
    getOptionsEntryContent(framework, lang)
  );
  writeFileSync(join(appDir, "sidepanel", "index.html"), getSidepanelHtml(framework, lang));
  writeFileSync(
    join(appDir, "sidepanel", `index${entryExt}`),
    getSidepanelEntryContent(framework, lang)
  );

  if (framework === "vue") {
    writeFileSync(join(appDir, "popup", "App.vue"), getVueAppContent(lang));
    writeFileSync(join(appDir, "options", "App.vue"), getVueAppContent(lang));
    writeFileSync(join(appDir, "sidepanel", "App.vue"), getVueAppContent(lang));
  }
  if (framework === "react") {
    const reactExt = lang === "ts" ? "tsx" : "jsx";
    writeFileSync(join(appDir, "popup", `App.${reactExt}`), getReactAppContent(lang));
    writeFileSync(join(appDir, "options", `App.${reactExt}`), getReactAppContent(lang));
    writeFileSync(join(appDir, "sidepanel", `App.${reactExt}`), getReactAppContent(lang));
  }
  if (framework === "uno") {
    writeFileSync(
      join(root, "uno.config.ts"),
      `import { defineConfig, presetUno } from "unocss";

export default defineConfig({
  content: { filesystem: ["./app/**/*.{html,js,ts,jsx,tsx}"] },
  presets: [presetUno()],
});
`
    );
    writeFileSync(
      join(root, "postcss.config.mjs"),
      `import UnoCSS from "@unocss/postcss";

export default {
  plugins: [UnoCSS()],
};
`
    );
    writeFileSync(
      join(appDir, "uno.css"),
      `@unocss preflights;
@unocss default;
`
    );
    const reactExt = lang === "ts" ? "tsx" : "jsx";
    writeFileSync(join(appDir, "popup", `App.${reactExt}`), getUnoAppContent(lang));
    writeFileSync(join(appDir, "options", `App.${reactExt}`), getUnoAppContent(lang));
    writeFileSync(join(appDir, "sidepanel", `App.${reactExt}`), getUnoAppContent(lang));
  }
  if (framework === "preact") {
    const preactExt = lang === "ts" ? "tsx" : "jsx";
    writeFileSync(join(appDir, "popup", `App.${preactExt}`), getPreactAppContent(lang));
    writeFileSync(join(appDir, "options", `App.${preactExt}`), getPreactAppContent(lang));
    writeFileSync(join(appDir, "sidepanel", `App.${preactExt}`), getPreactAppContent(lang));
  }
  if (framework === "svelte") {
    writeFileSync(join(appDir, "popup", "App.svelte"), getSvelteAppContent(lang));
    writeFileSync(join(appDir, "options", "App.svelte"), getSvelteAppContent(lang));
    writeFileSync(join(appDir, "sidepanel", "App.svelte"), getSvelteAppContent(lang));
  }
  if (framework === "solid") {
    const solidExt = lang === "ts" ? "tsx" : "jsx";
    writeFileSync(join(appDir, "popup", `App.${solidExt}`), getSolidAppContent(lang));
    writeFileSync(join(appDir, "options", `App.${solidExt}`), getSolidAppContent(lang));
    writeFileSync(join(appDir, "sidepanel", `App.${solidExt}`), getSolidAppContent(lang));
  }

  writeFileSync(
    join(root, "public", "icons", "README.txt"),
    "Copy icon_16.png and icon_48.png here (16x16 and 48x48 PNG), or add your own icons.\n"
  );

  console.log(green("\n✓ 项目已生成\n"));
  console.log(`  cd ${targetDir}`);
  console.log("  pnpm install");
  console.log("  pnpm dev\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
