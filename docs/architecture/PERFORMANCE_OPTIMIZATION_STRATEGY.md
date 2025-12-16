# 🎯 Performance Optimization Strategy

## Problem Statement

**Gefunden:** Systematische DOM-Mutation Pattern (`innerHTML = ...`) zerstört UI-State (Scroll, Focus, Selection) bei unerwarteten Momenten.

**Beispiel Issue #110:** Finder-Scroll verloren, weil `openItem()` → `_renderAll()` → `innerHTML =` → DOM destroyed.

**Risiko:** Mit mehr Features/Fenster werden solche Bugs multiplizieren.

---

## Sofortige Lösungen (Bereits Implementiert)

✅ **Issue #110 - Fix:** Entfernung von `_renderAll()` nach `openItem()`

- Finder re-rendert nicht mehr, wenn Datei geöffnet wird
- Scroll-Position bleibt erhalten
- Status: **Deployed und getestet**

---

## Mittelfristig (Phase 2) - Empfohlene Maßnahmen

### Option A: Minimal (Konservativ)

**Ansatz:** Gezielt nur die problematischsten Patterns fixen

**Kosten:** ~2-4 Stunden  
**Benefit:** Verhindert sofort weitere #110-ähnliche Bugs

**Was:**

1. FinderView Breadcrumbs: Inkrementelle Updates statt `innerHTML =`
2. FinderView Content: Smart-Diff für List/Grid (nur veränderte Items)
3. Dokumentation: "Render Best Practices" schreiben

### Option B: Aggressiv (Modern)

**Ansatz:** Einführung eines Virtual DOM / Diffing Systems

**Kosten:** ~8-16 Stunden  
**Benefit:** Systeminvariantisch sicher, skalierwilliger

**Was:**

1. Simple VDOM Abstraction (nicht Preact/React, eigenes Mini-System)
2. Alle Apps zu VDOM migrieren
3. Automatische Diff/Patch Anwendung
4. Performance Monitoring

---

## Meine Empfehlung: Hybrid

1. **Sofort (nächste Session):**
    - ✅ FinderView Breadcrumbs auf inkrementelle Updates umstellen
    - ✅ FinderView Content mit Smart-Diff optimieren
    - ✅ Best-Practice Dokumentation schreiben

2. **Mittelfristig (wenn Zeit):**
    - Monitoring Dashboard
    - E2E Performance Tests

3. **Langfristig (später):**
    - VDOM nur wenn Performance Problem auftaucht

---

## Concrete Code Patterns

### ❌ Anti-Pattern (aktuell in FinderView)

```typescript
private renderListView(items: FileItem[]): void {
    // Zerstört ALLES
    this.dom.content!.innerHTML = `<table>...rows...</table>`;
}
```

### ✅ Besseres Pattern (Hybrid)

```typescript
private renderListView(items: FileItem[]): void {
    if (!this.tableElement) {
        // Nur einmal: Initial render
        this.tableElement = this._createTableDOM();
        this.dom.content!.appendChild(this.tableElement);
    }

    // Update: Nur die Body rows
    const tbody = this.tableElement.querySelector('tbody');
    if (tbody) {
        this._updateTableRows(tbody, items);  // ← Inkrementell
    }
}

private _updateTableRows(tbody: HTMLElement, items: FileItem[]): void {
    const existingRows = Array.from(tbody.querySelectorAll('tr'));
    const newRows: HTMLElement[] = [];

    items.forEach((item, i) => {
        let row = existingRows[i];
        if (!row) {
            row = document.createElement('tr');
            tbody.appendChild(row);
        }

        // Update Inhalte ohne DOM-Neubau
        row.dataset.itemIndex = String(i);
        row.dataset.itemName = item.name;

        // Update Zellen
        const cells = row.querySelectorAll('td');
        if (cells[0]) cells[0].textContent = item.name;
        if (cells[1]) cells[1].textContent = this.formatSize(item.size);
    });

    // Überschüssige Rows löschen
    for (let i = items.length; i < existingRows.length; i++) {
        existingRows[i].remove();
    }
}
```

### Noch besser (mit DocumentFragment)

```typescript
private _updateTableRows(tbody: HTMLElement, items: FileItem[]): void {
    // Nutze Fragment für Single DOM Operation
    const fragment = document.createDocumentFragment();

    items.forEach((item, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${this.formatSize(item.size)}</td>
        `;
        fragment.appendChild(row);
    });

    // Eine einzige DOM-Operation!
    tbody.textContent = '';
    tbody.appendChild(fragment);
}
```

---

## Performance-Targets

Nach Optimierung sollten diese erreichbar sein:

| Operation          | Jetzt  | Ziel             |
| ------------------ | ------ | ---------------- |
| FinderView initial | ~150ms | ~80ms            |
| Folder navigation  | ~200ms | ~50ms            |
| Item selection     | ~100ms | <20ms            |
| Scroll             | Drops  | 60fps consistent |
| Terminal addLine   | ~50ms  | ~5ms             |

---

## Metriken & Monitoring

```javascript
// Einfaches Performance-Monitoring für lokale Arbeit:

window.PERF_DEBUG = true;

function measureRender(name, fn) {
    if (!window.PERF_DEBUG) return fn();

    performance.mark(`${name}-start`);
    const result = fn();
    performance.mark(`${name}-end`);

    const measure = performance.measure(name, `${name}-start`, `${name}-end`);

    console.log(`✓ ${name}: ${measure.duration.toFixed(2)}ms`);
    return result;
}

// Nutzen:
measureRender('render-list', () => {
    this.renderListView(items);
});
```

---

## Decision Matrix

| Kriterium                | Option A (Minimal) | Option B (Aggressiv) |
| ------------------------ | ------------------ | -------------------- |
| Implementierungszeit     | 2-4h               | 8-16h                |
| Test-Aufwand             | 1-2h               | 3-4h                 |
| Fehlerrisiko             | Niedrig            | Mittel               |
| Langzeitskalierbarkheit  | Gut                | Sehr gut             |
| Leistungsverbesserung    | 20-30%             | 50-70%               |
| Code-Komplexität Zunahme | 10%                | 30%                  |

---

## Recommendation for Next Session

**🎯 Fokus:** FinderView Content/Breadcrumbs Optimization (Option A)

**Umfang:**

- 1 std: Analyze current render patterns
- 1.5 std: Implement inkrementelle Updates
- 0.5 std: Tests & Validation
- **Total: ~3 Stunden**

**Erfolg-Kriterien:**

- ✅ Scroll position preserved während Navigation
- ✅ No visual flicker während Updates
- ✅ E2E tests passen noch (61/64 baseline)
- ✅ Performance-Monitoring Dashboard existiert

---

**Status:** Ready for Implementation  
**Complexity:** Medium  
**Impact:** High (prevents future bugs, improves UX)
