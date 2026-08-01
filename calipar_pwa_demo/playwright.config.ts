import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PW_BASE_URL ?? "http://127.0.0.1:8787";
const usesExternalServer = Boolean(process.env.PW_BASE_URL);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Wrangler's local asset server is intentionally kept under modest pressure.
  // Higher fan-out can terminate workerd on developer laptops before mobile and
  // WebKit projects begin, obscuring real browser failures.
  workers: 2,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  outputDir: "test-results/playwright",
  reporter: process.env.CI
    ? [
        ["line"],
        ["html", { outputFolder: "test-results/playwright-report", open: "never" }],
        ["junit", { outputFile: "test-results/playwright-junit.xml" }],
      ]
    : [["list"], ["html", { outputFolder: "test-results/playwright-report", open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    serviceWorkers: "allow",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  webServer: usesExternalServer
    ? undefined
    : {
        command: "npm run preview:e2e",
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      },
  projects: [
    {
      name: "chromium-desktop",
      testIgnore: /tests\/a11y\//,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "chromium-mobile",
      testIgnore: /tests\/a11y\//,
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "webkit",
      testIgnore: [/tests\/a11y\//, /pwa\.spec\.ts/],
      use: {
        ...devices["Desktop Safari"],
        // PWA install/offline behavior is verified in Chromium. Keeping WebKit
        // free of the generated service worker makes this project a stable
        // cross-browser application/IndexedDB gate and keeps route mocks
        // observable by Playwright.
        serviceWorkers: "block",
      },
    },
    {
      name: "accessibility",
      testMatch: /tests\/a11y\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
