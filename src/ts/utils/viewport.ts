/**
 * src/ts/utils/viewport.ts
 *
 * PURPOSE: CSS-zoom-normalisierte Viewport-Dimensionen für Fenster-Positionierung.
 *
 * WHY: Bei aktivem CSS zoom auf dem <html>-Element (z. B. Nutzer-Skalierung) geben
 *      window.innerWidth/-Height die physische Viewport-Breite/-Höhe zurück,
 *      während DOM-Stile (style.width/height in px) im logischen (1/zoom)-skalierten
 *      Koordinatenraum arbeiten. Division durch den zoom-Faktor liefert die logische
 *      Breite/-Höhe, die den Viewport tatsächlich vollständig füllt.
 *
 * EXAMPLE: zoom=0.85, innerWidth=922 → logicalWidth = 922/0.85 = 1085 px
 *          style.width='1085px' → sichtbar: 1085*0.85 = 922 px (= Viewport) ✓
 *          style.width='922px'  → sichtbar: 922*0.85   = 784 px (138 px Lücke) ✗
 *
 * INVARIANT: Rückgabewerte >= 1 (zoom wird via || 1 abgesichert).
 */

/** Aktueller CSS-zoom-Faktor des <html>-Elements (1.0 wenn kein zoom gesetzt). */
export function getHtmlZoom(): number {
    return parseFloat(document.documentElement.style.zoom || '1') || 1;
}

/**
 * Konvertiert gerenderte px (z. B. aus getBoundingClientRect) in logische CSS-px.
 */
export function toLogicalPx(px: number): number {
    return px / getHtmlZoom();
}

/** Logische Viewport-Breite in CSS-px (CSS-zoom-normalisiert). */
export function getLogicalViewportWidth(): number {
    return Math.round(toLogicalPx(window.innerWidth));
}

/** Logische Viewport-Höhe in CSS-px (CSS-zoom-normalisiert). */
export function getLogicalViewportHeight(): number {
    return Math.round(toLogicalPx(window.innerHeight));
}
