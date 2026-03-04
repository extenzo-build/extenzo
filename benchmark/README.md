# Benchmark: 录屏插件 (React + Tailwind)

同一功能的浏览器插件，分别用 **extenzo**、**wxt**、**plasmo** 做 dev 与 build，对比时间与体积。

## 插件功能

- **技术**: React + Tailwind CSS
- **能力**: 录制当前标签页视频（浏览器/插件 API：tabCapture + offscreen + MediaRecorder）
- **存储**: 仅 1 条视频，最大 5MB，存于 IndexedDB
- **页面**: 单独选项页查看/删除已录制视频
- **入口**: options、popup、content、content-ui、background、offscreen

## 目录

- `source/`：共享插件源码（逻辑与 UI）
- `extenzo/`：使用 extenzo 构建的同一插件
- `wxt/`：使用 WXT 构建的同一插件
- `plasmo/`：使用 Plasmo 构建的同一插件

## 使用

在 **extenzo 仓库根目录** 执行：

```bash
# 安装依赖（含各 benchmark 子项目）
pnpm install

# 仅打包对比：打包时间 + 产物体积
node benchmark/run.mjs

# 含 dev 就绪时间（会起 dev 进程直到匹配 ready，较慢）
node benchmark/run.mjs --dev
```

输出示例：

```
========== Benchmark 汇总 ==========
| Framework | Build (s) | 体积 (KB) |
|-----------|-----------|------------|
| extenzo   |      1.32 |      317.3 |
| wxt       |      2.67 |      152.8 |
| plasmo    |      0.57 |       xxx   |
```

## 修改共享源码后

- **extenzo**：需把 `source/` 同步到 `extenzo/app/source/`（或从 `benchmark/source` 拷贝到 `extenzo/app/source`）。
- **wxt / plasmo**：需把 `source/` 同步到各自项目下的 `source/`。

## 指标说明

- **Dev 到浏览器就绪**: 执行 `dev` 到终端出现“就绪”/“built”等的时间（可选，`--dev`）。
- **HMR 时间**: 需手动在 dev 运行时改文件观察热更时间（脚本未自动化）。
- **打包构建时间**: `build` 命令从开始到结束的耗时。
- **打包体积**: 构建产物目录（如 extenzo 的 `.extenzo/dist`、wxt 的 `.output/chrome-mv3`）总大小。
