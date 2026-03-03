# Preact

Add `@rsbuild/plugin-preact` to **plugins** in `exo.config.ts` to enable Preact and JSX/TSX.

## Setup

```bash
pnpm add preact @rsbuild/plugin-preact -D
```

```ts
// exo.config.ts
import { defineConfig } from "extenzo";
import { pluginPreact } from "@rsbuild/plugin-preact";

export default defineConfig({
  plugins: [pluginPreact()],
});
```

## Related

- [Basics](/guide/manifest), [entry](/guide/entry).
