import {
  CLI_COMMANDS,
  DEFAULT_BROWSER,
  type BrowserTarget,
  type CliCommand,
  type LaunchTarget,
} from "./constants.ts";
import { createInvalidBrowserError, createUnknownCommandError } from "./errors.ts";

const LAUNCH_FLAGS = ["-l", "--launch"];
const TARGET_FLAGS = ["-t", "--target"];

const LAUNCH_ALIASES: Record<string, LaunchTarget> = {
  chrome: "chrome",
  chromium: "chrome",
  edge: "edge",
  brave: "brave",
  vivaldi: "vivaldi",
  opera: "opera",
  santa: "santa",
  firefox: "firefox",
};

const TARGET_ALIASES: Record<string, BrowserTarget> = {
  chromium: "chromium",
  chrome: "chromium",
  edge: "chromium",
  brave: "chromium",
  vivaldi: "chromium",
  opera: "chromium",
  santa: "chromium",
  firefox: "firefox",
};

export interface CliParseResult {
  command: CliCommand;
  /** Build target (manifest): from -t; when omitted pipeline infers from -l/config */
  target?: BrowserTarget;
  /** Launch browser: from -l */
  launch?: LaunchTarget;
  unknownLaunch?: string;
  unknownTarget?: string;
  persist?: boolean;
  /** When true, same as debug: true in exo.config (e.g. enable monitor in dev). From --debug. */
  debug?: boolean;
}

function parseLaunchValue(value: string): LaunchTarget | null {
  const normalized = value.trim().toLowerCase();
  return LAUNCH_ALIASES[normalized] ?? null;
}

/** CLI parser: parses command, -t/--target, -l/--launch; throws ExtenzoError on invalid input. */
export class CliParser {
  parse(argv: string[]): CliParseResult {
    const cmdRaw = argv[0] ?? "dev";
    const command = CLI_COMMANDS.includes(cmdRaw as CliCommand) ? (cmdRaw as CliCommand) : null;
    if (command === null) throw createUnknownCommandError(cmdRaw);
    const { launch, unknown: unknownLaunch } = this.getLaunchFromArgv(argv);
    const { target, unknown: unknownTarget } = this.getTargetFromArgv(argv);
    const persist = this.getPersistFromArgv(argv);
    const debug = this.getDebugFromArgv(argv);
    return { command, target, launch, unknownLaunch, unknownTarget, persist, debug };
  }

  private getTargetFromArgv(argv: string[]): { target?: BrowserTarget; unknown?: string } {
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      if (TARGET_FLAGS.includes(arg)) {
        const value = argv[i + 1];
        if (value && !value.startsWith("-")) {
          const t = TARGET_ALIASES[value.trim().toLowerCase()];
          if (t) return { target: t };
          return { unknown: value };
        }
      }
      if (arg.startsWith("-t=") || arg.startsWith("--target=")) {
        const value = (arg.split("=")[1] ?? "").trim().toLowerCase();
        const t = TARGET_ALIASES[value];
        if (t) return { target: t };
        return { unknown: value };
      }
    }
    return {};
  }

  private getLaunchFromArgv(argv: string[]): { launch?: LaunchTarget; unknown?: string } {
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      if (LAUNCH_FLAGS.includes(arg)) {
        const value = argv[i + 1];
        if (value && !value.startsWith("-")) {
          const target = parseLaunchValue(value);
          if (target) return { launch: target };
          return { unknown: value };
        }
      }
      if (arg.startsWith("-l=") || arg.startsWith("--launch=")) {
        const value = arg.split("=")[1] ?? "";
        const target = parseLaunchValue(value);
        if (target) return { launch: target };
        return { unknown: value };
      }
    }
    return {};
  }

  private getPersistFromArgv(argv: string[]): boolean {
    return argv.some((arg) => arg === "-p" || arg === "--persist");
  }

  private getDebugFromArgv(argv: string[]): true | undefined {
    return argv.some((arg) => arg === "--debug") ? true : undefined;
  }

  assertSupportedBrowser(value: string): asserts value is LaunchTarget | "chromium" {
    const launch = parseLaunchValue(value);
    if (launch) return;
    if (value.trim().toLowerCase() === "chromium") return;
    throw createInvalidBrowserError(value);
  }
}

const defaultParser: CliParser = new CliParser();

export function parseCliArgs(argv: string[]): CliParseResult {
  return defaultParser.parse(argv);
}

export function assertSupportedBrowser(value: string): asserts value is BrowserTarget {
  defaultParser.assertSupportedBrowser(value);
}
