# 🔍 Performance & Re-Render Analyse

**Datum:** 16. Dezember 2025  
**Status:** Analysiert - Mehrere kritische Patterns gefunden

## Executive Summary

Die Codebase hat ein systematisches Problem mit **unnecessary DOM mutations** (`.innerHTML` assignments), die:

- DOM-Zustand zerstören (Scroll-Position, Focus, Input-Werte)
- Event-Listener detachieren
- UI-State zurücksetzen (Selection, Animation, Eingabe-Focus)

Dies ist **kritisch für zukünftige Skalierbarkeit**, wenn mehr Features/Fenster hinzukommen.

---

## 🚨 Gefundene Probleme

### 1. **FinderView** (kritisch - bereits teilweise gefixt)

**Pattern:** `innerHTML = ...` bei Content-Updates

| Methode               | Problem                                    | Auswirkung                                                |
| --------------------- | ------------------------------------------ | --------------------------------------------------------- |
| `renderListView()`    | Setzt `dom.content.innerHTML` komplett neu | Scroll-Position verloren, Selection reset, State zerstört |
| `renderGridView()`    | Setzt `dom.content.innerHTML` komplett neu | Gleich wie oben                                           |
| `renderBreadcrumbs()` | Setzt `dom.breadcrumbs.innerHTML` neu      | Event-Listener verloren                                   |
| `openItem()`          | Rief `_renderAll()` nach Datei-Open auf    | ✅ **GEFIXT** - jetzt ohne Re-Render                      |

**Root Cause:**

- Jede Navigation/Update setzt komplette HTML neu
- Keine inkrementelle DOM-Updates

**Lösung (teilweise implementiert):**

- ✅ Entfernen von `_renderAll()` nach `openItem()`
- 🔄 TODO: Inkrementelle Updates für Navigation

---

### 2. **Terminal** (mittel)

**Datei:** `src/ts/apps/terminal/terminal.ts` (line 125)

```typescript
render(): void {
    this.container.innerHTML = html;  // ← Kompletter Re-Render
    this.outputElement = document.getElementById('terminal-output');
    this.inputElement = document.getElementById('terminal-input');
}
```

**Problem:**

- `render()` wird bei jeder Zustandsänderung aufgerufen
- Alle Output-Zeilen + Input-Field werden neu erstellt
- User-Fokus in Input-Field geht verloren

**Auswirkung:**

- Kann nicht tippen während etwas re-rendert
- Focus-Loss während Command-Ausführung

**Besser wäre:**

```typescript
// Nur neue Lines hinzufügen, nicht alles neu rendern
addOutput(text: string): void {
    const line = document.createElement('div');
    line.textContent = text;
    this.outputElement.appendChild(line);  // ← Inkrementell
}
```

---

### 3. **TextEditorInstance** (mittel)

**Datei:** `src/ts/apps/text-editor/text-editor-instance.ts` (line 63)

```typescript
protected render(): void {
    this.container.innerHTML = `
        <div class="text-editor-wrapper...">
            <!-- Gesamter kompletter Editor HTML neu generiert -->
        </div>
    `;
}
```

**Problem:**

- Toolbar, Statusbar, Editor-Textarea komplett neu erzeugt
- Alle Event-Listener müssen neu attached werden
- Editor-Content könnte verloren gehen bei Fehler

**Auswirkung:**

- Bei Theme-Wechsel oder State-Updates wird Editor neu gerendert
- Benutzer-Focus/Selection in Editor verloren

---

### 4. **Settings Modal** (niedrig)

**Datei:** `src/ts/services/settings.ts` (line 61)

```typescript
this.container.innerHTML = `...complete modal HTML...`;
```

**Problem:** Initialisierung, aber auch Updates setzen HTML neu

---

## 📊 Analyse der `innerHTML` Nutzung

### Kritische Stellen (zerstören State):

```
✗ finder-view.ts:642    renderListView()     - Content
✗ finder-view.ts:675    renderGridView()     - Content
✗ finder-view.ts:493    renderBreadcrumbs()  - Breadcrumbs
✗ terminal.ts:125       render()             - Gesamter Output
✗ text-editor.ts:63     render()             - Gesamter Editor
```

### Unkritische Stellen (Initialisierung oder Container-Clear):

```
✓ finder-view.ts:164    createDOM()          - Initial Setup (OK)
✓ terminal.ts:58        createDOM()          - Initial Setup (OK)
✓ text-editor.ts:66     createDOM()          - Initial Setup (OK)
✓ preview-window.ts:58  clearOutput()        - Explizites Clear (OK)
✓ base-window.ts:117    destroy()            - Cleanup (OK)
```

---

## 🎯 Architektur-Problem

Die aktuelle Architektur folgt dem Pattern:

```
State Change
    ↓
_renderAll() / render()
    ↓
innerHTML = ...     ← ALLES neu erzeugen
    ↓
Event-Listener neu attachen
    ↓
DOM-State verloren!
```

**Besser wäre:**

```
State Change
    ↓
Query existing DOM elements
    ↓
Update ONLY changed parts
    ↓
Event-Listener persist
    ↓
State preserved!
```

---

## 📋 Verbesserungs-Plan

### Priority 1 - FinderView (Bereits 30% gefixt)

- ✅ Entfernt `_renderAll()` nach `openItem()`
- 🔄 **TODO:** Inkrementelle Breadcrumbs-Updates (statt `innerHTML =`)
- 🔄 **TODO:** Inkrementelle Content-Updates (nur neue Items rendern)
- 🔄 **TODO:** Selection ohne DOM-Mutation (nur CSS-Klassen)

**Methode:**

```typescript
// Statt:
this.dom.content.innerHTML = `<table>...rows...</table>`;

// Besser:
// 1. Nur neue Items appendieren
// 2. Alte Items löschen (mit removeChild, nicht innerHTML)
// 3. Bestehende HTML erhalten
```

### Priority 2 - Terminal (mittel - ausgeklammert für jetzt)

- 🔄 **TODO:** `render()` nur einmal bei Init aufrufen
- 🔄 **TODO:** `addOutput()` arbeitet inkrementell (schon partially implementiert)
- 🔄 **TODO:** Fokus im Input erhalten während Output-Updates

### Priority 3 - TextEditor (mittel)

- 🔄 **TODO:** Seperierung von Initial-Render und Updates
- 🔄 **TODO:** Toolbar/Statusbar nicht bei jedem Update neu rendern
- 🔄 **TODO:** Editor-Content persistent über Re-Renders

### Priority 4 - General (Low Priority - Future)

- 🔄 **TODO:** Einführung von Virtual DOM Pattern (optional)
- 🔄 **TODO:** Performance-Monitoring Dashboard
- 🔄 **TODO:** E2E Tests für Performance-Regressions

---

## 💡 Best Practices für zukünftige Features

### ❌ NICHT empfohlen:

```typescript
render(): void {
    this.container.innerHTML = bigHTMLString;  // ← Zerstört Alles
}
```

### ✅ EMPFOHLEN:

```typescript
render(): void {
    if (!this.element) {
        this.element = this._createInitialDOM();  // Nur einmal
        this.container.appendChild(this.element);
    }
    // Updates nur über Element-Updates:
    this.updateContent(items);
}

private updateContent(items: Item[]): void {
    // Option 1: Inkrementelle DOM-Mutation
    items.forEach(item => {
        let el = this.itemMap.get(item.id);
        if (!el) {
            el = this._createItemElement(item);
            this.container.appendChild(el);
        }
        this._updateItemElement(el, item);  // Nur Properties ändern
    });

    // Option 2: Detached DOM mit dann reattach
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        fragment.appendChild(this._createItemElement(item));
    });
    this.container.textContent = '';  // Clear
    this.container.appendChild(fragment);  // Eine DOM-Operation!
}
```

---

## 🏗️ Empfohlene Refactorings (Priorität)

### Phase 1 (Sofort - auf FinderView begrenzt)

- [ ] Breadcrumbs: Inkrementelle DOM-Updates statt `innerHTML =`
- [ ] Content: Nur veränderte Rows/Tiles rendern (nicht alles)

### Phase 2 (Später - wenn Performance Problem)

- [ ] Terminal: Render-Separation einführen
- [ ] TextEditor: Toolbar/Statusbar aus Render-Cycle nehmen

### Phase 3 (Zukünftig - nur wenn notwendig)

- [ ] Virtual DOM / VDOM Diffing implementieren
- [ ] Performance-Monitoring einbauen

---

## 📈 Metriken zum Überwachen

```javascript
// In Console messen:
performance.mark('render-start');
// ... render code ...
performance.mark('render-end');
performance.measure('render', 'render-start', 'render-end');

const measure = performance.getEntriesByName('render')[0];
console.log(`Render took ${measure.duration.toFixed(2)}ms`);
```

**Targets:**

- Initial FinderView render: < 100ms
- Navigation (list → folder): < 50ms
- Content update (scroll, filter): < 30ms
- Terminal output: < 20ms per line

---

## 🔗 Related Issues

- #110 - Finder scroll position (Bereits teilweise gefixt durch Entfernung von `_renderAll()`)
- #133 - Modal session restore
- #131 - Duplicate windows

---

## 📝 Nächste Schritte

1. **Diese Analyse mit Team durchsprechen**
2. **Entscheiden: Aggressive Refactor oder graduell?**
    - Graduell: Nur FinderView optimieren wenn nötig
    - Aggressiv: Virtual DOM / Diffing einführen
3. **E2E Performance Tests schreiben**
4. **Monitoring Dashboard aufbauen** (optional)

---

**Autor:** GitHub Copilot  
**Analysedatum:** 2025-12-16  
**Status:** Analyseergebnis verfügbar für Diskussion
