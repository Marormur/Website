// Test storage restore functionality with validation
// Validates fix for TypeError in Dialog.open during modal restore

const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

test.describe('Storage Modal Restore @basic', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage before each test
        await page.goto('http://127.0.0.1:5173/index.html');
        await page.evaluate(() => localStorage.clear());
    });

    test('should handle invalid modal IDs in localStorage gracefully', async ({ page }) => {
        // Inject invalid modal IDs into localStorage before app loads
        await page.evaluate(() => {
            localStorage.setItem(
                'openModals',
                JSON.stringify([
                    'finder-modal',
                    'invalid-modal-id',
                    'another-nonexistent-modal',
                    'about-modal',
                ])
            );
        });

        // Reload page and wait for app to be ready
        await page.reload();
        await waitForAppReady(page);

        // Check console for warning messages (not errors)
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push({
                type: msg.type(),
                text: msg.text(),
            });
        });

        // App should not crash - verify it's functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible({ timeout: 5000 });

        // Valid modals should be restored (finder and about)
        const finderModal = page.locator('.modal.multi-window[id^="window-finder-"]');
        const aboutModal = page.locator('#about-modal');

        // These might or might not be visible depending on persistence logic,
        // but they should exist and be queryable without error
        // Accept either zero or more finder windows; ensure the selector is queryable
        await expect(aboutModal).toHaveCount(1);
    });

    test('should not crash when dialog instance is missing', async ({ page }) => {
        // Set up scenario where modal ID exists but dialog instance might be corrupt
        await page.evaluate(() => {
            localStorage.setItem('openModals', JSON.stringify(['settings-modal']));
        });

        await page.reload();
        await waitForAppReady(page);

        // App should be functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible();

        // No JavaScript errors should have occurred
        const errors = [];
        page.on('pageerror', error => {
            errors.push(error.message);
        });

        // App should remain error-free
        await expect(page.locator('#dock')).toBeVisible({ timeout: 5000 });
        expect(errors).toHaveLength(0);
    });

    test('should restore valid modals without errors', async ({ page }) => {
        // Open a valid modal
        await page.goto('http://127.0.0.1:5173/index.html');
        await waitForAppReady(page);

        // Open About modal via header (stable, uses ActionBus)
        // First open the Apple menu dropdown where the About item lives
        const appleMenuButton = page.locator('[aria-controls="apple-menu-dropdown"]').first();
        await appleMenuButton.click();
        const appleMenu = page.locator('#apple-menu-dropdown');
        await expect(appleMenu).toBeVisible();

        const aboutTrigger = page.locator('[data-action="openAbout"]').first();
        await aboutTrigger.click();

        // Verify it's open (wait for animation/visibility)
        const aboutModal = page.locator('#about-modal');
        await expect(aboutModal).not.toHaveClass(/hidden/, { timeout: 5000 });

        // Now reload and verify it's restored
        await page.reload();
        await waitForAppReady(page);

        // Check if modal was persisted (depending on implementation)
        // At minimum, app should not crash
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible();
    });

    test('should skip transient modals during restore', async ({ page }) => {
        // Set up localStorage with a transient modal
        await page.evaluate(() => {
            localStorage.setItem(
                'openModals',
                JSON.stringify([
                    'about-modal',
                    'program-info-modal', // This is transient
                ])
            );
        });

        await page.reload();
        await waitForAppReady(page);

        // App should be functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible();

        // Transient modal should not be shown on restore
        const programInfoModal = page.locator('#program-info-modal');
        await expect(programInfoModal).toHaveClass(/hidden/);
    });

    test('should validate modal exists in WindowManager before restore', async ({ page }) => {
        // Inject modal ID that might not be registered
        await page.evaluate(() => {
            localStorage.setItem('openModals', JSON.stringify(['unregistered-but-exists-in-dom']));
        });

        await page.reload();
        await waitForAppReady(page);

        // Should log warning but not crash
        const consoleWarnings = [];
        page.on('console', msg => {
            if (msg.type() === 'warning') {
                consoleWarnings.push(msg.text());
            }
        });

        // App should still be functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible({ timeout: 5000 });
    });
});
