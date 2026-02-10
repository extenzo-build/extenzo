# extenzo 示例

本目录存放基于 extenzo 的浏览器扩展示例，用于参考与本地调试。

| 示例 | 说明 |
|------|------|
| [manual-install](./manual-install) | 手动安装示例：从 [VideoRoll-Pro](https://github.com/gxy5202/video-roll) 复制并改用 extenzo 构建与开发 |
| [vue-jsx](./vue-jsx) | Vue 3 + JSX + Less：从 VideoRoll-Pro 迁移，多入口（popup/options/sidepanel/capture/download/player 等），extenzo 构建 |
| [vue-template](./vue-template) | Vue 3 模板：popup、options、content、background + 简单消息通信 |
| [react-template](./react-template) | React 模板：popup、options、content、background + 简单消息通信 |
| [react-shadcn](./react-shadcn) | React + shadcn/ui：popup、options、content、background、sidepanel |
| [devtools-native-ts](./devtools-native-ts) | 纯原生 TS：background + devtools_page，无 React/Vue |
| [firefox-template](./firefox-template) | Firefox 模板：popup、content、background + 简单消息通信 |
| [content-ui](./content-ui) | **Content UI**：使用 `@extenzo/utils` 的 `defineContentUI` / `mountContentUI` 在 content script 中注入 UI（支持 shadow/iframe） |
| [content-ui-react](./content-ui-react) | **Content UI + React + Tailwind**：content script 使用 defineContentUI/mountContentUI 挂载 React + Tailwind 面板 |
| [single-file-template](./single-file-template) | 单文件入口模板：popup.html、options.html、background.ts、content.ts |
| [wxt-template](./wxt-template) | **纯 WXT** 示例：使用 [WXT](https://wxt.dev/) 实现的扩展（不依赖 extenzo），含 popup、options、content、background |

除 **wxt-template** 外，每个示例均有独立 `package.json` 与 `exo.config.ts`，在对应目录执行 `pnpm install` 与 `pnpm dev` / `pnpm build` 即可。wxt-template 为纯 WXT 项目，使用 `wxt.config.ts`，同样在目录内执行 `pnpm install` 与 `pnpm dev` / `pnpm build`。

**当前 extenzo 配置要点**：`exo.config.ts` 使用 `defineConfig`；`manifest` 支持单对象或 chromium/firefox 分表；`plugins` 为 Rsbuild 插件数组（如 `[vue()]` / `[react()]`）；`entry` 可自定义入口路径；`rsbuildConfig` 用于覆盖/合并 Rsbuild 配置；根目录 `public/` 由框架自动复制到构建产物，无需单独配置 copy。
