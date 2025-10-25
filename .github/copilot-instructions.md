# Copilot Instructions - macOS-Style Portfolio Website

## Architecture Overview

This is a **desktop-metaphor web application** built with vanilla JavaScript, featuring a macOS-inspired UI with windows, modals, dock, and menubar. The codebase recently underwent significant refactoring from monolithic code (~1800 lines in `app.js`) to a modular architecture with specialized systems.

**⚠️ MIGRATION IN PROGRESS**: Legacy code in `app.js` is gradually being moved to modules. Prefer new module patterns over legacy approaches.

### Core Systems (Load Order Matters!)

1. **WindowManager** (`js/window-manager.js`) - Central window registry, z-index management, program metadata
2. **ActionBus** (`js/action-bus.js`) - Declarative event system via `data-action` attributes
3. **WindowConfigs** (`js/window-configs.js`) - Single source of truth for all window definitions
4. **API** (`js/api.js`) - Unified interface to all modules with legacy compatibility
5. **InstanceManager** (`js/instance-manager.js`) - Multi-instance window support (multiple terminals, editors)
6. **BaseWindowInstance** (`js/base-window-instance.js`) - Base class for window instances
7. **WindowChrome** (`js/window-chrome.js`) - Reusable UI components (titlebars, toolbars, status bars)

### Supporting Modules

- `theme.js` - Dark/light mode (system, light, dark)
- `i18n.js` - Internationalization (DE/EN) with system/manual language selection
- `dock.js` - macOS-style dock with magnification effect
- `menu.js` - Dynamic menu system
- `finder.js` - File browser for GitHub repositories
- `storage.js` - localStorage persistence for window positions, Finder state
- `desktop.js` - Desktop icon system

## Critical Patterns

### Adding New Windows

**ONE STEP ONLY** - Add to `js/window-configs.js`:

```javascript
{
    id: 'new-window-modal',
    type: 'persistent', // or 'transient'
    programKey: 'programs.newApp', // i18n key
    icon: './img/icon.png',
    closeButtonId: 'close-new-window-modal',
    metadata: {
        initHandler: function() { /* optional init */ }
    }
}
```

NO need to modify arrays, add event listeners, or create Dialog instances manually - WindowManager handles everything.

### Event Handling via ActionBus

**Don't use addEventListener** for standard actions. Use declarative HTML:

```html
<button data-action="closeWindow" data-window-id="finder-modal">Close</button>
<button data-action="openDesktopItem" data-item-id="projects">Projects</button>
```

Available actions: `closeWindow`, `openWindow`, `closeTopWindow`, `resetWindowLayout`, `openProgramInfo`, `openAbout`, `openSettings`, `openDesktopItem`

Register custom actions:

```javascript
ActionBus.register('myAction', (params, element) => {
    // params contains all data-* attributes
});
```

### Multi-Instance Windows

Create multiple windows of the same type (terminals, editors):

```javascript
// Create instance
const term1 = window.TerminalInstanceManager.createInstance({
    title: 'Dev Terminal',
    initialState: { currentPath: '/home' },
});

// Each instance has isolated state
term1.state.commandHistory = ['ls', 'cd /var'];

// Instances are managed automatically
term1.destroy(); // cleanup
```

New instance types extend `BaseWindowInstance` and register with `InstanceManager`.

### WindowChrome for Reusable UI Components

Use `WindowChrome` to build consistent window UI:

```javascript
// Create titlebar with controls
const titlebar = WindowChrome.createTitlebar({
    title: 'My Window',
    icon: './img/icon.png',
    showClose: true,
    showMinimize: true,
    showMaximize: false,
    onClose: () => instance.close(),
    onMinimize: () => instance.minimize(),
});

// Create toolbar with buttons
const toolbar = WindowChrome.createToolbar([
    { label: 'New', icon: '➕', onClick: () => createNew() },
    { type: 'separator' },
    { label: 'Save', icon: '💾', onClick: () => save() },
]);

// Create status bar
const statusBar = WindowChrome.createStatusBar({
    leftContent: 'Ready',
    rightContent: 'Line 1, Col 1',
});

// Update titlebar dynamically
WindowChrome.updateTitle(titlebar, 'New Title');
```

WindowChrome provides: `createTitlebar()`, `createToolbar()`, `createStatusBar()`, `updateTitle()`, and private helpers for consistent UI components.

### API Access Pattern

**Prefer** unified API access:

```javascript
API.theme.setThemePreference('dark');
API.window.open('finder-modal');
API.storage.saveWindowPositions();
```

Legacy wrapper functions exist for backwards compatibility but new code should use `API.*`

## Deprecated Patterns (Legacy Code)

**⚠️ DO NOT use these patterns** - they exist only for backwards compatibility during migration:

### ❌ Manual addEventListener for UI actions

```javascript
// OLD - Don't do this
closeBtn.addEventListener('click', () => closeWindow('finder-modal'));

// NEW - Use ActionBus
<button data-action="closeWindow" data-window-id="finder-modal">
    Close
</button>;
```

### ❌ Direct Dialog instance creation

```javascript
// OLD - Don't do this
const dialog = new Dialog('my-modal', { closeButton: 'close-btn' });

// NEW - Register in window-configs.js, WindowManager handles creation
```

### ❌ Hard-coded modal ID arrays

```javascript
// OLD - Don't modify these arrays
var modalIds = ["finder-modal", "about-modal", ...];

// NEW - Register windows in window-configs.js
```

### ❌ Direct module function calls

```javascript
// OLD - Direct calls
setThemePreference('dark');

// NEW - Use API namespace
API.theme.setThemePreference('dark');
```

### ✅ Preferred Modern Patterns

- **Windows**: Define in `window-configs.js`
- **Events**: Use `data-action` attributes + ActionBus
- **Module access**: Use `API.*` namespace
- **Multi-instance**: Extend `BaseWindowInstance` + use InstanceManager
- **UI components**: Use WindowChrome helpers

## Development Workflow

### Build & Run

```bash
npm run build:css          # Build Tailwind CSS (required first time)
npm run watch:css          # Watch CSS changes (run in separate terminal)
npm run dev                # Start dev server on http://127.0.0.1:5173
```

**Note**: VS Code tasks automate this - "Dev Environment: Start All" task runs both watch:css and dev server.

### Testing

E2E tests use Playwright across Chromium, Firefox, and WebKit:

```bash
npm run pw:install         # Install browsers (once)
npm run test:e2e           # Run all E2E tests (headless)
npm run test:e2e:headed    # Run with browser visible
npm run test:e2e:ui        # Run with Playwright UI
```

Tests are in `tests/e2e/*.spec.js`.

#### Test Strategy Differences

**`multi-instance-basic.spec.js`** - Simple, fast tests without network dependencies:

- Uses `page.waitForTimeout(2000)` instead of `networkidle`
- Suitable for CI environments with flaky networks
- Tests basic module availability and instance creation
- Runs faster but less comprehensive

**`multi-instance.spec.js`** - Comprehensive tests with full page load:

- Uses `page.waitForLoadState('networkidle')` for complete initialization
- Tests complex interactions and state isolation
- More realistic but slower
- May fail if GitHub API is rate-limited

**When to use which**:

- Use `-basic` tests for quick smoke tests and CI
- Use full tests for thorough validation before releases
- Both should pass for production readiness

#### Test Environment

Test patterns use `utils.js` for shared setup. Server configuration:

- **Dev and Tests**: Always run on `http://127.0.0.1:5173` via `node server.js`
- `playwright.config.js` starts the Node server automatically if not running
- Tests expect GitHub username "Marormur" - if changing username, update test mocks in `tests/e2e/utils.js`

### Deployment

**GitHub Pages** auto-deploys on push to `main` branch:

1. GitHub Actions runs `npm run build:css`
2. Site publishes to https://marormur.github.io/Website/
3. `.nojekyll` file ensures all assets are served

**Critical**:

- `dist/output.css` is **NOT committed** - GitHub Actions builds it automatically
- Locally: Use `npm run watch:css` task during development
- CSS changes go in `src/input.css` or `src/css/*.css`, never edit `dist/output.css`
- Repository Settings → Pages → Source must be "GitHub Actions"

## Project-Specific Conventions

### Internationalization (i18n)

All user-facing text goes through `i18n.js`:

```javascript
translate('programs.finder.label'); // Returns localized string
appI18n.applyTranslations(); // Re-render all translations
```

Add new translations to BOTH `de` and `en` objects in `i18n.js`. Use dotted keys like `context.finder.openItem`.

### GitHub Integration

Finder loads public repos from GitHub API for user **"Marormur"**.

**To customize for another user**:

1. Edit `js/finder.js`: Change `const GITHUB_USERNAME = 'Marormur';` (primary location)
2. If legacy code is active: Also update `const username` in `app.js` (around line 845) and `projekte.html`
3. Update test mocks in `tests/e2e/utils.js` (search for "Marormur" API URLs)
4. Note: No authentication token is used

**Rate limiting**:

- Unauthenticated GitHub API: 60 requests/hour per IP
- Failed loads are common in development - check browser console for 403 errors
- Consider adding a GitHub token for development (would increase limit to 5000/hour)
- No error UI is shown to users on API failures

### CSS & Styling

- **Tailwind CSS** classes in HTML (`src/input.css` → `dist/output.css`)
- **Custom CSS** in `src/css/style.css` and `src/css/dialog.css`
- **Dark mode** via `class="dark"` on `<html>` element
- Run `npm run build:css` after changing Tailwind config or `src/input.css`

### Storage & Persistence

Uses localStorage for:

- Window positions/z-indexes
- Finder state (current repo, path)
- Theme preference (system/light/dark)
- Language preference (system/de/en)

Access via `API.storage.*` methods. Reset with "Fenster zurücksetzen" menu item.

### Dialog/Modal System

All modals use `Dialog` class (`js/dialog.js`):

```javascript
const dialog = new Dialog('modal-id', {
    closeButton: 'close-button-id',
    persistent: true, // or false for transient
});
```

Dialogs auto-register with WindowManager. Z-index managed automatically on focus.

## Common Pitfalls

1. **Module load order**: Core systems must load before `app.js`. Check `index.html` script order if seeing undefined errors.

2. **i18n keys**: Missing translation keys fall back to key name. Always add to both DE and EN.

3. **CSS not updating**: Run `npm run build:css` or ensure `watch:css` task is running.

4. **Instance cleanup**: Multi-instance windows need explicit `destroy()` or use InstanceManager methods to avoid memory leaks.

5. **GitHub API fails silently**: Check browser console for 403 rate limit errors. No error UI shown to user.

6. **Editing `dist/output.css` directly**: This file is generated by Tailwind. Changes go in `src/input.css` or `src/css/*.css` only.

7. **Using old event patterns**: Don't add manual `addEventListener` for standard UI actions - use ActionBus `data-action` instead.

8. **Changing GitHub username**: Remember to update not just `js/finder.js`, but also test mocks in `tests/e2e/utils.js` to avoid test failures.

## Configuration for Forking

If you're forking this project for your own portfolio:

1. **GitHub Username**:
    - Primary: Edit `js/finder.js` - change `const GITHUB_USERNAME = 'Marormur';` to your username
    - Legacy (if used): Also update `const username` in `app.js` and `projekte.html`
    - Tests: Update API URL mocks in `tests/e2e/utils.js` (search/replace "Marormur")
2. **Profile Image**: Replace `img/profil.jpg` with your photo
3. **Translations**: Update personal info in `i18n.js` (both `de` and `en` objects)
4. **GitHub Pages URL**: Update `docs/guides/DEPLOYMENT.md` with your repository URL
5. **Repository Settings**: Enable GitHub Pages with source "GitHub Actions"
6. **Branding**: Replace icons in `img/` directory as needed

## Key Files for Reference

- `docs/architecture/OVERVIEW.md` - Visual architecture diagrams and data flow
- `docs/architecture/PATTERNS.md` - Design patterns and best practices
- `docs/architecture/REFACTORING.md` - Migration guide from old to new architecture
- `docs/QUICKSTART.md` - Quick start guide for developers
- `docs/archive/MULTI_INSTANCE_QUICKSTART.md` - Multi-instance system guide with examples (archived)
- `docs/guides/DEPLOYMENT.md` - GitHub Pages deployment setup
- `js/window-configs.js` - All window definitions (single source of truth)
- `app.js` - Main application bootstrap (legacy code being gradually migrated)
- `i18n.js` - Complete translation dictionary

## Quick Wins for AI Agents

- Adding windows? Edit `js/window-configs.js` only
- Adding UI actions? Register in ActionBus, use `data-action` in HTML
- Adding translations? Add to both `de` and `en` in `i18n.js`
- Need new instance type? Extend `BaseWindowInstance`, create manager
- Modifying styles? Check if Tailwind class exists before custom CSS
