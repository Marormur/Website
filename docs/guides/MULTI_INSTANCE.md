# 🎯 Multi-Instance System Guide

**Konsolidierte Dokumentation** - zusammengefasst aus:
- MULTI_INSTANCE_QUICKSTART.md
- MULTI_INSTANCE_MIGRATION.md  
- MULTI_INSTANCE_COMPLETE.md

---

## Übersicht

Das Multi-Instance System ermöglicht mehrere Fenster des gleichen Typs gleichzeitig (z.B. mehrere Terminals, TextEditoren).

## Schnellstart

### 1. Neue Instance-Type erstellen

**Schritt 1: Instance-Klasse erstellen**

```javascript
// js/my-app-instance.js
class MyAppInstance extends BaseWindowInstance {
    constructor(config) {
        super(config);
        // Custom initialization
    }

    render() {
        this.windowElement = document.createElement('div');
        this.windowElement.innerHTML = `
            <h1>${this.title}</h1>
            <div class="content"></div>
        `;
        this.container.appendChild(this.windowElement);
    }

    destroy() {
        // Cleanup
        super.destroy();
    }
}
```

**Schritt 2: Instance Manager erstellen**

```javascript
// js/my-app-manager.js
const MyAppInstanceManager = InstanceManager.createManager('myapp', {
    instanceClass: MyAppInstance,
    defaultTitle: 'My App',
    maxInstances: 10
});

window.MyAppInstanceManager = MyAppInstanceManager;
```

**Schritt 3: Verwenden**

```javascript
// Instance erstellen
const instance = MyAppInstanceManager.createInstance({
    title: 'My App 1',
    initialState: { data: 'Hello' }
});

// Mehrere Instances
const instance2 = MyAppInstanceManager.createInstance({
    title: 'My App 2'
});

// Instance wechseln
MyAppInstanceManager.switchToInstance(instance.instanceId);

// Instance schließen
MyAppInstanceManager.destroyInstance(instance.instanceId);
```

## Core Concepts

### BaseWindowInstance

Basis-Klasse für alle Window-Instanzen.

**Features:**
- **Unique ID** - Jede Instance hat eindeutige ID
- **Isolated State** - State pro Instance
- **Lifecycle** - init(), render(), destroy()
- **Events** - Event-System (on, off, emit)

### InstanceManager

Verwaltet alle Instances eines Typs.

**Features:**
- **Create/Destroy** - Instance-Lifecycle
- **Switch** - Zwischen Instances wechseln
- **Track** - Alle Instances im Blick
- **Limits** - Max-Instances enforced

## Erweiterte Features

### State Management

```javascript
// State setzen
instance.updateState({
    currentFile: 'document.txt',
    modified: true
});

// State lesen
const state = instance.getState();
console.log(state.currentFile);
```

### Event System

```javascript
// Event-Listener registrieren
instance.on('stateChanged', (newState) => {
    console.log('State updated:', newState);
});

// Event auslösen
instance.emit('customEvent', { data: 'value' });
```

### Tabs Integration

```javascript
// Tab Manager erstellen
const tabManager = new WindowTabManager('terminal', TerminalInstanceManager);
tabManager.init(containerElement);

// Tabs automatisch erstellen
tabManager.addTab({
    instanceId: instance.instanceId,
    title: instance.title
});
```

## Best Practices

### 1. State Isolation
```javascript
// RICHTIG: Jede Instance hat eigenen State
instance1.updateState({ value: 1 });
instance2.updateState({ value: 2 });

// FALSCH: Gemeinsamer globaler State
let sharedState = {}; // Anti-Pattern!
```

### 2. Memory Management
```javascript
// RICHTIG: Cleanup in destroy()
destroy() {
    this.detachEventListeners();
    this.windowElement?.remove();
    super.destroy();
}

// FALSCH: Kein Cleanup
destroy() {
    super.destroy();
}
```

### 3. Error Handling
```javascript
// RICHTIG: Try-Catch
try {
    const instance = manager.createInstance(config);
} catch (error) {
    Logger.error('MyApp', 'Failed to create instance', error);
}
```

## Beispiele

### Terminal Instance

```javascript
class TerminalInstance extends BaseWindowInstance {
    _initializeState(initialState) {
        return {
            ...super._initializeState(initialState),
            commandHistory: [],
            currentPath: '/home/user',
            output: []
        };
    }

    executeCommand(cmd) {
        const output = this.processCommand(cmd);
        this.updateState({
            commandHistory: [...this.state.commandHistory, cmd],
            output: [...this.state.output, output]
        });
        this.render();
    }
}
```

### TextEditor Instance

```javascript
class TextEditorInstance extends BaseWindowInstance {
    _initializeState(initialState) {
        return {
            ...super._initializeState(initialState),
            content: '',
            filename: 'untitled.txt',
            modified: false,
            cursorPosition: { line: 1, col: 1 }
        };
    }

    setContent(newContent) {
        this.updateState({
            content: newContent,
            modified: true
        });
    }
}
```

## Migration von Single-Instance

### Vorher (Single-Instance)
```javascript
// Nur eine Instance möglich
const terminal = new Terminal();
terminal.open();
```

### Nachher (Multi-Instance)
```javascript
// Beliebig viele Instances
const term1 = TerminalInstanceManager.createInstance({
    title: 'Terminal 1'
});

const term2 = TerminalInstanceManager.createInstance({
    title: 'Terminal 2'
});
```

## Troubleshooting

### Problem: Instances teilen State
**Lösung:** Prüfen ob `_initializeState()` unique State erstellt

### Problem: Memory Leaks
**Lösung:** `destroy()` implementieren und Event-Listener entfernen

### Problem: Instance nicht sichtbar
**Lösung:** `render()` prüfen, Container-Element checken

## API Referenz

### BaseWindowInstance

```typescript
class BaseWindowInstance {
    instanceId: string;
    type: string;
    title: string;
    state: any;
    
    constructor(config);
    init(container: HTMLElement): void;
    render(): void;
    destroy(): void;
    updateState(newState: Partial<State>): void;
    getState(): State;
    on(event: string, listener: Function): void;
    off(event: string, listener: Function): void;
    emit(event: string, data?: any): void;
}
```

### InstanceManager

```typescript
class InstanceManager {
    static createManager(type, config);
    
    createInstance(config): BaseWindowInstance;
    destroyInstance(instanceId): void;
    switchToInstance(instanceId): void;
    getAllInstances(): BaseWindowInstance[];
    getInstanceCount(): number;
}
```

---

**Siehe auch:**
- [architecture/PATTERNS.md](../architecture/PATTERNS.md) - Code Patterns
- [guides/QUICKSTART.md](./QUICKSTART.md) - Allgemeiner Quickstart
- [archive/](../archive/) - Alte Multi-Instance Docs

**Letzte Aktualisierung:** Oktober 2025
