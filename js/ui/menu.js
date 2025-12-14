'use strict';
/*
 * src/ts/menu.ts
 * Typed port of js/menu.js
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.registerMenuAction = registerMenuAction;
exports.normalizeMenuItems = normalizeMenuItems;
exports.renderApplicationMenu = renderApplicationMenu;
exports.handleMenuActionActivation = handleMenuActionActivation;
exports.refreshCurrentMenu = refreshCurrentMenu;
exports.setupInstanceManagerListeners = setupInstanceManagerListeners;
/* eslint-disable @typescript-eslint/no-explicit-any */
const i18n_1 = require('../services/i18n');
const menuActionHandlers = new Map();
let menuActionIdCounter = 0;
function registerMenuAction(handler) {
    if (typeof handler !== 'function') return null;
    const actionId = `menu-action-${++menuActionIdCounter}`;
    menuActionHandlers.set(actionId, handler);
    return actionId;
}
function normalizeMenuItems(items, context) {
    if (!Array.isArray(items)) return [];
    const normalized = [];
    let previousWasSeparator = true;
    items.forEach(raw => {
        const item = raw;
        if (!item) return;
        if (item.type === 'separator') {
            if (previousWasSeparator) return;
            normalized.push({ type: 'separator' });
            previousWasSeparator = true;
            return;
        }
        const clone = Object.assign({}, item);
        if (typeof item.disabled === 'function') clone.disabled = item.disabled(context);
        if (typeof item.label === 'function') clone.label = item.label(context);
        if (typeof item.shortcut === 'function') clone.shortcut = item.shortcut(context);
        normalized.push(clone);
        previousWasSeparator = false;
    });
    while (normalized.length && normalized[normalized.length - 1]?.type === 'separator')
        normalized.pop();
    return normalized;
}
// --- Menu builders (ported functions simplified to reference window helpers) ---
function buildDefaultMenuDefinition(context) {
    return buildFinderMenuDefinition(context);
}
function buildFinderMenuDefinition(context) {
    return [
        {
            id: 'file',
            label: () => (0, i18n_1.translate)('menu.sections.file'),
            items: [
                {
                    id: 'finder-new-window',
                    label: () => (0, i18n_1.translate)('menu.finder.newWindow'),
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
                    label: () => (0, i18n_1.translate)('menu.finder.reload'),
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
                                console.warn('Finder reload failed', e);
                            }
                        }
                    },
                },
                { type: 'separator' },
                {
                    id: 'session-export',
                    label: () => (0, i18n_1.translate)('menu.session.export'),
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
                    label: () => (0, i18n_1.translate)('menu.session.import'),
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
                    label: () => (0, i18n_1.translate)('menu.finder.close'),
                    shortcut: '⌘W',
                    disabled: () => !(context && context.dialog),
                    icon: 'close',
                    action: () => closeContextWindow(context),
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
function buildSettingsMenuDefinition(context) {
    return [
        {
            id: 'file',
            label: () => (0, i18n_1.translate)('menu.sections.file'),
            items: [
                {
                    id: 'settings-close',
                    label: () => (0, i18n_1.translate)('menu.settings.close'),
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
function buildTextEditorMenuDefinition(context) {
    return [
        {
            id: 'file',
            label: () => (0, i18n_1.translate)('menu.sections.file'),
            items: [
                {
                    id: 'text-new',
                    label: () => (0, i18n_1.translate)('menu.text.newFile'),
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
                    label: () => (0, i18n_1.translate)('menu.text.open'),
                    shortcut: '⌘O',
                    icon: 'open',
                    action: () => sendTextEditorMenuAction('file:open'),
                },
                {
                    id: 'text-save',
                    label: () => (0, i18n_1.translate)('menu.text.save'),
                    shortcut: '⌘S',
                    icon: 'save',
                    action: () => sendTextEditorMenuAction('file:save'),
                },
            ],
        },
        {
            id: 'edit',
            label: () => (0, i18n_1.translate)('menu.sections.edit'),
            items: [
                {
                    id: 'text-undo',
                    label: () => (0, i18n_1.translate)('menu.text.undo'),
                    shortcut: '⌘Z',
                    icon: 'undo',
                    action: () => sendTextEditorMenuAction('edit:undo'),
                },
                {
                    id: 'text-redo',
                    label: () => (0, i18n_1.translate)('menu.text.redo'),
                    shortcut: '⇧⌘Z',
                    icon: 'redo',
                    action: () => sendTextEditorMenuAction('edit:redo'),
                },
                { type: 'separator' },
                {
                    id: 'text-cut',
                    label: () => (0, i18n_1.translate)('menu.text.cut'),
                    shortcut: '⌘X',
                    icon: 'cut',
                    action: () => sendTextEditorMenuAction('edit:cut'),
                },
                {
                    id: 'text-copy',
                    label: () => (0, i18n_1.translate)('menu.text.copy'),
                    shortcut: '⌘C',
                    icon: 'copy',
                    action: () => sendTextEditorMenuAction('edit:copy'),
                },
                {
                    id: 'text-paste',
                    label: () => (0, i18n_1.translate)('menu.text.paste'),
                    shortcut: '⌘V',
                    icon: 'paste',
                    action: () => sendTextEditorMenuAction('edit:paste'),
                },
                { type: 'separator' },
                {
                    id: 'text-select-all',
                    label: () => (0, i18n_1.translate)('menu.text.selectAll'),
                    shortcut: '⌘A',
                    icon: 'selectAll',
                    action: () => sendTextEditorMenuAction('edit:selectAll'),
                },
            ],
        },
        {
            id: 'view',
            label: () => (0, i18n_1.translate)('menu.sections.view'),
            items: [
                {
                    id: 'text-toggle-wrap',
                    label: () => (0, i18n_1.translate)('menu.text.toggleWrap'),
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
function buildImageViewerMenuDefinition(context) {
    const state = window['getImageViewerState']
        ? window['getImageViewerState']()
        : { hasImage: false };
    return [
        {
            id: 'file',
            label: () => (0, i18n_1.translate)('menu.sections.file'),
            items: [
                {
                    id: 'image-open-tab',
                    label: () => (0, i18n_1.translate)('menu.image.openInTab'),
                    disabled: !state.hasImage,
                    icon: 'imageOpen',
                    action: () => {
                        if (window['openActiveImageInNewTab']) window['openActiveImageInNewTab']();
                    },
                },
                {
                    id: 'image-download',
                    label: () => (0, i18n_1.translate)('menu.image.saveImage'),
                    disabled: !state.hasImage,
                    icon: 'download',
                    action: () => {
                        if (window['downloadActiveImage']) window['downloadActiveImage']();
                    },
                },
                { type: 'separator' },
                {
                    id: 'image-close',
                    label: () => (0, i18n_1.translate)('menu.image.close'),
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
function buildAboutMenuDefinition(context) {
    return [
        {
            id: 'file',
            label: () => (0, i18n_1.translate)('menu.sections.file'),
            items: [
                {
                    id: 'about-close',
                    label: () => (0, i18n_1.translate)('menu.about.close'),
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
function buildProgramInfoMenuDefinition(context) {
    return [
        {
            id: 'file',
            label: () => (0, i18n_1.translate)('menu.sections.file'),
            items: [
                {
                    id: 'program-info-close',
                    label: () => (0, i18n_1.translate)('menu.programInfo.close'),
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
function buildTerminalMenuDefinition(context) {
    // Determine active TerminalWindow (multi-window system)
    const registry = window['WindowRegistry'];
    const activeWin = registry?.getActiveWindow?.();
    const isTerminalActive = activeWin?.type === 'terminal';
    const terminalWin = isTerminalActive ? activeWin : null;
    return [
        {
            id: 'file',
            label: () => (0, i18n_1.translate)('menu.sections.file'),
            items: [
                // New Terminal Window
                {
                    id: 'terminal-new-window',
                    label: () => (0, i18n_1.translate)('menu.terminal.newWindow'),
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
                    label: () => (0, i18n_1.translate)('menu.terminal.newTab'),
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
                    label: () => (0, i18n_1.translate)('menu.terminal.duplicateTab'),
                    shortcut: '⌥⌘D',
                    icon: 'tabDuplicate',
                    disabled: () => !terminalWin || !terminalWin.activeTabId,
                    action: () => {
                        const activeId = terminalWin?.activeTabId;
                        if (!activeId) return;
                        const tabs = terminalWin.tabs;
                        const orig = tabs.get(activeId);
                        if (orig && terminalWin.createSession) {
                            const newSession = terminalWin.createSession(orig.title + ' Copy');
                            // Optionally copy buffer if available
                            if (orig.buffer && newSession && newSession.appendOutput) {
                                newSession.appendOutput(orig.buffer);
                            }
                        }
                    },
                },
                { type: 'separator' },
                // Close current tab (⌘W). If only one tab: close window.
                {
                    id: 'terminal-close-tab',
                    label: () => (0, i18n_1.translate)('menu.terminal.closeTab'),
                    shortcut: '⌘W',
                    icon: 'tabClose',
                    disabled: () => !terminalWin || !terminalWin.activeTabId,
                    action: () => {
                        if (!terminalWin) return;
                        const tabs = terminalWin.tabs;
                        if (tabs.size <= 1) {
                            terminalWin.close?.();
                            return;
                        }
                        const activeId = terminalWin.activeTabId;
                        if (activeId) terminalWin.removeTab(activeId);
                    },
                },
                // Close entire window (⇧⌘W)
                {
                    id: 'terminal-close-window',
                    label: () => (0, i18n_1.translate)('menu.terminal.closeWindow'),
                    shortcut: '⇧⌘W',
                    icon: 'close',
                    disabled: () => !(context && context.dialog),
                    action: () => closeContextWindow(context),
                },
            ],
        },
        {
            id: 'edit',
            label: () => (0, i18n_1.translate)('menu.sections.edit'),
            items: [
                // Clear terminal scrollback/output
                {
                    id: 'terminal-clear',
                    label: () => (0, i18n_1.translate)('menu.terminal.clear'),
                    shortcut: '⌘K',
                    icon: 'clear',
                    action: () => {
                        if (!terminalWin) return;
                        const activeId = terminalWin.activeTabId;
                        const tabs = terminalWin.tabs;
                        const tab = activeId ? tabs.get(activeId) : null;
                        const inst = tab || null;
                        if (inst?.clearOutput) inst.clearOutput();
                    },
                },
                { type: 'separator' },
                // Basic clipboard actions (delegate to focused input)
                {
                    id: 'terminal-copy',
                    label: () => (0, i18n_1.translate)('menu.terminal.copy'),
                    shortcut: '⌘C',
                    icon: 'copy',
                    action: () => {
                        const input = document.querySelector('#terminal-input');
                        if (input) input.select();
                        document.execCommand?.('copy');
                    },
                },
                {
                    id: 'terminal-paste',
                    label: () => (0, i18n_1.translate)('menu.terminal.paste'),
                    shortcut: '⌘V',
                    icon: 'paste',
                    action: async () => {
                        const input = document.querySelector('#terminal-input');
                        if (!input) return;
                        try {
                            const text = await navigator.clipboard.readText();
                            input.value += text;
                            input.dispatchEvent(new Event('input'));
                        } catch (e) {
                            console.warn('Clipboard read failed', e);
                        }
                    },
                },
                {
                    id: 'terminal-select-all',
                    label: () => (0, i18n_1.translate)('menu.terminal.selectAll'),
                    shortcut: '⌘A',
                    icon: 'selectAll',
                    action: () => {
                        const input = document.querySelector('#terminal-input');
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
function createWindowMenuSection(context) {
    return {
        id: 'window',
        label: () => (0, i18n_1.translate)('menu.sections.window'),
        items: getWindowMenuItems(context),
    };
}
function getWindowMenuItems(context) {
    const dialog = context && context.dialog;
    const hasDialog = Boolean(dialog && typeof dialog.close === 'function');
    const items = [
        {
            id: 'window-minimize',
            label: () => (0, i18n_1.translate)('menu.window.minimize'),
            shortcut: '⌘M',
            disabled: !hasDialog,
            icon: 'windowMinimize',
            action: () => {
                if (dialog && typeof dialog.minimize === 'function') dialog.minimize();
            },
        },
        {
            id: 'window-zoom',
            label: () => (0, i18n_1.translate)('menu.window.zoom'),
            shortcut: '⌃⌘F',
            disabled: !hasDialog,
            icon: 'windowZoom',
            action: () => {
                if (dialog && typeof dialog.toggleMaximize === 'function') dialog.toggleMaximize();
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
            label: () => (0, i18n_1.translate)('menu.window.bringToFront'),
            disabled: !hasAnyVisibleDialog(),
            icon: 'windowFront',
            action: () => {
                if (window['bringAllWindowsToFront']) window['bringAllWindowsToFront']();
            },
        },
        { type: 'separator' },
        {
            id: 'window-close',
            label: () => (0, i18n_1.translate)('menu.window.close'),
            shortcut: '⌘W',
            disabled: !hasDialog,
            icon: 'close',
            action: () => closeContextWindow(context),
        }
    );
    return items;
}
function getMultiInstanceMenuItems(context) {
    const items = [];
    let manager = null;
    let typeLabel = null;
    let newInstanceKey = null;
    const modalId = context?.modalId;
    // Also derive active window type from WindowRegistry for multi-window Terminal
    const registry = window['WindowRegistry'];
    const activeWindowType = registry?.getActiveWindow?.()?.type || null;
    // Use WindowRegistry for Terminal (modern multi-window system)
    if (modalId === 'terminal-modal' || activeWindowType === 'terminal') {
        const terminalWindow = window['TerminalWindow'];
        if (registry && terminalWindow) {
            typeLabel = 'Terminal';
            newInstanceKey = 'menu.window.newTerminal';
            items.push({
                id: 'window-new-instance',
                label: () => (0, i18n_1.translate)(newInstanceKey || 'menu.window.newWindow'),
                shortcut: '⌘N',
                icon: 'new',
                action: () => {
                    const count = registry.getWindowCount?.('terminal') || 0;
                    terminalWindow.create({ title: `Terminal ${count + 1}` });
                },
            });
            const windows = registry.getAllWindows?.('terminal') || [];
            if (windows.length > 1) {
                items.push({ type: 'separator' });
                windows.forEach((win, index) => {
                    const isActive = registry.getActiveWindow?.()?.windowId === win.windowId;
                    const numberLabel = `Terminal ${index + 1}`;
                    items.push({
                        id: `window-instance-${win.windowId}`,
                        label: () => `${isActive ? '✓ ' : ''}${numberLabel}`,
                        shortcut: index < 9 ? `⌘${index + 1}` : undefined,
                        action: () => {
                            win.focus?.();
                        },
                    });
                });
                items.push(
                    { type: 'separator' },
                    {
                        id: 'window-close-all',
                        label: () => (0, i18n_1.translate)('menu.window.closeAll'),
                        icon: 'close',
                        action: () => {
                            if (confirm(`Alle ${windows.length} Terminal-Fenster schließen?`)) {
                                windows.forEach(w => w.close?.());
                            }
                        },
                    }
                );
            }
            return items;
        }
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
    items.push({
        id: 'window-new-instance',
        label: () => (0, i18n_1.translate)(newInstanceKey || 'menu.window.newWindow'),
        shortcut: '⌘N',
        icon: 'new',
        action: () => {
            const count = manager.getInstanceCount();
            manager.createInstance({ title: `${typeLabel} ${count + 1}` });
        },
    });
    const instances = manager.getAllInstances();
    if (instances.length > 1) {
        items.push({ type: 'separator' });
        instances.forEach((instance, index) => {
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
                        let type = null;
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
                label: () => (0, i18n_1.translate)('menu.window.closeAll'),
                icon: 'close',
                action: () => {
                    const base = (0, i18n_1.translate)('menu.window.closeAllConfirm');
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
function createHelpMenuSection(context, overrides = {}) {
    const sectionKey = overrides.sectionKey || 'menu.sections.help';
    const itemKey = overrides.itemKey || 'menu.help.showHelp';
    const infoModalId = overrides.infoModalId || context.modalId || null;
    return {
        id: overrides.id || 'help',
        label: () => (0, i18n_1.translate)(sectionKey),
        items: [
            {
                id: 'help-show-info',
                label: () => (0, i18n_1.translate)(itemKey),
                icon: overrides.itemIcon || 'help',
                action: () => {
                    if (window['openProgramInfoFromMenu'])
                        window['openProgramInfoFromMenu'](infoModalId);
                },
            },
        ],
    };
}
// --- Rendering ---
const menuDefinitions = {
    default: buildDefaultMenuDefinition,
    'projects-modal': buildFinderMenuDefinition,
    'settings-modal': buildSettingsMenuDefinition,
    'text-modal': buildTextEditorMenuDefinition,
    'image-modal': buildImageViewerMenuDefinition,
    'about-modal': buildAboutMenuDefinition,
    'program-info-modal': buildProgramInfoMenuDefinition,
    'terminal-modal': buildTerminalMenuDefinition,
};
let currentMenuModalId = null;
function renderApplicationMenu(activeModalId) {
    const container = document.getElementById('menubar-links');
    if (!container) return;
    // Detect active window type from WindowRegistry to switch menu dynamically
    const registry = window.WindowRegistry;
    const activeType = registry?.getActiveWindow?.()?.type;
    // If a Terminal window is focused but no explicit terminal-modal passed, force terminal modal key
    if (activeType === 'terminal' && activeModalId !== 'terminal-modal') {
        activeModalId = 'terminal-modal';
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
    sections.forEach((section, sectionIndex) => {
        if (!section) return;
        const items = normalizeMenuItems(section.items, context);
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
            const actionEl = document.createElement(tagName);
            actionEl.className = 'menu-item';
            if (tagName === 'button') actionEl.type = 'button';
            else {
                actionEl.href = item.href;
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
                    ? window.IconSystem.getMenuIconSvg(item.icon)
                    : '';
                if (window.IconSystem.renderIconIntoElement)
                    window.IconSystem.renderIconIntoElement(iconSpan, iconSvg, item.icon);
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
            if (item.title) actionEl.title = item.title;
            const isDisabled = Boolean(item.disabled);
            if (isDisabled) {
                actionEl.setAttribute('aria-disabled', 'true');
                if (tagName === 'button') actionEl.disabled = true;
            } else if (typeof item.action === 'function') {
                const actionId = registerMenuAction(item.action);
                if (actionId) actionEl.dataset.menuAction = actionId;
            }
            if (item.href && typeof item.onClick === 'function') {
                actionEl.addEventListener('click', event => {
                    const result = item.onClick(event);
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
function handleMenuActionActivation(event) {
    const target =
        event.target instanceof Element ? event.target.closest('[data-menu-action]') : null;
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
        console.error('Error executing menu action:', err);
    }
}
function closeContextWindow(context) {
    const dialog = context && context.dialog;
    if (dialog && typeof dialog.close === 'function') dialog.close();
}
function hasAnyVisibleDialog() {
    if (!window['dialogs']) return false;
    return Object.values(window['dialogs']).some(d =>
        d && typeof d.isOpen === 'function' ? d.isOpen() : Boolean(d && d.isOpen)
    );
}
function sendTextEditorMenuAction(actionType) {
    if (window.sendTextEditorMenuAction) window.sendTextEditorMenuAction(actionType);
}
function createMenuContext(modalId) {
    const w = window;
    // Allow external override but avoid self-recursion when this function is
    // hoisted onto window as a global in non-module script context.
    if (w.createMenuContext && w.createMenuContext !== createMenuContext) {
        try {
            return w.createMenuContext(modalId);
        } catch (e) {
            console.warn('[Menu] createMenuContext override threw; falling back', e);
        }
    }
    return { modalId: modalId, dialog: null };
}
// translate() wird zentral aus i18n.ts importiert
function refreshCurrentMenu() {
    renderApplicationMenu(currentMenuModalId);
}
function setupInstanceManagerListeners() {
    const managers = [
        window['FinderInstanceManager'],
        window['TerminalInstanceManager'],
        window['TextEditorInstanceManager'],
    ];
    managers.forEach(manager => {
        if (!manager || !manager.getAllInstances) return;
        const originalCreate = manager.createInstance;
        const originalDestroy = manager.destroyInstance;
        const originalDestroyAll = manager.destroyAllInstances;
        if (originalCreate)
            manager.createInstance = function (...args) {
                const result = originalCreate.apply(this, args);
                if (result) setTimeout(refreshCurrentMenu, 50);
                return result;
            };
        if (originalDestroy)
            manager.destroyInstance = function (...args) {
                const result = originalDestroy.apply(this, args);
                setTimeout(refreshCurrentMenu, 50);
                return result;
            };
        if (originalDestroyAll)
            manager.destroyAllInstances = function (...args) {
                const result = originalDestroyAll.apply(this, args);
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
console.log('✅ MenuSystem loaded');
exports.default = {};
//# sourceMappingURL=menu.js.map
