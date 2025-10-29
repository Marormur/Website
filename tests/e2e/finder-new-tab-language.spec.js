// Verifies that a newly created Finder tab uses the current active language immediately
const { test, expect } = require('@playwright/test');
const { waitForAppReady, clickDockIcon } = require('./utils');

async function getSidebarFavoritesLabel(page) {
  // Read the visible label text for the favorites button in the active container
  return await page.evaluate(() => {
    const mgr = window.FinderInstanceManager;
    const active = mgr?.getActiveInstance?.();
    if (!active) return null;
    const el = document.getElementById(`${active.instanceId}-container`);
    if (!el) return null;
    const btn = el.querySelector('[data-finder-sidebar-favorites]');
    return btn ? btn.textContent.trim() : null;
  });
}

test.describe('Finder new tab language', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(baseURL + '/index.html');
    await waitForAppReady(page);
  });

  test('new Finder tab uses current language', async ({ page }) => {
    // Read active language from app and derive expected label
    const expected = await page.evaluate(() => {
      try {
        if (window.appI18n && typeof window.appI18n.translate === 'function') {
          return window.appI18n.translate('finder.sidebar.starred');
        }
      } catch {}
      // Fallback
      const lang = (window.appI18n?.getActiveLanguage?.() || document.documentElement?.lang || 'de').toLowerCase();
      return lang.startsWith('de') ? 'Mit Stern' : 'Starred';
    });

    // Open Finder and create a new tab
    await clickDockIcon(page, 'Finder Icon');
    await expect(page.locator('#finder-modal')).not.toHaveClass(/hidden/);

    const addButton = page.locator('#finder-tabs-container .wt-add');
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Switch to the newly created tab (last)
    const tabs = page.locator('#finder-tabs-container .wt-tab');
    const count = await tabs.count();
    await tabs.nth(count - 1).click();

    // Wait until the favorites button is visible in the active container
    await page.waitForSelector('#finder-container .finder-instance-container:not(.hidden) [data-finder-sidebar-favorites]');

    // Expect the sidebar favorites label to match active language
    const label = await getSidebarFavoritesLabel(page);
    // Allow extra whitespace or icon spans; just check presence
    expect((label || '').replace(/\s+/g,' ').includes(expected)).toBeTruthy();
  });
});
