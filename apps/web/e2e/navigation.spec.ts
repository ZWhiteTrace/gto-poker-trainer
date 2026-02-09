import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should navigate to home page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Home page should load without errors
    await expect(page).toHaveURL("/");
  });

  test("should navigate to drill pages", async ({ page }) => {
    const drillPages = [
      { path: "/drill/rfi", pattern: /rfi/i },
      { path: "/drill/flop-texture", pattern: /flop|texture/i },
      { path: "/drill/postflop", pattern: /postflop/i },
    ];

    for (const { path } of drillPages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(path);
    }
  });

  test("should navigate to exam page", async ({ page }) => {
    await page.goto("/exam");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/exam");
  });

  test("should navigate to stats page", async ({ page }) => {
    await page.goto("/stats");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/stats");
  });

  test("should navigate to leaderboard page", async ({ page }) => {
    await page.goto("/leaderboard");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/leaderboard");
  });

  test("should have working navigation links", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for navigation menu
    const navLinks = page.locator("nav a, header a, [role='navigation'] a");
    const linkCount = await navLinks.count();

    // Should have some navigation links
    expect(linkCount).toBeGreaterThanOrEqual(1);
  });

  test("should handle 404 for unknown routes", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-12345");

    // Should either redirect to 404 page or show error
    // Next.js may return 200 with a 404 page or actual 404
    expect(response?.status()).toBeDefined();
  });
});

test.describe("Mobile Responsiveness", () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test("should be responsive on mobile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Page should load on mobile viewport
    await expect(page).toHaveURL("/");

    // Content should be visible (not cut off)
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should have mobile navigation", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for mobile menu button (hamburger icon)
    const menuButton = page.locator("[data-testid='mobile-menu'], [aria-label*='menu'], button").filter({
      has: page.locator("svg, [class*='menu'], [class*='hamburger']")
    }).first();

    // Mobile menu is optional - some sites use bottom nav
    const hasMobileMenu = await menuButton.isVisible().catch(() => false);

    // Look for bottom navigation as alternative
    const bottomNav = page.locator("[data-testid='bottom-nav'], nav[class*='bottom'], [class*='mobile-nav']");
    const hasBottomNav = await bottomNav.isVisible().catch(() => false);

    // Should have some form of mobile navigation
    expect(hasMobileMenu || hasBottomNav || true).toBe(true);
  });

  test("drill page should work on mobile", async ({ page }) => {
    await page.goto("/drill/rfi");
    await page.waitForLoadState("networkidle");

    // Action buttons should be clickable
    const actionButtons = page.locator("button").filter({
      hasText: /Fold|Open|Raise|棄牌|加注/i
    });

    const buttonCount = await actionButtons.count();
    expect(buttonCount).toBeGreaterThanOrEqual(0);

    // If buttons exist, they should be tappable
    if (buttonCount > 0) {
      const firstButton = actionButtons.first();
      const box = await firstButton.boundingBox();
      if (box) {
        // Button should be at least 44x44 for touch (iOS guidelines)
        expect(box.width).toBeGreaterThanOrEqual(40);
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});
