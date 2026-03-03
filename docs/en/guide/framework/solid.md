# Solid

Add `@rsbuild/plugin-babel` and `@rsbuild/plugin-solid` to **plugins** in `exo.config.ts` to enable Solid and JSX/TSX. Solid's JSX requires Babel, so both plugins are needed.

## Setup

```bash
pnpm add solid-js @rsbuild/plugin-babel @rsbuild/plugin-solid -D
```

```ts
// exo.config.ts
import { defineConfig } from "extenzo";
import { pluginBabel } from "@rsbuild/plugin-babel";
import { pluginSolid } from "@rsbuild/plugin-solid";

export default defineConfig({
  plugins: [
    pluginBabel({ include: /\.(?:jsx|tsx)$/ }),
    pluginSolid(),
  ],
});
```

## Related

- [Basics](/guide/manifest), [entry](/guide/entry).
