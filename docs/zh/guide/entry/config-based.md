# 基于配置

在 `exo.config.ts` 中通过 **`entry`** 字段显式指定入口时，可以自定义路径、覆盖自动发现的结果，并添加**自定义入口**（如 `capture`、`offscreen` 等）。配置中的入口会覆盖同名自动发现；未在 `entry` 中列出的入口仍由 [基于文件](/guide/entry/file-based) 的规则自动发现。

与基于文件一致：**构建基于 Rsbuild，入口一定是 JS/TS**；HTML 由 Rsbuild 自动生成，若使用自定义 HTML 模板，**必须**在该 HTML 中通过 `data-extenzo-entry` 标明入口脚本。

---

## 配置写法

`entry` 是一个对象：**键 = 入口名**，**值 = 路径或带选项的对象**。

### 1. 字符串路径（推荐）

值为**相对于 baseDir（默认 `app/`）的路径**。

| 值类型 | 含义 | 示例 |
|--------|------|------|
| 脚本路径 `.js/.ts/.jsx/.tsx` | 以该脚本为入口；若为需要 HTML 的内置入口（popup/options 等），Rsbuild 会自动生成 HTML，或使用同目录下的 `index.html` 作为模板（此时模板内**必须**有 `data-extenzo-entry`） | `"popup/index.ts"` |
| HTML 路径 `.html` | 以该 HTML 为页面模板；框架**必须**从 HTML 内的 `data-extenzo-entry` 解析出入口脚本 | `"popup/index.html"` |

### 2. 对象形式：`{ src, html? }`

更细粒度控制：必填 `src`（脚本路径），可选 `html`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `src` | `string` | 入口脚本路径（相对 baseDir） |
| `html` | `boolean \| string` | 不填：内置 HTML 入口自动生成/使用模板；`true`：生成 HTML 无模板；`false`：仅脚本；`string`：指定 HTML 模板路径 |

---

## 内置入口与默认输出路径

在**未**通过 `entry` 覆盖、且使用默认「目录形式」发现时，内置入口对应的**默认输出路径**如下（相对 `outDir`，默认 `dist`）：

| 入口名 | 类型 | 默认输出（脚本） | 默认输出（HTML） |
|--------|------|------------------|------------------|
| `background` | 仅脚本 | `background/index.js` | — |
| `content` | 仅脚本 | `content/index.js` | — |
| `popup` | 脚本+HTML | `popup/index.js` | `popup/index.html` |
| `options` | 脚本+HTML | `options/index.js` | `options/index.html` |
| `sidepanel` | 脚本+HTML | `sidepanel/index.js` | `sidepanel/index.html` |
| `devtools` | 脚本+HTML | `devtools/index.js` | `devtools/index.html` |
| `offscreen` | 脚本+HTML | `offscreen/index.js` | `offscreen/index.html` |

在 manifest 中，框架会用上述路径（如 `popup/index.html`）填入 `action.default_popup`、`options_page` 等字段。

---

## 自定义入口

除上述内置名外，你可以在 `entry` 中增加任意名称（如 `capture`、`my-page`），用于扩展插件的自定义页面（例如 `chrome-extension://<id>/capture/index.html`）。

- **仅脚本**：`entry: { capture: "capture/index.ts" }` 且该入口名不在“需要 HTML”的内置列表中时，若需产出 HTML，需写成 `{ src: "capture/index.ts", html: true }`。
- **脚本 + HTML**：`entry: { capture: { src: "capture/index.ts", html: true } }` 或提供模板路径 `html: "capture/index.html"`。

**输出路径规则（简述）：**

- 使用默认命名（如 `capture/index.ts`）时，输出一般为 `dist/capture/index.js` 和（若需 HTML）`dist/capture/index.html`。
- 若通过 HTML 的 `data-extenzo-entry` 指向子路径脚本（如 `scripts/main.ts`），输出会**跟随该脚本路径**（如 `dist/capture/scripts/main.js`）。

---

## 配置示例

### 仅覆盖部分入口（其余仍自动发现）

```ts
// exo.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  appDir: "app",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.ts",
    options: "options/index.ts",
  },
});
```

未在 `entry` 中列出的 `sidepanel`、`devtools` 等仍按 [基于文件](/guide/entry/file-based) 的规则在 `app/` 下自动发现。

### 自定义入口 + 指定 HTML

```ts
export default defineConfig({
  appDir: "src",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.ts",
    options: "options/index.ts",
    sidepanel: "sidepanel/index.ts",
    capture: "capture/index.ts",           // 自定义页面，需再配 html 或同目录 index.html
    offscreen: { src: "offscreen/index.ts", html: true },
  },
});
```

### 使用不同 appDir 时的路径

`entry` 中所有路径均**相对 baseDir**，baseDir 由 [appDir](/guide/app-dir) 决定（默认 `app`）。例如 `appDir: "src"` 时，`popup: "popup/index.ts"` 表示 `src/popup/index.ts`。

---

## 入口与输出结构速查（基于配置时）

| 配置写法 | 入口脚本位置（示例 appDir=app） | 典型输出（outDir=dist） |
|----------|--------------------------------|--------------------------|
| `background: "background/index.ts"` | `app/background/index.ts` | `dist/background/index.js` |
| `content: "content.ts"` | `app/content.ts` | `dist/content.js` |
| `popup: "popup/index.ts"` | `app/popup/index.ts` | `dist/popup/index.html` + `dist/popup/index.js` |
| `capture: { src: "capture/index.ts", html: true }` | `app/capture/index.ts` | `dist/capture/index.html` + `dist/capture/index.js` |

---

## 相关链接

- [基于文件](/guide/entry/file-based)：不配置 `entry` 时的自动发现规则与目录/文件名约定。
- [appDir](/guide/app-dir)：baseDir 与入口解析起点。
- [manifest](/guide/manifest)：manifest 中路径如何由入口与 [outDir](/guide/output) 自动填入。
