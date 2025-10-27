'use strict';
/**
 * Dialog Utilities Module
 * Provides window/dialog z-index management and focus control functions.
 *
 * This module centralizes dialog utility functions that were previously scattered
 * in app.js, providing typed interfaces for better maintainability.
 *
 * @module dialog-utils
 */
// Object.defineProperty(exports, "__esModule", { value: true }); // REMOVED: Causes "exports is not defined" in browser
/**
 * Get all modal IDs from WindowManager or fallback to APP_CONSTANTS
 * @returns Array of modal element IDs
 */
function getModalIds() {
    const win = window;
    if (win.WindowManager && typeof win.WindowManager.getAllWindowIds === 'function') {
        return win.WindowManager.getAllWindowIds();
    }
    // Cast window to access APP_CONSTANTS (defined in types/index.d.ts)
    const w = window;
    const appConstants = w.APP_CONSTANTS;
    return appConstants?.MODAL_IDS || [];
}
/**
 * Synchronize the global topZIndex counter with the actual DOM z-index values.
 * Scans all registered modals and updates the topZIndex to match the highest z-index found.
 *
 * Delegates to WindowManager.syncZIndexWithDOM if available, otherwise uses fallback implementation.
 */
function syncTopZIndexWithDOM() {
    const win = window;
    if (win.WindowManager && typeof win.WindowManager.syncZIndexWithDOM === 'function') {
        win.WindowManager.syncZIndexWithDOM();
        return;
    }
    // Fallback implementation
    let maxZ = 1000;
    const modalIds = getModalIds();
    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (!modal) return;
        const modalZ = parseInt(window.getComputedStyle(modal).zIndex, 10);
        if (!Number.isNaN(modalZ)) {
            maxZ = Math.max(maxZ, modalZ);
        }
    });
    // Cast window to access topZIndex (defined in types/index.d.ts)
    // Note: topZIndex is required in the type definition, but may not exist at runtime
    const w = window;
    if (w.topZIndex !== undefined) {
        w.topZIndex = maxZ;
    }
}
/**
 * Bring a specific dialog/window to front by calling its bringToFront method.
 * This is the recommended way to change window focus programmatically.
 *
 * @param dialogId - The ID of the dialog element to bring to front
 */
function bringDialogToFront(dialogId) {
    if (window.dialogs?.[dialogId]) {
        window.dialogs[dialogId].bringToFront?.();
    } else {
        console.error('Kein Dialog mit der ID ' + dialogId + ' gefunden.');
    }
}
/**
 * Bring all currently visible (non-hidden) windows to front.
 * Used by menu system to refresh z-index stack of all open windows.
 * Iterates through all registered dialogs and calls bringToFront on visible ones.
 */
function bringAllWindowsToFront() {
    const modalIds = getModalIds();
    if (!window.dialogs || !modalIds || !Array.isArray(modalIds)) return;
    modalIds.forEach(id => {
        const dialog = window.dialogs?.[id];
        if (
            dialog &&
            dialog.modal &&
            !dialog.modal.classList.contains('hidden') &&
            typeof dialog.bringToFront === 'function'
        ) {
            dialog.bringToFront();
        }
    });
}
// ============================================================================
// IIFE Export Pattern - Expose functions globally with guard to prevent redeclaration
// ============================================================================
(() => {
    if (typeof window.syncTopZIndexWithDOM !== 'function') {
        window.syncTopZIndexWithDOM = syncTopZIndexWithDOM;
    }
    if (typeof window.bringDialogToFront !== 'function') {
        window.bringDialogToFront = bringDialogToFront;
    }
    if (typeof window.bringAllWindowsToFront !== 'function') {
        window.bringAllWindowsToFront = bringAllWindowsToFront;
    }
})();
//# sourceMappingURL=dialog-utils.js.map
