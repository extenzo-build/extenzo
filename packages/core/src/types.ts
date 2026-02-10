import type { RsbuildConfig } from "@rsbuild/core";
import type { BrowserTarget, CliCommand, LaunchTarget } from "./constants.ts";

/** Single manifest as JSON object (nested unknown allowed) */
export type ManifestRecord = Record<string, unknown>;

/** Manifest config with chromium/firefox branches */
export interface ChromiumFirefoxManifest {
  chromium?: ManifestRecord;
  firefox?: ManifestRecord;
}

/** Manifest config: single object or per-browser branches */
export type ManifestConfig = ManifestRecord | ChromiumFirefoxManifest;

/**
 * Manifest path config: exo.config can set chromium/firefox to manifest file paths,
 * relative to appDir. E.g. chromium: 'app/manifest/manifest.json'
 */
export type ManifestPathConfig = {
  chromium?: string;
  firefox?: string;
};

/** Lifecycle hooks: extend logic at each stage */
export interface LifecycleHooks {
  /** After CLI args are parsed */
  afterCliParsed?: (ctx: PipelineContext) => void | Promise<void>;
  /** After config and entries are resolved */
  afterConfigLoaded?: (ctx: PipelineContext) => void | Promise<void>;
  /** After manifest and merged entries are fixed, before Rsbuild config is built */
  beforeRsbuildConfig?: (ctx: PipelineContext) => void | Promise<void>;
  /** After Rsbuild config is ready, before build runs */
  beforeBuild?: (ctx: PipelineContext) => void | Promise<void>;
  /** After build finishes (build command only; dev runs watch and does not exit) */
  afterBuild?: (ctx: PipelineContext) => void | Promise<void>;
}

/** Pipeline context shared from CLI parse through build */
export interface PipelineContext {
  root: string;
  command: CliCommand;
  browser: BrowserTarget;
  /** Launch browser (chrome/edge/firefox) for dev and HMR */
  launchTarget: LaunchTarget;
  /** Whether -l/--launch was explicitly requested (e.g. build -l to launch after build) */
  launchRequested?: boolean;
  /** Whether to persist Chromium temp user data dir (-p/--persist or config.persist) */
  persist?: boolean;
  /** Resolved user config (including hooks) */
  config: ExtenzoResolvedConfig;
  /** Base entries from discovery only (before merging entry config) */
  baseEntries: EntryInfo[];
  /** Final entry list (discovered + entry config merged) */
  entries: EntryInfo[];
  /** Final config passed to Rsbuild */
  rsbuildConfig: RsbuildConfig;
  /** Whether in dev mode */
  isDev: boolean;
  /** Absolute output directory path */
  distPath: string;
}

/**
 * Helpers passed to rsbuildConfig when it is a function.
 * Use merge(base, overrides) for the same deep-merge effect as object form.
 */
export interface RsbuildConfigHelpers {
  merge: (base: RsbuildConfig, user: RsbuildConfig) => RsbuildConfig;
}

/** User ext config */
export interface ExtenzoUserConfig {
  /**
   * Extension manifest: object config, path config (relative to appDir), or omit to auto-read
   * manifest.json / manifest.chromium.json / manifest.firefox.json from appDir.
   */
  manifest?: ManifestConfig | ManifestPathConfig;
  /** Rsbuild plugins array; use function calls like Vite, e.g. plugins: [vue()] */
  plugins?: RsbuildConfig["plugins"];
  /**
   * Override/extend Rsbuild config (like Vite's build.rollupOptions / esbuild).
   * Object: deep-merge with base.
   * Function: (base, helpers) => config; use helpers.merge(base, overrides) for deep-merge effect.
   */
  rsbuildConfig?:
    | RsbuildConfig
    | ((
        base: RsbuildConfig,
        helpers?: RsbuildConfigHelpers
      ) => RsbuildConfig | Promise<RsbuildConfig>);
  /**
   * Custom entries: key = entry name (reserved: popup/options/sidepanel/background/devtools/content; others custom),
   * value = path relative to baseDir (baseDir = app/ when appDir unset, else baseDir = appDir).
   * Omit to discover background/content/popup/options/sidepanel/devtools from baseDir.
   * Set to **false** to disable framework entry handling: no discovery, no plugin-extension-entry;
   * only debug, hotReload, manifest, plugins, appDir, outDir are used; configure entry in rsbuildConfig.
   */
  entry?: Record<string, EntryConfigValue> | false;
  /** App directory; default app/. Also the lookup base for entry paths (app/ or appDir). */
  appDir?: string;
  /** @deprecated Use appDir instead. */
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
   * Prefixes for env vars loaded from .env to inject into client (e.g. background/content).
   * Passed to Rsbuild loadEnv; default `['']` exposes all .env vars as process.env.*.
   * Use `['PUBLIC_']` to only expose PUBLIC_* (safe for secrets).
   */
  envPrefix?: string[];
  /**
   * Browser launch paths for dev mode. Framework uses these to start Chrome/Firefox when running `extenzo dev`.
   * If unset, dev mode uses default OS paths (see plugin-extension-hmr). Chrome is launched via chrome-launcher.
   */
  launch?: {
    chrome?: string;
    edge?: string;
    brave?: string;
    vivaldi?: string;
    opera?: string;
    santa?: string;
    firefox?: string;
  };
  /**
   * Persist chromium-based user data dir between dev runs.
   * Default false; CLI -p/--persist has higher priority.
   */
  persist?: boolean;
  /**
   * Default launch target when CLI doesn't specify --launch.
   * Accepts chrome/edge/firefox (chromium treated as chrome).
   */
  browser?: LaunchTarget | "chromium";
  /**
   * Hot-reload (WebSocket) options for dev. Port defaults to 23333.
   */
  hotReload?: {
    /** HMR WebSocket server port; default 23333 */
    port?: number;
  };
  /** Lifecycle hooks to extend behaviour at each stage */
  hooks?: LifecycleHooks;
  /**
   * When true and running in dev (`extenzo dev`), enables the error monitor (plugin-extension-monitor).
   * Default false. Only has effect in dev; build ignores this.
   */
  debug?: boolean;
  /**
   * @deprecated Use rsbuildConfig instead. Kept for compatibility; only function form applies.
   */
  rsbuild?: (
    base: RsbuildConfig,
    helpers?: RsbuildConfigHelpers
  ) => RsbuildConfig | Promise<RsbuildConfig>;
}

/** Resolved config with root, appDir, outDir, outputRoot; manifest is resolved to object form */
export interface ExtenzoResolvedConfig extends Omit<ExtenzoUserConfig, "manifest"> {
  manifest: ManifestConfig;
  appDir: string;
  outDir: string;
  outputRoot: string;
  root: string;
  /** When false, framework does not add plugin-extension-entry; user configures entry in rsbuildConfig */
  entry?: Record<string, EntryConfigValue> | false;
  /** Passed to Rsbuild loadEnv; default `['']` exposes all .env as process.env.* */
  envPrefix?: string[];
  /** Hot-reload options for dev; port defaults to 23333 */
  hotReload?: { port?: number };
}

/** Entry config value: string path or structured { src, html } */
export type EntryConfigValue =
  | string
  | {
      /** JS/TS entry path (relative to baseDir) */
      src: string;
      /**
       * HTML generation toggle or template path.
       * - true: generate HTML without a template
       * - false: script-only entry
       * - string: HTML template path (relative to baseDir)
       */
      html?: boolean | string;
    };

/** Where to inject the entry script in HTML (for entries discovered via data-extenzo-entry). */
export type ScriptInjectPosition = "head" | "body";

/** Discovered entry info */
export interface EntryInfo {
  name: string;
  scriptPath: string;
  htmlPath?: string;
  /** Whether this entry should generate an HTML page (template optional). */
  html?: boolean;
  /** When set, template must omit the data-extenzo-entry script and rsbuild html.inject should use this. */
  scriptInject?: ScriptInjectPosition;
}
