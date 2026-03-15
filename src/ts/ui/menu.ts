/*
 * src/ts/menu.ts
 * Typed port of js/menu.js
 */

import { translate } from '../services/i18n';
import logger from '../core/logger.js';

type MenuHandler = (...args: unknown[]) => unknown;
const menuActionHandlers = new Map<string, MenuHandler>();
let menuActionIdCounter = 0;

type MenuContext = {
    modalId?: string;
    dialog?: {
        close?: () => void;
        minimize?: () => void;
        toggleMaximize?: () => void;
        center?: () => void;
    } | null;
} | null;

type WindowMenuController = {
    close?: () => void;
    minimize?: () => void;
    toggleMaximize?: () => void;
    center?: () => void;
    type?: string;
} | null;

const MULTI_WINDOW_MODAL_TYPE_MAP: Record<string, string> = {
    'projects-modal': 'finder',
    'terminal-modal': 'terminal',
    'text-modal': 'text-editor',
    'image-modal': 'photos',
};

export function registerMenuAction(handler: MenuHandler) {
    if (typeof handler !== 'function') return null;
    const actionId = `menu-action-${++menuActionIdCounter}`;
    menuActionHandlers.set(actionId, handler);
    return actionId;
}

export function normalizeMenuItems(items: unknown[], context: MenuContext) {
    if (!Array.isArray(items)) return [];
    const normalized: Record<string, unknown>[] = [];
    let previousWasSeparator = true;
    items.forEach(raw => {
        const item = raw as Record<string, unknown>;
        if (!item) return;
        if (item['type'] === 'separator') {
            if (previousWasSeparator) return;
            normalized.push({ type: 'separator' });
            previousWasSeparator = true;
            return;
        }
        const clone = Object.assign({}, item) as Record<string, unknown>;
        if (typeof item['disabled'] === 'function')
            clone['disabled'] = (item['disabled'] as (ctx: MenuContext) => boolean)(context);
        if (typeof item['label'] === 'function')
            clone['label'] = (item['label'] as (ctx: MenuContext) => string)(context);
        if (typeof item['shortcut'] === 'function')
            clone['shortcut'] = (item['shortcut'] as (ctx: MenuContext) => string)(context);
        normalized.push(clone);
        previousWasSeparator = false;
    });
    while (normalized.length && normalized[normalized.length - 1]?.type === 'separator')
        normalized.pop();
    return normalized;
}

// --- Menu builders (ported functions simplified to reference window helpers) ---
function buildDefaultMenuDefinition(context: MenuContext) {
    return buildFinderMenuDefinition(context);
}

function buildFinderMenuDefinition(context: MenuContext) {
    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'finder-new-window',
                    label: () => translate('menu.finder.newWindow'),
                    shortcut: '⌘N',
                    icon: 'new',
                    action: () => {
                        // Create new multi-window Finder
                        if (
                            window['FinderWindow'] &&
                            typeof window['FinderWindow'].create === 'function'
                        ) {
                            const registry = window['WindowRegistry'];
                            const count = registry?.getWindowCount?.('finder') || 0;
                            window['FinderWindow'].create({
                                title: `Finder ${count + 1}`,
                            });
                        } else {
                            // Fallback to legacy instance manager
                            const mgr = window['FinderInstanceManager'];
                            if (mgr && typeof mgr.createInstance === 'function') {
                                const count = mgr.getInstanceCount
                                    ? mgr.getInstanceCount()
                                    : mgr.getAllInstances?.().length || 0;
                                mgr.createInstance({ title: `Finder ${count + 1}` });
                            }
                        }
                    },
                },
                {
                    id: 'finder-reload',
                    label: () => translate('menu.finder.reload'),
                    shortcut: '⌘R',
                    icon: 'reload',
                    action: () => {
                        if (
                            window['FinderSystem'] &&
                            typeof window['FinderSystem'].navigateTo === 'function'
                        ) {
                            try {
                                const st =
                                    window['FinderSystem'].getState &&
                                    window['FinderSystem'].getState();
                                if (st && Array.isArray(st.githubRepos)) st.githubRepos = [];
                                window['FinderSystem'].navigateTo([], 'github');
                            } catch (e) {
                                logger.warn('UI', 'Finder reload failed', e);
                            }
                        }
                    },
                },
                { type: 'separator' },
                {
                    id: 'session-export',
                    label: () => translate('menu.session.export'),
                    icon: 'save',
                    action: () => {
                        const actionBus = window['ActionBus'];
                        if (actionBus && typeof actionBus.execute === 'function') {
                            actionBus.execute('session:export');
                        }
                    },
                },
                {
                    id: 'session-import',
                    label: () => translate('menu.session.import'),
                    icon: 'open',
                    action: () => {
                        const actionBus = window['ActionBus'];
                        if (actionBus && typeof actionBus.execute === 'function') {
                            actionBus.execute('session:import');
                        }
                    },
                },
                { type: 'separator' },
                {
                    id: 'finder-close',
                    label: () => translate('menu.finder.close'),
                    shortcut: '⌘W',
                    disabled: () => {
                        // Check if there's an active Finder window via WindowRegistry (Multi-Window)
                        const registry = window['WindowRegistry'];
                        if (registry) {
                            const finderWindows = registry.getAllWindows?.('finder') || [];
                            if (finderWindows.length > 0) return false;
                        }
                        // Fallback: Legacy dialog check
                        return !(context && context.dialog);
                    },
                    icon: 'close',
                    action: () => {
                        // Try Multi-Window System first
                        const registry = window['WindowRegistry'];
                        if (registry) {
                            const activeWindow = registry.getActiveWindow?.();
                            if (activeWindow && activeWindow.type === 'finder') {
                                activeWindow.close?.();
                                return;
                            }
                        }
                        // Fallback to legacy dialog close
                        closeContextWindow(context);
                    },
                },
            ],
        },
        createWindowMenuSection(context),
        createHelpMenuSection(context, {
            itemKey: 'menu.finder.help',
            itemIcon: 'help',
        }),
    ];
}

function buildSettingsMenuDefinition(context: MenuContext) {
    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'settings-close',
                    label: () => translate('menu.settings.close'),
                    shortcut: '⌘W',
                    disabled: () => !(context && context.dialog),
                    icon: 'close',
                    action: () => closeContextWindow(context),
                },
            ],
        },
        createWindowMenuSection(context),
        createHelpMenuSection(context, {
            itemKey: 'menu.settings.help',
            infoModalId: 'settings-modal',
            itemIcon: 'help',
        }),
    ];
}

function buildTextEditorMenuDefinition(context: MenuContext) {
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
                        // Create new multi-window TextEditor
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
                            // Fallback to legacy action
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
        createWindowMenuSection(context),
        createHelpMenuSection(context, {
            itemKey: 'menu.text.help',
            infoModalId: 'text-modal',
            itemIcon: 'help',
        }),
    ];
}

function buildPhotosMenuDefinition(context: MenuContext) {
    const state = (
        window['getImageViewerState'] ? window['getImageViewerState']() : { hasImage: false }
    ) as { hasImage?: boolean; src?: string; title?: string };
    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'photos-open-tab',
                    label: () => translate('menu.image.openInTab'),
                    disabled: !state?.hasImage,
                    icon: 'imageOpen',
                    action: () => {
                        if (window['openActiveImageInNewTab']) window['openActiveImageInNewTab']();
                    },
                },
                {
                    id: 'photos-download',
                    label: () => translate('menu.image.saveImage'),
                    disabled: !state?.hasImage,
                    icon: 'download',
                    action: () => {
                        if (window['downloadActiveImage']) window['downloadActiveImage']();
                    },
                },
                { type: 'separator' },
                {
                    id: 'photos-close',
                    label: () => translate('menu.image.close'),
                    shortcut: '⌘W',
                    disabled: () => !(context && context.dialog),
                    icon: 'close',
                    action: () => closeContextWindow(context),
                },
            ],
        },
        createWindowMenuSection(context),
        createHelpMenuSection(context, {
            itemKey: 'menu.image.help',
            infoModalId: 'image-modal',
            itemIcon: 'help',
        }),
    ];
}

function buildAboutMenuDefinition(context: MenuContext) {
    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'about-close',
                    label: () => translate('menu.about.close'),
                    shortcut: '⌘W',
                    disabled: () => !(context && context.dialog),
                    icon: 'close',
                    action: () => closeContextWindow(context),
                },
            ],
        },
        createWindowMenuSection(context),
        createHelpMenuSection(context, {
            itemKey: 'menu.about.help',
            infoModalId: 'about-modal',
            itemIcon: 'info',
        }),
    ];
}

function buildProgramInfoMenuDefinition(context: MenuContext) {
    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'program-info-close',
                    label: () => translate('menu.programInfo.close'),
                    shortcut: '⌘W',
                    disabled: () => !(context && context.dialog),
                    icon: 'close',
                    action: () => closeContextWindow(context),
                },
            ],
        },
        createWindowMenuSection(context),
    ];
}

function buildTerminalMenuDefinition(context: MenuContext) {
    // Determine active TerminalWindow (multi-window system)
    const registry = window['WindowRegistry'];
    const activeWin = registry?.getActiveWindow?.();
    const isTerminalActive = activeWin?.type === 'terminal';
    const terminalWin = isTerminalActive ? activeWin : null;

    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                // New Terminal Window
                {
                    id: 'terminal-new-window',
                    label: () => translate('menu.terminal.newWindow'),
                    shortcut: '⌘N',
                    icon: 'new',
                    action: () => {
                        if (window['TerminalWindow']?.create) {
                            const count = registry?.getWindowCount?.('terminal') || 0;
                            window['TerminalWindow'].create({ title: `Terminal ${count + 1}` });
                        } else if (window['TerminalInstanceManager']?.createInstance) {
                            window['TerminalInstanceManager'].createInstance();
                        }
                    },
                },
                // New Tab in active Terminal window
                {
                    id: 'terminal-new-tab',
                    label: () => translate('menu.terminal.newTab'),
                    shortcut: '⌘T',
                    icon: 'tabNew',
                    disabled: () => !terminalWin,
                    action: () => {
                        if (terminalWin?.createSession) terminalWin.createSession();
                    },
                },
                // Duplicate current tab
                {
                    id: 'terminal-duplicate-tab',
                    label: () => translate('menu.terminal.duplicateTab'),
                    shortcut: '⌥⌘D',
                    icon: 'tabDuplicate',
                    disabled: () => !terminalWin || !terminalWin.activeTabId,
                    action: () => {
                        const activeId = terminalWin?.activeTabId;
                        if (!activeId) return;
                        const tabs = (
                            terminalWin as unknown as {
                                tabs: Map<
                                    string,
                                    {
                                        title: string;
                                        buffer?: string;
                                        appendOutput?: (buf: string) => void;
                                    }
                                >;
                            }
                        ).tabs;
                        const orig = tabs.get(activeId);
                        if (orig && terminalWin.createSession) {
                            const newSession = terminalWin.createSession(orig.title + ' Copy') as
                                | { appendOutput?: (buf: string) => void }
                                | undefined;
                            // Optionally copy buffer if available
                            if (
                                orig.buffer &&
                                newSession &&
                                typeof newSession.appendOutput === 'function'
                            ) {
                                newSession.appendOutput(orig.buffer);
                            }
                        }
                    },
                },
                { type: 'separator' },
                // Close current tab (⌘W). If only one tab: close window.
                {
                    id: 'terminal-close-tab',
                    label: () => translate('menu.terminal.closeTab'),
                    shortcut: '⌘W',
                    icon: 'tabClose',
                    disabled: () => !terminalWin || !terminalWin.activeTabId,
                    action: () => {
                        if (!terminalWin) return;
                        const tabs = (terminalWin as unknown as { tabs: Map<string, unknown> })
                            .tabs;
                        if (tabs.size <= 1) {
                            terminalWin.close?.();
                            return;
                        }
                        const activeId = terminalWin.activeTabId;
                        if (activeId) terminalWin.removeTab?.(activeId);
                    },
                },
                // Close entire window (⇧⌘W)
                {
                    id: 'terminal-close-window',
                    label: () => translate('menu.terminal.closeWindow'),
                    shortcut: '⇧⌘W',
                    icon: 'close',
                    disabled: () => !(context && context.dialog),
                    action: () => closeContextWindow(context),
                },
            ],
        },
        {
            id: 'edit',
            label: () => translate('menu.sections.edit'),
            items: [
                // Clear terminal scrollback/output
                {
                    id: 'terminal-clear',
                    label: () => translate('menu.terminal.clear'),
                    shortcut: '⌘K',
                    icon: 'clear',
                    action: () => {
                        if (!terminalWin) return;
                        const activeId = terminalWin.activeTabId;
                        const tabs = (
                            terminalWin as unknown as {
                                tabs: Map<string, { clearOutput?: () => void }>;
                            }
                        ).tabs;
                        const tab = activeId ? tabs.get(activeId) : null;
                        const inst = tab || null;
                        if (inst?.clearOutput) inst.clearOutput();
                    },
                },
                { type: 'separator' },
                // Basic clipboard actions (delegate to focused input)
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
                        } catch (e) {
                            logger.warn('UI', 'Clipboard read failed', e);
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
        createWindowMenuSection(context),
        createHelpMenuSection(context, {
            itemKey: 'menu.terminal.help',
            infoModalId: 'terminal-modal',
            itemIcon: 'help',
        }),
    ];
}

function createWindowMenuSection(context: MenuContext) {
    return {
        id: 'window',
        label: () => translate('menu.sections.window'),
        items: getWindowMenuItems(context),
    };
}

function getWindowMenuItems(context: MenuContext) {
    const windowController = resolveWindowMenuController(context);
    const canClose = typeof windowController?.close === 'function';
    const canMinimize = typeof windowController?.minimize === 'function';
    const canZoom = typeof windowController?.toggleMaximize === 'function';
    const canCenter = typeof windowController?.center === 'function';

    // Check if we're in Finder context
    const isFinder =
        context?.modalId === 'projects-modal' ||
        window['WindowRegistry']?.getActiveWindow?.()?.type === 'finder';

    const items: Record<string, unknown>[] = [
        {
            id: 'window-minimize',
            label: () => translate('menu.window.minimize'),
            shortcut: '⌘M',
            disabled: !canMinimize,
            icon: 'windowMinimize',
            action: () => {
                windowController?.minimize?.();
            },
        },
        {
            id: 'window-zoom',
            label: () => translate('menu.window.zoom'),
            shortcut: '⌃⌘F',
            disabled: !canZoom,
            icon: 'windowZoom',
            action: () => {
                windowController?.toggleMaximize?.();
            },
        },
        {
            id: 'window-center',
            label: () => translate('menu.window.center'),
            disabled: !canCenter,
            icon: 'window',
            action: () => {
                windowController?.center?.();
            },
        },
    ];
    const multiInstanceItems = getMultiInstanceMenuItems(context);
    if (multiInstanceItems.length > 0) {
        items.push({ type: 'separator' });
        items.push(...multiInstanceItems);
    }
    items.push(
        { type: 'separator' },
        {
            id: 'window-all-front',
            label: () => translate('menu.window.bringToFront'),
            disabled: !hasAnyVisibleDialog(),
            icon: 'windowFront',
            action: () => {
                if (window['bringAllWindowsToFront']) window['bringAllWindowsToFront']();
            },
        }
    );

    // "Fenster schließen" only for non-Finder windows
    // (Finder has this in Ablage menu as per macOS convention)
    if (!isFinder) {
        items.push(
            { type: 'separator' },
            {
                id: 'window-close',
                label: () => translate('menu.window.close'),
                shortcut: '⌘W',
                disabled: !canClose,
                icon: 'close',
                action: () => windowController?.close?.(),
            }
        );
    }

    return items;
}

function resolveWindowMenuController(context: MenuContext): WindowMenuController {
    const modalId = context?.modalId;
    const activeWindow = window.WindowRegistry?.getActiveWindow?.() as WindowMenuController;

    if (context?.dialog) {
        return context.dialog;
    }

    if (activeWindow) {
        const expectedType = modalId ? MULTI_WINDOW_MODAL_TYPE_MAP[modalId] : undefined;
        if (!modalId || modalId.startsWith('window-') || expectedType === activeWindow.type) {
            return activeWindow;
        }
    }

    if (modalId) {
        const dialog = (window.dialogs?.[modalId] ?? null) as WindowMenuController;
        if (dialog) {
            return dialog;
        }
    }

    if (activeWindow) {
        return activeWindow;
    }

    return null;
}

function getMultiInstanceMenuItems(context: MenuContext) {
    const items: Record<string, unknown>[] = [];
    let manager: any = null;
    let typeLabel: string | null = null;
    let newInstanceKey: string | null = null;
    const modalId = context?.modalId;
    const registry = window['WindowRegistry'];

    // Check if we're in Finder context
    const isFinder =
        modalId === 'projects-modal' || registry?.getActiveWindow?.()?.type === 'finder';

    // Preferred path: Use WindowRegistry for all multi-window app types
    if (registry && typeof registry.getAllWindows === 'function') {
        type LabelConfig = {
            type: string;
            label: string;
            newKey: string;
            create?: (title: string) => void;
        };
        const configs: LabelConfig[] = [
            {
                type: 'finder',
                label: 'Finder',
                newKey: 'menu.window.newFinder',
                create: (title: string) => window['FinderWindow']?.create?.({ title }),
            },
            {
                type: 'terminal',
                label: 'Terminal',
                newKey: 'menu.window.newTerminal',
                create: (title: string) => window['TerminalWindow']?.create?.({ title }),
            },
            {
                type: 'text-editor',
                label: 'Editor',
                newKey: 'menu.window.newEditor',
                create: (title: string) => window['TextEditorWindow']?.create?.({ title }),
            },
        ];

        const active = registry.getActiveWindow?.();
        let anyListed = false;

        configs.forEach(cfg => {
            const wins = registry.getAllWindows?.(cfg.type) || [];
            if (wins.length === 0) return;
            anyListed = true;

            // SKIP "New Finder Window" in Window menu when in Finder (it's in Ablage/File menu)
            const skipNewAction = isFinder && cfg.type === 'finder';

            // New window action for this type (except Finder in Finder context)
            if (cfg.create && !skipNewAction) {
                items.push({
                    id: `window-new-${cfg.type}`,
                    label: () => translate(cfg.newKey),
                    shortcut: '⌘N',
                    icon: 'new',
                    action: () => {
                        const count = registry.getWindowCount?.(cfg.type) || 0;
                        const next = count + 1;
                        cfg.create?.(`${cfg.label} ${next}`);
                    },
                });
            }

            // List windows for this type, sorted by zIndex
            type WinItem = {
                id?: string;
                zIndex?: number;
                bringToFront?: () => void;
                focus?: () => void;
            };
            const sorted = [...wins].sort(
                (a: unknown, b: unknown) =>
                    ((a as WinItem)?.zIndex || 0) - ((b as WinItem)?.zIndex || 0)
            );
            if (sorted.length > 0) items.push({ type: 'separator' });
            sorted.forEach((win: unknown, idx: number) => {
                const w = win as WinItem;
                const isActive = !!active && (active.id ? active.id === w.id : active === win);
                const numberLabel = `${cfg.label} ${idx + 1}`;
                items.push({
                    id: `window-instance-${w.id}`,
                    label: () => `${isActive ? '✓ ' : ''}${numberLabel}`,
                    shortcut: idx < 9 ? `⌘${idx + 1}` : undefined,
                    action: () => {
                        if (typeof w.bringToFront === 'function') {
                            w.bringToFront();
                        } else if (typeof w.focus === 'function') {
                            w.focus();
                        } else if (typeof registry.setActiveWindow === 'function') {
                            registry.setActiveWindow(w.id ?? null);
                        }
                    },
                });
            });
        });

        // Global close all if more than one window across all types
        const total = registry.getWindowCount?.() || 0;
        if (anyListed && total > 1) {
            items.push({ type: 'separator' });
            items.push({
                id: 'window-close-all',
                label: () => translate('menu.window.closeAll'),
                icon: 'close',
                action: () => {
                    if (
                        confirm(
                            translate('menu.window.closeAllConfirm', {
                                count: String(total),
                                type: 'Fenster',
                            }) || `Alle ${total} Fenster schließen?`
                        )
                    ) {
                        registry.closeAllWindows?.();
                    }
                },
            });
        }

        if (anyListed) return items;
    }

    // Legacy fallback for Finder and TextEditor
    if (modalId === 'projects-modal' && window['FinderInstanceManager']) {
        manager = window['FinderInstanceManager'];
        typeLabel = 'Finder';
        newInstanceKey = 'menu.window.newFinder';
    } else if (modalId === 'terminal-modal' && window['TerminalInstanceManager']) {
        manager = window['TerminalInstanceManager'];
        typeLabel = 'Terminal';
        newInstanceKey = 'menu.window.newTerminal';
    } else if (modalId === 'text-modal' && window['TextEditorInstanceManager']) {
        manager = window['TextEditorInstanceManager'];
        typeLabel = 'Editor';
        newInstanceKey = 'menu.window.newEditor';
    }
    if (!manager) return items;

    // SKIP "New Finder Window" in legacy path too (it's in Ablage/File menu)
    const skipNewAction = isFinder && typeLabel === 'Finder';

    if (!skipNewAction) {
        items.push({
            id: 'window-new-instance',
            label: () => translate(newInstanceKey || 'menu.window.newWindow'),
            shortcut: '⌘N',
            icon: 'new',
            action: () => {
                const count = manager.getInstanceCount();
                manager.createInstance({ title: `${typeLabel} ${count + 1}` });
            },
        });
    }

    const instances = manager.getAllInstances();
    if (instances.length > 1) {
        items.push({ type: 'separator' });
        instances.forEach((instance: any, index: number) => {
            const isActive = manager.getActiveInstance()?.instanceId === instance.instanceId;
            // Normalize label to always include index-based numbering for stable UI/test selection
            const numberLabel = `${typeLabel} ${index + 1}`;
            items.push({
                id: `window-instance-${instance.instanceId}`,
                label: () => `${isActive ? '✓ ' : ''}${numberLabel}`,
                shortcut: index < 9 ? `⌘${index + 1}` : undefined,
                action: () => {
                    manager.setActiveInstance(instance.instanceId);
                    // Also update visibility via MultiInstanceIntegration
                    const integration = window.multiInstanceIntegration;
                    if (integration && typeof integration.updateInstanceVisibility === 'function') {
                        // Determine type based on manager
                        let type: string | null = null;
                        if (manager === window.FinderInstanceManager) type = 'finder';
                        else if (manager === window.TerminalInstanceManager) type = 'terminal';
                        else if (manager === window.TextEditorInstanceManager) type = 'text-editor';

                        if (type) {
                            integration.updateInstanceVisibility(type);
                        }
                    }
                },
            });
        });
        items.push(
            { type: 'separator' },
            {
                id: 'window-close-all',
                label: () => translate('menu.window.closeAll'),
                icon: 'close',
                action: () => {
                    const base = translate('menu.window.closeAllConfirm');
                    const confirmMsg =
                        typeof base === 'string' && base !== 'menu.window.closeAllConfirm'
                            ? base
                            : `Close all ${typeLabel} (${instances.length})?`;
                    if (confirm(confirmMsg)) {
                        manager.destroyAllInstances();
                        // If we closed all instances for a modal-backed window, also hide the modal
                        const targetModal = context?.modalId;
                        if (targetModal) {
                            if (typeof window['API']?.window?.close === 'function') {
                                window['API'].window.close(targetModal);
                            } else {
                                const el = document.getElementById(targetModal);
                                if (el && !el.classList.contains('hidden')) {
                                    const domUtils = window.DOMUtils;
                                    if (domUtils && typeof domUtils.hide === 'function') {
                                        domUtils.hide(el);
                                    } else {
                                        el.classList.add('hidden');
                                    }
                                }
                            }
                        }
                    }
                },
            }
        );
    }
    return items;
}

type HelpMenuOverrides = {
    sectionKey?: string;
    itemKey?: string;
    infoModalId?: string;
    id?: string;
    itemIcon?: string;
};

function createHelpMenuSection(context: MenuContext, overrides: HelpMenuOverrides = {}) {
    const sectionKey = overrides.sectionKey || 'menu.sections.help';
    const itemKey = overrides.itemKey || 'menu.help.showHelp';
    const infoModalId = overrides.infoModalId || context?.modalId || null;
    return {
        id: overrides.id || 'help',
        label: () => translate(sectionKey),
        items: [
            {
                id: 'help-show-info',
                label: () => translate(itemKey),
                icon: overrides.itemIcon || 'help',
                action: () => {
                    if (window['openProgramInfoFromMenu'])
                        window['openProgramInfoFromMenu'](infoModalId);
                },
            },
        ],
    };
}

type MenuSectionBuilder = (context: MenuContext) => Record<string, unknown>[];

// --- Rendering ---
const menuDefinitions: Record<string, MenuSectionBuilder> = {
    default: buildDefaultMenuDefinition,
    'projects-modal': buildFinderMenuDefinition,
    'settings-modal': buildSettingsMenuDefinition,
    'text-modal': buildTextEditorMenuDefinition,
    // Legacy modal key kept for compatibility, now backed by PhotosWindow.
    'image-modal': buildPhotosMenuDefinition,
    'about-modal': buildAboutMenuDefinition,
    'program-info-modal': buildProgramInfoMenuDefinition,
    'terminal-modal': buildTerminalMenuDefinition,
};

let currentMenuModalId: string | null = null;

export function renderApplicationMenu(activeModalId?: string | null) {
    const container = document.getElementById('menubar-links');
    if (!container) return;
    // Detect active window type from WindowRegistry to switch menu dynamically
    const registry = window.WindowRegistry;
    const activeType = registry?.getActiveWindow?.()?.type;
    const hasExplicitModalId = typeof activeModalId === 'string' && activeModalId.length > 0;
    const isMultiWindowModalId =
        hasExplicitModalId &&
        typeof activeModalId === 'string' &&
        activeModalId.startsWith('window-');

    // Map multi-window modal IDs (or missing modal IDs) to legacy menu keys.
    // IMPORTANT: Do not override explicit legacy modal contexts like settings/about.
    if ((!hasExplicitModalId || isMultiWindowModalId) && activeType) {
        if (activeType === 'terminal') {
            activeModalId = 'terminal-modal';
        } else if (activeType === 'finder') {
            activeModalId = 'projects-modal';
        } else if (activeType === 'text-editor') {
            activeModalId = 'text-modal';
        } else if (activeType === 'photos') {
            activeModalId = 'image-modal';
        }
    }
    const modalKey = activeModalId && menuDefinitions[activeModalId] ? activeModalId : 'default';
    const builder = menuDefinitions[modalKey] || menuDefinitions.default;
    const context = createMenuContext(activeModalId || null);
    const sections =
        typeof builder === 'function' ? builder(context) : Array.isArray(builder) ? builder : [];
    container.innerHTML = '';
    menuActionHandlers.clear();
    menuActionIdCounter = 0;
    currentMenuModalId = activeModalId || null;
    if (!Array.isArray(sections) || sections.length === 0) return;
    sections.forEach((section: Record<string, unknown>, sectionIndex: number) => {
        if (!section) return;
        const items = normalizeMenuItems(
            Array.isArray(section.items) ? (section.items as unknown[]) : [],
            context
        );
        if (!items.length) return;
        const trigger = document.createElement('div');
        trigger.className = 'menubar-trigger';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'menubar-item';
        button.dataset.menubarTriggerButton = 'true';
        const label = typeof section.label === 'function' ? section.label(context) : section.label;
        button.textContent = label || '';
        const sectionId = section.id || `section-${sectionIndex}`;
        const buttonId = `menubar-menu-${sectionId}`;
        const dropdownId = `menu-dropdown-${sectionId}`;
        button.id = buttonId;
        button.setAttribute('aria-haspopup', 'menu');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', dropdownId);
        const dropdown = document.createElement('ul');
        dropdown.id = dropdownId;
        dropdown.className = 'menu-dropdown hidden';
        dropdown.setAttribute('role', 'menu');
        dropdown.setAttribute('aria-labelledby', buttonId);
        items.forEach(item => {
            if (item.type === 'separator') {
                const separator = document.createElement('li');
                separator.className = 'menu-separator';
                separator.setAttribute('role', 'separator');
                separator.setAttribute('aria-hidden', 'true');
                dropdown.appendChild(separator);
                return;
            }
            const li = document.createElement('li');
            li.setAttribute('role', 'none');
            const tagName = item.href ? 'a' : 'button';
            const actionEl = document.createElement(tagName) as
                | HTMLButtonElement
                | HTMLAnchorElement;
            actionEl.className = 'menu-item';
            if (tagName === 'button') {
                actionEl.type = 'button';
            } else if (actionEl instanceof HTMLAnchorElement) {
                actionEl.href = (item.href as string) || '#';
                if (item.external) {
                    actionEl.rel = 'noopener noreferrer';
                    actionEl.target = '_blank';
                }
            }
            const itemLabel =
                item.label !== null
                    ? typeof item.label === 'function'
                        ? item.label(context)
                        : item.label
                    : '';
            const labelSpan = document.createElement('span');
            labelSpan.className = 'menu-item-label';
            if (item.icon && window.IconSystem) {
                const iconSpan = document.createElement('span');
                iconSpan.className = 'menu-item-icon';
                const iconSvg = window.IconSystem.getMenuIconSvg
                    ? window.IconSystem.getMenuIconSvg(String(item.icon))
                    : '';
                if (window.IconSystem.renderIconIntoElement)
                    window.IconSystem.renderIconIntoElement(iconSpan, iconSvg, String(item.icon));
                labelSpan.appendChild(iconSpan);
            }
            labelSpan.appendChild(document.createTextNode(itemLabel));
            actionEl.appendChild(labelSpan);
            if (item.shortcut) {
                const shortcutSpan = document.createElement('span');
                shortcutSpan.className = 'menu-item-shortcut';
                shortcutSpan.textContent =
                    typeof item.shortcut === 'function' ? item.shortcut() : item.shortcut;
                actionEl.appendChild(shortcutSpan);
            }
            actionEl.setAttribute('role', 'menuitem');
            if (item.title) actionEl.title = String(item.title);
            const isDisabled = Boolean(item.disabled);
            if (isDisabled) {
                actionEl.setAttribute('aria-disabled', 'true');
                if (tagName === 'button' && actionEl instanceof HTMLButtonElement) {
                    actionEl.disabled = true;
                }
            } else if (typeof item.action === 'function') {
                const actionId = registerMenuAction(item.action as MenuHandler);
                if (actionId) actionEl.dataset.menuAction = actionId;
            }
            if (item.href && typeof item.onClick === 'function') {
                actionEl.addEventListener('click', (event: Event) => {
                    const result = (item.onClick as (e: Event) => boolean | void)(event);
                    if (result === false) event.preventDefault();
                });
            }
            li.appendChild(actionEl);
            dropdown.appendChild(li);
        });
        if (!dropdown.childElementCount) return;
        trigger.appendChild(button);
        trigger.appendChild(dropdown);
        container.appendChild(trigger);
        if (window.bindDropdownTrigger)
            window.bindDropdownTrigger(button, { hoverRequiresOpen: true });
    });
}

export function handleMenuActionActivation(event: Event) {
    const target =
        event.target instanceof Element
            ? (event.target as Element).closest('[data-menu-action]')
            : null;
    if (!target) return;
    const actionId = target.getAttribute('data-menu-action');
    const handler = actionId ? menuActionHandlers.get(actionId) : null;
    if (typeof handler !== 'function') return;
    event.preventDefault();
    event.stopPropagation();
    if (window.hideMenuDropdowns) window.hideMenuDropdowns();
    try {
        handler();
    } catch (err) {
        logger.error('UI', 'Error executing menu action:', err);
    }
}

function closeContextWindow(context: MenuContext) {
    const dialog = context && (context.dialog as any);
    if (dialog && typeof dialog.close === 'function') dialog.close();
}

function hasAnyVisibleDialog() {
    if (!window.dialogs) return false;
    return Object.entries(window.dialogs).some(([id, d]) => {
        if (!d || typeof d.close !== 'function') return false;
        // Check that the corresponding modal element is actually visible
        const el = document.getElementById(id);
        return el ? !el.classList.contains('hidden') : false;
    });
}

function sendTextEditorMenuAction(actionType: string) {
    if (window.sendTextEditorMenuAction) window.sendTextEditorMenuAction(actionType);
}

function createMenuContext(modalId: string | null): MenuContext {
    // Allow external override but avoid self-recursion when this function is
    // hoisted onto window as a global in non-module script context.
    const extCreate = window.createMenuContext;
    if (extCreate && extCreate !== (createMenuContext as typeof extCreate)) {
        try {
            return extCreate(modalId) as MenuContext;
        } catch (e) {
            logger.warn('UI', '[Menu] createMenuContext override threw; falling back', e);
        }
    }
    return { modalId: modalId ?? undefined, dialog: null };
}

// translate() wird zentral aus i18n.ts importiert

export function refreshCurrentMenu() {
    renderApplicationMenu(currentMenuModalId);
}

export function setupInstanceManagerListeners() {
    const managers = [
        window.FinderInstanceManager,
        window.TerminalInstanceManager,
        window.TextEditorInstanceManager,
    ];
    managers.forEach(manager => {
        if (!manager || !manager.getAllInstances) return;

        // Check if methods exist before binding
        const originalCreate = manager.createInstance ? manager.createInstance.bind(manager) : null;
        const originalDestroy = manager.destroyInstance
            ? manager.destroyInstance.bind(manager)
            : null;

        if (originalCreate)
            manager.createInstance = function (...args: Parameters<typeof originalCreate>) {
                const result = originalCreate(...args);
                if (result) setTimeout(refreshCurrentMenu, 50);
                return result;
            };
        if (originalDestroy)
            manager.destroyInstance = function (...args: Parameters<typeof originalDestroy>) {
                const result = originalDestroy(...args);
                setTimeout(refreshCurrentMenu, 50);
                return result;
            };
    });
}

if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', setupInstanceManagerListeners);
else setTimeout(setupInstanceManagerListeners, 100);

window.MenuSystem = {
    renderApplicationMenu,
    handleMenuActionActivation,
    menuDefinitions,
    getCurrentMenuModalId: () => currentMenuModalId,
};
logger.debug('UI', '✅ MenuSystem loaded');

export default {};
