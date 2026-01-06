# MacUI Framework – Verbesserungen & Erweiterungen

## Überblick

Dieses Dokument identifiziert Verbesserungspunkte für das MacUI Framework, damit es als vollwertiges UI Framework für alle Apps (Terminal, TextEditor, Photos) genutzt werden kann. Das Framework wurde ursprünglich für den Finder entwickelt und muss nun generalisiert werden.

**Aktueller Status:** ~971 Zeilen Framework-Code, 5 Komponenten-Kategorien (Core, Layout, Navigation, Data, Templates)

---

## 1. Fehlende Kern-Komponenten

### 1.1 Form-Controls (Priorität: Hoch)

**Problem:** Keine wiederverwendbaren Input-Komponenten vorhanden.

**Benötigte Komponenten:**
- **`Input`**: Textfelder mit Validation Support
  - Unterstützung für Typen: text, password, email, number, search
  - Built-in Validierung (required, pattern, min/max)
  - Error-State und Fehlermeldungen
  - Prefix/Suffix Icons (z.B. Suchicon)
  - macOS-Style: Rounded corners, Focus-Ring

- **`Select`**: Dropdown-Menüs (aktuell nur natives `<select>` in Finder)
  - Custom Styling für macOS-Look
  - Keyboard-Navigation
  - Suchfunktion bei langen Listen
  - Gruppierte Options

- **`Button`**: Standardisierte Buttons
  - Varianten: primary, secondary, danger, ghost
  - Größen: small, medium, large
  - Loading-State mit Spinner
  - Icon + Text Kombinationen
  - macOS-Style Segmented Controls (wie in Finder-Toolbar)

- **`Checkbox` & `Radio`**: Custom Styled Controls
  - macOS-native Styling
  - Indeterminate-State für Checkboxen
  - Gruppierung für Radio-Buttons

**Use Cases:**
- Terminal: Settings/Preferences Dialog
- TextEditor: Find/Replace Dialog, Settings
- Photos: Metadata-Editor, Upload-Dialog
- Alle Apps: Filter-Controls, Preferences

---

### 1.2 Modal & Dialog System (Priorität: Hoch)

**Problem:** Dialoge sind aktuell über globales `window.Dialog` System, nicht Framework-integriert.

**Benötigte Komponenten:**
- **`Modal`**: Overlay mit Content
  - Backdrop (mit click-outside-to-close)
  - Animationen (fade in/out)
  - Focus-Trap (Keyboard-Navigation innerhalb Modal)
  - ESC-Key zum Schließen
  - Stacking (mehrere Modals übereinander)

- **`Dialog`**: Vorgefertigte Modal-Varianten
  - Alert Dialog (OK Button)
  - Confirm Dialog (OK/Cancel)
  - Prompt Dialog (Input + OK/Cancel)
  - Custom Content Dialog

- **`Sheet`**: macOS-Style Sheets (von oben einfahrend)
  - Für Preferences, Settings
  - Smooth Animation

**Use Cases:**
- Finder: "Datei erstellen" Dialog, Confirm Delete
- Terminal: Clear History Confirm
- TextEditor: Unsaved Changes Dialog, Find/Replace
- Photos: Image Properties, Upload Options

---

### 1.3 Context Menu & Dropdown (Priorität: Mittel)

**Problem:** Context-Menüs existieren global (`window.ContextMenu`), aber nicht als Framework-Komponente.

**Benötigte Komponenten:**
- **`ContextMenu`**: Wiederverwendbares Kontext-Menü
  - Trigger: right-click, programmatisch
  - Positionierung: auto-adjust bei Viewport-Grenzen
  - Submenu-Support
  - Icons, Shortcuts, Separators
  - Keyboard-Navigation

- **`Dropdown`**: Click-basiertes Menü
  - Ähnlich zu ContextMenu, aber für Button-Trigger
  - Alignment: left, right, center

- **`Tooltip`**: Hover-Informationen
  - Auto-Positionierung
  - Delay-Control
  - Rich Content Support (nicht nur Text)

**Use Cases:**
- Alle Apps: File/Edit/View Menüs
- Finder: Right-Click auf Items
- Terminal: Command History Dropdown
- TextEditor: Syntax Highlighting Menu

---

### 1.4 Status & Feedback (Priorität: Mittel)

**Problem:** Keine standardisierten Feedback-Komponenten.

**Benötigte Komponenten:**
- **`Toast`/`Notification`**: Temporäre Benachrichtigungen
  - Varianten: success, error, warning, info
  - Auto-Dismiss mit Countdown
  - Action-Buttons (z.B. "Undo")
  - Position: top-right, bottom-right, etc.
  - Stacking mehrerer Toasts

- **`ProgressBar`**: Fortschrittsanzeige
  - Determinate (0-100%)
  - Indeterminate (Loading Spinner)
  - Circular vs. Linear
  - Label/Percentage Text

- **`Badge`**: Status-Indikatoren
  - Zahlen (z.B. Notification Count)
  - Dots (z.B. Online/Offline Status)
  - Farben: primary, success, warning, danger

- **`EmptyState`**: Leere Zustände
  - Icon + Text + Optional Action Button
  - Z.B. "Keine Dateien gefunden", "Keine Suchergebnisse"

**Use Cases:**
- Finder: Upload Progress, "Repo cloned" Toast
- Terminal: Command Execution Spinner
- TextEditor: Save Success Toast, Character Count Badge
- Photos: Upload Progress, Empty Gallery State

---

### 1.5 Advanced Data Components (Priorität: Niedrig)

**Problem:** Nur einfache List/Grid Views vorhanden.

**Benötigte Komponenten:**
- **`Tree`**: Hierarchische Datenstruktur
  - Expand/Collapse
  - Lazy Loading
  - Checkbox-Support für Multi-Selection
  - Drag & Drop Reordering

- **`Table`**: Erweiterte Tabelle (über ListView hinaus)
  - Column Resizing
  - Column Reordering (Drag & Drop)
  - Fixed Headers beim Scrollen
  - Row Selection (Single/Multi)
  - Expandable Rows (Details)
  - Pagination

- **`VirtualList`**: Performance für große Datensätze
  - Window-based Rendering (nur sichtbare Items)
  - Smooth Scrolling
  - Dynamic Item Heights

**Use Cases:**
- Finder: Tree View für Folder-Hierarchie
- Terminal: Command History Table mit Timestamps
- TextEditor: File Explorer Tree, Symbol Outline
- Photos: Virtual Grid für 1000+ Bilder

---

## 2. Lifecycle & State Management Verbesserungen

### 2.1 Component Lifecycle Erweiterung (Priorität: Hoch)

**Aktuell:** Nur `onMount()`, `onUpdate()`, `onDestroy()`

**Fehlende Hooks:**
- **`onBeforeMount()`**: Vor DOM-Insertion (z.B. async Data Loading)
- **`onBeforeUpdate(prevProps, prevState)`**: Vor Re-Render (shouldComponentUpdate)
- **`onAfterUpdate(prevProps, prevState)`**: Nach DOM-Patch (z.B. Scroll-Position wiederherstellen)
- **`onError(error)`**: Error Boundary für Component-Tree

**Begründung:**
- Performance: `onBeforeUpdate` kann unnötige Re-Renders verhindern
- Debugging: `onAfterUpdate` für DOM-Messungen/Logging
- Robustheit: Error Boundaries verhindern App-Crash

---

### 2.2 Globaler State Management Verbesserung (Priorität: Mittel)

**Aktuell:** Einfacher `Store<T>` mit `setState()` und `subscribe()`

**Verbesserungen:**
- **Selektoren**: Zugriff auf Teil-States
  ```typescript
  const username = store.select(state => state.user.name);
  ```
- **Middleware**: Logging, DevTools Integration
- **Computed Values**: Abgeleitete States (wie Vue.js)
- **Persistent Store**: Auto-Sync mit localStorage
- **Store Composition**: Mehrere Stores kombinieren

**Beispiel Use Case:**
```typescript
const appStore = new Store({
  theme: 'dark',
  language: 'de',
  user: { name: 'Marvin', repos: [] }
});

// Component subscribes nur zu theme, nicht zu allem
const unsubscribe = appStore.subscribeToKey('theme', (theme) => {
  component.update({ theme });
});
```

---

### 2.3 Props Validation (Priorität: Niedrig)

**Aktuell:** Keine Runtime-Validierung, nur TypeScript Types

**Vorschlag:** PropTypes-ähnliches System
```typescript
class Button extends BaseComponent<ButtonProps> {
  static propTypes = {
    label: PropTypes.string.required,
    variant: PropTypes.oneOf(['primary', 'secondary']),
    onClick: PropTypes.func,
  };
}
```

**Vorteil:** Bessere Fehlermeldungen in Development Mode

---

## 3. Event-Handling & Interactions

### 3.1 Keyboard Shortcuts Framework (Priorität: Mittel)

**Problem:** Keyboard-Shortcuts sind aktuell App-spezifisch verstreut.

**Benötigte Features:**
- **`useShortcut(key, callback)`**: Hook für Components
- **Shortcut Scoping**: Global vs. Window vs. Component
- **Conflict Detection**: Warnung bei Duplikaten
- **Display Shortcuts**: Automatisch in Tooltips/Menüs
- **Platform Aware**: Cmd (macOS) vs. Ctrl (Windows)

**Beispiel:**
```typescript
class FinderUI extends BaseComponent {
  constructor(props) {
    super(props);
    this.registerShortcuts({
      'Cmd+N': this.newTab,
      'Cmd+W': this.closeTab,
      'Cmd+[': this.goBack,
      'Cmd+]': this.goForward,
    });
  }
}
```

---

### 3.2 Drag & Drop Framework (Priorität: Hoch)

**Problem:** Finder hat Tab-DnD, aber nicht generalisiert.

**Benötigte Features:**
- **`useDraggable(element, data)`**: Macht Element draggable
- **`useDropZone(element, onDrop)`**: Macht Element zur Drop-Zone
- **Visual Feedback**: Drag Preview, Drop Indicators
- **Constraints**: Restrict Dragging (horizontal/vertical only)
- **Multi-Item Drag**: Mehrere Elemente gleichzeitig

**Use Cases:**
- Finder: File Drag & Drop, Tab-Bewegung zwischen Fenstern
- Terminal: Session Tabs DnD
- TextEditor: File-Tabs Reordering
- Photos: Bildergalerie Reordering

---

### 3.3 Resize & Drag Handles (Priorität: Niedrig)

**Aktuell:** Nur SplitView hat Resize-Logic

**Generalisierung:**
- **`ResizeHandle`**: Generic Resize für beliebige Elemente
- **`DragHandle`**: Window Dragging (für Modal Positioning)
- **Constraints**: Min/Max Sizes, Aspect Ratio

---

## 4. Styling & Theming Verbesserungen

### 4.1 Theme System Integration (Priorität: Mittel)

**Aktuell:** Tailwind Dark Mode mit `dark:` Prefix

**Verbesserungen:**
- **CSS Variables**: Dynamische Farben
  ```css
  --color-primary: theme('colors.blue.500');
  --color-surface: theme('colors.gray.50');
  ```
- **Theme Provider**: Component-Tree mit Theme-Context
- **Custom Themes**: Nicht nur dark/light, auch custom colors
- **Runtime Theme Switch**: Ohne Page Reload

---

### 4.2 Responsive Design (Priorität: Niedrig)

**Aktuell:** Desktop-First, keine Mobile-Optimierung

**Verbesserungen:**
- **Breakpoint System**: sm, md, lg, xl
- **Mobile Components**: Drawer statt Sidebar, Bottom Sheets
- **Touch Gestures**: Swipe, Pinch-to-Zoom
- **Responsive Props**: `size={{ mobile: 'small', desktop: 'large' }}`

---

### 4.3 Animation System (Priorität: Niedrig)

**Aktuell:** Nur CSS Transitions

**Verbesserungen:**
- **Animation Hooks**: `useAnimation('fade-in')`
- **Präfab Animationen**: fade, slide, scale, bounce
- **Motion Preferences**: `prefers-reduced-motion` Support
- **Keyframe Builder**: Für komplexe Animationen

---

## 5. Developer Experience (DX)

### 5.1 Component Playground (Priorität: Mittel)

**Vorschlag:** Storybook-ähnliches System

- Alle Komponenten isoliert anzeigen
- Props interaktiv anpassen
- Verschiedene States/Variants testen
- Code-Snippets generieren

**Implementation:** Einfache HTML-Seite `/playground.html`

---

### 5.2 DevTools Integration (Priorität: Niedrig)

**Features:**
- Component Tree Inspector
- Props/State Viewer
- Performance Profiler (Re-Render Count)
- Event Log

**Implementation:** Browser Extension oder In-App Overlay

---

### 5.3 Code Snippets & Templates (Priorität: Niedrig)

**VS Code Integration:**
- Snippets für neue Components
- Templates für Standard-Patterns
- Auto-Import für Framework-Components

---

## 6. Testing & Quality

### 6.1 Component Testing (Priorität: Hoch)

**Aktuell:** Nur E2E Tests, keine Unit Tests für Komponenten

**Benötigte Tests:**
- **Unit Tests**: Props, State, Render-Output
- **Interaction Tests**: Click, Input, Keyboard
- **Visual Regression Tests**: Screenshot-Vergleich

**Vorschlag:** Playwright Component Testing
```typescript
test('Button renders correctly', async ({ mount }) => {
  const component = await mount(Button, { 
    props: { label: 'Click me' } 
  });
  await expect(component).toContainText('Click me');
  await component.click();
});
```

---

### 6.2 Accessibility (a11y) (Priorität: Hoch)

**Aktuell:** Teilweise ARIA-Attribute, aber nicht konsequent

**Verbesserungen:**
- **Keyboard Navigation**: Alle interaktiven Elemente
- **Screen Reader Support**: ARIA Labels, Roles, Live Regions
- **Focus Management**: Logical Focus Order, Focus Trap in Modals
- **Color Contrast**: WCAG AA/AAA Compliance
- **Skip Links**: "Skip to main content"

**Tools:**
- Axe-Core Integration für automatische Tests
- a11y Linter für Code

---

### 6.3 Performance Monitoring (Priorität: Mittel)

**Features:**
- **Render Time Tracking**: Wie lange braucht ein Component?
- **Re-Render Detection**: Unnötige Re-Renders markieren
- **VDOM Diff Stats**: Anzahl Patches pro Update
- **Memory Profiling**: Leak Detection

**Integration:** Mit bestehendem `PerfMonitor`

---

## 7. Dokumentation

### 7.1 Component API Docs (Priorität: Hoch)

**Aktuell:** Nur `MACUI_COMPONENTS.md` mit Basics

**Verbesserungen:**
- **Detaillierte API-Referenz**: Alle Props mit Types & Defaults
- **Usage Examples**: Code-Snippets für häufige Szenarien
- **Do's and Don'ts**: Best Practices
- **Props Table**: Markdown-Tabellen mit allen Props

**Beispiel:**
```markdown
## Button

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | string | required | Button text |
| variant | 'primary' \| 'secondary' | 'primary' | Visual style |
| onClick | () => void | - | Click handler |

### Examples

#### Primary Button
\`\`\`typescript
const btn = new Button({ label: 'Save', variant: 'primary' });
\`\`\`
```

---

### 7.2 Migration Guide (Priorität: Mittel)

**Zielgruppe:** Entwickler, die bestehende Apps migrieren

**Inhalt:**
- **Vor/Nach Vergleich**: Alter Code vs. Framework Code
- **Schritt-für-Schritt Anleitung**: Pro App-Typ
- **Fallstricke**: Häufige Fehler beim Migrieren
- **Compatibility Layer**: Falls Breaking Changes

---

### 7.3 Architecture Guide (Priorität: Niedrig)

**Inhalt:**
- **Design Decisions**: Warum VDOM? Warum keine React/Vue?
- **Performance Considerations**: Wann Framework, wann nicht?
- **Extensibility**: Wie neue Komponenten erstellen?
- **Patterns**: Best Practices für große Apps

---

## 8. Konkrete Prioritäten & Roadmap

### Phase 1: Essentials (2-3 Wochen)
**Ziel:** Framework produktionsreif für Terminal & TextEditor

1. **Form Controls**: Input, Button, Select ✅
2. **Modal System**: Integration ✅
3. **Lifecycle Hooks**: onBeforeUpdate, Error Boundaries ✅
4. **Component Tests**: Playwright Component Testing Setup ✅
5. **API Documentation**: Vollständige Props-Dokumentation ✅

### Phase 2: Enhanced UX (2-3 Wochen)
**Ziel:** Bessere Interaktionen & Feedback

1. **Context Menu**: Framework-Komponente ✅
2. **Toast System**: Notifications ✅
3. **Drag & Drop**: Generalisiert ✅
4. **Keyboard Shortcuts**: Framework-integriert ✅
5. **Accessibility**: ARIA, Keyboard Nav ✅

### Phase 3: Advanced Features (3-4 Wochen)
**Ziel:** Power-User Features & DX

1. **Tree Component**: Für Finder/TextEditor ✅
2. **Virtual List**: Performance für große Listen ✅
3. **State Management**: Selektoren, Middleware ✅
4. **Component Playground**: Isolierte Komponenten-Ansicht ✅
5. **Visual Regression Tests**: Screenshot-Vergleich ✅

### Phase 4: Polish & Optimization (2 Wochen)
**Ziel:** Production-Ready & Stabil

1. **Performance Profiling**: Bottleneck-Analyse ✅
2. **Bundle Size**: Tree-Shaking, Code-Splitting ✅
3. **Migration Guides**: Für alle Apps ✅
4. **Theme System**: CSS Variables ✅

---

## 9. Metriken für Erfolg

### Code-Qualität
- **Type Coverage**: Min. 85% (aktuell ~79%)
- **Test Coverage**: Min. 80% für Framework
- **Bundle Size**: < 50KB (gzipped) für Core Framework
- **Zero Runtime Errors**: In Production

### Developer Experience
- **Time to New Component**: < 30min (aktuell ~2h)
- **Lines of Code Reduction**: -40% für neue Apps
- **Onboarding Time**: Neue Entwickler < 1 Tag
- **Documentation**: Alle Komponenten dokumentiert

### Performance
- **Render Time**: < 16ms (60fps)
- **VDOM Diff**: < 10ms für 100 Nodes
- **Re-Render Overhead**: < 5% vs. Native DOM
- **Memory Leak**: 0 bekannte Leaks

---

## 10. Offene Fragen & Diskussionspunkte

### 10.1 Framework Scope
**Frage:** Soll das Framework auch außerhalb dieses Projekts nutzbar sein?

- **Pro:** Kann als eigenständige Bibliothek veröffentlicht werden
- **Contra:** Mehr Maintenance-Overhead, Versioning, Rückwärtskompatibilität

**Empfehlung:** Zunächst intern, später optional als Open-Source

### 10.2 TypeScript vs. JavaScript
**Frage:** Sollen Komponenten auch in JS nutzbar sein?

- **Pro:** Niedrigere Einstiegshürde
- **Contra:** Type Safety ist ein Kernfeature

**Empfehlung:** TypeScript First, aber gute JSDoc für JS-Nutzer

### 10.3 CSS-in-JS vs. Tailwind
**Frage:** Sollten Komponenten eigenes CSS mitbringen?

- **Pro:** Keine Tailwind-Abhängigkeit, portabler
- **Contra:** Bundle Size, Styling-Inkonsistenzen

**Empfehlung:** Weiter Tailwind, aber CSS Variables für Theming

### 10.4 Backward Compatibility
**Frage:** Wie gehen wir mit Breaking Changes um?

- **Pro Semver:** Klare Versionierung, Upgrade-Pfade
- **Contra:** Overhead für kleines internes Projekt

**Empfehlung:** Major-Version-Bumps bei Breaking Changes, Deprecation Warnings

---

## 11. Fazit

Das MacUI Framework hat ein solides Fundament (VDOM, BaseComponent, Layout/Navigation), aber es fehlen noch essenzielle Komponenten für produktiven Einsatz in allen Apps:

**Kritische Lücken:**
1. Form Controls (Input, Button, Select)
2. Modal/Dialog System Integration
3. Lifecycle Hooks (onBeforeUpdate, Error Boundaries)
4. Drag & Drop Generalisierung
5. Component Testing Infrastructure

**Quick Wins (< 1 Tag Implementierung):**
- Button Component mit Varianten
- Toast/Notification System
- Error Boundaries
- EmptyState Component
- Badge Component

**Long-Term Investments:**
- Virtual List (Performance)
- Tree Component (Komplexität)
- DevTools Integration
- Visual Regression Testing

**Empfohlener Start:** Phase 1 (Essentials) parallel mit Terminal-Migration als Testbed. Danach iterativ weitere Phasen.
