// ============================================================================
// js/storage.js — Persistence & State Management Module
// ============================================================================
// Manages:
// - Finder state (repository & path)
// - Open modals persistence
// - Window positions & sizes
// - Layout reset
//
// Exports window.StorageSystem with API:
// - readFinderState() / writeFinderState(state) / clearFinderState()
// - saveOpenModals() / restoreOpenModals()
// - saveWindowPositions() / restoreWindowPositions()
// - resetWindowLayout()
// - getDialogWindowElement(modal)
// ============================================================================

(function () {
    'use strict';

    console.log('✅ StorageSystem loaded');

    // ===== Module Dependencies =====
    const APP_CONSTANTS = window.APP_CONSTANTS || {};
    const FINDER_STATE_KEY = APP_CONSTANTS.FINDER_STATE_STORAGE_KEY || 'finderState';
    const OPEN_MODALS_KEY = 'openModals';
    const MODAL_POSITIONS_KEY = 'modalPositions';

    // Expected to be available from app.js
    const getModalIds = () => window.APP_CONSTANTS?.MODAL_IDS || [];
    const getTransientModalIds = () => window.APP_CONSTANTS?.TRANSIENT_MODAL_IDS || new Set();

    // ===== Finder State Persistence =====

    function readFinderState() {
        try {
            const raw = localStorage.getItem(FINDER_STATE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            const repo = typeof parsed.repo === 'string' ? parsed.repo.trim() : '';
            if (!repo) return null;
            return {
                repo,
                path: typeof parsed.path === 'string' ? parsed.path : ''
            };
        } catch (err) {
            console.warn('Finder state konnte nicht gelesen werden:', err);
            return null;
        }
    }

    function writeFinderState(state) {
        if (!state || typeof state.repo !== 'string' || !state.repo) {
            clearFinderState();
            return;
        }
        const payload = {
            repo: state.repo,
            path: typeof state.path === 'string' ? state.path : ''
        };
        try {
            localStorage.setItem(FINDER_STATE_KEY, JSON.stringify(payload));
        } catch (err) {
            console.warn('Finder state konnte nicht gespeichert werden:', err);
        }
    }

    function clearFinderState() {
        try {
            localStorage.removeItem(FINDER_STATE_KEY);
        } catch (err) {
            console.warn('Finder state konnte nicht gelöscht werden:', err);
        }
    }

    // ===== Open Modals Persistence =====

    function saveOpenModals() {
        const modalIds = getModalIds();
        const transientModalIds = getTransientModalIds();

        const openModals = modalIds.filter(id => {
            if (transientModalIds.has(id)) return false;
            const el = document.getElementById(id);
            if (!el) return false;
            // Als "offen" zählen sowohl sichtbare als auch minimierte Fenster
            const minimized = el.dataset && el.dataset.minimized === 'true';
            return !el.classList.contains("hidden") || minimized;
        });

        try {
            localStorage.setItem(OPEN_MODALS_KEY, JSON.stringify(openModals));
        } catch (err) {
            console.warn('Open modals konnte nicht gespeichert werden:', err);
        }
    }

    function restoreOpenModals() {
        const transientModalIds = getTransientModalIds();
        let openModals = [];

        try {
            openModals = JSON.parse(localStorage.getItem(OPEN_MODALS_KEY) || "[]");
        } catch (err) {
            console.warn('Open modals konnte nicht gelesen werden:', err);
            return;
        }

        openModals.forEach(id => {
            if (transientModalIds.has(id)) return;
            const dialogInstance = window.dialogs && window.dialogs[id];
            if (dialogInstance && typeof dialogInstance.open === 'function') {
                dialogInstance.open();
            } else {
                const el = document.getElementById(id);
                if (el) el.classList.remove("hidden");
            }
        });

        // Update dock indicators and program label (if available)
        if (typeof window.updateDockIndicators === 'function') {
            window.updateDockIndicators();
        }
        if (typeof window.updateProgramLabelByTopModal === 'function') {
            window.updateProgramLabelByTopModal();
        }
    }

    // ===== Window Positions & Sizes =====

    function getDialogWindowElement(modal) {
        if (!modal) return null;
        return modal.querySelector('.autopointer') || modal;
    }

    function saveWindowPositions() {
        const modalIds = getModalIds();
        const transientModalIds = getTransientModalIds();
        const positions = {};

        modalIds.forEach(id => {
            if (transientModalIds.has(id)) return;
            const el = document.getElementById(id);
            const windowEl = getDialogWindowElement(el);
            if (el && windowEl) {
                positions[id] = {
                    left: windowEl.style.left || "",
                    top: windowEl.style.top || "",
                    width: windowEl.style.width || "",
                    height: windowEl.style.height || "",
                    position: windowEl.style.position || ""
                };
            }
        });

        try {
            localStorage.setItem(MODAL_POSITIONS_KEY, JSON.stringify(positions));
        } catch (err) {
            console.warn('Window positions konnte nicht gespeichert werden:', err);
        }
    }

    function restoreWindowPositions() {
        const transientModalIds = getTransientModalIds();
        let positions = {};

        try {
            positions = JSON.parse(localStorage.getItem(MODAL_POSITIONS_KEY) || "{}");
        } catch (err) {
            console.warn('Window positions konnte nicht gelesen werden:', err);
            return;
        }

        Object.keys(positions).forEach(id => {
            if (transientModalIds.has(id)) return;
            const el = document.getElementById(id);
            const windowEl = getDialogWindowElement(el);
            if (el && windowEl) {
                const stored = positions[id];
                if (stored.position) {
                    windowEl.style.position = stored.position;
                } else if (stored.left || stored.top) {
                    windowEl.style.position = 'fixed';
                }
                if (stored.left) windowEl.style.left = stored.left;
                if (stored.top) windowEl.style.top = stored.top;
                if (stored.width) windowEl.style.width = stored.width;
                if (stored.height) windowEl.style.height = stored.height;
            }

            // Clamp to menu bar if available
            if (typeof window.clampWindowToMenuBar === 'function') {
                window.clampWindowToMenuBar(windowEl);
            }
        });
    }

    // ===== Layout Reset =====

    function resetWindowLayout() {
        const modalIds = getModalIds();

        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            const windowEl = getDialogWindowElement(modal);
            if (modal) {
                modal.style.zIndex = '';
            }
            if (windowEl) {
                windowEl.style.left = '';
                windowEl.style.top = '';
                windowEl.style.width = '';
                windowEl.style.height = '';
                windowEl.style.position = '';
                windowEl.style.zIndex = '';
            }
        });

        // Reset z-index tracking (if available in global scope)
        if (typeof window.topZIndex !== 'undefined') {
            window.topZIndex = 1000;
        }

        try {
            localStorage.removeItem(MODAL_POSITIONS_KEY);
        } catch (err) {
            console.warn('Modal positions konnte nicht gelöscht werden:', err);
        }

        // Hide menu dropdowns if available
        if (typeof window.hideMenuDropdowns === 'function') {
            window.hideMenuDropdowns();
        }

        // Re-sync z-index if available
        if (typeof window.syncTopZIndexWithDOM === 'function') {
            window.syncTopZIndexWithDOM();
        }

        // Enforce menu bar boundary for all dialogs
        if (window.dialogs) {
            Object.values(window.dialogs).forEach(dialog => {
                if (dialog && typeof dialog.enforceMenuBarBoundary === 'function') {
                    dialog.enforceMenuBarBoundary();
                }
            });
        }

        // Clear finder state
        clearFinderState();

        // Update program label if available
        if (typeof window.updateProgramLabelByTopModal === 'function') {
            window.updateProgramLabelByTopModal();
        }
    }

    // ===== Public API =====

    window.StorageSystem = {
        // Finder state
        readFinderState,
        writeFinderState,
        clearFinderState,

        // Open modals
        saveOpenModals,
        restoreOpenModals,

        // Window positions
        saveWindowPositions,
        restoreWindowPositions,
        getDialogWindowElement,

        // Layout reset
        resetWindowLayout
    };

})();
