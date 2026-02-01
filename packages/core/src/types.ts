import type { RsbuildConfig } from "@rsbuild/core";
import type { BrowserTarget, CliCommand } from "./constants.js";

/** Manifest content; can be a single object or split by chromium/firefox */
export type ManifestConfig =
  | Record<string, unknown>
  | {
      chromium?: Record<string, unknown>;
      firefox?: Record<string, unknown>;
    };

/** 生命周期钩子：各阶段可扩展逻辑 */
export interface LifecycleHooks {
  /** CLI 参数解析完成后 */
  afterCliParsed?: (ctx: PipelineContext) => void | Promise<void>;
  /** 配置加载并解析入口完成后 */
  afterConfigLoaded?: (ctx: PipelineContext) => void | Promise<void>;
  /** manifest 与合并入口确定后、Rsbuild 配置生成前 */
  beforeRsbuildConfig?: (ctx: PipelineContext) => void | Promise<void>;
  /** Rsbuild 配置就绪、执行构建前 */
  beforeBuild?: (ctx: PipelineContext) => void | Promise<void>;
  /** 构建完成后（仅 build 命令；dev 为 watch 不结束） */
  afterBuild?: (ctx: PipelineContext) => void | Promise<void>;
}

/** 流水线上下文：从解析 CLI 到构建各阶段共享 */
export interface PipelineContext {
  root: string;
  command: CliCommand;
  browser: BrowserTarget;
  /** 解析出的原始用户配置（含 hooks） */
  config: ExtenzoResolvedConfig;
  /** 发现的基础入口（仅从目录发现，未合并 entry 配置） */
  baseEntries: EntryInfo[];
  /** 最终入口列表（发现 + entry 配置合并后） */
  entries: EntryInfo[];
  /** 最终传给 Rsbuild 的配置 */
  rsbuildConfig: RsbuildConfig;
  /** 是否开发模式 */
  isDev: boolean;
  /** 输出目录绝对路径 */
  distPath: string;
}

/** User ext config */
export interface ExtenzoUserConfig {
  /** Extension manifest; single object or chromium/firefox split */
  manifest: ManifestConfig;
  /** Rsbuild plugins array; use function calls like Vite, e.g. plugins: [vue()] */
  plugins?: RsbuildConfig["plugins"];
  /**
   * Override/extend Rsbuild config (like Vite's build.rollupOptions / esbuild).
   * Object: deep-merge with base; function: (base) => config for full control.
   */
  rsbuildConfig?:
    | RsbuildConfig
    | ((base: RsbuildConfig) => RsbuildConfig | Promise<RsbuildConfig>);
  /**
   * 自定义入口：key 为入口名（保留名 popup/options/sidepanel/background/devtools/content 不可改，其余可自定义），
   * value 为相对 baseDir 的路径（未配置 srcDir 时 baseDir=根目录，配置了 srcDir 则 baseDir=srcDir）。
   * 不传则按默认从 baseDir 发现 background/content/popup/options/sidepanel/devtools。
   */
  entry?: Record<string, string>;
  /** Source directory; default project root. 同时作为 entry 路径的查找起点（与根目录二选一） */
  srcDir?: string;
  /**
   * Output directory name under outputRoot (e.g. "dist" → output at .extenzo/dist). Default "dist".
   */
  outDir?: string;
  /**
   * Parent folder for build output; default ".extenzo". Actual output path is outputRoot/outDir.
   */
  outputRoot?: string;
  /**
   * When true or omitted, `extenzo build` packs the output directory into a zip file (e.g. dist.zip).
   * Set to false to disable zip output.
   */
  zip?: boolean;
  /**
   * Browser launch paths for dev mode. Framework uses these to start Chrome/Firefox when running `extenzo dev`.
   * Overrides .env BROWSER_CHROME / BROWSER_FIREFOX when set.
   */
  launch?: {
    chrome?: string;
    firefox?: string;
  };
  /** 生命周期钩子，在各阶段注入扩展逻辑 */
  hooks?: LifecycleHooks;
  /**
   * @deprecated Use rsbuildConfig instead. Kept for compatibility; only function form applies.
   */
  rsbuild?: (base: RsbuildConfig) => RsbuildConfig | Promise<RsbuildConfig>;
}

/** Resolved config with root, srcDir, outDir, outputRoot */
export interface ExtenzoResolvedConfig extends ExtenzoUserConfig {
  srcDir: string;
  outDir: string;
  outputRoot: string;
  root: string;
}

/** Discovered entry info */
export interface EntryInfo {
  name: string;
  scriptPath: string;
  htmlPath?: string;
}
