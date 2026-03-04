# Hot reload (HMR)

`extenzo dev` uses **build watch**: on each change the project is rebuilt, then a WebSocket notifies the extension to reload, giving a hot-reload experience.

## Mechanism

- **Build**: Rsbuild runs in watch mode; output goes to [output](/guide/output) (default `.extenzo/dist`).
- **Reload**: The built-in **plugin-extension-hmr** starts a WebSocket; after each build it signals the extension to reload.
- **Browser**: The first build can auto-open the browser and load the extension via [launch](/guide/launch).

## Usage

```bash
extenzo dev
```

Use `-l chrome` or `-l firefox` to choose the browser.

## Note

- HMR is **dev-only**; production build is full bundle for consistency.
