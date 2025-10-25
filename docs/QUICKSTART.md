# 🎯 Schnellstart

Schnell lauffähig werden und die wichtigsten Konzepte der neuen Architektur nutzen.

## Lokales Setup

Option A – VS Code Tasks (empfohlen):

1. Öffne den Befehlspaletten-Eintrag "Tasks: Run Task" → "Dev Environment: Start All"
    - Startet: Tailwind Watch, TypeScript Watch, Dev Server
2. Öffne http://127.0.0.1:5173

Option B – Manuell in Terminals:

1. CSS Watch

```bash
npm run watch:css
```

2. TypeScript Watch (nur wenn du TS-Quellcode änderst)

```bash
npm run typecheck:watch
```

3. Dev Server

```bash
npm run dev
```

4. Öffne http://127.0.0.1:5173

Hinweise:

- Der Dev-Server nutzt SSE für Live-Reload.
- Der Port 5173 wird wiederverwendet; das Start-Task ist idempotent (kein Crash, wenn bereits aktiv).

## Was wurde gemacht?

Drei neue zentrale Systeme wurden eingeführt, um deinen Code flexibler und wartbarer zu machen:

1. **WindowManager** - Zentrale Fensterverwaltung
2. **ActionBus** - Deklaratives Event-System
3. **API** - Saubere Schnittstelle zu allen Modulen

## Neues Fenster hinzufügen - So einfach!

### Vorher: 5+ Schritte, mehrere Dateien ändern

### Jetzt: 1 Schritt!

**In `js/window-configs.js` hinzufügen:**

```javascript
{
    id: 'calculator-modal',
    type: 'persistent',
    programKey: 'programs.calculator',
    icon: './img/calculator.png',
    closeButtonId: 'close-calculator-modal'
}
```

**Fertig!** 🎉

Das System erkennt das Fenster automatisch und:

- ✅ Registriert es im WindowManager
- ✅ Erstellt die Dialog-Instanz
- ✅ Verwaltet z-Index automatisch
- ✅ Speichert/Lädt Position
- ✅ Bindet Close-Button automatisch

## HTML vereinfachen (Optional)

### Alt:

```html
<button id="close-finder-modal" ...>Schließen</button>
```

### Neu:

```html
<button data-action="closeWindow" data-window-id="finder-modal">
    Schließen
</button>
```

Kein JavaScript mehr nötig! 🚀

## API nutzen

### Moderne Methode:

```javascript
API.window.open('finder-modal');
API.theme.setPreference('dark');
API.storage.saveOpenModals();
```

### Legacy (funktioniert auch):

```javascript
openDesktopItemById('finder');
setThemePreference('dark');
saveOpenModals();
```

## Neue Actions registrieren

```javascript
ActionBus.register('myAction', (params, element) => {
    console.log('Ausgeführt mit:', params);
});
```

```html
<button data-action="myAction" data-value="test">Click</button>
```

## Code-Reduktion

- **app.js**: -200 Zeilen
- **Neue Features**: +viele
- **Wartbarkeit**: 📈📈📈

## Debugging

```javascript
// Alle Fenster anzeigen
console.log(WindowManager.getAllWindowIds());

// Top-Window
console.log(WindowManager.getTopWindow());

// Fenster-Info
console.log(WindowManager.getConfig('finder-modal'));
```

## Tests ausführen

Schnelle Smoke-Tests (Chromium, GitHub-API gemockt):

```bash
# optional lokal
$env:MOCK_GITHUB='1'; npm run test:e2e:quick
```

Vollständige E2E (alle Tests, lokal standardmäßig nur Chromium):

```bash
npm run test:e2e:chromium
# alle Browser wie in CI
$env:CI='1'; npm run test:e2e:all-browsers
```

Empfohlene Test-Wartebedingung: `appReady`

Die App setzt am Ende der Initialisierung ein Flag und feuert ein Event:

```js
// app-init.js
window.__APP_READY = true;
window.dispatchEvent(new CustomEvent('appReady'));
```

Verwende in Playwright-Tests den Helfer `waitForAppReady(page)`, statt `networkidle` oder festen Timeouts:

```js
// tests/e2e/utils.js
async function waitForAppReady(page, timeout = 15000) {
    try {
        await page.waitForLoadState('domcontentloaded', {
            timeout: Math.min(timeout, 5000),
        });
    } catch {}
    await page.waitForFunction(() => window.__APP_READY === true, { timeout });
}
```

Beispiel in einem Test:

```js
const { waitForAppReady } = require('./e2e/utils');

test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(baseURL + '/index.html');
    await waitForAppReady(page);
});
```

Das macht die Suite robuster gegenüber laufenden Netzwerkaktivitäten (z. B. GitHub API) und reduziert Flakiness.

Tipp: Für Smoke-Runs `MOCK_GITHUB=1` setzen, um die GitHub-API zu mocken (siehe `tests/e2e/utils.js`).

## Troubleshooting & Nächste Schritte

Falls etwas klemmt (Port belegt, Tests flakey, TypeScript-Fehler), siehe `docs/TROUBLESHOOTING.md`.

1. ✅ System testen
2. ✅ Neue Fenster mit neuem System hinzufügen
3. Optional: HTML migrieren (siehe `HTML_MIGRATION.html`)
4. Optional: Mehr Custom Actions erstellen

## Mehr Infos

- Vollständige Doku: `REFACTORING.md`
- HTML-Beispiele: `HTML_MIGRATION.html`
- Module: `js/window-manager.js`, `js/action-bus.js`, `js/api.js`

---

**Alles bleibt kompatibel!** Dein bestehender Code funktioniert weiterhin. 👍
