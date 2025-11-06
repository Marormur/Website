# Finder + Virtual File System

Der Finder nutzt das zentrale **Virtual File System (VirtualFS)** für die "Computer"-Ansicht. Dadurch werden Dateien und Ordner persistent gespeichert und sind auch im Terminal sichtbar.

## Features

### 🔄 Shared State

- Finder und Terminal teilen sich dasselbe VirtualFS
- Änderungen sind sofort in beiden Apps sichtbar
- Automatische Event-getriebene UI-Aktualisierung

### 📁 File Operations

**Im Finder:**

- ✅ Neue Datei erstellen (Toolbar-Button "+📄")
- ✅ Neuer Ordner erstellen (Toolbar-Button "+📁")
- ✅ Navigation durch Ordnerstruktur (Doppelklick auf Ordner)
- ✅ Breadcrumbs für schnelle Navigation
- ✅ List/Grid View Toggle

**Im Terminal:**

- `ls` - Liste Dateien und Ordner
- `cd <ordner>` - Wechsle Verzeichnis
- `touch <datei>` - Erstelle Datei
- `mkdir <ordner>` - Erstelle Ordner
- `rm <pfad>` - Lösche Datei/Ordner
- `cat <datei>` - Zeige Dateiinhalt
- `pwd` - Zeige aktuelles Verzeichnis

## Implementierung

### Finder Integration

```typescript
// src/ts/finder-instance.ts
import { VirtualFS } from './virtual-fs.js';

// Ordnerinhalte laden
getComputerItems(): FileItem[] {
    const path = this.currentPath.length === 0
        ? ['Computer']
        : ['Computer', ...this.currentPath];
    const record = VirtualFS.list(path);
    return Object.entries(record).map(([name, item]) => ({
        name,
        type: item.type,
        icon: item.icon,
        // ...
    }));
}

// Neue Datei erstellen
createNewFile(): void {
    const name = prompt('Dateiname:');
    if (!name) return;

    const path = this.currentPath.length === 0
        ? ['Computer', name]
        : ['Computer', ...this.currentPath, name];

    VirtualFS.createFile(path, '', '📝');
    // Event triggert automatisch UI-Refresh
}
```

### Event-Driven Updates

```typescript
// Finder hört auf VirtualFS-Änderungen
VirtualFS.addEventListener(event => {
    if (this.currentView === 'computer') {
        this.renderContent(); // Refresh UI
    }
});
```

## Pfadstruktur

### VirtualFS Root

```
Computer/
├── Documents/
│   ├── README.md
│   └── notes.txt
├── Downloads/
├── Pictures/
└── Music/
```

### Finder Path Mapping

- Finder `currentPath: []` → VirtualFS `['Computer']`
- Finder `currentPath: ['Documents']` → VirtualFS `['Computer', 'Documents']`
- Finder `currentPath: ['Documents', 'Work']` → VirtualFS `['Computer', 'Documents', 'Work']`

## User Workflow

1. **Finder öffnen** (Desktop-Icon "Computer")
2. **Neue Datei erstellen:**
    - Klick auf "+📄" Button in Toolbar
    - Name eingeben → Datei erscheint in der Liste
3. **Neuen Ordner erstellen:**
    - Klick auf "+📁" Button in Toolbar
    - Name eingeben → Ordner erscheint in der Liste
4. **Navigation:**
    - Doppelklick auf Ordner → öffnet Ordner
    - "Zurück" Button (←) → eine Ebene höher
    - Breadcrumbs → direkt zu übergeordnetem Ordner springen
5. **Terminal öffnen** und Änderungen sehen:
    ```bash
    ls                    # Zeigt dieselben Dateien/Ordner
    touch test.txt        # Datei erscheint sofort im Finder
    mkdir Projects        # Ordner erscheint sofort im Finder
    ```

## Persistenz

- Alle Änderungen werden automatisch in `localStorage` gespeichert
- Debounced Auto-Save (1 Sekunde nach letzter Änderung)
- Beim nächsten Seitenaufruf sind alle Dateien/Ordner noch da

## View Modes

**List View:**

- Tabellenansicht mit Name, Größe, Geändert
- Sortierung nach Name/Datum/Größe
- Klick auf Spaltenüberschrift zum Sortieren

**Grid View:**

- Kachelansicht mit großen Icons
- Gut für viele Dateien/Ordner
- Doppelklick zum Öffnen

## Weitere Ansichten

Neben "Computer" (VirtualFS) bietet der Finder:

- **GitHub Projekte** - Repositories von Marormur
- **Zuletzt geöffnet** - Kürzlich genutzte Dateien
- **Mit Stern** - Favoriten

## Debugging

Browser Console (F12):

```javascript
// VirtualFS erkunden
VirtualFS.list('Computer');
VirtualFS.list('Computer/Documents');

// Datei lesen
VirtualFS.readFile('Computer/Documents/README.md');

// Stats
VirtualFS.getStats();

// Export/Import
const backup = VirtualFS.export();
VirtualFS.import(backup);

// Reset to defaults
VirtualFS.reset();
```

## Future Enhancements

- [ ] Datei-Umbenennen per Context-Menu
- [ ] Drag & Drop zum Verschieben
- [ ] Kopieren/Einfügen
- [ ] Datei-Editor Integration (TextEditor öffnet VirtualFS-Dateien)
- [ ] File-Upload aus lokalem Filesystem
- [ ] Download als ZIP

---

**Siehe auch:**

- [VIRTUAL_FS_USAGE.md](./VIRTUAL_FS_USAGE.md) - Vollständige VirtualFS API
- [FINDER.md](./FINDER.md) - Finder-Dokumentation
- [docs/README.md](../README.md) - Dokumentations-Index
