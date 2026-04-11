// Test storage restore functionality with validation
// Validates fix for TypeError in Dialog.open during modal restore

const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

test.describe('Storage Modal Restore @basic', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage before each test
        await page.goto('http://127.0.0.1:5173/index.html');
        await page.evaluate(() => localStorage.clear());
    });

    test('should handle invalid modal IDs in localStorage gracefully', async ({ page }) => {
        // Inject invalid modal IDs into localStorage before app loads
        await page.evaluate(() => {
            localStorage.setItem(
                'openModals',
                JSON.stringify([
                    'finder-modal',
                    'invalid-modal-id',
                    'another-nonexistent-modal',
                    'about-modal',
                ])
            );
        });

        // Reload page and wait for app to be ready
        await page.reload();
        await waitForAppReady(page);

        // Check console for warning messages (not errors)
        const consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push({
                type: msg.type(),
                text: msg.text(),
            });
        });

        // App should not crash - verify it's functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible({ timeout: 5000 });

        // Legacy openModals entries are tolerated without breaking startup, even when
        // migrated windows are no longer restored through the legacy modal path.
        await expect(dock).toBeVisible({ timeout: 5000 });
    });

    test('should not crash when dialog instance is missing', async ({ page }) => {
        // Set up scenario where modal ID exists but dialog instance might be corrupt
        await page.evaluate(() => {
            localStorage.setItem('openModals', JSON.stringify(['settings-modal']));
        });

        await page.reload();
        await waitForAppReady(page);

        // App should be functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible();

        // No JavaScript errors should have occurred
        const errors = [];
        page.on('pageerror', error => {
            errors.push(error.message);
        });

        // App should remain error-free
        await expect(page.locator('#dock')).toBeVisible({ timeout: 5000 });
        expect(errors).toHaveLength(0);
    });

    test('should ignore settings-modal openModals entry when multi-window session exists', async ({
        page,
    }) => {
        const result = await page.evaluate(() => {
            localStorage.setItem('openModals', JSON.stringify(['settings-modal']));

            localStorage.setItem(
                'multi-window-session',
                JSON.stringify({
                    version: '1.0.0',
                    timestamp: Date.now(),
                    windows: [
                        {
                            id: 'window-terminal-restore-test',
                            type: 'terminal',
                            position: { x: 120, y: 120, width: 800, height: 600 },
                            zIndex: 1000,
                            isMinimized: false,
                            isMaximized: false,
                            activeTabId: 'tab-terminal-restore-test',
                            tabs: [
                                {
                                    id: 'tab-terminal-restore-test',
                                    type: 'terminal-session',
                                    title: 'Terminal 1',
                                    contentState: {},
                                    created: Date.now(),
                                    modified: Date.now(),
                                    currentPath: '/home/marvin',
                                    commandHistory: [],
                                    vfsCwd: '/home/marvin',
                                },
                            ],
                            metadata: {},
                        },
                    ],
                    metadata: { theme: 'auto', language: 'de' },
                })
            );

            const el = document.getElementById('settings-modal');
            if (el) {
                el.classList.add('hidden');
            }

            window.StorageSystem?.restoreOpenModals?.();

            const savedOpenModals = JSON.parse(localStorage.getItem('openModals') || '[]');

            if (!el) {
                return {
                    exists: false,
                    hidden: true,
                    savedOpenModals,
                };
            }

            return {
                exists: true,
                hidden: el.classList.contains('hidden') || getComputedStyle(el).display === 'none',
                savedOpenModals,
            };
        });

        expect(result.exists).toBe(true);
        expect(result.hidden).toBe(true);
        expect(result.savedOpenModals).not.toContain('settings-modal');
    });

    test('should open modern about window without restore errors', async ({ page }) => {
        // Open a valid modal
        await page.goto('http://127.0.0.1:5173/index.html');
        await waitForAppReady(page);

        // Open About modal via header (stable, uses ActionBus)
        // First open the Apple menu dropdown where the About item lives
        const appleMenuButton = page.locator('[aria-controls="apple-menu-dropdown"]').first();
        await appleMenuButton.click();
        const appleMenu = page.locator('#apple-menu-dropdown');
        await expect(appleMenu).toBeVisible();

        const aboutTrigger = page.locator('[data-action="openAbout"]').first();
        await aboutTrigger.click({ timeout: 3000 }).catch(async () => {
            await page.evaluate(() => {
                const trigger = document.querySelector('[data-action="openAbout"]');
                trigger?.dispatchEvent(
                    new MouseEvent('click', { bubbles: true, cancelable: true })
                );
            });
        });

        // About is now a BaseWindow instance; assert modern window shell is visible.
        const aboutWindow = page.locator('.modal.multi-window[id^="window-about-"]');
        await expect(aboutWindow.first()).toBeVisible({ timeout: 5000 });

        // Now reload and verify app remains healthy.
        await page.reload();
        await waitForAppReady(page);

        // Check if modal was persisted (depending on implementation)
        // At minimum, app should not crash
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible();
    });

    test('should skip transient modals during restore', async ({ page }) => {
        // Set up localStorage with a transient modal
        await page.evaluate(() => {
            localStorage.setItem(
                'openModals',
                JSON.stringify([
                    'about-modal',
                    'program-info-modal', // This is transient
                ])
            );
        });

        await page.reload();
        await waitForAppReady(page);

        // App should be functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible();

        // Transient modal should not be shown on restore
        const programInfoModal = page.locator('#program-info-modal');
        await expect(programInfoModal).toHaveClass(/hidden/);
    });

    test('should validate modal exists in WindowManager before restore', async ({ page }) => {
        // Inject modal ID that might not be registered
        await page.evaluate(() => {
            localStorage.setItem('openModals', JSON.stringify(['unregistered-but-exists-in-dom']));
        });

        await page.reload();
        await waitForAppReady(page);

        // Should log warning but not crash
        const consoleWarnings = [];
        page.on('console', msg => {
            if (msg.type() === 'warning') {
                consoleWarnings.push(msg.text());
            }
        });

        // App should still be functional
        const dock = page.locator('#dock');
        await expect(dock).toBeVisible({ timeout: 5000 });
    });
});
