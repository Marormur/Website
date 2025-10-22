# Marvins Portfolio – Desktop‑Style Web App

Eine persönliche Portfolio‑Website mit Desktop‑Metapher: Fenster, Modale und Menüleiste im macOS‑Look, Dark Mode, Mehrsprachigkeit (DE/EN) und ein integrierter Projekte‑Browser, der öffentliche GitHub‑Repos lädt. Zusätzlich enthält die Seite einen einfachen Texteditor und einen Bildbetrachter.

## Features

- Desktop‑UI mit Fenstern, Modalen und Programm‑Info
- Projekte‑Browser: Listet GitHub‑Repos von „Marormur“ und zeigt Dateien an
- Integrierter Texteditor (für Text-/Code‑Dateien) und Bildbetrachter
- Dark Mode: Systembasiert oder manuell wählbar, Speicherung in `localStorage`
- Mehrsprachigkeit (Deutsch/Englisch) inkl. Sprachpräferenz
- Persistenz von Fenster‑Layout und Finder‑Zustand (Repo/Path)

## Projektstruktur

- `index.html` – Einstieg, Desktop‑Oberfläche, Modale (Projekte, Texteditor, Bildanzeige, Einstellungen)
- `app.js` – Fenster-/Dialoglogik, Theme‑Handling, GitHub‑Integration, Finder‑Ansicht
- `i18n.js` – Übersetzungen (DE/EN), Sprachumschaltung und -präferenz
- `style.css`, `dialog.css` – ergänzende Styles
- `text.html` – IFrame‑basierter Texteditor (Themensync, lokale Datei öffnen/speichern)
- `image`/`img` – Assets (Profilbild, App‑Icons, Wallpaper)
- `settings.html` – Einstellungen (Darstellung/Theme, Sprache)
- `projekte.html` – alternative, einfache Repos‑Übersicht (Kartenansicht)

## Schnellstart

Da es sich um statische Dateien handelt, ist kein Build nötig.

Option A – Direkt im Browser öffnen:
- `index.html` doppelklicken. Hinweis: API‑Aufrufe (GitHub) funktionieren i. d. R. auch über `file://`, je nach Browserrichtlinien ist jedoch ein lokaler Server stabiler.

Option B – Lokaler Server (empfohlen):
- VS Code „Live Server“ Erweiterung verwenden; oder
- Python: `python -m http.server 5500` und dann `http://localhost:5500/` öffnen; oder
- Node: `npx serve` im Projektordner und die ausgegebene URL aufrufen.

## Bedienung

- Kopfzeile: Profilmenü (Über, Layout zurücksetzen, Einstellungen, LinkedIn)
- Desktop‑Icon „Projekte“: öffnet den Finder‑ähnlichen Browser für Repositories und Dateien
- Textdateien: Öffnen im integrierten Editor (eigener Tab/Modal)
- Bilddateien: Vorschau im Bildbetrachter mit Infos
- Einstellungen: Theme (System/Hell/Dunkel) und Sprache (System/DE/EN)
- Fenster: sind beweglich, kommen bei Interaktion in den Vordergrund; Layout kann zurückgesetzt werden

## GitHub‑Integration und Limits

- Standardnutzer ist in `app.js`/`projekte.html` auf `Marormur` gesetzt.
- Öffentliche GitHub‑API, Rate‑Limit ohne Token: Falls Repos/Dateien nicht laden, später erneut versuchen.

## Konfiguration & Anpassung

- GitHub‑Nutzername ändern: in `app.js` (Funktion `loadGithubRepos`) und in `projekte.html` die Variable `username` anpassen.
- Branding: Bilder in `img/` austauschen (`profil.jpg`, Icons, Wallpaper).
- Sprachen: Texte in `i18n.js` pflegen; Standard‑Sprache via Präferenz steuern.
- Styling: Tailwind via CDN; zusätzliche Regeln in `style.css`/`dialog.css`.

## Deployment

- Als statische Seite auf GitHub Pages, Netlify oder Vercel deployen.
- Einstiegspunkt ist `index.html` im Projekt‑Root.

## Hinweise

- Der bestehende Code nutzt `localStorage` für Theme‑ und Fensterzustände.
- Bei Änderungen an der Fensterlogik ggf. gespeicherte Zustände in `localStorage` löschen, um Layout‑Artefakte zu vermeiden.

—

Erstellt von Marvin Temmen. Feedback und Ideen sind willkommen!

