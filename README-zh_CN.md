<p align="center">
  <img width="230" src="extenzo.png">
</p>

<h1 align="center">
Extenzo
</h1>

# Extenzo

基于 Rsbuild 的浏览器插件开发框架，支持 Vanilla / Vue / React，开发模式带热更新。

## 快速开始

### 方式一：脚手架创建项目

```bash
pnpm create extenzo-app
# 或
npx create-extenzo-app
```

按提示选择框架（Vanilla / Vue / React）和语言（JavaScript / TypeScript），会生成完整目录和配置。

### 方式二：在现有项目中安装

```bash
pnpm add @extenzo/cli @rsbuild/core
```

在项目根目录新建 `ext.config.ts`（或 `ext.config.js`），并按照下方配置说明编写配置；目录结构需包含 `background`、`content`、`popup`、`options`、`sidepanel` 等入口（可放在根目录或通过 `srcDir` 指定目录）。

### 包与引用约定

- **核心能力**（`defineConfig`、类型、发现、manifest 等）从 **`@extenzo/core`** 导出；配置中请使用 `import { defineConfig } from "@extenzo/core"`。
- **工具类能力**（如 [webextension-polyfill](https://github.com/mozilla/webextension-polyfill)）从 **`@extenzo/utils`** 导出，按需安装 `@extenzo/utils` 后使用：

```ts
import browser from "@extenzo/utils/webextension-polyfill";
```

## 配置说明

配置文件：`ext.config.ts` 或 `ext.config.js`。

通过框架提供的 `defineConfig` 返回配置对象，支持以下字段：

| 字段 | 说明 |
|------|------|
| **manifest** | 插件 manifest。可直接写完整 manifest 对象，也可拆成 `chromium` / `firefox` 分别写 |
| **plugins** | Rsbuild 插件数组，同 Vite 一样调用函数引入，如 `plugins: [vue()]`、`plugins: [react()]`（需先 `import vue from '@extenzo/plugin-vue'`） |
| **rsbuildConfig** | 覆盖/扩展 Rsbuild 配置（类似 Vite 的 build.rollupOptions / esbuild）。传**对象**时与生成的 base 深度合并；传**函数**时 `(base) => config` 完全控制。需要细粒度配置时直接写这里 |
| **entry** | 自定义入口：对象形式，key 为入口名（保留名 popup/options/sidepanel/background/devtools/content 不可改，其余可自定义），value 为相对 baseDir 的路径字符串（如 `'content/index.ts'`）。未配置 srcDir 时 baseDir=根目录，配置了 srcDir 则 baseDir=srcDir。不传则按默认从 baseDir 发现入口 |
| **srcDir** | 源码目录，默认不写则为项目根目录；同时作为 **entry** 路径的查找起点（与根目录二选一） |
| **outDir** | 打包输出目录，默认 `"dist"` |
| **launch** | 开发模式浏览器启动路径。`launch.chrome`、`launch.firefox` 分别传入 Chrome / Firefox 可执行文件路径；框架在 `extenzo dev` 时据此自动启动对应浏览器。未设置时回退到 `.env` 中的 `BROWSER_CHROME` / `BROWSER_FIREFOX` |
| **hooks** | 生命周期钩子，在「解析 CLI → 加载配置 → 生成 Rsbuild 配置 → 执行构建」各阶段注入扩展逻辑。见下方「生命周期钩子」 |

### 生命周期钩子

在 `defineConfig` 中可配置 `hooks`，在流水线各阶段执行自定义逻辑（入参为 `PipelineContext`，含 root、command、browser、config、entries、rsbuildConfig 等）：

| 钩子 | 触发时机 |
|------|----------|
| **afterCliParsed** | CLI 参数（command、-b）解析完成后 |
| **afterConfigLoaded** | 配置加载并解析入口（含 entry 配置）完成后 |
| **beforeRsbuildConfig** | manifest 与合并入口确定后、Rsbuild 配置生成前 |
| **beforeBuild** | Rsbuild 配置就绪、执行构建前 |
| **afterBuild** | 构建完成后（仅 `extenzo build`；dev 为 watch 不结束） |

### 错误与退出码

CLI 在配置缺失、入口未发现、无效命令或无效 `-b` 等情况下会抛出 **ExtenzoError**（带 `code`、`details`、`hint`），并在 stderr 输出清晰原因与建议后以非零退出码退出。错误码见 `@extenzo/core` 导出的 `EXTENZO_ERROR_CODES`。

### 配置示例

```ts
import { defineConfig } from "@extenzo/core";
import vue from "@extenzo/plugin-vue";

export default defineConfig({
  srcDir: "src",
  outDir: "dist",
  manifest: {
    name: "My Extension",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
  },
  plugins: [vue()],
  // 开发模式自动启动浏览器：传入可执行文件路径
  // launch: { chrome: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", firefox: "C:\\Program Files\\Firefox\\firefox.exe" },
  // 需要覆盖 Rsbuild 时使用 rsbuildConfig（对象深度合并，函数完全控制）
  // rsbuildConfig: (config) => config,
  // 自定义入口（可选）；不传则按默认从 srcDir 发现 background/content/popup/options/sidepanel/devtools
  // entry: { background: "background/index.ts", content: "content/index.ts", popup: "popup/index.ts", myPage: "pages/my.ts" },
  // 生命周期钩子（可选）
  // hooks: { beforeBuild: (ctx) => console.log("Building for", ctx.browser) },
});
```

## 目录结构约定

- 默认从**项目根目录**或 **srcDir** 指定目录（baseDir）下发现以下入口；也可通过 **entry** 配置自定义路径：
  - **background**、**content**：仅脚本
  - **popup**、**options**、**sidepanel**、**devtools**：需同目录下 `index.html` + 入口脚本
  - 保留入口名（不可改名）：popup、options、sidepanel、background、devtools、content；其余入口名可自定义
  - **entry** 的 value 为相对 baseDir 的路径，如 `'content/index.ts'`、`'src/popup/index.ts'`（baseDir 未设置 srcDir 时为根目录）

## 命令

在安装 extenzo 的项目中：

- `extenzo dev` 或 `pnpm dev`（若在 package.json 中配置为 `"dev": "extenzo dev"`）：开发模式，watch + 热更新（需配合 Reload Manager 扩展与本地 WebSocket）
- `extenzo build`：生产构建，输出到 `outDir`（默认 `dist`）

**终端输出**：执行 `extenzo dev` 或 `extenzo build` 时，终端中每一行输出前会带青色的 **`[extenzo]`** 前缀，便于区分是 extenzo 在执行；Rsbuild 的完整日志、进度与错误信息均原样保留。

可通过 **`-b chrome`** 或 **`-b firefox`** 指定目标浏览器（同时决定使用的 manifest 配置与开发时启动的浏览器）：

- `extenzo dev -b chrome` / `extenzo dev -b firefox`
- `extenzo build -b chrome` / `extenzo build -b firefox`

不传 `-b` 时默认使用 Chrome（manifest 取 `chromium` 分支，启动时用 `launch.chrome` 或 `.env` 的 `BROWSER_CHROME`）；目标浏览器仅由 `-b` 指定，不受环境变量影响。

## 开发模式热更新

开发模式下会启动 WebSocket 服务，并在构建完成后通知浏览器重载扩展。使用方式与 VideoRoll-Pro 中 `scripts/rsbuild-browser-plugin` 一致：通过 Rsbuild 插件封装，在首次构建完成后自动打开浏览器并加载当前扩展；后续代码变更触发重新构建后，通过 WebSocket 通知扩展重载。

浏览器路径可通过配置 **launch** 或 **.env** 指定（launch 优先）：

- **ext.config**：`launch: { chrome: "C:\\...\\chrome.exe", firefox: "C:\\...\\firefox.exe" }`
- **.env**：`BROWSER_CHROME=...`、`BROWSER_FIREFOX=...` 用于浏览器可执行文件路径（选择 Chrome 或 Firefox 由命令参数 `-b chrome` / `-b firefox` 决定，默认 chrome）

## 仓库结构

- `packages/cli`：**@extenzo/cli**，CLI 入口与 **Pipeline** 类（串联解析 → 配置 → Rsbuild 配置 → 钩子；可注入 ConfigLoader / CliParser）
- `packages/core`：核心按流水线阶段命名，文件名与类名一致（小写）：**ConfigLoader**（configLoader.ts）、**CliParser**（cliParser.ts）、**EntryDiscoverer**（entryDiscoverer.ts）、**EntryResolver**（entryResolver.ts）、**ManifestBuilder**（manifestBuilder.ts）；常量、ExtenzoError、mergeRsbuildConfig、defineConfig、类型
- `packages/utils`：工具（webextension-polyfill 等），按需从 `@extenzo/utils` 引用
- `packages/plugins/plugin-entry`：**内部**，解析目录与入口、设置 entry/html/output
- `packages/plugins/plugin-extension`：**内部**，解析并生成 manifest.json
- `packages/plugins/plugin-hmr`：**内部**，dev 热更新与启动浏览器
- `packages/plugins/plugin-vue`：Vue 3 + Vue JSX + Less + Babel，用法 `plugins: [vue()]`
- `packages/plugins/plugin-react`：React + JSX，用法 `plugins: [react()]`
- `packages/create-extenzo-app`：脚手架 CLI，按选择生成 `plugins: [vue()]` 或 `plugins: [react()]`

框架内部默认运行 plugin-entry、plugin-extension、plugin-hmr；用户通过 `plugins: [vue()]` 等引入框架插件，通过 `rsbuildConfig` 覆盖 Rsbuild。
