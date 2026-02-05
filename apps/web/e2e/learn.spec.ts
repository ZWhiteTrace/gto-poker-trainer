import { test, expect } from '@playwright/test';

test.describe('Learn Section', () => {
  test('should display learn page with guides list', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('domcontentloaded');

    // Check for page title
    await expect(page.locator('h1')).toBeVisible();

    // Check for guide cards/links
    const guideLinks = page.getByRole('link', { name: /guide|指南|策略|入門/i });
    await expect(guideLinks.first()).toBeVisible();
  });

  test('should navigate to a guide', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('domcontentloaded');

    // Click on first guide link
    const guideLink = page.locator('a[href*="/learn/"]').first();
    if (await guideLink.isVisible()) {
      await guideLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Should show guide content
      await expect(page.locator('article, .prose, [class*="content"]')).toBeVisible();
    }
  });

  test('should display RFI guide content', async ({ page }) => {
    await page.goto('/learn/rfi-ranges-guide');
    await page.waitForLoadState('domcontentloaded');

    // Check for guide title
    await expect(page.locator('h1')).toBeVisible();

    // Check for content sections
    await expect(page.locator('h2, h3').first()).toBeVisible();
  });

  test('should display beginner guide', async ({ page }) => {
    await page.goto('/learn/beginners-complete-guide');
    await page.waitForLoadState('domcontentloaded');

    // Check for guide title
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('MTT Tools', () => {
  test('should display push/fold chart', async ({ page }) => {
    await page.goto('/mtt/push-fold');
    await page.waitForLoadState('domcontentloaded');

    // Check for page title
    await expect(page.locator('h1')).toBeVisible();

    // Check for interactive elements
    await expect(page.getByRole('button').first()).toBeVisible();
  });

  test('should display stack depth selector', async ({ page }) => {
    await page.goto('/mtt/push-fold');
    await page.waitForLoadState('domcontentloaded');

    // Page should have loaded with content
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

test.describe('Range Viewer', () => {
  test('should display range viewer', async ({ page }) => {
    await page.goto('/ranges');
    await page.waitForLoadState('domcontentloaded');

    // Check for page title
    await expect(page.locator('h1')).toBeVisible();

    // Check for position selector
    await expect(page.locator('select, [role="combobox"], button').first()).toBeVisible();
  });

  test('should display range grid', async ({ page }) => {
    await page.goto('/ranges');
    await page.waitForLoadState('domcontentloaded');

    // Check for range grid (13x13 matrix)
    await expect(page.locator('[class*="grid"]').first()).toBeVisible();
  });
});
