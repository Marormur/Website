# Multi-Instance Support Migration Guide

## 📋 Übersicht

Dieser Guide zeigt, wie du bestehende Module (Finder, Terminal, TextEditor, etc.) für Multi-Instance-Support umbauen kannst.

## 🎯 Vorteile

- **Mehrere Fenster gleichzeitig**: Nutzer können mehrere Finder, Terminal oder TextEditor Fenster öffnen
- **Isolierter State**: Jede Instanz hat ihren eigenen State und stört andere nicht
- **Bessere Wartbarkeit**: Klare Trennung von Verantwortlichkeiten
- **Persistierung**: Fenster-States können gespeichert und wiederhergestellt werden

## 🏗️ Architektur

### Neue Komponenten

1. **`BaseWindowInstance`** (`js/base-window-instance.js`)
    - Basis-Klasse für alle Fenster-Instanzen
    - Lifecycle management (init, show, hide, destroy)
    - Event system
    - State management
    - Serialization/Deserialization

2. **`InstanceManager`** (`js/instance-manager.js`)
    - Verwaltet mehrere Instanzen eines Typs
    - Create/Destroy Instanzen
    - Active instance tracking
    - Persistierung

3. **`WindowChrome`** (`js/window-chrome.js`)
    - Wiederverwendbare UI-Komponenten
    - Titlebar, Toolbar, Statusbar
    - Einheitliches Look & Feel

## 🔄 Migration Schritte

### Schritt 1: Singleton zu Instanz-Klasse

**Vorher (Singleton Pattern):**

```javascript
const TerminalSystem = {
    container: null,
    currentPath: '~',
    commandHistory: [],

    init(container) {
        this.container = container;
        // ...
    },
};
```

**Nachher (Instance Pattern):**

```javascript
class TerminalInstance extends BaseWindowInstance {
    constructor(config) {
        super({ ...config, type: 'terminal' });

        // Instance-specific state
        this.currentPath = '~';
        this.commandHistory = [];
    }

    render() {
        // Render UI
    }
}
```

### Schritt 2: Globalen State in Instanz verschieben

**Vorher:**

```javascript
// Globaler State (nur eine Instanz)
const finderState = {
    currentPath: [],
    selectedItems: new Set(),
};
```

**Nachher:**

```javascript
class FinderInstance extends BaseWindowInstance {
    constructor(config) {
        super(config);

        // Pro-Instanz State
        this.finderState = {
            currentPath: config.initialState?.currentPath || [],
            selectedItems: new Set(),
        };
    }
}
```

### Schritt 3: Instance Manager erstellen

```javascript
// Terminal Instance Manager
const TerminalInstanceManager = new InstanceManager({
    type: 'terminal',
    instanceClass: TerminalInstance,
    maxInstances: 0, // Unlimited
    createContainer: instanceId => {
        // Create modal/container for this instance
        const modal = document.createElement('div');
        modal.id = `${instanceId}-modal`;
        modal.className = 'modal';
        document.body.appendChild(modal);
        return modal;
    },
});

// Verwendung
const terminal1 = TerminalInstanceManager.createInstance({
    title: 'Terminal 1',
});

const terminal2 = TerminalInstanceManager.createInstance({
    title: 'Terminal 2',
});
```

### Schritt 4: Render-Methode anpassen

```javascript
class TerminalInstance extends BaseWindowInstance {
    render() {
        if (!this.container) return;

        // Nutze WindowChrome für einheitliche UI
        const { frame, titlebar, content, statusbar } =
            WindowChrome.createWindowFrame({
                title: this.title,
                icon: '💻',
                showClose: true,
                onClose: () => this.hide(),
                showStatusBar: true,
            });

        // Terminal-spezifischer Content
        content.innerHTML = `
            <div class="terminal-output" data-output></div>
            <input type="text" data-input />
        `;

        this.container.appendChild(frame);

        // Cache elements
        this.outputElement = content.querySelector('[data-output]');
        this.inputElement = content.querySelector('[data-input]');
    }
}
```

### Schritt 5: State Persistierung

```javascript
class TerminalInstance extends BaseWindowInstance {
    serialize() {
        return {
            ...super.serialize(),
            currentPath: this.currentPath,
            commandHistory: this.commandHistory,
        };
    }

    deserialize(data) {
        super.deserialize(data);

        if (data.currentPath) {
            this.currentPath = data.currentPath;
        }
        if (data.commandHistory) {
            this.commandHistory = data.commandHistory;
        }
    }
}

// Speichern aller Terminals
const savedState = TerminalInstanceManager.serializeAll();
localStorage.setItem('terminals', JSON.stringify(savedState));

// Wiederherstellen
const savedState = JSON.parse(localStorage.getItem('terminals') || '[]');
TerminalInstanceManager.deserializeAll(savedState);
```

## 📝 Beispiel: Terminal Migration

Siehe `js/terminal-instance.js` für eine vollständige Implementierung.

## 🎨 Best Practices

### 1. State Management

- ✅ Nutze `this.state` aus `BaseWindowInstance`
- ✅ Update State mit `this.updateState({})`
- ❌ Vermeide globale Variablen

### 2. Event Handling

- ✅ Nutze Instance Events: `this.on('event', handler)`
- ✅ Clean up bei destroy: `this.removeAllEventListeners()`
- ❌ Vermeide globale Event Listener ohne Cleanup

### 3. DOM Management

- ✅ Alle DOM-Referenzen in Instance
- ✅ Cleanup in `destroy()` Methode
- ❌ Keine Singleton DOM-Referenzen

### 4. UI Components

- ✅ Nutze `WindowChrome` für Titlebar, Toolbar, Statusbar
- ✅ Einheitliches Styling über alle Fenster
- ❌ Vermeide inkonsistente Custom-Implementierungen

## 🔧 Integration mit bestehendem Code

### Rückwärtskompatibilität

Du kannst beide Systeme parallel laufen lassen:

```javascript
// Legacy Singleton (für alte Aufrufe)
const TerminalSystem = {
    init(container) {
        // Delegiere an neue Instance
        if (!this._instance) {
            this._instance = new TerminalInstance({
                title: 'Terminal',
            });
        }
        this._instance.init(container);
    },
};

// Neue Instance-basierte Nutzung
const terminal = new TerminalInstance({ title: 'Terminal 1' });
terminal.init(container);
```

## 📦 Module zu migrieren

### Priorität 1 (einfach)

- ✅ Terminal (Beispiel implementiert)
- ⏳ TextEditor
- ⏳ Image Viewer

### Priorität 2 (komplex)

- ⏳ Finder (GitHub Integration, virtuelles Dateisystem)
- ⏳ Settings

### Priorität 3 (optional)

- ⏳ Launchpad (könnte singleton bleiben)
- ⏳ About (könnte singleton bleiben)

## 🚀 Nächste Schritte

1. **Teste Terminal Instance** - `js/terminal-instance.js` als Beispiel
2. **Migriere TextEditor** - Ähnliche Struktur wie Terminal
3. **Erweitere WindowManager** - Support für dynamische Instance-IDs
4. **Update HTML** - Template-System für Instanzen
5. **Persistierung** - LocalStorage Integration

## 💡 Tipps

- Starte mit einfachen Modulen (Terminal, TextEditor)
- Behalte alte Implementierung während Migration
- Teste jede Instanz isoliert
- Nutze Browser DevTools für Memory Leaks
- Dokumentiere Breaking Changes

## 📚 Weitere Ressourcen

- `js/base-window-instance.js` - Basis-Klasse Dokumentation
- `js/instance-manager.js` - Manager Pattern
- `js/window-chrome.js` - UI Components
- `js/terminal-instance.js` - Vollständiges Beispiel
