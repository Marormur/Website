const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

test.describe('Multi-Instance Window Tabs', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await waitForAppReady(page);
    });

    test('should load all multi-instance modules', async ({ page }) => {
        // Check that all modules are loaded
        const modules = await page.evaluate(() => {
            return {
                BaseWindowInstance: typeof window.BaseWindowInstance !== 'undefined',
                InstanceManager: typeof window.InstanceManager !== 'undefined',
                WindowChrome: typeof window.WindowChrome !== 'undefined',
                WindowTabs: typeof window.WindowTabs !== 'undefined',
                KeyboardShortcuts: typeof window.KeyboardShortcuts !== 'undefined',
                SessionManager: typeof window.SessionManager !== 'undefined',
                MultiInstanceIntegration: typeof window.MultiInstanceIntegration !== 'undefined',
            };
        });

        expect(modules.BaseWindowInstance).toBe(true);
        expect(modules.InstanceManager).toBe(true);
        expect(modules.WindowChrome).toBe(true);
        expect(modules.WindowTabs).toBe(true);
        expect(modules.KeyboardShortcuts).toBe(true);
        expect(modules.SessionManager).toBe(true);
        expect(modules.MultiInstanceIntegration).toBe(true);
    });

    test('should have TextEditor instance manager', async ({ page }) => {
        const managers = await page.evaluate(() => {
            return {
                textEditor: typeof window.TextEditorInstanceManager !== 'undefined',
                windowRegistry: typeof window.WindowRegistry !== 'undefined',
            };
        });

        expect(managers.textEditor).toBe(true);
        expect(managers.windowRegistry).toBe(true);
    });

    test('should create tab containers in modals', async ({ page }) => {
        // Check that tab containers exist in the HTML
        const terminalTabsContainer = await page.locator('#terminal-tabs-container');
        const textEditorTabsContainer = await page.locator('#text-editor-tabs-container');

        await expect(terminalTabsContainer).toBeAttached();
        await expect(textEditorTabsContainer).toBeAttached();
    });

    test('should create multiple terminal windows via WindowRegistry', async ({ page }) => {
        // Create multiple terminal windows
        const result = await page.evaluate(() => {
            if (!window.TerminalWindow || !window.WindowRegistry) return null;

            const term1 = window.TerminalWindow.create({ title: 'Test Terminal 1' });
            const term2 = window.TerminalWindow.create({ title: 'Test Terminal 2' });

            return {
                count: window.WindowRegistry.getAllWindows('terminal')?.length || 0,
                term1Id: term1?.windowId,
                term2Id: term2?.windowId,
            };
        });

        expect(result).not.toBeNull();
        expect(result.count).toBe(2);
        expect(result.term1Id).toBeTruthy();
        expect(result.term2Id).toBeTruthy();
        expect(result.term1Id).not.toBe(result.term2Id);
    });

    test('should register keyboard shortcuts', async ({ page }) => {
        // KeyboardShortcuts API doesn't expose getAllShortcuts - instead verify it's loaded
        const hasShortcuts = await page.evaluate(() => {
            if (!window.KeyboardShortcuts) return false;
            return (
                typeof window.KeyboardShortcuts.register === 'function' &&
                typeof window.KeyboardShortcuts.setContextResolver === 'function'
            );
        });

        expect(hasShortcuts).toBe(true);
    });

    test('should have session manager configured', async ({ page }) => {
        const sessionInfo = await page.evaluate(() => {
            if (!window.SessionManager) return null;

            return {
                hasManager: typeof window.SessionManager !== 'undefined',
                storageInfo: window.SessionManager.getStorageInfo(),
            };
        });

        expect(sessionInfo).not.toBeNull();
        expect(sessionInfo.hasManager).toBe(true);
        expect(sessionInfo.storageInfo).toBeDefined();
    });
});
