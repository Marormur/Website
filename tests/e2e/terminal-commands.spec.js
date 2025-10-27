// Terminal command and path handling tests
const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('./utils');

test.describe('Terminal - Command and Path Handling', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);

        // Dock should be ready by now; proceed to open Terminal

        // Open Terminal - use more specific selector for dock item only
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();

        // Wait for terminal modal to be visible
        await expect(page.locator('#terminal-modal')).toBeVisible({
            timeout: 5000,
        });

        // Wait for terminal to be initialized - old system uses .terminal-input class
        await page.waitForSelector('.terminal-input', { timeout: 5000 });
        // Wait for at least one output line (welcome) so terminal is initialized
        await page.waitForSelector('.terminal-output .terminal-line', { timeout: 5000 });
    });

    /**
     * Helper function to execute a command in the terminal
     */
    async function executeCommand(page, command) {
        const input = page.locator('.terminal-input');
        await input.fill(command);
        // Capture current output count before executing
        const prevCount = await page.locator('.terminal-output .terminal-line').count();
        await input.press('Enter');
        // Special-case commands that clear output (no new line expected)
        if (command.trim() === 'clear') {
            // Wait until output is empty
            await page.waitForFunction(
                () => {
                    try {
                        return (
                            document.querySelectorAll('.terminal-output .terminal-line').length ===
                            0
                        );
                    } catch {
                        return false;
                    }
                },
                { timeout: 5000 }
            );
        } else {
            // Wait for a new output line to appear after executing the command
            await page.waitForFunction(
                prev => {
                    try {
                        return (
                            document.querySelectorAll('.terminal-output .terminal-line').length >
                            prev
                        );
                    } catch {
                        return false;
                    }
                },
                prevCount,
                { timeout: 5000 }
            );
        }
    }

    /**
     * Helper function to get terminal output lines
     */
    async function getOutputLines(page) {
        const output = page.locator('.terminal-output .terminal-line');
        return await output.allTextContents();
    }

    /**
     * Helper function to get the last output line
     */
    async function getLastOutput(page) {
        const lines = await getOutputLines(page);
        return lines[lines.length - 1] || '';
    }

    test('should display welcome message on load', async ({ page }) => {
        const output = await getOutputLines(page);
        const hasWelcome = output.some(
            line => line.includes('Willkommen') || line.includes('help')
        );
        expect(hasWelcome).toBe(true);
    });

    test('should execute help command', async ({ page }) => {
        await executeCommand(page, 'help');

        const output = await getOutputLines(page);
        const hasHelpText = output.some(
            line => line.includes('Verfügbare Befehle') || line.includes('help')
        );
        expect(hasHelpText).toBe(true);
    });

    test('should execute pwd command', async ({ page }) => {
        await executeCommand(page, 'pwd');

        const lastLine = await getLastOutput(page);
        expect(lastLine).toBe('~');
    });

    test('should execute ls command', async ({ page }) => {
        await executeCommand(page, 'ls');

        const output = await getOutputLines(page);
        // Should show Desktop, Documents, Downloads, welcome.txt
        const hasDesktop = output.some(line => line.includes('Desktop'));
        const hasDocuments = output.some(line => line.includes('Documents'));
        const hasWelcomeFile = output.some(line => line.includes('welcome.txt'));

        expect(hasDesktop).toBe(true);
        expect(hasDocuments).toBe(true);
        expect(hasWelcomeFile).toBe(true);
    });

    test('should execute cat with simple filename', async ({ page }) => {
        await executeCommand(page, 'cat welcome.txt');

        const output = await getOutputLines(page);
        const hasContent = output.some(line => line.includes('Willkommen auf Marvins Portfolio'));
        expect(hasContent).toBe(true);
    });

    test('should execute cat with ./ prefix', async ({ page }) => {
        await executeCommand(page, 'cat ./welcome.txt');

        const output = await getOutputLines(page);
        console.log('Output after "cat ./welcome.txt":', output);

        const hasContent = output.some(line => line.includes('Willkommen auf Marvins Portfolio'));
        const hasError = output.some(line => line.includes('nicht gefunden'));

        if (hasError) {
            console.error('ERROR: File not found with ./ prefix!');
            console.log('All output lines:', output);
        }

        expect(hasError).toBe(false);
        expect(hasContent).toBe(true);
    });

    test('should change directory with cd', async ({ page }) => {
        await executeCommand(page, 'cd Documents');
        await executeCommand(page, 'pwd');

        const lastLine = await getLastOutput(page);
        expect(lastLine).toBe('~/Documents');
    });

    test('should change directory with cd ./', async ({ page }) => {
        await executeCommand(page, 'cd ./Documents');
        await executeCommand(page, 'pwd');

        const lastLine = await getLastOutput(page);
        expect(lastLine).toBe('~/Documents');
    });

    test('should handle cd . (current directory)', async ({ page }) => {
        await executeCommand(page, 'cd Documents');
        await executeCommand(page, 'cd .');
        await executeCommand(page, 'pwd');

        const lastLine = await getLastOutput(page);
        expect(lastLine).toBe('~/Documents');
    });

    test('should handle cd .. (parent directory)', async ({ page }) => {
        await executeCommand(page, 'cd Documents');
        await executeCommand(page, 'cd ..');
        await executeCommand(page, 'pwd');

        const lastLine = await getLastOutput(page);
        expect(lastLine).toBe('~');
    });

    test('should handle cd ~ (home directory)', async ({ page }) => {
        await executeCommand(page, 'cd Documents');
        await executeCommand(page, 'cd ~');
        await executeCommand(page, 'pwd');

        const lastLine = await getLastOutput(page);
        expect(lastLine).toBe('~');
    });

    test('should list directory with ls <path>', async ({ page }) => {
        await executeCommand(page, 'ls Documents');

        const output = await getOutputLines(page);
        const hasReadme = output.some(line => line.includes('readme.txt'));
        expect(hasReadme).toBe(true);
    });

    test('should list directory with ls ./', async ({ page }) => {
        await executeCommand(page, 'ls ./');

        const output = await getOutputLines(page);
        const hasDesktop = output.some(line => line.includes('Desktop'));
        expect(hasDesktop).toBe(true);
    });

    test('should cat file in subdirectory', async ({ page }) => {
        await executeCommand(page, 'cat Documents/readme.txt');

        const output = await getOutputLines(page);
        const hasContent = output.some(line => line.includes('Willkommen im Terminal'));
        expect(hasContent).toBe(true);
    });

    test('should cat file with relative path from subdirectory', async ({ page }) => {
        await executeCommand(page, 'cd Documents');
        await executeCommand(page, 'cat readme.txt');

        const output = await getOutputLines(page);
        const hasContent = output.some(line => line.includes('Willkommen im Terminal'));
        expect(hasContent).toBe(true);
    });

    test('should cat file with ../ from subdirectory', async ({ page }) => {
        await executeCommand(page, 'cd Documents');
        await executeCommand(page, 'cat ../welcome.txt');

        const output = await getOutputLines(page);
        console.log('Output after "cat ../welcome.txt":', output);

        const hasContent = output.some(line => line.includes('Willkommen auf Marvins Portfolio'));
        const hasError = output.some(line => line.includes('nicht gefunden'));

        if (hasError) {
            console.error('ERROR: File not found with ../ prefix!');
        }

        expect(hasError).toBe(false);
        expect(hasContent).toBe(true);
    });

    test('should show error for non-existent file', async ({ page }) => {
        await executeCommand(page, 'cat nonexistent.txt');

        const output = await getOutputLines(page);
        const hasError = output.some(line => line.includes('nicht gefunden'));
        expect(hasError).toBe(true);
    });

    test('should show error for non-existent directory', async ({ page }) => {
        await executeCommand(page, 'cd nonexistent');

        const output = await getOutputLines(page);
        const hasError = output.some(line => line.includes('nicht gefunden'));
        expect(hasError).toBe(true);
    });

    test('should handle tab completion for commands', async ({ page }) => {
        const input = page.locator('.terminal-input');
        await input.fill('hel');
        await input.press('Tab');

        const value = await input.inputValue();
        expect(value).toBe('help ');
    });

    test('should clear terminal with clear command', async ({ page }) => {
        await executeCommand(page, 'ls');
        await executeCommand(page, 'clear');

        const outputLines = await page.locator('.terminal-output .terminal-line').count();
        expect(outputLines).toBe(0);
    });

    test('should navigate command history with arrow up', async ({ page }) => {
        const input = page.locator('.terminal-input');

        await executeCommand(page, 'pwd');
        await executeCommand(page, 'ls');

        await input.press('ArrowUp');
        let value = await input.inputValue();
        expect(value).toBe('ls');

        await input.press('ArrowUp');
        value = await input.inputValue();
        expect(value).toBe('pwd');
    });
});
