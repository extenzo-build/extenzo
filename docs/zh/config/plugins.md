# plugins

`plugins` 为 **Rsbuild 插件数组**，与 Vite 类似，使用函数调用形式，例如 `plugins: [vue()]`、`plugins: [pluginReact()]`。用于接入 Vue（`@extenzo/plugin-vue`）、React（`@rsbuild/plugin-react`）或其它 Rsbuild 插件。

## 类型与默认值

- **类型**：`RsbuildConfig["plugins"]`（即 Rsbuild 的 plugins 数组）
- **默认**：不写时仅使用框架内置插件（见下文），不包含 Vue/React；使用 Vue 或 React 时**必须**在 plugins 中显式添加对应插件。

## 框架内置插件（自动注入，无需声明）

以下插件由 **@extenzo/cli** 在流水线中自动注入，用户**无需**也不应在 config 中声明：

| 插件 | 作用 |
|------|------|
| **plugin-entry** | 根据 [entry](/config/entry) 与 [srcDir](/config/src-dir) 解析入口，设置 Rsbuild 的 entry、HTML 模板、output 路径、public 复制等 |
| **plugin-extension** | 构建结束后将解析好的 [manifest](/config/manifest) 写入产物目录的 `manifest.json`（按 `-b` 选择 chromium/firefox） |
| **plugin-hmr** | 开发模式下启动 WebSocket 与浏览器重载（仅 dev 时注入） |

## 用户插件：Vue / React

在 **plugins** 中声明框架提供的 Vue 或 React 插件即可启用对应框架支持：

```ts
// ext.config.ts
import { defineConfig } from "extenzo";
import vue from "@extenzo/plugin-vue";
// 或 React：
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [vue()],
  // 或 plugins: [pluginReact()],
});
```

- **@extenzo/plugin-vue**：为 Vue 单文件组件、Vue 运行时等提供 Rsbuild 支持。
- **@rsbuild/plugin-react**：为 React、JSX/TSX 提供 Rsbuild 支持，直接使用即可。

## 与 Rsbuild 插件混用

可同时使用 Rsbuild 官方或社区插件（如 Less、Sass）：

```ts
// ext.config.ts
import { defineConfig } from "extenzo";
import vue from "@extenzo/plugin-vue";
import { pluginLess } from "@rsbuild/plugin-less";

export default defineConfig({
  plugins: [vue(), pluginLess()],
});
```

## 插件顺序

框架会按以下顺序组装最终 Rsbuild 插件列表：

1. **plugin-entry**（框架注入）
2. **用户 plugins**（含 Vue/React 展开后的子插件）
3. **plugin-extension**（框架注入）

因此无需也不应手动添加 plugin-entry、plugin-extension、plugin-hmr。

## 单插件写法

即使只配置一个插件，也需写成数组形式：

```ts
export default defineConfig({
  plugins: [react()],
});
```

## 相关配置

- [rsbuildConfig](/config/rsbuild-config)：若需追加或覆盖 Rsbuild 配置（如 alias、define、额外插件），可使用 rsbuildConfig 对象或函数。
- [entry](/config/entry)、[manifest](/config/manifest)：由 plugin-entry、plugin-extension 消费。
