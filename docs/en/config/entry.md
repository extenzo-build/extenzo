# entry

`entry` defines the **entry map**: keys are entry names, values are **paths relative to baseDir** (script or HTML). When omitted, the framework discovers `background`, `content`, `popup`, `options`, `sidepanel`, `devtools` under [srcDir](/config/src-dir) (or project root) by directory name.

## Type and baseDir

- **Type**: `Record<string, string> | undefined`
- **baseDir**: When [srcDir](/config/src-dir) is not set, baseDir = project root; when set, baseDir = `srcDir`. All entry values are **relative to baseDir**.

## Reserved entry names

These names are fixed by the extension spec and framework:

| Name | Type | Description |
|------|------|--------------|
| `background` | Script only | Service worker / background script |
| `content` | Script only | Content script |
| `popup` | HTML entry | Popup; HTML is the entry (e.g. `popup/index.html`) |
| `options` | HTML entry | Options page; same |
| `sidepanel` | HTML entry | Side panel; same |
| `devtools` | HTML entry | DevTools page; same |

Other names can be **custom entries** (e.g. `capture`, `offscreen`) as long as the directory has the corresponding script or HTML.

## Path rules

- **Script entry**: value is a `.js`, `.jsx`, `.ts`, or `.tsx` path. Only `background` and `content` are script-only.
- **HTML entry**: value is an `.html` path. For `popup`, `options`, `sidepanel`, `devtools`, the HTML file is the entry; any scripts are included in the HTML if needed.

## When entry is omitted

The framework scans baseDir and discovers the reserved names (e.g. `background/index.ts`, `popup/index.html`, `options/index.html`).

## Examples

### Default discovery (no entry config)

```
src/
  background/index.ts
  content/index.ts
  popup/index.html
  options/index.html
  sidepanel/index.html
```

No `entry` needed in config. HTML entries use the page file; scripts, if any, are included in the HTML.

### Custom entries and overrides

```ts
// ext.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  srcDir: "src",
  entry: {
    background: "background/index.ts",
    content: "content/index.ts",
    popup: "popup/index.html",
    options: "options/index.html",
    sidepanel: "sidepanel/index.html",
    capture: "capture/capture.html",
    offscreen: "offscreen/offscreen.html",
  },
});
```

When `entry` is set, **only** the declared entries are used. You can mix reserved and custom names.

## Related

- [srcDir](/config/src-dir): baseDir for entry paths.
- [manifest](/config/manifest): Framework fills manifest paths from entry and [outDir](/config/out-dir).
