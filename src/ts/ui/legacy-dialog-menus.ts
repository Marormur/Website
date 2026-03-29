/**
 * src/ts/ui/legacy-dialog-menus.ts
 * MenuRegistry-Definitionen fuer Legacy-Dialoge ohne BaseWindow-Owner.
 */

import { translate } from '../services/i18n';
import type { MenuSection } from '../services/menu-registry';

type DialogLike = {
    close?: () => void;
    minimize?: () => void;
    toggleMaximize?: () => void;
    center?: () => void;
    bringToFront?: () => void;
};

function getDialogController(modalId: string): DialogLike | null {
    const dialogs = (window as any).dialogs as Record<string, DialogLike> | undefined;
    return dialogs?.[modalId] || null;
}

function hasAnyVisibleDialog(): boolean {
    const dialogs = (window as any).dialogs as Record<string, unknown> | undefined;
    if (!dialogs) return false;

    return Object.keys(dialogs).some(id => {
        const element = document.getElementById(id);
        return !!element && !element.classList.contains('hidden');
    });
}

function createLegacyWindowSection(modalId: string): MenuSection {
    return {
        id: 'window',
        label: () => translate('menu.sections.window'),
        items: [
            {
                id: `${modalId}-minimize`,
                label: () => translate('menu.window.minimize'),
                shortcut: '⌘M',
                disabled: () => typeof getDialogController(modalId)?.minimize !== 'function',
                icon: 'windowMinimize',
                action: () => getDialogController(modalId)?.minimize?.(),
            },
            {
                id: `${modalId}-zoom`,
                label: () => translate('menu.window.zoom'),
                shortcut: '⌃⌘F',
                disabled: () => typeof getDialogController(modalId)?.toggleMaximize !== 'function',
                icon: 'windowZoom',
                action: () => getDialogController(modalId)?.toggleMaximize?.(),
            },
            {
                id: `${modalId}-center`,
                label: () => translate('menu.window.center'),
                disabled: () => typeof getDialogController(modalId)?.center !== 'function',
                icon: 'window',
                action: () => getDialogController(modalId)?.center?.(),
            },
            { type: 'separator' },
            {
                id: `${modalId}-bring-to-front`,
                label: () => translate('menu.window.bringToFront'),
                disabled: !hasAnyVisibleDialog(),
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
                    const openProgramInfoFromMenu = (window as any).openProgramInfoFromMenu as
                        | ((modalId?: string | null) => void)
                        | undefined;
                    openProgramInfoFromMenu?.(targetModalId);
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
        createLegacyWindowSection('settings-modal'),
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
        createLegacyWindowSection('about-modal'),
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
