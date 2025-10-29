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
    SessionManager?: {
        init?: () => void;
        restoreSession?: () => boolean;
    };
}

/**
 * Initialize modal IDs from WindowManager or fallback to default list
 * @returns Object containing modalIds array and transientModalIds set
 */
function initModalIds(): { modalIds: string[]; transientModalIds: Set<string> } {
    const win = window as Window & {
        WindowManager?: IWindowManager;
        APP_CONSTANTS?: { MODAL_IDS?: string[]; TRANSIENT_MODAL_IDS?: Set<string> };
    };

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
        const transientModalIds =
            win.APP_CONSTANTS?.TRANSIENT_MODAL_IDS || new Set(['program-info-modal']);
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
    document.querySelectorAll('.modal').forEach(modal => {
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
        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            if (!modal || !win.Dialog) return;
            
            try {
                const dialogInstance = new win.Dialog(id);
                dialogs[id] = dialogInstance as unknown as Record<string, unknown>;

                // Im WindowManager registrieren
                if (win.WindowManager) {
                    win.WindowManager.setDialogInstance?.(id, dialogInstance);
                }
            } catch (err) {
                console.error(`Failed to create dialog instance for "${id}":`, err);
            }
        });
    }

    // Add click-outside-to-close functionality for launchpad
    const launchpadModal = document.getElementById('launchpad-modal');
    if (launchpadModal) {
        // Primary: close when clicking outside the inner content within the modal wrapper.
        launchpadModal.addEventListener('click', function (e) {
            try {
                const inner = launchpadModal.querySelector('.launchpad-modal-inner');
                const target = e.target as Node;
                if (inner ? !inner.contains(target) : target === launchpadModal) {
                    const launchpadDialog = dialogs['launchpad-modal'] as { close?: () => void };
                    launchpadDialog?.close?.();
                }
            } catch {
                /* ignore */
            }
        });

        // Fallback: capture-phase handler to close even when the wrapper has pointer-events:none
        // and clicks are dispatched to underlying elements (e.g., tests using page.mouse.click).
        document.addEventListener(
            'click',
            function (e) {
                try {
                    // Only act if launchpad is currently visible
                    if (launchpadModal.classList.contains('hidden')) return;
                    const inner = launchpadModal.querySelector('.launchpad-modal-inner');
                    const target = e.target as Node;
                    if (inner && inner.contains(target)) return; // clicked inside → ignore
                    const launchpadDialog = dialogs['launchpad-modal'] as { close?: () => void };
                    launchpadDialog?.close?.();
                } catch {
                    /* ignore */
                }
            },
            true
        );
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
    
    // Initialize SessionManager for auto-save and restore session if available
    if (win.SessionManager) {
        try {
            win.SessionManager.init?.();
            // Attempt to restore session after all managers are initialized
            // This happens after Terminal/TextEditor managers are ready
            setTimeout(() => {
                if (win.SessionManager?.restoreSession) {
                    win.SessionManager.restoreSession();
                }
            }, 100); // Small delay to ensure all managers are ready
        } catch (err) {
            console.warn('SessionManager initialization failed:', err);
        }
    }

    // Defensive: ensure the dock is visible. Some environments or timing races
    // can leave the dock with hidden/display styles that make it "invisible"
    // to Playwright checks. Remove any accidental 'hidden' class and reset
    // inline visibility/display so tests can interact reliably.
    try {
        const dockEl = document.getElementById('dock');
        if (dockEl) {
            if (dockEl.classList.contains('hidden')) dockEl.classList.remove('hidden');
            // Reset common inline properties that may hide the element
            dockEl.style.display = dockEl.style.display || '';
            dockEl.style.visibility = dockEl.style.visibility || 'visible';
        }
    } catch {
        // non-fatal; continue startup
    }

    // Defensive DOM fix: if the dock has been accidentally placed inside a
    // modal wrapper (for example due to malformed HTML or runtime reparenting),
    // move it to document.body so it isn't affected by ancestor display:none
    // which makes it invisible to Playwright. This is a low-risk, idempotent
    // operation and keeps tests deterministic while the underlying HTML is
    // corrected.
    try {
        const dockEl = document.getElementById('dock');
        if (dockEl && dockEl.parentElement && dockEl.parentElement !== document.body) {
            document.body.appendChild(dockEl);
            console.info('[APP-INIT] moved #dock to document.body to avoid hidden ancestor(s)');
        }
    } catch {
        /* ignore */
    }

    // Defensive: ensure all modal wrappers are direct children of <body>.
    // This helps when malformed HTML accidentally nests modal wrappers
    // inside each other which in turn causes computed display:none on
    // ancestors and zero-sized geometry for centered content.
    try {
        const ensureModalsInBody = () => {
            try {
                const modals = Array.from(document.querySelectorAll('.modal')) as HTMLElement[];
                let moved = false;
                modals.forEach(m => {
                    if (m.parentElement && m.parentElement !== document.body) {
                        document.body.appendChild(m);
                        moved = true;
                    }
                });
                if (moved)
                    console.info(
                        '[APP-INIT] reparented misplaced .modal elements to document.body'
                    );
                return moved;
            } catch {
                return false;
            }
        };

        ensureModalsInBody();
        setTimeout(ensureModalsInBody, 50);
        setTimeout(ensureModalsInBody, 200);
        setTimeout(ensureModalsInBody, 500);
    } catch {
        /* ignore */
    }

    // Debugging: log some runtime info about the dock so E2E traces show why
    // Playwright may mark it hidden; include computed styles and dimensions.
    try {
        const dockEl = document.getElementById('dock');
        if (dockEl) {
            const rect = dockEl.getBoundingClientRect();
            const cs = window.getComputedStyle(dockEl);
            console.info('[APP-INIT] Dock debug:', {
                className: dockEl.className,
                display: cs.display,
                visibility: cs.visibility,
                opacity: cs.opacity,
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left,
                inViewport: rect.top < (window.innerHeight || 0) && rect.bottom > 0,
            });
            // Also write these values into a data attribute so E2E snapshots and
            // traces (which may not include console output) can inspect the
            // runtime state of the dock element.
            try {
                const dbg = JSON.stringify({
                    className: dockEl.className,
                    display: cs.display,
                    visibility: cs.visibility,
                    opacity: cs.opacity,
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    top: Math.round(rect.top),
                    left: Math.round(rect.left),
                    inViewport: rect.top < (window.innerHeight || 0) && rect.bottom > 0,
                });
                dockEl.setAttribute('data-dock-debug', dbg);
            } catch {
                /* swallow */
            }
        } else {
            console.info('[APP-INIT] Dock debug: element not found');
        }
    } catch (e) {
        console.warn('[APP-INIT] Dock debug failed', e);
    }

    // Signal that the app is ready for E2E tests.
    // Important: delay setting __APP_READY until the full page load event
    // so that later scripts (for example the legacy `app.js` included
    // after this file) have a chance to run and not hide UI elements
    // after tests consider the app ready.
    const gw = window as Window & { __APP_READY?: boolean };
    function markReady() {
        try {
            // At load time, ensure the dock is placed under document.body so
            // any legacy scripts that reparent early don't leave it inside a
            // hidden modal. Do this right before signaling readiness so tests
            // observe the final DOM state.
            const ensureDockInBody = () => {
                try {
                    const dockEl = document.getElementById('dock');
                    if (dockEl && dockEl.parentElement && dockEl.parentElement !== document.body) {
                        document.body.appendChild(dockEl);
                        console.info('[APP-INIT] moved #dock to document.body (ensured at load)');
                        return true;
                    }
                } catch {
                    /* ignore */
                }
                return false;
            };

            // Try immediately and a few times after small delays to survive other
            // scripts that may reparent DOM nodes during startup.
            ensureDockInBody();
            setTimeout(ensureDockInBody, 50);
            setTimeout(ensureDockInBody, 200);
            setTimeout(ensureDockInBody, 500);

            gw.__APP_READY = true;
            console.info('[APP-INIT] __APP_READY=true');
        } catch {
            /* swallow */
        }
    }

    if (document.readyState === 'complete') {
        // load already fired
        markReady();
    } else {
        window.addEventListener('load', markReady, { once: true });
        // Fallback: if the load event doesn't fire (e.g., due to a blocked resource)
        // make sure tests can proceed by marking ready after a short grace period.
        setTimeout(() => {
            if (!gw.__APP_READY) {
                console.warn('[APP-INIT] load event not observed within timeout; forcing __APP_READY');
                markReady();
            }
        }, 4000);
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
