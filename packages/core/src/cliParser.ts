import {
  CLI_COMMANDS,
  DEFAULT_BROWSER,
  type BrowserTarget,
  type CliCommand,
} from "./constants.js";
import { createInvalidBrowserError, createUnknownCommandError } from "./errors.js";

const BROWSER_FLAGS = ["-b", "--browser"];
const BROWSER_ALIASES: Record<string, BrowserTarget> = {
  chrome: "chromium",
  chromium: "chromium",
  firefox: "firefox",
};

export interface CliParseResult {
  command: CliCommand;
  browser: BrowserTarget;
  unknownBrowser?: string;
}

function parseBrowserValue(value: string): BrowserTarget | null {
  const normalized = value.trim().toLowerCase();
  return BROWSER_ALIASES[normalized] ?? null;
}

/** CLI 参数解析器：解析 command 与 -b/--browser，无效时抛出 ExtenzoError。 */
export class CliParser {
  parse(argv: string[]): CliParseResult {
    const cmdRaw = argv[0] ?? "dev";
    const command = CLI_COMMANDS.includes(cmdRaw as CliCommand) ? (cmdRaw as CliCommand) : null;
    if (command === null) throw createUnknownCommandError(cmdRaw);
    const { browser, unknown: unknownBrowser } = this.getBrowserFromArgv(argv);
    return { command, browser, unknownBrowser };
  }

  private getBrowserFromArgv(argv: string[]): { browser: BrowserTarget; unknown?: string } {
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      if (BROWSER_FLAGS.includes(arg)) {
        const value = argv[i + 1];
        if (value && !value.startsWith("-")) {
          const target = parseBrowserValue(value);
          if (target) return { browser: target };
          return { browser: DEFAULT_BROWSER, unknown: value };
        }
      }
      if (arg.startsWith("-b=") || arg.startsWith("--browser=")) {
        const value = arg.split("=")[1] ?? "";
        const target = parseBrowserValue(value);
        if (target) return { browser: target };
        return { browser: DEFAULT_BROWSER, unknown: value };
      }
    }
    return { browser: DEFAULT_BROWSER };
  }

  assertSupportedBrowser(value: string): asserts value is BrowserTarget {
    const target = parseBrowserValue(value);
    if (target) return;
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
