/**
 * Window-related ActionBus handlers
 */
import type { ActionMap, Params } from './helpers.js';
import { getGlobal, safeExecute } from './helpers.js';
import logger from '../../core/logger.js';

function openByTypeWithLegacyFallback(type: string, legacyModalId: string): void {
    const g = getGlobal<{
        AboutWindow?: { focusOrCreate?: () => void };
        SettingsWindow?: { focusOrCreate?: () => void };
        WindowRegistry?: {
            getActiveWindow?: () => {
                type?: string;
                zIndex?: number;
                bringToFront?: () => void;
            } | null;
            getWindowsByType?: (t: string) => Array<{ zIndex?: number; bringToFront?: () => void }>;
        };
        WindowManager?: { open?: (id: string) => void; close?: (id: string) => void };
    }>('');

    if (type === 'about' && g?.AboutWindow?.focusOrCreate) {
        g.AboutWindow.focusOrCreate();
        g?.WindowManager?.close?.(legacyModalId);
        return;
    }

    if (type === 'settings' && g?.SettingsWindow?.focusOrCreate) {
        g.SettingsWindow.focusOrCreate();
        g?.WindowManager?.close?.(legacyModalId);
        return;
    }

    const active = g?.WindowRegistry?.getActiveWindow?.();
    if (active?.type === type && typeof active.bringToFront === 'function') {
        active.bringToFront();
        return;
    }

    const windowsByType = g?.WindowRegistry?.getWindowsByType?.(type) || [];
    const topByType = windowsByType.reduce(
        (best, current) => (!best || (current.zIndex || 0) >= (best.zIndex || 0) ? current : best),
        null as { zIndex?: number; bringToFront?: () => void } | null
    );

    if (topByType && typeof topByType.bringToFront === 'function') {
        topByType.bringToFront();
        return;
    }

    g?.WindowManager?.open?.(legacyModalId);
}

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
            const isLaunchpadTarget = windowId === 'launchpad-modal';

            // Launchpad dock behavior should be a strict toggle:
            // second click closes it, third click opens it again.
            const launchpadModal = document.getElementById('launchpad-modal');
            const isLaunchpadVisible =
                !!launchpadModal && !launchpadModal.classList.contains('hidden');
            if (isLaunchpadVisible) {
                const wmForLaunchpad = getGlobal<{ close?: (id: string) => void }>('WindowManager');
                wmForLaunchpad?.close?.('launchpad-modal');

                // Toggle close: do not reopen Launchpad in the same click cycle.
                if (isLaunchpadTarget) {
                    return;
                }
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

            // SPECIAL: PhotosWindow (legacy key: image-modal)
            if (windowId === 'image-modal') {
                const photos = getGlobal<{ focusOrCreate?: () => void }>('PhotosWindow');
                if (photos?.focusOrCreate) {
                    safeExecute('[ActionBus] openWindow photos', () => {
                        photos.focusOrCreate!();
                    });
                    // Early return: Multi-window handled, skip legacy WindowManager
                    const g = getGlobal<{ updateProgramLabelByTopModal?: () => void }>('');
                    g?.updateProgramLabelByTopModal?.();
                    return;
                }
                logger.warn(
                    'UI',
                    '[ActionBus] PhotosWindow not available; skipping legacy photos fallback'
                );
                return;
            }

            // SPECIAL: Multi-Window Terminal
            if (windowId === 'terminal-modal' || windowId === 'terminal') {
                const terminal = getGlobal<{ focusOrCreate?: () => void }>('TerminalWindow');
                if (terminal?.focusOrCreate) {
                    safeExecute('[ActionBus] openWindow terminal', () => {
                        terminal.focusOrCreate!();
                    });
                    // Early return: Multi-window handled, skip legacy WindowManager
                    const g = getGlobal<{ updateProgramLabelByTopModal?: () => void }>('');
                    g?.updateProgramLabelByTopModal?.();
                    return;
                }
                logger.warn(
                    'UI',
                    '[ActionBus] TerminalWindow not available; skipping legacy terminal fallback'
                );
                return;
            }

            // SPECIAL: Multi-Window Settings/About
            if (windowId === 'settings-modal' || windowId === 'about-modal') {
                openByTypeWithLegacyFallback(
                    windowId === 'settings-modal' ? 'settings' : 'about',
                    windowId
                );
                const g = getGlobal<{ updateProgramLabelByTopModal?: () => void }>('');
                g?.updateProgramLabelByTopModal?.();
                return;
            }

            const wm = getGlobal<{ open?: (id: string) => void }>('WindowManager');
            wm?.open?.(windowId);

            const g = getGlobal<{ updateProgramLabelByTopModal?: () => void }>('');
            g?.updateProgramLabelByTopModal?.();
        },

        closeTopWindow: () => {
            const g = getGlobal<{
                hideMenuDropdowns?: () => void;
                WindowRegistry?: {
                    getActiveWindow?: () => { close?: () => void } | null;
                    getTopWindow?: () => { close?: () => void } | null;
                };
                WindowManager?: { getTopWindow?: () => unknown; close?: (id: string) => void };
                saveOpenModals?: () => void;
                updateDockIndicators?: () => void;
                updateProgramLabelByTopModal?: () => void;
            }>('');
            g?.hideMenuDropdowns?.();

            // Prefer multi-window close path so registry, z-index and dock indicators
            // stay in sync (legacy WindowManager only hides modal shells).
            const activeWindow =
                g?.WindowRegistry?.getActiveWindow?.() || g?.WindowRegistry?.getTopWindow?.();
            if (activeWindow?.close) {
                activeWindow.close();
                return;
            }

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
            const g = getGlobal<{
                hideMenuDropdowns?: () => void;
                resetWindowLayout?: () => void;
                StorageSystem?: { resetWindowLayout?: () => void };
                API?: { storage?: { resetWindowLayout?: () => void } };
            }>('');
            g?.hideMenuDropdowns?.();

            const resetFn =
                g?.resetWindowLayout ||
                g?.StorageSystem?.resetWindowLayout ||
                g?.API?.storage?.resetWindowLayout;

            if (typeof resetFn === 'function') {
                resetFn();
            } else {
                logger.warn('UI', 'resetWindowLayout: no reset function available');
            }
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
                updateProgramLabelByTopModal?: () => void;
            }>('');
            g?.hideMenuDropdowns?.();
            openByTypeWithLegacyFallback('about', 'about-modal');
            g?.updateProgramLabelByTopModal?.();
        },

        openSettings: () => {
            const g = getGlobal<{
                hideMenuDropdowns?: () => void;
                updateProgramLabelByTopModal?: () => void;
            }>('');
            g?.hideMenuDropdowns?.();
            openByTypeWithLegacyFallback('settings', 'settings-modal');
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

            // Support both legacy modal windows and BaseWindow shells.
            const modal = element.closest('.modal, .multi-window') as HTMLElement | null;
            if (!modal) {
                logger.warn(
                    'UI',
                    '[ActionBus] window-close: no .modal/.multi-window ancestor found'
                );
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

            // Support both legacy modal windows and BaseWindow shells.
            const modal = element.closest('.modal, .multi-window') as HTMLElement | null;
            if (!modal) {
                logger.warn(
                    'UI',
                    '[ActionBus] window-minimize: no .modal/.multi-window ancestor found'
                );
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

            // Support both legacy modal windows and BaseWindow shells.
            const modal = element.closest('.modal, .multi-window') as HTMLElement | null;
            if (!modal) {
                logger.warn(
                    'UI',
                    '[ActionBus] window-maximize: no .modal/.multi-window ancestor found'
                );
                return;
            }

            const windowId = modal.id;

            // Try WindowRegistry first
            const registry = getGlobal<{
                getWindow?: (id: string) => {
                    toggleMaximize?: () => void;
                    toggleFullscreen?: () => void;
                } | null;
            }>('WindowRegistry');
            const win = registry?.getWindow?.(windowId);
            if (win?.toggleMaximize) {
                win.toggleMaximize();
                return;
            }
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
