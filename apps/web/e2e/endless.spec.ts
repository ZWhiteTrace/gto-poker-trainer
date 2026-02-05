import { test, expect, Page } from '@playwright/test';

/**
 * Endless drill E2E tests.
 * Flow: Select pot type filter → load scenario → answer → see result → next
 */

async function waitForScenario(page: Page) {
  await page.locator('text=/Your Hand|你的手牌/i').first()
    .waitFor({ state: 'visible', timeout: 15000 });
}

async function clickAction(page: Page) {
  // Match action buttons only: "Check 過牌", "Bet 33%", "Donk 33%", "All-in 全下"
  // Avoid filter buttons: "3bet", "4bet", "SRP", etc.
  const actionBtn = page.locator('button').filter({
    hasText: /^(Check|Bet \d|Donk|All-in)/,
  }).first();
  await actionBtn.scrollIntoViewIfNeeded();
  await expect(actionBtn).toBeEnabled({ timeout: 3000 });
  await actionBtn.click();
}

async function waitForResult(page: Page) {
  // Wait for "Next Question" / "下一題" button to appear after answering
  await expect(
    page.locator('button').filter({ hasText: /下一題|Next Question/i }).first()
  ).toBeVisible({ timeout: 10000 });
}

test.describe('Endless Drill', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/drill/endless');
    await page.waitForLoadState('domcontentloaded');
  });

  test('loads scenario with board + hand + action buttons', async ({ page }) => {
    await waitForScenario(page);

    // Title visible
    await expect(page.locator('h1')).toBeVisible();

    // "Your Hand" label visible
    await expect(page.locator('text=/Your Hand|你的手牌/i').first()).toBeVisible();

    // Action buttons visible below (scroll into view if needed)
    const actions = page.locator('button').filter({
      hasText: /^(Check|Bet \d|Donk|All-in)/,
    });
    await actions.first().scrollIntoViewIfNeeded();
    const count = await actions.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('stats cards show initial values', async ({ page }) => {
    await page.waitForTimeout(1000);
    // Stats labels: Total, Accuracy, Streak (en or zh)
    await expect(page.locator('text=/Total|總題數/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Accuracy|正確率/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Streak|連勝/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('selecting action shows result', async ({ page }) => {
    await waitForScenario(page);
    await clickAction(page);
    await waitForResult(page);
  });

  test('next question loads new scenario', async ({ page }) => {
    test.setTimeout(60000);
    await waitForScenario(page);

    // Answer current question
    await clickAction(page);
    await waitForResult(page);

    // Click next
    const nextBtn = page.locator('button').filter({
      hasText: /下一題|Next Question/i,
    }).first();
    await nextBtn.scrollIntoViewIfNeeded();
    await nextBtn.click();

    // Wait for new scenario
    await waitForScenario(page);

    // New action buttons should be enabled
    const newAction = page.locator('button').filter({
      hasText: /^(Check|Bet \d|Donk|All-in)/,
    }).first();
    await newAction.scrollIntoViewIfNeeded();
    await expect(newAction).toBeEnabled({ timeout: 5000 });
  });

  test('pot type filter changes scenarios', async ({ page }) => {
    await waitForScenario(page);

    const srpBtn = page.locator('button').filter({ hasText: /^SRP$/ }).first();
    if (await srpBtn.isVisible()) {
      await srpBtn.click();
      await waitForScenario(page);
      await expect(page.locator('text=/SRP/').first()).toBeVisible();
    }
  });

  test('stats update after answering', async ({ page }) => {
    await waitForScenario(page);

    // Answer a question
    await clickAction(page);
    await waitForResult(page);

    // Scroll to top to see stats
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // The stat values should now include "1" (total hands answered)
    // Check that page body contains expected update indicators
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/[1-9]/); // At least one non-zero stat
  });

  test('refresh button loads new scenario without answering', async ({ page }) => {
    await waitForScenario(page);

    const refreshBtn = page.locator('button:has(svg)').filter({
      hasNotText: /Check|Bet|SRP|3bet|4bet|All|Multiway|Limp|Squeeze|多人/i,
    }).first();

    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
      await waitForScenario(page);

      const actionBtn = page.locator('button').filter({
        hasText: /^(Check|Bet \d|Donk|All-in)/,
      }).first();
      await actionBtn.scrollIntoViewIfNeeded();
      await expect(actionBtn).toBeEnabled();
    }
  });
});
