/**
 * Window Manager Performance Tests
 * 
 * Tests for window management performance with many simultaneous windows
 * Target: < 50ms for window operations with 20+ windows
 */

import { test, expect } from '@playwright/test';
import utils from '../utils.js';

test.describe('Window Manager Performance @basic', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await utils.waitForAppReady(page);
        
        // Enable performance monitoring
        await page.evaluate(() => {
            if (window.PerfMonitor) {
                window.PerfMonitor.enable();
            }
        });
    });

    test.afterEach(async ({ page }) => {
        // Clean up all terminal instances to ensure test isolation
        await page.evaluate(() => {
            if (window.TerminalInstanceManager) {
                window.TerminalInstanceManager.destroyAllInstances();
            }
            if (window.TextEditorInstanceManager) {
                window.TextEditorInstanceManager.destroyAllInstances();
            }
        });
    });

    test('opening 20 terminal windows performs within target (<50ms each)', async ({ page }) => {
        const result = await page.evaluate(() => {
            const timings = [];
            const manager = window.TerminalInstanceManager;
            
            if (!manager) {
                return { error: 'TerminalInstanceManager not found' };
            }

            // Open 20 terminal instances and measure each
            for (let i = 0; i < 20; i++) {
                const startTime = performance.now();
                
                const terminal = manager.createInstance({
                    title: `Terminal ${i + 1}`,
                });
                
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                timings.push({
                    index: i + 1,
                    duration,
                    instanceId: terminal?.instanceId,
                });
            }

            // Get statistics
            const durations = timings.map(t => t.duration);
            const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
            const maxDuration = Math.max(...durations);
            const minDuration = Math.min(...durations);
            
            // Get last 5 timings (representing performance at 15-20 windows)
            const lastFive = timings.slice(-5);
            const lastFiveAvg = lastFive.reduce((a, t) => a + t.duration, 0) / lastFive.length;

            return {
                totalWindows: timings.length,
                avgDuration,
                maxDuration,
                minDuration,
                lastFiveAvg,
                firstFive: timings.slice(0, 5),
                lastFive: timings.slice(-5),
            };
        });

        console.log('Performance Results:', {
            totalWindows: result.totalWindows,
            avgDuration: `${result.avgDuration.toFixed(2)}ms`,
            maxDuration: `${result.maxDuration.toFixed(2)}ms`,
            minDuration: `${result.minDuration.toFixed(2)}ms`,
            lastFiveAvg: `${result.lastFiveAvg.toFixed(2)}ms`,
        });

        // Verify we created all 20 windows
        expect(result.totalWindows).toBe(20);
        
        // Performance assertions
        // First window should be fast (< 100ms to allow for initialization)
        expect(result.firstFive[0].duration).toBeLessThan(100);
        
        // Average for last 5 windows (15-20) should be < 50ms
        expect(result.lastFiveAvg).toBeLessThan(50);
        
        // No single window should take > 150ms (even with init overhead)
        expect(result.maxDuration).toBeLessThan(150);
    });

    test('bringToFront with 20 windows performs within target (<20ms)', async ({ page }) => {
        // First create 20 terminal instances
        await page.evaluate(() => {
            const manager = window.TerminalInstanceManager;
            for (let i = 0; i < 20; i++) {
                manager.createInstance({ title: `Terminal ${i + 1}` });
            }
        });

        // Now measure bringToFront performance
        const result = await page.evaluate(() => {
            const manager = window.TerminalInstanceManager;
            const instances = manager.getAllInstanceIds();
            const timings = [];

            // Test bringing various windows to front
            for (let i = 0; i < 10; i++) {
                const instanceId = instances[i % instances.length];
                const windowId = 'terminal-modal';
                
                const startTime = performance.now();
                
                if (window.API && window.API.window) {
                    window.API.window.bringToFront(windowId);
                }
                
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                timings.push({ instanceId, duration });
            }

            const durations = timings.map(t => t.duration);
            const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
            const maxDuration = Math.max(...durations);

            return {
                totalTests: timings.length,
                avgDuration,
                maxDuration,
                timings,
            };
        });

        console.log('BringToFront Performance:', {
            avgDuration: `${result.avgDuration.toFixed(2)}ms`,
            maxDuration: `${result.maxDuration.toFixed(2)}ms`,
        });

        // Target: < 20ms average
        expect(result.avgDuration).toBeLessThan(20);
        
        // Max should not exceed 30ms
        expect(result.maxDuration).toBeLessThan(30);
    });

    test('closing windows with many open performs within target (<30ms)', async ({ page }) => {
        const result = await page.evaluate(() => {
            const manager = window.TerminalInstanceManager;
            const timings = [];
            
            // Create 20 instances
            const instanceIds = [];
            for (let i = 0; i < 20; i++) {
                const terminal = manager.createInstance({ title: `Terminal ${i + 1}` });
                instanceIds.push(terminal.instanceId);
            }

            // Close them and measure
            for (const instanceId of instanceIds) {
                const startTime = performance.now();
                
                manager.destroyInstance(instanceId);
                
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                timings.push({ instanceId, duration });
            }

            const durations = timings.map(t => t.duration);
            const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
            const maxDuration = Math.max(...durations);

            return {
                totalClosed: timings.length,
                avgDuration,
                maxDuration,
            };
        });

        console.log('Close Performance:', {
            totalClosed: result.totalClosed,
            avgDuration: `${result.avgDuration.toFixed(2)}ms`,
            maxDuration: `${result.maxDuration.toFixed(2)}ms`,
        });

        expect(result.totalClosed).toBe(20);
        expect(result.avgDuration).toBeLessThan(30);
        expect(result.maxDuration).toBeLessThan(50);
    });

    test('no visual glitches with rapid window operations', async ({ page }) => {
        // This test verifies that batch DOM updates work correctly
        const result = await page.evaluate(() => {
            const manager = window.TerminalInstanceManager;
            
            // Create 10 instances rapidly
            const instances = [];
            for (let i = 0; i < 10; i++) {
                instances.push(manager.createInstance({ title: `Terminal ${i + 1}` }));
            }

            // Rapidly switch focus between windows
            for (let i = 0; i < 20; i++) {
                const instanceId = instances[i % instances.length].instanceId;
                manager.setActiveInstance(instanceId);
            }

            // Wait for any pending RAF updates to flush
            return new Promise(resolve => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        // Verify all windows have valid z-index
                        const windowEl = document.getElementById('terminal-modal');
                        const zIndex = windowEl ? parseInt(window.getComputedStyle(windowEl).zIndex, 10) : 0;
                        
                        resolve({
                            success: true,
                            instanceCount: manager.getInstanceCount(),
                            windowZIndex: zIndex,
                            hasValidZIndex: !isNaN(zIndex) && zIndex >= 1000,
                        });
                    });
                });
            });
        });

        expect(result.success).toBe(true);
        expect(result.instanceCount).toBe(10);
        expect(result.hasValidZIndex).toBe(true);
    });
});
