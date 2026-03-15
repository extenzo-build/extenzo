# debug

`debug` 用于在 **开发模式** 下启用扩展的**错误监控面板**，通过注入 `@extenzo/rsbuild-plugin-extension-monitor` 插件，将浏览器扩展运行时错误集中输出到面板与终端，便于配合 AI 调试。

## 类型与默认值

- **类型**：`boolean | undefined`
- **默认值**：`false`
- **CLI 等价**：命令行参数 `--debug` 等价于在配置中写 `debug: true`，并且在该次运行中优先级更高。

## 作用

- 当 `debug` 为 `true`（或使用 CLI `--debug`）且命令为 `extenzo dev` 时：
  - 流水线会注入 `@extenzo/rsbuild-plugin-extension-monitor` 插件。
  - 开发过程中，扩展的错误会被收集并输出到：
    - 浏览器中的错误监控 UI（独立面板/覆盖层，视具体实现而定）；
    - 终端中的结构化错误块，适合直接复制给「Ask AI」。
- 当 `debug` 为 `false` 或未配置时：
  - 不注入 monitor 插件，`extenzo dev` 行为与普通模式一致。
- 对 `extenzo build` **无影响**，monitor 仅在 dev 时启用。

## 示例

### 在配置中始终开启调试面板

```ts
export default defineConfig({
  debug: true,
});
```

### 仅在需要时通过 CLI 开启

```bash
extenzo dev --debug
```

不需要在 config 中写 `debug`，适合临时调试使用。

## 相关

- CLI 解析器会将 `--debug` 映射为与 `debug: true` 相同的行为。
- 开发插件 [@extenzo/rsbuild-plugin-extension-monitor](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/rsbuild-plugin-extension-monitor) 实现具体的错误收集与展示。
