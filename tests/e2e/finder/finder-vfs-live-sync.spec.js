/**
 * E2E tests for FinderView VirtualFS live-sync
 *
 * Verifies that file-system changes (create / delete / rename) made via VirtualFS
 * are automatically reflected in an open Finder window without a manual refresh.
 */

import { test, expect } from '@playwright/test';
import {
    waitForAppReady,
    mockGitHubIfNeeded,
    openFinderWindow,
    dismissWelcomeDialogIfPresent,
} from '../utils.js';

/** Navigate the Finder to /Users/marvin */
async function navigateToHomeMarvin(page, finderWindow) {
    // Click the "Home" sidebar shortcut if present
    const homeBtn = finderWindow.locator('[data-sidebar-action="home"]');
    if ((await homeBtn.count()) > 0) {
        await homeBtn.click({ force: true });
    } else {
        // Fallback: navigate programmatically via the first FinderView instance
        await page.evaluate(() => {
            const registry = window.WindowRegistry || window.__WindowRegistry;
            const wins = registry?.getAllWindows?.('finder') || [];
            const win = wins[0];
            const view = win?.activeView ?? win?.tabs?.values?.()?.next?.()?.value;
            view?.navigateToPath?.(['Users', 'marvin']);
        });
    }

    // Wait until at least one list/grid item is visible (Finder has content)
    await finderWindow
        .locator('.finder-list-item, .finder-grid-item, .finder-gallery-strip-item')
        .first()
        .waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('Finder VirtualFS live-sync', () => {
    test.beforeEach(async ({ page }) => {
        await mockGitHubIfNeeded(page);
        await page.goto('/');
        await waitForAppReady(page);
        await dismissWelcomeDialogIfPresent(page);
    });

    test('smoke: new file created via VirtualFS appears in Finder automatically', async ({
        page,
    }) => {
        const finderWindow = await openFinderWindow(page);
        await navigateToHomeMarvin(page, finderWindow);

        const filename = `vfs-livesync-smoke-${Date.now()}.txt`;
        const vfsPath = `/Users/marvin/${filename}`;

        // Create file via VirtualFS – simulates what the Terminal does
        const created = await page.evaluate(path => {
            if (!window.VirtualFS) throw new Error('VirtualFS not available on window');
            return window.VirtualFS.createFile(path, 'live-sync test');
        }, vfsPath);
        expect(created).toBe(true);

        // Finder must show the new file without manual navigation
        await expect(finderWindow.locator(`[data-item-name="${filename}"]`).first()).toBeVisible({
            timeout: 10000,
        });

        // Cleanup – validate success to catch stale artifacts
        const deleted = await page.evaluate(path => {
            if (!window.VirtualFS) throw new Error('VirtualFS not available on window');
            return window.VirtualFS.delete(path);
        }, vfsPath);
        expect(deleted).toBe(true);
    });

    test('edge: deleted file disappears from Finder automatically', async ({ page }) => {
        const finderWindow = await openFinderWindow(page);
        await navigateToHomeMarvin(page, finderWindow);

        const filename = `vfs-livesync-delete-${Date.now()}.txt`;
        const vfsPath = `/Users/marvin/${filename}`;

        // Pre-create the file so we can delete it
        const created = await page.evaluate(path => {
            if (!window.VirtualFS) throw new Error('VirtualFS not available on window');
            return window.VirtualFS.createFile(path, 'to be deleted');
        }, vfsPath);
        expect(created).toBe(true);

        // Wait for the item to appear in the Finder
        await expect(finderWindow.locator(`[data-item-name="${filename}"]`).first()).toBeVisible({
            timeout: 10000,
        });

        // Now delete via VirtualFS – validate the operation succeeded
        const deleted = await page.evaluate(path => {
            if (!window.VirtualFS) throw new Error('VirtualFS not available on window');
            return window.VirtualFS.delete(path);
        }, vfsPath);
        expect(deleted).toBe(true);

        // Finder must no longer show the item
        await expect(finderWindow.locator(`[data-item-name="${filename}"]`)).toHaveCount(0, {
            timeout: 10000,
        });
    });
});
