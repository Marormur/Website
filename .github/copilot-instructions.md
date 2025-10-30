# Copilot Quick Guide - macOS-Style Portfolio

Kurz und praxisnah: So arbeitest du mit diesem Projekt effizient, ohne das Kontextfenster mit Doku zu sprengen.

- Bearbeite keinen Quellcode in `js/` oder `css/` direkt. Nutze `src/ts/` für TypeScript und `src/css/` für TailwindCSS.

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
