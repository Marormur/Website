/**
 * Dialog Utilities Module
 * Provides window/dialog z-index management and focus control functions.
 * 
 * This module centralizes dialog utility functions that were previously scattered
 * in app.js, providing typed interfaces for better maintainability.
 * 
 * @module dialog-utils
 */

// Export to make this a proper module for global augmentation
export {};

/**
 * Global window interface extensions for dialog utilities
 */
declare global {
    interface Window {
        APP_CONSTANTS?: {
            MODAL_IDS?: string[];
        };
        topZIndex?: number;
        dialogs?: {
            [key: string]: {
                modal?: HTMLElement;
                bringToFront?: () => void;
            };
        };
        syncTopZIndexWithDOM?: () => void;
        bringDialogToFront?: (dialogId: string) => void;
        bringAllWindowsToFront?: () => void;
    }
}

/**
 * Type helper for WindowManager (defined in types/window-manager.d.ts)
 */
interface IWindowManager {
    syncZIndexWithDOM?: () => void;
    getAllWindowIds?: () => string[];
}

/**
 * Get all modal IDs from WindowManager or fallback to APP_CONSTANTS
 * @returns Array of modal element IDs
 */
function getModalIds(): string[] {
    const win = window as Window & { WindowManager?: IWindowManager };
    if (win.WindowManager && typeof win.WindowManager.getAllWindowIds === 'function') {
        return win.WindowManager.getAllWindowIds();
    }
    return window.APP_CONSTANTS?.MODAL_IDS || [];
}

/**
 * Synchronize the global topZIndex counter with the actual DOM z-index values.
 * Scans all registered modals and updates the topZIndex to match the highest z-index found.
 * 
 * Delegates to WindowManager.syncZIndexWithDOM if available, otherwise uses fallback implementation.
 */
function syncTopZIndexWithDOM(): void {
    const win = window as Window & { WindowManager?: IWindowManager };
    if (
        win.WindowManager &&
        typeof win.WindowManager.syncZIndexWithDOM === 'function'
    ) {
        win.WindowManager.syncZIndexWithDOM();
        return;
    }

    // Fallback implementation
    let maxZ = 1000;
    const modalIds = getModalIds();
    
    modalIds.forEach((id) => {
        const modal = document.getElementById(id);
        if (!modal) return;
        const modalZ = parseInt(window.getComputedStyle(modal).zIndex, 10);
        if (!Number.isNaN(modalZ)) {
            maxZ = Math.max(maxZ, modalZ);
        }
    });
    
    if (window.topZIndex !== undefined) {
        window.topZIndex = maxZ;
    }
}

/**
 * Bring a specific dialog/window to front by calling its bringToFront method.
 * This is the recommended way to change window focus programmatically.
 * 
 * @param dialogId - The ID of the dialog element to bring to front
 */
function bringDialogToFront(dialogId: string): void {
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
function bringAllWindowsToFront(): void {
    const modalIds = getModalIds();
    if (!window.dialogs || !modalIds || !Array.isArray(modalIds)) return;
    
    modalIds.forEach((id) => {
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
