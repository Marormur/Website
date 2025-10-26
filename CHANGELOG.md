# Changelog


## Unreleased

Summary of notable changes in progress & recent work:

- Tests & stability
  - Added comprehensive E2E tests for window tab keyboard shortcuts (`tests/e2e/keyboard-shortcuts.spec.js`) covering Ctrl/Cmd+1-9, Ctrl/Cmd+W, Ctrl/Cmd+N, Ctrl+Tab, and Ctrl+Shift+Tab.
  - Testing stabilization groundwork: `docs/TESTING.md`, optional GitHub API mocks (`MOCK_GITHUB=1`), and a quick smoke runner (`test:e2e:quick`).

- Tabs & multi-instance
  - Drag-and-drop tab reordering implemented; `InstanceManager.reorderInstances()` preserves tab order and UI state.
  - `src/ts/window-tabs.ts` migrated to TypeScript (strict mode) with fixes for content visibility and ghost-tab prevention.

<<<<<<< HEAD
- Storage & robustness
  - Fixed modal restore: validate DOM elements and WindowManager registration before restoring open modals to avoid TypeError on startup.

- Developer experience
  - Workflow improvements: TypeScript watch, consolidated dev tasks, pre-push quick smoke checks, and `.gitattributes` for cross-platform EOL.
=======

### Changed
  - Complete migration of tab system from JS to TypeScript with strict type checking
  - Source of truth is now `src/ts/window-tabs.ts` (no direct edits to generated `js/window-tabs.js`)
  - **Fixed**: Content visibility after tab close - explicitly triggers `onTabSwitch` for newly active instance
  - **Fixed**: Ghost tab prevention - UI refresh and content visibility stay in sync after `destroyInstance`
  - All keyboard shortcuts (Ctrl/Cmd+W, Ctrl/Cmd+N, Ctrl/Cmd+Tab) continue to work with integration
  - Maintains full backward compatibility with MultiInstanceIntegration system
>>>>>>> ec55494 (fix(finder): show content after close-all reopen; fix(tabs): refresh + onTabSwitch after close; chore(instance): remove DOM container on destroy; feat(window-manager): openHandler hook; test(e2e): add reopen-after-close-all)

For full details and per-change descriptions see the open PRs (e.g. #22, #23, #26) which contain the complete diffs and test additions.

<<<<<<< HEAD
=======
- **feat(devex): Phase 0.2 Development Workflow improvements** (2025-01-26)
  - Added TypeScript watch mode: `npm run typecheck:watch`
  - VS Code task: "TypeScript: Watch" integrated into dev environment
  - "Dev Environment: Start All" now runs CSS + TypeScript + Server in parallel
  - Created `.vscode/extensions.json` with 11 recommended extensions
  - Added pre-push Git hook running E2E basic smoke tests
  - Updated `.gitignore` to track VS Code workspace files (extensions.json)
  - **Results**: One-click dev environment, automated quality checks, faster feedback

  - Stabilized entire development workflow with systematic fixes
  - All critical terminal errors resolved (E2E tests, validate task, dev server)
  - Development environment now production-ready for feature work
  - **Results**: TypeScript 0 errors, E2E 92/93 passing, ESLint 30 warnings (from 54)

### Fixed
- fix(tabs): remove ghost tabs by refreshing UI after instance destruction
  - After closing a tab, immediately re-render the tab bar to reflect the updated instance list
  - Prevents lingering (ghost) tabs and subsequent "instance not found" warnings in Finder and Terminal
  - Verified via Playwright E2E: Finder tab close, last-tab close hides modal, active tab reassignment
- fix(tabs): ensure content visibility after closing the active tab
  - After tab close, select a deterministic next active tab, trigger integration onTabSwitch, and explicitly show/hide instances as a safety net
  - Eliminates intermittent cases where the new active instance remained hidden (e.g., Finder 3 → Finder 1)

- fix(tabs): keep tab bar and content in sync on keyboard tab switching (Ctrl+Tab/Shift+Ctrl+Tab/1-9)
  - Switch now updates the visible instance content and refreshes the tab UI
  - Applies to Terminal, Text Editor, and Finder integrations
  - Also wraps external active-instance changes to re-render the tab bar

- build(tsconfig): enable strict in tsconfig.tsbuild.json to align with base config and tooling expectations

- **fix(typescript): resolve all 33 strict mode compilation errors** (2025-01-25)
  - Fixed action-bus.ts: typeof check for WindowManager.close instead of conditional access
  - Fixed dialog-utils.ts: removed duplicate Window interface, use central types/index.d.ts
  - Fixed instance-manager.ts: handle undefined from array access with noUncheckedIndexedAccess
  - Fixed storage.ts: added null guard for positions dictionary access
  - Fixed terminal-instance.ts: extensive null/undefined checks for:
    - commandHistory array access (history navigation)
    - command parsing from array destructuring
    - findCommonPrefix string handling
    - fileSystem dictionary access (file operations)
    - tab completion logic
  - All errors caused by TypeScript strict mode Level 6 (noUncheckedIndexedAccess: true)
  - Validates cleanly with `npm run build:ts` and `npm run validate`
  - **Phase 0.1 Progress**: TypeScript compilation ✅ (33/33 errors fixed)

### Changed
- **test(playwright): tune local defaults for reliability** (2025-10-26)
  - Local workers fixed at 2 (CI remains at 1) to prevent oversubscription
  - Local retries set to 1 (CI keeps 2)
  - Increased `expect`, `actionTimeout`, and `navigationTimeout` slightly for stability
  - Keeps Chromium-only locally; CI runs all browsers

- **perf(tests): optimize E2E test execution speed by 70%** (2025-10-25)
  - Local tests now run only on Chromium instead of all 3 browsers (Chromium/Firefox/WebKit)
  - CI still tests all browsers for full coverage via `CI=1` environment variable
  - Added `test:e2e:quick` script for rapid smoke testing (~5s for 15 basic tests)
  - Added `test:e2e:chromium` for explicit Chromium-only runs
  - Added `test:e2e:all-browsers` to force all-browser testing locally
  - Changed reporter to `line` format locally for cleaner output (CI uses `list`)
  - **Performance improvement**: 85 tests complete in ~13s locally (down from ~39s)
  - **Quick mode**: 15 basic tests in ~5s (down from ~15s)

### Fixed
- **fix(app-init): add window.__APP_READY signal for E2E test stability** (2025-10-25)
  - Added `window.__APP_READY = true` at the end of `initApp()` in `src/ts/app-init.ts`
  - Tests were timing out waiting for this signal which was never set
  - Ensures reliable test initialization across all test suites

- test(e2e): stabilize multi-instance suite using appReady
  - Updated tests to wait for window.__APP_READY instead of networkidle
  - Fixed "respects max instances limit" by using a minimal TestInstance subclass
  - Full multi-instance suite now passes across Chromium, Firefox, and WebKit (60/60)

- test(e2e): standardize readiness across specs with appReady
  - Replaced initial waits in Finder/Window Tabs, Launchpad, Terminal, Menubar, Visual Check
  - Migrated basic suites to use waitForAppReady in beforeEach
  - Documented the pattern in docs/QUICKSTART.md

- chore(eol): enforce cross-platform line endings and normalize repository
  - Add .gitattributes with text=auto to use CRLF on Windows checkouts and LF on UNIX
  - Add workspace settings to use OS-default EOL in VS Code (files.eol = auto)
  - Stop forcing LF globally in .editorconfig; keep LF only for shell scripts
  - Ran git renormalize to update existing files' line endings

- refactor(desktop): use ActionBus for double-click open on desktop icons
  - Adds data-action-dblclick="openDesktopItem" to desktop icon buttons
  - Keeps single-tap open for touch/pen locally; selection logic unchanged

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
 
>>>>>>> ec55494 (fix(finder): show content after close-all reopen; fix(tabs): refresh + onTabSwitch after close; chore(instance): remove DOM container on destroy; feat(window-manager): openHandler hook; test(e2e): add reopen-after-close-all)
