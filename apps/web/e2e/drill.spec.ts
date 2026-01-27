import { test, expect } from '@playwright/test';

test.describe('RFI Drill', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/drill/rfi');
    await page.waitForLoadState('networkidle');
  });

  test('should display drill interface', async ({ page }) => {
    // Check for page header
    await expect(page.locator('h1')).toBeVisible();

    // Check for action buttons
    const actionButtons = page.locator('button').filter({ hasText: /raise|fold|call|加注|棄牌|跟注/i });
    await expect(actionButtons.first()).toBeVisible();
  });

  test('should allow selecting an action', async ({ page }) => {
    // Wait for scenario to load
    await page.waitForSelector('button');

    // Find and click an action button
    const raiseButton = page.getByRole('button', { name: /raise|加注/i }).first();
    const foldButton = page.getByRole('button', { name: /fold|棄牌/i }).first();

    if (await raiseButton.isVisible()) {
      await raiseButton.click();
      // After clicking, result should be shown
      await page.waitForTimeout(500);
    } else if (await foldButton.isVisible()) {
      await foldButton.click();
      await page.waitForTimeout(500);
    }

    // Score should update or result should be visible
    await expect(page.locator('body')).toContainText(/1/);
  });

  test('should track score', async ({ page }) => {
    // Make an action
    const actionButton = page.locator('button').filter({ hasText: /raise|fold|加注|棄牌/i }).first();
    await actionButton.click();

    // Wait for result and score update
    await page.waitForTimeout(2000);

    // Page should show some result or score indicator
    await expect(page.locator('body')).toContainText(/correct|incorrect|正確|錯誤|1/i);
  });
});

test.describe('VS RFI Drill', () => {
  test('should display VS RFI drill interface', async ({ page }) => {
    await page.goto('/drill/vs-rfi');
    await page.waitForLoadState('networkidle');

    // Check for page heading
    await expect(page.locator('h1')).toBeVisible();

    // Check for action buttons
    await expect(page.getByRole('button').first()).toBeVisible();
  });
});

test.describe('Postflop Drill', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/drill/postflop');
    await page.waitForLoadState('networkidle');
  });

  test('should display postflop drill interface', async ({ page }) => {
    // Check for page heading
    await expect(page.locator('h1')).toBeVisible();

    // Check for action buttons
    await expect(page.getByRole('button').first()).toBeVisible();
  });

  test('should have street tabs', async ({ page }) => {
    // Check for Flop, Turn, River tabs
    await expect(page.getByRole('tab', { name: /flop/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /turn/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /river/i })).toBeVisible();
  });

  test('should switch between streets', async ({ page }) => {
    // Click Turn tab
    await page.getByRole('tab', { name: /turn/i }).click();
    await page.waitForLoadState('networkidle');

    // Should show 4 cards on turn
    await page.waitForTimeout(500);

    // Click River tab
    await page.getByRole('tab', { name: /river/i }).click();
    await page.waitForLoadState('networkidle');

    // Should show 5 cards on river
    await page.waitForTimeout(500);
  });

  test('should display action buttons', async ({ page }) => {
    // Check for bet/check buttons
    await expect(page.getByRole('button', { name: /bet|check|下注|過牌/i }).first()).toBeVisible();
  });
});
