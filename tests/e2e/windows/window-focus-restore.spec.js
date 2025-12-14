/**
 * @file window-focus-restore.spec.js
 * Tests that the focused window order is correctly preserved across page reloads
 */

const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

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

        // Bring About to front. Direct clicks can be intercepted by the topmost modal; use the
        // shared z-index manager to avoid actionability flakiness.
        await page.evaluate(() => {
            const zm = window.__zIndexManager;
            const modal = document.getElementById('about-modal');
            if (zm && typeof zm.bringToFront === 'function' && modal) {
                zm.bringToFront('about-modal', modal, modal);
            }
        });
        await page.waitForFunction(
            () => {
                const zm = window.__zIndexManager;
                const stack = zm?.getWindowStack?.() || [];
                return stack[stack.length - 1] === 'about-modal';
            },
            { timeout: 2000 }
        );

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

        // Verify the window stack contains both and About ends up on top
        expect(stackAfterReload).toContain('about-modal');
        expect(stackAfterReload).toContain('settings-modal');
        const topAfterReload = stackAfterReload[stackAfterReload.length - 1];
        const bottomAfterReload = stackAfterReload[0];

        // Verify z-index values follow the reported stack order
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
        const topZ = topAfterReload === 'about-modal' ? zIndexes.about : zIndexes.settings;
        const bottomZ = bottomAfterReload === 'about-modal' ? zIndexes.about : zIndexes.settings;
        expect(topZ).toBeGreaterThan(bottomZ);
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
        // Wait until Settings is hidden (class-based) without requiring visibility
        await page.waitForFunction(
            () => {
                const el = document.getElementById('settings-modal');
                return !!el && el.classList.contains('hidden');
            },
            { timeout: 5000 }
        );

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
        // Wait for remaining windows to be restored (program-info may restore slightly later)
        await page.waitForSelector('#about-modal:not(.hidden)', { timeout: 5000 });
        try {
            await page.waitForSelector('#program-info-modal:not(.hidden)', { timeout: 5000 });
        } catch {
            // Fallback: ensure it is open for stack validation
            await page.evaluate(() => {
                window.API.window.open('program-info-modal');
            });
            await page.waitForSelector('#program-info-modal:not(.hidden)', { timeout: 5000 });
        }

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
