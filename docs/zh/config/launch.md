# launch

`launch` 用于指定 **Chrome / Chromium / Edge / Brave / Vivaldi / Opera / Santa / Arc / Yandex / BrowserOS / custom / Firefox 可执行文件路径**，供 `extenzo dev` 在首次构建完成后自动打开浏览器并加载扩展。若未在 config 中设置，框架会按当前操作系统尝试**默认安装路径**（见下方），取第一个存在的可执行文件。**Chromium** 指开源 Chromium 浏览器（内置路径）。**custom** 表示由用户在 `launch.custom` 中填写任意 Chromium 系浏览器路径（无默认路径）。

## 类型与默认值

- **类型**：`{ chrome?: string; chromium?: string; edge?: string; brave?: string; vivaldi?: string; opera?: string; santa?: string; arc?: string; yandex?: string; browseros?: string; custom?: string; firefox?: string } | undefined`
- **默认**：不配置时，按 OS 尝试默认路径（Windows / macOS / Linux 常见安装位置）。**custom** 必须设置 `launch.custom` 为可执行文件路径。若所有默认路径都不存在，`extenzo dev` 会打印警告并跳过自动打开浏览器。
- **关联**：可在 `exo.config.ts` 增加 `browser: "chrome" | "chromium" | "edge" | ... | "custom" | "firefox"` 作为默认启动浏览器（CLI `-l/--launch` 优先级更高）。

## 默认路径（常量）

框架在 extenzo 中定义了各系统默认路径，按顺序尝试、取第一个存在的：

- **Windows (win32)**  
  Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`、`C:\Program Files (x86)\...`  
  Chromium: `C:\Program Files\Chromium\Application\chrome.exe`、`C:\Program Files (x86)\...`  
  Edge: ...  
  Brave: ...  
  ...  
  **custom**：无默认路径，须在 config 中设置 `launch.custom`。  
  Firefox: `C:\Program Files\Mozilla Firefox\firefox.exe`、...
- **macOS (darwin)**  
  Chrome: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`  
  Chromium: `/Applications/Chromium.app/Contents/MacOS/Chromium`  
  ...  
  **custom**：无默认路径，须设置 `launch.custom`。  
  Firefox: `/Applications/Firefox.app/Contents/MacOS/firefox`
- **Linux**  
  Chrome: `/usr/bin/google-chrome`、`google-chrome-stable`、`chromium`、`chromium-browser`  
  Chromium: `/usr/bin/chromium`、`/usr/bin/chromium-browser`、...  
  ...  
  **custom**：无默认路径，须设置 `launch.custom`。  
  Firefox: `/usr/bin/firefox`、`/usr/bin/firefox-esr`

## 作用

- 仅对 **extenzo dev** 生效；`extenzo build` 不会启动浏览器。
- 由 [@extenzo/rsbuild-plugin-extension-hmr](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/rsbuild-plugin-extension-hmr) 在首次构建完成后调用：Chrome 通过 `--load-extension` 加载产物目录，Firefox 通过 `web-ext run`。

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

使用 `extenzo dev -l chrome` 时只需 `launch.chrome`；使用 `-l chromium` 时使用内置 Chromium 路径或 `launch.chromium`；使用 `-l edge/brave/vivaldi/opera/santa/arc/yandex/browseros` 时只需对应字段；使用 **`-l custom`** 时必须设置 **`launch.custom`** 为可执行文件路径（Chromium 系浏览器，无默认路径）；使用 `-l firefox` 时只需 `launch.firefox`。**若在 `launch` 中指定了某浏览器的路径（如 `launch.arc`），会覆盖该浏览器的内置默认路径。**

### 自定义浏览器示例

```ts
export default defineConfig({
  browser: "custom",
  launch: {
    custom: "C:\\MyBrowser\\my-chromium.exe",  // 或 macOS/Linux 路径
  },
});
```

然后执行 `extenzo dev` 或 `extenzo dev -l custom`。

## 相关说明

- 开发时 HMR 与重载由 [@extenzo/rsbuild-plugin-extension-hmr](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/rsbuild-plugin-extension-hmr) 负责，无需在 launch 中做额外配置。
