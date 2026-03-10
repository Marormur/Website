/**
 * Window-related ActionBus handlers
 */
import type { ActionMap, Params } from './helpers.js';
import { getGlobal, safeExecute } from './helpers.js';
import logger from '../../core/logger.js';

export function getWindowActions(): ActionMap {
    return {
        closeWindow: (params: Params) => {
            const windowId = params.windowId;
            if (!windowId) {
                logger.warn('UI', 'closeWindow: missing windowId');
                return;
            }

            const wm = getGlobal<{ close?: (id: string) => void }>('WindowManager');
            wm?.close?.(windowId);

            const g = getGlobal<{
                saveOpenModals?: () => void;
                updateDockIndicators?: () => void;
                updateProgramLabelByTopModal?: () => void;
            }>('');
            g?.saveOpenModals?.();
            g?.updateDockIndicators?.();
            g?.updateProgramLabelByTopModal?.();
        },

        openWindow: (params: Params) => {
            const windowId = params.windowId;

            // Close launchpad if it's open (clicking dock icon while launchpad is visible)
            const launchpadModal = document.getElementById('launchpad-modal');
            if (launchpadModal && !launchpadModal.classList.contains('hidden')) {
                const dialogs = getGlobal<Record<string, { close?: () => void }>>('dialogs');
                dialogs?.['launchpad-modal']?.close?.();
            }

            // SPECIAL: Finder uses Multi-Window system (no windowId needed for dock icon)
            if (!windowId) {
                const finder = getGlobal<{ focusOrCreate?: () => void }>('FinderWindow');
                if (finder?.focusOrCreate) {
                    finder.focusOrCreate();
                    return;
                }
                logger.warn(
                    'UI',
                    '[ActionBus] openWindow called without windowId and FinderWindow not available'
                );
                return;
            }

            // SPECIAL: Multi-Window Finder
            if (windowId === 'finder-modal') {
                const finder = getGlobal<{ focusOrCreate?: () => void }>('FinderWindow');
                if (finder?.focusOrCreate) {
                    safeExecute('[ActionBus] openWindow finder-modal', () => {
                        finder.focusOrCreate!();
                    });
                    // Early return: Multi-window handled, skip legacy WindowManager
                    const g = getGlobal<{ updateProgramLabelByTopModal?: () => void }>('');
                    g?.updateProgramLabelByTopModal?.();
                    return;
                }
                logger.warn(
                    'UI',
                    '[ActionBus] FinderWindow not available; falling back to WindowManager.open("finder-modal")'
                );
            }

            // SPECIAL: Multi-Window Terminal
            if (windowId === 'terminal-modal') {
                const terminal = getGlobal<{ focusOrCreate?: () => void }>('TerminalWindow');
                if (terminal?.focusOrCreate) {
                    safeExecute('[ActionBus] openWindow terminal-modal', () => {
                        terminal.focusOrCreate!();
                    });
                    // Early return: Multi-window handled, skip legacy WindowManager
                    const g = getGlobal<{ updateProgramLabelByTopModal?: () => void }>('');
                    g?.updateProgramLabelByTopModal?.();
                    return;
                }
                logger.warn(
                    'UI',
                    '[ActionBus] TerminalWindow not available; falling back to WindowManager.open("terminal-modal")'
                );
            }

            const wm = getGlobal<{ open?: (id: string) => void }>('WindowManager');
            wm?.open?.(windowId);

            const g = getGlobal<{ updateProgramLabelByTopModal?: () => void }>('');
            g?.updateProgramLabelByTopModal?.();
        },

        closeTopWindow: () => {
            const g = getGlobal<{
                hideMenuDropdowns?: () => void;
                WindowManager?: { getTopWindow?: () => unknown; close?: (id: string) => void };
                saveOpenModals?: () => void;
                updateDockIndicators?: () => void;
                updateProgramLabelByTopModal?: () => void;
            }>('');
            g?.hideMenuDropdowns?.();

            const maybeTop = g?.WindowManager?.getTopWindow?.();
            let topId: string | null = null;
            if (typeof maybeTop === 'string') {
                topId = maybeTop;
            } else if (maybeTop && typeof maybeTop === 'object') {
                const obj = maybeTop as Record<string, unknown>;
                if (typeof obj.id === 'string') topId = obj.id;
            }
            if (!topId) return;

            g?.WindowManager?.close?.(topId);
            g?.saveOpenModals?.();
            g?.updateDockIndicators?.();
            g?.updateProgramLabelByTopModal?.();
        },

        resetWindowLayout: () => {
            const g = getGlobal<{ hideMenuDropdowns?: () => void; resetWindowLayout?: () => void }>(
                ''
            );
            g?.hideMenuDropdowns?.();
            g?.resetWindowLayout?.();
        },

        openProgramInfo: () => {
            const g = getGlobal<{
                hideMenuDropdowns?: () => void;
                openProgramInfoFromMenu?: (arg?: unknown) => void;
            }>('');
            g?.hideMenuDropdowns?.();
            g?.openProgramInfoFromMenu?.();
        },

        openAbout: () => {
            const g = getGlobal<{
                hideMenuDropdowns?: () => void;
                dialogs?: Record<string, { open?: () => void }>;
                updateProgramLabelByTopModal?: () => void;
            }>('');
            g?.hideMenuDropdowns?.();
            g?.dialogs?.['about-modal']?.open?.();
            g?.updateProgramLabelByTopModal?.();
        },

        openSettings: () => {
            const g = getGlobal<{
                hideMenuDropdowns?: () => void;
                dialogs?: Record<string, { open?: () => void }>;
                updateProgramLabelByTopModal?: () => void;
            }>('');
            g?.hideMenuDropdowns?.();
            g?.dialogs?.['settings-modal']?.open?.();
            g?.updateProgramLabelByTopModal?.();
        },

        openDesktopItem: (params: Params) => {
            const itemId = params.itemId;
            if (!itemId) {
                logger.warn('UI', 'openDesktopItem: missing itemId');
                return;
            }
            // Lazy import to avoid circular dependency
            import('../desktop.js').then(({ DESKTOP_SHORTCUTS }) => {
                const shortcut = DESKTOP_SHORTCUTS.find(s => s.id === itemId);
                if (shortcut?.onOpen) {
                    shortcut.onOpen();
                } else {
                    logger.warn('UI', `openDesktopItem: no shortcut found for id "${itemId}"`);
                }
            });
        },

        /**
         * Traffic-Light Button: Close Window
         * Closes the window containing the clicked element
         */
        'window-close': (_params: Params, element: HTMLElement | null) => {
            if (!element) {
                logger.warn('UI', '[ActionBus] window-close: no element provided');
                return;
            }

            const modal = element.closest('.modal') as HTMLElement | null;
            if (!modal) {
                logger.warn('UI', '[ActionBus] window-close: no .modal ancestor found');
                return;
            }

            const windowId = modal.id;

            // Try WindowRegistry first (for multi-window system)
            const registry = getGlobal<{
                getWindow?: (id: string) => { close?: () => void } | null;
            }>('WindowRegistry');
            const win = registry?.getWindow?.(windowId);
            if (win?.close) {
                win.close();
                return;
            }

            // Fallback: legacy WindowManager
            const wm = getGlobal<{ close?: (id: string) => void }>('WindowManager');
            wm?.close?.(windowId);

            const g = getGlobal<{
                saveOpenModals?: () => void;
                updateDockIndicators?: () => void;
                updateProgramLabelByTopModal?: () => void;
            }>('');
            g?.saveOpenModals?.();
            g?.updateDockIndicators?.();
            g?.updateProgramLabelByTopModal?.();
        },

        /**
         * Traffic-Light Button: Minimize Window
         * Minimizes the window containing the clicked element
         */
        'window-minimize': (_params: Params, element: HTMLElement | null) => {
            if (!element) {
                logger.warn('UI', '[ActionBus] window-minimize: no element provided');
                return;
            }

            const modal = element.closest('.modal') as HTMLElement | null;
            if (!modal) {
                logger.warn('UI', '[ActionBus] window-minimize: no .modal ancestor found');
                return;
            }

            const windowId = modal.id;

            // Try WindowRegistry first
            const registry = getGlobal<{
                getWindow?: (id: string) => { minimize?: () => void } | null;
            }>('WindowRegistry');
            const win = registry?.getWindow?.(windowId);
            if (win?.minimize) {
                win.minimize();
                return;
            }

            // Fallback: legacy WindowManager
            const wm = getGlobal<{ minimize?: (id: string) => void }>('WindowManager');
            wm?.minimize?.(windowId);

            const g = getGlobal<{ updateDockIndicators?: () => void }>('');
            g?.updateDockIndicators?.();
        },

        /**
         * Traffic-Light Button: Maximize/Zoom Window
         * Toggles fullscreen for the window containing the clicked element
         */
        'window-maximize': (_params: Params, element: HTMLElement | null) => {
            if (!element) {
                logger.warn('UI', '[ActionBus] window-maximize: no element provided');
                return;
            }

            const modal = element.closest('.modal') as HTMLElement | null;
            if (!modal) {
                logger.warn('UI', '[ActionBus] window-maximize: no .modal ancestor found');
                return;
            }

            const windowId = modal.id;

            // Try WindowRegistry first
            const registry = getGlobal<{
                getWindow?: (id: string) => { toggleFullscreen?: () => void } | null;
            }>('WindowRegistry');
            const win = registry?.getWindow?.(windowId);
            if (win?.toggleFullscreen) {
                win.toggleFullscreen();
                return;
            }

            // Fallback: legacy WindowManager maximize behavior
            const wm = getGlobal<{ maximize?: (id: string) => void }>('WindowManager');
            wm?.maximize?.(windowId);
        },
    };
}
