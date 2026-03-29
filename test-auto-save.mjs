import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:5173';

async function testAutoSave() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('📍 Navigate to app');
        await page.goto(BASE_URL);
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 5000 });
        console.log('✅ App ready');

        // Clear localStorage to start fresh
        await page.evaluate(() => localStorage.clear());
        console.log('🗑️ localStorage cleared');

        // Open About window (should trigger immediate save via showAndRegisterWindow)
        console.log('📍 Open About window');
        await page.evaluate(() => {
            window.AboutWindow?.focusOrCreate?.();
        });
        await page.waitForTimeout(300);

        // Check session - NO MANUAL SAVE CALL
        console.log('📍 Check session after About (auto-save via showAndRegisterWindow)');
        let session = await page.evaluate(() => {
            const raw = localStorage.getItem('multi-window-session');
            return raw ? JSON.parse(raw) : null;
        });
        console.log('Session after About:', {
            version: session?.version,
            windows: session?.windows?.length ?? 0,
            windowTypes: session?.windows?.map(w => w.type) ?? [],
        });

        // Open Settings window
        console.log('📍 Open Settings window');
        await page.evaluate(() => {
            window.SettingsWindow?.focusOrCreate?.();
        });
        await page.waitForTimeout(300);

        // Check session again
        console.log('📍 Check session after Settings');
        session = await page.evaluate(() => {
            const raw = localStorage.getItem('multi-window-session');
            return raw ? JSON.parse(raw) : null;
        });
        console.log('Session after Settings:', {
            version: session?.version,
            windows: session?.windows?.length ?? 0,
            windowTypes: session?.windows?.map(w => w.type) ?? [],
        });

        // Now test RELOAD
        console.log('📍 Reload page');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 5000 });
        await page.waitForTimeout(500);
        console.log('✅ App ready after reload');

        // Check if About/Settings were restored
        const aboutFound = await page.evaluate(() => !!document.querySelector('.about-window'));
        const settingsFound = await page.evaluate(() => !!document.querySelector('.settings-window-shell'));
        console.log('After reload:');
        console.log(`  About window: ${aboutFound ? '✅' : '❌'}`);
        console.log(`  Settings window: ${settingsFound ? '✅' : '❌'}`);

        if (aboutFound && settingsFound) {
            console.log('🎉 SUCCESS: Both windows survived reload!');
        } else {
            console.log('❌ FAILURE: Windows not restored');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testAutoSave();
