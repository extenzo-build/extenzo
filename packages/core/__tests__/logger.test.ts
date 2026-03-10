import { describe, expect, it, afterEach } from "@rstest/core";
import { log, logDone, logDoneWithValue, logDoneTimed, formatDuration, warn, error, setExoLoggerRawWrites } from "../src/logger.ts";

const EXO_PREFIX = "\x1b[38;5;208m[exo]\x1b[0m ";
const DONE_PREFIX = "\x1b[32mDone\x1b[0m ";

describe("logger", () => {
  afterEach(() => {
    setExoLoggerRawWrites(null);
  });

  it("log writes to stdout with [exo] prefix", () => {
    const out: string[] = [];
    setExoLoggerRawWrites({
      stdout: (chunk: unknown) => {
        out.push(String(chunk));
        return true;
      },
      stderr: process.stderr.write.bind(process.stderr),
    });
    log("hello");
    expect(out.some((s) => s.includes(EXO_PREFIX) && s.includes("hello"))).toBe(true);
  });

  it("logDone writes [exo] and green Done prefix", () => {
    const out: string[] = [];
    setExoLoggerRawWrites({
      stdout: (chunk: unknown) => {
        out.push(String(chunk));
        return true;
      },
      stderr: process.stderr.write.bind(process.stderr),
    });
    logDone("Parse exo.config");
    expect(out.some((s) => s.includes(EXO_PREFIX) && s.includes(DONE_PREFIX) && s.includes("Parse exo.config"))).toBe(
      true
    );
  });

  it("warn writes to stderr with [exo] prefix", () => {
    const err: string[] = [];
    setExoLoggerRawWrites({
      stdout: process.stdout.write.bind(process.stdout),
      stderr: (chunk: unknown) => {
        err.push(String(chunk));
        return true;
      },
    });
    warn("warning message");
    expect(err.some((s) => s.includes(EXO_PREFIX) && s.includes("warning message"))).toBe(true);
  });

  it("error writes to stderr with red-background yellow error badge, no [exo] prefix", () => {
    const err: string[] = [];
    setExoLoggerRawWrites({
      stdout: process.stdout.write.bind(process.stdout),
      stderr: (chunk: unknown) => {
        err.push(String(chunk));
        return true;
      },
    });
    error("error message");
    const concat = err.join("");
    expect(concat).not.toContain("[exo]");
    expect(concat).toContain(" error ");
    expect(concat).toContain("error message");
  });

  it("formatDuration returns seconds for >= 1000ms", () => {
    expect(formatDuration(1500)).toBe("1.50s");
    expect(formatDuration(500)).toBe("500ms");
    expect(formatDuration(1000)).toBe("1.00s");
  });

  it("logDoneTimed writes formatted time to stdout", () => {
    const out: string[] = [];
    setExoLoggerRawWrites({
      stdout: (chunk: unknown) => {
        out.push(String(chunk));
        return true;
      },
      stderr: process.stderr.write.bind(process.stderr),
    });
    logDoneTimed("Build complete", 2500);
    expect(out.some((s) => s.includes("Build complete") && s.includes("2.50s"))).toBe(true);
  });

  it("logDoneWithValue writes label and highlighted value to stdout", () => {
    const out: string[] = [];
    setExoLoggerRawWrites({
      stdout: (chunk: unknown) => {
        out.push(String(chunk));
        return true;
      },
      stderr: process.stderr.write.bind(process.stderr),
    });
    logDoneWithValue("Extension size", "42KB");
    expect(out.some((s) => s.includes("Extension size") && s.includes("42KB"))).toBe(true);
  });

  it("setExoLoggerRawWrites(null) resets to process streams", () => {
    setExoLoggerRawWrites({
      stdout: process.stdout.write.bind(process.stdout),
      stderr: process.stderr.write.bind(process.stderr),
    });
    setExoLoggerRawWrites(null);
    expect(() => log("no throw")).not.toThrow();
  });
});
