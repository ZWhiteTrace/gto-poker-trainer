import { expect, test } from "@playwright/test";

test.describe("PLO4 MVP", () => {
  test("should expose the PLO4 quiz from the English home page", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("domcontentloaded");

    const ploLink = page.getByRole("link", { name: /plo4 best hand/i }).first();
    await expect(ploLink).toBeVisible();
    await expect(ploLink).toHaveAttribute("href", /\/en\/plo\/quiz\/best-hand$/);
  });

  test("should render the PLO landing page", async ({ page }) => {
    await page.goto("/en/plo");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: /plo4 fundamentals/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /start best hand quiz/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /view quiz hub/i })).toBeVisible();
  });

  test("should answer a best-hand question and continue", async ({ page }) => {
    await page.goto("/en/plo/quiz/best-hand");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: /plo4 best hand quiz/i })).toBeVisible();
    await expect(page.getByText(/must use exactly 2 hole cards \+ 3 board cards/i)).toBeVisible();

    const optionButtons = page
      .locator("button")
      .filter({ hasNot: page.locator("svg") })
      .filter({ hasText: /royal flush|straight flush|four of a kind|full house|flush|straight|three of a kind|two pair|one pair|high card/i });

    await expect(optionButtons).toHaveCount(4);
    await optionButtons.first().click();

    await expect(page.getByText(/correct!|incorrect/i)).toBeVisible();
    await expect(page.getByText(/^best hand:/i)).toBeVisible();
    await expect(page.getByText(/^hole cards used:/i)).toBeVisible();
    await expect(page.getByText(/^board cards used:/i)).toBeVisible();

    const nextButton = page.getByRole("button", { name: /next question/i });
    await expect(nextButton).toBeVisible();
    await nextButton.click();

    await expect(nextButton).toBeHidden();
  });
});
