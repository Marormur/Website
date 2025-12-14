/**
 * Finder-related actions
 */
import type { ActionMap, Params } from './helpers.js';
import { getGlobal } from './helpers.js';

export function getFinderActions(): ActionMap {
    return {
        'finder:navigateUp': () => {
            const finder = getGlobal<{ navigateUp?: () => void }>('FinderSystem');
            finder?.navigateUp?.();
        },

        'finder:goRoot': () => {
            const finder = getGlobal<{
                navigateTo?: (parts: string[], view?: string) => void;
                getState?: () => { currentView: string };
            }>('FinderSystem');
            const view = finder?.getState?.()?.currentView;
            finder?.navigateTo?.([], view);
        },

        'finder:switchView': (params: Params) => {
            const view = params['finderView'] || params.view;
            if (!view) {
                console.warn('finder:switchView: missing finderView');
                return;
            }
            const finder = getGlobal<{ navigateTo?: (parts: string[], view?: string) => void }>(
                'FinderSystem'
            );
            finder?.navigateTo?.([], view as string);
        },

        'finder:setViewMode': (params: Params) => {
            const mode = params['viewMode'] || params['mode'];
            if (!mode) {
                console.warn('finder:setViewMode: missing viewMode');
                return;
            }
            const finder = getGlobal<{ setViewMode?: (mode: string) => void }>('FinderSystem');
            finder?.setViewMode?.(mode as string);
        },

        'finder:setSortBy': (params: Params) => {
            const field = params['sortBy'] || params['field'];
            if (!field) {
                console.warn('finder:setSortBy: missing sortBy');
                return;
            }
            const finder = getGlobal<{ setSortBy?: (field: string) => void }>('FinderSystem');
            finder?.setSortBy?.(field as string);
        },

        'finder:navigateToPath': (params: Params) => {
            const raw = params.path || '';
            const parts = typeof raw === 'string' && raw.length ? raw.split('/') : [];
            const finder = getGlobal<{ navigateTo?: (parts: string[]) => void }>('FinderSystem');
            finder?.navigateTo?.(parts);
        },

        'finder:openItem': (params: Params) => {
            const name = params['itemName'] || params['name'];
            const type = params['itemType'] || params['type'];
            if (!name || !type) {
                console.warn('finder:openItem: missing name/type');
                return;
            }
            const finder = getGlobal<{ openItem?: (name: string, type: string) => void }>(
                'FinderSystem'
            );
            finder?.openItem?.(name as string, type as string);
        },
    };
}
