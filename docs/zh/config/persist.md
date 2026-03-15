# persist

`persist` 用于控制 **Chromium 系浏览器在开发模式下是否复用用户数据目录**。它只影响 `extenzo dev`，且仅对 Chromium 家族（Chrome / Edge / Brave / 等）生效。

## 类型与默认值

- **类型**：`boolean | undefined`
- **默认值**：`false`
- **CLI 优先级**：命令行 `-p/--persist` 的优先级 **高于** config；一旦使用 CLI 开启，该次运行视为持久化。

## 作用

- 当 `persist: true`（或使用 CLI `--persist`）时：
  - dev 模式会在内部缓存路径下**持久化**一个 Chromium 用户数据目录，使得：
    - 扩展安装状态
    - 扩展本身的设置
    - 登录态与 cookies
    在多次 `extenzo dev` 之间得以保留。
- 当为 `false` 或未配置时：
  - 每次 `extenzo dev` 启动都会使用一个全新的临时用户数据目录，退出后可被清理。
- 对 Firefox 无影响；Firefox 的 profile 管理由 `web-ext` 负责。

## 示例

### 在配置中开启持久化

```ts
export default defineConfig({
  persist: true,
});
```

### 临时通过 CLI 开启持久化

```bash
extenzo dev --persist
# 或
extenzo dev -p
```

该次运行中，即使 config 中未配置 `persist` 或为 `false`，也会启用持久化。

## 相关

- 开发插件 [@extenzo/rsbuild-plugin-extension-hmr](https://github.com/extenzo-build/extenzo/tree/main/packages/plugins/rsbuild-plugin-extension-hmr) 会使用该持久化配置。
