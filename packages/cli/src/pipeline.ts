import { resolve } from "path";
import type { RsbuildConfig } from "@rsbuild/core";
import {
  CliParser,
  ConfigLoader,
  mergeRsbuildConfig,
  HMR_WS_PORT,
  DEFAULT_BROWSER,
  warn,
} from "@extenzo/core";
import type {
  PipelineContext,
  RsbuildConfigHelpers,
  LaunchTarget,
  BrowserTarget,
} from "@extenzo/core";
import { entryPlugin } from "@extenzo/rsbuild-plugin-extension-entry";
import { extensionPlugin } from "@extenzo/rsbuild-plugin-extension-manifest";
import { hmrPlugin, type HmrPluginOptions } from "@extenzo/rsbuild-plugin-extension-hmr";
import { monitorPlugin } from "@extenzo/rsbuild-plugin-extension-monitor";
import { getVueRsbuildPlugins } from "@extenzo/rsbuild-plugin-vue";
import { ensureDependencies } from "./ensureDeps.ts";

type LoosePlugin = RsbuildConfig["plugins"] extends (infer P)[] ? P : never;

/** Browser name → build target lookup table. */
const BROWSER_TO_TARGET: Record<string, BrowserTarget> = {
  firefox: "firefox",
  chromium: "chromium",
  chrome: "chromium",
  edge: "chromium",
  brave: "chromium",
  vivaldi: "chromium",
  opera: "chromium",
  santa: "chromium",
};

/** Browser name → launch target lookup table. */
const BROWSER_TO_LAUNCH: Record<string, LaunchTarget> = {
  chromium: "chrome",
  chrome: "chrome",
  edge: "edge",
  brave: "brave",
  vivaldi: "vivaldi",
  opera: "opera",
  santa: "santa",
  firefox: "firefox",
};

/**
 * writeToDisk filter for dev mode: skip HMR hot-update temp files
 * to avoid output dir clutter and watch false triggers.
 * Exported for tests.
 */
export function devWriteToDiskFilter(filename: string): boolean {
  return !filename.includes(".hot-update.");
}

/**
 * Build pipeline: CLI parse → config load → Rsbuild config generation → hooks execution.
 */
export class Pipeline {
  constructor(
    private readonly configLoader: ConfigLoader = new ConfigLoader(),
    private readonly cliParser: CliParser = new CliParser()
  ) {}

  async run(root: string, argv: string[]): Promise<PipelineContext> {
    const parseResult = this.cliParser.parse(argv);
    this.warnUnknownArgs(parseResult);

    const { config: rawConfig, baseEntries, entries } = this.configLoader.resolve(root);
    const config = parseResult.debug === true ? { ...rawConfig, debug: true } : rawConfig;
    const report = this.resolveReport(parseResult.report, config.report);
    await ensureDependencies(root, config);

    const outDir = config.outDir;
    const outputRoot = config.outputRoot;
    const distPath = resolve(root, outputRoot, outDir);
    const isDev = parseResult.command === "dev";
    const configBrowser = this.getConfigBrowser(config);
    const launchTarget = this.resolveLaunchTarget(parseResult.launch, configBrowser);
    const browser = this.resolveTarget(parseResult.target, launchTarget, configBrowser);
    const persist = this.resolvePersist(parseResult.persist, config.persist);

    const base = this.buildBaseRsbuildConfig({ root, config, baseEntries, entries, browser, isDev });
    const userConfig = await this.resolveUserRsbuildConfig(base, config);

    const hmrCtx: PipelineContext = {
      root, command: parseResult.command, browser, launchTarget,
      launchRequested: false, persist, report, config, baseEntries, entries,
      rsbuildConfig: base, isDev, distPath,
    };

    const hmrOverrides = this.buildHmrOverrides(isDev, hmrCtx);
    const merged = mergeRsbuildConfig(base, userConfig);
    const baseConfig = hmrOverrides ? mergeRsbuildConfig(merged, hmrOverrides) : merged;
    const rsbuildConfig = report
      ? await this.mergeRsdoctorPlugin(baseConfig, root, outputRoot)
      : baseConfig;

    const ctx: PipelineContext = {
      ...hmrCtx,
      launchRequested: Boolean(parseResult.launch),
      rsbuildConfig,
    };

    await config.hooks?.afterCliParsed?.(ctx);
    await config.hooks?.afterConfigLoaded?.(ctx);
    await config.hooks?.beforeRsbuildConfig?.(ctx);
    await config.hooks?.beforeBuild?.(ctx);

    return ctx;
  }

  private warnUnknownArgs(parseResult: ReturnType<CliParser["parse"]>): void {
    if (parseResult.unknownLaunch) {
      warn("Unknown launch", parseResult.unknownLaunch, ", use chrome/edge/brave/vivaldi/opera/santa/firefox. Defaulting to chrome.");
    }
    if (parseResult.unknownTarget) {
      warn("Unknown target", parseResult.unknownTarget, ", use chromium or firefox. Defaulting to chromium.");
    }
  }

  /** Expand framework plugins (e.g. extenzo-vue → actual Rsbuild Vue plugins). */
  private expandFrameworkPlugins(
    userPlugins: RsbuildConfig["plugins"] | undefined,
    appRoot: string
  ): LoosePlugin[] {
    const out: LoosePlugin[] = [];
    const list = userPlugins ?? [];
    const arr = Array.isArray(list) ? list : [list];
    for (const p of arr) {
      const name = (p as { name?: string } | null)?.name;
      if (name === "rsbuild-plugin-vue") {
        const vuePlugins = getVueRsbuildPlugins(appRoot);
        if (Array.isArray(vuePlugins)) out.push(...(vuePlugins as LoosePlugin[]));
      }
      out.push(p as LoosePlugin);
    }
    return out;
  }

  private buildBaseRsbuildConfig(
    ctx: Pick<PipelineContext, "root" | "config" | "baseEntries" | "entries" | "browser" | "isDev">
  ): RsbuildConfig {
    const expanded = this.expandFrameworkPlugins(ctx.config.plugins, ctx.root);
    const useEntryPlugin = (ctx.config as { entry?: Record<string, unknown> | false }).entry !== false;
    const plugins: RsbuildConfig["plugins"] = [
      ...(useEntryPlugin ? [entryPlugin(ctx.config, ctx.entries)] : []),
      ...expanded,
      ...(ctx.isDev && ctx.config.debug === true ? [monitorPlugin(ctx.config, ctx.entries)] : []),
      extensionPlugin(ctx.config, ctx.entries, ctx.browser),
    ];
    return {
      root: ctx.root,
      plugins,
      output: {
        legalComments: "none",
        sourceMap: ctx.isDev ? { js: "inline-source-map" } : false,
      },
    };
  }

  /** Resolve user rsbuildConfig: object returned as-is; function form called with base and helpers. */
  private async resolveUserRsbuildConfig(
    base: RsbuildConfig,
    config: PipelineContext["config"]
  ): Promise<RsbuildConfig> {
    const user = config.rsbuildConfig ?? config.rsbuild;
    if (typeof user === "function") {
      const helpers: RsbuildConfigHelpers = { merge: mergeRsbuildConfig };
      return user(base, helpers);
    }
    if (user && typeof user === "object") return user;
    return {};
  }

  /** Build HMR overrides config for dev mode. */
  private buildHmrOverrides(isDev: boolean, ctx: PipelineContext): RsbuildConfig | undefined {
    if (!isDev) return undefined;
    const isConfigRestart = process.env.EXO_CONFIG_RESTART === "1";
    const hmrOpts: HmrPluginOptions = {
      distPath: ctx.distPath,
      autoOpen: !isConfigRestart,
      browser: ctx.launchTarget,
      chromePath: ctx.config.launch?.chrome,
      edgePath: ctx.config.launch?.edge,
      bravePath: ctx.config.launch?.brave,
      vivaldiPath: ctx.config.launch?.vivaldi,
      operaPath: ctx.config.launch?.opera,
      santaPath: ctx.config.launch?.santa,
      firefoxPath: ctx.config.launch?.firefox,
      persist: ctx.persist,
      wsPort: ctx.config.hotReload?.port ?? HMR_WS_PORT,
      enableReload: true,
      autoRefreshContentPage: ctx.config.hotReload?.autoRefreshContentPage ?? true,
    };
    return {
      dev: { hmr: false, liveReload: false, writeToDisk: devWriteToDiskFilter },
      server: { printUrls: false },
      plugins: [hmrPlugin(hmrOpts) as LoosePlugin],
    };
  }

  /** Resolve launch browser: -l > config.browser > default chrome. */
  private resolveLaunchTarget(cliLaunch: LaunchTarget | undefined, configBrowser: string | undefined): LaunchTarget {
    if (cliLaunch) return cliLaunch;
    return this.parseConfigLaunch(configBrowser) ?? "chrome";
  }

  /** Resolve build target: -t > config.browser > inferred from -l > default chromium. */
  private resolveTarget(
    cliTarget: BrowserTarget | undefined,
    launchTarget: LaunchTarget,
    configBrowser: string | undefined
  ): BrowserTarget {
    return cliTarget
      ?? this.configBrowserToTarget(configBrowser)
      ?? (launchTarget === "firefox" ? "firefox" : "chromium");
  }

  private configBrowserToTarget(value: string | undefined): BrowserTarget | null {
    if (!value) return null;
    return BROWSER_TO_TARGET[value.trim().toLowerCase()] ?? null;
  }

  private parseConfigLaunch(value: string | undefined): LaunchTarget | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    const target = BROWSER_TO_LAUNCH[normalized];
    if (target) return target;
    warn("Unknown config.browser", value, ", use chrome/edge/brave/vivaldi/opera/santa/firefox. Defaulting to chrome.");
    return null;
  }

  private resolvePersist(cliPersist: boolean | undefined, configPersist: boolean | undefined): boolean {
    return Boolean(cliPersist || configPersist);
  }

  private resolveReport(cliReport: boolean | undefined, configReport: boolean | undefined): boolean {
    return Boolean(cliReport || configReport);
  }

  /**
   * When report is true, add Rsdoctor plugin with reportDir under .extenzo/report (outputRoot/report)
   * so report output is not inside dist (plugin default uses build output path).
   */
  private async mergeRsdoctorPlugin(
    config: RsbuildConfig,
    root: string,
    outputRoot: string
  ): Promise<RsbuildConfig> {
    const reportDir = resolve(root, outputRoot, "report");
    const { RsdoctorRspackPlugin } = await import("@rsdoctor/rspack-plugin");
    const tools = config.tools as { rspack?: { plugins?: unknown[] } } | undefined;
    const existing = tools?.rspack?.plugins ?? [];
    const rsdoctorPlugin = new RsdoctorRspackPlugin({
      output: { reportDir },
      mode: 'brief'
    });
    return mergeRsbuildConfig(config, {
      tools: {
        rspack: {
          plugins: [...existing, rsdoctorPlugin],
        },
      },
    } as RsbuildConfig);
  }

  private getConfigBrowser(config: PipelineContext["config"]): string | undefined {
    const v = config.browser;
    return typeof v === "string" ? v : undefined;
  }
}

const defaultPipeline = new Pipeline();

export function runPipeline(root: string, argv: string[]): Promise<PipelineContext> {
  return defaultPipeline.run(root, argv);
}
