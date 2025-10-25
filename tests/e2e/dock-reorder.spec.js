// E2E test for Dock drag & drop reordering and persistence
const { test, expect } = require('@playwright/test');

async function getDockOrder(page) {
  return await page.locator('#dock .dock-item').evaluateAll(nodes =>
    nodes.map(n => n.getAttribute('data-window-id')).filter(Boolean)
  );
}

test.describe('Dock drag & drop reordering', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(baseURL + '/index.html');
  });

  test('reorders Finder after Texteditor and persists across reload', async ({ page }) => {
    // Initial order sanity check
    const initial = await getDockOrder(page);
    expect(initial).toContain('finder-modal');
    expect(initial).toContain('text-modal');

    // Drag Finder onto Texteditor (to the right side) to place it after
    const finder = page.locator('#dock .dock-item[data-window-id="finder-modal"]');
    const text = page.locator('#dock .dock-item[data-window-id="text-modal"]');

    // Use low-level mouse operations to bias drop on the right half of target
    const fbb = await finder.boundingBox();
    const tbb = await text.boundingBox();
    expect(fbb).not.toBeNull();
    expect(tbb).not.toBeNull();
    if (!fbb || !tbb) test.skip();

    await page.mouse.move(fbb.x + fbb.width / 2, fbb.y + fbb.height / 2);
    await page.mouse.down();
    // Move to slightly right of target center
    await page.mouse.move(tbb.x + (tbb.width * 0.75), tbb.y + tbb.height / 2);
    await page.mouse.up();

    // Order should now have finder-modal after text-modal
    const after = await getDockOrder(page);
    const idxFinder = after.indexOf('finder-modal');
    const idxText = after.indexOf('text-modal');
    expect(idxFinder).toBeGreaterThan(idxText);

    // Reload: order should persist
    await page.reload();
    const persisted = await getDockOrder(page);
    expect(persisted.indexOf('finder-modal')).toBeGreaterThan(persisted.indexOf('text-modal'));
  });
});
