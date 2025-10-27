# Changelog

## Unreleased

### Fixed - TypeScript Migration Stabilization (Phase 1 Complete ✅)
  - **E2E Tests**: All 20 quick E2E tests passing; browser-global TS migration stable
  - **CommonJS Artifacts**: Removed `exports.__esModule` and `exports.default` from compiled JS to prevent runtime errors
  - **APP_CONSTANTS**: Exposed as browser global via IIFE pattern; consumed by WindowManager, app-init, StorageSystem
  - **Launchpad UI**: Fixed pointer-events to allow dock/menubar clicks while open; capture-phase handler closes on outside click
  - **Build Automation**: Generalized `scripts/fix-ts-exports.js` to process all `./js/**/*.js` and prevent regressions
  - **Test Updates**: Adjusted launchpad background-click test to use `page.mouse.click()` for pointer-events compatibility

Summary of notable changes in progress & recent work:

- Tests & stability
  - Added comprehensive E2E tests for window tab keyboard shortcuts (`tests/e2e/keyboard-shortcuts.spec.js`) covering Ctrl/Cmd+1-9, Ctrl/Cmd+W, Ctrl/Cmd+N, Ctrl+Tab, and Ctrl+Shift+Tab.
  - Testing stabilization groundwork: `docs/TESTING.md`, optional GitHub API mocks (`MOCK_GITHUB=1`), and a quick smoke runner (`test:e2e:quick`).

- Tabs & multi-instance
  - Drag-and-drop tab reordering implemented; `InstanceManager.reorderInstances()` preserves tab order and UI state.
  - `src/ts/window-tabs.ts` migrated to TypeScript (strict mode) with fixes for content visibility and ghost-tab prevention.

- Storage & robustness
  - Fixed modal restore: validate DOM elements and WindowManager registration before restoring open modals to avoid TypeError on startup.

- Developer experience
  - Workflow improvements: TypeScript watch, consolidated dev tasks, pre-push quick smoke checks, and `.gitattributes` for cross-platform EOL.

### Changed
  - Complete migration of tab system from JS to TypeScript with strict type checking
  - Source of truth is now `src/ts/window-tabs.ts` (no direct edits to generated `js/window-tabs.js`)
  - **Fixed**: Content visibility after tab close - explicitly triggers `onTabSwitch` for newly active instance
  - **Fixed**: Ghost tab prevention - UI refresh and content visibility stay in sync after `destroyInstance`
  - All keyboard shortcuts (Ctrl/Cmd+W, Ctrl/Cmd+N, Ctrl+Tab) continue to work with integration
  - Maintains full backward compatibility with MultiInstanceIntegration system

---

  - refactor(system,actions): route System UI buttons via ActionBus
    - Adds ActionBus handlers for system toggles/actions/devices/network
    - Replaces manual click listeners with declarative data-action wiring

  - feat(action-bus,window-chrome): window control actions and wiring
    - Adds ActionBus actions: window:close, window:minimize, window:maximize
    - WindowChrome control buttons now include matching data-action attributes
    - Keeps existing callbacks for non-breaking behavior

  - feat(app-init): app-ready signal for tests and probes
    - Sets window.__APP_READY=true and dispatches 'appReady' CustomEvent at end of initApp()
    - Enables tests to wait for readiness instead of relying on networkidle

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

  - feat: extract Program label/menu sync to dedicated module
    - New source: src/ts/program-menu-sync.ts → emits to js/program-menu-sync.js
    - Provides updateProgramLabelByTopModal and openProgramInfoFromMenu with WindowManager-aware behavior
    - Adds guarded listeners for languagePreferenceChange/themePreferenceChange to avoid duplicates
    - index.html now loads program-menu-sync.js before app.js; app.js defers to modular globals when present

  - feat: extract Program actions (editor & image viewer)
    - New source: src/ts/program-actions.ts → emits to js/program-actions.js
    - Exposes sendTextEditorMenuAction, getImageViewerState, openActiveImageInNewTab, downloadActiveImage
    - Loads before menu.js to support menu definitions that query image viewer state and actions

  - feat: extract Image Viewer UI utils
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

  - ### Changed
    - Reorganized documentation structure:
    - `docs/guides/` - User guides and quickstarts
    - `docs/migration/` - Migration guides
    - Finder keyboard shortcuts integrated with tab manager (Cmd/Ctrl+W routes to tab close + instance cleanup)

  - NEXT_STEPS.md (consolidated into TODO.md)
  - PR_README.md (outdated)

  - ### Fixed
    - ActionBus for declarative event handling
    - WindowChrome for reusable UI components
    - GitHub Actions CI/CD pipeline

  - Refactored from monolithic app.js to modular architecture
    - Improved documentation structure

  - ### Security
    - Initial security audit completed
