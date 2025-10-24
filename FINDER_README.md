# Finder - Erweiterte Dateimanager-Funktionalität

## Übersicht

Der **Finder** ist jetzt der zentrale Dateimanager mit integrierter GitHub-Projekte-Ansicht. Das separate GitHub-Projekte-Fenster bleibt technisch verfügbar, wird aber über den Finder aufgerufen.

## Neue Struktur

### 🗂️ Finder (Hauptfenster)
Der Finder ist das zentrale Dateimanagement-Tool:

#### Sidebar-Navigation
- **💻 Computer** - Virtuelle Ordnerstruktur (Documents, Downloads, Pictures, Music, Videos)
- **🕒 Zuletzt geöffnet** - Schnellzugriff auf kürzlich geöffnete Dateien
- **📂 GitHub Projekte** - Zugriff auf deine GitHub-Repositories
- **⭐ Mit Stern** - Favoriten/Lesezeichen

#### Desktop & Dock
- **Desktop**: Nur "Über Marvin"-Icon (aufgeräumt!)
- **Dock**: Finder, Texteditor, Bildbetrachter, Einstellungen

## Verwendung

### Finder öffnen
- Klick auf **Finder-Icon** im Dock
- Oder Doppelklick auf Desktop (geplant)

### Navigation
1. **Computer-Ansicht**: Virtuelle Ordner durchsuchen
2. **GitHub-Ansicht**: Klick auf "📂 GitHub Projekte" in der Sidebar
   - Zeigt "Meine GitHub Repositories"
   - Doppelklick öffnet die vollständige Repository-Ansicht

### Ordnerstruktur
```
Computer
├── Documents
│   └── README.md
├── Downloads
├── Pictures
├── Music
└── Videos
```

### Kontextmenü (Rechtsklick)
Der Finder unterstützt ein intelligentes Kontextmenü:

**Auf Dateien/Ordnern:**
- **Öffnen** - Öffnet die Datei oder navigiert in den Ordner
- **Informationen** - Zeigt Datei-/Ordnerdetails (in Entwicklung)

**Im leeren Bereich:**
- **Aktualisieren** - Lädt den aktuellen Ordner neu
- **Als Liste** / **Als Raster** - Wechselt zwischen Ansichtsmodi
- **Nach Name sortieren** - Sortiert Elemente alphabetisch
- **Nach Datum sortieren** - Sortiert nach Änderungsdatum
- **Nach Größe sortieren** - Sortiert nach Dateigröße

## Technische Details

### Änderungen gegenüber vorheriger Version
1. ✅ Desktop-Icons reduziert (nur "Über Marvin")
2. ✅ Projekte-Icon aus Dock entfernt  
3. ✅ GitHub-Integration in Finder
4. ✅ Finder als Hauptzugriffspunkt

### Bekannte Einschränkungen
- i18n-Übersetzungen werden bei dynamischer Dialog-Erstellung nicht sofort angewendet
- Breadcrumbs zeigen manchmal doppelte Pfadteile
- Projects-Modal z-index kann mit Finder überlappen

### Dateien
- `js/finder.js` - Finder-Logik
- `js/desktop.js` - Desktop-Icons (reduziert)
- `index.html` - Finder & Projects-Modal
- `app.js` - Dialog-Initialisierung

## Geplante Verbesserungen

### Kurzfristig
- [ ] i18n-Übersetzungen beim Dialog-Open anwenden
- [ ] Breadcrumb-Duplikate beheben
- [ ] GitHub-Repositories direkt im Finder anzeigen (ohne separates Modal)

### Mittelfristig
- [ ] Datei-Upload per Drag & Drop
- [x] Kontextmenü (Rechtsklick) - Implementiert mit Dateien/Ordner-Aktionen und Ansichtsoptionen
- [ ] Ordner erstellen/umbenennen/löschen
- [ ] Suche implementieren

### Langfristig
- [ ] IndexedDB für persistente Datei-Speicherung
- [ ] Cloud-Integration
- [ ] Erweiterte Dateivorschau
- [ ] Tastatur-Shortcuts

---

**Version:** 2.1 - Integrierte GitHub-Ansicht  
**Aktualisiert:** Oktober 2025  
**Autor:** Marvin Temmen
