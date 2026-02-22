# entry

`entry` 用于自定义扩展的**入口映射**：键为入口名称，值为**相对于 baseDir** 的 JS/TS 脚本路径或结构化对象。不配置时，框架会从 [appDir](/config/app-dir)（默认 `app/`）下按目录名自动发现 `background`、`content`、`popup`、`options`、`sidepanel`、`devtools` 等入口。

## 类型与 baseDir

- **类型**：`Record<string, string | { src: string; html?: boolean | string }> | undefined`
- **baseDir**：未配置 [appDir](/config/app-dir) 时，baseDir = `app/`；配置了 `appDir` 时，baseDir = `appDir`。所有 entry 的 value 均为**相对于 baseDir** 的路径。

## 保留入口名（不可改）

以下名称由扩展规范与框架约定，不可用作其他含义：

| 入口名 | 类型 | 说明 |
|--------|------|------|
| `background` | 仅脚本 | Service Worker / 后台脚本 |
| `content` | 仅脚本 | Content Script |
| `popup` | 脚本 + HTML | 弹窗页面 |
| `options` | 脚本 + HTML | 选项页 |
| `sidepanel` | 脚本 + HTML | 侧边栏 |
| `devtools` | 脚本 + HTML | 开发者工具页 |

其余名称可作为**自定义入口**（如 `capture`、`offscreen`），只要目录下存在对应脚本即可。

## 路径规则

- **入口必须是 JS/TS**：真实入口只能是 `.js`、`.jsx`、`.ts`、`.tsx`。HTML 仅作为**模板**。
- **模板规则**：使用 HTML 模板时**不要在 HTML 中引入 CSS 或其它资源**，因为 HTML 不会被编译，只有 JS/TS 会编译。
- **唯一主入口**：HTML 模板中必须只有一个带 `data-extenzo-entry` 的 `<script>` 入口，例如：
  - `<script type="module" src="./main.ts" data-extenzo-entry></script>`
- `background`、`content` 为纯脚本入口（不生成 HTML）。
- `popup`、`options`、`sidepanel`、`devtools` 默认生成 HTML；若存在模板则使用该模板。

## 省略 entry 时

不写 `entry` 时，框架从 baseDir 下扫描目录，查找脚本文件（如 `background/index.ts`、`popup/index.ts`、`popup.ts`）。若仅有 HTML 模板，框架会读取 **`data-extenzo-entry`** 来定位 JS/TS 入口，并自动生成 `{ src, html }`。

## 支持的目录结构

- baseDir 下扁平文件：`popup.ts`、`content.ts`、`background.js` 等
- 单层目录：`popup/index.ts`、`content/index.ts`、`background/index.ts`

不支持多层嵌套的入口目录。

## 示例

### 仅使用默认发现（不配置 entry）

```
app/
  background/index.ts
  content/index.ts
  popup/index.ts
  popup/index.html     # 可选 HTML 模板
  options/index.ts
  options/index.html    # 可选 HTML 模板
```

无需在 config 中写 `entry`。框架自动发现脚本入口；若脚本旁存在 `index.html`，则作为 HTML 模板使用。

### 仅 HTML 模板（data-extenzo-entry）

```
app/
  popup/
    index.html          # 仅模板
    main.ts             # 真实入口
```

```html
<!-- popup/index.html -->
<script type="module" src="./main.ts" data-extenzo-entry></script>
```

无需配置 `entry`，框架会读取 `data-extenzo-entry` 并自动生成 `{ src, html }`。

### 自定义入口 + 覆盖部分保留名

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
    sidepanel: "sidepanel/index.ts",
    capture: "capture/index.ts",
    offscreen: { src: "offscreen/index.ts", html: true },
    settings: { src: "settings/index.ts", html: "settings/index.html" },
  },
});
```

配置 `entry` 后，**仅使用你在 entry 中声明的入口**；未列出的目录不会被当作入口。可同时包含保留名与自定义名。

## 相关配置

- [appDir](/config/app-dir)：决定 baseDir，即 entry 路径的解析起点。
- [manifest](/config/manifest)：manifest 中的 `action`、`background`、`content_scripts` 等会由框架根据 entry 与 [outDir](/config/out-dir) 自动填入路径。
