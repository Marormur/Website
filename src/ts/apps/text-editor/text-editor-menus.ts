/**
 * src/ts/apps/text-editor/text-editor-menus.ts
 * TextEditor-spezifische Menü-Definitionen via MenuRegistry.
 */

import { translate } from '../../services/i18n';
import logger from '../../core/logger.js';
import type { MenuSection } from '../../services/menu-registry';

function sendTextEditorMenuAction(actionType: string): void {
    const sendAction = window['sendTextEditorMenuAction'];
    if (typeof sendAction === 'function') {
        sendAction(actionType);
    }
}

function getActiveTextEditorWindow(): {
    type?: string;
    close?: () => void;
    minimize?: () => void;
    toggleMaximize?: () => void;
    center?: () => void;
} | null {
    const registry = window['WindowRegistry'];
    const activeWindow = registry?.getActiveWindow?.() as
        | {
              type?: string;
              close?: () => void;
              minimize?: () => void;
              toggleMaximize?: () => void;
              center?: () => void;
          }
        | undefined;

    return activeWindow?.type === 'text-editor' ? activeWindow : null;
}

function getTextEditorMenus(): MenuSection[] {
    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'text-new',
                    label: () => translate('menu.text.newFile'),
                    shortcut: '⌘N',
                    icon: 'newFile',
                    action: () => {
                        if (
                            window['TextEditorWindow'] &&
                            typeof window['TextEditorWindow'].create === 'function'
                        ) {
                            const registry = window['WindowRegistry'];
                            const count = registry?.getWindowCount?.('text-editor') || 0;
                            window['TextEditorWindow'].create({
                                title: `Untitled ${count + 1}`,
                            });
                        } else {
                            sendTextEditorMenuAction('file:new');
                        }
                    },
                },
                {
                    id: 'text-open',
                    label: () => translate('menu.text.open'),
                    shortcut: '⌘O',
                    icon: 'open',
                    action: () => sendTextEditorMenuAction('file:open'),
                },
                {
                    id: 'text-save',
                    label: () => translate('menu.text.save'),
                    shortcut: '⌘S',
                    icon: 'save',
                    action: () => sendTextEditorMenuAction('file:save'),
                },
            ],
        },
        {
            id: 'edit',
            label: () => translate('menu.sections.edit'),
            items: [
                {
                    id: 'text-undo',
                    label: () => translate('menu.text.undo'),
                    shortcut: '⌘Z',
                    icon: 'undo',
                    action: () => sendTextEditorMenuAction('edit:undo'),
                },
                {
                    id: 'text-redo',
                    label: () => translate('menu.text.redo'),
                    shortcut: '⇧⌘Z',
                    icon: 'redo',
                    action: () => sendTextEditorMenuAction('edit:redo'),
                },
                { type: 'separator' },
                {
                    id: 'text-cut',
                    label: () => translate('menu.text.cut'),
                    shortcut: '⌘X',
                    icon: 'cut',
                    action: () => sendTextEditorMenuAction('edit:cut'),
                },
                {
                    id: 'text-copy',
                    label: () => translate('menu.text.copy'),
                    shortcut: '⌘C',
                    icon: 'copy',
                    action: () => sendTextEditorMenuAction('edit:copy'),
                },
                {
                    id: 'text-paste',
                    label: () => translate('menu.text.paste'),
                    shortcut: '⌘V',
                    icon: 'paste',
                    action: () => sendTextEditorMenuAction('edit:paste'),
                },
                { type: 'separator' },
                {
                    id: 'text-select-all',
                    label: () => translate('menu.text.selectAll'),
                    shortcut: '⌘A',
                    icon: 'selectAll',
                    action: () => sendTextEditorMenuAction('edit:selectAll'),
                },
            ],
        },
        {
            id: 'view',
            label: () => translate('menu.sections.view'),
            items: [
                {
                    id: 'text-toggle-wrap',
                    label: () => translate('menu.text.toggleWrap'),
                    shortcut: '⌥⌘W',
                    icon: 'wrap',
                    action: () => sendTextEditorMenuAction('view:toggleWrap'),
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
                    disabled: () => typeof getActiveTextEditorWindow()?.minimize !== 'function',
                    icon: 'windowMinimize',
                    action: () => getActiveTextEditorWindow()?.minimize?.(),
                },
                {
                    id: 'window-zoom',
                    label: () => translate('menu.window.zoom'),
                    shortcut: '⌃⌘F',
                    disabled: () =>
                        typeof getActiveTextEditorWindow()?.toggleMaximize !== 'function',
                    icon: 'windowZoom',
                    action: () => getActiveTextEditorWindow()?.toggleMaximize?.(),
                },
                {
                    id: 'window-center',
                    label: () => translate('menu.window.center'),
                    disabled: () => typeof getActiveTextEditorWindow()?.center !== 'function',
                    icon: 'window',
                    action: () => getActiveTextEditorWindow()?.center?.(),
                },
                { type: 'separator' },
                {
                    id: 'window-all-front',
                    label: () => translate('menu.window.bringToFront'),
                    icon: 'windowFront',
                    action: () => {
                        const action = window['bringAllWindowsToFront'];
                        if (typeof action === 'function') action();
                    },
                },
                { type: 'separator' },
                {
                    id: 'window-close',
                    label: () => translate('menu.window.close'),
                    shortcut: '⌘W',
                    disabled: () => typeof getActiveTextEditorWindow()?.close !== 'function',
                    icon: 'close',
                    action: () => getActiveTextEditorWindow()?.close?.(),
                },
            ],
        },
        {
            id: 'help',
            label: () => translate('menu.sections.help'),
            items: [
                {
                    id: 'help-text-editor',
                    label: () => translate('menu.text.help'),
                    icon: 'help',
                    action: () => {
                        const openProgramInfo = (window as any)['openProgramInfo'];
                        if (typeof openProgramInfo === 'function') {
                            openProgramInfo('text-modal');
                        }
                    },
                },
            ],
        },
    ];
}

export function registerTextEditorMenus(): void {
    const registry = window.MenuRegistry;
    if (!registry || typeof registry.register !== 'function') {
        logger.warn('UI', '[Menu] MenuRegistry unavailable; cannot register text-editor menus');
        return;
    }

    registry.register('text-editor', getTextEditorMenus);
}
