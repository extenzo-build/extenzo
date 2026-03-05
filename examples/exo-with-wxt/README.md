# exo-with-wxt

基于 [WXT](https://wxt.dev/) 的浏览器插件示例，与 `exo-with-react` 功能对齐：popup、options、content script、background + 消息通信，使用 React 构建 UI。

## 脚本

- **`pnpm dev`** — 开发模式（带 HMR）
- **`pnpm build`** — 生产构建，**同时生成产物分析报告**
- **`pnpm zip`** — 打包为 zip

## 产物分析

构建时默认启用 `analysis`，报告输出到：

- **`.output/report/stats.html`** — 在浏览器中打开可查看 bundle 体积与模块分布

也可在构建时使用 `--analyze-open` 在构建完成后自动打开报告：

```bash
pnpm exec wxt build --analyze-open
```

## 与 exo-with-react 的对应关系

| exo-with-react     | exo-with-wxt        |
|--------------------|---------------------|
| `extenzo dev`      | `wxt` (dev)         |
| `extenzo build -r` | `wxt build`（内置 analyze） |
| `app/` 入口        | `entrypoints/`      |
| `exo.config.ts`    | `wxt.config.ts`     |
| 输出 `.extenzo/dist` | 输出 `.output/`   |

## 依赖

- [wxt](https://wxt.dev/) — 插件框架（基于 Vite）
- React 18 + webextension-polyfill
- TypeScript
