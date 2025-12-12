# Copilot Quick Guide – macOS-Style Portfolio (Website)

## Projekt-Übersicht

Eine persönliche Portfolio-Website mit Desktop-Metapher im macOS-Stil. Zentrale Features:
- **Fenstersystem**: Draggable windows mit Multi-Instance Support (mehrere Fenster/Tabs pro App)
- **Apps**: Finder (GitHub-Browser), Terminal (VirtualFS), TextEditor, Photos, Launchpad
- **Theming**: Dark/Light/System Mode mit Persistenz
- **i18n**: DE/EN mit Runtime-Switch
- **Architektur**: TypeScript (100% migriert), Tailwind CSS, Event-driven (ActionBus), Session Management

**Tech Stack**: TypeScript 5.9+ (Strict Mode), Tailwind CSS 3.4, Playwright Tests, esbuild bundler

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

## Dateistruktur

```
src/ts/               # TypeScript Source (maßgeblich!)
├── core/             # app-init, api, constants, error-handler, logger, perf-monitor
├── services/         # i18n, theme, storage, session-manager, virtual-fs, github-api
├── ui/               # action-bus, dialog, menu, dock, desktop, context-menu, keyboard-shortcuts
├── windows/          # base-window, window-manager, window-tabs, instance-manager
└── apps/             # finder, terminal, text-editor, photos (jeweilige Window/Instance-Klassen)
    ├── finder/       # GitHub-Browser mit Repository-Navigation
    ├── terminal/     # Terminal-Emulation mit VirtualFS
    ├── text-editor/  # Multi-Tab Text-Editor
    └── photos/       # Bildbetrachter (Picsum-Galerie)

src/css/              # CSS Source (style.css, dialog.css)
js/                   # Build Output (tsc + esbuild) – nicht direkt editieren!
dist/                 # Tailwind CSS Build Output (output.css)
tests/e2e/            # Playwright E2E Tests (~190 Tests)
index.html            # Hauptseite (Bundle-Loader)
```

## Projektkonventionen

- Keine direkten Änderungen in `js/` oder `dist/`; alle Quellen in `src/ts/` und `src/css/`
- Internationalisierung: `API.i18n.translate('key', 'fallback')`
- Theming: `API.theme.setPreference('dark'|'light'|'system')`
- Persistenz & App-Kommunikation über VirtualFS
- Error-Handling und Performance-Monitoring über zentrale Services nutzen
- **Kommentar-Policy**: Wichtige Invarianten, Nebenwirkungen, Reihenfolgen (Init/Restore), Fallbacks und öffentliche APIs dokumentieren (JSDoc/Inline)

## Wichtige Abhängigkeiten

- **TypeScript 5.9+**: Strict Mode, 79%+ Type Coverage erforderlich
- **Tailwind CSS 3.4**: Utility-first CSS, Build via PostCSS
- **Playwright**: E2E Testing Framework (~190 Tests)
- **esbuild**: Fast bundler für production builds (app.bundle.js)
- **ESLint + Prettier**: Code style enforcement (auto-format on save)

## Deployment

- Build-Outputs (`dist/`, `js/`) nicht committen (außer Bundle für Deployment)
- GitHub Pages: Auto-Deploy bei Push nach `main` (CI baut CSS via `.github/workflows/deploy.yml`)
- Production: Bundle-Modus (`npm run build:bundle`) wird automatisch geladen

## Häufige Aufgaben

### Neues Fenster/App hinzufügen
1. Window-Config in `src/ts/window-configs.ts` registrieren
2. HTML-Struktur in `index.html` hinzufügen
3. Window/Instance-Klassen in `src/ts/apps/<app-name>/` erstellen
4. Actions via ActionBus registrieren (`ActionBus.register(...)`)
5. Menü-Einträge in relevanten Menüs hinzufügen

### Neue Action hinzufügen
```typescript
// In src/ts/core/app-init.ts oder app-spezifischem Module
ActionBus.register('myAction', (params, element) => {
    // Logic here
});

// In HTML
<button data-action="myAction" data-param="value">Click</button>
```

### i18n-Text hinzufügen
1. Keys in `src/ts/i18n/translations.ts` hinzufügen (DE + EN)
2. Verwendung: `API.i18n.translate('key', 'fallback')`

## Gotchas & Wichtige Hinweise

- **localStorage**: Fenster-States, Theme, Sprache, VirtualFS werden persistiert. Bei Layout-Problemen: `localStorage.clear()` im Browser-DevTools
- **GitHub API Rate Limit**: Ohne Token 60 Requests/Stunde. Bei Entwicklung: `MOCK_GITHUB=1` nutzen
- **window.__APP_READY**: Tests müssen auf dieses Flag warten, bevor sie mit der App interagieren
- **Bundle vs. Non-Bundle**: Standard ist Bundle-Modus (`js/app.bundle.js`). Opt-out via `?bundle=0` oder `localStorage.USE_BUNDLE='0'`
- **Build-Output**: `js/` und `dist/` sind generiert – NIEMALS direkt editieren! Immer `src/ts/` und `src/css/` ändern
- **Type Coverage**: Minimum 79% erforderlich (`npm run type:baseline`). Bei Änderungen prüfen!
- **Multi-Instance**: Apps wie Finder, Terminal, TextEditor unterstützen mehrere Instanzen gleichzeitig. Neue Apps sollten `BaseWindowInstance` nutzen

## Code-Änderungen: Best Practices

1. **Minimal Changes**: Nur notwendige Zeilen ändern, bestehende Patterns beibehalten
2. **Testing**: Min. 1 Smoke Test + 1 Edge-Case E2E für neue Features
3. **TypeScript First**: Alle neuen Module in `src/ts/` als TypeScript schreiben
4. **Incremental**: Kleine Commits, nach jeder funktionalen Einheit testen
5. **Dokumentation**: JSDoc für öffentliche APIs, Inline-Kommentare für komplexe Logik
6. **Validation**: Vor Commit: `npm run typecheck && npm run lint && npm run test:e2e:quick`

## Pflege

- Diese Datei minimal halten; bei größeren Architekturänderungen anpassen
- README (`readme.md`) gelegentlich aktualisieren; Hauptwissen in Code-Kommentaren halten.

## MCP-Tools kurz

- GitHub MCP Server: Reviews mit pending → Kommentare → submit. Vor Issues/PRs immer Suche + Pagination nutzen.
- Playwright MCP: Auf `window.__APP_READY` warten; headed/UI/quick Modi; `MOCK_GITHUB=1` für Stabilität.
