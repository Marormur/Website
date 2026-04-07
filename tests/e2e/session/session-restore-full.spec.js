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
});
