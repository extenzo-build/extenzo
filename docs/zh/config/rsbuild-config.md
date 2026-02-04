# rsbuildConfig

`rsbuildConfig` 用于**覆盖或扩展 Rsbuild 配置**（类似 Vite 的 `build.rollupOptions`、`esbuild` 等），支持**对象**与**函数**两种形式。对象形式会与框架生成的 base 配置做**深度合并**；函数形式可完全控制最终配置，并可使用 `helpers.merge` 做深度合并。

## 类型与默认值

- **类型**：`RsbuildConfig | ((base: RsbuildConfig, helpers?: RsbuildConfigHelpers) => RsbuildConfig | Promise<RsbuildConfig>) | undefined`
- **默认**：不写时仅使用框架生成的 base 配置（entry、HTML、output、manifest 写入等均由内置插件设置）。

## 对象形式：深度合并

传入对象时，会与框架 base 配置**深度合并**。适合追加或覆盖部分字段（如 `source.define`、`resolve.alias`），而无需关心 base 结构。

```ts
// ext.config.ts
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

适合需要根据环境、异步逻辑或复杂条件生成配置的场景。

```ts
// ext.config.ts
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

异步示例：

```ts
export default defineConfig({
  async rsbuildConfig(base, helpers) {
    const overrides = await loadSomeConfig();
    return helpers!.merge(base, overrides);
  },
});
```

## 常见用法

| 需求 | 示例 |
|------|------|
| **define 注入** | `rsbuildConfig: { source: { define: { __BUILD_TIME__: JSON.stringify(Date.now()) } } }` |
| **路径别名** | `rsbuildConfig: { resolve: { alias: { "@": "/src" } } }` |
| **额外 Rsbuild 插件** | 在函数形式中 `base.plugins = [...(base.plugins ?? []), myPlugin()]` 或通过 merge 合并 |
| **修改 output** | 建议在函数形式中基于 base 合并，避免覆盖框架设置的 `distPath`、`assetPrefix` 等 |

## 注意事项

- 框架已设置 `output.distPath`、`output.cleanDistPath`、`output.assetPrefix`、各入口的 output 文件名等，若在 rsbuildConfig 中覆盖 `output`，可能导致产物路径与 [manifest](/config/manifest) 中写入的路径不一致，建议只做增量合并。
- 与 [hooks](/config/hooks) 的 `beforeRsbuildConfig`、`beforeBuild` 区别：hooks 可修改 `ctx.rsbuildConfig`，在流水线中生效；rsbuildConfig 在配置解析阶段与 base 合并，更适用于静态或异步的配置扩展。

## 已废弃：rsbuild

`rsbuild`（函数形式）已废弃，请使用 **rsbuildConfig** 函数形式替代。若项目中仍有 `rsbuild(base, helpers) => ...`，请改为 `rsbuildConfig(base, helpers) => ...`。

## 相关配置

- [plugins](/config/plugins)：Rsbuild 插件数组，与 rsbuildConfig 中追加的插件会一起生效。
- [hooks](/config/hooks)：若需在流水线阶段动态修改 Rsbuild 配置，可使用 `beforeRsbuildConfig` 或 `beforeBuild` 修改 `ctx.rsbuildConfig`。
