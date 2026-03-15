# launch

`launch` specifies the **Chrome / Chromium / Edge / Brave / Vivaldi / Opera / Santa / Arc / Yandex / BrowserOS / custom / Firefox executable paths** used by `extenzo dev` to open the browser and load the extension. If not set in config, the framework tries **default install paths** for the current OS (see below) and uses the first path that exists. **Chromium** is the open-source Chromium browser (built-in paths). **custom** lets you pass any Chromium-based browser path via `launch.custom` (no default paths).

## Type and default

- **Type**: `{ chrome?: string; chromium?: string; edge?: string; brave?: string; vivaldi?: string; opera?: string; santa?: string; arc?: string; yandex?: string; browseros?: string; custom?: string; firefox?: string } | undefined`
- **Default**: When omitted, the framework tries OS-specific default paths (common install locations on Windows, macOS, and Linux). For **custom**, you must set `launch.custom` to the executable path. If no path is found, `extenzo dev` logs a warning and skips auto-opening the browser.
- **Related**: You can set `browser: "chrome" | "chromium" | "edge" | ... | "custom" | "firefox"` in `exo.config.ts` as the default launch target (CLI `-l/--launch` has higher priority).

## Default paths (constants)

Default paths are defined in extenzo; the first existing path is used:

- **Windows (win32)**  
  Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`, `C:\Program Files (x86)\...`  
  Chromium: `C:\Program Files\Chromium\Application\chrome.exe`, `C:\Program Files (x86)\...`  
  Edge: `C:\Program Files\Microsoft\Edge\Application\msedge.exe`, `C:\Program Files (x86)\...`  
  Brave: ...  
  Vivaldi: ...  
  Opera: ...  
  Santa: ...  
  Arc: `%LOCALAPPDATA%\Programs\Arc\Application\Arc.exe`, ...  
  Yandex: ...  
  BrowserOS: ...  
  **custom**: no default paths — set `launch.custom` in config.  
  Firefox: `C:\Program Files\Mozilla Firefox\firefox.exe`, ...
- **macOS (darwin)**  
  Chrome: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`  
  Chromium: `/Applications/Chromium.app/Contents/MacOS/Chromium`  
  Edge: ...  
  ...  
  **custom**: no default — set `launch.custom`.  
  Firefox: `/Applications/Firefox.app/Contents/MacOS/firefox`
- **Linux**  
  Chrome: `/usr/bin/google-chrome`, `google-chrome-stable`, `chromium`, `chromium-browser`  
  Chromium: `/usr/bin/chromium`, `/usr/bin/chromium-browser`, ...  
  ...  
  **custom**: no default — set `launch.custom`.  
  Firefox: `/usr/bin/firefox`, `/usr/bin/firefox-esr`

## Role

- Only affects **extenzo dev**; `extenzo build` does not start a browser.
- Used by [@extenzo/rsbuild-plugin-extension-hmr](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/rsbuild-plugin-extension-hmr) after the first build: Chrome via `--load-extension`, Firefox via `web-ext run`.

## Examples

### In config (optional)

When default paths do not apply (e.g. portable or custom install), set paths in `exo.config.ts`:

```ts
export default defineConfig({
  launch: {
    chrome: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    edge: "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    brave: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    vivaldi: "C:\\Users\\<username>\\AppData\\Local\\Vivaldi\\Application\\vivaldi.exe",
    opera: "C:\\Program Files\\Opera\\launcher.exe",
    santa: "C:\\Program Files\\Santa Browser\\Application\\Santa Browser.exe",
    firefox: "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
  },
});
```

macOS / Linux:

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

### Only the browser you use

With `extenzo dev -l chrome` only `launch.chrome` is needed; with `-l chromium` the framework uses built-in Chromium paths (or `launch.chromium` to override); with `-l custom` you **must** set `launch.custom` to the executable path (Chromium-based); with `-l edge/brave/vivaldi/opera/santa/arc/yandex/browseros` use the corresponding field; with `-l firefox` only `launch.firefox`. **If you set a path in `launch` (e.g. `launch.arc`), it overrides the built-in default paths** for that browser.

### Custom browser example

```ts
export default defineConfig({
  browser: "custom",
  launch: {
    custom: "C:\\MyBrowser\\my-chromium.exe",  // or macOS/Linux path
  },
});
```

Then run `extenzo dev` or `extenzo dev -l custom`.

## Related

- HMR and reload in dev are handled by [@extenzo/rsbuild-plugin-extension-hmr](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/rsbuild-plugin-extension-hmr); no extra launch config is required.
