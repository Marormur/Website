/**
 * Preview-related actions
 */
import type { ActionMap, Params } from './helpers.js';
import { getGlobal, safeExecute } from './helpers.js';

export function getPreviewActions(): ActionMap {
    return {
        openWithPreview: (params: Params) => {
            safeExecute('openWithPreview', () => {
                const single = (params['url'] || params['src'] || params['imageUrl']) as
                    | string
                    | undefined;
                const csv = (params['urls'] || params['images']) as string | undefined;
                const idx = parseInt((params['index'] || '0') as string, 10) || 0;
                const path = (params['path'] || params['imagePath']) as string | undefined;

                const preview = getGlobal<{
                    openImages?: (list: string[], start: number, path?: string) => void;
                }>('PreviewInstanceManager');
                const finder = getGlobal<{ openItem?: (name: string, type: string) => void }>(
                    'FinderSystem'
                );

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

                const itemName = (params['itemName'] || params['name']) as string | undefined;
                if (itemName) {
                    finder?.openItem?.(itemName, 'file');
                }
            });
        },
    };
}
