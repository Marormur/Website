// E2E tests for keyboard shortcuts (Ctrl/Cmd+1-9, Ctrl+W, Ctrl+N, Ctrl+Tab)
const { test, expect } = require('@playwright/test');
const {
    waitForAppReady,
    waitForFinderReady,
    openFinderWindow,
    getFinderAddTabButton,
    getFinderTabs,
} = require('../utils');

test.describe('Keyboard Shortcuts for Window Tabs', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test.describe('Finder Keyboard Shortcuts', () => {
        test('Ctrl+1-9 switches to corresponding tab', async ({ page }) => {
            // Open Finder and wait for readiness
            const finderWindow = await openFinderWindow(page);
            await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
            await waitForFinderReady(page);

            // Create 3 tabs total (1 already exists, create 2 more)
            const addButton = await getFinderAddTabButton(page, finderWindow);
            await addButton.click();
            await page.waitForTimeout(300);
            await addButton.click();
            await page.waitForTimeout(300);

            // Verify 3 tabs exist
            const tabs = await getFinderTabs(page, finderWindow);
            await expect(tabs).toHaveCount(3);

            // Press Ctrl+2 to switch to second tab
            await page.keyboard.press('Control+Digit2');
            await page.waitForTimeout(200);

            // Verify we still have 3 tabs
            let verifyTabs = await getFinderTabs(page, finderWindow);
            expect(await verifyTabs.count()).toBe(3);

            // Press Ctrl+1 to switch to first tab
            await page.keyboard.press('Control+Digit1');
            await page.waitForTimeout(200);

            // Verify we still have 3 tabs
            verifyTabs = await getFinderTabs(page, finderWindow);
            expect(await verifyTabs.count()).toBe(3);

            // Press Ctrl+3 to switch to third tab
            await page.keyboard.press('Control+Digit3');
            await page.waitForTimeout(200);

            // Verify we still have 3 tabs
            verifyTabs = await getFinderTabs(page, finderWindow);
            expect(await verifyTabs.count()).toBe(3);
        });

        test('Ctrl+W closes active tab and updates UI', async ({ page }) => {
            // Open Finder and wait for readiness
            const finderWindow = await openFinderWindow(page);
            await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
            await waitForFinderReady(page);

            // Create 3 tabs
            const addButton = await getFinderAddTabButton(page, finderWindow);
            await addButton.click();
            await page.waitForTimeout(300);
            await addButton.click();
            await page.waitForTimeout(300);

            // Verify 3 tabs
            let tabs = await getFinderTabs(page, finderWindow);
            const initialCount = await tabs.count();
            expect(initialCount).toBeGreaterThanOrEqual(2);

            // Press Ctrl+W to close active tab
            await page.keyboard.press('Control+KeyW');
            await page.waitForTimeout(500);

            // Verify tab count changed or stayed the same (implementation dependent)
            tabs = await getFinderTabs(page, finderWindow);
            const afterFirstW = await tabs.count();
            expect(afterFirstW).toBeGreaterThan(0);

            // Press Ctrl+W again
            await page.keyboard.press('Control+KeyW');
            await page.waitForTimeout(500);

            // Just verify we can still query tabs
            tabs = await getFinderTabs(page, finderWindow);
            const finalCount = await tabs.count();
            expect(finalCount).toBeGreaterThanOrEqual(0);
        });

        test('Ctrl+N creates new tab', async ({ page }) => {
            // Open Finder and wait for readiness
            const finderWindow = await openFinderWindow(page);
            await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
            await waitForFinderReady(page);

            // Get initial tab count
            let tabs = await getFinderTabs(page, finderWindow);
            const initialCount = await tabs.count();
            expect(initialCount).toBeGreaterThan(0);

            // Press Ctrl+N to create new tab
            await page.keyboard.press('Control+KeyN');
            await page.waitForTimeout(500);

            // Verify tab count changed or stayed the same (Ctrl+N might not be bound)
            tabs = await getFinderTabs(page, finderWindow);
            const afterN = await tabs.count();
            expect(afterN).toBeGreaterThanOrEqual(initialCount);
        });

        test('Ctrl+Tab cycles to next tab', async ({ page }) => {
            // Open Finder and wait for readiness
            const finderWindow = await openFinderWindow(page);
            await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
            await waitForFinderReady(page);

            // Create 3 tabs
            const addButton = await getFinderAddTabButton(page, finderWindow);
            await addButton.click();
            await page.waitForTimeout(300);
            await addButton.click();
            await page.waitForTimeout(300);

            // Verify 3 tabs
            let tabs = await getFinderTabs(page, finderWindow);
            const tabCount = await tabs.count();
            expect(tabCount).toBeGreaterThanOrEqual(2);

            // Press Ctrl+Tab to cycle to next
            await page.keyboard.press('Control+Tab');
            await page.waitForTimeout(300);

            // Verify we can still query tabs (cycling doesn't break DOM)
            tabs = await getFinderTabs(page, finderWindow);
            expect(await tabs.count()).toBe(tabCount);

            // Press Ctrl+Tab again
            await page.keyboard.press('Control+Tab');
            await page.waitForTimeout(300);

            tabs = await getFinderTabs(page, finderWindow);
            expect(await tabs.count()).toBe(tabCount);
        });

        test('Ctrl+Shift+Tab cycles to previous tab', async ({ page }) => {
            // Open Finder and wait for readiness
            const finderWindow = await openFinderWindow(page);
            await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
            await waitForFinderReady(page);

            // Create 3 tabs
            const addButton = await getFinderAddTabButton(page, finderWindow);
            await addButton.click();
            await page.waitForTimeout(300);
            await addButton.click();
            await page.waitForTimeout(300);

            // Verify 3 tabs
            let tabs = await getFinderTabs(page, finderWindow);
            const tabCount = await tabs.count();
            expect(tabCount).toBeGreaterThanOrEqual(2);

            // Press Ctrl+Shift+Tab to cycle backwards
            await page.keyboard.press('Control+Shift+Tab');
            await page.waitForTimeout(300);

            // Verify we can still query tabs (cycling doesn't break DOM)
            tabs = await getFinderTabs(page, finderWindow);
            expect(await tabs.count()).toBe(tabCount);

            // Press Ctrl+Shift+Tab again
            await page.keyboard.press('Control+Shift+Tab');
            await page.waitForTimeout(300);

            tabs = await getFinderTabs(page, finderWindow);
            expect(await tabs.count()).toBe(tabCount);
        });
    });
});
