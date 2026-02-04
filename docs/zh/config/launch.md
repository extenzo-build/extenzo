# launch

`launch` 用于指定 **Chrome / Firefox 可执行文件路径**，供 `extenzo dev` 在首次构建完成后自动打开浏览器并加载扩展。若未在 config 中设置，框架会按当前操作系统尝试**默认安装路径**（见下方），取第一个存在的可执行文件。

## 类型与默认值

- **类型**：`{ chrome?: string; firefox?: string } | undefined`
- **默认**：不配置时，按 OS 尝试默认路径（Windows / macOS / Linux 常见安装位置）。若所有默认路径都不存在，`extenzo dev` 会打印警告并跳过自动打开浏览器。

## 默认路径（常量）

框架在 extenzo 中定义了各系统默认路径，按顺序尝试、取第一个存在的：

- **Windows (win32)**  
  Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`、`C:\Program Files (x86)\...`  
  Firefox: `C:\Program Files\Mozilla Firefox\firefox.exe`、`C:\Program Files (x86)\...`
- **macOS (darwin)**  
  Chrome: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`  
  Firefox: `/Applications/Firefox.app/Contents/MacOS/firefox`
- **Linux**  
  Chrome: `/usr/bin/google-chrome`、`google-chrome-stable`、`chromium`、`chromium-browser`  
  Firefox: `/usr/bin/firefox`、`/usr/bin/firefox-esr`

## 作用

- 仅对 **extenzo dev** 生效；`extenzo build` 不会启动浏览器。
- 由 [@extenzo/plugin-hmr](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/plugin-hmr) 在首次构建完成后调用：Chrome 通过 `--load-extension` 加载产物目录，Firefox 通过 `web-ext run`。

## 示例

### 在 config 中指定路径（可选）

当默认路径不适用时（例如便携版、自定义安装目录），在 `ext.config.ts` 中设置：

```ts
// ext.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  launch: {
    chrome: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    firefox: "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
  },
});
```

macOS / Linux 示例：

```ts
export default defineConfig({
  launch: {
    chrome: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    firefox: "/usr/bin/firefox",
  },
});
```

### 仅指定当前使用的浏览器

使用 `extenzo dev -b chrome` 时只需 `launch.chrome`；使用 `-b firefox` 时只需 `launch.firefox`。

## 相关说明

- 开发时 HMR 与重载由 [@extenzo/plugin-hmr](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/plugin-hmr) 负责，无需在 launch 中做额外配置。
