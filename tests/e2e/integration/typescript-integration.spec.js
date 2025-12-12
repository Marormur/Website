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

    test('all TypeScript-migrated modules are available', async ({ page }) => {
        const modulesAvailable = await page.evaluate(() => {
            return {
                // Phase 2: New Features
                WindowTabs: typeof window.WindowTabs,
                KeyboardShortcuts: typeof window.KeyboardShortcuts,

                // Phase 3: Core Modules
                BaseWindowInstance: typeof window.BaseWindowInstance,
                InstanceManager: typeof window.InstanceManager,
                WindowManager: typeof window.WindowManager,
                ActionBus: typeof window.ActionBus,
                WindowChrome: typeof window.WindowChrome,
                API: typeof window.API,

                // Phase 3: System Modules
                ThemeSystem: window.API && typeof window.API.theme,
                StorageSystem: window.API && typeof window.API.storage,

                // Phase 3: Instance Types
                TerminalWindow: typeof window.TerminalWindow,
                TerminalSession: typeof window.TerminalSession,
                TextEditorInstance: typeof window.TextEditorInstance,

                // Phase 4: Legacy Refactoring (exported modules)
                GitHubAPI: typeof window.GitHubAPI,
                ImageViewerUtils: typeof window.ImageViewerUtils,
            };
        });

        console.log('TypeScript modules:', modulesAvailable);

        // Phase 2 assertions
        expect(modulesAvailable.WindowTabs, 'WindowTabs').toBe('object'); // API object
        expect(modulesAvailable.KeyboardShortcuts, 'KeyboardShortcuts').toBe('object');

        // Phase 3 Core assertions
        expect(modulesAvailable.BaseWindowInstance, 'BaseWindowInstance').toBe('function');
        expect(modulesAvailable.InstanceManager, 'InstanceManager').toBe('function');
        expect(modulesAvailable.WindowManager, 'WindowManager').toBe('object');
        expect(modulesAvailable.ActionBus, 'ActionBus').toBe('object');
        expect(modulesAvailable.WindowChrome, 'WindowChrome').toBe('object');
        expect(modulesAvailable.API, 'API').toBe('object');

        // Phase 3 System assertions
        expect(modulesAvailable.ThemeSystem, 'API.theme').toBe('object');
        expect(modulesAvailable.StorageSystem, 'API.storage').toBe('object');

        // Phase 3 Instance assertions
        expect(modulesAvailable.TerminalWindow, 'TerminalWindow').toBe('function');
        expect(modulesAvailable.TerminalSession, 'TerminalSession').toBe('function');
        expect(modulesAvailable.TextEditorInstance, 'TextEditorInstance').toBe('function');

        // Phase 4 assertions (exported modules only)
        expect(modulesAvailable.GitHubAPI, 'GitHubAPI').toBe('object');
        expect(modulesAvailable.ImageViewerUtils, 'ImageViewerUtils').toBe('object');
    });

    test('WindowManager has correct API surface', async ({ page }) => {
        const wmAPI = await page.evaluate(() => {
            return {
                hasRegister: typeof window.WindowManager.register,
                hasRegisterAll: typeof window.WindowManager.registerAll,
                hasGetConfig: typeof window.WindowManager.getConfig,
                hasOpen: typeof window.WindowManager.open,
                hasClose: typeof window.WindowManager.close,
                hasBringToFront: typeof window.WindowManager.bringToFront,
                hasGetProgramInfo: typeof window.WindowManager.getProgramInfo,
            };
        });

        expect(wmAPI.hasRegister).toBe('function');
        expect(wmAPI.hasRegisterAll).toBe('function');
        expect(wmAPI.hasGetConfig).toBe('function');
        expect(wmAPI.hasOpen).toBe('function');
        expect(wmAPI.hasClose).toBe('function');
        expect(wmAPI.hasBringToFront).toBe('function');
        expect(wmAPI.hasGetProgramInfo).toBe('function');
    });

    test('ActionBus has correct API surface', async ({ page }) => {
        const abAPI = await page.evaluate(() => {
            return {
                hasRegister: typeof window.ActionBus.register,
                hasInit: typeof window.ActionBus.init,
                hasExecute: typeof window.ActionBus.execute,
            };
        });

        expect(abAPI.hasRegister).toBe('function');
        expect(abAPI.hasInit).toBe('function');
        expect(abAPI.hasExecute).toBe('function');
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
                const hasWindowId = typeof termWin.windowId === 'string';
                const hasSessions = Array.isArray(termWin.sessions);
                const hasClose = typeof termWin.close === 'function';

                // Clean up
                termWin.close();

                return hasWindowId && hasSessions && hasClose;
            } catch (err) {
                console.error('Window creation failed:', err);
                return false;
            }
        });

        expect(canCreate).toBe(true);
    });

    test('API namespace provides unified access', async ({ page }) => {
        const apiAccess = await page.evaluate(() => {
            return {
                hasTheme: window.API && typeof window.API.theme === 'object',
                hasStorage: window.API && typeof window.API.storage === 'object',
                hasWindow: window.API && typeof window.API.window === 'object',

                // Check specific methods
                hasSetTheme:
                    window.API && typeof window.API.theme.setThemePreference === 'function',
                hasSavePositions:
                    window.API && typeof window.API.storage.saveWindowPositions === 'function',
                hasOpenWindow: window.API && typeof window.API.window.open === 'function',
            };
        });

        expect(apiAccess.hasTheme).toBe(true);
        expect(apiAccess.hasStorage).toBe(true);
        expect(apiAccess.hasWindow).toBe(true);
        expect(apiAccess.hasSetTheme).toBe(true);
        expect(apiAccess.hasSavePositions).toBe(true);
        expect(apiAccess.hasOpenWindow).toBe(true);
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
                return window.WindowRegistry?.getAllWindows('terminal')?.length === 1;
            },
            { timeout: 5000 }
        );

        // Check that terminal window was created (uses TerminalWindow from TS)
        const hasTerminal = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            return wins.length > 0 && wins[0].sessions?.length > 0;
        });

        expect(hasTerminal).toBe(true);

        // Clean up
        await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            wins.forEach(w => w.close?.());
        });
    });
});
