# 构建产物

构建产物的完整路径为 **`outputRoot/outDir`**，默认即 **`.extenzo/dist`**。所有入口的 JS、CSS、HTML 以及生成的 `manifest.json` 均输出在此目录。

## 配置项

| 配置 | 类型 | 默认 | 说明 |
|------|------|------|------|
| **outputRoot** | `string \| undefined` | `".extenzo"` | 产物父目录。设为 `.extenzo` 可避免与根目录 `dist` 等工具冲突。 |
| **outDir** | `string \| undefined` | `"dist"` | 产物目录名，位于 outputRoot 下。 |

**实际路径**：`path.resolve(root, outputRoot, outDir)`，例如默认 `<项目根>/.extenzo/dist`。

## 作用

- `extenzo dev` 时，浏览器加载的扩展目录即此路径。
- `extenzo build` 时，若开启 [zip](/guide/zip)，会在 outputRoot 下生成 `outDir.zip`（如 `dist.zip`）。

## 示例

### 使用默认

```ts
// 产物在 .extenzo/dist
export default defineConfig({});
```

### 自定义目录名

```ts
export default defineConfig({
  outputRoot: ".extenzo",
  outDir: "build",
  // 产物在 .extenzo/build
});
```

## 相关配置

- [zip](/guide/zip)：为 `true` 时在 outputRoot 下生成 `outDir.zip`。
- [Report](/config/report)：使用 `extenzo build -r` 或 `report: true` 时，在 `outputRoot/report` 下生成 Rsdoctor 构建报告。
