import { describe, expect, it } from "@rstest/core";
import {
  CONFIG_FILES,
  SCRIPT_EXTS,
  RESERVED_ENTRY_NAMES,
  HTML_ENTRY_NAMES,
  SCRIPT_ONLY_ENTRY_NAMES,
  DEFAULT_OUT_DIR,
  DEFAULT_SRC_DIR,
  EXTENZO_OUTPUT_ROOT,
  CLI_COMMANDS,
  SUPPORTED_BROWSERS,
  MANIFEST_ENTRY_PATHS,
} from "../src/constants.ts";

describe("constants", () => {
  it("CONFIG_FILES includes ext.config.ts and ext.config.js", () => {
    expect(CONFIG_FILES).toContain("ext.config.ts");
    expect(CONFIG_FILES).toContain("ext.config.js");
  });

  it("SCRIPT_EXTS prefers .js before .ts", () => {
    expect(SCRIPT_EXTS[0]).toBe(".js");
    expect(SCRIPT_EXTS).toContain(".ts");
  });

  it("RESERVED_ENTRY_NAMES includes popup, background, content, devtools", () => {
    expect(RESERVED_ENTRY_NAMES).toContain("popup");
    expect(RESERVED_ENTRY_NAMES).toContain("background");
    expect(RESERVED_ENTRY_NAMES).toContain("content");
    expect(RESERVED_ENTRY_NAMES).toContain("devtools");
  });

  it("HTML_ENTRY_NAMES and SCRIPT_ONLY_ENTRY_NAMES are disjoint", () => {
    const htmlSet = new Set(HTML_ENTRY_NAMES);
    for (const name of SCRIPT_ONLY_ENTRY_NAMES) {
      expect(htmlSet.has(name)).toBe(false);
    }
  });

  it("DEFAULT_OUT_DIR is dist", () => {
    expect(DEFAULT_OUT_DIR).toBe("dist");
  });

  it("EXTENZO_OUTPUT_ROOT is .extenzo", () => {
    expect(EXTENZO_OUTPUT_ROOT).toBe(".extenzo");
  });

  it("DEFAULT_SRC_DIR is .", () => {
    expect(DEFAULT_SRC_DIR).toBe(".");
  });

  it("CLI_COMMANDS includes dev and build", () => {
    expect(CLI_COMMANDS).toContain("dev");
    expect(CLI_COMMANDS).toContain("build");
  });

  it("SUPPORTED_BROWSERS includes chromium and firefox", () => {
    expect(SUPPORTED_BROWSERS).toContain("chromium");
    expect(SUPPORTED_BROWSERS).toContain("firefox");
  });

  it("MANIFEST_ENTRY_PATHS has expected keys", () => {
    expect(MANIFEST_ENTRY_PATHS.background).toBe("background/index.js");
    expect(MANIFEST_ENTRY_PATHS.devtools).toBe("devtools/index.html");
    expect(MANIFEST_ENTRY_PATHS.popup).toBe("popup/index.html");
  });
});
