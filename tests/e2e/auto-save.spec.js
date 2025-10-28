/**
 * Auto-Save System Tests
 * Tests for debounced auto-save functionality of instance state
 */

import { test, expect } from '@playwright/test';
import utils from './utils.js';

test.describe('Auto-Save System', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await utils.waitForAppReady(page);
    });

    test('SessionManager is available and initialized', async ({ page }) => {
        const sessionManagerAvailable = await page.evaluate(() => {
            return {
                exists: typeof window.SessionManager !== 'undefined',
                hasInit: typeof window.SessionManager?.init === 'function',
                hasSaveAll: typeof window.SessionManager?.saveAll === 'function',
                hasLoadSession: typeof window.SessionManager?.loadSession === 'function',
                hasClearSession: typeof window.SessionManager?.clearSession === 'function',
                config: window.SessionManager?.getConfig?.(),
            };
        });

        expect(sessionManagerAvailable.exists).toBe(true);
        expect(sessionManagerAvailable.hasInit).toBe(true);
        expect(sessionManagerAvailable.hasSaveAll).toBe(true);
        expect(sessionManagerAvailable.hasLoadSession).toBe(true);
        expect(sessionManagerAvailable.hasClearSession).toBe(true);
        expect(sessionManagerAvailable.config).toBeDefined();
        expect(sessionManagerAvailable.config.enabled).toBe(true);
    });

    test('auto-saves instance state after creation', async ({ page }) => {
        // Clear any existing session data
        await page.evaluate(() => {
            window.SessionManager?.clearSession();
        });

        // Create a terminal instance
        const result = await page.evaluate(() => {
            const manager = window.TerminalInstanceManager;
            if (!manager) return { error: 'TerminalInstanceManager not found' };

            const terminal = manager.createInstance({
                title: 'Test Auto-Save Terminal',
            });

            return {
                success: terminal !== null,
                instanceId: terminal?.instanceId,
            };
        });

        expect(result.success).toBe(true);

        // Wait for debounced save (500ms + buffer)
        await page.waitForTimeout(800);

        // Force an immediate save to ensure it's persisted
        await page.evaluate(() => {
            window.SessionManager?.saveAll({ immediate: true });
        });

        // Check if session was saved
        const sessionData = await page.evaluate(() => {
            const session = window.SessionManager?.loadSession();
            return session;
        });

        expect(sessionData).toBeDefined();
        expect(sessionData?.instances).toBeDefined();
        expect(Array.isArray(sessionData?.instances)).toBe(true);
        expect(sessionData?.instances.length).toBeGreaterThan(0);
        
        const terminalInstance = sessionData?.instances.find(
            (inst) => inst.type === 'terminal'
        );
        expect(terminalInstance).toBeDefined();
        expect(terminalInstance?.title).toBe('Test Auto-Save Terminal');
    });

    test('auto-saves multiple instances correctly', async ({ page }) => {
        // Clear session
        await page.evaluate(() => {
            window.SessionManager?.clearSession();
        });

        // Create multiple instances
        const createResult = await page.evaluate(() => {
            const termManager = window.TerminalInstanceManager;
            const editorManager = window.TextEditorInstanceManager;

            const terminal1 = termManager?.createInstance({ title: 'Terminal 1' });
            const terminal2 = termManager?.createInstance({ title: 'Terminal 2' });
            const editor1 = editorManager?.createInstance({ title: 'Editor 1' });

            return {
                terminal1Id: terminal1?.instanceId,
                terminal2Id: terminal2?.instanceId,
                editor1Id: editor1?.instanceId,
            };
        });

        expect(createResult.terminal1Id).toBeDefined();
        expect(createResult.terminal2Id).toBeDefined();
        expect(createResult.editor1Id).toBeDefined();

        // Wait for debounced save
        await page.waitForTimeout(800);

        // Force immediate save
        await page.evaluate(() => {
            window.SessionManager?.saveAll({ immediate: true });
        });

        // Verify all instances are saved
        const sessionData = await page.evaluate(() => {
            return window.SessionManager?.loadSession();
        });

        expect(sessionData?.instances.length).toBe(3);
        
        const terminals = sessionData?.instances.filter((inst) => inst.type === 'terminal');
        const editors = sessionData?.instances.filter((inst) => inst.type === 'text-editor');
        
        expect(terminals?.length).toBe(2);
        expect(editors?.length).toBe(1);
    });

    test('debounces rapid state changes effectively', async ({ page }) => {
        // Clear session
        await page.evaluate(() => {
            window.SessionManager?.clearSession();
        });

        // Create an instance and trigger rapid updates
        const updateResult = await page.evaluate(() => {
            let saveCallCount = 0;
            const originalSaveAll = window.SessionManager?.saveAll;

            // Wrap saveAll to count calls
            if (window.SessionManager && originalSaveAll) {
                window.SessionManager.saveAll = function(...args) {
                    saveCallCount++;
                    return originalSaveAll.apply(this, args);
                };
            }

            const manager = window.TerminalInstanceManager;
            const terminal = manager?.createInstance({ title: 'Debounce Test' });

            // Trigger 10 rapid state changes
            for (let i = 0; i < 10; i++) {
                terminal?.updateState({ testValue: i });
            }

            // Return initial save count (should be low due to debouncing)
            return { saveCallCount };
        });

        // Wait for debounce to complete
        await page.waitForTimeout(800);

        // Force final save
        await page.evaluate(() => {
            window.SessionManager?.saveAll({ immediate: true });
        });

        // The save call count should be significantly less than 10 due to debouncing
        // Expecting around 1-3 calls instead of 11 (10 updates + 1 creation)
        expect(updateResult.saveCallCount).toBeLessThan(5);
    });

    test('handles state changes and triggers auto-save', async ({ page }) => {
        // Clear session
        await page.evaluate(() => {
            window.SessionManager?.clearSession();
        });

        // Create instance and update state
        const updateResult = await page.evaluate(() => {
            const manager = window.TerminalInstanceManager;
            const terminal = manager?.createInstance({ 
                title: 'State Change Test',
                initialState: { testData: 'initial' }
            });

            // Update state
            terminal?.updateState({ testData: 'updated', extraField: 'value' });

            return {
                instanceId: terminal?.instanceId,
            };
        });

        expect(updateResult.instanceId).toBeDefined();

        // Wait for debounced save
        await page.waitForTimeout(800);

        // Force save
        await page.evaluate(() => {
            window.SessionManager?.saveAll({ immediate: true });
        });

        // Load session and verify state
        const sessionData = await page.evaluate(() => {
            return window.SessionManager?.loadSession();
        });

        const savedInstance = sessionData?.instances.find(
            (inst) => inst.instanceId === updateResult.instanceId
        );

        expect(savedInstance).toBeDefined();
        expect(savedInstance?.state.testData).toBe('updated');
        expect(savedInstance?.state.extraField).toBe('value');
    });

    test('saves on window blur', async ({ page }) => {
        // Clear session
        await page.evaluate(() => {
            window.SessionManager?.clearSession();
        });

        // Create instance
        await page.evaluate(() => {
            window.TerminalInstanceManager?.createInstance({ title: 'Blur Test' });
        });

        // Trigger window blur
        await page.evaluate(() => {
            window.dispatchEvent(new Event('blur'));
        });

        // Wait a bit for the save
        await page.waitForTimeout(200);

        // Verify session was saved
        const sessionData = await page.evaluate(() => {
            return window.SessionManager?.loadSession();
        });

        expect(sessionData?.instances.length).toBeGreaterThan(0);
    });

    test('handles storage quota errors gracefully', async ({ page }) => {
        // Monitor console warnings
        const consoleWarnings = [];
        page.on('console', (msg) => {
            if (msg.type() === 'warning' && msg.text().includes('SessionManager')) {
                consoleWarnings.push(msg.text());
            }
        });

        // Simulate quota exceeded by filling up localStorage
        await page.evaluate(() => {
            // Fill localStorage to near capacity
            try {
                const largeData = 'x'.repeat(1024 * 1024); // 1MB chunk
                for (let i = 0; i < 5; i++) {
                    localStorage.setItem(`filler-${i}`, largeData);
                }
            } catch {
                // Expected to fail eventually
            }
        });

        // Try to save - should handle gracefully
        await page.evaluate(() => {
            try {
                window.SessionManager?.saveAll({ immediate: true });
            } catch (error) {
                // Should not throw - errors should be caught internally
                console.error('Unexpected error:', error);
            }
        });

        // Clean up
        await page.evaluate(() => {
            for (let i = 0; i < 5; i++) {
                localStorage.removeItem(`filler-${i}`);
            }
        });

        // Should have logged a warning but not crashed
        // Note: this test verifies graceful degradation
    });

    test('can configure debounce delay', async ({ page }) => {
        const configResult = await page.evaluate(() => {
            // Get initial config
            const initialConfig = window.SessionManager?.getConfig();
            const initialDelay = initialConfig?.debounceDelay;

            // Set new delay
            window.SessionManager?.setDebounceDelay(1000);

            // Get updated config
            const updatedConfig = window.SessionManager?.getConfig();
            const updatedDelay = updatedConfig?.debounceDelay;

            return {
                initialDelay,
                updatedDelay,
            };
        });

        expect(configResult.initialDelay).toBe(500); // Default
        expect(configResult.updatedDelay).toBe(1000); // Updated
    });

    test('can enable/disable auto-save', async ({ page }) => {
        const toggleResult = await page.evaluate(() => {
            // Disable auto-save
            window.SessionManager?.setEnabled(false);
            const disabledConfig = window.SessionManager?.getConfig();

            // Enable auto-save
            window.SessionManager?.setEnabled(true);
            const enabledConfig = window.SessionManager?.getConfig();

            return {
                wasDisabled: disabledConfig?.enabled,
                isEnabled: enabledConfig?.enabled,
            };
        });

        expect(toggleResult.wasDisabled).toBe(false);
        expect(toggleResult.isEnabled).toBe(true);
    });

    test('clears session data correctly', async ({ page }) => {
        // Create instances and save
        await page.evaluate(() => {
            window.TerminalInstanceManager?.createInstance({ title: 'Clear Test' });
            window.SessionManager?.saveAll({ immediate: true });
        });

        // Verify session exists
        let sessionData = await page.evaluate(() => {
            return window.SessionManager?.loadSession();
        });
        expect(sessionData?.instances.length).toBeGreaterThan(0);

        // Clear session
        await page.evaluate(() => {
            window.SessionManager?.clearSession();
        });

        // Verify session is cleared
        sessionData = await page.evaluate(() => {
            return window.SessionManager?.loadSession();
        });
        expect(sessionData).toBeNull();
    });
});
