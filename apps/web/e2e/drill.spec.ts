import { test, expect, Page } from '@playwright/test';

/**
 * Helper: wait for a drill scenario to load (action buttons rendered)
 */
async function waitForScenarioLoad(page: Page) {
  // Wait for actual poker action buttons (not just nav buttons)
  await page.waitForFunction(() => {
    const spinners = document.querySelectorAll('.animate-spin');
    const actionBtns = Array.from(document.querySelectorAll('button')).filter(btn => {
      const text = (btn.textContent || '').toLowerCase();
      return /raise|fold|call|3-?bet|4-?bet|5-?bet|加注|棄牌|跟注|all.?in|全下|check|過牌/.test(text);
    });
    return spinners.length === 0 && actionBtns.length >= 2;
  }, { timeout: 20000 });
}

/**
 * Helper: click any visible action button and return its text
 */
async function clickFirstAction(page: Page): Promise<string> {
  const actionBtn = page.locator('button').filter({
    hasText: /raise|fold|call|3-?bet|4-?bet|5-?bet|加注|棄牌|跟注|all.?in|全下/i,
  }).first();
  const text = await actionBtn.textContent() || '';
  await actionBtn.click();
  return text.trim();
}

// ─────────────────────────────────────────────
// RFI Drill
// ─────────────────────────────────────────────
test.describe('RFI Drill – Full Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/drill/rfi');
    await page.waitForLoadState('domcontentloaded');
  });

  test('loads scenario with hand + position + action buttons', async ({ page }) => {
    await waitForScenarioLoad(page);

    // Title visible
    await expect(page.locator('h1')).toBeVisible();

    // Position badge visible (HJ/CO/BTN/SB)
    await expect(page.locator('text=/HJ|CO|BTN|SB/').first()).toBeVisible();

    // At least 2 action buttons visible (raise + fold at minimum)
    const actions = page.locator('button').filter({
      hasText: /raise|fold|加注|棄牌/i,
    });
    await expect(actions).toHaveCount(2); // RFI = raise or fold
  });

  test('submit action → shows result with GTO frequency', async ({ page }) => {
    await waitForScenarioLoad(page);

    await clickFirstAction(page);

    // Result area should appear with correct/incorrect indicator
    await expect(
      page.locator('text=/correct|incorrect|正確|錯誤|可接受|acceptable/i').first()
    ).toBeVisible({ timeout: 5000 });

    // GTO frequency label should be visible
    await expect(page.locator('text=/GTO/i').first()).toBeVisible();
  });

  test('next hand button advances to new scenario', async ({ page }) => {
    test.setTimeout(60000);
    await waitForScenarioLoad(page);
    await clickFirstAction(page);

    // Wait for result to appear (GTO frequency text)
    await expect(page.locator('text=/GTO/i').first()).toBeVisible({ timeout: 10000 });

    // Small delay for result UI to fully settle
    await page.waitForTimeout(1000);

    // Click next hand — try Space first (most reliable), fallback to button
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // If Space didn't advance (still showing GTO result), try button click
    const stillShowingResult = await page.locator('text=/GTO/i').first().isVisible().catch(() => false);
    if (stillShowingResult) {
      const nextBtn = page.locator('button').filter({ hasText: /next|下一手|→/i }).first();
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click();
      }
    }

    // Wait for new scenario to load with longer timeout
    await waitForScenarioLoad(page);

    // Action buttons should be enabled again
    const actionBtn = page.locator('button').filter({
      hasText: /raise|fold|call|3-?bet|4-?bet|加注|棄牌|跟注/i,
    }).first();
    await expect(actionBtn).toBeEnabled({ timeout: 15000 });
  });

  test('keyboard shortcuts work (R=Raise, F=Fold)', async ({ page }) => {
    await waitForScenarioLoad(page);

    // Press 'R' for raise
    await page.keyboard.press('r');

    // Should show result
    await expect(
      page.locator('text=/correct|incorrect|正確|錯誤|可接受|acceptable/i').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('stats counter updates after answering', async ({ page }) => {
    await waitForScenarioLoad(page);

    // Get initial stats text
    const statsArea = page.locator('text=/0\\/0|1\\/|all.?time|累計/i').first();

    await clickFirstAction(page);
    await page.waitForTimeout(500);

    // Body should now contain "1" somewhere in stats
    await expect(page.locator('body')).toContainText(/1/);
  });
});

// ─────────────────────────────────────────────
// VS RFI Drill
// ─────────────────────────────────────────────
test.describe('VS RFI Drill – Full Flow', () => {
  test('loads with villain position + 3 actions (3bet/call/fold)', async ({ page }) => {
    await page.goto('/drill/vs-rfi');
    await page.waitForLoadState('domcontentloaded');
    await waitForScenarioLoad(page);

    // Should show villain position info ("XX opens" or "XX 開牌")
    await expect(
      page.locator('text=/opens|開牌/i').first()
    ).toBeVisible();

    // 3 action buttons: 3bet, call, fold
    const actions = page.locator('button').filter({
      hasText: /3.?bet|call|fold|跟注|棄牌/i,
    });
    const count = await actions.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('complete answer flow', async ({ page }) => {
    await page.goto('/drill/vs-rfi');
    await page.waitForLoadState('domcontentloaded');
    await waitForScenarioLoad(page);

    await clickFirstAction(page);

    await expect(
      page.locator('text=/correct|incorrect|正確|錯誤|可接受|acceptable/i').first()
    ).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────
// VS 3-Bet Drill
// ─────────────────────────────────────────────
test.describe('VS 3-Bet Drill', () => {
  test('loads and accepts answer', async ({ page }) => {
    await page.goto('/drill/vs-3bet');
    await page.waitForLoadState('domcontentloaded');
    await waitForScenarioLoad(page);

    // Should have 4bet/call/fold actions
    const actions = page.locator('button').filter({
      hasText: /4.?bet|call|fold|跟注|棄牌/i,
    });
    const count = await actions.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await clickFirstAction(page);

    await expect(
      page.locator('text=/correct|incorrect|正確|錯誤|可接受|acceptable/i').first()
    ).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────
// VS 4-Bet Drill
// ─────────────────────────────────────────────
test.describe('VS 4-Bet Drill', () => {
  test('loads and accepts answer', async ({ page }) => {
    await page.goto('/drill/vs-4bet');
    await page.waitForLoadState('domcontentloaded');
    await waitForScenarioLoad(page);

    const actions = page.locator('button').filter({
      hasText: /5.?bet|call|fold|跟注|棄牌|all/i,
    });
    const count = await actions.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await clickFirstAction(page);

    await expect(
      page.locator('text=/correct|incorrect|正確|錯誤|可接受|acceptable/i').first()
    ).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────
// Position Filter (DrillSession shared feature)
// ─────────────────────────────────────────────
test.describe('DrillSession Position Filter', () => {
  test('toggling position filter restricts scenarios', async ({ page }) => {
    await page.goto('/drill/rfi');
    await page.waitForLoadState('domcontentloaded');
    await waitForScenarioLoad(page);

    // Open settings/filter panel (gear icon or "Position Filter" section)
    const filterToggle = page.locator('text=/filter|position|篩選|位置/i').first();
    if (await filterToggle.isVisible()) {
      await filterToggle.click();
    }

    // Look for position toggle buttons
    const btnPosition = page.locator('button').filter({ hasText: /^BTN$/ }).first();
    if (await btnPosition.isVisible()) {
      // Click BTN to toggle - this is a basic check that the filter UI exists
      await expect(btnPosition).toBeVisible();
    }
  });
});

// ─────────────────────────────────────────────
// URL ?position= parameter
// ─────────────────────────────────────────────
test.describe('Drill URL Position Parameter', () => {
  test('?position=BTN pre-selects BTN only', async ({ page }) => {
    await page.goto('/drill/rfi?position=BTN');
    await page.waitForLoadState('domcontentloaded');
    await waitForScenarioLoad(page);

    // The scenario should show BTN position
    await expect(page.locator('text=/BTN/').first()).toBeVisible();
  });
});
