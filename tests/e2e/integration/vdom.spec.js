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
});
