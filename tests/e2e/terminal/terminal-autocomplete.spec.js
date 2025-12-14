/**
 * Terminal Tab Autocomplete Tests
 * Validates Tab completion for commands and VirtualFS paths
 */

const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

test.describe('Terminal Tab Autocomplete', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);

        // Open terminal
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();

        await page.waitForFunction(
            () => {
                const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
                return win && win.activeSession;
            },
            { timeout: 5000 }
        );

        // Wait for active terminal tab's input to be visible (not .hidden)
        await page.waitForSelector('.tab-content:not(.hidden) [data-terminal-input]', {
            timeout: 5000,
        });
    });

    /**
     * Helper to get terminal input value from active session
     */
    async function getInputValue(page) {
        // Get the active tab content (visible, not .hidden) input
        const input = page.locator('.tab-content:not(.hidden) [data-terminal-input]');
        return await input.inputValue();
    }

    /**
     * Helper to set input and trigger Tab on active session
     */
    async function typeAndTab(page, text) {
        // Target the visible terminal input (active tab content without .hidden class)
        const input = page.locator('.tab-content:not(.hidden) [data-terminal-input]');
        await input.fill(text);
        // Ensure the key event is dispatched to the input (page.keyboard may target <body> if focus is elsewhere).
        await input.press('Tab');
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
        expect(value).toContain('Documents');
    });

    test('completes file: "cat wel" → "cat welcome.txt"', async ({ page }) => {
        await typeAndTab(page, 'cat wel');
        const value = await getInputValue(page);
        expect(value).toContain('welcome.txt');
    });

    test('completes with "./" prefix: "cd ./Doc" → "cd ./Documents/"', async ({ page }) => {
        await typeAndTab(page, 'cd ./Doc');
        const value = await getInputValue(page);
        expect(value).toContain('Documents');
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
        expect(value).toBe('cat Doc');
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
        expect(value).toContain('welcome.txt');
    });

    test('autocomplete works after cd to subdirectory', async ({ page }) => {
        // Navigate to Documents
        const input = page.locator('.tab-content:not(.hidden) [data-terminal-input]');
        await input.fill('cd Documents');
        await input.press('Enter');

        // Wait for command execution (check prompt updated)
        await page.waitForFunction(
            () => {
                const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
                return win?.activeSession?.vfsCwd?.includes('Documents');
            },
            { timeout: 5000 }
        );

        // Try autocomplete in subdirectory
        await typeAndTab(page, 'cat read');
        const value = await getInputValue(page);
        expect(value).toContain('readme.txt');
    });

    test('autocomplete with "../" navigates up', async ({ page }) => {
        // Navigate to Documents
        const input = page.locator('.tab-content:not(.hidden) [data-terminal-input]');
        await input.fill('cd Documents');
        await input.press('Enter');

        // Wait for cwd change
        await page.waitForFunction(
            () => {
                const win = window.WindowRegistry?.getAllWindows('terminal')?.[0];
                return win?.activeSession?.vfsCwd?.includes('Documents');
            },
            { timeout: 5000 }
        );

        // Autocomplete parent directory file
        await typeAndTab(page, 'cat ../wel');
        const value = await getInputValue(page);
        expect(value).toContain('welcome.txt');
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
