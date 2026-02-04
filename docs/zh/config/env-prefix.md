# envPrefix

`envPrefix` 指定从 `.env` 文件中加载并注入到**客户端代码**（background、content、popup、options 等）的环境变量名前缀。框架会将该配置传给 Rsbuild 的 `loadEnv`，只有以指定前缀开头的变量才会被注入到 `process.env`，用于控制哪些环境变量对扩展前端可见，避免密钥泄露。

## 类型与默认值

- **类型**：`string[] | undefined`
- **默认值**：`['']`（空字符串前缀，即**暴露所有** `.env` 中的变量）
- **建议**：生产环境或含敏感信息时，使用 `['PUBLIC_']` 等前缀，仅暴露 `PUBLIC_*` 变量。

## 作用

- 从项目根目录的 `.env`、`.env.local`、`.env.[mode]` 等文件中读取环境变量。
- 仅将**以 envPrefix 中任一前缀开头**的变量注入到构建产物中的 `process.env.*`。
- 未配置或为 `['']` 时，所有 .env 中的变量都会注入；设为 `['PUBLIC_']` 时，只有 `PUBLIC_API_URL` 等会被注入，`API_SECRET` 不会暴露给前端。

## 示例

### 仅暴露 PUBLIC_ 前缀（推荐）

```ts
// ext.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  envPrefix: ["PUBLIC_"],
});
```

`.env` 示例：

```properties
PUBLIC_API_URL=https://api.example.com
API_SECRET=do-not-expose
```

在 background/content/popup 中只有 `process.env.PUBLIC_API_URL` 可用，`API_SECRET` 不会被打包进前端。

### 暴露多个前缀

```ts
// ext.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  envPrefix: ["PUBLIC_", "VITE_"],
});
```

以 `PUBLIC_` 或 `VITE_` 开头的变量都会被注入。

### 默认暴露全部（不推荐含敏感信息时使用）

```ts
// ext.config.ts
import { defineConfig } from "extenzo";

export default defineConfig({
  // envPrefix 不写或为 ['']：.env 中所有变量都会注入到客户端
});
```

## 相关配置

- [launch](/config/launch)：开发时浏览器路径；也可通过 .env 的 `BROWSER_CHROME`、`BROWSER_FIREFOX` 配置，与 envPrefix 无关（框架单独读取）。
