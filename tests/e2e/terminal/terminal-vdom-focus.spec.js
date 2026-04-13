/**
 * Terminal VDOM Focus Tests
 * Validates that input focus is preserved during output updates (VDOM migration benefit)
 */

const { test, expect } = require('@playwright/test');
const { waitForAppReady, dismissWelcomeDialogIfPresent } = require('../utils');

async function expectInputToRemainFocused(inputLocator) {
    await expect
        .poll(
            async () => {
                return inputLocator.evaluate(input => document.activeElement === input);
            },
            { timeout: 1500 }
        )
        .toBe(true);
}

async function typeWithoutRefocus(page, terminalInput, text) {
    await page.keyboard.type(text);
    await expect(terminalInput).toHaveValue(text);
}

async function addTerminalOutput(page, lines) {
    return page.evaluate(outputLines => {
        const active = window.WindowRegistry?.getActiveWindow?.();
        const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
        const win =
            active?.type === 'terminal' ? active : terminalWins[terminalWins.length - 1] || null;
        const session = win?.activeSession;
        if (!session) return false;
        if (typeof session.addOutput !== 'function') return false;
        for (const line of outputLines) {
            session.addOutput(line, 'output');
        }
        return true;
    }, lines);
}

async function clearTerminalOutput(page) {
    return page.evaluate(() => {
        const active = window.WindowRegistry?.getActiveWindow?.();
        const terminalWins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
        const win =
            active?.type === 'terminal' ? active : terminalWins[terminalWins.length - 1] || null;
        const session = win?.activeSession;
        if (!session || typeof session.clearOutput !== 'function') return false;
        session.clearOutput();
        return true;
    });
}

test.describe('Terminal VDOM Focus Preservation', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
        await dismissWelcomeDialogIfPresent(page);

        // Open terminal window
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();

        await page.waitForFunction(
            () => {
                return (window.WindowRegistry?.getAllWindows('terminal') || []).length >= 1;
            },
            { timeout: 5000 }
        );
    });

    test('Input focus is preserved during single output update', async ({ page }) => {
        // Find terminal input
        const terminalInput = page.locator('[data-terminal-input]:visible').last();
        await expect(terminalInput).toBeVisible();

        // Focus input
        await terminalInput.focus();

        // Verify input has focus
        await expectInputToRemainFocused(terminalInput);

        // Add output programmatically (simulates command execution output)
        await addTerminalOutput(page, ['Test output line']);

        // Wait for output line to appear in DOM
        await page.waitForSelector('.terminal-line.terminal-output', { timeout: 2000 });

        // Verify input still has focus after output update
        await expectInputToRemainFocused(terminalInput);

        // Verify we can still type without manually refocusing
        await typeWithoutRefocus(page, terminalInput, 'test');
    });

    test('Input focus is preserved during rapid output updates', async ({ page }) => {
        // Find terminal input
        const terminalInput = page.locator('[data-terminal-input]:visible').last();
        await expect(terminalInput).toBeVisible();

        // Focus input
        await terminalInput.focus();

        // Verify input has focus
        await expectInputToRemainFocused(terminalInput);

        // Add multiple outputs rapidly (simulates fast command output)
        await addTerminalOutput(
            page,
            Array.from({ length: 20 }, (_, i) => `Rapid output line ${i}`)
        );

        // Wait for all 20 output lines to appear in DOM
        await page.waitForFunction(
            () => {
                const lines = document.querySelectorAll('.terminal-line.terminal-output');
                return lines.length >= 20;
            },
            { timeout: 2000 }
        );

        // Verify input still has focus after rapid updates
        await expectInputToRemainFocused(terminalInput);

        // Verify we can still type without manually refocusing
        await typeWithoutRefocus(page, terminalInput, 'pwd');
    });

    test('Input focus is preserved when executing commands', async ({ page }) => {
        // Find terminal input
        const terminalInput = page.locator('[data-terminal-input]:visible').last();
        await expect(terminalInput).toBeVisible();

        const lineCountBefore = await page.locator('.terminal-line').count();

        // Type and execute a command
        await terminalInput.fill('help');
        await terminalInput.press('Enter');

        // Wait for help command output to appear relative to current output state.
        await expect
            .poll(async () => page.locator('.terminal-line').count(), { timeout: 5000 })
            .toBeGreaterThan(lineCountBefore);

        // Verify input has focus after command execution
        await expectInputToRemainFocused(terminalInput);

        // Verify we can immediately type another command without clicking
        await typeWithoutRefocus(page, terminalInput, 'pwd');
    });

    test('Input focus is preserved after clearing output', async ({ page }) => {
        // Find terminal input
        const terminalInput = page.locator('[data-terminal-input]:visible').last();
        await expect(terminalInput).toBeVisible();

        // Focus input
        await terminalInput.focus();

        // Add some output
        await addTerminalOutput(page, ['Line 1', 'Line 2', 'Line 3']);

        // Wait for output lines to appear
        await page.waitForFunction(
            () => {
                const lines = document.querySelectorAll('.terminal-line.terminal-output');
                return lines.length >= 3;
            },
            { timeout: 2000 }
        );

        // Clear output
        await clearTerminalOutput(page);

        // Wait for output to be cleared (should have 0 output lines)
        await page.waitForFunction(
            () => {
                const lines = document.querySelectorAll('.terminal-line.terminal-output');
                return lines.length === 0;
            },
            { timeout: 2000 }
        );

        // Verify we can still type without manually refocusing.
        await typeWithoutRefocus(page, terminalInput, 'test');
    });
});
