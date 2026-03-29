/**
 * src/ts/apps/finder/finder-menus.ts
 * Finder-spezifische Menü-Definitionen
 *
 * Diese Datei wird von FinderWindow importiert und registriert sich selbst
 * via window.MenuRegistry.register('finder', getFinderMenus)
 */

import { translate } from '../../services/i18n';
import logger from '../../core/logger.js';
import { MenuSection } from '../../services/menu-registry';

export type MenuContext = {
    modalId?: string;
    dialog?: {
        close?: () => void;
        minimize?: () => void;
        toggleMaximize?: () => void;
        center?: () => void;
    } | null;
} | null;

function getFinderStateSnapshot(): { githubRepos?: unknown[] } | null {
    const registry = window['WindowRegistry'];
    if (!registry) return null;

    const finderWindow = registry.getActiveWindow?.() as unknown as {
        getState?: () => { githubRepos?: unknown[] };
    };
    return finderWindow?.getState?.() ?? null;
}

function getFinderMenus(): MenuSection[] {
    const context: MenuContext = null;

    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'finder-new-window',
                    label: () => translate('menu.finder.newWindow'),
                    shortcut: '⌘N',
                    icon: 'new',
                    action: () => {
                        const registry = window['WindowRegistry'];
                        if (registry?.getWindowCount && window['FinderWindow']?.create) {
                            const count = registry.getWindowCount('finder') || 0;
                            window['FinderWindow'].create({
                                title: `Finder ${count + 1}`,
                            });
                        }
                    },
                },
                {
                    id: 'finder-reload',
                    label: () => translate('menu.finder.reload'),
                    shortcut: '⌘R',
                    icon: 'reload',
                    action: () => {
                        const actionBus = window['ActionBus'];
                        if (actionBus?.execute) {
                            actionBus.execute('finder:reload');
                        }
                    },
                },
                { type: 'separator' },
                {
                    id: 'session-export',
                    label: () => translate('menu.session.export'),
                    icon: 'save',
                    action: () => {
                        const actionBus = window['ActionBus'];
                        if (actionBus?.execute) {
                            actionBus.execute('session:export');
                        }
                    },
                },
                {
                    id: 'session-import',
                    label: () => translate('menu.session.import'),
                    icon: 'open',
                    action: () => {
                        const actionBus = window['ActionBus'];
                        if (actionBus?.execute) {
                            actionBus.execute('session:import');
                        }
                    },
                },
                { type: 'separator' },
                {
                    id: 'finder-close',
                    label: () => translate('menu.finder.close'),
                    shortcut: '⌘W',
                    disabled: () => {
                        const registry = window['WindowRegistry'];
                        if (registry) {
                            const finderWindows = registry.getAllWindows?.('finder') || [];
                            if (finderWindows.length > 0) return false;
                        }
                        return true;
                    },
                    icon: 'close',
                    action: () => {
                        const registry = window['WindowRegistry'];
                        if (registry) {
                            const activeWindow = registry.getActiveWindow?.();
                            if (activeWindow?.type === 'finder') {
                                activeWindow.close?.();
                            }
                        }
                    },
                },
            ],
        },
        createFinderWindowMenuSection(context),
        createHelpMenuSection(context),
    ];
}

function createFinderWindowMenuSection(context: MenuContext): MenuSection {
    return {
        id: 'window',
        label: () => translate('menu.sections.window'),
        items: getFinderWindowMenuItems(context),
    };
}

function getFinderWindowMenuItems(context: MenuContext) {
    const registry = window['WindowRegistry'];
    const activeWindow = registry?.getActiveWindow?.() as unknown as {
        type?: string;
        close?: () => void;
        minimize?: () => void;
        toggleMaximize?: () => void;
        center?: () => void;
    };

    const windowController = activeWindow && activeWindow.type === 'finder' ? activeWindow : null;
    const canClose = typeof windowController?.close === 'function';
    const canMinimize = typeof windowController?.minimize === 'function';
    const canZoom = typeof windowController?.toggleMaximize === 'function';
    const canCenter = typeof windowController?.center === 'function';

    const tabState = getWindowTabNavigationState(windowController);
    const hasLayoutTarget = !!getActiveFinderWindow()?.element;

    const items: Record<string, unknown>[] = [
        {
            id: 'window-put-in-dock',
            label: () => translate('menu.window.putInDock'),
            shortcut: '⌘M',
            disabled: !canMinimize,
            icon: 'windowMinimize',
            action: () => {
                windowController?.minimize?.();
            },
        },
        {
            id: 'window-zoom-alt',
            label: () => translate('menu.window.zoomAlt'),
            disabled: !canZoom,
            icon: 'windowZoom',
            action: () => {
                windowController?.toggleMaximize?.();
            },
        },
        {
            id: 'window-zoom',
            label: () => translate('menu.window.zoom'),
            shortcut: '⌃⌘F',
            disabled: !canZoom,
            icon: 'windowZoom',
            action: () => {
                windowController?.toggleMaximize?.();
            },
        },
        {
            id: 'window-center',
            label: () => translate('menu.window.center'),
            disabled: !canCenter,
            icon: 'window',
            action: () => {
                windowController?.center?.();
            },
        },
        { type: 'separator' },
        {
            id: 'window-move-resize',
            label: () => translate('menu.window.moveAndResize'),
            disabled: !hasLayoutTarget,
            submenu: true,
            submenuItems: [
                {
                    id: 'window-move-left-half',
                    label: () => translate('menu.window.moveLeftHalf'),
                    action: () => {
                        const win = getActiveFinderWindow();
                        if (win) applyMoveResizePreset(win, 'leftHalf');
                    },
                },
                {
                    id: 'window-move-right-half',
                    label: () => translate('menu.window.moveRightHalf'),
                    action: () => {
                        const win = getActiveFinderWindow();
                        if (win) applyMoveResizePreset(win, 'rightHalf');
                    },
                },
                {
                    id: 'window-move-top-half',
                    label: () => translate('menu.window.moveTopHalf'),
                    action: () => {
                        const win = getActiveFinderWindow();
                        if (win) applyMoveResizePreset(win, 'topHalf');
                    },
                },
                {
                    id: 'window-move-bottom-half',
                    label: () => translate('menu.window.moveBottomHalf'),
                    action: () => {
                        const win = getActiveFinderWindow();
                        if (win) applyMoveResizePreset(win, 'bottomHalf');
                    },
                },
                { type: 'separator' },
                {
                    id: 'window-move-standard',
                    label: () => translate('menu.window.restoreStandardSize'),
                    action: () => {
                        const win = getActiveFinderWindow();
                        if (win) applyMoveResizePreset(win, 'standard');
                    },
                },
            ],
        },
        {
            id: 'window-tile',
            label: () => translate('menu.window.tile'),
            disabled: !hasLayoutTarget,
            submenu: true,
            submenuItems: [
                {
                    id: 'window-tile-left',
                    label: () => translate('menu.window.tileLeft'),
                    action: () => {
                        const win = getActiveFinderWindow();
                        if (win) applyTilePreset(win, 'left');
                    },
                },
                {
                    id: 'window-tile-right',
                    label: () => translate('menu.window.tileRight'),
                    action: () => {
                        const win = getActiveFinderWindow();
                        if (win) applyTilePreset(win, 'right');
                    },
                },
            ],
        },
        {
            id: 'window-remove-from-set',
            label: () => translate('menu.window.removeFromSet'),
            disabled: true,
        },
        {
            id: 'window-next-window',
            label: () => translate('menu.window.nextWindow'),
            shortcut: '⌘<',
            disabled: (registry?.getAllWindows?.('finder')?.length || 0) <= 1,
            action: () => {
                focusNextWindow('finder');
            },
        },
        {
            id: 'window-show-progress',
            label: () => translate('menu.window.showProgress'),
            disabled: true,
        },
        { type: 'separator' },
        {
            id: 'window-all-front',
            label: () => translate('menu.window.bringToFront'),
            disabled: !hasAnyVisibleDialog(),
            icon: 'windowFront',
            action: () => {
                if (window['bringAllWindowsToFront']) window['bringAllWindowsToFront']();
            },
        },
        { type: 'separator' },
        {
            id: 'window-previous-tab',
            label: () => translate('menu.window.previousTab'),
            shortcut: '⇧⌘[',
            disabled: !tabState.canNavigate,
            action: () => {
                tabState.previous?.();
            },
        },
        {
            id: 'window-next-tab',
            label: () => translate('menu.window.nextTab'),
            shortcut: '⇧⌘]',
            disabled: !tabState.canNavigate,
            action: () => {
                tabState.next?.();
            },
        },
        {
            id: 'window-move-tab-new-window',
            label: () => translate('menu.window.moveTabToNewWindow'),
            disabled: !tabState.canDetach,
        },
        {
            id: 'window-merge-all-windows',
            label: () => translate('menu.window.mergeAllWindows'),
            disabled: true,
        },
    ];

    const multiInstanceItems = getFinderMultiInstanceMenuItems();
    if (multiInstanceItems.length > 0) {
        items.push({ type: 'separator' });
        items.push(...multiInstanceItems);
    }

    return items;
}

function getWindowTabNavigationState(windowController: unknown): {
    canNavigate: boolean;
    canDetach: boolean;
    previous?: () => void;
    next?: () => void;
} {
    const w = windowController as unknown as {
        tabs?: Map<string, unknown>;
        activeTabId?: string | null;
        setActiveTab?: (tabId: string) => void;
    };
    if (!(w?.tabs instanceof Map) || typeof w?.setActiveTab !== 'function') {
        return { canNavigate: false, canDetach: false };
    }

    const tabIds = Array.from(w.tabs.keys());
    if (tabIds.length <= 1) {
        return { canNavigate: false, canDetach: false };
    }

    const activeTabId = w.activeTabId ?? tabIds[0] ?? null;
    const currentIndex = activeTabId ? Math.max(0, tabIds.indexOf(activeTabId)) : 0;
    return {
        canNavigate: true,
        canDetach: false,
        previous: () => {
            const nextIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
            const nextTabId = tabIds[nextIndex];
            if (nextTabId) w.setActiveTab?.(nextTabId);
        },
        next: () => {
            const nextIndex = (currentIndex + 1) % tabIds.length;
            const nextTabId = tabIds[nextIndex];
            if (nextTabId) w.setActiveTab?.(nextTabId);
        },
    };
}

function getActiveFinderWindow() {
    const registry = window['WindowRegistry'];
    return registry?.getActiveWindow?.() as unknown as {
        element?: HTMLElement | null;
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        isMaximized?: boolean;
        bringToFront?: () => void;
        _saveState?: () => void;
    } | null;
}

function focusNextWindow(appType?: string): void {
    const registry = window['WindowRegistry'];
    if (!registry || typeof registry.getAllWindows !== 'function') return;

    const windows = (registry.getAllWindows(appType) || []) as Array<{
        id?: string;
        zIndex?: number;
        bringToFront?: () => void;
        focus?: () => void;
    }>;
    if (windows.length < 2) return;

    const sorted = [...windows].sort((a, b) => (a?.zIndex || 0) - (b?.zIndex || 0));
    const active = registry.getActiveWindow?.();
    const currentIndex = sorted.findIndex(win => !!active && win.id === active.id);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % sorted.length : 0;
    const nextWindow = sorted[nextIndex];
    if (!nextWindow) return;

    if (typeof nextWindow.bringToFront === 'function') {
        nextWindow.bringToFront();
        return;
    }
    if (typeof nextWindow.focus === 'function') {
        nextWindow.focus();
        return;
    }
    if (typeof registry.setActiveWindow === 'function') {
        registry.setActiveWindow(nextWindow.id ?? null);
    }
}

function applyMoveResizePreset(
    windowController: unknown,
    preset: 'leftHalf' | 'rightHalf' | 'topHalf' | 'bottomHalf' | 'standard'
): void {
    const w = windowController as unknown as {
        element?: HTMLElement | null;
        position?: { x: number; y: number; width: number; height: number };
        isMaximized?: boolean;
        bringToFront?: () => void;
        _saveState?: () => void;
    };
    const area = getWindowWorkArea();
    const halfWidth = Math.round(area.width / 2);
    const halfHeight = Math.round(area.height / 2);
    const targetHalfWidth = Math.min(area.width, Math.max(320, halfWidth));
    const targetHalfHeight = Math.min(area.height, Math.max(200, halfHeight));

    let bounds = { x: 0, y: 0, width: 0, height: 0 };
    if (preset === 'leftHalf') {
        bounds = {
            x: area.x,
            y: area.y,
            width: targetHalfWidth,
            height: area.height,
        };
    } else if (preset === 'rightHalf') {
        bounds = {
            x: area.x + area.width - targetHalfWidth,
            y: area.y,
            width: targetHalfWidth,
            height: area.height,
        };
    } else if (preset === 'topHalf') {
        bounds = {
            x: area.x,
            y: area.y,
            width: area.width,
            height: targetHalfHeight,
        };
    } else if (preset === 'bottomHalf') {
        bounds = {
            x: area.x,
            y: area.y + area.height - targetHalfHeight,
            width: area.width,
            height: targetHalfHeight,
        };
    } else {
        const targetWidth = Math.round(Math.min(1100, area.width * 0.72));
        const targetHeight = Math.round(Math.min(760, area.height * 0.78));
        bounds = {
            x: area.x + (area.width - targetWidth) / 2,
            y: area.y + (area.height - targetHeight) / 2,
            width: targetWidth,
            height: targetHeight,
        };
    }

    const el = w?.element;
    if (!el) return;

    if (typeof w.isMaximized === 'boolean') {
        w.isMaximized = false;
    }

    const minWidthPx = preset === 'standard' ? 320 : 120;
    const minHeightPx = preset === 'standard' ? 240 : 120;

    const normalized = {
        x: Math.max(0, Math.round(bounds.x)),
        y: Math.max(0, Math.round(bounds.y)),
        width: Math.max(minWidthPx, Math.round(bounds.width)),
        height: Math.max(minHeightPx, Math.round(bounds.height)),
    };

    if (preset !== 'standard') {
        el.style.setProperty('min-width', `${normalized.width}px`, 'important');
        el.style.setProperty('min-height', `${normalized.height}px`, 'important');
    } else {
        el.style.removeProperty('min-width');
        el.style.removeProperty('min-height');
    }

    el.style.left = `${normalized.x}px`;
    el.style.top = `${normalized.y}px`;
    el.style.width = `${normalized.width}px`;
    el.style.height = `${normalized.height}px`;

    if (w.position) {
        w.position.x = normalized.x;
        w.position.y = normalized.y;
        w.position.width = normalized.width;
        w.position.height = normalized.height;
    }

    w.bringToFront?.();
    w._saveState?.();
}

function applyTilePreset(windowController: unknown, side: 'left' | 'right'): void {
    applyMoveResizePreset(windowController, side === 'left' ? 'leftHalf' : 'rightHalf');
}

function getWindowWorkArea(): { x: number; y: number; width: number; height: number } {
    const getLogicalViewportWidth = (window as any)['getLogicalViewportWidth'] as
        | (() => number)
        | undefined;
    const getLogicalViewportHeight = (window as any)['getLogicalViewportHeight'] as
        | (() => number)
        | undefined;
    const top = Math.max(0, Math.round((window as any).getMenuBarBottom?.() || 0));
    const bottomReserve = Math.max(0, Math.round((window as any).getDockReservedBottom?.() || 0));
    const width = Math.max(640, Math.round(getLogicalViewportWidth?.() || 1280));
    const height = Math.max(
        400,
        Math.round((getLogicalViewportHeight?.() || 800) - top - bottomReserve)
    );
    return { x: 0, y: top, width, height };
}

function getFinderMultiInstanceMenuItems() {
    const items: Record<string, unknown>[] = [];
    const registry = window['WindowRegistry'];

    if (registry && typeof registry.getAllWindows === 'function') {
        const wins = registry.getAllWindows?.('finder') || [];
        if (wins.length === 0) return items;

        const active = registry.getActiveWindow?.();
        const sorted = [...wins].sort(
            (a: unknown, b: unknown) => ((a as any)?.zIndex || 0) - ((b as any)?.zIndex || 0)
        );

        if (sorted.length > 1) {
            items.push({ type: 'separator' });
            sorted.forEach((win: unknown, idx: number) => {
                const w = win as any;
                const isActive = !!active && (active.id ? active.id === w.id : active === win);
                items.push({
                    id: `window-instance-${w.id}`,
                    label: () => `Finder ${idx + 1}`,
                    checked: isActive,
                    shortcut: idx < 9 ? `⌘${idx + 1}` : undefined,
                    action: () => {
                        if (typeof w.bringToFront === 'function') {
                            w.bringToFront();
                        } else if (typeof w.focus === 'function') {
                            w.focus();
                        } else if (typeof registry.setActiveWindow === 'function') {
                            registry.setActiveWindow(w.id ?? null);
                        }
                    },
                });
            });

            if (sorted.length > 1) {
                items.push({ type: 'separator' });
                items.push({
                    id: 'window-close-all',
                    label: () => translate('menu.window.closeAll'),
                    icon: 'close',
                    action: () => {
                        if (
                            confirm(
                                translate('menu.window.closeAllConfirm', {
                                    count: String(sorted.length),
                                    type: 'Finder-Fenster',
                                }) || `Alle ${sorted.length} Finder schließen?`
                            )
                        ) {
                            registry.closeAllWindows?.();
                        }
                    },
                });
            }
        }
    }

    return items;
}

function hasAnyVisibleDialog(): boolean {
    try {
        const dialogs = window['dialogs'] as Record<string, { element?: HTMLElement }>;
        if (!dialogs || typeof dialogs !== 'object') return false;
        return Object.values(dialogs).some(dlg =>
            dlg?.element ? !dlg.element.classList.contains('hidden') : false
        );
    } catch {
        return false;
    }
}

function createHelpMenuSection(context: MenuContext): MenuSection {
    return {
        id: 'help',
        label: () => translate('menu.sections.help'),
        items: [
            {
                id: 'help-show-info',
                label: () => translate('menu.finder.help'),
                icon: 'help',
                action: () => {
                    if (window['openProgramInfoFromMenu'])
                        window['openProgramInfoFromMenu']('projects-modal');
                },
            },
        ],
    };
}

export function registerFinderMenus() {
    const registry = window['MenuRegistry'];
    if (registry && typeof registry.register === 'function') {
        registry.register('finder', getFinderMenus);
    } else {
        logger.warn('UI', '[Finder Menus] MenuRegistry not available during registration');
    }
}

export default getFinderMenus;
