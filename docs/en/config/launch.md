# launch

`launch` specifies the **Chrome / Firefox executable paths** used by `extenzo dev` to open the browser and load the extension. If not set in config, the framework tries **default install paths** for the current OS (see below) and uses the first path that exists.

## Type and default

- **Type**: `{ chrome?: string; firefox?: string } | undefined`
- **Default**: When omitted, the framework tries OS-specific default paths (common install locations on Windows, macOS, and Linux). If none exist, `extenzo dev` logs a warning and skips auto-opening the browser.

## Default paths (constants)

Default paths are defined in extenzo; the first existing path is used:

- **Windows (win32)**  
  Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`, `C:\Program Files (x86)\...`  
  Firefox: `C:\Program Files\Mozilla Firefox\firefox.exe`, `C:\Program Files (x86)\...`
- **macOS (darwin)**  
  Chrome: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`  
  Firefox: `/Applications/Firefox.app/Contents/MacOS/firefox`
- **Linux**  
  Chrome: `/usr/bin/google-chrome`, `google-chrome-stable`, `chromium`, `chromium-browser`  
  Firefox: `/usr/bin/firefox`, `/usr/bin/firefox-esr`

## Role

- Only affects **extenzo dev**; `extenzo build` does not start a browser.
- Used by [@extenzo/plugin-hmr](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/plugin-hmr) after the first build: Chrome via `--load-extension`, Firefox via `web-ext run`.

## Examples

### In config (optional)

When default paths do not apply (e.g. portable or custom install), set paths in `ext.config.ts`:

```ts
export default defineConfig({
  launch: {
    chrome: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    firefox: "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
  },
});
```

macOS / Linux:

```ts
export default defineConfig({
  launch: {
    chrome: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    firefox: "/usr/bin/firefox",
  },
});
```

### Only the browser you use

With `extenzo dev -b chrome` only `launch.chrome` is needed; with `-b firefox` only `launch.firefox`.

## Related

- HMR and reload in dev are handled by [@extenzo/plugin-hmr](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/plugin-hmr); no extra launch config is required.
