# Vue 3 + JSX + Less 示例 (vue-jsx)

从 [VideoRoll-Pro](https://github.com/gxy5202/video-roll) 迁移的浏览器扩展示例，使用 **extenzo** 配置构建。

## 技术栈

- Vue 3 + Vue JSX (`@extenzo/plugin-vue` → `@rsbuild/plugin-vue-jsx` + `@rsbuild/plugin-babel`)
- Less (`@rsbuild/plugin-less`)
- Tailwind CSS v4 + PostCSS
- 多入口：background、content、popup、options、sidepanel、offscreen、capture、download、player、favourites

## 脚本

```bash
pnpm install   # 在仓库根目录已执行时，此处可省略
pnpm dev       # 开发模式（watch + 可选 HMR 启动浏览器）
pnpm build     # 生产构建
```

## 配置说明

- `exo.config.ts`：`defineConfig` + `manifest`（chromium/firefox）+ `plugins: [vue(), pluginLess()]` + 自定义 `entry`（capture、download、player、favourites）+ `rsbuildConfig`（alias、copy、output）
- 入口由 extenzo 自动发现（background、content、popup、options、sidepanel、offscreen），额外页面通过 `entry` 配置加入。
- `manifest` 中使用 `[exo.popup]`、`[exo.background]` 等占位符，构建时由 extenzo 替换为实际输出路径。
