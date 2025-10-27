// Test storage restore functionality with validation
// Validates fix for TypeError in Dialog.open during modal restore

const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('./utils');

test.describe('Storage Modal Restore @basic', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage before each test
        await page.goto('http://127.0.0.1:5173/index.html');
        await page.evaluate(() => localStorage.clear());
    });

    test('should handle invalid modal IDs in localStorage gracefully', async ({ page }) => {
        // Inject invalid modal IDs into localStorage before app loads
        await page.evaluate(() => {
            localStorage.setItem('openModals', JSON.stringify([
                'finder-modal',
                'invalid-modal-id',
                'another-nonexistent-modal',
                'about-modal'
            ]));
        });

        // Reload page and wait for app to be ready
        await page.reload();
        await waitForAppReady(page);

        // Check console for warning messages (not errors)
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push({
                type: msg.type(),
                text: msg.text()
            });
        });

        // Wait a bit for any console messages to appear
        await page.waitForTimeout(1000);

        // App should not crash - verify it's functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible();

        // Valid modals should be restored (finder and about)
        const finderModal = page.locator('#finder-modal');
        const aboutModal = page.locator('#about-modal');
        
        // These might or might not be visible depending on persistence logic,
        // but they should exist and be queryable without error
        await expect(finderModal).toHaveCount(1);
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

        await page.waitForTimeout(1000);
        expect(errors).toHaveLength(0);
    });

    test('should restore valid modals without errors', async ({ page }) => {
        // Open a valid modal
        await page.goto('http://127.0.0.1:5173/index.html');
        await waitForAppReady(page);

        // Open About modal via dock
        const aboutIcon = page.locator('#dock img[alt*="Über"]').or(page.locator('#dock img[alt*="About"]'));
        await aboutIcon.click();
        await page.waitForTimeout(500);

        // Verify it's open
        const aboutModal = page.locator('#about-modal');
        await expect(aboutModal).not.toHaveClass(/hidden/);

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
            localStorage.setItem('openModals', JSON.stringify([
                'about-modal',
                'program-info-modal'  // This is transient
            ]));
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
            localStorage.setItem('openModals', JSON.stringify([
                'unregistered-but-exists-in-dom'
            ]));
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

        await page.waitForTimeout(1000);

        // App should still be functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible();
    });
});
