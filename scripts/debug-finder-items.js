const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE:', msg.type(), msg.text()));

    await page.goto('http://127.0.0.1:5173', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__APP_READY === true, { timeout: 15000 });
    await page.waitForTimeout(500);

    // Open Finder window
    await page.evaluate(() => {
        if (window.FinderWindow && typeof window.FinderWindow.focusOrCreate === 'function') {
            window.FinderWindow.focusOrCreate();
        } else {
            console.error('FinderWindow.focusOrCreate not available');
        }
    });
    await page.waitForTimeout(2000); // Give it time to render

    // Debug info
    const debug = await page.evaluate(() => {
        const win = document.querySelector('.modal.multi-window[id^="window-finder-"]');
        if (!win) return { error: 'No finder window found' };

        const content = win.querySelector('.finder-content');
        const listItems = win.querySelectorAll('.finder-list-item').length;
        const gridItems = win.querySelectorAll('.finder-grid-item').length;
        const contentHTML = content?.innerHTML?.slice(0, 800) || 'No content';

        // Check VirtualFS
        const vfs = window.VirtualFS;
        const root = vfs?.list?.(['/']) || null;

        return {
            listItems,
            gridItems,
            contentHTML,
            hasContent: !!content,
            vfsRoot: root ? Object.keys(root) : 'VirtualFS not available',
        };
    });

    console.log('\n=== Finder Debug Info ===');
    console.log(JSON.stringify(debug, null, 2));

    await browser.close();
})();
