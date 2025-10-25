// @ts-check
/**
 * Playwright config for the Website project
 * - Serves the static site via http-server on 127.0.0.1:5173
 * - Runs tests in Chromium by default
 */

const { defineConfig, devices } = require("@playwright/test");

// Decide how to provide a web server for tests:
// - In local dev with VS Code Live Server on :3000, we reuse it (default)
// - In CI (or when USE_NODE_SERVER=1), we start our own Node server on :5173
const useNodeServer = !!process.env.CI || process.env.USE_NODE_SERVER === "1";
const BASE_URL = useNodeServer
    ? "http://127.0.0.1:5173"
    : "http://127.0.0.1:3000";

module.exports = defineConfig({
    testDir: "./tests",
    timeout: 30 * 1000,
    expect: { timeout: 5000 },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: "list",
    use: {
        baseURL: BASE_URL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    projects: [
        // Run tests in all major desktop browsers to catch cross-browser regressions
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
    ],
    webServer: useNodeServer
        ? {
              command: "node server.js",
              url: "http://127.0.0.1:5173",
              reuseExistingServer: !process.env.CI,
              timeout: 60 * 1000,
          }
        : {
              command: 'echo "Using VS Code Live Server on port 3000"',
              url: "http://127.0.0.1:3000",
              reuseExistingServer: true,
              timeout: 30 * 1000,
          },
});
