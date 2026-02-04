import { describe, expect, it } from "@rstest/core";

describe("webextension-polyfill", () => {
  it("re-exports webextension-polyfill (in Node the polyfill throws when not in extension)", async () => {
    await expect(import("../src/webextension-polyfill.js")).rejects.toThrow(/extension/);
  });

});
