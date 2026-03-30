/**
 * src/ts/ui/legacy-dialog-menus.ts
 * MenuRegistry-Definitionen fuer Legacy-Dialoge ohne BaseWindow-Owner.
 */

import { translate } from '../services/i18n';
import type { MenuSection } from '../services/menu-registry';

type DialogLike = {
    type?: string;
    close?: () => void;
    minimize?: () => void;
    toggleMaximize?: () => void;
    center?: () => void;
    bringToFront?: () => void;
    canMinimize?: () => boolean;
    canMaximize?: () => boolean;
};

type WindowManagerLike = {
    getDialogInstance?: (windowId: string) => DialogLike | null;
    getAllWindowIds?: () => string[];
};

type WindowRegistryLike = {
    getActiveWindow?: () => DialogLike | undefined;
    getWindowsByType?: (windowType: string) => unknown[];
};

type MenuRegistryLike = {
    register?: (appType: string, resolver: () => MenuSection[]) => void;
};

type LegacyDialogGlobals = Window & {
    WindowManager?: WindowManagerLike;
    WindowRegistry?: WindowRegistryLike;
    MenuRegistry?: MenuRegistryLike;
    bringAllWindowsToFront?: () => void;
    openProgramInfoFromMenu?: (modalId?: string | null) => void;
};

function getLegacyDialogGlobals(): LegacyDialogGlobals {
    return window as LegacyDialogGlobals;
}

function getWindowManager(): WindowManagerLike | undefined {
    return getLegacyDialogGlobals().WindowManager;
}

function getDialogController(modalId: string, windowType?: string): DialogLike | null {
    const registry = getLegacyDialogGlobals().WindowRegistry;
    const activeWindow = registry?.getActiveWindow?.() as DialogLike | undefined;
    if (windowType && activeWindow?.type === windowType) {
        return activeWindow;
    }

    const wm = getWindowManager();
    return wm?.getDialogInstance?.(modalId) || null;
}

function hasAnyVisibleDialog(windowType?: string): boolean {
    const registry = getLegacyDialogGlobals().WindowRegistry;
    const windowsByType = windowType
        ? (registry?.getWindowsByType?.(windowType) as unknown[]) || []
        : [];
    if (windowsByType.length > 0) return true;

    const modalIds = getWindowManager()?.getAllWindowIds?.() || [];
    if (!Array.isArray(modalIds) || modalIds.length === 0) return false;

    return modalIds.some(id => {
        const element = document.getElementById(id);
        return !!element && !element.classList.contains('hidden');
    });
}

function createLegacyWindowSection(modalId: string, windowType?: string): MenuSection {
    return {
        id: 'window',
        label: () => translate('menu.sections.window'),
        items: [
            {
                id: `${modalId}-minimize`,
                label: () => translate('menu.window.minimize'),
                shortcut: '⌘M',
                disabled: () => {
                    const controller = getDialogController(modalId, windowType);
                    return (
                        typeof controller?.minimize !== 'function' ||
                        controller?.canMinimize?.() === false
                    );
                },
                icon: 'windowMinimize',
                action: () => getDialogController(modalId, windowType)?.minimize?.(),
            },
            {
                id: `${modalId}-zoom`,
                label: () => translate('menu.window.zoom'),
                shortcut: '⌃⌘F',
                disabled: () => {
                    const controller = getDialogController(modalId, windowType);
                    return (
                        typeof controller?.toggleMaximize !== 'function' ||
                        controller?.canMaximize?.() === false
                    );
                },
                icon: 'windowZoom',
                action: () => getDialogController(modalId, windowType)?.toggleMaximize?.(),
            },
            {
                id: `${modalId}-center`,
                label: () => translate('menu.window.center'),
                disabled: () =>
                    typeof getDialogController(modalId, windowType)?.center !== 'function',
                icon: 'window',
                action: () => getDialogController(modalId, windowType)?.center?.(),
            },
            { type: 'separator' },
            {
                id: `${modalId}-bring-to-front`,
                label: () => translate('menu.window.bringToFront'),
                disabled: !hasAnyVisibleDialog(windowType),
                icon: 'windowFront',
                action: () => {
                    getLegacyDialogGlobals().bringAllWindowsToFront?.();
                },
            },
            { type: 'separator' },
            {
                id: `${modalId}-close`,
                label: () => translate('menu.window.close'),
                shortcut: '⌘W',
                disabled: () => typeof getDialogController(modalId)?.close !== 'function',
                icon: 'close',
                action: () => getDialogController(modalId)?.close?.(),
            },
        ],
    };
}

function createHelpSection(itemKey: string, targetModalId: string, itemIcon = 'help'): MenuSection {
    return {
        id: 'help',
        label: () => translate('menu.sections.help'),
        items: [
            {
                id: `help-${targetModalId}`,
                label: () => translate(itemKey),
                icon: itemIcon,
                action: () => {
                    getLegacyDialogGlobals().openProgramInfoFromMenu?.(targetModalId);
                },
            },
        ],
    };
}

function getSettingsMenus(): MenuSection[] {
    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'settings-close',
                    label: () => translate('menu.settings.close'),
                    shortcut: '⌘W',
                    disabled: () =>
                        typeof getDialogController('settings-modal')?.close !== 'function',
                    icon: 'close',
                    action: () => getDialogController('settings-modal')?.close?.(),
                },
            ],
        },
        createLegacyWindowSection('settings-modal', 'settings'),
        createHelpSection('menu.settings.help', 'settings-modal'),
    ];
}

function getAboutMenus(): MenuSection[] {
    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'about-close',
                    label: () => translate('menu.about.close'),
                    shortcut: '⌘W',
                    disabled: () => typeof getDialogController('about-modal')?.close !== 'function',
                    icon: 'close',
                    action: () => getDialogController('about-modal')?.close?.(),
                },
            ],
        },
        createLegacyWindowSection('about-modal', 'about'),
        createHelpSection('menu.about.help', 'about-modal', 'info'),
    ];
}

function getProgramInfoMenus(): MenuSection[] {
    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'program-info-close',
                    label: () => translate('menu.programInfo.close'),
                    shortcut: '⌘W',
                    disabled: () =>
                        typeof getDialogController('program-info-modal')?.close !== 'function',
                    icon: 'close',
                    action: () => getDialogController('program-info-modal')?.close?.(),
                },
            ],
        },
        createLegacyWindowSection('program-info-modal'),
    ];
}

export function registerLegacyDialogMenus(): void {
    const registry = window.MenuRegistry;
    if (!registry || typeof registry.register !== 'function') return;

    registry.register('settings', getSettingsMenus);
    registry.register('about', getAboutMenus);
    registry.register('program-info', getProgramInfoMenus);
}
