# 错误监控

开发时使用 `extenzo dev --debug`（或在配置中设置 `debug: true`）可启用**仅开发可用的错误监控**：按入口收集运行时错误，并通过 Monitor 面板展示，支持一键复制错误信息、Ask ChatGPT、Ask Cursor 及明暗主题切换。

## 启用方式

- **CLI**：`extenzo dev --debug` 或 `extenzo dev -d`
- **配置**：在 `exo.config.ts` 中设置 `debug: true`

```ts
// exo.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  debug: true,
  // ...
});
```

## 功能说明

- **按入口收集错误**：background、content、popup、options 等各入口的未捕获错误会汇总到 Monitor。
- **面板**：通过快捷键或 CLI 提示打开 Monitor 页面，可查看错误堆栈、复制为 prompt、跳转 Ask ChatGPT / Ask Cursor。
- **主题**：支持亮色/暗色切换。

## 注意

- 仅**开发模式**下生效，生产构建不会包含 Monitor。
- 由框架内置 **plugin-extension-monitor** 提供，无需在 `plugins` 中声明。
