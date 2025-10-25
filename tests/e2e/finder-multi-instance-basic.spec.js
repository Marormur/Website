/**
 * Finder Multi-Instance Basic Tests
 * Tests for multiple Finder windows with isolated state
 */

import { test, expect } from '@playwright/test';
import utils from './utils.js';

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
                FinderInstance: typeof window.FinderInstance,
                FinderInstanceManager: window.FinderInstanceManager !== undefined,
                FinderSystem: window.FinderSystem !== undefined
            };
        });

        console.log('Finder modules:', modulesAvailable);

        // Assertions
        expect(modulesAvailable.FinderInstance).toBe('function');
        expect(modulesAvailable.FinderInstanceManager).toBe(true);
    });

    test('can create a finder instance', async ({ page }) => {
    // Navigation handled in beforeEach

        const result = await page.evaluate(() => {
            try {
                const manager = window.FinderInstanceManager;
                if (!manager) return { error: 'FinderInstanceManager not found' };

                const finder = manager.createInstance({ title: 'Test Finder' });

                return {
                    success: finder !== null,
                    instanceId: finder?.instanceId,
                    type: finder?.type,
                    title: finder?.title
                };
            } catch (error) {
                return { error: error.message };
            }
        });

        console.log('Finder instance result:', result);

        expect(result.success).toBe(true);
        expect(result.type).toBe('finder');
        expect(result.title).toBe('Test Finder');
    });

    test('can create multiple finder instances with isolated state', async ({ page }) => {
    // Navigation handled in beforeEach

        const result = await page.evaluate(() => {
            try {
                const manager = window.FinderInstanceManager;
                if (!manager) return { error: 'FinderInstanceManager not found' };

                // Create two finder instances
                const finder1 = manager.createInstance({ title: 'Finder 1' });
                const finder2 = manager.createInstance({ title: 'Finder 2' });

                if (!finder1 || !finder2) {
                    return { error: 'Failed to create instances' };
                }

                // Set different paths in each instance
                finder1.navigateTo(['Computer', 'Documents']);
                finder2.navigateTo(['Computer', 'Downloads']);

                // Verify state isolation
                return {
                    success: true,
                    count: manager.getInstanceCount(),
                    finder1Path: finder1.currentPath.join('/'),
                    finder2Path: finder2.currentPath.join('/'),
                    isolated: finder1.currentPath.join('/') !== finder2.currentPath.join('/')
                };
            } catch (error) {
                return { error: error.message };
            }
        });

        console.log('Multiple instances result:', result);

        expect(result.success).toBe(true);
        expect(result.count).toBe(2);
        expect(result.finder1Path).toBe('Computer/Documents');
        expect(result.finder2Path).toBe('Computer/Downloads');
        expect(result.isolated).toBe(true);
    });

    test('can switch between finder instances', async ({ page }) => {
    // Navigation handled in beforeEach

        const result = await page.evaluate(() => {
            try {
                const manager = window.FinderInstanceManager;
                if (!manager) return { error: 'FinderInstanceManager not found' };

                // Create two instances
                const finder1 = manager.createInstance({ title: 'Finder 1' });
                const finder2 = manager.createInstance({ title: 'Finder 2' });

                if (!finder1 || !finder2) {
                    return { error: 'Failed to create instances' };
                }

                // Initially, finder2 should be active (last created)
                const initialActive = manager.getActiveInstance();

                // Switch to finder1
                manager.setActiveInstance(finder1.instanceId);
                const newActive = manager.getActiveInstance();

                return {
                    success: true,
                    initialActiveId: initialActive?.instanceId,
                    newActiveId: newActive?.instanceId,
                    switched: initialActive?.instanceId !== newActive?.instanceId
                };
            } catch (error) {
                return { error: error.message };
            }
        });

        console.log('Instance switching result:', result);

        expect(result.success).toBe(true);
        expect(result.switched).toBe(true);
    });

    test('finder instances have independent view states', async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);

        const result = await page.evaluate(() => {
            try {
                const manager = window.FinderInstanceManager;
                if (!manager) return { error: 'FinderInstanceManager not found' };

                // Create two instances
                const finder1 = manager.createInstance({ title: 'Finder 1' });
                const finder2 = manager.createInstance({ title: 'Finder 2' });

                if (!finder1 || !finder2) {
                    return { error: 'Failed to create instances' };
                }

                // Set different view modes
                finder1.setViewMode('list');
                finder2.setViewMode('grid');

                // Set different views
                finder1.switchView('computer');
                finder2.switchView('github');

                return {
                    success: true,
                    finder1ViewMode: finder1.viewMode,
                    finder2ViewMode: finder2.viewMode,
                    finder1View: finder1.currentView,
                    finder2View: finder2.currentView,
                    viewModesIsolated: finder1.viewMode !== finder2.viewMode,
                    viewsIsolated: finder1.currentView !== finder2.currentView
                };
            } catch (error) {
                return { error: error.message };
            }
        });

        console.log('View states result:', result);

        expect(result.success).toBe(true);
        expect(result.finder1ViewMode).toBe('list');
        expect(result.finder2ViewMode).toBe('grid');
        expect(result.finder1View).toBe('computer');
        expect(result.finder2View).toBe('github');
        expect(result.viewModesIsolated).toBe(true);
        expect(result.viewsIsolated).toBe(true);
    });
});
