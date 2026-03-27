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

### Run against production / preview

```bash
E2E_BASE_URL=https://grindgto.com E2E_EXTERNAL_SERVER=1 npx playwright test --config=e2e/playwright.config.ts
```

`E2E_EXTERNAL_SERVER=1` disables Playwright's local `webServer` boot.
`E2E_BASE_URL` points tests at an existing deployment.

## Test Structure

- `smoke.spec.ts` - Quick sanity checks
- `home.spec.ts`, `navigation.spec.ts` - Home page and top-level routing
- `drill.spec.ts`, `drill-rfi.spec.ts`, `postflop.spec.ts`, `multistreet.spec.ts` - Drill flows
- `table-trainer-stats.spec.ts`, `stats.spec.ts`, `progress.spec.ts`, `achievements.spec.ts` - Progress and stats
- `learn.spec.ts`, `quiz.spec.ts`, `exam.spec.ts` - Learn and quiz flows
- `push-fold.spec.ts`, `endless.spec.ts` - Dedicated drill modes

Check `e2e/*.spec.ts` for the current source of truth. This directory changes faster than the README.

## Locale-Aware Selectors

The app uses URL-based locale routing with negotiation. Unprefixed paths can render Chinese or English depending on the environment.

- Prefer locale-explicit routes when the test is language-specific: `/en/...` or default-locale routes
- Prefer stable selectors or structure over copy when possible
- If text matching is required on shared routes, use bilingual regex instead of hard-coded Chinese-only selectors
- Do not assume CI and local browsers negotiate the same locale

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
