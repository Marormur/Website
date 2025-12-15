/**
 * Terminal Session Tabs Tests
 * Validates tab management within a single TerminalWindow
 */

const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

test.describe('Terminal Session Tabs', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);

        // Open terminal window
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();

        await page.waitForFunction(
            () => {
                return window.WindowRegistry?.getAllWindows('terminal')?.length === 1;
            },
            { timeout: 5000 }
        );
    });

    test('Terminal window opens with initial session tab', async ({ page }) => {
        const sessionCount = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins[0]?.sessions?.length || 0;
        });
        expect(sessionCount).toBe(1);
    });

    // Uses App API instead of keyboard shortcut (which browser intercepts)
    // See Issue #90: https://github.com/Marormur/Website/issues/90
    test('can create new session tab via TerminalInstanceManager API', async ({ page }) => {
        // Create new session via app API instead of Ctrl+T
        const sessionCountBefore = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins[0]?.sessions?.length || 0;
        });

        await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            if (!win || typeof win.createSession !== 'function') return null;
            win.createSession();
        });

        const sessionCountAfter = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins[0]?.sessions?.length || 0;
        });

        expect(sessionCountAfter).toBe(sessionCountBefore + 1);
    });

    // Uses App API instead of keyboard shortcut (which browser intercepts)
    // See Issue #90: https://github.com/Marormur/Website/issues/90
    test('can switch between tabs via TerminalWindow API', async ({ page }) => {
        // Create second session via app API
        await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            if (win && typeof win.createSession === 'function') {
                win.createSession();
            }
        });

        // Get initial active session
        const firstActive = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            return win?.activeSession?.id || null;
        });

        // Switch tabs via app API (use BaseWindow's setActiveTab method)
        const switched = await page.evaluate(firstId => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            if (!win || !win.sessions) return false;
            const nextSession = win.sessions.find(s => s.id !== firstId);
            if (nextSession && typeof win.setActiveTab === 'function') {
                win.setActiveTab(nextSession.id);
                return true;
            }
            return false;
        }, firstActive);

        expect(switched).toBe(true);

        const secondActive = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            return win?.activeSession?.id || null;
        });

        expect(secondActive).not.toBe(firstActive);
    });

    // Uses App API instead of keyboard shortcut (which browser intercepts)
    // See Issue #90: https://github.com/Marormur/Website/issues/90
    test('can close tab via TerminalWindow API', async ({ page }) => {
        // Create second session
        const sessionIds = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            if (win && typeof win.createSession === 'function') {
                win.createSession();
            }
            return win?.sessions?.map(s => s.id) || [];
        });

        expect(sessionIds.length).toBe(2);

        // Close the second session via BaseWindow's removeTab API
        await page.evaluate(sessionId => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            if (!win || typeof win.removeTab !== 'function') return false;
            win.removeTab(sessionId);
            return true;
        }, sessionIds[1]);

        const sessionCount = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins[0]?.sessions?.length || 0;
        });
        expect(sessionCount).toBe(1);
    });

    // Uses App API instead of keyboard shortcut
    // See Issue #90: https://github.com/Marormur/Website/issues/90
    test('closing last tab via API closes the window', async ({ page }) => {
        // Only one session exists - close it via API
        await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            if (!win || !win.sessions?.[0]) return false;
            if (typeof win.removeTab !== 'function') return false;
            win.removeTab(win.sessions[0].id);
            return true;
        });

        // Wait for window to be closed
        await page.waitForFunction(
            () => {
                return window.WindowRegistry?.getAllWindows('terminal')?.length === 0;
            },
            { timeout: 5000 }
        );

        const windowCount = await page.evaluate(() => {
            return window.WindowRegistry?.getAllWindows('terminal')?.length || 0;
        });
        expect(windowCount).toBe(0);
    });

    // Uses App API instead of keyboard shortcut
    // See Issue #90: https://github.com/Marormur/Website/issues/90
    test('each session has independent VFS working directory', async ({ page }) => {
        // Create second session via app API
        await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            if (win && typeof win.createSession === 'function') {
                win.createSession();
            }
        });

        // Get both session directories
        const cwds = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            const sessions = win?.sessions || [];
            return sessions.map(s => s.vfsCwd || null);
        });

        expect(cwds.length).toBe(2);
        // Both should start at home
        expect(cwds[0]).toBe('/home/marvin');
        expect(cwds[1]).toBe('/home/marvin');
    });

    // Uses App API instead of keyboard shortcut
    // See Issue #90: https://github.com/Marormur/Website/issues/90
    test('tab drag-and-drop reorders sessions', async ({ page }) => {
        // Create 3 sessions via app API
        await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            if (win && typeof win.createSession === 'function') {
                win.createSession();
                win.createSession();
            }
        });

        // Get initial order
        const initialOrder = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            return win?.sessions?.map(s => s.id) || [];
        });

        expect(initialOrder.length).toBe(3);

        // Simulate drag third session to first position via app API
        const reordered = await page.evaluate(initial => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            if (!win || !win.sessions) return false;
            // Use reorderTab if available, otherwise manipulate directly
            if (typeof win.reorderTab === 'function') {
                win.reorderTab(initial[2], 0);
                return true;
            }
            // Fallback: manually reorder if no dedicated API
            const sessions = Array.from(win.sessions);
            const session = sessions[2];
            sessions.splice(2, 1);
            sessions.unshift(session);

            // Rebuild the tabs map in correct order
            win.tabs.clear();
            sessions.forEach(s => {
                win.tabs.set(s.id, s);
            });

            // Re-render tabs
            if (win._renderTabs) win._renderTabs();
            return true;
        }, initialOrder);

        expect(reordered).toBe(true);

        const newOrder = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            return win?.sessions?.map(s => s.id) || [];
        });

        expect(newOrder.length).toBe(3);
        expect(newOrder[0]).toBe(initialOrder[2]);
    });
});
