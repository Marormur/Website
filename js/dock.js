/**
 * dock.js
 * Dock-Verwaltung und Magnification-System für den macOS Desktop-Klon
 */

// ============================================================================
// Dock-Hilfsfunktionen
// ============================================================================

/**
 * Ermittelt die vom Dock belegte Reserve am unteren Rand (in Pixeln)
 * @returns {number} Höhe der Dock-Reserve in Pixeln
 */
function getDockReservedBottom() {
    const dock = document.getElementById('dock');
    if (!dock || dock.classList.contains('hidden')) return 0;

    const rect = dock.getBoundingClientRect();
    const vh = Math.max(window.innerHeight || 0, 0);

    if (vh <= 0) return 0;

    return Math.round(Math.max(0, vh - rect.top));
}

// ============================================================================
// Dock-Magnification (macOS-Stil)
// ============================================================================

/**
 * Initialisiert die Dock-Magnification (Vergrößerungseffekt bei Hover)
 * Vergrößert Icons bei Maus-Nähe mit Gaußscher Verteilung
 */
function initDockMagnification() {
    const dock = document.getElementById('dock');
    if (!dock) return;

    const icons = Array.from(dock.querySelectorAll('.dock-icon'));
    if (!icons.length) return;

    // Sammle alle Icons mit ihren Tooltips
    const items = icons.map(icon => {
        const parent = icon.parentElement;
        const tooltip = parent ? parent.querySelector('.dock-tooltip') : null;
        return {
            icon,
            tooltip,
            baseHeight: icon.offsetHeight || 0
        };
    });

    let rafId = null;
    let pointerX = null;

    // Magnification-Einstellungen
    const maxScale = 1.6;        // Maximale Vergrößerung
    const minScale = 1.0;        // Minimale Größe (normal)
    const radius = 120;          // Einflussradius in px
    const sigma = radius / 3;    // Gaußsche Standardabweichung

    /**
     * Wendet die Magnification auf alle Dock-Icons an
     */
    const apply = () => {
        rafId = null;

        // Kein Pointer → Alles zurücksetzen
        if (pointerX == null) {
            items.forEach(({ icon, tooltip }) => {
                icon.style.transform = '';
                icon.style.zIndex = '';
                if (tooltip) {
                    tooltip.style.transform = '';
                    tooltip.style.zIndex = '';
                }
            });
            return;
        }

        // Berechne Skalierung für jedes Icon basierend auf Distanz zum Pointer
        items.forEach(({ icon, tooltip, baseHeight }) => {
            const rect = icon.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;  // Center X des Icons
            const dx = Math.abs(pointerX - cx);     // Distanz zum Pointer

            // Gaußsche Verteilung für smooth Magnification
            const influence = Math.exp(-(dx * dx) / (2 * sigma * sigma)); // 0..1

            const scale = minScale + (maxScale - minScale) * influence;
            const translateY = -8 * influence; // Leichtes Anheben bei Hover

            // Transformiere Icon
            icon.style.transformOrigin = 'bottom center';
            icon.style.transform = `translateY(${translateY.toFixed(1)}px) scale(${scale.toFixed(3)})`;
            icon.style.zIndex = String(100 + Math.round(influence * 100));

            // Tooltip-Position anpassen
            if (tooltip) {
                const base = baseHeight || icon.offsetHeight || 0;
                const lift = Math.max(0, base * (scale - 1) - translateY);
                const gap = 12; // Zusätzlicher Abstand zwischen Icon und Tooltip

                tooltip.style.transform = `translateY(-${(lift + gap).toFixed(1)}px)`;
                tooltip.style.zIndex = '400';
            }
        });
    };

    // Event-Handler
    const onMove = (e) => {
        pointerX = e.clientX;
        if (!rafId) rafId = requestAnimationFrame(apply);
    };

    const onLeave = () => {
        pointerX = null;
        if (!rafId) rafId = requestAnimationFrame(apply);
    };

    dock.addEventListener('mousemove', onMove);
    dock.addEventListener('mouseleave', onLeave);
}

// ============================================================================
// Global Export
// ============================================================================
if (typeof window !== 'undefined') {
    window.DockSystem = {
        getDockReservedBottom,
        initDockMagnification
    };
}
