# Vue

Add `@extenzo/rsbuild-plugin-vue` to **plugins** in `exo.config.ts` to enable Vue 3 (SFC, Vue runtime).

## Setup

```bash
pnpm add vue @extenzo/rsbuild-plugin-vue -D
```

```ts
// exo.config.ts
import { defineConfig } from "extenzo";
import vue from "@extenzo/rsbuild-plugin-vue";

export default defineConfig({
  plugins: [vue()],
});
```

## Related

- [Basics](/guide/manifest), [entry](/guide/entry).
