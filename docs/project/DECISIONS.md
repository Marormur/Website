# 📋 Architecture Decision Records (ADR)

Dieses Dokument erfasst wichtige architektonische Entscheidungen und deren Begründung.

---

## ADR-001: Vanilla JavaScript statt Framework

**Datum:** August 2025  
**Status:** ✅ Akzeptiert  

### Kontext
Portfolio-Website benötigt Desktop-Metapher (Fenster, Dock, Menüleiste) mit macOS-Look.

### Entscheidung
Vanilla JavaScript ohne Framework (React, Vue, Angular).

### Begründung
- **Volle Kontrolle** über DOM-Manipulation
- **Keine Build-Komplexität** (nur Tailwind CSS)
- **Kleinere Bundle-Size** (~50KB vs. 100KB+ mit Framework)
- **Lernprojekt** - tieferes Verständnis von Browser-APIs
- **Performance** - kein Virtual DOM Overhead

### Konsequenzen
✅ **Positiv:**
- Schnelle Load-Zeiten
- Einfaches Deployment
- Volle Kontrolle

⚠️ **Negativ:**
- Mehr Boilerplate-Code
- Keine Framework-Ecosystem-Vorteile
- Manuelles State-Management

---

## ADR-002: Modulare Architektur mit WindowManager & ActionBus

**Datum:** September 2025  
**Status:** ✅ Akzeptiert  

### Kontext
Ursprünglicher Code war monolithisch (~1800 Zeilen in app.js).

### Entscheidung
Refactoring zu modularer Architektur:
- **WindowManager** - Zentrale Fenster-Verwaltung
- **ActionBus** - Deklaratives Event-System
- **API** - Unified Interface zu allen Modulen

### Begründung
- **Wartbarkeit** - Kleine, fokussierte Module
- **Wiederverwendbarkeit** - DRY-Prinzip
- **Testbarkeit** - Isolierte Tests möglich
- **Erweiterbarkeit** - Neue Features einfach hinzufügen

### Konsequenzen
✅ **Positiv:**
- Code-Qualität stark verbessert
- Tests möglich
- Neue Features schneller

⚠️ **Negativ:**
- Migration-Aufwand (2 Wochen)
- Learning Curve für neue Entwickler

---

## ADR-003: Multi-Instance System mit BaseWindowInstance

**Datum:** Oktober 2025  
**Status:** ✅ Akzeptiert  

### Kontext
Nutzer sollen mehrere Terminals/Editoren gleichzeitig öffnen können.

### Entscheidung
Multi-Instance System mit:
- **BaseWindowInstance** - Basis-Klasse
- **InstanceManager** - Zentrale Verwaltung
- **Isolated State** - Jede Instanz hat eigenen State

### Begründung
- **User Experience** - Wie echtes macOS
- **Flexibilität** - Beliebig viele Instanzen
- **State Isolation** - Keine Konflikte
- **Wiederverwendbar** - Für alle Window-Typen

### Konsequenzen
✅ **Positiv:**
- Professionellere UX
- Skalierbar
- Typ-sichere Implementierung möglich

⚠️ **Negativ:**
- Höhere Komplexität
- Memory-Management notwendig

---

## ADR-004: TypeScript Migration (geplant)

**Datum:** Oktober 2025  
**Status:** 📋 Vorgeschlagen  

### Kontext
JavaScript-Codebase wächst, Type-Fehler häufen sich.

### Entscheidung
Inkrementelle Migration zu TypeScript:
- Phase 0: Setup
- Phase 1: Type-Definitionen
- Phase 2: Neue Features in TS
- Phase 3: Migration kritischer Module
- Phase 4: Legacy-Code

### Begründung
- **Type-Safety** - Fehler zur Compile-Zeit
- **IDE-Support** - Bessere Autocomplete
- **Refactoring** - Sicherer umbauen
- **Dokumentation** - Types = Live-Docs

### Konsequenzen
✅ **Positiv:**
- Weniger Runtime-Fehler
- Bessere DX
- Professionellerer Code

⚠️ **Negativ:**
- Migration-Aufwand (6-8 Wochen)
- Build-Komplexität steigt
- Learning Curve

### Alternativen
1. **JSDoc + Type-Checking** - Leichtgewichtig, aber limitiert
2. **Vollständige Neuentwicklung** - Zu riskant
3. **Status Quo** - Technische Schulden wachsen

---

## ADR-005: Tailwind CSS statt Custom CSS

**Datum:** August 2025  
**Status:** ✅ Akzeptiert  

### Kontext
UI-Styling-Strategie wählen.

### Entscheidung
Tailwind CSS mit kleinen Custom-CSS-Ergänzungen.

### Begründung
- **Utility-First** - Schnelle Entwicklung
- **Konsistenz** - Design-System out-of-the-box
- **Dark Mode** - Native Unterstützung
- **Bundle-Size** - Tree-Shaking möglich

### Konsequenzen
✅ **Positiv:**
- Schnelles Prototyping
- Konsistentes Design
- Dark Mode einfach

⚠️ **Negativ:**
- HTML-Klassen verbose
- Build-Step notwendig

---

## ADR-006: GitHub Pages Deployment

**Datum:** August 2025  
**Status:** ✅ Akzeptiert  

### Kontext
Hosting-Lösung für Portfolio wählen.

### Entscheidung
GitHub Pages mit GitHub Actions.

### Begründung
- **Kostenlos** - Für public Repos
- **Einfach** - Git push = Deploy
- **CI/CD** - GitHub Actions integriert
- **Custom Domain** - Möglich

### Konsequenzen
✅ **Positiv:**
- Zero Cost
- Automatisches Deployment
- Versionskontrolle

⚠️ **Negativ:**
- Nur statische Seiten
- Kein Server-Side Code

---

## ADR-007: Playwright für E2E-Tests

**Datum:** September 2025  
**Status:** ✅ Akzeptiert  

### Kontext
E2E-Testing-Framework wählen.

### Entscheidung
Playwright (vs. Cypress, Selenium).

### Begründung
- **Cross-Browser** - Chromium, Firefox, WebKit
- **Modern API** - Async/Await
- **Auto-Wait** - Weniger Flaky-Tests
- **Screenshots/Videos** - Debugging

### Konsequenzen
✅ **Positiv:**
- Stabile Tests
- Alle Browser abgedeckt
- Gute DX

⚠️ **Negativ:**
- Längere Test-Laufzeit
- CI braucht mehr Ressourcen

---

## ADR-008: Logger System statt console.log

**Datum:** Oktober 2025  
**Status:** ✅ Akzeptiert  

### Kontext
100+ console.log() im Code, schwer zu managen.

### Entscheidung
Zentrales Logger-System mit:
- Log-Levels (ERROR, WARN, INFO, DEBUG, TRACE)
- Kategorien (WindowManager, Terminal, etc.)
- Production vs. Development

### Begründung
- **Kontrollierbar** - Logs filtern
- **Production-ready** - Errors only in Prod
- **Debugging** - Kategorien isolieren
- **Performance** - Logs deaktivierbar

### Konsequenzen
✅ **Positiv:**
- Professionelleres Logging
- Debugging einfacher
- Production-sicher

⚠️ **Negativ:**
- Migration aller console.log() notwendig
- Neue API lernen

---

## Template für neue ADRs

```markdown
## ADR-XXX: [Titel]

**Datum:** [Datum]  
**Status:** [Vorgeschlagen | Akzeptiert | Abgelehnt | Veraltet]  

### Kontext
[Beschreibung der Situation]

### Entscheidung
[Was wurde entschieden?]

### Begründung
[Warum diese Entscheidung?]

### Konsequenzen
✅ **Positiv:**
- [Pro 1]
- [Pro 2]

⚠️ **Negativ:**
- [Con 1]
- [Con 2]

### Alternativen
1. [Alternative 1]
2. [Alternative 2]
```

---

**Letzte Aktualisierung:** Oktober 2025
