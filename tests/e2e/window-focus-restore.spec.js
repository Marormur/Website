/**
 * @file window-focus-restore.spec.js
 * Tests that the focused window order is correctly preserved across page reloads
 */

const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('./utils');

test.describe('Window Focus Restoration', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('should restore last focused window after reload', async ({ page }) => {
        // Open two windows (About and Settings)
        await page.evaluate(() => {
            window.API.window.open('about-modal');
        });
        await page.waitForSelector('#about-modal:not(.hidden)', { timeout: 5000 });

        await page.evaluate(() => {
            window.API.window.open('settings-modal');
        });
        await page.waitForSelector('#settings-modal:not(.hidden)', { timeout: 5000 });

        // At this point, Settings should be on top (last opened)
        let topWindow = await page.evaluate(() => {
            const windowManager = window.WindowManager;
            const topEl = windowManager.getTopWindow();
            return topEl ? topEl.id : null;
        });
        expect(topWindow).toBe('settings-modal');

        // Click on About modal to bring it to front
        await page.click('#about-modal .draggable-header');
        // Brief wait for z-index update to propagate
        await page.waitForTimeout(50); // eslint-disable-line no-restricted-syntax

        // Verify About is now on top
        topWindow = await page.evaluate(() => {
            const windowManager = window.WindowManager;
            const topEl = windowManager.getTopWindow();
            return topEl ? topEl.id : null;
        });
        expect(topWindow).toBe('about-modal');

        // Get the window stack before reload
        const stackBeforeReload = await page.evaluate(() => {
            const zIndexManager = window.__zIndexManager;
            return zIndexManager ? zIndexManager.getWindowStack() : [];
        });

        console.log('Window stack before reload:', stackBeforeReload);

        // Trigger save and reload
        await page.evaluate(() => {
            window.SessionManager.saveAll({ immediate: true });
        });
        await page.reload();
        await waitForAppReady(page);

        // Wait for session restore (both windows should be visible)
        await page.waitForSelector('#about-modal:not(.hidden)', { timeout: 5000 });
        await page.waitForSelector('#settings-modal:not(.hidden)', { timeout: 5000 });

        // Get the window stack after reload
        const stackAfterReload = await page.evaluate(() => {
            const zIndexManager = window.__zIndexManager;
            return zIndexManager ? zIndexManager.getWindowStack() : [];
        });

        console.log('Window stack after reload:', stackAfterReload);

        // Verify the window stack order is preserved
        expect(stackAfterReload).toEqual(stackBeforeReload);

        // Verify About modal is still on top
        topWindow = await page.evaluate(() => {
            const windowManager = window.WindowManager;
            const topEl = windowManager.getTopWindow();
            return topEl ? topEl.id : null;
        });
        expect(topWindow).toBe('about-modal');

        // Verify z-index values are correct
        const zIndexes = await page.evaluate(() => {
            const aboutModal = document.getElementById('about-modal');
            const settingsModal = document.getElementById('settings-modal');
            return {
                about: aboutModal ? parseInt(window.getComputedStyle(aboutModal).zIndex, 10) : 0,
                settings: settingsModal
                    ? parseInt(window.getComputedStyle(settingsModal).zIndex, 10)
                    : 0,
            };
        });

        console.log('Z-indexes after reload:', zIndexes);
        expect(zIndexes.about).toBeGreaterThan(zIndexes.settings);
    });

    test('should handle window stack when closing windows', async ({ page }) => {
        // Open three windows
        await page.evaluate(() => {
            window.API.window.open('about-modal');
            window.API.window.open('settings-modal');
            window.API.window.open('program-info-modal');
        });
        await page.waitForSelector('#about-modal:not(.hidden)', { timeout: 5000 });
        await page.waitForSelector('#settings-modal:not(.hidden)', { timeout: 5000 });
        await page.waitForSelector('#program-info-modal:not(.hidden)', { timeout: 5000 });

        // Click on Settings to bring it to front
        await page.click('#settings-modal .draggable-header');
        // Brief wait for z-index update to propagate
        await page.waitForTimeout(50); // eslint-disable-line no-restricted-syntax

        // Close the top window (Settings)
        await page.evaluate(() => {
            window.API.window.close('settings-modal');
        });
        await page.waitForSelector('#settings-modal.hidden', { timeout: 5000 });

        // Verify that the window was removed from stack
        const stackAfterClose = await page.evaluate(() => {
            const zIndexManager = window.__zIndexManager;
            return zIndexManager ? zIndexManager.getWindowStack() : [];
        });

        expect(stackAfterClose).not.toContain('settings-modal');
        expect(stackAfterClose).toContain('about-modal');
        expect(stackAfterClose).toContain('program-info-modal');

        // Reload and verify stack is still correct
        await page.evaluate(() => {
            window.SessionManager.saveAll({ immediate: true });
        });
        await page.reload();
        await waitForAppReady(page);
        // Wait for remaining windows to be restored
        await page.waitForSelector('#about-modal:not(.hidden)', { timeout: 5000 });
        await page.waitForSelector('#program-info-modal:not(.hidden)', { timeout: 5000 });

        const stackAfterReload = await page.evaluate(() => {
            const zIndexManager = window.__zIndexManager;
            return zIndexManager ? zIndexManager.getWindowStack() : [];
        });

        expect(stackAfterReload).not.toContain('settings-modal');
        expect(stackAfterReload).toContain('about-modal');
        expect(stackAfterReload).toContain('program-info-modal');
    });

    test('should handle empty window stack gracefully', async ({ page }) => {
        // Clear any saved session
        await page.evaluate(() => {
            window.SessionManager.clear();
        });

        // Reload with empty session
        await page.reload();
        await waitForAppReady(page);

        // Verify app is still functional
        await page.evaluate(() => {
            window.API.window.open('about-modal');
        });
        await page.waitForSelector('#about-modal:not(.hidden)', { timeout: 5000 });

        const aboutVisible = await page.evaluate(() => {
            const modal = document.getElementById('about-modal');
            return modal ? !modal.classList.contains('hidden') : false;
        });

        expect(aboutVisible).toBe(true);
    });
});
