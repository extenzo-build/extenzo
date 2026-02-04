# hooks

`hooks` 用于在**构建流水线各阶段**注入自定义逻辑。每个钩子都会收到 **PipelineContext**，包含 `root`、`command`、`browser`、`config`、`entries`、`rsbuildConfig`、`isDev`、`distPath` 等，可读取或修改上下文（如修改 `ctx.rsbuildConfig`）。钩子可为同步或异步函数（返回 `Promise<void>`），框架会等待完成后再进入下一阶段。

## 类型

- **类型**：`LifecycleHooks | undefined`
- **LifecycleHooks** 字段：
  - `afterCliParsed?: (ctx: PipelineContext) => void | Promise<void>`
  - `afterConfigLoaded?: (ctx: PipelineContext) => void | Promise<void>`
  - `beforeRsbuildConfig?: (ctx: PipelineContext) => void | Promise<void>`
  - `beforeBuild?: (ctx: PipelineContext) => void | Promise<void>`
  - `afterBuild?: (ctx: PipelineContext) => void | Promise<void>`

## 钩子列表与触发时机

| 钩子 | 触发时机 |
|------|----------|
| **afterCliParsed** | CLI 参数（command、`-b` 浏览器）解析完成后 |
| **afterConfigLoaded** | 配置加载完毕、入口解析完成（baseEntries、entries 已就绪）后 |
| **beforeRsbuildConfig** | manifest 与最终入口已确定，即将生成并合并 Rsbuild 配置前 |
| **beforeBuild** | Rsbuild 配置就绪，即将执行构建前 |
| **afterBuild** | 构建完成后；**仅对 `extenzo build`** 触发，`extenzo dev` 为 watch 模式不退出，不会在每次重编后触发 afterBuild |

## PipelineContext 字段说明

| 字段 | 说明 |
|------|------|
| `root` | 项目根目录绝对路径 |
| `command` | `"dev"` \| `"build"` |
| `browser` | `"chromium"` \| `"firefox"` |
| `config` | 解析后的完整配置（ExtenzoResolvedConfig） |
| `baseEntries` | 仅由目录发现得到的入口（未合并 entry 配置） |
| `entries` | 最终入口列表（发现 + entry 配置合并后） |
| `rsbuildConfig` | 即将传给 Rsbuild 的配置，可在 beforeRsbuildConfig / beforeBuild 中修改 |
| `isDev` | 是否为开发模式 |
| `distPath` | 输出目录绝对路径（outputRoot/outDir） |

## 示例

### 基础用法：打印与简单修改

```ts
// ext.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  hooks: {
    afterCliParsed(ctx) {
      console.log("Command:", ctx.command, "Browser:", ctx.browser);
    },
    afterConfigLoaded(ctx) {
      console.log("Entries:", ctx.entries.map((e) => e.name));
    },
    beforeRsbuildConfig(ctx) {
      // 可修改 ctx.rsbuildConfig，例如追加插件或修改 output
    },
    beforeBuild(ctx) {
      console.log("Building for", ctx.browser);
    },
    afterBuild(ctx) {
      console.log("Build done at", ctx.distPath);
    },
  },
});
```

### 异步钩子（如构建后上传）

```ts
// ext.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  hooks: {
    async afterBuild(ctx) {
      if (ctx.command !== "build") return;
      await uploadToStore(ctx.distPath);
    },
  },
});
```

### 在 beforeRsbuildConfig 中修改 Rsbuild 配置

```ts
import { defineConfig } from "extenzo";

export default defineConfig({
  hooks: {
    beforeRsbuildConfig(ctx) {
      ctx.rsbuildConfig.source = ctx.rsbuildConfig.source ?? {};
      ctx.rsbuildConfig.source.define = {
        ...ctx.rsbuildConfig.source.define,
        __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      };
    },
  },
});
```

## 相关配置

- [rsbuildConfig](/config/rsbuild-config)：若只需扩展 Rsbuild 配置而不依赖流水线阶段，可直接使用 rsbuildConfig 对象或函数。
