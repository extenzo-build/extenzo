import { format } from "node:util";

/** ANSI orange [exo] prefix for all exo terminal output */
const EXO_PREFIX = "\x1b[38;5;208m[exo]\x1b[0m ";
/** ANSI green "Done " for completion messages */
const DONE_PREFIX = "\x1b[32mDone\x1b[0m ";

type WriteFn = NodeJS.WriteStream["write"];

let rawWrites: { stdout: WriteFn; stderr: WriteFn } | null = null;

/**
 * Set raw stdout/stderr write functions so logger bypasses any stream wrapper
 * and adds exactly one [exo] prefix. Call from CLI after wrapExtenzoOutput().
 * Pass null to reset (e.g. in tests).
 */
export function setExoLoggerRawWrites(
  writes: { stdout: WriteFn; stderr: WriteFn } | null
): void {
  rawWrites = writes;
}

function getWrites(): { stdout: WriteFn; stderr: WriteFn } {
  if (rawWrites) return rawWrites;
  return {
    stdout: process.stdout.write.bind(process.stdout),
    stderr: process.stderr.write.bind(process.stderr),
  };
}

function writeLines(stream: "stdout" | "stderr", text: string): void {
  const w = getWrites()[stream];
  for (const line of text.split("\n")) {
    w(EXO_PREFIX + line + "\n", "utf8");
  }
}

/**
 * Log to stdout with [exo] prefix. Use instead of console.log for exo output.
 */
export function log(...args: unknown[]): void {
  writeLines("stdout", format(...args));
}

/**
 * Log a completion step: [exo] + green "Done " + message. Use for Parse exo.config, WebSocket started, browser started, etc.
 */
export function logDone(...args: unknown[]): void {
  const text = format(...args);
  const w = getWrites().stdout;
  for (const line of text.split("\n")) {
    w(EXO_PREFIX + DONE_PREFIX + line + "\n", "utf8");
  }
}

/**
 * Warn to stderr with [exo] prefix. Use instead of console.warn for exo output.
 */
export function warn(...args: unknown[]): void {
  writeLines("stderr", format(...args));
}

/**
 * Error to stderr with [exo] prefix. Use instead of console.error for exo output.
 */
export function error(...args: unknown[]): void {
  writeLines("stderr", format(...args));
}
