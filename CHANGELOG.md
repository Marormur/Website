# Changelog

## Unreleased

### Verified - Window Menu Multi-Instance Integration ✅ (28. Oktober 2025)
  - Confirmed that `src/ts/menu.ts` already implements complete Window menu functionality:
    - Dynamic "Fenster/Window" section in menubar with instance list
    - Active instance marked with checkmark (✓)
    - "New Finder/Terminal/Editor" action (Cmd+N)
    - "Close All" action with confirmation dialog
    - Instance switching via menu (Cmd+1-9 shortcuts)
    - Auto-refresh on create/destroy via `setupInstanceManagerListeners()`
  - **Test Results**: All 8 E2E tests passing (`tests/e2e/window-menu-multi-instance.spec.js`)
  - **Status**: Priorität 1.2 (Window Menu) is complete — no additional implementation needed

### Changed - Multi-Instance Integration uses WindowTabs.create ✅
  - Refactored `src/ts/multi-instance-integration.ts` to use `WindowTabs.create(...)` directly instead of the legacy `WindowTabManager` adapter.
  - Behavior preserved and improved:
    - Active-instance visibility is now guaranteed on create/switch/restore (fixes hidden content on first open).
    - Finder auto-closes its modal when the last tab is closed.
    - Plus button titles remain contextual (Terminal N / Editor N / Finder N).
  - Removal: Legacy `window.WindowTabManager` adapter and global export removed; types cleaned; tests adjusted to assert `window.WindowTabs` API.

### Tests - Drag & Drop Tab Reordering for Terminal/Text Editor ✅
  - Added DnD reorder coverage to:
    - `tests/e2e/terminal-tabs.spec.js`
    - `tests/e2e/text-editor-tabs.spec.js`
  - Verifies instance order updates in manager and DOM order matches after dragging.

### Tests - Window Tabs for Terminal/Text Editor ✅
  - Added new E2E suites to validate tab behavior in Terminal and Text Editor modals:
    - `tests/e2e/terminal-tabs.spec.js`
    - `tests/e2e/text-editor-tabs.spec.js`
  - Covered scenarios:
    - Modal opens with initial tab and active instance
    - + button creates a new instance/tab
    - Switching tabs updates the active instance in the manager
    - Close button removes a tab (UI and manager in sync)
    - Keyboard shortcuts (Ctrl/Cmd+N, Ctrl/Cmd+W, Ctrl+Tab) operate on the active manager via integration
  - Verified locally with the full E2E suite; quick smoke continues to run unchanged

### Docs - Project TODO refreshed ✅
  - Updated `docs/project/TODO.md` to reflect completed Window Tabs System and Keyboard Shortcuts.
  - Added reference to adapter removal and new DnD tests; focused next steps on Window menu and session management.

### Fixed - Storage Restore Bug (Transient Modals) ✅
  - **Issue**: Transient modal `program-info-modal` was incorrectly restored from localStorage
  - **Root Cause**: `constants.ts` was not imported in bundle → `window.APP_CONSTANTS.TRANSIENT_MODAL_IDS` was undefined
  - **Fix**: Added `import '../constants'` to `expose-globals.ts` (bundle entry point)
  - **Impact**:
    - Bundle mode: 19/20 → **20/20 tests ✅**
    - Scripts mode: Already working (20/20 ✅)
  - **Bundle size**: 404.7 KB (was 401.8 KB, +2.9 KB for constants)

### Build - Bundle Migration Complete ✅ (Default)
  - **Status**: Bundle is now the **default** loading strategy (**20/20 E2E tests passing**)
  - **Implementation**:
    - All legacy JS modules copied to `src/ts/legacy/` for esbuild compatibility
    - Complete module graph in bundle: `constants`, `window-configs`, `finder-instance`, `launchpad`, `multi-instance-integration`, `desktop`, `system`
    - Bootstrap order fixed: `base-window-instance` imported before instance subclasses
    - Bundle size: **404.7 KB** (vs. ~305 KB for TS-only)
  - **Test Results**:
    - Bundle default: **20/20 tests ✅**
    - Scripts mode (USE_BUNDLE=0): **20/20 tests ✅**
    - Both modes validated and stable
  - **Usage**:
    ```bash
    # Default: Bundle mode
    npm run dev

    # Force scripts mode
    USE_BUNDLE=0 npm run dev
    open "http://127.0.0.1:5173/?bundle=0"

    # E2E testing
    npm run test:e2e:quick  # Bundle default
    USE_BUNDLE=0 npm run test:e2e:quick  # Scripts mode
    ```
  - **Cleanup**: Removed `fix-ts-exports` script (legacy TS output post-processor no longer needed with bundle)
    - Removed from `package.json` build pipeline
    - Moved to `scripts/archive/` for historical reference
    - TypeScript build now standalone: `npm run build:ts` (no post-processing)

### Build - Conditional Bundle Loading ✅
  - **Problem**: Bundle + individual scripts loaded simultaneously → duplicate module initialization → DOM conflicts (13/20 tests failed)
  - **Solution**: Implemented `USE_BUNDLE` flag for runtime conditional loading
  - **Components**:
    - Flag detection in `index.html` (3 sources: env injection, URL param `?bundle=1`, localStorage)
    - Conditional script loading via `document.write()` (bundle OR scripts, never both)
    - E2E test support in `tests/e2e/utils.js` (Playwright `addInitScript` for `USE_BUNDLE=1` env var)
    - VS Code tasks: "E2E: Test (Bundle Mode - Quick)", "E2E: Test (Bundle Mode - Full)"
  - **Bootstrap fix**:
    - Bundle now imports TS `src/ts/app-init.ts` via `src/ts/compat/expose-globals.ts` (correct order after globals)
    - Ensures `window.__APP_READY` is set in bundle-only mode; quick E2E green in forced bundle mode (20/20)
  - **Results**:
    - Default mode (scripts): 20/20 tests ✅ (5.3s)
    - Bundle mode (USE_BUNDLE=1): 20/20 tests ✅ (6.5s)
  - **Usage**:
    ```bash
    USE_BUNDLE=1 MOCK_GITHUB=1 npm run test:e2e:quick  # E2E tests
    open "http://127.0.0.1:5173/index.html?bundle=1"  # Manual testing
    ```
  - **Next Steps**: Set bundle as default after production verification; remove individual script loading code

### Build - Esbuild bundle (compat adapter) ✅
  - Added compat entry: `src/ts/compat/expose-globals.ts` (side-effect imports for legacy globals; exposes `DOMUtils` on `window`; sets `__BUNDLE_READY__`)
  - New build script: `scripts/build-esbuild.mjs` (IIFE, globalName `App`, outputs `js/app.bundle.js`; uses context API for `--watch`)
  - npm scripts: `build:bundle`, `dev:bundle`
  - VS Code tasks: "Bundle: Build", "Bundle: Watch", "Dev Environment: Start All (Bundle)" (aggregates CSS Watch + TS Watch + Bundle Watch + Dev Server)
  - Verification: Bundle builds successfully (285.4kb); Quick E2E tests pass (20/20, MOCK_GITHUB=1); no runtime changes yet (bundle not wired into index.html)
  - Next: Optionally wire bundle into index.html for staged rollout

### Refactored - TypeScript Code Quality Improvements

#### DOM Utils Migration (Complete)
  - **Goal**: Eliminate 20+ duplicate `classList.add/remove('hidden')` patterns across codebase
  - **Approach**: Centralized `window.DOMUtils` module with graceful fallback pattern
  - **Completed**:
    - ✅ Created `src/ts/dom-utils.ts` with show/hide/toggle helpers (null-safe, type-safe)
    - ✅ Migrated `dialog.ts` (3)
    - ✅ Migrated `menubar-utils.ts` (2)
    - ✅ Migrated `context-menu.ts` (4)
    - ✅ Migrated instance container creation: `terminal-instance.ts`, `text-editor-instance.ts` (2)
    - ✅ Migrated fallbacks: `storage.ts` (2), `image-viewer-utils.ts` (3)
    - ✅ Tests: Quick + Full E2E suites green (MOCK_GITHUB=1)
  - **Pattern**:
    ```typescript
    const domUtils = (window as any).DOMUtils;
    if (domUtils && typeof domUtils.show === 'function') {
        domUtils.show(element);
    } else {
        element.classList.remove('hidden'); // fallback
    }
    ```
  - **Benefits**:
    - Centralized DOM manipulation logic
    - Type-safe with built-in null-checks
    - Backwards-compatible (no breaking changes)
    - No `require()` issues in browser (uses window global)
    - Foundation for future animation/transition support
  - **Notes**:
    - `base-window-instance.ts` intentionally left with direct classList for now due to dual export + IIFE pattern; revisit when module pattern is unified.

### Fixed - Session restore for multi-instance windows
  - **Centralized tab refresh**: Tab setup now happens AFTER session restore for all window types (Terminal, TextEditor, Finder)
  - **Fixed empty content bug**: Windows restored from session now properly show their content and tabs
  - Removed redundant tab setup logic from individual `setup*Integration()` methods
  - Tab refresh now uses `controller.refresh()` for all integrations in a single centralized loop
  - Ensures future-proof session restore for any new tab-based windows
  - **Before**: Tab managers initialized before restore → restored instances had no tabs/content
  - **After**: All integrations refresh tabs after `SessionManager.restoreAllSessions()` completes

### Fixed - Cross-platform VS Code tasks (macOS)
  - Replaced Windows PowerShell-only task commands with a cross-platform Node helper for the dev server (`scripts/dev-server-ensure.js`).
  - Updated `.vscode/tasks.json`:
    - `Start Dev Server` and `Start Dev Server (No Watch)` now use `node scripts/dev-server-ensure.js` (works on macOS/Linux/Windows).
    - `Stop Dev Server` uses OS-specific commands (PowerShell on Windows, `lsof`+`kill` on macOS/Linux).
    - `Quick E2E to capture readiness and console errors` sets env vars via `options.env` (no inline `$env:`).
  - Outcome: TypeScript watch/check tasks and the aggregated "Dev Environment: Start All" workflow work on macOS.

### Fixed - Runtime readiness + menu + launchpad
  - app-init: Ensure `window.__APP_READY` is reliably set even if `load` is delayed; add 4s fallback timer.
  - app-init: Add capture-phase document click handler to close Launchpad on background clicks (works with pointer-events:none overlays).
  - menu: Prevent infinite recursion in `createMenuContext` by avoiding self-delegation when hoisted as a global.
  - E2E: Quick smoke suite now green (20/20) on Chromium with `MOCK_GITHUB=1`.

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
