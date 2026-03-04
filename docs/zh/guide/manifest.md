# Manifest

`manifest` 用于声明浏览器扩展的清单（Manifest），即最终写入构建产物目录的 `manifest.json` 内容。支持三种配置方式：**内联对象**、**按浏览器拆分的对象**、**文件路径**；也可**省略**，由框架从源码目录自动加载 manifest 文件。

## 类型与默认行为

- **类型**：`ManifestConfig | ManifestPathConfig | undefined`
- **默认**：不配置时，框架从 `appDir` 或 `appDir/manifest/` 自动查找并加载：
  - `manifest.json`（公共或单浏览器）
  - `manifest.chromium.json`（Chrome 覆盖）
  - `manifest.firefox.json`（Firefox 覆盖）
- 构建时根据 CLI 的 `-l chrome|edge|brave|vivaldi|opera|santa|firefox` 选择对应分支，与 base 深度合并后写入 `outputRoot/outDir/manifest.json`。

## 配置方式

### 1. 单一对象（Chrome / Firefox 共用）

所有字段写在一个对象里，构建时框架会按当前目标浏览器注入 `background`、`content_scripts`、`action`、`options_ui`、`side_panel`、`devtools_page` 等入口路径，其余字段原样输出。

```ts
// exo.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  manifest: {
    name: "我的扩展",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
    action: { default_popup: "popup/index.html" },
    background: { service_worker: "background/index.js" },
    content_scripts: [
      { matches: ["<all_urls>"], js: ["content/index.js"], run_at: "document_start" },
    ],
  },
});
```

入口路径由框架根据 [entry](/guide/entry/file-based.md) 与 [outDir](/guide/output) 自动计算。

### 占位符：`[exo.content]`

在 `content_scripts` 中可使用占位符 **`[exo.content]`**，由框架在构建时替换为 content 入口的实际产出路径。

- **`js`**：可写 `js: ["[exo.content]"]`。框架会替换为所有 content 的 JS 产出列表。
- **`css`**：可写 `css: ["[exo.content]"]`。若解析得到的 `css` 数组为空，该条 `content_scripts` 的 **`css`** 字段会被移除。

### 2. 按浏览器拆分（chromium / firefox）

```ts
manifest: {
  chromium: { ... },
  firefox: { ... },
}
```

### 3. 路径配置（相对于 appDir）

```ts
manifest: {
  chromium: "manifest/manifest.chromium.json",
  firefox: "manifest/manifest.firefox.json",
}
```

### 4. 省略（自动加载）

不写 `manifest` 时，框架在 `appDir` 下查找 `manifest.json`、`manifest.chromium.json`、`manifest.firefox.json` 等。

## 相关配置

- [entry](/guide/entry/file-based.md)、[appDir](/guide/app-dir)、[output](/guide/output)。
