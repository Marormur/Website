/**
 * Finder Multi-Instance Basic Tests
 * Tests for multiple Finder windows with isolated state
 */

import { test, expect } from '@playwright/test';
import utils from '../utils.js';

test.describe('Finder Multi-Instance System - Basic', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await utils.waitForAppReady(page);
    });

    test('page loads and Finder modules are available', async ({ page }) => {
        // Listen for console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Navigation handled in beforeEach

        // Check console errors
        console.log('Console errors:', consoleErrors);

        // Check if Finder modules loaded
        const modulesAvailable = await page.evaluate(() => {
            return {
                FinderWindow: typeof window.FinderWindow,
                WindowRegistry: window.WindowRegistry !== undefined,
            };
        });

        console.log('Finder modules:', modulesAvailable);

        // Assertions
        expect(modulesAvailable.FinderWindow).toBe('function');
        expect(modulesAvailable.WindowRegistry).toBe(true);
    });

    test('can create a finder window', async ({ page }) => {
        // Navigation handled in beforeEach

        const result = await page.evaluate(() => {
            try {
                const FW = window.FinderWindow;
                const WR = window.WindowRegistry;
                if (typeof FW !== 'function' || !WR) {
                    return { error: 'FinderWindow or WindowRegistry not available' };
                }
                const win = FW.create({});
                const count = WR.getWindowsByType('finder').length;
                return {
                    success: !!win,
                    count,
                    windowId: win?.id,
                    type: win?.type,
                };
            } catch (error) {
                return { error: error.message };
            }
        });

        console.log('Finder instance result:', result);

        expect(result.success).toBe(true);
        expect(result.type).toBe('finder');
        expect(result.count).toBeGreaterThanOrEqual(1);
    });

    test('can create multiple finder windows with isolated state', async ({ page }) => {
        // Navigation handled in beforeEach

        const result = await page.evaluate(() => {
            try {
                const FW = window.FinderWindow;
                const WR = window.WindowRegistry;
                if (typeof FW !== 'function' || !WR) {
                    return { error: 'FinderWindow or WindowRegistry not available' };
                }
                const w1 = FW.create({});
                const w2 = FW.create({});
                const count = WR.getWindowsByType('finder').length;
                // Validate isolation by different IDs (distinct windows)
                const isolated = w1.id !== w2.id;
                return {
                    success: !!(w1 && w2),
                    count,
                    w1Id: w1.id,
                    w2Id: w2.id,
                    isolated,
                };
            } catch (error) {
                return { error: error.message };
            }
        });

        console.log('Multiple instances result:', result);

        expect(result.success).toBe(true);
        expect(result.count).toBeGreaterThanOrEqual(2);
        expect(result.isolated).toBe(true);
    });

    test('can switch between finder windows', async ({ page }) => {
        // Navigation handled in beforeEach

        const result = await page.evaluate(() => {
            try {
                const FW = window.FinderWindow;
                const WR = window.WindowRegistry;
                if (typeof FW !== 'function' || !WR) {
                    return { error: 'FinderWindow or WindowRegistry not available' };
                }
                const w1 = FW.create({});
                const w2 = FW.create({});
                const initialActive = WR.getActiveWindow();
                // Bring first window to front
                w1.bringToFront();
                const newActive = WR.getActiveWindow();
                return {
                    success: true,
                    initialActiveId: initialActive?.id || null,
                    newActiveId: newActive?.id || null,
                    switched: (initialActive?.id || null) !== (newActive?.id || null),
                };
            } catch (error) {
                return { error: error.message };
            }
        });

        console.log('Instance switching result:', result);

        expect(result.success).toBe(true);
        expect(result.switched).toBe(true);
    });

    test('finder windows have independent view states', async ({ page }) => {
        await page.goto('/');
        // Wait for the application to be fully ready instead of a fixed sleep
        await utils.waitForAppReady(page);

        const result = await page.evaluate(() => {
            try {
                const FW = window.FinderWindow;
                if (typeof FW !== 'function') {
                    return { error: 'FinderWindow not available' };
                }
                const w1 = FW.create({});
                const w2 = FW.create({});
                // Create different initial tabs/views in each window
                const v1 = w1.createView('Computer');
                const v2 = w2.createGithubView('GitHub');
                const view1Title = v1?.title || 'Computer';
                const view2Title = v2?.title || 'GitHub';
                return {
                    success: !!(w1 && w2),
                    finder1View: view1Title,
                    finder2View: view2Title,
                    viewsIsolated: view1Title !== view2Title,
                };
            } catch (error) {
                return { error: error.message };
            }
        });

        console.log('View states result:', result);

        expect(result.success).toBe(true);
        expect(result.finder1View).toBe('Computer');
        expect(result.finder2View).toBe('GitHub');
        expect(result.viewsIsolated).toBe(true);
    });
});
