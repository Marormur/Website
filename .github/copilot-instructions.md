# Copilot Quick Guide - macOS-Style Portfolio

Kurz und praxisnah: So arbeitest du mit diesem Projekt effizient, ohne das Kontextfenster mit Doku zu sprengen.

## TL;DR

- TypeScript-Quellcode unter `src/ts/` ist die Wahrheit. Schreib neue Features nur dort.
- Fenster nur in `src/ts/window-configs.ts` registrieren – keine manuellen Dialoge, keine ID-Arrays.
- UI-Aktionen deklarativ per `data-action` + ActionBus statt `addEventListener`.
- Module über `API.*` verwenden (z. B. `API.theme.setThemePreference('dark')`).
- Wiederverwendbare UI mit `WindowChrome` (Titlebar/Toolbar/Statusbar).
- Multi-Instanzen über `InstanceManager` + `BaseWindowInstance`.

## Kernsysteme (Ladereihenfolge)

1. WindowManager · 2) ActionBus · 3) WindowConfigs · 4) API · 5) InstanceManager · 6) BaseWindowInstance · 7) WindowChrome

## Must-Do Patterns

- Fenster hinzufügen (nur WindowConfigs):
    - `id`, `type` (persistent/transient), `programKey`, `icon`, `closeButtonId`, optional `metadata.initHandler`.
- Aktionen: `<button data-action="openWindow" data-window-id="finder-modal">…</button>`
- API statt Direktaufrufe: `API.window.open('finder-modal')`, `API.storage.saveWindowPositions()`
- Multi-Instanzen: neue Typen von `BaseWindowInstance` ableiten; Erstellung/Destroy übernimmt `InstanceManager`.
- Konsistente UI: `WindowChrome.createTitlebar/Toolbar/StatusBar`, `WindowChrome.updateTitle()`.

## Anti-Patterns (nicht verwenden)

- Manuelle `addEventListener` für Standardaktionen
- Direkte `new Dialog(...)`-Erzeugung
- Hartkodierte Modal-ID-Arrays oder Legacy-Direktaufrufe statt `API.*`

## Dev-Workflow (Kurz)

- Build: `npm run build:css`, `npm run build:ts`
- Watch: `npm run watch:css`, `npm run typecheck:watch`
- Dev-Server: `npm run dev` (http://127.0.0.1:5173)
- VS Code Tasks bündeln das ("Dev Environment: Start All").

## Tests (Playwright)

- Schnell: `npm run test:e2e:quick` (lokal Chromium)
- Voll: `npm run test:e2e`
- Stabilität: `MOCK_GITHUB=1`; auf Readiness warten (`window.__APP_READY`).
- Schreibe für neue Features mindestens einen E2E-Test (Smoke + 1 Edge Case).

## Deployment (GitHub Pages)

- Auto-Deploy auf Push nach `main`.
- CSS wird in CI gebaut; `dist/output.css` nicht committen.

## Forking (schnell anpassen)

- GitHub User: `src/ts/finder.ts` -> `const GITHUB_USERNAME = '…'`
- Tests: `tests/e2e/utils.js` Mock-URLs aktualisieren
- Profilbild: `img/profil.jpg`
- Texte: `src/ts/i18n.ts` (DE/EN pflegen)

## Wichtige Dateien

- `src/ts/window-configs.ts` – alle Fensterdefinitionen
- `src/ts/app.ts` – App-Bootstrap
- `src/ts/i18n.ts` – Übersetzungen und Helpers

## Quick Wins für Copilot

- Fenster hinzufügen/ändern -> nur `window-configs.ts` anpassen
- UI-Aktion ergänzen -> ActionBus registrieren + `data-action`
- Texte -> in `i18n.ts` für DE/EN ergänzen
- Multi-Instanz-Typ -> von `BaseWindowInstance` ableiten und im `InstanceManager` registrieren

## Pflegehinweis

- Bei Doku-Änderungen kurzen Eintrag unter `docs:` in `CHANGELOG.md` ergänzen.

## MCP-Tools (kurz)

- GitHub MCP Server ("github/github-mcp-server")
    - Wofür: PRs/Reviews, Issues, Branches, Repo-Änderungen und Suchen auf GitHub.
    - Wie: Bei Reviews erst eine pending Review anlegen, Kommentare hinzufügen, dann Review submitten. Vor dem Erstellen von Issues/PRs zuerst suchen, Pagination nutzen.
    - Nutzen, wenn: PR-Status prüfen, Review-Kommentare verfassen, Branch/PR/Issue anlegen oder Dateien im Repo ändern.

- Playwright MCP ("microsoft/playwright-mcp")
    - Wofür: Browserautomation und E2E-Tests direkt aus der Session.
    - Wie: Auf `window.__APP_READY` warten, explizite `waitForSelector` statt Timeouts, `MOCK_GITHUB=1` für Stabilität.
    - Nutzen, wenn: Neue Features verifizieren, Smoke-Checks fahren, reproduzierbare UI-Flows testen (headed/UI/quick).
