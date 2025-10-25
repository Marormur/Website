# Changelog

All notable changes to this project will be documented in this file.

- Logger system for centralized logging
- refactor(ts): migrate ActionBus to TypeScript with strict types and legacy global API preserved
  - New source: src/ts/action-bus.ts → emits to js/action-bus.js
  - Removed explicit any casts; added typed helpers for Window and FinderSystem
  - No runtime API changes; data-action flows remain fully compatible

- refactor(ts): migrate WindowChrome to TypeScript
  - New source: src/ts/window-chrome.ts → emits to js/window-chrome.js
  - Strongly typed configs for titlebar/toolbar/statusbar/window frame
  - Preserves global WindowChrome API and DOM structure

- refactor(ts): migrate BaseWindowInstance to TypeScript
  - New source: src/ts/base-window-instance.ts → emits to js/base-window-instance.js
  - Base class with typed config, state, events, and lifecycle methods
  - All subclasses (TerminalInstance, TextEditorInstance, FinderInstance) remain compatible

- refactor(ts): migrate InstanceManager to TypeScript
  - New source: src/ts/instance-manager.ts → emits to js/instance-manager.js
  - Typed manager with strong instance registry and lifecycle control
  - Preserves global InstanceManager class and all manager patterns

- refactor(ts): migrate API module to TypeScript
  - New source: src/ts/api.ts → emits to js/api.js
  - Central unified API wrapper with typed module proxies
  - Safe window property access via getWindowProp and callWindowMethod helpers
  - Preserves all legacy global function wrappers (setThemePreference, renderApplicationMenu, etc.)
  - No runtime API changes; backward compatibility maintained

- refactor(ts): migrate ThemeSystem to TypeScript
  - New source: src/ts/theme.ts → emits to js/theme.js
  - Strongly typed theme preferences (system/light/dark) and system listener fallback
  - Preserves global ThemeSystem API and legacy wrappers

- refactor(ts): migrate StorageSystem to TypeScript
  - New source: src/ts/storage.ts → emits to js/storage.js
  - Typed persistence for finder state, open modals, window positions, and layout reset
  - Safe global access (window.*) using unknown casts and guards; same runtime behavior
- CODEBASE_IMPROVEMENTS.md with organizational tasks
- TYPESCRIPT_MIGRATION_PLAN.md with detailed migration strategy
- API Docs: Generated JSDoc and in-app “📖 API Docs” link (index.html)
- Observability: Global ErrorHandler (window.onerror/unhandledrejection) and PerfMonitor (performance marks/measures)

### Changed
- Reorganized documentation structure:
  - `docs/guides/` - User guides and quickstarts
  - `docs/migration/` - Migration guides
- Finder keyboard shortcuts integrated with tab manager (Cmd/Ctrl+W routes to tab close + instance cleanup)

- NEXT_STEPS.md (consolidated into TODO.md)
- PR_README.md (outdated)

### Fixed
- ActionBus for declarative event handling
- WindowChrome for reusable UI components
- GitHub Actions CI/CD pipeline

- Refactored from monolithic app.js to modular architecture
- Improved documentation structure

### Security
- Initial security audit completed
