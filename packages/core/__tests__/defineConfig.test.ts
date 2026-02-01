import { describe, expect, it } from "@rstest/core";
import { defineConfig } from "../src/defineConfig.js";

describe("defineConfig", () => {
  it("returns config unchanged", () => {
    const config = {
      manifest: { name: "Test", version: "0.0.1", manifest_version: 3 },
    };
    expect(defineConfig(config)).toBe(config);
  });
});
