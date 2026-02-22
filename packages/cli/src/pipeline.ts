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
} from "@extenzo/core";
import { entryPlugin } from "@extenzo/plugin-extension-entry";
import { extensionPlugin } from "@extenzo/plugin-extension-manifest";
import { hmrPlugin, type HmrPluginOptions } from "@extenzo/plugin-extension-hmr";
import { monitorPlugin } from "@extenzo/plugin-extension-monitor";
import { getVueRsbuildPlugins } from "@extenzo/plugin-vue";
import { ensureDependencies } from "./ensureDeps.ts";

type LoosePlugin = RsbuildConfig["plugins"] extends (infer P)[] ? P : never;

/**
 * writeToDisk filter: skip HMR hot-update temp files to avoid output dir clutter and watch false triggers; normal assets still written for extension load.
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
    if (parseResult.unknownLaunch) {
      warn(
        "Unknown launch",
        parseResult.unknownLaunch,
        ", use chrome/edge/brave/vivaldi/opera/santa/firefox. Defaulting to chrome."
      );
    }
    if (parseResult.unknownTarget) {
      warn(
        "Unknown target",
        parseResult.unknownTarget,
        ", use chromium or firefox. Defaulting to chromium."
      );
    }
    const { config: rawConfig, baseEntries, entries } = this.configLoader.resolve(root);
    const config =
      parseResult.debug === true ? { ...rawConfig, debug: true } : rawConfig;
    await ensureDependencies(root, config);
    const outDir = config.outDir;
    const outputRoot = config.outputRoot;
    const distPath = resolve(root, outputRoot, outDir);
    const isDev = parseResult.command === "dev";

    const launchTarget = this.resolveLaunchTarget(
      parseResult.launch,
      this.getConfigBrowser(config)
    );
    const browser = this.resolveTarget(
      parseResult.target,
      launchTarget,
      this.getConfigBrowser(config)
    );
    const persist = this.resolvePersist(parseResult.persist, config.persist);
    const base = this.buildBaseRsbuildConfig({
      root,
      config,
      baseEntries,
      entries,
      browser,
      isDev,
    });
    const userConfig = await this.resolveUserRsbuildConfig(base, config);
    const hmrCtx: PipelineContext = {
      root,
      command: parseResult.command,
      browser,
      launchTarget,
      launchRequested: false,
      persist,
      config,
      baseEntries,
      entries,
      rsbuildConfig: base,
      isDev,
      distPath,
    };
    const hmrOverrides = this.buildHmrOverrides(isDev, hmrCtx);
    const merged = mergeRsbuildConfig(base, userConfig);
    const baseConfig = hmrOverrides ? mergeRsbuildConfig(merged, hmrOverrides) : merged;

    const ctx: PipelineContext = {
      ...hmrCtx,
      launchRequested: Boolean(parseResult.launch),
      rsbuildConfig: baseConfig,
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
      output: { legalComments: "none" },
    };
  }

  /** Resolve user rsbuildConfig: object returned as-is; function called with base and helpers. */
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

  /** In dev, returns HMR overrides (dev + tools.rspack); merged with base/user via mergeRsbuildConfig. */
  private buildHmrOverrides(
    isDev: boolean,
    ctx: PipelineContext
  ): RsbuildConfig | undefined {
    if (!isDev) return undefined;
    const hmrOpts: HmrPluginOptions = {
      distPath: ctx.distPath,
      autoOpen: true,
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
    };
    const rspackFn = (rspackConfig: unknown, utils: { appendPlugins?: (p: unknown) => void }) => {
      if (utils?.appendPlugins) utils.appendPlugins(hmrPlugin(hmrOpts));
      return rspackConfig;
    };
    return {
      dev: {
        hmr: false,
        liveReload: false,
        writeToDisk: devWriteToDiskFilter,
      },
      tools: {
        rspack: rspackFn as RsbuildConfig["tools"] extends { rspack?: infer R } ? R : never,
      },
    };
  }

  /** Resolve launch browser (-l > config.browser > default chrome); used for launch only, not build target. */
  private resolveLaunchTarget(
    cliLaunch: LaunchTarget | undefined,
    configBrowser: string | undefined
  ): LaunchTarget {
    if (cliLaunch) return cliLaunch;
    const configLaunch = this.parseConfigLaunch(configBrowser);
    if (configLaunch) return configLaunch;
    return "chrome";
  }

  /** Resolve build target (-t > config.browser > inferred from -l > default chromium); used for manifest/build. */
  private resolveTarget(
    cliTarget: PipelineContext["browser"] | undefined,
    launchTarget: LaunchTarget,
    configBrowser: string | undefined
  ): PipelineContext["browser"] {
    const fromLaunch = this.launchToTarget(launchTarget);
    const fromConfig = this.configBrowserToTarget(configBrowser);
    return cliTarget ?? fromConfig ?? fromLaunch ?? DEFAULT_BROWSER;
  }

  private launchToTarget(launch: LaunchTarget): PipelineContext["browser"] {
    return launch === "firefox" ? "firefox" : "chromium";
  }

  private configBrowserToTarget(value: string | undefined): PipelineContext["browser"] | null {
    if (!value) return null;
    const n = value.trim().toLowerCase();
    if (n === "firefox") return "firefox";
    if (n === "chromium" || n === "chrome" || n === "edge" || n === "brave" || n === "vivaldi" || n === "opera" || n === "santa") return "chromium";
    return null;
  }

  private parseConfigLaunch(value: string | undefined): LaunchTarget | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === "chromium") return "chrome";
    if (
      normalized === "chrome" ||
      normalized === "edge" ||
      normalized === "brave" ||
      normalized === "vivaldi" ||
      normalized === "opera" ||
      normalized === "santa" ||
      normalized === "firefox"
    ) {
      return normalized;
    }
    warn(
      "Unknown config.browser",
      value,
      ", use chrome/edge/brave/vivaldi/opera/santa/firefox. Defaulting to chrome."
    );
    return null;
  }

  private resolvePersist(cliPersist: boolean | undefined, configPersist: boolean | undefined): boolean {
    if (cliPersist) return true;
    return Boolean(configPersist);
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
