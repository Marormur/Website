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

- [ ] `base-window-instance.js` → `.ts`
- [ ] `instance-manager.js` → `.ts`
- [ ] `window-manager.js` → `.ts`
- [x] `action-bus.js` → `src/ts/action-bus.ts` (emit: `js/action-bus.js`)
- [ ] `window-chrome.js` → `.ts`
- [ ] `api.js` → `.ts`
- [ ] (danach) `terminal-instance.js`, `text-editor-instance.js`, `theme.js`, `storage.js`

Erfolgskriterien: Strict(er) Types, keine Runtime-Regressions, Tests grün

#### Phase 4 – Legacy-Refactoring

- [ ] GitHub-API extrahieren (`js/github-api.ts`) und in `finder.js`/Legacy verwenden
- [ ] `app.js` schrittweise modularisieren und zu `app.ts` migrieren
- [ ] Globale Event-Listener auf ActionBus migrieren (wo noch Legacy)

#### Phase 5 – Testing & Quality

- [ ] E2E: `tests/e2e/typescript-integration.spec.ts`
- [ ] Type-Coverage Tool einführen (`type-coverage`), Ziel >90% (später >95%)
- [ ] Performance-Check (kein signifikanter Regress)

#### Phase 6 – Deployment & Doku

- [ ] GitHub Actions: Typecheck Schritt vor Build/CSS/Deploy
- [ ] README, ARCHITECTURE, CONTRIBUTING auf TS aktualisieren
- [ ] `docs/TYPESCRIPT_GUIDELINES.md` & Migration Summary ergänzen

---

## 📝 TODO - Nächste Schritte

### 🔴 Priorität 1: Core Features & Integration

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

## 🎯 Empfohlene Reihenfolge

### Phase 1: UI Integration (1-2 Wochen)

1. Window Tabs System ✨ (wichtigste Feature!)
2. Modal Integration
3. Window Menü
4. Keyboard Shortcuts

### Phase 2: State & Sessions (3-5 Tage)

1. Auto-Save System
2. Session Restore
3. Export/Import

### Phase 3: Weitere Module (1-2 Wochen)

1. Image Viewer (einfach) ✅
2. Finder (komplex) 🔴

### Phase 4: Advanced Features (Optional)

1. Split View
2. Drag & Drop
3. Templates

### Phase 5: Quality & Docs (1 Woche)

1. Tests erweitern
2. Performance
3. Documentation

---

## 📌 Quick Wins (für schnelle Erfolge)

Diese Aufgaben bringen schnell sichtbare Ergebnisse:

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

> Das Multi-Instance System ist implementiert. Basis-Klassen (`BaseWindowInstance`, `InstanceManager`, `WindowChrome`) sind fertig. Terminal und TextEditor funktionieren bereits als Multi-Instance.
>
> Als Nächstes steht UI-Integration an: Window Tabs, Keyboard Shortcuts, Modal-Integration.
>
> Siehe: `TODO_MULTI_INSTANCE.md` für alle Aufgaben.

**Wichtige Dateien zum Verstehen:**

1. `js/base-window-instance.js` - Basis-Klasse
2. `js/instance-manager.js` - Manager
3. `docs/MULTI_INSTANCE_MIGRATION.md` - Migration Guide
4. `docs/MULTI_INSTANCE_QUICKSTART.md` - Quick Start

**Erste Aufgabe für neue Session:**
→ Window Tabs System implementieren (`js/window-tabs.js`)

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

### Sofort starten (Priorität 1):

1. **Window Tabs** - Tabs oberhalb des Inhalts
2. **Keyboard Shortcuts** - Cmd+N, Cmd+W, etc.
3. **Modal Integration** - Instanzen in bestehende Modals
4. **Auto-Save** - State persistieren

### Danach (Priorität 2):

1. **Finder Instance** - Mehrere Finder-Fenster
2. **Image Viewer Instance** - Mehrere Bilder
3. **Tests erweitern** - Vollständige Coverage

### Optional (Priorität 3):

1. Split View / Tiling
2. Drag & Drop zwischen Instanzen
3. Templates & Presets

**Geschätzter Zeitaufwand für Prio 1**: ~2-3 Wochen  
**Geschätzter Zeitaufwand gesamt**: ~6-8 Wochen

🚀 **Los geht's!**
