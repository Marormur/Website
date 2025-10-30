# Finder – Neue Implementierung (FinderWindow/FinderView)

Der neue Finder besteht aus einem Fenster (`FinderWindow`) und einem oder mehreren Tabs (`FinderView`). Jeder Tab hält seinen eigenen Pfad/Modus/Suchzustand und aktualisiert sein Tab-Label dynamisch, sodass immer der aktuelle Ordner sichtbar ist.

## Komponenten

- `FinderWindow`
    - Leitet von `BaseWindow` ab und verwendet `WindowTabs` als Tabbar.
    - Kann mehrere `FinderView`-Instanzen beherbergen (Multi-Tab).

- `FinderView` (`src/ts/finder-view.ts`)
    - Leitet von `BaseTab` ab und implementiert die eigentliche Dateiansicht:
        - Sidebar (Computer, GitHub, Zuletzt, Markiert)
        - Toolbar (Back/Forward, Breadcrumbs, Sortierung, Ansichtsmodus, Suche)
        - Content (Liste/Raster; Columns optional vorgesehen)
    - Speichert seinen Zustand in `contentState` und ruft bei Änderungen `_persistState()` auf.
    - Ermittelt das Tab-Label kontextabhängig: Root → „Computer“/„GitHub“; sonst letzter Pfadteil.

## GitHub-Integration

`FinderView` lädt Repositories und Inhalte über `window.GitHubAPI` (falls vorhanden) und ergänzt dies um einen kleinen In‑Memory‑TTL‑Cache. So bleibt Navigation schnell und vermeidet unnötige Requests.

Cache-Schichten (Fall-through):

1. In‑Memory (`githubContentCache`)
2. API-Cache (`GitHubAPI.readCache`) – falls verfügbar
3. Netzwerkanfrage (`GitHubAPI.fetchUserRepos/fetchRepoContents`)

## Interaktion & Events

- Item‑Selektion unterstützt Mehrfachauswahl (Shift/Ctrl) in der alten Finder‑Instanz; die neue „FinderView“ konzentriert sich zunächst auf Single‑Select + Dbl‑Click zum Öffnen.
- Doppelklick auf Ordner → `navigateToFolder(name)`; Dateien können perspektivisch an passende Apps (Editor/Bildanzeige) gereicht werden.

## Persistenz

`FinderView.serialize()` erzeugt die Daten für Session‑Restore (Pfad, Ansicht, Sortierung, Favoriten, Recent Files). Der zugehörige Fensterzustand (Layout, aktive Tabs) kommt aus `BaseWindow.serialize()`.

## Styling

Stile für Finder finden sich in `style.css` unter „Finder Styles“. Das neue Toolbar‑Layout entspricht dem alten Finder (Pfeil‑Icons, Breadcrumbs mittig, View‑Buttons und Suche rechts).
