// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} sourceId
 * @param {string} targetId
 */
async function dragAfter(page, sourceId, targetId) {
    const src = page.locator(`#dock .dock-tray .dock-item[data-window-id="${sourceId}"]`);
    const tgt = page.locator(`#dock .dock-tray .dock-item[data-window-id="${targetId}"]`);
    const box = await tgt.boundingBox();
    await src.dragTo(tgt, {
        targetPosition: {
            x: Math.max(2, (box?.width || 60) - 2),
            y: Math.max(2, (box?.height || 60) / 2),
        },
    });
}

test('Drag & Drop löst keine Textselektion aus', async ({ page }) => {
    await page.goto('/');
    // Warte auf App-Initialisierung
    await page.waitForFunction(() => window.__APP_READY === true, { timeout: 10000 });
    await page.waitForSelector('#dock .dock-tray .dock-item');

    // Sicherheitscheck: Vorherige Selektion leeren
    await page.evaluate(() => window.getSelection()?.removeAllRanges());

    // Führe Drag aus (Terminal hinter Texteditor)
    await dragAfter(page, 'terminal-modal', 'text-modal');

    // Erwartung: Keine Textselektion vorhanden
    const selectionText = await page.evaluate(() => window.getSelection()?.toString() || '');
    expect(selectionText).toBe('');
});
