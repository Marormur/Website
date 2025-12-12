// Test comprehensive session restore functionality
// Validates restoration of instances, modals, active tabs, and UI state

const { test, expect } = require('@playwright/test');
const { waitForAppReady, clickDockIcon, waitForSessionSaved } = require('../utils');

test.describe('Session Restore - Full Integration @basic', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage and start fresh
        await page.goto('http://127.0.0.1:5173/index.html');
        await page.evaluate(() => {
            localStorage.clear();
        });
        await page.reload();
        await waitForAppReady(page);
    });

    test('should restore terminal instances and active tab on reload', async ({ page }) => {
        // Skip if new multi-window Terminal API not available
        const hasTerminal = await page.evaluate(() => {
            return !!window.TerminalWindow;
        });

        if (!hasTerminal) {
            test.skip();
            return;
        }

        // No legacy dock interaction — create terminal windows via multi-window API directly

        // Create multiple terminal windows using the new multi-window API
        const { beforeCount, afterCount, activeId } = await page.evaluate(() => {
            if (!window.TerminalWindow || !window.WindowRegistry)
                return { beforeCount: 0, afterCount: 0, activeId: null };

            const before = window.WindowRegistry.getWindowsByType('terminal')?.length || 0;

            // Create 3 terminal windows (each with one session)
            for (let i = 0; i < 3; i++) {
                window.TerminalWindow.create({ title: `Terminal ${i + 1}` });
            }

            const wins = window.WindowRegistry.getWindowsByType('terminal') || [];
            const after = wins.length;

            // Bring the second newly-created terminal to front (if available)
            const idxToActivate = before + 1; // second of the newly created windows
            if (
                wins.length > idxToActivate &&
                typeof wins[idxToActivate].bringToFront === 'function'
            ) {
                wins[idxToActivate].bringToFront();
            }

            const top = window.WindowRegistry.getTopWindow();
            return { beforeCount: before, afterCount: after, activeId: top ? top.id : null };
        });

        const createdDelta = afterCount - beforeCount;
        expect(createdDelta).toBe(3);

        const activeBeforeReload = activeId;

        // Manually trigger save (prefer MultiWindowSessionManager) before reload and wait for persistence
        await page.evaluate(() => {
            if (
                window.MultiWindowSessionManager &&
                typeof window.MultiWindowSessionManager.saveSession === 'function'
            ) {
                window.MultiWindowSessionManager.saveSession({ immediate: true });
                return;
            }
            if (window.SessionManager) {
                window.SessionManager.saveAllSessions();
            }
        });
        await waitForSessionSaved(page);
        // Wait until a session key is present to ensure the save finished
        await page.waitForFunction(
            () => {
                return !!(
                    localStorage.getItem('windowInstancesSession') ||
                    localStorage.getItem('multi-window-session') ||
                    localStorage.getItem('window-session')
                );
            },
            { timeout: 2000 }
        );

        // Diagnostic: read saved multi-window session payload and ensure it contains our windows
        const savedInfo = await page.evaluate(() => {
            const raw =
                localStorage.getItem('multi-window-session') ||
                localStorage.getItem('windowInstancesSession') ||
                localStorage.getItem('window-session');
            if (!raw) return { key: null, windows: -1, raw: null };
            try {
                const parsed = JSON.parse(raw);
                return {
                    key: localStorage.getItem('multi-window-session')
                        ? 'multi-window-session'
                        : localStorage.getItem('windowInstancesSession')
                          ? 'windowInstancesSession'
                          : 'window-session',
                    windows: parsed.windows?.length || 0,
                    raw: JSON.stringify(parsed),
                };
            } catch (e) {
                return { key: 'unknown', windows: -2, raw: raw.slice(0, 200) };
            }
        });

        expect(savedInfo.windows).toBeGreaterThanOrEqual(createdDelta);

        // Reload page
        await page.reload();
        await waitForAppReady(page);
        // Ensure restore happens (call explicitly as a fallback) and wait for registry
        await page.evaluate(async () => {
            try {
                if (
                    window.MultiWindowSessionManager &&
                    typeof window.MultiWindowSessionManager.restoreSession === 'function'
                ) {
                    await window.MultiWindowSessionManager.restoreSession();
                }
            } catch (e) {
                // ignore; app-init also attempts restore
            }
        });

        await page.waitForFunction(
            ({ expected }) => {
                try {
                    if (!window.WindowRegistry) return false;
                    const cur = window.WindowRegistry.getWindowsByType('terminal') || [];
                    return cur.length >= expected;
                } catch {
                    return false;
                }
            },
            { expected: beforeCount + createdDelta },
            { timeout: 8000 }
        );

        // Verify terminal windows were restored via WindowRegistry
        const restoredCount = await page.evaluate(() => {
            return window.WindowRegistry.getWindowsByType('terminal')?.length || 0;
        });

        expect(restoredCount).toBe(3);

        // Verify active (top) window was restored
        const activeAfterReload = await page.evaluate(() => {
            const top = window.WindowRegistry.getTopWindow();
            return top ? top.id : null;
        });

        expect(activeAfterReload).toBe(activeBeforeReload);
    });

    test('should restore text editor instances and active tab on reload', async ({ page }) => {
        // Skip if new multi-window TextEditor API not available
        const hasTextEditor = await page.evaluate(() => {
            return !!window.TextEditorWindow;
        });

        if (!hasTextEditor) {
            test.skip();
            return;
        }

        // No legacy dock interaction — create text editor windows via multi-window API directly

        // Create multiple text editor windows via the new multi-window API
        await page.evaluate(() => {
            if (!window.TextEditorWindow || !window.WindowRegistry) return;

            const w1 = window.TextEditorWindow.create({ title: 'Document 1' });
            const w2 = window.TextEditorWindow.create({ title: 'Document 2' });

            // Update content of first document
            const wins = window.WindowRegistry.getWindowsByType('text-editor') || [];
            if (wins.length > 0) {
                const firstWin = wins[0];
                const tabs = Array.from(firstWin.tabs.values());
                if (tabs.length > 0 && typeof tabs[0].updateContentState === 'function') {
                    tabs[0].updateContentState({ content: 'Hello from document 1' });
                }
            }
        });

        // Manually trigger save (prefer MultiWindowSessionManager) and wait for persistence
        await page.evaluate(() => {
            if (
                window.MultiWindowSessionManager &&
                typeof window.MultiWindowSessionManager.saveSession === 'function'
            ) {
                window.MultiWindowSessionManager.saveSession({ immediate: true });
                return;
            }
            if (window.SessionManager) {
                window.SessionManager.saveAllSessions();
            }
        });
        await waitForSessionSaved(page);
        // Wait until a session key is present to ensure the save finished
        await page.waitForFunction(
            () => {
                return !!(
                    localStorage.getItem('windowInstancesSession') ||
                    localStorage.getItem('multi-window-session') ||
                    localStorage.getItem('window-session')
                );
            },
            { timeout: 2000 }
        );

        // Reload page
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(300);

        // Verify text editor windows were restored
        const restoredCount = await page.evaluate(() => {
            return window.WindowRegistry.getWindowsByType('text-editor')?.length || 0;
        });

        expect(restoredCount).toBe(2);

        // Verify content was preserved for first document
        const content1 = await page.evaluate(() => {
            const wins = window.WindowRegistry.getWindowsByType('text-editor') || [];
            if (wins.length === 0) return '';
            const firstWin = wins[0];
            const tabs = Array.from(firstWin.tabs.values());
            if (tabs.length === 0) return '';
            return tabs[0].contentState?.content || '';
        });

        expect(content1).toContain('Hello from document');
    });

    test('should restore modal visibility state', async ({ page }) => {
        // Open about modal
        const appleMenuButton = page.locator('[aria-controls="apple-menu-dropdown"]').first();
        await appleMenuButton.click();

        const aboutTrigger = page.locator('[data-action="openAbout"]').first();
        await aboutTrigger.click();

        await page.waitForTimeout(300);

        // Verify modal is visible
        const aboutModal = page.locator('#about-modal');
        await expect(aboutModal).not.toHaveClass(/hidden/);

        // Save session and wait for persistence (prefer MultiWindowSessionManager)
        await page.evaluate(() => {
            if (
                window.MultiWindowSessionManager &&
                typeof window.MultiWindowSessionManager.saveSession === 'function'
            ) {
                window.MultiWindowSessionManager.saveSession({ immediate: true });
                return;
            }
            if (window.SessionManager) {
                window.SessionManager.saveAllSessions();
            }
        });
        await waitForSessionSaved(page);
        // Wait until a session key is present to ensure the save finished
        await page.waitForFunction(
            () => {
                return !!(
                    localStorage.getItem('windowInstancesSession') ||
                    localStorage.getItem('multi-window-session') ||
                    localStorage.getItem('window-session')
                );
            },
            { timeout: 2000 }
        );

        // Reload page
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(300);

        // Verify modal is still visible after reload
        const aboutModalAfter = page.locator('#about-modal');
        await expect(aboutModalAfter).not.toHaveClass(/hidden/, { timeout: 2000 });
    });

    test('should not restore transient modals', async ({ page }) => {
        // Manually inject a transient modal into session storage
        await page.evaluate(() => {
            const sessionData = {
                version: '1.1',
                timestamp: Date.now(),
                sessions: {},
                modalState: {
                    'program-info-modal': {
                        visible: true,
                        minimized: false,
                        zIndex: '1001',
                    },
                    'about-modal': {
                        visible: true,
                        minimized: false,
                        zIndex: '1000',
                    },
                },
                tabState: {},
            };
            localStorage.setItem('window-session', JSON.stringify(sessionData));
        });

        // Reload page
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(300);

        // Verify transient modal is NOT restored
        const programInfoModal = page.locator('#program-info-modal');
        await expect(programInfoModal).toHaveClass(/hidden/);

        // Verify non-transient modal IS restored
        const aboutModal = page.locator('#about-modal');
        await expect(aboutModal).not.toHaveClass(/hidden/, { timeout: 2000 });
    });

    test('should handle missing modal elements gracefully', async ({ page }) => {
        // Inject session data with non-existent modal
        await page.evaluate(() => {
            const sessionData = {
                version: '1.1',
                timestamp: Date.now(),
                sessions: {},
                modalState: {
                    'non-existent-modal': {
                        visible: true,
                        minimized: false,
                        zIndex: '1001',
                    },
                },
                tabState: {},
            };
            localStorage.setItem('window-session', JSON.stringify(sessionData));
        });

        // Monitor console for warnings
        const consoleWarnings = [];
        page.on('console', msg => {
            if (msg.type() === 'warning') {
                consoleWarnings.push(msg.text());
            }
        });

        // Reload page
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(300);

        // App should still be functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible({ timeout: 5000 });

        // Should have logged a warning about missing modal
        const expectedWarning = 'SessionManager: Modal "non-existent-modal" not found in DOM';
        const hasSpecificWarning = consoleWarnings.some(msg => msg === expectedWarning);
        expect(hasSpecificWarning).toBe(true);
    });

    test('should be idempotent - running restore twice yields same result', async ({ page }) => {
        // Skip if terminal manager not available
        const hasTerminal = await page.evaluate(() => {
            return !!window.TerminalInstanceManager;
        });

        if (!hasTerminal) {
            test.skip();
            return;
        }

        // Create a terminal window via the new multi-window API
        await page.evaluate(() => {
            if (window.TerminalWindow) window.TerminalWindow.create({ title: 'Test Terminal' });
            if (
                window.MultiWindowSessionManager &&
                typeof window.MultiWindowSessionManager.saveSession === 'function'
            ) {
                window.MultiWindowSessionManager.saveSession({ immediate: true });
            } else if (window.SessionManager) {
                window.SessionManager.saveAllSessions();
            }
        });
        await waitForSessionSaved(page);
        await page.waitForFunction(
            () => {
                return !!(
                    localStorage.getItem('windowInstancesSession') ||
                    localStorage.getItem('multi-window-session') ||
                    localStorage.getItem('window-session')
                );
            },
            { timeout: 2000 }
        );

        // Reload once
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(300);

        const countAfterFirstReload = await page.evaluate(() => {
            return window.WindowRegistry.getWindowsByType('terminal')?.length || 0;
        });

        // Reload again without changing anything
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(300);

        const countAfterSecondReload = await page.evaluate(() => {
            return window.WindowRegistry.getWindowsByType('terminal')?.length || 0;
        });

        // Should be the same count both times
        expect(countAfterSecondReload).toBe(countAfterFirstReload);
        expect(countAfterSecondReload).toBe(1);
    });

    test('should handle empty session gracefully', async ({ page }) => {
        // Ensure no session exists
        await page.evaluate(() => {
            localStorage.removeItem('window-session');
        });

        // Reload page
        await page.reload();
        await waitForAppReady(page);

        // App should still be functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible({ timeout: 5000 });

        // Should not have any errors
        const pageErrors = [];
        page.on('pageerror', error => {
            pageErrors.push(error.message);
        });

        await page.waitForTimeout(500);
        expect(pageErrors).toHaveLength(0);
    });

    test('should preserve z-index ordering of modals', async ({ page }) => {
        // Open multiple modals
        await page.evaluate(() => {
            // Open about modal
            const aboutDialog = window.dialogs?.['about-modal'];
            if (aboutDialog?.open) aboutDialog.open();
        });

        await page.waitForTimeout(200);

        await page.evaluate(() => {
            // Open settings modal (will be on top)
            const settingsDialog = window.dialogs?.['settings-modal'];
            if (settingsDialog?.open) settingsDialog.open();
        });

        await page.waitForTimeout(200);

        // Get z-index ordering before reload
        const zIndexesBefore = await page.evaluate(() => {
            const aboutModal = document.getElementById('about-modal');
            const settingsModal = document.getElementById('settings-modal');
            return {
                about: aboutModal?.style?.zIndex || '',
                settings: settingsModal?.style?.zIndex || '',
            };
        });

        // Save and reload (wait for persistence, prefer MultiWindowSessionManager)
        await page.evaluate(() => {
            if (
                window.MultiWindowSessionManager &&
                typeof window.MultiWindowSessionManager.saveSession === 'function'
            ) {
                window.MultiWindowSessionManager.saveSession({ immediate: true });
                return;
            }
            window.SessionManager?.saveAllSessions();
        });
        await waitForSessionSaved(page);
        await page.waitForFunction(
            () => {
                return !!(
                    localStorage.getItem('windowInstancesSession') ||
                    localStorage.getItem('multi-window-session') ||
                    localStorage.getItem('window-session')
                );
            },
            { timeout: 2000 }
        );

        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(300);

        // Get z-index ordering after reload
        const zIndexesAfter = await page.evaluate(() => {
            const aboutModal = document.getElementById('about-modal');
            const settingsModal = document.getElementById('settings-modal');
            return {
                about: aboutModal?.style?.zIndex || '',
                settings: settingsModal?.style?.zIndex || '',
            };
        });

        // Z-indexes should be preserved (or at least relative ordering)
        if (zIndexesBefore.about && zIndexesBefore.settings) {
            expect(zIndexesAfter.about).toBe(zIndexesBefore.about);
            expect(zIndexesAfter.settings).toBe(zIndexesBefore.settings);
        }
    });
});
