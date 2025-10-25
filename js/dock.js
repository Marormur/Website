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
    const items = icons.map((icon) => {
        const parent = icon.parentElement;
        const tooltip = parent ? parent.querySelector('.dock-tooltip') : null;
        return {
            icon,
            tooltip,
            baseHeight: icon.offsetHeight || 0,
        };
    });

    let rafId = null;
    let pointerX = null;

    // Magnification-Einstellungen
    const maxScale = 1.6; // Maximale Vergrößerung
    const minScale = 1.0; // Minimale Größe (normal)
    const radius = 120; // Einflussradius in px
    const sigma = radius / 3; // Gaußsche Standardabweichung

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

        // Mit Pointer: Skalen berechnen
        items.forEach(({ icon, tooltip, baseHeight }) => {
            const rect = icon.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const dx = Math.abs(pointerX - centerX);
            const influence = Math.exp(-(dx * dx) / (2 * sigma * sigma));
            const scale = Math.max(
                minScale,
                Math.min(
                    maxScale,
                    minScale + (maxScale - minScale) * influence,
                ),
            );

            // Leichtes Anheben nach oben, abhängig von der Skalierung
            const base = baseHeight || icon.offsetHeight || 0;
            const translateY = Math.max(0, (scale - 1) * base * 0.5);

            icon.style.transform = `translateY(-${translateY.toFixed(1)}px) scale(${scale.toFixed(3)})`;
            icon.style.zIndex = scale > 1.01 ? '300' : '';

            // Tooltip-Position anpassen
            if (tooltip) {
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
// Dock Drag & Drop (Reihenfolge + Persistenz)
// ============================================================================

const DOCK_ORDER_STORAGE_KEY = 'dock:order:v1';

function loadDockOrder() {
    try {
        const raw = localStorage.getItem(DOCK_ORDER_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return Array.isArray(parsed) ? parsed : null;
    } catch (_) {
        return null;
    }
}

function saveDockOrder(order) {
    try {
        localStorage.setItem(
            DOCK_ORDER_STORAGE_KEY,
            JSON.stringify(order || []),
        );
    } catch (_) {
        /* ignore */
    }
}

function getDockItemId(item) {
    if (!item) return null;
    return item.getAttribute('data-window-id') || null;
}

function getCurrentDockOrder() {
    const tray = document.querySelector('#dock .dock-tray');
    if (!tray) return [];
    return Array.from(tray.querySelectorAll('.dock-item'))
        .map(getDockItemId)
        .filter(Boolean);
}

function applyDockOrder(order) {
    if (!Array.isArray(order) || !order.length) return;
    const tray = document.querySelector('#dock .dock-tray');
    if (!tray) return;
    const items = Array.from(tray.querySelectorAll('.dock-item'));
    const map = new Map(items.map((it) => [getDockItemId(it), it]));
    // Füge bekannte IDs in gewünschter Reihenfolge ein, unbekannte später anhängen
    const fragment = document.createDocumentFragment();
    order.forEach((id) => {
        const el = map.get(id);
        if (el) {
            fragment.appendChild(el);
            map.delete(id);
        }
    });
    // Rest anhängen (stabile Reihenfolge)
    for (const [, el] of map) fragment.appendChild(el);
    tray.appendChild(fragment);
}

function createPlaceholder(width, height) {
    const ph = document.createElement('div');
    ph.className = 'dock-placeholder';
    ph.setAttribute('aria-hidden', 'true');
    ph.style.width = Math.max(1, Math.round(width || 48)) + 'px';
    ph.style.height = Math.max(1, Math.round(height || 48)) + 'px';
    ph.style.opacity = '0';
    ph.style.pointerEvents = 'none';
    return ph;
}

function initDockDragDrop() {
    const dock = document.getElementById('dock');
    const tray = dock ? dock.querySelector('.dock-tray') : null;
    if (!dock || !tray) return;

    // Ordnung beim Laden anwenden
    const persisted = loadDockOrder();
    if (persisted && persisted.length) applyDockOrder(persisted);

    let draggedItem = null;
    let placeholder = null;
    let prevUserSelect = '';
    let suppressClicksUntil = 0;

    const updatePlaceholderSize = (ref) => {
        if (!placeholder || !ref) return;
        try {
            const r = ref.getBoundingClientRect();
            placeholder.style.width = r.width + 'px';
            placeholder.style.height = r.height + 'px';
        } catch (_) {
            /* ignore */
        }
    };

    const placeRelativeTo = (targetItem, clientX) => {
        if (!tray || !targetItem) return;
        if (!placeholder) placeholder = createPlaceholder();
        updatePlaceholderSize(draggedItem || targetItem);
        const rect = targetItem.getBoundingClientRect();
        const insertBefore = clientX < rect.left + rect.width / 2;
        tray.insertBefore(
            placeholder,
            insertBefore ? targetItem : targetItem.nextSibling,
        );
    };

    const handleTrayDragOver = (e) => {
        if (!draggedItem) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        const items = Array.from(tray.querySelectorAll('.dock-item')).filter(
            (it) => it !== draggedItem,
        );
        if (!placeholder) placeholder = createPlaceholder();
        if (items.length === 0) {
            tray.appendChild(placeholder);
            return;
        }
        // Finde erste Position deren Mitte rechts vom Cursor liegt
        let target = null;
        for (const it of items) {
            const r = it.getBoundingClientRect();
            if (e.clientX < r.left + r.width / 2) {
                target = it;
                break;
            }
        }
        updatePlaceholderSize(draggedItem || items[0]);
        if (target) tray.insertBefore(placeholder, target);
        else tray.appendChild(placeholder);
    };

    const onDragStart = (e) => {
        const item = e.currentTarget.closest('.dock-item');
        if (!item) return;
        draggedItem = item;
        prevUserSelect = document.body.style.userSelect || '';
        document.body.style.userSelect = 'none';
        suppressClicksUntil = Date.now() + 250;
        // Drag-Image mittig setzen (verhindert Textselektionskink)
        try {
            const icon = item.querySelector('.dock-icon') || item;
            const r = icon.getBoundingClientRect();
            e.dataTransfer.setData('text/plain', getDockItemId(item) || '');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setDragImage(icon, r.width / 2, r.height / 2);
        } catch (_) {
            /* ignore */
        }
        // Platzhalter vorläufig an aktuelle Stelle
        const r = item.getBoundingClientRect();
        placeholder = createPlaceholder(r.width, r.height);
        tray.insertBefore(placeholder, item.nextSibling);
    };

    const onDragOver = (e) => {
        if (!draggedItem) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        const target = e.target && e.target.closest('.dock-item');
        if (!target || target === draggedItem) {
            handleTrayDragOver(e);
            return;
        }
        placeRelativeTo(target, e.clientX);
    };

    const finalizeDrop = () => {
        if (!draggedItem || !placeholder) return;
        tray.insertBefore(draggedItem, placeholder);
        placeholder.remove();
        placeholder = null;
        const order = getCurrentDockOrder();
        saveDockOrder(order);
    };

    const onDrop = (e) => {
        if (!draggedItem) return;
        e.preventDefault();
        const phDidNotMove =
            placeholder &&
            placeholder.isConnected &&
            (placeholder.previousSibling === draggedItem ||
                placeholder.nextSibling === draggedItem);
        // If placeholder didn't move (or is missing), compute target via drop position
        if (!placeholder || !placeholder.isConnected || phDidNotMove) {
            const x = e.clientX;
            const items = Array.from(
                tray.querySelectorAll('.dock-item'),
            ).filter((it) => it !== draggedItem);
            let inserted = false;
            for (const it of items) {
                const r = it.getBoundingClientRect();
                if (x < r.left + r.width / 2) {
                    tray.insertBefore(draggedItem, it);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) {
                tray.appendChild(draggedItem);
            }
            const order = getCurrentDockOrder();
            saveDockOrder(order);
            cleanup();
            return;
        }
        finalizeDrop();
    };

    const cleanup = () => {
        if (placeholder && placeholder.isConnected) placeholder.remove();
        placeholder = null;
        draggedItem = null;
        document.body.style.userSelect = prevUserSelect;
    };

    const onDragEnd = () => {
        cleanup();
    };

    // Click-Suppression (versehentliches Öffnen vermeiden)
    dock.addEventListener(
        'click',
        (ev) => {
            if (Date.now() < suppressClicksUntil || draggedItem) {
                ev.stopPropagation();
                ev.preventDefault();
            }
        },
        true,
    );

    // Globale Sicherheitsleine
    window.addEventListener('blur', cleanup);

    // Delegation: Items draggable machen und Events binden
    const enableDraggable = () => {
        tray.querySelectorAll('.dock-item').forEach((it) => {
            it.setAttribute('draggable', 'true');
            it.addEventListener('dragstart', onDragStart);
        });
    };
    enableDraggable();

    tray.addEventListener('dragover', onDragOver);
    tray.addEventListener('drop', onDrop);
    tray.addEventListener('dragend', onDragEnd);
}

// ============================================================================
// Global Export
// ============================================================================
if (typeof window !== 'undefined') {
    window.DockSystem = {
        getDockReservedBottom,
        initDockMagnification,
        initDockDragDrop,
        getCurrentDockOrder,
        loadDockOrder,
        saveDockOrder,
        applyDockOrder,
    };
}
