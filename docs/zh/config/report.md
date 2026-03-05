# 构建报告（Rsdoctor）

启用后，extenzo 会生成 **Rsdoctor** 报告用于构建分析。报告输出在 **`outputRoot/report`**（默认 **`.extenzo/report`**），与 dist 输出分开存放。

## 启用方式

- **CLI**：`extenzo build -r` 或 `extenzo build --report`
- **配置**：在 exo.config 中设置 `report: true`

```ts
export default defineConfig({
  report: true,
});
```

## 输出

- **路径**：`path.resolve(root, outputRoot, "report")`，例如 `.extenzo/report`
- **内容**：Rsdoctor 报告（由 `@rsdoctor/rspack-plugin` 生成）。在浏览器中打开生成的 `index.html` 可查看编译与 bundle 分析。

## 已知限制：Bundle Size 页面

在 **多入口扩展构建**（popup、options、content、background 等）时，Rsdoctor 报告中的 **Bundle Size** 页面可能会报错崩溃：

```text
TypeError: Cannot destructure property 'size' of 'en.find(...)' as it is undefined.
```

原因是 Rsdoctor 客户端在部分 chunk 没有对应 size 数据时未做空值处理，属于上游/客户端问题，而非 extenzo 代码。

**应对方式：**

- 使用报告内其他页面（如 Overview、Modules、Compilation）进行分析。
- 尝试升级 `@rsdoctor/rspack-plugin` / `@rsdoctor/core` 到更新版本。
- 若问题仍存在，可到 [web-infra-dev/rsdoctor](https://github.com/web-infra-dev/rsdoctor) 提交 issue。

## 相关

- [outputRoot](/config/output-root)、[outDir](/config/out-dir)：dist 输出路径。
