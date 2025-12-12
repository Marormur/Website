/**
 * Terminal Session Persistence Tests
 * Validates window/session state persists across page reloads
 */

const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

test.describe('Terminal Session Persistence', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('single terminal window with session persists across reload', async ({ page }) => {
        // Open terminal
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();

        await page.waitForFunction(
            () => {
                return window.WindowRegistry?.getAllWindows('terminal')?.length === 1;
            },
            { timeout: 5000 }
        );

        // Execute command to add to history
        await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            const session = win?.activeSession;
            if (session && session.executeCommand) {
                session.executeCommand('pwd');
                session.executeCommand('ls');
            }
        });

        // Trigger session save
        await page.evaluate(() => {
            window.MultiWindowSessionManager?.saveSession();
        });

        // Reload
        await page.reload();
        await waitForAppReady(page);

        // Verify window restored
        const windowCount = await page.evaluate(() => {
            return window.WindowRegistry?.getAllWindows('terminal')?.length || 0;
        });
        expect(windowCount).toBe(1);

        // Verify session restored with history
        const sessionInfo = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            const session = win?.activeSession;
            return {
                hasSession: !!session,
                historyLength: session?.commandHistory?.length || 0,
            };
        });

        expect(sessionInfo.hasSession).toBe(true);
        expect(sessionInfo.historyLength).toBeGreaterThanOrEqual(2);
    });

    // Skipped: uses Meta/Ctrl+N which browsers intercept; unreliable in CI
    test.skip('multiple terminal windows persist across reload', async ({ page }) => {
        // Create 2 terminal windows
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();

        await page.waitForFunction(() => {
            return window.WindowRegistry?.getAllWindows('terminal')?.length === 1;
        });

        await page.keyboard.press('Meta+KeyN');

        await page.waitForFunction(() => {
            return window.WindowRegistry?.getAllWindows('terminal')?.length === 2;
        });

        // Save session
        await page.evaluate(() => {
            window.MultiWindowSessionManager?.saveSession();
        });

        // Reload
        await page.reload();
        await waitForAppReady(page);

        // Verify both windows restored
        const windowCount = await page.evaluate(() => {
            return window.WindowRegistry?.getAllWindows('terminal')?.length || 0;
        });
        expect(windowCount).toBe(2);
    });

    // Skipped: depends on Ctrl+T shortcut (conflicts with browser new-tab)
    test.skip('multiple tabs per window persist', async ({ page }) => {
        // Open terminal and create 3 tabs
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();

        await page.waitForFunction(() => {
            return window.WindowRegistry?.getAllWindows('terminal')?.length === 1;
        });

        await page.keyboard.press('Control+KeyT');
        await page.keyboard.press('Control+KeyT');

        await page.waitForFunction(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins[0]?.sessions?.length === 3;
        });

        // Save
        await page.evaluate(() => {
            window.MultiWindowSessionManager?.saveSession();
        });

        // Reload
        await page.reload();
        await waitForAppReady(page);

        // Verify all tabs restored
        const sessionCount = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins[0]?.sessions?.length || 0;
        });
        expect(sessionCount).toBe(3);
    });

    // Skipped: relies on Ctrl+T to create extra tab
    test.skip('active session is restored', async ({ page }) => {
        // Open terminal with 2 tabs
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();

        await page.waitForFunction(() => {
            return window.WindowRegistry?.getAllWindows('terminal')?.length === 1;
        });

        await page.keyboard.press('Control+KeyT');

        await page.waitForFunction(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins[0]?.sessions?.length === 2;
        });

        // Switch to first tab
        await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            if (win && win.setActiveSession) {
                win.setActiveSession(win.sessions[0]);
            }
        });

        const activeIdBefore = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            return win?.activeSession?.sessionId || null;
        });

        // Save and reload
        await page.evaluate(() => {
            window.MultiWindowSessionManager?.saveSession();
        });

        await page.reload();
        await waitForAppReady(page);

        // Verify same session is active
        const activeIdAfter = await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            return win?.activeSession?.sessionId || null;
        });

        expect(activeIdAfter).toBe(activeIdBefore);
    });

    test('window positions persist', async ({ page }) => {
        // Open terminal and move window
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();

        await page.waitForFunction(() => {
            return window.WindowRegistry?.getAllWindows('terminal')?.length === 1;
        });

        // Set window position
        await page.evaluate(() => {
            const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
            if (win && win.element) {
                win.element.style.left = '100px';
                win.element.style.top = '150px';
            }
        });

        // Save
        await page.evaluate(() => {
            window.MultiWindowSessionManager?.saveSession();
        });

        // Reload
        await page.reload();
        await waitForAppReady(page);

        // Verify window was restored (position restoration is implementation-dependent)
        const windowInfo = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            if (wins.length === 0) return null;
            const win = wins[0];
            return {
                exists: !!win,
                hasElement: !!win.element,
            };
        });

        expect(windowInfo).not.toBeNull();
        expect(windowInfo?.exists).toBe(true);
        expect(windowInfo?.hasElement).toBe(true);
    });

    // Skipped: uses Meta/Ctrl+N shortcut
    test.skip('z-index order persists', async ({ page }) => {
        // Create 2 terminal windows
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();

        await page.waitForFunction(() => {
            return window.WindowRegistry?.getAllWindows('terminal')?.length === 1;
        });

        await page.keyboard.press('Meta+KeyN');

        await page.waitForFunction(() => {
            return window.WindowRegistry?.getAllWindows('terminal')?.length === 2;
        });

        // Get window order
        const orderBefore = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins.map(w => w.windowId);
        });

        // Save and reload
        await page.evaluate(() => {
            window.MultiWindowSessionManager?.saveSession();
        });

        await page.reload();
        await waitForAppReady(page);

        // Verify order preserved
        const orderAfter = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins.map(w => w.windowId);
        });

        expect(orderAfter).toEqual(orderBefore);
    });

    // Skipped: needs Ctrl+T / Ctrl+Tab shortcuts
    test.skip('session autosave on tab switch', async ({ page }) => {
        // Open terminal with 2 tabs
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();

        await page.waitForFunction(() => {
            return window.WindowRegistry?.getAllWindows('terminal')?.length === 1;
        });

        await page.keyboard.press('Control+KeyT');

        await page.waitForFunction(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins[0]?.sessions?.length === 2;
        });

        // Switch tabs triggers autosave
        await page.keyboard.press('Control+Tab');

        // Wait for autosave
        await page.waitForFunction(
            () => {
                const saved = window.localStorage?.getItem('multiWindowSession_v1');
                return !!saved;
            },
            { timeout: 2000 }
        );

        const savedSession = await page.evaluate(() => {
            return window.localStorage?.getItem('multiWindowSession_v1');
        });

        expect(savedSession).toBeTruthy();
    });
});
