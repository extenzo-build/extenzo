# srcDir

`srcDir` 指定**源码目录**，默认为项目根目录（`"."`）。它同时作为 **entry 路径的解析起点（baseDir）** 以及 **manifest 自动加载的根目录**。

## 类型与默认值

- **类型**：`string | undefined`
- **默认值**：`"."`（即项目根目录）
- **解析**：框架会将 `srcDir` 解析为相对于项目根的绝对路径，例如 `srcDir: "src"` → `path.resolve(root, "src")`。

## 作用

1. **entry 的 baseDir**  
   所有 [entry](/config/entry) 中的路径均为**相对于 srcDir**。例如 `srcDir: "src"` 且 `entry: { popup: "popup/index.ts" }` 时，实际入口为 `src/popup/index.ts`。

2. **入口发现**  
   未配置 [entry](/config/entry) 时，框架在 srcDir 下按目录名发现 `background`、`content`、`popup`、`options`、`sidepanel`、`devtools`。

3. **manifest 自动加载**  
   未在 config 中写 [manifest](/config/manifest) 时，框架从以下位置查找 manifest 文件：
   - `srcDir/manifest.json`、`srcDir/manifest.chromium.json`、`srcDir/manifest.firefox.json`
   - `srcDir/manifest/manifest.json`、`srcDir/manifest/manifest.chromium.json`、`srcDir/manifest/manifest.firefox.json`

## 示例

### 源码放在 src 目录

```ts
// ext.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  srcDir: "src",
  // entry 路径均相对于 src
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.ts",
    options: "options/index.ts",
  },
});
```

目录结构：

```
project/
  ext.config.ts
  src/
    background/index.ts
    content/index.ts
    popup/index.html
    popup/index.ts
    options/index.html
    options/index.ts
    manifest.json
```

### 根目录即源码（默认）

```ts
// ext.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  // srcDir 不写，默认为 "."
  // entry 路径相对于项目根
  entry: {
    background: "background/index.ts",
    popup: "popup/index.ts",
  },
});
```

## 相关配置

- [entry](/config/entry)：入口路径相对于 srcDir。
- [manifest](/config/manifest)：路径形式的 manifest 与自动加载均相对于 srcDir。
