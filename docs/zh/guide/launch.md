# 浏览器启动

`launch` 用于指定 **Chrome / Edge / Brave / Vivaldi / Opera / Santa / Firefox 可执行文件路径**，供 `extenzo dev` 在首次构建完成后自动打开浏览器并加载扩展。若未在 config 中设置，框架会按当前操作系统尝试**默认安装路径**。

## 类型与默认值

- **类型**：`{ chrome?: string; edge?: string; brave?: string; vivaldi?: string; opera?: string; santa?: string; firefox?: string } | undefined`
- **默认**：不配置时，按 OS 尝试默认路径（Windows / macOS / Linux 常见安装位置）。若所有默认路径都不存在，`extenzo dev` 会打印警告并跳过自动打开浏览器。

## 作用

- 仅对 **extenzo dev** 生效；`extenzo build` 不会启动浏览器。
- 由 [plugin-extension-hmr](/guide/hmr) 在首次构建完成后调用：Chrome 通过 `--load-extension` 加载产物目录，Firefox 通过 `web-ext run`。

## 示例

当默认路径不适用时（例如便携版、自定义安装目录），在 `exo.config.ts` 中设置：

```ts
// exo.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  launch: {
    chrome: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    firefox: "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
  },
});
```

使用 `extenzo dev -l chrome` 时只需 `launch.chrome`；使用 `-l firefox` 时只需 `launch.firefox`。

## 相关说明

- 开发时 HMR 与重载由 [plugin-extension-hmr](/guide/hmr) 负责。
