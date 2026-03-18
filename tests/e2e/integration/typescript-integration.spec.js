/**
 * TypeScript Integration Tests
 *
 * Verifies all migrated TypeScript modules are available and functional
 * in the browser after build. Tests the TypeScript → JavaScript build
 * pipeline and ensures no CommonJS export issues.
 */

import { test, expect } from '@playwright/test';
import utils from '../utils.js';

test.describe('TypeScript Integration', () => {
    test.beforeEach(async ({ page }) => {
        // Listen for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Browser console error:', msg.text());
            }
        });

        await page.goto('/');
        await utils.waitForAppReady(page);
    });

    test('TerminalWindow can create windows', async ({ page }) => {
        const canCreate = await page.evaluate(() => {
            try {
                // Check if TerminalWindow exists
                if (!window.TerminalWindow) return false;

                // Create window
                const termWin = window.TerminalWindow.create({
                    title: 'Test Terminal',
                });

                if (!termWin) return false;

                // Verify window has expected properties
                // New architecture uses .id (not .windowId), .tabs (not .sessions)
                const hasId = typeof termWin.id === 'string';
                const hasTabs = termWin.tabs instanceof Map;
                const hasClose = typeof termWin.close === 'function';

                // Clean up
                termWin.close();

                return hasId && hasTabs && hasClose;
            } catch (err) {
                console.error('Window creation failed:', err);
                return false;
            }
        });

        expect(canCreate).toBe(true);
    });

    test('WindowChrome can create UI components', async ({ page }) => {
        const chromeWorks = await page.evaluate(() => {
            try {
                // Create titlebar
                const titlebar = window.WindowChrome.createTitlebar({
                    title: 'Test Window',
                    showClose: true,
                });

                if (!titlebar || !titlebar.nodeType) return false;

                // Create toolbar
                const toolbar = window.WindowChrome.createToolbar([
                    { label: 'Test', onClick: () => {} },
                ]);

                if (!toolbar || !toolbar.nodeType) return false;

                // Create status bar
                const statusBar = window.WindowChrome.createStatusBar({
                    leftContent: 'Left',
                    rightContent: 'Right',
                });

                if (!statusBar || !statusBar.nodeType) return false;

                return true;
            } catch (err) {
                console.error('WindowChrome failed:', err);
                return false;
            }
        });

        expect(chromeWorks).toBe(true);
    });

    test('no CommonJS export errors in console', async ({ page }) => {
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                const text = msg.text();
                if (text.includes('exports') || text.includes('__esModule')) {
                    errors.push(text);
                }
            }
        });

        // Reload to catch any initialization errors
        await page.reload();
        await utils.waitForAppReady(page);

        // Wait for a known module to be available (indicates modules initialized)
        await page.waitForFunction(
            () => {
                try {
                    return (
                        window.WindowChrome &&
                        typeof window.WindowChrome.createTitlebar === 'function'
                    );
                } catch {
                    return false;
                }
            },
            { timeout: 5000 }
        );

        expect(errors.length, `No CommonJS export errors: ${errors.join(', ')}`).toBe(0);
    });

    test('TypeScript modules integrate with legacy code', async ({ page }) => {
        // Open terminal via Dock
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();

        // Wait for terminal window to be created
        await page.waitForFunction(
            () => {
                return window.WindowRegistry?.getWindowsByType('terminal')?.length === 1;
            },
            { timeout: 5000 }
        );

        // Check that terminal window was created (uses TerminalWindow from TS)
        const hasTerminal = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getWindowsByType('terminal') || [];
            return wins.length > 0 && wins[0].tabs?.size > 0;
        });

        expect(hasTerminal).toBe(true);

        // Clean up
        await page.evaluate(() => {
            const wins = window.WindowRegistry?.getWindowsByType('terminal') || [];
            wins.forEach(w => w.close?.());
        });
    });
});
