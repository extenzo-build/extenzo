import { resolve } from "path";
import type { RsbuildConfig } from "@rsbuild/core";
import {
  CliParser,
  ConfigLoader,
  mergeRsbuildConfig,
  HMR_WS_PORT,
  warn,
  getManifestRecordForTarget,
  createRsdoctorNotInstalledError,
} from "@extenzo/core";
import type {
  PipelineContext,
  RsbuildConfigHelpers,
  LaunchTarget,
  BrowserTarget,
  RsdoctorReportOptions,
} from "@extenzo/core";
import { entryPlugin } from "@extenzo/rsbuild-plugin-extension-entry";
import { extensionPlugin } from "@extenzo/rsbuild-plugin-extension-manifest";
import {
  hmrPlugin,
  type HmrPluginOptions,
  RELOAD_MANAGER_ENTRY_NAMES,
} from "@extenzo/rsbuild-plugin-extension-hmr";
import { monitorPlugin } from "@extenzo/rsbuild-plugin-extension-monitor";
import { getVueRsbuildPlugins } from "@extenzo/rsbuild-plugin-vue";
import { ensureDependencies } from "./ensureDeps.ts";
import { getMissingPackages, getAddCommand, detectFromLockfile } from "@extenzo/pkg-manager";

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
  arc: "chromium",
  yandex: "chromium",
  browseros: "chromium",
  custom: "chromium",
};

/** Browser name → launch target lookup table. */
const BROWSER_TO_LAUNCH: Record<string, LaunchTarget> = {
  chromium: "chromium",
  chrome: "chrome",
  edge: "edge",
  brave: "brave",
  vivaldi: "vivaldi",
  opera: "opera",
  santa: "santa",
  arc: "arc",
  yandex: "yandex",
  browseros: "browseros",
  custom: "custom",
  firefox: "firefox",
};

/**
 * Merge default reportDir with user RsdoctorReportOptions. User output.reportDir overrides if set.
 */
function mergeReportOptions(
  defaultReportDir: string,
  opts: RsdoctorReportOptions
): Record<string, unknown> {
  const output = opts.output ?? {};
  const reportDir = output.reportDir ?? defaultReportDir;
  return {
    ...opts,
    output: { ...output, reportDir },
  };
}

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
    const launchTarget = this.resolveLaunchTarget(parseResult.launch);
    const browser = this.resolveTarget(parseResult.target, launchTarget);
    this.warnChromiumMv2(config, browser);
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
      ? await this.mergeRsdoctorPlugin(baseConfig, root, outputRoot, report)
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
      warn("Unknown launch", parseResult.unknownLaunch, ", use chrome/chromium/edge/brave/vivaldi/opera/santa/arc/yandex/browseros/custom/firefox. Defaulting to chrome.");
    }
    if (parseResult.unknownTarget) {
      warn("Unknown target", parseResult.unknownTarget, ", use chromium or firefox. Defaulting to chromium.");
    }
  }

  /** Warn when building for Chromium with manifest_version 2 (deprecated). */
  private warnChromiumMv2(config: PipelineContext["config"], browser: BrowserTarget): void {
    if (browser !== "chromium") return;
    const record = getManifestRecordForTarget(config.manifest, browser);
    const mv = record?.manifest_version;
    if (mv === 2) {
      warn("Warning: MV2 has been deprecated for Chrome. Please use MV3.");
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
    const reloadManagerEntries = ctx.entries
      .filter((e) => RELOAD_MANAGER_ENTRY_NAMES.has(e.name))
      .map((e) => ({ name: e.name, path: resolve(ctx.root, e.scriptPath) }));
    const hmrOpts: HmrPluginOptions = {
      distPath: ctx.distPath,
      autoOpen: !isConfigRestart,
      browser: ctx.launchTarget,
      chromePath: ctx.config.launch?.chrome,
      chromiumPath: ctx.config.launch?.chromium,
      edgePath: ctx.config.launch?.edge,
      bravePath: ctx.config.launch?.brave,
      vivaldiPath: ctx.config.launch?.vivaldi,
      operaPath: ctx.config.launch?.opera,
      santaPath: ctx.config.launch?.santa,
      arcPath: ctx.config.launch?.arc,
      yandexPath: ctx.config.launch?.yandex,
      browserosPath: ctx.config.launch?.browseros,
      customPath: ctx.config.launch?.custom,
      firefoxPath: ctx.config.launch?.firefox,
      persist: ctx.persist,
      wsPort: ctx.config.hotReload?.port ?? HMR_WS_PORT,
      enableReload: true,
      autoRefreshContentPage: ctx.config.hotReload?.autoRefreshContentPage ?? true,
      reloadManagerEntries,
    };
    return {
      dev: { hmr: true, client: {
        protocol: 'ws',
        host: '127.0.0.1',
        port: '<port>', // 占位符，自动替换成当前 dev server 监听的端口
        path: '/rsbuild-hmr',
      }, liveReload: true, writeToDisk: true },
      server: { printUrls: false, cors: {
        origin: '*',
      }, },
      plugins: [hmrPlugin(hmrOpts) as LoosePlugin],
    };
  }

  /** Resolve launch browser: CLI -l/--launch or default chrome when absent. */
  private resolveLaunchTarget(cliLaunch: LaunchTarget | undefined): LaunchTarget {
    if (cliLaunch) return cliLaunch;
    return "chrome";
  }

  /** Resolve build target: -t > inferred from -l > default chromium. */
  private resolveTarget(
    cliTarget: BrowserTarget | undefined,
    launchTarget: LaunchTarget
  ): BrowserTarget {
    return cliTarget
      ?? (launchTarget === "firefox" ? "firefox" : "chromium");
  }

  private resolvePersist(cliPersist: boolean | undefined, configPersist: boolean | undefined): boolean {
    return Boolean(cliPersist || configPersist);
  }

  private resolveReport(
    cliReport: boolean | undefined,
    configReport: boolean | RsdoctorReportOptions | undefined
  ): false | true | RsdoctorReportOptions {
    const enabled = Boolean(cliReport || configReport);
    if (!enabled) return false;
    if (typeof configReport === "object" && configReport !== null) return configReport;
    return true;
  }

  /**
   * When report is enabled, ensure @rsdoctor/rspack-plugin is installed; then add plugin.
   * reportOption: true = default options (reportDir under outputRoot/report, mode brief); object = RsdoctorRspackPlugin options (reportDir default merged).
   */
  private async mergeRsdoctorPlugin(
    config: RsbuildConfig,
    root: string,
    outputRoot: string,
    reportOption: true | RsdoctorReportOptions
  ): Promise<RsbuildConfig> {
    const missing = getMissingPackages(root, ["@rsdoctor/rspack-plugin"]);
    if (missing.length > 0) {
      const pm = detectFromLockfile(root);
      const cmd = getAddCommand(pm, missing.join(" "), true);
      throw createRsdoctorNotInstalledError(cmd);
    }
    const reportDir = resolve(root, outputRoot, "report");
    const { RsdoctorRspackPlugin } = await import("@rsdoctor/rspack-plugin");
    const tools = config.tools as { rspack?: { plugins?: unknown[] } } | undefined;
    const existing = tools?.rspack?.plugins ?? [];
    const pluginOptions =
      reportOption === true
        ? { output: { reportDir }, mode: "brief" as const }
        : mergeReportOptions(reportDir, reportOption);
    const rsdoctorPlugin = new RsdoctorRspackPlugin(pluginOptions);
    return mergeRsbuildConfig(config, {
      tools: {
        rspack: {
          plugins: [...existing, rsdoctorPlugin],
        },
      },
    } as RsbuildConfig);
  }

}

const defaultPipeline = new Pipeline();

export function runPipeline(root: string, argv: string[]): Promise<PipelineContext> {
  return defaultPipeline.run(root, argv);
}
