# 安装

## 方式一：脚手架创建项目

```bash
pnpm create extenzo-app
# 或
npx create-extenzo-app
```

按提示选择框架（Vanilla / Vue / React）和语言（JavaScript / TypeScript），会生成完整项目结构和配置。

## 方式二：在现有项目中集成

### 1. 安装 extenzo

将 **extenzo** 作为**开发依赖**安装（一条依赖即包含 CLI 与构建能力）：

```bash
pnpm add -D extenzo
# 或
npm install -D extenzo
# 或
yarn add -D extenzo
```

### 2. 添加配置文件

在项目根目录创建 `ext.config.ts`（或 `ext.config.js`），并确保项目中有 `background`、`content`、`popup`、`options`、`sidepanel` 等入口（在根目录或由 `srcDir` 指定的目录下）。

### 3. 最小配置示例

```ts
// ext.config.ts
import { defineConfig } from "extenzo";
import { pluginReact } from "@rsbuild/plugin-react"; // 或 vue from "@extenzo/plugin-vue"

export default defineConfig({
  srcDir: "src",
  outDir: "dist",
  manifest: {
    name: "My Extension",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
    action: { default_popup: "popup/index.html" },
    background: { service_worker: "background/index.js" },
    content_scripts: [{ matches: ["<all_urls>"], js: ["content/index.js"] }],
  },
  plugins: [pluginReact()],
});
```

### 4. 包与导入

- **Core**：`defineConfig`、类型、入口发现与 manifest 等从 extenzo 导出。配置中请使用：`import { defineConfig } from "extenzo"`。
- **运行时**：如 [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) 可从 `@extenzo/utils` 导出。安装 `@extenzo/utils` 后：`import browser from "@extenzo/utils/webextension-polyfill"`。

### 5. 运行命令

- **开发**：`extenzo dev` 或 `pnpm dev`（若在 package.json 中配置了 `"dev": "extenzo dev"`）。
- **构建**：`extenzo build`，产物输出到 `outputRoot/outDir`（默认 `.extenzo/dist`）。

使用 `-b chrome` 或 `-b firefox` 指定目标浏览器，例如：

```bash
extenzo dev -b chrome
extenzo build -b firefox
```

未指定时默认为 Chrome。
