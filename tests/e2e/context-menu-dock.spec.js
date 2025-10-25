// E2E test for dock-specific context menu entries (Open/Quit/Options)
const { test, expect } = require('@playwright/test');

async function openContextMenuOnDockItem(page, windowId) {
  const item = page.locator(`#dock .dock-item[data-window-id="${windowId}"]`);
  await item.click({ button: 'right' });
}

test.describe('Dock context menu', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(baseURL + '/index.html');
  });

  test('shows Open and Options when app is closed; adds Quit when open', async ({ page }) => {
    // On closed Finder, no Quit should be visible
    await openContextMenuOnDockItem(page, 'finder-modal');
    await expect(page.getByRole('menuitem', { name: 'Öffnen' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Optionen' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Beenden' })).toHaveCount(0);

    // Close context menu by clicking somewhere
    await page.mouse.click(5, 5);

    // Open Finder via dock (left click on image)
    await page.getByRole('img', { name: 'Finder Icon' }).click();
    await expect(page.locator('#finder-modal')).toBeVisible();

    // Now right-click again → Quit should be present
    await openContextMenuOnDockItem(page, 'finder-modal');
    await expect(page.getByRole('menuitem', { name: 'Beenden' })).toBeVisible();
  });
});
