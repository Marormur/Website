# 🚀 Multi-Instance Window System - Quick Start

Das neue Multi-Instance System ermöglicht mehrere Fenster des gleichen Typs gleichzeitig.

## ⚡ Schnelleinstieg

### 1. Browser-Konsole öffnen

```javascript
// Mehrere Terminals erstellen
const term1 = window.TerminalInstanceManager.createInstance({ title: 'Terminal 1' });
const term2 = window.TerminalInstanceManager.createInstance({ title: 'Terminal 2' });

// Mehrere Text Editoren erstellen
const editor1 = window.TextEditorInstanceManager.createInstance({ title: 'Document 1' });
const editor2 = window.TextEditorInstanceManager.createInstance({ title: 'Document 2' });
```

### 2. Demo-Funktionen verwenden

Öffne die Browser-Konsole und probiere:

```javascript
demoCreateTerminals()      // Erstelle 3 Terminal-Instanzen
demoTerminalIsolation()    // Zeige isolierten State
demoCreateEditors()        // Erstelle 3 Editor-Instanzen
demoWindowChrome()         // UI-Komponenten Demo
demoSaveTerminals()        // State speichern
demoRestoreTerminals()     // State wiederherstellen
```

### 3. Alle Demos automatisch ausführen

Öffne die Seite mit:
```
http://localhost:3000/?demo=true
```

## 📚 Dokumentation

- **Migrations-Guide**: [`docs/MULTI_INSTANCE_MIGRATION.md`](./MULTI_INSTANCE_MIGRATION.md)
- **Abschluss-Bericht**: [`docs/MULTI_INSTANCE_COMPLETE.md`](./MULTI_INSTANCE_COMPLETE.md)

## 🧩 Architektur

```
BaseWindowInstance (Basis-Klasse)
    ↓
TerminalInstance / TextEditorInstance / ...
    ↓
InstanceManager (Verwaltung mehrerer Instanzen)
    ↓
WindowChrome (UI-Komponenten)
```

## 🎯 Hauptfeatures

- ✅ **Mehrere Instanzen** - Terminal, TextEditor, etc.
- ✅ **Isolierter State** - Jede Instanz ist unabhängig
- ✅ **Persistierung** - State speichern/laden
- ✅ **Event-System** - Reagiere auf Änderungen
- ✅ **Wiederverwendbar** - Einfach neue Typen hinzufügen

## 🔧 Neue Module

| Modul | Beschreibung | Status |
|-------|--------------|--------|
| `base-window-instance.js` | Basis-Klasse für Instanzen | ✅ Fertig |
| `instance-manager.js` | Manager für Instanzen | ✅ Fertig |
| `window-chrome.js` | UI-Komponenten | ✅ Fertig |
| `terminal-instance.js` | Multi-Instance Terminal | ✅ Fertig |
| `text-editor-instance.js` | Multi-Instance Editor | ✅ Fertig |
| `multi-instance-demo.js` | Demo & Beispiele | ✅ Fertig |

## 🧪 Tests

```bash
npm run test:e2e -- tests/e2e/multi-instance-basic.spec.js
```

**Ergebnis**: ✅ 3/3 Tests passed

## 💡 Beispiele

### Terminal mit eigenem State

```javascript
const term1 = window.TerminalInstanceManager.createInstance({ 
    title: 'Dev Terminal' 
});

term1.currentPath = '/var/log';
term1.commandHistory = ['ls', 'tail -f server.log'];

// Zweites Terminal - komplett unabhängig!
const term2 = window.TerminalInstanceManager.createInstance({ 
    title: 'Build Terminal' 
});

term2.currentPath = '/home/user/project';
term2.commandHistory = ['npm run build'];
```

### Text Editor mit Content

```javascript
const editor = window.TextEditorInstanceManager.createInstance({
    title: 'README.md',
    initialState: {
        content: '# My Project\n\nDescription...',
        filename: 'README.md'
    }
});

// Content updaten
editor.updateState({ content: 'New content...' });

// State serialisieren
const saved = editor.serialize();
localStorage.setItem('myEditor', JSON.stringify(saved));
```

### Custom Window mit WindowChrome

```javascript
// Erstelle eine Titlebar
const titlebar = window.WindowChrome.createTitlebar({
    title: 'My App',
    icon: '🚀',
    showClose: true,
    onClose: () => console.log('Closed!')
});

// Erstelle eine Toolbar
const toolbar = window.WindowChrome.createToolbar([
    { label: 'New', action: 'new' },
    { type: 'separator' },
    { label: 'Save', action: 'save' }
]);

// Komplettes Fenster
const { frame, titlebar, content, statusbar } = window.WindowChrome.createWindowFrame({
    title: 'Complete Window',
    icon: '📝',
    showClose: true,
    showStatusBar: true,
    toolbar: [
        { label: 'File', action: 'file' },
        { label: 'Edit', action: 'edit' }
    ]
});
```

### Event Handling

```javascript
const terminal = window.TerminalInstanceManager.createInstance({ 
    title: 'Event Demo' 
});

// Lausche auf State-Änderungen
terminal.on('stateChanged', (data) => {
    console.log('State updated:', data.newState);
});

// Lausche auf Focus
terminal.on('focused', () => {
    console.log('Terminal got focus!');
});

// State updaten (triggert Event)
terminal.updateState({ foo: 'bar' });
```

## 🎨 UI Integration (Zukünftig)

Das System ist bereit für:
- [ ] Window Tabs (wie Browser-Tabs)
- [ ] Split View / Tiling
- [ ] Drag & Drop zwischen Instanzen
- [ ] Keyboard Shortcuts (Cmd+N, etc.)
- [ ] Fenster-Menü (Liste aller Instanzen)

## 🤝 Beitragen

### Neuen Fenstertyp hinzufügen:

1. Erstelle `js/your-app-instance.js`:
```javascript
class YourAppInstance extends BaseWindowInstance {
    constructor(config) {
        super({ ...config, type: 'your-app' });
        // Dein State hier
    }
    
    render() {
        // Dein UI hier
    }
}

window.YourAppInstanceManager = new InstanceManager({
    type: 'your-app',
    instanceClass: YourAppInstance,
    maxInstances: 0
});
```

2. Füge es in `index.html` ein
3. Fertig! 🎉

## 📞 Support

Bei Fragen siehe:
- Migration Guide: [`docs/MULTI_INSTANCE_MIGRATION.md`](./MULTI_INSTANCE_MIGRATION.md)
- Demo Code: [`js/multi-instance-demo.js`](../js/multi-instance-demo.js)
- Tests: [`tests/e2e/multi-instance-basic.spec.js`](../tests/e2e/multi-instance-basic.spec.js)

---

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: 25. Oktober 2025
