/**
 * src/ts/apps/terminal/terminal-menus.ts
 * Terminal-spezifische Menü-Definitionen via MenuRegistry.
 */

import { translate } from '../../services/i18n';
import logger from '../../core/logger.js';
import type { MenuSection } from '../../services/menu-registry';

type TerminalTab = {
    title: string;
    buffer?: string;
    appendOutput?: (buf: string) => void;
    clearOutput?: () => void;
};

type TerminalWindowLike = {
    type?: string;
    activeTabId?: string | null;
    tabs?: Map<string, TerminalTab>;
    createSession?: (title?: string) => TerminalTab | void;
    removeTab?: (tabId: string) => void;
    close?: () => void;
    minimize?: () => void;
    toggleMaximize?: () => void;
    center?: () => void;
    bringToFront?: () => void;
};

function getActiveTerminalWindow(): TerminalWindowLike | null {
    const registry = window['WindowRegistry'];
    const activeWindow = registry?.getActiveWindow?.() as TerminalWindowLike | undefined;
    return activeWindow?.type === 'terminal' ? activeWindow : null;
}

function getTerminalMenus(): MenuSection[] {
    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'terminal-new-window',
                    label: () => translate('menu.terminal.newWindow'),
                    shortcut: '⌘N',
                    icon: 'new',
                    action: () => {
                        const registry = window['WindowRegistry'];
                        if (window['TerminalWindow']?.create) {
                            const count = registry?.getWindowCount?.('terminal') || 0;
                            window['TerminalWindow'].create({ title: `Terminal ${count + 1}` });
                        } else {
                            logger.warn(
                                'UI',
                                '[Menu] TerminalWindow is unavailable; skipping terminal menu action'
                            );
                        }
                    },
                },
                {
                    id: 'terminal-new-tab',
                    label: () => translate('menu.terminal.newTab'),
                    shortcut: '⌘T',
                    icon: 'tabNew',
                    disabled: () => !getActiveTerminalWindow(),
                    action: () => {
                        getActiveTerminalWindow()?.createSession?.();
                    },
                },
                {
                    id: 'terminal-duplicate-tab',
                    label: () => translate('menu.terminal.duplicateTab'),
                    shortcut: '⌥⌘D',
                    icon: 'tabDuplicate',
                    disabled: () => {
                        const terminalWin = getActiveTerminalWindow();
                        return !terminalWin || !terminalWin.activeTabId;
                    },
                    action: () => {
                        const terminalWin = getActiveTerminalWindow();
                        const activeId = terminalWin?.activeTabId;
                        if (!terminalWin || !activeId || !(terminalWin.tabs instanceof Map)) return;

                        const originalTab = terminalWin.tabs.get(activeId);
                        if (!originalTab || typeof terminalWin.createSession !== 'function') return;

                        const newTab = terminalWin.createSession(`${originalTab.title} Copy`);
                        if (
                            originalTab.buffer &&
                            newTab &&
                            typeof (newTab as TerminalTab).appendOutput === 'function'
                        ) {
                            (newTab as TerminalTab).appendOutput?.(originalTab.buffer);
                        }
                    },
                },
                { type: 'separator' },
                {
                    id: 'terminal-close-tab',
                    label: () => translate('menu.terminal.closeTab'),
                    shortcut: '⌘W',
                    icon: 'tabClose',
                    disabled: () => {
                        const terminalWin = getActiveTerminalWindow();
                        return !terminalWin || !terminalWin.activeTabId;
                    },
                    action: () => {
                        const terminalWin = getActiveTerminalWindow();
                        if (!terminalWin || !(terminalWin.tabs instanceof Map)) return;

                        if (terminalWin.tabs.size <= 1) {
                            terminalWin.close?.();
                            return;
                        }

                        const activeId = terminalWin.activeTabId;
                        if (activeId) terminalWin.removeTab?.(activeId);
                    },
                },
                {
                    id: 'terminal-close-window',
                    label: () => translate('menu.terminal.closeWindow'),
                    shortcut: '⇧⌘W',
                    icon: 'close',
                    disabled: () => !getActiveTerminalWindow(),
                    action: () => {
                        getActiveTerminalWindow()?.close?.();
                    },
                },
            ],
        },
        {
            id: 'edit',
            label: () => translate('menu.sections.edit'),
            items: [
                {
                    id: 'terminal-clear',
                    label: () => translate('menu.terminal.clear'),
                    shortcut: '⌘K',
                    icon: 'clear',
                    action: () => {
                        const terminalWin = getActiveTerminalWindow();
                        const activeId = terminalWin?.activeTabId;
                        if (!terminalWin || !activeId || !(terminalWin.tabs instanceof Map)) return;
                        terminalWin.tabs.get(activeId)?.clearOutput?.();
                    },
                },
                { type: 'separator' },
                {
                    id: 'terminal-copy',
                    label: () => translate('menu.terminal.copy'),
                    shortcut: '⌘C',
                    icon: 'copy',
                    action: () => {
                        const input = document.querySelector('#terminal-input') as
                            | HTMLInputElement
                            | HTMLTextAreaElement
                            | null;
                        if (input) input.select();
                        document.execCommand?.('copy');
                    },
                },
                {
                    id: 'terminal-paste',
                    label: () => translate('menu.terminal.paste'),
                    shortcut: '⌘V',
                    icon: 'paste',
                    action: async () => {
                        const input = document.querySelector('#terminal-input') as
                            | HTMLInputElement
                            | HTMLTextAreaElement
                            | null;
                        if (!input) return;

                        try {
                            const text = await navigator.clipboard.readText();
                            input.value += text;
                            input.dispatchEvent(new Event('input'));
                        } catch (error) {
                            logger.warn('UI', 'Clipboard read failed', error);
                        }
                    },
                },
                {
                    id: 'terminal-select-all',
                    label: () => translate('menu.terminal.selectAll'),
                    shortcut: '⌘A',
                    icon: 'selectAll',
                    action: () => {
                        const input = document.querySelector('#terminal-input') as
                            | HTMLInputElement
                            | HTMLTextAreaElement
                            | null;
                        if (input) input.select();
                    },
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
                    disabled: () => typeof getActiveTerminalWindow()?.minimize !== 'function',
                    icon: 'windowMinimize',
                    action: () => getActiveTerminalWindow()?.minimize?.(),
                },
                {
                    id: 'window-zoom',
                    label: () => translate('menu.window.zoom'),
                    shortcut: '⌃⌘F',
                    disabled: () => typeof getActiveTerminalWindow()?.toggleMaximize !== 'function',
                    icon: 'windowZoom',
                    action: () => getActiveTerminalWindow()?.toggleMaximize?.(),
                },
                {
                    id: 'window-center',
                    label: () => translate('menu.window.center'),
                    disabled: () => typeof getActiveTerminalWindow()?.center !== 'function',
                    icon: 'window',
                    action: () => getActiveTerminalWindow()?.center?.(),
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
                    disabled: () => typeof getActiveTerminalWindow()?.close !== 'function',
                    icon: 'close',
                    action: () => getActiveTerminalWindow()?.close?.(),
                },
            ],
        },
        {
            id: 'help',
            label: () => translate('menu.sections.help'),
            items: [
                {
                    id: 'help-terminal',
                    label: () => translate('menu.terminal.help'),
                    icon: 'help',
                    action: () => {
                        const openProgramInfo = (window as any)['openProgramInfo'];
                        if (typeof openProgramInfo === 'function') {
                            openProgramInfo('terminal');
                        }
                    },
                },
            ],
        },
    ];
}

export function registerTerminalMenus(): void {
    const registry = window.MenuRegistry;
    if (!registry || typeof registry.register !== 'function') {
        logger.warn('UI', '[Menu] MenuRegistry unavailable; cannot register terminal menus');
        return;
    }

    registry.register('terminal', getTerminalMenus);
}
