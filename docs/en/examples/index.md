# Examples

This page lists extension examples in the extenzo repo. Each example is a separate directory with its own `package.json` and `ext.config.ts`. Run `pnpm install` in the repo root, then `pnpm dev` / `pnpm build` in the example directory.

| Example | Description | Repo link |
|---------|-------------|-----------|
| **vue-template** | Vue 3 template: popup, options, content, background with simple messaging. | [examples/vue-template](https://github.com/extenzo-build/extenzo/tree/main/examples/vue-template) |
| **react-template** | React template: popup, options, content, background with simple messaging. | [examples/react-template](https://github.com/extenzo-build/extenzo/tree/main/examples/react-template) |
| **react-shadcn** | React + shadcn/ui: popup, options, content, background, sidepanel; Tailwind + component library. | [examples/react-shadcn](https://github.com/extenzo-build/extenzo/tree/main/examples/react-shadcn) |
| **devtools-native-ts** | Plain TypeScript: background + devtools_page only, no React/Vue; demonstrates a DevTools extension. | [examples/devtools-native-ts](https://github.com/extenzo-build/extenzo/tree/main/examples/devtools-native-ts) |

## How to run

From the extenzo repo root, run `pnpm install`, then go to an example directory:

```bash
cd examples/vue-template   # or another example
pnpm dev                   # dev mode
pnpm build                 # build
```

Output goes to `.extenzo/dist` (or the example’s outputRoot/outDir). Load that directory in the browser; with `pnpm dev`, the framework can open the browser and load the extension automatically.
