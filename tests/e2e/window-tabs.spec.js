const { test, expect } = require('@playwright/test');

test.describe('Multi-Instance Window Tabs', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173/');
        // Use timeout instead of networkidle for faster, more reliable tests
        await page.waitForTimeout(2000);
    });

    test('should load all multi-instance modules', async ({ page }) => {
        // Check that all modules are loaded
        const modules = await page.evaluate(() => {
            return {
                BaseWindowInstance: typeof window.BaseWindowInstance !== 'undefined',
                InstanceManager: typeof window.InstanceManager !== 'undefined',
                WindowChrome: typeof window.WindowChrome !== 'undefined',
                WindowTabManager: typeof window.WindowTabManager !== 'undefined',
                KeyboardShortcuts: typeof window.KeyboardShortcuts !== 'undefined',
                SessionManager: typeof window.SessionManager !== 'undefined',
                MultiInstanceIntegration: typeof window.MultiInstanceIntegration !== 'undefined'
            };
        });

        expect(modules.BaseWindowInstance).toBe(true);
        expect(modules.InstanceManager).toBe(true);
        expect(modules.WindowChrome).toBe(true);
        expect(modules.WindowTabManager).toBe(true);
        expect(modules.KeyboardShortcuts).toBe(true);
        expect(modules.SessionManager).toBe(true);
        expect(modules.MultiInstanceIntegration).toBe(true);
    });

    test('should have Terminal and TextEditor instance managers', async ({ page }) => {
        const managers = await page.evaluate(() => {
            return {
                terminal: typeof window.TerminalInstanceManager !== 'undefined',
                textEditor: typeof window.TextEditorInstanceManager !== 'undefined'
            };
        });

        expect(managers.terminal).toBe(true);
        expect(managers.textEditor).toBe(true);
    });

    test('should create tab containers in modals', async ({ page }) => {
        // Check that tab containers exist in the HTML
        const terminalTabsContainer = await page.locator('#terminal-tabs-container');
        const textEditorTabsContainer = await page.locator('#text-editor-tabs-container');

        await expect(terminalTabsContainer).toBeAttached();
        await expect(textEditorTabsContainer).toBeAttached();
    });

    test('should create multiple terminal instances via console', async ({ page }) => {
        // Create multiple terminal instances
        const result = await page.evaluate(() => {
            if (!window.TerminalInstanceManager) return null;

            const term1 = window.TerminalInstanceManager.createInstance({
                title: 'Test Terminal 1'
            });
            const term2 = window.TerminalInstanceManager.createInstance({
                title: 'Test Terminal 2'
            });

            return {
                count: window.TerminalInstanceManager.getInstanceCount(),
                term1Id: term1?.instanceId,
                term2Id: term2?.instanceId
            };
        });

        expect(result).not.toBeNull();
        expect(result.count).toBe(2);
        expect(result.term1Id).toBeTruthy();
        expect(result.term2Id).toBeTruthy();
        expect(result.term1Id).not.toBe(result.term2Id);
    });

    test('should register keyboard shortcuts', async ({ page }) => {
        const shortcuts = await page.evaluate(() => {
            if (!window.KeyboardShortcuts) return [];
            return window.KeyboardShortcuts.getAllShortcuts();
        });

        expect(shortcuts.length).toBeGreaterThan(0);

        // Check for common shortcuts
        const shortcutIds = shortcuts.map(s => s.id);
        expect(shortcutIds).toContain('ctrl+n');
        expect(shortcutIds).toContain('ctrl+w');
    });

    test('should have session manager configured', async ({ page }) => {
        const sessionInfo = await page.evaluate(() => {
            if (!window.SessionManager) return null;

            return {
                hasManager: typeof window.SessionManager !== 'undefined',
                storageInfo: window.SessionManager.getStorageInfo()
            };
        });

        expect(sessionInfo).not.toBeNull();
        expect(sessionInfo.hasManager).toBe(true);
        expect(sessionInfo.storageInfo).toBeDefined();
    });
});
