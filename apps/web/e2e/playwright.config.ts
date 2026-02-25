import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const useExternalServer = !!process.env.E2E_EXTERNAL_SERVER;

export default defineConfig({
  testDir: "./",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? "github" : "list",
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], headless: true },
    },
  ],
  // Only use webServer if not using external server
  ...(useExternalServer
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          cwd: "..",
          url: "http://localhost:3000",
          reuseExistingServer: !isCI,
          timeout: 120000,
        },
      }),
});
