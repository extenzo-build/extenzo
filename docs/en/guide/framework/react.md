# React

Add `@rsbuild/plugin-react` to **plugins** in `exo.config.ts` to enable React and JSX/TSX.

## Setup

```bash
pnpm add react react-dom @rsbuild/plugin-react -D
```

```ts
// exo.config.ts
import { defineConfig } from "extenzo";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
});
```

## Related

- [Basics](/guide/manifest), [entry](/guide/entry).
