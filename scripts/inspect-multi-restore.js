const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
    console.log('[inspect-multi-restore] navigating to', base + '/index.html');
    await page.goto(base + '/index.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction('window.__APP_READY === true', { timeout: 20000 });

    // Clear any existing session
    await page.evaluate(() => localStorage.removeItem('multi-window-session'));

    // Create windows and save
    await page.evaluate(() => {
        if (window.TerminalWindow) {
            window.TerminalWindow.create({ title: 'I1' });
            window.TerminalWindow.create({ title: 'I2' });
            window.TerminalWindow.create({ title: 'I3' });
        }
        if (
            window.MultiWindowSessionManager &&
            typeof window.MultiWindowSessionManager.saveSession === 'function'
        ) {
            window.MultiWindowSessionManager.saveSession({ immediate: true });
        }
    });
    await page.waitForTimeout(500);
    const saved = await page.evaluate(() => localStorage.getItem('multi-window-session'));
    console.log('saved length:', saved ? JSON.parse(saved).windows.length : 'none');

    // Reload and wait for app ready
    await page.reload();
    await page.waitForFunction('window.__APP_READY === true', { timeout: 20000 });
    await page.waitForTimeout(800);

    const restored = await page.evaluate(() => {
        if (!window.WindowRegistry) return 0;
        return window.WindowRegistry.getWindowsByType('terminal')?.length || 0;
    });
    console.log('restored count after reload:', restored);

    await browser.close();
})();
