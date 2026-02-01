import { describe, expect, it } from "@rstest/core";
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
} from "../src/errors.js";

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
      const err = createConfigLoadError("/ext.config.ts", new Error("syntax"));
      expect(err.code).toBe(EXTENZO_ERROR_CODES.CONFIG_LOAD_FAILED);
      expect(err.details).toContain("/ext.config.ts");
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

  describe("exitWithError", () => {
    it("calls process.exit(1) and does not return", () => {
      const exit = process.exit;
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
      }
    });
  });
});
