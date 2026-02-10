import { describe, expect, it } from "@rstest/core";
import {
  ManifestBuilder,
  resolveManifestChromium,
  resolveManifestFirefox,
  resolveManifestForTarget,
} from "../src/manifestBuilder.ts";
import type { ContentScriptOutput } from "../src/manifestBuilder.ts";
import { MANIFEST_ENTRY_PATHS } from "../src/constants.ts";
import type { EntryInfo } from "../src/types.ts";

function entry(name: string, scriptPath: string, htmlPath?: string): EntryInfo {
  return { name, scriptPath, htmlPath };
}

describe("ManifestBuilder", () => {
  const baseManifest = {
    name: "Test",
    version: "0.0.1",
    manifest_version: 3,
  };

  describe("buildForBrowser", () => {
    it("replaces [exo.background] when entry present", () => {
      const builder = new ManifestBuilder();
      const manifest = {
        ...baseManifest,
        background: { service_worker: "[exo.background]" },
      };
      const out = builder.buildForBrowser(
        { chromium: manifest },
        [entry("background", "/b/index.js")],
        "chromium"
      );
      expect((out as { background?: { service_worker: string } }).background?.service_worker).toBe(
        MANIFEST_ENTRY_PATHS.background
      );
    });

    it("replaces [exo.content] in content_scripts when content entry present", () => {
      const builder = new ManifestBuilder();
      const manifest = {
        ...baseManifest,
        content_scripts: [{ matches: ["<all_urls>"], js: ["[exo.content]"], run_at: "document_start" }],
      };
      const out = builder.buildForBrowser(
        { chromium: manifest },
        [entry("content", "/c/index.js")],
        "chromium"
      );
      expect((out as { content_scripts?: { js: string[] }[] }).content_scripts?.[0].js).toEqual([
        MANIFEST_ENTRY_PATHS.content,
      ]);
    });

    it("expands [exo.content] to multiple js and css when contentScriptOutput provided", () => {
      const builder = new ManifestBuilder();
      const manifest = {
        ...baseManifest,
        content_scripts: [
          {
            matches: ["<all_urls>"],
            js: ["[exo.content]"],
            css: ["[exo.content]"],
          },
        ],
      };
      const contentScriptOutput: ContentScriptOutput = {
        js: ["content/index.js", "static/js/vendor.js"],
        css: ["static/css/content.abc123.css"],
      };
      const out = builder.buildForBrowser(
        { chromium: manifest },
        [entry("content", "/c/index.js")],
        "chromium",
        undefined,
        contentScriptOutput
      );
      const cs = (out as { content_scripts?: { js: string[]; css?: string[] }[] }).content_scripts?.[0];
      expect(cs?.js).toEqual(["content/index.js", "static/js/vendor.js"]);
      expect(cs?.css).toEqual(["static/css/content.abc123.css"]);
    });

    it("removes css field when contentScriptOutput.css is empty", () => {
      const builder = new ManifestBuilder();
      const manifest = {
        ...baseManifest,
        content_scripts: [
          { matches: ["<all_urls>"], js: ["[exo.content]"], css: ["[exo.content]"] },
        ],
      };
      const contentScriptOutput: ContentScriptOutput = {
        js: ["content/index.js"],
        css: [],
      };
      const out = builder.buildForBrowser(
        { chromium: manifest },
        [entry("content", "/c/index.js")],
        "chromium",
        undefined,
        contentScriptOutput
      );
      const cs = (out as { content_scripts?: Record<string, unknown>[] }).content_scripts?.[0];
      expect(cs?.js).toEqual(["content/index.js"]);
      expect("css" in (cs ?? {})).toBe(false);
    });

    it("removes css field when user has css [exo.content] and no contentScriptOutput (default empty css)", () => {
      const builder = new ManifestBuilder();
      const manifest = {
        ...baseManifest,
        content_scripts: [
          { matches: ["<all_urls>"], js: ["[exo.content]"], css: ["[exo.content]"] },
        ],
      };
      const out = builder.buildForBrowser(
        { chromium: manifest },
        [entry("content", "/c/index.js")],
        "chromium"
      );
      const cs = (out as { content_scripts?: Record<string, unknown>[] }).content_scripts?.[0];
      expect(cs?.js).toEqual([MANIFEST_ENTRY_PATHS.content]);
      expect("css" in (cs ?? {})).toBe(false);
    });

    it("replaces [exo.devtools] when devtools entry present", () => {
      const builder = new ManifestBuilder();
      const manifest = { ...baseManifest, devtools_page: "[exo.devtools]" };
      const out = builder.buildForBrowser(
        { chromium: manifest },
        [entry("devtools", "/d/index.js", "/d/index.html")],
        "chromium"
      );
      expect((out as { devtools_page?: string }).devtools_page).toBe(MANIFEST_ENTRY_PATHS.devtools);
    });

    it("does not modify manifest when no placeholders used", () => {
      const builder = new ManifestBuilder();
      const manifest = {
        ...baseManifest,
        background: { service_worker: "my-background.js" },
      };
      const out = builder.buildForBrowser(
        { chromium: manifest },
        [entry("background", "/b/index.js")],
        "chromium"
      );
      expect((out as { background?: { service_worker: string } }).background?.service_worker).toBe(
        "my-background.js"
      );
    });

    it("uses chromium branch when browser is chromium", () => {
      const chromiumManifest = { ...baseManifest, name: "Chromium" };
      const firefoxManifest = { ...baseManifest, name: "Firefox" };
      const config = { chromium: chromiumManifest, firefox: firefoxManifest };
      const builder = new ManifestBuilder();
      const out = builder.buildForBrowser(config, [], "chromium");
      expect((out as { name?: string }).name).toBe("Chromium");
    });

    it("uses firefox branch when browser is firefox", () => {
      const chromiumManifest = { ...baseManifest, name: "Chromium" };
      const firefoxManifest = { ...baseManifest, name: "Firefox" };
      const config = { chromium: chromiumManifest, firefox: firefoxManifest };
      const builder = new ManifestBuilder();
      const out = builder.buildForBrowser(config, [], "firefox");
      expect((out as { name?: string }).name).toBe("Firefox");
    });
  });

  describe("resolveManifestChromium / resolveManifestFirefox", () => {
    it("resolveManifestChromium replaces placeholders with entry paths", () => {
      const manifest = {
        ...baseManifest,
        action: { default_popup: "[exo.popup]" },
        background: { service_worker: "[exo.background]" },
      };
      const out = resolveManifestChromium(
        { chromium: manifest },
        [entry("popup", "/p/index.js", "/p/index.html"), entry("background", "/b/index.js")]
      );
      expect((out as { action?: { default_popup: string } }).action?.default_popup).toBe(
        MANIFEST_ENTRY_PATHS.popup
      );
      expect((out as { background?: { service_worker: string } }).background?.service_worker).toBe(
        MANIFEST_ENTRY_PATHS.background
      );
    });

    it("resolveManifestFirefox returns firefox manifest", () => {
      const out = resolveManifestFirefox({ firefox: baseManifest }, []);
      expect((out as { name?: string }).name).toBe("Test");
    });
  });

  describe("options and sidepanel", () => {
    it("replaces [exo.options] when options entry present", () => {
      const builder = new ManifestBuilder();
      const manifest = {
        ...baseManifest,
        options_ui: { page: "[exo.options]", open_in_tab: true },
      };
      const out = builder.buildForBrowser(
        { chromium: manifest },
        [entry("options", "/o/index.js", "/o/index.html")],
        "chromium"
      );
      expect((out as { options_ui?: { page: string } }).options_ui?.page).toBe(
        MANIFEST_ENTRY_PATHS.options
      );
    });

    it("replaces [exo.sidepanel] when sidepanel entry present", () => {
      const builder = new ManifestBuilder();
      const manifest = {
        ...baseManifest,
        side_panel: { default_path: "[exo.sidepanel]" },
      };
      const out = builder.buildForBrowser(
        { chromium: manifest },
        [entry("sidepanel", "/s/index.js", "/s/index.html")],
        "chromium"
      );
      expect((out as { side_panel?: { default_path: string } }).side_panel?.default_path).toBe(
        MANIFEST_ENTRY_PATHS.sidepanel
      );
    });

    it("uses firefox fallback to chromium when firefox undefined", () => {
      const config = { chromium: { ...baseManifest, name: "C" } };
      const builder = new ManifestBuilder();
      const out = builder.buildForBrowser(config, [], "firefox");
      expect((out as { name?: string }).name).toBe("C");
    });

    it("uses chromium fallback to firefox when chromium undefined", () => {
      const config = { firefox: { ...baseManifest, name: "F" } };
      const builder = new ManifestBuilder();
      const out = builder.buildForBrowser(config, [], "chromium");
      expect((out as { name?: string }).name).toBe("F");
    });

    it("calls onWarn when target missing and uses fallback", () => {
      const config = { chromium: { ...baseManifest, name: "C" } };
      const builder = new ManifestBuilder();
      const warns: string[] = [];
      const out = builder.buildForBrowser(config, [], "firefox", (msg) => warns.push(msg));
      expect((out as { name?: string }).name).toBe("C");
      expect(warns.some((w) => w.includes("firefox") && w.includes("chromium"))).toBe(true);
    });

    it("keeps unknown [exo.xxx] placeholder when no entry", () => {
      const builder = new ManifestBuilder();
      const manifest = { ...baseManifest, action: { default_popup: "[exo.popup] [exo.unknown]" } };
      const out = builder.buildForBrowser(
        { chromium: manifest },
        [entry("popup", "/p/index.js", "/p/index.html")],
        "chromium"
      );
      const popup = (out as { action?: { default_popup: string } }).action?.default_popup ?? "";
      expect(popup).toContain(MANIFEST_ENTRY_PATHS.popup);
      expect(popup).toContain("[exo.unknown]");
    });

    it("replaces placeholders in nested arrays and objects", () => {
      const builder = new ManifestBuilder();
      const manifest = {
        ...baseManifest,
        content_scripts: [{ js: ["[exo.background]"], matches: ["<all_urls>"] }],
      };
      const out = builder.buildForBrowser(
        { chromium: manifest },
        [entry("background", "/b/index.js")],
        "chromium"
      );
      const js = (out as { content_scripts?: { js: string[] }[] }).content_scripts?.[0].js ?? [];
      expect(js[0]).toBe(MANIFEST_ENTRY_PATHS.background);
    });

    it("replacePlaceholdersInValue leaves non-string non-array non-object unchanged", () => {
      const builder = new ManifestBuilder();
      const manifest = {
        ...baseManifest,
        version: 2,
        action: { default_popup: "[exo.popup]" },
      };
      const out = builder.buildForBrowser(
        { chromium: manifest },
        [entry("popup", "/p/index.js", "/p/index.html")],
        "chromium"
      );
      expect((out as { version?: number }).version).toBe(2);
    });

    it("uses single manifest when not ChromiumFirefoxManifest", () => {
      const builder = new ManifestBuilder();
      const single = { ...baseManifest, name: "Single" };
      const out = builder.buildForBrowser(single, [], "chromium");
      expect((out as { name?: string }).name).toBe("Single");
    });

    it("calls onWarn when both chromium and firefox exist but target branch is missing", () => {
      const config = {
        chromium: { ...baseManifest, name: "C" },
        firefox: undefined as unknown,
      };
      const builder = new ManifestBuilder();
      const warns: string[] = [];
      const out = builder.buildForBrowser(config, [], "firefox", (msg) => warns.push(msg));
      expect((out as { name?: string }).name).toBe("C");
      expect(warns.length).toBeGreaterThan(0);
    });

    it("returns empty manifest and warns when no chromium or firefox object", () => {
      const config = { chromium: null, firefox: null } as unknown as { chromium: null; firefox: null };
      const builder = new ManifestBuilder();
      const warns: string[] = [];
      const out = builder.buildForBrowser(config, [], "chromium", (msg) => warns.push(msg));
      expect(out).toEqual({});
      expect(warns.some((w) => w.includes("fallback"))).toBe(true);
    });

    it("calls onWarn when both branches exist but target key returns non-object (fallback path)", () => {
      let readCount = 0;
      const config = {
        chromium: { ...baseManifest, name: "C" },
        get firefox() {
          readCount++;
          return readCount === 1 ? {} : undefined;
        },
      };
      const builder = new ManifestBuilder();
      const warns: string[] = [];
      const out = builder.buildForBrowser(config, [], "firefox", (msg) => warns.push(msg));
      expect((out as { name?: string }).name).toBe("C");
      expect(warns.length).toBeGreaterThan(0);
    });

    it("uses chromium fallback and onWarn when both exist but firefox key returns null", () => {
      let firefoxReads = 0;
      const config = {
        chromium: { ...baseManifest, name: "C" },
        get firefox() {
          firefoxReads++;
          return firefoxReads === 1 ? { name: "F" } : null;
        },
      };
      const builder = new ManifestBuilder();
      const warns: string[] = [];
      const out = builder.buildForBrowser(config, [], "firefox", (msg) => warns.push(msg));
      expect((out as { name?: string }).name).toBe("C");
      expect(warns.some((w) => w.includes("firefox") && w.includes("chromium"))).toBe(true);
    });

    it("resolveManifestForTarget calls onWarn on fallback", () => {
      const config = { chromium: { ...baseManifest, name: "C" } };
      const warns: string[] = [];
      const out = resolveManifestForTarget(
        config,
        [],
        "firefox",
        (msg) => warns.push(msg)
      );
      expect((out as { name?: string }).name).toBe("C");
      expect(warns.length).toBeGreaterThan(0);
    });
  });
});
