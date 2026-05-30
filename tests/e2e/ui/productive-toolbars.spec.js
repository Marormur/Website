const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

function getPreviewWindow(page) {
    return page.locator('.modal.multi-window.preview-window-shell[id^="window-preview-"]').last();
}

function getCalendarWindow(page) {
    return page.locator('.modal.multi-window.calendar-window-shell[id^="window-calendar-"]').last();
}

function getPhotosWindow(page) {
    return page.locator('.modal.multi-window.photos-window-shell[id^="window-photos-"]').last();
}

async function activateWindow(windowLocator) {
    const overlay = windowLocator.locator('.window-focus-overlay');
    if (await overlay.isVisible()) {
        await overlay.click();
    }
}

test.describe('Productive app toolbars', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('Preview, Calendar, and Photos use shared toolbar/button framework classes', async ({
        page,
    }) => {
        await page.evaluate(() => {
            window.PreviewWindow?.focusOrCreate?.();
            window.CalendarWindow?.focusOrCreate?.();
            window.PhotosWindow?.focusOrCreate?.();
        });

        const previewWindow = getPreviewWindow(page);
        const calendarWindow = getCalendarWindow(page);
        const photosWindow = getPhotosWindow(page);

        await expect(previewWindow).toBeVisible();
        await expect(calendarWindow).toBeVisible();
        await expect(calendarWindow.locator('[data-calendar-view="month"]')).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        await expect(photosWindow).toBeVisible();

        await expect(previewWindow.locator('.preview-content-topbar.app-toolbar')).toBeVisible();
        await expect(
            previewWindow.locator(
                '[data-preview-toolbar="navigation"].app-toolbar-section[role="group"]'
            )
        ).toBeVisible();
        await expect(
            previewWindow.locator('.preview-toolbar-button.app-toolbar-button.macui-button')
        ).toHaveCount(6);
        await expect(previewWindow.locator('[data-preview-action="open-tab"]')).toHaveAttribute(
            'title',
            /.+/
        );

        await expect(calendarWindow.locator('.calendar-toolbar.app-toolbar')).toBeVisible();
        await expect(
            calendarWindow.locator('.calendar-toolbar .app-toolbar-button.macui-button')
        ).toHaveCount(4);
        await expect(
            calendarWindow.locator('.calendar-toolbar .app-toolbar-segment-button.macui-button')
        ).toHaveCount(3);
        await expect(calendarWindow.locator('[data-calendar-view="month"]')).toHaveAttribute(
            'aria-pressed',
            'true'
        );

        await expect(photosWindow.locator('.photos-content-topbar.app-toolbar')).toBeVisible();
        await expect(
            photosWindow.locator('.photos-content-topbar .app-toolbar-button.macui-button')
        ).toHaveCount(9);
        await expect(
            photosWindow.locator('.photos-content-topbar .app-toolbar-segment-button.macui-button')
        ).toHaveCount(3);
        await expect(photosWindow.locator('[data-photos-segment="years"]')).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        await expect(photosWindow.locator('#photos-search-toggle')).toHaveAttribute(
            'aria-controls',
            'photos-search-input-wrap'
        );
    });

    test('Calendar and Photos segmented controls keep pressed state in sync', async ({ page }) => {
        await page.evaluate(() => {
            window.CalendarWindow?.focusOrCreate?.();
        });

        const calendarWindow = getCalendarWindow(page);

        await expect(calendarWindow).toBeVisible();

        await activateWindow(calendarWindow);
        await calendarWindow.locator('[data-calendar-view="week"]').evaluate(element => {
            element.click();
        });
        await expect(calendarWindow.locator('[data-calendar-view="week"]')).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        await expect(calendarWindow.locator('[data-calendar-view="month"]')).toHaveAttribute(
            'aria-pressed',
            'false'
        );

        await page.evaluate(() => {
            window.PhotosWindow?.focusOrCreate?.();
        });
        const photosWindow = getPhotosWindow(page);
        await expect(photosWindow).toBeVisible();
        await expect(photosWindow.locator('[data-photos-segment="years"]')).toHaveAttribute(
            'aria-pressed',
            'true'
        );

        await activateWindow(photosWindow);
        await photosWindow.locator('[data-photos-segment="albums"]').evaluate(element => {
            element.click();
        });
        await expect(photosWindow.locator('[data-photos-segment="albums"]')).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        await expect(photosWindow.locator('[data-photos-segment="years"]')).toHaveAttribute(
            'aria-pressed',
            'false'
        );
    });
});
