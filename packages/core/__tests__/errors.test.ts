import { describe, expect, it } from "@rstest/core";
import { setExoLoggerRawWrites } from "../src/logger.ts";
import {
  ExtenzoError,
  EXTENZO_ERROR_CODES,
  createConfigNotFoundError,
  createConfigLoadError,
  createManifestMissingError,
  createNoEntriesError,
  createInvalidBrowserError,
  createUnknownCommandError,
  exitWithError,
} from "../src/errors.ts";

describe("errors", () => {
  describe("ExtenzoError", () => {
    it("has name and code", () => {
      const err = new ExtenzoError("test", { code: EXTENZO_ERROR_CODES.CONFIG_NOT_FOUND });
      expect(err.name).toBe("ExtenzoError");
      expect(err.code).toBe("EXTENZO_CONFIG_NOT_FOUND");
      expect(err.message).toBe("test");
    });

    it("accepts details and hint", () => {
      const err = new ExtenzoError("msg", {
        code: EXTENZO_ERROR_CODES.NO_ENTRIES,
        details: "d",
        hint: "h",
      });
      expect(err.details).toBe("d");
      expect(err.hint).toBe("h");
    });
  });

  describe("createConfigNotFoundError", () => {
    it("returns error with CONFIG_NOT_FOUND code", () => {
      const err = createConfigNotFoundError("/root");
      expect(err.code).toBe(EXTENZO_ERROR_CODES.CONFIG_NOT_FOUND);
      expect(err.details).toContain("/root");
    });
  });

  describe("createConfigLoadError", () => {
    it("returns error with CONFIG_LOAD_FAILED code", () => {
      const err = createConfigLoadError("/exo.config.ts", new Error("syntax"));
      expect(err.code).toBe(EXTENZO_ERROR_CODES.CONFIG_LOAD_FAILED);
      expect(err.details).toContain("/exo.config.ts");
    });
    it("accepts non-Error cause as string", () => {
      const err = createConfigLoadError("/x", "string cause");
      expect(err.details).toContain("string cause");
    });
  });

  describe("createManifestMissingError", () => {
    it("returns error with MANIFEST_MISSING code", () => {
      const err = createManifestMissingError();
      expect(err.code).toBe(EXTENZO_ERROR_CODES.MANIFEST_MISSING);
    });
  });

  describe("createNoEntriesError", () => {
    it("returns error with NO_ENTRIES code", () => {
      const err = createNoEntriesError("/src");
      expect(err.code).toBe(EXTENZO_ERROR_CODES.NO_ENTRIES);
      expect(err.details).toContain("/src");
    });
  });

  describe("createInvalidBrowserError", () => {
    it("returns error with INVALID_BROWSER code", () => {
      const err = createInvalidBrowserError("safari");
      expect(err.code).toBe(EXTENZO_ERROR_CODES.INVALID_BROWSER);
    });
  });

  describe("createUnknownCommandError", () => {
    it("returns error with UNKNOWN_COMMAND code", () => {
      const err = createUnknownCommandError("foo");
      expect(err.code).toBe(EXTENZO_ERROR_CODES.UNKNOWN_COMMAND);
      expect(err.details).toContain("foo");
    });
  });

  describe("ExtenzoError cause", () => {
    it("sets cause when provided", () => {
      const cause = new Error("inner");
      const err = new ExtenzoError("outer", { code: EXTENZO_ERROR_CODES.BUILD_ERROR, cause });
      expect((err as Error & { cause?: unknown }).cause).toBe(cause);
    });
  });

  describe("exitWithError", () => {
    const noop = () => {};

    it("calls process.exit(1) and does not return", () => {
      const exit = process.exit;
      const logErr = console.error;
      console.error = noop;
      let exitCode: number | undefined;
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error("exit");
      }) as typeof process.exit;
      try {
        expect(() => exitWithError(new ExtenzoError("e", { code: EXTENZO_ERROR_CODES.BUILD_ERROR }))).toThrow("exit");
        expect(exitCode).toBe(1);
      } finally {
        process.exit = exit;
        console.error = logErr;
      }
    });

    it("formats non-Error via String()", () => {
      const exit = process.exit;
      const logErr = console.error;
      console.error = noop;
      let exitCode: number | undefined;
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error("exit");
      }) as typeof process.exit;
      try {
        expect(() => exitWithError("string error")).toThrow("exit");
        expect(exitCode).toBe(1);
      } finally {
        process.exit = exit;
        console.error = logErr;
      }
    });

    it("formats plain Error with stack", () => {
      const exit = process.exit;
      const logErr = console.error;
      console.error = noop;
      process.exit = (() => {
        throw new Error("exit");
      }) as typeof process.exit;
      try {
        expect(() => exitWithError(new Error("plain"))).toThrow("exit");
      } finally {
        process.exit = exit;
        console.error = logErr;
      }
    });

    it("formats ExtenzoError with details and hint in output", () => {
      const exit = process.exit;
      let logged = "";
      setExoLoggerRawWrites({
        stdout: process.stdout.write.bind(process.stdout),
        stderr: (chunk: unknown, _enc?: unknown, cb?: () => void) => {
          logged += String(chunk);
          if (typeof cb === "function") cb();
          return true;
        },
      });
      process.exit = (() => {
        throw new Error("exit");
      }) as typeof process.exit;
      try {
        expect(() => exitWithError(createConfigNotFoundError("/root"))).toThrow("exit");
        expect(logged).toContain("Details:");
        expect(logged).toContain("Hint:");
      } finally {
        process.exit = exit;
        setExoLoggerRawWrites(null);
      }
    });
  });
});
