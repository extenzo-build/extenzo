# React example with entry: false

This example uses **extenzo** with `entry: false`. The framework does not discover or inject entries; all entry points are configured manually in **rsbuildConfig**.

## What the framework still does

- **Manifest**: resolved from config and written to the output dir (no `[exo.xxx]` placeholders; paths are literal).
- **Hot reload**: WebSocket + auto-launch browser in dev.
- **debug / hotReload / appDir / outDir**: still read from exo.config.

## Entry configuration

Entries are set in `exo.config.ts` under `rsbuildConfig.source.entry`:

- **popup** → `./app/popup/index.tsx` (generates `popup/index.html` + `popup/index.js`)
- **options** → `./app/options/index.tsx` (generates `options/index.html` + `options/index.js`)
- **background** → `./app/background/index.ts` with `html: false` → `background/index.js`
- **content** → `./app/content/index.ts` with `html: false` → `content/index.js`

Output is written to `.extenzo/dist` with nested HTML and custom JS/CSS filenames so the manifest paths match.

## Run

```bash
pnpm install   # from extenzo repo root
cd examples/react-entry-false
pnpm run dev   # or pnpm run build
```

Load the extension from `.extenzo/dist` (unpacked) or use `extenzo dev` to open the browser automatically.
