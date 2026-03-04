# extenzo 示例

本目录存放基于 extenzo 的浏览器扩展示例，用于参考与本地调试。

| 示例 | 说明 |
|------|------|
| [exo-with-vue](./exo-with-vue) | Vue 3 模板：popup、options、content、background + 简单消息通信 |
| [exo-with-react](./exo-with-react) | React 模板：popup、options、content、background + 简单消息通信 |
| [exo-with-preact](./exo-with-preact) | Preact 模板：popup、options、content、background + 简单消息通信 |
| [exo-with-svelte](./exo-with-svelte) | Svelte 模板：popup、options、content、background + 简单消息通信 |
| [exo-with-solid](./exo-with-solid) | Solid 模板：popup、options、content、background + 简单消息通信 |
| [exo-with-react-shadcn](./exo-with-react-shadcn) | React + shadcn/ui：popup、options、content、background、sidepanel |
| [exo-with-devtools](./exo-with-devtools) | 纯原生 TS：background + devtools_page，无 React/Vue |
| [exo-with-firefox](./exo-with-firefox) | Firefox 模板：popup、content、background + 简单消息通信 |
| [exo-with-content-ui](./content-ui) | **Content UI**：使用 `@extenzo/utils` 的 `defineContentUI` / `mountContentUI` 在 content script 中注入 UI（支持 shadow/iframe） |
| [exo-with-content-ui-react](./content-ui-react) | **Content UI + React + Tailwind**：content script 使用 defineContentUI/mountContentUI 挂载 React + Tailwind 面板 |
| [exo-with-react-entry-false](./exo-with-react-entry-false) | React 模板（entry 关闭）：popup、options、content、background |
| [vue-jsx](./vue-jsx) | Vue 3 + JSX + Less：从 VideoRoll-Pro 迁移，多入口（popup/options/sidepanel/capture/download/player 等），extenzo 构建 |
| [exo-with-single-file](./exo-with-single-file) | 单文件入口模板：popup.html、options.html、background.ts、content.ts |
| [exo-with-newtab-override](./exo-with-newtab-override) | 内置页面覆盖示例：`newtab` 入口，自动填充 `chrome_url_overrides.newtab` |
| [exo-with-bookmarks-override](./exo-with-bookmarks-override) | 内置页面覆盖示例：`bookmarks` 入口，自动填充 `chrome_url_overrides.bookmarks` |
| [exo-with-history-override](./exo-with-history-override) | 内置页面覆盖示例：`history` 入口，自动填充 `chrome_url_overrides.history`（并自动补 `permissions.history`） |
| [exo-with-sandbox](./exo-with-sandbox) | 内置沙盒页面示例：`sandbox` 入口，自动填充 `sandbox.pages` |
| [exo-with-wxt](./exo-with-wxt) | **纯 WXT** 示例：使用 [WXT](https://wxt.dev/) 实现的扩展（不依赖 extenzo），含 popup、options、content、background |

除 **exo-with-wxt** 外，每个示例均有独立 `package.json` 与 `exo.config.ts`，在对应目录执行 `pnpm install` 与 `pnpm dev` / `pnpm build` 即可。exo-with-wxt 为纯 WXT 项目，使用 `wxt.config.ts`，同样在目录内执行 `pnpm install` 与 `pnpm dev` / `pnpm build`。

**当前 extenzo 配置要点**：`exo.config.ts` 使用 `defineConfig`；`manifest` 支持单对象或 chromium/firefox 分表；`plugins` 为 Rsbuild 插件数组（如 `[vue()]` / `[react()]`）；`entry` 可自定义入口路径；`rsbuildConfig` 用于覆盖/合并 Rsbuild 配置；根目录 `public/` 由框架自动复制到构建产物，无需单独配置 copy。
