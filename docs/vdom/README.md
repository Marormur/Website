# Virtual DOM (VDOM) Documentation

Complete documentation for the Mini-VDOM implementation used in this project.

## 📚 Documentation Structure

### 1. [API Reference](./VDOM_API_REFERENCE.md)

Complete API documentation for all VDOM functions and classes.

**Topics:**

- Core functions: `h()`, `diff()`, `patch()`, `createElement()`
- Component patterns and lifecycle
- Event delegation with `EventDelegator`
- Performance utilities (`measurePerf`)
- Type definitions (`VNode`, `Patch`, `PatchType`)
- Key-based reconciliation

**Start here if:** You need to understand the VDOM API or look up function signatures.

---

### 2. [Migration Guide](./VDOM_MIGRATION_GUIDE.md)

Step-by-step guide for migrating from `innerHTML` to VDOM.

**Topics:**

- Why migrate? (Problems with innerHTML vs VDOM benefits)
- Migration steps (Import → Add state → Convert template → Add keys)
- Common patterns: Lists, events, conditional rendering
- Performance comparison
- Testing your migration

**Start here if:** You're converting existing code from innerHTML to VDOM.

---

### 3. [Best Practices](./VDOM_BEST_PRACTICES.md)

Performance optimization strategies and recommended patterns.

**Topics:**

- Always use keys for lists
- Minimize VTree depth
- Cache static parts
- Batch updates
- Large list optimization (virtual scrolling)
- Type-safe VDOM with TypeScript
- Performance monitoring
- Anti-patterns to avoid

**Start here if:** You want to optimize VDOM performance or learn best practices.

---

### 4. [Troubleshooting](./VDOM_TROUBLESHOOTING.md)

Common issues, solutions, and debugging tips.

**Topics:**

- 8 common issues with solutions (scroll position, focus, events, memory leaks, etc.)
- Debugging utilities and strategies
- Performance debugging
- Testing examples (unit & E2E)
- FAQ section

**Start here if:** You're experiencing issues or need to debug VDOM behavior.

---

## 🚀 Quick Start

### Installation

VDOM is already included in the project. Access it via the global API:

```typescript
const { h, diff, patch, createElement } = window.VDOM;
```

Or import from the TypeScript module:

```typescript
import { h, diff, patch, createElement, VNode } from '../core/vdom';
```

### Basic Example

```typescript
// Create virtual tree
const vTree = h(
    'div',
    { className: 'container' },
    h('h1', {}, 'Hello VDOM!'),
    h('ul', {}, h('li', { key: 1 }, 'Item 1'), h('li', { key: 2 }, 'Item 2'))
);

// Initial render
const dom = createElement(vTree);
container.appendChild(dom);

// Update (only patches changes)
const newVTree = h(
    'div',
    { className: 'container' },
    h('h1', {}, 'Hello VDOM!'),
    h(
        'ul',
        {},
        h('li', { key: 1 }, 'Item 1'),
        h('li', { key: 2 }, 'Updated Item 2'),
        h('li', { key: 3 }, 'Item 3') // New item
    )
);

const patches = diff(vTree, newVTree);
patch(container.firstElementChild as HTMLElement, patches);
```

### Component Pattern

```typescript
class MyComponent {
    private container: HTMLElement;
    private _vTree: VNode | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
    }

    render(data: any): void {
        const newVTree = h(
            'div',
            { className: 'my-component' },
            h('h2', {}, data.title),
            h('p', {}, data.description)
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
}
```

---

## 📊 Performance Metrics

The VDOM implementation meets these performance targets:

| Metric                        | Target  | Status    |
| ----------------------------- | ------- | --------- |
| Diff Algorithm (100 nodes)    | < 10ms  | ✅ Passed |
| Patch Application (100 nodes) | < 20ms  | ✅ Passed |
| Memory Overhead               | < 100KB | ✅ Passed |

See [performance tests](../../tests/e2e/performance/vdom-performance.spec.js) for detailed benchmarks.

---

## 🧪 Testing

### E2E Tests

Comprehensive test coverage:

- **Core VDOM tests**: `tests/e2e/integration/vdom.spec.js` (~420 lines)
    - VNode creation, diffing, patching
    - Event delegation
    - Key-based reconciliation
    - Edge cases
- **Performance tests**: `tests/e2e/performance/vdom-performance.spec.js`
    - Diff/patch timing
    - Memory overhead
    - Large list performance

### Running Tests

```bash
# Quick smoke tests (Chromium only)
npm run test:e2e:quick

# Full test suite (all browsers)
npm run test:e2e

# With GitHub API mocking (recommended)
MOCK_GITHUB=1 npm run test:e2e:quick
```

---

## 📖 Implementation Details

### Source Code

- **Main implementation**: [`src/ts/core/vdom.ts`](../../src/ts/core/vdom.ts)
    - 545 lines of TypeScript
    - Strict mode compliant
    - Comprehensive JSDoc comments

### Key Features

1. **Efficient Diffing**
    - O(n) time complexity for balanced trees
    - Key-based reconciliation for lists
    - Minimal DOM operations

2. **State Preservation**
    - Maintains scroll position
    - Preserves focus state
    - Keeps input values

3. **Event Handling**
    - Inline event handlers via props
    - Optional event delegation
    - Automatic cleanup

4. **Type Safety**
    - Full TypeScript support
    - Strict type checking
    - Complete type definitions

---

## 🔗 Related Resources

### Project Documentation

- [Main README](../../readme.md) - Project overview
- [CHANGELOG](../../CHANGELOG.md) - Recent changes
- [Multi-Instance Guide](../guides/MULTI_INSTANCE.md) - Multi-window architecture

### External Resources

- [Virtual DOM Concepts](https://github.com/Matt-Esch/virtual-dom/blob/master/docs/vdom.md)
- [React Reconciliation](https://react.dev/learn/preserving-and-resetting-state)
- [Diffing Algorithm](https://grfia.dlsi.ua.es/ml/algorithms/references/editsurvey_bille.pdf)

---

## 📝 Contributing

When adding new VDOM features or fixing bugs:

1. Update relevant documentation in this directory
2. Add or update tests in `tests/e2e/integration/vdom.spec.js`
3. Ensure TypeScript compilation passes: `npm run typecheck`
4. Run E2E tests: `npm run test:e2e:quick`
5. Update performance metrics if applicable

---

## 📄 License

Same as the parent project. See [LICENSE](../../LICENSE) if available.

---

## 📞 Questions?

1. Check the [FAQ in Troubleshooting](./VDOM_TROUBLESHOOTING.md#faq)
2. Review [Best Practices](./VDOM_BEST_PRACTICES.md) for optimization tips
3. Consult the [API Reference](./VDOM_API_REFERENCE.md) for complete documentation

---

**Last Updated**: December 17, 2025 (Phase 4 - VDOM Documentation)
