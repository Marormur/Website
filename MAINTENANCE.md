# Website Maintenance

Kurzleitfaden, um diese Website stabil und entspannt zu pflegen.

## Projekt auf einen Blick

- **Source of truth:** `src/ts/` fuer TypeScript, `src/css/` und `src/input.css` fuer Styles.
- **Build Output:** `js/` und `dist/` werden generiert. Nicht direkt bearbeiten, ausser du weisst genau warum.
- **Einstiegspunkt:** `index.html`.
- **Dev-Server:** `server.js` unter `http://127.0.0.1:5173`.
- **Deployment:** GitHub Pages beim Push nach `main`.

## Lokaler Start

```bash
npm install
npm run build:css
npm run dev
```

Optional in parallelen Terminals:

```bash
npm run watch:css
npm run typecheck:watch
npm run dev:bundle
```

## Alltag: schnelle Pflege-Checks

Vor jedem Commit mindestens:

```bash
npm run check
```

Das prueft:

1. TypeScript-Typen
2. ESLint
3. CSS-Build
4. TypeScript-Build
5. Unit Tests

Wenn UI- oder Window-/Dock-/Finder-Verhalten betroffen ist:

```bash
npm run check:e2e
```

Vor groesseren Merges oder wenn du sicher sein willst:

```bash
npm run check:full
```

## Teststrategie

- `npm run test:unit` — schnell, fuer Services/Core-Logik.
- `npm run test:e2e:smoke` — minimaler Browser-Smoke.
- `npm run test:e2e:core` — stabiler Alltagslauf.
- `npm run test:e2e:stateful` — Finder, Session, Terminal.
- `npm run test:e2e:quarantine` — bekannte fragile Spezialfaelle, nur bewusst laufen lassen.
- `npm run test:e2e:deep` — tiefe Technik-/Performance-Suiten bei Bedarf.

## Inhalte aendern

- **Texte/Uebersetzungen:** `src/ts/i18n/de.ts`, `src/ts/i18n/en.ts`
- **Bilder/Branding:** `img/`
- **Hauptmarkup:** `index.html`
- **Window-/App-Verhalten:** `src/ts/windows/`, `src/ts/ui/`, `src/ts/services/`
- **GitHub/Finder-Integration:** `src/ts/services/github-api.ts`

## Pull Requests

- Neue Pull Requests loesen `.github/workflows/request-copilot-review.yml` aus.
- Der Workflow fordert automatisch einen Review von GitHub Copilot an.
- Draft-PRs werden uebersprungen; beim Markieren als ready for review wird Copilot angefragt.

## Sicherheits-/Pflege-Regeln

- Keine Tokens dauerhaft in `localStorage` speichern; wenn moeglich `sessionStorage` verwenden.
- Keine neuen `postMessage(..., '*')`-Aufrufe einfuehren.
- CSP/Headers in `index.html` und `server.js` gemeinsam pflegen.
- Dependencies bewusst aktualisieren und danach `npm run check` ausfuehren.
- Bei Aenderungen an Security Headers mindestens lokal im Browser testen, weil CSP Fehler oft erst zur Laufzeit sichtbar werden.

## Saubere Commits

Aenderungen am besten thematisch trennen:

1. Security/Header/CSP
2. Dependency Updates
3. UI-/Mobile-Verhalten
4. Test-/Tooling-Fixes
5. Doku

So bleiben Rueckfragen und Rollbacks einfacher.

## Wenn etwas kaputt ist

1. `git status --short`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run test:unit`
5. Bei UI-Problemen: `npm run test:e2e:smoke` oder gezielte Playwright-Spec.
6. Browser-Konsole pruefen, besonders bei CSP- oder Modulfehlern.

## Merksatz

Erst `src/` aendern, dann bauen, dann testen. Nicht im generierten Output leben.
