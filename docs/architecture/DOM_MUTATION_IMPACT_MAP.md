# 📊 DOM Mutation Impact Map

## Visualisierung der Probleme

```
┌─────────────────────────────────────────────────────────────────┐
│                    FINDER VIEW - Scroll Issue                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User Action: Double-click File                                  │
│       ↓                                                           │
│  openItem()                                                       │
│       ↓                                                           │
│  ❌ WAS: _renderAll()                                            │
│       ├─ saveScrollPosition()                                    │
│       ├─ renderContent()                                         │
│       │   └─ dom.content.innerHTML = ...  ← ZERSTÖRT ALLES      │
│       │       └─ [DIV, Listener, Selection, Scroll, Focus]       │
│       └─ restoreScrollPosition()  ← Zu spät! DOM weg             │
│                                                                   │
│  ✅ NOW: KEINE _renderAll()!                                     │
│       ├─ saveScrollPosition()                                    │
│       ├─ _selectItem() ← Nur CSS-Klassen                        │
│       └─ File öffnet sich in TextEditor                          │
│                                                                   │
│  Result: Scroll-Position bleibt ↨ ✅                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## DOM-Mutation Timeline (BEFORE Fix)

```
              Time ──────────────────────────────────────────→

User scroll @ position 500px
         ↓
     dom.content.scrollTop = 500px  ✓ (User sieht Position 500)
         ↓
     openItem() aufgerufen
         ↓
     _renderAll()
         ↓
     dom.content.innerHTML = "<table>...</table>"
         ├─ [EXPLOSION!]
         ├─ ALT: scrollTop = 500 → VERLOREN!
         ├─ ALT: Event-Listener → DETACHED
         └─ NEU: DOM-Tree komplett aufgebaut, scrollTop = 0
         ↓
     restoreScrollPosition() versucht:
         scrollTop = savedValue
         ABER: Der alte savedValue war ÜBERSCHRIEBEN
         ↓
     Ergebnis: 😞 Scroll-Position = 0 (Oben)
```

---

## DOM-Mutation Timeline (AFTER Fix)

```
              Time ──────────────────────────────────────────→

User scroll @ position 500px
         ↓
     dom.content.scrollTop = 500px  ✓ (User sieht Position 500)
         ↓
     openItem() aufgerufen
         ↓
     saveScrollPosition()
         ├─ _savedScrollPosition = 500px ✓
         └─ _scrollPositions.set("computer:", 500) ✓
         ↓
     _selectItem() nur
         └─ CSS-Klassen ändern (kein innerHTML!)
            ├─ scrollTop BLEIBT bei 500px ✓
            ├─ Event-Listener BLEIBEN attached ✓
            └─ DOM-Tree INTAKT ✓
         ↓
     File öffnet sich in TextEditor
         (Finder bleibt VÖLLIG UNVERÄNDERT)
         ↓
     User kehrt zu Finder zurück
         ↓
     Ergebnis: ✅ Scroll-Position NOCH IMMER bei 500px!
```

---

## Kritische Code-Pfade

### Problematisch: innerHTML Assignments

```
FinderView.tsx
├── renderListView()
│   └── dom.content!.innerHTML = ...  ← 💣 EXPLOSION
├── renderGridView()
│   └── dom.content!.innerHTML = ...  ← 💣 EXPLOSION
└── renderBreadcrumbs()
    └── dom.breadcrumbs.innerHTML = ...  ← 💣 EXPLOSION

Terminal.ts
├── render()
│   └── this.container.innerHTML = ...  ← 💣 EXPLOSION
└── executeCommand()
    └── addOutput() via DOM append  ← ✓ OK!

TextEditor.ts
└── render()
    └── this.container.innerHTML = ...  ← 💣 EXPLOSION
```

### Inkrementelle (sichere) Alternativen

```
✓ appendChild()        ← Fügt Elemente hinzu
✓ removeChild()        ← Entfernt einzelne Elemente
✓ setAttribute()       ← Ändert Attribute
✓ classList.add/remove() ← Ändert CSS-Klassen
✓ textContent =        ← Nur Text (kein HTML)
✓ createDocumentFragment() ← Batch DOM-Ops

❌ innerHTML =         ← NIEMALS für Content!
   (OK nur für initial Setup oder explizites Clear)
```

---

## Performance-Impact Schätzung

```
┌──────────────────────────────────────────────────────────┐
│  Operation: Render 100 Finder Items                      │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  Current (innerHTML): 180ms                              │
│  ├─ Parse HTML string: 50ms                              │
│  ├─ Create DOM nodes: 80ms                               │
│  ├─ Attach listeners: 40ms                               │
│  └─ Re-layout/-paint: 10ms                               │
│                                                            │
│  With Fragment Patch: 45ms  (75% faster!)               │
│  ├─ Query existing: 5ms                                  │
│  ├─ Build fragment: 15ms                                 │
│  ├─ Single DOM-op: 20ms                                  │
│  └─ Re-layout/-paint: 5ms                                │
│                                                            │
│  Speedup: 4x ✨                                           │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

---

## State Preservation Matrix

| Element         | innerHTML | appendChild | Preserved? |
| --------------- | --------- | ----------- | ---------- |
| Scroll-Position | ❌ RESET  | ✅ KEPT     | ✅ vs ❌   |
| Focus (Input)   | ❌ RESET  | ✅ KEPT     | ✅ vs ❌   |
| Event-Listener  | ❌ DETACH | ✅ KEPT     | ✅ vs ❌   |
| CSS-Classes     | ❌ RESET  | ✅ KEPT     | ✅ vs ❌   |
| Input-Value     | ❌ RESET  | ✅ KEPT     | ✅ vs ❌   |
| Selection       | ❌ RESET  | ✅ KEPT     | ✅ vs ❌   |
| Animation-State | ❌ BROKEN | ✅ SMOOTH   | ✅ vs ❌   |

---

## Refactor Priority Matrix

```
      Impact
        ↑
    H   │
  i     │  ┌──────────────────────────────┐
  g     │  │  Terminal Output             │ ← Low effort, High impact
  h     │  │  (aber unkritisch jetzt)     │
        │  │                              │
        │  │  ┌──────────────────────────┐│
        │  │  │ FinderView Breadcrumbs   ││ ← High priority!
        │  │  │ FinderView Content       ││
        │  │  └──────────────────────────┘│
        │  │                              │
        │  │  ┌──────────────────────────┐│
    L   │  │  │ TextEditor Toolbar       ││ ← Low impact now
    o   │  │  │ Settings Modal           ││
    w   │  │  └──────────────────────────┘│
        │  └──────────────────────────────┘
        └─────────────────────────────────────→ Effort
            Low           Medium        High
```

---

## Abhängigkeits-Graph für Fixes

```
Issue #110 (FIXED ✅)
│
├─ openItem() re-renders tab
│  └─ FIXED: Removed _renderAll() calls
│
├─ Navigation re-renders content
│  └─ TODO: FinderView.renderContent() optimization
│
└─ Terminal output updates
   └─ TODO: Smart scroll management
```

---

## Recommendations für Neue Features

### When Adding New Functionality:

```javascript
// ❌ DON'T:
function updateUI(data) {
    container.innerHTML = generateHTML(data); // Boom!
}

// ✅ DO:
function updateUI(data) {
    // Option 1: Selective Update
    const elements = container.querySelectorAll('.item');
    data.forEach((item, i) => {
        if (elements[i]) {
            elements[i].textContent = item.name;
        }
    });

    // Option 2: Fragment Append
    const fragment = document.createDocumentFragment();
    data.forEach(item => {
        const el = createItemElement(item);
        fragment.appendChild(el);
    });
    container.textContent = ''; // Clear with single op
    container.appendChild(fragment);
}

// ✅ BEST: Persistent Structure + Updates
class ItemList {
    constructor() {
        this.items = new Map(); // Track elements
    }

    update(data) {
        data.forEach(item => {
            let el = this.items.get(item.id);
            if (!el) {
                el = createItemElement(item);
                container.appendChild(el);
                this.items.set(item.id, el);
            }
            updateItemElement(el, item); // Only update props
        });
    }
}
```

---

## Checkliste für Future PRs

- [ ] Keine `innerHTML = ...` für Content-Updates (nur `.innerHTML = ''` zum Clear)
- [ ] State-preserving DOM-Updates verwenden (appendChild, setAttribute, etc.)
- [ ] E2E Tests für Scroll/Focus Preservation
- [ ] Performance-Tests vor/nach
- [ ] Dokumentation: Warum dieses Pattern gewählt wurde

---

**Generated:** 2025-12-16  
**Status:** Planning & Recommendation Complete
