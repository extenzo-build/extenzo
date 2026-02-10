import { test, expect } from "../fixtures/extension";

test.describe("plugin-extension-monitor", () => {
  test("monitor page is openable (command opens extenzo-monitor)", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(
      `chrome-extension://${extensionId}/extenzo-monitor/extenzo-monitor.html`
    );
    await expect(page).toHaveURL(/extenzo-monitor\.html/);
    await expect(page).toHaveTitle("Extenzo Monitor");
    await page.close();
  });
});
