# E2E Tests

End-to-end tests using [Playwright](https://playwright.dev/).

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

## Running Tests

### Run all tests (auto-starts dev server)

```bash
npm run test:e2e
```

### Run with UI mode

```bash
npm run test:e2e:ui
```

### Run specific test file

```bash
npx playwright test --config=e2e/playwright.config.ts e2e/smoke.spec.ts
```

### Run with headed browser (visible)

```bash
npx playwright test --config=e2e/playwright.config.ts --headed
```

### Run against running server

If you already have the dev server running:

```bash
E2E_EXTERNAL_SERVER=1 npx playwright test --config=e2e/playwright.config.ts
```

## Test Structure

- `smoke.spec.ts` - Quick sanity checks
- `home.spec.ts` - Home page tests
- `drill.spec.ts` - Drill functionality tests (RFI, VS-RFI, Postflop)
- `learn.spec.ts` - Learn section and MTT tools tests
- `quiz.spec.ts` - Quiz, Exam, Stats, and Analyze tests

## Writing Tests

```typescript
import { test, expect } from "@playwright/test";

test("example test", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("h1")).toBeVisible();
});
```

## CI Integration

Tests are configured to run in CI with:

- Single worker
- 2 retries on failure
- GitHub reporter

Set `CI=true` environment variable in CI pipelines.
