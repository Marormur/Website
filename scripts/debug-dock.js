const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const url = 'http://127.0.0.1:5173/';
    console.log('Navigating to', url);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for __APP_READY flag (with timeout)
    try {
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 10000 });
        console.log('__APP_READY detected');
    } catch (e) {
        console.warn('__APP_READY not detected within timeout');
    }

    const info = await page.evaluate(() => {
        const dock = document.getElementById('dock');
        if (!dock) return { found: false };
        const cs = window.getComputedStyle(dock);
        const rect = dock.getBoundingClientRect();
        // Also inspect ancestors
        const ancestors = [];
        let el = dock.parentElement;
        while (el) {
            ancestors.push({
                tag: el.tagName,
                id: el.id || null,
                class: el.className || null,
                display: window.getComputedStyle(el).display,
                visibility: window.getComputedStyle(el).visibility,
            });
            el = el.parentElement;
        }
        return {
            found: true,
            className: dock.className,
            display: cs.display,
            visibility: cs.visibility,
            opacity: cs.opacity,
            rect: {
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
                width: rect.width,
                height: rect.height,
            },
            ancestors,
        };
    });

    console.log('Dock info:', JSON.stringify(info, null, 2));
    await browser.close();
})();
