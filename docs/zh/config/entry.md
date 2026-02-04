# entry

`entry` 用于自定义扩展的**入口映射**：键为入口名称，值为**相对于 baseDir** 的路径（脚本或 HTML）。不配置时，框架会从 [srcDir](/config/src-dir)（或项目根）下按目录名自动发现 `background`、`content`、`popup`、`options`、`sidepanel`、`devtools` 等入口。

## 类型与 baseDir

- **类型**：`Record<string, string> | undefined`
- **baseDir**：未配置 [srcDir](/config/src-dir) 时，baseDir = 项目根目录；配置了 `srcDir` 时，baseDir = `srcDir`。所有 entry 的 value 均为**相对于 baseDir** 的路径。

## 保留入口名（不可改）

以下名称由扩展规范与框架约定，不可用作其他含义：

| 入口名 | 类型 | 说明 |
|--------|------|------|
| `background` | 仅脚本 | Service Worker / 后台脚本 |
| `content` | 仅脚本 | Content Script |
| `popup` | HTML 入口 | 弹窗；以 HTML 为入口（如 `popup/index.html`） |
| `options` | HTML 入口 | 选项页；同上 |
| `sidepanel` | HTML 入口 | 侧边栏；同上 |
| `devtools` | HTML 入口 | 开发者工具页；同上 |

其余名称可作为**自定义入口**（如 `capture`、`offscreen`），只要目录下存在对应脚本或 HTML 即可。

## 路径规则

- **脚本入口**：value 为 `.js`、`.jsx`、`.ts`、`.tsx` 文件路径。仅 `background`、`content` 为纯脚本入口。
- **HTML 入口**：value 为 `.html` 文件路径。`popup`、`options`、`sidepanel`、`devtools` 以 HTML 为入口即可；若 HTML 中需引用脚本，在 HTML 内引入即可。

## 省略 entry 时

不写 `entry` 时，框架从 baseDir 下扫描目录，自动发现上述保留名对应的入口（例如存在 `background/index.ts`、`popup/index.html`、`options/index.html` 等即会被发现）。

## 示例

### 仅使用默认发现（不配置 entry）

```
src/
  background/index.ts
  content/index.ts
  popup/index.html
  options/index.html
  sidepanel/index.html
```

无需在 config 中写 `entry`。HTML 入口以页面文件为准；若页面中需脚本，在 HTML 内引入即可。

### 自定义入口 + 覆盖部分保留名

```ts
// ext.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  srcDir: "src",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.html",
    options: "options/index.html",
    sidepanel: "sidepanel/index.html",
    capture: "capture/capture.html",
    offscreen: "offscreen/offscreen.html",
  },
});
```

配置 `entry` 后，**仅使用你在 entry 中声明的入口**；未列出的目录不会被当作入口。可同时包含保留名与自定义名。

## 相关配置

- [srcDir](/config/src-dir)：决定 baseDir，即 entry 路径的解析起点。
- [manifest](/config/manifest)：manifest 中的 `action`、`background`、`content_scripts` 等会由框架根据 entry 与 [outDir](/config/out-dir) 自动填入路径。
