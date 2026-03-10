import { format } from "node:util";
import path from "node:path";
import { pathToFileURL } from "node:url";
import Table from "cli-table3";

/** ANSI orange [exo] prefix for all exo terminal output */
const EXO_PREFIX = "\x1b[38;5;208m[exo]\x1b[0m ";
/** Bold + green "Done " for completion messages */
const DONE_PREFIX = "\x1b[1m\x1b[32mDone\x1b[0m ";
/** Dim gray for time suffix (not overwhelming) */
const TIME_COLOR = "\x1b[38;5;245m";
/** Cyan for size/value highlight */
const VALUE_COLOR = "\x1b[38;5;75m";
const RESET = "\x1b[0m";

/** Purple for table header (e.g. entries table). */
const PURPLE = "\x1b[38;5;141m";

/** OSC 8 hyperlink: \x1b]8;;url\x07text\x1b]8;;\x07 */
function fileLink(absolutePath: string, displayText: string): string {
  const url = pathToFileURL(absolutePath).href;
  return "\x1b]8;;" + url + "\x07" + displayText + "\x1b]8;;\x07";
}

/** Error output: red background + yellow "error" text (no [exo] prefix). */
const ERROR_BADGE = "\x1b[41m\x1b[93m error \x1b[0m ";
/** Red foreground for error content. */
const RED = "\x1b[31m";

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
 * Log a completion step with duration: "Done message 1.2s" or "Done message 123ms".
 * Time is shown without parentheses, in dim color; ms/s auto-converted.
 */
export function logDoneTimed(message: string, ms: number): void {
  const timeStr = formatDuration(ms);
  const w = getWrites().stdout;
  const line = DONE_PREFIX + message + " " + TIME_COLOR + timeStr + RESET;
  w(EXO_PREFIX + line + "\n", "utf8");
}

/**
 * Format duration: >= 1000ms as "X.XXs", else "Xms".
 */
export function formatDuration(ms: number): string {
  if (ms >= 1000) return (ms / 1000).toFixed(2) + "s";
  return ms + "ms";
}

/**
 * Log a completion step with a highlighted value (e.g. extension size). Value is colored.
 */
export function logDoneWithValue(label: string, value: string): void {
  const w = getWrites().stdout;
  const line = DONE_PREFIX + label + " " + VALUE_COLOR + value + RESET;
  w(EXO_PREFIX + line + "\n", "utf8");
}

/**
 * Warn to stderr with [exo] prefix. Use instead of console.warn for exo output.
 */
export function warn(...args: unknown[]): void {
  writeLines("stderr", format(...args));
}

/**
 * Error to stderr: no [exo] prefix; red-background + yellow "error" badge, then error content in red.
 * One leading/trailing newline for clear block so it can be copied for AI.
 */
export function error(...args: unknown[]): void {
  const text = format(...args);
  const w = getWrites().stderr;
  const lines = text.split("\n");
  w("\n", "utf8");
  if (lines.length > 0) {
    w(ERROR_BADGE + RED + lines[0] + RESET + "\n", "utf8");
    for (let i = 1; i < lines.length; i++) {
      w(RED + lines[i] + RESET + "\n", "utf8");
    }
  }
  w("\n", "utf8");
}

/**
 * Write Extenzo extension error block to stderr (raw write, no [exo]/[Rsbuild] prefix).
 * All lines are shown in red.
 */
export function writeExtensionErrorBlock(lines: string[]): void {
  const w = getWrites().stderr;
  w("\n", "utf8");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0) w(ERROR_BADGE + RED + line + RESET + "\n", "utf8");
    else w(RED + line + RESET + "\n", "utf8");
  }
  w("\n", "utf8");
}

/** Minimal entry row for table: name + file path. */
export interface EntryTableRow {
  name: string;
  scriptPath: string;
}

/** Options for logEntriesTable: root makes file column show relative path (still clickable). */
export interface LogEntriesTableOptions {
  root?: string;
}

/**
 * Log entries table to stdout: real table via cli-table3, no [exo] prefix.
 * Header "Entry" | "File" in purple. When options.root is set, file column shows path
 * relative to root and is wrapped in OSC 8 link so it remains clickable.
 */
export function logEntriesTable(
  entries: EntryTableRow[],
  options?: LogEntriesTableOptions
): void {
  if (entries.length === 0) return;
  const root = options?.root;
  const table = new Table({
    head: [PURPLE + "Entry" + RESET, PURPLE + "File" + RESET],
    style: { head: [], border: [] },
  });
  for (const e of entries) {
    const fileDisplay =
      root !== undefined
        ? fileLink(
            e.scriptPath,
            path.relative(root, e.scriptPath).replace(/\\/g, "/")
          )
        : e.scriptPath;
    table.push([e.name, fileDisplay]);
  }
  const w = getWrites().stdout;
  w(table.toString() + "\n", "utf8");
}
