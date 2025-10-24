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
// Dock-Drag&Drop (Icon Reordering)
// ============================================================================

const DOCK_ORDER_STORAGE_KEY = 'dockIconOrder';

/**
 * Lädt die gespeicherte Icon-Reihenfolge aus localStorage
 * @returns {Array<string>} Array von window-ids in der gespeicherten Reihenfolge
 */
function loadDockOrder() {
    try {
        const stored = localStorage.getItem(DOCK_ORDER_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        console.warn('Failed to load dock order:', e);
        return null;
    }
}

/**
 * Speichert die aktuelle Icon-Reihenfolge in localStorage
 * @param {Array<string>} order - Array von window-ids
 */
function saveDockOrder(order) {
    try {
        localStorage.setItem(DOCK_ORDER_STORAGE_KEY, JSON.stringify(order));
    } catch (e) {
        console.warn('Failed to save dock order:', e);
    }
}

/**
 * Extrahiert die aktuelle Reihenfolge der Dock-Icons
 * @returns {Array<string>} Array von window-ids
 */
function getCurrentDockOrder() {
    const dock = document.getElementById('dock');
    if (!dock) return [];
    
    const items = Array.from(dock.querySelectorAll('.dock-item[data-window-id]'));
    return items.map(item => item.getAttribute('data-window-id')).filter(Boolean);
}

/**
 * Wendet eine gespeicherte Reihenfolge auf das Dock an
 * @param {Array<string>} order - Array von window-ids in der gewünschten Reihenfolge
 */
function applyDockOrder(order) {
    const dock = document.getElementById('dock');
    if (!dock) return;
    
    const tray = dock.querySelector('.dock-tray');
    if (!tray) return;
    
    const items = Array.from(tray.querySelectorAll('.dock-item[data-window-id]'));
    const itemMap = new Map(items.map(item => [item.getAttribute('data-window-id'), item]));
    
    // Sortiere Items nach der gespeicherten Reihenfolge
    const sortedItems = [];
    order.forEach(windowId => {
        const item = itemMap.get(windowId);
        if (item) {
            sortedItems.push(item);
            itemMap.delete(windowId);
        }
    });
    
    // Füge Items hinzu, die nicht in der gespeicherten Reihenfolge sind
    itemMap.forEach(item => sortedItems.push(item));
    
    // Re-append in neuer Reihenfolge
    sortedItems.forEach(item => tray.appendChild(item));
}

/**
 * Initialisiert das Drag&Drop-System für Dock-Icons
 */
function initDockDragDrop() {
    const dock = document.getElementById('dock');
    if (!dock) return;
    
    let draggedItem = null;
    let placeholder = null;
    
    const createPlaceholder = () => {
        const ph = document.createElement('div');
        ph.className = 'dock-item dock-placeholder';
        ph.style.cssText = 'opacity: 0.5; pointer-events: none;';
        return ph;
    };
    
    const handleDragStart = (e) => {
        const item = e.target.closest('.dock-item');
        if (!item || !item.hasAttribute('data-window-id')) return;
        
        draggedItem = item;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', item.innerHTML);
        
        // Visuelle Rückmeldung
        setTimeout(() => {
            if (draggedItem) {
                draggedItem.style.opacity = '0.4';
            }
        }, 0);
    };
    
    const handleDragEnd = (e) => {
        if (draggedItem) {
            draggedItem.style.opacity = '';
        }
        
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
        
        draggedItem = null;
        placeholder = null;
        
        // Speichere neue Reihenfolge
        const newOrder = getCurrentDockOrder();
        saveDockOrder(newOrder);
    };
    
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const targetItem = e.target.closest('.dock-item');
        const tray = dock.querySelector('.dock-tray');
        
        if (!targetItem || !tray || targetItem === draggedItem) {
            return;
        }
        
        // Erstelle Placeholder wenn nötig
        if (!placeholder) {
            placeholder = createPlaceholder();
        }
        
        // Bestimme Position für Placeholder
        const rect = targetItem.getBoundingClientRect();
        const middle = rect.left + rect.width / 2;
        const insertBefore = e.clientX < middle;
        
        if (insertBefore) {
            tray.insertBefore(placeholder, targetItem);
        } else {
            tray.insertBefore(placeholder, targetItem.nextSibling);
        }
    };
    
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!draggedItem || !placeholder) return;
        
        const tray = dock.querySelector('.dock-tray');
        if (!tray) return;
        
        // Verschiebe das gedraggte Item an die Placeholder-Position
        tray.insertBefore(draggedItem, placeholder);
        
        if (placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
        
        placeholder = null;
    };
    
    // Event-Listener für alle Dock-Items
    const items = dock.querySelectorAll('.dock-item');
    items.forEach(item => {
        item.setAttribute('draggable', 'true');
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
    });
    
    // Lade gespeicherte Reihenfolge beim Start
    const savedOrder = loadDockOrder();
    if (savedOrder && savedOrder.length > 0) {
        applyDockOrder(savedOrder);
    }
}

// ============================================================================
// Global Export
// ============================================================================
if (typeof window !== 'undefined') {
    window.DockSystem = {
        getDockReservedBottom,
        initDockMagnification,
        initDockDragDrop,
        loadDockOrder,
        saveDockOrder,
        getCurrentDockOrder,
        applyDockOrder
    };
}
