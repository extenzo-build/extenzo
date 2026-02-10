# launch

`launch` specifies the **Chrome / Edge / Brave / Vivaldi / Opera / Santa / Firefox executable paths** used by `extenzo dev` to open the browser and load the extension. If not set in config, the framework tries **default install paths** for the current OS (see below) and uses the first path that exists.

## Type and default

- **Type**: `{ chrome?: string; edge?: string; brave?: string; vivaldi?: string; opera?: string; santa?: string; firefox?: string } | undefined`
- **Default**: When omitted, the framework tries OS-specific default paths (common install locations on Windows, macOS, and Linux). If none exist, `extenzo dev` logs a warning and skips auto-opening the browser.
- **Related**: You can set `browser: "chrome" | "edge" | "brave" | "vivaldi" | "opera" | "santa" | "firefox"` in `exo.config.ts` as the default launch target (CLI `-l/--launch` has higher priority).

## Default paths (constants)

Default paths are defined in extenzo; the first existing path is used:

- **Windows (win32)**  
  Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`, `C:\Program Files (x86)\...`  
  Edge: `C:\Program Files\Microsoft\Edge\Application\msedge.exe`, `C:\Program Files (x86)\...`  
  Brave: `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`, `C:\Program Files (x86)\...`  
  Vivaldi: `C:\Users\<username>\AppData\Local\Vivaldi\Application\vivaldi.exe`, `C:\Program Files\Vivaldi\Application\vivaldi.exe`, `C:\Program Files (x86)\...`  
  Opera: `C:\Program Files\Opera\launcher.exe`, `C:\Program Files (x86)\...`  
  Santa: `C:\Program Files\Santa Browser\Application\Santa Browser.exe`, `C:\Program Files (x86)\...`  
  Firefox: `C:\Program Files\Mozilla Firefox\firefox.exe`, `C:\Program Files (x86)\...`
- **macOS (darwin)**  
  Chrome: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`  
  Edge: `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`  
  Brave: `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`  
  Vivaldi: `/Applications/Vivaldi.app/Contents/MacOS/Vivaldi`  
  Opera: `/Applications/Opera.app/Contents/MacOS/Opera`  
  Santa: `/Applications/Santa Browser.app/Contents/MacOS/Santa Browser`  
  Firefox: `/Applications/Firefox.app/Contents/MacOS/firefox`
- **Linux**  
  Chrome: `/usr/bin/google-chrome`, `google-chrome-stable`, `chromium`, `chromium-browser`  
  Edge: `/usr/bin/microsoft-edge`, `/usr/bin/microsoft-edge-stable`  
  Brave: `/usr/bin/brave-browser`, `/usr/bin/brave`  
  Vivaldi: `/usr/bin/vivaldi-stable`, `/usr/bin/vivaldi`  
  Opera: `/usr/bin/opera`, `/usr/bin/opera-stable`  
  Santa: `/usr/bin/santa-browser`  
  Firefox: `/usr/bin/firefox`, `/usr/bin/firefox-esr`

## Role

- Only affects **extenzo dev**; `extenzo build` does not start a browser.
- Used by [@extenzo/plugin-extension-hmr](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/plugin-extension-hmr) after the first build: Chrome via `--load-extension`, Firefox via `web-ext run`.

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

With `extenzo dev -l chrome` only `launch.chrome` is needed; with `-l edge/brave/vivaldi/opera/santa` use the corresponding field; with `-l firefox` only `launch.firefox`.

## Related

- HMR and reload in dev are handled by [@extenzo/plugin-extension-hmr](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/plugin-extension-hmr); no extra launch config is required.
