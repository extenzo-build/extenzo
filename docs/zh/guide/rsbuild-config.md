# Rsbuild 配置（rsbuildConfig）

`rsbuildConfig` 用于**覆盖或扩展 Rsbuild 配置**，支持**对象**与**函数**两种形式。对象形式会与框架生成的 base 配置做**深度合并**；函数形式可完全控制最终配置，并可使用 `helpers.merge` 做深度合并。

## 类型与默认值

- **类型**：`RsbuildConfig | ((base, helpers?) => RsbuildConfig | Promise<RsbuildConfig>) | undefined`
- **默认**：不写时仅使用框架生成的 base 配置。

## 对象形式：深度合并

传入对象时，会与框架 base 配置**深度合并**。适合追加或覆盖部分字段（如 `source.define`、`resolve.alias`）。

```ts
// exo.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  rsbuildConfig: {
    source: {
      define: { __APP_NAME__: JSON.stringify("my-ext") },
    },
    resolve: {
      alias: { "@": "/src" },
    },
  },
});
```

## 函数形式：完全控制

传入函数时，会收到 `(base, helpers)`：
- **base**：框架已生成的 Rsbuild 配置。
- **helpers.merge(base, overrides)**：将 overrides 与 base 深度合并，返回新配置。

```ts
// exo.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  rsbuildConfig(base, helpers) {
    return helpers!.merge(base, {
      source: {
        define: { __ENV__: JSON.stringify(process.env.NODE_ENV) },
      },
    });
  },
});
```

## 常见用法

| 需求 | 示例 |
|------|------|
| **define 注入** | `rsbuildConfig: { source: { define: { __BUILD_TIME__: JSON.stringify(Date.now()) } } }` |
| **路径别名** | `rsbuildConfig: { resolve: { alias: { "@": "/src" } } }` |
| **额外 Rsbuild 插件** | 在函数形式中 `base.plugins = [...(base.plugins ?? []), myPlugin()]` |

## 相关配置

- [框架支持](/guide/framework/vue)：plugins 中使用的 Vue/React 等与 rsbuildConfig 会一起生效。
- [hooks](/guide/rsbuild-config)：若需在流水线阶段动态修改配置，可使用 `beforeRsbuildConfig` 等钩子。
