# 📐 Code Patterns & Best Practices

## Übersicht

Dieses Dokument beschreibt etablierte Code-Patterns und Best Practices für die Codebase.

## Module Pattern

### Singleton Pattern

```javascript
(function () {
    'use strict';

    class MyModule {
        constructor() {
            // Initialization
        }

        // Methods
    }

    // Single instance
    const instance = new MyModule();

    // Global export
    if (typeof window !== 'undefined') {
        window.MyModule = instance;
    }
})();
```

## Logging Pattern

### Mit Logger-System

```javascript
// RICHTIG
Logger.info('WindowManager', 'Window opened', { id: 'finder-modal' });
Logger.error('API', 'Request failed', error);
Logger.debug('Terminal', 'Command executed', { cmd: 'ls' });

// FALSCH
console.log('Window opened');
console.error('Error:', error);
```

## Event Handling

### ActionBus Pattern (deklarativ)

```html
<!-- RICHTIG: Deklarativ -->
<button data-action="closeWindow" data-window-id="finder-modal">Close</button>
```

```javascript
// FALSCH: Imperativ
closeBtn.addEventListener('click', () => {
    WindowManager.close('finder-modal');
});
```

### Custom Actions registrieren

```javascript
ActionBus.register('myAction', (params, element) => {
    Logger.debug('MyAction', 'Triggered', params);
    // Handle action
});
```

## Window Management

### WindowManager Pattern

```javascript
// Fenster registrieren in window-configs.js
{
    id: 'my-modal',
    type: 'persistent',
    programKey: 'programs.myApp',
    icon: './img/icon.png',
    closeButtonId: 'close-my-modal'
}

// Fenster verwenden
WindowManager.open('my-modal');
WindowManager.close('my-modal');
```

## Multi-Instance Pattern

### BaseWindowInstance erweitern

```javascript
class MyInstance extends BaseWindowInstance {
    constructor(config) {
        super(config);
        // Custom initialization
    }

    render() {
        // Render UI
    }

    destroy() {
        // Cleanup
        super.destroy();
    }
}
```

## API Access Pattern

### Unified API

```javascript
// RICHTIG
API.window.open('finder-modal');
API.theme.setThemePreference('dark');
API.i18n.translate('programs.finder.label');

// FALSCH (Legacy)
openWindow('finder-modal');
setThemePreference('dark');
```

## Error Handling Pattern

### Try-Catch mit Logger

```javascript
try {
    // Risky operation
    const data = await fetchData();
    return data;
} catch (error) {
    Logger.error('DataFetcher', 'Failed to fetch data', error);
    // Handle gracefully
    return null;
}
```

## Internationalization Pattern

### i18n Keys

```javascript
// RICHTIG
const label = translate('programs.finder.label');
const message = translate('errors.networkError', { retry: 3 });

// FALSCH
const label = 'Finder';
const message = `Network error. Retry ${retry} times.`;
```

## State Management Pattern

### Instance State

```javascript
// Update state
this.updateState({
    currentPath: '/home',
    selectedFile: 'document.txt',
});

// Get state (immutable)
const state = this.getState();
```

## Performance Patterns

### Debouncing

```javascript
let debounceTimer;
function handleInput(value) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        // Process input
        Logger.debug('Input', 'Processing', { value });
    }, 300);
}
```

### Lazy Loading

```javascript
// Lazy load heavy modules
async function loadHeavyModule() {
    if (!window.HeavyModule) {
        await import('./heavy-module.js');
    }
    return window.HeavyModule;
}
```

## Testing Patterns

### E2E Tests

```javascript
test('should open window', async ({ page }) => {
    await page.goto('http://localhost:3000');

    const openButton = page.locator('[data-action="openWindow"]');
    await openButton.click();

    const modal = page.locator('#finder-modal');
    await expect(modal).toBeVisible();
});
```

## Anti-Patterns (vermeiden!)

### ❌ Globale Variablen

```javascript
// FALSCH
var globalData = {};

// RICHTIG
(function () {
    const localData = {};
})();
```

### ❌ console.log statt Logger

```javascript
// FALSCH
console.log('Debug message');

// RICHTIG
Logger.debug('Module', 'Debug message');
```

### ❌ Direkte DOM-Manipulation

```javascript
// FALSCH
document.getElementById('modal').style.display = 'block';

// RICHTIG
WindowManager.open('modal');
```

### ❌ Hard-coded Strings

```javascript
// FALSCH
const title = 'Finder';

// RICHTIG
const title = translate('programs.finder.label');
```

---

**Letzte Aktualisierung:** Oktober 2025
