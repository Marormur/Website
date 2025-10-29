"use strict";
/**
 * SessionManager - Debounced Auto-Save System for Window Instances
 *
 * Provides centralized, debounced persistence of window instance state to localStorage.
 * Handles storage quota limits gracefully and coordinates saves across multiple instances.
 */
console.log('SessionManager loaded');
(() => {
    'use strict';
    // ===== Constants =====
    const SESSION_STORAGE_KEY = 'windowInstancesSession';
    const SESSION_VERSION = '1.0';
    const DEFAULT_DEBOUNCE_MS = 750; // Conservative default
    const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB conservative limit (most browsers allow 5-10MB)
    // ===== Module Variables =====
    let saveTimer = null;
    let debounceDelay = DEFAULT_DEBOUNCE_MS;
    let pendingSaveTypes = new Set(); // Track which instance types need saving
    let quotaExceeded = false;
    let saveInProgress = false;
    // ===== Storage Helpers =====
    /**
     * Estimate size of data in bytes (rough approximation)
     */
    function estimateSize(data) {
        try {
            return JSON.stringify(data).length * 2; // Rough UTF-16 byte estimate
        }
        catch {
            return 0;
        }
    }
    /**
     * Check if storage quota is available
     */
    function checkStorageQuota(dataSize) {
        if (quotaExceeded) {
            return false;
        }
        return dataSize < MAX_STORAGE_SIZE;
    }
    /**
     * Read session from localStorage
     */
    function readSession() {
        try {
            const raw = localStorage.getItem(SESSION_STORAGE_KEY);
            if (!raw)
                return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object')
                return null;
            if (parsed.version !== SESSION_VERSION) {
                console.warn(`SessionManager: Version mismatch (stored: ${parsed.version}, expected: ${SESSION_VERSION})`);
                return null;
            }
            return parsed;
        }
        catch (err) {
            console.warn('SessionManager: Failed to read session:', err);
            return null;
        }
    }
    /**
     * Write session to localStorage with quota handling
     */
    function writeSession(session) {
        const size = estimateSize(session);
        if (!checkStorageQuota(size)) {
            if (!quotaExceeded) {
                console.error('SessionManager: Storage quota exceeded. Auto-save disabled.');
                console.error(`Attempted to save ${(size / 1024).toFixed(2)}KB, limit is ${(MAX_STORAGE_SIZE / 1024).toFixed(2)}KB`);
                quotaExceeded = true;
            }
            return false;
        }
        try {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
            quotaExceeded = false; // Reset flag on successful save
            return true;
        }
        catch (err) {
            if (err instanceof Error && err.name === 'QuotaExceededError') {
                console.error('SessionManager: Storage quota exceeded:', err);
                quotaExceeded = true;
            }
            else {
                console.error('SessionManager: Failed to write session:', err);
            }
            return false;
        }
    }
    /**
     * Clear session from localStorage
     */
    function clearSession() {
        try {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            console.log('SessionManager: Session cleared');
        }
        catch (err) {
            console.warn('SessionManager: Failed to clear session:', err);
        }
    }
    // ===== Instance Manager Integration =====
    /**
     * Get all instance managers registered globally
     */
    function getInstanceManagers() {
        const managers = new Map();
        const w = window;
        // Known instance managers (terminal, text-editor, etc.)
        const knownManagers = [
            'TerminalInstanceManager',
            'TextEditorInstanceManager',
        ];
        knownManagers.forEach(key => {
            const manager = w[key];
            if (manager && typeof manager === 'object') {
                const mgr = manager;
                const type = typeof mgr.type === 'string' ? mgr.type : key.replace('InstanceManager', '').toLowerCase();
                managers.set(type, manager);
            }
        });
        return managers;
    }
    /**
     * Serialize all instances from all managers
     */
    function serializeAllInstances() {
        const result = {};
        const managers = getInstanceManagers();
        managers.forEach((manager, type) => {
            const mgr = manager;
            if (typeof mgr.serializeAll === 'function') {
                try {
                    const instances = mgr.serializeAll();
                    if (Array.isArray(instances)) {
                        result[type] = instances;
                    }
                }
                catch (err) {
                    console.error(`SessionManager: Failed to serialize instances for type "${type}":`, err);
                }
            }
        });
        return result;
    }
    // ===== Core Save Logic =====
    /**
     * Perform the actual save operation
     */
    function performSave() {
        if (saveInProgress) {
            console.warn('SessionManager: Save already in progress, skipping');
            return;
        }
        saveInProgress = true;
        lastSaveAttempt = Date.now();
        try {
            const instances = serializeAllInstances();
            const session = {
                version: SESSION_VERSION,
                timestamp: Date.now(),
                instances,
            };
            const success = writeSession(session);
            if (success) {
                const instanceCount = Object.values(instances).reduce((sum, arr) => sum + arr.length, 0);
                console.log(`SessionManager: Saved ${instanceCount} instances across ${Object.keys(instances).length} types`);
            }
            pendingSaveTypes.clear();
        }
        catch (err) {
            console.error('SessionManager: Save failed:', err);
        }
        finally {
            saveInProgress = false;
        }
    }
    /**
     * Schedule a debounced save
     */
    function scheduleSave(instanceType) {
        if (instanceType) {
            pendingSaveTypes.add(instanceType);
        }
        if (saveTimer !== null) {
            clearTimeout(saveTimer);
        }
        saveTimer = window.setTimeout(() => {
            saveTimer = null;
            performSave();
        }, debounceDelay);
    }
    // ===== Public API =====
    /**
     * Save all instances immediately (skip debounce)
     */
    function saveAll(options = {}) {
        if (options.immediate) {
            if (saveTimer !== null) {
                clearTimeout(saveTimer);
                saveTimer = null;
            }
            performSave();
        }
        else {
            scheduleSave();
        }
    }
    /**
     * Save instances of a specific type (debounced by default)
     */
    function saveInstanceType(instanceType, options = {}) {
        if (options.immediate) {
            if (saveTimer !== null) {
                clearTimeout(saveTimer);
                saveTimer = null;
            }
            performSave();
        }
        else {
            scheduleSave(instanceType);
        }
    }
    /**
     * Restore session from localStorage
     */
    function restoreSession() {
        const session = readSession();
        if (!session) {
            console.log('SessionManager: No session to restore');
            return false;
        }
        const managers = getInstanceManagers();
        let restoredCount = 0;
        Object.entries(session.instances).forEach(([type, instances]) => {
            const manager = managers.get(type);
            if (!manager) {
                console.warn(`SessionManager: No manager found for type "${type}"`);
                return;
            }
            const mgr = manager;
            if (typeof mgr.deserializeAll === 'function') {
                try {
                    mgr.deserializeAll(instances);
                    restoredCount += instances.length;
                    console.log(`SessionManager: Restored ${instances.length} "${type}" instances`);
                }
                catch (err) {
                    console.error(`SessionManager: Failed to restore instances for type "${type}":`, err);
                }
            }
        });
        console.log(`SessionManager: Restored ${restoredCount} instances total`);
        return restoredCount > 0;
    }
    /**
     * Configure debounce delay
     */
    function setDebounceDelay(ms) {
        if (ms < 100 || ms > 5000) {
            console.warn(`SessionManager: Invalid debounce delay ${ms}ms, must be 100-5000ms`);
            return;
        }
        debounceDelay = ms;
        console.log(`SessionManager: Debounce delay set to ${ms}ms`);
    }
    /**
     * Get current debounce delay
     */
    function getDebounceDelay() {
        return debounceDelay;
    }
    /**
     * Clear all saved session data
     */
    function clear() {
        if (saveTimer !== null) {
            clearTimeout(saveTimer);
            saveTimer = null;
        }
        pendingSaveTypes.clear();
        clearSession();
        quotaExceeded = false;
    }
    /**
     * Get session statistics
     */
    function getStats() {
        const session = readSession();
        if (!session) {
            return {
                hasSession: false,
                instanceCount: 0,
                types: [],
                timestamp: null,
                sizeBytes: 0,
            };
        }
        const instanceCount = Object.values(session.instances).reduce((sum, arr) => sum + arr.length, 0);
        const types = Object.keys(session.instances);
        const sizeBytes = estimateSize(session);
        return {
            hasSession: true,
            instanceCount,
            types,
            timestamp: session.timestamp,
            sizeBytes,
            quotaExceeded,
        };
    }
    // ===== Lifecycle Hooks =====
    /**
     * Initialize auto-save system and browser lifecycle hooks
     */
    function init() {
        console.log('SessionManager: Initializing auto-save system');
        // Save on window blur (user switching away)
        window.addEventListener('blur', () => {
            saveAll({ immediate: true });
        });
        // Save on beforeunload (page closing/refreshing)
        window.addEventListener('beforeunload', () => {
            // Must be immediate to complete before page unload
            performSave();
        });
        // Save on visibility change (tab hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                saveAll({ immediate: true });
            }
        });
        console.log(`SessionManager: Initialized with ${debounceDelay}ms debounce`);
    }
    // ===== Global API =====
    const SessionManager = {
        init,
        saveAll,
        saveInstanceType,
        restoreSession,
        clear,
        setDebounceDelay,
        getDebounceDelay,
        getStats,
    };
    window.SessionManager = SessionManager;
})();
//# sourceMappingURL=session-manager.js.map