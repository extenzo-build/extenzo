---
name: browser-extension-dev
description: Guides browser extension development with recommended MV3 paradigms, cross-browser (Chrome/Firefox) support, and store publishing. Use when building or publishing WebExtensions, using the extenzo framework, or when the user asks about extension architecture, manifest, permissions, or store submission.
---

# 浏览器插件开发（供 AI 使用）

基于《Building Browser Extensions》推荐范式与 extenzo 框架，指导插件架构、跨平台与上架发布。触发场景：开发/发布浏览器扩展、使用 extenzo、或询问 MV3/跨浏览器/商店审核。

## 一、推荐范式（Manifest V3）

- **Manifest 版本**：仅采用 **Manifest V3 (MV3)**。MV2 已淘汰，Chromium 系与 Firefox 均以 MV3 为主。
- **Background**：使用 **service worker**，不用持久 background page。注意：
  - 无 `localStorage`，改用 `chrome.storage` 或 IndexedDB。
  - 定时用 **Alarms API**，不要依赖 `setTimeout`/`setInterval` 在 service worker 中长期存活。
  - 需要 DOM/音频等时，可用 **offscreen document**（Chromium）。
- **网络请求**：优先 **declarativeNetRequest**，避免在 MV3 中依赖可阻塞的 `webRequest`（能力受限）。
- **内容脚本与 CSP**：不在扩展页中写内联脚本或远程脚本；用户脚本类需求用 **userScripts API**（若目标浏览器支持）。
- **权限**：按需声明、最小化；敏感权限（如 `<all_urls>`、`tabs`）在 manifest 和 UI 中说明用途。

## 二、跨平台（Chrome / Firefox）

- **标准**：遵循 **WebExtensions** 通用模型（W3C WECG），便于多浏览器复用。
- **Manifest 差异**：Chromium 与 Firefox 存在字段差异，需按目标生成或合并 manifest：
  - **extenzo**：在 `defineConfig` 中用 `manifest: { chromium: {...}, firefox: {...} }` 或分别的 manifest 文件（如 `manifest.chromium.json` / `manifest.firefox.json`）；构建目标通过 **`-t chromium`** 或 **`-t firefox`** 选择；开发时用 **`-l chrome`** / **`-l firefox`** 等指定要启动的浏览器。
  - 常见差异：Chrome 用 `action`，Firefox 可能用 `sidebar_action`；Chrome 用 `service_worker`，Firefox MV2 用 `scripts`；部分 API 仅 Chromium 或仅 Firefox，需在文档中标注。
- **API 统一**：在 content/background 中可用 **webextension-polyfill**（`import browser from "webextension-polyfill"`）统一 `chrome.*` / `browser.*` 调用；extenzo 推荐在需要时安装此依赖。

## 三、extenzo 框架要点（与代码一致）

- **配置入口**：`exo.config.ts`（或 `exo.config.js`），使用 `defineConfig` 导出。应用目录默认 **`appDir: "app"`**（勿用已废弃的 `srcDir`）。
- **Manifest**：
  - 可在 config 中写 `manifest: { ... }`，或按浏览器拆分为 `chromium` / `firefox`，或指向文件路径（相对 `appDir`）。
  - `content_scripts` 的 `js`/`css` 可使用占位符 **`[exo.content]`**，由框架替换为实际 content 入口输出路径。
- **保留入口名称**（不可重命名，与 manifest 输出路径对应）：
  - **仅脚本**：`background`、`content`
  - **脚本 + HTML**：`popup`、`options`、`sidepanel`、`devtools`、`offscreen`、`sandbox`、`newtab`、`bookmarks`、`history`
  - 其他名称可作为**自定义入口**（如 `capture`、`settings`）；`entry` 值可为路径字符串或 `{ src: string; html?: boolean | string }`。设 **`entry: false`** 可关闭框架入口发现与注入，自行在 `rsbuildConfig` 中配置 entry。
- **CLI 指令**：
  - **`extenzo dev`**：开发模式，watch + HMR；可选 **`-l chrome`** / **`-l edge`** / **`-l brave`** / **`-l vivaldi`** / **`-l opera`** / **`-l santa`** / **`-l firefox`** 指定启动的浏览器；**`-t chromium`** / **`-t firefox`** 指定构建目标（manifest 分支）；**`-p`** / **`--persist`** 保留 Chromium 用户数据目录；**`--debug`** 启用错误监控（plugin-extension-monitor）；**`-r`** / **`--report`** 启用 Rsdoctor 报告。
  - **`extenzo build`**：生产构建；**`-t chromium`** / **`-t firefox`** 指定输出 manifest 分支；**`-l <browser>`** 可在构建完成后启动浏览器；**`-r`** / **`--report`** 生成 Rsdoctor 报告。
  - 配置中 **`browser`** 可设默认启动浏览器（如 `chrome`、`firefox` 或 `chromium`，与 `-l` 等价）；**`launch`** 为各浏览器可执行文件路径（仅 dev 使用）。
- **输出**：默认 **`outputRoot: ".extenzo"`**，**`outDir: "extension"`**，即输出目录为 **`.extenzo/extension`**；zip 默认开启，产物为 **`.extenzo/extension.zip`**（用于商店提交）。可通过 **`zip: false`** 关闭 zip。
- **其他配置**：**`hotReload`**（`port`、`autoRefreshContentPage`）、**`hooks`**（afterCliParsed、afterConfigLoaded、beforeRsbuildConfig、beforeBuild、afterBuild）、**`debug`**、**`report`**、**`persist`**、**`envPrefix`** 等见 [reference.md](reference.md) 与项目 `docs/`。

## 四、上架与发布

- **打包**：使用 `extenzo build`（可按需加 `-t firefox` 打 Firefox 包），确保 **zip 已开启**（默认 `zip: true`），产物为 **`.extenzo/extension.zip`**（或自定义 `outDir` 对应的 zip），用于上传商店。
- **Chrome Web Store**：需要开发者账号；准备隐私政策 URL、详细描述、截图/宣传图、单用途说明（若适用）；遵守 [Chrome 扩展程序计划政策](https://developer.chrome.com/docs/webstore/program-policies/)；权限与描述一致。
- **Firefox Add-ons**：在 [addons.mozilla.org](https://addons.mozilla.org) 注册；需隐私政策（若处理用户数据）；遵守 [Firefox 扩展政策](https://extensionworkshop.com/documentation/publish/add-on-policies/)。
- **通用**：声明最少必要权限；隐私政策如实说明数据收集与使用；更新时注明变更内容。

## 五、检查清单（生成/修改扩展时）

- [ ] `manifest_version: 3`，无 MV2 专用字段依赖。
- [ ] background 为 `service_worker`，持久化数据用 `chrome.storage`/IndexedDB，定时用 Alarms。
- [ ] 权限仅声明必要项；含 host_permissions 时在描述中说明。
- [ ] 多浏览器时 manifest 按 chromium/firefox 分支或文件拆分，并测试 `-t chromium` / `-t firefox` 与 `-l chrome` / `-l firefox`。
- [ ] 发布前 `extenzo build` 且 zip 可用（默认 `.extenzo/extension.zip`）；准备好商店所需的描述、图标、隐私政策链接。

## 六、参考

- 本书对应《Building Browser Extensions》（Apress，Matt Frisbie）；示例扩展见 [buildingbrowserextensions.com](https://buildingbrowserextensions.com)。
- extenzo 文档：项目内 `docs/`（含 manifest、entry、output、zip、launch、hooks 等）。
- 详细商店政策、CLI 与配置索引见 [reference.md](reference.md)。
