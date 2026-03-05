/**
 * tests/unit/core/vdom.test.ts
 *
 * Unit tests for the Mini-VDOM implementation.
 *
 * Tests h(), diff(), patch() and createElement() in isolation.
 * No browser integration required – all DOM work is handled by jsdom.
 */

import { describe, it, expect } from 'vitest';
import { h, diff, patch, createElement, measurePerf, EventDelegator } from '../../../src/ts/core/vdom.js';

// ─── h() – VNode factory ─────────────────────────────────────────────────────

describe('h – VNode factory', () => {
    it('creates a VNode with the correct type', () => {
        const vnode = h('div', null);
        expect(vnode.type).toBe('div');
    });

    it('creates a VNode with empty props when null is passed', () => {
        const vnode = h('span', null);
        expect(vnode.props).toEqual({});
    });

    it('creates a VNode with the given props', () => {
        const vnode = h('input', { type: 'text', placeholder: 'Search' });
        expect(vnode.props.type).toBe('text');
        expect(vnode.props.placeholder).toBe('Search');
    });

    it('attaches string children', () => {
        const vnode = h('p', null, 'Hello', ' World');
        expect(vnode.children).toContain('Hello');
        expect(vnode.children).toContain(' World');
    });

    it('attaches nested VNode children', () => {
        const child = h('span', null, 'inner');
        const parent = h('div', null, child);
        expect(parent.children).toHaveLength(1);
        expect(parent.children[0]).toBe(child);
    });

    it('flattens array children', () => {
        // Pass an array as a child – h() calls .flat() so it should be unwrapped
        const items = ['a', 'b', 'c'];
        // @ts-expect-error – testing runtime flatting
        const vnode = h('ul', null, items);
        expect(vnode.children).toEqual(['a', 'b', 'c']);
    });

    it('extracts the key from props and removes it from props', () => {
        const vnode = h('li', { key: 'item-1', className: 'item' });
        expect(vnode.key).toBe('item-1');
        expect(vnode.props).not.toHaveProperty('key');
    });

    it('sets key to undefined when not provided', () => {
        const vnode = h('div', null);
        expect(vnode.key).toBeUndefined();
    });
});

// ─── diff() – patch generation ───────────────────────────────────────────────

describe('diff – patch generation', () => {
    it('returns a CREATE patch when old tree is null', () => {
        const newTree = h('div', null);
        const patches = diff(null, newTree);
        expect(patches).toHaveLength(1);
        expect(patches[0]?.type).toBe('CREATE');
        expect(patches[0]?.node).toBe(newTree);
    });

    it('returns a REMOVE patch when new tree is null', () => {
        const oldTree = h('div', null);
        const patches = diff(oldTree, null);
        expect(patches).toHaveLength(1);
        expect(patches[0]?.type).toBe('REMOVE');
    });

    it('returns a REPLACE patch when node types differ', () => {
        const oldTree = h('div', null);
        const newTree = h('span', null);
        const patches = diff(oldTree, newTree);
        expect(patches.some(p => p.type === 'REPLACE')).toBe(true);
    });

    it('returns no patches for identical trees', () => {
        const tree = h('div', { className: 'box' }, 'text');
        const patches = diff(tree, tree);
        expect(patches).toHaveLength(0);
    });

    it('returns an UPDATE patch when props change', () => {
        const oldTree = h('div', { className: 'old' });
        const newTree = h('div', { className: 'new' });
        const patches = diff(oldTree, newTree);
        const update = patches.find(p => p.type === 'UPDATE');
        expect(update).toBeDefined();
        expect(update?.props).toHaveProperty('className', 'new');
    });

    it('marks removed props as undefined in the UPDATE patch', () => {
        const oldTree = h('div', { className: 'box', id: 'one' });
        const newTree = h('div', { className: 'box' }); // 'id' removed
        const patches = diff(oldTree, newTree);
        const update = patches.find(p => p.type === 'UPDATE');
        expect(update?.props).toHaveProperty('id', undefined);
    });

    it('generates a REPLACE patch when keys differ on same-type nodes', () => {
        const oldTree = h('li', { key: 'a' }, 'A');
        const newTree = h('li', { key: 'b' }, 'B');
        const patches = diff(oldTree, newTree);
        expect(patches.some(p => p.type === 'REPLACE')).toBe(true);
    });

    it('returns [] when both trees are null', () => {
        expect(diff(null, null)).toEqual([]);
    });

    // ─── child diffing ────────────────────────────────────────────────────────

    it('generates a CREATE patch for a newly added child', () => {
        const oldTree = h('ul', null, h('li', null, 'A'));
        const newTree = h('ul', null, h('li', null, 'A'), h('li', null, 'B'));
        const patches = diff(oldTree, newTree);
        expect(patches.some(p => p.type === 'CREATE')).toBe(true);
    });

    it('generates a REMOVE patch for a removed child', () => {
        const oldTree = h('ul', null, h('li', null, 'A'), h('li', null, 'B'));
        const newTree = h('ul', null, h('li', null, 'A'));
        const patches = diff(oldTree, newTree);
        expect(patches.some(p => p.type === 'REMOVE')).toBe(true);
    });

    it('detects a changed text child as an UPDATE', () => {
        const oldTree = h('p', null, 'hello');
        const newTree = h('p', null, 'world');
        const patches = diff(oldTree, newTree);
        // A text change is emitted as an UPDATE on the parent
        expect(patches.some(p => p.type === 'UPDATE')).toBe(true);
    });

    it('uses key-based reconciliation to match children', () => {
        // Both children have keys; swapping order should still reconcile correctly
        const a = h('li', { key: 'x' }, 'X');
        const b = h('li', { key: 'y' }, 'Y');
        const oldTree = h('ul', null, a, b);
        const newTree = h('ul', null, b, a);
        const patches = diff(oldTree, newTree);
        // At minimum there should be no CREATE/REMOVE for matched keys
        expect(patches.some(p => p.type === 'REPLACE')).toBe(false);
    });
});

// ─── createElement() – DOM creation ─────────────────────────────────────────

describe('createElement – DOM creation', () => {
    it('creates the correct HTML element type', () => {
        const vnode = h('section', null);
        const el = createElement(vnode);
        expect(el.nodeName.toLowerCase()).toBe('section');
    });

    it('sets className on the created element', () => {
        const vnode = h('div', { className: 'container' });
        const el = createElement(vnode) as HTMLElement;
        expect(el.className).toBe('container');
    });

    it('sets arbitrary attributes', () => {
        const vnode = h('input', { type: 'checkbox' });
        const el = createElement(vnode) as HTMLElement;
        expect((el as HTMLInputElement).type).toBe('checkbox');
    });

    it('appends string children as text nodes', () => {
        const vnode = h('p', null, 'Hello VDOM');
        const el = createElement(vnode) as HTMLElement;
        expect(el.textContent).toBe('Hello VDOM');
    });

    it('recursively creates nested children', () => {
        const vnode = h('ul', null, h('li', null, 'Item 1'), h('li', null, 'Item 2'));
        const el = createElement(vnode) as HTMLElement;
        expect(el.querySelectorAll('li')).toHaveLength(2);
    });

    it('creates a text node for type "#text"', () => {
        const vnode = h('#text', null, 'plain text');
        const node = createElement(vnode);
        expect(node.nodeType).toBe(Node.TEXT_NODE);
        expect(node.textContent).toBe('plain text');
    });

    it('attaches an event handler via an on* prop', () => {
        let clicked = false;
        const vnode = h('button', { onClick: () => { clicked = true; } });
        const el = createElement(vnode) as HTMLElement;
        el.click();
        expect(clicked).toBe(true);
    });

    it('applies a style object to the element', () => {
        const vnode = h('div', { style: { color: 'red' } });
        const el = createElement(vnode) as HTMLElement;
        expect(el.style.color).toBe('red');
    });

    it('sets a non-standard attribute via setAttribute', () => {
        const vnode = h('div', { 'data-custom': 'value' });
        const el = createElement(vnode) as HTMLElement;
        expect(el.getAttribute('data-custom')).toBe('value');
    });
});

// ─── patch() – DOM patching ──────────────────────────────────────────────────

describe('patch – DOM patching', () => {
    function makeContainer(vnode: ReturnType<typeof h>): HTMLElement {
        const container = document.createElement('div');
        container.appendChild(createElement(vnode));
        return container;
    }

    it('applies a CREATE patch – appends a child to the container', () => {
        const container = document.createElement('div');
        const patches = diff(null, h('span', null, 'new'));
        patch(container, patches);
        expect(container.querySelector('span')).not.toBeNull();
    });

    it('applies an UPDATE patch – changes className in place', () => {
        // When index === 0 the patch function updates the rootElement itself.
        // Pass the element directly (not a wrapper container) so the className
        // change lands on the correct node.
        const oldTree = h('div', { className: 'old' });
        const element = createElement(oldTree) as HTMLElement;
        const newTree = h('div', { className: 'new' });
        const patches = diff(oldTree, newTree);
        patch(element, patches);
        expect(element.className).toBe('new');
    });

    it('applies a REMOVE patch – removes the node', () => {
        const tree = h('p', null, 'Remove me');
        const container = makeContainer(tree);
        const patches = diff(tree, null);
        patch(container, patches);
        expect(container.querySelector('p')).toBeNull();
    });

    it('applies a REPLACE patch – swaps the node', () => {
        const oldTree = h('div', null);
        const container = makeContainer(oldTree);
        const newTree = h('span', null, 'replaced');
        const patches = diff(oldTree, newTree);
        patch(container, patches);
        expect(container.querySelector('span')).not.toBeNull();
        expect(container.querySelector('div')).toBeNull();
    });

    it('returns the root element unchanged when there are no patches', () => {
        const tree = h('article', { id: 'post' });
        const container = makeContainer(tree);
        const first = container.firstChild as HTMLElement;
        patch(container, []);
        expect(container.firstChild).toBe(first);
    });

    it('patches a child node update at non-zero index', () => {
        // Build a list parent then apply an UPDATE sub-patch on child at index 1
        const container = document.createElement('ul');
        const item = document.createElement('li');
        item.className = 'before';
        container.appendChild(item);

        // Simulate an UPDATE for child index 1 (i.e., childNodes[0])
        patch(container, [{ type: 'UPDATE', index: 1, props: { className: 'after' } }]);
        expect((container.childNodes[0] as HTMLElement).className).toBe('after');
    });

    it('removes a child at a non-zero index', () => {
        const container = document.createElement('ul');
        container.innerHTML = '<li>A</li><li>B</li>';
        // REMOVE at index 2 → removes childNodes[1] (second li)
        patch(container, [{ type: 'REMOVE', index: 2 }]);
        expect(container.querySelectorAll('li')).toHaveLength(1);
        expect(container.textContent).toBe('A');
    });

    it('replaces a child at a non-zero index', () => {
        const container = document.createElement('ul');
        container.innerHTML = '<li>Old</li>';
        patch(container, [{ type: 'REPLACE', index: 1, node: h('li', null, 'New') }]);
        expect(container.textContent).toBe('New');
    });
});

// ─── EventDelegator ───────────────────────────────────────────────────────────

describe('EventDelegator', () => {
    it('fires the handler when the event occurs on the root', () => {
        const root = document.createElement('div');
        document.body.appendChild(root);
        const delegator = new EventDelegator(root);

        let fired = false;
        delegator.on('click', () => { fired = true; });
        root.dispatchEvent(new Event('click', { bubbles: true }));
        expect(fired).toBe(true);

        delegator.destroy();
        document.body.removeChild(root);
    });

    it('does not attach a second listener for the same event type', () => {
        const root = document.createElement('div');
        document.body.appendChild(root);
        const delegator = new EventDelegator(root);

        let count = 0;
        delegator.on('click', () => count++);
        delegator.on('click', () => count++); // second call should be ignored
        root.dispatchEvent(new Event('click', { bubbles: true }));
        expect(count).toBe(1); // only the first handler fires

        delegator.destroy();
        document.body.removeChild(root);
    });

    it('off() removes the handler so it no longer fires', () => {
        const root = document.createElement('div');
        document.body.appendChild(root);
        const delegator = new EventDelegator(root);

        let fired = false;
        delegator.on('click', () => { fired = true; });
        delegator.off('click');
        root.dispatchEvent(new Event('click', { bubbles: true }));
        expect(fired).toBe(false);

        delegator.destroy();
        document.body.removeChild(root);
    });

    it('destroy() removes all registered handlers', () => {
        const root = document.createElement('div');
        document.body.appendChild(root);
        const delegator = new EventDelegator(root);

        let fires = 0;
        delegator.on('click', () => fires++);
        delegator.on('keydown', () => fires++);
        delegator.destroy();

        root.dispatchEvent(new Event('click', { bubbles: true }));
        root.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
        expect(fires).toBe(0);

        document.body.removeChild(root);
    });

    it('off() on an unregistered event type does not throw', () => {
        const root = document.createElement('div');
        const delegator = new EventDelegator(root);
        expect(() => delegator.off('nonexistent')).not.toThrow();
    });
});

// ─── measurePerf() – performance utility ─────────────────────────────────────

describe('measurePerf – performance utility', () => {
    it('returns the function result in the result field', () => {
        const { result } = measurePerf(() => 42);
        expect(result).toBe(42);
    });

    it('returns a non-negative elapsed time', () => {
        const { time } = measurePerf(() => 'work');
        expect(time).toBeGreaterThanOrEqual(0);
    });

    it('works with async-style labels without throwing', () => {
        expect(() => measurePerf(() => 'ok', 'test-label')).not.toThrow();
    });
});
