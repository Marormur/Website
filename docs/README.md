# 📚 Documentation Index

> NOTE: TypeScript migration is complete. For development and edits prefer the TypeScript sources in `src/ts/`. The `js/` directory contains emitted JavaScript output and legacy artifacts — edit `js/` only when fixing generated output or maintaining historical docs.

Welcome to the documentation for Marvin's Portfolio Website!

## 🚀 Quick Start

- **[guides/QUICKSTART.md](./guides/QUICKSTART.md)** - Get started in 5 minutes
- **[guides/DEPLOYMENT.md](./guides/DEPLOYMENT.md)** - How to deploy and run locally

## 🏗️ Architecture & Design

- **[architecture/OVERVIEW.md](./architecture/OVERVIEW.md)** - Complete architecture overview
- **[architecture/REFACTORING.md](./architecture/REFACTORING.md)** - Refactoring documentation
- **[architecture/PATTERNS.md](./architecture/PATTERNS.md)** - Code patterns & best practices
- **[guides/FINDER.md](./guides/FINDER.md)** - Finder/GitHub integration

## 🔄 Migration & Planning

- **[migration/TYPESCRIPT.md](./migration/TYPESCRIPT.md)** - TypeScript migration plan
- **[migration/HTML_MIGRATION.html](./migration/HTML_MIGRATION.html)** - Data-action migration examples
- **[project/TODO.md](./project/TODO.md)** - Current tasks and priorities
- **[project/ROADMAP.md](./project/ROADMAP.md)** - Long-term project roadmap
- **[project/DECISIONS.md](./project/DECISIONS.md)** - Architecture decision records
- **[project/IMPROVEMENTS.md](./project/IMPROVEMENTS.md)** - Codebase improvements guide

## 📖 Development Guide

For contributing to this project, see the [CONTRIBUTING.md](../CONTRIBUTING.md) in the root directory.

## 🎯 Key Concepts

### Module System

The application is built with a modular architecture:

1. **WindowManager** (`src/ts/window-manager.ts`) - Central window/modal management
2. **ActionBus** (`src/ts/action-bus.ts`) - Declarative event system
3. **API** (`src/ts/api.ts`) - Clean interface to all modules
4. **Window Configs** (`src/ts/window-configs.ts`) - Central window definitions

### Adding a New Window

Simply add to `src/ts/window-configs.ts`:

```javascript
{
    id: 'new-window-modal',
    type: 'persistent',
    programKey: 'programs.newApp',
    icon: './img/newapp.png',
    closeButtonId: 'close-new-window-modal'
}
```

### Using Actions

Instead of manual event handlers, use declarative actions:

```html
<button data-action="closeWindow" data-window-id="text-modal">Close</button>
```

## 🛠️ Tools & Scripts

- `npm run build:css` - Build Tailwind CSS
- `npm run watch:css` - Watch mode for CSS development
- `npm run dev` - Start development server
- `npm run test:e2e` - Run end-to-end tests

## 💾 Shared Virtual File System

Finder und Terminal verwenden ein zentrales, persistentes Virtual File System (VirtualFS). Dadurch sind Dateien und Verzeichnisse in beiden Apps identisch sichtbar und änderbar.

- **Einstieg und API**: [guides/VIRTUAL_FS_USAGE.md](./guides/VIRTUAL_FS_USAGE.md)
- **Finder Integration**: [guides/FINDER_VIRTUAL_FS.md](./guides/FINDER_VIRTUAL_FS.md)
- **Beispiele**: Finder-Refresh über Events, Terminal-Befehle (ls, cd, cat, touch, mkdir, rm)

## �📦 Project Structure

```
/
├── docs/              # Documentation files
├── src/               # Source files
│   ├── css/          # CSS source files
│   └── input.css     # Tailwind input
├── src/ts/           # TypeScript source files
├── img/              # Images and icons
├── tests/            # E2E tests
├── dist/             # Built files (output.css)
├── index.html        # Main entry point
├── app.js            # Main application logic
└── i18n.js           # Internationalization
```

## 🌍 Internationalization

The app supports German and English:

```javascript
API.i18n.translate('key', 'fallback');
```

## 🎨 Theming

Dark mode is supported via:

```javascript
API.theme.setPreference('dark'); // 'dark', 'light', or 'system'
```

## 📞 Support

For issues or questions, please open an issue on GitHub.
