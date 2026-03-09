# Website API Documentation

Welcome to the API documentation for the macOS-style portfolio website.

## Getting Started

This portfolio website is built as a single-page application with a full desktop metaphor, including a
virtual file system, multi-instance windows, and an event-driven action bus.

### Core Concepts

- **Window System:** Multi-instance window management (`WindowManager`, `BaseWindowInstance`)
- **VirtualFS:** In-browser file system backed by IndexedDB/localStorage
- **ActionBus:** Event-driven, declarative action system via `data-action` HTML attributes
- **SessionManager:** Persistent state with debounced auto-save
- **i18n:** Runtime language switching (DE/EN) with translation lookup

### Common Use Cases

#### Opening a Window

```typescript
// Via ActionBus (preferred – declarative)
// In HTML: <button data-action="openWindow" data-id="finder-window">Open Finder</button>

// Programmatically
window.WindowManager.bringToFront('finder-window');
```

#### Using VirtualFS

```typescript
import { VirtualFS } from '@/services/virtual-fs';

// Create a folder and write a file
VirtualFS.createFolder('/projects');
VirtualFS.createFile('/projects/hello.txt', 'Hello World');

// Read the file back
const content = VirtualFS.readFile('/projects/hello.txt');
console.log(content); // "Hello World"

// List directory contents
const entries = VirtualFS.list('/projects');
console.log(Object.keys(entries)); // ["hello.txt"]

// Listen for changes
VirtualFS.addEventListener(event => {
    console.log(event.type, event.path);
});
```

#### Translating Text

```typescript
// Via global API (available after app-init)
const label = API.i18n.translate('menu.file', { fallback: 'File' });

// Or via window.appI18n
const greeting = window.appI18n.translate('greeting', { name: 'Marvin' });
```

#### Registering a Custom Action

```typescript
window.ActionBus.register('myAction', (params, element) => {
    console.log('Action triggered:', params, element);
});
```

```html
<!-- Trigger from HTML -->
<button data-action="myAction" data-foo="bar">Click me</button>
```

## API Reference

Browse the full API reference in the navigation on the left.

## Architecture Overview

```
src/ts/
├── core/        Core framework (API aggregator, app init, logger, VDOM)
├── services/    Business logic (VirtualFS, i18n, theme, SessionManager, GitHub API)
├── windows/     Window management (WindowManager, BaseWindow, InstanceManager)
├── ui/          Desktop UI (ActionBus, Dock, Menu, Dialog, ContextMenu)
├── apps/        Built-in applications (Finder, Terminal, TextEditor, Photos)
├── framework/   Reusable UI framework components (components, layout, controls, data views)
└── utils/       Shared utilities (auto-save helpers, etc.)
```

## Contributing

- All public APIs must have JSDoc comments (see `docs/guides/jsdoc-standards.md`)
- TypeDoc generation must succeed without errors (`npm run docs:generate`)
- New public APIs must include `@param`, `@returns`, and `@example` tags
