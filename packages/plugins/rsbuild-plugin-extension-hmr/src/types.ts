import type { LaunchTarget } from "@extenzo/core";
import type { LaunchPathOptions } from "./browserPaths";

export interface HmrPluginOptions {
  distPath: string;
  autoOpen?: boolean;
  browser?: LaunchTarget;
  chromePath?: string;
  chromiumPath?: string;
  edgePath?: string;
  bravePath?: string;
  vivaldiPath?: string;
  operaPath?: string;
  santaPath?: string;
  arcPath?: string;
  yandexPath?: string;
  browserosPath?: string;
  customPath?: string;
  firefoxPath?: string;
  persist?: boolean;
  wsPort?: number;
  enableReload?: boolean;
  autoRefreshContentPage?: boolean;
  /**
   * Content/background entries with name and absolute path.
   * Enables precise entry tag injection and reloadManager-only scope; only these entries trigger WS notify.
   */
  reloadManagerEntries?: ReloadManagerEntry[];
  /** @deprecated Use reloadManagerEntries. Kept for backward compat; no per-entry tag injection. */
  reloadManagerEntryPaths?: string[];
}

export interface ReloadManagerEntry {
  name: string;
  path: string;
}

export interface HmrPluginTestDeps {
  runChromiumRunner?: import("./launch").ChromiumRunnerOverride;
  ensureDistReady?: (distPath: string) => Promise<boolean>;
  getBrowserPath?: (b: LaunchTarget, o: LaunchPathOptions) => string | null;
}
