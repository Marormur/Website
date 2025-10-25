# 🎯 Schnellstart: Neue Architektur

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

## Nächste Schritte

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
