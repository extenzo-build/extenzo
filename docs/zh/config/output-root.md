# outputRoot

`outputRoot` 指定**构建产物的父目录**，默认 `.extenzo`。实际完整输出路径为 `outputRoot/[outDir](/config/out-dir)`，即默认 `.extenzo/dist`。

## 类型与默认值

- **类型**：`string | undefined`
- **默认值**：`".extenzo"`
- **实际路径**：`path.resolve(root, outputRoot, outDir)`。

## 设计原因

将产物放在 `.extenzo/dist` 而非项目根下的 `dist`，可以避免与某些工具（如 Tailwind v4 等）扫描根目录时误把 `dist` 当作源码导致循环构建或多余监听。用户也可自定义为 `"output"`、`"build"` 等。

## 作用

- 与 [outDir](/config/out-dir) 共同决定构建产物的完整路径。
- [zip](/config/zip) 为 `true` 时，zip 文件生成在 outputRoot 下（如 `.extenzo/dist.zip`）。

## 示例

### 使用默认 outputRoot

```ts
// ext.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  // outputRoot 不写，默认为 ".extenzo"
  // outDir 默认 "dist"
  // 产物在 .extenzo/dist
});
```

### 自定义产物根目录

```ts
// ext.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  outputRoot: "output",
  outDir: "chrome",
  // 产物在 output/chrome
});
```

在浏览器中加载未打包扩展时，选择 `output/chrome` 目录即可。

## 相关配置

- [outDir](/config/out-dir)：产物目录名，位于 outputRoot 下。
- [zip](/config/zip)：打包 zip 时，zip 文件位于 outputRoot 下。
