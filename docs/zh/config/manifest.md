# manifest

`manifest` 用于声明浏览器扩展的清单（Manifest），即最终写入构建产物目录的 `manifest.json` 内容。支持三种配置方式：**内联对象**、**按浏览器拆分的对象**、**文件路径**；也可**省略**，由框架从源码目录自动加载 manifest 文件。

## 类型与默认行为

- **类型**：`ManifestConfig | ManifestPathConfig | undefined`
- **默认**：不配置时，框架从 `srcDir` 或 `srcDir/manifest/` 自动查找并加载：
  - `manifest.json`（公共或单浏览器）
  - `manifest.chromium.json`（Chrome 覆盖）
  - `manifest.firefox.json`（Firefox 覆盖）
- 构建时根据 CLI 的 `-b chrome` / `-b firefox` 选择对应分支，与 base 深度合并后写入 `outputRoot/outDir/manifest.json`。

## 配置方式

### 1. 单一对象（Chrome / Firefox 共用）

所有字段写在一个对象里，构建时框架会按当前目标浏览器注入 `background`、`content_scripts`、`action`、`options_ui`、`side_panel`、`devtools_page` 等入口路径，其余字段原样输出。

```ts
// ext.config.ts
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

入口路径（如 `popup/index.html`、`background/index.js`）由框架根据 [entry](/config/entry) 与 [outDir](/config/out-dir) 自动计算，你只需保证 manifest 中这些键存在；若需自定义键名，可参考 [extenzo 导出的 MANIFEST_ENTRY_PATHS](https://github.com/extenzo-build/extenzo/blob/main/packages/core/src/constants.ts)。

### 2. 按浏览器拆分（chromium / firefox）

Chrome 与 Firefox 的 manifest 存在差异时（如 Chrome 用 `action`、Firefox 用 `sidebar_action`，或 background 的 `service_worker` vs `scripts`），可使用 `chromium` 与 `firefox` 两个分支。框架会按当前 `-b` 选择对应分支，与 base 深度合并。

```ts
// ext.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  manifest: {
    chromium: {
      name: "My Ext",
      manifest_version: 3,
      action: { default_popup: "popup/index.html" },
      background: { service_worker: "background/index.js" },
      content_scripts: [{ matches: ["<all_urls>"], js: ["content/index.js"] }],
    },
    firefox: {
      name: "My Ext",
      manifest_version: 2,
      sidebar_action: { default_panel: "sidepanel/index.html" },
      background: { scripts: ["background/index.js"] },
      content_scripts: [{ matches: ["<all_urls>"], js: ["content/index.js"] }],
    },
  },
});
```

### 3. 路径配置（相对于 srcDir）

若希望 manifest 内容由外部 JSON 文件维护，可指定文件路径。路径**相对于 [srcDir](/config/src-dir)**。

```ts
// ext.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  srcDir: "src",
  manifest: {
    chromium: "manifest/manifest.chromium.json",
    firefox: "manifest/manifest.firefox.json",
  },
});
```

目录结构示例：

```
src/
  manifest/
    manifest.chromium.json
    manifest.firefox.json
```

### 4. 省略（自动加载）

不写 `manifest` 时，框架按以下顺序查找：

1. `srcDir/manifest.json`、`srcDir/manifest.chromium.json`、`srcDir/manifest.firefox.json`
2. `srcDir/manifest/manifest.json`、`srcDir/manifest/manifest.chromium.json`、`srcDir/manifest/manifest.firefox.json`

找到任意一个即用其作为 base，再与同目录下的 chromium/firefox 文件做深度合并。

## 优先级总结

| 配置方式           | 说明 |
|--------------------|------|
| config 中 manifest 对象或路径 | 最高优先级 |
| srcDir 根目录下的 manifest*.json | 次之 |
| srcDir/manifest/ 下的 manifest*.json | 再次 |

## 相关配置

- [entry](/config/entry)：entry 与各入口文件决定 manifest 中 `background`、`content_scripts`、`action` 等路径。
- [srcDir](/config/src-dir)：源码目录；路径形式的 manifest 与自动加载均相对于 srcDir。
- [outDir](/config/out-dir)、[outputRoot](/config/output-root)：构建产物目录，最终 `manifest.json` 写在此处。
