import { test, expect } from "@playwright/test";

test.describe("Exam Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/exam");
    await page.waitForLoadState("networkidle");
  });

  test("should load exam page", async ({ page }) => {
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
  });

  test("should have interactive elements", async ({ page }) => {
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test("should have cards or sections", async ({ page }) => {
    const cards = page.locator("[class*='card'], [class*='Card'], article, section");
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test("page should be accessible", async ({ page }) => {
    const headings = page.locator("h1, h2, h3");
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
  });
});

test.describe("Exam Interaction", () => {
  test("should be able to interact with exam", async ({ page }) => {
    await page.goto("/exam");
    await page.waitForLoadState("networkidle");

    const buttons = page.locator("button");
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      await buttons.first().click();
      await page.waitForTimeout(500);
      const stillHasButtons = await page.locator("button").count();
      expect(stillHasButtons).toBeGreaterThan(0);
    }
  });
});
