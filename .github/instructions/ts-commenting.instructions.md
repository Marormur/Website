---
description: 'Kommentarrichtlinien fuer TypeScript-Quellen: API-Dokumentation, Invarianten, Restore/Render-Kontext und nicht-offensichtliche WHY-Entscheidungen.'
applyTo: 'src/ts/**/*.ts'
---

# TypeScript Kommentarrichtlinien

Diese Richtlinie gilt nur fuer TypeScript-Quellcode in `src/ts/`.

## Ziel

- Kommentare fuer Menschen und AI-Agents gleichermassen klar und handlungsleitend schreiben.
- Fokus auf nicht-offensichtliche Entscheidungen, Reihenfolgen und Invarianten.
- Keine redundanten Kommentare, die nur den Code umformulieren.

## Wann kommentieren

- Oeffentliche APIs, Exports und Integrationspunkte mit klarem Zweck und Erwartung.
- Komplexe Kontrollfluesse (z. B. Init/Restore/Sync-Ablaeufe).
- Fallback-Logik, Guard-Rules, Migrationspfade und Kompatibilitaets-Code.
- Nebenwirkungen, die nicht direkt aus der Signatur erkennbar sind.
- Performance-kritische Pfade inklusive knapper Begruendung.

## Was ein guter Kommentar enthalten soll

- PURPOSE: Was der Block/die Funktion tut.
- WHY: Warum genau diese Loesung und nicht die offensichtliche Alternative.
- INPUT/OUTPUT: Relevante Parameter, Rueckgabe, Seiteneffekte.
- ASSUMPTIONS: Vorbedingungen und erwarteter Zustand vor Aufruf.
- EDGE CASES: Bekannte Randfaelle und Schutzmechanismen.
- INVARIANTS: Bedingungen, die immer wahr bleiben muessen.
- DEPENDENCIES: Erforderliche Reihenfolge zu Init/Services/DOM.
- PERFORMANCE: Messbare oder begruendete Optimierungen.
- ASYNC-SAFETY: Hinweise zu Reentrancy, Reihenfolge, Race-Risiken.

## Kontextbloecke fuer komplexe Bereiche

Bei kritischen Pfaden (z. B. Restore, VirtualFS, Rendering) sind kurze Kontextbloecke sinnvoll, wenn sie konkrete, pruefbare Leitplanken enthalten.

```ts
// ============================================================================
// CONTEXT FOR AI AGENTS:
// Before modifying this restore/render path:
// - Verify tab IDs remain stable across save/restore cycles
// - Ensure VirtualFS state and visible UI stay synchronized (no ghost tabs)
// - Test edge cases with multiple Finder windows and mixed sort modes
// - Benchmark: no measurable regression in initial render time on large datasets
// ============================================================================
```

## Kurzregeln

- Kommentare kurz, praezise und testbar halten.
- Erst den Code verbessern, dann nur das kommentieren, was trotzdem nicht selbsterklaerend ist.
- Bei bestehenden Projektnormen an den lokalen Stil anschliessen.
