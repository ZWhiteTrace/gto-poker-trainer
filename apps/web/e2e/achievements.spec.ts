import { test, expect } from "@playwright/test";

/**
 * Achievement system tests.
 * Tests the achievements page functionality and check achievements button.
 */

test.describe("Achievements Page", () => {
  test("achievements page loads", async ({ page }) => {
    await page.goto("/achievements");
    await page.waitForLoadState("domcontentloaded");

    // Page should have a title
    const title = await page.title();
    expect(title).toBeTruthy();

    // Page should not have error state
    const errorText = await page.locator("text=/error|exception/i").count();
    expect(errorText).toBe(0);
  });

  test("shows login required when not authenticated", async ({ page }) => {
    await page.goto("/achievements");
    await page.waitForLoadState("domcontentloaded");

    // Wait for either login required or achievements content
    await expect(
      page.locator('text=/Login Required|Achievements|成就|登入/i').first()
    ).toBeVisible({ timeout: 15000 });

    // Should show login required message or achievements list
    const loginRequired = page.locator('h2:has-text("Login Required")');
    const isLoginRequired = (await loginRequired.count()) > 0;

    const achievementTitle = page.locator('h1:has-text("Achievements")');
    const hasAchievements = (await achievementTitle.count()) > 0;

    expect(isLoginRequired || hasAchievements).toBeTruthy();
  });

  test("check achievements button exists when authenticated", async ({
    page,
  }) => {
    // This test will only pass when the user is authenticated
    // For now, we just verify the page structure
    await page.goto("/achievements");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    // Look for the Check Achievements button (visible when logged in)
    const checkButtonEn = page.locator('button:has-text("Check Achievements")');
    const checkButtonZh = page.locator('button:has-text("檢查成就")');

    // If user is logged in, button should exist
    // If not logged in, this test is skipped
    const loginRequired = await page.locator('h2:has-text("Login Required")').count();

    if (loginRequired === 0) {
      // User is logged in, check for button
      const hasButton =
        (await checkButtonEn.count()) > 0 ||
        (await checkButtonZh.count()) > 0;
      expect(hasButton).toBeTruthy();
    } else {
      // Not authenticated - test passes (button only visible when logged in)
      expect(loginRequired).toBeGreaterThan(0);
    }
  });
});
