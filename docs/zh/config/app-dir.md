# appDir

`appDir` 用于指定**应用目录**，默认 `app/`。它既是 [entry](/config/entry) 的 **baseDir**，也是 manifest 自动加载的根目录。

## 类型与默认值

- **类型**：`string | undefined`
- **默认**：`"app"`（框架约定）
- **解析**：框架会解析为绝对路径，例如 `appDir: "src"` → `path.resolve(root, "src")`。

## 作用

1. **entry 的 baseDir**  
   所有 [entry](/config/entry) 路径均**相对于 appDir**。例如 `appDir: "src"` 与 `entry: { popup: "popup/index.ts" }` → `src/popup/index.ts`。

2. **入口发现**  
   当未配置 [entry](/config/entry) 时，框架会在 appDir 下按目录名发现 `background`、`content`、`popup`、`options`、`sidepanel`、`devtools` 等入口。

3. **manifest 自动加载**  
   当未在配置中设置 [manifest](/config/manifest) 时，框架会依次查找：
   - `appDir/manifest.json`、`appDir/manifest.chromium.json`、`appDir/manifest.firefox.json`
   - `appDir/manifest/manifest.json` 等

## 示例

### 源码在 `src/`

```ts
// exo.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  appDir: "src",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.ts",
    options: "options/index.ts",
  },
});
```

### 使用默认 `app/`

```ts
export default defineConfig({
  // appDir 省略 → "app"
  entry: { background: "background/index.ts", popup: "popup/index.ts" },
});
```

## 相关配置

- [entry](/config/entry)、[manifest](/config/manifest)：路径与自动加载均相对于 appDir。
