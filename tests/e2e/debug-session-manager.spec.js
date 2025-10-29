// Debug test to inspect window.SessionManager

const { test } = require('@playwright/test');
const { waitForAppReady } = require('./utils');

test('inspect window.SessionManager API', async ({ page }) => {
    const consoleMessages = [];
    const errors = [];

    page.on('console', msg => {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', error => {
        errors.push(error.message);
    });

    await page.goto('http://127.0.0.1:5173/index.html');

    // Check BEFORE waitForAppReady
    const beforeReady = await page.evaluate(() => {
        if (!window.SessionManager) return { error: 'SessionManager not defined' };
        return {
            keys: Object.keys(window.SessionManager),
            hasSaveAllSessions: typeof window.SessionManager.saveAllSessions,
        };
    });
    console.log('BEFORE __APP_READY:', JSON.stringify(beforeReady, null, 2));

    await waitForAppReady(page);

    // Check AFTER waitForAppReady
    const afterReady = await page.evaluate(() => {
        if (!window.SessionManager) return { error: 'SessionManager not defined' };

        return {
            type: typeof window.SessionManager,
            keys: Object.keys(window.SessionManager),
            hasSaveAll: typeof window.SessionManager.saveAll,
            hasSaveAllSessions: typeof window.SessionManager.saveAllSessions,
        };
    });

    console.log('AFTER __APP_READY:', JSON.stringify(afterReady, null, 2));
    console.log(
        '\nConsole messages:',
        consoleMessages.filter(m => m.includes('SessionManager') || m.includes('session'))
    );
    console.log('\nErrors:', errors);
});
