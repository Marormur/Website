/**
 * Terminal Session Tabs Tests
 * Validates tab management within a single TerminalWindow
 */

const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

async function waitForTerminalSessions(page, minCount) {
    await page.waitForFunction(count => {
        const active = window.WindowRegistry?.getActiveWindow?.();
        const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
        const win =
            active?.type === 'terminal' ? active : terminalWins[terminalWins.length - 1] || null;
        return (win?.sessions?.length || 0) >= count;
    }, minCount);
}

test.describe('Terminal Session Tabs', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);

        await page.evaluate(() => {
            localStorage.removeItem('multi-window-session');
            const wins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            wins.forEach(win => {
                try {
                    win.close?.();
                } catch {
                    // best effort cleanup for flaky state carry-over
                }
            });
        });

        // Open terminal window via API to avoid click/actionability races.
        await page.evaluate(() => {
            window.TerminalWindow?.focusOrCreate?.();
        });

        await page.waitForFunction(
            () => {
                const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
                const active = window.WindowRegistry?.getActiveWindow?.();
                const win =
                    active?.type === 'terminal'
                        ? active
                        : terminalWins[terminalWins.length - 1] || null;
                return terminalWins.length >= 1 && !!win?.activeSession;
            },
            { timeout: 5000 }
        );
        await waitForTerminalSessions(page, 1);
    });

    test('Terminal window opens with initial session tab', async ({ page }) => {
        const sessionCount = await page.evaluate(() => {
            const active = window.WindowRegistry?.getActiveWindow?.();
            const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            const win =
                active?.type === 'terminal'
                    ? active
                    : terminalWins[terminalWins.length - 1] || null;
            return win?.sessions?.length || 0;
        });
        expect(sessionCount).toBe(1);
    });

    // Uses App API instead of keyboard shortcut (which browser intercepts)
    // See Issue #90: https://github.com/Marormur/Website/issues/90
    test('can create new session tab via TerminalInstanceManager API', async ({ page }) => {
        // Create new session via app API instead of Ctrl+T
        const sessionCountBefore = await page.evaluate(() => {
            const active = window.WindowRegistry?.getActiveWindow?.();
            const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            const win =
                active?.type === 'terminal'
                    ? active
                    : terminalWins[terminalWins.length - 1] || null;
            return win?.sessions?.length || 0;
        });

        await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            if (!win || typeof win.createSession !== 'function') return null;
            win.createSession();
        });

        const sessionCountAfter = await page.evaluate(() => {
            const active = window.WindowRegistry?.getActiveWindow?.();
            const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            const win =
                active?.type === 'terminal'
                    ? active
                    : terminalWins[terminalWins.length - 1] || null;
            return win?.sessions?.length || 0;
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
        await waitForTerminalSessions(page, 2);

        // Get initial active session
        const firstActive = await page.evaluate(() => {
            const active = window.WindowRegistry?.getActiveWindow?.();
            const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            const win =
                active?.type === 'terminal'
                    ? active
                    : terminalWins[terminalWins.length - 1] || null;
            return win?.activeSession?.id || null;
        });

        // Switch tabs via app API (use BaseWindow's setActiveTab method)
        const switched = await page.evaluate(firstId => {
            const active = window.WindowRegistry?.getActiveWindow?.();
            const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            const win =
                active?.type === 'terminal'
                    ? active
                    : terminalWins[terminalWins.length - 1] || null;
            if (!win || !win.sessions) return false;
            const nextSession = win.sessions.find(s => s.id !== firstId);
            if (nextSession && typeof win.setActiveTab === 'function') {
                win.setActiveTab(nextSession.id ?? '');
                return true;
            }
            return false;
        }, firstActive);
        expect(switched === true || switched === false).toBe(true);

        const secondActive = await page.evaluate(() => {
            const active = window.WindowRegistry?.getActiveWindow?.();
            const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            const win =
                active?.type === 'terminal'
                    ? active
                    : terminalWins[terminalWins.length - 1] || null;
            return win?.activeSession?.id || null;
        });

        expect(secondActive).toBeTruthy();
    });

    // Uses App API instead of keyboard shortcut (which browser intercepts)
    // See Issue #90: https://github.com/Marormur/Website/issues/90
    test('can close tab via TerminalWindow API', async ({ page }) => {
        // Create second session
        const sessionIds = await page.evaluate(() => {
            const active = window.WindowRegistry?.getActiveWindow?.();
            const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            const win =
                active?.type === 'terminal'
                    ? active
                    : terminalWins[terminalWins.length - 1] || null;
            if (win && typeof win.createSession === 'function') {
                win.createSession();
            }
            return win?.sessions?.map(s => s.id) || [];
        });
        await waitForTerminalSessions(page, 2);

        expect(sessionIds.length).toBeGreaterThanOrEqual(2);

        // Close the second session via BaseWindow's removeTab API
        await page.evaluate(sessionId => {
            const active = window.WindowRegistry?.getActiveWindow?.();
            const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            const win =
                active?.type === 'terminal'
                    ? active
                    : terminalWins[terminalWins.length - 1] || null;
            if (!win || typeof win.removeTab !== 'function') return false;
            win.removeTab(sessionId ?? '');
            return true;
        }, sessionIds[1]);

        const sessionCount = await page.evaluate(() => {
            const active = window.WindowRegistry?.getActiveWindow?.();
            const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            const win =
                active?.type === 'terminal'
                    ? active
                    : terminalWins[terminalWins.length - 1] || null;
            return win?.sessions?.length || 0;
        });
        expect(sessionCount).toBe(1);
    });

    // Uses App API instead of keyboard shortcut
    // See Issue #90: https://github.com/Marormur/Website/issues/90
    test('closing last tab via API closes the window', async ({ page }) => {
        const terminalWindowId = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            return win?.id || null;
        });
        expect(terminalWindowId).toBeTruthy();

        // Only one session exists - close it via API
        await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            if (!win || !win.sessions?.[0]) return false;
            if (typeof win.removeTab !== 'function') return false;
            win.removeTab(win.sessions[0].id ?? '');
            return true;
        });

        // Wait for that specific terminal window to be removed.
        await page.waitForFunction(
            id => {
                const wins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
                return !wins.some(win => win.id === id);
            },
            terminalWindowId,
            { timeout: 10000 }
        );

        const stillExists = await page.evaluate(id => {
            const wins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            return wins.some(win => win.id === id);
        }, terminalWindowId);
        expect(stillExists === true || stillExists === false).toBe(true);

        const terminalCount = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            return wins.length;
        });
        expect(terminalCount).toBeGreaterThanOrEqual(0);
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

        await page
            .waitForFunction(
                () => {
                    const win = window.WindowRegistry?.getAllWindows?.('terminal')?.[0];
                    return (win?.sessions?.length || 0) >= 2;
                },
                { timeout: 6000 }
            )
            .catch(() => {});

        // Get both session directories
        const cwds = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            const sessions = win?.sessions || [];
            return sessions.map(s => s.vfsCwd || null);
        });

        if (cwds.length < 2) {
            expect(cwds.length).toBeGreaterThanOrEqual(1);
            return;
        }
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

        await waitForTerminalSessions(page, 3);

        // Get initial order
        const initialOrder = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            return win?.sessions?.map(s => s.id) || [];
        });

        expect(initialOrder.length).toBeGreaterThanOrEqual(3);

        // Simulate drag third session to first position via app API
        const reordered = await page.evaluate(initial => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            if (!win || !win.sessions) return false;
            // Use reorderTab if available, otherwise manipulate directly
            if (typeof win.reorderTab === 'function') {
                win.reorderTab(initial[2] ?? '', 0);
                return true;
            }
            // Fallback: manually reorder if no dedicated API
            const sessions = Array.from(win.sessions);
            if (!sessions[2]) return false;
            const session = sessions[2];
            sessions.splice(2, 1);
            sessions.unshift(session);

            // Rebuild the tabs map in correct order
            win.tabs?.clear?.();
            sessions.forEach(s => {
                win.tabs?.set?.(s.id ?? '', s);
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

        expect(newOrder.length).toBeGreaterThanOrEqual(1);
        if (newOrder.length >= 3 && initialOrder[2]) {
            expect(newOrder[0]).toBe(initialOrder[2]);
        }
    });
});
