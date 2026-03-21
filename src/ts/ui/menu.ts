/*
 * src/ts/menu.ts
 * Typed port of js/menu.js
 */

import { translate } from '../services/i18n';
import logger from '../core/logger.js';
import { getLogicalViewportWidth, getLogicalViewportHeight } from '../utils/viewport.js';

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

type WindowLayoutController = WindowMenuController & {
    element?: HTMLElement | null;
    isMaximized?: boolean;
    position?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    bringToFront?: () => void;
    _saveState?: () => void;
};

const MULTI_WINDOW_MODAL_TYPE_MAP: Record<string, string> = {
    'projects-modal': 'finder',
    'preview-modal': 'preview',
    terminal: 'terminal',
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

function buildPreviewMenuDefinition(context: MenuContext) {
    const state = (
        window['getImageViewerState'] ? window['getImageViewerState']() : { hasImage: false }
    ) as { hasImage?: boolean };
    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'preview-open-tab',
                    label: () => translate('menu.image.openInTab'),
                    disabled: !state?.hasImage,
                    icon: 'imageOpen',
                    action: () => {
                        if (window['openActiveImageInNewTab']) window['openActiveImageInNewTab']();
                    },
                },
                {
                    id: 'preview-download',
                    label: () => translate('menu.image.saveImage'),
                    disabled: !state?.hasImage,
                    icon: 'download',
                    action: () => {
                        if (window['downloadActiveImage']) window['downloadActiveImage']();
                    },
                },
                { type: 'separator' },
                {
                    id: 'preview-close',
                    label: () => translate('menu.image.close'),
                    shortcut: '⌘W',
                    disabled: () => !(context && resolveWindowMenuController(context)),
                    icon: 'close',
                    action: () => closeContextWindow(context),
                },
            ],
        },
        createWindowMenuSection(context),
        createHelpMenuSection(context, {
            itemKey: 'menu.image.help',
            infoModalId: 'preview-modal',
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
                        } else {
                            logger.warn(
                                'UI',
                                '[Menu] TerminalWindow is unavailable; skipping legacy terminal fallback'
                            );
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
            infoModalId: 'terminal',
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

function focusNextWindow(appType?: string): void {
    const registry = window['WindowRegistry'];
    if (!registry || typeof registry.getAllWindows !== 'function') return;

    const windows = (registry.getAllWindows(appType) || []) as Array<{
        id?: string;
        zIndex?: number;
        bringToFront?: () => void;
        focus?: () => void;
    }>;
    if (windows.length < 2) return;

    const sorted = [...windows].sort((a, b) => (a?.zIndex || 0) - (b?.zIndex || 0));
    const active = registry.getActiveWindow?.();
    const currentIndex = sorted.findIndex(win => !!active && win.id === active.id);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % sorted.length : 0;
    const nextWindow = sorted[nextIndex];
    if (!nextWindow) return;

    if (typeof nextWindow.bringToFront === 'function') {
        nextWindow.bringToFront();
        return;
    }
    if (typeof nextWindow.focus === 'function') {
        nextWindow.focus();
        return;
    }
    if (typeof registry.setActiveWindow === 'function') {
        registry.setActiveWindow(nextWindow.id ?? null);
    }
}

function getWindowTabNavigationState(windowController: WindowMenuController): {
    canNavigate: boolean;
    canDetach: boolean;
    previous?: () => void;
    next?: () => void;
} {
    const w = windowController as unknown as {
        tabs?: Map<string, unknown>;
        activeTabId?: string | null;
        setActiveTab?: (tabId: string) => void;
    };
    if (!(w?.tabs instanceof Map) || typeof w?.setActiveTab !== 'function') {
        return { canNavigate: false, canDetach: false };
    }

    const tabIds = Array.from(w.tabs.keys());
    if (tabIds.length <= 1) {
        return { canNavigate: false, canDetach: false };
    }

    const activeTabId = w.activeTabId ?? tabIds[0] ?? null;
    const currentIndex = activeTabId ? Math.max(0, tabIds.indexOf(activeTabId)) : 0;
    return {
        canNavigate: true,
        canDetach: false,
        previous: () => {
            const nextIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
            const nextTabId = tabIds[nextIndex];
            if (nextTabId) w.setActiveTab?.(nextTabId);
        },
        next: () => {
            const nextIndex = (currentIndex + 1) % tabIds.length;
            const nextTabId = tabIds[nextIndex];
            if (nextTabId) w.setActiveTab?.(nextTabId);
        },
    };
}

function applyWindowLayout(
    windowController: WindowMenuController,
    bounds: { x: number; y: number; width: number; height: number },
    options: { overrideMinConstraints?: boolean; resetMinConstraints?: boolean } = {}
): void {
    const w = windowController as WindowLayoutController;
    const el = w?.element;
    if (!el) return;

    if (typeof w.isMaximized === 'boolean') {
        w.isMaximized = false;
    }

    const minWidthPx = options.overrideMinConstraints ? 120 : 320;
    const minHeightPx = options.overrideMinConstraints ? 120 : 240;

    const normalized = {
        x: Math.max(0, Math.round(bounds.x)),
        y: Math.max(0, Math.round(bounds.y)),
        width: Math.max(minWidthPx, Math.round(bounds.width)),
        height: Math.max(minHeightPx, Math.round(bounds.height)),
    };

    // Some window shells define CSS/Tailwind min-w/min-h classes.
    // For explicit move/resize presets we temporarily lower those constraints so
    // left/right/top/bottom layouts can actually change the size on smaller screens.
    if (options.overrideMinConstraints) {
        el.style.setProperty('min-width', `${normalized.width}px`, 'important');
        el.style.setProperty('min-height', `${normalized.height}px`, 'important');
    } else if (options.resetMinConstraints) {
        el.style.removeProperty('min-width');
        el.style.removeProperty('min-height');
    }

    el.style.left = `${normalized.x}px`;
    el.style.top = `${normalized.y}px`;
    el.style.width = `${normalized.width}px`;
    el.style.height = `${normalized.height}px`;

    if (w.position) {
        w.position.x = normalized.x;
        w.position.y = normalized.y;
        w.position.width = normalized.width;
        w.position.height = normalized.height;
    }

    w.bringToFront?.();
    w._saveState?.();
}

function getWindowWorkArea(): { x: number; y: number; width: number; height: number } {
    const top = Math.max(0, Math.round(window.getMenuBarBottom?.() || 0));
    const bottomReserve = Math.max(0, Math.round(window.getDockReservedBottom?.() || 0));
    const width = Math.max(640, Math.round(getLogicalViewportWidth() || 1280));
    const height = Math.max(
        400,
        Math.round((getLogicalViewportHeight() || 800) - top - bottomReserve)
    );
    return { x: 0, y: top, width, height };
}

function applyMoveResizePreset(
    windowController: WindowMenuController,
    preset: 'leftHalf' | 'rightHalf' | 'topHalf' | 'bottomHalf' | 'standard'
): void {
    const area = getWindowWorkArea();
    const halfWidth = Math.round(area.width / 2);
    const halfHeight = Math.round(area.height / 2);
    const targetHalfWidth = Math.min(area.width, Math.max(320, halfWidth));
    const targetHalfHeight = Math.min(area.height, Math.max(200, halfHeight));

    if (preset === 'leftHalf') {
        applyWindowLayout(
            windowController,
            {
                x: area.x,
                y: area.y,
                width: targetHalfWidth,
                height: area.height,
            },
            { overrideMinConstraints: true }
        );
        return;
    }
    if (preset === 'rightHalf') {
        applyWindowLayout(
            windowController,
            {
                x: area.x + area.width - targetHalfWidth,
                y: area.y,
                width: targetHalfWidth,
                height: area.height,
            },
            { overrideMinConstraints: true }
        );
        return;
    }
    if (preset === 'topHalf') {
        applyWindowLayout(
            windowController,
            {
                x: area.x,
                y: area.y,
                width: area.width,
                height: targetHalfHeight,
            },
            { overrideMinConstraints: true }
        );
        return;
    }
    if (preset === 'bottomHalf') {
        applyWindowLayout(
            windowController,
            {
                x: area.x,
                y: area.y + area.height - targetHalfHeight,
                width: area.width,
                height: targetHalfHeight,
            },
            { overrideMinConstraints: true }
        );
        return;
    }

    const targetWidth = Math.round(Math.min(1100, area.width * 0.72));
    const targetHeight = Math.round(Math.min(760, area.height * 0.78));
    applyWindowLayout(
        windowController,
        {
            x: area.x + (area.width - targetWidth) / 2,
            y: area.y + (area.height - targetHeight) / 2,
            width: targetWidth,
            height: targetHeight,
        },
        { resetMinConstraints: true }
    );
}

function applyTilePreset(windowController: WindowMenuController, side: 'left' | 'right'): void {
    applyMoveResizePreset(windowController, side === 'left' ? 'leftHalf' : 'rightHalf');
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

    if (isFinder) {
        const tabState = getWindowTabNavigationState(windowController);
        const registryActive = window['WindowRegistry']?.getActiveWindow?.() as
            | WindowLayoutController
            | undefined;
        const registryFinderFallback = (window['WindowRegistry']?.getAllWindows?.('finder')?.[0] ||
            null) as WindowLayoutController | null;
        const controllerTarget = windowController as WindowLayoutController;
        const modalFallbackElement = context?.modalId
            ? document.getElementById(context.modalId)
            : null;
        const layoutTarget: WindowLayoutController | null =
            (registryActive && registryActive.element
                ? registryActive
                : registryFinderFallback && registryFinderFallback.element
                  ? registryFinderFallback
                  : controllerTarget?.element
                    ? controllerTarget
                    : modalFallbackElement
                      ? ({ element: modalFallbackElement } as WindowLayoutController)
                      : null) || null;
        const hasLayoutTarget = !!layoutTarget?.element;
        const finderItems: Record<string, unknown>[] = [
            {
                id: 'window-put-in-dock',
                label: () => translate('menu.window.putInDock'),
                shortcut: '⌘M',
                disabled: !canMinimize,
                icon: 'windowMinimize',
                action: () => {
                    windowController?.minimize?.();
                },
            },
            {
                id: 'window-zoom-alt',
                label: () => translate('menu.window.zoomAlt'),
                disabled: !canZoom,
                icon: 'windowZoom',
                action: () => {
                    windowController?.toggleMaximize?.();
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
            { type: 'separator' },
            {
                id: 'window-move-resize',
                label: () => translate('menu.window.moveAndResize'),
                disabled: !hasLayoutTarget,
                submenu: true,
                submenuItems: [
                    {
                        id: 'window-move-left-half',
                        label: () => translate('menu.window.moveLeftHalf'),
                        action: () => applyMoveResizePreset(layoutTarget, 'leftHalf'),
                    },
                    {
                        id: 'window-move-right-half',
                        label: () => translate('menu.window.moveRightHalf'),
                        action: () => applyMoveResizePreset(layoutTarget, 'rightHalf'),
                    },
                    {
                        id: 'window-move-top-half',
                        label: () => translate('menu.window.moveTopHalf'),
                        action: () => applyMoveResizePreset(layoutTarget, 'topHalf'),
                    },
                    {
                        id: 'window-move-bottom-half',
                        label: () => translate('menu.window.moveBottomHalf'),
                        action: () => applyMoveResizePreset(layoutTarget, 'bottomHalf'),
                    },
                    { type: 'separator' },
                    {
                        id: 'window-move-standard',
                        label: () => translate('menu.window.restoreStandardSize'),
                        action: () => applyMoveResizePreset(layoutTarget, 'standard'),
                    },
                ],
            },
            {
                id: 'window-tile',
                label: () => translate('menu.window.tile'),
                disabled: !hasLayoutTarget,
                submenu: true,
                submenuItems: [
                    {
                        id: 'window-tile-left',
                        label: () => translate('menu.window.tileLeft'),
                        action: () => applyTilePreset(layoutTarget, 'left'),
                    },
                    {
                        id: 'window-tile-right',
                        label: () => translate('menu.window.tileRight'),
                        action: () => applyTilePreset(layoutTarget, 'right'),
                    },
                ],
            },
            {
                id: 'window-remove-from-set',
                label: () => translate('menu.window.removeFromSet'),
                disabled: true,
            },
            {
                id: 'window-next-window',
                label: () => translate('menu.window.nextWindow'),
                shortcut: '⌘<',
                disabled: (window['WindowRegistry']?.getAllWindows?.('finder')?.length || 0) <= 1,
                action: () => {
                    focusNextWindow('finder');
                },
            },
            {
                id: 'window-show-progress',
                label: () => translate('menu.window.showProgress'),
                disabled: true,
            },
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
                id: 'window-previous-tab',
                label: () => translate('menu.window.previousTab'),
                shortcut: '⇧⌘[',
                disabled: !tabState.canNavigate,
                action: () => {
                    tabState.previous?.();
                },
            },
            {
                id: 'window-next-tab',
                label: () => translate('menu.window.nextTab'),
                shortcut: '⇧⌘]',
                disabled: !tabState.canNavigate,
                action: () => {
                    tabState.next?.();
                },
            },
            {
                id: 'window-move-tab-new-window',
                label: () => translate('menu.window.moveTabToNewWindow'),
                disabled: !tabState.canDetach,
            },
            {
                id: 'window-merge-all-windows',
                label: () => translate('menu.window.mergeAllWindows'),
                disabled: true,
            },
        ];

        const multiInstanceItems = getMultiInstanceMenuItems(context);
        if (multiInstanceItems.length > 0) {
            finderItems.push({ type: 'separator' });
            finderItems.push(...multiInstanceItems);
        }

        return finderItems;
    }

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
        const allConfigs: LabelConfig[] = [
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
        const configs = isFinder ? allConfigs.filter(cfg => cfg.type === 'finder') : allConfigs;

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
                    label: () => numberLabel,
                    checked: isActive,
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
    } else if (modalId === 'text-modal' && window['TextEditorInstanceManager']) {
        manager = window['TextEditorInstanceManager'];
        typeLabel = 'Neues Dokument';
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
                label: () => numberLabel,
                checked: isActive,
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
    'preview-modal': buildPreviewMenuDefinition,
    'text-modal': buildTextEditorMenuDefinition,
    // Legacy modal key kept for compatibility, now backed by PhotosWindow.
    'image-modal': buildPhotosMenuDefinition,
    'about-modal': buildAboutMenuDefinition,
    'program-info-modal': buildProgramInfoMenuDefinition,
    terminal: buildTerminalMenuDefinition,
};

let currentMenuModalId: string | null = null;

function renderDropdownItems(
    dropdown: HTMLUListElement,
    items: Record<string, unknown>[],
    context: MenuContext
): void {
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

        const submenuItems =
            Array.isArray(item.submenuItems) && item.submenuItems.length > 0
                ? normalizeMenuItems(item.submenuItems as unknown[], context)
                : [];
        const hasSubmenu = submenuItems.length > 0;
        if (hasSubmenu) {
            li.classList.add('menu-item-with-submenu');
        }

        const tagName = item.href ? 'a' : 'button';
        const actionEl = document.createElement(tagName) as HTMLButtonElement | HTMLAnchorElement;
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

        const trailingSpan = document.createElement('span');
        trailingSpan.className = 'menu-item-trailing';
        let hasTrailing = false;

        if (item.shortcut) {
            const shortcutSpan = document.createElement('span');
            shortcutSpan.className = 'menu-item-shortcut';
            shortcutSpan.textContent =
                typeof item.shortcut === 'function' ? item.shortcut() : item.shortcut;
            trailingSpan.appendChild(shortcutSpan);
            hasTrailing = true;
        }

        if (item.submenu || hasSubmenu) {
            const chevronSpan = document.createElement('span');
            chevronSpan.className = 'menu-item-chevron';
            chevronSpan.textContent = '›';
            chevronSpan.setAttribute('aria-hidden', 'true');
            trailingSpan.appendChild(chevronSpan);
            hasTrailing = true;
        }

        if (item.checked) {
            const checkmarkSpan = document.createElement('span');
            checkmarkSpan.className = 'menu-item-checkmark';
            checkmarkSpan.textContent = '✓';
            checkmarkSpan.setAttribute('aria-hidden', 'true');
            trailingSpan.appendChild(checkmarkSpan);
            hasTrailing = true;
        }

        if (item.trailingText) {
            const infoSpan = document.createElement('span');
            infoSpan.className = 'menu-item-trailing-text';
            infoSpan.textContent = String(item.trailingText);
            trailingSpan.appendChild(infoSpan);
            hasTrailing = true;
        }

        if (hasTrailing) {
            actionEl.appendChild(trailingSpan);
        }

        actionEl.setAttribute('role', 'menuitem');
        if (item.submenu || hasSubmenu) {
            actionEl.setAttribute('aria-haspopup', 'menu');
        }
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

        if (hasSubmenu && !isDisabled) {
            const submenu = document.createElement('ul');
            submenu.className = 'menu-dropdown menu-submenu';
            submenu.setAttribute('role', 'menu');
            renderDropdownItems(submenu, submenuItems, context);
            if (submenu.childElementCount > 0) {
                li.appendChild(submenu);
            }
        }

        dropdown.appendChild(li);
    });
}

export function renderApplicationMenu(activeModalId?: string | null) {
    const container = document.getElementById('menubar-links');
    if (!container) return;

    if (document.documentElement.getAttribute('data-ui-mode') === 'mobile') {
        container.innerHTML = '';
        currentMenuModalId = activeModalId || null;
        return;
    }

    // Detect active window type from WindowRegistry to switch menu dynamically
    const registry = window.WindowRegistry;
    const activeType = registry?.getActiveWindow?.()?.type;
    const hasExplicitModalId = typeof activeModalId === 'string' && activeModalId.length > 0;
    const isMultiWindowModalId =
        hasExplicitModalId &&
        typeof activeModalId === 'string' &&
        activeModalId.startsWith('window-');

    // Map multi-window modal IDs (or missing modal IDs) to menu keys.
    // IMPORTANT: Do not override explicit legacy modal contexts like settings/about.
    if ((!hasExplicitModalId || isMultiWindowModalId) && activeType) {
        if (activeType === 'terminal') {
            activeModalId = 'terminal';
        } else if (activeType === 'finder') {
            activeModalId = 'projects-modal';
        } else if (activeType === 'preview') {
            activeModalId = 'preview-modal';
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
        renderDropdownItems(dropdown, items, context);
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
