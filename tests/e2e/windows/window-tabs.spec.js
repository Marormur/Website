const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

test.describe('Window Tabs Wiring', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await waitForAppReady(page);
    });

    test('should create tab containers in modals', async ({ page }) => {
        // Check that tab containers exist in the HTML
        const terminalTabsContainer = await page.locator('#terminal-tabs-container');
        const textEditorTabsContainer = await page.locator('#text-editor-tabs-container');

        await expect(terminalTabsContainer).toBeAttached();
        await expect(textEditorTabsContainer).toBeAttached();
    });

    test('should wire WindowTabs and WindowRegistry for terminal windows', async ({ page }) => {
        const result = await page.evaluate(() => {
            if (!window.TerminalWindow || !window.WindowRegistry) return null;

            const term1 = window.TerminalWindow.create({ title: 'Test Terminal 1' });
            const term2 = window.TerminalWindow.create({ title: 'Test Terminal 2' });

            return {
                hasWindowTabsApi: typeof window.WindowTabs !== 'undefined',
                count: window.WindowRegistry.getAllWindows('terminal')?.length || 0,
                // BaseWindow exposes `id`; keep `windowId` fallback for legacy builds
                term1Id: term1?.id || term1?.windowId,
                term2Id: term2?.id || term2?.windowId,
            };
        });

        expect(result).not.toBeNull();
        expect(result.hasWindowTabsApi).toBe(true);
        expect(result.count).toBe(2);
        expect(result.term1Id).toBeTruthy();
        expect(result.term2Id).toBeTruthy();
        expect(result.term1Id).not.toBe(result.term2Id);
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
