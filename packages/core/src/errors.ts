import { error as exoError } from "./logger.ts";

/**
 * Unified error type and error output for easier debugging.
 */

export const EXTENZO_ERROR_CODES = {
  CONFIG_NOT_FOUND: "EXTENZO_CONFIG_NOT_FOUND",
  CONFIG_LOAD_FAILED: "EXTENZO_CONFIG_LOAD_FAILED",
  MANIFEST_MISSING: "EXTENZO_MANIFEST_MISSING",
  APP_DIR_MISSING: "EXTENZO_APP_DIR_MISSING",
  NO_ENTRIES: "EXTENZO_NO_ENTRIES",
  INVALID_BROWSER: "EXTENZO_INVALID_BROWSER",
  UNKNOWN_COMMAND: "EXTENZO_UNKNOWN_COMMAND",
  RSBUILD_CONFIG_ERROR: "EXTENZO_RSBUILD_CONFIG_ERROR",
  BUILD_ERROR: "EXTENZO_BUILD_ERROR",
  ZIP_OUTPUT: "EXTENZO_ZIP_OUTPUT",
  ZIP_ARCHIVE: "EXTENZO_ZIP_ARCHIVE",
} as const;

export type ExtenzoErrorCode = (typeof EXTENZO_ERROR_CODES)[keyof typeof EXTENZO_ERROR_CODES];

export class ExtenzoError extends Error {
  readonly code: ExtenzoErrorCode;
  readonly details?: string;
  readonly hint?: string;

  constructor(
    message: string,
    options: { code: ExtenzoErrorCode; details?: string; hint?: string; cause?: unknown }
  ) {
    super(message);
    this.name = "ExtenzoError";
    this.code = options.code;
    this.details = options.details;
    this.hint = options.hint;
    if (options.cause !== undefined) (this as Error & { cause?: unknown }).cause = options.cause;
  }
}

function formatError(err: unknown): string {
  if (err instanceof ExtenzoError) {
    const parts = [`[${err.code}] ${err.message}`];
    if (err.details) parts.push(`  Details: ${err.details}`);
    if (err.hint) parts.push(`  Hint: ${err.hint}`);
    return parts.join("\n");
  }
  if (err instanceof Error) return err.stack ?? err.message;
  return String(err);
}

/**
 * Print error to stderr and exit process.
 * Used in CLI top-level catch for clear error reporting.
 */
export function exitWithError(err: unknown, exitCode = 1): never {
  exoError("\n" + formatError(err));
  process.exit(exitCode);
}

export function createConfigNotFoundError(root: string): ExtenzoError {
  return new ExtenzoError("Extenzo config file not found", {
    code: EXTENZO_ERROR_CODES.CONFIG_NOT_FOUND,
    details: `No exo.config.ts, exo.config.js or exo.config.mjs found under ${root}`,
    hint: "Run the command from project root or create exo.config.ts / exo.config.js",
  });
}

export function createConfigLoadError(filePath: string, cause: unknown): ExtenzoError {
  const message = cause instanceof Error ? cause.message : String(cause);
  return new ExtenzoError("Failed to load config file", {
    code: EXTENZO_ERROR_CODES.CONFIG_LOAD_FAILED,
    details: `File: ${filePath}, error: ${message}`,
    hint: "Check exo.config syntax and dependencies",
    cause: cause instanceof Error ? cause : undefined,
  });
}

export function createManifestMissingError(): ExtenzoError {
  return new ExtenzoError("Manifest config or file not found", {
    code: EXTENZO_ERROR_CODES.MANIFEST_MISSING,
    details:
      "Configure manifest in exo.config, or place manifest.json / manifest.chromium.json / manifest.firefox.json under appDir or appDir/manifest",
    hint:
      "Option 1: manifest: { name, version, ... } in exo.config; Option 2: manifest.json under appDir or appDir/manifest; Option 3: manifest: { chromium: 'path/to/manifest.json' } (path relative to appDir)",
  });
}

export function createAppDirMissingError(appDir: string): ExtenzoError {
  return new ExtenzoError("App directory not found", {
    code: EXTENZO_ERROR_CODES.APP_DIR_MISSING,
    details: `Missing appDir: ${appDir}`,
    hint: "Create the directory or set appDir to an existing folder (default is app/)",
  });
}

export function createNoEntriesError(appDir: string): ExtenzoError {
  return new ExtenzoError("No entries discovered", {
    code: EXTENZO_ERROR_CODES.NO_ENTRIES,
    details: `No background, content, popup, options or sidepanel entry found under ${appDir}`,
    hint: "At least one such directory with index.ts / index.js etc. is required",
  });
}

export function createInvalidBrowserError(value: string): ExtenzoError {
  return new ExtenzoError("Unsupported browser argument", {
    code: EXTENZO_ERROR_CODES.INVALID_BROWSER,
    details: `Current value: "${value}"`,
    hint:
      "Use -l chrome/edge/brave/vivaldi/opera/santa/firefox or --launch=chrome/edge/brave/vivaldi/opera/santa/firefox; default is chrome when omitted",
  });
}

export function createUnknownCommandError(cmd: string): ExtenzoError {
  return new ExtenzoError("Unknown command", {
    code: EXTENZO_ERROR_CODES.UNKNOWN_COMMAND,
    details: `Command: "${cmd}"`,
    hint: "Supported: extenzo dev | extenzo build [-l chrome|edge|brave|vivaldi|opera|santa|firefox]",
  });
}
