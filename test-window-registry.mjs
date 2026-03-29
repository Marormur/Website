import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:5173';

async function testWindowRegistry() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('📍 Step 1: Navigate to app');
        await page.goto(BASE_URL);
        
        // Wait for app to be ready
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 5000 });
        console.log('✅ App ready');

        // Check WindowRegistry before opening windows
        console.log('📍 Step 2: Check WindowRegistry BEFORE opening windows');
        let registryBefore = await page.evaluate(() => {
            const windows = window.WindowRegistry?.getAllWindows?.() || [];
            return {
                count: windows.length,
                types: windows.map(w => w.type),
                ids: windows.map(w => w.id),
            };
        });
        console.log('WindowRegistry before:', registryBefore);

        // Open About window
        console.log('📍 Step 3: Open About window');
        await page.evaluate(() => {
            window.AboutWindow?.focusOrCreate?.();
        });
        await page.waitForTimeout(500);

        // Check WindowRegistry after About
        console.log('📍 Step 4: Check WindowRegistry AFTER opening About');
        let registryAfterAbout = await page.evaluate(() => {
            const windows = window.WindowRegistry?.getAllWindows?.() || [];
            return {
                count: windows.length,
                types: windows.map(w => w.type),
                ids: windows.map(w => w.id),
            };
        });
        console.log('WindowRegistry after About:', registryAfterAbout);

        // Open Settings window
        console.log('📍 Step 5: Open Settings window');
        await page.evaluate(() => {
            window.SettingsWindow?.focusOrCreate?.();
        });
        await page.waitForTimeout(500);

        // Check WindowRegistry after Settings
        console.log('📍 Step 6: Check WindowRegistry AFTER opening Settings');
        let registryAfterSettings = await page.evaluate(() => {
            const windows = window.WindowRegistry?.getAllWindows?.() || [];
            return {
                count: windows.length,
                types: windows.map(w => w.type),
                ids: windows.map(w => w.id),
            };
        });
        console.log('WindowRegistry after Settings:', registryAfterSettings);

        // Check what's saved in session storage
        console.log('📍 Step 7: Check multi-window-session storage');
        const session = await page.evaluate(() => {
            const data = localStorage.getItem('multi-window-session');
            return data ? JSON.parse(data) : null;
        });
        console.log('Session data:', {
            version: session?.version,
            windows: session?.windows?.length ?? 0,
            windowTypes: session?.windows?.map(w => w.type) ?? [],
        });

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testWindowRegistry();
