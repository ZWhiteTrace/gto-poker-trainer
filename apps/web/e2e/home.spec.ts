import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should display the home page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Check main title is visible
    await expect(page.locator("h1")).toBeVisible();

    // Check navigation elements
    await expect(page.getByRole("navigation")).toBeVisible();

    // Check some content is loaded
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("should navigate to RFI drill", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Click on Practice menu or RFI Drill link
    const practiceNav = page.getByRole("button", { name: /practice|練習/i });
    if (await practiceNav.isVisible()) {
      await practiceNav.click();
    }

    const rfiLink = page.getByRole("link", { name: /rfi/i }).first();
    if (await rfiLink.isVisible()) {
      await rfiLink.click();
      await expect(page).toHaveURL(/drill\/rfi/);
    }
  });

  test("should navigate to Learn section", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const learnLink = page.getByRole("link", { name: /learn|學習/i }).first();
    if (await learnLink.isVisible()) {
      await learnLink.click();
      await expect(page).toHaveURL(/learn/);
    }
  });
});
