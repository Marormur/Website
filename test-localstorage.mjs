import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:5173';

async function testLocalStorage() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('📍 Navigate to app');
        await page.goto(BASE_URL);
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 5000 });
        console.log('✅ App ready');

        // Open About window
        console.log('📍 Open About window');
        await page.evaluate(() => {
            window.AboutWindow?.focusOrCreate?.();
        });
        await page.waitForTimeout(500);

        // Open Settings window
        console.log('📍 Open Settings window');
        await page.evaluate(() => {
            window.SettingsWindow?.focusOrCreate?.();
        });
        await page.waitForTimeout(500);

        // Wait for auto-save
        console.log('📍 Wait for auto-save (2 seconds)');
        await page.waitForTimeout(2000);

        // Check localStorage keys
        console.log('📊 All localStorage keys:');
        const allKeys = await page.evaluate(() => {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                keys.push(localStorage.key(i));
            }
            return keys;
        });
        console.log('Keys:', allKeys);

        // Check specific session key
        console.log('📊 multi-window-session content:');
        const sessionRaw = await page.evaluate(() => localStorage.getItem('multi-window-session'));
        console.log('Raw JSON:', sessionRaw?.substring?.(0, 200) ?? 'null');

        if (sessionRaw) {
            const session = JSON.parse(sessionRaw);
            console.log('Parsed session:', {
                version: session.version,
                timestamp: session.timestamp,
                windows: session.windows.length,
                windowTypes: session.windows.map(w => w.type),
                windowIds: session.windows.map(w => w.id),
            });
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testLocalStorage();
