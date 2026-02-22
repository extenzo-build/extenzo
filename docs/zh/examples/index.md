# 示例

本页列出 extenzo 仓库中的扩展示例，每个示例均为独立目录，含 `package.json` 与 `exo.config.ts`，可在对应目录执行 `pnpm install` 后使用 `pnpm dev` / `pnpm build` 运行或构建。

| 示例 | 描述 | 仓库链接 |
|------|------|----------|
| **vue-template** | Vue 3 模板：popup、options、content、background，含简单消息通信。 | [examples/vue-template](https://github.com/extenzo-build/extenzo/tree/main/examples/vue-template) |
| **react-template** | React 模板：popup、options、content、background，含简单消息通信。 | [examples/react-template](https://github.com/extenzo-build/extenzo/tree/main/examples/react-template) |
| **react-shadcn** | React + shadcn/ui：popup、options、content、background、sidepanel 五入口，Tailwind + 组件库。 | [examples/react-shadcn](https://github.com/extenzo-build/extenzo/tree/main/examples/react-shadcn) |
| **devtools-native-ts** | 纯原生 TypeScript：仅 background + devtools_page，无 React/Vue，演示 DevTools 扩展。 | [examples/devtools-native-ts](https://github.com/extenzo-build/extenzo/tree/main/examples/devtools-native-ts) |

## 运行方式

在 extenzo 仓库根目录执行 `pnpm install` 后，进入任意示例目录：

```bash
cd examples/vue-template   # 或其他示例
pnpm dev                  # 开发模式
pnpm build                # 构建
```

构建产物在 `.extenzo/dist`（或该示例配置的 outputRoot/outDir），在浏览器中加载该目录即可；使用 `pnpm dev` 时框架可自动打开浏览器并加载扩展。
