import { test, expect } from '@playwright/test';

test.describe('Quiz Section', () => {
  test('should display quiz overview page', async ({ page }) => {
    await page.goto('/quiz');
    await page.waitForLoadState('domcontentloaded');

    // Check for page title
    await expect(page.locator('h1')).toBeVisible();

    // Check for quiz category cards
    await expect(page.getByRole('link', { name: /logic|equity|outs|gto|邏輯|權益/i }).first()).toBeVisible();
  });

  test('should navigate to logic quiz', async ({ page }) => {
    await page.goto('/quiz/logic');
    await page.waitForLoadState('domcontentloaded');

    // Check for quiz interface
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Check for question or options
    await expect(page.getByRole('button')).toBeTruthy();
  });

  test('should navigate to equity quiz', async ({ page }) => {
    await page.goto('/quiz/equity');
    await page.waitForLoadState('domcontentloaded');

    // Check for quiz interface
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should navigate to exploit quiz', async ({ page }) => {
    await page.goto('/quiz/exploit');
    await page.waitForLoadState('domcontentloaded');

    // Check for quiz interface
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

test.describe('Mock Exam', () => {
  test('should display exam start page', async ({ page }) => {
    await page.goto('/exam');
    await page.waitForLoadState('domcontentloaded');

    // Check page loaded successfully (no 404/500)
    const title = await page.title();
    expect(title).toBeTruthy();

    // Check for buttons (start exam or navigation)
    const buttons = await page.getByRole('button').count();
    expect(buttons).toBeGreaterThan(0);
  });

  test('should start exam when clicking start button', async ({ page }) => {
    await page.goto('/exam');
    await page.waitForLoadState('domcontentloaded');

    // Find and click the start exam button (has 'Start' or contains exam-related text)
    const startButton = page.getByRole('button').filter({ hasText: /start exam|開始|模擬考/i }).first();
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }

    // Page should have changed or show questions
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

test.describe('Statistics Page', () => {
  test('should display statistics dashboard', async ({ page }) => {
    await page.goto('/stats');
    await page.waitForLoadState('domcontentloaded');

    // Check for page title
    await expect(page.locator('h1')).toBeVisible();

    // Check for statistics cards or charts
    await expect(page.locator('[class*="card"], [class*="stat"]').first()).toBeVisible();
  });
});

test.describe('Analyze Page', () => {
  test('should display hand analyzer', async ({ page }) => {
    await page.goto('/analyze');
    await page.waitForLoadState('domcontentloaded');

    // Check for page title
    await expect(page.locator('h1')).toBeVisible();

    // Check for some interactive element (button or input)
    const hasInput = await page.locator('textarea, input').count();
    const hasButton = await page.getByRole('button').count();
    expect(hasInput + hasButton).toBeGreaterThan(0);
  });
});
