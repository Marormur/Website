"use strict";
// ============================================================================
// src/ts/storage.ts — Persistence & State Management Module (TypeScript)
// Mirrors js/storage.js API and preserves global export window.StorageSystem
// ============================================================================
(() => {
    'use strict';
    console.log('✅ StorageSystem (TS) loaded');
    // ===== Module Dependencies / Constants =====
    const w = window;
    const APP_CONSTANTS = w.APP_CONSTANTS || {};
    const FINDER_STATE_KEY = APP_CONSTANTS.FINDER_STATE_STORAGE_KEY || 'finderState';
    const OPEN_MODALS_KEY = 'openModals';
    const MODAL_POSITIONS_KEY = 'modalPositions';
    const getModalIds = () => {
        const ac = w.APP_CONSTANTS || undefined;
        const v = ac && ac['MODAL_IDS'];
        return Array.isArray(v) ? v : [];
    };
    const getTransientModalIds = () => {
        const ac = w.APP_CONSTANTS || undefined;
        const v = ac && ac['TRANSIENT_MODAL_IDS'];
        return v instanceof Set ? v : new Set();
    };
    // ===== Finder State Persistence =====
    function readFinderState() {
        try {
            const raw = localStorage.getItem(FINDER_STATE_KEY);
            if (!raw)
                return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object')
                return null;
            const po = parsed;
            const repo = typeof po.repo === 'string' ? po.repo.trim() : '';
            if (!repo)
                return null;
            return {
                repo,
                path: typeof po.path === 'string' ? po.path : '',
            };
        }
        catch (err) {
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
            path: typeof state.path === 'string' ? state.path : '',
        };
        try {
            localStorage.setItem(FINDER_STATE_KEY, JSON.stringify(payload));
        }
        catch (err) {
            console.warn('Finder state konnte nicht gespeichert werden:', err);
        }
    }
    function clearFinderState() {
        try {
            localStorage.removeItem(FINDER_STATE_KEY);
        }
        catch (err) {
            console.warn('Finder state konnte nicht gelöscht werden:', err);
        }
    }
    // ===== Open Modals Persistence =====
    function saveOpenModals() {
        const modalIds = getModalIds();
        const transientModalIds = getTransientModalIds();
        const openModals = modalIds.filter((id) => {
            if (transientModalIds.has(id))
                return false;
            const el = document.getElementById(id);
            if (!el)
                return false;
            const minimized = el.dataset && el.dataset.minimized === 'true';
            return !el.classList.contains('hidden') || minimized;
        });
        try {
            localStorage.setItem(OPEN_MODALS_KEY, JSON.stringify(openModals));
        }
        catch (err) {
            console.warn('Open modals konnte nicht gespeichert werden:', err);
        }
    }
    function restoreOpenModals() {
        const transientModalIds = getTransientModalIds();
        let openModals = [];
        try {
            openModals = JSON.parse(localStorage.getItem(OPEN_MODALS_KEY) || '[]');
        }
        catch (err) {
            console.warn('Open modals konnte nicht gelesen werden:', err);
            return;
        }
        openModals.forEach((id) => {
            // Skip transient modals
            if (transientModalIds.has(id))
                return;
            // Validate modal exists in DOM
            const el = document.getElementById(id);
            if (!el) {
                console.warn(`Skipping restore of modal "${id}": element not found in DOM`);
                return;
            }
            // Validate modal is registered in WindowManager (if available)
            const WindowManager = w['WindowManager'];
            if (WindowManager && typeof WindowManager.getConfig === 'function') {
                const config = WindowManager.getConfig(id);
                if (!config) {
                    console.warn(`Skipping restore of modal "${id}": not registered in WindowManager`);
                    return;
                }
            }
            // Attempt to restore via dialog instance
            const dialogs = w['dialogs'];
            const dialogInstance = dialogs && dialogs[id];
            const openFn = dialogInstance && dialogInstance['open'];
            if (typeof openFn === 'function') {
                try {
                    openFn();
                }
                catch (err) {
                    console.warn(`Error restoring modal "${id}":`, err);
                    // Fallback: try to show element directly
                    el.classList.remove('hidden');
                }
            }
            else {
                // Fallback: no dialog instance, just show the element
                el.classList.remove('hidden');
            }
        });
        // Update dock indicators and program label (if available)
        const updateDockIndicators = w['updateDockIndicators'];
        if (typeof updateDockIndicators === 'function')
            updateDockIndicators();
        const updateProgramLabelByTopModal = w['updateProgramLabelByTopModal'];
        if (typeof updateProgramLabelByTopModal === 'function')
            updateProgramLabelByTopModal();
    }
    // ===== Window Positions & Sizes =====
    function getDialogWindowElement(modal) {
        if (!modal)
            return null;
        return modal.querySelector('.autopointer') || modal;
    }
    function saveWindowPositions() {
        const modalIds = getModalIds();
        const transientModalIds = getTransientModalIds();
        const positions = {};
        modalIds.forEach((id) => {
            if (transientModalIds.has(id))
                return;
            const el = document.getElementById(id);
            const windowEl = getDialogWindowElement(el);
            if (el && windowEl) {
                positions[id] = {
                    left: (windowEl.style.left || ''),
                    top: (windowEl.style.top || ''),
                    width: (windowEl.style.width || ''),
                    height: (windowEl.style.height || ''),
                    position: (windowEl.style.position || ''),
                };
            }
        });
        try {
            localStorage.setItem(MODAL_POSITIONS_KEY, JSON.stringify(positions));
        }
        catch (err) {
            console.warn('Window positions konnte nicht gespeichert werden:', err);
        }
    }
    function restoreWindowPositions() {
        const transientModalIds = getTransientModalIds();
        let positions = {};
        try {
            positions = JSON.parse(localStorage.getItem(MODAL_POSITIONS_KEY) || '{}');
        }
        catch (err) {
            console.warn('Window positions konnte nicht gelesen werden:', err);
            return;
        }
        Object.keys(positions).forEach((id) => {
            if (transientModalIds.has(id))
                return;
            const el = document.getElementById(id);
            const windowEl = getDialogWindowElement(el);
            if (el && windowEl) {
                const stored = positions[id];
                // noUncheckedIndexedAccess: positions[id] may be undefined
                if (!stored)
                    return;
                if (stored.position) {
                    windowEl.style.position = stored.position;
                }
                else if (stored.left || stored.top) {
                    windowEl.style.position = 'fixed';
                }
                if (stored.left)
                    windowEl.style.left = stored.left;
                if (stored.top)
                    windowEl.style.top = stored.top;
                if (stored.width)
                    windowEl.style.width = stored.width;
                if (stored.height)
                    windowEl.style.height = stored.height;
            }
            const clampWindowToMenuBar = w['clampWindowToMenuBar'];
            if (typeof clampWindowToMenuBar === 'function') {
                clampWindowToMenuBar(windowEl);
            }
        });
    }
    // ===== Layout Reset =====
    function resetWindowLayout() {
        const modalIds = getModalIds();
        modalIds.forEach((id) => {
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
        if (typeof w['topZIndex'] !== 'undefined') {
            w['topZIndex'] = 1000;
        }
        try {
            localStorage.removeItem(MODAL_POSITIONS_KEY);
        }
        catch (err) {
            console.warn('Modal positions konnte nicht gelöscht werden:', err);
        }
        const hideMenuDropdowns = w['hideMenuDropdowns'];
        if (typeof hideMenuDropdowns === 'function')
            hideMenuDropdowns();
        const syncTopZIndexWithDOM = w['syncTopZIndexWithDOM'];
        if (typeof syncTopZIndexWithDOM === 'function')
            syncTopZIndexWithDOM();
        const dialogs = w['dialogs'];
        if (dialogs) {
            Object.values(dialogs).forEach((dialog) => {
                const enforce = dialog['enforceMenuBarBoundary'];
                if (typeof enforce === 'function')
                    enforce();
            });
        }
        // Clear finder state
        clearFinderState();
        const updateProgramLabelByTopModal = w['updateProgramLabelByTopModal'];
        if (typeof updateProgramLabelByTopModal === 'function')
            updateProgramLabelByTopModal();
    }
    // ===== Public API (global) =====
    const api = {
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
        resetWindowLayout,
    };
    w['StorageSystem'] = api;
})();
//# sourceMappingURL=storage.js.map