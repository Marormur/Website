// @ts-check
/**
 * Playwright config for the Website project
 * - Serves the static site via http-server on 127.0.0.1:5173
 * - Runs tests in Chromium by default
 */

import { defineConfig, devices } from '@playwright/test';

// Always use the Node server on port 5173 for tests
// The webServer config below will start it automatically if not running
const BASE_URL = 'http://127.0.0.1:5173';
const RUN_FRAMEWORK_E2E = process.env.RUN_FRAMEWORK_E2E === '1';
const RUN_INTEGRATION_E2E = process.env.RUN_INTEGRATION_E2E === '1';
const RUN_PERFORMANCE_E2E = process.env.RUN_PERFORMANCE_E2E === '1';
const RUN_QUARANTINED_E2E = process.env.RUN_QUARANTINED_E2E === '1';

// Quarantined specs are excluded from day-to-day and CI default runs
// to protect feature velocity. They can still be run explicitly.
const QUARANTINED_SPECS = [
    '**/finder/finder-selection.spec.js',
    '**/finder/finder-github.spec.js',
    '**/session/session-restore-full.spec.js',
];

export default defineConfig({
    // Keep Playwright discovery scoped to E2E specs; unit tests are executed by Vitest.
    testDir: './tests/e2e',
    // Keep deep technical suites opt-in; default E2E should emphasize user-facing journeys.
    testIgnore: /** @type {string[]} */ (
        [
            !RUN_FRAMEWORK_E2E && '**/framework/**',
            !RUN_INTEGRATION_E2E && '**/integration/**',
            !RUN_PERFORMANCE_E2E && '**/performance/**',
            ...(!RUN_QUARANTINED_E2E ? QUARANTINED_SPECS : []),
        ].filter(Boolean)
    ),
    // Reduced timeout for faster feedback - individual tests can override if needed
    timeout: 30 * 1000,
    expect: { timeout: 8000 },
    // Disable fullyParallel to ensure clean sequential execution with single worker
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    // Mild retry locally to smooth out rare flakes; CI keeps 2
    retries: process.env.CI ? 2 : 1,
    // Single worker to avoid server port conflicts
    // workers: 1,
    reporter: process.env.CI ? 'list' : 'line', // Less verbose output locally
    use: {
        baseURL: BASE_URL,
        // Balanced timeouts for bundle mode without excessive waiting
        actionTimeout: 25_000,
        navigationTimeout: 25_000,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: process.env.CI
        ? [
              // CI: Run all browsers to catch cross-browser regressions
              {
                  name: 'chromium',
                  use: { ...devices['Desktop Chrome'] },
              },
              {
                  name: 'firefox',
                  use: { ...devices['Desktop Firefox'] },
              },
              {
                  name: 'webkit',
                  use: { ...devices['Desktop Safari'] },
              },
          ]
        : [
              // Local: Only Chromium for faster feedback
              {
                  name: 'chromium',
                  use: { ...devices['Desktop Chrome'] },
              },
          ],
    // Always start the Node server on port 5173 for tests
    // Reuse existing server locally for faster startup and shutdown
    webServer: {
        command: 'node server.js',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 60 * 1000,
        // Pipe output for debugging but don't wait indefinitely
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
