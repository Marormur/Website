const { test, expect } = require('@playwright/test');
const { waitForAppReady, dismissWelcomeDialogIfPresent, openSettingsWindow } = require('../utils');

async function resetWindowSessions(page) {
    await page.evaluate(() => {
        if (window.SessionManager?.clear) {
            window.SessionManager.clear();
        }

        localStorage.removeItem('multi-window-session');
        localStorage.removeItem('windowState');

        const registry = window.WindowRegistry;
        const wins = registry?.getAllWindows?.() || [];
        wins.forEach(win => {
            try {
                win.close?.();
            } catch {
                // Ignore cleanup failures so tests can still continue from a clean reload.
            }
        });
    });
}

async function bootFreshDesktop(page, baseURL) {
    await page.goto(baseURL + '/index.html');
    await waitForAppReady(page);
    await dismissWelcomeDialogIfPresent(page);
    await resetWindowSessions(page);
    await page.reload();
    await waitForAppReady(page);
    await dismissWelcomeDialogIfPresent(page);
}

async function setDisplayScale(page, scale) {
    await page.evaluate(scaleValue => {
        window.API?.display?.setDisplayScalePreference?.(scaleValue);
    }, scale);
}

async function createWindow(page, type, position, title) {
    await page.evaluate(
        ({ type, position, title }) => {
            const factories = {
                terminal: () => window.TerminalWindow?.create?.({ title, position }),
                'text-editor': () => window.TextEditorWindow?.create?.({ title, position }),
                finder: () => window.FinderWindow?.create?.({ title, position }),
                photos: () => window.PhotosWindow?.create?.({ title, position }),
            };

            return factories[type]?.() || null;
        },
        { type, position, title }
    );

    await page.waitForFunction(
        ({ type, title }) => {
            const windows = window.WindowRegistry?.getWindowsByType?.(type) || [];
            return windows.some(win => {
                const metaTitle = win.metadata?.title;
                return metaTitle === title || win.id?.includes(type);
            });
        },
        { type, title },
        { timeout: 5000 }
    );
}

function windowSelector(type) {
    return `.multi-window[id^="window-${type}-"]`;
}

async function getWindowState(page, type) {
    return await page.evaluate(type => {
        const elements = Array.from(
            document.querySelectorAll(`.multi-window[id^="window-${type}-"]`)
        );
        const target = elements[elements.length - 1] || null;
        if (!target) return null;

        const style = window.getComputedStyle(target);
        return {
            id: target.id,
            snapped: target.getAttribute('data-snapped'),
            left: parseFloat(style.left || '0'),
            top: parseFloat(style.top || '0'),
            width: parseFloat(style.width || '0'),
            height: parseFloat(style.height || '0'),
        };
    }, type);
}

async function getSnapMetrics(page, side) {
    return await page.evaluate(side => window.computeSnapMetrics?.(side) || null, side);
}

async function getRegistryWindowMaximized(page, type) {
    return await page.evaluate(type => {
        const windows = window.WindowRegistry?.getWindowsByType?.(type) || [];
        const target = windows[windows.length - 1] || null;
        return target?.isMaximized ?? null;
    }, type);
}

async function getDialogState(page, modalId) {
    return await page.evaluate(modalId => {
        const modal = document.getElementById(modalId);
        if (!modal) return null;

        const target =
            window.StorageSystem?.getDialogWindowElement?.(modal) ||
            modal.querySelector('.autopointer') ||
            modal;
        const rect = target.getBoundingClientRect();

        return {
            maximized: modal.dataset.maximized === 'true',
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
        };
    }, modalId);
}

async function beginSyntheticDrag(page, type, targetClientX) {
    return await page.evaluate(
        ({ type, targetClientX }) => {
            const windows = Array.from(
                document.querySelectorAll(`.multi-window[id^="window-${type}-"]`)
            );
            const target = windows[windows.length - 1] || null;
            if (!target) return { ok: false, reason: 'window-not-found' };

            const handles = Array.from(
                target.querySelectorAll('.window-titlebar, .finder-window-drag-zone')
            ).filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });

            const handle =
                handles.sort(
                    (a, b) =>
                        b.getBoundingClientRect().width * b.getBoundingClientRect().height -
                        a.getBoundingClientRect().width * a.getBoundingClientRect().height
                )[0] || null;
            if (!handle) return { ok: false, reason: 'drag-handle-not-found' };

            const handleRect = handle.getBoundingClientRect();
            const startX = handleRect.left + Math.max(24, Math.min(140, handleRect.width * 0.35));
            const startY = handleRect.top + Math.max(12, Math.min(20, handleRect.height * 0.5));

            handle.dispatchEvent(
                new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    clientX: startX,
                    clientY: startY,
                })
            );

            document.dispatchEvent(
                new MouseEvent('mousemove', {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    clientX: targetClientX,
                    clientY: startY,
                })
            );

            const overlay = document.getElementById('snap-preview-overlay');

            window.__snapTestDrag = {
                targetClientX,
                targetClientY: startY,
            };

            return {
                ok: true,
                overlaySide:
                    overlay && overlay.classList.contains('snap-preview-visible')
                        ? overlay.getAttribute('data-side')
                        : null,
            };
        },
        { type, targetClientX }
    );
}

async function endSyntheticDrag(page) {
    await page.evaluate(() => {
        const drag = window.__snapTestDrag || null;
        document.dispatchEvent(
            new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true,
                button: 0,
                clientX: drag?.targetClientX || 0,
                clientY: drag?.targetClientY || 0,
            })
        );
        delete window.__snapTestDrag;
    });
}

async function dragAndSnap(page, type, side) {
    const viewport = page.viewportSize();
    const targetClientX = side === 'left' ? 1 : Math.max(1, (viewport?.width || 1280) - 2);

    const started = await beginSyntheticDrag(page, type, targetClientX);
    expect(started.ok).toBe(true);
    expect(started.overlaySide).toBe(side);

    await endSyntheticDrag(page);

    await expect
        .poll(async () => (await getWindowState(page, type))?.snapped || null, {
            timeout: 3000,
        })
        .toBe(side);

    return await getWindowState(page, type);
}

async function dragWithoutSnap(page, type, targetClientX) {
    const started = await beginSyntheticDrag(page, type, targetClientX);
    expect(started.ok).toBe(true);
    expect(started.overlaySide).toBeNull();

    await endSyntheticDrag(page);

    await expect
        .poll(async () => (await getWindowState(page, type))?.snapped || null, {
            timeout: 3000,
        })
        .toBeNull();

    return await getWindowState(page, type);
}

async function dragWithLogicalClientCoords(page, selector, moveDelta) {
    return await page.evaluate(
        async ({ selector, moveDelta }) => {
            const zoom = parseFloat(document.documentElement.style.zoom || '1') || 1;
            const handle = document.querySelector(selector);
            const win = handle?.closest('.multi-window');
            if (!handle || !win) {
                return { ok: false, reason: 'window-handle-not-found' };
            }

            const rect = win.getBoundingClientRect();
            const initialLeft = parseFloat(win.style.left || '0');
            const initialTop = parseFloat(win.style.top || '0');
            const startOffsetX = Math.min(
                rect.width - 40,
                Math.max(120, zoom * rect.right - rect.left + 20)
            );
            const startOffsetY = 20;
            const rawStartX = (rect.left + startOffsetX) / zoom;
            const rawStartY = (rect.top + startOffsetY) / zoom;
            const rawEndX = rawStartX + moveDelta.x;
            const rawEndY = rawStartY + moveDelta.y;

            handle.dispatchEvent(
                new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    clientX: rawStartX,
                    clientY: rawStartY,
                })
            );

            document.dispatchEvent(
                new MouseEvent('mousemove', {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    clientX: rawEndX,
                    clientY: rawEndY,
                })
            );

            await new Promise(resolve => requestAnimationFrame(() => resolve()));

            const afterRect = win.getBoundingClientRect();
            document.dispatchEvent(
                new MouseEvent('mouseup', {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    clientX: rawEndX,
                    clientY: rawEndY,
                })
            );

            return {
                ok: true,
                initialLeft,
                initialTop,
                left: parseFloat(win.style.left || '0'),
                top: parseFloat(win.style.top || '0'),
                renderedOffsetX: rawEndX * zoom - afterRect.left,
                renderedOffsetY: rawEndY * zoom - afterRect.top,
                startOffsetX,
                startOffsetY,
            };
        },
        { selector, moveDelta }
    );
}

async function dragDialogWithPointerEvents(page, modalId, selector, moveDelta) {
    return await page.evaluate(
        async ({ modalId, selector, moveDelta }) => {
            const modal = document.getElementById(modalId);
            const handle = modal?.querySelector(selector);
            const target =
                window.StorageSystem?.getDialogWindowElement?.(modal) ||
                modal?.querySelector('.autopointer') ||
                modal;

            if (!handle || !target || typeof PointerEvent === 'undefined') {
                return { ok: false, reason: 'dialog-handle-not-found' };
            }

            const handleRect = handle.getBoundingClientRect();
            const beforeRect = target.getBoundingClientRect();
            const startX = handleRect.left + Math.max(32, Math.min(140, handleRect.width * 0.35));
            const startY = handleRect.top + Math.max(16, Math.min(24, handleRect.height * 0.5));
            const endX = startX + moveDelta.x;
            const endY = startY + moveDelta.y;
            const pointerId = 1;

            handle.dispatchEvent(
                new PointerEvent('pointerdown', {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    buttons: 1,
                    clientX: startX,
                    clientY: startY,
                    pointerId,
                    pointerType: 'mouse',
                    isPrimary: true,
                })
            );

            window.dispatchEvent(
                new PointerEvent('pointermove', {
                    bubbles: true,
                    cancelable: true,
                    buttons: 1,
                    clientX: endX,
                    clientY: endY,
                    pointerId,
                    pointerType: 'mouse',
                    isPrimary: true,
                })
            );

            await new Promise(resolve =>
                requestAnimationFrame(() => requestAnimationFrame(resolve))
            );

            const afterRect = target.getBoundingClientRect();

            window.dispatchEvent(
                new PointerEvent('pointerup', {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    buttons: 0,
                    clientX: endX,
                    clientY: endY,
                    pointerId,
                    pointerType: 'mouse',
                    isPrimary: true,
                })
            );

            return {
                ok: true,
                before: {
                    left: Math.round(beforeRect.left),
                    top: Math.round(beforeRect.top),
                },
                after: {
                    left: Math.round(afterRect.left),
                    top: Math.round(afterRect.top),
                },
            };
        },
        { modalId, selector, moveDelta }
    );
}

test.describe('Window Snapping', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await bootFreshDesktop(page, baseURL);
    });

    test('snaps terminal, text editor, finder and photos windows to the left edge', async ({
        page,
    }) => {
        const scenarios = [
            {
                type: 'terminal',
                title: 'Snap Terminal',
                position: { x: 240, y: 140, width: 800, height: 500 },
            },
            {
                type: 'text-editor',
                title: 'Snap Editor',
                position: { x: 260, y: 160, width: 800, height: 500 },
            },
            {
                type: 'finder',
                title: 'Snap Finder',
                position: { x: 280, y: 180, width: 800, height: 500 },
            },
            {
                type: 'photos',
                title: 'Snap Photos',
                position: { x: 300, y: 200, width: 800, height: 500 },
            },
        ];

        for (const scenario of scenarios) {
            await createWindow(page, scenario.type, scenario.position, scenario.title);
            const snappedState = await dragAndSnap(page, scenario.type, 'left');
            const expected = await getSnapMetrics(page, 'left');

            expect(snappedState).not.toBeNull();
            expect(snappedState.snapped).toBe('left');
            expect(snappedState.left).toBe(expected.left);
            expect(snappedState.top).toBe(expected.top);
            expect(snappedState.width).toBe(expected.width);
            expect(snappedState.height).toBe(expected.height);
        }
    });

    test('restores titlebar windows from snapped state and allows re-snap to the right edge', async ({
        page,
    }) => {
        const scenarios = [
            {
                type: 'terminal',
                title: 'Resnap Terminal',
                position: { x: 360, y: 180, width: 800, height: 500 },
            },
            {
                type: 'text-editor',
                title: 'Resnap Editor',
                position: { x: 380, y: 200, width: 800, height: 500 },
            },
        ];

        for (const scenario of scenarios) {
            await createWindow(page, scenario.type, scenario.position, scenario.title);

            const leftSnap = await dragAndSnap(page, scenario.type, 'left');
            expect(leftSnap.width).toBe((await getSnapMetrics(page, 'left')).width);

            const released = await dragWithoutSnap(page, scenario.type, 420);
            expect(released.width).toBe(scenario.position.width);
            expect(released.left).toBeGreaterThan(100);

            const rightSnap = await dragAndSnap(page, scenario.type, 'right');
            const expectedRight = await getSnapMetrics(page, 'right');

            expect(rightSnap.snapped).toBe('right');
            expect(rightSnap.left).toBe(expectedRight.left);
            expect(rightSnap.top).toBe(expectedRight.top);
            expect(rightSnap.width).toBe(expectedRight.width);
            expect(rightSnap.height).toBe(expectedRight.height);
        }
    });

    test('preserves drag anchor at non-default display scale for titlebar windows', async ({
        page,
    }) => {
        await setDisplayScale(page, 0.8);
        await createWindow(
            page,
            'terminal',
            { x: 300, y: 180, width: 800, height: 500 },
            'Scaled Drag Terminal'
        );

        const dragged = await dragWithLogicalClientCoords(
            page,
            `${windowSelector('terminal')} .window-titlebar`,
            { x: 260, y: 90 }
        );

        expect(dragged.ok).toBe(true);
        expect(dragged.left - dragged.initialLeft).toBeCloseTo(260, 0);
        expect(dragged.top - dragged.initialTop).toBeCloseTo(90, 0);
        expect(dragged.renderedOffsetX).toBeCloseTo(dragged.startOffsetX, 1);
        expect(dragged.renderedOffsetY).toBeCloseTo(dragged.startOffsetY, 1);
    });

    test('double click on window headers toggles zoom for redesigned windows and settings', async ({
        page,
    }) => {
        await createWindow(
            page,
            'finder',
            { x: 280, y: 180, width: 820, height: 520 },
            'Zoom Finder'
        );

        const finderBefore = await getWindowState(page, 'finder');
        expect(finderBefore).not.toBeNull();
        expect(await getRegistryWindowMaximized(page, 'finder')).toBe(false);

        await page
            .locator(`${windowSelector('finder')} .finder-window-drag-zone`)
            .first()
            .dispatchEvent('click', { detail: 2 });

        await expect
            .poll(async () => await getRegistryWindowMaximized(page, 'finder'), {
                timeout: 3000,
            })
            .toBe(true);

        const finderZoomed = await getWindowState(page, 'finder');
        expect(finderZoomed).not.toBeNull();

        await page
            .locator(`${windowSelector('finder')} .finder-window-drag-zone`)
            .first()
            .dispatchEvent('click', { detail: 2 });

        await expect
            .poll(async () => await getRegistryWindowMaximized(page, 'finder'), {
                timeout: 3000,
            })
            .toBe(false);

        const finderRestored = await getWindowState(page, 'finder');
        expect(finderRestored.width).toBe(finderBefore.width);
        expect(finderRestored.height).toBe(finderBefore.height);

        const settingsWindow = await openSettingsWindow(page, 5000);
        await expect(settingsWindow).toBeVisible({ timeout: 5000 });

        const settingsBefore = await getWindowState(page, 'settings');
        expect(settingsBefore).not.toBeNull();
        expect(await getRegistryWindowMaximized(page, 'settings')).toBe(false);

        await settingsWindow.locator('.draggable-header:visible').first().dispatchEvent('dblclick');

        await expect
            .poll(async () => await getRegistryWindowMaximized(page, 'settings'), {
                timeout: 3000,
            })
            .toBe(true);

        const settingsZoomed = await getWindowState(page, 'settings');
        expect(settingsZoomed).not.toBeNull();

        await settingsWindow.locator('.draggable-header:visible').first().dispatchEvent('dblclick');

        await expect
            .poll(async () => await getRegistryWindowMaximized(page, 'settings'), {
                timeout: 3000,
            })
            .toBe(false);

        const settingsRestored = await getWindowState(page, 'settings');
        expect(settingsRestored.width).toBe(settingsBefore.width);
        expect(settingsRestored.height).toBe(settingsBefore.height);
    });

    test('settings dialog can be dragged via pointer events', async ({ page }) => {
        const settingsWindow = await openSettingsWindow(page, 5000);
        await expect(settingsWindow).toBeVisible({ timeout: 5000 });

        const settingsWindowId = await settingsWindow.getAttribute('id');
        expect(settingsWindowId).toBeTruthy();

        const dragged = await dragDialogWithPointerEvents(
            page,
            settingsWindowId,
            '.draggable-header',
            { x: 180, y: 72 }
        );

        expect(dragged.ok).toBe(true);
        expect(dragged.after.left).toBeGreaterThan(dragged.before.left + 100);
        expect(dragged.after.top).toBeGreaterThan(dragged.before.top + 40);
    });

    test('settings dialog can be dragged from maximized state to restore and move', async ({
        page,
    }) => {
        const settingsWindow = await openSettingsWindow(page, 5000);
        await expect(settingsWindow).toBeVisible({ timeout: 5000 });

        const settingsBefore = await getWindowState(page, 'settings');
        expect(settingsBefore).not.toBeNull();

        // Maximize by double-clicking the header
        await settingsWindow.locator('.draggable-header:visible').first().dblclick();

        await expect
            .poll(async () => await getRegistryWindowMaximized(page, 'settings'), {
                timeout: 3000,
            })
            .toBe(true);

        // Drag from the maximized header should restore and move the window
        const dragged = await dragDialogWithPointerEvents(
            page,
            'window-settings-1775582344044-6ll999e4z', // Adjust if needed, or use dynamic selector
            '.draggable-header',
            { x: 180, y: 72 }
        );

        await expect
            .poll(async () => await getRegistryWindowMaximized(page, 'settings'), {
                timeout: 3000,
            })
            .toBe(false);

        const settingsRestored = await getWindowState(page, 'settings');
        expect(settingsRestored).not.toBeNull();
        // Position should have changed (window was moved after being restored)
        expect(settingsRestored.left).not.toBe(settingsBefore.left || settingsRestored.left);
    });
});
