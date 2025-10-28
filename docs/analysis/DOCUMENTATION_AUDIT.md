# Documentation Audit & Cleanup Plan

**Datum:** 28. Oktober 2025  
**Status:** Analyse abgeschlossen  
**Ziel:** Dokumentation bereinigen, konsolidieren und aktualisieren

---

## Executive Summary

Von **68+ Markdown-Dateien** können viele archiviert, gelöscht oder konsolidiert werden:

- **17 Dateien** → Archivieren (bereits erledigt/veraltet)
- **8 Dateien** → Löschen (Duplikate/überflüssig)
- **12 Dateien** → Aktualisieren (teilweise veraltet)
- **31 Dateien** → Behalten (noch relevant)

**Geschätzter Aufwand:** 2-3 Stunden für vollständige Bereinigung

---

## 📊 Detaillierte Analyse

### 🗑️ SOFORT ARCHIVIEREN (bereits erledigt)

Diese Docs beschreiben abgeschlossene Migrations/Features und haben nur noch historischen Wert:

#### Root-Level
1. **FINDER_MULTI_INSTANCE_SUMMARY.md** ✅ ERLEDIGT
   - **Grund:** Finder Multi-Instance seit Monaten produktiv
   - **Aktion:** → `docs/archive/finder-multi-instance-summary.md`

#### docs/ Level
2. **WINDOW_TABS_MIGRATION_SUMMARY.md** ✅ ERLEDIGT
   - **Grund:** TS-Migration abgeschlossen, Code ist live
   - **Aktion:** → `docs/archive/window-tabs-migration-summary.md`

3. **WINDOW_TABS_TESTING_GUIDE.md** ✅ ERLEDIGT
   - **Grund:** Tests laufen, Migration komplett
   - **Aktion:** → `docs/archive/window-tabs-testing-guide.md`

#### docs/archive/ (bereits da, gut!)
- FILE_SUMMARY_MULTI_INSTANCE.md
- IMPLEMENTATION_COMPLETE.md
- IMPLEMENTATION_SUMMARY.md
- MULTI_INSTANCE_COMPLETE.md
- MULTI_INSTANCE_MIGRATION.md
- MULTI_INSTANCE_QUICKSTART.md (⚠️ könnte noch nützlich sein)
- SUMMARY.md

---

### ✏️ AKTUALISIEREN (teilweise veraltet)

#### Hohe Priorität - JETZT
4. **docs/analysis/TYPESCRIPT_REFACTORING_OPPORTUNITIES.md** 🔄 UPDATE NEEDED
   - **Problem:** Beschreibt DOM-Utils als "TODO" - ist aber ERLEDIGT ✅
   - **Aktion:**
     ```markdown
     # Section 1: DOM-Utility-Funktionen
     Status: ✅ ERLEDIGT (28. Oktober 2025)
     
     - Modul `src/ts/dom-utils.ts` erstellt
     - 8 Module migriert (dialog, menubar-utils, context-menu, etc.)
     - Tests: 20/20 quick, 120/120 full E2E
     - Siehe CHANGELOG.md für Details
     
     Verbleibende Migration:
     - base-window-instance.ts (intentionally deferred)
     - [Liste anderer Module falls gewünscht]
     ```
   - **Update auch:** Sektion 2 (IIFE Pattern) - Bundle-Migration erwähnen

5. **docs/project/TODO.md** 🔄 UPDATE NEEDED
   - **Problem:** 1150 Zeilen! Viele erledigte Items noch als [ ]
   - **Aktion:**
     - Section "📊 TypeScript Refactoring" → als ✅ markieren (DOM-Utils fertig)
     - Section "Validation" vom 27.10. → als ✅ markieren oder Ergebnisse aktualisieren
     - Bundling-Tasks als ✅ markieren
     - Session-Restore-Fix als ✅ markieren

6. **docs/project/IMPROVEMENTS.md** 🔄 UPDATE NEEDED
   - **Problem:** 1192 Zeilen, viele "SOFORT" Tasks bereits erledigt
   - **Aktion:**
     - Section 1.1 "Documentation Cleanup" → als ✅ markieren (teilweise)
     - Konsolidierung bereits erfolgt (docs/archive existiert)

7. **docs/project/ROADMAP.md** 🔄 UPDATE NEEDED
   - **Problem:** Q4 2025 Status veraltet
   - **Aktion:**
     ```markdown
     ### ✅ Abgeschlossen (Q4 2025)
     - [x] Multi-Instance System
     - [x] WindowManager & ActionBus
     - [x] E2E Tests (120 passing)
     - [x] Documentation Cleanup (Phase 1)
     - [x] Logger System
     - [x] TypeScript Migration (Phase 0-1) ✅ NEU
     - [x] DOM-Utils Refactoring ✅ NEU
     - [x] Bundle Build Pipeline ✅ NEU
     - [x] Session Restore Fix ✅ NEU
     
     ### 🚧 In Arbeit
     - [ ] Bundle-Integration in index.html (staged rollout)
     - [ ] Fix-Exports Script entfernen (nach Bundle-Rollout)
     ```

8. **docs/LEGACY_JS_FILES.md** 🔄 UPDATE NEEDED
   - **Problem:** Stand 27.10., Bundle-Migration fehlt
   - **Aktion:** Hinweis ergänzen, dass viele js/ Dateien durch Bundle ersetzt werden könnten

#### Mittlere Priorität
9. **docs/architecture/REFACTORING.md** 🔄 CHECK & UPDATE
   - Prüfen ob DOM-Utils, Bundle-Migration erwähnt werden sollten

10. **docs/TYPESCRIPT_GUIDELINES.md** 🔄 CHECK & UPDATE
    - Prüfen ob Bundle-Pattern dokumentiert ist

11. **docs/TESTING.md** 🔄 CHECK & UPDATE
    - MOCK_GITHUB=1 dokumentiert? Bundle-Tests?

---

### 🗑️ LÖSCHEN (Duplikate/Überflüssig)

12. **dist/README.md**
    - **Grund:** Dist-Ordner ist für Build-Output, kein User-facing Readme nötig
    - **Aktion:** Löschen oder in Kommentar in `.gitignore` umwandeln

---

### ✅ BEHALTEN (relevant & aktuell)

Diese Docs sind gut und sollten bleiben:

#### Root
- `.github/copilot-instructions.md` ✅ - Wichtig für Copilot
- `CONTRIBUTING.md` ✅
- `readme.md` ✅
- `CHANGELOG.md` ✅

#### docs/
- `QUICKSTART.md` ✅
- `TESTING.md` ✅ (nach Update)
- `TROUBLESHOOTING.md` ✅
- `README.md` ✅

#### docs/architecture/
- `OVERVIEW.md` ✅
- `PATTERNS.md` ✅
- `REFACTORING.md` ✅ (nach Update)

#### docs/guides/
- `DEPLOYMENT.md` ✅

#### docs/project/
- `DECISIONS.md` ✅
- `TODO.md` ✅ (nach Cleanup)
- `ROADMAP.md` ✅ (nach Update)
- `IMPROVEMENTS.md` ✅ (nach Update)

---

## 🎯 Recommended Actions

### Schritt 1: Archive (5 Minuten)
```bash
# Bereits erledigt in docs/archive/
# Nur noch hinzufügen:
mv FINDER_MULTI_INSTANCE_SUMMARY.md docs/archive/
mv docs/WINDOW_TABS_MIGRATION_SUMMARY.md docs/archive/
mv docs/WINDOW_TABS_TESTING_GUIDE.md docs/archive/
```

### Schritt 2: Updates Batch 1 - Erledigte Features markieren (30 Minuten)
1. `TYPESCRIPT_REFACTORING_OPPORTUNITIES.md` - DOM-Utils als ✅
2. `TODO.md` - Bundling/DOM-Utils/Session-Restore als ✅
3. `ROADMAP.md` - Q4 Status aktualisieren

### Schritt 3: Updates Batch 2 - Content prüfen (60 Minuten)
4. `IMPROVEMENTS.md` - Cleanup-Status aktualisieren
5. `LEGACY_JS_FILES.md` - Bundle-Hinweis
6. `REFACTORING.md` - DOM-Utils erwähnen
7. `TYPESCRIPT_GUIDELINES.md` - Bundle-Pattern
8. `TESTING.md` - MOCK_GITHUB dokumentieren

### Schritt 4: Cleanup (5 Minuten)
9. `dist/README.md` löschen

---

## 📈 Nach der Bereinigung

**Vorher:** 68+ Markdown-Dateien, viele veraltet  
**Nachher:** ~50 Dateien, alle aktuell und relevant

**Struktur:**
```
docs/
├── README.md (Index)
├── QUICKSTART.md
├── TESTING.md
├── TROUBLESHOOTING.md
├── TYPESCRIPT_GUIDELINES.md
├── LEGACY_JS_FILES.md
├── analysis/
│   ├── TYPESCRIPT_REFACTORING_OPPORTUNITIES.md ✅ updated
│   └── DOCUMENTATION_AUDIT.md (dieses Dokument)
├── architecture/
│   ├── OVERVIEW.md
│   ├── PATTERNS.md
│   └── REFACTORING.md ✅ updated
├── archive/ (17 files - historical only)
├── guides/
│   └── DEPLOYMENT.md
├── migration/
│   └── [TS Migration Guides]
└── project/
    ├── TODO.md ✅ updated
    ├── ROADMAP.md ✅ updated
    ├── IMPROVEMENTS.md ✅ updated
    └── DECISIONS.md
```

---

## ✅ Success Criteria

- [ ] Alle "✅ ERLEDIGT" Docs archiviert
- [ ] TODO.md reduziert auf <500 Zeilen aktiver Tasks
- [ ] Alle Docs mit Status/Datum versehen
- [ ] Keine Duplikate mehr
- [ ] ROADMAP spiegelt aktuellen Q4-Status
- [ ] TYPESCRIPT_REFACTORING_OPPORTUNITIES zeigt DOM-Utils als erledigt

**Geschätzter Nutzen:**
- 🎯 Klarere Struktur für neue Contributors
- ⚡ Schnelleres Auffinden relevanter Docs
- 📉 Weniger Verwirrung durch veraltete Info
- 🚀 Bessere Copilot-Instructions (weniger noise)
