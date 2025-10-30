# Multi-Instance System - TODO Liste

> **Status**: Multi-Instance Basis-System ist implementiert und getestet
> **Letzte Aktualisierung**: 29. Oktober 2025
> **Branch**: develop

---

## Kürzlich Abgeschlossen (Oktober 2025)

### TypeScript Migration - Phase 7: KOMPLETT!

**Alle verbleibenden JS-Files migriert** (29. Oktober 2025):

- [x] icons.ts, error-handler.ts, perf-monitor.ts, launchpad.ts (232+209+180+330 = 951 Zeilen)
- [x] settings.ts, system.ts, terminal.ts, finder.ts (461+499+469+1284 = 2,713 Zeilen)
- **Total**: 8/8 Dateien, 3,664 Zeilen TypeScript mit full strict mode

**Migration Status**: 100%
**Type Coverage**: 81.79% baseline
**E2E Tests**: 21/28 passing (Finder & Multi-Instance grün)

### DOM-Utils & Bundle Pipeline (28. Oktober 2025)

- [x] **DOM-Utils Refactoring** - src/ts/dom-utils.ts erstellt, 8 Module migriert, ~100 Zeilen reduziert
- [x] **Bundle Build** - esbuild Pipeline mit 404.7 KB Bundle, beide Modi (Bundle/Scripts) getestet
- [x] **Session Restore Fix** - Modal/Tab state persistence korrigiert

### Multi-Instance Integration (28. Oktober 2025)

- [x] **Window Tabs** - DnD Tab-Reordering für Terminal/Text Editor
- [x] **WindowTabManager** - Legacy-Adapter entfernt, direkt WindowTabs.create
- [x] **Types** - Legacy WindowTabManager aus globalen Typen entfernt

---

## TypeScript Migration - Zusammenfassung

> **Status:** ~99% abgeschlossen - Alle Phasen 0-7 komplett!

### Phase 0-1: Setup & Types

- [x] TypeScript Tooling installiert (typescript, @types/node, eslint-ts)
- [x] tsconfig.json konfiguriert (strict mode, noEmit, paths)
- [x] Type-Definitionen erstellt (types/\*.d.ts für 15+ Module)

### Phase 2: Neue Features in TS

- [x] Window Tabs System - Tab-Leiste mit Add/Close/Switch/DnD
- [x] Keyboard Shortcuts - Cmd/Ctrl+N/W/Tab/Shift+Tab/19
- [x] Build/Bundle Pipeline - TypeScript JavaScript

### Phase 3: Core Migration

- [x] Core Systems: WindowManager, ActionBus, InstanceManager, BaseWindowInstance, WindowChrome
- [x] API Layer: api.ts, theme.ts, storage.ts
- [x] Instances: terminal-instance.ts, text-editor-instance.ts

**Erfolg:** Strict Types, keine Regressionen, alle Tests grün

### Phase 4: Legacy-Refactoring

- [x] 12 Module extrahiert: github-api, menubar-utils, program-menu-sync, program-actions, image-viewer-utils, snap-utils, dialog-utils, app-init, dock-indicators
- [x] **app.js:** 1308 32 Zeilen (-97.6%)
- [x] TypeScript exports Bug behoben (scripts/fix-ts-exports.js)
- [x] ActionBus Migration: Standard-UI-Aktionen declarative
- [x] loadGithubRepos depreciert & delegiert

### Phase 5: Testing & Quality

- [x] ActionBus Migration abgeschlossen
- [x] Type-Coverage Tooling: 81.79% baseline (Ziel: 90%)
- [x] TypeScript Integration E2E Test (8 Tests, alle passing)
- [x] tsconfig Strictness: strict + noUncheckedIndexedAccess aktiviert
- [x] Ambient Types vereinheitlicht (types/index.d.ts als Single Source of Truth)
- [x] CI Enforcement (typecheck + type:coverage in GitHub Actions)
- [x] Dokumentation: TYPESCRIPT_GUIDELINES.md (700+ Zeilen)

**Status**: 8/8 Tasks abgeschlossen, Full Strict Mode (Level 6/6)

### Phase 6: Deployment & Docs

- [x] GitHub Actions: typecheck vor Build/CSS/Deploy
- [x] README, ARCHITECTURE, CONTRIBUTING auf TS aktualisiert
- [x] TYPESCRIPT_GUIDELINES.md erstellt & Migration Summary ergänzt

### Phase 7: Finale JS Migration

- [x] Alle 8 verbleibenden JS-Files nach TypeScript migriert
- [x] **Total TypeScript Codebase**: 26+ Module, 6,000+ Zeilen
- [x] Zero compilation errors, strict mode compliance

---

## Backlog: Optimierungsmöglichkeiten

### TypeScript Refactoring (Niedrige Priorität)

Nach vollständiger Migration identifizierte Verbesserungen:

4. **Base-Class Casting Duplikation**
    - **Problem:** Identisches Casting-Pattern in terminal-instance.ts und text-editor-instance.ts
    - **Empfehlung:** base-import.ts Helper (niedrige Priorität, funktioniert aktuell gut)

5. **Window-Interface Type-Guards**
    - **Problem:** Wiederholte window as unknown as { ... } Patterns
    - **Empfehlung:** Zentrale Type-Guard Utilities (niedrige Priorität)

**Geschätzter Aufwand**: 4-6 Stunden | **Potenzial**: Weitere Code-Reduktion + bessere Type-Safety

---

## Multi-Instance System - Überblick

Das Multi-Instance Window System ermöglicht mehrere Fenster des gleichen Typs gleichzeitig (z.B. 3 Terminals, 2 Text Editoren). Die Basis-Infrastruktur ist fertig und funktioniert.

### Bereits implementiert:

- BaseWindowInstance - Basis-Klasse für alle Instanzen
- InstanceManager - Verwaltung mehrerer Instanzen
- WindowChrome - Wiederverwendbare UI-Komponenten
- TerminalInstance - Multi-Instance Terminal (funktionsfähig)
- TextEditorInstance - Multi-Instance Text Editor (funktionsfähig)
- E2E Tests (21/28 passing, Finder & Multi-Instance grün)
- Vollständige Dokumentation

---

## ARCHITEKTUR-REFACTOR: Multi-Window System (30. Oktober 2025)

> **Ziel**: Mehrere unabhängige Fenster mit je mehreren Tabs + Tab-Transfer zwischen Fenstern
> **Scope**: Terminal, TextEditor, Finder
> **Strategie**: Schrittweise Migration mit Parallel-System

### Neue Architektur

**Vorher (Single-Window mit Tabs):**

```
InstanceManager (global)
  └─ Modal (1 Window)
      ├─ Tab 1 (Instance)
      ├─ Tab 2 (Instance)
      └─ Tab 3 (Instance)
```

**Nachher (Multi-Window mit Tabs):**

```
WindowManager
  ├─ Window #1 (Terminal)
  │   ├─ TabManager (window-local)
  │   ├─ Tab 1 (Terminal Session)
  │   └─ Tab 2 (Terminal Session)
  │
  ├─ Window #2 (Terminal)
  │   └─ Tab 1 (Terminal Session)
  │
  └─ Window #3 (TextEditor)
      ├─ Tab 1 (Document)
      └─ Tab 2 (Document)
```

### Kernkomponenten

1. **BaseWindow** - Fenster-Basisklasse
    - Position, Size, Z-Index
    - Titlebar, Toolbar, Statusbar (WindowChrome)
    - Window-lokaler TabManager
    - Drag & Drop Handler

2. **WindowTabManager** - Tab-Manager pro Fenster
    - Tabs innerhalb eines Windows verwalten
    - Tab-Transfer zwischen Windows
    - Tab-Reordering (bereits da)

3. **BaseTab** - Tab-Basisklasse
    - Content-Instanz (Terminal/Editor/Finder)
    - Tab-Metadata (title, icon, state)
    - Serialize/Deserialize für Session

4. **Spezifische Window-Typen**
    - `TerminalWindow extends BaseWindow`
    - `TextEditorWindow extends BaseWindow`
    - `FinderWindow extends BaseWindow`

5. **Tab-Content-Instanzen**
    - `TerminalSession extends BaseTab`
    - `TextEditorDocument extends BaseTab`
    - `FinderView extends BaseTab`

### Migration-Strategie

**Phase 1: Foundation (3-4h)** ✅ ABGESCHLOSSEN (30. Okt 2025)

- [x] BaseWindow Klasse erstellen (441 Zeilen - src/ts/base-window.ts)
- [x] WindowTabManager (pro Window) erstellen (integriert in BaseWindow)
- [x] BaseTab Basisklasse erstellen (224 Zeilen - src/ts/base-tab.ts)
- [x] WindowRegistry für Window-Verwaltung (180 Zeilen - src/ts/window-registry.ts)

**Phase 2: Terminal Migration (2-3h)** ✅ ABGESCHLOSSEN (30. Okt 2025)

- [x] TerminalWindow implementieren (130 Zeilen - src/ts/terminal-window.ts)
- [x] TerminalSession (BaseTab) extrahieren (380 Zeilen - src/ts/terminal-session.ts)
- [x] Multi-Window Terminal Tests (test-multi-window.html)
- [ ] Backwards-Compat für Session Restore (verschoben zu Phase 6)

**Phase 3: TextEditor Migration (2-3h)** ✅ ABGESCHLOSSEN (30. Okt 2025)

- [x] TextEditorWindow implementieren
- [x] TextEditorDocument (BaseTab) extrahieren
- [x] Multi-Window Editor Tests

**Phase 4: Finder Migration (3-4h)** ✅ ABGESCHLOSSEN (30. Okt 2025)

- [x] FinderWindow implementieren
- [x] FinderView (BaseTab) extrahieren (Computer-Ansicht, einfache Navigation)
- [x] GitHub-Integration pro Tab (Repos/Contents, Caching) – Grundfunktion (Repos + Contents, Caching, Breadcrumbs)

**Phase 5: Tab-Transfer (2-3h)** ✅ ABGESCHLOSSEN (30. Okt 2025)

- [x] Drag Tab aus Window → Neues Window (Drop auf Desktop erzeugt neues Window und adoptiert Tab)
- [x] Drag Tab auf anderes Window → Transfer (Drop auf fremde Tabbar adoptiert Tab)
- [x] Tab-State beim Transfer erhalten (keine Zerstörung des Tabs; detach/adopt)

**Phase 6: Session Management (2-3h)** ✅ ABGESCHLOSSEN (30. Okt 2025)

- [x] Multi-Window Session Schema (MultiWindowSession mit windows[], tabs[], metadata)
- [x] Window-Positionen speichern (Position/Size/Z-Index in WindowSessionData)
- [x] Tab-Window-Zuordnung speichern (Tabs pro Window mit serialize/deserialize)
- [x] Multi-Window Session Restore (restoreSession() mit Window-Factory und Tab-Adoption)
- [x] Legacy Session Migration (Auto-Migration von windowInstancesSession zu multi-window-session)
- [x] Integration & Auto-Save (app-init.ts Integration, debounced saves bei Window/Tab-Änderungen)

**Total geschätzt**: 14-20 Stunden

### Implementation-Reihenfolge

1. **Jetzt**: Phase 1 - Foundation (BaseWindow, WindowTabManager, BaseTab)
2. **Dann**: Phase 2 - Terminal als Proof-of-Concept
3. **Weiter**: Phasen 3-4 parallel (TextEditor + Finder)
4. **Abschluss**: Phasen 5-6 (Tab-Transfer + Session)

### Backwards Compatibility

- Feature-Flag: `MULTI_WINDOW_ENABLED` (default: true)
- Legacy Session Migration: Auto-convert single-window → multi-window
- Fallback: Bei Fehler auf Single-Window zurück

---

## Priorität 1: Core Features & Integration

### 1.1 UI Integration - Window Management ABGESCHLOSSEN!

- [x] **Window Tabs System** - Tab-Leiste, Add/Close, Switch, Reordering, Shortcuts
- [x] **Window Menü in Menubar** - Liste aller Instanzen, Wechsel, Alle schließen, Neue Instanz
- [x] **Keyboard Shortcuts** - Cmd/Ctrl+N/W/Tab/Shift+Tab/1-9

**Tatsächlicher Aufwand Phase 1.1**: ~10-12 Stunden

### 1.2 Modal/Dialog Integration (Optional)

- [ ] Dialog-System für Multi-Instance Support erweitern
- [ ] Container für Instanzen in Modals
- [ ] Tab-Leiste in Modal-Header
- [ ] Modal resize bei Tab-Wechsel

**Geschätzter Aufwand**: 4-6 Stunden

### 1.3 State Persistierung & Session Management

- [ ] **Auto-Save System** - Instanzen periodisch speichern (debounced), LocalStorage Integration
- [ ] **Restore on Load** - Instanzen beim Reload wiederherstellen, Modal/Tab/Cursor State
- [ ] **Session Export/Import** - JSON Export/Import, Session-Templates

**Geschätzter Aufwand**: 3-4 Stunden | **Dateien**: session-manager.js (neu), instance-manager.js, app.js

---

## Priorität 2: Weitere Module

### 2.1 Finder Multi-Instance

- [ ] FinderInstance erstellen (Basis-Struktur, Virtual FS, Navigation/Selection State)
- [ ] GitHub Integration (Cache-Strategie, API-Calls, Fehlerbehandlung)
- [ ] Favoriten & Recents (global vs. pro Instanz)

**Geschätzter Aufwand**: 8-10 Stunden (komplex wegen GitHub)

### 2.2 Image Viewer Multi-Instance

- [ ] ImageViewerInstance (Bild-State: zoom, rotation, navigation)
- [ ] Features: Zoom & Pan, Rotation, Lightbox, Galerie

**Geschätzter Aufwand**: 3-4 Stunden

---

## Priorität 3: Advanced Features (Optional)

### 3.1 Window Tiling & Split View

- [ ] Split View System (Horizontal/Vertical, Resizable Splitter, Drag & Drop)
- [ ] Tiling Layouts (Grid 2x2/3x3, Sidebar+Main, Custom Layouts)

**Geschätzter Aufwand**: 6-8 Stunden

### 3.2 Drag & Drop Improvements

- [ ] Inter-Instance Drag & Drop (Text, Dateien, Terminal Output)
- [ ] Tab Reordering (zwischen Windows)

**Geschätzter Aufwand**: 4-5 Stunden

### 3.3 Instance Templates & Presets

- [ ] Template System (Dev Setup = 2 Terminals + 1 Editor)
- [ ] Template Galerie, Custom Templates, Export/Import
- [ ] Quick Actions & Shortcuts

**Geschätzter Aufwand**: 4-6 Stunden

---

## Priorität 4: Testing & Quality

### 4.1 E2E Tests erweitern

- [ ] Stabilisiere verbleibende 7 failing Tests (Finder-reopen, Keyboard-Shortcuts, Window-Menu)
- [ ] UI Tests (Tab-System, Window-Menü, Shortcuts)
- [ ] Session Restore Tests

**Geschätzter Aufwand**: 4-6 Stunden

### 4.2 Performance Optimierung

- [ ] Memory Profiling & Leak-Identifikation
- [ ] Lazy Loading (Instanzen bei Bedarf, Inaktive Tabs schlafen)
- [ ] Debouncing & Throttling (Input, Resize, Auto-save)

**Geschätzter Aufwand**: 3-5 Stunden

### 4.3 Accessibility (a11y)

- [ ] Keyboard Navigation (Tab, Focus Management)
- [ ] Screen Reader Support (ARIA Labels, Live Regions)
- [ ] Visual Indicators (Focus, Active, Loading States)

**Geschätzter Aufwand**: 4-6 Stunden

---

## Priorität 5: Documentation & Polish

### 5.1 User Documentation

- [ ] User Guide (Mehrere Fenster öffnen, Wechseln, Sessions speichern)
- [ ] Keyboard Shortcuts Cheatsheet (In-App Hilfe)

**Geschätzter Aufwand**: 2-3 Stunden

### 5.2 Developer Documentation

- [ ] API Documentation (JSDoc, API Reference)
- [ ] Architecture Documentation (Diagramme, Datenfluss, Decisions)

**Geschätzter Aufwand**: 3-4 Stunden

### 5.3 Visual Polish

- [ ] Animations (Tab-Wechsel, Modal open/close, Transitions)
- [ ] Dark Mode (Alle Komponenten, Konsistenz)
- [ ] Icons (Tab, Action, Status)

**Geschätzter Aufwand**: 3-4 Stunden

---

## Empfohlene Reihenfolge

### Phase 1: UI Integration ABGESCHLOSSEN!

1.  Window Tabs System
2.  Modal Integration
3.  Window Menü
4.  Keyboard Shortcuts

**Total**: ~10-12 Stunden

### Phase 2: State & Sessions (3-5 Tage)

1. Auto-Save System
2. Session Restore
3. Export/Import

**Total**: ~6-8 Stunden

### Phase 3: Weitere Module (1-2 Wochen)

1. Image Viewer (einfach)
2. Finder (komplex)

**Total**: ~12-15 Stunden

### Phase 4: Advanced Features (Optional)

1. Split View
2. Drag & Drop
3. Templates

**Total**: ~15-20 Stunden

### Phase 5: Quality & Docs (1 Woche)

1. Tests erweitern
2. Performance
3. Documentation

**Total**: ~10-15 Stunden

---

## Nächster Schritt

**Priorität 1.3: State Persistierung & Session Management**

Auto-Save System für Instanzen:

- Alle Instanzen periodisch speichern (debounced)
- LocalStorage/SessionStorage Integration
- Restore beim Reload (Instanzen, Modal-State, Active Tab, Cursor)

**Geschätzter Aufwand**: 3-4 Stunden

---

**Erstellt**: 25. Oktober 2025
**Letzte Aktualisierung**: 30. Oktober 2025 (Multi-Window Architektur)
**Version**: 3.0 (Multi-Window Refactor Strategy)
