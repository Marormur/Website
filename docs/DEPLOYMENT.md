# GitHub Pages Deployment

Diese Website wird automatisch über GitHub Actions auf GitHub Pages deployed.

## 🚀 Deployment

Bei jedem Push auf den `main`-Branch:
1. GitHub Actions baut die Tailwind CSS (`npm run build:css`)
2. Die Website wird auf GitHub Pages veröffentlicht

**URL:** https://marormur.github.io/Website/

## 🛠️ Lokal entwickeln

```bash
# Dependencies installieren
npm install

# Tailwind CSS im Watch‑Modus starten (oder Task "Tailwind CSS: Watch")
npm run watch:css

# Dev‑Server starten (oder VS Code Task "Start Dev Server")
npm run dev

# Tests laufen lassen
npm run test:e2e
```

## 📝 Wichtig

- `dist/output.css` wird automatisch von GitHub Actions gebaut - **NICHT** ins Git committen
- Lokal: Nutze `npm run watch:css` während der Entwicklung (oder VS Code Task "Tailwind CSS: Watch")
- Die `.nojekyll` Datei sorgt dafür, dass GitHub Pages alle Dateien ausliefert
- CSS‑Änderungen immer in `src/input.css` oder `src/css/*.css` machen, nie in `dist/output.css`

## 🔧 GitHub Pages Setup

1. Gehe zu Repository Settings → Pages
2. Source: "GitHub Actions"
3. Bei jedem Push auf `main` wird automatisch deployed

## 🐛 Troubleshooting

**Problem:** CSS wird nicht geladen (lokal)
- Lösung: Stelle sicher, dass der Task "Tailwind CSS: Watch" läuft
- Oder führe einmalig `npm run build:css` aus
- `dist/output.css` sollte lokal existieren (aber nicht committed werden)

**Problem:** CSS wird nicht geladen (auf GitHub Pages)
- GitHub Actions baut CSS automatisch - prüfe ob der Build-Job erfolgreich war
- Schaue in Actions → Deploy to GitHub Pages → Build-Step

**Problem:** Seite zeigt 404
- Prüfe ob GitHub Pages aktiviert ist (Settings → Pages)
- URL sollte sein: `https://<username>.github.io/<repo-name>/`
