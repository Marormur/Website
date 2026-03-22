/**
 * Terminal UNIX Basics (VFS-backed)
 * Verifies macOS-like baseline workflows for Terminal + Finder filesystem semantics.
 */

const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

async function openTerminal(page) {
    const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
    await terminalDockItem.waitFor({ state: 'visible' });
    await terminalDockItem.click();

    await page.waitForFunction(() => {
        const wins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
        return wins.length > 0 && wins[0]?.activeSession;
    });
}

async function exec(page, command) {
    await page.evaluate(cmd => {
        const w = /** @type {any} */ (window);
        const win = w.WindowRegistry?.getAllWindows?.('terminal')?.[0];
        const session = win?.activeSession;
        if (session && typeof session.executeCommand === 'function') {
            session.executeCommand(cmd);
        }
    }, command);
}

async function outputTail(page, count = 10) {
    return await page.evaluate(n => {
        const w = /** @type {any} */ (window);
        const win = w.WindowRegistry?.getAllWindows?.('terminal')?.[0];
        const out = win?.activeSession?.outputElement;
        if (!out) return [];
        const lines = Array.from(out.children).map(el => el.textContent || '');
        return lines.slice(Math.max(0, lines.length - n));
    }, count);
}

test.describe('Terminal UNIX basics', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
        await openTerminal(page);
    });

    test('help zeigt neue core commands', async ({ page }) => {
        await exec(page, 'help');
        const tail = await outputTail(page, 30);

        expect(tail.some(line => line.includes('exit'))).toBe(true);
        expect(tail.some(line => line.includes('cp [-r]'))).toBe(true);
        expect(tail.some(line => line.includes('mv <src> <dst>'))).toBe(true);
        expect(tail.some(line => line.includes('rmdir [-p]'))).toBe(true);
        expect(tail.some(line => line.includes('head [-n N]'))).toBe(true);
        expect(tail.some(line => line.includes('tail [-n N]'))).toBe(true);
        expect(tail.some(line => line.includes('Pipe/Redirect'))).toBe(true);
    });

    test('exit beendet die aktuelle Terminal-Sitzung', async ({ page }) => {
        await exec(page, 'exit');

        await page.waitForFunction(() => {
            const wins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            return wins.length === 0;
        });

        const terminalWindows = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows?.('terminal') || [];
            return wins.length;
        });
        expect(terminalWindows).toBe(0);
    });

    test('cp/mv workflow auf VFS Dateien', async ({ page }) => {
        await exec(page, 'touch alpha.txt');
        await exec(page, 'echo hello > alpha.txt');
        await exec(page, 'cp alpha.txt beta.txt');

        const existsAfterCp = await page.evaluate(() => {
            const w = /** @type {any} */ (window);
            return {
                alpha: !!w.VirtualFS?.getFile?.('/home/marvin/alpha.txt'),
                beta: !!w.VirtualFS?.getFile?.('/home/marvin/beta.txt'),
                betaContent: w.VirtualFS?.readFile?.('/home/marvin/beta.txt') || '',
            };
        });

        expect(existsAfterCp.alpha).toBe(true);
        expect(existsAfterCp.beta).toBe(true);
        expect(existsAfterCp.betaContent).toBe('hello');

        await exec(page, 'mv beta.txt gamma.txt');

        const existsAfterMv = await page.evaluate(() => {
            const w = /** @type {any} */ (window);
            return {
                beta: !!w.VirtualFS?.getFile?.('/home/marvin/beta.txt'),
                gamma: !!w.VirtualFS?.getFile?.('/home/marvin/gamma.txt'),
                gammaContent: w.VirtualFS?.readFile?.('/home/marvin/gamma.txt') || '',
            };
        });

        expect(existsAfterMv.beta).toBe(false);
        expect(existsAfterMv.gamma).toBe(true);
        expect(existsAfterMv.gammaContent).toBe('hello');
    });

    test('rmdir entfernt nur leere Verzeichnisse', async ({ page }) => {
        await exec(page, 'mkdir empty-dir');
        await exec(page, 'rmdir empty-dir');

        const stateAfterEmpty = await page.evaluate(() => {
            const w = /** @type {any} */ (window);
            return {
                emptyExists: !!w.VirtualFS?.getFolder?.('/home/marvin/empty-dir'),
            };
        });
        expect(stateAfterEmpty.emptyExists).toBe(false);

        await exec(page, 'mkdir non-empty');
        await exec(page, 'touch non-empty/file.txt');
        await exec(page, 'rmdir non-empty');

        const stateAfterNonEmpty = await page.evaluate(() => {
            const w = /** @type {any} */ (window);
            return {
                nonEmptyExists: !!w.VirtualFS?.getFolder?.('/home/marvin/non-empty'),
            };
        });
        expect(stateAfterNonEmpty.nonEmptyExists).toBe(true);

        const tail = await outputTail(page, 8);
        expect(tail.some(line => line.includes('Verzeichnis nicht leer'))).toBe(true);
    });

    test('head/tail auf Dateiinhalt', async ({ page }) => {
        await exec(page, 'echo "a\nb\nc\nd\ne" > lines.txt');
        await exec(page, 'head -n 2 lines.txt');

        let tail = await outputTail(page, 8);
        expect(tail.some(line => line === 'a')).toBe(true);
        expect(tail.some(line => line === 'b')).toBe(true);

        await exec(page, 'tail -n 2 lines.txt');
        tail = await outputTail(page, 8);
        expect(tail.some(line => line === 'd')).toBe(true);
        expect(tail.some(line => line === 'e')).toBe(true);
    });

    test('pipe + redirect workflow', async ({ page }) => {
        await exec(page, 'echo "one\ntwo\nthree\nfour" > piped.txt');
        await exec(page, 'cat piped.txt | head -n 3 > out.txt');

        const out = await page.evaluate(() => {
            const w = /** @type {any} */ (window);
            return w.VirtualFS?.readFile?.('/home/marvin/out.txt');
        });
        expect(out).toBe('one\ntwo\nthree');

        await exec(page, 'cat out.txt | tail -n 1');
        const tail = await outputTail(page, 6);
        expect(tail.some(line => line === 'three')).toBe(true);
    });

    test('input redirection mit head', async ({ page }) => {
        await exec(page, 'echo "x\ny\nz" > in.txt');
        await exec(page, 'head -n 2 < in.txt');

        const tail = await outputTail(page, 6);
        expect(tail.some(line => line === 'x')).toBe(true);
        expect(tail.some(line => line === 'y')).toBe(true);
    });
});
