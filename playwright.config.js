// @ts-check
/**
 * Playwright config for the Website project
 * - Serves the static site via http-server on 127.0.0.1:5173
 * - Runs tests in Chromium by default
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    timeout: 30 * 1000,
    expect: { timeout: 5000 },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'list',
    use: {
        baseURL: 'http://127.0.0.1:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    projects: [
        // Run tests in all major desktop browsers to catch cross-browser regressions
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] }
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] }
        }
    ],
    webServer: {
        command: 'echo "Using VS Code Live Server on port 3000"',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: true,
        timeout: 30 * 1000
    }
});
