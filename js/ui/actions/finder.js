'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getFinderActions = getFinderActions;
const helpers_js_1 = require('./helpers.js');
function getFinderActions() {
    return {
        'finder:navigateUp': () => {
            const finder = (0, helpers_js_1.getGlobal)('FinderSystem');
            finder?.navigateUp?.();
        },
        'finder:goRoot': () => {
            const finder = (0, helpers_js_1.getGlobal)('FinderSystem');
            const view = finder?.getState?.()?.currentView;
            finder?.navigateTo?.([], view);
        },
        'finder:switchView': params => {
            const view = params['finderView'] || params.view;
            if (!view) {
                console.warn('finder:switchView: missing finderView');
                return;
            }
            const finder = (0, helpers_js_1.getGlobal)('FinderSystem');
            finder?.navigateTo?.([], view);
        },
        'finder:setViewMode': params => {
            const mode = params['viewMode'] || params['mode'];
            if (!mode) {
                console.warn('finder:setViewMode: missing viewMode');
                return;
            }
            const finder = (0, helpers_js_1.getGlobal)('FinderSystem');
            finder?.setViewMode?.(mode);
        },
        'finder:setSortBy': params => {
            const field = params['sortBy'] || params['field'];
            if (!field) {
                console.warn('finder:setSortBy: missing sortBy');
                return;
            }
            const finder = (0, helpers_js_1.getGlobal)('FinderSystem');
            finder?.setSortBy?.(field);
        },
        'finder:navigateToPath': params => {
            const raw = params.path || '';
            const parts = typeof raw === 'string' && raw.length ? raw.split('/') : [];
            const finder = (0, helpers_js_1.getGlobal)('FinderSystem');
            finder?.navigateTo?.(parts);
        },
        'finder:openItem': params => {
            const name = params['itemName'] || params['name'];
            const type = params['itemType'] || params['type'];
            if (!name || !type) {
                console.warn('finder:openItem: missing name/type');
                return;
            }
            const finder = (0, helpers_js_1.getGlobal)('FinderSystem');
            finder?.openItem?.(name, type);
        },
    };
}
//# sourceMappingURL=finder.js.map
