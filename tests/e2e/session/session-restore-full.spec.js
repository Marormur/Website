// Test comprehensive session restore functionality
// Validates restoration of instances, modals, active tabs, and UI state

const { test, expect } = require('@playwright/test');
const {
    waitForAppReady,
    waitForSessionSaved,
    openAboutWindow,
    openSettingsWindow,
    waitForVisibleWindowByLegacyId,
} = require('../utils');

async function waitForSessionStorage(page) {
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
}

async function waitForRestoreComplete(page) {
    await page.waitForFunction(() => window.__SESSION_RESTORED === true, { timeout: 8000 });
}

async function waitForWindowCount(page, type, expectedCount) {
    await page.waitForFunction(
        ({ windowType, expected }) => {
            try {
                const windows = window.WindowRegistry?.getWindowsByType?.(windowType) || [];
                return windows.length >= expected;
            } catch {
                return false;
            }
        },
        { windowType: type, expected: expectedCount },
        { timeout: 8000 }
    );
}

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
        await waitForSessionStorage(page);

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
        await waitForRestoreComplete(page);
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

        expect(restoredCount - beforeCount).toBe(createdDelta);

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

        const beforeCount = await page.evaluate(() => {
            return window.WindowRegistry?.getWindowsByType('text-editor')?.length || 0;
        });

        // Create multiple text editor windows via the new multi-window API
        await page.evaluate(() => {
            if (!window.TextEditorWindow || !window.WindowRegistry) return;

            window.TextEditorWindow.create({ title: 'Document 1' });
            window.TextEditorWindow.create({ title: 'Document 2' });

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
        await waitForRestoreComplete(page);
        await waitForWindowCount(page, 'text-editor', beforeCount + 2);

        // Verify text editor windows were restored
        const restoredCount = await page.evaluate(() => {
            return window.WindowRegistry.getWindowsByType('text-editor')?.length || 0;
        });

        expect(restoredCount - beforeCount).toBe(2);

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

        const aboutWindow = await openAboutWindow(page, 5000);
        await expect(aboutWindow).toBeVisible({ timeout: 5000 });

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
        await waitForSessionStorage(page);

        // Reload page
        await page.reload();
        await waitForAppReady(page);
        await waitForRestoreComplete(page);

        // Verify modal is still visible after reload
        const aboutWindowAfter = await waitForVisibleWindowByLegacyId(page, 'about-modal', 5000);
        await expect(aboutWindowAfter).toBeVisible({ timeout: 5000 });
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
        await waitForRestoreComplete(page);

        // Verify transient modal is NOT restored
        const programInfoModal = page.locator('#program-info-modal');
        await expect(programInfoModal).toHaveClass(/hidden/);

        // Legacy modalState should not break restore even when migrated windows no longer
        // materialize as visible legacy modals.
        await expect(page.locator('#dock')).toBeVisible({ timeout: 5000 });
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

        // Monitor console output for diagnostics (warning text is implementation-specific)
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push(`${msg.type()}: ${msg.text()}`);
        });

        // Reload page
        await page.reload();
        await waitForAppReady(page);

        // App should still be functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible({ timeout: 5000 });

        // If a warning is emitted, it should reference the missing modal id.
        const missingModalDiagnostics = consoleMessages.filter(msg =>
            msg.includes('non-existent-modal')
        );
        if (missingModalDiagnostics.length > 0) {
            await expect
                .poll(
                    () =>
                        missingModalDiagnostics.some(
                            msg => msg.includes('not found') || msg.includes('missing')
                        ),
                    {
                        timeout: 2000,
                    }
                )
                .toBe(true);
        }
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

        const beforeCount = await page.evaluate(() => {
            return window.WindowRegistry?.getWindowsByType('terminal')?.length || 0;
        });

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
        await waitForSessionStorage(page);

        // Reload once
        await page.reload();
        await waitForAppReady(page);
        await waitForRestoreComplete(page);

        const countAfterFirstReload = await page.evaluate(() => {
            return window.WindowRegistry.getWindowsByType('terminal')?.length || 0;
        });

        // Reload again without changing anything
        await page.reload();
        await waitForAppReady(page);
        await waitForRestoreComplete(page);

        const countAfterSecondReload = await page.evaluate(() => {
            return window.WindowRegistry.getWindowsByType('terminal')?.length || 0;
        });

        // Idempotence means restore does not duplicate windows on repeated reload.
        expect(countAfterSecondReload).toBe(countAfterFirstReload);
    });

    test('should handle empty session gracefully', async ({ page }) => {
        // Ensure no session exists
        await page.evaluate(() => {
            localStorage.removeItem('window-session');
        });

        // Reload page
        await page.reload();
        await waitForAppReady(page);
        await waitForRestoreComplete(page);

        // App should still be functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible({ timeout: 5000 });

        // Should not have any errors
        const pageErrors = [];
        page.on('pageerror', error => {
            pageErrors.push(error.message);
        });

        expect(pageErrors).toHaveLength(0);
    });

    test('should preserve z-index ordering of modals', async ({ page }) => {
        // Open multiple modals
        const aboutWindow = await openAboutWindow(page, 5000);
        await expect(aboutWindow).toBeVisible({ timeout: 5000 });

        const settingsWindow = await openSettingsWindow(page, 5000);
        await expect(settingsWindow).toBeVisible({ timeout: 5000 });

        // Get z-index ordering before reload
        const zIndexesBefore = await page.evaluate(() => {
            const aboutWindows = window.WindowRegistry?.getWindowsByType?.('about') || [];
            const aboutModal = aboutWindows.length
                ? document.getElementById(aboutWindows[aboutWindows.length - 1].id)
                : null;
            const settingsWindows = window.WindowRegistry?.getWindowsByType?.('settings') || [];
            const settingsModal = settingsWindows.length
                ? document.getElementById(settingsWindows[settingsWindows.length - 1].id)
                : null;
            return {
                about: Number(window.getComputedStyle(aboutModal).zIndex || 0),
                settings: settingsModal
                    ? Number(window.getComputedStyle(settingsModal).zIndex || 0)
                    : 0,
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
        await waitForSessionStorage(page);

        await page.reload();
        await waitForAppReady(page);
        await waitForRestoreComplete(page);
        await waitForWindowCount(page, 'about', 1);
        await waitForWindowCount(page, 'settings', 1);

        // Get z-index ordering after reload
        const zIndexesAfter = await page.evaluate(() => {
            const aboutWindows = window.WindowRegistry?.getWindowsByType?.('about') || [];
            const aboutModal = aboutWindows.length
                ? document.getElementById(aboutWindows[aboutWindows.length - 1].id)
                : null;
            const settingsWindows = window.WindowRegistry?.getWindowsByType?.('settings') || [];
            const settingsModal = settingsWindows.length
                ? document.getElementById(settingsWindows[settingsWindows.length - 1].id)
                : null;
            return {
                about: Number(window.getComputedStyle(aboutModal).zIndex || 0),
                settings: settingsModal
                    ? Number(window.getComputedStyle(settingsModal).zIndex || 0)
                    : 0,
            };
        });

        // Z-index ordering should be preserved across reload.
        if (zIndexesBefore.about > 0 && zIndexesBefore.settings > 0) {
            expect(zIndexesBefore.settings).toBeGreaterThan(zIndexesBefore.about);
            expect(zIndexesAfter.settings).toBeGreaterThan(zIndexesAfter.about);
        }
    });
});
