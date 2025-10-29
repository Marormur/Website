// Debug test to investigate PhotosApp loading issue
const { test } = require('@playwright/test');
const { waitForAppReady } = require('./utils');

test.describe('Debug Photos App Loading', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        // Capture console messages
        page.on('console', msg => {
            console.log(`[BROWSER ${msg.type()}]:`, msg.text());
        });

        // Capture JavaScript errors
        page.on('pageerror', error => {
            console.error(`[BROWSER ERROR]:`, error.message);
        });

        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('Check all loaded scripts', async ({ page }) => {
        const scripts = await page.evaluate(() => {
            const scriptTags = Array.from(document.querySelectorAll('script[src]'));
            return scriptTags.map(s => s.src);
        });

        console.log('\n=== LOADED SCRIPTS ===');
        scripts.forEach(src => console.log(src));

        const photosAppScript = scripts.find(s => s.includes('photos-app.js'));
        console.log('\nphotos-app.js found:', !!photosAppScript);
    });

    test('Check window properties', async ({ page }) => {
        const windowProps = await page.evaluate(() => {
            return {
                PhotosApp: typeof window.PhotosApp,
                PhotosAppValue: window.PhotosApp,
                TerminalInstanceManager: typeof window.TerminalInstanceManager,
                FinderInstanceManager: typeof window.FinderInstanceManager,
                API: typeof window.API,
                __USE_BUNDLE__: window.__USE_BUNDLE__,
                __APP_READY: window.__APP_READY,
            };
        });

        console.log('\n=== WINDOW PROPERTIES ===');
        console.log(JSON.stringify(windowProps, null, 2));
    });

    test('Check PhotosApp after element ready', async ({ page }) => {
        // Warten auf ein stabiles DOM-Element statt fixe Zeit
        await page.waitForSelector('#image-modal');

        const result = await page.evaluate(() => {
            return {
                exists: typeof window.PhotosApp !== 'undefined',
                value: window.PhotosApp,
                keys: window.PhotosApp ? Object.keys(window.PhotosApp) : [],
            };
        });

        console.log('\n=== PhotosApp after readiness wait ===');
        console.log(JSON.stringify(result, null, 2));
    });

    test('Check if photos-app.js executed', async ({ page }) => {
        const scriptExecuted = await page.evaluate(() => {
            // Check if any element from photos modal exists
            return {
                imageModal: !!document.getElementById('image-modal'),
                photosSidebar: !!document.getElementById('photos-sidebar'),
                photosGallery: !!document.getElementById('photos-gallery'),
            };
        });

        console.log('\n=== DOM Elements from Photos App ===');
        console.log(JSON.stringify(scriptExecuted, null, 2));
    });
});
