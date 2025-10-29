# Legacy JS files touched during lint-maintenance (2025-10-27)

> **NOTE:** Diese Dateien sind historisch oder kompilierte Ausgaben. Verwende diese NICHT als primären Ort für neue Entwicklung. Bevorzuge `src/ts/` TypeScript-Quellen für allen neuen Code und Änderungen. Das `js/`-Verzeichnis enthält generiertes JS (Runtime-Ausgabe) und Legacy-Artefakte, die nur für Referenz oder Kompatibilität beibehalten werden.

> **UPDATE (2025-10-29):** Die TypeScript-Migration ist **vollständig abgeschlossen** (Phase 7: 100%). Alle Kern-Module (finder, terminal, system, settings, launchpad, icons, error-handler, perf-monitor) wurden erfolgreich zu TypeScript migriert. Insgesamt 26+ TypeScript-Module mit 6,000+ Zeilen Code in `src/ts/`. Der esbuild-Bundle-Pipeline (`scripts/build-esbuild.mjs` → `js/app.bundle.js`) ersetzt viele dieser einzelnen JS-Dateien. Das Bundle nutzt einen Kompatibilitäts-Adapter (`src/ts/compat/expose-globals.ts`), um Module auf `window.*` für Legacy-Consumer bereitzustellen. Siehe CHANGELOG.md Abschnitt "Build - Esbuild bundle (compat adapter) ✅" für Details.

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
