# Vue

在 `exo.config.ts` 的 **plugins** 中接入 `@extenzo/plugin-vue` 即可启用 Vue 3 支持（SFC、Vue 运行时等）。

## 安装与配置

```bash
pnpm add vue @extenzo/plugin-vue -D
```

```ts
// exo.config.ts
import { defineConfig } from "extenzo";
import vue from "@extenzo/plugin-vue";

export default defineConfig({
  plugins: [vue()],
});
```

## 说明

- **@extenzo/plugin-vue**：为 Vue 单文件组件、Vue 运行时等提供 Rsbuild 支持，内部使用 `@rsbuild/plugin-vue`、`@rsbuild/plugin-vue-jsx` 等。
- 与其它 Rsbuild 插件（如 Less、Sass）可混用，同写在 `plugins` 数组中即可。

## 相关

- [2. 基础](/guide/manifest)：manifest、[entry](/guide/entry) 等配置与框架无关，Vue 仅影响 popup/options/sidepanel 等入口的编译方式。
