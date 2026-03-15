# hotReload

`hotReload` 用于配置 **开发模式下的热重载行为**：包括 HMR WebSocket 所使用的端口，以及当 content 入口变化时是否自动刷新当前标签页。

## 类型与默认值

- **类型**：

  ```ts
  hotReload?: {
    port?: number;
    autoRefreshContentPage?: boolean;
  };
  ```

- **默认值**：
  - `port`: `23333`（与核心常量 `HMR_WS_PORT` 一致）
  - `autoRefreshContentPage`: `true`

## 作用

- 仅在 **`extenzo dev`** 时生效：
  - `port`：作为 HMR 插件启动的 WebSocket 服务端口
  - `autoRefreshContentPage`：当 **content 入口** 发生变更时，是否由 reload manager 自动刷新当前活动标签页
- 对 `extenzo build` **无影响**。

## 示例

### 修改 HMR 端口

```ts
export default defineConfig({
  hotReload: {
    port: 30001,
  },
});
```

### 关闭 content 页自动刷新

```ts
export default defineConfig({
  hotReload: {
    autoRefreshContentPage: false,
  },
});
```

### 同时修改端口并关闭自动刷新

```ts
export default defineConfig({
  hotReload: {
    port: 31000,
    autoRefreshContentPage: false,
  },
});
```

## 相关配置

- [`launch`](/config/launch)：决定 dev 模式下启动哪个浏览器（也可用 CLI `-l/--launch`）。
- 开发插件 [@extenzo/rsbuild-plugin-extension-hmr](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/rsbuild-plugin-extension-hmr) 实际消费该配置。
