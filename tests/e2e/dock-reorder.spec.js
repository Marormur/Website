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
    const targetBox = await tgt.boundingBox();
    const srcBox = await src.boundingBox();
    
    if (!targetBox || !srcBox) {
        throw new Error('Could not get bounding boxes for drag operation');
    }
    
    // Calculate the center of target + half of its width to drop AFTER it
    const dropX = targetBox.x + targetBox.width + 10;
    const dropY = targetBox.y + targetBox.height / 2;
    
    // Start from center of source
    const startX = srcBox.x + srcBox.width / 2;
    const startY = srcBox.y + srcBox.height / 2;
    
    // Use mouse to ensure precise positioning
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(dropX, dropY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200); // Wait for reorder to complete
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} sourceId
 * @param {string} targetId
 */
async function dragBefore(page, sourceId, targetId) {
    const src = page.locator(`#dock .dock-tray .dock-item[data-window-id="${sourceId}"]`);
    const tgt = page.locator(`#dock .dock-tray .dock-item[data-window-id="${targetId}"]`);
    const targetBox = await tgt.boundingBox();
    const srcBox = await src.boundingBox();
    
    if (!targetBox || !srcBox) {
        throw new Error('Could not get bounding boxes for drag operation');
    }
    
    // Calculate the center of target - some offset to drop BEFORE it
    const dropX = targetBox.x - 10;
    const dropY = targetBox.y + targetBox.height / 2;
    
    // Start from center of source
    const startX = srcBox.x + srcBox.width / 2;
    const startY = srcBox.y + srcBox.height / 2;
    
    // Use mouse to ensure precise positioning
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(dropX, dropY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200); // Wait for reorder to complete
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
    // Just check that afterId comes after beforeId, not necessarily directly adjacent
    expect(iAfter).toBeGreaterThan(iBefore);
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
