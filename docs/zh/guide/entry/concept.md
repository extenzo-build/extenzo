# 概念

Extenzo 的**入口**对应浏览器扩展里各个功能模块的入口，例如 `background`（Service Worker）、`content_scripts`、`popup`、`options`、`sidepanel`、`devtools` 等。配置方式有两种，可单独使用也可混用：

1. **基于文件**：不配置 `entry`，由框架按目录和文件名自动发现入口。
2. **基于配置**：在 `exo.config.ts` 中通过 `entry` 显式指定或覆盖入口。

**原则**：构建基于 **Rsbuild**，入口一定是 **JS/TS**；HTML 由 Rsbuild 自动生成。若使用自定义 HTML 作为页面模板，**必须**在该 HTML 中通过 `data-extenzo-entry` 标明入口脚本。

## 内置入口

框架对浏览器扩展常用的入口做了**统一命名规范**，这些名称用于自动发现和 manifest 路径填充。

:::warning
内置入口名不可修改，Extenzo 依赖这些命名进行自动识别和构建。
:::

| 入口名 | 类型 | 说明 |
|--------|------|------|
| `background` | 仅脚本 | Service Worker / 后台脚本 |
| `content` | 仅脚本 | Content Script |
| `popup` | 脚本 + HTML | 弹窗页面 |
| `options` | 脚本 + HTML | 选项页 |
| `sidepanel` | 脚本 + HTML | 侧边栏 |
| `devtools` | 脚本 + HTML | 开发者工具页 |
| `offscreen` | 脚本 + HTML | Offscreen 文档 |

:::info
- **入口结构、文件名与输出路径**详见：[基于文件](/guide/entry/file-based)（自动发现）、[基于配置](/guide/entry/config-based)（显式配置）。
:::

## 自定义入口

除上表内置名外，你可以在 `entry` 中配置**自定义入口名**（如 `capture`、`my-page`），对应扩展的自定义页面（例如 `chrome-extension://<id>/capture/index.html`）。自定义入口必须在 [exo.config 的 entry](/guide/entry/config-based) 中显式配置。