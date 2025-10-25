const { chromium } = require('@playwright/test');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Console-Nachrichten aufzeichnen
    page.on('console', (msg) => {
        const type = msg.type();
        const text = msg.text();
        console.log(`[${type.toUpperCase()}] ${text}`);
    });

    // Page-Fehler aufzeichnen
    page.on('pageerror', (error) => {
        console.error(`[PAGE ERROR] ${error.message}`);
        console.error(error.stack);
    });

    // Zur Seite navigieren
    console.log('Opening index.html...');
    await page.goto('file:///' + __dirname.replace(/\\/g, '/') + '/index.html');

    // Warte ein bisschen
    await page.waitForTimeout(3000);

    console.log('\n=== Prüfe ob Systeme geladen wurden ===');
    const systemsLoaded = await page.evaluate(() => {
        return {
            WindowManager: typeof window.WindowManager !== 'undefined',
            ActionBus: typeof window.ActionBus !== 'undefined',
            API: typeof window.API !== 'undefined',
            modalIds: window.modalIds,
            dialogs: window.dialogs ? Object.keys(window.dialogs) : [],
        };
    });

    console.log('Systeme:', JSON.stringify(systemsLoaded, null, 2));

    await browser.close();
})();
