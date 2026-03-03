# 插件图标

扩展所需的图标文件（如工具栏图标、安装页图标等）在 Extenzo 项目中统一放在 **`public` 目录** 下。构建时 `public` 下的内容会被拷贝到输出目录（如 `dist`），因此在 manifest 中配置的图标路径应相对于扩展根目录，对应到 `public` 下的文件（例如 `public/icons/icon16.png` 在 manifest 中写为 `icons/icon16.png`）。

常见做法是在 `public` 下建 `icons` 子目录，放置不同尺寸的 PNG（如 16、32、48、128），并在 manifest 的 `icons` 或 `action.default_icon` 中引用。

具体尺寸要求、格式及 manifest 配置方式请参阅 Chrome 官方文档：

- [Manifest - icons](https://developer.chrome.com/docs/extensions/reference/manifest/icons)（图标规格与配置说明）
