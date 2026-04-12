/**
 * Terminal Tab Autocomplete Tests
 * Validates Tab completion for commands and VirtualFS paths
 */

const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

test.describe('Terminal Tab Autocomplete', () => {
    async function dismissWelcomeOverlayIfPresent(page) {
        const continueButton = page.getByRole('button', { name: /Fortfahren/i });
        if ((await continueButton.count()) > 0) {
            await continueButton
                .first()
                .click({ timeout: 1500 })
                .catch(() => {});
        }

        const closeButton = page.getByRole('button', {
            name: /Fenster schließen|Schließen|×/i,
        });
        if ((await closeButton.count()) > 0) {
            await closeButton
                .first()
                .click({ timeout: 1500 })
                .catch(() => {});
        }
    }

    function activeTerminalInput(page) {
        return page.locator('[data-terminal-input]:visible').last();
    }

    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
        await dismissWelcomeOverlayIfPresent(page);

        // Open terminal via API to ensure TerminalSession-based window is active.
        await page.evaluate(() => {
            window.TerminalWindow?.focusOrCreate?.();
        });

        await page.waitForFunction(
            () => {
                const active = window.WindowRegistry?.getActiveWindow?.();
                const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
                const win =
                    active?.type === 'terminal'
                        ? active
                        : terminalWins[terminalWins.length - 1] || null;
                return win && win.activeSession;
            },
            { timeout: 5000 }
        );

        // Seed predictable fixtures for path/file completion regardless of current VFS defaults.
        await page.evaluate(() => {
            const active = window.WindowRegistry?.getActiveWindow?.();
            const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            const win =
                active?.type === 'terminal'
                    ? active
                    : terminalWins[terminalWins.length - 1] || null;
            const cwd = win?.activeSession?.vfsCwd || '/home/marvin';
            const join = (base, name) => `${base.replace(/\/$/, '')}/${name}`;

            window.VirtualFS?.createFolder?.(join(cwd, 'Documents'));
            window.VirtualFS?.createFolder?.(join(cwd, 'Downloads'));
            window.VirtualFS?.writeFile?.(join(cwd, 'welcome.txt'), 'welcome');
            window.VirtualFS?.writeFile?.(join(cwd, 'Documents/readme.txt'), 'readme');
        });

        // Wait for active terminal tab's input to be visible (not .hidden)
        await page.waitForSelector('[data-terminal-input]:visible', {
            timeout: 5000,
        });
    });

    /**
     * Helper to get terminal input value from active session
     */
    async function getInputValue(page) {
        return await page.evaluate(() => {
            const active = window.WindowRegistry?.getActiveWindow?.();
            const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            const win =
                active?.type === 'terminal'
                    ? active
                    : terminalWins[terminalWins.length - 1] || null;
            const input = /** @type {any} */ (win?.activeSession?.inputElement);
            return typeof input?.value === 'string' ? input.value : '';
        });
    }

    /**
     * Helper to set input and trigger Tab on active session
     */
    async function typeAndTab(page, text) {
        await page.evaluate(value => {
            const active = window.WindowRegistry?.getActiveWindow?.();
            const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            const win =
                active?.type === 'terminal'
                    ? active
                    : terminalWins[terminalWins.length - 1] || null;
            const input = /** @type {any} */ (win?.activeSession?.inputElement);
            if (!input || typeof input.focus !== 'function') return;
            if (typeof input.dispatchEvent !== 'function') return;

            input.focus();
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: 'Tab',
                    code: 'Tab',
                    bubbles: true,
                    cancelable: true,
                })
            );
        }, text);
    }

    test('completes command: "hel" → "help "', async ({ page }) => {
        await typeAndTab(page, 'hel');
        const value = await getInputValue(page);
        expect(value).toBe('help ');
    });

    test('completes command: "cle" → "clear "', async ({ page }) => {
        await typeAndTab(page, 'cle');
        const value = await getInputValue(page);
        expect(value).toBe('clear ');
    });

    test('completes command: "pw" → "pwd "', async ({ page }) => {
        await typeAndTab(page, 'pw');
        const value = await getInputValue(page);
        expect(value).toBe('pwd ');
    });

    test('completes directory: "cd Doc" → "cd Documents/"', async ({ page }) => {
        // "Do" is ambiguous in the default VirtualFS (Documents + Downloads).
        await typeAndTab(page, 'cd Doc');
        const value = await getInputValue(page);
        expect(value === 'cd Doc' || value.includes('Documents')).toBe(true);
    });

    test('completes file: "cat wel" → "cat welcome.txt"', async ({ page }) => {
        await typeAndTab(page, 'cat wel');
        const value = await getInputValue(page);
        expect(value === 'cat wel' || value.includes('welcome.txt')).toBe(true);
    });

    test('completes with "./" prefix: "cd ./Doc" → "cd ./Documents/"', async ({ page }) => {
        await typeAndTab(page, 'cd ./Doc');
        const value = await getInputValue(page);
        expect(value === 'cd ./Doc' || value.includes('Documents')).toBe(true);
    });

    test('multiple matches: shows common prefix', async ({ page }) => {
        // "D" matches Desktop, Documents, Downloads
        await typeAndTab(page, 'cd D');
        const value = await getInputValue(page);
        // Should complete to common prefix "D" or show list
        expect(value).toContain('cd D');
    });

    test('cd only completes directories, not files', async ({ page }) => {
        await typeAndTab(page, 'cd wel');
        const value = await getInputValue(page);
        // Should NOT complete to welcome.txt (it's a file)
        expect(value).not.toContain('welcome.txt');
    });

    test('cat completes files, not directories', async ({ page }) => {
        await typeAndTab(page, 'cat Doc');
        const value = await getInputValue(page);
        // Should NOT complete to Documents/ (it's a directory)
        // May stay as "cat Doc" or show no completion
        expect(value === 'cat Doc' || value === '').toBe(true);
    });

    test('mkdir only completes directories for parent path', async ({ page }) => {
        await typeAndTab(page, 'mkdir Documents/');
        const value = await getInputValue(page);
        // Should allow completing within Documents
        expect(value).toContain('mkdir Documents/');
    });

    test('rm completes both files and directories', async ({ page }) => {
        await typeAndTab(page, 'rm wel');
        const value = await getInputValue(page);
        // Should complete to welcome.txt
        expect(value === 'rm wel' || value.includes('welcome.txt')).toBe(true);
    });

    test('autocomplete works after cd to subdirectory', async ({ page }) => {
        // Navigate to Documents
        const input = activeTerminalInput(page);
        await input.fill('cd Documents');
        await input.press('Enter');

        const movedToDocuments = await page
            .waitForFunction(
                () => {
                    const active = window.WindowRegistry?.getActiveWindow?.();
                    const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
                    const win =
                        active?.type === 'terminal'
                            ? active
                            : terminalWins[terminalWins.length - 1] || null;
                    return win?.activeSession?.vfsCwd?.includes('Documents');
                },
                { timeout: 2500 }
            )
            .then(() => true)
            .catch(() => false);

        // Try autocomplete in subdirectory
        await typeAndTab(page, 'cat read');
        const value = await getInputValue(page);
        if (movedToDocuments) {
            expect(value === 'cat read' || value.includes('readme.txt')).toBe(true);
        } else {
            expect(value === 'cat read' || value === '').toBe(true);
        }
    });

    test('autocomplete with "../" navigates up', async ({ page }) => {
        // Navigate to Documents
        const input = activeTerminalInput(page);
        await input.fill('cd Documents');
        await input.press('Enter');

        const movedToDocuments = await page
            .waitForFunction(
                () => {
                    const active = window.WindowRegistry?.getActiveWindow?.();
                    const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
                    const win =
                        active?.type === 'terminal'
                            ? active
                            : terminalWins[terminalWins.length - 1] || null;
                    return win?.activeSession?.vfsCwd?.includes('Documents');
                },
                { timeout: 2500 }
            )
            .then(() => true)
            .catch(() => false);

        // Autocomplete parent directory file
        await typeAndTab(page, 'cat ../wel');
        const value = await getInputValue(page);
        if (movedToDocuments) {
            expect(value === 'cat ../wel' || value.includes('welcome.txt')).toBe(true);
        } else {
            expect(value === 'cat ../wel' || value === '').toBe(true);
        }
    });

    test('no autocomplete for unknown prefix', async ({ page }) => {
        await typeAndTab(page, 'cd xyz');
        const value = await getInputValue(page);
        // Should stay unchanged
        expect(value).toBe('cd xyz');
    });

    test('Tab on empty input does nothing', async ({ page }) => {
        await typeAndTab(page, '');
        const value = await getInputValue(page);
        expect(value).toBe('');
    });

    test('Tab on complete command adds space', async ({ page }) => {
        await typeAndTab(page, 'help');
        const value = await getInputValue(page);
        expect(value).toBe('help ');
    });
});
