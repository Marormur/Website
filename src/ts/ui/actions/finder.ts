/**
 * Finder-related actions
 */
import type { ActionMap, Params } from './helpers.js';
import logger from '../../core/logger.js';

type FinderState = {
    currentView?: string;
};

type FinderWindowLike = {
    type?: string;
    zIndex?: number;
    activeTabId?: string;
    tabs?: Map<string, FinderTabLike>;
    navigateTo?: (path: string[] | string, view?: string | null) => void;
    openItem?: (name: string, type: string) => void;
    setSortBy?: (field: 'name' | 'date' | 'size' | 'type') => void;
    setViewMode?: (mode: 'list' | 'grid' | 'columns' | 'gallery') => void;
    getState?: () => FinderState;
};

type FinderTabLike = {
    navigateUp?: () => void;
};

type WindowRegistryLike = {
    getWindowsByType?: (type: string) => FinderWindowLike[];
    getActiveWindow?: () => FinderWindowLike | null;
};

function getActiveFinderWindow(): FinderWindowLike | null {
    const registry = window.WindowRegistry as WindowRegistryLike | undefined;
    const wins = registry?.getWindowsByType?.('finder') || [];
    if (wins.length === 0) return null;

    const active = registry?.getActiveWindow?.();
    if (active?.type === 'finder') return active;

    return wins.reduce((a, b) => ((a.zIndex || 0) >= (b.zIndex || 0) ? a : b));
}

function ensureFinderWindow(): FinderWindowLike | null {
    const existing = getActiveFinderWindow();
    if (existing) return existing;

    const finderWindow = window.FinderWindow as
        | { focusOrCreate?: () => FinderWindowLike }
        | undefined;
    return finderWindow?.focusOrCreate?.() || getActiveFinderWindow();
}

function getActiveFinderTab(win: FinderWindowLike | null): FinderTabLike | null {
    if (!win?.tabs || win.tabs.size === 0) return null;
    if (win.activeTabId && win.tabs.has(win.activeTabId)) {
        return win.tabs.get(win.activeTabId) || null;
    }
    return win.tabs.values().next().value || null;
}

export function getFinderActions(): ActionMap {
    return {
        'finder:navigateUp': () => {
            const finderWindow = ensureFinderWindow();
            const activeTab = getActiveFinderTab(finderWindow);
            activeTab?.navigateUp?.();
        },

        'finder:goRoot': () => {
            const finderWindow = ensureFinderWindow();
            const view = finderWindow?.getState?.()?.currentView;
            finderWindow?.navigateTo?.([], view || undefined);
        },

        'finder:switchView': (params: Params) => {
            const view = params['finderView'] || params.view;
            if (!view) {
                logger.warn('UI', 'finder:switchView: missing finderView');
                return;
            }
            const finderWindow = ensureFinderWindow();
            finderWindow?.navigateTo?.([], view as string);
        },

        'finder:setViewMode': (params: Params) => {
            const mode = params['viewMode'] || params['mode'];
            if (!mode) {
                logger.warn('UI', 'finder:setViewMode: missing viewMode');
                return;
            }
            ensureFinderWindow()?.setViewMode?.(mode as 'list' | 'grid' | 'columns' | 'gallery');
        },

        'finder:setSortBy': (params: Params) => {
            const field = params['sortBy'] || params['field'];
            if (!field) {
                logger.warn('UI', 'finder:setSortBy: missing sortBy');
                return;
            }
            ensureFinderWindow()?.setSortBy?.(field as 'name' | 'date' | 'size' | 'type');
        },

        'finder:navigateToPath': (params: Params) => {
            const raw = params.path || '';
            const parts = typeof raw === 'string' && raw.length ? raw.split('/') : [];
            ensureFinderWindow()?.navigateTo?.(parts);
        },

        'finder:openItem': (params: Params) => {
            const name = params['itemName'] || params['name'];
            const type = params['itemType'] || params['type'];
            if (!name || !type) {
                logger.warn('UI', 'finder:openItem: missing name/type');
                return;
            }
            ensureFinderWindow()?.openItem?.(name as string, type as string);
        },

        // VDOM-based Finder UI actions (handled locally via onclick, but registered here to avoid ActionBus warnings)
        'view-list': () => {},
        'view-grid': () => {},
        'navigate-up': () => {},
        'go-root': () => {},
    };
}
