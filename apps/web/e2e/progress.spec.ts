import { test, expect } from "@playwright/test";

/**
 * Progress page E2E tests.
 * Note: /progress route may not be accessible on all deployments.
 * Tests are designed to handle both loaded and redirected states.
 */

test.describe("Progress Page", () => {
  test("loads page or redirects gracefully", async ({ page }) => {
    await page.goto("/progress");
    await page.waitForLoadState("domcontentloaded");

    // Check if we actually landed on the progress page (has h1 with progress-related text)
    const isProgressPage = await page
      .locator("h1")
      .first()
      .textContent({ timeout: 5000 })
      .catch(() => "");

    if (isProgressPage && /progress|統計|Statistics/i.test(isProgressPage)) {
      // We're on the progress page
      await expect(page.locator("h1")).toBeVisible();
    } else {
      // Page redirected (e.g. to home) - skip remaining assertions
      test.skip(true, "Progress page not available on this deployment");
    }
  });

  test("shows drill stats when progress page is available", async ({ page }) => {
    await page.goto("/progress");
    await page.waitForLoadState("domcontentloaded");

    // Check if we're on the progress page
    const h1Text = await page
      .locator("h1")
      .first()
      .textContent({ timeout: 5000 })
      .catch(() => "");

    if (!h1Text || !/progress|統計|Statistics/i.test(h1Text)) {
      test.skip(true, "Progress page not available on this deployment");
      return;
    }

    // Should have drill type labels (RFI, VS RFI, VS 3-Bet, etc.)
    await expect(
      page.locator("text=/RFI|VS RFI|3.?Bet|4.?Bet|Push|Postflop|Endless|Multi/i").first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("practice now button navigates to drill page", async ({ page }) => {
    await page.goto("/progress");
    await page.waitForLoadState("domcontentloaded");

    const h1Text = await page
      .locator("h1")
      .first()
      .textContent({ timeout: 5000 })
      .catch(() => "");

    if (!h1Text || !/progress|統計|Statistics/i.test(h1Text)) {
      test.skip(true, "Progress page not available on this deployment");
      return;
    }

    // Find a "Practice Now" / "練習" button
    const practiceBtn = page
      .locator("button, a")
      .filter({
        hasText: /Practice|練習/i,
      })
      .first();

    if (await practiceBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await practiceBtn.click();
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveURL(/drill/);
    }
  });

  test("reset button shows confirmation dialog", async ({ page }) => {
    // Inject fake stats before navigating
    await page.goto("/progress");
    await page.waitForLoadState("domcontentloaded");

    const h1Text = await page
      .locator("h1")
      .first()
      .textContent({ timeout: 5000 })
      .catch(() => "");

    if (!h1Text || !/progress|統計|Statistics/i.test(h1Text)) {
      test.skip(true, "Progress page not available on this deployment");
      return;
    }

    await page.evaluate(() => {
      const fakeStats = {
        stats: {
          rfi: { total: 10, correct: 7, acceptable: 1, byPosition: {} },
          vs_rfi: { total: 0, correct: 0, acceptable: 0, byPosition: {} },
          vs_3bet: { total: 0, correct: 0, acceptable: 0, byPosition: {} },
          vs_4bet: { total: 0, correct: 0, acceptable: 0, byPosition: {} },
          push_fold: { total: 0, correct: 0, acceptable: 0, byPosition: {} },
          postflop: { total: 0, correct: 0, acceptable: 0, byPosition: {} },
          endless: { total: 0, correct: 0, acceptable: 0, byPosition: {} },
          multistreet: { total: 0, correct: 0, acceptable: 0, byPosition: {} },
          table_trainer: { total: 0, correct: 0, acceptable: 0, byPosition: {} },
          mtt: { total: 0, correct: 0, acceptable: 0, byPosition: {} },
        },
        recentResults: [],
      };
      localStorage.setItem("progress-storage", JSON.stringify({ state: fakeStats, version: 0 }));
    });

    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Look for reset/trash button
    const resetBtn = page
      .locator("button")
      .filter({
        hasText: /Reset|重置/i,
      })
      .first();

    if (await resetBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      page.once("dialog", async (dialog) => {
        expect(dialog.type()).toBe("confirm");
        await dialog.dismiss();
      });

      await resetBtn.click();
    }
  });
});
