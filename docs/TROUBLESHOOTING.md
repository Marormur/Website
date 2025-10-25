# Troubleshooting

Praktische Hilfe bei häufigen Problemen (Windows/PowerShell berücksichtigt).

## Dev Server startet nicht / Port belegt

- Symptome: Zweiter Start führt zu EADDRINUSE oder VS Code meldet Fehler nach preLaunchTask.
- Ursache: Port 5173 ist bereits in Verwendung.
- Lösung:
    - VS Code Task "Start Dev Server" ist idempotent und erkennt laufende Instanz.
    - Manuell stoppen:
        ```powershell
        Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
        ```
    - Danach neu starten:
        ```powershell
        npm run dev
        ```

## Tests flaky / hängen

- Verwende die App-Ready-Wartebedingung statt `networkidle`:
    - Helfer: `waitForAppReady(page)` (setzt auf `window.__APP_READY === true`)
- Für schnelle Smoke-Runs GitHub-API mocken:
    ```powershell
    $env:MOCK_GITHUB='1'; npm run test:e2e:quick
    ```
- Playwright-Browser einmalig installieren:
    ```powershell
    npm run pw:install
    ```
- Lokale Stabilität: Playwright ist lokal konservativer konfiguriert (2 Worker, 1 Retry).

## PowerShell und Globs

- PowerShell expandiert File-Globs anders als Bash.
- Nutze die vorhandenen NPM Scripts (`npm run test:e2e:quick`) statt direkter Pfad-Globs.

## TypeScript Fehler

- Typecheck ausführen:
    ```powershell
    npm run typecheck
    ```
- Watch-Mode zur Entwicklung:
    ```powershell
    npm run typecheck:watch
    ```
- Type-Coverage Report (Hotspots finden):
    ```powershell
    npm run type:report
    ```

## GitHub API Rate Limits (Finder)

- Unauthentifizierte Requests sind auf ~60/h limitiert.
- Für Smoke-Tests Mocks aktivieren:
    ```powershell
    $env:MOCK_GITHUB='1'; npm run test:e2e:quick
    ```
- In `tests/e2e/utils.js` werden gängige Endpunkte gemockt.

## CSS wird nicht aktualisiert

- Tailwind Watch starten:
    ```powershell
    npm run watch:css
    ```
- Änderungen nur in `src/input.css` oder `src/css/*.css` vornehmen, nicht in `dist/output.css` (generiert).

## Line Endings (Windows <-> Unix)

- Das Repo ist für OS-typische EOLs konfiguriert.
- Falls Diff-Rauschen auftritt: Prüfe `.gitattributes` und vermeide erzwungene EOL-Umstellungen in Editoren.

## Debugging Tipps

- VS Code Debug-Profile für Chrome/Firefox/Edge sind vorhanden.
- Vor dem Debuggen sicherstellen, dass der Dev Server läuft (Tasks: "Dev Environment: Start All").
- Pre-Launch-Task-Meldungen verschwinden, sobald die "Server running"-Zeile erscheint.
