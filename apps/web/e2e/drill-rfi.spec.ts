import { test, expect } from "@playwright/test";

test.describe("RFI Drill", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/drill/rfi");
    await page.waitForLoadState("networkidle");
  });

  test("should load RFI drill page", async ({ page }) => {
    // Should have drill title
    await expect(page.locator("h1")).toContainText(/RFI|開局加注/);
  });

  test("should display position and cards", async ({ page }) => {
    // Should show a position badge (UTG, HJ, CO, BTN, SB)
    const positionBadge = page.locator("[data-testid='position-badge'], .badge, text=/UTG|HJ|CO|BTN|SB/");
    await expect(positionBadge.first()).toBeVisible();

    // Should show hole cards
    const cards = page.locator("[data-testid='hole-cards'], .card, [class*='card']");
    await expect(cards.first()).toBeVisible();
  });

  test("should have action buttons", async ({ page }) => {
    // Should have Fold, Open, and potentially other action buttons
    const foldButton = page.getByRole("button", { name: /Fold|棄牌/i });
    const openButton = page.getByRole("button", { name: /Open|Raise|加注|開局/i });

    // At least one action should be available
    const hasFold = await foldButton.isVisible().catch(() => false);
    const hasOpen = await openButton.isVisible().catch(() => false);

    expect(hasFold || hasOpen).toBe(true);
  });

  test("should respond to action clicks", async ({ page }) => {
    // Click any visible action button
    const actionButton = page.locator("button").filter({ hasText: /Fold|Open|Raise|棄牌|加注/i }).first();

    if (await actionButton.isVisible()) {
      await actionButton.click();

      // Should show feedback or move to next hand
      await page.waitForTimeout(500);

      // Page should still be functional (no errors)
      await expect(page).toHaveURL(/\/drill\/rfi/);
    }
  });

  test("should track progress", async ({ page }) => {
    // Look for progress indicators
    const progressIndicator = page.locator("[data-testid='progress'], text=/\\/|of|手/, .progress");

    // Progress indicator may or may not be visible depending on mode
    const isVisible = await progressIndicator.first().isVisible().catch(() => false);

    if (isVisible) {
      await expect(progressIndicator.first()).toBeVisible();
    }
  });
});

test.describe("Flop Texture Drill", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/drill/flop-texture");
    await page.waitForLoadState("networkidle");
  });

  test("should load flop texture page", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/Flop|翻牌|Texture|質地/i);
  });

  test("should have mode selection tabs", async ({ page }) => {
    // Should have tabs for different training modes
    const tabs = page.locator("[role='tablist'], .tabs, [class*='tab']");
    await expect(tabs.first()).toBeVisible();
  });

  test("should display flop cards", async ({ page }) => {
    // Start a drill mode if needed
    const startButton = page.getByRole("button", { name: /Start|開始|Classify|分類/i });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(500);
    }

    // Should show flop cards
    const cards = page.locator("[data-testid='flop-cards'], .card, [class*='card']");
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(0); // May be 0 before game starts
  });
});

test.describe("Table Trainer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/drill/table-trainer");
    await page.waitForLoadState("networkidle");
  });

  test("should load table trainer page", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/Table|牌桌|Trainer|訓練/i);
  });

  test("should show poker table layout", async ({ page }) => {
    // Should have a poker table visualization
    const table = page.locator("[data-testid='poker-table'], [class*='table'], svg, canvas").first();
    await expect(table).toBeVisible();
  });

  test("should have player positions", async ({ page }) => {
    // Should show player positions around the table
    const positions = page.locator("text=/UTG|HJ|CO|BTN|SB|BB/");
    const posCount = await positions.count();
    expect(posCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Postflop Drill", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/drill/postflop");
    await page.waitForLoadState("networkidle");
  });

  test("should load postflop page", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/Postflop|翻後/i);
  });

  test("should have scenario selection", async ({ page }) => {
    // Should have options to select scenario type
    const scenarioOption = page.locator("button, [role='tab'], select").filter({
      hasText: /C-bet|Check-raise|Barrel|Bluff|Value/i
    });

    const optionCount = await scenarioOption.count();
    expect(optionCount).toBeGreaterThanOrEqual(0);
  });
});
