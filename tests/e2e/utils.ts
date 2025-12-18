/**
 * Playwright Testing Utilities
 * Provides higher-level DOM query helpers and interactions
 * Inspired by @testing-library patterns
 */

import { expect, Page } from '@playwright/test';

/**
 * Higher-level DOM query helpers for Playwright
 * Makes tests more readable and maintainable
 */
export const screen = {
    /**
     * Find element by accessible role + name
     * E.g. screen.getByRole('button', { name: 'Submit' })
     */
    getByRole: (page: Page, role: string, options?: { name?: string | RegExp; exact?: boolean }) => {
        return page.getByRole(role as any, options);
    },

    /**
     * Find element by label text (for form controls)
     */
    getByLabel: (page: Page, label: string | RegExp) => {
        return page.locator(`label:has-text("${label}") ~ input, label:has-text("${label}") ~ select`);
    },

    /**
     * Find element by placeholder
     */
    getByPlaceholder: (page: Page, placeholder: string | RegExp) => {
        return page.getByPlaceholder(placeholder);
    },

    /**
     * Find element by text content
     */
    getByText: (page: Page, text: string | RegExp) => {
        return page.getByText(text);
    },

    /**
     * Find element by test ID (data-testid)
     */
    getByTestId: (page: Page, testId: string) => {
        return page.getByTestId(testId);
    },
};

/**
 * Wait for app-specific states
 */
export const waitFor = {
    /**
     * Wait for app ready (window.__APP_READY)
     */
    appReady: async (page: Page, timeout = 30000) => {
        await page.waitForFunction(() => (window as any).__APP_READY === true, {
            timeout,
        });
    },

    /**
     * Wait for element to be visible and stable
     */
    element: async (page: Page, selector: string, timeout = 5000) => {
        const element = page.locator(selector);
        await element.waitFor({ state: 'visible', timeout });
        return element;
    },

    /**
     * Wait for specific window count
     */
    windowCount: async (page: Page, expectedCount: number, timeout = 5000) => {
        await page.waitForFunction(
            (count) => {
                const windows = document.querySelectorAll('[data-window-id]');
                return windows.length === count;
            },
            expectedCount,
            { timeout }
        );
    },

    /**
     * Wait for localStorage key to exist
     */
    localStorage: async (page: Page, key: string, timeout = 5000) => {
        await page.waitForFunction(
            (storageKey) => localStorage.getItem(storageKey) !== null,
            key,
            { timeout }
        );
    },
};

/**
 * Common user interactions
 */
export const userActions = {
    /**
     * Click by role + name
     */
    clickByRole: async (
        page: Page,
        role: string,
        options?: { name?: string | RegExp; exact?: boolean }
    ) => {
        await screen.getByRole(page, role, options).click();
    },

    /**
     * Fill input by label
     */
    fillByLabel: async (page: Page, label: string | RegExp, value: string) => {
        const input = page.locator(`label:has-text("${label}") ~ input`).first();
        await input.fill(value);
    },

    /**
     * Type in field (for autocomplete, real user input)
     */
    type: async (page: Page, selector: string, text: string, delay = 50) => {
        await page.locator(selector).type(text, { delay });
    },

    /**
     * Double-click element
     */
    doubleClick: async (page: Page, selector: string) => {
        await page.locator(selector).dblclick();
    },

    /**
     * Right-click for context menu
     */
    contextMenu: async (page: Page, selector: string) => {
        await page.locator(selector).click({ button: 'right' });
    },

    /**
     * Drag and drop
     */
    dragAndDrop: async (page: Page, source: string, target: string) => {
        await page.locator(source).dragTo(page.locator(target));
    },

    /**
     * Keyboard shortcut (e.g., 'Control+A', 'Meta+S')
     */
    keyboard: async (page: Page, keys: string) => {
        await page.keyboard.press(keys);
    },

    /**
     * Select option in select element
     */
    selectOption: async (page: Page, selector: string, value: string) => {
        await page.locator(selector).selectOption(value);
    },
};

/**
 * Assertions (extends Playwright expect)
 */
export const assertions = {
    /**
     * Assert element is visible
     */
    isVisible: async (page: Page, selector: string) => {
        await expect(page.locator(selector)).toBeVisible();
    },

    /**
     * Assert element is hidden
     */
    isHidden: async (page: Page, selector: string) => {
        await expect(page.locator(selector)).toBeHidden();
    },

    /**
     * Assert element has text
     */
    hasText: async (page: Page, selector: string, text: string | RegExp) => {
        await expect(page.locator(selector)).toContainText(text);
    },

    /**
     * Assert element count
     */
    hasCount: async (page: Page, selector: string, count: number) => {
        await expect(page.locator(selector)).toHaveCount(count);
    },

    /**
     * Assert element is enabled
     */
    isEnabled: async (page: Page, selector: string) => {
        await expect(page.locator(selector)).toBeEnabled();
    },

    /**
     * Assert element is disabled
     */
    isDisabled: async (page: Page, selector: string) => {
        await expect(page.locator(selector)).toBeDisabled();
    },

    /**
     * Assert value in input
     */
    hasValue: async (page: Page, selector: string, value: string) => {
        await expect(page.locator(selector)).toHaveValue(value);
    },

    /**
     * Assert localStorage key has value
     */
    localStorageValue: async (page: Page, key: string, expectedValue: string | RegExp) => {
        const value = await page.evaluate((storageKey) => localStorage.getItem(storageKey), key);
        if (expectedValue instanceof RegExp) {
            expect(value).toMatch(expectedValue);
        } else {
            expect(value).toBe(expectedValue);
        }
    },
};

/**
 * Debugging helpers
 */
export const debug = {
    /**
     * Take screenshot with auto-naming
     */
    screenshot: async (page: Page, name: string) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        await page.screenshot({ path: `test-results/${name}-${timestamp}.png` });
    },

    /**
     * Log current page state
     */
    logState: async (page: Page) => {
        const title = await page.title();
        const url = page.url();
        const windowCount = await page.locator('[data-window-id]').count();
        console.log(`📍 Title: ${title}`);
        console.log(`🔗 URL: ${url}`);
        console.log(`🪟 Windows: ${windowCount}`);
    },

    /**
     * Dump HTML of element
     */
    dumpHTML: async (page: Page, selector: string) => {
        const html = await page.locator(selector).first().innerHTML();
        console.log(html);
    },

    /**
     * Wait and pause execution (for manual inspection)
     */
    pause: async (page: Page) => {
        await page.pause();
    },
};

export default {
    screen,
    waitFor,
    userActions,
    assertions,
    debug,
};
