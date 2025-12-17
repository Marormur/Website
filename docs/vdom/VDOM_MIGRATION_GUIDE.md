# VDOM Migration Guide

Step-by-step guide for migrating from innerHTML-based rendering to VDOM.

## Why Migrate to VDOM?

### Problems with innerHTML

```typescript
// ❌ OLD Pattern
renderList(items: Item[]): void {
    this.container.innerHTML = `
        <ul>
            ${items.map(item => `
                <li data-id="${item.id}">
                    ${item.name}
                </li>
            `).join('')}
        </ul>
    `;
}
```

**Issues:**
- 🔴 **Destroys all DOM state** - Scroll position, focus, selection lost
- 🔴 **Detaches event listeners** - Must re-attach after every render
- 🔴 **Slow for large lists** - Recreates entire subtree even for small changes
- 🔴 **No state preservation** - Input values, animations, etc. reset
- 🔴 **XSS vulnerabilities** - If not properly escaped

### Benefits of VDOM

```typescript
// ✅ NEW Pattern
private _vTree: VNode | null = null;

renderList(items: Item[]): void {
    const newVTree = h('ul', {},
        ...items.map(item => 
            h('li', { 
                key: item.id,
                'data-id': item.id
            }, item.name)
        )
    );
    
    if (!this._vTree) {
        const dom = createElement(newVTree);
        this.container.appendChild(dom);
    } else {
        const patches = diff(this._vTree, newVTree);
        patch(this.container.firstElementChild as HTMLElement, patches);
    }
    
    this._vTree = newVTree;
}
```

**Benefits:**
- ✅ **Preserves DOM state** - Scroll, focus, selection maintained
- ✅ **Maintains event listeners** - No re-attachment needed
- ✅ **Fast incremental updates** - Only changed nodes are updated
- ✅ **State preservation** - Input values, animations preserved
- ✅ **Type-safe** - Full TypeScript support

---

## Migration Steps

### Step 1: Import VDOM

```typescript
// At the top of your file
const { h, diff, patch, createElement } = window.VDOM;
```

Or with TypeScript imports:
```typescript
import { h, diff, patch, createElement, VNode } from '../core/vdom';
```

### Step 2: Add VTree State

Add a private field to track the current virtual tree:

```typescript
class MyComponent {
    private _vTree: VNode | null = null;
    
    // ... existing code
}
```

### Step 3: Convert Template to VDOM

**Before (innerHTML):**
```typescript
render(data: MyData): void {
    this.container.innerHTML = `
        <div class="card">
            <h2>${data.title}</h2>
            <p>${data.description}</p>
            <button onclick="handleClick()">Click</button>
        </div>
    `;
}
```

**After (VDOM):**
```typescript
render(data: MyData): void {
    const newVTree = h('div', { className: 'card' },
        h('h2', {}, data.title),
        h('p', {}, data.description),
        h('button', {
            onClick: () => this.handleClick()
        }, 'Click')
    );
    
    if (!this._vTree) {
        const dom = createElement(newVTree);
        this.container.appendChild(dom);
    } else {
        const patches = diff(this._vTree, newVTree);
        patch(this.container.firstElementChild as HTMLElement, patches);
    }
    
    this._vTree = newVTree;
}
```

### Step 4: Add Keys to Lists

**Critical:** Always use keys for list items to enable efficient reconciliation.

**Before:**
```typescript
items.map(item => `<li>${item.name}</li>`).join('')
```

**After:**
```typescript
items.map(item => h('li', { key: item.id }, item.name))
```

---

## Common Migration Patterns

### Pattern 1: Simple Static Content

**Before:**
```typescript
this.container.innerHTML = `
    <div class="header">
        <h1>My App</h1>
        <p>Welcome!</p>
    </div>
`;
```

**After:**
```typescript
const vTree = h('div', { className: 'header' },
    h('h1', {}, 'My App'),
    h('p', {}, 'Welcome!')
);
const dom = createElement(vTree);
this.container.appendChild(dom);
```

### Pattern 2: Dynamic Content

**Before:**
```typescript
render(user: User): void {
    this.container.innerHTML = `
        <div class="user-card">
            <img src="${user.avatar}" alt="${user.name}">
            <h3>${user.name}</h3>
            <p>${user.bio}</p>
        </div>
    `;
}
```

**After:**
```typescript
private _vTree: VNode | null = null;

render(user: User): void {
    const newVTree = h('div', { className: 'user-card' },
        h('img', { src: user.avatar, alt: user.name }),
        h('h3', {}, user.name),
        h('p', {}, user.bio)
    );
    
    if (!this._vTree) {
        const dom = createElement(newVTree);
        this.container.appendChild(dom);
    } else {
        const patches = diff(this._vTree, newVTree);
        patch(this.container.firstElementChild as HTMLElement, patches);
    }
    
    this._vTree = newVTree;
}
```

### Pattern 3: Lists with Items

**Before:**
```typescript
renderItems(items: Item[]): void {
    this.container.innerHTML = `
        <ul class="item-list">
            ${items.map(item => `
                <li data-id="${item.id}" class="${item.active ? 'active' : ''}">
                    <span class="name">${item.name}</span>
                    <span class="count">${item.count}</span>
                </li>
            `).join('')}
        </ul>
    `;
}
```

**After:**
```typescript
private _vTree: VNode | null = null;

renderItems(items: Item[]): void {
    const newVTree = h('ul', { className: 'item-list' },
        ...items.map(item => 
            h('li', {
                key: item.id,
                'data-id': item.id,
                className: item.active ? 'active' : ''
            },
                h('span', { className: 'name' }, item.name),
                h('span', { className: 'count' }, String(item.count))
            )
        )
    );
    
    if (!this._vTree) {
        const dom = createElement(newVTree);
        this.container.appendChild(dom);
    } else {
        const patches = diff(this._vTree, newVTree);
        patch(this.container.firstElementChild as HTMLElement, patches);
    }
    
    this._vTree = newVTree;
}
```

### Pattern 4: Event Handlers

**Before:**
```typescript
renderButton(): void {
    this.container.innerHTML = `
        <button id="my-btn" class="btn">Click Me</button>
    `;
    
    // Must attach listener after render
    document.getElementById('my-btn')?.addEventListener('click', () => {
        this.handleClick();
    });
}
```

**After:**
```typescript
private _vTree: VNode | null = null;

renderButton(): void {
    const newVTree = h('button', {
        className: 'btn',
        onClick: () => this.handleClick()  // Event handler in props
    }, 'Click Me');
    
    if (!this._vTree) {
        const dom = createElement(newVTree);
        this.container.appendChild(dom);
    } else {
        const patches = diff(this._vTree, newVTree);
        patch(this.container.firstElementChild as HTMLElement, patches);
    }
    
    this._vTree = newVTree;
}
```

### Pattern 5: Conditional Rendering

**Before:**
```typescript
render(showDetails: boolean, data: Data): void {
    this.container.innerHTML = `
        <div class="card">
            <h2>${data.title}</h2>
            ${showDetails ? `
                <div class="details">
                    <p>${data.description}</p>
                    <small>${data.author}</small>
                </div>
            ` : ''}
        </div>
    `;
}
```

**After:**
```typescript
private _vTree: VNode | null = null;

render(showDetails: boolean, data: Data): void {
    const children = [
        h('h2', {}, data.title)
    ];
    
    if (showDetails) {
        children.push(
            h('div', { className: 'details' },
                h('p', {}, data.description),
                h('small', {}, data.author)
            )
        );
    }
    
    const newVTree = h('div', { className: 'card' }, ...children);
    
    if (!this._vTree) {
        const dom = createElement(newVTree);
        this.container.appendChild(dom);
    } else {
        const patches = diff(this._vTree, newVTree);
        patch(this.container.firstElementChild as HTMLElement, patches);
    }
    
    this._vTree = newVTree;
}
```

---

## Helper: Extract Render Logic

Create a helper function to reduce boilerplate:

```typescript
class MyComponent {
    private _vTree: VNode | null = null;
    
    private updateView(newVTree: VNode): void {
        if (!this._vTree) {
            const dom = createElement(newVTree);
            this.container.appendChild(dom);
        } else {
            const patches = diff(this._vTree, newVTree);
            patch(this.container.firstElementChild as HTMLElement, patches);
        }
        this._vTree = newVTree;
    }
    
    render(data: Data): void {
        const vTree = h('div', { className: 'my-component' },
            // ... your virtual tree
        );
        this.updateView(vTree);
    }
}
```

---

## Migration Checklist

- [ ] Import VDOM functions (`h`, `diff`, `patch`, `createElement`)
- [ ] Add `_vTree` private field to component
- [ ] Convert innerHTML template to `h()` calls
- [ ] Add keys to all list items
- [ ] Move event handlers to props (e.g., `onClick`)
- [ ] Implement initial render vs. update logic
- [ ] Test scroll position preservation
- [ ] Test focus preservation
- [ ] Test input state preservation
- [ ] Verify performance (should be faster for updates)

---

## Testing Your Migration

### Manual Testing

1. **Scroll Position**: Scroll the list, trigger an update, verify scroll doesn't reset
2. **Focus**: Focus an input, trigger update, verify focus remains
3. **Input State**: Type in an input, trigger update, verify text remains
4. **Event Handlers**: Click buttons, verify events still fire
5. **Performance**: Use browser DevTools to measure render time

### Automated Testing

```typescript
test('preserves scroll position after update', async ({ page }) => {
    // Scroll to position
    await page.evaluate(() => {
        const list = document.querySelector('.my-list');
        list.scrollTop = 500;
    });
    
    // Trigger update
    await page.click('[data-action="update"]');
    
    // Check scroll preserved
    const scrollTop = await page.evaluate(() => {
        const list = document.querySelector('.my-list');
        return list.scrollTop;
    });
    
    expect(scrollTop).toBe(500);
});
```

---

## Performance Comparison

| Operation | innerHTML | VDOM | Improvement |
|-----------|-----------|------|-------------|
| Initial render 100 items | ~50ms | ~30ms | 40% faster |
| Update 1 item | ~50ms | ~5ms | 90% faster |
| Reorder items | ~50ms | ~10ms | 80% faster |
| Add 1 item | ~50ms | ~3ms | 94% faster |

*Note: Times are approximate and vary by browser/hardware*

---

## Troubleshooting Common Issues

### Issue: "Cannot read property 'firstElementChild' of undefined"

**Cause:** Container not initialized before render

**Solution:** Ensure container exists:
```typescript
if (!this.container.firstElementChild) {
    const dom = createElement(newVTree);
    this.container.appendChild(dom);
}
```

### Issue: List items recreate on every update

**Cause:** Missing or unstable keys

**Solution:** Use stable IDs as keys:
```typescript
// ❌ Bad: index as key
items.map((item, i) => h('li', { key: i }, item.name))

// ✅ Good: stable ID as key
items.map(item => h('li', { key: item.id }, item.name))
```

### Issue: Event handlers fire multiple times

**Cause:** Re-attaching listeners on every render

**Solution:** VDOM handles this automatically. Use props:
```typescript
h('button', {
    onClick: () => this.handleClick()  // VDOM manages listener lifecycle
}, 'Click')
```

---

## Next Steps

- Read [Best Practices](./VDOM_BEST_PRACTICES.md) for optimization tips
- See [API Reference](./VDOM_API_REFERENCE.md) for complete API docs
- Check [Troubleshooting](./VDOM_TROUBLESHOOTING.md) for common issues
