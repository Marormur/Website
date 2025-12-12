# Copilot Quick Guide – macOS-Style Portfolio (Website)

Kompakt und praxisnah. Primärquelle ist der Code; ausführliche Markdown-Doku wurde entfernt. Bitte Code gut kommentieren, damit Menschen und Copilot Kontext haben.

## Grundsätze

- Quellcode nur in `src/ts/` (TypeScript) und `src/css/` (Tailwind) pflegen.
- `js/` ist Build-Output (tsc + esbuild). Nicht direkt editieren (siehe `js/README.md`).
- README (`readme.md`) gelegentlich pflegen, aber Kommentare im Code sind maßgeblich.
- Bevorzugt aussagekräftige Inline-Kommentare/JSDoc an öffentlichen APIs, komplexer Logik, Fallbacks und Invarianten.

## Architektur auf einen Blick (evolving)

- WindowManager: zentrale Fenster-/Modalsteuerung (`js/window-manager.js` → Quellen in `src/ts/`).
- ActionBus: deklarative Aktionen über `data-action` statt ad-hoc Handler (`js/action-bus.js`).
- Virtual FS: persistente Schicht für Finder & Terminal (`js/virtual-fs.js`).
- API: Aggregator für i18n/theme/storage/system (`js/api.js`), z. B. `API.i18n.translate(...)`, `API.theme.setPreference(...)`.

Hinweis: Das Projekt ist in der Anfangsphase; Details können sich ändern. Halte Änderungen minimal und folge den Konventionen unten.

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
- Bundel- und Mock-Modus: `USE_BUNDLE=1 MOCK_GITHUB=1` mit Quick/Full Tasks vorhanden.
- Beispiel-Task: „E2E: Test (basic smoke)“ startet erst Dev-Server, dann Quick-Test (env: `USE_NODE_SERVER=1`, `MOCK_GITHUB=1`).
- Schreibe für Features min. 1 Smoke + 1 Edge-Case E2E. Nutze explizite `waitForSelector` statt Timeouts.

## Projektkonventionen

- Keine direkten Änderungen in `js/`/`css/`; alle Quellen in `src/ts/`, `src/css/`.
- Fenster hinzufügen/ändern über zentrale Configs (`window-configs`) statt verstreuter Logik.
- Internationalisierung: `API.i18n.translate('key', 'fallback')`; Theming: `API.theme.setPreference('dark'|'light'|'system')`.
- Persistenz & Kommunikation zwischen Apps (Finder/Terminal) erfolgt über VFS (`virtual-fs.js`).
- Fehler- und Performance-Hooks: `error-handler.js`, `perf-monitor.js`.
- Kommentar-Policy: Wichtige Invarianten, Nebenwirkungen, Reihenfolgen (Init/Restore), Fallbacks und öffentlich genutzte APIs kurz dokumentieren (JSDoc/Inline).

## Deployment

- GitHub Pages Auto-Deploy auf Push nach `main` (CI baut CSS). `dist/output.css` nicht committen.

## Pflege

- README (`readme.md`) gelegentlich aktualisieren; Hauptwissen in Code-Kommentaren halten.

## MCP-Tools kurz

- GitHub MCP Server: Reviews mit pending → Kommentare → submit. Vor Issues/PRs immer Suche + Pagination nutzen.
- Playwright MCP: Auf `window.__APP_READY` warten; headed/UI/quick Modi; `MOCK_GITHUB=1` für Stabilität.

## Beispiele aus dem Codebase

- Fenster schließen über ActionBus: HTML-Button mit `data-action="closeWindow"`; Bus dispatch triggert `WindowManager`.
- VFS-Operationen sichtbar in Finder & Terminal: `touch`, `mkdir`, `rm` ändern denselben Zustand (`virtual-fs.js`).
