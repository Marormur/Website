// @ts-check
import { test, expect } from '@playwright/test';
import { gotoHome, waitForAppReady } from './utils.js';

test.describe('Session Export/Import', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await gotoHome(page, baseURL);
        await waitForAppReady(page);
    });

    test('should export current session as JSON file', async ({ page }) => {
        // Create some instances to export
        await page.evaluate(() => {
            const termMgr = window.TerminalInstanceManager;
            if (termMgr) {
                termMgr.createInstance({ title: 'Test Terminal 1' });
                termMgr.createInstance({ title: 'Test Terminal 2' });
            }
        });

        // Wait for auto-save to complete (SessionManager uses 750ms debounce)
        await page.waitForTimeout(1000);

        // Trigger export via ActionBus
        const downloadPromise = page.waitForEvent('download');
        await page.evaluate(() => {
            const actionBus = window.ActionBus;
            if (actionBus) {
                actionBus.execute('session:export');
            }
        });

        // Verify download occurred
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/^session-\d{4}-\d{2}-\d{2}\.json$/);

        // Read downloaded file content
        const path = await download.path();
        const fs = await import('fs');
        const content = fs.readFileSync(path, 'utf-8');
        const sessionData = JSON.parse(content);

        // Validate session structure
        expect(sessionData).toHaveProperty('version', '1.0');
        expect(sessionData).toHaveProperty('timestamp');
        expect(sessionData).toHaveProperty('instances');
        expect(typeof sessionData.timestamp).toBe('number');
        
        // Verify terminal instances are present
        expect(sessionData.instances).toHaveProperty('terminal');
        expect(Array.isArray(sessionData.instances.terminal)).toBe(true);
        expect(sessionData.instances.terminal.length).toBeGreaterThanOrEqual(2);
    });

    test('should import session and restore instances', async ({ page }) => {
        // First, create and export a session
        await page.evaluate(() => {
            const termMgr = window.TerminalInstanceManager;
            if (termMgr) {
                termMgr.createInstance({ title: 'Export Test 1' });
                termMgr.createInstance({ title: 'Export Test 2' });
            }
        });

        // Wait for auto-save to complete
        await page.waitForTimeout(1000);

        const exportedJson = await page.evaluate(() => {
            return window.SessionManager?.exportSession();
        });

        expect(exportedJson).toBeTruthy();

        // Clear all instances
        await page.evaluate(() => {
            const termMgr = window.TerminalInstanceManager;
            if (termMgr) {
                termMgr.destroyAllInstances();
            }
        });

        // Verify instances are cleared
        const countBeforeImport = await page.evaluate(() => {
            const termMgr = window.TerminalInstanceManager;
            return termMgr ? termMgr.getInstanceCount() : 0;
        });
        expect(countBeforeImport).toBe(0);

        // Import the session
        const importSuccess = await page.evaluate((json) => {
            return window.SessionManager?.importSession(json);
        }, exportedJson);

        expect(importSuccess).toBe(true);

        // Verify instances were restored
        const countAfterImport = await page.evaluate(() => {
            const termMgr = window.TerminalInstanceManager;
            return termMgr ? termMgr.getInstanceCount() : 0;
        });
        expect(countAfterImport).toBeGreaterThanOrEqual(2);

        // Verify instance titles were preserved
        const restoredTitles = await page.evaluate(() => {
            const termMgr = window.TerminalInstanceManager;
            if (!termMgr) return [];
            // @ts-ignore
            return termMgr.getAllInstances().map(inst => inst.title);
        });
        expect(restoredTitles).toContain('Export Test 1');
        expect(restoredTitles).toContain('Export Test 2');
    });

    test('should handle import with version mismatch gracefully', async ({ page }) => {
        const invalidSession = JSON.stringify({
            version: '99.0', // Invalid version
            timestamp: Date.now(),
            instances: { terminal: [] }
        });

        const importSuccess = await page.evaluate((json) => {
            return window.SessionManager?.importSession(json);
        }, invalidSession);

        expect(importSuccess).toBe(false);
    });

    test('should handle invalid JSON gracefully', async ({ page }) => {
        const importSuccess = await page.evaluate(() => {
            return window.SessionManager?.importSession('not valid json {[');
        });

        expect(importSuccess).toBe(false);
    });

    test('should preserve instance state during export/import', async ({ page }) => {
        // Create terminal with specific state
        await page.evaluate(() => {
            const termMgr = window.TerminalInstanceManager;
            if (termMgr) {
                // Create instance (result intentionally unused - just for setup)
                termMgr.createInstance({ 
                    title: 'State Test Terminal',
                    initialState: {
                        currentPath: '/home/test',
                        commandHistory: ['ls', 'cd /home', 'pwd']
                    }
                });
            }
        });

        // Wait for auto-save to complete
        await page.waitForTimeout(1000);

        // Export session
        const exportedJson = await page.evaluate(() => {
            return window.SessionManager?.exportSession();
        });

        // Clear instances
        await page.evaluate(() => {
            const termMgr = window.TerminalInstanceManager;
            if (termMgr) termMgr.destroyAllInstances();
        });

        // Import session
        await page.evaluate((json) => {
            return window.SessionManager?.importSession(json);
        }, exportedJson);

        // Verify state was preserved
        const restoredState = await page.evaluate(() => {
            const termMgr = window.TerminalInstanceManager;
            if (!termMgr) return null;
            const instances = termMgr.getAllInstances();
            // @ts-ignore
            const testInstance = instances.find(inst => inst.title === 'State Test Terminal');
            return testInstance ? testInstance.state : null;
        });

        expect(restoredState).toBeTruthy();
        expect(restoredState.currentPath).toBe('/home/test');
        expect(restoredState.commandHistory).toEqual(['ls', 'cd /home', 'pwd']);
    });

    test('should handle menu-triggered export', async ({ page }) => {
        // Open Finder to access menu
        await page.click('[data-action="openWindow"][data-window-id="finder-modal"]');
        await page.waitForSelector('#finder-modal:not(.hidden)');

        // Click menubar to open dropdown
        await page.click('#menubar .menu-item:has-text("Ablage"), #menubar .menu-item:has-text("File")');
        
        // Wait for menu to appear
        await page.waitForSelector('.menu-dropdown', { state: 'visible' });

        // Verify export menu item exists
        const exportMenuItem = await page.locator('.menu-dropdown .menu-item', { hasText: /Export.*Session|Session.*export/i });
        await expect(exportMenuItem).toBeVisible();
    });

    test('should handle empty session export', async ({ page }) => {
        // Clear all instances first
        await page.evaluate(() => {
            window.SessionManager?.clear();
        });

        // Try to export
        const exportedJson = await page.evaluate(() => {
            return window.SessionManager?.exportSession();
        });

        // Should still export valid JSON even if empty
        if (exportedJson) {
            const sessionData = JSON.parse(exportedJson);
            expect(sessionData.version).toBe('1.0');
            expect(sessionData.instances).toBeDefined();
        }
    });
});
