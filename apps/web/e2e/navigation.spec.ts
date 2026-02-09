import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should navigate to home page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should navigate to drill pages", async ({ page }) => {
    const drillPages = ["/drill/rfi", "/drill/flop-texture", "/drill/postflop"];

    for (const path of drillPages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
    }
  });

  test("should navigate to exam page", async ({ page }) => {
    await page.goto("/exam");
    await page.waitForLoadState("networkidle");
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
  });

  test("should navigate to stats page", async ({ page }) => {
    await page.goto("/stats");
    await page.waitForLoadState("networkidle");
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
  });

  test("should navigate to leaderboard page", async ({ page }) => {
    await page.goto("/leaderboard");
    await page.waitForLoadState("networkidle");
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
  });

  test("should have navigation elements", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const navLinks = page.locator("nav a, header a, [role='navigation'] a");
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);
  });
});

test.describe("Mobile Responsiveness", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should be responsive on mobile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("drill page should work on mobile", async ({ page }) => {
    await page.goto("/drill/rfi");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test("navigation should be accessible on mobile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const navElements = page.locator("nav, header, [role='navigation']");
    const hasNav = await navElements.first().isVisible().catch(() => false);
    expect(hasNav).toBe(true);
  });
});
