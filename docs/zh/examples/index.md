# 示例

本页列出 extenzo 仓库中的扩展示例，每个示例均为独立目录，含 `package.json` 与 `exo.config.ts`，可在对应目录执行 `pnpm install` 后使用 `pnpm dev` / `pnpm build` 运行或构建。

| 示例 | 描述 | 仓库链接 |
|------|------|----------|
| **exo-with-vue** | Vue 3 模板：popup、options、content、background，含简单消息通信。 | [examples/exo-with-vue](https://github.com/extenzo-build/extenzo/tree/main/examples/exo-with-vue) |
| **exo-with-react** | React 模板：popup、options、content、background，含简单消息通信。 | [examples/exo-with-react](https://github.com/extenzo-build/extenzo/tree/main/examples/exo-with-react) |
| **exo-with-preact** | Preact 模板：popup、options、content、background，含简单消息通信。 | [examples/exo-with-preact](https://github.com/extenzo-build/extenzo/tree/main/examples/exo-with-preact) |
| **exo-with-svelte** | Svelte 模板：popup、options、content、background，含简单消息通信。 | [examples/exo-with-svelte](https://github.com/extenzo-build/extenzo/tree/main/examples/exo-with-svelte) |
| **exo-with-solid** | Solid 模板：popup、options、content、background，含简单消息通信。 | [examples/exo-with-solid](https://github.com/extenzo-build/extenzo/tree/main/examples/exo-with-solid) |
| **exo-with-uno** | React + UnoCSS：popup、options、content、background，通过 PostCSS 使用原子化 CSS。 | [examples/exo-with-uno](https://github.com/extenzo-build/extenzo/tree/main/examples/exo-with-uno) |
| **exo-with-react-shadcn** | React + shadcn/ui：popup、options、content、background、sidepanel 五入口，Tailwind + 组件库。 | [examples/exo-with-react-shadcn](https://github.com/extenzo-build/extenzo/tree/main/examples/exo-with-react-shadcn) |
| **exo-with-devtools** | 纯原生 TypeScript：仅 background + devtools_page，无 React/Vue，演示 DevTools 扩展。 | [examples/exo-with-devtools](https://github.com/extenzo-build/extenzo/tree/main/examples/exo-with-devtools) |

## 运行方式

在 extenzo 仓库根目录执行 `pnpm install` 后，进入任意示例目录：

```bash
cd examples/exo-with-vue   # 或其他示例
pnpm dev                   # 开发模式
pnpm build                 # 构建
```

构建产物在 `.extenzo/dist`（或该示例配置的 outputRoot/outDir），在浏览器中加载该目录即可；使用 `pnpm dev` 时框架可自动打开浏览器并加载扩展。
