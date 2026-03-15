# 浏览器插件开发 - 参考（商店、跨平台与 extenzo 配置）

供 AI 在需要时查阅：商店审核要点、跨浏览器 manifest/API 差异、extenzo CLI 与配置索引。

## 商店政策要点

### Chrome Web Store

- **Program policies**: https://developer.chrome.com/docs/webstore/program-policies/
- 单用途：扩展应聚焦单一功能或一组紧密相关功能；禁止功能堆砌或误导。
- 权限与描述：请求的权限必须在描述/商店页中清楚说明用途。
- 隐私：若收集/处理用户数据，必须提供隐私政策 URL；数据使用需透明。
- 禁止：恶意行为、欺骗、未披露的远程代码、过度请求权限等。

### Firefox Add-ons

- **Add-on policies**: https://extensionworkshop.com/documentation/publish/add-on-policies/
- 需提供隐私政策（若处理个人数据）；扩展需通过自动与人工审核。
- 与 Chrome 类似：权限与描述一致、不得误导用户、不得包含恶意或未披露行为。

### 通用发布前检查

- 隐私政策页面可访问且与商店填写 URL 一致。
- 图标、截图、描述与功能一致。
- 若使用 `host_permissions` 或敏感权限，在商店说明中解释原因。
- 更新版本时在“更新说明”中写明变更。

## 跨浏览器 Manifest / API 差异

### 在 extenzo 中处理

- 使用 **manifest 分叉**：`manifest: { chromium: {...}, firefox: {...} }` 或独立文件 `manifest.chromium.json` / `manifest.firefox.json`（置于 `appDir` 或 `appDir/manifest/`）。
- 构建目标：**`-t chromium`** 或 **`-t firefox`**（选择输出的 manifest 分支）；开发时 **`-l chrome`** / **`-l firefox`** 等指定要启动的浏览器（chrome/edge/brave/vivaldi/opera/santa/firefox）。

### API 差异（简要）

- **webextension-polyfill** 可统一 `browser.*` 风格调用，减少 `chrome.*` 与 Firefox 的写法差异。
- 仅 Chromium：如 `offscreen`、部分 `debugger`/devtools 行为。
- 仅 Firefox：部分 experiments 或尚未在 Chrome 实现的 API；上架前需在目标浏览器实测。

## extenzo CLI 与配置索引（与源码一致）

### CLI 指令

| 指令 | 说明 |
|------|------|
| **extenzo dev** | 开发模式，watch + HMR，首次构建后自动打开浏览器（若配置了 launch） |
| **extenzo build** | 生产构建，输出到 outputRoot/outDir，默认生成 outDir.zip |

### CLI 参数

| 参数 | 说明 | 示例 |
|------|------|------|
| **-t / --target** | 构建目标（manifest 分支）：chromium \| firefox | `extenzo build -t firefox` |
| **-l / --launch** | 开发/构建后启动的浏览器：chrome \| edge \| brave \| vivaldi \| opera \| santa \| firefox | `extenzo dev -l chrome` |
| **-p / --persist** | 保留 Chromium 用户数据目录（dev 时） | `extenzo dev -p` |
| **-r / --report** | 启用 Rsdoctor 构建报告 | `extenzo build -r` |
| **--debug** | 开发时启用错误监控（plugin-extension-monitor） | `extenzo dev --debug` |

- `-t` 未指定时由 `-l` 或 config.**browser** 推断（如 `-l firefox` → target firefox）。
- config.**launch** 为各浏览器可执行文件路径，仅 **extenzo dev** 使用。

### 保留入口名称（RESERVED_ENTRY_NAMES）

- **仅脚本**：`background`、`content`
- **脚本 + HTML**：`popup`、`options`、`sidepanel`、`devtools`、`offscreen`、`sandbox`、`newtab`、`bookmarks`、`history`

自定义入口可任意命名（如 `capture`、`settings`）。`entry` 值：路径字符串，或 `{ src: string; html?: boolean \| string }`；**entry: false** 关闭框架入口，由用户在 rsbuildConfig 中配置。

### 配置项默认值（与 packages/core/constants.ts、types 一致）

| 选项 | 默认值 | 说明 |
|------|--------|------|
| **appDir** | `"app"` | 应用目录，entry 路径与 manifest 自动加载的根目录 |
| **outDir** | `"extension"` | 输出目录名，位于 outputRoot 下 |
| **outputRoot** | `".extenzo"` | 输出根目录；完整路径为 outputRoot/outDir |
| **zip** | `true` | build 后是否生成 outDir.zip |
| **browser** | - | 默认启动浏览器（等同 -l）；可选 chrome/edge/brave/vivaldi/opera/santa/firefox 或 chromium |
| **launch** | OS 默认路径 | 各浏览器可执行文件路径，仅 dev 使用 |
| **hotReload.port** | 23333 | HMR WebSocket 端口 |
| **hotReload.autoRefreshContentPage** | true | content 变更是否自动刷新当前页 |
| **srcDir** | - | 已废弃，用 **appDir** |

### 文档路径（项目内）

- manifest：`docs/en/config/manifest.md`（或 `docs/zh/config/manifest.md`）
- entry：`docs/en/config/entry.md`
- appDir / outDir / outputRoot / zip：`docs/en/config/app-dir.md`、`docs/en/config/out-dir.md`、`docs/en/guide/output.md`、`docs/en/guide/zip.md`
- launch：`docs/en/config/launch.md`
- hooks、report、debug、plugins、rsbuildConfig：`docs/en/config/hooks.md` 等
- 功能选项总览：`docs/en/guide/feature-subsets.md`

以上内容在需要回答“商店为什么拒审”“Chrome 和 Firefox 怎么同时支持”“extenzo 指令/入口/默认输出是什么”等问题时由 AI 按需引用。
