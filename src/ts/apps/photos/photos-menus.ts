/**
 * src/ts/apps/photos/photos-menus.ts
 * Photos-spezifische Menü-Definitionen via MenuRegistry.
 */

import { translate } from '../../services/i18n';
import type { MenuSection } from '../../services/menu-registry';

type PhotosWindowLike = {
    type?: string;
    close?: () => void;
    minimize?: () => void;
    toggleMaximize?: () => void;
    center?: () => void;
    canMinimize?: () => boolean;
    canMaximize?: () => boolean;
};

type ImageViewerState = {
    hasImage?: boolean;
};

function getActivePhotosWindow(): PhotosWindowLike | null {
    const registry = (window as any).WindowRegistry;
    const activeWindow = registry?.getActiveWindow?.() as PhotosWindowLike | undefined;
    return activeWindow?.type === 'photos' ? activeWindow : null;
}

function getImageViewerState(): ImageViewerState {
    const getState = (window as any).getImageViewerState as (() => ImageViewerState) | undefined;
    return getState?.() || { hasImage: false };
}

function getPhotosMenus(): MenuSection[] {
    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'photos-open-tab',
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
                    id: 'photos-download',
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
                    id: 'photos-close',
                    label: () => translate('menu.image.close'),
                    shortcut: '⌘W',
                    disabled: () => typeof getActivePhotosWindow()?.close !== 'function',
                    icon: 'close',
                    action: () => getActivePhotosWindow()?.close?.(),
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
                    disabled: () => {
                        const activeWindow = getActivePhotosWindow();
                        return (
                            typeof activeWindow?.minimize !== 'function' ||
                            activeWindow?.canMinimize?.() === false
                        );
                    },
                    icon: 'windowMinimize',
                    action: () => getActivePhotosWindow()?.minimize?.(),
                },
                {
                    id: 'window-zoom',
                    label: () => translate('menu.window.zoom'),
                    shortcut: '⌃⌘F',
                    disabled: () => {
                        const activeWindow = getActivePhotosWindow();
                        return (
                            typeof activeWindow?.toggleMaximize !== 'function' ||
                            activeWindow?.canMaximize?.() === false
                        );
                    },
                    icon: 'windowZoom',
                    action: () => getActivePhotosWindow()?.toggleMaximize?.(),
                },
                {
                    id: 'window-center',
                    label: () => translate('menu.window.center'),
                    disabled: () => typeof getActivePhotosWindow()?.center !== 'function',
                    icon: 'window',
                    action: () => getActivePhotosWindow()?.center?.(),
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
                    disabled: () => typeof getActivePhotosWindow()?.close !== 'function',
                    icon: 'close',
                    action: () => getActivePhotosWindow()?.close?.(),
                },
            ],
        },
        {
            id: 'help',
            label: () => translate('menu.sections.help'),
            items: [
                {
                    id: 'help-photos',
                    label: () => translate('menu.image.help'),
                    icon: 'help',
                    action: () => {
                        const openProgramInfoFromMenu = (window as any).openProgramInfoFromMenu as
                            | ((targetModalId?: string | null) => void)
                            | undefined;
                        openProgramInfoFromMenu?.('image-modal');
                    },
                },
            ],
        },
    ];
}

export function registerPhotosMenus(): void {
    const registry = window.MenuRegistry;
    if (registry && typeof registry.register === 'function') {
        registry.register('photos', getPhotosMenus);
    }
}
