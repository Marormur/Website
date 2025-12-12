// Ensures the first Finder tab does not render duplicate content after page reload
const { test, expect } = require('@playwright/test');
const {
    waitForAppReady,
    waitForFinderReady,
    openFinderWindow,
    getFinderAddTabButton,
    getFinderTabs,
    clickDockIcon,
} = require('../utils');

async function getActiveFinderContainerId(page) {
    return await page.evaluate(() => {
        const reg = window.WindowRegistry;
        if (reg && typeof reg.getActiveWindow === 'function') {
            const active = reg.getActiveWindow();
            if (active && active.windowId) return `${active.windowId}-container`;
        }
        const mgr = window.FinderInstanceManager;
        if (!mgr) return null;
        const active = mgr.getActiveInstance?.();
        return active ? `${active.instanceId}-container` : null;
    });
}

async function countWrappersInActiveContainer(page) {
    const containerId = await getActiveFinderContainerId(page);
    if (!containerId) return { containerId: null, count: -1 };
    const count = await page.evaluate(id => {
        const el = document.getElementById(id);
        if (!el) return -2;
        return el.querySelectorAll('.finder-instance-wrapper').length;
    }, containerId);
    return { containerId, count };
}

test.describe('Finder double content after reload', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('First tab has exactly one content wrapper after reload', async ({ page }) => {
        // Open Finder via helper and ensure readiness
        const finderWindow = await openFinderWindow(page);
        await finderWindow.waitFor({ state: 'visible', timeout: 10000 });
        await waitForFinderReady(page);

        // Create second tab
        const addButton = await getFinderAddTabButton(page, finderWindow);
        await expect(addButton).toBeVisible();
        await addButton.click();

        // Switch explicitly to the first tab
        const tabs = await getFinderTabs(page, finderWindow);
        await expect(tabs.nth(0)).toBeVisible();
        await tabs.nth(0).click();

        // Sanity check before reload: count wrappers
        const before = await countWrappersInActiveContainer(page);
        expect(before.count).toBe(1);

        // Reload
        await page.reload();
        await waitForAppReady(page);

        // Ensure Finder is active (WindowRegistry-aware)
        const isActive = await page.evaluate(() => {
            const reg = window.WindowRegistry;
            if (reg && typeof reg.getAllWindows === 'function')
                return (reg.getAllWindows('finder') || []).length > 0;
            return !!window.FinderInstanceManager?.getActiveInstance?.();
        });
        if (!isActive) {
            await clickDockIcon(page, 'Finder Icon');
            await page.waitForFunction(() => {
                const reg = window.WindowRegistry;
                if (reg && typeof reg.getAllWindows === 'function')
                    return (reg.getAllWindows('finder') || []).length > 0;
                return !!window.FinderInstanceManager?.getActiveInstance?.();
            });
        }

        // Verify only one wrapper is present after restore
        const after = await countWrappersInActiveContainer(page);
        // Provide helpful error details
        if (after.count !== 1) {
            const allContainersInfo = await page.evaluate(() => {
                const nodes = Array.from(document.querySelectorAll('[id$="-container"]'));
                return nodes.map(n => ({
                    id: n.id,
                    hidden: n.classList.contains('hidden'),
                    wrappers: n.querySelectorAll('.finder-instance-wrapper').length,
                }));
            });
            console.log('[DBG] containers=', allContainersInfo);
        }
        expect(after.count).toBe(1);
    });
});
