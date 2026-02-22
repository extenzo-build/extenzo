# outDir

`outDir` 指定**构建产物目录名**，该目录位于 [outputRoot](/config/output-root) 之下。实际完整输出路径为 `outputRoot/outDir`，默认即 `.extenzo/dist`。

## 类型与默认值

- **类型**：`string | undefined`
- **默认值**：`"dist"`
- **实际路径**：`path.resolve(root, outputRoot, outDir)`，例如默认情况下为 `<项目根>/.extenzo/dist`。

## 作用

- 所有入口的构建产物（JS、CSS、HTML）以及 [manifest](/config/manifest) 生成的 `manifest.json` 都输出在此目录下。
- `extenzo dev` 时，浏览器加载的扩展目录即此路径。
- `extenzo build` 时，若开启 [zip](/config/zip)，会在 [outputRoot](/config/output-root) 下生成 `outDir.zip`（如 `dist.zip`）。

## 示例

### 使用默认 outDir

```ts
// exo.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  // outDir 不写，默认为 "dist"
  // 产物在 .extenzo/dist
});
```

### 自定义目录名

```ts
// exo.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  outDir: "build",
  outputRoot: ".extenzo",
  // 产物在 .extenzo/build
});
```

### 按浏览器分目录（需配合脚本或 rsbuildConfig）

若希望 Chrome 与 Firefox 输出到不同子目录，可通过 [hooks](/config/hooks) 的 `beforeRsbuildConfig` 或 [rsbuildConfig](/config/rsbuild-config) 根据环境变量修改 `output.distPath`；默认框架只使用单一的 `outputRoot/outDir`。

## 相关配置

- [outputRoot](/config/output-root)：产物父目录，默认 `.extenzo`。
- [zip](/config/zip)：为 `true` 时在 outputRoot 下生成 `outDir.zip`。
