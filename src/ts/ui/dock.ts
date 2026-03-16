/*
 * src/ts/dock.ts
 * Typed port of js/dock.js
 */

import { getJSON, setJSON } from '../services/storage-utils.js';
import { getLogicalViewportHeight } from '../utils/viewport.js';

// getDockReservedBottom
export function getDockReservedBottom(): number {
    try {
        const dock = document.getElementById('dock');
        if (!dock || dock.classList.contains('hidden')) return 0;
        const rect = dock.getBoundingClientRect();
        const logicalVh = Math.max(getLogicalViewportHeight(), 0);
        if (logicalVh <= 0) return 0;
        // rect.top liegt im selben Koordinatenraum wie Fenster-Styles (left/top/height).
        // Für Fill/Snap muss daher gegen die logische Viewport-Höhe gerechnet werden.
        return Math.round(Math.max(0, logicalVh - rect.top));
    } catch {
        return 0;
    }
}

// Dock magnification
export function initDockMagnification(): void {
    const dock = document.getElementById('dock');
    if (!dock) return;

    const icons = Array.from(dock.querySelectorAll<HTMLElement>('.dock-icon'));
    if (!icons.length) return;

    const items = icons.map(icon => {
        const parent = icon.parentElement as HTMLElement | null;
        const tooltip = parent
            ? (parent.querySelector('.dock-tooltip') as HTMLElement | null)
            : null;
        return {
            icon,
            tooltip,
            baseHeight: icon.offsetHeight || 0,
        };
    });

    let rafId: number | null = null;
    let pointerX: number | null = null;

    const getDisplayScale = (): number => {
        const fromInline = Number.parseFloat(document.documentElement.style.zoom || '');
        if (Number.isFinite(fromInline) && fromInline > 0) return fromInline;

        const computedZoom = Number.parseFloat(
            getComputedStyle(document.documentElement).zoom || ''
        );
        if (Number.isFinite(computedZoom) && computedZoom > 0) return computedZoom;

        return 1;
    };

    const projectPointerXFromTarget = (e: MouseEvent): number | null => {
        const eventTarget = e.target as HTMLElement | null;
        const referenceTarget = eventTarget?.closest(
            '.dock-icon, .dock-tooltip, .dock-item, .dock-tray, #dock'
        ) as HTMLElement | null;
        if (!referenceTarget) return null;

        const localWidth = referenceTarget.clientWidth || referenceTarget.offsetWidth || 0;
        if (localWidth <= 0 || !Number.isFinite(e.offsetX)) return null;

        const rect = referenceTarget.getBoundingClientRect();
        return rect.left + (e.offsetX / localWidth) * rect.width;
    };

    const resolvePointerX = (e: MouseEvent): number => {
        const projectedX = projectPointerXFromTarget(e);
        if (projectedX !== null) return projectedX;

        const rawX = e.clientX;
        const scale = getDisplayScale();
        if (Math.abs(scale - 1) < 0.001) return rawX;

        const scaledX = rawX * scale;
        const target = e.target as Element | null;
        const iconTarget = target?.closest('.dock-icon') as HTMLElement | null;
        if (!iconTarget) return scaledX;

        const rect = iconTarget.getBoundingClientRect();
        const distanceToRect = (x: number) => {
            if (x < rect.left) return rect.left - x;
            if (x > rect.right) return x - rect.right;
            return 0;
        };

        // In some embedded Chromium surfaces with CSS zoom, clientX can be unscaled
        // while getBoundingClientRect() is already scaled.
        return distanceToRect(scaledX) < distanceToRect(rawX) ? scaledX : rawX;
    };

    const maxScale = 1.6;
    const minScale = 1.0;
    const radius = 120;
    const sigma = radius / 3;

    const apply = () => {
        rafId = null;
        if (pointerX === null) {
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

        items.forEach(({ icon, tooltip, baseHeight }) => {
            const rect = icon.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const dx = Math.abs(pointerX! - centerX);
            const influence = Math.exp(-(dx * dx) / (2 * sigma * sigma));
            const scale = Math.max(
                minScale,
                Math.min(maxScale, minScale + (maxScale - minScale) * influence)
            );

            const base = baseHeight || icon.offsetHeight || 0;
            const translateY = Math.max(0, (scale - 1) * base * 0.5);

            icon.style.transform = `translateY(-${translateY.toFixed(1)}px) scale(${scale.toFixed(3)})`;
            icon.style.zIndex = scale > 1.01 ? '300' : '';

            if (tooltip) {
                const lift = Math.max(0, base * (scale - 1) - translateY);
                const gap = 12;
                tooltip.style.transform = `translateY(-${(lift + gap).toFixed(1)}px)`;
                tooltip.style.zIndex = '400';
            }
        });
    };

    const onMove = (e: MouseEvent) => {
        pointerX = resolvePointerX(e);
        if (!rafId) rafId = requestAnimationFrame(apply) as unknown as number;
    };
    const onLeave = () => {
        pointerX = null;
        if (!rafId) rafId = requestAnimationFrame(apply) as unknown as number;
    };

    dock.addEventListener('mousemove', onMove);
    dock.addEventListener('mouseleave', onLeave);
}

// Dock drag & drop order persistence
const DOCK_ORDER_STORAGE_KEY = 'dock:order:v1';

export function loadDockOrder(): string[] | null {
    try {
        const parsed = getJSON<string[] | null>(DOCK_ORDER_STORAGE_KEY, null);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function saveDockOrder(order: string[] | null | undefined): void {
    try {
        setJSON(DOCK_ORDER_STORAGE_KEY, order || []);
    } catch {
        // ignore
    }
}

export function getDockItemId(item: Element | null): string | null {
    if (!item) return null;
    return (item.getAttribute('data-window-id') as string) || null;
}

export function getCurrentDockOrder(): string[] {
    const tray = document.querySelector('#dock .dock-tray');
    if (!tray) return [];
    return Array.from(tray.querySelectorAll('.dock-item'))
        .map(it => getDockItemId(it))
        .filter(Boolean) as string[];
}

export function applyDockOrder(order: string[] | null | undefined): void {
    if (!Array.isArray(order) || !order.length) return;
    const tray = document.querySelector('#dock .dock-tray');
    if (!tray) return;
    const items = Array.from(tray.querySelectorAll<HTMLElement>('.dock-item'));
    const map = new Map(items.map(it => [getDockItemId(it), it]));
    const fragment = document.createDocumentFragment();
    order.forEach(id => {
        const el = map.get(id as unknown as string);
        if (el) {
            fragment.appendChild(el);
            map.delete(id as unknown as string);
        }
    });
    for (const [, el] of map) fragment.appendChild(el);
    tray.appendChild(fragment);
}

export function createPlaceholder(width?: number, height?: number): HTMLElement {
    const ph = document.createElement('div');
    ph.className = 'dock-placeholder';
    ph.setAttribute('aria-hidden', 'true');
    ph.style.width = Math.max(1, Math.round(width || 48)) + 'px';
    ph.style.height = Math.max(1, Math.round(height || 48)) + 'px';
    ph.style.opacity = '0';
    ph.style.pointerEvents = 'none';
    return ph;
}

export function initDockDragDrop(): void {
    const dock = document.getElementById('dock');
    const tray = dock ? (dock.querySelector('.dock-tray') as HTMLElement | null) : null;
    if (!dock || !tray) return;

    const persisted = loadDockOrder();
    if (persisted && persisted.length) applyDockOrder(persisted);

    let draggedItem: HTMLElement | null = null;
    let placeholder: HTMLElement | null = null;
    let prevUserSelect = '';
    let suppressClicksUntil = 0;

    const updatePlaceholderSize = (ref: HTMLElement | null) => {
        if (!placeholder || !ref) return;
        try {
            const r = ref.getBoundingClientRect();
            placeholder.style.width = r.width + 'px';
            placeholder.style.height = r.height + 'px';
        } catch {
            // ignore
        }
    };

    const placeRelativeTo = (targetItem: HTMLElement, clientX: number) => {
        if (!tray || !targetItem) return;
        if (!placeholder) placeholder = createPlaceholder();
        updatePlaceholderSize(draggedItem || targetItem);
        const rect = targetItem.getBoundingClientRect();
        const insertBefore = clientX < rect.left + rect.width / 2;
        tray.insertBefore(placeholder, insertBefore ? targetItem : targetItem.nextSibling);
    };

    const handleTrayDragOver = (e: DragEvent) => {
        if (!draggedItem) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        const items = Array.from(tray.querySelectorAll<HTMLElement>('.dock-item')).filter(
            it => it !== draggedItem
        );
        if (!placeholder) placeholder = createPlaceholder();
        if (items.length === 0) {
            tray.appendChild(placeholder);
            return;
        }
        let target: HTMLElement | null = null;
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

    const onDragStart = function (this: HTMLElement, e: DragEvent) {
        const item = (this as HTMLElement).closest('.dock-item') as HTMLElement | null;
        if (!item) return;
        draggedItem = item;
        prevUserSelect = document.body.style.userSelect || '';
        document.body.style.userSelect = 'none';
        suppressClicksUntil = Date.now() + 250;
        try {
            const icon = (item.querySelector('.dock-icon') as HTMLElement) || item;
            const r = icon.getBoundingClientRect();
            if (e.dataTransfer) {
                e.dataTransfer.setData('text/plain', getDockItemId(item) || '');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setDragImage(icon as Element, r.width / 2, r.height / 2);
            }
        } catch {
            // ignore
        }
        const r = item.getBoundingClientRect();
        placeholder = createPlaceholder(r.width, r.height);
        tray.insertBefore(placeholder, item.nextSibling);
    };

    const onDragOver = (e: DragEvent) => {
        if (!draggedItem) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        const target = (e.target as Element).closest('.dock-item') as HTMLElement | null;
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

    const onDrop = (e: DragEvent) => {
        if (!draggedItem) return;
        e.preventDefault();
        const phDidNotMove =
            placeholder &&
            placeholder.isConnected &&
            (placeholder.previousSibling === draggedItem ||
                placeholder.nextSibling === draggedItem);
        if (!placeholder || !placeholder.isConnected || phDidNotMove) {
            const x = e.clientX;
            const items = Array.from(tray.querySelectorAll<HTMLElement>('.dock-item')).filter(
                it => it !== draggedItem
            );
            let inserted = false;
            for (const it of items) {
                const r = it.getBoundingClientRect();
                if (x < r.left + r.width / 2) {
                    tray.insertBefore(draggedItem, it);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) tray.appendChild(draggedItem);
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

    dock.addEventListener(
        'click',
        ev => {
            if (Date.now() < suppressClicksUntil || draggedItem) {
                ev.stopPropagation();
                ev.preventDefault();
            }
        },
        true
    );

    window.addEventListener('blur', cleanup);

    const enableDraggable = () => {
        tray.querySelectorAll<HTMLElement>('.dock-item').forEach(it => {
            it.setAttribute('draggable', 'true');
            it.addEventListener('dragstart', onDragStart);
        });
    };
    enableDraggable();

    tray.addEventListener('dragover', onDragOver as EventListener);
    tray.addEventListener('drop', onDrop as EventListener);
    tray.addEventListener('dragend', onDragEnd as EventListener);
}

export function updateDockIndicators(): void {
    const domUtils = window.DOMUtils;

    const indicatorMappings = [
        { indicatorId: 'finder-indicator', windowType: 'finder' },
        { modalId: 'projects-modal', indicatorId: 'projects-indicator' },
        { modalId: 'settings-modal', indicatorId: 'settings-indicator' },
        { modalId: 'text-modal', indicatorId: 'text-indicator', windowType: 'text-editor' },
        { modalId: 'terminal-modal', indicatorId: 'terminal-indicator', windowType: 'terminal' },
    ];

    indicatorMappings.forEach(mapping => {
        const indicator = document.getElementById(mapping.indicatorId);
        if (!indicator) return;

        let hasOpenWindow = false;

        // Check multi-window system first (for finder, terminal, text-editor)
        if (mapping.windowType && window.WindowRegistry) {
            const windows = window.WindowRegistry.getWindowsByType?.(mapping.windowType);
            hasOpenWindow = Array.isArray(windows) && windows.length > 0;
        }

        // Fallback: check legacy modal system
        if (!hasOpenWindow) {
            const modal = mapping.modalId ? document.getElementById(mapping.modalId) : null;
            if (modal) {
                const minimized = modal.dataset && modal.dataset.minimized === 'true';
                hasOpenWindow = !modal.classList.contains('hidden') || minimized;
            }
        }

        // Update indicator visibility
        if (hasOpenWindow) {
            if (domUtils && typeof domUtils.show === 'function') {
                domUtils.show(indicator);
            } else {
                indicator.classList.remove('hidden');
            }
        } else {
            if (domUtils && typeof domUtils.hide === 'function') {
                domUtils.hide(indicator);
            } else {
                indicator.classList.add('hidden');
            }
        }
    });
}

// Global export for legacy compatibility
if (typeof window !== 'undefined') {
    window.DockSystem = {
        getDockReservedBottom,
        initDockMagnification,
        initDockDragDrop,
        updateDockIndicators,
        getCurrentDockOrder,
        loadDockOrder,
        saveDockOrder,
        applyDockOrder,
    };

    if (typeof window.updateDockIndicators !== 'function') {
        window.updateDockIndicators = updateDockIndicators;
    }
}

export default {};
