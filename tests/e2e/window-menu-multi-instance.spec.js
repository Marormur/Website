// E2E tests for Window menu multi-instance integration
const { test, expect } = require('@playwright/test');
const { waitForAppReady, clickDockIcon } = require('./utils');

test.describe('Window Menu Multi-Instance Integration', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('Window menu shows Finder instances and actions', async ({ page }) => {
        // Open Finder from dock
        await clickDockIcon(page, 'Finder Icon');
        
        // Wait for Finder to open
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);
        await page.waitForTimeout(300);

        // Open Window menu in menubar
        const windowMenuButton = page.getByRole('button', { name: /Fenster|Window/i });
        await windowMenuButton.click();
        await page.waitForTimeout(200);

        // Verify "New Finder" action is visible
        const newFinderItem = page.locator('.menu-item', { 
            hasText: /Neuer Finder|New Finder/i 
        }).first();
        await expect(newFinderItem).toBeVisible();

        // Close menu
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
    });

    test('Window menu lists multiple Finder instances', async ({ page }) => {
        // Open Finder from dock
        await clickDockIcon(page, 'Finder Icon');
        await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);
        await page.waitForTimeout(300);

        // Create a second Finder instance via tab button
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await expect(addButton).toBeVisible();
        await addButton.click();
        await page.waitForTimeout(500);

        // Verify two instances exist
        const instanceCount = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return 0;
            return window.FinderInstanceManager.getInstanceCount();
        });
        expect(instanceCount).toBe(2);

        // Open Window menu
        const windowMenuButton = page.getByRole('button', { name: /Fenster|Window/i });
        await windowMenuButton.click();
        await page.waitForTimeout(300);

        // Verify two Finder instances are listed in menu
        // Look for "Finder 1" and "Finder 2" in the menu
        const finderItems = page.locator('.menu-item', { 
            hasText: /Finder \d+/i 
        });
        const count = await finderItems.count();
        expect(count).toBeGreaterThanOrEqual(2);

        // Close menu
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
    });

    test('Window menu shows checkmark on active instance', async ({ page }) => {
        // Open Finder
        await clickDockIcon(page, 'Finder Icon');
        await page.waitForTimeout(300);

        // Create second instance
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await addButton.click();
        await page.waitForTimeout(500);

        // Open Window menu
        const windowMenuButton = page.getByRole('button', { name: /Fenster|Window/i });
        await windowMenuButton.click();
        await page.waitForTimeout(300);

        // Find the active instance in the menu (should have checkmark ✓)
        const activeItem = page.locator('.menu-item', { hasText: /✓/ });
        await expect(activeItem).toBeVisible();

        // Close menu
        await page.keyboard.press('Escape');
    });

    test('Can switch Finder instances via Window menu', async ({ page }) => {
        // Open Finder
        await clickDockIcon(page, 'Finder Icon');
        await page.waitForTimeout(300);

        // Create second instance
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await addButton.click();
        await page.waitForTimeout(500);

        // Get current active instance ID
        const initialActiveId = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            return window.FinderInstanceManager.getActiveInstance()?.instanceId;
        });

        // Click first tab to make first instance active
        const tabs = page.locator('#finder-tabs-container .wt-tab');
        await tabs.nth(0).click();
        await page.waitForTimeout(300);

        // Open Window menu
        const windowMenuButton = page.getByRole('button', { name: /Fenster|Window/i });
        await windowMenuButton.click();
        await page.waitForTimeout(300);

        // Click on second instance in menu
        // Look for the item without checkmark (not active)
        const menuItems = page.locator('.menu-item', { hasText: /Finder \d+/ });
        const itemCount = await menuItems.count();
        
        // Find item without checkmark and click it
        for (let i = 0; i < itemCount; i++) {
            const item = menuItems.nth(i);
            const text = await item.textContent();
            if (!text?.includes('✓')) {
                await item.click();
                break;
            }
        }

        await page.waitForTimeout(300);

        // Verify active instance changed
        const newActiveId = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            return window.FinderInstanceManager.getActiveInstance()?.instanceId;
        });

        expect(newActiveId).not.toBe(initialActiveId);
    });

    test('Window menu shows "Close All" action with multiple instances', async ({ page }) => {
        // Open Finder
        await clickDockIcon(page, 'Finder Icon');
        await page.waitForTimeout(300);

        // Create second instance
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await addButton.click();
        await page.waitForTimeout(500);

        // Open Window menu
        const windowMenuButton = page.getByRole('button', { name: /Fenster|Window/i });
        await windowMenuButton.click();
        await page.waitForTimeout(300);

        // Verify "Close All" action is visible
        const closeAllItem = page.locator('.menu-item', { 
            hasText: /Alle schließen|Close All/i 
        });
        await expect(closeAllItem).toBeVisible();

        // Close menu without clicking
        await page.keyboard.press('Escape');
    });

    test('Close All action closes all Finder instances', async ({ page }) => {
        // Open Finder
        await clickDockIcon(page, 'Finder Icon');
        await page.waitForTimeout(300);

        // Create second instance
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await addButton.click();
        await page.waitForTimeout(500);

        // Verify two instances
        let count = await page.evaluate(() => {
            return window.FinderInstanceManager?.getInstanceCount() || 0;
        });
        expect(count).toBe(2);

        // Open Window menu
        const windowMenuButton = page.getByRole('button', { name: /Fenster|Window/i });
        await windowMenuButton.click();
        await page.waitForTimeout(300);

        // Click "Close All"
        const closeAllItem = page.locator('.menu-item', { 
            hasText: /Alle schließen|Close All/i 
        });
        
        // Handle the confirmation dialog
        page.on('dialog', dialog => dialog.accept());
        
        await closeAllItem.click();
        await page.waitForTimeout(500);

        // Verify all instances are closed
        count = await page.evaluate(() => {
            return window.FinderInstanceManager?.getInstanceCount() || 0;
        });
        expect(count).toBe(0);

        // Verify Finder modal is hidden
        await expect(page.locator('#finder-modal')).toHaveClass(/hidden/);
    });

    test('New Finder action creates new instance', async ({ page }) => {
        // Open Finder
        await clickDockIcon(page, 'Finder Icon');
        await page.waitForTimeout(300);

        // Verify one instance initially
        let count = await page.evaluate(() => {
            return window.FinderInstanceManager?.getInstanceCount() || 0;
        });
        expect(count).toBe(1);

        // Open Window menu
        const windowMenuButton = page.getByRole('button', { name: /Fenster|Window/i });
        await windowMenuButton.click();
        await page.waitForTimeout(300);

        // Click "New Finder" 
        const newFinderItem = page.locator('.menu-item', { 
            hasText: /Neuer Finder|New Finder/i 
        }).first();
        await newFinderItem.click();
        await page.waitForTimeout(500);

        // Verify two instances now exist
        count = await page.evaluate(() => {
            return window.FinderInstanceManager?.getInstanceCount() || 0;
        });
        expect(count).toBe(2);

        // Verify two tabs are visible
        const tabs = page.locator('#finder-tabs-container .wt-tab');
        await expect(tabs).toHaveCount(2);
    });

    test('Menu updates when instances are created/destroyed', async ({ page }) => {
        // Open Finder
        await clickDockIcon(page, 'Finder Icon');
        await page.waitForTimeout(300);

        // Open Window menu - should show only "New Finder", no instance list
        let windowMenuButton = page.getByRole('button', { name: /Fenster|Window/i });
        await windowMenuButton.click();
        await page.waitForTimeout(300);

        // Should not have "Close All" yet (only one instance)
        let closeAllItem = page.locator('.menu-item', { 
            hasText: /Alle schließen|Close All/i 
        });
        await expect(closeAllItem).not.toBeVisible();
        
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);

        // Create second instance
        const addButton = page.locator('#finder-tabs-container .wt-add');
        await addButton.click();
        await page.waitForTimeout(500);

        // Open Window menu again - should now show instance list and Close All
        windowMenuButton = page.getByRole('button', { name: /Fenster|Window/i });
        await windowMenuButton.click();
        await page.waitForTimeout(300);

        // Now "Close All" should be visible
        closeAllItem = page.locator('.menu-item', { 
            hasText: /Alle schließen|Close All/i 
        });
        await expect(closeAllItem).toBeVisible();

        // Should see instance items
        const instanceItems = page.locator('.menu-item', { hasText: /Finder \d+/ });
        const itemCount = await instanceItems.count();
        expect(itemCount).toBeGreaterThanOrEqual(2);
    });
});
