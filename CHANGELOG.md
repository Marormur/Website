# Changelog


## Unreleased

<<<<<<< HEAD
- fix(storage): prevent TypeError during modal restore on app init
  - Validate DOM element and WindowManager registration before calling Dialog.open()
  - Add fallback to show element directly when dialog instance is missing or throws
  - Add E2E tests to cover invalid modal IDs and transient modal handling

  ### Added
  - **feat(tabs): Drag-and-drop tab reordering** (2025-10-26)
    - Implemented drag-and-drop reordering for Finder tabs (and all multi-instance windows)
    - Added `reorderInstances()` method to InstanceManager for managing tab order
    - Tabs now display visual feedback (blue left border) during drag operations
    - Tab order is preserved in the instance manager and persists across sessions
    - Active tab remains active after reordering
    - E2E tests added to verify reordering functionality and active tab persistence
    - **Fixes**: [#15](https://github.com/Marormur/Website/issues/15) - Finder tabs drag-and-drop reordering

  ### Changed
  - **refactor(ts): migrate window-tabs to TypeScript (strict mode)** (2025-10-26)
    - Complete migration of tab system from JS to TypeScript with strict type checking
    - Source of truth is now `src/ts/window-tabs.ts` (no direct edits to generated `js/window-tabs.js`)
    - Added comprehensive type definitions in `types/window-tabs.d.ts`
    - Integrated WindowTabs and WindowTabManager into central type definitions (`types/index.d.ts`)
