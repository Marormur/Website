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
    const inlineZoom = parseFloat(document.documentElement.style.zoom || '');
    if (Number.isFinite(inlineZoom) && inlineZoom > 0) return inlineZoom;

    const computedZoom = parseFloat(getComputedStyle(document.documentElement).zoom || '');
    if (Number.isFinite(computedZoom) && computedZoom > 0) return computedZoom;

    return 1;
}

/**
 * Konvertiert gerenderte px (z. B. aus getBoundingClientRect) in logische CSS-px.
 */
export function toLogicalPx(px: number): number {
    return px / getHtmlZoom();
}

function distanceToRange(value: number, start: number, end: number): number {
    if (value < start) return start - value;
    if (value > end) return value - end;
    return 0;
}

/**
 * Erkennt, ob MouseEvent.clientX/Y unter CSS zoom bereits gerendert oder noch unskaliert sind.
 * Rückgabe ist 1 (bereits gerendert) oder der aktuelle zoom-Faktor (noch logisch/unskaliert).
 */
export function detectClientCoordinateScale(
    rawClientX: number,
    rawClientY: number,
    referenceRect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>
): number {
    const zoom = getHtmlZoom();
    if (Math.abs(zoom - 1) < 0.001) return 1;

    const scaledX = rawClientX * zoom;
    const scaledY = rawClientY * zoom;

    const rawDistance =
        distanceToRange(rawClientX, referenceRect.left, referenceRect.right) +
        distanceToRange(rawClientY, referenceRect.top, referenceRect.bottom);
    const scaledDistance =
        distanceToRange(scaledX, referenceRect.left, referenceRect.right) +
        distanceToRange(scaledY, referenceRect.top, referenceRect.bottom);

    return scaledDistance < rawDistance ? zoom : 1;
}

/**
 * Normalisiert MouseEvent.clientX/Y in den gerenderten Koordinatenraum des Viewports.
 */
export function toRenderedClientPx(rawClientPx: number, clientScale = 1): number {
    return rawClientPx * clientScale;
}

/**
 * Normalisiert MouseEvent.clientX/Y direkt in logische CSS-px für style.left/top.
 */
export function toLogicalClientPx(rawClientPx: number, clientScale = 1): number {
    return toLogicalPx(toRenderedClientPx(rawClientPx, clientScale));
}

/**
 * Liest eine logische CSS-Pixelangabe bevorzugt aus style/computed style und fällt
 * erst zuletzt auf einen Rect-Wert zurück. Das reduziert Rundungs- und Zoomabweichungen
 * beim Start von Drag-Operationen.
 */
export function resolveElementLogicalPx(
    element: HTMLElement,
    property: 'left' | 'top' | 'width' | 'height',
    rectFallbackPx: number
): number {
    const inlineValue = parseFloat(element.style[property] || '');
    if (Number.isFinite(inlineValue)) return inlineValue;

    const computedValue = parseFloat(getComputedStyle(element).getPropertyValue(property) || '');
    if (Number.isFinite(computedValue)) return computedValue;

    return toLogicalPx(rectFallbackPx);
}

/** Logische Viewport-Breite in CSS-px (CSS-zoom-normalisiert). */
export function getLogicalViewportWidth(): number {
    return Math.round(toLogicalPx(window.innerWidth));
}

/** Logische Viewport-Höhe in CSS-px (CSS-zoom-normalisiert). */
export function getLogicalViewportHeight(): number {
    return Math.round(toLogicalPx(window.innerHeight));
}
