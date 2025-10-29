/*
 * src/ts/menu.ts
 * Typed port of js/menu.js
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { translate } from './i18n.js';

// Allow dynamic access on window via string keys for legacy globals
declare global {
    interface Window {
        [key: string]: any;
    }
}

type MenuHandler = (...args: any[]) => unknown;
const menuActionHandlers = new Map<string, MenuHandler>();
let menuActionIdCounter = 0;

type MenuContext = {
    modalId?: string;
    dialog?: { close?: () => void; minimize?: () => void; toggleMaximize?: () => void } | null;
} | null;

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
        const item = raw as any;
        if (!item) return;
        if (item.type === 'separator') {
            if (previousWasSeparator) return;
            normalized.push({ type: 'separator' });
            previousWasSeparator = true;
            return;
        }
        const clone = Object.assign({}, item) as Record<string, unknown>;
        if (typeof item.disabled === 'function')
            (clone.disabled as unknown) = (item.disabled as (ctx: MenuContext) => boolean)(context);
        if (typeof item.label === 'function')
            (clone.label as unknown) = (item.label as (ctx: MenuContext) => string)(context);
        if (typeof item.shortcut === 'function')
            (clone.shortcut as unknown) = (item.shortcut as (ctx: MenuContext) => string)(context);
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
                        const mgr = window['FinderInstanceManager'];
                        if (mgr && typeof mgr.createInstance === 'function') {
                            const count = mgr.getInstanceCount
                                ? mgr.getInstanceCount()
                                : mgr.getAllInstances?.().length || 0;
                            mgr.createInstance({ title: `Finder ${count + 1}` });
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
                                console.warn('Finder reload failed', e);
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
                    disabled: () => !(context && context.dialog),
                    icon: 'close',
                    action: () => closeContextWindow(context),
                },
            ],
        },
        createWindowMenuSection(context),
        createHelpMenuSection(context, {
            itemKey: 'menu.finder.help',
            infoModalId: 'finder-modal',
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
                    action: () => sendTextEditorMenuAction('file:new'),
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

function buildImageViewerMenuDefinition(context: MenuContext) {
    const state = window['getImageViewerState']
        ? window['getImageViewerState']()
        : { hasImage: false };
    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'image-open-tab',
                    label: () => translate('menu.image.openInTab'),
                    disabled: !state.hasImage,
                    icon: 'imageOpen',
                    action: () => {
                        if (window['openActiveImageInNewTab']) window['openActiveImageInNewTab']();
                    },
                },
                {
                    id: 'image-download',
                    label: () => translate('menu.image.saveImage'),
                    disabled: !state.hasImage,
                    icon: 'download',
                    action: () => {
                        if (window['downloadActiveImage']) window['downloadActiveImage']();
                    },
                },
                { type: 'separator' },
                {
                    id: 'image-close',
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

function buildTerminalMenuDefinition(context: any) {
    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'terminal-new-window',
                    label: () => translate('menu.terminal.newWindow'),
                    shortcut: '⌘N',
                    icon: 'terminal',
                    action: () => {
                        if (
                            window['TerminalInstanceManager'] &&
                            typeof window['TerminalInstanceManager'].createInstance === 'function'
                        )
                            window['TerminalInstanceManager'].createInstance();
                    },
                },
                { type: 'separator' },
                {
                    id: 'terminal-close',
                    label: () => translate('menu.terminal.close'),
                    shortcut: '⌘W',
                    disabled: () => !(context && context.dialog),
                    icon: 'close',
                    action: () => closeContextWindow(context),
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
                        if (context && context.instanceId && window['TerminalInstanceManager']) {
                            const instance = window['TerminalInstanceManager'].getInstance(
                                context.instanceId
                            );
                            if (instance && instance.clearOutput) instance.clearOutput();
                        }
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
    const dialog = context && (context.dialog as any);
    const hasDialog = Boolean(dialog && typeof dialog.close === 'function');
    const items: any[] = [
        {
            id: 'window-minimize',
            label: () => translate('menu.window.minimize'),
            shortcut: '⌘M',
            disabled: !hasDialog,
            icon: 'windowMinimize',
            action: () => {
                if (dialog && typeof dialog.minimize === 'function') dialog.minimize();
            },
        },
        {
            id: 'window-zoom',
            label: () => translate('menu.window.zoom'),
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
            label: () => translate('menu.window.bringToFront'),
            disabled: !hasAnyVisibleDialog(),
            icon: 'windowFront',
            action: () => {
                if (window['bringAllWindowsToFront']) window['bringAllWindowsToFront']();
            },
        },
        { type: 'separator' },
        {
            id: 'window-close',
            label: () => translate('menu.window.close'),
            shortcut: '⌘W',
            disabled: !hasDialog,
            icon: 'close',
            action: () => closeContextWindow(context),
        }
    );
    return items;
}

function getMultiInstanceMenuItems(context: MenuContext) {
    const items: any[] = [];
    let manager: any = null;
    let typeLabel: string | null = null;
    let newInstanceKey: string | null = null;
    const modalId = context?.modalId;
    if (
        (modalId === 'finder-modal' || modalId === 'projects-modal') &&
        window['FinderInstanceManager']
    ) {
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
        label: () => translate(newInstanceKey || 'menu.window.newWindow'),
        shortcut: '⌘N',
        icon: 'new',
        action: () => {
            const count = manager.getInstanceCount();
            manager.createInstance({ title: `${typeLabel} ${count + 1}` } as any);
        },
    });
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
                    const integration = (window as any).multiInstanceIntegration;
                    if (integration && typeof integration.updateInstanceVisibility === 'function') {
                        // Determine type based on manager
                        let type: string | null = null;
                        if (manager === (window as any).FinderInstanceManager) type = 'finder';
                        else if (manager === (window as any).TerminalInstanceManager)
                            type = 'terminal';
                        else if (manager === (window as any).TextEditorInstanceManager)
                            type = 'text-editor';

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
                        const targetModal = (context as any)?.modalId;
                        if (targetModal) {
                            if (typeof window['API']?.window?.close === 'function') {
                                window['API'].window.close(targetModal);
                            } else {
                                const el = document.getElementById(targetModal);
                                if (el && !el.classList.contains('hidden')) {
                                    const domUtils = (window as any).DOMUtils;
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

function createHelpMenuSection(context: any, overrides: any = {}) {
    const sectionKey = overrides.sectionKey || 'menu.sections.help';
    const itemKey = overrides.itemKey || 'menu.help.showHelp';
    const infoModalId = overrides.infoModalId || context.modalId || null;
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

// --- Rendering ---
const menuDefinitions: any = {
    default: buildDefaultMenuDefinition,
    'finder-modal': buildFinderMenuDefinition,
    'projects-modal': buildFinderMenuDefinition,
    'settings-modal': buildSettingsMenuDefinition,
    'text-modal': buildTextEditorMenuDefinition,
    'image-modal': buildImageViewerMenuDefinition,
    'about-modal': buildAboutMenuDefinition,
    'program-info-modal': buildProgramInfoMenuDefinition,
    'terminal-modal': buildTerminalMenuDefinition,
};

let currentMenuModalId: string | null = null;

export function renderApplicationMenu(activeModalId?: string | null) {
    const container = document.getElementById('menubar-links');
    if (!container) return;
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
    sections.forEach((section: any, sectionIndex: number) => {
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
            const actionEl = document.createElement(tagName) as any;
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
            if (item.icon && (window as any).IconSystem) {
                const iconSpan = document.createElement('span');
                iconSpan.className = 'menu-item-icon';
                const iconSvg = (window as any).IconSystem.getMenuIconSvg
                    ? (window as any).IconSystem.getMenuIconSvg(item.icon)
                    : '';
                if ((window as any).IconSystem.renderIconIntoElement)
                    (window as any).IconSystem.renderIconIntoElement(iconSpan, iconSvg, item.icon);
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
        if ((window as any).bindDropdownTrigger)
            (window as any).bindDropdownTrigger(button, { hoverRequiresOpen: true });
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
    if ((window as any).hideMenuDropdowns) (window as any).hideMenuDropdowns();
    try {
        handler();
    } catch (err) {
        console.error('Error executing menu action:', err);
    }
}

function closeContextWindow(context: any) {
    const dialog = context && context.dialog;
    if (dialog && typeof dialog.close === 'function') dialog.close();
}

function hasAnyVisibleDialog() {
    if (!window['dialogs']) return false;
    return Object.values(window['dialogs']).some((d: any) =>
        d && typeof d.isOpen === 'function' ? d.isOpen() : Boolean(d && d.isOpen)
    );
}

function sendTextEditorMenuAction(actionType: string) {
    if ((window as any).sendTextEditorMenuAction)
        (window as any).sendTextEditorMenuAction(actionType);
}

function createMenuContext(modalId: string | null) {
    const w = window as any;
    // Allow external override but avoid self-recursion when this function is
    // hoisted onto window as a global in non-module script context.
    if (w.createMenuContext && w.createMenuContext !== (createMenuContext as any)) {
        try {
            return w.createMenuContext(modalId);
        } catch (e) {
            console.warn('[Menu] createMenuContext override threw; falling back', e);
        }
    }
    return { modalId: modalId, dialog: null };
}

// translate() wird zentral aus i18n.ts importiert

export function refreshCurrentMenu() {
    renderApplicationMenu(currentMenuModalId);
}

export function setupInstanceManagerListeners() {
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
            manager.createInstance = function (...args: any[]) {
                const result = originalCreate.apply(this, args);
                if (result) setTimeout(refreshCurrentMenu, 50);
                return result;
            };
        if (originalDestroy)
            manager.destroyInstance = function (...args: any[]) {
                const result = originalDestroy.apply(this, args);
                setTimeout(refreshCurrentMenu, 50);
                return result;
            };
        if (originalDestroyAll)
            manager.destroyAllInstances = function (...args: any[]) {
                const result = originalDestroyAll.apply(this, args);
                setTimeout(refreshCurrentMenu, 50);
                return result;
            };
    });
}

if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', setupInstanceManagerListeners);
else setTimeout(setupInstanceManagerListeners, 100);

// Export
declare global {
    interface Window {
        MenuSystem?: any;
    }
}
(window as any).MenuSystem = {
    renderApplicationMenu,
    handleMenuActionActivation,
    menuDefinitions,
    getCurrentMenuModalId: () => currentMenuModalId,
};
console.log('✅ MenuSystem loaded');

export default {};
