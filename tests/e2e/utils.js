// Shared Playwright test utilities for reuse across specs
// CommonJS export to match existing test style

const { expect } = require('@playwright/test');

// Navigation and readiness
async function gotoHome(page, baseURL) {
    // Set USE_BUNDLE flag if env var is set (BEFORE navigation)
    if (typeof process.env.USE_BUNDLE !== 'undefined') {
        const flag =
            process.env.USE_BUNDLE === '1'
                ? true
                : process.env.USE_BUNDLE === '0'
                  ? false
                  : undefined;
        if (typeof flag !== 'undefined') {
            await page.addInitScript(val => {
                window.__USE_BUNDLE__ = val;
            }, flag);
            console.log(`[Test Utils] Bundle mode via USE_BUNDLE=${process.env.USE_BUNDLE}`);
        }
    }

    // Use networkidle for bundle mode to ensure large JS finishes loading
    const waitUntil = process.env.USE_BUNDLE === '1' ? 'networkidle' : 'load';
    await page.goto(baseURL + '/index.html', { waitUntil, timeout: 30000 });

    // Wait for critical DOM elements
    await page.waitForSelector('#dock .dock-tray .dock-item', {
        timeout: 15000,
    });
}

// Wait for application readiness signaled by app-init.js
async function waitForAppReady(page, timeout = 20000) {
    // Optional: enable GitHub API mocks for smoke tests to avoid rate limits/flakiness
    await ensureGithubMocksIfRequested(page);
    // First ensure DOMContentLoaded at least
    try {
        await page.waitForLoadState('domcontentloaded', { timeout: Math.min(timeout, 8000) });
    } catch {
        /* ignore */
    }
    // Wait for app readiness flag with extended timeout for bundle mode
    await page.waitForFunction(
        () => {
            // Prefer a strict boolean check
            return typeof window !== 'undefined' && window.__APP_READY === true;
        },
        { timeout }
    );
}

// Apple menu helpers
async function openAppleMenu(page) {
    const trigger = page.locator('#apple-menu-trigger');
    await trigger.waitFor({ state: 'visible', timeout: 10000 });
    await trigger.click();
    try {
        await page.waitForSelector('#apple-menu-dropdown', {
            state: 'visible',
            timeout: 1500,
        });
    } catch {
        await trigger.click();
        await page.waitForSelector('#apple-menu-dropdown', {
            state: 'visible',
            timeout: 5000,
        });
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
    await expect(page.locator('#settings-modal')).toBeVisible({
        timeout: 10000,
    });
    await page.waitForSelector('[data-settings-page]', {
        state: 'visible',
        timeout: 10000,
    });
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
async function clickDockIcon(page, identifier) {
    // Prefer stable data-window-id based clicks when a modal id is provided
    try {
        if (typeof identifier === 'string' && identifier.endsWith('-modal')) {
            const name = identifier.replace(/-modal$/, '');
            // Try exact match first
            const exactSel = `#dock .dock-tray .dock-item[data-window-id="${identifier}"]`;
            let el = page.locator(exactSel).first();
            if ((await el.count()) > 0) {
                try {
                    await el.waitFor({ state: 'visible', timeout: 4000 });
                    await el.click();
                    return;
                } catch {}
            }
            // Try new multi-window pattern: data-window-id starting with window-{name}-
            const prefixSel = `#dock .dock-tray .dock-item[data-window-id^="window-${name}-"]`;
            el = page.locator(prefixSel).first();
            if ((await el.count()) > 0) {
                try {
                    await el.waitFor({ state: 'visible', timeout: 4000 });
                    await el.click();
                    return;
                } catch {}
            }
            // Try contains fallback
            const containsSel = `#dock .dock-tray .dock-item[data-window-id*="${name}"]`;
            el = page.locator(containsSel).first();
            if ((await el.count()) > 0) {
                try {
                    await el.waitFor({ state: 'visible', timeout: 4000 });
                    await el.click();
                    return;
                } catch {}
            }
        }
    } catch (e) {
        // fallthrough to legacy behaviour
    }

    // Legacy: click image by accessible name (alt text) or fallback by matching image alt that contains the identifier
    try {
        await page.getByRole('img', { name: identifier }).click();
        return;
    } catch {}

    // Last resort: try to find an img whose accessible name contains the identifier (case-insensitive)
    const imgs = page.locator('#dock .dock-tray img');
    const count = await imgs.count();
    for (let i = 0; i < count; i++) {
        const img = imgs.nth(i);
        try {
            const name =
                (await img.getAttribute('alt')) || (await img.getAttribute('aria-label')) || '';
            if (name && name.toLowerCase().includes(String(identifier).toLowerCase())) {
                await img.click();
                return;
            }
        } catch {}
    }

    // Final fallback: use WindowManager directly if dock icon cannot be found
    try {
        const result = await page.evaluate(id => {
            const wm = window.WindowManager;
            if (wm && typeof wm.open === 'function') {
                wm.open(id);
                return true;
            }
            return false;
        }, identifier);

        if (result) {
            // Opened successfully via WindowManager
            return;
        }
    } catch (e) {
        // fallthrough
    }

    // If nothing worked, throw to signal the caller
    throw new Error(`Unable to click dock icon for identifier: ${identifier}`);
}

async function expectMenuButton(page, label) {
    await expect(page.getByRole('button', { name: label })).toBeVisible();
}

async function expectMenuItem(page, sectionLabel, itemLabel) {
    const section = page.getByRole('button', { name: sectionLabel });
    await section.focus();
    const menuId = await section.getAttribute('aria-controls');
    if (menuId) {
        await page.waitForSelector(`#${menuId}:not(.hidden)`, {
            timeout: 5000,
        });
    } else {
        await page.waitForSelector('.menu-dropdown:not(.hidden)', {
            timeout: 5000,
        });
    }
    const pattern = itemLabel instanceof RegExp ? itemLabel : new RegExp('^' + itemLabel);
    await expect(page.getByRole('menuitem', { name: pattern })).toBeVisible();
}

async function bringModalToFront(page, modalId) {
    // Support both legacy modal id (e.g. 'finder-modal') and new multi-window pattern
    try {
        if (typeof modalId === 'string' && modalId.endsWith('-modal')) {
            const name = modalId.replace(/-modal$/, '');
            const sel = `.modal.multi-window[id^="window-${name}-"]`;
            const win = page.locator(sel).first();
            if ((await win.count()) > 0) {
                const header = win.locator('.draggable-header').first();
                await header.click({ position: { x: 10, y: 10 } });
                return;
            }
        }
    } catch (e) {
        // fall through to legacy behavior
    }

    const header = page.locator(`#${modalId} .draggable-header`).first();
    await header.click({ position: { x: 10, y: 10 } });
}

async function getProgramLabel(page) {
    return (await page.locator('#program-label').textContent()).trim();
}

// Dock DnD helpers
async function getDockOrder(page) {
    return await page.evaluate(() =>
        Array.from(document.querySelectorAll('#dock .dock-tray .dock-item'))
            .map(it => it.getAttribute('data-window-id'))
            .filter(v => v !== null)
    );
}

// Wait until dock order differs from prevOrder (stringified comparison)
async function waitForDockOrderChange(page, prevOrder, timeout = 5000) {
    await page.waitForFunction(
        ({ prev }) => {
            const cur = Array.from(document.querySelectorAll('#dock .dock-tray .dock-item')).map(
                it => it.getAttribute('data-window-id')
            );
            try {
                return JSON.stringify(cur) !== JSON.stringify(prev);
            } catch {
                return false;
            }
        },
        { prev: prevOrder },
        { timeout }
    );
}

async function dragAfter(page, sourceId, targetId) {
    const srcSel = `#dock .dock-tray .dock-item[data-window-id="${sourceId}"]`;
    const tgtSel = `#dock .dock-tray .dock-item[data-window-id="${targetId}"]`;
    const prevOrder = await getDockOrder(page);
    await page.evaluate(
        ({ srcSel, tgtSel }) => {
            const src = document.querySelector(srcSel);
            const tgt = document.querySelector(tgtSel);
            if (!src || !tgt) return;
            const dt = new DataTransfer();
            const fire = (type, el, opts = {}) => {
                const ev = new DragEvent(
                    type,
                    Object.assign(
                        {
                            bubbles: true,
                            cancelable: true,
                            dataTransfer: dt,
                            clientX: opts.clientX || 0,
                            clientY: opts.clientY || 0,
                        },
                        opts
                    )
                );
                el.dispatchEvent(ev);
            };
            const srcRect = src.getBoundingClientRect();
            fire('dragstart', src, {
                clientX: srcRect.left + srcRect.width / 2,
                clientY: srcRect.top + srcRect.height / 2,
            });

            const tgtRect = tgt.getBoundingClientRect();
            const overX = Math.max(0, Math.floor(tgtRect.right - 2));
            const overY = Math.floor(tgtRect.top + tgtRect.height / 2);
            const overEl = document.elementFromPoint(overX, overY) || tgt;
            fire('dragover', overEl, { clientX: overX, clientY: overY });

            fire('drop', tgt, { clientX: overX, clientY: overY });
            fire('dragend', src);
        },
        { srcSel, tgtSel }
    );
    // Wait until the dock order has changed instead of a fixed timeout
    await waitForDockOrderChange(page, prevOrder, 3000);
}

async function dragBefore(page, sourceId, targetId) {
    const srcSel = `#dock .dock-tray .dock-item[data-window-id="${sourceId}"]`;
    const tgtSel = `#dock .dock-tray .dock-item[data-window-id="${targetId}"]`;
    const prevOrder = await getDockOrder(page);
    await page.evaluate(
        ({ srcSel, tgtSel }) => {
            const src = document.querySelector(srcSel);
            const tgt = document.querySelector(tgtSel);
            if (!src || !tgt) return;
            const dt = new DataTransfer();
            const fire = (type, el, opts = {}) => {
                const ev = new DragEvent(
                    type,
                    Object.assign(
                        {
                            bubbles: true,
                            cancelable: true,
                            dataTransfer: dt,
                            clientX: opts.clientX || 0,
                            clientY: opts.clientY || 0,
                        },
                        opts
                    )
                );
                el.dispatchEvent(ev);
            };
            const srcRect = src.getBoundingClientRect();
            fire('dragstart', src, {
                clientX: srcRect.left + srcRect.width / 2,
                clientY: srcRect.top + srcRect.height / 2,
            });

            const tgtRect = tgt.getBoundingClientRect();
            const overX = Math.min(window.innerWidth - 1, Math.floor(tgtRect.left + 2));
            const overY = Math.floor(tgtRect.top + tgtRect.height / 2);
            const overEl = document.elementFromPoint(overX, overY) || tgt;
            fire('dragover', overEl, { clientX: overX, clientY: overY });

            fire('drop', tgt, { clientX: overX, clientY: overY });
            fire('dragend', src);
        },
        { srcSel, tgtSel }
    );
    // Wait until the dock order has changed instead of a fixed timeout
    await waitForDockOrderChange(page, prevOrder, 3000);
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
    const contentsImgPattern =
        /https:\/\/api\.github\.com\/repos\/Marormur\/Website\/contents\/img$/i;

    await page.route(reposPattern, async route => {
        const body = [
            {
                name: 'Website',
                description: 'Portfolio Website',
                private: false,
            },
        ];
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(body),
        });
    });

    await page.route(contentsRootPattern, async route => {
        const body = [
            { name: 'img', path: 'img', type: 'dir' },
            { name: 'README.md', path: 'README.md', type: 'file', size: 10 },
        ];
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(body),
        });
    });

    await page.route(contentsImgPattern, async route => {
        const body = [
            {
                name: 'wallpaper.png',
                path: 'img/wallpaper.png',
                type: 'file',
                size: 12345,
                download_url: baseURL.replace(/\/$/, '') + '/img/wallpaper.png',
            },
        ];
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(body),
        });
    });
}

// Enable GitHub API mocks automatically when MOCK_GITHUB env flag is set.
// This helps stabilize smoke tests that touch Finder "github" view without hitting the network.
async function ensureGithubMocksIfRequested(page) {
    const flag = (process.env.MOCK_GITHUB || '').toLowerCase();
    if (flag === '1' || flag === 'true' || flag === 'yes') {
        try {
            // Derive base URL (origin) from the current page context
            const currentUrl = page.url();
            let origin;
            try {
                origin = new URL(currentUrl).origin;
            } catch {
                // Fallback to the configured dev server
                origin = 'http://127.0.0.1:5173';
            }
            await mockGithubRepoImageFlow(page, origin);
        } catch (e) {
            // Non-fatal; tests can proceed without mocks
            console.warn('GitHub API mock setup failed:', e && e.message ? e.message : e);
        }
    }
}

// Wait for the application to persist a session to localStorage.
// Checks common keys used by the app: 'multi-window-session', 'windowInstancesSession', 'window-session'.
async function waitForSessionSaved(page, timeout = 3000) {
    const keys = ['multi-window-session', 'windowInstancesSession', 'window-session'];
    await page.waitForFunction(ks => ks.some(k => !!localStorage.getItem(k)), keys, { timeout });
}

// Read the saved session payload from localStorage and return { key, raw }
async function getSavedSessionPayload(page) {
    return await page.evaluate(() => {
        try {
            const keys = ['multi-window-session', 'windowInstancesSession', 'window-session'];
            for (const k of keys) {
                const raw = localStorage.getItem(k);
                if (raw) return { key: k, raw };
            }
            return { key: null, raw: null };
        } catch (e) {
            return { key: null, raw: null, error: String(e) };
        }
    });
}

/**
 * Get the add-tab button for a Finder window.
 * The window-id is auto-detected from page.__finderWindowId or derived from finderWindow selector.
 * @param {Page} page - Playwright page
 * @param {Locator} finderWindow - Locator of the Finder window (.modal.multi-window[id^="window-finder-"])
 * @returns {Locator} Locator for the add-tab button (.wt-add button in the tab bar)
 */
async function getFinderAddTabButton(page, finderWindow) {
    const windowId = await finderWindow.getAttribute('id');
    if (!windowId) {
        throw new Error('Unable to determine Finder window ID from element');
    }
    // New structure: #window-finder-{id}-tabs contains tab bar with .wt-add button
    return finderWindow.locator(`#${windowId}-tabs .wt-add`);
}

/**
 * Get the list of tabs in a Finder window.
 * @param {Page} page - Playwright page
 * @param {Locator} finderWindow - Locator of the Finder window
 * @returns {Locator} Locator for all tabs in the window
 */
async function getFinderTabs(page, finderWindow) {
    const windowId = await finderWindow.getAttribute('id');
    if (!windowId) {
        throw new Error('Unable to determine Finder window ID from element');
    }
    return finderWindow.locator(`#${windowId}-tabs .wt-tab`);
}

module.exports = {
    // Navigation / Settings / Apple menu
    gotoHome,
    waitForAppReady,
    waitForFinderReady,
    openFinderWindow,
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
    // Finder window helpers (new multi-window API)
    getFinderAddTabButton,
    getFinderTabs,
    // Finder / GitHub mocks
    mockGithubRepoImageFlow,
    ensureGithubMocksIfRequested,
    // Backwards-compatible alias used by some older tests
    mockGitHubIfNeeded,
    // Session helpers
    waitForSessionSaved,
    getSavedSessionPayload,
};

// --- Window helpers ---
/**
 * Öffnet das neue FinderWindow (BaseWindow) über das Dock‑Icon und gibt den Fenster‑Locator zurück.
 * Nutzt die BaseWindow‑Struktur: .modal.multi-window[id^="window-finder-"]
 */
async function openFinderWindow(page) {
    // Click dock icon by accessible name
    await page.getByRole('img', { name: 'Finder Icon' }).click();
    // Prefer new BaseWindow Finder
    const newWin = page.locator('.modal.multi-window[id^="window-finder-"]');
    try {
        await newWin.first().waitFor({ state: 'visible', timeout: 6000 });
        // After the window appears, wait for Finder systems to initialize
        try {
            await waitForFinderReady(page, { timeout: 10000 });
        } catch {
            // proceed anyway; callers may perform additional waits
        }
        // Store the window ID on the page context for later use in tests
        const windowId = await newWin.first().getAttribute('id');
        if (windowId) {
            page.__finderWindowId = windowId; // Store for use in test helpers
        }
        return newWin.first();
    } catch {
        // Fallback: locate a visible dialog whose heading is "Finder" and return its modal container
        const heading = page.getByRole('heading', { name: /^Finder$/ });
        await heading.waitFor({ state: 'visible', timeout: 6000 });
        const modal = page.locator('.modal', { has: heading });
        await modal.first().waitFor({ state: 'visible', timeout: 4000 });
        try {
            await waitForFinderReady(page, { timeout: 10000 });
        } catch {
            /* noop */
        }
        const windowId = await modal.first().getAttribute('id');
        if (windowId) {
            page.__finderWindowId = windowId;
        }
        return modal.first();
    }
}

/**
 * Waits for Finder readiness in the page context.
 * Criteria: window.__APP_READY === true AND at least one of
 * - WindowRegistry.getAllWindows('finder').length >= 1
 * - A visible window element with #${windowId}-tabs tab bar (new multi-window)
 * - FinderInstanceManager reports an instance count > 0 (legacy)
 */
async function waitForFinderReady(page, opts = {}) {
    const timeout =
        typeof opts.timeout === 'number'
            ? opts.timeout
            : process.env.USE_BUNDLE === '1'
              ? 30000
              : 15000;
    // Ensure optional GitHub mocks are set up before Finder initializes
    await ensureGithubMocksIfRequested(page);
    await page.waitForFunction(
        () => {
            try {
                if (typeof window === 'undefined') return false;
                if (window.__APP_READY !== true) return false;
                // Check for WindowRegistry with Finder windows (most reliable for new architecture)
                const hasRegistry = !!(
                    window.WindowRegistry &&
                    typeof window.WindowRegistry.getAllWindows === 'function'
                );
                if (hasRegistry) {
                    try {
                        const arr = window.WindowRegistry.getAllWindows('finder') || [];
                        if (Array.isArray(arr) && arr.length > 0) {
                            // Also verify the window element is visible (has DOM presence)
                            const firstWindow = arr[0];
                            if (firstWindow && firstWindow.windowId) {
                                const el = document.getElementById(firstWindow.windowId);
                                if (el && el.offsetParent !== null) return true; // visible
                            }
                            return true; // Window registered even if not visible yet
                        }
                    } catch {}
                }
                // Fallback: check for any multi-window finder (newer pattern uses window-specific IDs)
                const anyFinderWindow = document.querySelector(
                    '.modal.multi-window[id^="window-finder-"]'
                );
                if (anyFinderWindow && anyFinderWindow.offsetParent !== null) return true;
                // Fallback: check for legacy FinderInstanceManager
                if (
                    window.FinderInstanceManager &&
                    typeof window.FinderInstanceManager.getInstanceCount === 'function'
                ) {
                    try {
                        if ((window.FinderInstanceManager.getInstanceCount() || 0) > 0) return true;
                    } catch {}
                }
                return false;
            } catch {
                return false;
            }
        },
        { timeout }
    );
}

// Backwards-compatible helper expected by older tests
async function mockGitHubIfNeeded(page) {
    return ensureGithubMocksIfRequested(page);
}
