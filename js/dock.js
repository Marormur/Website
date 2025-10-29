"use strict";
/*
 * src/ts/dock.ts
 * Typed port of js/dock.js
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDockReservedBottom = getDockReservedBottom;
exports.initDockMagnification = initDockMagnification;
exports.loadDockOrder = loadDockOrder;
exports.saveDockOrder = saveDockOrder;
exports.getDockItemId = getDockItemId;
exports.getCurrentDockOrder = getCurrentDockOrder;
exports.applyDockOrder = applyDockOrder;
exports.createPlaceholder = createPlaceholder;
exports.initDockDragDrop = initDockDragDrop;
exports.updateDockIndicators = updateDockIndicators;
/* eslint-disable @typescript-eslint/no-explicit-any */
// getDockReservedBottom
function getDockReservedBottom() {
    try {
        const dock = document.getElementById('dock');
        if (!dock || dock.classList.contains('hidden'))
            return 0;
        const rect = dock.getBoundingClientRect();
        const vh = Math.max(window.innerHeight || 0, 0);
        if (vh <= 0)
            return 0;
        return Math.round(Math.max(0, vh - rect.top));
    }
    catch {
        return 0;
    }
}
// Dock magnification
function initDockMagnification() {
    const dock = document.getElementById('dock');
    if (!dock)
        return;
    const icons = Array.from(dock.querySelectorAll('.dock-icon'));
    if (!icons.length)
        return;
    const items = icons.map(icon => {
        const parent = icon.parentElement;
        const tooltip = parent
            ? parent.querySelector('.dock-tooltip')
            : null;
        return {
            icon,
            tooltip,
            baseHeight: icon.offsetHeight || 0,
        };
    });
    let rafId = null;
    let pointerX = null;
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
            const dx = Math.abs(pointerX - centerX);
            const influence = Math.exp(-(dx * dx) / (2 * sigma * sigma));
            const scale = Math.max(minScale, Math.min(maxScale, minScale + (maxScale - minScale) * influence));
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
    const onMove = (e) => {
        pointerX = e.clientX;
        if (!rafId)
            rafId = requestAnimationFrame(apply);
    };
    const onLeave = () => {
        pointerX = null;
        if (!rafId)
            rafId = requestAnimationFrame(apply);
    };
    dock.addEventListener('mousemove', onMove);
    dock.addEventListener('mouseleave', onLeave);
}
// Dock drag & drop order persistence
const DOCK_ORDER_STORAGE_KEY = 'dock:order:v1';
function loadDockOrder() {
    try {
        const raw = localStorage.getItem(DOCK_ORDER_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return Array.isArray(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}
function saveDockOrder(order) {
    try {
        localStorage.setItem(DOCK_ORDER_STORAGE_KEY, JSON.stringify(order || []));
    }
    catch {
        // ignore
    }
}
function getDockItemId(item) {
    if (!item)
        return null;
    return item.getAttribute('data-window-id') || null;
}
function getCurrentDockOrder() {
    const tray = document.querySelector('#dock .dock-tray');
    if (!tray)
        return [];
    return Array.from(tray.querySelectorAll('.dock-item'))
        .map(it => getDockItemId(it))
        .filter(Boolean);
}
function applyDockOrder(order) {
    if (!Array.isArray(order) || !order.length)
        return;
    const tray = document.querySelector('#dock .dock-tray');
    if (!tray)
        return;
    const items = Array.from(tray.querySelectorAll('.dock-item'));
    const map = new Map(items.map(it => [getDockItemId(it), it]));
    const fragment = document.createDocumentFragment();
    order.forEach(id => {
        const el = map.get(id);
        if (el) {
            fragment.appendChild(el);
            map.delete(id);
        }
    });
    for (const [, el] of map)
        fragment.appendChild(el);
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
    if (!dock || !tray)
        return;
    const persisted = loadDockOrder();
    if (persisted && persisted.length)
        applyDockOrder(persisted);
    let draggedItem = null;
    let placeholder = null;
    let prevUserSelect = '';
    let suppressClicksUntil = 0;
    const updatePlaceholderSize = (ref) => {
        if (!placeholder || !ref)
            return;
        try {
            const r = ref.getBoundingClientRect();
            placeholder.style.width = r.width + 'px';
            placeholder.style.height = r.height + 'px';
        }
        catch {
            // ignore
        }
    };
    const placeRelativeTo = (targetItem, clientX) => {
        if (!tray || !targetItem)
            return;
        if (!placeholder)
            placeholder = createPlaceholder();
        updatePlaceholderSize(draggedItem || targetItem);
        const rect = targetItem.getBoundingClientRect();
        const insertBefore = clientX < rect.left + rect.width / 2;
        tray.insertBefore(placeholder, insertBefore ? targetItem : targetItem.nextSibling);
    };
    const handleTrayDragOver = (e) => {
        if (!draggedItem)
            return;
        e.preventDefault();
        if (e.dataTransfer)
            e.dataTransfer.dropEffect = 'move';
        const items = Array.from(tray.querySelectorAll('.dock-item')).filter(it => it !== draggedItem);
        if (!placeholder)
            placeholder = createPlaceholder();
        if (items.length === 0) {
            tray.appendChild(placeholder);
            return;
        }
        let target = null;
        for (const it of items) {
            const r = it.getBoundingClientRect();
            if (e.clientX < r.left + r.width / 2) {
                target = it;
                break;
            }
        }
        updatePlaceholderSize(draggedItem || items[0]);
        if (target)
            tray.insertBefore(placeholder, target);
        else
            tray.appendChild(placeholder);
    };
    const onDragStart = function (e) {
        const item = this.closest('.dock-item');
        if (!item)
            return;
        draggedItem = item;
        prevUserSelect = document.body.style.userSelect || '';
        document.body.style.userSelect = 'none';
        suppressClicksUntil = Date.now() + 250;
        try {
            const icon = item.querySelector('.dock-icon') || item;
            const r = icon.getBoundingClientRect();
            if (e.dataTransfer) {
                e.dataTransfer.setData('text/plain', getDockItemId(item) || '');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setDragImage(icon, r.width / 2, r.height / 2);
            }
        }
        catch {
            // ignore
        }
        const r = item.getBoundingClientRect();
        placeholder = createPlaceholder(r.width, r.height);
        tray.insertBefore(placeholder, item.nextSibling);
    };
    const onDragOver = (e) => {
        if (!draggedItem)
            return;
        e.preventDefault();
        if (e.dataTransfer)
            e.dataTransfer.dropEffect = 'move';
        const target = e.target.closest('.dock-item');
        if (!target || target === draggedItem) {
            handleTrayDragOver(e);
            return;
        }
        placeRelativeTo(target, e.clientX);
    };
    const finalizeDrop = () => {
        if (!draggedItem || !placeholder)
            return;
        tray.insertBefore(draggedItem, placeholder);
        placeholder.remove();
        placeholder = null;
        const order = getCurrentDockOrder();
        saveDockOrder(order);
    };
    const onDrop = (e) => {
        if (!draggedItem)
            return;
        e.preventDefault();
        const phDidNotMove = placeholder &&
            placeholder.isConnected &&
            (placeholder.previousSibling === draggedItem ||
                placeholder.nextSibling === draggedItem);
        if (!placeholder || !placeholder.isConnected || phDidNotMove) {
            const x = e.clientX;
            const items = Array.from(tray.querySelectorAll('.dock-item')).filter(it => it !== draggedItem);
            let inserted = false;
            for (const it of items) {
                const r = it.getBoundingClientRect();
                if (x < r.left + r.width / 2) {
                    tray.insertBefore(draggedItem, it);
                    inserted = true;
                    break;
                }
            }
            if (!inserted)
                tray.appendChild(draggedItem);
            const order = getCurrentDockOrder();
            saveDockOrder(order);
            cleanup();
            return;
        }
        finalizeDrop();
    };
    const cleanup = () => {
        if (placeholder && placeholder.isConnected)
            placeholder.remove();
        placeholder = null;
        draggedItem = null;
        document.body.style.userSelect = prevUserSelect;
    };
    const onDragEnd = () => {
        cleanup();
    };
    dock.addEventListener('click', ev => {
        if (Date.now() < suppressClicksUntil || draggedItem) {
            ev.stopPropagation();
            ev.preventDefault();
        }
    }, true);
    window.addEventListener('blur', cleanup);
    const enableDraggable = () => {
        tray.querySelectorAll('.dock-item').forEach(it => {
            it.setAttribute('draggable', 'true');
            it.addEventListener('dragstart', onDragStart);
        });
    };
    enableDraggable();
    tray.addEventListener('dragover', onDragOver);
    tray.addEventListener('drop', onDrop);
    tray.addEventListener('dragend', onDragEnd);
}
function updateDockIndicators() {
    const indicatorMappings = [
        { modalId: 'finder-modal', indicatorId: 'finder-indicator' },
        { modalId: 'projects-modal', indicatorId: 'projects-indicator' },
        { modalId: 'settings-modal', indicatorId: 'settings-indicator' },
        { modalId: 'text-modal', indicatorId: 'text-indicator' },
    ];
    indicatorMappings.forEach(mapping => {
        const modal = document.getElementById(mapping.modalId);
        const indicator = document.getElementById(mapping.indicatorId);
        if (modal && indicator) {
            const minimized = modal.dataset && modal.dataset.minimized === 'true';
            const domUtils = window.DOMUtils;
            if (!modal.classList.contains('hidden') || minimized) {
                if (domUtils && typeof domUtils.show === 'function') {
                    domUtils.show(indicator);
                }
                else {
                    indicator.classList.remove('hidden');
                }
            }
            else {
                if (domUtils && typeof domUtils.hide === 'function') {
                    domUtils.hide(indicator);
                }
                else {
                    indicator.classList.add('hidden');
                }
            }
        }
    });
}
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
exports.default = {};
//# sourceMappingURL=dock.js.map