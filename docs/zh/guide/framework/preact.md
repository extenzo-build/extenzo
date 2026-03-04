# Preact

在 `exo.config.ts` 的 **plugins** 中接入 `@rsbuild/plugin-preact` 即可启用 Preact 与 JSX/TSX 支持。

## 安装与配置

```bash
pnpm add preact @rsbuild/plugin-preact -D
```

```ts
// exo.config.ts
import { defineConfig } from "extenzo";
import { pluginPreact } from "@rsbuild/plugin-preact";

export default defineConfig({
  plugins: [pluginPreact()],
});
```

## 说明

- **@rsbuild/plugin-preact**：为 Preact 提供 Rsbuild 支持，集成 JSX 编译与 React 别名（可选）。
- 与 Vue、React、Svelte、Solid 等互斥，与 Less/Sass 等可混用。

## 相关

- [2. 基础](/guide/manifest)：manifest、[entry](/guide/entry) 等配置与框架无关。
