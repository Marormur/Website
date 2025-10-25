// Shared Playwright test utilities for reuse across specs
// CommonJS export to match existing test style

const { expect } = require('@playwright/test');

// Navigation and readiness
async function gotoHome(page, baseURL) {
  await page.goto(baseURL + '/index.html');
  await page.waitForLoadState('load');
  await page.waitForSelector('#dock .dock-tray .dock-item', { timeout: 10000 });
}

// Apple menu helpers
async function openAppleMenu(page) {
  const trigger = page.locator('#apple-menu-trigger');
  await trigger.waitFor({ state: 'visible', timeout: 10000 });
  await trigger.click();
  try {
    await page.waitForSelector('#apple-menu-dropdown', { state: 'visible', timeout: 1500 });
  } catch {
    await trigger.click();
    await page.waitForSelector('#apple-menu-dropdown', { state: 'visible', timeout: 5000 });
  }
}

async function closeAppleMenuIfOpen(page) {
  const desktop = page.locator('#desktop');
  if (await desktop.isVisible()) {
    await desktop.click({ position: { x: 10, y: 10 }, force: true });
  }
}

async function openSettingsViaAppleMenu(page, label) {
  await openAppleMenu(page);
  const menuItem = page.getByRole('menuitem', { name: label });
  await menuItem.waitFor({ state: 'visible', timeout: 10000 });
  await menuItem.click();
  await expect(page.locator('#settings-modal')).toBeVisible({ timeout: 10000 });
  await page.waitForSelector('[data-settings-page]', { state: 'visible', timeout: 10000 });
}

function languageRadio(page, value) {
  return page.locator(`input[name="language-preference"][value="${value}"]`);
}

async function expectAppleMenuSettingsLabel(page, expectedLabel) {
  await closeAppleMenuIfOpen(page);
  await openAppleMenu(page);
  const menuItem = page.getByRole('menuitem', { name: expectedLabel });
  await menuItem.waitFor({ state: 'visible', timeout: 10000 });
  await expect(menuItem).toBeVisible();
}

// Menubar/UI helpers
async function clickDockIcon(page, altText) {
  await page.getByRole('img', { name: altText }).click();
}

async function expectMenuButton(page, label) {
  await expect(page.getByRole('button', { name: label })).toBeVisible();
}

async function expectMenuItem(page, sectionLabel, itemLabel) {
  const section = page.getByRole('button', { name: sectionLabel });
  await section.focus();
  const menuId = await section.getAttribute('aria-controls');
  if (menuId) {
    await page.waitForSelector(`#${menuId}:not(.hidden)`, { timeout: 5000 });
  } else {
    await page.waitForSelector('.menu-dropdown:not(.hidden)', { timeout: 5000 });
  }
  await expect(page.getByRole('menuitem', { name: new RegExp('^' + itemLabel) })).toBeVisible();
}

async function bringModalToFront(page, modalId) {
  const header = page.locator(`#${modalId} .draggable-header`).first();
  await header.click({ position: { x: 10, y: 10 } });
}

async function getProgramLabel(page) {
  return (await page.locator('#program-label').textContent()).trim();
}

// Dock DnD helpers
async function getDockOrder(page) {
  return await page.evaluate(() => Array.from(document.querySelectorAll('#dock .dock-tray .dock-item'))
    .map(it => it.getAttribute('data-window-id'))
    .filter((v) => v !== null));
}

async function dragAfter(page, sourceId, targetId) {
  const srcSel = `#dock .dock-tray .dock-item[data-window-id="${sourceId}"]`;
  const tgtSel = `#dock .dock-tray .dock-item[data-window-id="${targetId}"]`;
  await page.evaluate(({ srcSel, tgtSel }) => {
    const src = document.querySelector(srcSel);
    const tgt = document.querySelector(tgtSel);
    if (!src || !tgt) return;
    const dt = new DataTransfer();
    const fire = (type, el, opts = {}) => {
      const ev = new DragEvent(type, Object.assign({
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX: opts.clientX || 0,
        clientY: opts.clientY || 0
      }, opts));
      el.dispatchEvent(ev);
    };
    const srcRect = src.getBoundingClientRect();
    fire('dragstart', src, { clientX: srcRect.left + srcRect.width / 2, clientY: srcRect.top + srcRect.height / 2 });

    const tgtRect = tgt.getBoundingClientRect();
    const overX = Math.max(0, Math.floor(tgtRect.right - 2));
    const overY = Math.floor(tgtRect.top + tgtRect.height / 2);
    const overEl = document.elementFromPoint(overX, overY) || tgt;
    fire('dragover', overEl, { clientX: overX, clientY: overY });

    fire('drop', tgt, { clientX: overX, clientY: overY });
    fire('dragend', src);
  }, { srcSel, tgtSel });
  await page.waitForTimeout(250);
}

async function dragBefore(page, sourceId, targetId) {
  const srcSel = `#dock .dock-tray .dock-item[data-window-id="${sourceId}"]`;
  const tgtSel = `#dock .dock-tray .dock-item[data-window-id="${targetId}"]`;
  await page.evaluate(({ srcSel, tgtSel }) => {
    const src = document.querySelector(srcSel);
    const tgt = document.querySelector(tgtSel);
    if (!src || !tgt) return;
    const dt = new DataTransfer();
    const fire = (type, el, opts = {}) => {
      const ev = new DragEvent(type, Object.assign({
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX: opts.clientX || 0,
        clientY: opts.clientY || 0
      }, opts));
      el.dispatchEvent(ev);
    };
    const srcRect = src.getBoundingClientRect();
    fire('dragstart', src, { clientX: srcRect.left + srcRect.width / 2, clientY: srcRect.top + srcRect.height / 2 });

    const tgtRect = tgt.getBoundingClientRect();
    const overX = Math.min(window.innerWidth - 1, Math.floor(tgtRect.left + 2));
    const overY = Math.floor(tgtRect.top + tgtRect.height / 2);
    const overEl = document.elementFromPoint(overX, overY) || tgt;
    fire('dragover', overEl, { clientX: overX, clientY: overY });

    fire('drop', tgt, { clientX: overX, clientY: overY });
    fire('dragend', src);
  }, { srcSel, tgtSel });
  await page.waitForTimeout(250);
}

function expectOrderContains(order, beforeId, afterId) {
  const iBefore = order.indexOf(beforeId);
  const iAfter = order.indexOf(afterId);
  expect(iBefore).toBeGreaterThanOrEqual(0);
  expect(iAfter).toBeGreaterThanOrEqual(0);
  expect(iAfter).toBeGreaterThan(iBefore);
}

// Finder / GitHub API mocks
async function mockGithubRepoImageFlow(page, baseURL) {
  const reposPattern = /https:\/\/api\.github\.com\/users\/Marormur\/repos.*/i;
  const contentsRootPattern = /https:\/\/api\.github\.com\/repos\/Marormur\/Website\/contents$/i;
  const contentsImgPattern = /https:\/\/api\.github\.com\/repos\/Marormur\/Website\/contents\/img$/i;

  await page.route(reposPattern, async (route) => {
    const body = [
      { name: 'Website', description: 'Portfolio Website', private: false }
    ];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.route(contentsRootPattern, async (route) => {
    const body = [
      { name: 'img', path: 'img', type: 'dir' },
      { name: 'README.md', path: 'README.md', type: 'file', size: 10 }
    ];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.route(contentsImgPattern, async (route) => {
    const body = [
      {
        name: 'wallpaper.png',
        path: 'img/wallpaper.png',
        type: 'file',
        size: 12345,
        download_url: baseURL.replace(/\/$/, '') + '/img/wallpaper.png'
      }
    ];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

module.exports = {
  // Navigation / Settings / Apple menu
  gotoHome,
  openAppleMenu,
  closeAppleMenuIfOpen,
  openSettingsViaAppleMenu,
  languageRadio,
  expectAppleMenuSettingsLabel,
  // Menubar / UI
  clickDockIcon,
  expectMenuButton,
  expectMenuItem,
  bringModalToFront,
  getProgramLabel,
  // Dock DnD
  getDockOrder,
  dragAfter,
  dragBefore,
  expectOrderContains,
  // Finder / GitHub mocks
  mockGithubRepoImageFlow,
};
