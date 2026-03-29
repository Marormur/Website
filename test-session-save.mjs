import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:5173';

async function testSessionSave() {
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

        // Open About window
        console.log('📍 Open About window');
        await page.evaluate(() => {
            window.AboutWindow?.focusOrCreate?.();
        });
        await page.waitForTimeout(200);

        // Manually trigger saveSession with immediate flag
        console.log('📍 Manually trigger saveSession');
        await page.evaluate(() => {
            window.MultiWindowSessionManager?.saveSession?.({ immediate: true });
        });
        await page.waitForTimeout(100);

        // Check session immediately after save
        console.log('📍 Check session immediately after saveSession');
        let session = await page.evaluate(() => {
            const raw = localStorage.getItem('multi-window-session');
            return raw ? JSON.parse(raw) : null;
        });
        console.log('Session after AboutWindow.create:', {
            version: session?.version,
            windows: session?.windows?.length ?? 0,
            windowTypes: session?.windows?.map(w => w.type) ?? [],
        });

        // Open Settings window
        console.log('📍 Open Settings window');
        await page.evaluate(() => {
            window.SettingsWindow?.focusOrCreate?.();
        });
        await page.waitForTimeout(200);

        // Manually trigger saveSession again
        console.log('📍 Manually trigger saveSession again');
        await page.evaluate(() => {
            window.MultiWindowSessionManager?.saveSession?.({ immediate: true });
        });
        await page.waitForTimeout(100);

        // Check session after adding Settings
        console.log('📍 Check session after SettingsWindow.create');
        session = await page.evaluate(() => {
            const raw = localStorage.getItem('multi-window-session');
            return raw ? JSON.parse(raw) : null;
        });
        console.log('Session after SettingsWindow.create:', {
            version: session?.version,
            windows: session?.windows?.length ?? 0,
            windowTypes: session?.windows?.map(w => w.type) ?? [],
        });

        if (session.windows.length === 2 && session.windows.some(w => w.type === 'about') && session.windows.some(w => w.type === 'settings')) {
            console.log('🎉 SUCCESS: Both About and Settings are saved in session!');
        } else {
            console.log('❌ FAILURE: Windows not properly saved');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testSessionSave();
