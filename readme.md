# 🎨 Marvin's Vibe Coding Paradise

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
/ts/              # TypeScript Source (die Quelle aller Wahrheit!)
│   ├── core/     # Initialisierung, APIs, Fehlerbehandlung, Logger
│   ├── services/ # i18n, Theming, Storage, Session Manager, VirtualFS
│   ├── ui/       # Action Bus, Dialoge, Menüs, Desktop, Keyboard-Shortcuts
│   ├── windows/  # Fenster, Tabs, Instance Manager, Chrome-Styling
│   └── apps/     # Die Apps: Finder, Terminal, TextEditor, Photos
├── src/css/      # Noch mehr CSS-Magie (Tailwind + Custom)
├── js/           # Build Output (nicht editieren! Das macht tsc für dich)
├── tests/e2e/    # ~190 Playwright Tests (damit alles nicht kaputt geht)
├── dist/         # Tailwind Output (auch nicht editieren)
└── index.html    # Einstiegspunkt (lädt das Bundle)
```

## So geht's los 🎬

```bash
# 1. Dependencies
npm install

# 2. CSS bauen (einmalig oder mit watch)
npm run build:css

# 3. Dev-Server & TypeScript-Watch in einer Command
npm run dev
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

- **GitHub-Account wechseln?** → In `app.js` nach `loadGithubRepos` suchen, `Marormur` austauschen
- **Bilder & Branding?** → Alles in `img/` ist austauschbar (Profilbild, Icons, Wallpaper)
- **Texte übersetzen/ändern?** → `i18n.js` ist dein Freund (Deutsch & Englisch)
- **Styling anpassen?** → Tailwind kompiliert das, Custom CSS in `src/css/` macht den Rest
- **Dark Mode Verhalten?** → `localStorage` speichert deine Einstellung (Theme, Fenstergrößen, alles)

## Deploy & Live 🌐

Die Website deployed automatisch auf GitHub Pages beim Push nach `main`. Läuft unter: https://marormur.github.io/Website/

Die CSS wird in der CI gebaut – keine Sorge um Dateien committen.

## Quick Reference

```bash
# Alle zusammen
npm run dev                  # dev-server + watch everything

# Einzeln
npm run build:css           # CSS bauen
npm run build:ts            # TypeScript → js/
npm run typecheck           # Fehler-Check
npm run test:e2e            # E2E Tests (braucht Browser)
npm run format              # Code formatieren
```
