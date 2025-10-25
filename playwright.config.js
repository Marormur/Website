// @ts-check
/**
 * Playwright config for the Website project
 * - Serves the static site via http-server on 127.0.0.1:5173
 * - Runs tests in Chromium by default
 */

import { defineConfig, devices } from "@playwright/test";

// Always use the Node server on port 5173 for tests
// The webServer config below will start it automatically if not running
const BASE_URL = "http://127.0.0.1:5173";

export default defineConfig({
    testDir: "./tests",
    timeout: 30 * 1000,
    expect: { timeout: 5000 },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? "list" : "line", // Less verbose output locally
    use: {
        baseURL: BASE_URL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    projects: process.env.CI
        ? [
              // CI: Run all browsers to catch cross-browser regressions
              {
                  name: "chromium",
                  use: { ...devices["Desktop Chrome"] },
              },
              {
                  name: "firefox",
                  use: { ...devices["Desktop Firefox"] },
              },
              {
                  name: "webkit",
                  use: { ...devices["Desktop Safari"] },
              },
          ]
        : [
              // Local: Only Chromium for faster feedback
              {
                  name: "chromium",
                  use: { ...devices["Desktop Chrome"] },
              },
          ],
    // Always start the Node server on port 5173 for tests
    // In CI, we need a fresh server; locally, we can reuse an existing one
    webServer: {
        command: "node server.js",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 60 * 1000,
    },
});
