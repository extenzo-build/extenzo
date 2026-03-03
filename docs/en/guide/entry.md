# Entry

`entry` defines the **entry map**: keys are entry names, values are **JS/TS script paths** or **structured objects** relative to baseDir. When omitted, the framework discovers `background`, `content`, `popup`, `options`, `sidepanel`, `devtools` under [appDir](/guide/app-dir) (default `app/`) by directory name.

## Type and baseDir

- **Type**: `Record<string, string | { src: string; html?: boolean | string }> | undefined`
- **baseDir**: When [appDir](/guide/app-dir) is not set, baseDir = `app/`; when set, baseDir = `appDir`. All entry values are **relative to baseDir**.

## Reserved entry names

| Name | Type | Description |
|------|------|--------------|
| `background` | Script only | Service worker / background script |
| `content` | Script only | Content script |
| `popup` | Script + HTML | Popup page |
| `options` | Script + HTML | Options page |
| `sidepanel` | Script + HTML | Side panel |
| `devtools` | Script + HTML | DevTools page |

Other names can be **custom entries** (e.g. `capture`, `offscreen`).

## Path rules

- **JS/TS entry only**: the real entry is always JS/TS. HTML is **template only**.
- **Single main entry**: HTML templates must include **one** `<script>` with `data-extenzo-entry`.

## Related

- [appDir](/guide/app-dir), [manifest](/guide/manifest).
