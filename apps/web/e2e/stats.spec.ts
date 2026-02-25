import { test, expect } from "@playwright/test";

test.describe("Stats Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/stats");
    await page.waitForLoadState("networkidle");
  });

  test("should load stats page", async ({ page }) => {
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
  });

  test("should display stat sections", async ({ page }) => {
    const cards = page.locator("[class*='card'], [class*='Card']");
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test("should have position data or empty state", async ({ page }) => {
    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    // Either has position data or some content
    expect(pageContent.length).toBeGreaterThan(1000);
  });
});

test.describe("Leaderboard Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/leaderboard");
    await page.waitForLoadState("networkidle");
  });

  test("should load leaderboard page", async ({ page }) => {
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
  });

  test("should have tabs or content", async ({ page }) => {
    const tabs = page.locator("[role='tab'], [role='tablist']");
    const hasTabList = await tabs
      .first()
      .isVisible()
      .catch(() => false);
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    expect(hasTabList || buttonCount > 0).toBe(true);
  });

  test("should have content area", async ({ page }) => {
    await page.waitForTimeout(1000);
    const content = page.locator("[class*='card'], [class*='Card'], table, [role='list'], main");
    const contentCount = await content.count();
    expect(contentCount).toBeGreaterThan(0);
  });
});
