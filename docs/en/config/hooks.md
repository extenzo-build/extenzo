# hooks

`hooks` lets you run custom logic at **pipeline stages**. Each hook receives **PipelineContext** (`root`, `command`, `browser`, `config`, `entries`, `rsbuildConfig`, `isDev`, `distPath`, etc.) and can read or modify it (e.g. `ctx.rsbuildConfig`). Hooks can be sync or async (`Promise<void>`); the framework waits for completion before the next stage.

## Type

- **Type**: `LifecycleHooks | undefined`
- **LifecycleHooks**:
  - `afterCliParsed?: (ctx: PipelineContext) => void | Promise<void>`
  - `afterConfigLoaded?: (ctx: PipelineContext) => void | Promise<void>`
  - `beforeRsbuildConfig?: (ctx: PipelineContext) => void | Promise<void>`
  - `beforeBuild?: (ctx: PipelineContext) => void | Promise<void>`
  - `afterBuild?: (ctx: PipelineContext) => void | Promise<void>`

## Hooks and when they run

| Hook | When |
|------|------|
| **afterCliParsed** | After CLI args (command, `-b` browser) are parsed |
| **afterConfigLoaded** | After config is loaded and entries are resolved (baseEntries, entries ready) |
| **beforeRsbuildConfig** | After manifest and final entries are fixed, before Rsbuild config is generated/merged |
| **beforeBuild** | After Rsbuild config is ready, before build runs |
| **afterBuild** | After build completes; **only for `extenzo build`**; `extenzo dev` is watch mode and does not call afterBuild on each rebuild |

## PipelineContext

| Field | Description |
|-------|-------------|
| `root` | Project root absolute path |
| `command` | `"dev"` \| `"build"` |
| `browser` | `"chromium"` \| `"firefox"` |
| `config` | Resolved config (ExtenzoResolvedConfig) |
| `baseEntries` | Entries from discovery only (before entry config merge) |
| `entries` | Final entry list (discovery + entry config) |
| `rsbuildConfig` | Rsbuild config; can be modified in beforeRsbuildConfig / beforeBuild |
| `isDev` | Whether dev mode |
| `distPath` | Output directory absolute path (outputRoot/outDir) |

## Examples

### Basic

```ts
export default defineConfig({
  hooks: {
    afterCliParsed(ctx) {
      console.log("Command:", ctx.command, "Browser:", ctx.browser);
    },
    afterConfigLoaded(ctx) {
      console.log("Entries:", ctx.entries.map((e) => e.name));
    },
    beforeRsbuildConfig(ctx) {
      // modify ctx.rsbuildConfig
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

### Async (e.g. upload after build)

```ts
export default defineConfig({
  hooks: {
    async afterBuild(ctx) {
      if (ctx.command !== "build") return;
      await uploadToStore(ctx.distPath);
    },
  },
});
```

## Related

- [rsbuildConfig](/config/rsbuild-config): For extending Rsbuild config without pipeline stages.
