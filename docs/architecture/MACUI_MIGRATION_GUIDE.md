# MacUI Framework Migration Guide

## Overview

This guide helps you migrate existing applications to use the MacUI framework. The framework provides 27+ production-ready components with TypeScript support, accessibility features, and performance optimizations.

## Prerequisites

- TypeScript 5.0+
- Understanding of component-based architecture
- Familiarity with existing app structure

## Migration Strategy

### Phase 1: Preparation (1 day)
1. Review existing code and identify UI patterns
2. Map existing components to MacUI equivalents
3. Set up framework imports
4. Run tests to establish baseline

### Phase 2: Form Controls (2-3 days)
1. Replace native buttons with `Button` component
2. Replace native inputs with `Input` component
3. Update form handling logic
4. Add validation with framework patterns

### Phase 3: Feedback Systems (1-2 days)
1. Replace alert() calls with `toast` notifications
2. Add `EmptyState` components for no-data scenarios
3. Add `Badge` components for counts/status
4. Implement `ErrorBoundary` for robustness

### Phase 4: Interactions (2-3 days)
1. Add `Tooltip` components for hints
2. Replace custom context menus with `ContextMenu`
3. Register keyboard shortcuts with `keyboardShortcuts`
4. Use `dragDropManager` for drag & drop features

### Phase 5: Advanced Components (3-4 days)
1. Use `Tree` for hierarchical data
2. Use `VirtualList` for large lists
3. Use `Table` for data grids
4. Implement `StateManager` for complex state

### Phase 6: Polish & Testing (2-3 days)
1. Add accessibility attributes
2. Run performance profiling
3. Optimize bundle size
4. Update tests
5. Documentation

## App-Specific Migration Guides

### Terminal Migration

**Current State:** Uses custom command input, session management, VirtualFS

**Migration Steps:**

1. **Replace command input with Input component:**
```typescript
// Before
const input = document.createElement('input');
input.type = 'text';
input.className = 'terminal-input';

// After
const input = new Input({
    type: 'text',
    placeholder: 'Enter command...',
    onEnter: (value) => this.executeCommand(value),
    prefix: '$'
});
```

2. **Add Toast notifications for command feedback:**
```typescript
// Before
console.log('Command executed successfully');

// After
toast.success('Command executed successfully');
toast.error('Command failed', {
    action: { label: 'View Log', onClick: () => this.showLog() }
});
```

3. **Use Tree component for file system navigation:**
```typescript
const fsTree = new Tree({
    nodes: this.buildFileSystemNodes(),
    onSelect: (node) => this.navigateToPath(node.id),
    showIcons: true,
    multiSelect: false
});
```

4. **Add EmptyState for new sessions:**
```typescript
if (this.history.length === 0) {
    const emptyState = new EmptyState({
        icon: '💻',
        title: 'New Terminal Session',
        description: 'Type a command to get started',
        action: {
            label: 'View Commands',
            onClick: () => this.showHelp()
        }
    });
}
```

**Estimated Time:** 3-4 days

**Benefits:**
- Consistent UI with other apps
- Better input validation
- Toast notifications for feedback
- Accessibility improvements

### TextEditor Migration

**Current State:** Uses custom text editing, tab management, file operations

**Migration Steps:**

1. **Use StateManager for editor state:**
```typescript
interface EditorState {
    activeTab: string | null;
    tabs: Tab[];
    isDirty: boolean;
    theme: 'light' | 'dark';
}

const editorState = new StateManager<EditorState>({
    initialState: {
        activeTab: null,
        tabs: [],
        isDirty: false,
        theme: 'light'
    },
    middleware: [
        loggingMiddleware,
        createPersistenceMiddleware('text-editor-state')
    ]
});
```

2. **Replace save button with Button component:**
```typescript
const saveButton = new Button({
    label: 'Save',
    variant: 'primary',
    icon: '💾',
    loading: this.state.saving,
    onClick: () => this.save(),
    disabled: !this.state.isDirty
});
```

3. **Add keyboard shortcuts:**
```typescript
keyboardShortcuts.register({
    id: 'text-editor-save',
    key: 'Meta+S',
    scope: 'window',
    description: 'Save file',
    callback: () => this.save()
});

keyboardShortcuts.register({
    id: 'text-editor-find',
    key: 'Meta+F',
    scope: 'window',
    description: 'Find in file',
    callback: () => this.showFindDialog()
});
```

4. **Add context menu for text operations:**
```typescript
textarea.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    
    new ContextMenu({
        items: [
            { id: 'cut', label: 'Cut', icon: '✂️', shortcut: 'Cmd+X', onClick: () => this.cut() },
            { id: 'copy', label: 'Copy', icon: '📋', shortcut: 'Cmd+C', onClick: () => this.copy() },
            { id: 'paste', label: 'Paste', icon: '📄', shortcut: 'Cmd+V', onClick: () => this.paste() },
            { id: 'divider', label: '', divider: true },
            { id: 'select-all', label: 'Select All', shortcut: 'Cmd+A', onClick: () => this.selectAll() }
        ],
        position: { x: event.clientX, y: event.clientY }
    });
});
```

5. **Add Toast for save feedback:**
```typescript
try {
    await this.saveFile();
    toast.success('File saved successfully');
} catch (error) {
    toast.error('Failed to save file', {
        action: { label: 'Retry', onClick: () => this.save() }
    });
}
```

**Estimated Time:** 4-5 days

**Benefits:**
- Centralized state management
- Keyboard shortcut support
- Context menu for operations
- Better user feedback

### Photos Migration

**Current State:** Uses Picsum gallery, image viewer

**Migration Steps:**

1. **Use VirtualList for image grid:**
```typescript
const imageList = new VirtualList({
    items: this.images,
    itemHeight: 200,
    height: window.innerHeight - 100,
    overscan: 3,
    renderItem: (image, index) => {
        return h('div', {
            className: 'image-card p-2 cursor-pointer',
            onclick: () => this.viewImage(image)
        }, [
            h('img', {
                src: image.thumbnail,
                alt: image.title,
                className: 'w-full h-40 object-cover rounded'
            }),
            h('p', { className: 'mt-2 text-sm' }, image.title)
        ]);
    }
});
```

2. **Add EmptyState for no images:**
```typescript
if (this.images.length === 0) {
    const emptyState = new EmptyState({
        icon: '📷',
        title: 'No images',
        description: 'Add some images to get started',
        action: {
            label: 'Browse Gallery',
            onClick: () => this.browseGallery()
        }
    });
}
```

3. **Add Tooltip for image info:**
```typescript
const imageWithTooltip = new Tooltip({
    content: `${image.width}x${image.height} - ${image.author}`,
    placement: 'bottom',
    children: imageElement
});
```

4. **Add keyboard navigation for image viewer:**
```typescript
keyboardShortcuts.register({
    id: 'photos-next',
    key: 'ArrowRight',
    scope: 'window',
    description: 'Next image',
    callback: () => this.nextImage()
});

keyboardShortcuts.register({
    id: 'photos-prev',
    key: 'ArrowLeft',
    scope: 'window',
    description: 'Previous image',
    callback: () => this.previousImage()
});
```

**Estimated Time:** 2-3 days

**Benefits:**
- Handles 1000+ images smoothly
- Better performance
- Keyboard navigation
- Consistent UX

## Common Patterns

### Replacing Native Buttons

```typescript
// Before
const button = document.createElement('button');
button.textContent = 'Click Me';
button.onclick = () => this.action();

// After
const button = new Button({
    label: 'Click Me',
    variant: 'primary',
    onClick: () => this.action()
});
```

### Replacing Alert/Confirm

```typescript
// Before
alert('File saved!');
if (confirm('Delete file?')) {
    this.deleteFile();
}

// After
toast.success('File saved!');

// For confirms, use dialog system (existing)
showDialog({
    title: 'Delete file?',
    message: 'This action cannot be undone.',
    buttons: [
        { label: 'Cancel', variant: 'secondary' },
        { label: 'Delete', variant: 'danger', onClick: () => this.deleteFile() }
    ]
});
```

### Adding Keyboard Shortcuts

```typescript
// Register shortcut
keyboardShortcuts.register({
    id: 'my-action',
    key: 'Meta+K', // Cmd on Mac, Ctrl on Windows
    scope: 'global', // or 'window' or 'component'
    description: 'Perform action',
    callback: (event) => {
        event.preventDefault();
        this.performAction();
    }
});

// Unregister on cleanup
keyboardShortcuts.unregister('my-action');
```

### Using State Management

```typescript
// Create state manager
const state = new StateManager({
    initialState: { count: 0 },
    middleware: [loggingMiddleware]
});

// Subscribe to changes
const unsubscribe = state.subscribe((newState, prevState) => {
    console.log('Count changed:', newState.count);
    this.render();
});

// Update state
state.setState({ count: state.getState().count + 1 });

// Create selector
const count = state.createSelector(s => s.count);
console.log('Current count:', count());

// Cleanup
unsubscribe();
```

## Performance Best Practices

1. **Use VirtualList for long lists** (>100 items)
2. **Wrap expensive renders in ErrorBoundary**
3. **Enable performance monitoring in dev:**
   ```typescript
   if (process.env.NODE_ENV === 'development') {
       performanceMonitor.enable();
   }
   ```
4. **Check bundle size:**
   ```typescript
   bundleAnalyzer.logReport();
   if (bundleAnalyzer.exceedsTarget(100)) {
       console.warn('Bundle size exceeds 100KB target!');
   }
   ```

## Accessibility Checklist

- [ ] All interactive elements have ARIA labels
- [ ] Keyboard navigation works (Tab, Arrow keys, Enter, Escape)
- [ ] Focus trap works in modals
- [ ] Screen reader announcements for dynamic content
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus indicators are visible

## Testing Strategy

1. **Unit tests** for component logic
2. **E2E tests** for user workflows
3. **Accessibility tests** (axe-core)
4. **Performance tests** (Lighthouse)
5. **Visual regression tests** (Percy/Chromatic)

## Rollback Plan

If migration causes issues:

1. **Feature flag:** Keep old code path
   ```typescript
   if (USE_MACUI_FRAMEWORK) {
       // New code
   } else {
       // Old code
   }
   ```

2. **Gradual rollout:** Migrate one component at a time
3. **A/B testing:** Test with subset of users
4. **Monitor metrics:** Track performance, errors, user feedback

## Support & Resources

- **Documentation:** `docs/architecture/README_MACUI.md`
- **Examples:** Check existing framework components
- **API Reference:** TypeScript definitions in framework files
- **Performance:** `window.MacUIPerf.logReport()`
- **Bundle analysis:** `window.MacUIBundle.logReport()`

## Timeline Summary

| App | Estimated Time | Priority | Complexity |
|-----|----------------|----------|------------|
| Terminal | 3-4 days | High | Medium |
| TextEditor | 4-5 days | High | High |
| Photos | 2-3 days | Medium | Low |

**Total estimated time:** 9-12 days for all apps

## Success Criteria

- [ ] All apps use framework components
- [ ] 90%+ type coverage maintained
- [ ] No performance regressions
- [ ] Accessibility score 90+ (Lighthouse)
- [ ] Bundle size < 100KB (gzipped)
- [ ] All E2E tests pass
- [ ] Zero production errors related to migration
