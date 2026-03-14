## Grundsätze

- Quellcode nur in `src/ts/` (TypeScript) und `src/css/` (Tailwind) pflegen
- `js/` ist Build-Output (tsc + esbuild) – nicht direkt editieren
- README und diese Datei gelegentlich pflegen, aber **Code-Kommentare sind maßgeblich**
- Bevorzugt aussagekräftige Inline-Kommentare/JSDoc an öffentlichen APIs, komplexer Logik, Fallbacks und Invarianten

## Dev-Workflow

- Build: `npm run build:css` (Tailwind), `npm run build:ts` (TypeScript → js/)
- Watch: `npm run watch:css`, `npm run typecheck:watch`
- Dev-Server: `npm run dev` (http://127.0.0.1:5173). VS Code Task „Start Dev Server“ existiert.
- Bündeln: `npm run build:bundle`, Watch: `npm run dev:bundle` (VS Code Task „Bundle: Watch“)
- Komforttasks:
    - „Dev Environment: Start All“ startet CSS-Watch, TS-Watch und Dev-Server.
    - „Dev Environment: Start All (Bundle)“ inkludiert zusätzlich Bundle-Watch.

## Tests (Playwright)

- Schnelltest: `npm run test:e2e:quick` (lokal Chromium). Für Stabilität: `MOCK_GITHUB=1` und auf `window.__APP_READY` warten.
- Volltests: `npm run test:e2e` (Headless), Varianten: headed/UI (`npm run test:e2e:headed`, `npm run test:e2e:ui`).
- Bundle- und Mock-Modus: `USE_BUNDLE=1 MOCK_GITHUB=1` mit Quick/Full Tasks vorhanden.
- Beispiel-Task: „E2E: Test (basic smoke)“ startet erst Dev-Server, dann Quick-Test (env: `USE_NODE_SERVER=1`, `MOCK_GITHUB=1`).
- Schreibe für Features min. 1 Smoke + 1 Edge-Case E2E. Nutze explizite `waitForSelector` statt Timeouts.

## Projektkonventionen

- Keine direkten Änderungen in `js/` oder `dist/`; alle Quellen in `src/ts/` und `src/css/`
- Internationalisierung: `API.i18n.translate('key', 'fallback')`
- Theming: `API.theme.setPreference('dark'|'light'|'system')`
- Persistenz & App-Kommunikation über VirtualFS
- Error-Handling und Performance-Monitoring über zentrale Services nutzen
- **Kommentar-Policy**: Wichtige Invarianten, Nebenwirkungen, Reihenfolgen (Init/Restore), Fallbacks und öffentliche APIs dokumentieren (JSDoc/Inline)

## Deployment

- Build-Outputs (`dist/`, `js/`) nicht committen (außer Bundle für Deployment)
- GitHub Pages: Auto-Deploy bei Push nach `main` (CI baut CSS via `.github/workflows/deploy.yml`)
- Production: Bundle-Modus (`npm run build:bundle`) wird automatisch geladen

## Pflege

- Diese Datei minimal halten; bei größeren Architekturänderungen anpassen
- README (`readme.md`) gelegentlich aktualisieren; Hauptwissen in Code-Kommentaren halten.
- Docs-Minimalismus: `docs/` nur für wirklich notwendige, langlebige Betriebsinfos nutzen; bevorzugt Wissen direkt als JSDoc/Inline-Kommentar an der Implementierung pflegen.
- Vor dem Hinzufügen neuer Markdown-Dokumente immer prüfen, ob die Info stattdessen als klarer Code-Kommentar an der betroffenen API/Logik besser aufgehoben ist.
- Commit-Messages: sehr kurz und aussagekräftig, ohne unnötige Details (z. B. `finder navigation fixes`).

## Code-Dokumentationsrichtlinien (TS/Web)

Schreibe Code-Kommentare so, dass sie sowohl für Menschen als auch für AI-Agents klar nutzbar sind.

### Essenzielle Kommentar-Typen

- **PURPOSE**: Was macht diese Funktion oder dieser Block?
- **WHY**: Warum genau diese Implementierung? (nicht offensichtliche Entscheidungen)
- **INPUT/OUTPUT**: Parameter, Rückgabewert und relevante Seiteneffekte
- **ASSUMPTIONS**: Welche Bedingungen müssen vor dem Aufruf gelten?
- **EDGE CASES**: Wo wird es fehleranfällig oder tricky?
- **INVARIANTS**: Was bleibt immer wahr? (z. B. konsistente UI-/State-Kopplung)
- **DEPENDENCIES**: Was muss davor passiert sein (Init-Reihenfolge, Services, DOM)?
- **PERFORMANCE**: Kritische Optimierungen inkl. messbarer Wirkung
- **THREAD-SAFE / ASYNC-SAFE**: Nebenläufigkeits- und Async-Constraints (Reentrancy, Race Conditions)

### Beispiel-Muster (TypeScript)

```ts
/**
 * PURPOSE: Führt benachbarte Finder-Items zu renderbaren Gruppen zusammen.
 * WHY: Stable Sort + explizite Tie-Breaker vermeiden flackernde Reihenfolge
 *      bei identischem Zeitstempel über Restore-Zyklen hinweg.
 * INPUT: items (vorvalidiert), sortMode ('name' | 'date' | 'type')
 * OUTPUT: Deterministische Gruppenliste für das UI-Rendering
 * PERFORMANCE: Reduziert DOM-Updates im Mittel um ~30% in großen Ordnern
 * INVARIANT: Rückgabe enthält jedes valide Item genau einmal (keine Duplikate)
 * DEPENDENCY: Muss nach State-Restore, aber vor dem ersten Paint laufen
 */
export function buildFinderRenderGroups(
    items: FinderItem[],
    sortMode: SortMode
): FinderGroup[] {
    // ...
}
```

### AI-Agent-Kontextblöcke für komplexe Logik

Für komplexe Abläufe (Restore, VirtualFS, Rendering, Performance-Pfade) nutze explizite Kontextblöcke:

```ts
// ============================================================================
// CONTEXT FOR AI AGENTS:
// Before modifying this restore/render path:
// - Verify tab IDs remain stable across save/restore cycles
// - Ensure VirtualFS state and visible UI stay synchronized (no ghost tabs)
// - Test edge cases with multiple Finder windows and mixed sort modes
// - Benchmark: no measurable regression in initial render time on large datasets
// ============================================================================
```
