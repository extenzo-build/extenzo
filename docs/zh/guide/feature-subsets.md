# 功能子集简介

Extenzo 的配置可拆分为以下功能子集，便于按需查阅与扩展。每个配置项在左侧**配置**导航下均有独立页面，含类型说明与示例代码。

## 配置项与文档索引

| 配置项 | 说明 | 文档 |
|--------|------|------|
| **manifest** | 扩展清单：对象/路径配置，按浏览器拆分（chromium/firefox），或省略后自动加载 manifest.json。 | [manifest](/config/manifest) |
| **entry** | 自定义入口映射：保留名 popup/options/background 等，value 为相对 baseDir 的路径。 | [entry](/config/entry) |
| **appDir** | 应用目录，默认为项目根；同时作为 entry 的 baseDir 与 manifest 自动加载根目录。 | [appDir](/config/app-dir) |
| **outDir** | 输出目录名，默认 `"dist"`；实际路径为 outputRoot/outDir。 | [outDir](/config/out-dir) |
| **outputRoot** | 构建产物父目录，默认 `".extenzo"`；与 outDir 共同决定完整输出路径。 | [outputRoot](/config/output-root) |
| **zip** | 是否在 build 后将产物打包为 zip；默认 true。 | [zip](/config/zip) |
| **envPrefix** | .env 注入到客户端的环境变量名前缀；默认 `['']` 暴露全部。 | [envPrefix](/config/env-prefix) |
| **launch** | 开发时 Chrome/Firefox 可执行文件路径，供 `extenzo dev` 自动打开浏览器。 | [launch](/config/launch) |
| **hooks** | 生命周期钩子：afterCliParsed、afterConfigLoaded、beforeRsbuildConfig、beforeBuild、afterBuild。 | [hooks](/config/hooks) |
| **plugins** | Rsbuild 插件数组：内置 plugin-extension-entry、plugin-extension-manifest、plugin-extension-hmr；用户可加 vue()、react()。 | [plugins](/config/plugins) |
| **rsbuildConfig** | 覆盖或扩展 Rsbuild 配置：对象深度合并或函数 (base, helpers)。 | [rsbuildConfig](/config/rsbuild-config) |

## 与 CLI 的关系

- **extenzo dev**：使用 manifest、entry、plugins、launch、rsbuildConfig；开发时 HMR 与浏览器启动依赖 plugin-extension-hmr 与 launch。
- **extenzo build**：使用 manifest、entry、plugins、rsbuildConfig；产物由 plugin-extension-manifest 写入 manifest.json；zip 为 true 时在 outputRoot 下生成 outDir.zip。

## 下一步

- 从 [介绍](/guide/introduction) 了解核心能力。
- 从 [安装](/guide/install) 创建项目。
- 在 [配置](/config/manifest) 中按项查看每项配置的说明与示例代码。
