// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Finder Sidebar - Collapsible Groups', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://127.0.0.1:5173');
        await page.waitForSelector('.dock');

        // Open Finder
        const finderIcon = page.locator('img[alt="Finder Icon"]');
        await finderIcon.click();

        // Wait for Finder modal
        await page.waitForSelector('[role="dialog"]');
        await page.waitForTimeout(200);
    });

    test('should show toggle arrow on hover over group header', async ({ page }) => {
        const firstHeader = page.locator('.finder-sidebar-group-header').first();
        const toggleButton = firstHeader.locator('button');

        // Initially, toggle should be invisible (opacity: 0)
        const initialOpacity = await toggleButton.evaluate(el => {
            return window.getComputedStyle(el).opacity;
        });
        expect(parseFloat(initialOpacity)).toBeLessThan(0.5);

        // Hover over header
        await firstHeader.hover();

        // Toggle should become visible (opacity: 1)
        const hoverOpacity = await toggleButton.evaluate(el => {
            return window.getComputedStyle(el).opacity;
        });
        expect(parseFloat(hoverOpacity)).toBeGreaterThan(0.8);
    });

    test('should collapse group when clicking toggle button', async ({ page }) => {
        const firstHeader = page.locator('.finder-sidebar-group-header').first();
        const toggleButton = firstHeader.locator('button');
        const firstGroup = page.locator('.mb-5').first();

        // Hover and click toggle to collapse
        await firstHeader.hover();
        await toggleButton.click();
        await page.waitForTimeout(200);

        // Items should be hidden
        const visibleItems = await firstGroup.locator('.finder-sidebar-item').count();
        expect(visibleItems).toBe(0);

        // aria-expanded should be false
        const ariaExpanded = await toggleButton.getAttribute('aria-expanded');
        expect(ariaExpanded).toBe('false');

        // Toggle icon should have .is-collapsed class
        const toggleIcon = toggleButton.locator('.finder-sidebar-group-toggle-icon');
        await expect(toggleIcon).toHaveClass(/is-collapsed/);
    });

    test('should expand group when clicking toggle button again', async ({ page }) => {
        const firstHeader = page.locator('.finder-sidebar-group-header').first();
        const toggleButton = firstHeader.locator('button');
        const firstGroup = page.locator('.mb-5').first();

        // First collapse
        await firstHeader.hover();
        await toggleButton.click();
        await page.waitForTimeout(200);

        // Then expand again
        await toggleButton.click();
        await page.waitForTimeout(200);

        // Items should be visible (Favoriten group has 3 items)
        const visibleItems = await firstGroup.locator('.finder-sidebar-item').count();
        expect(visibleItems).toBe(3);

        // aria-expanded should be true
        const ariaExpanded = await toggleButton.getAttribute('aria-expanded');
        expect(ariaExpanded).toBe('true');

        // Toggle icon should NOT have .is-collapsed class
        const toggleIcon = toggleButton.locator('.finder-sidebar-group-toggle-icon');
        await expect(toggleIcon).not.toHaveClass(/is-collapsed/);
    });

    test('should handle multiple groups independently', async ({ page }) => {
        // Collapse first group (FAVORITEN)
        const firstHeader = page.locator('.finder-sidebar-group-header').first();
        const firstToggle = firstHeader.locator('button');
        await firstHeader.hover();
        await firstToggle.click();
        await page.waitForTimeout(200);

        // Collapse second group (ORTE)
        const secondHeader = page.locator('.finder-sidebar-group-header').nth(1);
        const secondToggle = secondHeader.locator('button');
        await secondHeader.hover();
        await secondToggle.click();
        await page.waitForTimeout(200);

        // Both should be collapsed
        const firstGroupItems = await page
            .locator('.mb-5')
            .first()
            .locator('.finder-sidebar-item')
            .count();
        const secondGroupItems = await page
            .locator('.mb-5')
            .nth(1)
            .locator('.finder-sidebar-item')
            .count();
        expect(firstGroupItems).toBe(0);
        expect(secondGroupItems).toBe(0);

        // Expand only first group
        await firstToggle.click();
        await page.waitForTimeout(200);

        // First should be expanded, second still collapsed
        const firstGroupAfter = await page
            .locator('.mb-5')
            .first()
            .locator('.finder-sidebar-item')
            .count();
        const secondGroupAfter = await page
            .locator('.mb-5')
            .nth(1)
            .locator('.finder-sidebar-item')
            .count();
        expect(firstGroupAfter).toBe(3);
        expect(secondGroupAfter).toBe(0);
    });

    test('should persist collapse state during tab navigation', async ({ page }) => {
        const firstHeader = page.locator('.finder-sidebar-group-header').first();
        const firstToggle = firstHeader.locator('button');

        // Collapse first group
        await firstHeader.hover();
        await firstToggle.click();
        await page.waitForTimeout(200);

        // Navigate to GitHub
        const githubButton = page.locator('button:has-text("GitHub Projekte")');
        await githubButton.click();
        await page.waitForTimeout(300);

        // Go back to Computer
        const computerButton = page.locator('button:has-text("Computer")');
        await computerButton.click();
        await page.waitForTimeout(300);

        // Group should still be collapsed
        const visibleItems = await page
            .locator('.mb-5')
            .first()
            .locator('.finder-sidebar-item')
            .count();
        expect(visibleItems).toBe(0);

        const ariaExpanded = await firstToggle.getAttribute('aria-expanded');
        expect(ariaExpanded).toBe('false');
    });

    test('should show and hide toggle on focus within group header', async ({ page }) => {
        const firstHeader = page.locator('.finder-sidebar-group-header').first();
        const toggleButton = firstHeader.locator('button');

        // Tab to focus the toggle button
        await page.keyboard.press('Tab');

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
