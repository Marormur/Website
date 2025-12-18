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

### 2. **Lighthouse CI** – Performance Audits

Automatische Performance-Audits deiner Website mit detaillierten Metriken.

**Metriken:**

- First Contentful Paint (FCP) < 3000ms
- Largest Contentful Paint (LCP) < 4000ms
- Cumulative Layout Shift (CLS) < 0.1
- Interactive Time < 5000ms

**Nutzung:**

```bash
npm run lighthouse        # Single audit gegen 127.0.0.1:5173 (Dev-Server muss laufen)
npm run lighthouse:ci     # Wiederholte Audits mit Threshold-Checks
npm run lighthouse:upload # Ergebnisse in Lighthouse Server hochladen
```

**VS Code Task:** `Performance: Lighthouse audit`

**Konfiguration:** `lighthouserc.json`

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

## 📋 VS Code Tasks

Folgende neue Tasks sind verfügbar (Cmd+Shift+P → "Run Task"):

| Task                                     | Beschreibung                   |
| ---------------------------------------- | ------------------------------ |
| `Code Quality: Check unused deps (knip)` | Ungenutzte Dependencies finden |
| `Performance: Lighthouse audit`          | Performance-Audit durchführen  |
| `Performance: Lighthouse CI`             | Wiederholte Audits mit Checks  |
| `Bundle: Analyze size`                   | Bundle-Größe analysieren       |

---

## 🔧 Konfigurationsdateien

### `knip.config.ts`

- Definiert Einstiegspunkte für Analyse
- Listet zu ignorierende Dependencies (Build-Tools, DevDeps)
- Schließt Output-Verzeichnisse aus

### `lighthouserc.json`

- Lighthouse CI Konfiguration
- Performance-Thresholds
- Anzahl der Audit-Durchläufe (default: 3)

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

**Lighthouse schlägt fehl:**

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
- **Performance:** Lighthouse warnt vor Regressions
- **Bundle-Health:** Analyzer verhindert Bloat

Regelmäßige Nutzung = Schnellere App + leaner Codebase! 🎯
