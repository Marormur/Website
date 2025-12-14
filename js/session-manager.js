'use strict';
/**
 * SessionManager - Debounced Auto-Save System for Window Instances
 *
 * Provides centralized, debounced persistence of window instance state to localStorage.
 * Handles storage quota limits gracefully and coordinates saves across multiple instances.
 */
Object.defineProperty(exports, '__esModule', { value: true });
console.log('SessionManager loaded');
const storage_utils_js_1 = require('./storage-utils.js');
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
        } catch {
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
            const parsed = (0, storage_utils_js_1.getJSON)(SESSION_STORAGE_KEY, null);
            if (!parsed || typeof parsed !== 'object') return null;
            if (parsed.version !== SESSION_VERSION) {
                console.warn(
                    `SessionManager: Version mismatch (stored: ${parsed.version}, expected: ${SESSION_VERSION})`
                );
                return null;
            }
            return parsed;
        } catch (err) {
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
                console.error(
                    `Attempted to save ${(size / 1024).toFixed(2)}KB, limit is ${(MAX_STORAGE_SIZE / 1024).toFixed(2)}KB`
                );
                quotaExceeded = true;
            }
            return false;
        }
        try {
            (0, storage_utils_js_1.setJSON)(SESSION_STORAGE_KEY, session);
            quotaExceeded = false; // Reset flag on successful save
            return true;
        } catch (err) {
            if (err instanceof Error && err.name === 'QuotaExceededError') {
                console.error('SessionManager: Storage quota exceeded:', err);
                quotaExceeded = true;
            } else {
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
            (0, storage_utils_js_1.remove)(SESSION_STORAGE_KEY);
            console.log('SessionManager: Session cleared');
        } catch (err) {
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
        // Known instance managers (terminal, text-editor)
        // NOTE: Finder is now handled by MultiWindowSessionManager, not legacy SessionManager
        const knownManagers = ['TerminalInstanceManager', 'TextEditorInstanceManager'];
        knownManagers.forEach(key => {
            const manager = w[key];
            if (manager && typeof manager === 'object') {
                const mgr = manager;
                const type =
                    typeof mgr.type === 'string'
                        ? mgr.type
                        : key.replace('InstanceManager', '').toLowerCase();
                managers.set(type, manager);
                try {
                    const normalized = type.replace(/[-_]/g, '').toLowerCase();
                    if (normalized && !managers.has(normalized)) {
                        managers.set(normalized, manager);
                    }
                } catch {
                    /* ignore */
                }
            }
        });
        return managers;
    }
    /**
     * Serialize all instances from all managers
     */
    function serializeAllInstances() {
        const result = {};
        const active = {};
        const managers = getInstanceManagers();
        managers.forEach((manager, type) => {
            const mgr = manager;
            if (typeof mgr.serializeAll === 'function') {
                try {
                    const instances = mgr.serializeAll.call(mgr);
                    if (Array.isArray(instances)) {
                        result[type] = instances;
                    }
                } catch (err) {
                    console.error(
                        `SessionManager: Failed to serialize instances for type "${type}":`,
                        err
                    );
                }
            }
            // Capture active instanceId per type if available
            try {
                if (typeof mgr.getActiveInstance === 'function') {
                    const activeInst = mgr.getActiveInstance.call(mgr);
                    active[type] = activeInst?.instanceId || null;
                } else {
                    active[type] = null;
                }
            } catch {
                active[type] = null;
            }
        });
        return { instances: result, active };
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
        try {
            const { instances, active } = serializeAllInstances();
            // Capture current window z-index order from Dialog's __zIndexManager
            const zIndexManager = window.__zIndexManager;
            const windowStack =
                zIndexManager && typeof zIndexManager.getWindowStack === 'function'
                    ? zIndexManager.getWindowStack()
                    : [];
            const session = {
                version: SESSION_VERSION,
                timestamp: Date.now(),
                instances,
                active,
                windowStack,
            };
            const success = writeSession(session);
            if (success) {
                const instanceCount = Object.values(instances).reduce(
                    (sum, arr) => sum + arr.length,
                    0
                );
                console.log(
                    `SessionManager: Saved ${instanceCount} instances across ${Object.keys(instances).length} types`
                );
            }
            pendingSaveTypes.clear();
        } catch (err) {
            console.error('SessionManager: Save failed:', err);
        } finally {
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
        } else {
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
        } else {
            scheduleSave(instanceType);
        }
    }
    /**
     * Restore session from localStorage
     */
    function restoreSession() {
        const session = readSession();
        try {
            console.info('[SessionManager] restoreSession invoked');
            console.log('[SessionManager] raw session:', session);
        } catch (_a) {
            /* ignore */
        }
        if (!session) {
            console.log('SessionManager: No session to restore');
            return false;
        }
        const managers = getInstanceManagers();
        try {
            console.info('[SessionManager] discovered managers:', Array.from(managers.keys()));
        } catch (_b) {
            /* ignore */
        }
        let restoredCount = 0;
        const activeMap = session.active || {};
        Object.entries(session.instances).forEach(([type, instances]) => {
            const manager = managers.get(type);
            if (!manager) {
                console.warn(`SessionManager: No manager found for type "${type}"`);
                try {
                    // Queue pending restore for managers that register later
                    const w = window;
                    w.SessionManager = w.SessionManager || {};
                    w.SessionManager._pendingRestores = w.SessionManager._pendingRestores || {};
                    w.SessionManager._pendingRestores[type] = instances;
                    console.log(
                        `SessionManager: queued ${Array.isArray(instances) ? instances.length : 0} pending instances for type "${type}" to restore when manager registers`
                    );
                } catch (_c) {}
                return;
            }
            const mgr = manager;
            if (typeof mgr.deserializeAll === 'function') {
                try {
                    try {
                        console.debug(
                            `SessionManager: calling deserializeAll on manager for type \"${type}\" with ${Array.isArray(instances) ? instances.length : 0} items`
                        );
                    } catch (_c) {}
                    mgr.deserializeAll(instances);
                    restoredCount += instances.length;
                    console.log(`SessionManager: Restored ${instances.length} "${type}" instances`);
                    // Restore previously active instance for this type if present
                    const activeId = activeMap[type] || null;
                    if (activeId && typeof mgr.setActiveInstance === 'function') {
                        try {
                            mgr.setActiveInstance(activeId);
                        } catch (e) {
                            console.warn(
                                `SessionManager: Failed to set active instance for ${type}:`,
                                e
                            );
                        }
                    }
                } catch (err) {
                    console.error(
                        `SessionManager: Failed to restore instances for type "${type}":`,
                        err
                    );
                }
            }
        });
        // Restore z-index order from saved windowStack
        const windowStack = session.windowStack || [];
        if (windowStack.length > 0) {
            const zIndexManager = window.__zIndexManager;
            if (zIndexManager && typeof zIndexManager.restoreWindowStack === 'function') {
                try {
                    zIndexManager.restoreWindowStack(windowStack);
                    console.log(
                        `SessionManager: Restored z-index order for ${windowStack.length} windows`
                    );
                } catch (err) {
                    console.warn('SessionManager: Failed to restore window z-index order:', err);
                }
            }
        }
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
        const instanceCount = Object.values(session.instances).reduce(
            (sum, arr) => sum + arr.length,
            0
        );
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
    /**
     * Export current session as JSON string
     * @returns JSON string of current session or null if no session exists
     */
    function exportSession() {
        // First save current state to ensure we export the latest
        performSave();
        const session = readSession();
        if (!session) {
            console.warn('SessionManager: No session to export');
            return null;
        }
        try {
            // Pretty-print for human readability
            const json = JSON.stringify(session, null, 2);
            console.log(`SessionManager: Exported session (${(json.length / 1024).toFixed(2)}KB)`);
            return json;
        } catch (err) {
            console.error('SessionManager: Failed to export session:', err);
            return null;
        }
    }
    /**
     * Import session from JSON string
     * @param json - JSON string containing session data
     * @returns true if import successful, false otherwise
     */
    function importSession(json) {
        if (!json || typeof json !== 'string') {
            console.error('SessionManager: Invalid import data (must be non-empty string)');
            return false;
        }
        let session;
        try {
            session = JSON.parse(json);
        } catch (err) {
            console.error('SessionManager: Failed to parse import JSON:', err);
            return false;
        }
        // Validate schema
        if (!session || typeof session !== 'object') {
            console.error('SessionManager: Invalid session data (must be object)');
            return false;
        }
        if (!session.version || typeof session.version !== 'string') {
            console.error('SessionManager: Missing or invalid version field');
            return false;
        }
        // Version compatibility check
        if (session.version !== SESSION_VERSION) {
            console.warn(
                `SessionManager: Version mismatch (imported: ${session.version}, current: ${SESSION_VERSION})`
            );
            // For now, we're strict about versions. Future: implement migration logic
            console.error('SessionManager: Cannot import session from different version');
            return false;
        }
        if (!session.instances || typeof session.instances !== 'object') {
            console.error('SessionManager: Missing or invalid instances field');
            return false;
        }
        // Write to localStorage (will validate quota)
        const success = writeSession(session);
        if (!success) {
            console.error('SessionManager: Failed to save imported session to storage');
            return false;
        }
        // Restore the imported session
        const restored = restoreSession();
        if (!restored) {
            console.warn('SessionManager: Imported session saved but restoration failed');
            return false;
        }
        console.log('SessionManager: Successfully imported and restored session');
        return true;
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
        // DISABLED: Causes corrupted session, multi-window-session handles persistence
        // window.addEventListener('beforeunload', () => {
        //     // Must be immediate to complete before page unload
        //     performSave();
        // });
        // Save on visibility change (tab hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                saveAll({ immediate: true });
            }
        });
        console.log(`SessionManager: Initialized with ${debounceDelay}ms debounce`);
    }
    // ===== Global API =====
    /**
     * Legacy no-op: Managers are auto-discovered
     * @deprecated Use automatic discovery instead
     */
    function registerManager(_type, _manager) {
        // No-op: Auto-discovery handles this
        console.log(`SessionManager: registerManager() is deprecated - using auto-discovery`);
    }
    /**
     * Legacy no-op: Managers are auto-discovered
     * @deprecated Use automatic discovery instead
     */
    function unregisterManager(_type) {
        // No-op: Auto-discovery handles this
    }
    const SessionManager = {
        init,
        saveAll,
        // Alias for backwards compatibility with tests — ensure immediate save
        // when tests call saveAllSessions()
        saveAllSessions: function () {
            saveAll({ immediate: true });
            try {
                const saved = (0, storage_utils_js_1.getJSON)(SESSION_STORAGE_KEY, null);
                console.debug('SessionManager: saveAllSessions wrote session to storage', saved);
            } catch (_c) {}
        },
        saveInstanceType,
        restoreSession,
        clear,
        setDebounceDelay,
        getDebounceDelay,
        getStats,
        exportSession,
        importSession,
        registerManager, // Legacy compatibility
        unregisterManager, // Legacy compatibility
    };
    window.SessionManager = SessionManager;
})();
//# sourceMappingURL=session-manager.js.map
