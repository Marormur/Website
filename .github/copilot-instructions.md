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
- Standardlauf: `npm run test:e2e:core` (stabiler Kern für den Alltag).
- Bereichslauf: `npm run test:e2e:stateful` für Finder/Session/Terminal nur bei betroffenen Änderungen.
- Volltests: `npm run test:e2e` (Headless), Varianten: headed/UI (`npm run test:e2e:headed`, `npm run test:e2e:ui`) nur bei größeren Änderungen.
- Quarantäne/Deep nur gezielt: `npm run test:e2e:quarantine` und `npm run test:e2e:deep`.
- Bei UI-Änderungen immer in beiden Themes (hell/dunkel) und beiden Sprachen testen, um Theme-UI-Fehler und i18n-Probleme früh zu erkennen.
- Änderungen immer in allen Modi verifizieren: Englisch/Deutsch, Hell/Dunkel, Desktop/Mobile.
- Bundle- und Mock-Modus: `USE_BUNDLE=1 MOCK_GITHUB=1` mit Quick/Full Tasks vorhanden.
- Beispiel-Task: „E2E: Test (basic smoke)“ startet erst Dev-Server, dann Quick-Test (env: `USE_NODE_SERVER=1`, `MOCK_GITHUB=1`).
- Tests nur risikobasiert ergänzen:
    - Kein Pflicht-Pattern "für jede Änderung neue Tests".
    - Neue E2E-Tests nur bei echtem User-Flow-Risiko oder bei reproduzierter Regression.
    - Für interne/technische Logik bevorzugt Unit-Tests statt zusätzlicher E2E.
    - Bestehende fragile E2E nicht ausweiten; nur stabilisieren oder gezielt ersetzen.
    - Nutze explizite `waitForSelector` statt Timeouts.

## Projektkonventionen

- Keine direkten Änderungen in `js/` oder `dist/`; alle Quellen in `src/ts/` und `src/css/`
- Internationalisierung: `API.i18n.translate('key', 'fallback')`
- Theming: `API.theme.setPreference('dark'|'light'|'system')`
- Persistenz & App-Kommunikation über VirtualFS
- Error-Handling und Performance-Monitoring über zentrale Services nutzen
- **Kommentar-Policy**: Wichtige Invarianten, Nebenwirkungen, Reihenfolgen (Init/Restore), Fallbacks und öffentliche APIs dokumentieren (JSDoc/Inline)

## Deployment

- Build-Outputs (`dist/`, `js/`) nicht committen; Deploy-Artefakte werden in CI aus den Quellen erzeugt.
- GitHub Pages: Auto-Deploy bei Push nach `main` über `.github/workflows/deploy.yml`.
- Deploy-Workflow baut aus Quellen: `npm run typecheck`, `npm run build:ts`, `npm run build:css`, `npm run build:bundle`, `npm run docs:generate`.
- Production: Bundle-Modus (`npm run build:bundle`) wird standardmäßig geladen.

## Pflege

- Diese Datei minimal halten; bei größeren Architekturänderungen anpassen
- README (`readme.md`) gelegentlich aktualisieren; Hauptwissen in Code-Kommentaren halten.
- Docs-Minimalismus: `docs/` nur für wirklich notwendige, langlebige Betriebsinfos nutzen; bevorzugt Wissen direkt als JSDoc/Inline-Kommentar an der Implementierung pflegen.
- Vor dem Hinzufügen neuer Markdown-Dokumente immer prüfen, ob die Info stattdessen als klarer Code-Kommentar an der betroffenen API/Logik besser aufgehoben ist.
- Link-first: Wenn Details bereits in `readme.md`, `CONTRIBUTING.md` oder `docs/guides/` gepflegt sind, hier nur kurz verweisen statt Inhalte zu duplizieren.
- Kommentarrichtlinien für TypeScript liegen ausgelagert in `.github/instructions/ts-commenting.instructions.md` (zielgerichtet via `applyTo: src/ts/**/*.ts`).
