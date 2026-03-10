# MacUI Framework – Implementation Checklist

Dieses Dokument dient als praktische Checkliste für die Implementierung des MacUI Frameworks.

---

## 📋 Phase 1: Critical Essentials (2-3 Tage)

### Tag 1: Form Controls

#### Button Component

- [ ] Datei erstellen: `src/ts/framework/controls/button.ts`
- [ ] Interface `ButtonProps` definieren (variant, size, icon, loading, disabled)
- [ ] `Button` Klasse implementieren (extends BaseComponent)
- [ ] Render-Methode mit Tailwind-Styling
- [ ] Varianten implementieren: primary, secondary, danger, ghost
- [ ] Größen implementieren: small, medium, large
- [ ] Loading-State mit Spinner
- [ ] Icon-Support (left/right position)
- [ ] E2E Test: `tests/e2e/framework/button.spec.js`
- [ ] Test: Render mit verschiedenen Props
- [ ] Test: Click-Event Handling
- [ ] Test: Disabled State
- [ ] Test: Loading State
- [ ] Export in `src/ts/framework/controls/index.ts`
- [ ] Export in `src/ts/framework/index.ts`

#### Input Component

- [ ] Datei erstellen: `src/ts/framework/controls/input.ts`
- [ ] Interface `InputProps` definieren
- [ ] Support für Types: text, password, email, number, search
- [ ] Prefix/Suffix Support (Icons)
- [ ] Error-State mit Fehlermeldung
- [ ] HelperText Support
- [ ] Value State Management
- [ ] Event Handler: oninput, onchange, onEnter
- [ ] E2E Test: `tests/e2e/framework/input.spec.js`
- [ ] Test: Input Value Changes
- [ ] Test: Error States
- [ ] Test: Enter-Key Handler
- [ ] Export in Framework Index

#### Select Component

- [ ] Datei erstellen: `src/ts/framework/controls/select.ts`
- [ ] Interface `SelectProps` definieren
- [ ] Custom Styling (nicht natives `<select>`)
- [ ] Dropdown-Rendering
- [ ] Keyboard-Navigation (Arrow Keys, Enter, ESC)
- [ ] Gruppierte Options Support
- [ ] Search-Filter bei langen Listen
- [ ] E2E Tests
- [ ] Export in Framework Index

**Deliverable:** 3 Form Components, 15+ Tests, vollständig dokumentiert

---

### Tag 2: Feedback Systems

#### Toast/Notification System

- [ ] Datei erstellen: `src/ts/framework/feedback/toast.ts`
- [ ] Interface `ToastProps` definieren
- [ ] `Toast` Component implementieren
- [ ] Varianten: success, error, warning, info
- [ ] Icons für jede Variante
- [ ] Close Button
- [ ] Action Button (optional)
- [ ] Datei erstellen: `src/ts/framework/feedback/toast-manager.ts`
- [ ] `ToastManager` Singleton implementieren
- [ ] Container für Toasts (fixed position)
- [ ] Methods: show(), success(), error(), warning(), info()
- [ ] Auto-Dismiss mit Countdown
- [ ] Toast Stacking
- [ ] Animation: slide-in/slide-out
- [ ] Tailwind Animation konfigurieren
- [ ] E2E Test: `tests/e2e/framework/toast.spec.js`
- [ ] Test: Toast erscheint und verschwindet
- [ ] Test: Verschiedene Varianten
- [ ] Test: Action Button funktioniert
- [ ] Test: Auto-Dismiss nach Timeout
- [ ] Export in Framework Index
- [ ] Global in API verfügbar machen: `window.API.toast`

#### EmptyState Component

- [ ] Datei erstellen: `src/ts/framework/feedback/empty-state.ts`
- [ ] Interface `EmptyStateProps` definieren
- [ ] Icon, Title, Description, Action
- [ ] Render mit zentriertem Layout
- [ ] E2E Tests
- [ ] Export in Framework Index

#### Badge Component

- [ ] Datei erstellen: `src/ts/framework/feedback/badge.ts`
- [ ] Interface `BadgeProps` definieren
- [ ] Varianten: primary, success, warning, danger
- [ ] Größen: small, medium
- [ ] Dot-Mode (nur Punkt, kein Text)
- [ ] E2E Tests
- [ ] Export in Framework Index

**Deliverable:** Toast-System funktionsfähig, EmptyState & Badge verwendbar

---

### Tag 3: Robustness & Documentation

#### Error Boundaries

- [ ] Datei erstellen: `src/ts/framework/core/error-boundary.ts`
- [ ] Interface `ErrorBoundaryProps` definieren
- [ ] `ErrorBoundary` Component implementieren
- [ ] State: hasError, error
- [ ] Fallback UI (default + custom)
- [ ] Error Logging Integration (window.ErrorHandler)
- [ ] Reset-Funktion
- [ ] Override `update()` für Error-Catching
- [ ] E2E Tests: Component wirft Error, Boundary fängt ab
- [ ] Export in Framework Index

#### Lifecycle Hooks Erweiterung

- [ ] `onBeforeUpdate(prevProps, prevState)` in BaseComponent
- [ ] `onAfterUpdate(prevProps, prevState)` in BaseComponent
- [ ] `onError(error)` Hook
- [ ] Dokumentation für neue Hooks
- [ ] Tests für Lifecycle-Reihenfolge

#### Component API Dokumentation

- [ ] Button: Props-Tabelle, Usage Examples, Do's/Don'ts
- [ ] Input: Props-Tabelle, Validation Examples
- [ ] Select: Props-Tabelle, Keyboard-Nav Doku
- [ ] Toast: API-Referenz, ToastManager Methods
- [ ] EmptyState: Usage Examples
- [ ] Badge: Varianten-Übersicht
- [ ] ErrorBoundary: Integration Guide
- [ ] Lifecycle Hooks: Referenz mit Beispielen

**Deliverable:** Framework robust, vollständig dokumentiert

---

## 📋 Phase 2: Enhanced UX (2-3 Tage)

### Woche 1

#### Context Menu Integration

- [ ] Datei: `src/ts/framework/interaction/context-menu.ts`
- [ ] Interface `ContextMenuProps`
- [ ] Trigger: right-click, programmatisch
- [ ] Auto-Positionierung bei Viewport-Grenzen
- [ ] Submenu-Support
- [ ] Icons, Shortcuts, Separators
- [ ] Keyboard-Navigation
- [ ] Tests

#### Keyboard Shortcuts Framework

- [ ] Datei: `src/ts/framework/interaction/keyboard-shortcuts.ts`
- [ ] `registerShortcut(key, callback, scope)` API
- [ ] Shortcut Scoping: global, window, component
- [ ] Conflict Detection
- [ ] Platform-Aware (Cmd vs. Ctrl)
- [ ] Display in Tooltips/Menus
- [ ] Tests

#### Drag & Drop Generalisierung

- [ ] Datei: `src/ts/framework/interaction/drag-drop.ts`
- [ ] `useDraggable(element, data)` API
- [ ] `useDropZone(element, onDrop)` API
- [ ] Visual Feedback (Drag Preview, Drop Indicators)
- [ ] Constraints (horizontal/vertical only)
- [ ] Multi-Item Drag
- [ ] Tests

#### Tooltip Component

- [ ] Datei: `src/ts/framework/interaction/tooltip.ts`
- [ ] Interface `TooltipProps`
- [ ] Hover-Trigger mit Delay
- [ ] Auto-Positionierung
- [ ] Rich Content Support
- [ ] Tests

**Deliverable:** Interaktions-Framework für alle Apps

---

## 📋 Phase 3: Advanced Features (3-4 Tage)

### Woche 2-3

#### Tree Component

- [ ] Datei: `src/ts/framework/data/tree.ts`
- [ ] Interface `TreeProps`, `TreeNode`
- [ ] Expand/Collapse Nodes
- [ ] Lazy Loading
- [ ] Checkbox-Support für Multi-Selection
- [ ] Drag & Drop Reordering
- [ ] Tests

#### Virtual List

- [ ] Datei: `src/ts/framework/data/virtual-list.ts`
- [ ] Window-based Rendering
- [ ] Only visible items in DOM
- [ ] Smooth Scrolling
- [ ] Dynamic Item Heights
- [ ] Performance Tests (1000+ items)

#### Table Component

- [ ] Datei: `src/ts/framework/data/table.ts`
- [ ] Erweiterte ListView
- [ ] Column Resizing
- [ ] Column Reordering (DnD)
- [ ] Fixed Headers beim Scrollen
- [ ] Row Selection
- [ ] Expandable Rows
- [ ] Pagination
- [ ] Tests

#### State Management Verbesserungen

- [ ] `Store.select(selector)` für Teil-States
- [ ] Middleware Support
- [ ] Computed Values
- [ ] Persistent Store (localStorage sync)
- [ ] Store Composition
- [ ] Tests

**Deliverable:** Performance & Advanced Components

---

## 📋 Phase 4: Polish & Optimization (2 Tage)

### Woche 4

#### Performance Profiling

- [ ] Render Time Tracking für alle Components
- [ ] Re-Render Detection (unnötige Re-Renders)
- [ ] VDOM Diff Stats
- [ ] Memory Profiling (Leak Detection)
- [ ] Integration mit PerfMonitor

#### Bundle Size Optimization

- [ ] Tree-Shaking konfigurieren
- [ ] Code-Splitting für große Components
- [ ] Lazy Loading für selten genutzte Components
- [ ] Bundle-Size Report
- [ ] Target: < 50KB gzipped für Core

#### Migration Guides

- [ ] Finder → Framework (bereits erledigt)
- [ ] Terminal → Framework (Schritt-für-Schritt)
- [ ] TextEditor → Framework (Schritt-für-Schritt)
- [ ] Photos → Framework (Schritt-für-Schritt)
- [ ] Vor/Nach Code-Beispiele
- [ ] Fallstricke & Lösungen

#### Theme System

- [ ] CSS Variables für Farben
- [ ] Theme Provider Component
- [ ] Custom Themes Support
- [ ] Runtime Theme Switch ohne Reload

#### Accessibility Audit

- [ ] Alle Components: Keyboard-Navigation
- [ ] ARIA Labels, Roles, Live Regions
- [ ] Focus Management
- [ ] Color Contrast Check (WCAG AA)
- [ ] Skip Links
- [ ] Axe-Core Integration
- [ ] a11y Tests

**Deliverable:** Production-Ready Framework

---

## 📋 Testing & Quality Assurance

### Component Tests

- [ ] Unit Tests Setup (Playwright Component Testing)
- [ ] Template für Component Tests
- [ ] Tests für alle existierenden Components
- [ ] Coverage Target: 80%+

### Visual Regression Tests

- [ ] Screenshot-Vergleich Setup
- [ ] Baseline Screenshots erstellen
- [ ] Tests für alle Component-Varianten
- [ ] CI Integration

### Performance Tests

- [ ] Render-Time Benchmarks
- [ ] VDOM Diff Benchmarks
- [ ] Memory Leak Tests
- [ ] Large Dataset Tests (Virtual List)

---

## 📋 Documentation

### API Reference

- [ ] Core: BaseComponent, Store, ErrorBoundary
- [ ] Layout: AppShell, SplitView
- [ ] Navigation: Sidebar, Toolbar, Tabs, Breadcrumbs
- [ ] Data: ListView, GridView, DataView, Tree, VirtualList, Table
- [ ] Controls: Button, Input, Select, Checkbox, Radio
- [ ] Feedback: Toast, Badge, EmptyState, ProgressBar, Modal
- [ ] Interaction: ContextMenu, Dropdown, Tooltip, DragDrop, Shortcuts

### Guides

- [ ] Getting Started
- [ ] Creating Custom Components
- [ ] State Management Best Practices
- [ ] Performance Optimization
- [ ] Accessibility Guidelines
- [ ] Testing Components

### Examples

- [ ] Simple Form Example
- [ ] Data Table with Sorting
- [ ] Tree Navigation
- [ ] Modal with Form
- [ ] Toast Notifications
- [ ] Keyboard Shortcuts

---

## 📋 Integration & Rollout

### Finder (Bereits Migriert)

- [x] AppShell
- [x] SplitView
- [x] Sidebar
- [x] Toolbar
- [x] Tabs
- [x] Breadcrumbs
- [x] DataView (List/Grid)
- [ ] Button (Native Buttons ersetzen)
- [ ] Toast (GitHub API Errors)
- [ ] EmptyState (Leere Repos)
- [ ] ErrorBoundary (um FinderUI)

### Terminal

- [ ] AppShell
- [ ] Toolbar (Commands)
- [ ] Input (Command Line)
- [ ] Button (Clear, Reset)
- [ ] Toast (Error Notifications)
- [ ] EmptyState (No Sessions)
- [ ] ErrorBoundary (um Session)
- [ ] Badge (History Count)

### TextEditor

- [ ] AppShell
- [ ] SplitView (Editor + Preview)
- [ ] Tabs (Multi-Document)
- [ ] Input (Find/Replace)
- [ ] Button (Save, Load, Format)
- [ ] Toast (Save Success)
- [ ] EmptyState (No File Open)
- [ ] ErrorBoundary (um Editor)
- [ ] Tree (File Explorer)

### Photos

- [ ] AppShell
- [ ] GridView (Image Gallery)
- [ ] Modal (Image Details)
- [ ] ProgressBar (Upload)
- [ ] EmptyState (No Images)
- [ ] Toast (Upload Complete)

---

## 📋 Metriken & KPIs

### Code Quality

- [ ] Type Coverage: 85%+ (aktuell 79%)
- [ ] Test Coverage: 80%+ für Framework
- [ ] Zero ESLint Errors
- [ ] Zero TypeScript Errors

### Bundle Size

- [ ] Core: < 20 KB gzipped
- [ ] Layout: < 10 KB gzipped
- [ ] Navigation: < 15 KB gzipped
- [ ] Data: < 20 KB gzipped
- [ ] Controls: < 20 KB gzipped
- [ ] Feedback: < 10 KB gzipped
- [ ] Total: < 100 KB gzipped

### Performance

- [ ] Initial Render: < 60ms
- [ ] Re-Render: < 15ms (100 nodes)
- [ ] VDOM Diff: < 10ms
- [ ] Component Mount: < 5ms

### Developer Experience

- [ ] Time to New Component: < 30min
- [ ] Lines of Code Reduction: -40%
- [ ] Documentation: 100% complete
- [ ] Onboarding: < 1 day

---

## 📋 Release Checklist

### v1.0.0 (Nach Phase 1)

- [ ] Alle Phase 1 Tasks abgeschlossen
- [ ] Terminal erfolgreich migriert
- [ ] Dokumentation vollständig
- [ ] Tests bestehen (100%)
- [ ] Performance-Tests bestanden
- [ ] Changelog erstellt
- [ ] Git Tag erstellt

### v1.1.0 (Nach Phase 2)

- [ ] Alle Phase 2 Tasks abgeschlossen
- [ ] TextEditor teilweise migriert
- [ ] Neue Komponenten dokumentiert
- [ ] Changelog aktualisiert

### v2.0.0 (Nach Phase 4)

- [ ] Alle Phasen abgeschlossen
- [ ] Alle Apps migriert
- [ ] Production-Ready
- [ ] Migration Guides vollständig
- [ ] Performance-Metriken erreicht

---

## 📊 Progress Tracking

```
Overall Progress: ░░░░░░░░░░░░░░░░░░░░ 0/100 (0%)

Phase 1:  ░░░░░░░░░░░░░░░░░░░░ 0/50 (0%)
Phase 2:  ░░░░░░░░░░░░░░░░░░░░ 0/25 (0%)
Phase 3:  ░░░░░░░░░░░░░░░░░░░░ 0/20 (0%)
Phase 4:  ░░░░░░░░░░░░░░░░░░░░ 0/5  (0%)
```

---

**Nächster Schritt:** Button Component implementieren (Tag 1, Aufgabe 1)

**Geschätzte Zeit bis v1.0.0:** 2-3 Tage  
**Geschätzte Zeit bis v2.0.0:** 2-3 Wochen

---

Letzte Aktualisierung: 2026-01-06
