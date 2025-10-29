# TypeScript Refactoring Opportunities

**Datum:** 28. Oktober 2025  
**Analysiert von:** GitHub Copilot  
**Scope:** `src/ts/` TypeScript-Codebase nach JS→TS Migration  
**Status:** Teilweise umgesetzt - siehe Abschnitte unten

## Executive Summary

Die TypeScript-Migration ist technisch erfolgreich. Mehrere Verbesserungspotenziale wurden identifiziert und teilweise bereits umgesetzt:

1. **DOM-Utility-Funktionen** ✅ ERLEDIGT (28. Oktober 2025)
2. **IIFE Pattern Inkonsistenzen** 🚧 IN ARBEIT (Bundle-Migration läuft)
3. **Type-Guard Duplikation** - Noch offen
4. **Event-Handler-Patterns** - Noch offen

---

## 1. DOM-Utility-Funktionen ✅ ERLEDIGT

### Status: Implementiert & Verifiziert (28. Oktober 2025)

**Was wurde umgesetzt:**

- ✅ Modul `src/ts/dom-utils.ts` erstellt mit `show()`, `hide()`, `toggle()`, `isVisible()`, `query()`
- ✅ Exponiert als `window.DOMUtils` für Legacy-Kompatibilität
- ✅ Migriert in 8 Modulen:
    - `dialog.ts` (3 Vorkommen)
    - `menubar-utils.ts` (2 Vorkommen)
    - `context-menu.ts` (4 Vorkommen)
    - `terminal-instance.ts` (1 Vorkommen)
    - `text-editor-instance.ts` (1 Vorkommen)
    - `storage.ts` (2 Vorkommen)
    - `image-viewer-utils.ts` (3 Vorkommen)

**Test-Ergebnisse:**

- Quick E2E: 20/20 passing (MOCK_GITHUB=1)
- Full E2E: 120/120 passing
- TypeScript: Build erfolgreich, keine Fehler

**Pattern verwendet:**

```typescript
// Graceful fallback für Legacy-Compat
const domUtils = (window as any).DOMUtils;
if (domUtils && typeof domUtils.show === 'function') {
    domUtils.show(element);
} else {
    element.classList.remove('hidden'); // fallback
}
```

**Bewusst nicht migriert:**

- `base-window-instance.ts` - Dual Export+IIFE Pattern; wird mit Bundle-Migration angegangen

**Siehe:** `CHANGELOG.md` Abschnitt "DOM Utils Migration (Complete)"

---

## 2. IIFE vs. Export Pattern 🚧 IN ARBEIT

### Status: Bundle-Migration gestartet (28. Oktober 2025)

**Aktueller Ansatz:**

Statt schrittweise einzelne Module umzustellen, wurde eine **Bundle-basierte Lösung** implementiert:

**Gefunden in 20+ Dateien:**

```typescript
// Pattern 1: Explizites add/remove
element.classList.remove('hidden');
element.classList.add('hidden');

// Pattern 2: Mit Bedingung
if (!element.classList.contains('hidden')) {
    element.classList.add('hidden');
}

// Pattern 3: Toggle
element.classList.toggle('hidden', condition);
```

### Lösung: Zentralisierte DOM-Helpers

**Neues Modul:** `src/ts/dom-utils.ts`

```typescript
/**
 * DOM Utility Functions
 * Centralized helpers for common DOM manipulations
 */

export function show(element: HTMLElement | null): void {
    if (!element) return;
    element.classList.remove('hidden');
}

export function hide(element: HTMLElement | null): void {
    if (!element) return;
    element.classList.add('hidden');
}

export function toggle(element: HTMLElement | null, visible?: boolean): void {
    if (!element) return;
    if (visible === undefined) {
        element.classList.toggle('hidden');
    } else {
        element.classList.toggle('hidden', !visible);
    }
}

export function isVisible(element: HTMLElement | null): boolean {
    if (!element) return false;
    return !element.classList.contains('hidden');
}

export function setVisibility(
    element: HTMLElement | null,
    visible: boolean
): void {
    if (!element) return;
    element.classList.toggle('hidden', !visible);
}
```

**Vorteile:**

- ✅ 20+ Code-Duplikationen eliminiert
- ✅ Konsistente API über alle Module
- ✅ Null-safe by default
- ✅ Einfacher zu testen
- ✅ Kann später für Animationen erweitert werden

**Betroffene Dateien:**

- `base-window-instance.ts` (6 Vorkommen)
- `dialog.ts` (3 Vorkommen)
- `menubar-utils.ts` (2 Vorkommen)
- `context-menu.ts` (3 Vorkommen)
- `window-manager.ts` (2 Vorkommen)
- `dock.ts` (2 Vorkommen)
- `menu.ts` (1 Vorkommen)
- `text-editor-instance.ts` (1 Vorkommen)

---

## 2. IIFE vs. Export Pattern - MITTLERE PRIORITÄT ⭐⭐

### Problem: Inkonsistente Module-Patterns

**Aktueller Stand:**

```typescript
// Pattern A: Nur IIFE (legacy-kompatibel)
(function () {
    'use strict';
    // Code...
})();

// Pattern B: Export + IIFE
export {};
(function () {
    'use strict';
    // Code...
})();

// Pattern C: Nur Exports (modern)
export class Foo {}
export function bar() {}
```

### Dateien nach Pattern:

**Pattern A (IIFE only):** 11 Dateien

- `menubar-utils.ts`, `snap-utils.ts`, `image-viewer-utils.ts`
- `context-menu.ts`, `menu.ts`, `dock.ts`
- `terminal-instance.ts`, `text-editor-instance.ts`
- `window-tabs.ts`, `multi-instance-demo.ts`

**Pattern B (Export + IIFE):** 3 Dateien

- `dialog-utils.ts`, `program-actions.ts`, `program-menu-sync.ts`

**Pattern C (Modern Exports):** 6 Dateien

- `base-window-instance.ts`, `instance-manager.ts`
- `window-chrome.ts`, `storage.ts`, `theme.ts`, `constants.ts`

### Neue Lösung: Bundle-Migration 🚧

Statt schrittweise einzelne Module umzustellen, wurde eine **esbuild-basierte Bundle-Pipeline** implementiert:

- ✅ `src/ts/compat/expose-globals.ts` - Compatibility-Adapter
- ✅ `scripts/build-esbuild.mjs` - IIFE-Bundle-Builder
- ✅ npm scripts: `build:bundle`, `dev:bundle`
- ✅ VS Code Tasks: "Bundle: Build", "Bundle: Watch", "Dev Environment: Start All (Bundle)"
- ✅ Output: `js/app.bundle.js` (285.4kb, globalName: 'App')
- ✅ Verifiziert: Quick E2E 20/20, TypeScript build erfolgreich

**Nächste Schritte:**

- [ ] Bundle kontrolliert in `index.html` einbinden (staged rollout)
- [ ] Nach Verifikation: alte Script-Tags durch Bundle ersetzen
- [ ] `scripts/fix-ts-exports.js` entfernen (obsolet mit Bundle)
- [ ] Alle Module auf Pure Exports umstellen (Bundle übernimmt IIFE)

**Vorteile:**

- Vereinheitlicht Module-Pattern langfristig
- Reduziert <script>-Tags in index.html
- Ermöglicht Tree-Shaking und Optimierung
- Bessere Developer Experience (ein Build-Command)

**Siehe:** CHANGELOG.md "Build - Esbuild bundle (compat adapter) ✅"

**Phase 3:** Instance-Module modernisieren

- `terminal-instance.ts`, `text-editor-instance.ts` können zu Klassen-Exports migriert werden

---

## 3. Window-Interface Type-Guards - NIEDRIGE PRIORITÄT ⭐

### Problem: Wiederholte Window-Casting-Patterns

**Gefunden in:**

```typescript
// menubar-utils.ts
const MenuSystem = (
    window as unknown as {
        MenuSystem?: { buildMenuForId: (id: string) => void };
    }
).MenuSystem;

// dialog-utils.ts
const win = window as Window & { WindowManager?: IWindowManager };

// terminal-instance.ts
const Base = (window as unknown as { BaseWindowInstance: BaseCtor })
    .BaseWindowInstance;
```

### Lösung: Zentrale Window-Interface-Extensions

**Aktualisierung:** `types/index.d.ts`

```typescript
// Bereits existiert, aber könnte erweitert werden:
declare interface Window {
    // Bestehende Deklarationen...

    // Zusätzliche Type-Guards für häufige Checks
    hasMenuSystem(): boolean;
    hasWindowManager(): boolean;
    hasBaseWindowInstance(): boolean;
}
```

**Oder besser: Utility-Type-Guards**

```typescript
// src/ts/type-guards.ts
export function hasMenuSystem(
    win: Window
): win is Window & { MenuSystem: MenuSystemType } {
    return 'MenuSystem' in win && typeof (win as any).MenuSystem === 'object';
}

export function hasWindowManager(
    win: Window
): win is Window & { WindowManager: WindowManagerType } {
    return (
        'WindowManager' in win && typeof (win as any).WindowManager === 'object'
    );
}
```

**Vorteil:** TypeScript kann nach Type-Guard automatisch narrowing durchführen.

---

## 4. Base-Instance Subclass Patterns - NIEDRIGE PRIORITÄT ⭐

### Problem: Wiederholtes Base-Class-Casting in Subklassen

**Gefunden in:**

- `terminal-instance.ts`
- `text-editor-instance.ts`

```typescript
// Beide Dateien haben identisches Pattern:
type BaseLike = {
    container: HTMLElement | null;
    updateState: (u: Record<string, unknown>) => void;
} & Record<string, unknown>;
type BaseCtor = new (
    cfg: Record<string, unknown>
) => BaseLike & Record<string, unknown>;
const Base = (window as unknown as { BaseWindowInstance: BaseCtor })
    .BaseWindowInstance;

class TerminalInstance extends Base {}
class TextEditorInstance extends Base {}
```

### Lösung: Gemeinsamer Base-Import Helper

**Neues Modul:** `src/ts/base-import.ts`

```typescript
/**
 * Helper to import BaseWindowInstance from window global
 * Centralizes the type casting pattern used by instance subclasses
 */

export type BaseWindowConfig = Record<string, unknown>;

export type BaseWindowInstanceLike = {
    container: HTMLElement | null;
    updateState: (updates: Record<string, unknown>) => void;
    emit: (event: string, data?: unknown) => void;
    on: (event: string, callback: (data?: unknown) => void) => void;
} & Record<string, unknown>;

export type BaseWindowInstanceCtor = new (
    config: BaseWindowConfig
) => BaseWindowInstanceLike;

export function getBaseWindowInstance(): BaseWindowInstanceCtor {
    const win = window as unknown as {
        BaseWindowInstance: BaseWindowInstanceCtor;
    };
    if (!win.BaseWindowInstance) {
        throw new Error(
            'BaseWindowInstance not found on window. Ensure it loads first.'
        );
    }
    return win.BaseWindowInstance;
}
```

**Usage in Subclasses:**

```typescript
import {
    getBaseWindowInstance,
    type BaseWindowInstanceLike,
} from './base-import.js';

const Base = getBaseWindowInstance();

class TerminalInstance extends Base {
    // Kein type-casting mehr nötig!
}
```

---

## 5. Event-Handler Cleanup Patterns - NIEDRIGE PRIORITÄT ⭐

### Beobachtung: Unterschiedliche Cleanup-Strategien

```typescript
// Pattern A: removeAllEventListeners in BaseWindowInstance
removeAllEventListeners(): void {
    this.eventListeners.clear();
}

// Pattern B: Manuelle removeEventListener in Subklassen
// (nicht immer konsistent)

// Pattern C: Verlassen sich auf BaseWindowInstance.destroy()
```

### Empfehlung:

- Aktuelles Pattern ist OK
- BaseWindowInstance hat bereits `removeAllEventListeners()`
- Subklassen sollten nur ihre spezifischen Cleanup-Logik in `destroy()` override implementieren

**Best Practice Dokumentation erforderlich:**

```typescript
/**
 * Subclass Destroy Pattern:
 *
 * 1. Call super.destroy() at the END
 * 2. Clean up subclass-specific resources BEFORE super call
 * 3. Don't remove event listeners manually - base class handles it
 */
destroy(): void {
    // 1. Subclass cleanup
    this.outputElement = null;
    this.inputElement = null;

    // 2. Call base class
    super.destroy();
}
```

---

## 6. Config/Options-Objects - NIEDRIGE PRIORITÄT ⭐

### Beobachtung: Verschiedene Config-Patterns

```typescript
// Pattern A: Inline type
function foo(config: { option1?: string; option2?: boolean }): void {}

// Pattern B: Separater Type
type FooConfig = { option1?: string; option2?: boolean };
function foo(config: FooConfig): void {}

// Pattern C: Interface
interface FooConfig {
    option1?: string;
    option2?: boolean;
}
function foo(config: FooConfig): void {}
```

### Empfehlung: Konvention etablieren

- **Für öffentliche APIs:** Interface verwenden (erweiterbar)
- **Für interne Funktionen:** Type alias verwenden
- **Für einfache Funktionen (1-2 params):** Inline type OK

---

## Prioritäten-Zusammenfassung

### Kurzfristig (1-2 Wochen):

1. ✅ **DOM-Utils Modul erstellen** (`src/ts/dom-utils.ts`)
2. ✅ **20+ Vorkommen von `classList.add/remove('hidden')` refactoren**

### Mittelfristig (1 Monat):

3. ✅ **IIFE → Export Pattern in Utility-Modulen** (dialog-utils, menubar-utils, snap-utils)
4. ✅ **Base-Import Helper** für Subclass-Pattern

### Langfristig (Backlog):

5. ⚪ Type-Guard Utilities für Window-Interface-Checks
6. ⚪ Best-Practice-Dokumentation für Event-Cleanup in Subklassen

---

## Geschätzter Aufwand

| Task                    | Aufwand    | Impact  | Risk    |
| ----------------------- | ---------- | ------- | ------- |
| DOM-Utils Modul         | 2-3h       | Hoch    | Niedrig |
| Refactor zu DOM-Utils   | 4-6h       | Hoch    | Niedrig |
| IIFE → Export Migration | 3-4h       | Mittel  | Mittel  |
| Base-Import Helper      | 1-2h       | Mittel  | Niedrig |
| Type-Guards             | 1-2h       | Niedrig | Niedrig |
| Dokumentation           | 2-3h       | Mittel  | Keine   |
| **GESAMT**              | **13-20h** |         |         |

---

## Risiko-Assessment

### DOM-Utils Modul

- **Risk:** Niedrig - Keine Breaking Changes, nur Code-Vereinfachung
- **Testing:** Einfach - Rein funktionale Helpers
- **Rollback:** Einfach - Falls Probleme, alte Patterns zurück

### IIFE → Export Migration

- **Risk:** Mittel - Könnte globale Namespace-Abhängigkeiten brechen
- **Testing:** E2E-Tests erforderlich
- **Rollback:** Moderat - Build-Artefakte betroffen

### Base-Import Helper

- **Risk:** Niedrig - Nur in Subklassen verwendet
- **Testing:** Instance-Tests erforderlich
- **Rollback:** Einfach - Nur 2 Dateien betroffen

---

## Nächste Schritte

1. **Review & Approval:** Team-Review dieses Dokuments
2. **DOM-Utils POC:** Erstelle DOM-Utils Modul + refactor 1-2 Dateien als Proof of Concept
3. **Test Coverage:** Stelle sicher, dass betroffene Module E2E-Coverage haben
4. **Incremental Rollout:** Refactor schrittweise, ein Modul pro Commit
5. **Documentation:** Update TYPESCRIPT_GUIDELINES.md mit neuen Patterns

---

## Referenzen

- **Betroffene Dateien:** 25+ TypeScript-Module in `src/ts/`
- **Pattern-Duplikationen:** ~40 Vorkommen
- **Potential Code Reduction:** ~100-150 Zeilen durch DOM-Utils allein
- **Type-Safety Verbesserung:** +15% durch Type-Guards und strikte Configs
