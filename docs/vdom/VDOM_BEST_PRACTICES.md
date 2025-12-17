# VDOM Best Practices

Performance tips, optimization strategies, and common patterns for VDOM usage.

## 1. Always Use Keys for Lists

Keys enable efficient reconciliation and prevent unnecessary DOM operations.

### ❌ Bad: No Keys

```typescript
items.map(item => h('li', {}, item.name))
```

**Problems:**
- Items recreated on reorder
- Scroll position lost
- Component state reset
- Poor performance

### ✅ Good: Stable Keys

```typescript
items.map(item => h('li', { key: item.id }, item.name))
```

**Benefits:**
- Items reordered, not recreated
- State preserved
- Fast updates
- Efficient reconciliation

### Key Guidelines

**Do:**
- Use stable IDs (database IDs, UUIDs)
- Ensure uniqueness within siblings
- Use same key for same item across renders

**Don't:**
- Use array indices (unless list is static and never reordered)
- Use random values (breaks reconciliation)
- Reuse keys for different items

```typescript
// ❌ Bad: Index as key (breaks on reorder)
items.map((item, i) => h('li', { key: i }, item.name))

// ❌ Bad: Random keys (breaks reconciliation)
items.map(item => h('li', { key: Math.random() }, item.name))

// ✅ Good: Stable ID
items.map(item => h('li', { key: item.id }, item.name))

// ✅ Good: Composite key for nested lists
users.map(user =>
    h('div', { key: user.id },
        ...user.posts.map(post =>
            h('div', { key: `${user.id}-${post.id}` }, post.title)
        )
    )
)
```

---

## 2. Minimize VTree Depth

Keep virtual trees shallow for better diff performance.

### ❌ Bad: Deep Nesting

```typescript
h('div', {},
    h('div', {},
        h('div', {},
            h('div', {},
                h('div', {},
                    content
                )
            )
        )
    )
)
```

**Problems:**
- Slower diffing
- More memory
- Harder to debug

### ✅ Good: Flat Structure

```typescript
h('div', { className: 'wrapper' }, content)
```

**Or with meaningful semantics:**
```typescript
h('article', { className: 'post' },
    h('header', {}, title),
    h('main', {}, content),
    h('footer', {}, metadata)
)
```

---

## 3. Extract and Cache Static Parts

Don't recreate unchanging subtrees on every render.

### ❌ Bad: Re-create Static Header Every Time

```typescript
render(data: Data): void {
    const newVTree = h('div', {},
        // This header never changes, but we recreate it every render
        h('header', { className: 'app-header' },
            h('img', { src: '/logo.png', alt: 'Logo' }),
            h('h1', {}, 'My App'),
            h('nav', {},
                h('a', { href: '#home' }, 'Home'),
                h('a', { href: '#about' }, 'About')
            )
        ),
        h('main', {}, this.renderContent(data))  // Only this changes
    );
    
    this.updateView(newVTree);
}
```

### ✅ Good: Cache Static Parts

```typescript
class MyComponent {
    private _headerVTree: VNode | null = null;
    private _vTree: VNode | null = null;
    
    private getHeaderVTree(): VNode {
        if (!this._headerVTree) {
            this._headerVTree = h('header', { className: 'app-header' },
                h('img', { src: '/logo.png', alt: 'Logo' }),
                h('h1', {}, 'My App'),
                h('nav', {},
                    h('a', { href: '#home' }, 'Home'),
                    h('a', { href: '#about' }, 'About')
                )
            );
        }
        return this._headerVTree;
    }
    
    render(data: Data): void {
        const newVTree = h('div', {},
            this.getHeaderVTree(),  // Reuse cached header
            h('main', {}, this.renderContent(data))
        );
        
        this.updateView(newVTree);
    }
}
```

**Benefits:**
- Faster diffing (header skipped if reference is same)
- Less memory allocation
- Better performance

---

## 4. Batch Updates

Avoid multiple renders in quick succession.

### ❌ Bad: Multiple Renders

```typescript
items.forEach(item => {
    this.addItem(item);
    this.render();  // ← N renders!
});
```

**Problems:**
- N diff/patch cycles
- Slow for large updates
- Unnecessary DOM operations

### ✅ Good: Single Render

```typescript
items.forEach(item => this.addItem(item));
this.render();  // ← 1 render!
```

**Or with debouncing:**
```typescript
class MyComponent {
    private renderTimeout: number | null = null;
    
    scheduleRender(): void {
        if (this.renderTimeout !== null) {
            clearTimeout(this.renderTimeout);
        }
        
        this.renderTimeout = window.setTimeout(() => {
            this.render();
            this.renderTimeout = null;
        }, 16);  // ~60fps
    }
    
    addItem(item: Item): void {
        this.items.push(item);
        this.scheduleRender();  // Debounced render
    }
}
```

---

## 5. Use Fragments for Multiple Root Elements

When you need multiple root elements without a wrapper.

### ❌ Bad: Unnecessary Wrapper

```typescript
// Adds extra <div> to DOM
h('div', {},
    h('h1', {}, title),
    h('p', {}, description)
)
```

### ✅ Good: Array of Children (Fragment-like)

```typescript
// No wrapper needed - parent handles multiple children
const children = [
    h('h1', { key: 'title' }, title),
    h('p', { key: 'desc' }, description)
];

// Use in parent
h('article', {}, ...children)
```

**Note:** Always use keys when returning array of elements.

---

## 6. Optimize Large Lists

For lists with 1000+ items, consider virtualization.

### Basic Large List

```typescript
class LargeList {
    private _vTree: VNode | null = null;
    
    render(items: Item[]): void {
        // For < 1000 items, direct rendering is fine
        const newVTree = h('ul', { className: 'large-list' },
            ...items.map(item => 
                h('li', { key: item.id }, item.name)
            )
        );
        
        this.updateView(newVTree);
    }
}
```

### Virtual Scrolling (for 1000+ items)

```typescript
class VirtualList {
    private _vTree: VNode | null = null;
    private scrollTop = 0;
    private itemHeight = 50;
    private visibleCount = 20;
    
    render(items: Item[]): void {
        // Only render visible items
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = startIndex + this.visibleCount;
        const visibleItems = items.slice(startIndex, endIndex);
        
        const newVTree = h('div', {
            className: 'virtual-list',
            onScroll: (e: Event) => {
                this.scrollTop = (e.target as HTMLElement).scrollTop;
                this.render(items);
            },
            style: {
                height: '1000px',
                overflow: 'auto'
            }
        },
            h('div', {
                style: {
                    height: `${items.length * this.itemHeight}px`,
                    position: 'relative'
                }
            },
                ...visibleItems.map((item, i) =>
                    h('div', {
                        key: item.id,
                        style: {
                            position: 'absolute',
                            top: `${(startIndex + i) * this.itemHeight}px`,
                            height: `${this.itemHeight}px`
                        }
                    }, item.name)
                )
            )
        );
        
        this.updateView(newVTree);
    }
}
```

---

## 7. Separate Concerns with Helper Functions

Break complex render logic into smaller functions.

### ❌ Bad: Monolithic Render

```typescript
render(data: Data): void {
    const newVTree = h('div', { className: 'app' },
        h('header', {},
            h('img', { src: data.logo }),
            h('h1', {}, data.title),
            h('nav', {},
                ...data.navItems.map(item =>
                    h('a', { key: item.id, href: item.url }, item.label)
                )
            )
        ),
        h('main', {},
            h('aside', {},
                ...data.categories.map(cat =>
                    h('div', { key: cat.id, className: 'category' },
                        h('h3', {}, cat.name),
                        h('ul', {},
                            ...cat.items.map(item =>
                                h('li', { key: item.id }, item.name)
                            )
                        )
                    )
                )
            ),
            h('article', {},
                h('h2', {}, data.article.title),
                h('p', {}, data.article.content)
            )
        ),
        h('footer', {},
            h('p', {}, data.copyright)
        )
    );
    
    this.updateView(newVTree);
}
```

### ✅ Good: Separated Helper Functions

```typescript
class MyApp {
    private _vTree: VNode | null = null;
    
    private renderHeader(data: Data): VNode {
        return h('header', {},
            h('img', { src: data.logo }),
            h('h1', {}, data.title),
            this.renderNav(data.navItems)
        );
    }
    
    private renderNav(items: NavItem[]): VNode {
        return h('nav', {},
            ...items.map(item =>
                h('a', { key: item.id, href: item.url }, item.label)
            )
        );
    }
    
    private renderSidebar(categories: Category[]): VNode {
        return h('aside', {},
            ...categories.map(cat => this.renderCategory(cat))
        );
    }
    
    private renderCategory(category: Category): VNode {
        return h('div', { key: category.id, className: 'category' },
            h('h3', {}, category.name),
            h('ul', {},
                ...category.items.map(item =>
                    h('li', { key: item.id }, item.name)
                )
            )
        );
    }
    
    private renderArticle(article: Article): VNode {
        return h('article', {},
            h('h2', {}, article.title),
            h('p', {}, article.content)
        );
    }
    
    private renderFooter(copyright: string): VNode {
        return h('footer', {},
            h('p', {}, copyright)
        );
    }
    
    render(data: Data): void {
        const newVTree = h('div', { className: 'app' },
            this.renderHeader(data),
            h('main', {},
                this.renderSidebar(data.categories),
                this.renderArticle(data.article)
            ),
            this.renderFooter(data.copyright)
        );
        
        this.updateView(newVTree);
    }
}
```

**Benefits:**
- Easier to read and maintain
- Reusable render functions
- Better testability
- Clearer separation of concerns

---

## 8. Avoid Inline Event Handlers (When Possible)

Inline arrow functions create new function instances on every render.

### ❌ Bad: Inline Arrow Functions

```typescript
items.map(item =>
    h('button', {
        onClick: () => this.handleClick(item.id)  // New function every render
    }, item.name)
)
```

### ✅ Good: Pre-bound Handlers

```typescript
class MyComponent {
    private handlers = new Map<string, () => void>();
    
    getHandler(itemId: string): () => void {
        if (!this.handlers.has(itemId)) {
            this.handlers.set(itemId, () => this.handleClick(itemId));
        }
        return this.handlers.get(itemId)!;
    }
    
    render(items: Item[]): void {
        const newVTree = h('ul', {},
            ...items.map(item =>
                h('button', {
                    key: item.id,
                    onClick: this.getHandler(item.id)  // Reuse same function
                }, item.name)
            )
        );
        
        this.updateView(newVTree);
    }
}
```

**Note:** For small lists (< 100 items), inline handlers are fine. Optimize when profiling shows it's a bottleneck.

---

## 9. Type-Safe VDOM with TypeScript

Leverage TypeScript for better DX and fewer bugs.

```typescript
// Define your component props
interface UserCardProps {
    user: User;
    onEdit: (userId: string) => void;
    onDelete: (userId: string) => void;
}

class UserCard {
    private _vTree: VNode | null = null;
    
    render(props: UserCardProps): VNode {
        const { user, onEdit, onDelete } = props;
        
        return h('div', { className: 'user-card', key: user.id },
            h('img', { src: user.avatar, alt: user.name }),
            h('h3', {}, user.name),
            h('p', {}, user.bio),
            h('div', { className: 'actions' },
                h('button', {
                    onClick: () => onEdit(user.id)
                }, 'Edit'),
                h('button', {
                    onClick: () => onDelete(user.id),
                    className: 'danger'
                }, 'Delete')
            )
        );
    }
}
```

---

## 10. Performance Monitoring

Use built-in performance utilities to identify bottlenecks.

```typescript
import { measurePerf } from '../core/vdom';

class MyComponent {
    render(data: Data): void {
        const { result, time } = measurePerf(() => {
            const newVTree = this.createVTree(data);
            
            if (!this._vTree) {
                const dom = createElement(newVTree);
                this.container.appendChild(dom);
            } else {
                const patches = diff(this._vTree, newVTree);
                patch(this.container.firstElementChild as HTMLElement, patches);
            }
            
            this._vTree = newVTree;
        }, 'MyComponent render');
        
        if (time > 16) {  // > 1 frame at 60fps
            console.warn(`Slow render: ${time.toFixed(2)}ms`);
        }
    }
}
```

---

## Summary: Performance Checklist

- [ ] Use stable keys for all list items
- [ ] Keep VTree depth minimal (< 10 levels)
- [ ] Cache static subtrees
- [ ] Batch updates (avoid multiple renders)
- [ ] Consider virtualization for 1000+ items
- [ ] Extract helper functions for readability
- [ ] Pre-bind event handlers for large lists
- [ ] Use TypeScript for type safety
- [ ] Monitor render performance
- [ ] Profile before optimizing

---

## Anti-Patterns to Avoid

### ❌ Don't Use Index as Key for Dynamic Lists

```typescript
// Breaks when list is reordered/filtered
items.map((item, i) => h('li', { key: i }, item.name))
```

### ❌ Don't Recreate VDOM Tree from Scratch

```typescript
// Loses all benefits of diffing
this.container.innerHTML = '';
const dom = createElement(newVTree);
this.container.appendChild(dom);
```

### ❌ Don't Mix innerHTML and VDOM

```typescript
// innerHTML destroys VDOM-managed nodes
this.container.innerHTML += '<div>New content</div>';
```

### ❌ Don't Forget to Update _vTree

```typescript
// Next render will diff against old tree
const patches = diff(this._vTree, newVTree);
patch(this.container, patches);
// this._vTree = newVTree;  ← DON'T FORGET THIS!
```

---

## See Also

- [API Reference](./VDOM_API_REFERENCE.md) - Complete API documentation
- [Migration Guide](./VDOM_MIGRATION_GUIDE.md) - How to migrate from innerHTML
- [Troubleshooting](./VDOM_TROUBLESHOOTING.md) - Common issues and solutions
