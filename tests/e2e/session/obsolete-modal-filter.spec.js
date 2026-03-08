/**
 * @file tests/e2e/session/obsolete-modal-filter.spec.js
 * Test that obsolete modal IDs (like 'finder-modal') are cleaned up by the
 * storage migration helper and are not restored during session restore.
 * Addresses issue #133
 */

import { test, expect } from '@playwright/test';

test.describe('Obsolete Modal Filter (Issue #133)', () => {
    test.beforeEach(async ({ page }) => {
        // Clear storage first
        await page.goto('/');
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 10000 });
        await page.evaluate(() => localStorage.clear());
    });

    test('should not warn about finder-modal when it exists in legacy session data', async ({
        page,
    }) => {
        // Setup: Inject legacy session data with obsolete 'finder-modal'
        await page.evaluate(() => {
            localStorage.setItem('openModals', JSON.stringify(['finder-modal', 'terminal-modal']));
        });

        // Capture console messages
        const warnings = [];
        page.on('console', msg => {
            if (msg.type() === 'warning') {
                warnings.push(msg.text());
            }
        });

        // Reload to trigger migration + session restore
        await page.reload();
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 10000 });

        // Wait a bit for any delayed warnings
        await page.waitForTimeout(500);

        // Assert: No warning about finder-modal should be present
        const finderWarning = warnings.find(
            w => w.includes('finder-modal') && w.includes('not found in DOM')
        );
        expect(finderWarning).toBeUndefined();

        // Debug info if test fails
        if (finderWarning) {
            console.log('❌ Unexpected warning found:', finderWarning);
        }
    });

    test('should clean up finder-modal from openModals during migration', async ({ page }) => {
        // Setup: Inject legacy session data with obsolete 'finder-modal'
        await page.evaluate(() => {
            localStorage.setItem('openModals', JSON.stringify(['finder-modal']));
        });

        // Reload to trigger migration
        await page.reload();
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 10000 });

        // Assert: openModals should be empty after migration cleans up finder-modal
        const openModals = await page.evaluate(() => {
            return JSON.parse(localStorage.getItem('openModals') || '[]');
        });
        expect(openModals).not.toContain('finder-modal');
    });

    test('should clean up finder-modal from modalPositions during migration', async ({ page }) => {
        // Setup: Inject stale modalPositions with obsolete 'finder-modal' key
        await page.evaluate(() => {
            const positions = {
                'finder-modal': {
                    left: '100px',
                    top: '50px',
                    width: '800px',
                    height: '600px',
                    position: 'fixed',
                },
                'about-modal': {
                    left: '200px',
                    top: '100px',
                    width: '400px',
                    height: '300px',
                    position: 'fixed',
                },
            };
            localStorage.setItem('modalPositions', JSON.stringify(positions));
        });

        // Reload to trigger migration
        await page.reload();
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 10000 });

        // Assert: finder-modal key should be removed; other keys preserved
        const positions = await page.evaluate(() => {
            return JSON.parse(localStorage.getItem('modalPositions') || '{}');
        });
        expect(Object.keys(positions)).not.toContain('finder-modal');
        expect(Object.keys(positions)).toContain('about-modal');
    });

    test('should clean up finder-modal from window-session.modalState during migration', async ({
        page,
    }) => {
        // Setup: Inject legacy window-session format with obsolete 'finder-modal' key
        await page.evaluate(() => {
            const legacySession = {
                modalState: {
                    'finder-modal': { visible: true, minimized: false, zIndex: 1001 },
                    'about-modal': { visible: false, minimized: false, zIndex: 1000 },
                },
            };
            localStorage.setItem('window-session', JSON.stringify(legacySession));
        });

        // Reload to trigger migration
        await page.reload();
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 10000 });

        // Assert: finder-modal key should be removed from modalState; other keys preserved
        const session = await page.evaluate(() => {
            return JSON.parse(localStorage.getItem('window-session') || '{}');
        });
        const modalState = session.modalState || {};
        expect(Object.keys(modalState)).not.toContain('finder-modal');
        expect(Object.keys(modalState)).toContain('about-modal');
    });

    test('should still restore valid modals while ignoring obsolete ones', async ({ page }) => {
        // Setup: Mix of obsolete and valid modals in localStorage
        // The migration (cleanupObsoleteStorage) runs on page load and removes finder-modal,
        // leaving only about-modal for session restore to open.
        await page.evaluate(() => {
            localStorage.setItem('openModals', JSON.stringify(['finder-modal', 'about-modal']));
        });

        // Reload to trigger migration + session restore
        await page.reload();
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 10000 });

        // Wait for restore to complete
        await page.waitForTimeout(1000);

        // Assert: about-modal should be visible, finder-modal should be ignored
        const aboutModal = page.locator('#about-modal');
        await expect(aboutModal).toBeVisible({ timeout: 5000 });

        // Verify finder-modal is not in DOM or hidden
        const finderModal = page.locator('#finder-modal');
        const finderExists = await finderModal.count();
        if (finderExists > 0) {
            // If it exists, it should be hidden
            await expect(finderModal).not.toBeVisible();
        }
    });

    test('should not save finder-modal in new sessions', async ({ page }) => {
        // Ensure clean start
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 10000 });

        // Open about-modal (a valid modal)
        await page.evaluate(() => {
            window.API.window.open('about-modal');
        });

        // Trigger save (blur event or manual)
        await page.evaluate(() => {
            window.StorageSystem.saveOpenModals();
        });

        // Check saved data
        const savedModals = await page.evaluate(() => {
            return JSON.parse(localStorage.getItem('openModals') || '[]');
        });

        // Assert: finder-modal should not be in saved list
        expect(savedModals).not.toContain('finder-modal');
        expect(savedModals).toContain('about-modal');
    });
});
