/**
 * src/ts/apps/code-editor/code-editor-menus.ts
 * Code-Editor-spezifische Menü-Definitionen via MenuRegistry.
 */

import { translate } from '../../services/i18n';
import logger from '../../core/logger.js';
import type { MenuSection } from '../../services/menu-registry';

type CodeEditorWindowLike = {
    id?: string;
    type?: string;
    zIndex?: number;
    element?: HTMLElement | null;
    position?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    isMaximized?: boolean;
    close?: () => void;
    minimize?: () => void;
    toggleMaximize?: () => void;
    center?: () => void;
    canMinimize?: () => boolean;
    canMaximize?: () => boolean;
    bringToFront?: () => void;
    focus?: () => void;
    _saveState?: () => void;
};

function getActiveCodeEditorWindow(): CodeEditorWindowLike | null {
    const registry = window['WindowRegistry'];
    const activeWindow = registry?.getActiveWindow?.() as CodeEditorWindowLike | undefined;
    return activeWindow?.type === 'code-editor' ? activeWindow : null;
}

function focusNextCodeEditorWindow(): void {
    const registry = window['WindowRegistry'];
    if (!registry || typeof registry.getAllWindows !== 'function') return;

    const windows = (registry.getAllWindows('code-editor') || []) as CodeEditorWindowLike[];
    if (windows.length < 2) return;

    const sorted = [...windows].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    const active = registry.getActiveWindow?.() as CodeEditorWindowLike | undefined;
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
    registry.setActiveWindow?.(nextWindow.id ?? null);
}

function getWindowWorkArea(): { x: number; y: number; width: number; height: number } {
    const win = window as Window & {
        getLogicalViewportWidth?: () => number;
        getLogicalViewportHeight?: () => number;
        getMenuBarBottom?: () => number;
        getDockReservedBottom?: () => number;
    };
    const getLogicalViewportWidth = win.getLogicalViewportWidth;
    const getLogicalViewportHeight = win.getLogicalViewportHeight;
    const top = Math.max(0, Math.round(win.getMenuBarBottom?.() || 0));
    const bottomReserve = Math.max(0, Math.round(win.getDockReservedBottom?.() || 0));
    const width = Math.max(640, Math.round(getLogicalViewportWidth?.() || 1280));
    const height = Math.max(
        400,
        Math.round((getLogicalViewportHeight?.() || 800) - top - bottomReserve)
    );
    return { x: 0, y: top, width, height };
}

function applyMoveResizePreset(
    windowController: CodeEditorWindowLike,
    preset: 'leftHalf' | 'rightHalf' | 'topHalf' | 'bottomHalf' | 'standard'
): void {
    const area = getWindowWorkArea();
    const halfWidth = Math.round(area.width / 2);
    const halfHeight = Math.round(area.height / 2);
    const targetHalfWidth = Math.min(area.width, Math.max(320, halfWidth));
    const targetHalfHeight = Math.min(area.height, Math.max(200, halfHeight));

    let bounds = { x: 0, y: 0, width: 0, height: 0 };
    if (preset === 'leftHalf') {
        bounds = { x: area.x, y: area.y, width: targetHalfWidth, height: area.height };
    } else if (preset === 'rightHalf') {
        bounds = {
            x: area.x + area.width - targetHalfWidth,
            y: area.y,
            width: targetHalfWidth,
            height: area.height,
        };
    } else if (preset === 'topHalf') {
        bounds = { x: area.x, y: area.y, width: area.width, height: targetHalfHeight };
    } else if (preset === 'bottomHalf') {
        bounds = {
            x: area.x,
            y: area.y + area.height - targetHalfHeight,
            width: area.width,
            height: targetHalfHeight,
        };
    } else {
        const targetWidth = Math.round(Math.min(1100, area.width * 0.72));
        const targetHeight = Math.round(Math.min(760, area.height * 0.78));
        bounds = {
            x: area.x + (area.width - targetWidth) / 2,
            y: area.y + (area.height - targetHeight) / 2,
            width: targetWidth,
            height: targetHeight,
        };
    }

    const el = windowController.element;
    if (!el) return;

    if (typeof windowController.isMaximized === 'boolean') {
        windowController.isMaximized = false;
    }

    const minWidthPx = preset === 'standard' ? 320 : 120;
    const minHeightPx = preset === 'standard' ? 240 : 120;
    const normalized = {
        x: Math.max(0, Math.round(bounds.x)),
        y: Math.max(0, Math.round(bounds.y)),
        width: Math.max(minWidthPx, Math.round(bounds.width)),
        height: Math.max(minHeightPx, Math.round(bounds.height)),
    };

    if (preset !== 'standard') {
        el.style.setProperty('min-width', `${normalized.width}px`, 'important');
        el.style.setProperty('min-height', `${normalized.height}px`, 'important');
    } else {
        el.style.removeProperty('min-width');
        el.style.removeProperty('min-height');
    }

    el.style.left = `${normalized.x}px`;
    el.style.top = `${normalized.y}px`;
    el.style.width = `${normalized.width}px`;
    el.style.height = `${normalized.height}px`;

    if (windowController.position) {
        windowController.position.x = normalized.x;
        windowController.position.y = normalized.y;
        windowController.position.width = normalized.width;
        windowController.position.height = normalized.height;
    }

    windowController.bringToFront?.();
    windowController._saveState?.();
}

function applyTilePreset(windowController: CodeEditorWindowLike, side: 'left' | 'right'): void {
    applyMoveResizePreset(windowController, side === 'left' ? 'leftHalf' : 'rightHalf');
}

function hasAnyVisibleDialog(): boolean {
    try {
        const registry = window['WindowRegistry'];
        const windows = registry?.getAllWindows?.('code-editor') || [];
        if (Array.isArray(windows) && windows.length > 0) return true;

        const windowManager = window['WindowManager'] as
            | { getAllWindowIds?: () => string[] }
            | undefined;
        const modalIds = windowManager?.getAllWindowIds?.() || [];
        if (!Array.isArray(modalIds) || modalIds.length === 0) return false;

        return modalIds.some(id => {
            const modal = document.getElementById(id);
            return !!modal && !modal.classList.contains('hidden');
        });
    } catch {
        return false;
    }
}

function getCodeEditorMultiInstanceMenuItems(): MenuSection['items'] {
    const items: MenuSection['items'] = [];
    const registry = window['WindowRegistry'];
    if (!registry || typeof registry.getAllWindows !== 'function') return items;

    const wins = (registry.getAllWindows('code-editor') || []) as CodeEditorWindowLike[];
    if (wins.length === 0) return items;

    const active = registry.getActiveWindow?.() as CodeEditorWindowLike | undefined;
    const sorted = [...wins].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    items.push({ type: 'separator' });
    sorted.forEach((win, index) => {
        const isActive = !!active && (active.id ? active.id === win.id : active === win);
        items.push({
            id: `window-instance-${win.id}`,
            label: () => `${translate('programs.codeEditor', 'Code Editor')} ${index + 1}`,
            checked: isActive,
            shortcut: index < 9 ? `⌘${index + 1}` : undefined,
            action: () => {
                if (typeof win.bringToFront === 'function') {
                    win.bringToFront();
                } else if (typeof win.focus === 'function') {
                    win.focus();
                } else {
                    registry.setActiveWindow?.(win.id ?? null);
                }
            },
        });
    });

    return items;
}

function getCodeEditorMenus(): MenuSection[] {
    const activeWindow = getActiveCodeEditorWindow();
    const canZoom =
        typeof activeWindow?.toggleMaximize === 'function' &&
        activeWindow?.canMaximize?.() !== false;
    const canCenter = typeof activeWindow?.center === 'function';
    const hasLayoutTarget = !!activeWindow?.element;

    return [
        {
            id: 'file',
            label: () => translate('menu.sections.file'),
            items: [
                {
                    id: 'code-editor-new-file',
                    label: () => translate('menu.codeEditor.newFile'),
                    shortcut: '⌘N',
                    icon: 'newFile',
                    action: () => {
                        const app = window['CodeEditorApp'];
                        if (app && typeof app.newFile === 'function') {
                            app.newFile();
                        }
                    },
                },
                {
                    id: 'code-editor-new-window',
                    label: () => translate('menu.codeEditor.newWindow'),
                    shortcut: '⇧⌘N',
                    icon: 'new',
                    action: () => {
                        const win = window['CodeEditorWindow'];
                        if (win && typeof win.create === 'function') {
                            win.create();
                        }
                    },
                },
                { type: 'separator' },
                {
                    id: 'code-editor-save',
                    label: () => translate('menu.codeEditor.save'),
                    shortcut: '⌘S',
                    icon: 'save',
                    action: () => {
                        const app = window['CodeEditorApp'];
                        if (app && typeof app.save === 'function') {
                            app.save();
                        }
                    },
                },
            ],
        },
        {
            id: 'edit',
            label: () => translate('menu.sections.edit'),
            items: [
                {
                    id: 'code-editor-undo',
                    label: () => translate('menu.codeEditor.undo'),
                    shortcut: '⌘Z',
                    icon: 'undo',
                    disabled: () => !getActiveCodeEditorWindow(),
                    action: () => {
                        const app = window['CodeEditorApp'];
                        if (app && typeof app.triggerEditorAction === 'function') {
                            app.triggerEditorAction('undo');
                        }
                    },
                },
                {
                    id: 'code-editor-redo',
                    label: () => translate('menu.codeEditor.redo'),
                    shortcut: '⇧⌘Z',
                    icon: 'redo',
                    disabled: () => !getActiveCodeEditorWindow(),
                    action: () => {
                        const app = window['CodeEditorApp'];
                        if (app && typeof app.triggerEditorAction === 'function') {
                            app.triggerEditorAction('redo');
                        }
                    },
                },
                { type: 'separator' },
                {
                    id: 'code-editor-find',
                    label: () => translate('menu.codeEditor.find'),
                    shortcut: '⌘F',
                    icon: 'search',
                    disabled: () => !getActiveCodeEditorWindow(),
                    action: () => {
                        const app = window['CodeEditorApp'];
                        if (app && typeof app.triggerEditorAction === 'function') {
                            app.triggerEditorAction('actions.find');
                        }
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
                    disabled: () => {
                        const win = getActiveCodeEditorWindow();
                        return (
                            typeof win?.minimize !== 'function' || win?.canMinimize?.() === false
                        );
                    },
                    icon: 'windowMinimize',
                    action: () => getActiveCodeEditorWindow()?.minimize?.(),
                },
                {
                    id: 'window-zoom-alt',
                    label: () => translate('menu.window.zoomAlt'),
                    disabled: () => !canZoom,
                    icon: 'windowZoom',
                    action: () => getActiveCodeEditorWindow()?.toggleMaximize?.(),
                },
                {
                    id: 'window-zoom',
                    label: () => translate('menu.window.zoom'),
                    shortcut: '⌃⌘F',
                    disabled: () => !canZoom,
                    icon: 'windowZoom',
                    action: () => getActiveCodeEditorWindow()?.toggleMaximize?.(),
                },
                {
                    id: 'window-center',
                    label: () => translate('menu.window.center'),
                    shortcut: '⌃⌘C',
                    disabled: () => !canCenter,
                    icon: 'window',
                    action: () => getActiveCodeEditorWindow()?.center?.(),
                },
                { type: 'separator' },
                {
                    id: 'window-move-resize',
                    label: () => translate('menu.window.moveAndResize'),
                    disabled: () => !hasLayoutTarget,
                    submenu: true,
                    submenuItems: [
                        {
                            id: 'window-move-left-half',
                            label: () => translate('menu.window.moveLeftHalf'),
                            action: () => {
                                const win = getActiveCodeEditorWindow();
                                if (win) applyMoveResizePreset(win, 'leftHalf');
                            },
                        },
                        {
                            id: 'window-move-right-half',
                            label: () => translate('menu.window.moveRightHalf'),
                            action: () => {
                                const win = getActiveCodeEditorWindow();
                                if (win) applyMoveResizePreset(win, 'rightHalf');
                            },
                        },
                        {
                            id: 'window-move-top-half',
                            label: () => translate('menu.window.moveTopHalf'),
                            action: () => {
                                const win = getActiveCodeEditorWindow();
                                if (win) applyMoveResizePreset(win, 'topHalf');
                            },
                        },
                        {
                            id: 'window-move-bottom-half',
                            label: () => translate('menu.window.moveBottomHalf'),
                            action: () => {
                                const win = getActiveCodeEditorWindow();
                                if (win) applyMoveResizePreset(win, 'bottomHalf');
                            },
                        },
                        { type: 'separator' },
                        {
                            id: 'window-move-standard',
                            label: () => translate('menu.window.restoreStandardSize'),
                            action: () => {
                                const win = getActiveCodeEditorWindow();
                                if (win) applyMoveResizePreset(win, 'standard');
                            },
                        },
                    ],
                },
                {
                    id: 'window-tile',
                    label: () => translate('menu.window.tile'),
                    disabled: () => !hasLayoutTarget,
                    submenu: true,
                    submenuItems: [
                        {
                            id: 'window-tile-left',
                            label: () => translate('menu.window.tileLeft'),
                            action: () => {
                                const win = getActiveCodeEditorWindow();
                                if (win) applyTilePreset(win, 'left');
                            },
                        },
                        {
                            id: 'window-tile-right',
                            label: () => translate('menu.window.tileRight'),
                            action: () => {
                                const win = getActiveCodeEditorWindow();
                                if (win) applyTilePreset(win, 'right');
                            },
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
                    disabled: () =>
                        ((window['WindowRegistry']?.getAllWindows?.('code-editor') || []).length ||
                            0) <= 1,
                    action: () => {
                        focusNextCodeEditorWindow();
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
                    disabled: () => !hasAnyVisibleDialog(),
                    icon: 'windowFront',
                    action: () => {
                        const action = window['bringAllWindowsToFront'];
                        if (typeof action === 'function') action();
                    },
                },
                ...getCodeEditorMultiInstanceMenuItems(),
            ],
        },
        {
            id: 'help',
            label: () => translate('menu.sections.help'),
            items: [
                {
                    id: 'help-code-editor',
                    label: () => translate('menu.codeEditor.help'),
                    icon: 'help',
                    action: () => {
                        const openProgramInfo = (
                            window as Window & { openProgramInfo?: (id: string) => void }
                        ).openProgramInfo;
                        if (typeof openProgramInfo === 'function') {
                            openProgramInfo('code-editor');
                        }
                    },
                },
            ],
        },
    ];
}

export function registerCodeEditorMenus(): void {
    const registry = window.MenuRegistry;
    if (!registry || typeof registry.register !== 'function') {
        logger.warn('UI', '[Menu] MenuRegistry unavailable; cannot register code-editor menus');
        return;
    }

    registry.register('code-editor', getCodeEditorMenus);
}
