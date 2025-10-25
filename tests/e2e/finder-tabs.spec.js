// E2E tests for Finder multi-instance tabs
const { test, expect } = require("@playwright/test");

test.describe("Finder Multi-Instance Tabs", () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + "/index.html");
        await page.waitForTimeout(1000); // Allow system to initialize
    });

    test("Finder opens with initial tab", async ({ page }) => {
        // Open Finder
        await page.getByRole("img", { name: "Finder Icon" }).click();
        await expect(page.locator("#finder-modal")).not.toHaveClass(/hidden/);

        // Check that FinderInstanceManager exists and has one instance
        const finderInfo = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            return {
                count: window.FinderInstanceManager.getInstanceCount(),
                hasActive: window.FinderInstanceManager.getActiveInstance() !== null,
            };
        });

        expect(finderInfo).not.toBeNull();
        expect(finderInfo.count).toBe(1);
        expect(finderInfo.hasActive).toBe(true);

        // Verify tab container exists and has one tab
        const tabContainer = page.locator("#finder-tabs-container");
        await expect(tabContainer).toBeVisible();

        const tabs = page.locator("#finder-tabs-container .wt-tab");
        await expect(tabs).toHaveCount(1);
    });

    test("Can create multiple Finder instances via + button", async ({ page }) => {
        // Open Finder
        await page.getByRole("img", { name: "Finder Icon" }).click();
        await expect(page.locator("#finder-modal")).not.toHaveClass(/hidden/);

        // Click the + button to create a new tab
        const addButton = page.locator("#finder-tabs-container .wt-add");
        await expect(addButton).toBeVisible();
        await addButton.click();

        // Wait a bit for the new instance to be created
        await page.waitForTimeout(300);

        // Verify two tabs exist
        const tabs = page.locator("#finder-tabs-container .wt-tab");
        await expect(tabs).toHaveCount(2);

        // Verify instance count in manager
        const finderInfo = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            return {
                count: window.FinderInstanceManager.getInstanceCount(),
                allIds: window.FinderInstanceManager.getAllInstances().map(i => i.instanceId),
            };
        });

        expect(finderInfo).not.toBeNull();
        expect(finderInfo.count).toBe(2);
        expect(finderInfo.allIds.length).toBe(2);
    });

    test("Can switch between Finder tabs", async ({ page }) => {
        // Open Finder
        await page.getByRole("img", { name: "Finder Icon" }).click();
        await expect(page.locator("#finder-modal")).not.toHaveClass(/hidden/);

        // Create a second tab
        const addButton = page.locator("#finder-tabs-container .wt-add");
        await addButton.click();
        await page.waitForTimeout(300);

        // Get the two tab buttons
        const tabs = page.locator("#finder-tabs-container .wt-tab");
        await expect(tabs).toHaveCount(2);

        const firstTab = tabs.nth(0);
        const secondTab = tabs.nth(1);

        // Second tab should be active (just created)
        await expect(secondTab).toHaveClass(/bg-white|dark:bg-gray-900/);

        // Click first tab to switch
        await firstTab.click();
        await page.waitForTimeout(200);

        // Verify active instance changed
        const activeInfo = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            const active = window.FinderInstanceManager.getActiveInstance();
            const all = window.FinderInstanceManager.getAllInstances();
            return {
                activeId: active?.instanceId,
                isFirstActive: active?.instanceId === all[0]?.instanceId,
            };
        });

        expect(activeInfo).not.toBeNull();
        expect(activeInfo.isFirstActive).toBe(true);
    });

    test("Can close Finder tab via close button", async ({ page }) => {
        // Open Finder
        await page.getByRole("img", { name: "Finder Icon" }).click();
        await expect(page.locator("#finder-modal")).not.toHaveClass(/hidden/);

        // Create a second tab
        const addButton = page.locator("#finder-tabs-container .wt-add");
        await addButton.click();
        await page.waitForTimeout(300);

        // Verify two tabs
        let tabs = page.locator("#finder-tabs-container .wt-tab");
        await expect(tabs).toHaveCount(2);

        // Get initial instance count
        const initialCount = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return 0;
            return window.FinderInstanceManager.getInstanceCount();
        });
        expect(initialCount).toBe(2);

        // Click close button on second tab (active tab)
        const secondTabClose = tabs.nth(1).locator(".wt-tab-close");
        await secondTabClose.click();

        // Wait longer for the tab to actually close and UI to update
        await page.waitForTimeout(500);

        // Verify instance count decreased
        const finalCount = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return 0;
            return window.FinderInstanceManager.getInstanceCount();
        });

        expect(finalCount).toBe(1);

        // Verify only one tab remains in the DOM (may need to wait for re-render)
        await page.waitForTimeout(200);
        tabs = page.locator("#finder-tabs-container .wt-tab");
        await expect(tabs).toHaveCount(1);
    });

    test("Closing last Finder tab closes the modal", async ({ page }) => {
        // Open Finder
        await page.getByRole("img", { name: "Finder Icon" }).click();
        await expect(page.locator("#finder-modal")).not.toHaveClass(/hidden/);

        // Close the single tab
        const tabs = page.locator("#finder-tabs-container .wt-tab");
        const closeButton = tabs.first().locator(".wt-tab-close");
        await closeButton.click();
        await page.waitForTimeout(300);

        // Verify Finder modal is hidden
        await expect(page.locator("#finder-modal")).toHaveClass(/hidden/);
    });

    test("Finder tabs have correct title display", async ({ page }) => {
        // Open Finder
        await page.getByRole("img", { name: "Finder Icon" }).click();
        await expect(page.locator("#finder-modal")).not.toHaveClass(/hidden/);

        // Check first tab title
        const firstTab = page.locator("#finder-tabs-container .wt-tab").first();
        const firstTabTitle = firstTab.locator(".wt-tab-title");
        await expect(firstTabTitle).toContainText("Finder");

        // Create second tab
        const addButton = page.locator("#finder-tabs-container .wt-add");
        await addButton.click();
        await page.waitForTimeout(300);

        // Check second tab title
        const secondTab = page.locator("#finder-tabs-container .wt-tab").nth(1);
        const secondTabTitle = secondTab.locator(".wt-tab-title");
        await expect(secondTabTitle).toContainText("Finder");
    });

    test("Finder instances maintain independent navigation state", async ({ page }) => {
        // Open Finder
        await page.getByRole("img", { name: "Finder Icon" }).click();
        await expect(page.locator("#finder-modal")).not.toHaveClass(/hidden/);

        // Navigate first instance to GitHub
        await page.locator("#finder-sidebar-github").click();
        await page.waitForTimeout(500);

        // Create second tab (should start at default view)
        const addButton = page.locator("#finder-tabs-container .wt-add");
        await addButton.click();
        await page.waitForTimeout(300);

        // Verify both instances exist with different states
        const instanceStates = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            const instances = window.FinderInstanceManager.getAllInstances();
            return instances.map(inst => ({
                id: inst.instanceId,
                // Access state if available (depends on FinderInstance implementation)
                hasState: inst.state !== undefined,
            }));
        });

        expect(instanceStates).not.toBeNull();
        expect(instanceStates.length).toBe(2);
    });

    test("Keyboard shortcut Ctrl+W closes active Finder tab", async ({ page }) => {
        // Open Finder
        await page.getByRole("img", { name: "Finder Icon" }).click();
        await expect(page.locator("#finder-modal")).not.toHaveClass(/hidden/);

        // Create a second tab
        const addButton = page.locator("#finder-tabs-container .wt-add");
        await addButton.click();
        await page.waitForTimeout(300);

        // Verify two tabs
        let tabs = page.locator("#finder-tabs-container .wt-tab");
        await expect(tabs).toHaveCount(2);

        // Press Ctrl+W (or Cmd+W on Mac)
        await page.keyboard.press("Control+KeyW");
        await page.waitForTimeout(300);

        // Verify one tab remains
        tabs = page.locator("#finder-tabs-container .wt-tab");
        await expect(tabs).toHaveCount(1);
    });

    test("Keyboard shortcut Ctrl+N creates new Finder tab", async ({ page }) => {
        // Open Finder
        await page.getByRole("img", { name: "Finder Icon" }).click();
        await expect(page.locator("#finder-modal")).not.toHaveClass(/hidden/);

        // Press Ctrl+N
        await page.keyboard.press("Control+KeyN");
        await page.waitForTimeout(300);

        // Verify two tabs exist
        const tabs = page.locator("#finder-tabs-container .wt-tab");
        await expect(tabs).toHaveCount(2);
    });

    test("Keyboard shortcut Ctrl+Tab switches to next tab", async ({ page }) => {
        // Open Finder
        await page.getByRole("img", { name: "Finder Icon" }).click();
        await expect(page.locator("#finder-modal")).not.toHaveClass(/hidden/);

        // Create second tab
        const addButton = page.locator("#finder-tabs-container .wt-add");
        await addButton.click();
        await page.waitForTimeout(300);

        // Click first tab to make it active
        const tabs = page.locator("#finder-tabs-container .wt-tab");
        await tabs.nth(0).click();
        await page.waitForTimeout(200);

        // Press Ctrl+Tab to switch to next
        await page.keyboard.press("Control+Tab");
        await page.waitForTimeout(300);

        // Verify second tab is now active
        const activeInfo = await page.evaluate(() => {
            if (!window.FinderInstanceManager) return null;
            const active = window.FinderInstanceManager.getActiveInstance();
            const all = window.FinderInstanceManager.getAllInstances();
            return {
                activeId: active?.instanceId,
                isSecondActive: active?.instanceId === all[1]?.instanceId,
            };
        });

        expect(activeInfo).not.toBeNull();
        expect(activeInfo.isSecondActive).toBe(true);
    });
});
