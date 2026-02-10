import type { Compiler } from "@rspack/core";
import { Compilation, sources } from "@rspack/core";
import type { RsbuildPluginAPI } from "@rsbuild/core";
import type { ExtenzoResolvedConfig, EntryInfo, ManifestConfig, ManifestRecord } from "@extenzo/core";
import { getMonitorPageHtml, getMonitorPageScript } from "./get-monitor-assets";

const INJECT_MARKER = "/* extenzo-monitor */";

type RsbuildEntryValue =
  | string
  | {
      import: string | string[];
      html?: boolean;
    };

type ManifestV3Resource = {
  resources: string[];
  matches: string[];
};

type ManifestCommands = Record<string, { suggested_key?: Record<string, string>; description?: string }>;

function isRecord(value: unknown): value is ManifestRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pushUniqueString(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value);
}

/** Encapsulates monitor dir/asset names and open command for reuse. */
const MonitorConstants = {
  MONITOR_DIR: "extenzo-monitor",
  MONITOR_HTML: "extenzo-monitor.html",
  MONITOR_SCRIPT: "extenzo-monitor.js",
  OPEN_MONITOR_COMMAND: "open-extenzo-monitor",
} as const;

function ensureV2Resources(manifest: ManifestRecord, monitorDir: string): void {
  const list = Array.isArray(manifest.web_accessible_resources)
    ? (manifest.web_accessible_resources as string[])
    : [];
  pushUniqueString(list, `${monitorDir}/*`);
  if (!Array.isArray(manifest.web_accessible_resources)) {
    manifest.web_accessible_resources = list;
  }
}

function findWritableV3Entry(list: ManifestV3Resource[]): ManifestV3Resource | null {
  for (const item of list) {
    if (!item || !Array.isArray(item.resources)) continue;
    return item;
  }
  return null;
}

function ensureV3Resources(manifest: ManifestRecord, monitorDir: string): void {
  const list = Array.isArray(manifest.web_accessible_resources)
    ? (manifest.web_accessible_resources as ManifestV3Resource[])
    : [];
  const target = findWritableV3Entry(list);
  if (target) {
    pushUniqueString(target.resources, `${monitorDir}/*`);
    return;
  }
  const entry: ManifestV3Resource = { resources: [`${monitorDir}/*`], matches: ["<all_urls>"] };
  list.push(entry);
  if (!Array.isArray(manifest.web_accessible_resources)) {
    manifest.web_accessible_resources = list;
  }
}

function applyMonitorWebAccess(manifest: ManifestRecord, monitorDir: string): void {
  const mv = manifest.manifest_version;
  if (mv === 3) {
    ensureV3Resources(manifest, monitorDir);
    return;
  }
  ensureV2Resources(manifest, monitorDir);
}

const MONITOR_KEY_CHROMIUM = { default: "Ctrl+Shift+E", mac: "Command+Shift+E" } as const;
const MONITOR_KEY_FIREFOX = { default: "Ctrl+Shift+M", mac: "Command+Shift+M" } as const;

function applyMonitorCommands(
  manifest: ManifestRecord,
  openCommand: string,
  suggestedKey: { default: string; mac: string } = MONITOR_KEY_CHROMIUM
): void {
  const existing = isRecord(manifest.commands) ? (manifest.commands as ManifestCommands) : {};
  manifest.commands = {
    ...existing,
    [openCommand]: {
      suggested_key: { ...suggestedKey },
      description: "Open Extenzo error monitor",
    },
  };
}

function injectMonitorPermissionsInto(config: ManifestConfig, monitorDir: string, openCommand: string): void {
  if (!isRecord(config)) return;
  const hasChromium = "chromium" in config || "firefox" in config;
  if (!hasChromium) {
    applyMonitorWebAccess(config, monitorDir);
    applyMonitorCommands(config, openCommand);
    return;
  }
  const chromium = config.chromium;
  const firefox = config.firefox;
  if (isRecord(chromium)) {
    applyMonitorWebAccess(chromium, monitorDir);
    applyMonitorCommands(chromium, openCommand, MONITOR_KEY_CHROMIUM);
  }
  if (isRecord(firefox)) {
    applyMonitorWebAccess(firefox, monitorDir);
    applyMonitorCommands(firefox, openCommand, MONITOR_KEY_FIREFOX);
  }
}

function prependEntryImport(value: RsbuildEntryValue, injectPath: string): RsbuildEntryValue {
  if (typeof value === "string") return { import: [injectPath, value] };
  const list = Array.isArray(value.import) ? value.import : [value.import];
  return { ...value, import: [injectPath, ...list] };
}

/** Rspack plugin that emits monitor HTML and script assets. */
class ExtenzoMonitorRspackPlugin {
  constructor(
    private readonly entryNames: string[],
    private readonly monitorDir: string,
    private readonly monitorHtml: string,
    private readonly monitorScript: string
  ) {}

  apply(compiler: Compiler): void {
    compiler.hooks.thisCompilation.tap("extenzo-monitor", (compilation: Compilation) => {
      const stage = Compilation.PROCESS_ASSETS_STAGE_ADDITIONS;
      compilation.hooks.processAssets.tap(
        { name: "extenzo-monitor", stage },
        () => {
          compilation.emitAsset(
            `${this.monitorDir}/${this.monitorHtml}`,
            new sources.RawSource(getMonitorPageHtml(`./${this.monitorScript}`))
          );
          compilation.emitAsset(
            `${this.monitorDir}/${this.monitorScript}`,
            new sources.RawSource(getMonitorPageScript(this.entryNames))
          );
        }
      );
    });
  }
}

/**
 * Encapsulates the extenzo dev monitor: manifest injection, entry injection, and asset emission.
 */
export class ExtenzoMonitorPlugin {
  private readonly entryNames: string[];
  /** When entry: false, pipeline passes empty entries; we inject using config.source.entry keys and set this. */
  private effectiveEntryNames: string[] = [];
  private readonly monitorPath: string;

  constructor(
    private readonly resolvedConfig: ExtenzoResolvedConfig,
    entries: EntryInfo[]
  ) {
    this.entryNames = entries.map((e) => e.name);
    this.monitorPath = `${MonitorConstants.MONITOR_DIR}/${MonitorConstants.MONITOR_HTML}`;
  }

  /** Injects web_accessible_resources and commands into manifest config. */
  injectPermissions(): void {
    injectMonitorPermissionsInto(
      this.resolvedConfig.manifest,
      MonitorConstants.MONITOR_DIR,
      MonitorConstants.OPEN_MONITOR_COMMAND
    );
  }

  /** Builds the injection snippet for a single entry (import + setupExtenzoMonitor call). */
  buildInjectionSnippet(
    entryName: string,
    opts: { autoOpen: boolean; registerShortcut: boolean }
  ): string {
    const entryValue = JSON.stringify(entryName);
    const monitorValue = JSON.stringify(this.monitorPath);
    const autoOpen = opts.autoOpen ? "true" : "false";
    const registerShortcut = opts.registerShortcut ? "true" : "false";
    return `${INJECT_MARKER}
import { setupExtenzoMonitor } from "extenzo/monitor";
setupExtenzoMonitor({ entry: ${entryValue}, monitorPath: ${monitorValue}, autoOpen: ${autoOpen}, registerShortcut: ${registerShortcut} });
`;
  }

  /** Returns a data URL that loads the injection snippet (for prepending to an entry). */
  getInjectDataUrl(entryName: string, opts: { autoOpen: boolean; registerShortcut: boolean }): string {
    const source = this.buildInjectionSnippet(entryName, opts);
    return `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  }

  /** Returns the Rspack plugin that emits monitor HTML and script. */
  getRspackPlugin(): ExtenzoMonitorRspackPlugin {
    const names =
      this.effectiveEntryNames.length > 0 ? this.effectiveEntryNames : this.entryNames;
    return new ExtenzoMonitorRspackPlugin(
      names,
      MonitorConstants.MONITOR_DIR,
      MonitorConstants.MONITOR_HTML,
      MonitorConstants.MONITOR_SCRIPT
    );
  }

  /** Returns the Rsbuild plugin object (name + setup). */
  toRsbuildPlugin(): { name: string; setup: (api: RsbuildPluginAPI) => void } {
    const self = this;
    return {
      name: "extenzo-monitor",
      setup(api: RsbuildPluginAPI) {
        self.injectPermissions();
        api.modifyRsbuildConfig((config) => {
          const source = config.source ?? {};
          const entry = source.entry as Record<string, RsbuildEntryValue> | undefined;
          if (!entry) return;
          const namesToInject =
            self.entryNames.length > 0 ? self.entryNames : Object.keys(entry);
          self.effectiveEntryNames = namesToInject;
          const updated: Record<string, RsbuildEntryValue> = { ...entry };
          for (const entryName of namesToInject) {
            const entryValue = entry[entryName];
            if (!entryValue) continue;
            const isBg = entryName === "background";
            const injectPath = self.getInjectDataUrl(entryName, {
              autoOpen: false,
              registerShortcut: isBg,
            });
            updated[entryName] = prependEntryImport(entryValue, injectPath);
          }
          config.source = { ...source, entry: updated };
        });
        api.onBeforeCreateCompiler(async ({ bundlerConfigs }: { bundlerConfigs: unknown[] }) => {
          const config = bundlerConfigs[0] as { plugins?: unknown[] } | undefined;
          if (!config) return;
          config.plugins = config.plugins ?? [];
          config.plugins.push(self.getRspackPlugin());
        });
      },
    };
  }
}

export function monitorPlugin(resolvedConfig: ExtenzoResolvedConfig, entries: EntryInfo[]) {
  const plugin = new ExtenzoMonitorPlugin(resolvedConfig, entries);
  return plugin.toRsbuildPlugin();
}
