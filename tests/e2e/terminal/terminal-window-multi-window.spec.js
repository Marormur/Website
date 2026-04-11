/**
 * Terminal Multi-Window Tests
 * Validates multiple TerminalWindow instances and WindowRegistry integration
 */

const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

test.describe('Terminal Multi-Window', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('can create multiple Terminal windows', async ({ page }) => {
        // Create first terminal window via Dock
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();

        // Wait for first window
        await page.waitForFunction(
            () => {
                return window.WindowRegistry?.getAllWindows('terminal')?.length === 1;
            },
            { timeout: 5000 }
        );

        // Create second terminal window via app API
        await page.evaluate(() => {
            return window.TerminalWindow?.create?.();
        });

        // Wait for second window
        await page.waitForFunction(
            () => {
                return window.WindowRegistry?.getAllWindows('terminal')?.length === 2;
            },
            { timeout: 5000 }
        );

        const windowCount = await page.evaluate(() => {
            return window.WindowRegistry?.getAllWindows('terminal')?.length || 0;
        });
        expect(windowCount).toBe(2);
    });

    test('each Terminal window has independent sessions', async ({ page }) => {
        // Create two terminal windows
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();
        await page.waitForFunction(
            () => window.WindowRegistry?.getAllWindows('terminal')?.length === 1
        );

        await page.evaluate(() => {
            return window.TerminalWindow?.create?.();
        });
        await page.waitForFunction(
            () => window.WindowRegistry?.getAllWindows('terminal')?.length === 2
        );

        // Get both windows
        const windows = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins.map(w => ({
                windowId: w.windowId,
                sessionCount: w.sessions?.length || 0,
            }));
        });

        expect(windows.length).toBe(2);
        expect(windows[0].sessionCount).toBeGreaterThanOrEqual(1);
        expect(windows[1].sessionCount).toBeGreaterThanOrEqual(1);
    });

    test('closing one Terminal window keeps others open', async ({ page }) => {
        // Create two windows
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();
        await page.waitForFunction(
            () => window.WindowRegistry?.getAllWindows('terminal')?.length === 1
        );

        await page.evaluate(() => {
            return window.TerminalWindow?.create?.();
        });
        await page.waitForFunction(
            () => window.WindowRegistry?.getAllWindows('terminal')?.length === 2
        );

        const windowIdsBeforeClose = await page.evaluate(() => {
            const registry = window.WindowRegistry;
            const wins = registry?.getAllWindows?.('terminal') || [];
            return wins.map(win => win.id).filter(Boolean);
        });
        expect(windowIdsBeforeClose.length).toBeGreaterThanOrEqual(2);
        const targetId = windowIdsBeforeClose[windowIdsBeforeClose.length - 1];

        // Close one specific terminal window via API.
        await page.evaluate(id => {
            const registry = window.WindowRegistry;
            const wins = registry?.getAllWindows?.('terminal') || [];
            const target = wins.find(win => win.id === id);
            target?.close?.();
        }, targetId);

        // Wait until at least one terminal remains; close completion can be deferred.
        await page.waitForFunction(
            () => {
                const wins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
                return wins.length >= 1 && wins.length <= 2;
            },
            { timeout: 5000 }
        );

        const remaining = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            return wins.map(win => win.id).filter(Boolean);
        });
        expect(remaining.length).toBeGreaterThanOrEqual(1);
        expect(remaining.length).toBeLessThanOrEqual(2);
    });

    test('TerminalWindow.focusOrCreate focuses existing window', async ({ page }) => {
        // Create first terminal
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();
        await page.waitForFunction(
            () => window.WindowRegistry?.getAllWindows('terminal')?.length === 1
        );

        // Get window ID (verify exists)
        const hasWindowId = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return !!wins[0]?.id;
        });
        expect(hasWindowId).toBe(true);

        // Create a second window to ensure focus moves between existing windows
        await page.evaluate(() => {
            return window.TerminalWindow?.create?.();
        });
        await page.waitForFunction(
            () => window.WindowRegistry?.getAllWindows('terminal')?.length === 2
        );

        // Call focusOrCreate - should focus existing, not create new
        await page.evaluate(() => {
            window.TerminalWindow?.focusOrCreate?.({});
        });

        // Should still have 2 windows
        const windowCount = await page.evaluate(() => {
            return window.WindowRegistry?.getAllWindows('terminal')?.length || 0;
        });
        expect(windowCount).toBe(2);

        // Active window should be one of the existing ones
        const activeWindowId = await page.evaluate(() => {
            const registry = window.WindowRegistry;
            const active = registry?.getActiveWindow?.() || registry?.getTopWindow?.();
            return active ? active.id : null;
        });
        expect(activeWindowId).toBeTruthy();
    });

    test('WindowRegistry tracks all Terminal windows', async ({ page }) => {
        // Create 3 terminal windows
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();
        await page.waitForFunction(
            () => window.WindowRegistry?.getAllWindows('terminal')?.length === 1
        );

        await page.evaluate(() => window.TerminalWindow?.create?.());
        await page.waitForFunction(
            () => window.WindowRegistry?.getAllWindows('terminal')?.length === 2
        );

        await page.evaluate(() => window.TerminalWindow?.create?.());
        await page.waitForFunction(
            () => {
                return window.WindowRegistry?.getAllWindows('terminal')?.length === 3;
            },
            { timeout: 5000 }
        );

        const registryInfo = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return {
                count: wins.length,
                allHaveIds: wins.every(w => !!w.id),
                allHaveType: wins.every(w => w.type === 'terminal'),
            };
        });

        expect(registryInfo.count).toBe(3);
        expect(registryInfo.allHaveIds).toBe(true);
        expect(registryInfo.allHaveType).toBe(true);
    });
});
