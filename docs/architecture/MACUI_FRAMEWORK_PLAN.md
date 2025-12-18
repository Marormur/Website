# MacUI Framework – Architektur- & Implementierungsplan

## 1. Vision & Ziele

Das **MacUI Framework** ist eine interne UI-Bibliothek für das Portfolio-Projekt, die darauf abzielt, die Erstellung und Wartung von Applikationen (wie Finder, Terminal, TextEditor) zu standardisieren. Es nutzt das vorhandene Virtual DOM (VDOM) System und Tailwind CSS, um eine konsistente macOS-Experience zu bieten.

### Hauptziele:

- **Modularität**: UI-Logik (wie Resizing oder Tab-Handling) wird aus den Apps in wiederverwendbare Komponenten extrahiert.
- **Deklarative UI**: Apps beschreiben _was_ gerendert werden soll, das Framework kümmert sich um das _wie_ (Diffing/Patching).
- **Wartbarkeit**: Zentrale Fehlerbehebungen in einer Komponente (z.B. Sidebar) wirken sich auf alle Apps aus.
- **Entwicklungsgeschwindigkeit**: Neue Apps können durch Templates in Minuten statt Stunden erstellt werden.

---

## 2. Kern-Architektur

### 2.1 BaseComponent (`src/ts/framework/component.ts`)

Die Basisklasse für alle UI-Elemente.

- **State Management**: Interner `state` und eine `setState()` Methode, die einen Re-Render-Zyklus auslöst.
- **VDOM Integration**: Automatisiert den Aufruf von `h()`, `diff()` und `patch()`.
- **Lifecycle Hooks**:
    - `onMount()`: Nach dem ersten Einfügen in den DOM.
    - `onUpdate()`: Nach einer State-Änderung.
    - `onDestroy()`: Vor dem Entfernen (Cleanup von Event-Listenern).

### 2.2 Event-System

- Integration mit dem vorhandenen `ActionBus` für globale Aktionen.
- Lokale Event-Delegation über den `EventDelegator` zur Performance-Optimierung.

---

## 3. Komponenten-Katalog

### 3.1 Layout-Komponenten

- **`AppShell`**: Das Grundgerüst (Toolbar oben, Sidebar links, Content rechts).
- **`SplitView`**: Kapselt die Resizer-Logik (Horizontal/Vertikal).
- **`ScrollArea`**: Standardisierte Scrollbars mit macOS-Styling.

### 3.2 Navigations-Komponenten

- **`Sidebar`**: Unterstützt Gruppen, Icons, Badges und Active-States.
- **`Toolbar`**: Container für Breadcrumbs, Suchfelder und Aktions-Buttons.
- **`Breadcrumbs`**: Interaktive Pfad-Navigation.
- **`Tabs`**: Wiederverwendbare Tab-Leiste mit Support für verschiedene Styles (macOS, Pills).

### 3.3 Daten-Komponenten

- **`ListView`**: Tabellarische Darstellung mit Sortierfunktion.
- **`GridView`**: Icon-basierte Darstellung mit automatischer Grid-Anpassung.
- **`DataView`**: Wrapper, der nahtlos zwischen List und Grid umschaltet.

---

## 4. Implementierungs-Phasen

### Phase 1: Fundament (Infrastruktur)

- [x] Erstellen der `BaseComponent` Klasse.
- [x] Definition der TypeScript-Interfaces für Props und State.
- [x] Setup der Verzeichnisstruktur in `src/ts/framework/`.
- [x] Implementierung eines einfachen `Store` für globales State-Management.

### Phase 2: Layout-Logik (Extraktion)

- [x] **SplitView**: Extraktion der Resizer-Logik aus `FinderView.ts`.
- [x] **AppShell**: Erstellen des Standard-Layout-Containers.

### Phase 3: Navigation & Daten

- [x] **Sidebar**: Implementierung einer deklarativen Sidebar-Komponente.
- [x] **Toolbar**: Container für Breadcrumbs, Suchfelder und Aktions-Buttons.
- [x] **Breadcrumbs**: Portierung der Finder-Breadcrumbs in eine eigenständige Klasse.

### Phase 4: Validierung (Finder Refactoring)

- [x] Umbau des Finders auf die neuen Framework-Komponenten.
- [x] Sicherstellen, dass alle E2E-Tests weiterhin bestehen.

### Phase 5: Skalierung

- [x] Erstellen eines `AppTemplate` für neue Projekte.
- [x] Dokumentation der Komponenten-APIs.

---

## 5. Verzeichnisstruktur (Aktuell)

```
src/ts/framework/
├── core/
│   ├── component.ts      # BaseComponent
│   ├── types.ts          # Gemeinsame Interfaces
│   ├── store.ts          # Mini-State-Store
│   └── framework-tab.ts  # Bridge zu BaseTab
├── layout/
│   ├── app-shell.ts
│   └── split-view.ts
├── navigation/
│   ├── sidebar.ts
│   ├── toolbar.ts
│   ├── breadcrumbs.ts
│   └── tabs.ts
├── data/
│   ├── list-view.ts
│   ├── grid-view.ts
│   └── data-view.ts
└── templates/
    └── standard-app.ts   # All-in-one Template
```

---

## 6. Technische Richtlinien

- **TypeScript First**: Strenge Typisierung für alle Props.
- **Tailwind Only**: Kein Inline-CSS, Nutzung der vorhandenen Design-Tokens.
- **Performance**: Minimierung von Re-Renders durch `shouldComponentUpdate` Logik in der `BaseComponent`.
- **i18n**: Alle Komponenten müssen den `API.i18n` Service unterstützen.
