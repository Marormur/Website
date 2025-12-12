const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
    console.log('[inspect-multi] navigating to', base + '/index.html');
    await page.goto(base + '/index.html', { waitUntil: 'load', timeout: 30000 });
    try {
        await page.waitForFunction('window.__APP_READY === true', { timeout: 20000 });
    } catch (e) {
        console.warn('[inspect-multi] app-ready wait timed out, continuing');
    }

    // Create some windows using multi-window API
    try {
        await page.evaluate(() => {
            if (window.TerminalWindow) {
                window.TerminalWindow.create({ title: 'I1' });
                window.TerminalWindow.create({ title: 'I2' });
                window.TerminalWindow.create({ title: 'I3' });
            }
        });
    } catch (e) {
        console.warn('[inspect-multi] failed to create windows:', e && e.message ? e.message : e);
    }

    // Trigger multi-window save if available
    try {
        await page.evaluate(() => {
            if (
                window.MultiWindowSessionManager &&
                typeof window.MultiWindowSessionManager.saveSession === 'function'
            ) {
                window.MultiWindowSessionManager.saveSession({ immediate: true });
                return true;
            }
            if (
                window.SessionManager &&
                typeof window.SessionManager.saveAllSessions === 'function'
            ) {
                window.SessionManager.saveAllSessions();
                return true;
            }
            return false;
        });
    } catch (e) {
        console.warn('[inspect-multi] error triggering save:', e && e.message ? e.message : e);
    }

    // Wait a bit and read localStorage
    await page.waitForTimeout(800);
    const payload = await page.evaluate(() => {
        try {
            const raw =
                localStorage.getItem('multi-window-session') ||
                localStorage.getItem('windowInstancesSession') ||
                localStorage.getItem('window-session');
            return raw
                ? {
                      key: localStorage.getItem('multi-window-session')
                          ? 'multi-window-session'
                          : localStorage.getItem('windowInstancesSession')
                            ? 'windowInstancesSession'
                            : 'window-session',
                      raw,
                  }
                : { key: null, raw: null };
        } catch (e) {
            return { key: null, raw: null, error: String(e) };
        }
    });

    console.log('[inspect-multi] payload key:', payload.key);
    if (payload && payload.raw) console.log(payload.raw.slice(0, 500));
    try {
        fs.writeFileSync('test-results/inspected-multi.json', JSON.stringify(payload, null, 2));
        console.log('[inspect-multi] wrote test-results/inspected-multi.json');
    } catch (e) {
        console.warn('[inspect-multi] failed to write file:', e && e.message ? e.message : e);
    }

    await browser.close();
})();
