/**
 * Window-related ActionBus handlers
 */
import type { ActionMap, Params } from './helpers.js';
import { getGlobal, safeExecute } from './helpers.js';

export function getWindowActions(): ActionMap {
    return {
        closeWindow: (params: Params) => {
            const windowId = params.windowId;
            if (!windowId) {
                console.warn('closeWindow: missing windowId');
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
                console.warn(
                    '[ActionBus] openWindow called without windowId and FinderWindow not available'
                );
                return;
            }

            // SPECIAL: Multi-Window Finder
            if (windowId === 'finder-modal') {
                safeExecute('[ActionBus] openWindow finder-modal', () => {
                    const finder = getGlobal<{ focusOrCreate?: () => void }>('FinderWindow');
                    if (finder?.focusOrCreate) {
                        finder.focusOrCreate();
                        return;
                    }
                    console.warn(
                        '[ActionBus] FinderWindow not available; falling back to WindowManager.open("finder-modal")'
                    );
                });
            }

            // SPECIAL: Multi-Window Terminal
            if (windowId === 'terminal-modal') {
                safeExecute('[ActionBus] openWindow terminal-modal', () => {
                    const terminal = getGlobal<{ focusOrCreate?: () => void }>('TerminalWindow');
                    if (terminal?.focusOrCreate) {
                        terminal.focusOrCreate();
                        return;
                    }
                    console.warn(
                        '[ActionBus] TerminalWindow not available; falling back to WindowManager.open("terminal-modal")'
                    );
                });
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
                openProgramInfoDialog?: (arg: unknown) => void;
            }>('');
            g?.hideMenuDropdowns?.();
            g?.openProgramInfoDialog?.(null);
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
                console.warn('openDesktopItem: missing itemId');
                return;
            }
            // Lazy import to avoid circular dependency
            import('../desktop.js').then(({ DESKTOP_SHORTCUTS }) => {
                const shortcut = DESKTOP_SHORTCUTS.find(s => s.id === itemId);
                if (shortcut?.onOpen) {
                    shortcut.onOpen();
                } else {
                    console.warn(`openDesktopItem: no shortcut found for id "${itemId}"`);
                }
            });
        },
    };
}
