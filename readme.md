# Marvins Portfolio – Desktop‑Style Web App

Eine persönliche Portfolio‑Website mit Desktop‑Metapher im macOS‑Stil: Fenster, Modale, Menüleiste, Dark Mode, Mehrsprachigkeit (DE/EN), Multi-Instance Support und integrierter GitHub-Projekte‑Browser. Zusätzlich: Texteditor, Terminal, Bildbetrachter (Photos) und Launchpad.

## Features

- **macOS-Style Desktop**: Fenster, Modals, Menüleiste mit dynamischen Kontextmenüs
- **Multi-Instance Support**: Mehrere Fenster/Tabs pro App (Finder, Terminal, TextEditor) gleichzeitig
- **Apps**: Finder (GitHub-Browser), Terminal (VirtualFS), TextEditor, Photos (Picsum-Galerie), Launchpad
- **VirtualFS**: Gemeinsames Dateisystem für Finder & Terminal mit Persistenz
- **Session Management**: Auto-Save, vollständige State-Wiederherstellung nach Reload
- **Dark Mode**: System/Hell/Dunkel mit `localStorage`-Persistenz
- **i18n**: Deutsch/Englisch mit Sprachwechsel zur Laufzeit
- **TypeScript**: 100% migriert, Strict Mode, 79% Type Coverage

## Projektstruktur

```
/ts/           # TypeScript Source (maßgeblich!)
│   ├── core/        # app-init, api, constants, error-handler, logger, perf-monitor
│   ├── services/    # i18n, theme, storage, session-manager, multi-window-session, virtual-fs
│   ├── ui/          # action-bus, dialog, menu, dock, desktop, context-menu, keyboard-shortcuts
│   ├── windows/     # base-window, window-manager, window-tabs, instance-manager, window-chrome
│   └── apps/        # finder, terminal, text-editor, photos (jeweilige Window/Instance-Klassen)
├── src/css/          # CSS Source (style.css, dialog.css)
├── js/               # Build Output (tsc + esbuild) – nicht direkt editieren!
├── tests/e2e/        # Playwright E2E Tests (~190 Tests)
├── dist/             # Tailwind CSS Build Output (output.css)
├── index.html        # Hauptseite (Bundle-Loader)
└── app.js            # Legacy Entry Point (wird durch Bundle ersetzt
└── i18n.js           # 🌍 Internationalisierung (DE/EN)
```

## Schnellstart

```bash
# Dependencies installieren
npm install

# CSS bauen
npm run build:css

# Development Server starten
npm install          # Dependencies
npm run build:css    # Tailwind CSS bauen
npm run build:ts     # TypeScript kompilieren
npm run dev          # Dev-Server starten (http://127.0.0.1:5173)
```

**Entwicklung:** VS Code Task „Dev Environment: Start All" startet CSS-Watch, TS-Watch und Dev-Server gleichzeitig.

**Alternative:** `index.html` direkt im Browser (localhost empfohlen für GitHub API ohne CORS-Probleme).

- 8 Kern-Module migriert (3,664 Zeilen TypeScript-Code)
- Full TypeScript Strict Mode (Level 6/6)
- Type Coverage: 81.79% baseline
- Zero compilation errors

````bash
# TypeScript typecheck
**Migration: 100% Complete! ✅**

- Vollständig migriert: 8 Kern-Module, 3,664 LoC TypeScript
- Strict Mode (Level 6/6), Type Coverage: 79% (baseline)
- Alle Änderungen in `src/ts/` durchführen; `js/` ist Build-Output

```bash
npm run typecheck           # Type-Check ohne Build
npm run typecheck:watch     # Watch-Modus
npm run build:ts            # Kompilieren nach js/
npm run build:bundle        # esbuild Bundle (app.bundle.js)
npm run type:baseline       # Coverage-Check (≥79%)
````

**Bundle-Modus:** Standard-Lademodus; nutzt `js/app.bundle.js` (esbuild IIFE). Opt-out via `?bundle=0` oder `localStorage.USE_BUNDLE='0'`.GitHub‑Integration und Limits

- Standardnutzer ist in `app.js`/`projekte.html` auf `Marormur` gesetzt.
- Öffentliche GitHub‑API, Rate‑Limit ohne Token: Falls Repos/Dateien nicht laden, später erneut versuchen.

## Konfiguration & Anpassung

- **GitHub‑Nutzername**: in `app.js` (Funktion `loadGithubRepos`) und in `projekte.html`
- **Branding**: Bilder in `img/` austauschen (`profil.jpg`, Icons, Wallpaper)
- **Sprachen**: Texte in `i18n.js` pflegen
- **Styling**: Tailwind per CLI‑Build (`src/input.css` → `dist/output.css`), zusätzliche Regeln in `src/css/style.css` und `src/css/dialog.css`

## Entwicklung

### Beitragen

Siehe [CONTRIBUTING.md](./CONTRIBUTING.md) für Contribution Guidelines.

## Deployment

**GitHub Pages:** Auto-Deploy bei Push nach `main` (CI baut CSS via `.github/workflows/deploy.yml`).

**Wichtig:** `dist/output.css` nicht committen (wird in CI gebaut).

**Live Demo:** https://marormur.github.io/Website/

## Hinweise

- Der bestehende Code nutzt `localStorage` für Theme‑ und Fensterzustände.
- Bei Änderungen an der Fensterlogik ggf. gespeicherte Zustände in `localStorage` löschen, um Layout‑Artefakte zu vermeiden.

—

Erstellt von Marvin Temmen. Feedback und Ideen sind willkommen!
