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

# Tailwind CSS im Watch-Modus starten
npm run watch:css

# In einem zweiten Terminal: Live Server starten
# (z.B. VS Code Live Server Extension auf Port 5500)

# Tests laufen lassen
npm run test:e2e
```

## 📝 Wichtig

- `dist/output.css` wird von Tailwind generiert und sollte im Git committed werden
- Die `.nojekyll` Datei sorgt dafür, dass GitHub Pages alle Dateien ausliefert
- CSS-Änderungen immer in `src/input.css` oder `style.css` machen, nicht in `dist/output.css`

## 🔧 GitHub Pages Setup

1. Gehe zu Repository Settings → Pages
2. Source: "GitHub Actions"
3. Bei jedem Push auf `main` wird automatisch deployed

## 🐛 Troubleshooting

**Problem:** CSS wird nicht geladen
- Lösung: `npm run build:css` lokal ausführen und committen
- GitHub Actions führt das automatisch aus, aber für lokale Tests wichtig

**Problem:** Seite zeigt 404
- Prüfe ob GitHub Pages aktiviert ist (Settings → Pages)
- URL sollte sein: `https://<username>.github.io/<repo-name>/`
