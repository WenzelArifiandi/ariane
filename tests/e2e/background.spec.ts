import { test, expect } from "@playwright/test";

// This test assumes the dev server is running at http://127.0.0.1:4321
// Run with: npx playwright test tests/e2e/background.spec.ts --project=chromium

test.describe("Site background", () => {
  test("page background should be #FEFBFF", async ({ page }) => {
    await page.goto("http://127.0.0.1:4321/");
    // Wait for body to be present
    await page.waitForSelector("body");
    const bg = await page.evaluate(() => {
      const body = document.querySelector("body");
      return body ? getComputedStyle(body).backgroundColor : null;
    });
    // #FEFBFF in RGB is rgb(254, 251, 255)
    expect(bg).toBe("rgb(254, 251, 255)");
  });
});
