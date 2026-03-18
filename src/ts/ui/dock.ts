/*
 * src/ts/dock.ts
 * Typed port of js/dock.js with persisted macOS-like dock preferences.
 */

import { getJSON, setJSON } from '../services/storage-utils.js';
import { renderProgramIcon } from '../windows/window-icons.js';
import { getLogicalViewportHeight, getLogicalViewportWidth } from '../utils/viewport.js';

type DockPosition = 'bottom' | 'left' | 'right';
type DockMinimizeEffect = 'genie' | 'scale';
type DockTitlebarDoubleClickAction = 'zoom' | 'minimize';

export interface DockPreferences {
    size: number;
    magnification: number;
    position: DockPosition;
    minimizeEffect: DockMinimizeEffect;
    titlebarDoubleClickAction: DockTitlebarDoubleClickAction;
    minimizeWindowsIntoAppIcon: boolean;
    autoHide: boolean;
    animateOpeningApps: boolean;
    showOpenIndicators: boolean;
    showRecentApps: boolean;
}

const DOCK_WINDOW_ICONS: Record<string, string> = {
    'launchpad-modal': 'launchpad',
    'text-modal': 'textEditor',
    'terminal-modal': 'terminal',
    'settings-modal': 'settings',
};

const DOCK_ORDER_STORAGE_KEY = 'dock:order:v1';
const DOCK_PREFERENCES_STORAGE_KEY = 'dock:preferences:v1';

const DEFAULT_DOCK_PREFERENCES: DockPreferences = {
    size: 56,
    magnification: 52,
    position: 'bottom',
    minimizeEffect: 'genie',
    titlebarDoubleClickAction: 'zoom',
    minimizeWindowsIntoAppIcon: false,
    autoHide: false,
    animateOpeningApps: true,
    showOpenIndicators: true,
    showRecentApps: true,
};

let dockPointer: { x: number; y: number } | null = null;
let dockMagnificationRafId: number | null = null;
let autoHideHoveringDock = false;
let autoHideHideTimer: number | null = null;
let dockInteractionsBound = false;

function positionDock(preferences: DockPreferences): void {
    const dock = getDockElement();
    if (!dock) return;

    // Keep dock coordinates in the same logical CSS-px space as fixed window left/top.
    const viewportWidth = Math.max(1, getLogicalViewportWidth());
    const viewportHeight = Math.max(1, getLogicalViewportHeight());
    const dockRect = dock.getBoundingClientRect();
    const dockWidth = Math.max(1, dockRect.width || dock.offsetWidth || dock.scrollWidth || 0);
    const dockHeight = Math.max(1, dockRect.height || dock.offsetHeight || dock.scrollHeight || 0);
    const edgeInset = 10;

    dock.style.left = 'auto';
    dock.style.right = 'auto';
    dock.style.top = 'auto';
    dock.style.bottom = 'auto';

    if (preferences.position === 'left') {
        dock.style.left = `${edgeInset}px`;
        dock.style.top = `${Math.max(edgeInset, (viewportHeight - dockHeight) / 2)}px`;
        return;
    }

    if (preferences.position === 'right') {
        dock.style.left = `${Math.max(edgeInset, viewportWidth - dockWidth - edgeInset)}px`;
        dock.style.top = `${Math.max(edgeInset, (viewportHeight - dockHeight) / 2)}px`;
        return;
    }

    dock.style.left = `${Math.max(edgeInset, (viewportWidth - dockWidth) / 2)}px`;
    dock.style.bottom = `${edgeInset}px`;
}

function clampPercentage(value: unknown, fallback: number): number {
    const parsed = Number.parseFloat(String(value ?? ''));
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(100, Math.round(parsed)));
}

function getDockElement(): HTMLElement | null {
    return document.getElementById('dock');
}

function getDockTray(): HTMLElement | null {
    return document.querySelector('#dock .dock-tray');
}

function normalizeDockPreferences(
    raw: Partial<DockPreferences> | null | undefined
): DockPreferences {
    const position = raw?.position;
    const minimizeEffect = raw?.minimizeEffect;
    const titlebarDoubleClickAction = raw?.titlebarDoubleClickAction;

    return {
        size: clampPercentage(raw?.size, DEFAULT_DOCK_PREFERENCES.size),
        magnification: clampPercentage(raw?.magnification, DEFAULT_DOCK_PREFERENCES.magnification),
        position:
            position === 'left' || position === 'right' || position === 'bottom'
                ? position
                : DEFAULT_DOCK_PREFERENCES.position,
        minimizeEffect:
            minimizeEffect === 'scale' || minimizeEffect === 'genie'
                ? minimizeEffect
                : DEFAULT_DOCK_PREFERENCES.minimizeEffect,
        titlebarDoubleClickAction:
            titlebarDoubleClickAction === 'minimize' || titlebarDoubleClickAction === 'zoom'
                ? titlebarDoubleClickAction
                : DEFAULT_DOCK_PREFERENCES.titlebarDoubleClickAction,
        minimizeWindowsIntoAppIcon:
            raw?.minimizeWindowsIntoAppIcon ?? DEFAULT_DOCK_PREFERENCES.minimizeWindowsIntoAppIcon,
        autoHide: raw?.autoHide ?? DEFAULT_DOCK_PREFERENCES.autoHide,
        animateOpeningApps: raw?.animateOpeningApps ?? DEFAULT_DOCK_PREFERENCES.animateOpeningApps,
        showOpenIndicators: raw?.showOpenIndicators ?? DEFAULT_DOCK_PREFERENCES.showOpenIndicators,
        showRecentApps: raw?.showRecentApps ?? DEFAULT_DOCK_PREFERENCES.showRecentApps,
    };
}

function emitDockPreferenceChange(preferences: DockPreferences): void {
    window.dispatchEvent(
        new CustomEvent('dockPreferenceChange', {
            detail: { preferences },
        })
    );
}

function getDockSizePx(size: number): number {
    return Math.round(48 + (clampPercentage(size, DEFAULT_DOCK_PREFERENCES.size) / 100) * 32);
}

function getDockMagnificationScale(magnification: number): number {
    const normalized = clampPercentage(magnification, DEFAULT_DOCK_PREFERENCES.magnification);
    return normalized <= 0 ? 1 : 1 + (normalized / 100) * 0.95;
}

function renderDockProgramIcons(): void {
    const dock = getDockElement();
    if (!dock) return;

    dock.querySelectorAll<HTMLElement>('.dock-item').forEach(item => {
        const currentIcon = item.querySelector<HTMLElement>('.dock-icon');
        if (!currentIcon) return;

        const iconValue = item.dataset.windowId
            ? DOCK_WINDOW_ICONS[item.dataset.windowId] || 'default'
            : 'finder';

        if (currentIcon.tagName !== 'SPAN') {
            const replacement = document.createElement('span');
            replacement.className = 'dock-icon';
            renderProgramIcon(replacement, iconValue);
            currentIcon.replaceWith(replacement);
            return;
        }

        renderProgramIcon(currentIcon, iconValue);
    });
}

export function getDockPreferences(): DockPreferences {
    try {
        return normalizeDockPreferences(
            getJSON<Partial<DockPreferences> | null>(DOCK_PREFERENCES_STORAGE_KEY, null)
        );
    } catch {
        return { ...DEFAULT_DOCK_PREFERENCES };
    }
}

export function setDockPreferences(preferences: DockPreferences): DockPreferences {
    const normalized = normalizeDockPreferences(preferences);
    setJSON(DOCK_PREFERENCES_STORAGE_KEY, normalized);
    applyDockPreferences(normalized);
    emitDockPreferenceChange(normalized);
    return normalized;
}

export function updateDockPreferences(partial: Partial<DockPreferences>): DockPreferences {
    return setDockPreferences({
        ...getDockPreferences(),
        ...partial,
    });
}

export function getTitlebarDoubleClickAction(): DockTitlebarDoubleClickAction {
    return getDockPreferences().titlebarDoubleClickAction;
}

export function shouldAnimateOpeningApps(): boolean {
    return getDockPreferences().animateOpeningApps;
}

export function shouldShowOpenIndicators(): boolean {
    return getDockPreferences().showOpenIndicators;
}

function clearDockMagnificationState(): void {
    const dock = getDockElement();
    if (!dock) return;

    dock.querySelectorAll<HTMLElement>('.dock-icon').forEach(icon => {
        icon.style.transform = '';
        icon.style.zIndex = '';
    });

    dock.querySelectorAll<HTMLElement>('.dock-tooltip').forEach(tooltip => {
        tooltip.style.transform = '';
        tooltip.style.zIndex = '';
    });
}

function setDockVisibility(visible: boolean): void {
    const dock = getDockElement();
    if (!dock) return;

    const preferences = getDockPreferences();
    if (!preferences.autoHide) {
        dock.classList.remove('dock-auto-hide-hidden');
        return;
    }

    dock.classList.toggle('dock-auto-hide-hidden', !visible);
}

function revealDock(): void {
    if (autoHideHideTimer !== null) {
        window.clearTimeout(autoHideHideTimer);
        autoHideHideTimer = null;
    }
    setDockVisibility(true);
}

function scheduleDockHide(delay = 260): void {
    if (autoHideHideTimer !== null) {
        window.clearTimeout(autoHideHideTimer);
    }

    autoHideHideTimer = window.setTimeout(() => {
        autoHideHideTimer = null;
        if (!autoHideHoveringDock) {
            setDockVisibility(false);
        }
    }, delay);
}

function shouldRevealDockForPointer(
    position: DockPosition,
    point: { x: number; y: number }
): boolean {
    switch (position) {
        case 'left':
            return point.x <= 28;
        case 'right':
            return point.x >= window.innerWidth - 28;
        case 'bottom':
        default:
            return point.y >= window.innerHeight - 28;
    }
}

function bindDockInteractions(): void {
    const dock = getDockElement();
    if (!dock || dockInteractionsBound) return;

    dockInteractionsBound = true;

    dock.addEventListener('mouseenter', () => {
        autoHideHoveringDock = true;
        revealDock();
    });

    dock.addEventListener('mouseleave', () => {
        autoHideHoveringDock = false;
        if (getDockPreferences().autoHide) scheduleDockHide();
    });

    document.addEventListener('mousemove', event => {
        const preferences = getDockPreferences();
        if (!preferences.autoHide) return;

        const pointer = { x: event.clientX, y: event.clientY };
        if (shouldRevealDockForPointer(preferences.position, pointer)) {
            revealDock();
            return;
        }

        if (!autoHideHoveringDock) {
            scheduleDockHide(120);
        }
    });

    window.addEventListener('blur', () => {
        autoHideHoveringDock = false;
        if (getDockPreferences().autoHide) scheduleDockHide(0);
    });

    window.addEventListener('resize', () => {
        applyDockPreferences(getDockPreferences());
    });

    window.addEventListener('displayScalePreferenceChange', () => {
        applyDockPreferences(getDockPreferences());
    });

    dock.addEventListener(
        'click',
        event => {
            const dockItem = (event.target as Element | null)?.closest(
                '.dock-item'
            ) as HTMLElement | null;
            if (!dockItem || !shouldAnimateOpeningApps()) return;

            const icon = dockItem.querySelector<HTMLElement>('.dock-icon');
            if (!icon) return;

            icon.classList.remove('dock-icon--launching');
            void icon.offsetWidth;
            icon.classList.add('dock-icon--launching');

            window.setTimeout(() => {
                icon.classList.remove('dock-icon--launching');
            }, 700);
        },
        true
    );
}

export function applyDockPreferences(preferences?: unknown): void {
    const dock = getDockElement();
    if (!dock) return;

    bindDockInteractions();

    const resolvedPreferences =
        preferences === undefined
            ? getDockPreferences()
            : normalizeDockPreferences(preferences as Partial<DockPreferences>);

    const sizePx = getDockSizePx(resolvedPreferences.size);
    const tooltipOffsetPx = Math.max(10, Math.round(sizePx * 0.18));

    dock.classList.remove('bottom-4', 'left-1/2', '-translate-x-1/2');

    dock.dataset.dockPosition = resolvedPreferences.position;
    dock.style.setProperty('--dock-icon-size', `${sizePx}px`);
    dock.style.setProperty('--dock-icon-emoji-size', `${Math.round(sizePx * 0.88)}px`);
    dock.style.setProperty('--dock-item-gap', `${Math.round(sizePx * 0.085)}px`);
    dock.style.setProperty('--dock-tray-padding-inline', `${Math.round(sizePx * 0.18)}px`);
    dock.style.setProperty('--dock-tray-padding-block', `${Math.round(sizePx * 0.12)}px`);
    dock.style.setProperty('--dock-tray-radius', `${Math.round(sizePx * 0.28)}px`);
    dock.style.setProperty('--dock-tooltip-offset', `${tooltipOffsetPx}px`);

    dock.style.removeProperty('left');
    dock.style.removeProperty('right');
    dock.style.removeProperty('top');
    dock.style.removeProperty('bottom');
    dock.style.setProperty('--dock-base-transform', 'translate3d(0, 0, 0)');
    positionDock(resolvedPreferences);

    dock.classList.toggle('dock-auto-hide-enabled', resolvedPreferences.autoHide);

    if (resolvedPreferences.autoHide) {
        if (autoHideHoveringDock) {
            revealDock();
        } else {
            scheduleDockHide(0);
        }
    } else {
        setDockVisibility(true);
    }

    updateDockIndicators();
    clearDockMagnificationState();
}

function resolveDockPointer(event: MouseEvent): { x: number; y: number } {
    return { x: event.clientX, y: event.clientY };
}

function applyDockMagnificationFrame(): void {
    dockMagnificationRafId = null;

    const dock = getDockElement();
    const preferences = getDockPreferences();
    if (!dock) return;

    const maxScale = getDockMagnificationScale(preferences.magnification);
    if (!dockPointer || maxScale <= 1.001) {
        clearDockMagnificationState();
        return;
    }
    const pointer = dockPointer;

    const baseAxisLift = Math.max(10, getDockSizePx(preferences.size) * 0.24);
    const sigma = 64 + preferences.magnification * 0.55;

    dock.querySelectorAll<HTMLElement>('.dock-item').forEach(item => {
        const icon = item.querySelector<HTMLElement>('.dock-icon');
        const tooltip = item.querySelector<HTMLElement>('.dock-tooltip');
        if (!icon) return;

        // Measure the stable layout center from dock-item (not from transformed dock-icon).
        // This keeps magnification aligned with the cursor even while icon transforms animate.
        const itemRect = item.getBoundingClientRect();
        const centerX = itemRect.left + itemRect.width / 2;
        const centerY = itemRect.top + itemRect.height / 2;
        const distance = Math.hypot(pointer.x - centerX, pointer.y - centerY);
        const influence = Math.exp(-(distance * distance) / (2 * sigma * sigma));
        const scale = 1 + (maxScale - 1) * influence;
        const primaryLift = Math.max(0, (scale - 1) * baseAxisLift);

        let transform = `scale(${scale.toFixed(3)})`;
        if (preferences.position === 'left') {
            transform = `translateX(${primaryLift.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        } else if (preferences.position === 'right') {
            transform = `translateX(-${primaryLift.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        } else {
            transform = `translateY(-${primaryLift.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        }

        icon.style.transform = transform;
        icon.style.zIndex = scale > 1.01 ? '300' : '';

        if (!tooltip) return;

        const tooltipGap = 12;
        if (preferences.position === 'left') {
            tooltip.style.transform = `translateX(${(primaryLift + tooltipGap).toFixed(1)}px)`;
        } else if (preferences.position === 'right') {
            tooltip.style.transform = `translateX(-${(primaryLift + tooltipGap).toFixed(1)}px)`;
        } else {
            tooltip.style.transform = `translateY(-${(primaryLift + tooltipGap).toFixed(1)}px)`;
        }
        tooltip.style.zIndex = '400';
    });
}

export function getDockReservedBottom(): number {
    try {
        const dock = getDockElement();
        const preferences = getDockPreferences();
        if (!dock || dock.classList.contains('hidden')) return 0;
        if (preferences.position !== 'bottom') return 0;
        if (preferences.autoHide && dock.classList.contains('dock-auto-hide-hidden')) return 0;
        const viewportHeight = Math.max(getLogicalViewportHeight(), 0);
        if (viewportHeight <= 0) return 0;

        // Prefer computed top: fixed positioning and snap math both run in this logical CSS px space.
        const computedTop = parseFloat(window.getComputedStyle(dock).top || '');
        if (Number.isFinite(computedTop)) {
            return Math.round(Math.max(0, viewportHeight - computedTop));
        }

        // Fallback for unusual layouts.
        const rect = dock.getBoundingClientRect();
        return Math.round(Math.max(0, viewportHeight - rect.top));
    } catch {
        return 0;
    }
}

export function initDockMagnification(): void {
    renderDockProgramIcons();
    applyDockPreferences();

    const dock = getDockElement();
    if (!dock || dock.dataset.dockMagnificationBound === '1') return;
    dock.dataset.dockMagnificationBound = '1';

    const onMove = (event: MouseEvent) => {
        dockPointer = resolveDockPointer(event);
        if (dockMagnificationRafId === null) {
            dockMagnificationRafId = requestAnimationFrame(applyDockMagnificationFrame);
        }
    };

    const onLeave = () => {
        dockPointer = null;
        if (dockMagnificationRafId === null) {
            dockMagnificationRafId = requestAnimationFrame(applyDockMagnificationFrame);
        }
    };

    dock.addEventListener('mousemove', onMove);
    dock.addEventListener('mouseleave', onLeave);
}

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
    const tray = getDockTray();
    if (!tray) return [];
    return Array.from(tray.querySelectorAll('.dock-item'))
        .map(it => getDockItemId(it))
        .filter(Boolean) as string[];
}

export function applyDockOrder(order: string[] | null | undefined): void {
    if (!Array.isArray(order) || !order.length) return;
    const tray = getDockTray();
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
    const dock = getDockElement();
    const tray = getDockTray();
    if (!dock || !tray) return;

    const persisted = loadDockOrder();
    if (persisted && persisted.length) applyDockOrder(persisted);

    let draggedItem: HTMLElement | null = null;
    let placeholder: HTMLElement | null = null;
    let prevUserSelect = '';
    let suppressClicksUntil = 0;

    const isVerticalDock = () => getDockPreferences().position !== 'bottom';

    const updatePlaceholderSize = (ref: HTMLElement | null) => {
        if (!placeholder || !ref) return;
        try {
            const rect = ref.getBoundingClientRect();
            placeholder.style.width = rect.width + 'px';
            placeholder.style.height = rect.height + 'px';
        } catch {
            // ignore
        }
    };

    const placeRelativeTo = (targetItem: HTMLElement, clientX: number, clientY: number) => {
        if (!tray || !targetItem) return;
        if (!placeholder) placeholder = createPlaceholder();
        updatePlaceholderSize(draggedItem || targetItem);
        const rect = targetItem.getBoundingClientRect();
        const insertBefore = isVerticalDock()
            ? clientY < rect.top + rect.height / 2
            : clientX < rect.left + rect.width / 2;
        tray.insertBefore(placeholder, insertBefore ? targetItem : targetItem.nextSibling);
    };

    const handleTrayDragOver = (event: DragEvent) => {
        if (!draggedItem) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        const items = Array.from(tray.querySelectorAll<HTMLElement>('.dock-item')).filter(
            item => item !== draggedItem
        );
        if (!placeholder) placeholder = createPlaceholder();
        if (items.length === 0) {
            tray.appendChild(placeholder);
            return;
        }
        let target: HTMLElement | null = null;
        for (const item of items) {
            const rect = item.getBoundingClientRect();
            const midpoint = isVerticalDock()
                ? rect.top + rect.height / 2
                : rect.left + rect.width / 2;
            const pointer = isVerticalDock() ? event.clientY : event.clientX;
            if (pointer < midpoint) {
                target = item;
                break;
            }
        }
        updatePlaceholderSize(draggedItem || items[0]);
        if (target) tray.insertBefore(placeholder, target);
        else tray.appendChild(placeholder);
    };

    const onDragStart = function (this: HTMLElement, event: DragEvent) {
        const item = (this as HTMLElement).closest('.dock-item') as HTMLElement | null;
        if (!item) return;
        draggedItem = item;
        prevUserSelect = document.body.style.userSelect || '';
        document.body.style.userSelect = 'none';
        suppressClicksUntil = Date.now() + 250;
        try {
            const icon = (item.querySelector('.dock-icon') as HTMLElement) || item;
            const rect = icon.getBoundingClientRect();
            if (event.dataTransfer) {
                event.dataTransfer.setData('text/plain', getDockItemId(item) || '');
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setDragImage(icon as Element, rect.width / 2, rect.height / 2);
            }
        } catch {
            // ignore
        }
        const rect = item.getBoundingClientRect();
        placeholder = createPlaceholder(rect.width, rect.height);
        tray.insertBefore(placeholder, item.nextSibling);
    };

    const onDragOver = (event: DragEvent) => {
        if (!draggedItem) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        const target = (event.target as Element).closest('.dock-item') as HTMLElement | null;
        if (!target || target === draggedItem) {
            handleTrayDragOver(event);
            return;
        }
        placeRelativeTo(target, event.clientX, event.clientY);
    };

    const finalizeDrop = () => {
        if (!draggedItem || !placeholder) return;
        tray.insertBefore(draggedItem, placeholder);
        placeholder.remove();
        placeholder = null;
        saveDockOrder(getCurrentDockOrder());
    };

    const onDrop = (event: DragEvent) => {
        if (!draggedItem) return;
        event.preventDefault();
        const phDidNotMove =
            placeholder &&
            placeholder.isConnected &&
            (placeholder.previousSibling === draggedItem ||
                placeholder.nextSibling === draggedItem);
        if (!placeholder || !placeholder.isConnected || phDidNotMove) {
            const items = Array.from(tray.querySelectorAll<HTMLElement>('.dock-item')).filter(
                item => item !== draggedItem
            );
            const pointer = isVerticalDock() ? event.clientY : event.clientX;
            let inserted = false;
            for (const item of items) {
                const rect = item.getBoundingClientRect();
                const midpoint = isVerticalDock()
                    ? rect.top + rect.height / 2
                    : rect.left + rect.width / 2;
                if (pointer < midpoint) {
                    tray.insertBefore(draggedItem, item);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) tray.appendChild(draggedItem);
            saveDockOrder(getCurrentDockOrder());
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

    dock.addEventListener(
        'click',
        event => {
            if (Date.now() < suppressClicksUntil || draggedItem) {
                event.stopPropagation();
                event.preventDefault();
            }
        },
        true
    );

    window.addEventListener('blur', cleanup);

    tray.querySelectorAll<HTMLElement>('.dock-item').forEach(item => {
        item.setAttribute('draggable', 'true');
        item.addEventListener('dragstart', onDragStart);
    });

    tray.addEventListener('dragover', onDragOver as EventListener);
    tray.addEventListener('drop', onDrop as EventListener);
    tray.addEventListener('dragend', cleanup as EventListener);
}

function resolveDockTargetItem(windowId: string): HTMLElement | null {
    const dock = getDockElement();
    if (!dock) return null;

    const direct = dock.querySelector<HTMLElement>(`.dock-item[data-window-id="${windowId}"]`);
    if (direct) return direct;

    const lowerWindowId = windowId.toLowerCase();
    const mappedWindowId = lowerWindowId.includes('terminal')
        ? 'terminal-modal'
        : lowerWindowId.includes('text')
          ? 'text-modal'
          : lowerWindowId.includes('setting')
            ? 'settings-modal'
            : lowerWindowId.includes('launchpad')
              ? 'launchpad-modal'
              : lowerWindowId.includes('finder')
                ? 'finder'
                : null;

    if (mappedWindowId === 'finder') {
        return dock.querySelector<HTMLElement>('.dock-item:not([data-window-id])');
    }

    return mappedWindowId
        ? dock.querySelector<HTMLElement>(`.dock-item[data-window-id="${mappedWindowId}"]`)
        : null;
}

export function animateWindowMinimize(
    windowElement: HTMLElement,
    windowId: string,
    onComplete?: () => void
): boolean {
    const preferences = getDockPreferences();
    if (!preferences.minimizeWindowsIntoAppIcon) return false;

    const targetItem = resolveDockTargetItem(windowId);
    const targetIcon = targetItem?.querySelector<HTMLElement>('.dock-icon');
    if (!targetItem || !targetIcon) return false;

    const sourceRect = windowElement.getBoundingClientRect();
    const targetRect = targetIcon.getBoundingClientRect();
    if (sourceRect.width <= 0 || sourceRect.height <= 0) return false;

    const clone = windowElement.cloneNode(true) as HTMLElement;
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    clone.style.position = 'fixed';
    clone.style.left = `${sourceRect.left}px`;
    clone.style.top = `${sourceRect.top}px`;
    clone.style.width = `${sourceRect.width}px`;
    clone.style.height = `${sourceRect.height}px`;
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '2147483601';
    clone.style.transformOrigin = 'top left';
    clone.style.overflow = 'hidden';
    clone.style.willChange = 'transform, opacity, filter';

    document.body.appendChild(clone);
    windowElement.style.visibility = 'hidden';

    const deltaX = targetRect.left - sourceRect.left;
    const deltaY = targetRect.top - sourceRect.top;
    const scaleX = Math.max(0.14, targetRect.width / sourceRect.width);
    const scaleY = Math.max(0.1, targetRect.height / sourceRect.height);

    const keyframes: Keyframe[] =
        preferences.minimizeEffect === 'genie'
            ? [
                  {
                      transform: 'translate3d(0, 0, 0) scale(1, 1)',
                      opacity: 1,
                      filter: 'blur(0px)',
                  },
                  {
                      transform: `translate3d(${(deltaX * 0.42).toFixed(1)}px, ${(deltaY * 0.78).toFixed(1)}px, 0) scale(${Math.max(scaleX * 1.35, 0.22).toFixed(3)}, ${Math.max(scaleY * 0.45, 0.16).toFixed(3)})`,
                      opacity: 0.76,
                      filter: 'blur(1.5px)',
                  },
                  {
                      transform: `translate3d(${deltaX.toFixed(1)}px, ${deltaY.toFixed(1)}px, 0) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`,
                      opacity: 0.08,
                      filter: 'blur(4px)',
                  },
              ]
            : [
                  {
                      transform: 'translate3d(0, 0, 0) scale(1)',
                      opacity: 1,
                      filter: 'blur(0px)',
                  },
                  {
                      transform: `translate3d(${deltaX.toFixed(1)}px, ${deltaY.toFixed(1)}px, 0) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`,
                      opacity: 0.08,
                      filter: 'blur(3px)',
                  },
              ];

    const animation = clone.animate(keyframes, {
        duration: preferences.minimizeEffect === 'genie' ? 320 : 220,
        easing:
            preferences.minimizeEffect === 'genie'
                ? 'cubic-bezier(0.18, 0.88, 0.18, 1)'
                : 'cubic-bezier(0.24, 0.84, 0.2, 1)',
        fill: 'forwards',
    });

    const finalize = () => {
        clone.remove();
        windowElement.style.visibility = '';
        onComplete?.();
    };

    animation.addEventListener('finish', finalize, { once: true });
    animation.addEventListener(
        'cancel',
        () => {
            clone.remove();
            windowElement.style.visibility = '';
        },
        { once: true }
    );

    return true;
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

    const showIndicators = shouldShowOpenIndicators();

    indicatorMappings.forEach(mapping => {
        const indicator = document.getElementById(mapping.indicatorId);
        if (!indicator) return;

        if (!showIndicators) {
            indicator.classList.add('hidden');
            return;
        }

        let hasOpenWindow = false;

        if (mapping.windowType && window.WindowRegistry) {
            const windows = window.WindowRegistry.getWindowsByType?.(mapping.windowType);
            hasOpenWindow = Array.isArray(windows) && windows.length > 0;
        }

        if (!hasOpenWindow) {
            const modal = mapping.modalId ? document.getElementById(mapping.modalId) : null;
            if (modal) {
                const minimized = modal.dataset && modal.dataset.minimized === 'true';
                hasOpenWindow = !modal.classList.contains('hidden') || minimized;
            }
        }

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
        getDockPreferences,
        setDockPreferences,
        updateDockPreferences,
        applyDockPreferences,
        getTitlebarDoubleClickAction,
        animateWindowMinimize,
    };

    if (typeof window.updateDockIndicators !== 'function') {
        window.updateDockIndicators = updateDockIndicators;
    }

    window.addEventListener('iconThemeChange', () => {
        renderDockProgramIcons();
    });
}

export default {};
