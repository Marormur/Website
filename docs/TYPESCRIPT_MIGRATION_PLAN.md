# 🚀 TypeScript Migration Plan

**Projekt:** macOS-Style Portfolio Website  
**Status:** 📋 Planung  
**Ziel:** Inkrementelle Migration zu TypeScript mit Zero Breaking Changes  
**Zeitrahmen:** 6-8 Wochen (bei 5-10h/Woche)

---

## 📊 Executive Summary

### Aktuelle Situation
- **~4.700 Zeilen** JavaScript-Code
- **29 Module** in `js/` Verzeichnis
- **~1.600 Zeilen** Legacy-Code in `app.js`
- **Keine Type-Safety** außer JSDoc-Kommentare
- **Funktionierende E2E-Tests** (Chromium, Firefox, WebKit)

### Ziel-Situation
- **Vollständige Type-Safety** mit TypeScript
- **Bestehende Tests bleiben grün**
- **Build-Pipeline erweitert** (TS → JS)
- **Moderne IDE-Unterstützung** (Autocomplete, Refactoring)
- **Wartbarer Code** für zukünftige Features

### Strategie
**Inkrementell statt Big Bang:**
1. TypeScript-Setup ohne Code-Änderungen (Phase 0)
2. Type-Definitionen für bestehenden Code (Phase 1)
3. Neue Features in TypeScript (Phase 2)
4. Kritische Module migrieren (Phase 3)
5. Legacy-Code refactoren (Phase 4)

---

## 🎯 Phase 0: TypeScript-Setup (1-2 Tage)

### Ziel
TypeScript-Compiler installieren und konfigurieren **ohne** Code zu ändern.

### Aufgaben

#### 1. Dependencies installieren
```bash
npm install --save-dev typescript @types/node
npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

#### 2. `tsconfig.json` erstellen
```json
{
  "compilerOptions": {
    // JavaScript-Kompatibilität
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    
    // Modern JavaScript
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    
    // Type Checking (anfangs locker)
    "strict": false,
    "noImplicitAny": false,
    "strictNullChecks": false,
    
    // Developer Experience
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    
    // Paths
    "baseUrl": ".",
    "paths": {
      "@/*": ["js/*"]
    }
  },
  "include": [
    "js/**/*.js",
    "js/**/*.ts",
    "app.js",
    "i18n.js"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "test-results",
    "tests"
  ]
}
```

#### 3. NPM Scripts erweitern
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "build:css": "npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify",
    "watch:css": "npx tailwindcss -i ./src/input.css -o ./dist/output.css --watch",
    "dev": "node server.js",
    "validate": "npm run typecheck && npm run build:css && npm run test:e2e"
  }
}
```

#### 4. VS Code Einstellungen (`.vscode/settings.json`)
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "javascript.validate.enable": false,
  "typescript.validate.enable": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

#### 5. GitHub Actions erweitern (`.github/workflows/deploy.yml`)
```yaml
- name: Type Check
  run: npm run typecheck
  
- name: Build CSS
  run: npm run build:css
```

### Erfolgskriterien
- ✅ `npm run typecheck` läuft ohne Fehler
- ✅ VS Code zeigt Type-Hints für bestehenden Code
- ✅ Keine Code-Änderungen notwendig
- ✅ Alle Tests bleiben grün

### Zeitaufwand
- **1-2 Stunden** Setup
- **30 Min** Testing

---

## 🏗️ Phase 1: Type Definitions (3-5 Tage)

### Ziel
Type-Definitionen für alle bestehenden Module erstellen **ohne** Code-Migration.

### Struktur
```
types/
├── index.d.ts              # Globale Types
├── window-manager.d.ts     # WindowManager Types
├── action-bus.d.ts         # ActionBus Types
├── instance-manager.d.ts   # InstanceManager Types
├── base-window-instance.d.ts
├── api.d.ts
├── theme.d.ts
├── i18n.d.ts
├── storage.d.ts
├── finder.d.ts
└── ...
```

### Beispiel: `types/window-manager.d.ts`
```typescript
/**
 * Window Manager Type Definitions
 */

export type WindowType = 'persistent' | 'transient';

export interface WindowConfigOptions {
    id: string;
    type?: WindowType;
    programKey: string;
    icon?: string;
    closeButtonId?: string;
    metadata?: Record<string, any>;
}

export interface WindowMetadata {
    initHandler?: () => void;
    destroyHandler?: () => void;
    [key: string]: any;
}

export class WindowConfig {
    id: string;
    type: WindowType;
    programKey: string;
    icon: string | null;
    closeButtonId: string | null;
    metadata: WindowMetadata;
    
    constructor(options: WindowConfigOptions);
    isTransient(): boolean;
}

export class WindowManager {
    static windows: Map<string, WindowConfig>;
    static dialogs: Map<string, any>;
    static currentZIndex: number;
    
    static register(config: WindowConfigOptions): void;
    static registerBulk(configs: WindowConfigOptions[]): void;
    static open(windowId: string): void;
    static close(windowId: string): void;
    static toggle(windowId: string): void;
    static getTopWindow(): string | null;
    static bringToFront(windowId: string): void;
    static getProgramInfo(windowId: string): {
        name: string;
        icon: string | null;
    } | null;
    static getWindowConfig(windowId: string): WindowConfig | undefined;
    static getAllWindows(): WindowConfig[];
    static isOpen(windowId: string): boolean;
}
```

### Beispiel: `types/action-bus.d.ts`
```typescript
/**
 * Action Bus Type Definitions
 */

export type ActionHandler<T = any> = (
    params: T,
    element: HTMLElement
) => void | Promise<void>;

export interface ActionParams {
    [key: string]: string | undefined;
}

export class ActionBus {
    static actions: Map<string, ActionHandler>;
    
    static register<T = ActionParams>(
        action: string,
        handler: ActionHandler<T>
    ): void;
    
    static trigger(
        action: string,
        params: ActionParams,
        element: HTMLElement
    ): void;
    
    static init(): void;
}
```

### Beispiel: `types/base-window-instance.d.ts`
```typescript
/**
 * Base Window Instance Type Definitions
 */

export interface WindowInstanceConfig<TState = any> {
    id?: string;
    type?: string;
    title?: string;
    initialState?: Partial<TState>;
    metadata?: Record<string, any>;
}

export interface WindowInstanceState {
    created: number;
    modified: number;
    [key: string]: any;
}

export type InstanceEventType = 
    | 'initialized'
    | 'shown'
    | 'hidden'
    | 'destroyed'
    | 'stateChanged'
    | 'focus'
    | 'blur';

export type EventListener<T = any> = (data?: T) => void;

export class BaseWindowInstance<TState extends WindowInstanceState = WindowInstanceState> {
    instanceId: string;
    type: string;
    title: string;
    container: HTMLElement | null;
    windowElement: HTMLElement | null;
    state: TState;
    eventListeners: Map<string, Set<EventListener>>;
    isInitialized: boolean;
    isVisible: boolean;
    metadata: Record<string, any>;
    
    constructor(config: WindowInstanceConfig<TState>);
    
    protected _generateId(): string;
    protected _initializeState(initialState: Partial<TState>): TState;
    
    init(container: HTMLElement): void;
    render(): void;
    attachEventListeners(): void;
    detachEventListeners(): void;
    
    show(): void;
    hide(): void;
    destroy(): void;
    focus(): void;
    blur(): void;
    
    updateState(newState: Partial<TState>): void;
    getState(): TState;
    
    on(event: InstanceEventType | string, listener: EventListener): void;
    off(event: InstanceEventType | string, listener: EventListener): void;
    emit(event: InstanceEventType | string, data?: any): void;
    
    setTitle(title: string): void;
    getTitle(): string;
}
```

### Beispiel: `types/api.d.ts`
```typescript
/**
 * Unified API Type Definitions
 */

import { WindowManager } from './window-manager';
import { ActionBus } from './action-bus';
import { InstanceManager } from './instance-manager';

export interface ThemeAPI {
    setThemePreference(theme: 'system' | 'light' | 'dark'): void;
    getThemePreference(): 'system' | 'light' | 'dark';
    applyTheme(): void;
}

export interface I18nAPI {
    translate(key: string, params?: Record<string, any>): string;
    setLanguagePreference(lang: 'system' | 'de' | 'en'): void;
    getLanguagePreference(): 'system' | 'de' | 'en';
    getCurrentLanguage(): 'de' | 'en';
    applyTranslations(): void;
}

export interface StorageAPI {
    saveWindowPositions(): void;
    loadWindowPositions(): void;
    resetWindowPositions(): void;
    saveFinderState(state: any): void;
    loadFinderState(): any;
}

export interface WindowAPI {
    open(id: string): void;
    close(id: string): void;
    toggle(id: string): void;
    getTopWindow(): string | null;
    isOpen(id: string): boolean;
}

export interface API {
    window: typeof WindowManager;
    actions: typeof ActionBus;
    instances: typeof InstanceManager;
    theme: ThemeAPI;
    i18n: I18nAPI;
    storage: StorageAPI;
}

export const API: API;
```

### Aufgaben

#### 1. Type-Definitionen erstellen
- [ ] `types/index.d.ts` - Globale Types
- [ ] `types/window-manager.d.ts`
- [ ] `types/action-bus.d.ts`
- [ ] `types/instance-manager.d.ts`
- [ ] `types/base-window-instance.d.ts`
- [ ] `types/window-chrome.d.ts`
- [ ] `types/api.d.ts`
- [ ] `types/theme.d.ts`
- [ ] `types/i18n.d.ts`
- [ ] `types/storage.d.ts`
- [ ] `types/dialog.d.ts`
- [ ] `types/finder.d.ts`
- [ ] `types/terminal.d.ts`
- [ ] `types/text-editor.d.ts`

#### 2. JSDoc zu TypeScript konvertieren
Bestehende JSDoc-Kommentare als Vorlage für Type-Definitionen nutzen.

#### 3. Type-Checks beheben
```bash
npm run typecheck
```
Fehler Schritt für Schritt beheben (ohne Code-Migration).

### Erfolgskriterien
- ✅ Alle Module haben `.d.ts` Definitionen
- ✅ `npm run typecheck` zeigt maximal Warnings, keine Errors
- ✅ VS Code zeigt korrekte Autocomplete
- ✅ Tests bleiben grün

### Zeitaufwand
- **2-3 Stunden** pro Modul (×15 Module = 30-45h)
- **Realistische Schätzung:** 3-5 Tage bei 8-10h/Tag

---

## 🆕 Phase 2: Neue Features in TypeScript (1-2 Wochen)

### Ziel
Alle neuen Features ab jetzt in TypeScript entwickeln.

### Beispiel 1: Tab System in TypeScript

**Datei:** `js/window-tabs.ts`

```typescript
/**
 * Window Tab System - VOLLSTÄNDIG IN TYPESCRIPT
 */

import type { BaseWindowInstance } from '../types/base-window-instance';
import type { InstanceManager } from '../types/instance-manager';

interface TabConfig {
    instanceId: string;
    title: string;
    closeable?: boolean;
}

interface TabElement extends HTMLDivElement {
    dataset: {
        instanceId: string;
    };
}

class WindowTabManager {
    private type: string;
    private instanceManager: typeof InstanceManager;
    private tabs: Map<string, TabConfig>;
    private tabBarElement: HTMLElement | null;
    private tabsContainer: HTMLElement | null;
    private activeTab: string | null;

    constructor(type: string, instanceManager: typeof InstanceManager) {
        this.type = type;
        this.instanceManager = instanceManager;
        this.tabs = new Map();
        this.tabBarElement = null;
        this.tabsContainer = null;
        this.activeTab = null;
    }

    public init(containerElement: HTMLElement): void {
        this.createTabBar(containerElement);
        this.attachEventListeners();
    }

    private createTabBar(container: HTMLElement): void {
        // TypeScript garantiert Type-Safety
        this.tabBarElement = document.createElement('div');
        this.tabBarElement.className = 'window-tab-bar flex items-center bg-gray-100 dark:bg-gray-800';
        
        this.tabsContainer = document.createElement('div');
        this.tabsContainer.className = 'tabs-container flex-1 flex overflow-x-auto';
        
        const newTabBtn = document.createElement('button');
        newTabBtn.className = 'new-tab-btn px-3 py-2';
        newTabBtn.innerHTML = '➕';
        newTabBtn.addEventListener('click', () => this.createNewTab());
        
        this.tabBarElement.appendChild(this.tabsContainer);
        this.tabBarElement.appendChild(newTabBtn);
        container.prepend(this.tabBarElement);
    }

    public addTab(config: TabConfig): void {
        if (this.tabs.has(config.instanceId)) {
            console.warn(`Tab ${config.instanceId} already exists`);
            return;
        }

        this.tabs.set(config.instanceId, config);
        this.renderTab(config);
        this.setActiveTab(config.instanceId);
    }

    private renderTab(config: TabConfig): void {
        if (!this.tabsContainer) return;

        const tab = document.createElement('div') as TabElement;
        tab.className = 'window-tab flex items-center gap-2 px-4 py-2';
        tab.dataset.instanceId = config.instanceId;

        const title = document.createElement('span');
        title.className = 'tab-title flex-1 truncate';
        title.textContent = config.title;

        tab.appendChild(title);

        if (config.closeable !== false) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'tab-close-btn text-sm';
            closeBtn.innerHTML = '✕';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(config.instanceId);
            });
            tab.appendChild(closeBtn);
        }

        tab.addEventListener('click', () => this.setActiveTab(config.instanceId));
        this.tabsContainer.appendChild(tab);
    }

    public setActiveTab(instanceId: string): void {
        this.activeTab = instanceId;
        this.updateTabStyles();
        this.instanceManager.switchToInstance(instanceId);
    }

    private updateTabStyles(): void {
        if (!this.tabsContainer) return;

        const tabs = this.tabsContainer.querySelectorAll<TabElement>('.window-tab');
        tabs.forEach(tab => {
            const isActive = tab.dataset.instanceId === this.activeTab;
            tab.classList.toggle('active', isActive);
            tab.classList.toggle('bg-white', isActive);
            tab.classList.toggle('dark:bg-gray-900', isActive);
        });
    }

    public closeTab(instanceId: string): void {
        if (!this.tabs.has(instanceId)) return;

        // Tab aus Map entfernen
        this.tabs.delete(instanceId);

        // DOM-Element entfernen
        const tabElement = this.tabsContainer?.querySelector(
            `[data-instance-id="${instanceId}"]`
        );
        tabElement?.remove();

        // Instance zerstören
        this.instanceManager.destroyInstance(instanceId);

        // Nächsten Tab aktivieren
        if (this.activeTab === instanceId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.setActiveTab(remainingTabs[remainingTabs.length - 1]);
            }
        }
    }

    private createNewTab(): void {
        const instance = this.instanceManager.createInstance({
            type: this.type,
            title: `${this.type} ${this.tabs.size + 1}`
        });
        
        this.addTab({
            instanceId: instance.instanceId,
            title: instance.title,
            closeable: true
        });
    }

    public updateTabTitle(instanceId: string, newTitle: string): void {
        const config = this.tabs.get(instanceId);
        if (!config) return;

        config.title = newTitle;
        
        const tabElement = this.tabsContainer?.querySelector<TabElement>(
            `[data-instance-id="${instanceId}"]`
        );
        const titleElement = tabElement?.querySelector('.tab-title');
        if (titleElement) {
            titleElement.textContent = newTitle;
        }
    }

    private attachEventListeners(): void {
        // Event-Handler für Tab-Interaktionen
    }

    public destroy(): void {
        this.tabs.clear();
        this.tabBarElement?.remove();
        this.tabBarElement = null;
        this.tabsContainer = null;
    }
}

// Export für globales API
if (typeof window !== 'undefined') {
    (window as any).WindowTabManager = WindowTabManager;
}

export { WindowTabManager };
export type { TabConfig, TabElement };
```

### Beispiel 2: Keyboard Shortcuts in TypeScript

**Datei:** `js/keyboard-shortcuts.ts`

```typescript
/**
 * Keyboard Shortcuts Manager
 */

interface ShortcutConfig {
    key: string;
    modifiers?: {
        ctrl?: boolean;
        alt?: boolean;
        shift?: boolean;
        meta?: boolean;
    };
    action: () => void;
    description: string;
    context?: string; // 'global' | 'finder' | 'terminal' etc.
}

type ShortcutKey = string;

class KeyboardShortcutManager {
    private shortcuts: Map<ShortcutKey, ShortcutConfig>;
    private activeContext: string;

    constructor() {
        this.shortcuts = new Map();
        this.activeContext = 'global';
        this.init();
    }

    private init(): void {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    public register(config: ShortcutConfig): void {
        const key = this.buildShortcutKey(config);
        
        if (this.shortcuts.has(key)) {
            console.warn(`Shortcut ${key} already registered`);
            return;
        }

        this.shortcuts.set(key, config);
        console.log(`Registered shortcut: ${key} - ${config.description}`);
    }

    private buildShortcutKey(config: ShortcutConfig): ShortcutKey {
        const parts: string[] = [];
        
        if (config.modifiers?.ctrl) parts.push('Ctrl');
        if (config.modifiers?.alt) parts.push('Alt');
        if (config.modifiers?.shift) parts.push('Shift');
        if (config.modifiers?.meta) parts.push('Meta');
        
        parts.push(config.key.toUpperCase());
        
        const context = config.context || 'global';
        return `${context}:${parts.join('+')}`;
    }

    private handleKeyDown(event: KeyboardEvent): void {
        const pressedKey = this.getKeyFromEvent(event);
        
        // Globale Shortcuts
        const globalKey = `global:${pressedKey}`;
        if (this.shortcuts.has(globalKey)) {
            event.preventDefault();
            this.shortcuts.get(globalKey)!.action();
            return;
        }

        // Kontext-spezifische Shortcuts
        const contextKey = `${this.activeContext}:${pressedKey}`;
        if (this.shortcuts.has(contextKey)) {
            event.preventDefault();
            this.shortcuts.get(contextKey)!.action();
        }
    }

    private getKeyFromEvent(event: KeyboardEvent): string {
        const parts: string[] = [];
        
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        if (event.metaKey) parts.push('Meta');
        
        parts.push(event.key.toUpperCase());
        
        return parts.join('+');
    }

    public setContext(context: string): void {
        this.activeContext = context;
    }

    public getContext(): string {
        return this.activeContext;
    }

    public getAllShortcuts(): ShortcutConfig[] {
        return Array.from(this.shortcuts.values());
    }

    public getShortcutsByContext(context: string): ShortcutConfig[] {
        return this.getAllShortcuts().filter(
            s => (s.context || 'global') === context
        );
    }

    public unregister(config: ShortcutConfig): void {
        const key = this.buildShortcutKey(config);
        this.shortcuts.delete(key);
    }

    public clear(): void {
        this.shortcuts.clear();
    }
}

// Globale Instanz
const keyboardShortcuts = new KeyboardShortcutManager();

// Standard-Shortcuts registrieren
keyboardShortcuts.register({
    key: 'F',
    modifiers: { ctrl: true },
    action: () => {
        if (typeof API !== 'undefined') {
            API.window.open('finder-modal');
        }
    },
    description: 'Finder öffnen',
    context: 'global'
});

keyboardShortcuts.register({
    key: 'T',
    modifiers: { ctrl: true },
    action: () => {
        console.log('Neues Terminal öffnen');
        // TerminalInstanceManager.createInstance();
    },
    description: 'Neues Terminal',
    context: 'global'
});

keyboardShortcuts.register({
    key: 'W',
    modifiers: { ctrl: true },
    action: () => {
        if (typeof API !== 'undefined') {
            const topWindow = API.window.getTopWindow();
            if (topWindow) {
                API.window.close(topWindow);
            }
        }
    },
    description: 'Aktuelles Fenster schließen',
    context: 'global'
});

// Export
if (typeof window !== 'undefined') {
    (window as any).KeyboardShortcutManager = KeyboardShortcutManager;
    (window as any).keyboardShortcuts = keyboardShortcuts;
}

export { KeyboardShortcutManager, keyboardShortcuts };
export type { ShortcutConfig, ShortcutKey };
```

### Build-Konfiguration erweitern

**`package.json`:**
```json
{
  "scripts": {
    "build:ts": "tsc",
    "build:css": "npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify",
    "build": "npm run build:ts && npm run build:css",
    "watch:ts": "tsc --watch",
    "watch:css": "npx tailwindcss -i ./src/input.css -o ./dist/output.css --watch",
    "dev": "npm-run-all --parallel watch:ts watch:css dev:server",
    "dev:server": "node server.js"
  },
  "devDependencies": {
    "npm-run-all": "^4.1.5"
  }
}
```

**`tsconfig.json` für Build:**
```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": false,
    "noEmit": false,
    "outDir": "./dist/js",
    "rootDir": ".",
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "skipLibCheck": true
  },
  "include": [
    "js/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "tests"
  ]
}
```

### Erfolgskriterien
- ✅ Neue Features in `.ts` geschrieben
- ✅ Build-Pipeline kompiliert TS → JS
- ✅ Alte JS-Module funktionieren weiterhin
- ✅ Tests bleiben grün

### Zeitaufwand
- **5-10 Stunden** pro neuem Feature
- **1-2 Wochen** für 2-3 Features (Tab System, Keyboard Shortcuts)

---

## 🔄 Phase 3: Kritische Module migrieren (2-3 Wochen)

### Ziel
Core-Module von JavaScript zu TypeScript konvertieren.

### Priorität (basierend auf Abhängigkeiten)

#### 🔴 Priorität 1 (Woche 1)
1. **`base-window-instance.js` → `base-window-instance.ts`**
   - Basis für alle Instanzen
   - ~250 Zeilen
   - ⏱️ 3-4 Stunden

2. **`instance-manager.js` → `instance-manager.ts`**
   - Verwaltet alle Instanzen
   - ~200 Zeilen
   - ⏱️ 3-4 Stunden

3. **`window-manager.js` → `window-manager.ts`**
   - Zentrale Fenster-Verwaltung
   - ~300 Zeilen
   - ⏱️ 4-5 Stunden

#### 🟡 Priorität 2 (Woche 2)
4. **`action-bus.js` → `action-bus.ts`**
   - Event-System
   - ~150 Zeilen
   - ⏱️ 2-3 Stunden

5. **`window-chrome.js` → `window-chrome.ts`**
   - UI-Komponenten
   - ~400 Zeilen
   - ⏱️ 5-6 Stunden

6. **`api.js` → `api.ts`**
   - Unified API
   - ~100 Zeilen
   - ⏱️ 2-3 Stunden

#### 🟢 Priorität 3 (Woche 3)
7. **`terminal-instance.js` → `terminal-instance.ts`**
8. **`text-editor-instance.js` → `text-editor-instance.ts`**
9. **`theme.js` → `theme.ts`**
10. **`storage.js` → `storage.ts`**

### Migration-Checkliste pro Modul

#### Vorher
- [ ] Tests für das Modul grün
- [ ] Abhängigkeiten identifiziert
- [ ] Type-Definitionen vorhanden

#### Migration
- [ ] `.js` → `.ts` umbenennen
- [ ] Types hinzufügen (Parameter, Rückgabewerte)
- [ ] `any` vermeiden, konkrete Types nutzen
- [ ] JSDoc durch TS-Types ersetzen
- [ ] Generics wo sinnvoll (`BaseWindowInstance<TState>`)
- [ ] Strict-Mode aktivieren für neue `.ts` Datei

#### Nachher
- [ ] `npm run typecheck` grün
- [ ] `npm run build:ts` erfolgreich
- [ ] Alle Tests grün
- [ ] Dokumentation aktualisiert

### Beispiel-Migration: `base-window-instance.js` → `.ts`

**Vorher (`base-window-instance.js`):**
```javascript
class BaseWindowInstance {
    constructor(config) {
        this.instanceId = config.id || this._generateId();
        this.type = config.type || 'unknown';
        this.title = config.title || 'Untitled';
        this.state = this._initializeState(config.initialState || {});
    }

    updateState(newState) {
        this.state = { ...this.state, ...newState };
        this.emit('stateChanged', this.state);
    }

    getState() {
        return this.state;
    }
}
```

**Nachher (`base-window-instance.ts`):**
```typescript
export interface WindowInstanceConfig<TState = Record<string, any>> {
    id?: string;
    type?: string;
    title?: string;
    initialState?: Partial<TState>;
    metadata?: Record<string, any>;
}

export interface WindowInstanceState {
    created: number;
    modified: number;
    [key: string]: any;
}

export class BaseWindowInstance<TState extends WindowInstanceState = WindowInstanceState> {
    public readonly instanceId: string;
    public readonly type: string;
    public title: string;
    protected state: TState;
    private eventListeners: Map<string, Set<EventListener>>;

    constructor(config: WindowInstanceConfig<TState>) {
        this.instanceId = config.id ?? this._generateId();
        this.type = config.type ?? 'unknown';
        this.title = config.title ?? 'Untitled';
        this.state = this._initializeState(config.initialState ?? {});
        this.eventListeners = new Map();
    }

    protected _generateId(): string {
        return `${this.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    protected _initializeState(initialState: Partial<TState>): TState {
        return {
            ...initialState,
            created: Date.now(),
            modified: Date.now()
        } as TState;
    }

    public updateState(newState: Partial<TState>): void {
        this.state = { ...this.state, ...newState };
        this.emit('stateChanged', this.state);
    }

    public getState(): Readonly<TState> {
        return Object.freeze({ ...this.state });
    }

    // ... weitere Methoden mit Types
}
```

### Erfolgskriterien
- ✅ 10+ Module in TypeScript migriert
- ✅ Keine `any` Types (außer Legacy-Kompatibilität)
- ✅ Strict-Mode aktiviert
- ✅ Tests bleiben grün

### Zeitaufwand
- **30-40 Stunden** für 10 kritische Module
- **2-3 Wochen** bei 15-20h/Woche

---

## 🏚️ Phase 4: Legacy-Code Refactoring (2-3 Wochen)

### Ziel
`app.js` (~1.600 Zeilen) zu TypeScript migrieren und weiter modularisieren.

### Strategie

#### 1. Code-Analyse
```bash
# Funktionen in app.js identifizieren
grep -n "^function\|^const.*=.*function\|^var.*=.*function" app.js
```

#### 2. Kategorisierung
- **Fenster-Management** → `window-manager.ts`
- **Event-Handling** → `action-bus.ts` oder spezialisierte Handler
- **UI-Initialisierung** → `ui-init.ts`
- **GitHub-Integration** → `github-api.ts`
- **Desktop-Management** → `desktop.ts` (bereits vorhanden, erweitern)

#### 3. Schrittweise Extraktion

**Beispiel: GitHub-API auslagern**

**Neu: `js/github-api.ts`**
```typescript
/**
 * GitHub API Client
 */

interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    language: string | null;
    stargazers_count: number;
    updated_at: string;
}

interface GitHubRepoContent {
    name: string;
    path: string;
    type: 'file' | 'dir';
    size: number;
    download_url: string | null;
}

class GitHubAPIClient {
    private baseUrl = 'https://api.github.com';
    private username: string;

    constructor(username: string) {
        this.username = username;
    }

    public async getPublicRepos(): Promise<GitHubRepo[]> {
        const url = `${this.baseUrl}/users/${this.username}/repos?type=public&sort=updated`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch repos:', error);
            return [];
        }
    }

    public async getRepoContents(
        repo: string,
        path: string = ''
    ): Promise<GitHubRepoContent[]> {
        const url = `${this.baseUrl}/repos/${this.username}/${repo}/contents/${path}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch repo contents:', error);
            return [];
        }
    }

    public async getFileContent(
        repo: string,
        path: string
    ): Promise<string | null> {
        const url = `${this.baseUrl}/repos/${this.username}/${repo}/contents/${path}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            
            const data = await response.json();
            if (data.content) {
                return atob(data.content); // Base64 decode
            }
            return null;
        } catch (error) {
            console.error('Failed to fetch file:', error);
            return null;
        }
    }
}

// Export
export { GitHubAPIClient };
export type { GitHubRepo, GitHubRepoContent };

// Globale Instanz für Legacy-Code
if (typeof window !== 'undefined') {
    (window as any).githubAPI = new GitHubAPIClient('Marormur');
}
```

#### 4. `app.js` zu `app.ts` migrieren

**Schritte:**
1. Alle extrahierten Module importieren
2. Globale Variablen typisieren
3. Event-Listener zu ActionBus migrieren
4. Initialisierungs-Code modularisieren

**Neu: `app.ts`**
```typescript
/**
 * Application Entry Point
 */

import { WindowManager } from './js/window-manager';
import { ActionBus } from './js/action-bus';
import { InstanceManager } from './js/instance-manager';
import { API } from './js/api';
import { GitHubAPIClient } from './js/github-api';
import { keyboardShortcuts } from './js/keyboard-shortcuts';

class Application {
    private githubAPI: GitHubAPIClient;
    private isInitialized = false;

    constructor() {
        this.githubAPI = new GitHubAPIClient('Marormur');
    }

    public async init(): Promise<void> {
        if (this.isInitialized) {
            console.warn('Application already initialized');
            return;
        }

        console.log('Initializing application...');

        // Core-Systeme initialisieren
        this.initWindowSystem();
        this.initActionBus();
        this.initTheme();
        this.initI18n();
        this.initInstances();
        this.initKeyboardShortcuts();

        // UI-Komponenten initialisieren
        await this.initUI();

        // Storage laden
        this.loadStoredData();

        this.isInitialized = true;
        console.log('Application initialized successfully');
    }

    private initWindowSystem(): void {
        // WindowConfigs bereits in window-configs.js registriert
        WindowManager.init();
    }

    private initActionBus(): void {
        ActionBus.init();
    }

    private initTheme(): void {
        API.theme.applyTheme();
    }

    private initI18n(): void {
        API.i18n.applyTranslations();
    }

    private initInstances(): void {
        // Instance-Manager ist bereits initialisiert
        console.log('Instance managers ready');
    }

    private initKeyboardShortcuts(): void {
        keyboardShortcuts.setContext('global');
    }

    private async initUI(): Promise<void> {
        // Dock initialisieren
        if (typeof window.initDock === 'function') {
            window.initDock();
        }

        // Desktop initialisieren
        if (typeof window.initDesktop === 'function') {
            window.initDesktop();
        }

        // Menu initialisieren
        if (typeof window.initMenuBar === 'function') {
            window.initMenuBar();
        }

        // Launchpad initialisieren
        if (typeof window.initLaunchpad === 'function') {
            window.initLaunchpad();
        }
    }

    private loadStoredData(): void {
        API.storage.loadWindowPositions();
        
        const finderState = API.storage.loadFinderState();
        if (finderState) {
            console.log('Loaded Finder state:', finderState);
        }
    }

    public getGitHubAPI(): GitHubAPIClient {
        return this.githubAPI;
    }
}

// Globale App-Instanz
const app = new Application();

// Auto-Init bei DOM-Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Globaler Export
if (typeof window !== 'undefined') {
    (window as any).app = app;
}

export { Application, app };
```

### Erfolgskriterien
- ✅ `app.js` vollständig zu TypeScript migriert
- ✅ Keine globalen Variablen mehr (außer `window.API`)
- ✅ Alle Legacy-Code ausgelagert in Module
- ✅ Tests bleiben grün

### Zeitaufwand
- **20-30 Stunden** für vollständige Migration
- **2-3 Wochen** bei 10-15h/Woche

---

## 🧪 Phase 5: Testing & Quality Assurance (1 Woche)

### Ziel
Sicherstellen dass alle Funktionalität erhalten bleibt.

### Aufgaben

#### 1. E2E-Tests erweitern
```typescript
// tests/e2e/typescript-integration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('TypeScript Integration', () => {
    test('All TS modules load correctly', async ({ page }) => {
        await page.goto('http://localhost:3000');
        
        // Check für TS-Module
        const hasWindowManager = await page.evaluate(() => {
            return typeof (window as any).WindowManager !== 'undefined';
        });
        expect(hasWindowManager).toBe(true);
        
        const hasActionBus = await page.evaluate(() => {
            return typeof (window as any).ActionBus !== 'undefined';
        });
        expect(hasActionBus).toBe(true);
    });

    test('Type-safe API works', async ({ page }) => {
        await page.goto('http://localhost:3000');
        
        const result = await page.evaluate(() => {
            const api = (window as any).API;
            api.window.open('finder-modal');
            return api.window.isOpen('finder-modal');
        });
        
        expect(result).toBe(true);
    });
});
```

#### 2. Type-Coverage messen
```bash
npm install --save-dev type-coverage
```

```json
{
  "scripts": {
    "type-coverage": "type-coverage --detail"
  }
}
```

**Ziel:** >95% Type-Coverage

#### 3. Performance-Tests
```typescript
// tests/e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test('TS build has acceptable performance', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // TS-Build sollte nicht signifikant langsamer sein
    expect(loadTime).toBeLessThan(3000); // 3 Sekunden
});
```

#### 4. Code-Review Checkliste
- [ ] Keine `any` Types (außer Legacy-Interfaces)
- [ ] Alle Public-APIs dokumentiert
- [ ] Generics korrekt verwendet
- [ ] Error-Handling vorhanden
- [ ] Null-Checks wo notwendig

### Erfolgskriterien
- ✅ Alle E2E-Tests grün
- ✅ Type-Coverage >95%
- ✅ Keine Performance-Regression
- ✅ Code-Review bestanden

### Zeitaufwand
- **10-15 Stunden** Testing
- **1 Woche** bei 10-15h/Woche

---

## 📈 Phase 6: Deployment & Documentation (3-5 Tage)

### Ziel
TypeScript-Build in Produktion deployen.

### Aufgaben

#### 1. Build-Pipeline finalisieren

**`.github/workflows/deploy.yml`:**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Type check
      run: npm run typecheck
    
    - name: Build TypeScript
      run: npm run build:ts
    
    - name: Build CSS
      run: npm run build:css
    
    - name: Run tests
      run: npm run test:e2e
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./
        exclude_assets: 'node_modules,tests,docs,.github'
```

#### 2. Dokumentation aktualisieren

**Updates:**
- [ ] `README.md` - TypeScript erwähnen
- [ ] `docs/ARCHITECTURE.md` - TS-Module dokumentieren
- [ ] `docs/TYPESCRIPT_MIGRATION_PLAN.md` - Als abgeschlossen markieren
- [ ] `CONTRIBUTING.md` - TS-Guidelines hinzufügen

**Neu: `docs/TYPESCRIPT_GUIDELINES.md`**
```markdown
# TypeScript Guidelines

## Type-Definitionen

### DO ✅
- Konkrete Types statt `any`
- Readonly für unveränderliche Daten
- Generics für wiederverwendbare Komponenten
- Union Types für begrenzte Wertebereiche

### DON'T ❌
- `any` verwenden (außer Legacy-Kompatibilität)
- Type-Assertions ohne Grund (`as any`)
- `@ts-ignore` Kommentare

## Code-Beispiele

### Gute Type-Definition
```typescript
interface UserConfig {
    readonly name: string;
    age: number;
    preferences?: {
        theme: 'light' | 'dark';
        language: 'de' | 'en';
    };
}

function updateUser<T extends UserConfig>(
    user: T,
    updates: Partial<T>
): T {
    return { ...user, ...updates };
}
```

### Schlechte Type-Definition
```typescript
function updateUser(user: any, updates: any): any {
    return { ...user, ...updates };
}
```
```

#### 3. Migration-Summary erstellen

**`TYPESCRIPT_MIGRATION_SUMMARY.md`:**
```markdown
# TypeScript Migration - Summary

## Zeitraum
- Start: [Datum]
- Ende: [Datum]
- Dauer: 6-8 Wochen

## Statistiken
- **Migrierte Dateien:** 29 JS → TS
- **Neue TS-Module:** 5
- **Type-Coverage:** 96.5%
- **Tests:** 45 passing
- **LOC TypeScript:** 5.200
- **LOC JavaScript:** 0 (vollständig migriert)

## Breaking Changes
Keine! Alle bestehende Funktionalität bleibt erhalten.

## Lessons Learned
1. Inkrementelle Migration verhindert Regression
2. Type-Definitionen zuerst erstellen spart Zeit
3. Strict-Mode schrittweise aktivieren
4. Tests sind essentiell während Migration

## Next Steps
- [ ] Weitere Features in TS entwickeln
- [ ] Type-Coverage auf 99% erhöhen
- [ ] Performance-Optimierungen
```

### Erfolgskriterien
- ✅ GitHub Actions Build erfolgreich
- ✅ Website deployed mit TS-Code
- ✅ Dokumentation aktualisiert
- ✅ Migration-Summary erstellt

### Zeitaufwand
- **5-10 Stunden** Deployment + Dokumentation
- **3-5 Tage** bei 2-3h/Tag

---

## 📊 Gesamtübersicht

### Timeline
```
Woche 1-2:   Phase 0-1 (Setup + Type Definitions)
Woche 3-4:   Phase 2 (Neue Features in TS)
Woche 5-7:   Phase 3 (Kritische Module migrieren)
Woche 8-10:  Phase 4 (Legacy-Code Refactoring)
Woche 11:    Phase 5 (Testing & QA)
Woche 12:    Phase 6 (Deployment & Docs)
```

### Ressourcen-Aufwand
| Phase | Zeitaufwand | Kalenderzeit |
|-------|-------------|--------------|
| Phase 0 | 2-3h | 1-2 Tage |
| Phase 1 | 30-45h | 3-5 Tage |
| Phase 2 | 15-20h | 1-2 Wochen |
| Phase 3 | 30-40h | 2-3 Wochen |
| Phase 4 | 20-30h | 2-3 Wochen |
| Phase 5 | 10-15h | 1 Woche |
| Phase 6 | 5-10h | 3-5 Tage |
| **TOTAL** | **112-163h** | **6-8 Wochen** |

*Bei 15-20 Stunden/Woche*

### Risiko-Matrix

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Breaking Changes | Mittel | Hoch | Umfangreiche E2E-Tests |
| Performance-Regression | Niedrig | Mittel | Performance-Tests, Tree-Shaking |
| Type-Errors in Legacy-Code | Hoch | Niedrig | Schrittweise Migration, `@ts-expect-error` |
| Build-Komplexität | Mittel | Mittel | Gute Dokumentation, npm scripts |
| Team-Akzeptanz | Niedrig | Niedrig | Solo-Projekt |

### Success Metrics

#### Must-Have ✅
- [ ] 100% der Module in TypeScript
- [ ] Alle Tests grün
- [ ] Keine Runtime-Errors
- [ ] Type-Coverage >90%
- [ ] Dokumentation vollständig

#### Nice-to-Have 🎯
- [ ] Type-Coverage >95%
- [ ] Performance-Verbesserung durch Tree-Shaking
- [ ] Automatische API-Dokumentation via TypeDoc
- [ ] Storybook für UI-Komponenten

---

## 🛠️ Hilfreiche Tools

### Development
```bash
# TypeScript Compiler
npm install --save-dev typescript

# ESLint für TypeScript
npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Type-Coverage Tool
npm install --save-dev type-coverage

# Build-Parallelisierung
npm install --save-dev npm-run-all

# TypeDoc für API-Dokumentation
npm install --save-dev typedoc
```

### VS Code Extensions
- **TypeScript Importer** - Auto-Import von Types
- **Pretty TypeScript Errors** - Bessere Error-Messages
- **Total TypeScript** - Interactive TypeScript Learning
- **Error Lens** - Inline Error-Display

### NPM Scripts (Finales Setup)
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "build:ts": "tsc",
    "build:css": "npx tailwindcss -i ./src/input.css -o ./dist/output.css --minify",
    "build": "npm-run-all build:ts build:css",
    "watch:ts": "tsc --watch",
    "watch:css": "npx tailwindcss -i ./src/input.css -o ./dist/output.css --watch",
    "watch": "npm-run-all --parallel watch:ts watch:css",
    "dev": "npm-run-all --parallel watch dev:server",
    "dev:server": "node server.js",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:ui": "playwright test --ui",
    "validate": "npm-run-all typecheck build test:e2e",
    "type-coverage": "type-coverage --detail --at-least 95",
    "docs:generate": "typedoc --out docs/api js/"
  }
}
```

---

## 📚 Weiterführende Ressourcen

### Offizielle Dokumentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [TS Migration Guide](https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html)

### Best Practices
- [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Basarat's TypeScript Book](https://basarat.gitbook.io/typescript/)

### Community
- [TypeScript Discord](https://discord.gg/typescript)
- [Reddit r/typescript](https://reddit.com/r/typescript)
- [Stack Overflow TypeScript](https://stackoverflow.com/questions/tagged/typescript)

---

## 🎯 Quick Start Checklist

Bereit loszulegen? Folge dieser Checkliste:

### Tag 1: Setup
- [ ] `npm install --save-dev typescript @types/node`
- [ ] `tsconfig.json` erstellen (siehe Phase 0)
- [ ] `npm run typecheck` ausführen
- [ ] VS Code TypeScript-Support testen

### Tag 2-3: Type Definitions
- [ ] `types/` Verzeichnis erstellen
- [ ] `types/window-manager.d.ts` erstellen
- [ ] `types/action-bus.d.ts` erstellen
- [ ] `types/api.d.ts` erstellen

### Woche 2: Erstes TS-Modul
- [ ] Neues Feature in TypeScript entwickeln
- [ ] Build-Pipeline testen
- [ ] E2E-Tests grün

### Ab Woche 3: Migration
- [ ] Modul für Modul von JS zu TS
- [ ] Tests nach jeder Migration
- [ ] Dokumentation parallel aktualisieren

---

## 💬 Support & Fragen

Bei Fragen oder Problemen während der Migration:

1. **Type-Errors**: Erst `checkJs: false` setzen, dann schrittweise fixen
2. **Build-Errors**: `outDir` und `rootDir` in `tsconfig.json` prüfen
3. **Runtime-Errors**: Source Maps aktivieren für besseres Debugging
4. **Performance**: Tree-Shaking in Build-Tool aktivieren

---

**Erstellt:** Oktober 2025  
**Autor:** GitHub Copilot  
**Status:** 📋 Bereit zur Umsetzung
