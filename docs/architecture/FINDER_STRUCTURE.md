# Finder System - Architektur Übersicht

## Aktuelle Implementierung (Oktober 2025)

Das Finder-System nutzt das **moderne Multi-Window/Tab-System** mit VirtualFS-Integration.

### Aktive Komponenten

```
FinderWindow (BaseWindow)
    ↓
FinderView (BaseTab) × n Tabs
    ↓
VirtualFS (shared singleton)
```

## Dateien & Verantwortlichkeiten

### 1. `finder-window.ts` - Window Container

**Typ:** `BaseWindow` Subklasse
**Zweck:** Container für mehrere Finder-Tabs

**Verantwortlichkeiten:**

- Window-Chrome (Titelleiste, Schließen-Button)
- Tab-Leiste rendern (via `WindowTabs`)
- Tab-Management (erstellen, schließen, wechseln)
- Integration mit `FinderView`

**Key Features:**

- Nutzt `BaseWindow` für Fenster-Funktionalität
- Delegiert Tab-Rendering an `WindowTabs`
- Speichert State aller Tabs

### 2. `finder-view.ts` - Tab Implementation

**Typ:** `BaseTab` Subklasse
**Zweck:** Ein einzelner Finder-Tab

**Verantwortlichkeiten:**

- Sidebar (Home, Computer, Recent, GitHub, Starred)
- Toolbar (Navigation, View-Mode, Search, New File/Folder)
- Breadcrumbs
- Content-Area (List/Grid View)
- VirtualFS-Integration für "Computer"-Ansicht
- GitHub-Integration
- Favorites & Recent Files

**Sources (Views):**

- `computer` - VirtualFS-Dateisystem
- `github` - GitHub Repositories
- `recent` - Zuletzt geöffnete Dateien
- `starred` - Favoriten

**View Modes:**

- `list` - Tabellenansicht
- `grid` - Kachelansicht

### 3. `finder-instance.ts` - Legacy Compatibility

**Typ:** `BaseWindowInstance` (alt)
**Status:** ⚠️ Legacy-Kompatibilität
**Zweck:** Ermöglicht alten Code, der `BaseWindowInstance` erwartet

**Wird genutzt von:**

- Multi-Instance-System (falls aktiviert)
- Backward-Kompatibilität mit altem Code

**Hinweis:** Identische Features wie `finder-view.ts`, aber auf `BaseWindowInstance` statt `BaseTab` aufbauend.

### 4. `finder.ts` - Alt (Deaktiviert)

**Status:** ❌ Nicht mehr aktiv
**Zweck:** Originaler monolithischer Finder

**Deaktiviert in:**

- `app-init.ts` (Zeile 229): "DISABLED: Using Multi-Window FinderWindow instead"
- `dialog.ts` (Zeile 110): "use Multi-Window FinderWindow instead of legacy system"

## Aktuelles System (Empfohlen)

### Verwendung

```typescript
// Neues Finder-Fenster erstellen
if (window.FinderWindow?.create) {
    window.FinderWindow.create();
}
```

### Architektur-Flow

```
1. User klickt "Finder" Icon
   ↓
2. FinderWindow.create() wird aufgerufen
   ↓
3. Neues FinderWindow (BaseWindow) wird erstellt
   ↓
4. Erster FinderView (BaseTab) wird automatisch hinzugefügt
   ↓
5. FinderView rendert:
   - Sidebar (Home, Computer, GitHub, etc.)
   - Toolbar (Back, Forward, New File/Folder, View Toggle)
   - Content (VirtualFS oder GitHub)
   ↓
6. User kann weitere Tabs via "+" Button erstellen
   ↓
7. Jeder Tab = unabhängige FinderView-Instanz
```

## VirtualFS-Integration

### Beide aktive Finder nutzen VirtualFS

**finder-view.ts:**

```typescript
import { VirtualFS } from './virtual-fs.js';

getComputerItems(): FileItem[] {
    const path = this.currentPath.length === 0
        ? ['Computer']
        : ['Computer', ...this.currentPath];
    const items = VirtualFS.list(path);
    return Object.entries(items).map(([name, item]) => ({
        name,
        type: item.type,
        icon: item.icon,
        // ...
    }));
}
```

**finder-instance.ts:**

```typescript
import { VirtualFS } from './virtual-fs.js';

getComputerItems(): FileItem[] {
    const path = this.currentPath.length === 0
        ? ['Computer']
        : ['Computer', ...this.currentPath];
    const record = VirtualFS.list(path);
    return Object.entries(record).map(([name, item]) => ({
        name,
        type: item.type,
        // ...
    }));
}
```

### Shared Features (identisch in beiden)

✅ **Sidebar:**

- 🏠 Home (neu!)
- 💻 Computer
- 🕒 Zuletzt verwendet
- 📂 GitHub Projekte
- ⭐ Markiert

✅ **Toolbar:**

- ← Zurück
- → Vorwärts (Root)
- Breadcrumbs
- +📄 Neue Datei
- +📁 Neuer Ordner
- List/Grid Toggle
- Suche

✅ **VirtualFS Operations:**

- `VirtualFS.list()` - Liste Ordnerinhalte
- `VirtualFS.createFile()` - Neue Datei
- `VirtualFS.createFolder()` - Neuer Ordner
- Event-Listener für Auto-Refresh

## State Management

### FinderWindow State

```typescript
{
    id: string,
    title: string,
    position: { x, y },
    size: { width, height },
    zIndex: number,
    tabs: [
        { id, title, source, currentPath, ... },
        { id, title, source, currentPath, ... }
    ],
    activeTabId: string
}
```

### FinderView State (pro Tab)

```typescript
{
    id: string,
    title: string,
    source: 'computer' | 'github' | 'recent' | 'starred',
    currentPath: string[],
    viewMode: 'list' | 'grid',
    sortBy: 'name' | 'date' | 'size' | 'type',
    sortOrder: 'asc' | 'desc',
    favorites: string[],
    recentFiles: RecentFile[]
}
```

## Migration Path (Falls nötig)

### Von finder.ts (alt) → FinderWindow + FinderView (neu)

**Alt:**

```javascript
// Legacy monolithischer Finder
window.Finder.init();
window.Finder.navigateTo(...);
```

**Neu:**

```typescript
// Multi-Window System
window.FinderWindow.create();
// Jedes Fenster = eigenständige Instanz
// Jeder Tab = eigenständige View
```

## Testing

### E2E Tests decken ab:

- `finder-tabs.spec.js` - Tab-Management
- `finder-session-restore.spec.js` - State Persistence
- `finder-multi-instance-basic.spec.js` - Multi-Instance
- `finder-github.spec.js` - GitHub Integration
- `finder-selection.spec.js` - Item-Selection
- `finder-new-features.spec.js` - Neue Features

## Zusammenfassung

| Feature      | finder-view.ts    | finder-instance.ts | finder.ts      |
| ------------ | ----------------- | ------------------ | -------------- |
| Status       | ✅ Aktiv (primär) | ⚠️ Legacy-Compat   | ❌ Deaktiviert |
| Basis        | BaseTab           | BaseWindowInstance | Monolith       |
| Multi-Window | ✅ Ja             | ✅ Ja              | ❌ Nein        |
| Multi-Tab    | ✅ Ja             | ❌ Nein            | ❌ Nein        |
| VirtualFS    | ✅ Ja             | ✅ Ja              | ❌ Nein        |
| Home-Button  | ✅ Ja             | ✅ Ja              | ❌ Nein        |
| GitHub       | ✅ Ja             | ✅ Ja              | ✅ Ja          |

**Empfehlung:** Nutze `FinderWindow` + `FinderView` für neue Features. `finder-instance.ts` nur für Kompatibilität behalten.

---

**Erstellt:** 31. Oktober 2025
**Letztes Update:** VirtualFS + Home-Button Integration
