import { test, expect } from '@playwright/test';
import utils from '../utils.js';

test('All .modal elements should be direct children of <body> after init', async ({ page }) => {
    await page.goto('/');
    await utils.waitForAppReady(page);
    const result = await page.evaluate(() => {
        const mods = Array.from(document.querySelectorAll('.modal'));
        return mods.map(m => ({
            id: m.id || null,
            parentId: m.parentElement ? m.parentElement.id || m.parentElement.tagName : null,
        }));
    });
    for (const m of result) {
        if (m.parentId !== 'BODY') {
            throw new Error(
                `Modal ${m.id || '<no-id>'} is not direct child of BODY (parent: ${m.parentId})`
            );
        }
    }
});
