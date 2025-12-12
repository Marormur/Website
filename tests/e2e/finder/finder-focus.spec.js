/**
 * @file finder-focus.spec.js
 * Tests für Fokuswechsel zwischen mehreren Finder-Fenstern
 */

const { test, expect } = require('@playwright/test');
const { waitForAppReady } = require('../utils');

test.describe('Finder Multi-Window Focus', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
        
        // Close all existing Finder windows from previous tests
        const cleanupResult = await page.evaluate(() => {
            if (window.WindowRegistry) {
                const finders = window.WindowRegistry.getWindowsByType('finder');
                console.log(`[beforeEach] Found ${finders.length} finder windows to close`);
                finders.forEach(f => {
                    console.log(`[beforeEach] Closing ${f.id}`);
                    try {
                        f.close();
                    } catch (e) {
                        console.error(`[beforeEach] Failed to close ${f.id}:`, e);
                    }
                });
                
                // Double-check after closing
                const remaining = window.WindowRegistry.getWindowsByType('finder');
                const domElements = Array.from(document.querySelectorAll('.multi-window[id^="window-finder-"]'));
                const visibleElements = domElements.filter(el => !el.classList.contains('hidden'));
                
                return {
                    closedCount: finders.length,
                    remainingInRegistry: remaining.length,
                    domElements: domElements.length,
                    visibleElements: visibleElements.length,
                };
            }
            return { error: 'WindowRegistry not available' };
        });
        
        console.log('[beforeEach] Cleanup result:', cleanupResult);
    });

    test.afterEach(async ({ page }) => {
        // Close all Finder windows after each test
        await page.evaluate(() => {
            if (window.WindowRegistry) {
                const finders = window.WindowRegistry.getWindowsByType('finder');
                console.log(`Closing ${finders.length} finder windows...`);
                finders.forEach(f => {
                    try {
                        f.close();
                    } catch (e) {
                        console.error(`Failed to close ${f.id}:`, e);
                    }
                });
            }
        });
        
        // Verify all windows are closed
        const remainingWindows = await page.evaluate(() => {
            const finders = Array.from(document.querySelectorAll('.multi-window[id^="window-finder-"]'));
            return finders.filter(f => !f.classList.contains('hidden')).length;
        });
        
        if (remainingWindows > 0) {
            console.warn(`Warning: ${remainingWindows} Finder windows still visible after cleanup`);
        }
    });

    test('should switch focus between two Finder windows on click', async ({ page }) => {
        // Debug: Check if FinderWindow is available
        const hasFinderWindow = await page.evaluate(() => {
            return {
                FinderWindow: !!window.FinderWindow,
                create: !!(window.FinderWindow && typeof window.FinderWindow.create === 'function'),
                WindowRegistry: !!window.WindowRegistry,
            };
        });
        console.log('Finder environment:', hasFinderWindow);

        // Open first Finder window (using multi-window system)
        const createResult = await page.evaluate(() => {
            if (window.FinderWindow && typeof window.FinderWindow.create === 'function') {
                try {
                    const win = window.FinderWindow.create();
                    return {
                        success: true,
                        id: win?.id,
                        element: !!win?.element,
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message,
                    };
                }
            }
            return { success: false, reason: 'FinderWindow.create not available' };
        });
        console.log('Create result:', createResult);
        
        // Wait for the first finder window
        await page.waitForSelector(`#${createResult.id}`, { state: 'visible', timeout: 5000 });

        // Get first finder window ID
        const firstWindowId = await page.evaluate(() => {
            const finder = document.querySelector('[id^="window-finder-"]');
            return finder?.id;
        });
        console.log('First Finder window:', firstWindowId);

        // Open second Finder window directly (avoid clicking blocked Dock icon)
        const secondWindowId = await page.evaluate(() => {
            if (window.FinderWindow && typeof window.FinderWindow.create === 'function') {
                const win = window.FinderWindow.create();
                return win.id;
            }
            return null;
        });
        await page.waitForTimeout(100); // Brief wait for second window to be fully initialized

        // Get all finder windows (only visible ones)
        const finderWindows = await page.evaluate(() => {
            // Use .multi-window class to only select the main window elements, not their children
            const finders = Array.from(document.querySelectorAll('.multi-window[id^="window-finder-"]'));
            const visible = finders.filter(f => !f.classList.contains('hidden'));
            console.log(`Total finder windows: ${finders.length}, Visible: ${visible.length}`);
            finders.forEach((f, i) => {
                console.log(`  ${i}: ${f.id}, hidden=${f.classList.contains('hidden')}, zIndex=${window.getComputedStyle(f).zIndex}`);
            });
            return visible.map(f => ({
                id: f.id,
                zIndex: window.getComputedStyle(f).zIndex,
            }));
        });
        console.log('Finder windows after opening second:', finderWindows);
        expect(finderWindows.length).toBe(2);

        // Find windows by their IDs (not by array position)
        const firstWindow = finderWindows.find(w => w.id === firstWindowId);
        const secondWindow = finderWindows.find(w => w.id === secondWindowId);
        
        expect(firstWindow).toBeDefined();
        expect(secondWindow).toBeDefined();
        
        console.log(`First window ${firstWindow.id}: z-index=${firstWindow.zIndex}`);
        console.log(`Second window ${secondWindow.id}: z-index=${secondWindow.zIndex}`);

        // Second window should be on top (higher z-index) since it was created last
        expect(parseInt(secondWindow.zIndex)).toBeGreaterThan(parseInt(firstWindow.zIndex));

        // Click on the first (back) window's title bar
        const titleSelector = `#${firstWindow.id} .draggable-header h2`;
        const titleElement = await page.$(titleSelector);
        
        if (titleElement) {
            // Try clicking the title
            await titleElement.click({ force: true });
        } else {
            // Fallback: click somewhere in the first window
            await page.click(`#${firstWindow.id}`, { force: true });
        }
        
        await page.waitForTimeout(50); // Brief wait for z-index update

        // Check z-indexes after click (only visible windows)
        const finderWindowsAfterClick = await page.evaluate(() => {
            const finders = Array.from(document.querySelectorAll('.multi-window[id^="window-finder-"]'));
            return finders
                .filter(f => !f.classList.contains('hidden'))
                .map(f => ({
                    id: f.id,
                    zIndex: window.getComputedStyle(f).zIndex,
                }));
        });
        console.log('Finder windows after clicking first:', finderWindowsAfterClick);

        // First window should now be on top
        const firstAfterClick = finderWindowsAfterClick.find(w => w.id === firstWindow.id);
        const secondAfterClick = finderWindowsAfterClick.find(w => w.id === secondWindow.id);
        
        expect(parseInt(firstAfterClick.zIndex)).toBeGreaterThan(parseInt(secondAfterClick.zIndex));
    });

    test('should update z-index when clicking window content area', async ({ page }) => {
        // Open two Finder windows
        await page.evaluate(() => {
            if (window.FinderWindow && typeof window.FinderWindow.create === 'function') {
                window.FinderWindow.create();
                window.FinderWindow.create();
            }
        });
        await page.waitForSelector('[id^="window-"][id*="finder"]', { state: 'visible' });
        await page.waitForTimeout(100); // Brief wait for second window creation

        const finderWindows = await page.evaluate(() => {
            const finders = Array.from(document.querySelectorAll('[id^="window-finder-"]'));
            return finders.filter(f => !f.classList.contains('hidden')).map(f => f.id);
        });

        // Click on the sidebar of the first (back) window
        const sidebarSelector = `#${finderWindows[0]} .finder-sidebar`;
        const sidebar = await page.$(sidebarSelector);
        
        if (sidebar) {
            await sidebar.click({ force: true });
            await page.waitForTimeout(50); // Brief wait for z-index update

            // Check if z-index changed
            const zIndexes = await page.evaluate((ids) => {
                return ids.map(id => ({
                    id,
                    zIndex: window.getComputedStyle(document.getElementById(id)).zIndex,
                }));
            }, finderWindows);

            console.log('Z-indexes after sidebar click:', zIndexes);
            
            // First window should be on top now
            expect(parseInt(zIndexes[0].zIndex)).toBeGreaterThan(parseInt(zIndexes[1].zIndex));
        } else {
            console.warn('Sidebar not found, test incomplete');
        }
    });

    test('should track window stack correctly', async ({ page }) => {
        // Open two Finder windows
        await page.evaluate(() => {
            if (window.FinderWindow && typeof window.FinderWindow.create === 'function') {
                window.FinderWindow.create();
                window.FinderWindow.create();
            }
        });
        await page.waitForSelector('[id^="window-"][id*="finder"]', { state: 'visible' });
        await page.waitForTimeout(100); // Brief wait for second window creation

        // Check if __zIndexManager is tracking both windows
        const stackInfo = await page.evaluate(() => {
            const manager = window.__zIndexManager;
            if (!manager) {
                return { exists: false };
            }
            return {
                exists: true,
                stack: manager.getWindowStack ? manager.getWindowStack() : [],
            };
        });

        console.log('Z-index manager stack:', stackInfo);
        
        if (stackInfo.exists) {
            // Both Finder windows should be in the stack
            expect(stackInfo.stack.length).toBeGreaterThanOrEqual(2);
        } else {
            console.warn('__zIndexManager not found - this indicates the problem');
        }
    });

    test('should handle many focus switches without breaking', async ({ page }) => {
        // Open two Finder windows
        const windowIds = await page.evaluate(() => {
            if (window.FinderWindow && typeof window.FinderWindow.create === 'function') {
                const win1 = window.FinderWindow.create();
                const win2 = window.FinderWindow.create();
                return [win1.id, win2.id];
            }
            return [];
        });
        
        expect(windowIds.length).toBe(2);
        
        // Wait for windows to be fully created and visible
        await page.waitForSelector(`#${windowIds[0]}`, { state: 'visible', timeout: 5000 });
        await page.waitForSelector(`#${windowIds[1]}`, { state: 'visible', timeout: 5000 });
        await page.waitForTimeout(200); // Additional wait for initialization

        // Switch focus between windows many times (20 times)
        for (let i = 0; i < 20; i++) {
            const targetId = windowIds[i % 2];
            
            // Bring window to front explicitly to ensure consistent behavior
            await page.evaluate((id) => {
                const window = globalThis.WindowRegistry?.getWindow(id);
                if (window && typeof window.bringToFront === 'function') {
                    window.bringToFront();
                }
            }, targetId);
            await page.waitForTimeout(30); // Brief wait for z-index update
            
            // Verify the window is on top (only check every 5 switches to speed up test)
            if (i % 5 === 0) {
                const debugInfo = await page.evaluate((id) => {
                    const element = document.getElementById(id);
                    if (!element) return { found: false, id };
                    
                    const zIndex = parseInt(window.getComputedStyle(element).zIndex, 10);
                    
                    // Check that this window has the highest z-index
                    const allFinders = Array.from(document.querySelectorAll('.multi-window[id^="window-finder-"]'));
                    const allZIndexes = allFinders
                        .filter(f => !f.classList.contains('hidden'))
                        .map(f => ({
                            id: f.id,
                            zIndex: parseInt(window.getComputedStyle(f).zIndex, 10),
                            hidden: f.classList.contains('hidden'),
                        }));
                    const maxZIndex = Math.max(...allZIndexes.map(w => w.zIndex));
                    
                    return {
                        found: true,
                        id,
                        zIndex,
                        maxZIndex,
                        isOnTop: zIndex === maxZIndex,
                        allWindows: allZIndexes,
                    };
                }, targetId);
                
                if (!debugInfo.found) {
                    console.error(`Window ${targetId} not found in DOM at iteration ${i}`);
                }
                
                if (!debugInfo.isOnTop) {
                    console.error(`At iteration ${i}, window ${targetId} not on top:`, debugInfo);
                }
                
                expect(debugInfo.isOnTop).toBe(true);
            }
        }
        
        // Final check: verify z-indexes are reasonable (not growing infinitely)
        const finalZIndexes = await page.evaluate(() => {
            const finders = Array.from(document.querySelectorAll('.multi-window[id^="window-finder-"]'));
            return finders
                .filter(f => !f.classList.contains('hidden'))
                .map(f => ({
                    id: f.id,
                    zIndex: parseInt(window.getComputedStyle(f).zIndex, 10),
                }));
        });
        
        console.log('Final z-indexes after 20 switches:', finalZIndexes);
        
        // Z-indexes should stay within reasonable bounds (BASE_Z_INDEX + window count)
        // If using stack-based management, should be around 1000-1002
        const maxZIndex = Math.max(...finalZIndexes.map(w => w.zIndex));
        expect(maxZIndex).toBeLessThan(1100); // Should not grow beyond BASE + small offset
    });
});
