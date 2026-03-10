# MacUI Framework – Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MacUI Framework v1.0                              │
│                     (TypeScript + VDOM + Tailwind)                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   Core Layer     │      │  Component Layer │      │  Template Layer  │
│                  │      │                  │      │                  │
│ • BaseComponent  │      │ Layout           │      │ • StandardApp    │
│ • Store          │      │ • AppShell       │      │ • WindowTemplate │
│ • ErrorBoundary  │      │ • SplitView      │      │                  │
│ • Lifecycle      │      │                  │      │                  │
│ • Types          │      │ Navigation       │      │                  │
│                  │      │ • Sidebar        │      │                  │
│                  │      │ • Toolbar        │      │                  │
│                  │      │ • Tabs           │      │                  │
│                  │      │ • Breadcrumbs    │      │                  │
│                  │      │                  │      │                  │
│                  │      │ Data             │      │                  │
│                  │      │ • ListView       │      │                  │
│                  │      │ • GridView       │      │                  │
│                  │      │ • DataView       │      │                  │
│                  │      │                  │      │                  │
│                  │      │ Controls (NEW)   │      │                  │
│                  │      │ • Button         │      │                  │
│                  │      │ • Input          │      │                  │
│                  │      │ • Select         │      │                  │
│                  │      │ • Checkbox       │      │                  │
│                  │      │                  │      │                  │
│                  │      │ Feedback (NEW)   │      │                  │
│                  │      │ • Toast          │      │                  │
│                  │      │ • Badge          │      │                  │
│                  │      │ • EmptyState     │      │                  │
│                  │      │ • ProgressBar    │      │                  │
└──────────────────┘      └──────────────────┘      └──────────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────────┐
        │            Integration Layer                       │
        │                                                    │
        │  • ActionBus (Event System)                       │
        │  • API Facade (i18n, theme, storage)              │
        │  • WindowManager (Multi-Window Support)            │
        │  • SessionManager (Persistence)                    │
        └───────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   Finder App     │      │  Terminal App    │      │ TextEditor App   │
│                  │      │                  │      │                  │
│ ✅ Fully Migrated│      │ 🚧 In Progress   │      │ 📅 Planned       │
│                  │      │                  │      │                  │
│ Uses:            │      │ Will Use:        │      │ Will Use:        │
│ • AppShell       │      │ • AppShell       │      │ • AppShell       │
│ • SplitView      │      │ • Toolbar        │      │ • SplitView      │
│ • Sidebar        │      │ • Input          │      │ • Tabs           │
│ • Toolbar        │      │ • Button         │      │ • TreeView       │
│ • Tabs           │      │ • Toast          │      │ • ListView       │
│ • Breadcrumbs    │      │ • EmptyState     │      │ • Input          │
│ • DataView       │      │ • ErrorBoundary  │      │ • Button         │
│ • EmptyState     │      │                  │      │ • Toast          │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

## Komponentenmatrix

| Component       | Status  | Finder | Terminal | TextEditor | Photos | Priority |
| --------------- | ------- | ------ | -------- | ---------- | ------ | -------- |
| **Core**        |         |        |          |            |        |          |
| BaseComponent   | ✅ Done | ✅     | ✅       | ✅         | ✅     | Critical |
| Store           | ✅ Done | ✅     | ⚪       | ⚪         | ⚪     | Medium   |
| ErrorBoundary   | 🚧 TODO | 📅     | 📅       | 📅         | 📅     | Critical |
| **Layout**      |         |        |          |            |        |          |
| AppShell        | ✅ Done | ✅     | 📅       | 📅         | 📅     | High     |
| SplitView       | ✅ Done | ✅     | ⚪       | 📅         | ⚪     | High     |
| **Navigation**  |         |        |          |            |        |          |
| Sidebar         | ✅ Done | ✅     | ⚪       | 📅         | ⚪     | High     |
| Toolbar         | ✅ Done | ✅     | 📅       | 📅         | ⚪     | High     |
| Tabs            | ✅ Done | ✅     | 📅       | 📅         | ⚪     | High     |
| Breadcrumbs     | ✅ Done | ✅     | ⚪       | 📅         | ⚪     | Medium   |
| **Data**        |         |        |          |            |        |          |
| ListView        | ✅ Done | ✅     | ⚪       | 📅         | ⚪     | High     |
| GridView        | ✅ Done | ✅     | ⚪       | ⚪         | 📅     | Medium   |
| DataView        | ✅ Done | ✅     | ⚪       | ⚪         | ⚪     | Medium   |
| Tree            | 🚧 TODO | 📅     | ⚪       | 📅         | ⚪     | Low      |
| VirtualList     | 🚧 TODO | 📅     | ⚪       | ⚪         | 📅     | Low      |
| **Controls**    |         |        |          |            |        |          |
| Button          | 🚧 TODO | 📅     | 📅       | 📅         | 📅     | Critical |
| Input           | 🚧 TODO | 📅     | 📅       | 📅         | 📅     | Critical |
| Select          | 🚧 TODO | 📅     | 📅       | 📅         | ⚪     | High     |
| Checkbox        | 🚧 TODO | ⚪     | 📅       | 📅         | ⚪     | Medium   |
| Radio           | 🚧 TODO | ⚪     | 📅       | 📅         | ⚪     | Low      |
| **Feedback**    |         |        |          |            |        |          |
| Toast           | 🚧 TODO | 📅     | 📅       | 📅         | 📅     | Critical |
| Badge           | 🚧 TODO | 📅     | 📅       | 📅         | ⚪     | Medium   |
| EmptyState      | 🚧 TODO | 📅     | 📅       | 📅         | 📅     | High     |
| ProgressBar     | 🚧 TODO | 📅     | ⚪       | 📅         | 📅     | Medium   |
| Modal           | 🚧 TODO | 📅     | 📅       | 📅         | 📅     | High     |
| **Interaction** |         |        |          |            |        |          |
| ContextMenu     | 🚧 TODO | 📅     | 📅       | 📅         | 📅     | High     |
| Dropdown        | 🚧 TODO | 📅     | 📅       | 📅         | ⚪     | Medium   |
| Tooltip         | 🚧 TODO | 📅     | 📅       | 📅         | 📅     | Medium   |

**Legend:**

- ✅ Done & In Use
- 🚧 TODO (Planned)
- 📅 Will Use (App will adopt when available)
- ⚪ Not Needed (App doesn't require this component)

## Datenfluss

```
┌─────────────┐
│ User Action │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   ActionBus         │ ← Event delegation
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Component          │
│  (BaseComponent)    │
│                     │
│  • Props change     │
│  • setState()       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  render()           │ → Returns VNode
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  VDOM diff()        │ → Generates patches
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  VDOM patch()       │ → Applies to real DOM
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Updated UI         │
└─────────────────────┘
```

## Verzeichnisstruktur (Nach Phase 1)

```
src/ts/framework/
├── core/
│   ├── component.ts          # BaseComponent (✅)
│   ├── types.ts              # Shared interfaces (✅)
│   ├── store.ts              # State management (✅)
│   ├── error-boundary.ts     # Error handling (🚧)
│   ├── framework-tab.ts      # BaseTab bridge (✅)
│   └── index.ts              # Exports
│
├── layout/
│   ├── app-shell.ts          # App container (✅)
│   ├── split-view.ts         # Resizable panels (✅)
│   └── index.ts
│
├── navigation/
│   ├── sidebar.ts            # Sidebar (✅)
│   ├── toolbar.ts            # Toolbar (✅)
│   ├── tabs.ts               # Tab bar (✅)
│   ├── breadcrumbs.ts        # Path navigation (✅)
│   └── index.ts
│
├── data/
│   ├── list-view.ts          # Tabular view (✅)
│   ├── grid-view.ts          # Grid layout (✅)
│   ├── data-view.ts          # Switcher (✅)
│   ├── tree.ts               # Hierarchical (🚧)
│   ├── virtual-list.ts       # Performance (🚧)
│   └── index.ts
│
├── controls/                 # NEW
│   ├── button.ts             # Button variants (🚧)
│   ├── input.ts              # Text inputs (🚧)
│   ├── select.ts             # Dropdowns (🚧)
│   ├── checkbox.ts           # Checkboxes (🚧)
│   ├── radio.ts              # Radio buttons (🚧)
│   └── index.ts
│
├── feedback/                 # NEW
│   ├── toast.ts              # Notification component (🚧)
│   ├── toast-manager.ts      # Toast singleton (🚧)
│   ├── badge.ts              # Status badges (🚧)
│   ├── empty-state.ts        # Empty views (🚧)
│   ├── progress-bar.ts       # Loading indicators (🚧)
│   └── index.ts
│
├── interaction/              # FUTURE
│   ├── context-menu.ts       # Right-click menus (📅)
│   ├── dropdown.ts           # Click menus (📅)
│   ├── tooltip.ts            # Hover info (📅)
│   └── index.ts
│
├── templates/
│   ├── standard-app.ts       # All-in-one template (✅)
│   └── index.ts
│
└── index.ts                  # Main export
```

## Bundle-Größen (Geschätzt)

| Module      | Current   | After Phase 1 | After Phase 4 | Target       |
| ----------- | --------- | ------------- | ------------- | ------------ |
| Core        | 8 KB      | 12 KB         | 15 KB         | < 20 KB      |
| Layout      | 6 KB      | 6 KB          | 8 KB          | < 10 KB      |
| Navigation  | 10 KB     | 10 KB         | 12 KB         | < 15 KB      |
| Data        | 8 KB      | 8 KB          | 15 KB         | < 20 KB      |
| Controls    | 0 KB      | 10 KB         | 15 KB         | < 20 KB      |
| Feedback    | 0 KB      | 5 KB          | 8 KB          | < 10 KB      |
| Interaction | 0 KB      | 0 KB          | 10 KB         | < 15 KB      |
| **Total**   | **32 KB** | **51 KB**     | **83 KB**     | **< 100 KB** |

_Alle Angaben gzipped_

## Performance-Benchmarks (Ziele)

| Metrik                | Current | Target Phase 1 | Target Phase 4 |
| --------------------- | ------- | -------------- | -------------- |
| Initial Render        | ~50ms   | ~60ms          | ~50ms          |
| Re-Render (100 nodes) | ~15ms   | ~15ms          | ~10ms          |
| VDOM Diff             | ~8ms    | ~8ms           | ~5ms           |
| Component Mount       | ~5ms    | ~6ms           | ~5ms           |
| Memory per Component  | ~2 KB   | ~2.5 KB        | ~2 KB          |

## Type Coverage

| Module      | Current | Phase 1 Target | Phase 4 Target |
| ----------- | ------- | -------------- | -------------- |
| Core        | 100%    | 100%           | 100%           |
| Layout      | 100%    | 100%           | 100%           |
| Navigation  | 100%    | 100%           | 100%           |
| Data        | 100%    | 100%           | 100%           |
| Controls    | N/A     | 100%           | 100%           |
| Feedback    | N/A     | 100%           | 100%           |
| **Overall** | **79%** | **85%**        | **90%+**       |

## Migration Progress

```
Finder:     ████████████████████ 100% (Fully Migrated)
Terminal:   ████░░░░░░░░░░░░░░░░  20% (In Progress)
TextEditor: ░░░░░░░░░░░░░░░░░░░░   0% (Not Started)
Photos:     ░░░░░░░░░░░░░░░░░░░░   0% (Not Started)

Phase 1 Completion: ░░░░░░░░░░░░░░░░░░░░   0% → Target: 100% in 3 days
Phase 2 Completion: ░░░░░░░░░░░░░░░░░░░░   0% → Target: 100% in 1 week
Phase 3 Completion: ░░░░░░░░░░░░░░░░░░░░   0% → Target: 100% in 2 weeks
Phase 4 Completion: ░░░░░░░░░░░░░░░░░░░░   0% → Target: 100% in 3 weeks
```

## Abhängigkeiten

```
External Dependencies:
- TypeScript 5.9+   (Compiler)
- Tailwind CSS 3.4  (Styling)
- Playwright        (Testing)
- esbuild           (Bundling)

Internal Dependencies:
- VDOM System       (src/ts/core/vdom.ts)
- API Facade        (src/ts/core/api.ts)
- ActionBus         (src/ts/ui/action-bus.ts)
- WindowManager     (src/ts/windows/)
- SessionManager    (src/ts/services/)
```

## Maintenance & Versioning

```
Version Strategy:
- v0.x.x: Pre-release (current)
- v1.0.0: After Phase 1 complete + Terminal migrated
- v1.x.x: Minor updates (new components, non-breaking)
- v2.0.0: Breaking changes (if needed)

Release Cycle:
- Patch: Bug fixes (immediate)
- Minor: New components (weekly)
- Major: Breaking changes (quarterly max)
```

## Testing Strategy

```
Component Tests (New):
- Unit Tests: Props, State, Lifecycle
- Integration Tests: Component interactions
- Visual Tests: Screenshot comparison
- a11y Tests: Accessibility compliance

Target Coverage:
- Unit: 80%+
- Integration: 60%+
- E2E: Critical paths only
- Visual: All components
```

---

**Letztes Update:** 2026-01-06  
**Autor:** GitHub Copilot Agent  
**Status:** ✅ Analyse abgeschlossen, 🚧 Implementierung ausstehend
