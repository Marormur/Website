# Changelog

All notable changes to this project will be documented in this file.

- chore: deprecate legacy loadGithubRepos in app.js
  - Removed init-time usage; menu reload now uses FinderSystem directly
  - Kept a guarded no-op function that delegates to FinderSystem and returns early
  - Prepares for full removal of legacy GitHub loader implementation

- feat: extract updateDockIndicators to dock.js module
  - Moved dock indicator update logic from app.js to DockSystem.updateDockIndicators
  - Legacy global alias window.updateDockIndicators preserved for backward compatibility
  - Reduced app.js by 27 lines (from 1051 to 1024 lines)
  - **Total Phase 4 reduction: app.js down from 1308 to 1024 lines (-284 lines, -21.7%)**

- feat(ts): extract Dialog Utilities to dedicated module
  - New source: src/ts/dialog-utils.ts → emits to js/dialog-utils.js
  - Centralized z-index management: syncTopZIndexWithDOM, bringDialogToFront, bringAllWindowsToFront
  - Load order: dialog-utils.js before dialog.js (dialog depends on these functions)
  - Removed ~80 lines of dialog utility functions from app.js
  - Preserves guarded global API for backward compatibility

- feat(ts): extract App Initialization to dedicated module
  - New source: src/ts/app-init.ts → emits to js/app-init.js
  - Centralized DOMContentLoaded handler, modal initialization, and subsystem bootstrap
  - Load order: app-init.js before app.js (auto-attaches to DOMContentLoaded)
  - Removed ~177 lines from app.js (DOMContentLoaded block, initModalIds function, modal ID variables)
  - **app.js reduced from 1308 lines to 1051 lines (-257 lines total this iteration)**
  - No behavior changes; all initialization logic preserved

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

- refactor(ts): migrate TerminalInstance to TypeScript
  - New source: src/ts/terminal-instance.ts → emits to js/terminal-instance.js
  - Typed virtual file system, commands, and DOM interactions; preserved InstanceManager wiring
  - Global API preserved: window.TerminalInstance, window.TerminalInstanceManager

- refactor(ts): migrate TextEditorInstance to TypeScript
  - New source: src/ts/text-editor-instance.ts → emits to js/text-editor-instance.js
  - Typed editor state, toolbar actions, find/replace, wrap mode; preserved InstanceManager wiring
  - Global API preserved: window.TextEditorInstance, window.TextEditorInstanceManager

- refactor(ts): migrate WindowManager to TypeScript
  - New source: src/ts/window-manager.ts → emits to js/window-manager.js
  - Typed window registry, z-index sync, dialog instance tracking, and program metadata
  - Preserves global WindowManager API and legacy window.topZIndex property
  
 - feat(ts): extract GitHub API to dedicated module
   - New source: src/ts/github-api.ts → emits to js/github-api.js
   - Centralized GitHub headers, caching, and fetch helpers (repos, contents, generic fetchJSON)
   - Finder now delegates GitHub calls to GitHubAPI while preserving existing UI/state behavior
   - Added script include before Finder to ensure load order

  - feat(ts): extract Program label/menu sync to dedicated module
    - New source: src/ts/program-menu-sync.ts → emits to js/program-menu-sync.js
    - Provides updateProgramLabelByTopModal and openProgramInfoFromMenu with WindowManager-aware behavior
    - Adds guarded listeners for languagePreferenceChange/themePreferenceChange to avoid duplicates
    - index.html now loads program-menu-sync.js before app.js; app.js defers to modular globals when present

  - feat(ts): extract Program actions (editor & image viewer)
    - New source: src/ts/program-actions.ts → emits to js/program-actions.js
    - Exposes sendTextEditorMenuAction, getImageViewerState, openActiveImageInNewTab, downloadActiveImage
    - Loads before menu.js to support menu definitions that query image viewer state and actions

  - feat(ts): extract Image Viewer UI utils
    - New source: src/ts/image-viewer-utils.ts → emits to js/image-viewer-utils.js
    - Exposes setImagePlaceholder and updateImageInfo; re-applies placeholder on language changes
    - index.html loads before app.js; app.js delegates to these globals when present

- refactor(app): safe cleanup pass for legacy duplication
  - Removed duplicate menubar wiring and obsolete helpers from app.js
  - Delegated program info and actions to program-menu-sync.js and program-actions.js
  - Converted global utilities (getMenuBarBottom, clampWindowToMenuBar, computeSnapMetrics, show/hideSnapPreview, updateDockIndicators) to guarded window.* assignments
  - Avoided redeclarations of appI18n/translate by guarding global initialization
  - No functional changes; E2E smoke tests pass

- feat(ts): extract Snap & Window utilities to dedicated module
  - New source: src/ts/snap-utils.ts → emits to js/snap-utils.js
  - Centralizes getMenuBarBottom, clampWindowToMenuBar, computeSnapMetrics, show/hideSnapPreview, hideSnapPreview
  - Loads before dialog.js in index.html to support window drag/snap behavior
  - Removed redundant legacy guards from app.js; behavior unchanged

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
