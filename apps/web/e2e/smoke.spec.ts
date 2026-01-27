import { test, expect } from '@playwright/test';

/**
 * Smoke tests - quick sanity checks for basic functionality.
 * These tests should run fast and verify the app is working.
 */

test.describe('Smoke Tests', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Page should have a title
    const title = await page.title();
    expect(title).toBeTruthy();

    // Page should not have error state
    const errorText = await page.locator('text=/error|exception/i').count();
    expect(errorText).toBe(0);
  });

  test('drill page loads', async ({ page }) => {
    await page.goto('/drill/rfi');
    await page.waitForLoadState('domcontentloaded');

    // Should have buttons
    const buttons = await page.locator('button').count();
    expect(buttons).toBeGreaterThan(0);
  });

  test('postflop drill page loads', async ({ page }) => {
    await page.goto('/drill/postflop');
    await page.waitForLoadState('networkidle');

    // Should have page heading
    await expect(page.locator('h1')).toBeVisible();

    // Should have buttons for actions
    const buttons = await page.locator('button').count();
    expect(buttons).toBeGreaterThan(0);
  });

  test('learn page loads', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('domcontentloaded');

    // Should have links to guides
    const links = await page.locator('a[href*="/learn/"]').count();
    expect(links).toBeGreaterThan(0);
  });

  test('ranges page loads', async ({ page }) => {
    await page.goto('/ranges');
    await page.waitForLoadState('domcontentloaded');

    // Page should load without error
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});
