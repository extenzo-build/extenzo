import { resolve } from "path";
import type { RsbuildConfig } from "@rsbuild/core";
import {
  CliParser,
  ConfigLoader,
  mergeRsbuildConfig,
  HMR_WS_PORT,
} from "@extenzo/core";
import type { PipelineContext } from "@extenzo/core";
import { entryPlugin } from "@extenzo/plugin-entry";
import { extensionPlugin } from "@extenzo/plugin-extension";
import { hmrPlugin } from "@extenzo/plugin-hmr";
import { getVueRsbuildPlugins } from "@extenzo/plugin-vue";
import { getReactRsbuildPlugins } from "@extenzo/plugin-react";
import { ensureDependencies } from "./ensureDeps.js";

type LoosePlugin = RsbuildConfig["plugins"] extends (infer P)[] ? P : never;

function isHmrPlugin(p: unknown): boolean {
  if (!p || typeof p !== "object") return false;
  const obj = p as { constructor?: { name?: string }; name?: string };
  const byConstructor = obj.constructor?.name === "HotModuleReplacementPlugin";
  const byName = obj.name === "HotModuleReplacementPlugin";
  return Boolean(byConstructor || byName);
}

/**
 * 禁用 Rspack 的 HMR，避免 dist 下生成 *.hot-update.js / *.hot-update.json 并触发循环构建。
 *
 * 根因简述：我们用的是「Rsbuild 的 build watch」（extenzo dev → rsbuild.build({ watch: true })），
 * 不启 dev server。Rspack 在 watch 模式下仍可能被注入 HotModuleReplacementPlugin（或受 dev 配置影响），
 * 每次增量构建会往输出目录写 hot-update 文件；若 watch 未正确忽略该目录，会再次触发构建，形成循环并堆积大量无用 js。
 * 引入 PostCSS 配置（如 @tailwindcss/postcss）会扩大 CSS 依赖与增量构建频率，使该问题更易复现。
 * 因此在此处强制关闭 devServer.hot 并移除 HMR 插件。
 */
function disableRspackHmr(rspackConfig: unknown): void {
  const c = rspackConfig as {
    devServer?: { hot?: boolean };
    plugins?: unknown[];
  };
  if (c.devServer) c.devServer.hot = false;
  else (c as Record<string, unknown>).devServer = { hot: false };
  if (Array.isArray(c.plugins))
    c.plugins = c.plugins.filter((p: unknown) => !isHmrPlugin(p));
}

/**
 * 构建流水线：串联 CLI 解析 → 配置加载 → Rsbuild 配置生成 → 钩子执行。
 */
export class Pipeline {
  constructor(
    private readonly configLoader: ConfigLoader = new ConfigLoader(),
    private readonly cliParser: CliParser = new CliParser()
  ) {}

  async run(root: string, argv: string[]): Promise<PipelineContext> {
    const parseResult = this.cliParser.parse(argv);
    if (parseResult.unknownBrowser) {
      console.warn(
        `Unknown browser "${parseResult.unknownBrowser}", use chrome or firefox. Defaulting to chromium.`
      );
    }
    process.env.BROWSER = parseResult.browser;

    const { config, baseEntries, entries } = this.configLoader.resolve(root);
    await ensureDependencies(root, config);
    const outDir = config.outDir;
    const outputRoot = config.outputRoot;
    const distPath = resolve(root, outputRoot, outDir);
    const isDev = parseResult.command === "dev";

    let baseConfig = this.buildBaseRsbuildConfig({ root, config, baseEntries, entries });
    baseConfig = await this.applyUserRsbuildConfig(baseConfig, config);
    baseConfig = this.injectHmrForDev(baseConfig, {
      root,
      command: parseResult.command,
      browser: parseResult.browser,
      config,
      baseEntries,
      entries,
      rsbuildConfig: baseConfig,
      isDev,
      distPath,
    });

    const ctx: PipelineContext = {
      root,
      command: parseResult.command,
      browser: parseResult.browser,
      config,
      baseEntries,
      entries,
      rsbuildConfig: baseConfig,
      isDev,
      distPath,
    };

    await config.hooks?.afterCliParsed?.(ctx);
    await config.hooks?.afterConfigLoaded?.(ctx);
    await config.hooks?.beforeRsbuildConfig?.(ctx);
    await config.hooks?.beforeBuild?.(ctx);

    return ctx;
  }

  private expandFrameworkPlugins(
    userPlugins: RsbuildConfig["plugins"] | undefined,
    appRoot: string
  ): LoosePlugin[] {
    const out: LoosePlugin[] = [];
    const list = userPlugins ?? [];
    const arr = Array.isArray(list) ? list : [list];
    for (const p of arr) {
      const name = (p as { name?: string } | null)?.name;
      if (name === "extenzo-vue") {
        const vuePlugins = getVueRsbuildPlugins(appRoot);
        if (Array.isArray(vuePlugins)) out.push(...(vuePlugins as LoosePlugin[]));
      }
      if (name === "extenzo-react") {
        const reactPlugins = getReactRsbuildPlugins(appRoot);
        if (Array.isArray(reactPlugins)) out.push(...(reactPlugins as LoosePlugin[]));
      }
      out.push(p as LoosePlugin);
    }
    return out;
  }

  private buildBaseRsbuildConfig(
    ctx: Pick<PipelineContext, "root" | "config" | "baseEntries" | "entries">
  ): RsbuildConfig {
    const expanded = this.expandFrameworkPlugins(ctx.config.plugins, ctx.root);
    const plugins: RsbuildConfig["plugins"] = [
      entryPlugin(ctx.config, ctx.entries),
      ...expanded,
      extensionPlugin(ctx.config, ctx.entries),
    ];
    return { root: ctx.root, plugins };
  }

  private async applyUserRsbuildConfig(
    base: RsbuildConfig,
    config: PipelineContext["config"]
  ): Promise<RsbuildConfig> {
    const user = config.rsbuildConfig ?? config.rsbuild;
    if (typeof user === "function") return user(base);
    if (user && typeof user === "object") return mergeRsbuildConfig(base, user);
    return base;
  }

  private injectHmrForDev(
    baseConfig: RsbuildConfig,
    ctx: PipelineContext
  ): RsbuildConfig {
    if (!ctx.isDev) return baseConfig;
    const prevRspack = baseConfig.tools?.rspack;
    const hmrOpts = {
      distPath: ctx.distPath,
      autoOpen: true,
      browser: ctx.browser,
      chromePath: ctx.config.launch?.chrome,
      firefoxPath: ctx.config.launch?.firefox,
      wsPort: HMR_WS_PORT,
      enableReload: true,
    };
    return {
      ...baseConfig,
      dev: {
        ...baseConfig.dev,
        hmr: false,
        liveReload: false,
      },
      tools: {
        ...baseConfig.tools,
        rspack: ((rspackConfig: unknown, utils: { appendPlugins?: (p: unknown) => void }) => {
          let result = rspackConfig;
          if (typeof prevRspack === "function") {
            result =
              (prevRspack as (c: unknown, e: unknown) => unknown)(rspackConfig, utils) ??
              rspackConfig;
          }
          disableRspackHmr(result);
          if (utils?.appendPlugins) utils.appendPlugins(hmrPlugin(hmrOpts));
          return result;
        }) as RsbuildConfig["tools"] extends { rspack?: infer R } ? R : never,
      },
    };
  }
}

const defaultPipeline = new Pipeline();

export function runPipeline(root: string, argv: string[]): Promise<PipelineContext> {
  return defaultPipeline.run(root, argv);
}
