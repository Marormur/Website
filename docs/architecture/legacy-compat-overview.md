# Legacy & Compat – Code-Übersicht

> Stand: 30. März 2026 — Phase 0+1 abgeschlossen, Phase 2 für About/Settings umgesetzt

## `src/ts/compat/` — 2 Dateien

| Datei                      | Funktion                                                                                                                                                                                    | Status                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `compat/expose-globals.ts` | esbuild-Entry: importiert **alle** Module als Side-Effects, bindet sie an `window.*`                                                                                                        | **Notwendig** — Bundle-Einstiegspunkt |
| `compat/instance-shims.ts` | Shim-Factory, die `window.FinderInstanceManager` / `TerminalInstanceManager` / `TextEditorInstanceManager` sowie den Legacy-`FinderSystem`-Bridge mit der neuen Multi-Window-API verdrahtet | **Notwendig, aber befristet**         |

`compat/` ist die bewusste Brücke zwischen dem neuen TypeScript-System und älteren Konsumenten.
**Der Ordner kann erst weg, wenn alle Konsumenten migriert sind.**

---

## Die Legacy-Schichten im Code

### 1. `window.getDockReservedBottom` — globaler window.\*-Aufruf

**Betroffene Dateien (vorher):** `dialog.ts`, `base-window.ts`, `finder-window.ts`, `finder-menus.ts`, `snap-utils.ts` (12 Stellen in `src/ts`)

`getDockReservedBottom` wird als `window.*` aufgerufen, obwohl die Funktion in `dock.ts` implementiert
und über `api.ts` als Legacy Wrapper exponiert wird.

**Status-Update (30. März 2026):** Abgeschlossen. Alle produktiven Aufrufe in `src/ts` nutzen jetzt
direkte Imports von `getDockReservedBottom()` aus `src/ts/ui/dock.ts`.

**Rest-Compat:** Der globale Wrapper in `core/api.ts` bleibt vorerst bestehen, damit Legacy-Konsumenten
außerhalb der modernisierten TS-Module nicht brechen.

---

### 2. `openModals`-Session-Persist (Storage-System)

**Betroffene Datei:** `src/ts/services/storage.ts` — `OPEN_MODALS_KEY`, `restoreOpenModals()`

Legacy-Mechanismus, der Dialog-IDs (`settings-modal`, `about-modal`, `finder-modal`) in `localStorage`
speichert und beim Start wiederherstellt. Läuft **parallel** zum modernen Multi-Window-Session-System.

**Problem:** Beide Systeme müssen aktiv koordiniert werden. Der Konflikt-Guard in `storage.ts`
(`removedConflictingIds`) ist der Beweis für diese Reibung.

**Status-Update:** Settings/About sind bereits als `BaseWindow` migriert.
Die parallele Persistenz bleibt dennoch als Backward-Compatibility-Schicht bestehen.

**Fix-Rest:** `openModals` perspektivisch auf read-only Fallback begrenzen und
`multi-window-session` als alleinige Quelle erzwingen.
**Aufwand:** Mittel–Hoch.

---

### 3. `InstanceManager`-Shims + `index.html`-Bootstrap-Poll

**Betroffene Dateien:** `index.html` Z.26–28, `types/index.d.ts`

`index.html` pollte auf `window.FinderInstanceManager && window.TerminalInstanceManager && window.TextEditorInstanceManager`
um `window.__APP_READY` zu setzen. Diese Readiness-Kopplung ist inzwischen entfernt; die
InstanceManager-Shims bleiben aber als befristete Kompatibilitätsbrücke für ältere Konsumenten relevant.

**Problem:** Historisch gab es eine zirkuläre Kopplung zwischen Bootstrap und Shim-Globals.
Diese ist für die Menubar inzwischen aufgelöst, aber die Shims selbst existieren weiterhin.

**Status:** Readiness-Teil gelöst. Shims weiterhin befristet notwendig.
**Restaufwand:** Mittel.

---

### 4. `LEGACY_MODAL_ID_TO_WINDOW_TYPE` in `dock.ts`

**Betroffene Datei:** `src/ts/ui/dock.ts` Z.100–103

```ts
const LEGACY_MODAL_ID_TO_WINDOW_TYPE: Record<string, string> = {
    'settings-modal': 'settings',
    'about-modal': 'about',
};
```

Nur zwei Einträge — `settings-modal` und `about-modal` werden als Legacy-IDs auf moderne
Window-Typen gemappt (`settings`, `about`).

**Status-Update:** Settings/About sind bereits als `BaseWindow` migriert; die Map ist aktuell eine
Kompatibilitätsschicht für Legacy-ID-Pfade (z. B. Dock/Restore-Ränder).

**Fix-Rest:** Entfernen, sobald keine Legacy-Modal-ID-Pfade mehr benötigt werden.

---

## Die vier parallelen Achsen (Tiefere Analyse)

Die Legacy-Reste sind nicht isoliert, sondern bilden **vier distinkte parallele Systeme**, die jeweils eine eigene
`(legacy + modern + adapter)`-Triade haben:

### Achse 1: Readiness / Bootstrap (Kritikalität: **🟢 GELÖST in Phase 0**)

**Vorher (Problem):** 3 unabhängige `__APP_READY`-Setter (2x HTML, 1x app-init.ts) mit
InstanceManager-Polling in `index.html`.

**Jetzt (Ist-Zustand):**

1. **Einziger `__APP_READY`-Setter:** `src/ts/core/app-init.ts` (Zentrale Readiness-Quelle)
2. **`index.html` Early Script (Z.12–67):** Initialisiert nur noch `__APP_READY = false` falls nötig
3. **`index.html` Fallback Script (Z.1130–1225):** setzt **kein** `__APP_READY` mehr, nur UI-Sichtbarkeits-Fallback
4. **Desktop-Icon-Retries:** in `app-init.ts` als zentraler Post-Init-Callback untergebracht

**Ergebnis:** Keine zirkuläre Readiness-Abhängigkeit mehr zwischen HTML-Pollern und
InstanceManager-Shims.

**Nutzung in E2E-Tests:** `window.__APP_READY` bleibt stabil als zentrales Readiness-Signal.

---

### Achse 2: Window Management (Kritikalität: **🔴 HÖCHST**)

**Parallel existierende Systeme:**

| System               | Dateien                | Zustand       | Nutzung                            |
| -------------------- | ---------------------- | ------------- | ---------------------------------- |
| Legacy `dialogs`     | `ui/dialog.ts`         | Still aktiv   | verbleibende Legacy-Modals         |
| `window.dialogs` Bag | verteilt (Rest-Compat) | reduziert     | punktuelle Legacy-Menüs/Fallbacks  |
| `WindowManager`      | `windows/...`          | Partial       | Modern window lifecycle für einige |
| `WindowRegistry`     | `windows/...`          | Modern (Ziel) | All new windows                    |

**Status-Update zur `dialogs`-Nutzung:**

- `src/ts/ui/actions/windows.ts`: About/Settings sind auf `AboutWindow`/`SettingsWindow` (`focusOrCreate`) umgestellt.
- `src/ts/services/multi-window-session.ts`: Restore-Factory kennt `about` und `settings`.
- `src/ts/services/storage.ts`: `about-modal`/`settings-modal` sind als konfliktbehaftete Legacy-IDs markiert,
  wenn `multi-window-session` vorhanden ist.

**Status-Update (30. März 2026):** Direkte `window.dialogs`-Zugriffe sind in `src/ts` entfernt.
Die verbleibende Legacy-Kopplung liegt primär in Dialog-Compat-Menüs/Bridges und in der
`openModals`-Persistenzlogik, nicht mehr im aktiven Window-Handling.

---

### Achse 3: Finder/Terminal Interaction (Kritikalität: **🟠 MITTEL**)

**Parallel existierende APIs:**

| API                     | Dateien                | Nutzung (grep-Hits) | Typ     |
| ----------------------- | ---------------------- | ------------------- | ------- |
| `window.FinderSystem`   | context-menu, api, ... | reduziert           | Legacy  |
| `window.TerminalSystem` | (ähnlich)              | ~20 hits            | Legacy  |
| `FinderWindow/View`     | ui/windows/...         | Some                | Modern  |
| `TerminalWindow`        | ui/windows/...         | Some                | Modern  |
| InstanceManager Shims   | app-init.ts Z.540-700  | 83 hits total       | Adapter |

**Quantifizierung (InstanceManager-Referenzen):**

- `tests/multi-instance-demo.ts`: 35 hits ⚠️ **Demo-only, nicht produktiv**
- `ui/menu.ts`: 0 Hits nach Registry-Umstellung der Menubar
- `core/app-init.ts`: 8 hits (Shim-Installation)
- `windows/text-editor-instance.ts`: 8 hits
- `windows/terminal-instance.ts`: 5 hits
- `windows/window-configs.ts`: 4 hits

**Quantifizierung (FinderSystem-Calls):**

- `ui/context-menu.ts` Z.151+: 21 Calls (Finder-Items öffnen, View-Mode, Sort)
- `core/app-init.ts`: 18 Calls (Desktop-Items initialisieren)
- `core/api.ts`: 9 Wrapper-Definitionen
- `ui/actions/finder.ts`: 7 Direct-Calls
- `ui/finder-view.ts`: 5 Calls

**_Wichtiges Ergebnis:_** multi-instance-demo.ts hat 35 der 83 Hits: **Diese Datei ist Demo-Code,
kein Production-Input.** Die tatsächliche produktive Nutzung ist ~50 Hits verteilt auf menu, app-init,
instance-Manager-Dateien.

**Status-Update (29. März 2026):**

- ✅ `src/ts/ui/menu.ts` ist jetzt Registry-first und enthält keine app-spezifischen Legacy-Builder mehr.
- ✅ Finder, Terminal, Texteditor, Preview, Photos sowie Settings/About/Program-Info registrieren ihre Menüs über `MenuRegistry`.
- ✅ Der aktive Menubar-Pfad nutzt keine `InstanceManager`-Fallbacks mehr.
- ✅ `src/ts/ui/desktop.ts` liest den Finder-Zustand jetzt über `FinderWindow` statt über `window.FinderSystem`.
- ✅ `src/ts/ui/actions/preview.ts` dispatcht Finder-Öffnen jetzt über `ActionBus` (`finder:openItem`) statt direkt über `window.FinderSystem`.
- ✅ Die ungenutzte Debug-/Test-Alias-Exposition `__FinderSystem` wurde aus `src/ts/core/app-init.ts` entfernt.
- ✅ Der ungenutzte Legacy-Wrapper `API.finder` wurde aus `src/ts/core/api.ts` entfernt.

**Fix-Rest:** FinderSystem/TerminalSystem nur im compat-Adapter bzw. in bewusst unterstützten Legacy-Wrappern verwenden; verbleibende UI-Calls außerhalb der Menubar weiter zu Window-Klassen + ActionBus migrieren.

---

### Achse 4: Session Persistence (Kritikalität: **🟠 MITTEL**)

**Dual-Key Storage-System:**

| Key                    | Datei           | Inhalt                 | Nutzung                       |
| ---------------------- | --------------- | ---------------------- | ----------------------------- |
| `openModals` (Legacy)  | storage.ts Z.26 | Dialog-IDs, Positionen | Fallback wenn kein MW-Session |
| `multi-window-session` | storage.ts      | Modern Window-States   | Aktuell: Canonical            |

**Konflikt-Guard (storage.ts Z.32–47):**

```ts
const MULTI_WINDOW_CONFLICT_MODAL_IDS = [
    'finder-modal',
    'terminal-modal',
    'text-modal',
    'image-modal',
    'about-modal',
    'settings-modal',
];
```

Diese Modals werden **nicht** aus `openModals` wiederhergestellt, wenn `multi-window-session` existiert.
Das ist ein Symptom von loser Kopplung — zwei Systeme konkurrieren um denselben State.

**Quantifizierung (openModals-Nutzung):**

- `ui/actions/windows.ts`: 6 Zugriffe (Fenster öffnen/schließen)
- `ui/dialog.ts`: 4 Zugriffe (saveOpenModals beim Dialog-Close)
- `services/storage.ts`: 4 Zugriffe (Restore-Logik)
- `core/api.ts`: 4 Wrapper-Definitionen

**Fix:** `multi-window-session` als Single Source of Truth; `openModals` read-only für Legacy-Migrationen.

---

## Single-Owner-Muster (Guardrail gegen neue parallele Systeme)

**Ziel:** Verhindern, dass neue Entwickler während Migration versehentlich ein **fünftes** paralleles System bauen.

Für jede Achse genau einen **Owner** definieren:

| Achse               | Owner                  | Do's                                      | Do NOT's                                       |
| ------------------- | ---------------------- | ----------------------------------------- | ---------------------------------------------- |
| **Readiness**       | `core/app-init.ts`     | Set `__APP_READY` hier; Orchestriere Init | Kein Poll in HTML; keine neuen Ready-Checker   |
| **Window Mgmt**     | `WindowRegistry`       | Alle neuen Windows dort; Use `BaseWindow` | Kein neues globals-Bag; kein `window.dialogs`  |
| **Finder/Terminal** | `FinderWindow/View`    | Moderne Klassen verwenden                 | Kein neuer System.\* global; compat nur Bridge |
| **Session Persist** | `multi-window-session` | Multi-window State als Canonical          | Kein neuer Restore-Mechanismus                 |

**Adapter sind erlaubt, aber begrenzt:**

- `compat/instance-shims.ts`: Nur FinderInstanceManager/TerminalInstanceManager/TextEditorInstanceManager
- `compat/expose-globals.ts`: Nur IIFE-Bundle-Entry, keine neue Logik
- `core/api.ts`: Nur Legacy-Wrapper für existierende Funktionen, nicht für neue APIs

Neue Code-Dateien dürfen **nicht**:

- `window.FinderSystem`, `window.TerminalSystem`, `window.TextEditorSystem` direkt verwenden (außer in `compat/`)
- `window.dialogs` nutzende Code schreiben (außer in genuinen Dialog-Komponenten, und dann nur read)
- Neue `__XXX_READY` oder `__APP_STATE` Globals einführen

---

## Gesamtbewertung

| Schicht                              | Typ                                  | Aufwand                                         |
| ------------------------------------ | ------------------------------------ | ----------------------------------------------- |
| `compat/expose-globals.ts`           | Design (Bundle-Entry) — kein Problem | —                                               |
| `compat/instance-shims.ts`           | Übergangsbrücke                      | Bleibt vorerst wegen Legacy-Konsumenten         |
| `window.getDockReservedBottom` (12×) | Technische Schuld                    | **Abgeschlossen (30. März 2026)**               |
| `openModals`-Doppelsystem            | Technische Schuld                    | **Mittel–Hoch** — unabhängig von About/Settings |
| `index.html` InstanceManager-Poll    | Technische Schuld                    | **Abgeschlossen (Phase 0)**                     |

### Empfohlene Reihenfolge (4-Phasen-Migration)

**Phase 0: Readiness Unification** ✅ **abgeschlossen (28. März 2026)**

- HTML-Monitor 1: InstanceManager-Abhängigkeit entfernt
- HTML-Monitor 2: entfernt als Readiness-Setter (nur noch UI-Fallback)
- Einziger \_\_APP_READY-Setter: app-init.ts
- Desktop-Icon-Fallback in app-init.ts zentralisiert
- **Ergebnis:** Single-Owner für Readiness ist jetzt technisch durchgesetzt.

**Phase 1: Finder/Terminal Action Migration + Menubar-Entkopplung**

- context-menu.ts Z.151+: FinderSystem.openItem() → FinderWindow-API oder ActionBus
- ui/actions/finder.ts: Alle FinderSystem.\* Calls migrieren
- ui/desktop.ts: FinderSystem.navigateTo() → FinderWindow-API
- **Abhängig von:** Phase 0 (optional, aber ideal).
- **Risiko:** Mittel (UI-Verhalten muss identisch bleiben). **Aufwand:** Mittel–Hoch.

**Status-Update (28. März 2026):**

- ✅ `src/ts/ui/context-menu.ts` nutzt für Finder-Aktionen jetzt primär ActionBus-Dispatch (`finder:openItem`, `finder:setViewMode`, `finder:setSortBy`, `finder:navigateToPath`) statt direkter `FinderSystem.*` Mutationen.
- ✅ Browser-Verifikation: `ActionBus.execute('finder:setViewMode', { viewMode: 'grid' })` aktualisiert den Finder-State erwartungsgemäß.
- ✅ `src/ts/ui/desktop.ts` nutzt für den Projekte-Shortcut die Finder-Navigation via ActionBus (`finder:switchView`) statt direktem `FinderSystem.navigateTo(...)`.
- ✅ `src/ts/ui/actions/finder.ts` ist jetzt `FinderWindow`-first (WindowRegistry/FinderWindow), mit Legacy-Fallback für Altpfade.
- ✅ `src/ts/ui/context-menu.ts` liest Finder-State jetzt über WindowRegistry/FinderWindow-Snapshot (kein direkter `FinderSystem`-Read mehr).
- ✅ **Permanente Bereinigung:** verbleibende Legacy-Fallbacks in `src/ts/ui/actions/finder.ts` entfernt.
- ✅ `src/ts/ui/actions/finder.ts` enthält keine direkte `FinderSystem`-Abhängigkeit mehr.
- ✅ `src/ts/ui/menu.ts` rendert die Menubar jetzt ausschließlich aus `MenuRegistry`-Contributions; app-spezifische Legacy-Builder und Menufallbacks sind entfernt.
- ✅ `src/ts/core/api.ts` exponiert keinen ungenutzten `API.finder`-Proxy mehr.
- ✅ Smoke-Test vorhanden: Registry-basierter Menubar-Render wird in Playwright abgesichert.
- ✅ Der verbleibende globale `FinderSystem`-Shim lebt jetzt explizit in `src/ts/compat/instance-shims.ts`; `src/ts/apps/finder/finder-window.ts` liefert dafür nur noch die aktive FinderView-Anbindung.
- ✅ Produktive `FinderSystem`-Treffer in `src/ts` sind damit auf Compat-Schicht, Typdefinition und eine gezielte FinderView-Hilfsmethode eingegrenzt.
- ✅ `src/ts/apps/finder/finder-view.ts` öffnet Textdateien jetzt nur noch über `TextEditorWindow.focusOrCreateWithDocument(...)`; der direkte Fallback auf `window.TextEditorSystem.loadRemoteFile(...)` ist aus dem produktiven Finder-Pfad entfernt.
- ✅ `src/ts/core/app-init.ts` initialisiert den Legacy-`TextEditorSystem` nicht mehr proaktiv beim App-Start.
- ✅ `src/ts/core/api.ts`: ungenutzter `API.textEditor`-Proxy (8 `callWindowMethod`-Wraps auf `TextEditorSystem`) entfernt — kein Caller in `src/ts`.
- ✅ `src/ts/windows/window-configs.ts`: Legacy-Fallback `TextEditorSystem.init()` entfernt; Primary-Path via `TextEditorInstanceManager` ist ausreichend.
- ✅ `src/ts/core/app-init.ts`: `__TerminalSystem`-Alias-Exposition entfernt (kein Caller); `'TerminalSystem'` aus der retry-Exposure-Liste entfernt.
- ✅ `src/ts/core/globals.d.ts`: verwaiste Typ-Blöcke für `TerminalSystem` und `TextEditorSystem` entfernt.
- ✅ **Phase 1 abgeschlossen.** Verbleibende Legacy-Module (`text-editor.ts`, `terminal.ts`) gehören zur Compat-Quelle — Cleanup in Phase 4.

**Phase 2: Dialog System Replacement** ← **läuft (Start erfolgt)**

- ✅ `src/ts/ui/actions/windows.ts`: `openAbout`/`openSettings` nutzen keine `dialogs[...]`-Opens mehr, sondern einen Registry-first + Legacy-Modal-Fallback-Bridge-Pfad.
- ✅ `src/ts/ui/context-menu.ts`: About/Settings laufen jetzt über ActionBus (`openAbout`/`openSettings`) statt direkter `openModal('about-modal'|'settings-modal')`-Aufrufe.
- ✅ `src/ts/ui/context-menu.ts`: `openModal()` erzeugt/öffnet keine `window.dialogs`-Instanzen mehr; Fallback läuft über `WindowManager` bzw. direkten DOM-Show-Pfad.
- ✅ `src/ts/services/system.ts`: Quick-Aktionen (`open-network`, `open-bluetooth`, `open-sound`) öffnen Settings ohne direkten `dialogs['settings-modal']`-Zugriff (ActionBus-first, WindowManager-Fallback).
- ✅ `src/ts/ui/actions/windows.ts`: Launchpad-Toggle schließt über `WindowManager.close('launchpad-modal')` statt `dialogs['launchpad-modal'].close()`.
- ✅ `src/ts/ui/launchpad.ts`: Öffnen/Schließen nutzt keinen `window.dialogs`-Pfad mehr (WindowManager-first + DOM-Fallback).
- ✅ `src/ts/ui/dialog-utils.ts`: `bringDialogToFront`/`bringAllWindowsToFront` nutzen WindowManager-first statt `window.dialogs`.
- ✅ `src/ts/ui/dock.ts`: Minimized-Restore liest/öffnet keine `window.dialogs`-Instanzen mehr; Legacy-Restore läuft über `WindowManager`.
- ✅ `src/ts/services/program-actions.ts`: Texteditor-Iframe-Lookup ist DOM-basiert (`#text-modal`) statt `dialogs['text-modal']`.
- ✅ `src/ts/services/program-menu-sync.ts`: Program-Info-Fallback nutzt `WindowManager.open(...)` + `bringDialogToFront` statt direktem dialogs-Objektzugriff.
- ✅ `src/ts/core/app-init.ts`: Launchpad-Außenklick-Schließen läuft über `WindowManager.close('launchpad-modal')` statt `dialogs['launchpad-modal'].close()`.
- ✅ `src/ts/services/storage.ts`: Legacy-`openModals`-Restore läuft WindowManager-first + DOM-Fallback; es existieren weiterhin einzelne dialogs-Compat-Zweige.
- ✅ `src/ts/services/storage.ts`: Reset-Pfad nutzt `WindowManager.getAllDialogInstances()` statt `window.dialogs`-Bag für Boundary-Reflow.
- ✅ `src/ts/core/app-init.ts`: Dialoginstanzen werden primär im WindowManager registriert.
- ✅ `src/ts/apps/finder/finder-menus.ts`: `hasAnyVisibleDialog()` prüft Sichtbarkeit jetzt über `WindowRegistry`/`WindowManager` statt `window.dialogs`.
- ✅ `src/ts/ui/legacy-dialog-menus.ts`: Controller-/Visibility-Lookups laufen über `WindowManager` statt `window.dialogs`.
- ✅ Ergebnis: Keine direkten `window.dialogs`-Zugriffe mehr in `src/ts`.
- ✅ `src/ts/apps/about/about-window.ts`: erster echter Dialog-Migrationsschritt als `BaseWindow`-Subklasse (`type: 'about'`) umgesetzt und global exponiert.
- ✅ `src/ts/ui/actions/windows.ts`: `openAbout` nutzt jetzt primär `AboutWindow.focusOrCreate()` und schließt das Legacy-`about-modal` explizit.
- ✅ `src/ts/services/storage.ts`: `about-modal` ist als multi-window-owned markiert, sodass Legacy-`openModals` kein Doppel-About mehr wiederherstellt.
- ✅ `src/ts/apps/settings/settings-window.ts`: Settings ist als `BaseWindow`-Subklasse migriert und per `SettingsWindow.focusOrCreate()` erreichbar.
- ✅ `src/ts/ui/actions/windows.ts`: `openSettings` und `openWindow('settings-modal')` routen auf den BaseWindow-Pfad.
- ✅ `src/ts/services/multi-window-session.ts`: Session-Restore für `about` und `settings` integriert.
- ✅ `src/ts/windows/base-window.ts`: Drag-Handling unterstützt nahtlose (`.draggable-header`) Header in BaseWindow-basierten UIs.
- dock.ts: LEGACY_MODAL_ID_TO_WINDOW_TYPE bleibt nur noch als in-flight Compat-Map (temporär).
- dock.ts: LEGACY_MODAL_ID_TO_WINDOW_TYPE entfernt (30. März 2026).
- **Abhängig von:** verbleibende Legacy-Dialoge (nicht About/Settings).
- **Risiko:** Hoch (Settings ist feature-reich). **Aufwand:** Hoch. **Priorität:** Nach Phase 0 + 1.

**Phase 3: Session Restore Simplification**

- storage.ts: `multi-window-session` als Single Source of Truth
- `openModals` nur noch read-only für Fallback-Migration (1–2 Versionen)
- Entferne MULTI_WINDOW_CONFLICT_MODAL_IDS-Filter (vorher alle Fenster via Phase 1–2 migrieren)

**Status-Update (30. März 2026):**

- ✅ `src/ts/services/storage.ts`: `saveOpenModals()` schreibt nicht mehr, wenn eine gültige `multi-window-session` vorhanden ist (`openModals` damit read-only Fallback bei aktivem Modern-Session-Key).
- ✅ `src/ts/services/storage.ts`: Session-Erkennung für Multi-Window wurde in `hasMultiWindowSessionData()` zentralisiert (shared für Save/Restore).
- ⚠️ Offen: Konflikt-Filter (`MULTI_WINDOW_CONFLICT_MODAL_IDS`) und Dual-Key-Restore bleiben bis zum finalen Single-Source-Umbau aktiv.
- ✅ `restoreOpenModals()` kehrt sofort zurück (Early-Return), wenn `hasMultiWindowSessionData()` true ist.
- ✅ `MULTI_WINDOW_CONFLICT_MODAL_IDS`-Konstante und Filter entfernt (Dead Code nach Early-Return).
- ✅ `src/ts/ui/dock.ts`: `LEGACY_MODAL_ID_TO_WINDOW_TYPE` entfernt — `data-minimized` wurde nie gesetzt.
- **Abhängig von:** Phase 1–2 abgeschlossen (alle Fenster haben moderne Owner).
- **Risiko:** Niedrig. **Aufwand:** Mittel. **Priorität:** Zuletzt.

**Phase 4: Cleanup** (optional, kosmetik)

- `compat/instance-shims.ts` entfernen (wenn Phase 0 + index.html bereinigt)
- `compat/expose-globals.ts` nur noch für IIFE-Bundle (kein neuer Code)
- Dead Legacy-Wrapper aus `core/api.ts` entfernen (z.B. `renderApplicationMenu()`, wenn nicht genutzungsweise)

---

## Kritische Dateien zum Beobachten

Bei jeder Änderung diese Dateien checken:

| Datei                          | Zeilen                | Was beobachten                                                               |
| ------------------------------ | --------------------- | ---------------------------------------------------------------------------- |
| `index.html`                   | 12–67, 1130–1225      | Nur Flag-Init + UI-Fallback (kein Readiness-Setter)                          |
| `src/ts/core/app-init.ts`      | 90–220, 447+, 540–700 | Shim-Install, Post-Init-Retries, \_\_APP_READY-Timing                        |
| `src/ts/services/storage.ts`   | 26, 32–47, 177–240    | Dual-Keys, Conflict-Guard, Restore-Logik                                     |
| `src/ts/ui/context-menu.ts`    | 151+                  | ActionBus-Dispatch + FinderWindow-State-Snapshot                             |
| `src/ts/ui/actions/windows.ts` | 1–360                 | BaseWindow-Routing für About/Settings + Legacy-Fallback-Pfade                |
| `src/ts/ui/menu.ts`            | Datei insgesamt       | Registry-only Renderpfad stabil halten; keine neuen Legacy-Builder einführen |
| `src/ts/ui/dock.ts`            | entfernt              | LEGACY_MODAL_ID_TO_WINDOW_TYPE Map (Phase 3 abgeschlossen)                   |

---
