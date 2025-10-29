// Test comprehensive session restore functionality
// Validates restoration of instances, modals, active tabs, and UI state

const { test, expect } = require('@playwright/test');
const { waitForAppReady, clickDockIcon } = require('./utils');

test.describe('Session Restore - Full Integration @basic', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage and start fresh
        await page.goto('http://127.0.0.1:5173/index.html');
        await page.evaluate(() => {
            localStorage.clear();
        });
        await page.reload();
        await waitForAppReady(page);
    });

    test('should restore terminal instances and active tab on reload', async ({ page }) => {
        // Skip if terminal manager not available
        const hasTerminal = await page.evaluate(() => {
            return !!window.TerminalInstanceManager;
        });
        
        if (!hasTerminal) {
            test.skip();
            return;
        }

        // Open terminal modal via Dock
        await clickDockIcon(page, 'terminal-modal');
        
        await page.waitForTimeout(500);

        // Create multiple terminal instances
        const createCount = await page.evaluate(() => {
            if (!window.TerminalInstanceManager) return 0;
            
            // Create 3 terminals
            for (let i = 0; i < 3; i++) {
                window.TerminalInstanceManager.createInstance({
                    title: `Terminal ${i + 1}`
                });
            }
            
            return window.TerminalInstanceManager.getInstanceCount();
        });

        expect(createCount).toBe(3);

        // Set the second instance as active
        await page.evaluate(() => {
            const instances = window.TerminalInstanceManager.getAllInstanceIds();
            if (instances.length >= 2) {
                window.TerminalInstanceManager.setActiveInstance(instances[1]);
            }
        });

        // Verify active instance before reload
        const activeBeforeReload = await page.evaluate(() => {
            const active = window.TerminalInstanceManager.getActiveInstance();
            return active ? active.instanceId : null;
        });

        // Manually trigger save before reload
        await page.evaluate(() => {
            if (window.SessionManager) {
                window.SessionManager.saveAllSessions();
            }
        });

        // Reload page
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(300); // Wait for restore to complete

        // Verify instances were restored
        const restoredCount = await page.evaluate(() => {
            return window.TerminalInstanceManager?.getInstanceCount() || 0;
        });

        expect(restoredCount).toBe(3);

        // Verify active instance was restored
        const activeAfterReload = await page.evaluate(() => {
            const active = window.TerminalInstanceManager?.getActiveInstance();
            return active ? active.instanceId : null;
        });

        expect(activeAfterReload).toBe(activeBeforeReload);
    });

    test('should restore text editor instances and active tab on reload', async ({ page }) => {
        // Skip if text editor manager not available
        const hasTextEditor = await page.evaluate(() => {
            return !!window.TextEditorInstanceManager;
        });
        
        if (!hasTextEditor) {
            test.skip();
            return;
        }

        // Open text editor modal via Dock
        await clickDockIcon(page, 'text-modal');
        
        await page.waitForTimeout(500);

        // Create multiple text editor instances
        await page.evaluate(() => {
            if (!window.TextEditorInstanceManager) return;
            
            // Create 2 editors with different content
            const editor1 = window.TextEditorInstanceManager.createInstance({
                title: 'Document 1'
            });
            if (editor1) {
                editor1.updateState({ content: 'Hello from document 1' });
            }
            
            const editor2 = window.TextEditorInstanceManager.createInstance({
                title: 'Document 2'
            });
            if (editor2) {
                editor2.updateState({ content: 'Hello from document 2' });
            }
        });

        // Manually trigger save
        await page.evaluate(() => {
            if (window.SessionManager) {
                window.SessionManager.saveAllSessions();
            }
        });

        // Reload page
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(300);

        // Verify instances were restored
        const restoredCount = await page.evaluate(() => {
            return window.TextEditorInstanceManager?.getInstanceCount() || 0;
        });

        expect(restoredCount).toBe(2);

        // Verify content was preserved
        const content1 = await page.evaluate(() => {
            const instances = window.TextEditorInstanceManager?.getAllInstances();
            return instances?.[0]?.state?.content || '';
        });

        expect(content1).toContain('Hello from document');
    });

    test('should restore modal visibility state', async ({ page }) => {
        // Open about modal
        const appleMenuButton = page.locator('[aria-controls="apple-menu-dropdown"]').first();
        await appleMenuButton.click();
        
        const aboutTrigger = page.locator('[data-action="openAbout"]').first();
        await aboutTrigger.click();
        
        await page.waitForTimeout(300);

        // Verify modal is visible
        const aboutModal = page.locator('#about-modal');
        await expect(aboutModal).not.toHaveClass(/hidden/);

        // Save session
        await page.evaluate(() => {
            if (window.SessionManager) {
                window.SessionManager.saveAllSessions();
            }
        });

        // Reload page
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(300);

        // Verify modal is still visible after reload
        const aboutModalAfter = page.locator('#about-modal');
        await expect(aboutModalAfter).not.toHaveClass(/hidden/, { timeout: 2000 });
    });

    test('should not restore transient modals', async ({ page }) => {
        // Manually inject a transient modal into session storage
        await page.evaluate(() => {
            const sessionData = {
                version: '1.1',
                timestamp: Date.now(),
                sessions: {},
                modalState: {
                    'program-info-modal': {
                        visible: true,
                        minimized: false,
                        zIndex: '1001'
                    },
                    'about-modal': {
                        visible: true,
                        minimized: false,
                        zIndex: '1000'
                    }
                },
                tabState: {}
            };
            localStorage.setItem('window-session', JSON.stringify(sessionData));
        });

        // Reload page
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(300);

        // Verify transient modal is NOT restored
        const programInfoModal = page.locator('#program-info-modal');
        await expect(programInfoModal).toHaveClass(/hidden/);

        // Verify non-transient modal IS restored
        const aboutModal = page.locator('#about-modal');
        await expect(aboutModal).not.toHaveClass(/hidden/, { timeout: 2000 });
    });

    test('should handle missing modal elements gracefully', async ({ page }) => {
        // Inject session data with non-existent modal
        await page.evaluate(() => {
            const sessionData = {
                version: '1.1',
                timestamp: Date.now(),
                sessions: {},
                modalState: {
                    'non-existent-modal': {
                        visible: true,
                        minimized: false,
                        zIndex: '1001'
                    }
                },
                tabState: {}
            };
            localStorage.setItem('window-session', JSON.stringify(sessionData));
        });

        // Monitor console for warnings
        const consoleWarnings = [];
        page.on('console', msg => {
            if (msg.type() === 'warning') {
                consoleWarnings.push(msg.text());
            }
        });

        // Reload page
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(300);

        // App should still be functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible({ timeout: 5000 });

        // Should have logged a warning about missing modal
        const expectedWarning = 'SessionManager: Modal "non-existent-modal" not found in DOM';
        const hasSpecificWarning = consoleWarnings.some(msg => msg === expectedWarning);
        expect(hasSpecificWarning).toBe(true);
    });

    test('should be idempotent - running restore twice yields same result', async ({ page }) => {
        // Skip if terminal manager not available
        const hasTerminal = await page.evaluate(() => {
            return !!window.TerminalInstanceManager;
        });
        
        if (!hasTerminal) {
            test.skip();
            return;
        }

        // Create a terminal instance via Dock
        await clickDockIcon(page, 'terminal-modal');
        await page.waitForTimeout(300);

        await page.evaluate(() => {
            window.TerminalInstanceManager?.createInstance({ title: 'Test Terminal' });
            window.SessionManager?.saveAllSessions();
        });

        // Reload once
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(300);

        const countAfterFirstReload = await page.evaluate(() => {
            return window.TerminalInstanceManager?.getInstanceCount() || 0;
        });

        // Reload again without changing anything
        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(300);

        const countAfterSecondReload = await page.evaluate(() => {
            return window.TerminalInstanceManager?.getInstanceCount() || 0;
        });

        // Should be the same count both times
        expect(countAfterSecondReload).toBe(countAfterFirstReload);
        expect(countAfterSecondReload).toBe(1);
    });

    test('should handle empty session gracefully', async ({ page }) => {
        // Ensure no session exists
        await page.evaluate(() => {
            localStorage.removeItem('window-session');
        });

        // Reload page
        await page.reload();
        await waitForAppReady(page);

        // App should still be functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible({ timeout: 5000 });

        // Should not have any errors
        const pageErrors = [];
        page.on('pageerror', error => {
            pageErrors.push(error.message);
        });

        await page.waitForTimeout(500);
        expect(pageErrors).toHaveLength(0);
    });

    test('should preserve z-index ordering of modals', async ({ page }) => {
        // Open multiple modals
        await page.evaluate(() => {
            // Open about modal
            const aboutDialog = window.dialogs?.['about-modal'];
            if (aboutDialog?.open) aboutDialog.open();
        });

        await page.waitForTimeout(200);

        await page.evaluate(() => {
            // Open settings modal (will be on top)
            const settingsDialog = window.dialogs?.['settings-modal'];
            if (settingsDialog?.open) settingsDialog.open();
        });

        await page.waitForTimeout(200);

        // Get z-index ordering before reload
        const zIndexesBefore = await page.evaluate(() => {
            const aboutModal = document.getElementById('about-modal');
            const settingsModal = document.getElementById('settings-modal');
            return {
                about: aboutModal?.style?.zIndex || '',
                settings: settingsModal?.style?.zIndex || ''
            };
        });

        // Save and reload
        await page.evaluate(() => {
            window.SessionManager?.saveAllSessions();
        });

        await page.reload();
        await waitForAppReady(page);
        await page.waitForTimeout(300);

        // Get z-index ordering after reload
        const zIndexesAfter = await page.evaluate(() => {
            const aboutModal = document.getElementById('about-modal');
            const settingsModal = document.getElementById('settings-modal');
            return {
                about: aboutModal?.style?.zIndex || '',
                settings: settingsModal?.style?.zIndex || ''
            };
        });

        // Z-indexes should be preserved (or at least relative ordering)
        if (zIndexesBefore.about && zIndexesBefore.settings) {
            expect(zIndexesAfter.about).toBe(zIndexesBefore.about);
            expect(zIndexesAfter.settings).toBe(zIndexesBefore.settings);
        }
    });
});
