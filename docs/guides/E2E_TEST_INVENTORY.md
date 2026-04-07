# E2E Test Inventory und Priorisierung

Stand: 2026-04-07

Aktueller Stand nach Reduktion:

- Gesamt: 62 E2E-Dateien / 253 E2E-Tests
- Deep/Technik: 29 Tests
- Quarantaene: 7 Tests in 3 Dateien

## Ziel

Diese Datei schafft Transparenz ueber alle E2E-Specs und priorisiert sie fuer den Alltag, damit Feature-Entwicklung nicht von dauernden Testfixes ausgebremst wird.

Angestrebte Groesse fuer dieses Projekt:

- Core: ca. 60 bis 90 stabile, user-nahe E2E-Tests
- Stateful: nur gezielt fuer betroffene Bereiche
- Deep/Technik: klein halten, idealerweise deutlich unter 30 Tests insgesamt

## Prioritaetsmodell

- P0 (immer): Muss fuer jeden schnellen Check laufen.
- P1 (regelmaessig): Soll lokal/PR oft laufen, aber nicht zwingend bei jedem Mini-Change.
- P2 (optional): Nur bei groesseren Refactors oder gezielt fuer den betroffenen Bereich.
- P3 (deep/selten): Technische Tiefentests fuer Nightly, manuell oder bei explizitem Anlass.

## P0 - Smoke

- tests/e2e/smoke/dev-minimum.spec.js

## P1 - User Facing Core

- tests/e2e/desktop/desktop-icons.spec.js
- tests/e2e/desktop/desktop-shortcut.spec.js
- tests/e2e/desktop/dock-dnd-selection.spec.js
- tests/e2e/desktop/dock-reorder.spec.js
- tests/e2e/desktop/launchpad-basic.spec.js
- tests/e2e/ui/i18n-apple-menu-labels.spec.js
- tests/e2e/ui/i18n-settings-system-toggle.spec.js
- tests/e2e/ui/i18n-system-language.spec.js
- tests/e2e/ui/keyboard-shortcuts.spec.js
- tests/e2e/ui/menubar.spec.js
- tests/e2e/ui/modals-structure.spec.js
- tests/e2e/ui/ui-mode-auto-mobile.spec.js
- tests/e2e/windows/multi-instance.spec.js
- tests/e2e/windows/window-focus-restore.spec.js
- tests/e2e/windows/window-menu-multi-instance.spec.js
- tests/e2e/windows/window-snapping.spec.js
- tests/e2e/windows/window-tabs.spec.js
- tests/e2e/text-editor/text-editor-session-restore.spec.js
- tests/e2e/text-editor/text-editor-tabs.spec.js
- tests/e2e/photos/photos-app.spec.js
- tests/e2e/preview/preview-app.spec.js

## P2 - Stateful/Komplex (gezielt laufen lassen)

- tests/e2e/finder/finder-focus.spec.js
- tests/e2e/finder/finder-github.spec.js
- tests/e2e/finder/finder-mobile-sidebar-menu.spec.js
- tests/e2e/finder/finder-multi-instance-basic.spec.js
- tests/e2e/finder/finder-new-features.spec.js
- tests/e2e/finder/finder-reopen-after-close-all.spec.js
- tests/e2e/finder/finder-selection.spec.js
- tests/e2e/finder/finder-session-restore.spec.js
- tests/e2e/finder/finder-sidebar-collapse.spec.js
- tests/e2e/finder/finder-tab-titles.spec.js
- tests/e2e/finder/finder-tabs-ghost-fix.spec.js
- tests/e2e/finder/finder-tabs.spec.js
- tests/e2e/finder/finder-vdom-tabs.spec.js
- tests/e2e/finder/finder-vfs-live-sync.spec.js
- tests/e2e/finder/finder-view-dblclick.spec.js
- tests/e2e/finder/finder-visibility-layout.spec.js
- tests/e2e/session/obsolete-modal-filter.spec.js
- tests/e2e/session/session-export-import.spec.js
- tests/e2e/session/session-restore-full.spec.js
- tests/e2e/session/session-restore-performance.spec.js
- tests/e2e/session/storage-restore.spec.js
- tests/e2e/terminal/terminal-autocomplete.spec.js
- tests/e2e/terminal/terminal-session-persistence.spec.js
- tests/e2e/terminal/terminal-session-tabs.spec.js
- tests/e2e/terminal/terminal-unix-basics.spec.js
- tests/e2e/terminal/terminal-vdom-focus.spec.js
- tests/e2e/terminal/terminal-vfs-integration.spec.js
- tests/e2e/terminal/terminal-window-multi-window.spec.js

## P3 - Deep Technical (optional, Nightly/manuell)

- tests/e2e/framework/accessibility.spec.js
- tests/e2e/framework/bundle-analyzer.spec.js
- tests/e2e/framework/performance-monitor.spec.js
- tests/e2e/framework/toast.spec.js
- tests/e2e/integration/error-handler.spec.js
- tests/e2e/integration/perf-monitor.spec.js
- tests/e2e/integration/vdom.spec.js
- tests/e2e/integration/virtualfs-delta-cleanup.spec.js
- tests/e2e/integration/virtualfs-delta-save.spec.js
- tests/e2e/integration/virtualfs-performance.spec.js

## Quarantaene (gezielt, nicht im Standardlauf)

- tests/e2e/finder/finder-selection.spec.js
- tests/e2e/finder/finder-github.spec.js
- tests/e2e/session/session-restore-full.spec.js

## Empfohlene Commands

- Schneller Alltag: `npm run test:e2e:core`
- Stateful stabil: `npm run test:e2e:stateful:stable`
- Quarantaene gezielt: `npm run test:e2e:quarantine`
- Tiefe Technik: `npm run test:e2e:deep`

## Hilfsdateien (keine Specs)

- tests/e2e/utils.js
- tests/e2e/utils/window-helpers.js

## Sofortmassnahmen fuer weniger Testfix-Aufwand

- Standard-Checks fokussieren auf P0/P1.
- P2 nur zielgerichtet bei betroffenen Features.
- P3 nur Nightly/manuell oder bei explizitem Bedarf.
- test.skip-Faelle regelmaessig abbauen oder in Quarantaene markieren, statt sie implizit mitzuschleppen.
- Low-value-Framework-E2E (reines Rendern, Existenz von Globals, interne Alias-Checks) bevorzugt loeschen statt pflegen.
- VDOM-, Perf- und Error-Handler-Engine-Checks nur in kleinem Kern behalten; alles andere eher in Unit-Tests oder ganz streichen.
- Performance-basierte E2E nur behalten, wenn sie wiederholt echte Nutzer-Regressionsfaelle abfangen.
