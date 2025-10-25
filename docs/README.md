# 📚 Documentation Index

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

1. **WindowManager** (`js/window-manager.js`) - Central window/modal management
2. **ActionBus** (`js/action-bus.js`) - Declarative event system
3. **API** (`js/api.js`) - Clean interface to all modules
4. **Window Configs** (`js/window-configs.js`) - Central window definitions

### Adding a New Window

Simply add to `js/window-configs.js`:

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
<button data-action="closeWindow" data-window-id="finder-modal">
    Close
</button>
```

## 🛠️ Tools & Scripts

- `npm run build:css` - Build Tailwind CSS
- `npm run watch:css` - Watch mode for CSS development
- `npm run dev` - Start development server
- `npm run test:e2e` - Run end-to-end tests

## 📦 Project Structure

```
/
├── docs/              # Documentation files
├── src/               # Source files
│   ├── css/          # CSS source files
│   └── input.css     # Tailwind input
├── js/               # JavaScript modules
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
API.theme.setPreference('dark');  // 'dark', 'light', or 'system'
```

## 📞 Support

For issues or questions, please open an issue on GitHub.
