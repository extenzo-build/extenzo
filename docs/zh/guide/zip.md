# Zip 文件

`zip` 控制在执行 `extenzo build` 时是否将构建产物目录打包成 zip 文件（便于提交商店或分发）。仅对 **build** 命令生效，**dev** 命令不会生成 zip。

## 类型与默认值

- **类型**：`boolean | undefined`
- **默认值**：`true`（即默认会打包）
- **为 `false`**：仅输出目录，不生成 zip 文件。

## 行为说明

- **为 `true` 或省略**：构建完成后，在 [outputRoot](/guide/output) 下生成 `{outDir}.zip`，例如默认情况下为 `.extenzo/dist.zip`，内容为 [output](/guide/output) 目录下的全部文件。
- **为 `false`**：只保留 `outputRoot/outDir` 目录，不生成 zip。

## 示例

### 默认开启 zip（无需配置）

```ts
export default defineConfig({
  outDir: "dist",
  outputRoot: ".extenzo",
  // zip 不写或为 true：extenzo build 后在 .extenzo 下生成 dist.zip
});
```

### 关闭 zip

```ts
export default defineConfig({
  zip: false,
  // extenzo build 后仅产出 .extenzo/dist，不生成 dist.zip
});
```

## 相关配置

- [构建产物](/guide/output)：outDir 决定 zip 内目录名与 zip 文件名（`outDir.zip`）。
