// @ts-check
const { test, expect } = require('@playwright/test');
const { getDockOrder, dragAfter, dragBefore, expectOrderContains } = require('../utils');

test.describe('Dock Drag & Drop Reordering', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('#dock .dock-tray .dock-item');
    });

    test('verschiebe Terminal hinter Texteditor und persistiere über Reload', async ({ page }) => {
        const terminal = 'terminal-modal';
        const text = 'text-modal';

        const initial = await getDockOrder(page);
        // Wenn bereits in dieser Reihenfolge, tausche erst zurück
        if (initial.indexOf(terminal) > initial.indexOf(text)) {
            await dragBefore(page, terminal, text);
            await expect.poll(() => getDockOrder(page)).not.toEqual(initial);
        }

        // Ziehe Terminal nach Texteditor
        await dragAfter(page, terminal, text);

        const after = await getDockOrder(page);
        expect(after).toContain(terminal);
        expect(after).toContain(text);
        expectOrderContains(after, text, terminal);

        // Nach Reload bleibt Reihenfolge stabil
        await page.reload();
        await page.waitForSelector('#dock .dock-tray .dock-item');
        const afterReload = await getDockOrder(page);
        expect(afterReload).toEqual(after);
    });

    test('kann letztes Icon (Einstellungen) nach ganz vorne ziehen', async ({ page }) => {
        const firstId = (await getDockOrder(page))[0];
        const settings = 'settings-modal';

        // Ziehe Settings vor erstes Icon
        await dragBefore(page, settings, firstId);

        const order = await getDockOrder(page);
        expect(order[0]).toBe(settings);

        // Wieder zurück ans Ende, um Seiteneffekte zu vermeiden
        const lastTarget =
            order[order.length - 1] === settings
                ? order[order.length - 2]
                : order[order.length - 1];
        await dragAfter(page, settings, lastTarget);
    });
});
