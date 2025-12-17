/**
 * Terminal VDOM Focus Tests
 * Validates that input focus is preserved during output updates (VDOM migration benefit)
 */

const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

test.describe('Terminal VDOM Focus Preservation', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);

        // Open terminal window
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();

        await page.waitForFunction(
            () => {
                return window.WindowRegistry?.getAllWindows('terminal')?.length === 1;
            },
            { timeout: 5000 }
        );
    });

    test('Input focus is preserved during single output update', async ({ page }) => {
        // Find terminal input
        const terminalInput = page.locator('[data-terminal-input]').first();
        await expect(terminalInput).toBeVisible();

        // Focus input
        await terminalInput.focus();

        // Verify input has focus
        let hasFocus = await page.evaluate(() => {
            const input = document.querySelector('[data-terminal-input]');
            return document.activeElement === input;
        });
        expect(hasFocus).toBe(true);

        // Add output programmatically (simulates command execution output)
        await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            const session = wins[0]?.activeSession;
            if (session && typeof session.addOutput === 'function') {
                session.addOutput('Test output line', 'output');
            }
        });

        // Wait for render
        await page.waitForTimeout(100);

        // Verify input still has focus after output update
        hasFocus = await page.evaluate(() => {
            const input = document.querySelector('[data-terminal-input]');
            return document.activeElement === input;
        });
        expect(hasFocus).toBe(true);

        // Verify we can still type without manually refocusing
        await terminalInput.type('test');
        const inputValue = await terminalInput.inputValue();
        expect(inputValue).toBe('test');
    });

    test('Input focus is preserved during rapid output updates', async ({ page }) => {
        // Find terminal input
        const terminalInput = page.locator('[data-terminal-input]').first();
        await expect(terminalInput).toBeVisible();

        // Focus input
        await terminalInput.focus();

        // Verify input has focus
        let hasFocus = await page.evaluate(() => {
            const input = document.querySelector('[data-terminal-input]');
            return document.activeElement === input;
        });
        expect(hasFocus).toBe(true);

        // Add multiple outputs rapidly (simulates fast command output)
        await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            const session = wins[0]?.activeSession;
            if (session && typeof session.addOutput === 'function') {
                for (let i = 0; i < 20; i++) {
                    session.addOutput(`Rapid output line ${i}`, 'output');
                }
            }
        });

        // Wait for all renders to complete
        await page.waitForTimeout(200);

        // Verify input still has focus after rapid updates
        hasFocus = await page.evaluate(() => {
            const input = document.querySelector('[data-terminal-input]');
            return document.activeElement === input;
        });
        expect(hasFocus).toBe(true);

        // Verify we can still type without manually refocusing
        await terminalInput.type('pwd');
        const inputValue = await terminalInput.inputValue();
        expect(inputValue).toBe('pwd');
    });

    test('Input focus is preserved when executing commands', async ({ page }) => {
        // Find terminal input
        const terminalInput = page.locator('[data-terminal-input]').first();
        await expect(terminalInput).toBeVisible();

        // Type and execute a command
        await terminalInput.fill('help');
        await terminalInput.press('Enter');

        // Wait for command output
        await page.waitForTimeout(300);

        // Verify input has focus after command execution
        const hasFocus = await page.evaluate(() => {
            const input = document.querySelector('[data-terminal-input]');
            return document.activeElement === input;
        });
        expect(hasFocus).toBe(true);

        // Verify we can immediately type another command without clicking
        await terminalInput.type('pwd');
        const inputValue = await terminalInput.inputValue();
        expect(inputValue).toBe('pwd');
    });

    test('Input focus is preserved after clearing output', async ({ page }) => {
        // Find terminal input
        const terminalInput = page.locator('[data-terminal-input]').first();
        await expect(terminalInput).toBeVisible();

        // Focus input
        await terminalInput.focus();

        // Add some output
        await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            const session = wins[0]?.activeSession;
            if (session && typeof session.addOutput === 'function') {
                session.addOutput('Line 1', 'output');
                session.addOutput('Line 2', 'output');
                session.addOutput('Line 3', 'output');
            }
        });

        await page.waitForTimeout(100);

        // Clear output
        await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            const session = wins[0]?.activeSession;
            if (session && typeof session.clearOutput === 'function') {
                session.clearOutput();
            }
        });

        await page.waitForTimeout(100);

        // Verify input still has focus after clear
        const hasFocus = await page.evaluate(() => {
            const input = document.querySelector('[data-terminal-input]');
            return document.activeElement === input;
        });
        expect(hasFocus).toBe(true);

        // Verify we can still type
        await terminalInput.type('test');
        const inputValue = await terminalInput.inputValue();
        expect(inputValue).toBe('test');
    });
});
