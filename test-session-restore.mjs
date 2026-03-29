import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:5173';

async function testSessionRestore() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('📍 Step 1: Navigate to app');
        await page.goto(BASE_URL);
        
        // Wait for app to be ready
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 5000 });
        console.log('✅ App ready');

        // Open About window
        console.log('📍 Step 2: Open About window');
        await page.evaluate(() => {
            window.AboutWindow?.focusOrCreate?.();
        });
        await page.waitForTimeout(500);

        let aboutWindowFound = await page.evaluate(() => {
            const win = document.querySelector('.about-window');
            return !!win;
        });
        console.log(`About window found before reload: ${aboutWindowFound ? '✅' : '❌'}`);

        // Open Settings window
        console.log('📍 Step 3: Open Settings window');
        await page.evaluate(() => {
            window.SettingsWindow?.focusOrCreate?.();
        });
        await page.waitForTimeout(500);

        let settingsWindowFound = await page.evaluate(() => {
            const win = document.querySelector('.settings-window-shell');
            return !!win;
        });
        console.log(`Settings window found before reload: ${settingsWindowFound ? '✅' : '❌'}`);

        // Get current session before reload
        const sessionBefore = await page.evaluate(() => {
            const data = localStorage.getItem('multi-window-session');
            return data ? JSON.parse(data) : null;
        });
        console.log(`📊 Session saved with ${sessionBefore?.windows?.length ?? 0} windows`);

        // Reload page
        console.log('📍 Step 4: Reload page');
        await page.reload({ waitUntil: 'networkidle' });
        
        // Wait for app to be ready after reload
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 5000 });
        await page.waitForTimeout(1000);
        console.log('✅ App ready after reload');

        // Check if windows were restored
        const sessionAfter = await page.evaluate(() => {
            const data = localStorage.getItem('multi-window-session');
            return data ? JSON.parse(data) : null;
        });
        console.log(`📊 Session has ${sessionAfter?.windows?.length ?? 0} windows after reload`);

        aboutWindowFound = await page.evaluate(() => {
            const win = document.querySelector('.about-window');
            return !!win;
        });
        console.log(`About window found after reload: ${aboutWindowFound ? '✅' : '❌'}`);

        settingsWindowFound = await page.evaluate(() => {
            const win = document.querySelector('.settings-window-shell');
            return !!win;
        });
        console.log(`Settings window found after reload: ${settingsWindowFound ? '✅' : '❌'}`);

        if (aboutWindowFound && settingsWindowFound) {
            console.log('🎉 SUCCESS: Both windows survived page reload!');
        } else {
            console.log('❌ FAILURE: Windows were not restored');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testSessionRestore();
