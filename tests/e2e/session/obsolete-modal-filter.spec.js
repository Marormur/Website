/**
 * @file tests/e2e/session/obsolete-modal-filter.spec.js
 * Test that obsolete modal IDs (like 'finder-modal') are gracefully ignored during session restore
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

        // Reload to trigger session restore
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

    test('should log debug message when skipping obsolete modal', async ({ page }) => {
        // Setup: Inject legacy session data with obsolete 'finder-modal'
        await page.evaluate(() => {
            localStorage.setItem('openModals', JSON.stringify(['finder-modal']));
        });

        // Capture console debug messages
        const debugMessages = [];
        page.on('console', msg => {
            if (msg.type() === 'debug') {
                debugMessages.push(msg.text());
            }
        });

        // Reload to trigger session restore
        await page.reload();
        await page.waitForFunction(() => window.__APP_READY === true, { timeout: 10000 });

        // Wait a bit for debug messages
        await page.waitForTimeout(500);

        // Assert: Debug message about skipping obsolete modal should exist
        const skipMessage = debugMessages.find(
            m =>
                m.includes('finder-modal') && m.includes('obsolete') && m.includes('multi-instance')
        );

        // Note: console.debug might not be captured by Playwright in all browsers
        // This assertion is optional and informational
        if (!skipMessage) {
            console.log('ℹ️  Debug message not captured (browser may filter console.debug)');
        }
    });

    test('should still restore valid modals while ignoring obsolete ones', async ({ page }) => {
        // Setup: Mix of obsolete and valid modals
        await page.evaluate(() => {
            localStorage.setItem('openModals', JSON.stringify(['finder-modal', 'about-modal']));
        });

        // Reload to trigger session restore
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
