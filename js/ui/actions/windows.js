'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getWindowActions = getWindowActions;
const helpers_js_1 = require('./helpers.js');
function getWindowActions() {
    return {
        closeWindow: params => {
            const windowId = params.windowId;
            if (!windowId) {
                console.warn('closeWindow: missing windowId');
                return;
            }
            const wm = (0, helpers_js_1.getGlobal)('WindowManager');
            wm?.close?.(windowId);
            const g = (0, helpers_js_1.getGlobal)('');
            g?.saveOpenModals?.();
            g?.updateDockIndicators?.();
            g?.updateProgramLabelByTopModal?.();
        },
        openWindow: params => {
            const windowId = params.windowId;
            // Close launchpad if it's open (clicking dock icon while launchpad is visible)
            const launchpadModal = document.getElementById('launchpad-modal');
            if (launchpadModal && !launchpadModal.classList.contains('hidden')) {
                const dialogs = (0, helpers_js_1.getGlobal)('dialogs');
                dialogs?.['launchpad-modal']?.close?.();
            }
            // SPECIAL: Finder uses Multi-Window system (no windowId needed for dock icon)
            if (!windowId) {
                const finder = (0, helpers_js_1.getGlobal)('FinderWindow');
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
                (0, helpers_js_1.safeExecute)('[ActionBus] openWindow finder-modal', () => {
                    const finder = (0, helpers_js_1.getGlobal)('FinderWindow');
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
                (0, helpers_js_1.safeExecute)('[ActionBus] openWindow terminal-modal', () => {
                    const terminal = (0, helpers_js_1.getGlobal)('TerminalWindow');
                    if (terminal?.focusOrCreate) {
                        terminal.focusOrCreate();
                        return;
                    }
                    console.warn(
                        '[ActionBus] TerminalWindow not available; falling back to WindowManager.open("terminal-modal")'
                    );
                });
            }
            const wm = (0, helpers_js_1.getGlobal)('WindowManager');
            wm?.open?.(windowId);
            const g = (0, helpers_js_1.getGlobal)('');
            g?.updateProgramLabelByTopModal?.();
        },
        closeTopWindow: () => {
            const g = (0, helpers_js_1.getGlobal)('');
            g?.hideMenuDropdowns?.();
            const maybeTop = g?.WindowManager?.getTopWindow?.();
            let topId = null;
            if (typeof maybeTop === 'string') {
                topId = maybeTop;
            } else if (maybeTop && typeof maybeTop === 'object') {
                const obj = maybeTop;
                if (typeof obj.id === 'string') topId = obj.id;
            }
            if (!topId) return;
            g?.WindowManager?.close?.(topId);
            g?.saveOpenModals?.();
            g?.updateDockIndicators?.();
            g?.updateProgramLabelByTopModal?.();
        },
        resetWindowLayout: () => {
            const g = (0, helpers_js_1.getGlobal)('');
            g?.hideMenuDropdowns?.();
            g?.resetWindowLayout?.();
        },
        openProgramInfo: () => {
            const g = (0, helpers_js_1.getGlobal)('');
            g?.hideMenuDropdowns?.();
            g?.openProgramInfoDialog?.(null);
        },
        openAbout: () => {
            const g = (0, helpers_js_1.getGlobal)('');
            g?.hideMenuDropdowns?.();
            g?.dialogs?.['about-modal']?.open?.();
            g?.updateProgramLabelByTopModal?.();
        },
        openSettings: () => {
            const g = (0, helpers_js_1.getGlobal)('');
            g?.hideMenuDropdowns?.();
            g?.dialogs?.['settings-modal']?.open?.();
            g?.updateProgramLabelByTopModal?.();
        },
        openDesktopItem: params => {
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
//# sourceMappingURL=windows.js.map
