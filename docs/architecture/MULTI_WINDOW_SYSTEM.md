# Multi-Window System – Architekturübersicht

Dieses Dokument beschreibt das neue Fenster-System der Website. Ziel ist, dass neue Fenster-Typen (z. B. ein Musik-Player) oder neue Tab-Inhalte schnell und konsistent entwickelt werden können.

## Ziele

- Einheitliche Grundlage für „Apps" wie Finder, Text-Editor, Terminal.
- Drag&Drop von Tabs zwischen Fenstern (und Herausziehen in neues Fenster).
- Persistenter Zustand: Position, Größe, Z‑Index, aktive Tabs, Tab-spezifische Inhalte.
- Kompatibilität zur bestehenden Menubar/WindowManager-Logik.

## Kernklassen

- `BaseWindow` (`src/ts/base-window.ts`)
    - Bewegliches, resizables Container-Fenster mit Titelzeile, Tabbar und Content-Bereich.
    - Speichert Position/Größe/Zustand; meldet sich beim (legacy) `WindowManager` an,
      damit Program-Label und Menüs korrekt sind.
    - Public API (Auszug):
        - `show()`, `hide()`, `close()`, `destroy()`
        - `addTab(tab)`, `removeTab(id)`, `detachTab(id)`, `transferTabTo(target, id)`
        - `setActiveTab(id)`
        - `serialize()` / `static deserialize(state)`

- `BaseTab` (`src/ts/base-tab.ts`)
    - Basisklasse für Inhalte – z. B. eine Textdatei, eine Terminal-Session, eine Finder-Ansicht.
    - Hält `contentState` und kann über `serialize()`/`deserialize()` persistiert werden.
    - Public API (Auszug):
        - `createDOM()`, `render()`, `show()`, `hide()`, `destroy()`
        - `setTitle(title)`, `updateContentState(partial)`
        - `transferTo(targetWindow)`

- `WindowTabs` (`src/ts/window-tabs.ts`)
    - Generische Tab-Leiste, die an einen Manager (z. B. `InstanceManager`) gebunden ist.
    - Unterstützt Tab-Reordering, Cross-Window-Drag & Desktop-Drop (neues Fenster erzeugen).
    - API: `WindowTabs.create(manager, mountEl, options)` → Controller mit `refresh()` und `setTitle(instanceId, title)`.

## Lebenszyklus eines Fensters

1. `new FinderWindow({ ... })`
2. `window.show()` → erzeugt DOM, registriert sich für Fokus und Resize, fügt Tabbar/Content ein
3. `window.addTab(tab)` → `tab.createDOM()` → DOM wird der Content-Area hinzugefügt
4. Nutzer kann Tabs per Drag&Drop umsortieren oder in andere Fenster ziehen
5. `window.hide()`/`window.close()`/`window.destroy()`

Der Zustand wird automatisch gesichert, u. a. auf:

- Ende eines Drag/Resize
- Tab-Änderungen (Hinzufügen/Entfernen/Wechsel)
- Anzeigen/Verbergen

## Menubar-Integration

`BaseWindow` registriert sich im `WindowManager`. Die Menubar bestimmt das „aktive Programm“ anhand des Fensters mit dem höchsten `z-index`. Das Modul `program-menu-sync.ts` aktualisiert den Program-Label-Text sowie das Anwendungsmenü.

Wichtig: Auch im Legacy-Z‑Index-Manager-Pfad (bei alten Modals) wird das Menubar-Update ausgelöst, damit beide Welten funktionieren.

## Drag & Drop zwischen Fenstern

- `WindowTabs` hält globale Drag-Variablen (welcher Tab, welcher Manager).
- Beim Drop auf eine andere Tabbar werden `detachInstance` (Quelle) und `adoptInstance` (Ziel) aufgerufen.
- Beim Drop auf „freien“ Desktop wird – abhängig vom Typ – ein neues Fenster erzeugt (z. B. `FinderWindow`) und der Tab hineingelegt.

## Session / Persistenz

Die Serialisierung liefern `BaseWindow.serialize()` und `BaseTab.serialize()`. Der `MultiWindowSessionManager` (und für Legacy-Fälle `SessionManager`) ruft diese an und speichert sie. Beim Restore werden Fenster und Tabs rekonstruiert.

## Best Practices

- Fenster-spezifische UI in einer Subklasse von `BaseWindow` kapseln.
- Tab-spezifische Logik in einer Subklasse von `BaseTab` halten.
- Für Multi-Tab-Fenster `WindowTabs` nutzen; die Subklasse sollte `_renderTabs()` überschreiben.
- Bei jeder Content-Änderung `updateContentState()` aufrufen.
- Für Menubar-Kompatibilität nichts weiter tun – die Basisklasse erledigt die Registrierung.

---

Siehe außerdem:

- `docs/guides/CREATE_NEW_WINDOW.md` – Schritt-für-Schritt-Anleitung
- `docs/architecture/FINDER_VIEW.md` – Details zur Finder-Implementierung
