/**
 * Application Initialization Module
 * Handles DOMContentLoaded setup and modal initialization.
 * 
 * This module centralizes application bootstrap logic that was previously
 * in the DOMContentLoaded handler in app.js.
 * 
 * @module app-init
 */

// Export to make this a proper module for global augmentation
export {};

/**
 * Global window interface extensions for app initialization
 */
declare global {
    interface Window {
        initApp?: () => void;
    }
}

/**
 * Type helper for WindowManager
 */
interface IWindowManager {
    getAllWindowIds?: () => string[];
    getTransientWindowIds?: () => string[];
    setDialogInstance?: (id: string, instance: unknown) => void;
}

/**
 * Type helper for Dialog class
 */
interface IDialog {
    new (id: string): unknown;
}

/**
 * Type helper for external module functions
 */
interface GlobalModules {
    ActionBus?: {
        init?: () => void;
    };
    Dialog?: IDialog;
    FinderSystem?: {
        init?: () => void;
    };
    SettingsSystem?: {
        init?: (container: HTMLElement) => void;
    };
    TextEditorSystem?: {
        init?: (container: HTMLElement) => void;
    };
    TerminalSystem?: {
        init?: (container: HTMLElement) => void;
    };
    TerminalInstanceManager?: unknown;
    DockSystem?: {
        initDockDragDrop?: () => void;
    };
}

/**
 * Initialize modal IDs from WindowManager or fallback to default list
 * @returns Object containing modalIds array and transientModalIds set
 */
function initModalIds(): { modalIds: string[]; transientModalIds: Set<string> } {
    const win = window as Window & { WindowManager?: IWindowManager; APP_CONSTANTS?: { MODAL_IDS?: string[]; TRANSIENT_MODAL_IDS?: Set<string> } };
    
    if (win.WindowManager) {
        const modalIds = win.WindowManager.getAllWindowIds?.() || [];
        const transientIds = win.WindowManager.getTransientWindowIds?.() || [];
        return {
            modalIds,
            transientModalIds: new Set(transientIds),
        };
    } else {
        // Fallback
        const modalIds = win.APP_CONSTANTS?.MODAL_IDS || [
            'finder-modal',
            'projects-modal',
            'about-modal',
            'settings-modal',
            'text-modal',
            'terminal-modal',
            'image-modal',
            'program-info-modal',
        ];
        const transientModalIds = win.APP_CONSTANTS?.TRANSIENT_MODAL_IDS || new Set(['program-info-modal']);
        return { modalIds, transientModalIds };
    }
}

/**
 * Main application initialization function.
 * Called automatically on DOMContentLoaded.
 * Sets up dialog instances, ActionBus, and initializes all subsystems.
 */
function initApp(): void {
    const win = window as Window & GlobalModules & { WindowManager?: IWindowManager };
    const funcs = window as Window & {
        hideMenuDropdowns?: () => void;
        bringDialogToFront?: (id: string) => void;
        updateProgramLabelByTopModal?: () => void;
        syncTopZIndexWithDOM?: () => void;
        restoreWindowPositions?: () => void;
        restoreOpenModals?: () => void;
        loadGithubRepos?: () => void;
        initSystemStatusControls?: () => void;
        initDesktop?: () => void;
        initDockMagnification?: () => void;
    };

    // Modal-IDs initialisieren
    const { modalIds } = initModalIds();

    // ActionBus initialisieren
    if (win.ActionBus) {
        win.ActionBus.init?.();
    }

    // Wenn auf einen sichtbaren Modalcontainer geklickt wird, hole das Fenster in den Vordergrund
    document.querySelectorAll('.modal').forEach((modal) => {
        modal.addEventListener('click', function (e) {
            // Verhindere, dass Klicks auf interaktive Elemente im Modal den Fokuswechsel stören.
            const target = e.target as Node;
            if (e.target === modal || modal.contains(target)) {
                funcs.hideMenuDropdowns?.();
                funcs.bringDialogToFront?.(modal.id);
                funcs.updateProgramLabelByTopModal?.();
            }
        });
    });

    // Dialog-Instanzen erstellen und im WindowManager registrieren
    const dialogs = window.dialogs || {};
    window.dialogs = dialogs;
    if (modalIds && Array.isArray(modalIds)) {
        modalIds.forEach((id) => {
            const modal = document.getElementById(id);
            if (!modal || !win.Dialog) return;
            const dialogInstance = new win.Dialog(id);
            dialogs[id] = dialogInstance as unknown as Record<string, unknown>;

            // Im WindowManager registrieren
            if (win.WindowManager) {
                win.WindowManager.setDialogInstance?.(id, dialogInstance);
            }
        });
    }

    // Add click-outside-to-close functionality for launchpad
    const launchpadModal = document.getElementById('launchpad-modal');
    if (launchpadModal) {
        launchpadModal.addEventListener('click', function (e) {
            // Check if the click is on the modal background (not on the inner content)
            if (e.target === launchpadModal) {
                const launchpadDialog = dialogs['launchpad-modal'] as { close?: () => void };
                launchpadDialog?.close?.();
            }
        });
    }

    funcs.syncTopZIndexWithDOM?.();
    funcs.restoreWindowPositions?.();
    funcs.restoreOpenModals?.();
    funcs.initSystemStatusControls?.();
    funcs.initDesktop?.();

    // Finder initialisieren nach Dialog-Setup
    if (win.FinderSystem && typeof win.FinderSystem.init === 'function') {
        win.FinderSystem.init();
    }

    // Initialize settings module
    if (win.SettingsSystem) {
        const settingsContainer = document.getElementById('settings-container');
        if (settingsContainer) {
            win.SettingsSystem.init?.(settingsContainer);
        }
    }

    // Initialize text editor module
    if (win.TextEditorSystem) {
        const textEditorContainer = document.getElementById('text-editor-container');
        if (textEditorContainer) {
            win.TextEditorSystem.init?.(textEditorContainer);
        }
    }

    // Initialize terminal module (legacy) only when multi‑instance is not available
    // Prevents duplicate inputs causing E2E strict-mode locator conflicts
    if (!win.TerminalInstanceManager && win.TerminalSystem) {
        const terminalContainer = document.getElementById('terminal-container');
        if (terminalContainer) {
            win.TerminalSystem.init?.(terminalContainer);
        }
    }

    funcs.initDockMagnification?.();
    if (win.DockSystem && typeof win.DockSystem.initDockDragDrop === 'function') {
        win.DockSystem.initDockDragDrop();
    }
}

// ============================================================================
// IIFE Export Pattern - Expose initApp globally and auto-attach to DOMContentLoaded
// ============================================================================

(() => {
    if (typeof window.initApp !== 'function') {
        window.initApp = initApp;
    }
    
    // Auto-attach to DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        // DOMContentLoaded already fired, run immediately
        initApp();
    }
})();
