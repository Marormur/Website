'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getPreviewActions = getPreviewActions;
const helpers_js_1 = require('./helpers.js');
function getPreviewActions() {
    return {
        openWithPreview: params => {
            (0, helpers_js_1.safeExecute)('openWithPreview', () => {
                const single = params['url'] || params['src'] || params['imageUrl'];
                const csv = params['urls'] || params['images'];
                const idx = parseInt(params['index'] || '0', 10) || 0;
                const path = params['path'] || params['imagePath'];
                const preview = (0, helpers_js_1.getGlobal)('PreviewInstanceManager');
                const finder = (0, helpers_js_1.getGlobal)('FinderSystem');
                if (single) {
                    const list = [single];
                    preview?.openImages?.(list, 0, path);
                    return;
                }
                if (csv) {
                    const list = csv
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean);
                    if (list.length) {
                        preview?.openImages?.(
                            list,
                            Math.max(0, Math.min(idx, list.length - 1)),
                            path
                        );
                    }
                    return;
                }
                const itemName = params['itemName'] || params['name'];
                if (itemName) {
                    finder?.openItem?.(itemName, 'file');
                }
            });
        },
    };
}
//# sourceMappingURL=preview.js.map
