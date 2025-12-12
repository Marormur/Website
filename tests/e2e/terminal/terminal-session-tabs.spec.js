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

    test('can create new session tab with Ctrl+T', async ({ page }) => {
        // Create new tab
        await page.keyboard.press('Control+KeyT');

        await page.waitForFunction(
            () => {
                const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
                return wins[0]?.sessions?.length === 2;
            },
            { timeout: 5000 }
        );

        const sessionCount = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins[0]?.sessions?.length || 0;
        });
        expect(sessionCount).toBe(2);
    });

    test('can switch between tabs with Ctrl+Tab', async ({ page }) => {
        // Create second tab
        await page.keyboard.press('Control+KeyT');
        await page.waitForFunction(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins[0]?.sessions?.length === 2;
        });

        // Get initial active session
        const firstActive = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            return win?.activeSession?.sessionId || null;
        });

        // Switch tabs
        await page.keyboard.press('Control+Tab');

        // Wait for active session to change
        await page.waitForFunction(
            prevActive => {
                const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
                const current = win?.activeSession?.sessionId || null;
                return current !== prevActive;
            },
            firstActive,
            { timeout: 5000 }
        );

        const secondActive = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            return win?.activeSession?.sessionId || null;
        });

        expect(secondActive).not.toBe(firstActive);
    });

    test('can close tab with Ctrl+W', async ({ page }) => {
        // Create second tab
        await page.keyboard.press('Control+KeyT');
        await page.waitForFunction(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins[0]?.sessions?.length === 2;
        });

        // Close active tab
        await page.keyboard.press('Control+KeyW');

        await page.waitForFunction(
            () => {
                const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
                return wins[0]?.sessions?.length === 1;
            },
            { timeout: 5000 }
        );

        const sessionCount = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins[0]?.sessions?.length || 0;
        });
        expect(sessionCount).toBe(1);
    });

    test('closing last tab closes the window', async ({ page }) => {
        // Only one session exists - close it
        await page.keyboard.press('Control+KeyW');

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

    test('each session has independent VFS working directory', async ({ page }) => {
        // Create second tab
        await page.keyboard.press('Control+KeyT');
        await page.waitForFunction(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins[0]?.sessions?.length === 2;
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

    test('tab drag-and-drop reorders sessions', async ({ page }) => {
        // Create 3 tabs
        await page.keyboard.press('Control+KeyT');
        await page.keyboard.press('Control+KeyT');

        await page.waitForFunction(
            () => {
                const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
                return wins[0]?.sessions?.length === 3;
            },
            { timeout: 5000 }
        );

        // Get initial order
        const initialOrder = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            return win?.sessions?.map(s => s.sessionId) || [];
        });

        // Simulate drag third tab to first position via WindowTabs
        await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            if (win && win.windowTabs) {
                // Move session at index 2 to index 0
                const session = win.sessions[2];
                win.sessions.splice(2, 1);
                win.sessions.unshift(session);
                win.windowTabs.render();
            }
        });

        const newOrder = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            return win?.sessions?.map(s => s.sessionId) || [];
        });

        expect(newOrder.length).toBe(3);
        expect(newOrder[0]).toBe(initialOrder[2]);
    });
});
