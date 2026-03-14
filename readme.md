# 🎨 Marvin's Vibe Coding Paradise

[![Deploy](https://github.com/Marormur/Website/actions/workflows/deploy.yml/badge.svg)](https://github.com/Marormur/Website/actions/workflows/deploy.yml)
[![Test Coverage](https://codecov.io/gh/Marormur/Website/graph/badge.svg?branch=main)](https://codecov.io/gh/Marormur/Website)

Mein persönliches digitales Playground: Ein macOS-inspiriertes Desktop-Universum im Browser mit Fenstern, Modals, Menüleiste, Dark Mode, Deutsch/Englisch-Umschaltung und integriertem GitHub-Explorer. Texteditor, Terminal, Fotogalerie und Launchpad – alles in einer Web-App, weil warum nicht?

## Was ist hier los? 🚀

- 🪟 **macOS-Vibes**: Fenster, Kontextmenüs, alles sehr macos-like (aber im Browser!)
- 🔄 **Multi-Instance Magic**: Mehrere Terminal-Fenster, mehrere Finder-Tabs – alles gleichzeitig
- 🎯 **Apps**: Finder (GitHub-Browser), Terminal (mit virtuellem Dateisystem), TextEditor, Photos & Launchpad
- 📁 **VirtualFS**: Ein echtes (virtuelles) Dateisystem, das sich merkt, was du tust
- 💾 **Auto-Save**: Fenster, Tabs, Inhalte – alles wird wiederhergestellt nach dem Reload
- 🌓 **Dark/Light Mode**: Weil manchmal brauchst du Dunkelheit, manchmal Licht
- 🌍 **Deutsch & Englisch**: Umschalten zur Laufzeit, kein Reload nötig
- 📘 **Vollständig TypeScript**: Strikt, mit Type Coverage und allen Ängsten dank Compiler

## Im Projekt 🗂️

```
src/ts/           # TypeScript Source (die Quelle aller Wahrheit)
src/css/          # CSS-Quellen (Tailwind + Custom)
js/               # Build Output aus TypeScript (nicht direkt editieren)
dist/             # Build Output fuer CSS (nicht direkt editieren)
docs/             # Architektur, Guides, Migrationen, Reports
demos/            # Demo- und Verifikationsseiten
tests/e2e/        # End-to-End Tests
index.html        # Einstiegspunkt (laedt das Bundle)
```

## So geht's los 🎬

```bash
# 1. Dependencies
npm install

# 2. CSS bauen (einmalig oder mit watch)
npm run build:css

# 3. Dev-Server starten
npm run dev

# 4. Optional parallel mitlaufen lassen
npm run watch:css
npm run typecheck:watch
```

Das war's! Browser öffnen → http://127.0.0.1:5173 → Vibe genießen.

**Pro-Tip:** VS Code Task „**Dev Environment: Start All**" macht alles automatisch: CSS-Watch, TypeScript-Watch, Server. Einmal klicken, alles läuft.

### TypeScript-Sachen

```bash
npm run typecheck          # Keine Fehler? Schön!
npm run typecheck:watch    # Fortwährende Kontrolle
npm run build:ts           # Kompilieren zu js/
```

## Anpassen & Spielen 🎮

- **GitHub-Account wechseln?** → In `src/ts/apps/finder/finder-view.ts` den Fallback in `getGithubUsername()` anpassen (oder zur Laufzeit `window.GITHUB_USERNAME` setzen)
- **Bilder & Branding?** → Alles in `img/` ist austauschbar (Profilbild, Icons, Wallpaper)
- **Texte übersetzen/ändern?** → Übersetzungen liegen in `src/ts/i18n/de.ts` und `src/ts/i18n/en.ts`
- **Styling anpassen?** → Tailwind kompiliert das, Custom CSS in `src/css/` macht den Rest
- **Dark Mode Verhalten?** → `localStorage` speichert deine Einstellung (Theme, Fenstergrößen, alles)

## Deploy & Live 🌐

Die Website deployed automatisch auf GitHub Pages beim Push nach `main`. Läuft unter: https://marvintemmen.de/

Die CSS wird in der CI gebaut – keine Sorge um Dateien committen.

## Quick Reference

```bash
# Alle zusammen
npm run dev                  # dev-server starten

# Einzeln
npm run build:css           # CSS bauen
npm run build:ts            # TypeScript → js/
npm run typecheck           # Fehler-Check
npm run test:e2e            # E2E Tests (braucht Browser)
npm run format              # Code formatieren
```

## Virtual DOM (VDOM) 🚀

Das Projekt nutzt ein leichtgewichtiges Virtual DOM System für effiziente, state-erhaltende UI-Updates.

**Performance Metriken:**

- ⚡ Diff Algorithm: < 10ms für 100 Nodes
- ⚡ Patch Application: < 20ms für 100 Nodes
- 💾 Memory Overhead: < 100KB

**Hinweis zur Doku-Strategie:**

- Relevante technische Details werden primär als Kommentare/JSDoc direkt im Code gepflegt
- Für VDOM-Implementierungsdetails siehe `src/ts/core/vdom.ts`

**Quick Example:**

```typescript
const { h, diff, patch } = window.VDOM;

// Virtual Tree erstellen
const vTree = h(
    'ul',
    {},
    h('li', { key: 1 }, 'Item 1'),
    h('li', { key: 2 }, 'Item 2')
);

// Initial render
const dom = createElement(vTree);
container.appendChild(dom);

// Update: nur Änderungen werden gepatcht
const newVTree = h(
    'ul',
    {},
    h('li', { key: 1 }, 'Item 1'),
    h('li', { key: 2 }, 'Updated Item 2'),
    h('li', { key: 3 }, 'Item 3')
);

const patches = diff(vTree, newVTree);
patch(container.firstElementChild, patches);
```
