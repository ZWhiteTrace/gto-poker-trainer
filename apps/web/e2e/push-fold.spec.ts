import { test, expect, Page } from '@playwright/test';

/**
 * Push/Fold drill E2E tests.
 * 4 modes: Open Shove, Defense, Resteal, Heads Up
 */

async function waitForSpot(page: Page) {
  // Wait for loading to finish and action buttons to appear
  await page.waitForFunction(() => {
    const spinners = document.querySelectorAll('.animate-spin');
    const buttons = document.querySelectorAll('button');
    return spinners.length === 0 && buttons.length >= 2;
  }, { timeout: 15000 });
}

test.describe('Push/Fold Drill', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/drill/push-fold');
    await page.waitForLoadState('domcontentloaded');
  });

  test('loads page with mode tabs and stats', async ({ page }) => {
    // Title visible
    await expect(page.locator('h1')).toBeVisible();

    // Mode tabs visible (Open Shove / Defense vs Shove / 3bet Shove / Heads Up)
    await expect(
      page.locator('[role="tab"]').filter({ hasText: /Open Shove/i }).first()
    ).toBeVisible();

    // Stats labels visible (Total, Correct, Accuracy, Streak)
    await expect(page.locator('text=/Total/i').first()).toBeVisible();
    await expect(page.locator('text=/Accuracy/i').first()).toBeVisible();
  });

  test('generates spot and shows hand + position + stack', async ({ page }) => {
    await waitForSpot(page);

    // Should show "Your Hand" label
    await expect(page.locator('text=/Your Hand/i').first()).toBeVisible();

    // Should show stack info (e.g. "5bb")
    await expect(page.locator('text=/bb/i').first()).toBeVisible();

    // Should show position info
    await expect(
      page.locator('text=/Position/i').first()
    ).toBeVisible();
  });

  test('answering push/fold shows result', async ({ page }) => {
    await waitForSpot(page);

    // Click Push or Fold button
    const pushBtn = page.locator('button').filter({
      hasText: /^(Push|Fold|Call|Shove)$/i,
    }).first();

    await pushBtn.scrollIntoViewIfNeeded();
    await pushBtn.click();

    // Result should appear
    await expect(
      page.locator('text=/Correct|Incorrect|正確|錯誤/i').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('switching modes changes the drill type', async ({ page }) => {
    // Click Defense tab
    const defenseTab = page.locator('[role="tab"]').filter({
      hasText: /Defense/i,
    }).first();

    if (await defenseTab.isVisible()) {
      await defenseTab.click();
      await waitForSpot(page);

      // Defense mode should show scenario context
      await expect(page.locator('text=/Your Hand/i').first()).toBeVisible();
    }
  });

  test('next hand button loads new spot after answering', async ({ page }) => {
    await waitForSpot(page);

    // Answer current spot
    const actionBtn = page.locator('button').filter({
      hasText: /^(Push|Fold|Call|Shove)$/i,
    }).first();
    await actionBtn.scrollIntoViewIfNeeded();
    await actionBtn.click();

    // Wait for result
    await expect(
      page.locator('text=/Correct|Incorrect/i').first()
    ).toBeVisible({ timeout: 5000 });

    // Click next hand
    const nextBtn = page.locator('button').filter({
      hasText: /Next Hand|下一手/i,
    }).first();
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await waitForSpot(page);
      // New spot should show action buttons again
      await expect(
        page.locator('button').filter({ hasText: /^(Push|Fold|Call|Shove)$/i }).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('?position=BTN URL param works', async ({ page }) => {
    await page.goto('/drill/push-fold?position=BTN');
    await page.waitForLoadState('domcontentloaded');
    await waitForSpot(page);

    // BTN should be displayed in the scenario
    await expect(page.locator('text=/BTN/').first()).toBeVisible();
  });
});
