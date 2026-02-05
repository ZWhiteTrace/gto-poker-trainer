import { test, expect, Page } from '@playwright/test';

/**
 * Multi-street drill E2E tests.
 * Flow: Load flop scenario → decide → deal turn → decide → deal river → decide → hand review
 */

async function waitForScenario(page: Page) {
  // Wait for "Your Hand" visible text (exact string avoids hidden nav matches)
  await page.locator('text="Your Hand"').first()
    .waitFor({ state: 'visible', timeout: 15000 });
}

async function clickAction(page: Page) {
  const actionBtn = page.locator('button').filter({
    hasText: /check|bet|Check|Bet/i,
  }).first();
  await actionBtn.scrollIntoViewIfNeeded();
  await expect(actionBtn).toBeEnabled({ timeout: 3000 });
  await actionBtn.click();
}

async function handleVillainAction(page: Page) {
  const villain = page.locator('text=/Check-Raise|Villain|對手下注|對手 Check/i').first();
  if (await villain.isVisible({ timeout: 1500 }).catch(() => false)) {
    const responseBtn = page.locator('button').filter({
      hasText: /^(Fold|Call|Raise)$/i,
    }).first();
    if (await responseBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await responseBtn.scrollIntoViewIfNeeded();
      await responseBtn.click();
    }
  }
}

async function clickNextStreet(page: Page) {
  const nextBtn = page.locator('button').filter({
    hasText: /deal|next|發下|下一|Complete|完成|Deal|Next/i,
  }).first();
  await nextBtn.scrollIntoViewIfNeeded();
  await expect(nextBtn).toBeVisible({ timeout: 5000 });
  await nextBtn.click();
}

test.describe('Multistreet Drill', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/drill/multistreet');
    await page.waitForLoadState('domcontentloaded');
  });

  test('loads flop scenario with board + hand + action buttons', async ({ page }) => {
    await waitForScenario(page);

    // Title visible
    await expect(page.locator('h1')).toBeVisible();

    // "Your Hand" visible (exact text to avoid nav matches)
    await expect(page.locator('text="Your Hand"').first()).toBeVisible();

    // Action buttons visible
    const actions = page.locator('button').filter({
      hasText: /check|bet|Check|Bet/i,
    });
    await actions.first().scrollIntoViewIfNeeded();
    const count = await actions.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('selecting action shows street result', async ({ page }) => {
    await waitForScenario(page);
    await clickAction(page);

    // Wait for result or villain action
    await expect(
      page.locator('text=/Correct|正確|could be better|可以更好|Check-Raise|Villain|對手|Deal|Next|deal|next/i').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('complete full 3-street hand', async ({ page }) => {
    test.setTimeout(60000);
    await waitForScenario(page);

    // === FLOP ===
    await clickAction(page);
    await handleVillainAction(page);
    await page.waitForTimeout(500);
    await clickNextStreet(page);

    // === TURN ===
    // Wait for Turn label in the progress bar (use exact text)
    await page.waitForSelector('button:has-text("Check"), button:has-text("Bet")', { timeout: 10000 });
    await clickAction(page);
    await handleVillainAction(page);
    await page.waitForTimeout(500);
    await clickNextStreet(page);

    // === RIVER ===
    await page.waitForSelector('button:has-text("Check"), button:has-text("Bet")', { timeout: 10000 });
    await clickAction(page);
    await handleVillainAction(page);
    await page.waitForTimeout(500);

    // Click "Complete hand"
    await clickNextStreet(page);

    // === HAND REVIEW ===
    await expect(
      page.locator('text=/Review|回顧|Hand Review|手牌回顧/i').first()
    ).toBeVisible({ timeout: 5000 });

    // Should show 3 street decisions
    const decisions = page.locator('text=/Flop|Turn|River/i');
    const decisionCount = await decisions.count();
    expect(decisionCount).toBeGreaterThanOrEqual(3);

    // "Next hand" button visible
    await expect(
      page.locator('button').filter({ hasText: /next|下一手|Next/i }).first()
    ).toBeVisible();
  });

  test('stats cards show expected labels', async ({ page }) => {
    // Wait for page to fully render (client-side hydration)
    await page.waitForTimeout(2000);

    // Use exact string matching to avoid hidden nav elements
    await expect(page.locator('text="Total Hands"').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="Perfect"').first()).toBeVisible({ timeout: 5000 });
  });

  test('refresh button starts new scenario', async ({ page }) => {
    await waitForScenario(page);

    // Click refresh icon
    const refreshBtn = page.locator('button:has(svg)').filter({
      hasNotText: /check|bet|Check|Bet|Fold|Call|Raise/i,
    }).first();

    if (await refreshBtn.isVisible()) {
      await refreshBtn.click();
      await waitForScenario(page);
    }
  });
});
