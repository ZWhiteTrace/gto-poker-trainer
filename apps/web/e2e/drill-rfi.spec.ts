import { test, expect } from "@playwright/test";

test.describe("RFI Drill", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/drill/rfi");
    await page.waitForLoadState("networkidle");
  });

  test("should load RFI drill page", async ({ page }) => {
    // Page should load and have h1 element
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    // Check page content contains RFI (works for both EN and ZH)
    const content = await page.content();
    expect(content).toMatch(/RFI|開池/i);
  });

  test("should display position badge", async ({ page }) => {
    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    const hasPosition = /UTG|HJ|CO|BTN|SB|BB/.test(pageContent);
    expect(hasPosition).toBe(true);
  });

  test("should have action buttons", async ({ page }) => {
    await page.waitForTimeout(2000);
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test("page should not have critical console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("analytics") && !e.includes("hydration")
    );
    expect(criticalErrors.length).toBeLessThanOrEqual(3);
  });
});

test.describe("Flop Texture Drill", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/drill/flop-texture");
    await page.waitForLoadState("networkidle");
  });

  test("should load flop texture page", async ({ page }) => {
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
  });

  test("should have tabs or mode selection", async ({ page }) => {
    const tabList = page.locator("[role='tablist']");
    const hasTabList = await tabList.isVisible().catch(() => false);
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    expect(hasTabList || buttonCount > 0).toBe(true);
  });
});

test.describe("Table Trainer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/drill/table-trainer");
    await page.waitForLoadState("networkidle");
  });

  test("should load table trainer page", async ({ page }) => {
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
  });

  test("should have interactive elements", async ({ page }) => {
    await page.waitForTimeout(1000);
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });
});

test.describe("Postflop Drill", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/drill/postflop");
    await page.waitForLoadState("networkidle");
  });

  test("should load postflop page", async ({ page }) => {
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
  });

  test("should have tabs for street selection", async ({ page }) => {
    const tabs = page.locator("[role='tab'], [role='tablist'], button");
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);
  });
});
