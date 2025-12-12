# Marvins Portfolio – Desktop‑Style Web App

> NOTE: TypeScript sources are the canonical source of truth. The codebase has been migrated to TypeScript and the authoritative source lives under `src/ts/`. The `js/` directory contains emitted JavaScript output (built artifacts and legacy runtime files); edit `src/ts/` and run the build when changing behavior. Ausführliche Markdown-Dokumentation haben wir entfernt – bitte bevorzugt aussagekräftige Kommentare direkt im Code.

Eine persönliche Portfolio‑Website mit Desktop‑Metapher: Fenster, Modale und Menüleiste im macOS‑Look, Dark Mode, Mehrsprachigkeit (DE/EN) und ein integrierter Projekte‑Browser, der öffentliche GitHub‑Repos lädt. Zusätzlich enthält die Seite einen einfachen Texteditor und einen Bildbetrachter.

## Features

- **Desktop‑UI** mit Fenstern, Modalen und Programm‑Info
- **🆕 Multi-Instance Support** - Mehrere Fenster des gleichen Typs gleichzeitig (z.B. 3 Terminals!)
- **Projekte‑Browser**: Listet GitHub‑Repos von „Marormur" und zeigt Dateien an
- **Integrierter Texteditor** (für Text-/Code‑Dateien) und Bildbetrachter
- **Dark Mode**: Systembasiert oder manuell wählbar, Speicherung in `localStorage`
- **Mehrsprachigkeit** (Deutsch/Englisch) inkl. Sprachpräferenz
- **Persistenz** von Fenster‑Layout und Finder‑Zustand (Repo/Path)

## Projektstruktur

```
/
├── src/               # 📝 Source Files
│   ├── css/          #   - CSS Quelldateien (style.css, dialog.css)
│   └── input.css     #   - Tailwind CSS Input
├── js/               # ⚙️ JavaScript Module
│   ├── window-manager.js      # Zentrale Fensterverwaltung
│   ├── action-bus.js          # Deklaratives Event-System
│   ├── api.js                 # Saubere Modul-Schnittstelle
│   ├── base-window-instance.js # 🆕 Multi-Instance Basis-Klasse
│   ├── instance-manager.js    # 🆕 Instance Manager
│   ├── window-chrome.js       # 🆕 Wiederverwendbare UI-Komponenten
│   ├── terminal-instance.js   # 🆕 Multi-Instance Terminal
│   ├── text-editor-instance.js # 🆕 Multi-Instance Editor
│   └── ...                    # Weitere Module (theme, dock, finder, etc.)
├── img/              # 🖼️ Assets (Icons, Wallpaper, Profile)
├── tests/            # 🧪 E2E Tests (Playwright)
├── dist/             # 📦 Build Output (output.css)
├── index.html        # 🏠 Hauptseite
├── app.js            # 🚀 Haupt-Applikationslogik
└── i18n.js           # 🌍 Internationalisierung (DE/EN)
```

## Schnellstart

```bash
# Dependencies installieren
npm install

# CSS bauen
npm run build:css

# Development Server starten
npm run dev
```

Dann Browser öffnen: http://localhost:5500/

**Alternative:** `index.html` direkt im Browser öffnen (lokaler Server empfohlen für GitHub API)

### TypeScript Development

Dieses Projekt ist **vollständig zu TypeScript migriert** mit strict mode compliance. Alle neuen Entwicklungen und Änderungen sollten in den TypeScript-Quellen unter `src/ts/` erfolgen. Das `js/`-Verzeichnis enthält generierte JavaScript-Ausgaben und Legacy-Artefakte.

**Migration Status: 100% Complete! ✅**

- 8 Kern-Module migriert (3,664 Zeilen TypeScript-Code)
- Full TypeScript Strict Mode (Level 6/6)
- Type Coverage: 81.79% baseline
- Zero compilation errors

```bash
# TypeScript typecheck
npm run typecheck

# TypeScript build
npm run build:ts

# Type coverage messen
npm run type:coverage
```

## Bedienung

- Kopfzeile: Profilmenü (Über, Layout zurücksetzen, Einstellungen, LinkedIn)
- Desktop‑Icon „Projekte": öffnet den Finder‑ähnlichen Browser für Repositories und Dateien
- Textdateien: Öffnen im integrierten Editor (eigener Tab/Modal)
- Bilddateien: Vorschau im Bildbetrachter mit Infos
- Einstellungen: Theme (System/Hell/Dunkel) und Sprache (System/DE/EN)
- Fenster: sind beweglich, kommen bei Interaktion in den Vordergrund; Layout kann zurückgesetzt werden

## GitHub‑Integration und Limits

- Standardnutzer ist in `app.js`/`projekte.html` auf `Marormur` gesetzt.
- Öffentliche GitHub‑API, Rate‑Limit ohne Token: Falls Repos/Dateien nicht laden, später erneut versuchen.

## Konfiguration & Anpassung

- **GitHub‑Nutzername**: in `app.js` (Funktion `loadGithubRepos`) und in `projekte.html`
- **Branding**: Bilder in `img/` austauschen (`profil.jpg`, Icons, Wallpaper)
- **Sprachen**: Texte in `i18n.js` pflegen
- **Styling**: Tailwind per CLI‑Build (`src/input.css` → `dist/output.css`), zusätzliche Regeln in `src/css/style.css` und `src/css/dialog.css`

## Entwicklung

### Neue Fenster hinzufügen

Einfach in `js/window-configs.js` registrieren (siehe Kommentare im Code):

```javascript
{
    id: 'my-window-modal',
    type: 'persistent',
    programKey: 'programs.myApp',
    icon: './img/myapp.png',
    closeButtonId: 'close-my-window-modal'
}
```

### Testing

```bash
# E2E Tests ausführen
npm run test:e2e

# Tests mit UI
npm run test:e2e:ui

# Multi-Instance Tests
npm run test:e2e -- tests/e2e/multi-instance-basic.spec.js
```

### Multi-Instance System

Das neue Multi-Instance System ermöglicht mehrere Fenster des gleichen Typs:

```javascript
// Browser Console (F12)
demoCreateTerminals(); // Erstelle 3 Terminal-Instanzen
demoCreateEditors(); // Erstelle 3 Editor-Instanzen
```

Oder: http://localhost:3000/?demo=true

### Beitragen

Siehe [CONTRIBUTING.md](./CONTRIBUTING.md) für Contribution Guidelines.

## Deployment

Als statische Seite auf GitHub Pages, Netlify oder Vercel deployen.

**Live Demo:** https://marormur.github.io/Website/

## Hinweise

- Der bestehende Code nutzt `localStorage` für Theme‑ und Fensterzustände.
- Bei Änderungen an der Fensterlogik ggf. gespeicherte Zustände in `localStorage` löschen, um Layout‑Artefakte zu vermeiden.

—

Erstellt von Marvin Temmen. Feedback und Ideen sind willkommen!
