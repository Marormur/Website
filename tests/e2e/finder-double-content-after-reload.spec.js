// Ensures the first Finder tab does not render duplicate content after page reload
const { test, expect } = require('@playwright/test');
const { waitForAppReady, clickDockIcon } = require('./utils');

async function getActiveFinderContainerId(page) {
  return await page.evaluate(() => {
    const mgr = window.FinderInstanceManager;
    if (!mgr) return null;
    const active = mgr.getActiveInstance?.();
    return active ? `${active.instanceId}-container` : null;
  });
}

async function countWrappersInActiveContainer(page) {
  const containerId = await getActiveFinderContainerId(page);
  if (!containerId) return { containerId: null, count: -1 };
  const count = await page.evaluate((id) => {
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
    // Open Finder
    await clickDockIcon(page, 'Finder Icon');
    await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

    // Ensure at least one instance exists
    await page.waitForFunction(() => !!window.FinderInstanceManager?.getActiveInstance?.());

    // Create second tab
    const addButton = page.locator('#finder-tabs-container .wt-add');
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Switch explicitly to the first tab
    const tabs = page.locator('#finder-tabs-container .wt-tab');
    await expect(tabs.nth(0)).toBeVisible();
    await tabs.nth(0).click();

    // Sanity check before reload: count wrappers
    const before = await countWrappersInActiveContainer(page);
    expect(before.count).toBe(1);

    // Reload
    await page.reload();
    await waitForAppReady(page);

    // If Finder is hidden, open
    const finderModal = page.locator('#finder-modal');
    const cls = await finderModal.getAttribute('class');
    if (!cls || /hidden/.test(cls)) {
      await clickDockIcon(page, 'Finder Icon');
    }

    // Verify only one wrapper is present after restore
    const after = await countWrappersInActiveContainer(page);
    // Provide helpful error details
    if (after.count !== 1) {
      const allContainersInfo = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('#finder-container > div'));
        return nodes.map(n => ({ id: n.id, hidden: n.classList.contains('hidden'), wrappers: n.querySelectorAll('.finder-instance-wrapper').length }));
      });
      console.log('[DBG] containers=', allContainersInfo);
    }
    expect(after.count).toBe(1);
  });
});
