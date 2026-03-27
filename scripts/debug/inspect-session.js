const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
    console.log('[inspect-session] navigating to', base + '/index.html');
    await page.goto(base + '/index.html', { waitUntil: 'load', timeout: 30000 });
    try {
        await page.waitForFunction('window.__APP_READY === true', { timeout: 20000 });
    } catch (e) {
        console.warn('[inspect-session] app-ready wait timed out, continuing');
    }

    // Trigger session save if available
    try {
        await page.evaluate(() => {
            if (
                window &&
                window.SessionManager &&
                typeof window.SessionManager.saveAllSessions === 'function'
            ) {
                console.log('[inspect-session][page] calling SessionManager.saveAllSessions()');
                window.SessionManager.saveAllSessions();
            } else {
                console.log('[inspect-session][page] SessionManager.saveAllSessions not available');
            }
        });
    } catch (e) {
        console.warn('[inspect-session] error triggering save:', e && e.message ? e.message : e);
    }

    // Wait a short moment for persistence
    await page.waitForTimeout(800);

    const payload = await page.evaluate(() => {
        try {
            const keys = ['multi-window-session', 'windowInstancesSession', 'window-session'];
            for (const k of keys) {
                const raw = localStorage.getItem(k);
                if (raw) return { key: k, raw };
            }
            return { key: null, raw: null };
        } catch (e) {
            return { key: null, raw: null, error: String(e) };
        }
    });

    console.log('[inspect-session] payload:', payload && payload.key ? payload.key : '<none>');
    if (payload && payload.raw) {
        // Truncate for console
        console.log(payload.raw.slice(0, 200));
    }
    try {
        fs.mkdirSync('test-results', { recursive: true });
        fs.writeFileSync('test-results/inspected-session.json', JSON.stringify(payload, null, 2));
        console.log('[inspect-session] wrote test-results/inspected-session.json');
    } catch (e) {
        console.warn('[inspect-session] failed to write file:', e && e.message ? e.message : e);
    }

    await browser.close();
    process.exit(0);
})().catch(e => {
    console.error(e);
    process.exit(2);
});
