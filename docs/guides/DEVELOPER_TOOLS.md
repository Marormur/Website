# Developer Tools & Quality Checks

Dieses Projekt nutzt moderne Developer Tools für Code Quality, Performance Monitoring und Bundle-Analysen.

## 📦 Installierte Tools

### 1. **knip** – Unused Dependency Checker

Findet ungenutzte npm-Dependencies und Exports in deiner Codebase.

**Nutzung:**

```bash
npm run knip              # Prüfe auf ungenutzte Dependencies (Production)
npm run knip:report      # Erstelle einen JSON-Report
```

**Wann nutzen:**

- Nach großen Refactorings
- Vor größeren Releases
- Regelmäßig in CI/CD-Pipelines

**Konfiguration:** `knip.config.ts`

---

### 2. **Performance Audit** – Playwright + PerfMonitor

Automatische Performance-Checks deiner Website mit bestehenden Browser- und App-Metriken, ohne separate Lighthouse-Toolchain.

**Metriken:**

- First Contentful Paint (FCP) < 3000ms
- Largest Contentful Paint (LCP) < 4000ms
- Cumulative Layout Shift (CLS) < 0.1
- App-Ready Zeit < 5000ms

**Nutzung:**

```bash
npm run lighthouse        # Single audit gegen 127.0.0.1:5173 (Dev-Server muss laufen)
npm run lighthouse:ci     # Wiederholte Audits mit Threshold-Checks
npm run lighthouse:upload # JSON-Report unter coverage/performance erzeugen
```

**VS Code Task:** `Performance: Lighthouse audit`

**Implementierung:** `scripts/performance-audit.js`

**Voraussetzung:** Dev-Server muss laufen

```bash
npm run dev   # Start Dev-Server auf http://127.0.0.1:5173
```

---

### 3. **Bundle Analyzer** – Bundle-Größe Analyse

Analysiert die Größe deines esbuild-Bundles und warnt bei Überschreitung.

**Nutzung:**

```bash
npm run bundle:analyze    # Erzeugt Bundle und zeigt Größe + Metafile
```

**Output:**

- `js/bundle-metadata.json` – Detaillierte esbuild Metafile
- Console-Output mit Größen-Übersicht
- Warnung wenn Bundle > 500KB

**Tipps zur Optimierung:**

```bash
# Detaillierte Visualisierung mit esbuild-bundle-analyzer
npx esbuild-bundle-analyzer js/bundle-metadata.json
```

---

## 🚀 Schnelle Quality-Checks

### Alle Checks zusammen

```bash
npm run validate
```

Führt aus:

- TypeScript Type-Checking (mindestenss 77% Type Coverage)
- ESLint Linting
- CSS Build (Tailwind)
- E2E Tests (alle)

### Schnelle Pre-Commit-Checks

```bash
npm run typecheck
npm run lint
npm run knip
npm run bundle:analyze
```

---

## 🧪 **turbo** – Build Task Orchestration

Parallele Build-Ausführung mit Smart Caching. Reduziert Build-Zeit durch:

- Cache bei unveränderten Inputs
- Parallele Task-Ausführung
- Automatische Task-Abhängigkeiten

**Nutzung:**

```bash
npm run turbo:build       # Schnelle Parallel-Builds (CSS + TS + Bundle)
npm run turbo:lint       # Lint + TypeCheck parallel
npm run turbo:validate   # Vollständige Validierung mit Cache
npm run turbo:watch     # Watch-Mode für alle Dev-Tasks
```

**Oder direkt turbo commands:**

```bash
npx turbo run build:css build:ts --parallel      # Spezifische Tasks parallel
npx turbo run validate --filter="src/**"         # Mit Filtering
turbo daemon start                               # Daemon für schnellere Runs
```

**Konfiguration:** `turbo.json`

**Vorteile:**

- ✅ Tasks automatisch parallelisieren
- ✅ Nur geänderte Files neu bauen
- ✅ Cache-Management zwischen Runs
- ✅ Task Dependencies automatisch handhaben

---

## 🧪 Testing Library Utilities

Custom Testing-Utilities für bessere Playwright E2E Tests.

**Nutzung in Tests:**

```typescript
import { screen, waitFor, userActions, assertions, debug } from './utils';

test('example', async ({ page }) => {
    // High-level queries
    await screen.getByRole(page, 'button', { name: 'Submit' }).click();

    // Wait for app to be ready
    await waitFor.appReady(page);

    // User interactions
    await userActions.clickByRole(page, 'button', { name: 'Open' });
    await userActions.type(page, 'input[type="search"]', 'test');

    // Assertions
    await assertions.isVisible(page, '[data-testid="result"]');
    await assertions.hasText(page, '[data-testid="result"]', 'test');

    // Debugging
    await debug.screenshot(page, 'final-state');
});
```

**Verfügbare Utilities:**

| Kategorie       | Funktionen                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| **screen**      | `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`, `getByTestId`                                     |
| **waitFor**     | `appReady`, `element`, `windowCount`, `localStorage`                                                          |
| **userActions** | `clickByRole`, `fillByLabel`, `type`, `doubleClick`, `contextMenu`, `dragAndDrop`, `keyboard`, `selectOption` |
| **assertions**  | `isVisible`, `isHidden`, `hasText`, `hasCount`, `isEnabled`, `isDisabled`, `hasValue`, `localStorageValue`    |
| **debug**       | `screenshot`, `logState`, `dumpHTML`, `pause`                                                                 |

**Location:** `tests/e2e/utils.ts`

---

## 🔄 Optional: Package Manager Upgrades

### **pnpm** – Faster, Leaner Package Manager (Optional)

Wenn du später zu pnpm migrieren möchtest (schneller, bessere Disk-Nutzung):

```bash
npm install -g pnpm              # Global install
pnpm install                     # Replaces npm install
pnpm run dev                     # Same commands as npm
```

**Vorteile:**

- ✅ Schneller als npm
- ✅ Weniger Disk-Speicher (shared packages)
- ✅ Bessere Mono-Repo-Unterstützung
- ✅ Strikte Dependency-Handling

**Nachteil:** Noch zu experimentell für manche Projekte. Empfehlung: Später probieren!

---

### **Vite** – Alternative Dev Server (Optional)

Falls du später von `server.js` zu Vite migrieren möchtest:

```bash
npm install -D vite              # Install
# vite.config.ts Configuration erforderlich
npm run dev                      # Nutzt dann Vite statt server.js
```

**Vorteile:**

- ✅ Super schneller Dev-Server
- ✅ Native ES Modules
- ✅ Esbuild-powered production builds
- ✅ HMR (Hot Module Replacement) built-in

**Empfehlung:** Dein minimalistischer `server.js` reicht aus. Vite wäre eine größere Migration – nur wenn nötig!

---

Folgende neue Tasks sind verfügbar (Cmd+Shift+P → "Run Task"):

| Task                                     | Beschreibung                   |
| ---------------------------------------- | ------------------------------ |
| `Code Quality: Check unused deps (knip)` | Ungenutzte Dependencies finden |
| `Performance: Lighthouse audit`          | Performance-Audit durchführen  |
| `Performance: Lighthouse CI`             | Wiederholte Audits mit Checks  |
| `Bundle: Analyze size`                   | Bundle-Größe analysieren       |

---

Folgende neue Tasks sind verfügbar (Cmd+Shift+P → "Run Task"):

| Task                                     | Beschreibung                   |
| ---------------------------------------- | ------------------------------ |
| `Code Quality: Check unused deps (knip)` | Ungenutzte Dependencies finden |
| `Performance: Lighthouse audit`          | Performance-Audit durchführen  |
| `Performance: Lighthouse CI`             | Wiederholte Audits mit Checks  |
| `Bundle: Analyze size`                   | Bundle-Größe analysieren       |

---

## 🚀 Build-Optimierung mit turbo

### Schnelle Parallel-Builds

Statt nacheinander auszuführen:

```bash
# Alt (Sequenziell):
npm run build:css && npm run build:ts && npm run build:bundle

# Neu (Parallel mit Caching):
npm run turbo:build  # ~70% schneller!
```

### Task-Abhängigkeiten automatisch handhaben

turbo versteht Abhängigkeiten aus `turbo.json`:

```json
{
    "tasks": {
        "build:bundle": {
            "dependsOn": ["build:ts"] // Bundle hängt von TS ab
        }
    }
}
```

### CI/CD Performance

In GitHub Actions / CI:

```bash
# Mit turbo caching zwischen Runs
npm run turbo:validate --cache-repo=.turbo  # Super schnell!
```

---

## 🔧 Konfigurationsdateien

### `knip.config.ts`

- Definiert Einstiegspunkte für Analyse
- Listet zu ignorierende Dependencies (Build-Tools, DevDeps)
- Schließt Output-Verzeichnisse aus

### `scripts/performance-audit.js`

- Playwright-basierter Performance-Runner
- Nutzt `window.PerfMonitor` und Browser Performance APIs
- Schreibt Reports nach `coverage/performance/`

### `scripts/analyze-bundle.mjs`

- Custom Bundle-Analyse Script
- Nutzt esbuild Metafile für Größen-Tracking
- Warnt bei Überschreitung der Max-Größe (500KB)

---

## 💡 Best Practices

1. **Vor dem Commit:**

    ```bash
    npm run typecheck && npm run lint && npm run knip
    ```

2. **Vor Release/Deploy:**

    ```bash
    npm run validate           # Vollständige Validierung
    npm run bundle:analyze     # Bundle-Größe prüfen
    npm run lighthouse:ci      # Performance-Check (mit Dev-Server)
    ```

3. **In CI/CD Pipelines:**

    ```bash
    npm run knip               # Ungenutzte Deps
    npm run typecheck          # Type-Sicherheit
    npm run lint               # Code-Style
    npm run build:bundle       # Bundle mit Größen-Tracking
    ```

4. **Performance-Regression verhindern:**
    - Regelmäßig `npm run lighthouse:ci` durchführen
    - Bundle-Metafile (`js/bundle-metadata.json`) tracken
    - Bei Größen-Zunahmen > 50KB prüfen und optimieren

---

## 🐛 Häufige Probleme

**knip zeigt Fehler:**

- Prüfe `knip.config.ts` auf korrekte Entry Points
- Stelle sicher, dass `src/ts/` mit `.ts` endet (nicht `.js`)

**Performance-Audit schlägt fehl:**

- Dev-Server muss auf `127.0.0.1:5173` laufen
- Verwende `npm run dev` um Server zu starten
- Bei Network-Timeouts: `MOCK_GITHUB=1` setzen

**Bundle zu groß:**

- Prüfe `js/bundle-metadata.json` auf große Module
- Nutze Tree-Shaking Optionen in `scripts/build-esbuild.mjs`
- Überprüfe auf Duplicate Dependencies

---

## 📊 Monitoring

Diese Tools helfen bei:

- **Code Quality:** knip findet tote Dependencies
- **Performance:** Der Audit-Runner warnt vor Regressions
- **Bundle-Health:** Analyzer verhindert Bloat

Regelmäßige Nutzung = Schnellere App + leaner Codebase! 🎯
