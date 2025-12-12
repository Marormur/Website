/**
 * Multi-Instance Basic Tests
 * Einfachere Tests ohne networkidle
 */

import { test, expect } from '@playwright/test';
import utils from '../utils.js';

test.describe('Multi-Instance System - Basic', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await utils.waitForAppReady(page);
    });

    test('page loads and modules are available', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Navigation handled in beforeEach

        // Check console errors
        console.log('Console errors:', consoleErrors);

        // Check if core modules loaded
        const modulesAvailable = await page.evaluate(() => {
            return {
                BaseWindowInstance: typeof window.BaseWindowInstance,
                InstanceManager: typeof window.InstanceManager,
                WindowChrome: typeof window.WindowChrome,
                TerminalInstance: typeof window.TerminalInstance,
                TextEditorInstance: typeof window.TextEditorInstance,
                TerminalInstanceManager: window.TerminalInstanceManager !== undefined,
                TextEditorInstanceManager: window.TextEditorInstanceManager !== undefined,
            };
        });

        console.log('Modules:', modulesAvailable);

        // Assertions
        expect(modulesAvailable.BaseWindowInstance).toBe('function');
        expect(modulesAvailable.InstanceManager).toBe('function');
        expect(modulesAvailable.WindowChrome).toBe('object');
        expect(modulesAvailable.TerminalInstance).toBe('function');
        expect(modulesAvailable.TextEditorInstance).toBe('function');
        expect(modulesAvailable.TerminalInstanceManager).toBe(true);
        expect(modulesAvailable.TextEditorInstanceManager).toBe(true);
    });

    test('can create a terminal instance', async ({ page }) => {
        const result = await page.evaluate(() => {
            try {
                const manager = window.TerminalInstanceManager;
                if (!manager) return { error: 'TerminalInstanceManager not found' };

                const terminal = manager.createInstance({
                    title: 'Test Terminal',
                });

                return {
                    success: terminal !== null,
                    instanceId: terminal?.instanceId,
                    type: terminal?.type,
                    title: terminal?.title,
                };
            } catch (error) {
                return { error: error.message };
            }
        });

        console.log('Terminal instance result:', result);

        expect(result.success).toBe(true);
        expect(result.type).toBe('terminal');
        expect(result.title).toBe('Test Terminal');
    });

    test('can create a text editor instance', async ({ page }) => {
        const result = await page.evaluate(() => {
            try {
                const manager = window.TextEditorInstanceManager;
                if (!manager) return { error: 'TextEditorInstanceManager not found' };

                const editor = manager.createInstance({ title: 'Test Editor' });

                return {
                    success: editor !== null,
                    instanceId: editor?.instanceId,
                    type: editor?.type,
                    title: editor?.title,
                };
            } catch (error) {
                return { error: error.message };
            }
        });

        console.log('TextEditor instance result:', result);

        expect(result.success).toBe(true);
        expect(result.type).toBe('text-editor');
        expect(result.title).toBe('Test Editor');
    });
});
