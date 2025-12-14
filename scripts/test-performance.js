/**
 * Performance Test Script
 * Schnelles Script um die Performance verschiedener Systeme zu testen
 */

const playwright = require('playwright');

async function runPerformanceTest() {
    console.log('🚀 Starting Performance Tests...\n');

    const browser = await playwright.chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capture console logs (especially PerfMonitor reports)
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('PerfMonitor') || text.includes('ms') || text.includes('duration')) {
            console.log('📊', text);
        }
    });

    try {
        console.log('Loading page...');
        await page.goto('http://127.0.0.1:5173');
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 10000 });
        console.log('✓ App ready\n');

        // Test 1: Window Manager Performance
        console.log('\n=== Window Manager Performance ===');
        await page.evaluate(() => {
            window.PerfMonitor.mark('test:window-operations:start');

            // Open/close multiple windows
            window.API.window.open('finder-modal');
            window.API.window.close('finder-modal');

            window.API.window.open('terminal-modal');
            window.API.window.close('terminal-modal');

            window.API.window.open('text-editor-modal');
            window.API.window.close('text-editor-modal');

            window.PerfMonitor.mark('test:window-operations:end');
            window.PerfMonitor.measure(
                'test:window-operations',
                'test:window-operations:start',
                'test:window-operations:end'
            );
        });
        await page.waitForTimeout(500);

        // Test 2: Theme Switching Performance
        console.log('\n=== Theme System Performance ===');
        await page.evaluate(() => {
            const currentTheme = window.API.theme.getThemePreference();

            // Switch theme multiple times
            window.API.theme.setThemePreference('dark');
            window.API.theme.setThemePreference('light');
            window.API.theme.setThemePreference('dark');

            // Restore original
            window.API.theme.setThemePreference(currentTheme);
        });
        await page.waitForTimeout(500);

        // Test 3: VirtualFS Performance
        console.log('\n=== VirtualFS Performance ===');
        await page.evaluate(() => {
            const vfs = window.VirtualFS;
            if (vfs) {
                window.PerfMonitor.mark('test:vfs-operations:start');

                // Create and read files
                vfs.createFile(['test-perf-file.txt'], 'Performance test content');
                vfs.readFile(['test-perf-file.txt']);
                vfs.deleteFile(['test-perf-file.txt']);

                window.PerfMonitor.mark('test:vfs-operations:end');
                window.PerfMonitor.measure(
                    'test:vfs-operations',
                    'test:vfs-operations:start',
                    'test:vfs-operations:end'
                );
            }
        });
        await page.waitForTimeout(500);

        // Test 4: Session Manager Performance
        console.log('\n=== Session Manager Performance ===');
        await page.evaluate(() => {
            if (window.SessionManager) {
                // Trigger a save operation
                window.SessionManager.saveAll({ immediate: true });
            }
        });
        await page.waitForTimeout(1000);

        // Generate comprehensive performance report
        console.log('\n=== Performance Report ===');
        await page.evaluate(() => {
            window.PerfMonitor.report({ topN: 20 });
        });
        await page.waitForTimeout(1000);

        // Get Core Web Vitals
        console.log('\n=== Core Web Vitals ===');
        const vitals = await page.evaluate(() => {
            return window.PerfMonitor.getVitals();
        });
        console.log('LCP:', vitals.LCP?.toFixed(2), 'ms');
        console.log('FID:', vitals.FID?.toFixed(2), 'ms');
        console.log('CLS:', vitals.CLS?.toFixed(4));
        console.log('TTFB:', vitals.TTFB?.toFixed(2), 'ms');

        console.log('\n✅ Performance tests completed');
    } catch (err) {
        console.error('❌ Error during performance test:', err);
    } finally {
        await browser.close();
    }
}

runPerformanceTest().catch(console.error);
