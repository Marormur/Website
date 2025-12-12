# Copilot Quick Guide – macOS-Style Portfolio (Website)

Kompakt und praxisnah. Primärquelle ist der Code; ausführliche Markdown-Doku wurde entfernt. Bitte Code gut kommentieren, damit Menschen und Copilot Kontext haben.

## Grundsätze

- Quellcode nur in `src/ts/` (TypeScript) und `src/css/` (Tailwind) pflegen
- `js/` ist Build-Output (tsc + esbuild) – nicht direkt editieren
- README und diese Datei gelegentlich pflegen, aber **Code-Kommentare sind maßgeblich**
- Bevorzugt aussagekräftige Inline-Kommentare/JSDoc an öffentlichen APIs, komplexer Logik, Fallbacks und Invarianten

## Architektur auf einen Blick (evolving)

- **WindowManager**: Zentrale Fenster-/Modalsteuerung (Quellen in `src/ts/windows/`)
- **ActionBus**: Deklarative Aktionen über `data-action`-Attribute statt ad-hoc Event-Handler
- **VirtualFS**: Persistente Dateisystem-Schicht für Finder & Terminal
- **API-Aggregator**: Zentrale Schnittstelle für i18n, theme, storage, system (z.B. `API.i18n.translate(...)`, `API.theme.setPreference(...)`)
- **Multi-Instance Support**: BaseWindowInstance-Pattern für mehrere Fenster/Tabs pro App-Typ

Hinweis: Das Projekt entwickelt sich weiter; Details können sich ändern. Halte Änderungen minimal und folge den Konventionen unten.

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

- Keine direkten Änderungen in `js/` oder `dist/`; alle Quellen in `src/ts/` und `src/css/`
- Internationalisierung: `API.i18n.translate('key', 'fallback')`
- Theming: `API.theme.setPreference('dark'|'light'|'system')`
- Persistenz & App-Kommunikation über VirtualFS
- Error-Handling und Performance-Monitoring über zentrale Services nutzen
- **Kommentar-Policy**: Wichtige Invarianten, Nebenwirkungen, Reihenfolgen (Init/Restore), Fallbacks und öffentliche APIs dokumentieren (JSDoc/Inline)

## Deployment

- Build-Outputs (`dist/`, `js/`) nicht committen (außer Bundle für Deployment)

## Pflege

- Diese Datei minimal halten; bei größeren Architekturänderungen anpassen
- README (`readme.md`) gelegentlich aktualisieren; Hauptwissen in Code-Kommentaren halten.

## MCP-Tools kurz

- GitHub MCP Server: Reviews mit pending → Kommentare → submit. Vor Issues/PRs immer Suche + Pagination nutzen.
- Playwright MCP: Auf `window.__APP_READY` warten; headed/UI/quick Modi; `MOCK_GITHUB=1` für Stabilität.
