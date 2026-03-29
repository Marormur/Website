/**
 * src/ts/apps/preview/preview-menus.ts
 * Preview-spezifische Menü-Definitionen via MenuRegistry.
 */

import { translate } from '../../services/i18n';
import type { MenuSection } from '../../services/menu-registry';

type PreviewWindowLike = {
    type?: string;
    close?: () => void;
    minimize?: () => void;
    toggleMaximize?: () => void;
    center?: () => void;
};

type ImageViewerState = {
    hasImage?: boolean;
};

function getActivePreviewWindow(): PreviewWindowLike | null {
    const registry = (window as any).WindowRegistry;
    const activeWindow = registry?.getActiveWindow?.() as PreviewWindowLike | undefined;
    return activeWindow?.type === 'preview' ? activeWindow : null;
}

function getImageViewerState(): ImageViewerState {
    const getState = (window as any).getImageViewerState as (() => ImageViewerState) | undefined;
    return getState?.() || { hasImage: false };
}

function getPreviewMenus(): MenuSection[] {
    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'preview-open-tab',
                    label: () => translate('menu.image.openInTab'),
                    disabled: !getImageViewerState()?.hasImage,
                    icon: 'imageOpen',
                    action: () => {
                        const openInTab = (window as any).openActiveImageInNewTab as
                            | (() => void)
                            | undefined;
                        openInTab?.();
                    },
                },
                {
                    id: 'preview-download',
                    label: () => translate('menu.image.saveImage'),
                    disabled: !getImageViewerState()?.hasImage,
                    icon: 'download',
                    action: () => {
                        const download = (window as any).downloadActiveImage as
                            | (() => void)
                            | undefined;
                        download?.();
                    },
                },
                { type: 'separator' },
                {
                    id: 'preview-close',
                    label: () => translate('menu.image.close'),
                    shortcut: '⌘W',
                    disabled: () => typeof getActivePreviewWindow()?.close !== 'function',
                    icon: 'close',
                    action: () => getActivePreviewWindow()?.close?.(),
                },
            ],
        },
        {
            id: 'window',
            label: () => translate('menu.sections.window'),
            items: [
                {
                    id: 'window-minimize',
                    label: () => translate('menu.window.minimize'),
                    shortcut: '⌘M',
                    disabled: () => typeof getActivePreviewWindow()?.minimize !== 'function',
                    icon: 'windowMinimize',
                    action: () => getActivePreviewWindow()?.minimize?.(),
                },
                {
                    id: 'window-zoom',
                    label: () => translate('menu.window.zoom'),
                    shortcut: '⌃⌘F',
                    disabled: () => typeof getActivePreviewWindow()?.toggleMaximize !== 'function',
                    icon: 'windowZoom',
                    action: () => getActivePreviewWindow()?.toggleMaximize?.(),
                },
                {
                    id: 'window-center',
                    label: () => translate('menu.window.center'),
                    disabled: () => typeof getActivePreviewWindow()?.center !== 'function',
                    icon: 'window',
                    action: () => getActivePreviewWindow()?.center?.(),
                },
                { type: 'separator' },
                {
                    id: 'window-all-front',
                    label: () => translate('menu.window.bringToFront'),
                    icon: 'windowFront',
                    action: () => {
                        const bringAllToFront = (window as any).bringAllWindowsToFront as
                            | (() => void)
                            | undefined;
                        bringAllToFront?.();
                    },
                },
                { type: 'separator' },
                {
                    id: 'window-close',
                    label: () => translate('menu.window.close'),
                    shortcut: '⌘W',
                    disabled: () => typeof getActivePreviewWindow()?.close !== 'function',
                    icon: 'close',
                    action: () => getActivePreviewWindow()?.close?.(),
                },
            ],
        },
        {
            id: 'help',
            label: () => translate('menu.sections.help'),
            items: [
                {
                    id: 'help-preview',
                    label: () => translate('menu.image.help'),
                    icon: 'help',
                    action: () => {
                        const openProgramInfoFromMenu = (window as any).openProgramInfoFromMenu as
                            | ((targetModalId?: string | null) => void)
                            | undefined;
                        openProgramInfoFromMenu?.('preview-modal');
                    },
                },
            ],
        },
    ];
}

export function registerPreviewMenus(): void {
    const registry = window.MenuRegistry;
    if (registry && typeof registry.register === 'function') {
        registry.register('preview', getPreviewMenus);
    }
}
