# 介绍

Extenzo 是**基于 Rsbuild 的浏览器扩展开发框架**，帮助你在同一套工程里开发、构建 Chrome 与 Firefox 扩展。

## 为什么用 Extenzo

- **开发与生产一致**：我们一直认为浏览器插件开发由于调试更加复杂，因此必须使用 **full bundle** 模式以减少开发环境与正式环境的差异。得益于 **Rsbuild 的极致性能**，extenzo 通过 **build watch** 的方式进行热更新，既保证了开发和打包后的一致体验，也不会丢失构建性能。
- **一条依赖**：安装 `extenzo` 即获得 CLI 与构建链路（内部使用 `@extenzo/cli`、`@rsbuild/core` 及内置插件）。
- **配置简单**：根目录一个 `ext.config.ts`（或 `ext.config.js`），配置 manifest、入口、插件和 Rsbuild 扩展即可。
- **双浏览器**：通过 manifest 的 `chromium` / `firefox` 分支和 CLI 的 `-b chrome` | `-b firefox` 分别输出与调试。
- **开发友好**：`extenzo dev` 启动 watch + HMR，自动打开浏览器并加载扩展，每次构建后通过 WebSocket 触发重载。
- **可扩展**：`rsbuildConfig` 支持对象深度合并或函数形式，与 Vite 式配置习惯一致；可挂载生命周期钩子。

## 核心能力

| 能力 | 说明 |
|------|------|
| **Manifest** | 对象配置、路径配置，或省略后从 `srcDir` / `srcDir/manifest` 自动加载 `manifest.json`、`manifest.chromium.json`、`manifest.firefox.json`，按浏览器深度合并。 |
| **入口发现** | 默认从根或 `srcDir` 发现 `background`、`content`、`popup`、`options`、`sidepanel`、`devtools`；可用 `entry` 覆盖。 |
| **插件** | 内置 plugin-entry（入口与 HTML）、plugin-extension（写入 manifest.json）、plugin-hmr（开发 HMR）；用户通过 `plugins: [vue()]`、`plugins: [react()]` 接入框架。 |
| **Rsbuild 扩展** | `rsbuildConfig` 为对象时与 base 深度合并；为函数时传入 `(base, helpers)`，可用 `helpers.merge` 做合并。 |

## 与其它方案的区别

- **与纯手写 Webpack/Rspack 相比**：Extenzo 封装了扩展特有的入口解析、manifest 注入、开发 HMR，你只需写业务与 manifest 配置。
- **与 CRXJ/Vite 等相比**：基于 Rsbuild，构建性能与生态与 Rsbuild 一致；配置风格类似 Vite（单文件、plugins 数组、rsbuildConfig 扩展）。

接下来请从 [安装](/guide/install) 创建第一个项目。
