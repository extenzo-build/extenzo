# Svelte

Add `@rsbuild/plugin-svelte` to **plugins** in `exo.config.ts` to enable Svelte (`.svelte` files).

## Setup

```bash
pnpm add svelte @rsbuild/plugin-svelte -D
```

```ts
// exo.config.ts
import { defineConfig } from "extenzo";
import { pluginSvelte } from "@rsbuild/plugin-svelte";

export default defineConfig({
  plugins: [pluginSvelte()],
});
```

## Related

- [Basics](/guide/manifest), [entry](/guide/entry).
