# Browser launch (launch)

`launch` specifies the **Chrome / Edge / Brave / Vivaldi / Opera / Santa / Firefox executable paths** used by `extenzo dev` to open the browser and load the extension. If not set, the framework tries **default install paths** for the current OS.

## Type and default

- **Type**: `{ chrome?: string; edge?: string; ...; firefox?: string } | undefined`
- **Default**: OS-specific default paths. If none exist, `extenzo dev` logs a warning and skips auto-opening.

## Role

- Only affects **extenzo dev**; [plugin-extension-hmr](/guide/hmr) uses it after the first build.

## Example

```ts
export default defineConfig({
  launch: {
    chrome: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    firefox: "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
  },
});
```

Use `extenzo dev -l chrome` or `extenzo dev -l firefox` to choose the browser.
