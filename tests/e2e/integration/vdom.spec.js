/**
 * VDOM Core Tests
 *
 * Tests the Mini-VDOM implementation for:
 * - VNode creation via h()
 * - Diff algorithm (additions, removals, updates, moves)
 * - Patch application to real DOM
 * - Event delegation
 * - Key-based reconciliation
 * - Performance targets
 */

import { test, expect } from '@playwright/test';
import utils from '../utils.js';

test.describe('VDOM Core @basic', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await utils.waitForAppReady(page);
    });

    test('should have VDOM available on window', async ({ page }) => {
        const hasVDOM = await page.evaluate(() => {
            return (
                typeof window.VDOM !== 'undefined' &&
                typeof window.VDOM.h === 'function' &&
                typeof window.VDOM.diff === 'function' &&
                typeof window.VDOM.patch === 'function'
            );
        });
        expect(hasVDOM).toBe(true);
    });

    test('h() creates valid VNodes', async ({ page }) => {
        const vnode = await page.evaluate(() => {
            const node = window.VDOM.h('div', { className: 'test' }, 'Hello');
            return {
                type: node.type,
                hasProps: typeof node.props === 'object',
                className: node.props.className,
                children: node.children,
                hasKey: node.key !== undefined,
            };
        });

        expect(vnode.type).toBe('div');
        expect(vnode.hasProps).toBe(true);
        expect(vnode.className).toBe('test');
        expect(vnode.children).toEqual(['Hello']);
    });

    test('h() handles multiple children', async ({ page }) => {
        const vnode = await page.evaluate(() => {
            const node = window.VDOM.h(
                'ul',
                {},
                window.VDOM.h('li', {}, 'Item 1'),
                window.VDOM.h('li', {}, 'Item 2')
            );
            return {
                type: node.type,
                childrenCount: node.children.length,
                firstChildType: node.children[0].type,
            };
        });

        expect(vnode.type).toBe('ul');
        expect(vnode.childrenCount).toBe(2);
        expect(vnode.firstChildType).toBe('li');
    });

    test('h() supports key prop for reconciliation', async ({ page }) => {
        const vnode = await page.evaluate(() => {
            const node = window.VDOM.h('div', { key: 'unique-key' }, 'Content');
            return {
                key: node.key,
                propsHasKey: 'key' in node.props,
            };
        });

        expect(vnode.key).toBe('unique-key');
        expect(vnode.propsHasKey).toBe(false); // key should be extracted from props
    });

    test('diff detects new nodes (CREATE)', async ({ page }) => {
        const patches = await page.evaluate(() => {
            const newVTree = window.VDOM.h('div', {}, 'New content');
            return window.VDOM.diff(null, newVTree);
        });

        expect(patches.length).toBeGreaterThan(0);
        expect(patches[0].type).toBe('CREATE');
        expect(patches[0].node).toBeDefined();
    });

    test('diff detects removed nodes (REMOVE)', async ({ page }) => {
        const patches = await page.evaluate(() => {
            const oldVTree = window.VDOM.h('div', {}, 'Old content');
            return window.VDOM.diff(oldVTree, null);
        });

        expect(patches.length).toBeGreaterThan(0);
        expect(patches[0].type).toBe('REMOVE');
    });

    test('diff detects node replacement (REPLACE)', async ({ page }) => {
        const patches = await page.evaluate(() => {
            const oldVTree = window.VDOM.h('div', {}, 'Content');
            const newVTree = window.VDOM.h('span', {}, 'Content');
            return window.VDOM.diff(oldVTree, newVTree);
        });

        expect(patches.length).toBeGreaterThan(0);
        expect(patches[0].type).toBe('REPLACE');
        expect(patches[0].node).toBeDefined();
    });

    test('diff detects property updates (UPDATE)', async ({ page }) => {
        const patches = await page.evaluate(() => {
            const oldVTree = window.VDOM.h('div', { className: 'old' }, 'Content');
            const newVTree = window.VDOM.h('div', { className: 'new' }, 'Content');
            return window.VDOM.diff(oldVTree, newVTree);
        });

        expect(patches.length).toBeGreaterThan(0);
        expect(patches[0].type).toBe('UPDATE');
        expect(patches[0].props).toBeDefined();
        expect(patches[0].props.className).toBe('new');
    });

    test('diff detects added children', async ({ page }) => {
        const patches = await page.evaluate(() => {
            const oldVTree = window.VDOM.h('ul', {}, window.VDOM.h('li', { key: 1 }, 'Item 1'));
            const newVTree = window.VDOM.h(
                'ul',
                {},
                window.VDOM.h('li', { key: 1 }, 'Item 1'),
                window.VDOM.h('li', { key: 2 }, 'Item 2')
            );
            return window.VDOM.diff(oldVTree, newVTree);
        });

        const createPatches = patches.filter(p => p.type === 'CREATE');
        expect(createPatches.length).toBeGreaterThan(0);
    });

    test('diff detects removed children', async ({ page }) => {
        const patches = await page.evaluate(() => {
            const oldVTree = window.VDOM.h(
                'ul',
                {},
                window.VDOM.h('li', { key: 1 }, 'Item 1'),
                window.VDOM.h('li', { key: 2 }, 'Item 2')
            );
            const newVTree = window.VDOM.h('ul', {}, window.VDOM.h('li', { key: 1 }, 'Item 1'));
            return window.VDOM.diff(oldVTree, newVTree);
        });

        const removePatches = patches.filter(p => p.type === 'REMOVE');
        expect(removePatches.length).toBeGreaterThan(0);
    });

    test('diff handles key-based reordering', async ({ page }) => {
        const patches = await page.evaluate(() => {
            const oldVTree = window.VDOM.h(
                'ul',
                {},
                window.VDOM.h('li', { key: 1 }, 'Item 1'),
                window.VDOM.h('li', { key: 2 }, 'Item 2'),
                window.VDOM.h('li', { key: 3 }, 'Item 3')
            );
            const newVTree = window.VDOM.h(
                'ul',
                {},
                window.VDOM.h('li', { key: 3 }, 'Item 3'),
                window.VDOM.h('li', { key: 1 }, 'Item 1'),
                window.VDOM.h('li', { key: 2 }, 'Item 2')
            );
            return window.VDOM.diff(oldVTree, newVTree);
        });

        // Should efficiently reorder without recreating all nodes
        expect(patches).toBeDefined();
    });

    test('patch creates new DOM elements', async ({ page }) => {
        const result = await page.evaluate(() => {
            // Create container
            const container = document.createElement('div');
            container.id = 'vdom-test-container';
            document.body.appendChild(container);

            // Create vnode and patch
            const vnode = window.VDOM.h('div', { className: 'test-element' }, 'Hello VDOM');
            const patches = window.VDOM.diff(null, vnode);
            window.VDOM.patch(container, patches);

            // Check result
            const element = container.querySelector('.test-element');
            const result = {
                hasElement: element !== null,
                textContent: element ? element.textContent : null,
            };

            // Cleanup
            document.body.removeChild(container);
            return result;
        });

        expect(result.hasElement).toBe(true);
        expect(result.textContent).toBe('Hello VDOM');
    });

    test('patch updates existing DOM elements', async ({ page }) => {
        const result = await page.evaluate(() => {
            // Create container with initial content
            const container = document.createElement('div');
            container.id = 'vdom-test-container';
            document.body.appendChild(container);

            // Initial render
            const oldVNode = window.VDOM.h('div', { className: 'old-class' }, 'Old text');
            let patches = window.VDOM.diff(null, oldVNode);
            window.VDOM.patch(container, patches);

            // Update
            const newVNode = window.VDOM.h('div', { className: 'new-class' }, 'New text');
            patches = window.VDOM.diff(oldVNode, newVNode);
            window.VDOM.patch(container.firstChild, patches);

            // Check result
            const element = container.querySelector('div');
            const result = {
                hasOldClass: element ? element.classList.contains('old-class') : null,
                hasNewClass: element ? element.classList.contains('new-class') : null,
                textContent: element ? element.textContent : null,
            };

            // Cleanup
            document.body.removeChild(container);
            return result;
        });

        expect(result.hasOldClass).toBe(false);
        expect(result.hasNewClass).toBe(true);
        expect(result.textContent).toBe('New text');
    });

    test('patch removes DOM elements', async ({ page }) => {
        const result = await page.evaluate(() => {
            // Create container with initial content
            const container = document.createElement('div');
            container.id = 'vdom-test-container';
            document.body.appendChild(container);

            // Initial render with children
            const oldVNode = window.VDOM.h(
                'ul',
                {},
                window.VDOM.h('li', { key: 1 }, 'Item 1'),
                window.VDOM.h('li', { key: 2 }, 'Item 2')
            );
            let patches = window.VDOM.diff(null, oldVNode);
            window.VDOM.patch(container, patches);

            const initialCount = container.querySelectorAll('li').length;

            // Remove one child
            const newVNode = window.VDOM.h('ul', {}, window.VDOM.h('li', { key: 1 }, 'Item 1'));
            patches = window.VDOM.diff(oldVNode, newVNode);
            window.VDOM.patch(container.firstChild, patches);

            const finalCount = container.querySelectorAll('li').length;

            // Cleanup
            document.body.removeChild(container);

            return { initialCount, finalCount };
        });

        expect(result.initialCount).toBe(2);
        expect(result.finalCount).toBe(1);
    });

    test('EventDelegator can register and trigger events', async ({ page }) => {
        const result = await page.evaluate(() => {
            const container = document.createElement('div');
            document.body.appendChild(container);

            let clickCount = 0;
            const delegator = new window.VDOM.EventDelegator(container);

            delegator.on('click', () => {
                clickCount++;
            });

            // Simulate click
            container.click();

            delegator.destroy();
            document.body.removeChild(container);

            return clickCount;
        });

        expect(result).toBe(1);
    });

    test('EventDelegator can unregister events', async ({ page }) => {
        const result = await page.evaluate(() => {
            const container = document.createElement('div');
            document.body.appendChild(container);

            let clickCount = 0;
            const delegator = new window.VDOM.EventDelegator(container);

            delegator.on('click', () => {
                clickCount++;
            });

            container.click();
            delegator.off('click');
            container.click(); // This shouldn't increment

            delegator.destroy();
            document.body.removeChild(container);

            return clickCount;
        });

        expect(result).toBe(1);
    });
});

test.describe('VDOM Performance', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await utils.waitForAppReady(page);
    });

    test('diff should be fast for 100 nodes (< 10ms)', async ({ page }) => {
        const timing = await page.evaluate(() => {
            // Create trees with 100 nodes
            const createTree = prefix => {
                const children = [];
                for (let i = 0; i < 99; i++) {
                    children.push(window.VDOM.h('div', { key: i }, `${prefix}-${i}`));
                }
                return window.VDOM.h('div', {}, ...children);
            };

            const oldTree = createTree('old');
            const newTree = createTree('new');

            const start = performance.now();
            window.VDOM.diff(oldTree, newTree);
            const end = performance.now();

            return end - start;
        });

        console.log(`Diff time for 100 nodes: ${timing.toFixed(2)}ms`);
        expect(timing).toBeLessThan(10);
    });

    test('patch should be fast for 100 nodes (< 20ms)', async ({ page }) => {
        const timing = await page.evaluate(() => {
            const container = document.createElement('div');
            document.body.appendChild(container);

            // Create tree with 100 nodes
            const children = [];
            for (let i = 0; i < 99; i++) {
                children.push(window.VDOM.h('div', { key: i }, `Item ${i}`));
            }
            const vnode = window.VDOM.h('div', {}, ...children);

            const patches = window.VDOM.diff(null, vnode);

            const start = performance.now();
            window.VDOM.patch(container, patches);
            const end = performance.now();

            document.body.removeChild(container);

            return end - start;
        });

        console.log(`Patch time for 100 nodes: ${timing.toFixed(2)}ms`);
        expect(timing).toBeLessThan(20);
    });

    test('memory overhead should be reasonable', async ({ page }) => {
        const memoryInfo = await page.evaluate(() => {
            // Create and destroy 1000 vnodes to test memory
            const vnodes = [];
            for (let i = 0; i < 1000; i++) {
                vnodes.push(window.VDOM.h('div', { key: i }, `Item ${i}`));
            }

            // Force some GC opportunity
            vnodes.length = 0;

            // Check if performance.memory is available (Chrome only)
            if (performance.memory) {
                return {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                };
            }

            return { usedJSHeapSize: 0, totalJSHeapSize: 0 };
        });

        // This is informational - actual memory usage varies by browser
        console.log('Memory info:', memoryInfo);
        expect(memoryInfo).toBeDefined();
    });
});

test.describe('VDOM Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await utils.waitForAppReady(page);
    });

    test('handles deeply nested trees', async ({ page }) => {
        const result = await page.evaluate(() => {
            // Create deeply nested tree
            let vnode = window.VDOM.h('span', {}, 'Deep content');
            for (let i = 0; i < 20; i++) {
                vnode = window.VDOM.h('div', {}, vnode);
            }

            const container = document.createElement('div');
            document.body.appendChild(container);

            const patches = window.VDOM.diff(null, vnode);
            window.VDOM.patch(container, patches);

            const depth = container.querySelectorAll('div').length;

            document.body.removeChild(container);

            return depth;
        });

        expect(result).toBe(20);
    });

    test('handles empty children arrays', async ({ page }) => {
        const patches = await page.evaluate(() => {
            const vnode = window.VDOM.h('div', {});
            return window.VDOM.diff(null, vnode);
        });

        expect(patches[0].type).toBe('CREATE');
        expect(patches[0].node.children).toEqual([]);
    });

    test('handles text content updates', async ({ page }) => {
        const result = await page.evaluate(() => {
            const container = document.createElement('div');
            document.body.appendChild(container);

            const oldVNode = window.VDOM.h('div', {}, 'Old text');
            let patches = window.VDOM.diff(null, oldVNode);
            window.VDOM.patch(container, patches);

            const newVNode = window.VDOM.h('div', {}, 'New text');
            patches = window.VDOM.diff(oldVNode, newVNode);
            window.VDOM.patch(container.firstChild, patches);

            const text = container.textContent;

            document.body.removeChild(container);

            return text;
        });

        expect(result).toBe('New text');
    });

    test('handles mixed text and element children', async ({ page }) => {
        const result = await page.evaluate(() => {
            const vnode = window.VDOM.h(
                'div',
                {},
                'Text before',
                window.VDOM.h('span', {}, 'Middle'),
                'Text after'
            );

            const container = document.createElement('div');
            document.body.appendChild(container);

            const patches = window.VDOM.diff(null, vnode);
            window.VDOM.patch(container, patches);

            const hasSpan = container.querySelector('span') !== null;
            const text = container.textContent;

            document.body.removeChild(container);

            return { hasSpan, text };
        });

        expect(result.hasSpan).toBe(true);
        expect(result.text).toContain('Text before');
        expect(result.text).toContain('Middle');
        expect(result.text).toContain('Text after');
    });

    test('handles style object updates', async ({ page }) => {
        const result = await page.evaluate(() => {
            const container = document.createElement('div');
            document.body.appendChild(container);

            const vnode = window.VDOM.h(
                'div',
                {
                    style: { color: 'red', fontSize: '16px' },
                },
                'Styled text'
            );

            const patches = window.VDOM.diff(null, vnode);
            window.VDOM.patch(container, patches);

            const element = container.querySelector('div');
            const styles = {
                color: element ? element.style.color : null,
                fontSize: element ? element.style.fontSize : null,
            };

            document.body.removeChild(container);

            return styles;
        });

        expect(result.color).toBe('red');
        expect(result.fontSize).toBe('16px');
    });
});
