# VDOM Troubleshooting

Common issues, solutions, and debugging tips for VDOM usage.

## Common Issues

### Issue 1: Scroll Position Resets After Update

**Symptom:** List scrolls back to top after rendering updates.

**Cause:** VDOM container is being replaced instead of patched.

**Solution:** Ensure you're patching the existing container, not replacing it.

```typescript
// ❌ Wrong: Replaces container
this.container.innerHTML = '';
this.container.appendChild(createElement(vTree));

// ✅ Correct: Patches existing DOM
const patches = diff(this._vTree, newVTree);
patch(this.container.firstElementChild as HTMLElement, patches);
this._vTree = newVTree;
```

**Debug:**
```typescript
// Check if container element identity is preserved
const containerBefore = this.container.firstElementChild;
this.render(newData);
const containerAfter = this.container.firstElementChild;

console.log('Same element?', containerBefore === containerAfter);  // Should be true
```

---

### Issue 2: List Items Recreate on Every Update

**Symptom:** DOM elements are destroyed and recreated instead of updated.

**Cause:** Missing or unstable keys.

**Solution:** Use stable, unique keys for list items.

```typescript
// ❌ Wrong: No keys
items.map(item => h('li', {}, item.name))

// ❌ Wrong: Index as key (unstable when reordered)
items.map((item, i) => h('li', { key: i }, item.name))

// ✅ Correct: Stable ID as key
items.map(item => h('li', { key: item.id }, item.name))
```

**Debug:**
```typescript
// Log patch operations to see what's happening
const patches = diff(this._vTree, newVTree);
console.log('Patches:', patches.map(p => p.type));
// Should see UPDATE, not REMOVE + CREATE for existing items
```

---

### Issue 3: Event Handlers Don't Fire

**Symptom:** Click handlers or other events don't trigger.

**Cause:** Event delegation not set up correctly, or handlers attached to wrong element.

**Solution:** Use VDOM event system via props.

```typescript
// ❌ Wrong: Manual event attachment
const vTree = h('button', { id: 'my-btn' }, 'Click');
// ... later
document.getElementById('my-btn')?.addEventListener('click', handler);

// ✅ Correct: Event handler in props
const vTree = h('button', {
    onClick: (e) => this.handleClick(e)
}, 'Click');
```

**Debug:**
```typescript
// Check if event listener is attached
const button = document.querySelector('button');
console.log('Has click listener:', getEventListeners(button));  // Chrome DevTools
```

---

### Issue 4: Input Value Resets After Update

**Symptom:** Typing in an input clears the value on next render.

**Cause:** Not preserving input value in virtual tree.

**Solution:** Include current value in props or use controlled component pattern.

```typescript
// ❌ Wrong: Input value not controlled
h('input', { type: 'text' })

// ✅ Correct: Controlled input
h('input', {
    type: 'text',
    value: this.inputValue,
    onInput: (e) => {
        this.inputValue = (e.target as HTMLInputElement).value;
        this.render();  // Re-render with new value
    }
})
```

**Alternative: Uncontrolled with ref**
```typescript
// For inputs that don't need to be in state
h('input', {
    type: 'text',
    ref: (el) => this.inputRef = el
})
```

---

### Issue 5: Focus Lost After Update

**Symptom:** Focused element loses focus after render.

**Cause:** Element is being replaced instead of updated, or focus not restored.

**Solution:** Ensure key is set, and optionally restore focus manually.

```typescript
class MyComponent {
    private focusedId: string | null = null;
    
    render(items: Item[]): void {
        // Save focused element before render
        const activeElement = document.activeElement;
        this.focusedId = activeElement?.getAttribute('data-id') || null;
        
        const newVTree = h('div', {},
            ...items.map(item =>
                h('input', {
                    key: item.id,
                    'data-id': item.id,
                    type: 'text',
                    value: item.value
                })
            )
        );
        
        this.updateView(newVTree);
        
        // Restore focus after render
        if (this.focusedId) {
            const element = document.querySelector(`[data-id="${this.focusedId}"]`) as HTMLElement;
            element?.focus();
        }
    }
}
```

---

### Issue 6: Memory Leak with Large Lists

**Symptom:** Memory usage grows over time, especially with frequent updates.

**Cause:** Old VTrees not being garbage collected, or event handlers accumulating.

**Solution:** Ensure old references are cleared and event cleanup happens.

```typescript
class MyComponent {
    private _vTree: VNode | null = null;
    
    render(data: Data): void {
        const newVTree = this.createVTree(data);
        
        // Update DOM
        this.updateView(newVTree);
        
        // Replace old tree (allows GC of old tree)
        this._vTree = newVTree;
    }
    
    destroy(): void {
        // Clean up when component is destroyed
        this._vTree = null;
        this.container.innerHTML = '';
    }
}
```

**For Event Delegators:**
```typescript
class MyComponent {
    private delegator: EventDelegator;
    
    constructor(container: HTMLElement) {
        this.delegator = new EventDelegator(container);
    }
    
    destroy(): void {
        this.delegator.destroy();  // Remove all event listeners
        this._vTree = null;
    }
}
```

---

### Issue 7: Styles Not Updating

**Symptom:** Inline styles don't change after update.

**Cause:** Style object reference is the same, or not properly diffed.

**Solution:** Create new style object for each render.

```typescript
// ❌ Wrong: Reusing same style object
private sharedStyle = { color: 'red' };

render(): void {
    const vTree = h('div', { style: this.sharedStyle }, 'Text');
    this.updateView(vTree);
}

// ✅ Correct: New style object each render
render(color: string): void {
    const vTree = h('div', {
        style: { color: color }  // New object
    }, 'Text');
    this.updateView(vTree);
}
```

---

### Issue 8: Children Array Flattening Issues

**Symptom:** Nested arrays of children render incorrectly.

**Cause:** Children not properly flattened.

**Solution:** Use spread operator or ensure h() receives flat children.

```typescript
// ❌ Wrong: Nested arrays
const children = [
    [h('div', {}, 'A'), h('div', {}, 'B')],
    [h('div', {}, 'C')]
];
h('div', {}, children);  // May not flatten correctly

// ✅ Correct: Flat children
const children = [
    h('div', {}, 'A'),
    h('div', {}, 'B'),
    h('div', {}, 'C')
];
h('div', {}, ...children);

// ✅ Correct: Spread nested arrays
const group1 = [h('div', {}, 'A'), h('div', {}, 'B')];
const group2 = [h('div', {}, 'C')];
h('div', {}, ...group1, ...group2);
```

---

## Debugging Tips

### 1. Enable VDOM Logging

```typescript
import { measurePerf } from '../core/vdom';

class MyComponent {
    private DEBUG = true;
    
    render(data: Data): void {
        if (this.DEBUG) {
            console.log('Render data:', data);
        }
        
        const { result, time } = measurePerf(() => {
            const newVTree = this.createVTree(data);
            const patches = diff(this._vTree, newVTree);
            
            if (this.DEBUG) {
                console.log('Patches:', patches);
            }
            
            patch(this.container.firstElementChild as HTMLElement, patches);
            this._vTree = newVTree;
        }, 'Component render');
        
        if (this.DEBUG) {
            console.log(`Render time: ${time.toFixed(2)}ms`);
        }
    }
}
```

### 2. Inspect Virtual Tree

```typescript
// Log virtual tree structure
function logVTree(vnode: VNode, indent = 0): void {
    const prefix = '  '.repeat(indent);
    console.log(`${prefix}${vnode.type}`, vnode.props);
    
    vnode.children.forEach(child => {
        if (typeof child === 'string') {
            console.log(`${prefix}  "${child}"`);
        } else {
            logVTree(child, indent + 1);
        }
    });
}

// Usage
const vTree = h('div', {},
    h('h1', {}, 'Title'),
    h('p', {}, 'Content')
);
logVTree(vTree);
```

### 3. Compare Old and New Trees

```typescript
function compareVTrees(old: VNode | null, new_: VNode | null): void {
    console.group('VTree Comparison');
    console.log('Old:', old);
    console.log('New:', new_);
    
    if (old && new_) {
        console.log('Type changed?', old.type !== new_.type);
        console.log('Props changed?', JSON.stringify(old.props) !== JSON.stringify(new_.props));
        console.log('Children count:', old.children.length, '→', new_.children.length);
    }
    
    console.groupEnd();
}

// Usage before diff
compareVTrees(this._vTree, newVTree);
const patches = diff(this._vTree, newVTree);
```

### 4. Track Render Count

```typescript
class MyComponent {
    private renderCount = 0;
    
    render(data: Data): void {
        this.renderCount++;
        console.log(`Render #${this.renderCount}`);
        
        // ... render logic
    }
}
```

### 5. Measure Patch Performance

```typescript
const patches = diff(oldVTree, newVTree);

console.time('Patch application');
patch(container, patches);
console.timeEnd('Patch application');

console.log(`Applied ${patches.length} patches`);
```

---

## Performance Debugging

### Slow Diffs

**Symptom:** `diff()` takes > 10ms for < 100 nodes.

**Cause:** Deep tree nesting or inefficient key usage.

**Debug:**
```typescript
const { time } = measurePerf(() => {
    diff(oldVTree, newVTree);
}, 'Diff');

if (time > 10) {
    console.warn('Slow diff detected');
    console.log('Old tree depth:', getTreeDepth(oldVTree));
    console.log('New tree depth:', getTreeDepth(newVTree));
}

function getTreeDepth(vnode: VNode | null): number {
    if (!vnode) return 0;
    return 1 + Math.max(...vnode.children.map(child =>
        typeof child === 'string' ? 0 : getTreeDepth(child)
    ));
}
```

**Solution:** Flatten tree structure or split into smaller components.

### Slow Patches

**Symptom:** `patch()` takes > 20ms for < 100 nodes.

**Cause:** Many DOM operations or complex CSS recalculations.

**Debug:**
```typescript
const patches = diff(oldVTree, newVTree);

console.log('Patch operations:');
patches.forEach(p => console.log(`  ${p.type} at index ${p.index}`));

const { time } = measurePerf(() => {
    patch(container, patches);
}, 'Patch');
```

**Solution:** Batch DOM operations or use CSS `will-change` hint.

### Memory Leaks

**Symptom:** Memory usage grows over time.

**Debug:**
```typescript
// Chrome DevTools: Memory tab → Take Heap Snapshot
// Look for detached DOM nodes or growing arrays

// Programmatically check
if (performance.memory) {
    console.log('Heap size:', (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2), 'MB');
}
```

**Solution:** Ensure cleanup in destroy() method and avoid circular references.

---

## Testing VDOM Components

### Unit Test Example

```typescript
import { h, diff, patch, createElement } from '../core/vdom';

describe('MyComponent', () => {
    let container: HTMLElement;
    let component: MyComponent;
    
    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        component = new MyComponent(container);
    });
    
    afterEach(() => {
        document.body.removeChild(container);
    });
    
    it('renders initial state', () => {
        component.render({ title: 'Test' });
        
        expect(container.querySelector('h1')?.textContent).toBe('Test');
    });
    
    it('updates on data change', () => {
        component.render({ title: 'First' });
        component.render({ title: 'Second' });
        
        expect(container.querySelector('h1')?.textContent).toBe('Second');
    });
    
    it('preserves scroll position', () => {
        component.render({ items: [...Array(100)].map((_, i) => ({ id: i, name: `Item ${i}` })) });
        
        const list = container.querySelector('.list') as HTMLElement;
        list.scrollTop = 500;
        
        component.render({ items: [...Array(100)].map((_, i) => ({ id: i, name: `Item ${i}` })) });
        
        expect(list.scrollTop).toBe(500);
    });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('VDOM component updates correctly', async ({ page }) => {
    await page.goto('/');
    
    // Initial render
    await page.click('[data-action="render"]');
    await expect(page.locator('.my-component h1')).toHaveText('Initial');
    
    // Update
    await page.click('[data-action="update"]');
    await expect(page.locator('.my-component h1')).toHaveText('Updated');
    
    // Scroll position preserved
    await page.evaluate(() => {
        const list = document.querySelector('.list') as HTMLElement;
        list.scrollTop = 500;
    });
    
    await page.click('[data-action="update"]');
    
    const scrollTop = await page.evaluate(() => {
        const list = document.querySelector('.list') as HTMLElement;
        return list.scrollTop;
    });
    
    expect(scrollTop).toBe(500);
});
```

---

## FAQ

### Q: When should I use VDOM instead of direct DOM manipulation?

**A:** Use VDOM when:
- You have dynamic, frequently updating content
- You need to preserve scroll position, focus, or input state
- Your component has complex conditional rendering
- You're building reusable components

Use direct DOM for:
- Static content that never changes
- Simple one-time renders
- Performance-critical animations (use CSS/requestAnimationFrame)

### Q: How do I handle forms with VDOM?

**A:** Use controlled components:

```typescript
class FormComponent {
    private formData = { name: '', email: '' };
    
    render(): void {
        const vTree = h('form', {},
            h('input', {
                type: 'text',
                value: this.formData.name,
                onInput: (e) => {
                    this.formData.name = (e.target as HTMLInputElement).value;
                    this.render();
                }
            }),
            h('input', {
                type: 'email',
                value: this.formData.email,
                onInput: (e) => {
                    this.formData.email = (e.target as HTMLInputElement).value;
                    this.render();
                }
            })
        );
        
        this.updateView(vTree);
    }
}
```

### Q: Can I mix VDOM with other libraries?

**A:** Yes, but be careful:
- Don't let other libraries modify VDOM-managed DOM
- Use refs to integrate with non-VDOM code
- Consider wrapping external libraries in VDOM components

```typescript
class ChartComponent {
    private chartInstance: any;
    
    render(data: ChartData): void {
        const vTree = h('div', {
            ref: (el) => {
                if (!this.chartInstance) {
                    this.chartInstance = new ExternalChart(el);
                }
                this.chartInstance.update(data);
            }
        });
        
        this.updateView(vTree);
    }
}
```

### Q: How do I optimize for mobile/slow devices?

**A:**
1. Reduce tree depth
2. Use keys efficiently
3. Debounce renders
4. Virtualize long lists
5. Profile on target devices

### Q: What's the overhead of VDOM?

**A:** Minimal:
- Memory: ~100KB for typical apps
- CPU: < 10ms diff + < 20ms patch for 100 nodes
- Smaller than most frameworks (React, Vue, etc.)

---

## Getting Help

If you're still stuck:

1. Check [API Reference](./VDOM_API_REFERENCE.md) for correct usage
2. Review [Best Practices](./VDOM_BEST_PRACTICES.md) for optimization tips
3. Enable debug logging (see "Debugging Tips" above)
4. Check browser console for errors
5. Test with minimal reproduction case
6. Profile with DevTools Performance tab

---

## See Also

- [API Reference](./VDOM_API_REFERENCE.md) - Complete API documentation
- [Migration Guide](./VDOM_MIGRATION_GUIDE.md) - How to migrate from innerHTML
- [Best Practices](./VDOM_BEST_PRACTICES.md) - Performance tips and patterns
