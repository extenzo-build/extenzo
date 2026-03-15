import { rspack } from "@rsbuild/core";
import type { RsbuildPluginAPI } from "@rsbuild/core";
import type { ExtenzoResolvedConfig, EntryInfo } from "@extenzo/core";
import { HTML_ENTRY_NAMES } from "@extenzo/core";

const INJECT_MARKER = "/* extenzo-monitor */";
/** Use a path starting with ./ so the bundler resolves it in the current directory; avoids "module not found" when \0 is stripped. */
const VIRTUAL_MODULE_PREFIX = "./.extenzo-monitor-";
const VIRTUAL_MODULE_SUFFIX = ".js";

function getVirtualModulePath(entryName: string): string {
  return `${VIRTUAL_MODULE_PREFIX}${entryName}${VIRTUAL_MODULE_SUFFIX}`;
}

function getVirtualModulesPlugin(): (new (modules: Record<string, string>) => unknown) | null {
  const exp = (rspack as { experiments?: { VirtualModulesPlugin?: new (modules: Record<string, string>) => unknown } }).experiments;
  return exp?.VirtualModulesPlugin ?? null;
}

type RsbuildEntryValue =
  | string
  | {
      import: string | string[];
      html?: boolean;
    };

/** Options for a single entry's monitor injection (no runtime detection; derived from entry name). */
function getMonitorEntryOpts(entryName: string): { registerShortcut: boolean } {
  return { registerShortcut: entryName === "background" };
}

/**
 * Encapsulates the extenzo dev monitor: entry injection only (virtual module per entry).
 * No UI: errors are forwarded from background to dev server and logged to terminal.
 */
export class ExtenzoMonitorPlugin {
  private readonly entryNames: string[];
  private effectiveEntryNames: string[] = [];
  private virtualSources: Map<string, string> = new Map();

  constructor(
    private readonly _resolvedConfig: ExtenzoResolvedConfig,
    entries: EntryInfo[]
  ) {
    this.entryNames = entries.map((e) => e.name);
  }

  buildInjectionSnippet(entryName: string, _opts: { registerShortcut: boolean }): string {
    const entryValue = JSON.stringify(entryName);
    const setupCall = `setupExtenzoMonitor({ entry: ${entryValue} });`;
    if (entryName === "background") {
      return `${INJECT_MARKER}
import { setupExtenzoMonitor, startHmrReloadClient } from "extenzo/monitor";
${setupCall}
startHmrReloadClient();
`;
    }
    return `${INJECT_MARKER}
import { setupExtenzoMonitor } from "extenzo/monitor";
${setupCall}
`;
  }

  toRsbuildPlugin(): { name: string; setup: (api: RsbuildPluginAPI) => void } {
    const self = this;
    return {
      name: "rsbuild-plugin-extension-monitor",
      setup(api: RsbuildPluginAPI) {
        api.modifyRsbuildConfig((config) => {
          const source = config.source ?? {};
          const entry = source.entry as Record<string, RsbuildEntryValue> | undefined;
          if (!entry) return;
          const namesToInject =
            self.entryNames.length > 0 ? self.entryNames : Object.keys(entry);
          self.effectiveEntryNames = namesToInject;
          self.virtualSources = new Map();
          for (const entryName of namesToInject) {
            const opts = getMonitorEntryOpts(entryName);
            self.virtualSources.set(entryName, self.buildInjectionSnippet(entryName, opts));
          }
          const nextEntry: Record<string, RsbuildEntryValue> = {};
          for (const [key, value] of Object.entries(entry)) {
            const virtualPath = getVirtualModulePath(key);
            if (typeof value === "string") {
              const needsHtml = (HTML_ENTRY_NAMES as readonly string[]).includes(key);
              nextEntry[key] = { import: [virtualPath, value], html: needsHtml };
              continue;
            }
            if (value && typeof value === "object" && Array.isArray(value.import)) {
              nextEntry[key] = { ...value, import: [virtualPath, ...value.import] };
              continue;
            }
            if (value && typeof value === "object" && typeof value.import === "string") {
              nextEntry[key] = { ...value, import: [virtualPath, value.import] };
              continue;
            }
            nextEntry[key] = value;
          }
          config.source = { ...source, entry: nextEntry };
        });

        api.onBeforeCreateCompiler(async ({ bundlerConfigs }: { bundlerConfigs: unknown[] }) => {
          const bundlerConfig = bundlerConfigs[0] as { plugins?: unknown[] } | undefined;
          if (!bundlerConfig) return;
          const VirtualModulesPlugin = getVirtualModulesPlugin();
          if (!VirtualModulesPlugin) return;
          const modules: Record<string, string> = {};
          for (const [entryName, content] of self.virtualSources) {
            modules[getVirtualModulePath(entryName)] = content;
          }
          bundlerConfig.plugins = bundlerConfig.plugins ?? [];
          bundlerConfig.plugins.unshift(new VirtualModulesPlugin(modules));
        });
      },
    };
  }
}

export function monitorPlugin(resolvedConfig: ExtenzoResolvedConfig, entries: EntryInfo[]) {
  const plugin = new ExtenzoMonitorPlugin(resolvedConfig, entries);
  return plugin.toRsbuildPlugin();
}
