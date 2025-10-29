"use strict";
// ============================================================================
// src/ts/storage.ts — Persistence & State Management Module (TypeScript)
// Mirrors js/storage.js API and preserves global export window.StorageSystem
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
const storage_utils_js_1 = require("./storage-utils.js");
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
            const parsed = (0, storage_utils_js_1.getJSON)(FINDER_STATE_KEY, null);
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
            (0, storage_utils_js_1.setJSON)(FINDER_STATE_KEY, payload);
        }
        catch (err) {
            console.warn('Finder state konnte nicht gespeichert werden:', err);
        }
    }
    function clearFinderState() {
        try {
            (0, storage_utils_js_1.remove)(FINDER_STATE_KEY);
        }
        catch (err) {
            console.warn('Finder state konnte nicht gelöscht werden:', err);
        }
    }
    // ===== Open Modals Persistence =====
    function saveOpenModals() {
        const modalIds = getModalIds();
        const transientModalIds = getTransientModalIds();
        const openModals = modalIds.filter(id => {
            if (transientModalIds.has(id))
                return false;
            const el = document.getElementById(id);
            if (!el)
                return false;
            const minimized = el.dataset && el.dataset.minimized === 'true';
            return !el.classList.contains('hidden') || minimized;
        });
        try {
            (0, storage_utils_js_1.setJSON)(OPEN_MODALS_KEY, openModals);
        }
        catch (err) {
            console.warn('Open modals konnte nicht gespeichert werden:', err);
        }
    }
    function restoreOpenModals() {
        const transientModalIds = getTransientModalIds();
        // Collect targets from modern key (OPEN_MODALS_KEY) and legacy 'window-session'
        const toRestore = new Set();
        try {
            const arr = (0, storage_utils_js_1.getJSON)(OPEN_MODALS_KEY, []);
            if (Array.isArray(arr))
                arr.forEach((id) => toRestore.add(id));
        }
        catch (err) {
            console.warn('Open modals konnte nicht gelesen werden:', err);
        }
        // Legacy compatibility: support { modalState: { [id]: { visible: boolean, minimized, zIndex } } }
        try {
            const legacy = (0, storage_utils_js_1.getJSON)('window-session', null);
            if (legacy) {
                const modalState = legacy && legacy['modalState'];
                if (modalState && typeof modalState === 'object') {
                    Object.entries(modalState).forEach(([id, state]) => {
                        try {
                            const visible = !!(state && state['visible']);
                            if (visible)
                                toRestore.add(id);
                        }
                        catch {
                            /* ignore */
                        }
                    });
                }
            }
        }
        catch (err) {
            console.warn('Legacy window-session konnte nicht gelesen werden:', err);
        }
        toRestore.forEach(id => {
            // Skip transient modals
            if (transientModalIds.has(id))
                return;
            // Validate modal exists in DOM
            const el = document.getElementById(id);
            if (!el) {
                // Align with legacy expectation in tests
                console.warn(`SessionManager: Modal "${id}" not found in DOM`);
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
            // Prefer WindowManager.open() to ensure initHandler/openHandler are called
            const wm = w['WindowManager'];
            if (wm && typeof wm.open === 'function') {
                try {
                    wm.open(id);
                }
                catch (err) {
                    console.warn(`Error restoring modal "${id}" via WindowManager:`, err);
                    // Fallback: try direct dialog open
                    const dialogs = w['dialogs'];
                    const dialogInstance = dialogs && dialogs[id];
                    const openFn = dialogInstance && dialogInstance['open'];
                    if (typeof openFn === 'function') {
                        try {
                            openFn();
                        }
                        catch (openErr) {
                            console.warn(`Error restoring modal "${id}" via dialog.open():`, openErr);
                            // Final fallback: show element directly
                            const domUtils = w.DOMUtils;
                            if (domUtils && typeof domUtils.show === 'function') {
                                domUtils.show(el);
                            }
                            else {
                                el.classList.remove('hidden');
                            }
                        }
                    }
                    else {
                        // No dialog instance, show element directly
                        const domUtils = w.DOMUtils;
                        if (domUtils && typeof domUtils.show === 'function') {
                            domUtils.show(el);
                        }
                        else {
                            el.classList.remove('hidden');
                        }
                    }
                }
            }
            else {
                // No WindowManager, fallback to dialog instance
                const dialogs = w['dialogs'];
                const dialogInstance = dialogs && dialogs[id];
                const openFn = dialogInstance && dialogInstance['open'];
                if (typeof openFn === 'function') {
                    try {
                        openFn();
                    }
                    catch (err) {
                        console.warn(`Error restoring modal "${id}":`, err);
                        // Fallback: show element directly
                        const domUtils = w.DOMUtils;
                        if (domUtils && typeof domUtils.show === 'function') {
                            domUtils.show(el);
                        }
                        else {
                            el.classList.remove('hidden');
                        }
                    }
                }
                else {
                    // No dialog instance, show element directly
                    const domUtils = w.DOMUtils;
                    if (domUtils && typeof domUtils.show === 'function') {
                        domUtils.show(el);
                    }
                    else {
                        el.classList.remove('hidden');
                    }
                }
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
        modalIds.forEach(id => {
            if (transientModalIds.has(id))
                return;
            const el = document.getElementById(id);
            const windowEl = getDialogWindowElement(el);
            if (el && windowEl) {
                positions[id] = {
                    left: windowEl.style.left || '',
                    top: windowEl.style.top || '',
                    width: windowEl.style.width || '',
                    height: windowEl.style.height || '',
                    position: windowEl.style.position || '',
                };
            }
        });
        try {
            (0, storage_utils_js_1.setJSON)(MODAL_POSITIONS_KEY, positions);
        }
        catch (err) {
            console.warn('Window positions konnte nicht gespeichert werden:', err);
        }
    }
    function restoreWindowPositions() {
        const transientModalIds = getTransientModalIds();
        let positions = {};
        try {
            positions = (0, storage_utils_js_1.getJSON)(MODAL_POSITIONS_KEY, {});
        }
        catch (err) {
            console.warn('Window positions konnte nicht gelesen werden:', err);
            return;
        }
        Object.keys(positions).forEach(id => {
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
        if (typeof w['topZIndex'] !== 'undefined') {
            w['topZIndex'] = 1000;
        }
        try {
            (0, storage_utils_js_1.remove)(MODAL_POSITIONS_KEY);
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
            Object.values(dialogs).forEach(dialog => {
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