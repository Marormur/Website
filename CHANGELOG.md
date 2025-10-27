# Changelog


## Unreleased

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

For full details and per-change descriptions see the open PRs (e.g. #22, #23, #26) which contain the complete diffs and test additions.

