# MacUI Framework – Komponenten-Dokumentation

Dieses Dokument beschreibt die verfügbaren Komponenten des MacUI Frameworks und deren Verwendung.

## 1. Core

### `BaseComponent<Props, State>`

Die Basisklasse für alle Komponenten.

- `render()`: Muss überschrieben werden und gibt einen `VNode` zurück.
- `setState(newState)`: Aktualisiert den internen State und löst ein Re-Render aus.
- `update(newProps?)`: Löst ein Re-Render aus (optional mit neuen Props).
- `mount(container?)`: Erzeugt das DOM und hängt es optional in einen Container ein.
- `unmount()`: Entfernt das DOM und führt Cleanup durch.

### `FrameworkTab`

Basisklasse für App-Tabs, die das Framework nutzen.

- `createUI()`: Muss überschrieben werden und gibt die Wurzel-Komponente zurück.

---

## 2. Layout

### `AppShell`

Das Grundgerüst einer App.

- `toolbar`: VNode für die obere Leiste.
- `content`: VNode für den Hauptinhalt.

### `SplitView`

Ein Container mit zwei Bereichen und einem Resizer dazwischen.

- `left`: Linker Inhalt.
- `right`: Rechter Inhalt.
- `initialSize`: Startbreite des linken Bereichs.
- `onResize`: Callback bei Breitenänderung.

---

## 3. Navigation

### `Sidebar`

Eine macOS-typische Seitenleiste.

- `groups`: Array von `SidebarGroup` Objekten.
- `activeId`: ID des aktuell ausgewählten Elements.
- `onAction`: Callback bei Klick auf ein Element.

### `Toolbar`

Die obere Aktionsleiste.

- `left`, `center`, `right`: Arrays von VNodes für die jeweiligen Bereiche.

### `Breadcrumbs`

Pfadnavigation.

- `parts`: Array von Pfadsegmenten.
- `onNavigate`: Callback bei Klick auf ein Segment.

---

## 4. Data

### `ListView<T>`

Tabellarische Ansicht von Daten.

- `items`: Daten-Array.
- `columns`: Spaltendefinitionen (`key`, `label`, `render`, `sortable`).
- `onItemClick`, `onItemDblClick`: Event-Handler.

### `GridView<T>`

Icon-basierte Ansicht.

- `items`: Daten-Array.
- `renderItem`: Funktion, die den VNode für ein Item zurückgibt.

### `DataView<T>`

Wrapper, der zwischen List- und Grid-Ansicht umschaltet.

---

## 5. Templates

### `StandardApp`

Ein "All-in-One" Template für Standard-Apps.
Kombiniert `AppShell`, `Toolbar`, `Sidebar` und `SplitView`.

```typescript
const app = new StandardApp({
    id: 'my-app',
    title: 'Meine App',
    sidebarGroups: [...],
    renderContent: () => h('div', {}, 'Inhalt')
});
```
