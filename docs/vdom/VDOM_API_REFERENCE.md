# VDOM API Reference

Complete API documentation for the Mini-VDOM implementation.

## Overview

The VDOM (Virtual DOM) system provides efficient, state-preserving DOM updates through a lightweight diffing and patching algorithm. It enables declarative UI development with minimal overhead.

**Performance Targets:**
- Diff Algorithm: < 10ms for 100 nodes
- Patch Application: < 20ms for 100 nodes
- Memory Overhead: < 100KB for typical applications

## Core Functions

### `h(type, props, ...children)`

Creates a virtual node (JSX-alternative factory function).

**Parameters:**
- `type` (string): Element tag name (e.g., 'div', 'span', 'ul')
- `props` (Record<string, unknown> | null): Element properties and attributes
  - Special handling for `key`: Extracted for reconciliation, not set as DOM attribute
  - Event handlers: Properties starting with `on` (e.g., `onClick`)
  - Styles: `style` object merged with element.style
  - Classes: `className` mapped to element.className
- `children` (...VNode | string): Child nodes or text content (automatically flattened)

**Returns:** `VNode`

**Example:**
```typescript
const vnode = h('div', { className: 'container', id: 'app' },
    h('h1', {}, 'Hello World'),
    h('p', {}, 'This is VDOM!')
);
```

**With Keys (for lists):**
```typescript
const list = h('ul', {},
    h('li', { key: 1 }, 'Item 1'),
    h('li', { key: 2 }, 'Item 2'),
    h('li', { key: 3 }, 'Item 3')
);
```

**With Event Handlers:**
```typescript
const button = h('button', {
    onClick: () => console.log('Clicked!'),
    className: 'btn'
}, 'Click Me');
```

**With Inline Styles:**
```typescript
const styled = h('div', {
    style: { color: 'red', fontSize: '16px' }
}, 'Styled text');
```

---

### `diff(oldVTree, newVTree)`

Computes the difference between two virtual trees and generates patch operations.

**Algorithm:** Uses key-based reconciliation for efficient list updates. Time complexity: O(n) for balanced trees.

**Parameters:**
- `oldVTree` (VNode | null): Previous virtual tree (or null for initial render)
- `newVTree` (VNode | null): New virtual tree (or null to remove)

**Returns:** `Patch[]` - Array of patch operations

**Patch Types:**
- `CREATE`: Node added
- `UPDATE`: Properties changed
- `REMOVE`: Node removed
- `REPLACE`: Node type or key changed
- `REORDER`: Child order changed (with key-based reconciliation)

**Example:**
```typescript
const oldVTree = h('div', { className: 'old' }, 'Old text');
const newVTree = h('div', { className: 'new' }, 'New text');

const patches = diff(oldVTree, newVTree);
// patches contains UPDATE operation for className and text content
```

**Example: Adding Child:**
```typescript
const oldVTree = h('ul', {},
    h('li', { key: 1 }, 'Item 1')
);

const newVTree = h('ul', {},
    h('li', { key: 1 }, 'Item 1'),
    h('li', { key: 2 }, 'Item 2')  // New item
);

const patches = diff(oldVTree, newVTree);
// patches contains CREATE operation for new li element
```

---

### `patch(rootElement, patches)`

Applies patch operations to a real DOM element.

**Parameters:**
- `rootElement` (HTMLElement): DOM element to patch
- `patches` (Patch[]): Array of patch operations from `diff()`

**Returns:** `HTMLElement` - Updated DOM element

**Side Effects:**
- Modifies the DOM tree
- Attaches event listeners (if specified in props)
- Updates element attributes and properties

**Example:**
```typescript
const container = document.getElementById('app');

// Initial render
const vTree1 = h('div', {}, 'Hello');
let patches = diff(null, vTree1);
patch(container, patches);

// Update
const vTree2 = h('div', {}, 'World');
patches = diff(vTree1, vTree2);
patch(container, patches);
```

---

### `createElement(vnode)`

Creates a real DOM element from a virtual node.

**Parameters:**
- `vnode` (VNode): Virtual node to convert

**Returns:** `HTMLElement | Text` - DOM element or text node

**Note:** Typically used internally by `patch()`. You can use it directly for initial rendering without diffing.

**Example:**
```typescript
const vnode = h('div', { className: 'card' }, 'Content');
const domElement = createElement(vnode);
document.body.appendChild(domElement);
```

---

## Component Pattern

Use this pattern to build components with state-preserving updates.

```typescript
class MyComponent {
    private container: HTMLElement;
    private _vTree: VNode | null = null;
    
    constructor(container: HTMLElement) {
        this.container = container;
    }
    
    render(data: any): void {
        // Create new virtual tree based on current data
        const newVTree = h('div', { className: 'my-component' },
            h('h2', {}, data.title),
            h('p', {}, data.description),
            h('button', {
                onClick: () => this.handleClick()
            }, 'Click Me')
        );
        
        // Initial render or update
        if (!this._vTree) {
            // First render: create DOM from scratch
            const dom = createElement(newVTree);
            this.container.appendChild(dom);
        } else {
            // Subsequent renders: diff and patch
            const patches = diff(this._vTree, newVTree);
            patch(this.container.firstElementChild as HTMLElement, patches);
        }
        
        // Save tree for next render
        this._vTree = newVTree;
    }
    
    handleClick(): void {
        // Update state and re-render
        this.render({ title: 'Updated', description: 'Clicked!' });
    }
}
```

**Usage:**
```typescript
const component = new MyComponent(document.getElementById('app'));
component.render({ title: 'Hello', description: 'World' });
```

---

## Event Delegation

### `EventDelegator`

Central event delegation handler for better performance with many elements.

**Constructor:**
```typescript
constructor(rootElement: HTMLElement)
```

**Methods:**

#### `on(eventType, handler)`

Register a delegated event handler.

```typescript
const delegator = new EventDelegator(document.getElementById('app'));
delegator.on('click', (e) => {
    console.log('Clicked:', e.target);
});
```

#### `off(eventType)`

Unregister a delegated event handler.

```typescript
delegator.off('click');
```

#### `destroy()`

Remove all delegated handlers and clean up.

```typescript
delegator.destroy();
```

---

## Performance Utilities

### `measurePerf(fn, label?)`

Measures execution time of a function.

**Parameters:**
- `fn` (() => T): Function to measure
- `label` (string, optional): Label for console output

**Returns:** `{ result: T, time: number }`

**Example:**
```typescript
const { result, time } = measurePerf(() => {
    const patches = diff(oldTree, newTree);
    patch(container, patches);
}, 'Update render');

console.log(`Render completed in ${time.toFixed(2)}ms`);
```

---

## Type Definitions

### `VNode`

Virtual node representation.

```typescript
interface VNode {
    type: string;                      // Tag name or '#text'
    props: Record<string, unknown>;    // Element attributes/properties
    children: (VNode | string)[];      // Child nodes
    key?: string | number;             // Optional key for reconciliation
}
```

### `Patch`

DOM patch instruction.

```typescript
interface Patch {
    type: PatchType;                   // Operation type
    node?: VNode;                      // For CREATE/REPLACE
    props?: Record<string, unknown>;   // For UPDATE
    index?: number;                    // Position in parent
    oldNode?: VNode;                   // For REPLACE
    moves?: Array<{ from: number; to: number }>; // For REORDER
}

type PatchType = 'CREATE' | 'UPDATE' | 'REMOVE' | 'REPLACE' | 'REORDER';
```

---

## Global API

The VDOM module is exposed globally as `window.VDOM`:

```typescript
window.VDOM = {
    h,
    diff,
    patch,
    createElement,
    EventDelegator,
    measurePerf
};
```

**Usage:**
```typescript
const { h, diff, patch } = window.VDOM;
```

---

## Lifecycle Hooks

While the VDOM doesn't have built-in lifecycle hooks, you can implement them in your component pattern:

```typescript
class Component {
    private _vTree: VNode | null = null;
    
    // Custom lifecycle hooks
    beforeRender?(data: any): void;
    afterRender?(element: HTMLElement): void;
    
    render(data: any): void {
        this.beforeRender?.(data);
        
        const newVTree = this.createVTree(data);
        
        if (!this._vTree) {
            const dom = createElement(newVTree);
            this.container.appendChild(dom);
        } else {
            const patches = diff(this._vTree, newVTree);
            patch(this.container.firstElementChild as HTMLElement, patches);
        }
        
        this._vTree = newVTree;
        this.afterRender?.(this.container.firstElementChild as HTMLElement);
    }
    
    createVTree(data: any): VNode {
        // Override in subclass
        return h('div', {}, 'Default');
    }
}
```

---

## Advanced: Key-Based Reconciliation

Keys are critical for efficient list rendering. The diff algorithm uses keys to:

1. **Match old and new nodes** by key instead of position
2. **Minimize DOM operations** by reordering instead of recreating
3. **Preserve component state** across reorders

**Without Keys (inefficient):**
```typescript
// If list order changes, ALL items are recreated
items.map(item => h('li', {}, item.name))
```

**With Keys (efficient):**
```typescript
// Only changed items are updated, existing ones are reordered
items.map(item => h('li', { key: item.id }, item.name))
```

**Key Requirements:**
- Must be unique within siblings
- Should be stable (same item = same key across renders)
- Prefer IDs over indices when order can change

---

## See Also

- [Migration Guide](./VDOM_MIGRATION_GUIDE.md) - How to migrate from innerHTML to VDOM
- [Best Practices](./VDOM_BEST_PRACTICES.md) - Performance tips and patterns
- [Troubleshooting](./VDOM_TROUBLESHOOTING.md) - Common issues and solutions
