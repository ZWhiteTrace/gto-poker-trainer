import { test, expect } from "@playwright/test";

/**
 * Table Trainer Stats Panel Tests
 * Verifies the stats panel behavior with tiered thresholds
 */

test.describe("Table Trainer Stats Panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/drill/table-trainer");
    await page.waitForLoadState("domcontentloaded");
    // Wait for table trainer to render (has a header with data attribute)
    await page.waitForSelector("[data-table-trainer-header]", { timeout: 15000 });
  });

  test("shows data collection message or stats when loaded", async ({ page }) => {
    // Look for the stats panel tab
    const statsTab = page.getByRole("button", { name: /統計|Stats/i });
    if ((await statsTab.count()) > 0) {
      await statsTab.first().click();
    }

    // Should show "需要 30 手" or similar collection message
    const collectionMessage = page.getByText(/需要.*手/);
    const hasCollectionMsg = (await collectionMessage.count()) > 0;

    // Or should show actual stats (if data exists)
    const vpipStat = page.getByText("VPIP");
    const hasStats = (await vpipStat.count()) > 0;

    // One of these should be true
    expect(hasCollectionMsg || hasStats).toBeTruthy();
  });

  test("stats panel has proper structure", async ({ page }) => {
    // Navigate to stats tab if needed
    const statsTab = page.getByRole("button", { name: /統計|Stats/i });
    if ((await statsTab.count()) > 0) {
      await statsTab.first().click();
    }

    // Check for progress indicator or stats display
    const progressBar = page.locator('[role="progressbar"]');
    const vpipLabel = page.getByText("VPIP");
    const pfrLabel = page.getByText("PFR");

    const hasProgress = (await progressBar.count()) > 0;
    const hasVpip = (await vpipLabel.count()) > 0;
    const hasPfr = (await pfrLabel.count()) > 0;

    // At least one should be present
    expect(hasProgress || hasVpip || hasPfr).toBeTruthy();
  });

  test("table trainer loads without critical errors", async ({ page }) => {
    // Verify page loaded (has some content)
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(1000);

    // No critical error messages
    const criticalError = page.getByText(/critical error|crash|fatal/i);
    expect(await criticalError.count()).toBe(0);
  });

  test("session stats section exists", async ({ page }) => {
    // Look for session stats area
    const sessionHeader = page.getByText(/本次練習|Session/);
    const handsText = page.getByText(/手$/);

    // Should have session tracking
    const hasSessionHeader = (await sessionHeader.count()) > 0;
    const hasHandsText = (await handsText.count()) > 0;

    expect(hasSessionHeader || hasHandsText).toBeTruthy();
  });
});

test.describe("AI Exploit Analysis", () => {
  test("AI analysis section exists in stats panel", async ({ page }) => {
    await page.goto("/drill/table-trainer");
    await page.waitForLoadState("domcontentloaded");

    // Navigate to stats tab
    const statsTab = page.getByRole("button", { name: /統計|Stats/i });
    if ((await statsTab.count()) > 0) {
      await statsTab.first().click();
    }

    // Look for AI opponent analysis section
    const aiSection = page.getByText("對手剝削分析");
    const gtoText = page.getByText("GTO");
    const needsDataMsg = page.getByText(/需要更多.*數據/);

    // Either shows the section or shows "need more data" message
    const hasAiSection = (await aiSection.count()) > 0;
    const hasGtoText = (await gtoText.count()) > 0;
    const needsData = (await needsDataMsg.count()) > 0;

    expect(hasAiSection || hasGtoText || needsData).toBeTruthy();
  });
});
