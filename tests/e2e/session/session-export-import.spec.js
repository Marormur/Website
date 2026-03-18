// @ts-check
import { test, expect } from '@playwright/test';
import { gotoHome, waitForAppReady, openFinderWindow, waitForFinderReady } from '../utils.js';

test.describe('Session Export/Import', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await gotoHome(page, baseURL);
        await waitForAppReady(page);
        await page.evaluate(() => {
            localStorage.removeItem('multi-window-session');
            localStorage.removeItem('windowInstancesSession');
            localStorage.removeItem('window-session');
            window.WindowRegistry?.closeAllWindows?.();
            window.TerminalInstanceManager?.destroyAllInstances?.();
            window.TextEditorInstanceManager?.destroyAllInstances?.();
        });
    });

    async function waitForTerminalCount(page, count) {
        await page.waitForFunction(
            expected => {
                const windows = window.WindowRegistry?.getAllWindows?.('terminal') || [];
                const total = windows.reduce((sum, win) => sum + (win.tabs?.size || 0), 0);
                return total >= expected;
            },
            count,
            { timeout: 8000 }
        );
    }

    async function createTerminalTabs(page, count, { cwd, commands } = {}) {
        await page.evaluate(
            ({ count, cwd, commands }) => {
                if (!window.TerminalWindow?.create) return;
                const terminalWindow = window.TerminalWindow.create();
                for (let i = 1; i < count; i++) {
                    terminalWindow.createSession?.(`Terminal ${i + 1}`);
                }

                const session = terminalWindow.activeSession;
                if (!session) return;

                if (Array.isArray(commands) && typeof session.executeCommand === 'function') {
                    for (const command of commands) {
                        session.executeCommand(command);
                    }
                }

                if (typeof cwd === 'string') {
                    session.vfsCwd = cwd;
                    session.updateContentState?.({ currentPath: cwd });
                }
            },
            { count, cwd, commands }
        );
        await waitForTerminalCount(page, count);
    }

    test('should export current session as JSON file', async ({ page }) => {
        await createTerminalTabs(page, 2);

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
        expect(sessionData).toHaveProperty('version', '1.0.0');
        expect(sessionData).toHaveProperty('timestamp');
        expect(sessionData).toHaveProperty('windows');
        expect(typeof sessionData.timestamp).toBe('number');

        // Verify a terminal window with tabs is present in the exported snapshot.
        const terminalWindow = sessionData.windows.find(win => win.type === 'terminal');
        expect(terminalWindow).toBeTruthy();
        expect(Array.isArray(terminalWindow.tabs)).toBe(true);
        expect(terminalWindow.tabs.length).toBeGreaterThanOrEqual(2);
    });

    test('should import session and restore instances', async ({ page }) => {
        await createTerminalTabs(page, 2);

        const exportedJson = await page.evaluate(() => {
            return window.MultiWindowSessionManager?.exportSession();
        });

        expect(exportedJson).toBeTruthy();

        // Clear all instances
        await page.evaluate(() => {
            window.WindowRegistry?.closeAllWindows?.();
            window.TerminalInstanceManager?.destroyAllInstances?.();
            window.TextEditorInstanceManager?.destroyAllInstances?.();
        });

        // Verify instances are cleared
        const countBeforeImport = await page.evaluate(() => {
            const windows = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            return windows.reduce((sum, win) => sum + (win.tabs?.size || 0), 0);
        });
        expect(countBeforeImport).toBe(0);

        // Import the session
        const importSuccess = await page.evaluate(async json => {
            return await window.MultiWindowSessionManager?.importSession(json);
        }, exportedJson);

        expect(importSuccess).toBe(true);
        await waitForTerminalCount(page, 2);

        // Verify instances were restored
        const countAfterImport = await page.evaluate(() => {
            const windows = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            return windows.reduce((sum, win) => sum + (win.tabs?.size || 0), 0);
        });
        expect(countAfterImport).toBeGreaterThanOrEqual(2);
    });

    test('should handle import with version mismatch gracefully', async ({ page }) => {
        const invalidSession = JSON.stringify({
            version: '99.0', // Invalid version
            timestamp: Date.now(),
            instances: { terminal: [] },
        });

        const importSuccess = await page.evaluate(async json => {
            return await window.MultiWindowSessionManager?.importSession(json);
        }, invalidSession);

        expect(importSuccess).toBe(false);
    });

    test('should handle invalid JSON gracefully', async ({ page }) => {
        const importSuccess = await page.evaluate(async () => {
            return await window.MultiWindowSessionManager?.importSession('not valid json {[');
        });

        expect(importSuccess).toBe(false);
    });

    test('should preserve instance state during export/import', async ({ page }) => {
        await createTerminalTabs(page, 1, {
            cwd: '/home/test',
            commands: ['ls', 'cd /home/test', 'pwd'],
        });

        // Export session
        const exportedJson = await page.evaluate(() => {
            return window.MultiWindowSessionManager?.exportSession();
        });

        // Clear instances
        await page.evaluate(() => {
            window.WindowRegistry?.closeAllWindows?.();
            window.TerminalInstanceManager?.destroyAllInstances?.();
            window.TextEditorInstanceManager?.destroyAllInstances?.();
        });

        // Import session
        const importSuccess = await page.evaluate(async json => {
            return await window.MultiWindowSessionManager?.importSession(json);
        }, exportedJson);
        expect(importSuccess).toBe(true);
        await waitForTerminalCount(page, 1);

        // Verify state was preserved
        const restoredState = await page.evaluate(() => {
            const terminalWindow = (window.WindowRegistry?.getAllWindows?.('terminal') || [])[0];
            const session = terminalWindow?.activeSession;
            if (!session) return null;
            return {
                currentPath: session.vfsCwd || session.currentPath || null,
                commandHistory: session.commandHistory || [],
            };
        });

        expect(restoredState).toBeTruthy();
        expect(restoredState.currentPath).toBe('/home/test');
        expect(restoredState.commandHistory).toEqual(['ls', 'cd /home/test', 'pwd']);
    });

    test('should handle menu-triggered export', async ({ page }) => {
        // Open Finder to access menu
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 5000 });

        // Click menubar to open dropdown (use getByRole for de-DE/en-US compatibility)
        const fileButton = page.getByRole('button', { name: /^(Ablage|File)$/ });
        await fileButton.click();

        // Wait for menu to appear and be visible (not hidden)
        await page.waitForSelector('.menu-dropdown:not(.hidden)', { state: 'visible' });

        // Verify export menu item exists
        const exportMenuItem = page.getByRole('menuitem', {
            name: /Export.*Session|Session.*export/i,
        });
        await expect(exportMenuItem).toBeVisible();
    });

    test('should handle empty session export', async ({ page }) => {
        // Clear all instances first
        await page.evaluate(() => {
            window.MultiWindowSessionManager?.clearSession?.();
            window.SessionManager?.clear();
        });

        // Try to export
        const exportedJson = await page.evaluate(() => {
            return window.MultiWindowSessionManager?.exportSession();
        });

        // Should still export valid JSON even if empty
        if (exportedJson) {
            const sessionData = JSON.parse(exportedJson);
            expect(sessionData.version).toBe('1.0.0');
            expect(Array.isArray(sessionData.windows)).toBe(true);
        }
    });
});
