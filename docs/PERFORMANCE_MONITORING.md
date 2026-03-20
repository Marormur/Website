# Performance Monitoring

## Overview

Dokumentiert den `PerfMonitor` (`src/ts/core/perf-monitor.ts`) und die zugehörigen E2E-Performance-Tests.

## PerfMonitor API

### Methoden

| Methode                               | Beschreibung                                                               |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `enable()` / `disable()` / `toggle()` | Monitoring aktivieren/deaktivieren (persistiert in `localStorage`)         |
| `mark(name)`                          | Setzt einen `performance.mark`                                             |
| `measure(name, start?, end?)`         | Misst zwischen zwei Marks, speichert in `metrics`                          |
| `measureFunction(name, fn)`           | Wrapper: misst Ausführungszeit von `fn`, gibt Rückgabewert zurück          |
| `getStats(name)`                      | Gibt `{ avg, min, max, p95, count }` oder `null` zurück                    |
| `reportStats()`                       | Gibt alle gesammelten Stats via `logger.debug` aus (gruppiert)             |
| `report(options?)`                    | Gibt Top-N-`PerformanceMeasure`-Einträge aus, optional mit Core Web Vitals |
| `getVitals()`                         | Gibt gemessene Core Web Vitals zurück (`LCP`, `FID`, `CLS`, `TTFB`)        |

**Standardverhalten:** Im Dev-Modus (`localhost` / Port vorhanden) automatisch aktiviert.

### Beispiel

```javascript
// Funktion messen
const result = window.PerfMonitor.measureFunction('render-list', () => {
    return renderListView(items);
});

// Statistiken abfragen
const stats = window.PerfMonitor.getStats('render-list');
// { avg: 12.5, min: 0, max: 15.8, p95: 14.9, count: 10 }
// Hinweis: min kann bei sehr schnellen Operationen 0 sein (performance.now()-Auflösung)

// Alle Stats im Dev-Log ausgeben
window.PerfMonitor.reportStats();
```

**Hinweis:** `reportStats()` schreibt via `logger.debug`, nicht via `console.table`.

### API-Facade

Alle Methoden sind auch über `API.performance` verfügbar:

```javascript
API.performance.measureFunction('operation', fn);
API.performance.getStats('operation');
API.performance.reportStats();
```

## E2E-Performance-Tests

Performance-Tests sind per Default deaktiviert und werden nur mit `npm run test:e2e:performance` ausgeführt.

### `perf-monitor-stats.spec.js` — Aktueller Stand: ✅ Funktioniert

| Test                                     | Status                                         |
| ---------------------------------------- | ---------------------------------------------- |
| `measureFunction()` helper               | ✅                                             |
| Metrics über mehrere Aufrufe             | ✅ (min kann `0` sein bei schnellen Ops)       |
| Statistikberechnung (avg, min, max, p95) | ✅                                             |
| `reportStats()` Ausgabe                  | ✅ (via `logger.debug`, nicht `console.table`) |
| API-Facade-Integration                   | ✅                                             |

### `vdom-performance.spec.js` — Aktueller Stand: Teilweise

**FinderView-Tests** — Die Tests enthalten Guards und springen per `test.skip` über nicht implementierte Teile. Die VDOM-Methoden `renderListView`, `navigateTo` und `selectItem` sind an `activeTab` noch nicht verfügbar.

**Terminal-Tests** — Laufen durch (Add 100 lines: ~0,2 ms, Command execution: ~0,5 ms).

**TextEditor-Tests** — Broken: Selector `.dock-item[data-window-id="texteditor-modal"]` findet kein Element im DOM.

**Memory-Leak-Test** — Überspringt in headless Chromium, da `performance.memory` nicht verfügbar ist.

### Performance-Zielwerte

| Operation              | Ziel    | Status                           |
| ---------------------- | ------- | -------------------------------- |
| FinderView Render 100  | < 50ms  | Pending (API fehlt)              |
| FinderView Render 1000 | < 200ms | Pending (API fehlt)              |
| FinderView Navigate    | < 50ms  | Pending (API fehlt)              |
| FinderView Select      | < 20ms  | Pending (API fehlt)              |
| Terminal Output 100    | < 100ms | ✅                               |
| Terminal Execute       | < 50ms  | ✅                               |
| TextEditor Toolbar     | < 20ms  | Broken (Selector veraltet)       |
| Memory Overhead        | < 10MB  | Skip (kein `performance.memory`) |

## Tests ausführen

```bash
# Alle Performance-Tests
npm run test:e2e:performance

# Nur PerfMonitor-Stats
npm run test:e2e:performance -- tests/e2e/performance/perf-monitor-stats.spec.js --project=chromium
```

## Quellen

- PerfMonitor: `src/ts/core/perf-monitor.ts`
- API-Facade: `src/ts/core/api.ts`
