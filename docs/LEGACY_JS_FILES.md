# Legacy JS files touched during lint-maintenance (2025-10-27)

> **NOTE:** These files are historical or compiled outputs. Do NOT use these as the primary place for new development. Prefer `src/ts/` TypeScript sources for all new code and edits. The `js/` directory contains emitted JS (runtime output) and legacy artifacts kept for reference or compatibility only.

> **UPDATE (2025-10-28):** With the esbuild bundle pipeline now in place (`scripts/build-esbuild.mjs` → `js/app.bundle.js`), many of these individual JS files will eventually be replaced by the single IIFE bundle. The bundle uses a compatibility adapter (`src/ts/compat/expose-globals.ts`) to expose modules on `window.*` for legacy consumers. See CHANGELOG.md section "Build - Esbuild bundle (compat adapter) ✅" for details.

The following files were edited as part of a targeted lint-maintenance pass. Many of these are legacy JavaScript sources. If a TypeScript source exists under `src/ts/`, prefer editing that file and rebuilding the project instead of changing emitted JS.

Files edited:

- js/desktop.js — desktop selection & icons
- js/context-menu.js — custom context menu
- js/base-window-instance.js — base class for multi-instance windows
- js/dialog.js — dialog utilities
- js/dock.js — dock magnification & drag/drop
- js/github-api.js — GitHub API helpers
- js/menu.js — menubar and menu wiring
- js/multi-instance-demo.js — demo helpers
- js/system.js — system UI helpers

Why these edits were made

- Small lint-driven fixes (remove unused catch params, strict equality, unused vars) were applied to reduce ESLint noise and make CI/lint output clearer.
- These changes aim to be low-risk and behavior-preserving. However, if these files are generated from TypeScript sources, these edits should be ported to the corresponding `.ts` files to avoid being overwritten by future builds.

Next steps

1. Detect generated JS files and map them to TS sources.
2. If TS source exists for any of the files above, port changes to TS and run `npm run build:ts`.
3. If not, keep the JS edits and schedule those files for eventual TypeScript migration.
