// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[]>}
 */
async function getDockOrder(page) {
    return await page.evaluate(() => Array.from(document.querySelectorAll('#dock .dock-tray .dock-item'))
        .map(it => it.getAttribute('data-window-id'))
        .filter((v) => v !== null));
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} sourceId
 * @param {string} targetId
 */
async function dragAfter(page, sourceId, targetId) {
    const src = page.locator(`#dock .dock-tray .dock-item[data-window-id="${sourceId}"]`);
    const tgt = page.locator(`#dock .dock-tray .dock-item[data-window-id="${targetId}"]`);
    const box = await tgt.boundingBox();
    // Drop an die rechte Kante des Ziels, um "nach" zu platzieren
    await src.dragTo(tgt, { targetPosition: { x: Math.max(2, (box?.width || 60) - 2), y: Math.max(2, (box?.height || 60) / 2) } });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} sourceId
 * @param {string} targetId
 */
async function dragBefore(page, sourceId, targetId) {
    const src = page.locator(`#dock .dock-tray .dock-item[data-window-id="${sourceId}"]`);
    const tgt = page.locator(`#dock .dock-tray .dock-item[data-window-id="${targetId}"]`);
    // Linke Kante für "vor"
    await src.dragTo(tgt, { targetPosition: { x: 2, y: 16 } });
}

/**
 * @param {string[]} order
 * @param {string} beforeId
 * @param {string} afterId
 */
function expectOrderContains(order, beforeId, afterId) {
    const iBefore = order.indexOf(beforeId);
    const iAfter = order.indexOf(afterId);
    expect(iBefore).toBeGreaterThanOrEqual(0);
    expect(iAfter).toBeGreaterThanOrEqual(0);
    expect(iAfter).toBe(iBefore + 1);
}

test.describe('Dock Drag & Drop Reordering', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('#dock .dock-tray .dock-item');
    });

    test('verschiebe Finder hinter Texteditor und persistiere über Reload', async ({ page }) => {
        const finder = 'finder-modal';
        const text = 'text-modal';

        const initial = await getDockOrder(page);
        // Wenn bereits in dieser Reihenfolge, tausche erst zurück
        if (initial.indexOf(finder) > initial.indexOf(text)) {
            await dragBefore(page, finder, text);
            await expect.poll(() => getDockOrder(page)).not.toEqual(initial);
        }

        // Ziehe Finder nach Texteditor
        await dragAfter(page, finder, text);

        const after = await getDockOrder(page);
        expect(after).toContain(finder);
        expect(after).toContain(text);
        expectOrderContains(after, text, finder);

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
        const lastTarget = order[order.length - 1] === settings ? order[order.length - 2] : order[order.length - 1];
        await dragAfter(page, settings, lastTarget);
    });
});
