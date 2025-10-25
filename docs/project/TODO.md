# 📋 Multi-Instance System - TODO Liste

> **Status**: Multi-Instance Basis-System ist implementiert und getestet ✅  
> **Letzte Aktualisierung**: 25. Oktober 2025  
> **Branch**: develop

---

## 🎯 Überblick

Das Multi-Instance Window System ermöglicht mehrere Fenster des gleichen Typs gleichzeitig (z.B. 3 Terminals, 2 Text Editoren). Die Basis-Infrastruktur ist fertig und funktioniert.

### ✅ Bereits implementiert:

- `BaseWindowInstance` - Basis-Klasse für alle Instanzen
- `InstanceManager` - Verwaltung mehrerer Instanzen
- `WindowChrome` - Wiederverwendbare UI-Komponenten
- `TerminalInstance` - Multi-Instance Terminal (funktionsfähig)
- `TextEditorInstance` - Multi-Instance Text Editor (funktionsfähig)
- E2E Tests (3/3 passed)
- Vollständige Dokumentation

---

## 🧩 Paralleler Track: TypeScript Migration (integriert)

> Ziel: Inkrementelle Migration zu TypeScript ohne Breaking Changes. Dieser Abschnitt fasst den separaten Migrationsplan zusammen und macht ihn hier im Projekt-TODO direkt bearbeitbar. Details siehe `docs/migration/TYPESCRIPT.md`.

### 🗺️ Roadmap (Kurzfassung)

- Phase 0: Setup (TypeScript-Tooling ohne Code-Änderungen)
- Phase 1: Type-Definitionen (.d.ts) für bestehende Module
- Phase 2: Neue Features in TS entwickeln (Tabs, Shortcuts)
- Phase 3: Kritische Module migrieren (Core-Systeme)
- Phase 4: Legacy-Refactoring (`app.js` → modular/TS)
- Phase 5: Testing & Quality (Type-Coverage, E2E)
- Phase 6: Deployment & Doku

### ✅ Verknüpfung mit Prio-1 (UI Integration)

- Window Tabs System und Keyboard Shortcuts werden direkt in TypeScript umgesetzt (Phase 2) und binden sich an die Multi-Instance-Basis an.

### 📌 Checklisten pro Phase

#### Phase 0 – Setup (ohne Code-Änderungen)

- [x] TypeScript-Dependencies installieren (dev): `typescript`, `@types/node`
- [x] ESLint-TS: `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`
- [x] `tsconfig.json` prüfen/ergänzen (noEmit für Typecheck, JS/TS gemischt erlauben)
- [x] NPM Scripts: `typecheck` hinzufügen, `validate` um `typecheck` erweitern
- [x] VS Code Settings: Workspace-TS aktivieren (`.vscode/settings.json`)
- [x] CI: Typecheck-Job in GitHub Actions (Pages-Deploy Workflow)

Erfolgskriterien: `npm run typecheck` grün, keine Build-/Test-Regressionen

#### Phase 1 – Type-Definitionen (.d.ts)

- [x] Verzeichnis `types/` anlegen
- [x] `types/window-manager.d.ts`
- [x] `types/action-bus.d.ts`
- [x] `types/instance-manager.d.ts`
- [x] `types/base-window-instance.d.ts`
- [x] `types/window-chrome.d.ts`
- [x] `types/api.d.ts`
- [x] `types/theme.d.ts`, `types/i18n.d.ts`, `types/storage.d.ts`
- [x] `types/dialog.d.ts`, `types/finder.d.ts`, `types/terminal.d.ts`, `types/text-editor.d.ts`

Erfolgskriterien: VS Code Autocomplete korrekt, Typecheck max. Warnings

#### Phase 2 – Neue Features in TS

- [x] `src/ts/window-tabs.ts` (Tab-Leiste, Add/Close, Active-State, Switch, später DnD)
- [x] `src/ts/keyboard-shortcuts.ts` (Cmd/Ctrl+N/W/Tab/Shift+Tab/1–9; Kontext „global“ und app-spezifisch)
- [x] Build/Bundle sicherstellen (TS → JS, weiterhin Vanilla-Flow)

Hinweis: Diese Tasks erfüllen direkt „Priorität 1: Core Features & Integration“ unten.

#### Phase 3 – Kritische Module migrieren

- [x] `base-window-instance.js` → `src/ts/base-window-instance.ts` (emit: `js/base-window-instance.js`)
- [x] `instance-manager.js` → `src/ts/instance-manager.ts` (emit: `js/instance-manager.js`)
- [x] `window-manager.js` → `src/ts/window-manager.ts` (emit: `js/window-manager.js`)
- [x] `action-bus.js` → `src/ts/action-bus.ts` (emit: `js/action-bus.js`)
- [x] `window-chrome.js` → `src/ts/window-chrome.ts` (emit: `js/window-chrome.js`)
- [x] `api.js` → `src/ts/api.ts` (emit: `js/api.js`)
- [x] `theme.js` → `src/ts/theme.ts` (emit: `js/theme.js`)
- [x] `storage.js` → `src/ts/storage.ts` (emit: `js/storage.js`)
- [x] `terminal-instance.js` → `src/ts/terminal-instance.ts` (emit: `js/terminal-instance.js`)
- [x] `text-editor-instance.js` → `src/ts/text-editor-instance.ts` (emit: `js/text-editor-instance.js`)

Erfolgskriterien: Strict(er) Types, keine Runtime-Regressions, Tests grün

#### Phase 4 – Legacy-Refactoring

- [x] GitHub-API extrahieren (`src/ts/github-api.ts` → emit: `js/github-api.js`) und in `finder.js`/Legacy verwenden
- [x] Menubar-Helfer modularisieren (`src/ts/menubar-utils.ts` → emit: `js/menubar-utils.js`) und vor `menu.js` laden
- [x] Program-Label & Menü-Sync extrahieren (`src/ts/program-menu-sync.ts` → emit: `js/program-menu-sync.js`) und vor `app.js` laden; `app.js` delegiert an modulare Globals
- [x] Program Actions (Texteditor/Image Viewer) extrahieren (`src/ts/program-actions.ts` → emit: `js/program-actions.js`), vor `menu.js` laden
- [x] Image Viewer UI Utils extrahieren (`src/ts/image-viewer-utils.ts` → emit: `js/image-viewer-utils.js`), vor `app.js` laden
- [x] Safe Cleanup in `app.js`: Legacy-Duplikate entfernt, Delegation an Module, globale Helfer als guarded `window.*`
- [x] Snap & Window Utils extrahieren (`src/ts/snap-utils.ts` → emit: `js/snap-utils.js`), vor `dialog.js` laden; `app.js` legacy guards entfernt
- [x] Dialog Utilities extrahieren (`src/ts/dialog-utils.ts` → emit: `js/dialog-utils.js`), vor `dialog.js` laden; `syncTopZIndexWithDOM`, `bringDialogToFront`, `bringAllWindowsToFront` aus `app.js` entfernt
- [x] App Initialization extrahieren (`src/ts/app-init.ts` → emit: `js/app-init.js`), vor `app.js` laden; DOMContentLoaded Block & initModalIds aus `app.js` entfernt; **app.js reduziert von 1308 auf 1051 Zeilen (-257 Zeilen)**
- [x] Dock Indicators extrahiert zu `dock.js`; `updateDockIndicators` aus `app.js` entfernt; **app.js reduziert von 1051 auf 1024 Zeilen (-27 Zeilen)**
- [x] **CRITICAL BUG FIX**: TypeScript `exports` Problem behoben - `scripts/fix-ts-exports.js` erstellt, Build-Automation implementiert; Terminal-Modal zu MODAL_IDS hinzugefügt (war fehlend); 201 E2E-Tests jetzt passing ✅
- [x] loadGithubRepos Legacy-Funktion behandelt (Deprecate & Delegate)
    - Init-Aufruf in `js/app-init.js` entfernt
    - `js/menu.js` „Reload“ nutzt jetzt `FinderSystem.navigateTo([], 'github')` mit guarded Fallback
    - Legacy-Block aus `app.js` entfernt; schlanker delegierender Stub erhalten
    - `app.js` jetzt minimaler Wrapper (50 Zeilen)
- [x] Globale Event-Listener auf ActionBus migrieren
    - 100+ addEventListener Calls analysiert
    - Standard-UI-Aktionen bereits migriert (close/open/minimize/maximize)
    - Verbleibende Listener sind System-Events & spezialisierte Interaktionen (beabsichtigt)

#### Phase 5 – Testing & Quality ✅ **ABGESCHLOSSEN!**

- [x] **ActionBus Migration** - Alle Standard-UI-Aktionen auf declarative pattern umgestellt
- [x] **Type-Coverage Tooling** - Package installiert, Baseline 76.53% (Ziel: 90%)
- [x] **TypeScript Integration E2E Test** - `tests/e2e/typescript-integration.spec.js` mit 8 Tests ✅
- [x] **tsconfig Strictness** - `strict: true` + `noUncheckedIndexedAccess: true` aktiviert, alle Checks passing ✅
- [x] **Ambient Types Vereinheitlichung** - `types/index.d.ts` als Single Source of Truth, 13 Duplikate entfernt ✅
- [x] **CI Enforcement** - `typecheck` + `type:coverage` in GitHub Actions (ci.yml, deploy.yml) ✅
- [x] **Dokumentation aktualisieren** - TYPESCRIPT_STATUS.md, TYPESCRIPT.md, TODO.md vollständig synchronisiert
- [x] **TypeScript Guidelines erstellen** - `docs/TYPESCRIPT_GUIDELINES.md` (700+ Zeilen) mit Verlinkung

**Status**: 8/8 Tasks abgeschlossen, Phase 5 vollständig! 🎉

**Achievements:**

- ✅ Strict Mode Level 6/6 (Paranoid Mode)
- ✅ Type Coverage Baseline: 76.53%
- ✅ 8 TypeScript Integration E2E Tests (alle passing)
- ✅ Zentrale Ambient Types ohne Duplikate
- ✅ CI/CD mit automatischen Type-Checks
- ✅ Comprehensive Developer Guidelines

#### Phase 6 – Deployment & Doku ✅ **ABGESCHLOSSEN!**

- [x] GitHub Actions: Typecheck Schritt vor Build/CSS/Deploy (bereits in ci.yml & deploy.yml)
- [x] README, ARCHITECTURE, CONTRIBUTING auf TS aktualisieren (TypeScript Sections hinzugefügt)
- [x] `docs/TYPESCRIPT_GUIDELINES.md` erstellt & Migration Summary in TYPESCRIPT.md ergänzt

**Status**: TypeScript Migration ist **produktionsreif** und vollständig abgeschlossen! ✅

---

## 📝 TODO - Nächste Schritte

> **⚠️ WICHTIG:** Bevor wir mit neuen Features beginnen, müssen wir die Entwicklungsumgebung stabilisieren!  
> Mehrere Terminals zeigen Fehler - diese müssen zuerst behoben werden.

---

## 🔧 Priorität 0: Development Environment Optimization (JETZT!)

**Ziel**: Stabile Entwicklungsbasis schaffen, bevor neue Features entwickelt werden

### 0.1 Stabilität herstellen ✅ **ABGESCHLOSSEN!**

**Ursprüngliche Probleme:**

- ~~❌ E2E Basic Smoke Tests failing (Exit Code 1)~~ → ✅ **Tests laufen (15/15 passing)** - Problem war VS Code glob pattern
- ~~❌ Validate Task failing (Exit Code 1)~~ → ✅ **Validate passing** - 33 TypeScript strict mode errors behoben
- ~~❌ Dev Server crashed (Exit Code 1)~~ → ✅ **Server läuft korrekt** - Port 5173 bereits in Verwendung (kein Crash)

**Abgeschlossene Tasks:**

- [x] **TypeScript Kompilierung behoben** ✅
    - [x] 33 strict mode errors systematisch gefixt (noUncheckedIndexedAccess)
    - [x] action-bus.ts: typeof check für WindowManager.close
    - [x] dialog-utils.ts: Duplizierte Window interface entfernt, zentrale types/index.d.ts verwendet
    - [x] instance-manager.ts: Array-Zugriff undefined handling
    - [x] storage.ts: Dictionary-Zugriff mit null guard
    - [x] terminal-instance.ts: 15 Fehler - commandHistory, findCommonPrefix, fileSystem access
    - [x] `npm run build:ts` kompiliert jetzt erfolgreich
    - [x] `npm run validate` läuft durch (typecheck + build + lint + css + e2e)

- [x] **ESLint Warnings reduziert** ✅
    - [x] Auto-fix mit `npm run lint -- --fix` ausgeführt
    - [x] 24 Style-Warnings behoben (hauptsächlich quote style)
    - [x] Von 54 auf 30 Warnings reduziert (45% Reduktion)
    - [x] Verbleibende 30 Warnings sind legitime Code-Issues (unused vars, no-redeclare)

- [x] **Terminal-Probleme geklärt** ✅
    - [x] E2E tests: Glob pattern `tests/e2e/*basic.spec.js` funktioniert nicht in PowerShell
        - Tests selbst sind grün (15/15 passing in 6.3s)
        - VS Code Task braucht explizite Dateipfade
    - [x] Validate task: TypeScript strict errors waren die Ursache → behoben
    - [x] Dev server: Kein Crash - Port 5173 bereits belegt durch laufende Instanz
        - Server antwortet korrekt auf HTTP-Requests
        - EADDRINUSE ist erwartetes Verhalten bei zweitem Start-Versuch

**Ergebnisse:**

- ✅ TypeScript kompiliert fehlerfrei (0 errors)
- ✅ E2E Tests: 92/93 passing (nur 1 existierendes finder-tabs Problem)
- ✅ ESLint: 30 Warnings (von ursprünglich 54)
- ✅ Dev Server: Läuft stabil auf Port 5173
- ✅ Validation Pipeline: Funktionsfähig

**Verbleibende Low-Priority Cleanups:**

- [ ] VS Code E2E Task glob pattern fixen (optional - Tests laufen manuell)
- [ ] 30 ESLint Warnings manuell prüfen (unused vars, code quality)
- [ ] 1 fehlschlagender finder-tabs Test reparieren (existierendes Problem)

**Status**: Phase 0.1 ist **produktionsreif abgeschlossen**! 🎉  
**Geschätzter Aufwand**: ~~2-4 Stunden~~ → **Tatsächlich: 2 Stunden** ✅

---

### 0.2 Development Workflow verbessern

**Ziel**: Schnellere Entwicklungszyklen, weniger Frustration

- [ ] **Hot Reload optimieren**
    - [ ] TypeScript watch mode testen
        - `npm run typecheck:watch` hinzufügen (falls nicht vorhanden)
        - Watch-Performance prüfen
    - [ ] CSS watch validieren
        - Bereits vorhanden als Task "Tailwind CSS: Watch"
        - Funktioniert es zuverlässig?
    - [ ] Browser-Auto-Reload einrichten
        - Live Server mit WebSocket reload
        - Oder: Vite/Browsersync evaluieren

- [ ] **VS Code Integration verbessern**
    - [ ] Debug-Konfiguration erstellen
        - `.vscode/launch.json` für Browser-Debugging
        - Attach to Chrome/Firefox
        - Source Maps konfigurieren
    - [ ] Task-Optimierung
        - "Dev Environment: Start All" validieren
        - Weitere nützliche Tasks hinzufügen
    - [ ] Extensions dokumentieren
        - Empfohlene Extensions in `.vscode/extensions.json`
        - TypeScript, ESLint, Playwright, Tailwind CSS IntelliSense

- [ ] **Git Hooks einrichten**
    - [ ] Husky installieren
        ```bash
        npm install --save-dev husky lint-staged
        npx husky init
        ```
    - [ ] Pre-commit Hook
        - `lint-staged` konfigurieren
        - Nur geänderte Dateien: `lint` + `typecheck`
    - [ ] Pre-push Hook
        - `npm run test:e2e:basic` ausführen
        - Verhindert broken code im Remote

**Dateien:**

- Neu: `.vscode/launch.json` - Debug config
- Neu: `.vscode/extensions.json` - Empfohlene Extensions
- Update: `package.json` - Husky scripts
- Neu: `.husky/pre-commit` - Pre-commit hook
- Neu: `.husky/pre-push` - Pre-push hook
- Neu: `.lintstagedrc.json` - lint-staged config

**Geschätzter Aufwand**: 3-5 Stunden

---

### 0.3 Testing stabilisieren

**Ziel**: Zuverlässige, schnelle Tests

- [ ] **Test-Strategie klären**
    - [ ] Warum failten basic smoke tests?
        - Logs analysieren
        - Flaky tests identifizieren
        - Timeouts anpassen falls nötig
    - [ ] Test-Coverage messen
        - `npm run test:coverage` evaluieren
        - Baseline dokumentieren
    - [ ] Test-Dokumentation
        - Was testet welche Suite?
        - Wann basic vs. full E2E?

- [ ] **Test-Performance optimieren**
    - [ ] Parallele Execution prüfen
        - Playwright workers optimal nutzen
        - Zu viele workers = instabil
    - [ ] Fixtures für schnellere Tests
        - Wiederverwendbare Setup/Teardown
        - Mock-Daten für GitHub API

**Dateien:**

- Update: `playwright.config.js` - Workers, timeouts
- Update: `tests/e2e/utils.js` - Shared fixtures
- Neu: `docs/TESTING.md` - Test strategy guide

**Geschätzter Aufwand**: 2-3 Stunden

---

### 0.4 Dokumentation aktualisieren

**Ziel**: Neue Contributors finden sich schnell zurecht

- [ ] **QUICKSTART.md überarbeiten**
    - [ ] Aktuelle Setup-Schritte validieren
        - Funktioniert `npm install` → `npm run dev`?
        - Fehlende Dependencies?
    - [ ] Troubleshooting Section hinzufügen
        - "Dev server startet nicht"
        - "Tests failen"
        - "TypeScript Errors"
    - [ ] Common Errors & Solutions
        - Port bereits belegt
        - Node version mismatch
        - GitHub API rate limit

- [ ] **CONTRIBUTING.md erweitern**
    - [ ] Development Workflow dokumentieren
        - Branch-Strategie (develop → feature/\*)
        - Commit-Conventions (conventional commits)
        - PR-Prozess
    - [ ] Debugging Guide
        - VS Code debugger nutzen
        - Browser DevTools
        - Network issues
    - [ ] Testing Best Practices
        - Wann welche Test-Suite?
        - Test schreiben für neue Features
        - Mock-Strategien

**Dateien:**

- Update: `docs/QUICKSTART.md` - Setup + Troubleshooting
- Update: `CONTRIBUTING.md` - Workflow + Debugging
- Neu: `docs/TROUBLESHOOTING.md` - Detaillierte Lösungen

**Geschätzter Aufwand**: 1-2 Stunden

---

### 📊 Zusammenfassung: Priorität 0

**Warum zuerst?**

- ✅ **Stabilität** - Keine Entwicklung auf "wackeligem Fundament"
- ✅ **Effizienz** - Bessere Tools = schnellere Feature-Entwicklung
- ✅ **Qualität** - Git Hooks fangen Fehler früh ab
- ✅ **Onboarding** - Neue Contributors produktiv in <30min

**Gesamtaufwand**: ~8-14 Stunden (1-2 Wochen bei 5-10h/Woche)

**Erfolgskriterien:**

- ✅ Alle Terminals zeigen grüne Status
- ✅ E2E Tests passing (zumindest basic suite)
- ✅ Dev server läuft stabil
- ✅ Hot reload funktioniert
- ✅ Git hooks verhindern broken commits

---

## 🔴 Priorität 1: Core Features & Integration

**⚠️ Erst starten, wenn Priorität 0 abgeschlossen ist!**

#### 1.1 UI Integration - Window Management

**Ziel**: Benutzer sollen mehrere Instanzen visuell verwalten können

- [ ] **Window Tabs System** (wie Browser-Tabs)
    - [ ] Tab-Leiste oberhalb des Fenster-Inhalts
    - [ ] Tab hinzufügen (+) Button
    - [ ] Tab schließen (X) Button
    - [ ] Tab-Wechsel per Klick
    - [ ] Active Tab Highlighting
    - [ ] Tab-Reordering per Drag & Drop
    - [ ] Keyboard Shortcuts (Cmd+1-9 für Tab-Wechsel)
- [ ] **Window Menü in Menubar**
    - [ ] "Fenster" Menü-Eintrag hinzufügen
    - [ ] Liste aller offenen Instanzen
    - [ ] Wechsel zwischen Instanzen
    - [ ] "Alle schließen" Option
    - [ ] "Neue Instanz" Shortcuts

- [ ] **Keyboard Shortcuts**
    - [ ] Cmd/Ctrl+N - Neue Instanz des aktiven Typs
    - [ ] Cmd/Ctrl+W - Aktuelle Instanz schließen
    - [ ] Cmd/Ctrl+Tab - Nächste Instanz
    - [ ] Cmd/Ctrl+Shift+Tab - Vorherige Instanz
    - [ ] Cmd/Ctrl+1-9 - Zu Instanz 1-9 springen

**Dateien**:

- Neu: `src/ts/window-tabs.ts` → emit: `js/window-tabs.js` - Tab Management System
- Neu: `src/ts/keyboard-shortcuts.ts` → emit: `js/keyboard-shortcuts.js` - Shortcut Handler
- Update: `js/menu.js` - Window Menü hinzufügen
- Update: `app.js` - Shortcuts registrieren

**Geschätzter Aufwand**: 6-8 Stunden

---

#### 1.2 Modal/Dialog Integration

**Ziel**: Instanzen in bestehende Modals integrieren

- [ ] **Dialog-System erweitern**
    - [ ] `Dialog.js` für Multi-Instance Support anpassen
    - [ ] Container für Instanzen in Modals
    - [ ] Tab-Leiste in Modal-Header integrieren
    - [ ] Modal resize bei Tab-Wechsel

- [ ] **Terminal Modal Update**
    - [ ] Bestehende Terminal-Logik mit `TerminalInstance` verbinden
    - [ ] Tab-Support im Terminal-Modal
    - [ ] Shortcuts im Terminal aktiv halten

- [ ] **TextEditor Modal Update**
    - [ ] Bestehende TextEditor-Logik mit `TextEditorInstance` verbinden
    - [ ] Tab-Support im TextEditor-Modal
    - [ ] Dirty State in Tabs anzeigen (\*)

**Dateien**:

- Update: `js/dialog.js` - Multi-Instance Support
- Update: `js/terminal.js` - Instance Integration
- Update: `js/text-editor.js` - Instance Integration
- Update: `index.html` - Modal Templates

**Geschätzter Aufwand**: 4-6 Stunden

---

#### 1.3 State Persistierung & Session Management

**Ziel**: Instanzen überleben Page Reload

- [ ] **Auto-Save System**
    - [ ] Alle Instanzen periodisch speichern (debounced)
    - [ ] LocalStorage/SessionStorage Integration
    - [ ] Speicher-Quota Management

- [ ] **Restore on Load**
    - [ ] Instanzen beim Seitenload wiederherstellen
    - [ ] Modal-State wiederherstellen (geöffnet/geschlossen)
    - [ ] Active Tab wiederherstellen
    - [ ] Cursor-Position/Scroll-State wiederherstellen

- [ ] **Session Export/Import**
    - [ ] "Session speichern" Funktion
    - [ ] "Session laden" Funktion
    - [ ] Session als JSON exportieren
    - [ ] Session-Vorlagen (Templates)

**Dateien**:

- Neu: `js/session-manager.js` - Session Management
- Update: `js/instance-manager.js` - Auto-save Hooks
- Update: `app.js` - Restore on load

**Geschätzter Aufwand**: 3-4 Stunden

---

### 🟡 Priorität 2: Weitere Module migrieren

#### 2.1 Finder Multi-Instance

**Ziel**: Mehrere Finder-Fenster gleichzeitig (komplex!)

- [ ] **FinderInstance erstellen**
    - [ ] Basis-Struktur von `BaseWindowInstance` erben
    - [ ] Virtuelles Dateisystem pro Instanz
    - [ ] Navigation State (currentPath, currentView)
    - [ ] Selection State isolieren

- [ ] **GitHub Integration**
    - [ ] Cache pro Instanz oder shared?
    - [ ] API-Calls optimieren (Rate Limiting)
    - [ ] Fehlerbehandlung pro Instanz

- [ ] **Favoriten & Recents**
    - [ ] Global oder pro Instanz?
    - [ ] Sync zwischen Instanzen?

**Dateien**:

- Neu: `js/finder-instance.js`
- Update: `js/finder.js` - Instance Integration

**Geschätzter Aufwand**: 8-10 Stunden (komplex wegen GitHub)

---

#### 2.2 Image Viewer Multi-Instance

**Ziel**: Mehrere Bilder gleichzeitig betrachten

- [ ] **ImageViewerInstance erstellen**
    - [ ] Basis-Struktur
    - [ ] Bild-State (currentImage, zoom, rotation)
    - [ ] Navigation (prev/next)

- [ ] **Features**
    - [ ] Zoom & Pan
    - [ ] Rotation
    - [ ] Lightbox Mode
    - [ ] Galerie-Navigation

**Dateien**:

- Neu: `js/image-viewer-instance.js`
- Update: `index.html` - Image Viewer Modal

**Geschätzter Aufwand**: 3-4 Stunden

---

#### 2.3 Settings - Entscheidung treffen

**Ziel**: Klären, ob Settings Multi-Instance braucht

- [ ] **Analyse**
    - [ ] Use Cases für mehrere Settings-Fenster?
    - [ ] Singleton vs. Multi-Instance
    - [ ] Entscheidung dokumentieren

- [ ] **Optional: Settings Instance**
    - [ ] Nur wenn sinnvoll
    - [ ] Verschiedene Settings-Bereiche in Tabs?

**Dateien**:

- Evtl. neu: `js/settings-instance.js`

**Geschätzter Aufwand**: 2-3 Stunden (oder skip)

---

### 🟢 Priorität 3: Advanced Features

#### 3.1 Window Tiling & Split View

**Ziel**: Instanzen nebeneinander anzeigen

- [ ] **Split View System**
    - [ ] Horizontal Split
    - [ ] Vertical Split
    - [ ] Resizable Splitter
    - [ ] Drag & Drop zwischen Splits

- [ ] **Tiling Layouts**
    - [ ] Grid Layout (2x2, 3x3)
    - [ ] Sidebar + Main Layout
    - [ ] Custom Layouts speichern

**Dateien**:

- Neu: `js/window-tiling.js`
- Neu: `js/split-view.js`
- Update: `src/css/style.css` - Split View Styles

**Geschätzter Aufwand**: 6-8 Stunden

---

#### 3.2 Drag & Drop Improvements

**Ziel**: Content zwischen Instanzen verschieben

- [ ] **Inter-Instance Drag & Drop**
    - [ ] Text zwischen Editoren
    - [ ] Dateien zwischen Findern
    - [ ] Terminal Output kopieren

- [ ] **Tab Reordering**
    - [ ] Tabs per Drag & Drop sortieren
    - [ ] Tabs zwischen Windows verschieben (falls multiple windows)

**Dateien**:

- Neu: `js/drag-drop-manager.js`
- Update: `js/window-tabs.js`

**Geschätzter Aufwand**: 4-5 Stunden

---

#### 3.3 Instance Templates & Presets

**Ziel**: Vordefinierte Instanz-Konfigurationen

- [ ] **Template System**
    - [ ] Templates definieren (z.B. "Dev Setup" = 2 Terminals + 1 Editor)
    - [ ] Template Galerie
    - [ ] Custom Templates erstellen
    - [ ] Templates teilen (Export/Import)

- [ ] **Quick Actions**
    - [ ] "New from Template"
    - [ ] Template Shortcuts
    - [ ] Recent Templates

**Dateien**:

- Neu: `js/instance-templates.js`
- Update: UI für Template-Auswahl

**Geschätzter Aufwand**: 4-6 Stunden

---

### 🔵 Priorität 4: Testing & Quality

#### 4.1 E2E Tests erweitern

**Ziel**: Vollständige Test-Abdeckung

- [ ] **Fix networkidle Timeout**
    - [ ] `multi-instance.spec.js` zum Laufen bringen
    - [ ] Timeout-Ursache finden und beheben

- [ ] **UI Tests**
    - [ ] Tab-System testen
    - [ ] Window-Menü testen
    - [ ] Keyboard Shortcuts testen

- [ ] **Integration Tests**
    - [ ] Finder Instance Tests
    - [ ] Image Viewer Tests
    - [ ] Session Restore Tests

**Dateien**:

- Update: `tests/e2e/multi-instance.spec.js`
- Neu: `tests/e2e/window-tabs.spec.js`
- Neu: `tests/e2e/session-management.spec.js`

**Geschätzter Aufwand**: 4-6 Stunden

---

#### 4.2 Performance Optimierung

**Ziel**: System auch mit vielen Instanzen flüssig

- [ ] **Memory Management**
    - [ ] Profiling mit Chrome DevTools
    - [ ] Memory Leaks identifizieren
    - [ ] Cleanup verbessern

- [ ] **Lazy Loading**
    - [ ] Instanzen erst bei Bedarf rendern
    - [ ] Inaktive Tabs "schlafen legen"
    - [ ] Virtual Scrolling für lange Listen

- [ ] **Debouncing & Throttling**
    - [ ] Input Events optimieren
    - [ ] Resize Events throttlen
    - [ ] Auto-save debounce

**Dateien**:

- Update: Alle Instance-Dateien
- Neu: `js/performance-monitor.js`

**Geschätzter Aufwand**: 3-5 Stunden

---

#### 4.3 Accessibility (a11y)

**Ziel**: System für alle nutzbar machen

- [ ] **Keyboard Navigation**
    - [ ] Tab-Navigation funktioniert
    - [ ] Alle Aktionen per Tastatur
    - [ ] Focus Management

- [ ] **Screen Reader Support**
    - [ ] ARIA Labels überall
    - [ ] Live Regions für Updates
    - [ ] Semantisches HTML

- [ ] **Visual Indicators**
    - [ ] Focus-Styles
    - [ ] Active State
    - [ ] Loading States

**Dateien**:

- Update: Alle UI-Komponenten
- Neu: `docs/ACCESSIBILITY.md`

**Geschätzter Aufwand**: 4-6 Stunden

---

### 🟣 Priorität 5: Documentation & Polish

#### 5.1 User Documentation

**Ziel**: Benutzer verstehen das Feature

- [ ] **User Guide**
    - [ ] "Wie öffne ich mehrere Fenster?"
    - [ ] "Wie wechsle ich zwischen Instanzen?"
    - [ ] "Wie speichere ich Sessions?"
    - [ ] Screenshots/GIFs

- [ ] **Keyboard Shortcuts Cheatsheet**
    - [ ] Übersicht aller Shortcuts
    - [ ] Druckbare Version
    - [ ] In-App Hilfe (F1?)

**Dateien**:

- Neu: `docs/USER_GUIDE_MULTI_INSTANCE.md`
- Neu: `docs/KEYBOARD_SHORTCUTS.md`

**Geschätzter Aufwand**: 2-3 Stunden

---

#### 5.2 Developer Documentation

**Ziel**: Andere Entwickler können beitragen

- [ ] **API Documentation**
    - [ ] JSDoc für alle Klassen
    - [ ] API Reference generieren
    - [ ] Code-Beispiele

- [ ] **Architecture Documentation**
    - [ ] Diagramme (Mermaid)
    - [ ] Datenfluss erklären
    - [ ] Design Decisions dokumentieren

**Dateien**:

- Update: Alle JS-Files (JSDoc)
- Neu: `docs/API_REFERENCE.md`
- Neu: `docs/ARCHITECTURE.md`

**Geschätzter Aufwand**: 3-4 Stunden

---

#### 5.3 Visual Polish

**Ziel**: System sieht professionell aus

- [ ] **Animations**
    - [ ] Tab-Wechsel Animation
    - [ ] Modal open/close
    - [ ] Smooth Transitions

- [ ] **Dark Mode**
    - [ ] Alle neuen Komponenten
    - [ ] Tab-Styles
    - [ ] Konsistente Farben

- [ ] **Icons**
    - [ ] Tab-Icons
    - [ ] Action-Icons
    - [ ] Status-Icons

**Dateien**:

- Update: `src/css/style.css`
- Neu: `src/css/window-tabs.css`
- Update: `js/theme.js`

**Geschätzter Aufwand**: 3-4 Stunden

---

## 🎯 Empfohlene Reihenfolge (AKTUALISIERT!)

### Phase 0: Development Environment (1-2 Wochen) ⚠️ **JETZT!**

**Warum zuerst?** Stabile Basis ist Voraussetzung für effiziente Feature-Entwicklung!

1. **Stabilität herstellen** (KRITISCH, 2-4h)
    - Terminal-Fehler beheben
    - CI/CD grün bekommen
2. **Workflow verbessern** (3-5h)
    - Hot reload optimieren
    - VS Code Integration
    - Git Hooks einrichten
3. **Testing stabilisieren** (2-3h)
    - Flaky tests fixen
    - Test-Performance
4. **Dokumentation** (1-2h)
    - QUICKSTART.md
    - Troubleshooting Guide

**Total: ~8-14 Stunden**

---

### Phase 1: UI Integration (1-2 Wochen)

**Erst nach Phase 0!**

1. Window Tabs System ✨ (wichtigste Feature!)
2. Modal Integration
3. Window Menü
4. Keyboard Shortcuts

**Total: ~15-20 Stunden**

---

### Phase 2: State & Sessions (3-5 Tage)

1. Auto-Save System
2. Session Restore
3. Export/Import

**Total: ~6-8 Stunden**

---

### Phase 3: Weitere Module (1-2 Wochen)

1. Image Viewer (einfach) ✅
2. Finder (komplex) 🔴

**Total: ~12-15 Stunden**

---

### Phase 4: Advanced Features (Optional)

1. Split View
2. Drag & Drop
3. Templates

**Total: ~15-20 Stunden**

---

### Phase 5: Quality & Docs (1 Woche)

1. Tests erweitern
2. Performance
3. Documentation

**Total: ~10-15 Stunden**

---

## 📌 Quick Wins (für schnelle Erfolge)

**⚠️ Erst DevEx-Quick-Wins, dann Feature-Quick-Wins!**

### DevEx Quick Wins (Phase 0):

1. ✅ **Dev server fix** (30min-1h) - Sofort produktiver
2. ✅ **Git pre-commit hook** (30min) - Verhindert broken commits
3. ✅ **VS Code Debug config** (30min) - Besseres Debugging
4. ✅ **Basic smoke tests fix** (1-2h) - Grüne Tests = Motivation

### Feature Quick Wins (Nach Phase 0):

1. ✅ **Window Menü** (2-3h) - Sofort nützlich
2. ✅ **Cmd+N Shortcut** (1h) - Sehr praktisch
3. ✅ **Tab Close Button** (1h) - Wichtig für UX
4. ✅ **Auto-Save** (2h) - Keine Datenverluste mehr
5. ✅ **Image Viewer Instance** (3-4h) - Neue Funktionalität

---

## 🔧 Technische Details für neue Developer

### Wichtige Dateien verstehen:

```
js/
├── base-window-instance.js    # Basis-Klasse - HIER starten!
├── instance-manager.js         # Manager-Logik
├── window-chrome.js            # UI-Komponenten
├── terminal-instance.js        # Beispiel: Terminal
├── text-editor-instance.js     # Beispiel: Editor
└── multi-instance-demo.js      # Live-Beispiele (Browser Console)
```

### Neuen Fenstertyp hinzufügen:

```javascript
// 1. Klasse erstellen (js/my-app-instance.js)
class MyAppInstance extends BaseWindowInstance {
    constructor(config) {
        super({ ...config, type: 'my-app' });
        // Dein State hier
    }

    render() {
        // Dein UI hier
    }

    attachEventListeners() {
        // Deine Events hier
    }
}

// 2. Manager erstellen
window.MyAppInstanceManager = new InstanceManager({
    type: 'my-app',
    instanceClass: MyAppInstance,
    maxInstances: 0, // 0 = unbegrenzt
});

// 3. In index.html einbinden
<script src="./js/my-app-instance.js"></script>;

// 4. Fertig! Nutzung:
const instance = window.MyAppInstanceManager.createInstance({
    title: 'My App 1',
});
```

### Wichtige Methoden:

```javascript
// Instanz erstellen
const instance = manager.createInstance({ title: 'Title' });

// State updaten (triggert Event)
instance.updateState({ foo: 'bar' });

// Events lauschen
instance.on('stateChanged', data => console.log(data));

// Serialisieren
const saved = instance.serialize();
localStorage.setItem('key', JSON.stringify(saved));

// Wiederherstellen
instance.deserialize(JSON.parse(localStorage.getItem('key')));

// Cleanup
instance.destroy();
```

---

## 📊 Fortschritt tracken

### Checkliste kopieren und in Issues verwenden:

```markdown
## Multi-Instance System - Sprint 1

- [ ] Window Tabs System
- [ ] Modal Integration
- [ ] Window Menü
- [ ] Keyboard Shortcuts
- [ ] Auto-Save System
- [ ] Session Restore

Fortschritt: 0/6 (0%)
```

---

## 💡 Hilfreiche Commands

```bash
# Tests ausführen
npm run test:e2e -- tests/e2e/multi-instance-basic.spec.js

# Dev Server starten
npm run dev

# Demo im Browser
# Öffne: http://localhost:3000/?demo=true
# Console: demoCreateTerminals()

# Neue Tests hinzufügen
# Datei: tests/e2e/my-new-test.spec.js
```

---

## 🤝 Für Copilot / AI Assistants

**Context für neue Chat-Sessions:**

> **WICHTIG:** Development Environment muss zuerst stabilisiert werden!
>
> Aktuelle Probleme:
>
> - E2E basic smoke tests failing
> - Validate task failing
> - Dev server crashed
>
> **Erste Priorität:** Phase 0 (DevEx Optimization) abschließen, bevor Features entwickelt werden.
>
> Das Multi-Instance System ist implementiert. Basis-Klassen (`BaseWindowInstance`, `InstanceManager`, `WindowChrome`) sind fertig. Terminal und TextEditor funktionieren bereits als Multi-Instance.
>
> Siehe: `docs/project/TODO.md` für alle Aufgaben.

**Wichtige Dateien zum Verstehen:**

1. `js/base-window-instance.js` - Basis-Klasse
2. `js/instance-manager.js` - Manager
3. `docs/MULTI_INSTANCE_MIGRATION.md` - Migration Guide
4. `docs/MULTI_INSTANCE_QUICKSTART.md` - Quick Start

**Erste Aufgabe für neue Session:**
→ ⚠️ **Phase 0: Terminal-Fehler analysieren und beheben** (Priorität 0.1)

---

## 📞 Support / Questions

- **Dokumentation**: `/docs/MULTI_INSTANCE_*.md`
- **Beispiele**: `js/multi-instance-demo.js`
- **Tests**: `tests/e2e/multi-instance*.spec.js`
- **Live Demo**: Browser Console → `demoCreateTerminals()`

---

**Erstellt**: 25. Oktober 2025  
**Version**: 1.0  
**Nächstes Review**: Nach Phase 1 (UI Integration)

---

## 🎯 TL;DR - Was als Nächstes?

### ⚠️ SOFORT STARTEN (Priorität 0 - DevEx):

**Warum?** Entwicklung auf instabiler Basis ist ineffizient und frustrierend!

1. **Terminal-Fehler beheben** (2-4h) 🔴 KRITISCH
    - E2E basic smoke tests debuggen
    - Validate task fixen
    - Dev server zum Laufen bringen
2. **Development Workflow** (3-5h)
    - Hot reload optimieren
    - VS Code Debug config
    - Git Hooks (pre-commit, pre-push)
3. **Testing stabilisieren** (2-3h)
    - Flaky tests identifizieren
    - Test-Performance
4. **Docs aktualisieren** (1-2h)
    - Troubleshooting Guide

**Geschätzter Zeitaufwand für Prio 0**: ~8-14 Stunden (1-2 Wochen)

---

### Erst danach (Priorität 1 - Features):

1. **Window Tabs** - Tabs oberhalb des Inhalts
2. **Keyboard Shortcuts** - Cmd+N, Cmd+W, etc.
3. **Modal Integration** - Instanzen in bestehende Modals
4. **Auto-Save** - State persistieren

**Geschätzter Zeitaufwand für Prio 1**: ~15-20 Stunden (2-3 Wochen)

---

### Danach (Priorität 2):

1. **Finder Instance** - Mehrere Finder-Fenster
2. **Image Viewer Instance** - Mehrere Bilder
3. **Tests erweitern** - Vollständige Coverage

**Geschätzter Zeitaufwand für Prio 2**: ~12-15 Stunden (1-2 Wochen)

---

### Optional (Priorität 3):

1. Split View / Tiling
2. Drag & Drop zwischen Instanzen
3. Templates & Presets

**Geschätzter Zeitaufwand für Prio 3**: ~15-20 Stunden

---

**Gesamtaufwand**: ~50-70 Stunden (6-10 Wochen bei 8-10h/Woche)

🚀 **Los geht's - aber erst DevEx, dann Features!**
