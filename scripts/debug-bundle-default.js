#!/usr/bin/env node
/**
 * Debug script to test bundle default mode and observe __APP_READY timing
 */
const { chromium } = require('@playwright/test');

(async () => {
    const browser = await chromium.launch({ headless: false, slowMo: 500 });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Collect console messages
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        console.log(`[BROWSER ${type.toUpperCase()}]`, text);
    });

    // Capture page errors
    page.on('pageerror', error => {
        console.error('[BROWSER PAGE ERROR]', error.message);
        console.error(error.stack);
    });

    // Navigate without any env injection (testing default behavior)
    console.log('\n=== Testing Bundle Default Mode (no env override) ===\n');
    await page.goto('http://127.0.0.1:5173/');

    // Wait and check if __APP_READY is set
    try {
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 10000 });
        console.log('\n✅ SUCCESS: window.__APP_READY was set within 10s');
    } catch {
        console.error('\n❌ FAILURE: window.__APP_READY was NOT set within 10s');
        
        // Check current state
        const readyState = await page.evaluate(() => ({
            __APP_READY: window.__APP_READY,
            USE_BUNDLE: window.USE_BUNDLE,
            documentReadyState: document.readyState,
            hasDOMContentLoadedFired: true, // if we got here, it fired
        }));
        console.error('Current state:', readyState);
    }

    console.log('\n=== Press Ctrl+C to exit ===\n');
    // Keep browser open for manual inspection
    await page.waitForTimeout(60000);
    await browser.close();
})();
