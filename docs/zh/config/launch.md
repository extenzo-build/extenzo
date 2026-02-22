# launch

`launch` 用于指定 **Chrome / Edge / Brave / Vivaldi / Opera / Santa / Firefox 可执行文件路径**，供 `extenzo dev` 在首次构建完成后自动打开浏览器并加载扩展。若未在 config 中设置，框架会按当前操作系统尝试**默认安装路径**（见下方），取第一个存在的可执行文件。

## 类型与默认值

- **类型**：`{ chrome?: string; edge?: string; brave?: string; vivaldi?: string; opera?: string; santa?: string; firefox?: string } | undefined`
- **默认**：不配置时，按 OS 尝试默认路径（Windows / macOS / Linux 常见安装位置）。若所有默认路径都不存在，`extenzo dev` 会打印警告并跳过自动打开浏览器。
- **关联**：可在 `exo.config.ts` 增加 `browser: "chrome" | "edge" | "brave" | "vivaldi" | "opera" | "santa" | "firefox"` 作为默认启动浏览器（CLI `-l/--launch` 优先级更高）。

## 默认路径（常量）

框架在 extenzo 中定义了各系统默认路径，按顺序尝试、取第一个存在的：

- **Windows (win32)**  
  Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`、`C:\Program Files (x86)\...`  
  Edge: `C:\Program Files\Microsoft\Edge\Application\msedge.exe`、`C:\Program Files (x86)\...`  
  Brave: `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`、`C:\Program Files (x86)\...`  
  Vivaldi: `C:\Users\<用户名>\AppData\Local\Vivaldi\Application\vivaldi.exe`、`C:\Program Files\Vivaldi\Application\vivaldi.exe`、`C:\Program Files (x86)\...`  
  Opera: `C:\Program Files\Opera\launcher.exe`、`C:\Program Files (x86)\...`  
  Santa: `C:\Program Files\Santa Browser\Application\Santa Browser.exe`、`C:\Program Files (x86)\...`  
  Firefox: `C:\Program Files\Mozilla Firefox\firefox.exe`、`C:\Program Files (x86)\...`
- **macOS (darwin)**  
  Chrome: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`  
  Edge: `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`  
  Brave: `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`  
  Vivaldi: `/Applications/Vivaldi.app/Contents/MacOS/Vivaldi`  
  Opera: `/Applications/Opera.app/Contents/MacOS/Opera`  
  Santa: `/Applications/Santa Browser.app/Contents/MacOS/Santa Browser`  
  Firefox: `/Applications/Firefox.app/Contents/MacOS/firefox`
- **Linux**  
  Chrome: `/usr/bin/google-chrome`、`google-chrome-stable`、`chromium`、`chromium-browser`  
  Edge: `/usr/bin/microsoft-edge`、`/usr/bin/microsoft-edge-stable`  
  Brave: `/usr/bin/brave-browser`、`/usr/bin/brave`  
  Vivaldi: `/usr/bin/vivaldi-stable`、`/usr/bin/vivaldi`  
  Opera: `/usr/bin/opera`、`/usr/bin/opera-stable`  
  Santa: `/usr/bin/santa-browser`  
  Firefox: `/usr/bin/firefox`、`/usr/bin/firefox-esr`

## 作用

- 仅对 **extenzo dev** 生效；`extenzo build` 不会启动浏览器。
- 由 [@extenzo/plugin-extension-hmr](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/plugin-extension-hmr) 在首次构建完成后调用：Chrome 通过 `--load-extension` 加载产物目录，Firefox 通过 `web-ext run`。

## 示例

### 在 config 中指定路径（可选）

当默认路径不适用时（例如便携版、自定义安装目录），在 `exo.config.ts` 中设置：

```ts
// exo.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  launch: {
    chrome: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    edge: "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    brave: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    vivaldi: "C:\\Users\\<用户名>\\AppData\\Local\\Vivaldi\\Application\\vivaldi.exe",
    opera: "C:\\Program Files\\Opera\\launcher.exe",
    santa: "C:\\Program Files\\Santa Browser\\Application\\Santa Browser.exe",
    firefox: "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
  },
});
```

macOS / Linux 示例：

```ts
export default defineConfig({
  launch: {
    chrome: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    edge: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    brave: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    vivaldi: "/Applications/Vivaldi.app/Contents/MacOS/Vivaldi",
    opera: "/Applications/Opera.app/Contents/MacOS/Opera",
    santa: "/Applications/Santa Browser.app/Contents/MacOS/Santa Browser",
    firefox: "/usr/bin/firefox",
  },
});
```

### 仅指定当前使用的浏览器

使用 `extenzo dev -l chrome` 时只需 `launch.chrome`；使用 `-l edge/brave/vivaldi/opera/santa` 时只需对应字段；使用 `-l firefox` 时只需 `launch.firefox`。

## 相关说明

- 开发时 HMR 与重载由 [@extenzo/plugin-extension-hmr](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/plugin-extension-hmr) 负责，无需在 launch 中做额外配置。
