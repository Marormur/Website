# 🎯 Refactoring: Modulare Architektur

## Übersicht

Dieses Refactoring führt drei neue zentrale Systeme ein, um den Code wartbarer, erweiterbarer und weniger repetitiv zu machen.

## 🆕 Neue Module

### 1. **WindowManager** (`js/window-manager.js`)

Zentrale Verwaltung aller Fenster/Modals im System.

**Funktionen:**

- Fenster-Registrierung mit Metadaten
- Automatische z-Index Verwaltung
- Programm-Info Verwaltung
- Zugriff auf Dialog-Instanzen

**Verwendung:**

```javascript
// Fenster registrieren
WindowManager.register({
    id: 'my-modal',
    type: 'persistent', // oder 'transient'
    programKey: 'programs.myApp',
    icon: './img/icon.png',
    closeButtonId: 'close-my-modal',
});

// Fenster öffnen/schließen
WindowManager.open('my-modal');
WindowManager.close('my-modal');

// Oberstes Fenster abrufen
const topWindow = WindowManager.getTopWindow();

// Program-Info abrufen
const info = WindowManager.getProgramInfo('my-modal');
```

**Vorteile:**

- ✅ Keine hart-kodierten Arrays mehr
- ✅ Einfaches Hinzufügen neuer Fenster
- ✅ Zentrale Metadaten-Verwaltung
- ✅ Automatische z-Index Synchronisation

---

### 2. **ActionBus** (`js/action-bus.js`)

Deklaratives Event-System für UI-Aktionen.

**Funktionen:**

- Automatisches Event-Binding via `data-action`
- Zentrale Action-Handler
- Keine manuellen addEventListener mehr

**Verwendung in HTML:**

```html
<!-- Fenster schließen -->
<button data-action="closeWindow" data-window-id="finder-modal">
    Schließen
</button>

<!-- Fenster öffnen -->
<button data-action="openWindow" data-window-id="settings-modal">
    Einstellungen
</button>

<!-- Desktop-Item öffnen -->
<button data-action="openDesktopItem" data-item-id="about">Über Marvin</button>
```

**Custom Actions registrieren:**

```javascript
ActionBus.register('myAction', (params, element) => {
    console.log('Custom action triggered!', params);
    // params enthält alle data-* Attribute
});
```

**Eingebaute Actions:**

- `closeWindow` - Schließt ein Fenster
- `openWindow` - Öffnet ein Fenster
- `closeTopWindow` - Schließt das oberste Fenster
- `resetWindowLayout` - Layout zurücksetzen
- `openProgramInfo` - Program-Info öffnen
- `openAbout` - Über-Dialog öffnen
- `openSettings` - Einstellungen öffnen
- `openDesktopItem` - Desktop-Item öffnen

**Vorteile:**

- ✅ Weniger Boilerplate-Code
- ✅ Deklarative Event-Bindung
- ✅ Einfache Erweiterbarkeit
- ✅ Zentrale Action-Verwaltung

---

### 3. **API** (`js/api.js`)

Saubere Schnittstelle zu allen Modulen.

**Funktionen:**

- Konsistenter Zugriff auf alle Module
- Automatische Fehlerbehandlung
- Legacy-Kompatibilität

**Verwendung:**

```javascript
// Theme
API.theme.setPreference('dark');
const pref = API.theme.getPreference();

// Window
API.window.open('finder-modal');
API.window.close('settings-modal');
const topWindow = API.window.getTopWindow();

// Dock
const bottom = API.dock.getDockReservedBottom();

// Menu
API.menu.hideMenuDropdowns();

// System
API.system.setConnectedNetwork('WiFi', { auto: true });

// Storage
API.storage.saveOpenModals();
API.storage.restoreWindowPositions();

// I18n
const text = API.i18n.translate('key', 'fallback');
```

**Vorteile:**

- ✅ Keine vielen Wrapper-Funktionen mehr
- ✅ Konsistente API
- ✅ Auto-Completion in IDEs
- ✅ Legacy-Support bleibt erhalten

---

### 4. **Window Configurations** (`js/window-configs.js`)

Zentrale Konfigurationsdatei für alle Fenster.

**Verwendung:**

```javascript
// Neues Fenster hinzufügen - einfach zur Liste hinzufügen:
{
    id: 'calculator-modal',
    type: 'persistent',
    programKey: 'programs.calculator',
    icon: './img/calculator.png',
    closeButtonId: 'close-calculator-modal',
    metadata: {
        iframeUrl: './calculator.html'  // Optional
    }
}
```

**Vorteile:**

- ✅ Alle Fenster-Definitionen an einem Ort
- ✅ Einfaches Hinzufügen neuer Fenster
- ✅ Klare Struktur
- ✅ Keine Änderungen an app.js nötig

---

## 🔄 Migration bestehender Code

### Alt (viele Wrapper-Funktionen):

```javascript
function setThemePreference(pref) {
    if (window.ThemeSystem?.setThemePreference) {
        return window.ThemeSystem.setThemePreference(pref);
    }
}
// ... 50+ weitere ähnliche Funktionen
```

### Neu (zentrale API):

```javascript
// Direkt über API-Objekt:
API.theme.setPreference('dark');

// Oder Legacy-Funktionen (werden automatisch erstellt):
setThemePreference('dark'); // funktioniert weiterhin!
```

---

### Alt (manuelle Event-Handler):

```javascript
const closeButton = document.getElementById('close-finder-modal');
closeButton.addEventListener('click', function (e) {
    e.preventDefault();
    window.dialogs['finder-modal'].close();
    saveOpenModals();
    updateDockIndicators();
});
```

### Neu (deklarativ):

```html
<button data-action="closeWindow" data-window-id="finder-modal">
    Schließen
</button>
```

---

### Alt (hart-kodierte Modal-IDs):

```javascript
var modalIds = [
    'finder-modal',
    'projects-modal',
    'about-modal',
    'settings-modal',
    'text-modal',
    'image-modal',
];
```

### Neu (automatisch aus Registry):

```javascript
// In window-configs.js einfach hinzufügen:
windowConfigurations.push({
    id: 'neues-fenster-modal',
    // ... weitere Config
});

// Automatisch verfügbar:
const allWindows = WindowManager.getAllWindowIds();
```

---

## 📦 Gelöschter/Vereinfachter Code

### Entfernt aus `app.js`:

- ❌ ~150 Zeilen Wrapper-Funktionen
- ❌ `programInfoDefinitions` (jetzt in window-configs.js)
- ❌ Hart-kodierte `modalIds` Arrays
- ❌ Repetitive Event-Handler für Close-Buttons
- ❌ Duplizierte z-Index Logik

### Neu in `app.js`:

- ✅ Kompakte Initialisierung
- ✅ WindowManager Integration
- ✅ ActionBus Integration
- ✅ Fallback für Legacy-Code

---

## 🚀 Neues Fenster hinzufügen

### Vorher (5 Schritte):

1. Modal-ID zu `modalIds` Array hinzufügen
2. ProgramInfo zu `programInfoDefinitions` hinzufügen
3. Close-Button Handler in `initEventHandlers` hinzufügen
4. Dialog-Instanz in DOMContentLoaded erstellen
5. Optional: Desktop-Item Config hinzufügen

### Jetzt (1 Schritt):

```javascript
// In window-configs.js:
{
    id: 'neues-fenster-modal',
    type: 'persistent',
    programKey: 'programs.neuApp',
    icon: './img/neuapp.png',
    closeButtonId: 'close-neues-fenster-modal'
}
```

Fertig! 🎉

---

## 🔧 Bestehender Code

Alle bestehenden Funktionen bleiben kompatibel:

- `bringDialogToFront(id)` ✅
- `getTopModal()` ✅
- `updateProgramLabel(label)` ✅
- `resolveProgramInfo(modalId)` ✅
- Alle Modul-Funktionen (via API oder Legacy) ✅

---

## 📝 Zusammenfassung

### Vorteile des Refactorings:

1. **Weniger Code** - ~200 Zeilen gespart
2. **Mehr Flexibilität** - Neue Fenster in Sekunden hinzufügen
3. **Bessere Wartbarkeit** - Zentrale Konfiguration
4. **Sauberere Struktur** - Separation of Concerns
5. **Zukunftssicher** - Einfache Erweiterung für neue Features
6. **100% Rückwärtskompatibel** - Alter Code funktioniert weiterhin

### Code-Reduktion:

- **app.js**: ~1800 → ~1600 Zeilen (-200)
- **Neue Module**: ~800 Zeilen
- **Netto**: Mehr Funktionalität bei ähnlicher Gesamtgröße
- **Wartbarkeit**: 🚀🚀🚀

---

## 🎓 Best Practices

### Neue Fenster hinzufügen:

```javascript
// 1. In window-configs.js registrieren
// 2. HTML mit data-action Attributen versehen
// 3. Fertig!
```

### Custom Actions:

```javascript
// Custom Action registrieren
ActionBus.register('myCustomAction', (params, element) => {
    // params = alle data-* Attribute außer data-action
    console.log('Triggered with:', params);
});

// In HTML verwenden
<button data-action="myCustomAction" data-value="test">
    Click
</button>;
```

### API nutzen:

```javascript
// Bevorzugt: Über API-Objekt
API.window.open('finder-modal');

// Legacy (funktioniert auch):
openDesktopItemById('finder');
```

---

## 🐛 Debugging

```javascript
// Alle registrierten Fenster anzeigen
console.log(WindowManager.getAllWindowIds());

// Fenster-Konfiguration prüfen
console.log(WindowManager.getConfig('finder-modal'));

// Aktuelles Top-Window
console.log(WindowManager.getTopWindow());

// Alle Actions
console.log(ActionBus);
```

---

## 📚 Weitere Schritte

Mögliche zukünftige Verbesserungen:

1. **HTML vereinfachen** - Close-Buttons mit data-action umstellen
2. **Menu-System** - Könnte auch ActionBus nutzen
3. **Dock-System** - Integration mit WindowManager
4. **Plugin-System** - Fenster als eigenständige Plugins
5. **TypeScript** - Type-Safety für API

---

**Erstellt**: 2025-10-24  
**Version**: 3.0  
**Status**: ✅ Produktionsbereit
