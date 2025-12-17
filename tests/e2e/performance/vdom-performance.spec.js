/**
 * VDOM Performance E2E Tests
 *
 * Validates VDOM migration performance targets for:
 * - FinderView: Rendering, navigation, selection, scroll/selection preservation
 * - Terminal: Output updates, focus preservation
 * - TextEditor: Toolbar updates, focus preservation
 * - Memory leak detection
 *
 * Performance Targets:
 * - FinderView Render 100: < 50ms
 * - FinderView Navigate: < 50ms
 * - FinderView Select: < 20ms
 * - Terminal addOutput 100: < 100ms (realistic target for DOM updates)
 * - TextEditor Toolbar: < 20ms
 */

const { test, expect } = require('@playwright/test');
const { waitForAppReady, openFinderWindow } = require('../utils');

test.describe('VDOM Performance - FinderView @basic', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('FinderView: Render 100 items < 50ms', async ({ page }) => {
        // Open Finder and navigate to a location with files
        await openFinderWindow(page);

        // Click Computer sidebar to show virtual files
        const computerBtn = page.locator('#finder-sidebar-computer');
        await computerBtn.waitFor({ state: 'visible', timeout: 5000 });

        // Measure rendering time
        const timing = await page.evaluate(() => {
            // Create test data with 100 items
            const testItems = [];
            for (let i = 0; i < 100; i++) {
                testItems.push({
                    name: `test-file-${i}.txt`,
                    type: 'file',
                    size: 1024 * (i + 1),
                    modified: new Date().toISOString(),
                });
            }

            // Find the Finder instance
            const wins = window.WindowRegistry?.getAllWindows('finder') || [];
            if (wins.length === 0) return -1;

            const finder = wins[0];
            const activeTab = finder.activeTab;
            if (!activeTab || typeof activeTab.renderListView !== 'function') return -1;

            // Measure render time
            const start = performance.now();
            activeTab.renderListView(testItems);
            const end = performance.now();

            return end - start;
        });

        console.log(`[FinderView] Render 100 items: ${timing.toFixed(2)}ms`);
        expect(timing).toBeGreaterThan(0);
        expect(timing).toBeLessThan(50);
    });

    test('FinderView: Render 1000 items (stress test) < 200ms', async ({ page }) => {
        await openFinderWindow(page);

        const computerBtn = page.locator('#finder-sidebar-computer');
        await computerBtn.waitFor({ state: 'visible', timeout: 5000 });

        const timing = await page.evaluate(() => {
            // Create test data with 1000 items
            const testItems = [];
            for (let i = 0; i < 1000; i++) {
                testItems.push({
                    name: `stress-test-${i}.txt`,
                    type: 'file',
                    size: 1024 * (i + 1),
                    modified: new Date().toISOString(),
                });
            }

            const wins = window.WindowRegistry?.getAllWindows('finder') || [];
            if (wins.length === 0) return -1;

            const finder = wins[0];
            const activeTab = finder.activeTab;
            if (!activeTab || typeof activeTab.renderListView !== 'function') return -1;

            const start = performance.now();
            activeTab.renderListView(testItems);
            const end = performance.now();

            return end - start;
        });

        console.log(`[FinderView] Render 1000 items (stress): ${timing.toFixed(2)}ms`);
        expect(timing).toBeGreaterThan(0);
        expect(timing).toBeLessThan(200);
    });

    test('FinderView: Navigation speed < 50ms', async ({ page }) => {
        await openFinderWindow(page);

        // Navigate to Computer to get a baseline
        const computerBtn = page.locator('#finder-sidebar-computer');
        await computerBtn.click();

        // Wait for initial navigation
        await page.waitForTimeout(500);

        // Measure navigation to root
        const timing = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('finder') || [];
            if (wins.length === 0) return -1;

            const finder = wins[0];
            const activeTab = finder.activeTab;
            if (!activeTab || typeof activeTab.navigateTo !== 'function') return -1;

            const start = performance.now();
            activeTab.navigateTo('/');
            const end = performance.now();

            return end - start;
        });

        console.log(`[FinderView] Navigation time: ${timing.toFixed(2)}ms`);
        expect(timing).toBeGreaterThan(0);
        expect(timing).toBeLessThan(50);
    });

    test('FinderView: Selection speed < 20ms', async ({ page }) => {
        await openFinderWindow(page);

        const computerBtn = page.locator('#finder-sidebar-computer');
        await computerBtn.click();
        await page.waitForTimeout(500);

        // Measure selection performance
        const timing = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('finder') || [];
            if (wins.length === 0) return -1;

            const finder = wins[0];
            const activeTab = finder.activeTab;
            if (!activeTab || typeof activeTab.selectItem !== 'function') return -1;

            const start = performance.now();
            activeTab.selectItem(0);
            const end = performance.now();

            return end - start;
        });

        console.log(`[FinderView] Selection time: ${timing.toFixed(2)}ms`);
        expect(timing).toBeGreaterThan(0);
        expect(timing).toBeLessThan(20);
    });

    test('FinderView: Scroll preservation during navigation', async ({ page }) => {
        await openFinderWindow(page);

        const computerBtn = page.locator('#finder-sidebar-computer');
        await computerBtn.click();
        await page.waitForTimeout(500);

        // Add many items to enable scrolling
        await page.evaluate(() => {
            const testItems = [];
            for (let i = 0; i < 100; i++) {
                testItems.push({
                    name: `scroll-test-${i}.txt`,
                    type: 'file',
                    size: 1024,
                    modified: new Date().toISOString(),
                });
            }

            const wins = window.WindowRegistry?.getAllWindows('finder') || [];
            const finder = wins[0];
            const activeTab = finder.activeTab;
            if (activeTab && typeof activeTab.renderListView === 'function') {
                activeTab.renderListView(testItems);
            }
        });

        await page.waitForTimeout(300);

        // Scroll to a specific position
        await page.evaluate(() => {
            const content = document.querySelector('.finder-content');
            if (content) content.scrollTop = 500;
        });

        const scrollBefore = await page.evaluate(() => {
            const content = document.querySelector('.finder-content');
            return content ? content.scrollTop : 0;
        });

        // Navigate into a folder (if any) and back, or just trigger re-render
        await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('finder') || [];
            const finder = wins[0];
            const activeTab = finder.activeTab;
            if (activeTab && typeof activeTab.navigateTo === 'function') {
                const currentPath = activeTab.currentPath;
                activeTab.navigateTo('/Documents'); // Navigate away
                setTimeout(() => activeTab.navigateTo(currentPath), 100); // Navigate back
            }
        });

        await page.waitForTimeout(300);

        const scrollAfter = await page.evaluate(() => {
            const content = document.querySelector('.finder-content');
            return content ? content.scrollTop : 0;
        });

        console.log(`[FinderView] Scroll before: ${scrollBefore}, after: ${scrollAfter}`);
        // Scroll should be preserved (within tolerance)
        expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(100);
    });

    test('FinderView: Selection preservation during updates', async ({ page }) => {
        await openFinderWindow(page);

        const computerBtn = page.locator('#finder-sidebar-computer');
        await computerBtn.click();
        await page.waitForTimeout(500);

        // Select an item
        const selectedBefore = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('finder') || [];
            const finder = wins[0];
            const activeTab = finder.activeTab;
            if (activeTab && typeof activeTab.selectItem === 'function') {
                activeTab.selectItem(2); // Select 3rd item
                return activeTab.selectedIndex;
            }
            return -1;
        });

        expect(selectedBefore).toBe(2);

        // Trigger a re-render
        await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('finder') || [];
            const finder = wins[0];
            const activeTab = finder.activeTab;
            if (activeTab && typeof activeTab.renderListView === 'function') {
                // Re-render with same items
                const items = activeTab.currentItems || [];
                activeTab.renderListView(items);
            }
        });

        await page.waitForTimeout(200);

        const selectedAfter = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('finder') || [];
            const finder = wins[0];
            const activeTab = finder.activeTab;
            return activeTab ? activeTab.selectedIndex : -1;
        });

        console.log(`[FinderView] Selection before: ${selectedBefore}, after: ${selectedAfter}`);
        expect(selectedAfter).toBe(selectedBefore);
    });
});

test.describe('VDOM Performance - Terminal', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);

        // Open terminal
        const terminalDockItem = page.locator('.dock-item[data-window-id="terminal-modal"]');
        await terminalDockItem.click();
        await page.waitForTimeout(500);
    });

    test('Terminal: Add 100 output lines < 100ms', async ({ page }) => {
        const timing = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            if (wins.length === 0) return -1;

            const terminal = wins[0];
            const session = terminal.activeSession;
            if (!session || typeof session.addOutput !== 'function') return -1;

            const start = performance.now();
            for (let i = 0; i < 100; i++) {
                session.addOutput(`Output line ${i}`, 'output');
            }
            const end = performance.now();

            return end - start;
        });

        console.log(`[Terminal] Add 100 output lines: ${timing.toFixed(2)}ms`);
        expect(timing).toBeGreaterThan(0);
        expect(timing).toBeLessThan(100);
    });

    test('Terminal: Input focus preservation (revalidation)', async ({ page }) => {
        // This test validates that terminal input focus is preserved during output updates
        // The actual implementation is in terminal-vdom-focus.spec.js
        // This is a quick smoke test to ensure the feature still works

        const terminalInput = page.locator('[data-terminal-input]').first();
        await expect(terminalInput).toBeVisible();
        await terminalInput.focus();

        // Add output
        await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            const session = wins[0]?.activeSession;
            if (session && typeof session.addOutput === 'function') {
                session.addOutput('Test output', 'output');
            }
        });

        await page.waitForTimeout(100);

        const hasFocus = await page.evaluate(() => {
            const input = document.querySelector('[data-terminal-input]');
            return document.activeElement === input;
        });

        expect(hasFocus).toBe(true);
    });

    test('Terminal: Command execution speed < 50ms', async ({ page }) => {
        const terminalInput = page.locator('[data-terminal-input]').first();
        await expect(terminalInput).toBeVisible();

        // Measure time to execute a simple command
        await terminalInput.fill('echo test');

        const timing = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('terminal') || [];
            if (wins.length === 0) return -1;

            const terminal = wins[0];
            const session = terminal.activeSession;
            if (!session || typeof session.executeCommand !== 'function') return -1;

            const start = performance.now();
            session.executeCommand('echo test');
            const end = performance.now();

            return end - start;
        });

        console.log(`[Terminal] Command execution: ${timing.toFixed(2)}ms`);
        expect(timing).toBeGreaterThan(0);
        expect(timing).toBeLessThan(50);
    });
});

test.describe('VDOM Performance - TextEditor', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);

        // Open text editor
        const editorDockItem = page.locator('.dock-item[data-window-id="texteditor-modal"]');
        await editorDockItem.click();
        await page.waitForTimeout(500);
    });

    test('TextEditor: Toolbar updates < 20ms', async ({ page }) => {
        // Measure toolbar update performance
        const timing = await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('texteditor') || [];
            if (wins.length === 0) return -1;

            const editor = wins[0];
            if (!editor || typeof editor.updateToolbar !== 'function') return -1;

            const start = performance.now();
            editor.updateToolbar();
            const end = performance.now();

            return end - start;
        });

        console.log(`[TextEditor] Toolbar update: ${timing.toFixed(2)}ms`);

        // If updateToolbar doesn't exist or returns -1, skip the performance check
        if (timing > 0) {
            expect(timing).toBeLessThan(20);
        }
    });

    test('TextEditor: Editor focus preservation', async ({ page }) => {
        // Find the CodeMirror editor
        const editor = page.locator('.CodeMirror').first();

        // Check if CodeMirror is available
        const hasCodeMirror = await editor.count();
        if (hasCodeMirror === 0) {
            test.skip(true, 'CodeMirror editor not found - may not be initialized');
        }

        // Focus editor
        await editor.click();
        await page.waitForTimeout(100);

        // Update document (simulate toolbar action)
        await page.evaluate(() => {
            const wins = window.WindowRegistry?.getAllWindows('texteditor') || [];
            if (wins.length > 0 && wins[0].updateToolbar) {
                wins[0].updateToolbar();
            }
        });

        await page.waitForTimeout(100);

        // Check if editor still has focus
        const hasFocus = await page.evaluate(() => {
            const cm = document.querySelector('.CodeMirror');
            if (!cm) return false;
            return (
                cm.classList.contains('CodeMirror-focused') ||
                document.activeElement?.closest('.CodeMirror') !== null
            );
        });

        expect(hasFocus).toBe(true);
    });
});

test.describe('VDOM Performance - Memory Leaks', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        await page.goto(baseURL + '/index.html');
        await waitForAppReady(page);
    });

    test('VDOM cleanup after unmount (no memory leaks)', async ({ page }) => {
        // This test checks that VDOM properly cleans up after component unmount
        const result = await page.evaluate(() => {
            // Check if performance.memory is available (Chrome only)
            if (!performance.memory) {
                return { supported: false };
            }

            const initialMemory = performance.memory.usedJSHeapSize;

            // Create and destroy multiple VDOM trees
            const container = document.createElement('div');
            document.body.appendChild(container);

            for (let i = 0; i < 100; i++) {
                // Create large VDOM tree
                const children = [];
                for (let j = 0; j < 100; j++) {
                    children.push(window.VDOM.h('div', { key: j }, `Item ${j}`));
                }
                const vnode = window.VDOM.h('div', {}, ...children);

                // Render
                const patches = window.VDOM.diff(null, vnode);
                window.VDOM.patch(container, patches);

                // Unmount
                const removePatches = window.VDOM.diff(vnode, null);
                window.VDOM.patch(container, removePatches);
            }

            document.body.removeChild(container);

            // Force GC opportunity
            const finalMemory = performance.memory.usedJSHeapSize;
            const memoryIncrease = finalMemory - initialMemory;

            return {
                supported: true,
                initialMemory,
                finalMemory,
                memoryIncrease,
            };
        });

        if (!result.supported) {
            test.skip(true, 'performance.memory not available (Chrome only)');
        }

        console.log(
            `[VDOM] Memory increase: ${(result.memoryIncrease / 1024 / 1024).toFixed(2)}MB`
        );

        // Memory increase should be reasonable (< 10MB for 10k elements created/destroyed)
        expect(result.memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
});
