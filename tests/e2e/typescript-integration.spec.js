/**
 * TypeScript Integration Tests
 * 
 * Verifies all migrated TypeScript modules are available and functional
 * in the browser after build. Tests the TypeScript → JavaScript build
 * pipeline and ensures no CommonJS export issues.
 */

import { test, expect } from '@playwright/test';
import utils from './utils.js';

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
                WindowTabManager: typeof window.WindowTabManager,
                KeyboardShortcutManager: typeof window.KeyboardShortcutManager,

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
                TerminalInstance: typeof window.TerminalInstance,
                TextEditorInstance: typeof window.TextEditorInstance,

                // Phase 4: Legacy Refactoring
                GithubAPI: window.GithubAPI !== undefined,
                MenubarUtils: window.MenubarUtils !== undefined,
                ProgramMenuSync: window.ProgramMenuSync !== undefined,
                ProgramActions: window.ProgramActions !== undefined,
                ImageViewerUtils: window.ImageViewerUtils !== undefined,
                SnapUtils: window.SnapUtils !== undefined,
                DialogUtils: window.DialogUtils !== undefined,
                AppInit: window.AppInit !== undefined,
            };
        });

        console.log('TypeScript modules:', modulesAvailable);

        // Phase 2 assertions
        expect(modulesAvailable.WindowTabManager, 'WindowTabManager').toBe('function'); // Constructor
        expect(modulesAvailable.KeyboardShortcutManager, 'KeyboardShortcutManager').toBe('object');

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
        expect(modulesAvailable.TerminalInstance, 'TerminalInstance').toBe('function');
        expect(modulesAvailable.TextEditorInstance, 'TextEditorInstance').toBe('function');

        // Phase 4 assertions
        expect(modulesAvailable.GithubAPI, 'GithubAPI').toBe(true);
        expect(modulesAvailable.MenubarUtils, 'MenubarUtils').toBe(true);
        expect(modulesAvailable.ProgramMenuSync, 'ProgramMenuSync').toBe(true);
        expect(modulesAvailable.ProgramActions, 'ProgramActions').toBe(true);
        expect(modulesAvailable.ImageViewerUtils, 'ImageViewerUtils').toBe(true);
        expect(modulesAvailable.SnapUtils, 'SnapUtils').toBe(true);
        expect(modulesAvailable.DialogUtils, 'DialogUtils').toBe(true);
        expect(modulesAvailable.AppInit, 'AppInit').toBe(true);
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

    test('InstanceManager can create instances', async ({ page }) => {
        const canCreate = await page.evaluate(() => {
            try {
                // Check if TerminalInstanceManager exists
                if (!window.TerminalInstanceManager) return false;
                
                // Create instance
                const instance = window.TerminalInstanceManager.createInstance({
                    title: 'Test Terminal'
                });

                if (!instance) return false;

                // Verify instance has expected methods
                const hasDestroy = typeof instance.destroy === 'function';
                const hasInstanceId = typeof instance.instanceId === 'string';

                // Clean up
                instance.destroy();

                return hasDestroy && hasInstanceId;
            } catch (err) {
                console.error('Instance creation failed:', err);
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
                hasSetTheme: window.API && typeof window.API.theme.setThemePreference === 'function',
                hasSavePositions: window.API && typeof window.API.storage.saveWindowPositions === 'function',
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
                    { label: 'Test', onClick: () => {} }
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

        // Wait for app to fully initialize (all modules loaded)
        // Using short delay here as we just reloaded and already have appReady
        await page.waitForTimeout(500); // Intentional: ensure module initialization complete after reload

        expect(errors.length, `No CommonJS export errors: ${errors.join(', ')}`).toBe(0);
    });

    test('TypeScript modules integrate with legacy code', async ({ page }) => {
        // Open a window that uses both TS and JS modules
        await page.click('[data-action="openWindow"][data-window-id="terminal-modal"]');
        
        // Wait for terminal to be visible
        await page.waitForSelector('#terminal-modal', { state: 'visible' });

        // Check that terminal instance was created (uses TerminalInstance from TS)
        const hasTerminal = await page.evaluate(() => {
            return window.TerminalInstanceManager && 
                   window.TerminalInstanceManager.getActiveInstance() !== null;
        });

        expect(hasTerminal).toBe(true);

        // Clean up
        await page.click('[data-action="closeWindow"][data-window-id="terminal-modal"]');
    });
});
