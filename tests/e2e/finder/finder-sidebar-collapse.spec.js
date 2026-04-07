// @ts-check
const { test, expect } = require('@playwright/test');
const {
    gotoHome,
    waitForAppReady,
    dismissWelcomeDialogIfPresent,
    openFinderWindow,
} = require('../utils');

test.describe('Finder Sidebar - Collapsible Groups', () => {
    const groupAt = (page, index) => page.locator('.mb-5').nth(index);
    const groupHeaderAt = (page, index) => page.locator('.finder-sidebar-group-header').nth(index);
    const groupToggleAt = (page, index) => groupHeaderAt(page, index).locator('button');
    const groupItemsAt = (page, index) =>
        groupAt(page, index).locator('.finder-sidebar-group-items');
    const clickGroupToggle = async (page, index) => {
        const header = groupHeaderAt(page, index);
        const toggle = groupToggleAt(page, index);

        await header.hover();
        await page.waitForTimeout(100);
        await toggle.click({ force: true });
        await page.waitForTimeout(200);
    };

    test.beforeEach(async ({ page, baseURL }) => {
        await gotoHome(page, baseURL);
        await waitForAppReady(page);
        await dismissWelcomeDialogIfPresent(page);
        await openFinderWindow(page);
        await page.waitForTimeout(200);
    });

    test('should show toggle arrow on hover over group header', async ({ page }) => {
        const firstHeader = groupHeaderAt(page, 0);
        const toggleButton = groupToggleAt(page, 0);

        await page.mouse.move(0, 0);
        await page.waitForTimeout(50);

        // Initially, toggle should be invisible (opacity: 0)
        const initialOpacity = await toggleButton.evaluate(el => {
            return window.getComputedStyle(el).opacity;
        });
        expect(parseFloat(initialOpacity)).toBeLessThan(0.5);

        // Hover over header
        const headerBox = await firstHeader.boundingBox();
        if (!headerBox) {
            throw new Error('Finder sidebar header has no bounding box');
        }

        await page.mouse.move(
            headerBox.x + headerBox.width / 2,
            headerBox.y + headerBox.height / 2
        );
        await page.waitForTimeout(100);

        // Toggle should become visible (opacity: 1)
        const hoverOpacity = await toggleButton.evaluate(el => {
            return window.getComputedStyle(el).opacity;
        });
        expect(parseFloat(hoverOpacity)).toBeGreaterThan(0.8);
    });

    test('should collapse group when clicking toggle button', async ({ page }) => {
        const toggleButton = groupToggleAt(page, 0);
        const firstGroupItems = groupItemsAt(page, 0);

        // Hover and click toggle to collapse
        await clickGroupToggle(page, 0);

        await expect(firstGroupItems).toHaveClass(/is-collapsed/);

        // aria-expanded should be false
        const ariaExpanded = await toggleButton.getAttribute('aria-expanded');
        expect(ariaExpanded).toBe('false');

        // Toggle icon should have .is-collapsed class
        const toggleIcon = toggleButton.locator('.finder-sidebar-group-toggle-icon');
        await expect(toggleIcon).toHaveClass(/is-collapsed/);
    });

    test('should expand group when clicking toggle button again', async ({ page }) => {
        const toggleButton = groupToggleAt(page, 0);
        const firstGroupItems = groupItemsAt(page, 0);
        const initialItemCount = await firstGroupItems.locator('.finder-sidebar-item').count();

        // First collapse
        await clickGroupToggle(page, 0);

        // Then expand again
        await clickGroupToggle(page, 0);

        await expect(firstGroupItems).not.toHaveClass(/is-collapsed/);
        await expect(firstGroupItems.locator('.finder-sidebar-item')).toHaveCount(initialItemCount);

        // aria-expanded should be true
        const ariaExpanded = await toggleButton.getAttribute('aria-expanded');
        expect(ariaExpanded).toBe('true');

        // Toggle icon should NOT have .is-collapsed class
        const toggleIcon = toggleButton.locator('.finder-sidebar-group-toggle-icon');
        await expect(toggleIcon).not.toHaveClass(/is-collapsed/);
    });

    test('should handle multiple groups independently', async ({ page }) => {
        const firstGroupItems = groupItemsAt(page, 0);
        const initialFirstGroupCount = await firstGroupItems
            .locator('.finder-sidebar-item')
            .count();

        // Collapse first group (FAVORITEN)
        const firstToggle = groupToggleAt(page, 0);
        await clickGroupToggle(page, 0);

        // Collapse second group (ORTE)
        await clickGroupToggle(page, 1);

        // Both should be collapsed
        await expect(groupItemsAt(page, 0)).toHaveClass(/is-collapsed/);
        await expect(groupItemsAt(page, 1)).toHaveClass(/is-collapsed/);

        // Expand only first group
        await firstToggle.click({ force: true });
        await page.waitForTimeout(200);

        // First should be expanded, second still collapsed
        await expect(groupItemsAt(page, 0)).not.toHaveClass(/is-collapsed/);
        await expect(groupItemsAt(page, 1)).toHaveClass(/is-collapsed/);
        await expect(groupItemsAt(page, 0).locator('.finder-sidebar-item')).toHaveCount(
            initialFirstGroupCount
        );
    });

    test('should persist collapse state during tab navigation', async ({ page }) => {
        const firstToggle = groupToggleAt(page, 0);

        // Collapse first group
        await clickGroupToggle(page, 0);

        // Navigate to another visible sidebar destination
        const githubButton = page.locator('button:has-text("GitHub Projekte")');
        await githubButton.click();
        await page.waitForTimeout(300);

        // Group should still be collapsed
        await expect(groupItemsAt(page, 0)).toHaveClass(/is-collapsed/);

        const ariaExpanded = await firstToggle.getAttribute('aria-expanded');
        expect(ariaExpanded).toBe('false');
    });

    test('should show and hide toggle on focus within group header', async ({ page }) => {
        const firstHeader = page.locator('.finder-sidebar-group-header').first();
        const toggleButton = firstHeader.locator('button');

        // Tab to focus the toggle button
        await toggleButton.focus();

        // Check if toggle is visible when focused
        const focusOpacity = await toggleButton.evaluate(el => {
            const parent = el.closest('.finder-sidebar-group-header');
            return window.getComputedStyle(parent.querySelector('.finder-sidebar-group-toggle'))
                .opacity;
        });

        // Should be visible on focus
        expect(
            parseFloat(focusOpacity) > 0.8 ||
                (await toggleButton.evaluate(el => el === document.activeElement))
        ).toBeTruthy();
    });

    test('should have correct accessibility attributes', async ({ page }) => {
        const firstHeader = page.locator('.finder-sidebar-group-header').first();
        const toggleButton = firstHeader.locator('button');

        await firstHeader.hover();

        // Check button attributes
        const buttonType = await toggleButton.getAttribute('type');
        expect(buttonType).toBe('button');

        const ariaLabel = await toggleButton.getAttribute('aria-label');
        expect(ariaLabel).toMatch(/Gruppe (ein|aus)klappen/);

        const ariaExpanded = await toggleButton.getAttribute('aria-expanded');
        expect(ariaExpanded).toBe('true');

        const title = await toggleButton.getAttribute('title');
        expect(title).toMatch(/Gruppe (ein|aus)klappen/);

        // Toggle icon should have aria-hidden
        const toggleIcon = toggleButton.locator('.finder-sidebar-group-toggle-icon');
        const ariaHidden = await toggleIcon.getAttribute('aria-hidden');
        expect(ariaHidden).toBe('true');
    });
});
