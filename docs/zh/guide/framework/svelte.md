# Svelte

在 `exo.config.ts` 的 **plugins** 中接入 `@rsbuild/plugin-svelte` 即可启用 Svelte 组件（`.svelte` 文件）支持。

## 安装与配置

```bash
pnpm add svelte @rsbuild/plugin-svelte -D
```

```ts
// exo.config.ts
import { defineConfig } from "extenzo";
import { pluginSvelte } from "@rsbuild/plugin-svelte";

export default defineConfig({
  plugins: [pluginSvelte()],
});
```

## 说明

- **@rsbuild/plugin-svelte**：支持 `.svelte` 单文件组件，内部使用 svelte-loader。
- 与 Vue、React、Preact、Solid 等互斥，与 Less/Sass 等可混用。

## 相关

- [2. 基础](/guide/manifest)：manifest、[entry](/guide/entry) 等配置与框架无关。
