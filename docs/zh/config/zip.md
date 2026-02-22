# zip

`zip` 控制在执行 `extenzo build` 时是否将构建产物目录打包成 zip 文件（便于提交商店或分发）。仅对 **build** 命令生效，**dev** 命令不会生成 zip。

## 类型与默认值

- **类型**：`boolean | undefined`
- **默认值**：`true`（即默认会打包）
- **为 `false`**：仅输出目录，不生成 zip 文件。

## 行为说明

- **为 `true` 或省略**：构建完成后，在 [outputRoot](/config/output-root) 下生成 `{outDir}.zip`，例如默认情况下为 `.extenzo/dist.zip`，内容为 [outDir](/config/out-dir) 目录下的全部文件。
- **为 `false`**：只保留 `outputRoot/outDir` 目录，不生成 zip。

## 示例

### 默认开启 zip（无需配置）

```ts
// exo.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  outDir: "dist",
  outputRoot: ".extenzo",
  // zip 不写或为 true：extenzo build 后在 .extenzo 下生成 dist.zip
});
```

### 关闭 zip（仅输出目录）

```ts
// exo.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  zip: false,
  // extenzo build 后仅产出 .extenzo/dist，不生成 dist.zip
});
```

### 自定义 outDir 时的 zip 文件名

zip 文件名与 `outDir` 一致。例如 `outDir: "build"` 时，生成的 zip 为 `build.zip`，位置仍在 outputRoot 下。

```ts
export default defineConfig({
  outputRoot: ".extenzo",
  outDir: "build",
  zip: true,
  // 生成 .extenzo/build.zip
});
```

## 相关配置

- [outDir](/config/out-dir)：决定 zip 内目录名与 zip 文件名（`outDir.zip`）。
- [outputRoot](/config/output-root)：zip 文件所在目录。
