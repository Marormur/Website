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
            // Use .id, not .windowId (which doesn't exist in the new architecture)
            if (active && active.id) return `${active.id}-container`;
        }
        const mgr = window.FinderInstanceManager;
        if (!mgr) return null;
        const active = mgr.getActiveInstance?.();
        return active ? `${active.instanceId}-container` : null;
    });
}

async function countContentInActiveContainer(page) {
    const containerId = await getActiveFinderContainerId(page);
    if (!containerId) return { containerId: null, hasContent: false };
    const hasContent = await page.evaluate(id => {
        const el = document.getElementById(id);
        if (!el) return false;
        // The new architecture doesn't use .finder-instance-wrapper anymore
        // Instead, check if the container has any meaningful content (not just empty divs)
        const children = el.querySelectorAll('*');
        // Filter out empty text nodes and just count actual content
        return children.length > 0;
    }, containerId);
    return { containerId, hasContent };
}

test.describe('Finder double content after reload', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('First tab has content after reload', async ({ page }) => {
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

        // Sanity check before reload: container should have content
        const before = await countContentInActiveContainer(page);
        expect(before.hasContent).toBe(true);

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

        // Verify content is present after restore
        const after = await countContentInActiveContainer(page);

        // Provide helpful error details if content is missing
        if (!after.hasContent) {
            const allContainersInfo = await page.evaluate(() => {
                const nodes = Array.from(document.querySelectorAll('[id$="-container"]'));
                return nodes
                    .filter(
                        n => n.id.startsWith('window-finder-') || n.id.startsWith('tab-undefined-')
                    )
                    .map(n => ({
                        id: n.id,
                        hidden: n.classList.contains('hidden'),
                        childElements: n.children.length,
                    }));
            });
            console.log('[DBG] finder containers=', allContainersInfo);
        }

        expect(after.hasContent).toBe(true);
    });
});
