/**
 * SessionManager - Debounced Auto-Save System for Window Instances
 *
 * Provides centralized, debounced persistence of window instance state to localStorage.
 * Handles storage quota limits gracefully and coordinates saves across multiple instances.
 */

logger.debug('SESSION', 'SessionManager loaded');

import { getJSON, setJSON, remove } from '../services/storage-utils.js';
import logger from '../core/logger.js';

(() => {
    'use strict';

    // ===== Types =====
    type InstanceData = {
        instanceId: string;
        type: string;
        title: string;
        state: Record<string, unknown>;
        metadata: Record<string, unknown>;
    };

    type SessionData = {
        version: string;
        timestamp: number;
        instances: Record<string, InstanceData[]>; // Keyed by instance type (terminal, text-editor, etc.)
        active?: Record<string, string | null>; // Keyed by type -> active instanceId
        windowStack?: string[]; // Z-index order of windows (bottom to top)
    };

    type SaveOptions = {
        immediate?: boolean; // Skip debounce and save immediately
    };

    // ===== Constants =====
    const SESSION_STORAGE_KEY = 'windowInstancesSession';
    const SESSION_VERSION = '1.0';
    const DEFAULT_DEBOUNCE_MS = 750; // Conservative default
    const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB conservative limit (most browsers allow 5-10MB)

    // ===== Module Variables =====
    let saveTimer: number | null = null;
    let debounceDelay = DEFAULT_DEBOUNCE_MS;
    let pendingSaveTypes = new Set<string>(); // Track which instance types need saving
    let quotaExceeded = false;
    let saveInProgress = false;

    // ===== Storage Helpers =====

    /**
     * Estimate size of data in bytes (rough approximation)
     */
    function estimateSize(data: unknown): number {
        try {
            return JSON.stringify(data).length * 2; // Rough UTF-16 byte estimate
        } catch {
            return 0;
        }
    }

    /**
     * Check if storage quota is available
     */
    function checkStorageQuota(dataSize: number): boolean {
        if (quotaExceeded) {
            return false;
        }
        return dataSize < MAX_STORAGE_SIZE;
    }

    /**
     * Read session from localStorage
     */
    function readSession(): SessionData | null {
        try {
            const parsed = getJSON<SessionData | null>(SESSION_STORAGE_KEY, null);
            if (!parsed || typeof parsed !== 'object') return null;
            if (parsed.version !== SESSION_VERSION) {
                logger.warn(
                    'SESSION',
                    `SessionManager: Version mismatch (stored: ${parsed.version}, expected: ${SESSION_VERSION})`
                );
                return null;
            }
            return parsed;
        } catch (err) {
            logger.warn('SESSION', 'SessionManager: Failed to read session:', err);
            return null;
        }
    }

    /**
     * Write session to localStorage with quota handling
     */
    function writeSession(session: SessionData): boolean {
        const size = estimateSize(session);

        if (!checkStorageQuota(size)) {
            if (!quotaExceeded) {
                logger.error(
                    'SESSION',
                    'SessionManager: Storage quota exceeded. Auto-save disabled.'
                );
                logger.error(
                    'SESSION',
                    `Attempted to save ${(size / 1024).toFixed(2)}KB, limit is ${(MAX_STORAGE_SIZE / 1024).toFixed(2)}KB`
                );
                quotaExceeded = true;
            }
            return false;
        }

        try {
            setJSON(SESSION_STORAGE_KEY, session);
            quotaExceeded = false; // Reset flag on successful save
            return true;
        } catch (err) {
            if (err instanceof Error && err.name === 'QuotaExceededError') {
                logger.error('SESSION', 'SessionManager: Storage quota exceeded:', err);
                quotaExceeded = true;
            } else {
                logger.error('SESSION', 'SessionManager: Failed to write session:', err);
            }
            return false;
        }
    }

    /**
     * Clear session from localStorage
     */
    function clearSession(): void {
        try {
            remove(SESSION_STORAGE_KEY);
            logger.debug('SESSION', 'SessionManager: Session cleared');
        } catch (err) {
            logger.warn('SESSION', 'SessionManager: Failed to clear session:', err);
        }
    }

    // ===== Instance Manager Integration =====

    /**
     * Get all instance managers registered globally
     */
    function getInstanceManagers(): Map<string, unknown> {
        const managers = new Map<string, unknown>();
        const w = window as unknown as Record<string, unknown>;

        // Known instance managers (terminal, text-editor)
        // NOTE: Finder is now handled by MultiWindowSessionManager, not legacy SessionManager
        const knownManagers = ['TerminalInstanceManager', 'TextEditorInstanceManager'];

        knownManagers.forEach(key => {
            const manager = w[key];
            if (manager && typeof manager === 'object') {
                const mgr = manager as Record<string, unknown>;
                const type =
                    typeof mgr.type === 'string'
                        ? mgr.type
                        : key.replace('InstanceManager', '').toLowerCase();
                managers.set(type, manager);
            }
        });

        return managers;
    }

    /**
     * Serialize all instances from all managers
     */
    function serializeAllInstances(): {
        instances: Record<string, InstanceData[]>;
        active: Record<string, string | null>;
    } {
        const result: Record<string, InstanceData[]> = {};
        const active: Record<string, string | null> = {};
        const managers = getInstanceManagers();

        managers.forEach((manager, type) => {
            const mgr = manager as Record<string, unknown>;
            if (typeof mgr.serializeAll === 'function') {
                try {
                    const instances = (
                        mgr.serializeAll as unknown as (this: unknown) => unknown
                    ).call(mgr);
                    if (Array.isArray(instances)) {
                        result[type] = instances as InstanceData[];
                    }
                } catch (err) {
                    logger.error(
                        'SESSION',
                        `SessionManager: Failed to serialize instances for type "${type}":`,
                        err
                    );
                }
            }

            // Capture active instanceId per type if available
            try {
                if (
                    typeof (
                        mgr as { getActiveInstance?: () => { instanceId?: string | null } | null }
                    ).getActiveInstance === 'function'
                ) {
                    const activeInst = (
                        mgr as { getActiveInstance: () => { instanceId?: string | null } | null }
                    ).getActiveInstance.call(mgr);
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
    function performSave(): void {
        const perf = (
            window as {
                PerfMonitor?: {
                    mark: (n: string) => void;
                    measure: (n: string, s?: string, e?: string) => void;
                };
            }
        ).PerfMonitor;
        perf?.mark('session:save:start');

        if (saveInProgress) {
            logger.warn('SESSION', 'SessionManager: Save already in progress, skipping');
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

            const session: SessionData = {
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
                logger.debug(
                    'SESSION',
                    `SessionManager: Saved ${instanceCount} instances across ${Object.keys(instances).length} types`
                );
            }

            perf?.mark('session:save:end');
            perf?.measure('session:save-duration', 'session:save:start', 'session:save:end');

            pendingSaveTypes.clear();
        } catch (err) {
            logger.error('SESSION', 'SessionManager: Save failed:', err);
        } finally {
            saveInProgress = false;
        }
    }

    /**
     * Schedule a debounced save
     */
    function scheduleSave(instanceType?: string): void {
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
    function saveAll(options: SaveOptions = {}): void {
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
    function saveInstanceType(instanceType: string, options: SaveOptions = {}): void {
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
     * Restore session from localStorage with Batch Restore for performance
     */
    function restoreSession(): boolean {
        const perf = (
            window as {
                PerfMonitor?: {
                    mark: (n: string) => void;
                    measure: (n: string, s?: string, e?: string) => void;
                };
            }
        ).PerfMonitor;
        perf?.mark('session:restore:start');

        const session = readSession();
        // Debugging: surface session contents and available managers to E2E traces
        try {
            logger.info('SESSION', '[SessionManager] restoreSession invoked');
            logger.debug('SESSION', '[SessionManager] raw session:', session);
        } catch {
            /* ignore */
        }
        if (!session) {
            logger.debug('SESSION', 'SessionManager: No session to restore');
            return false;
        }

        const managers = getInstanceManagers();
        try {
            logger.info(
                'SESSION',
                '[SessionManager] discovered managers:',
                Array.from(managers.keys())
            );
        } catch {
            /* ignore */
        }

        const activeMap = (session as SessionData).active || {};

        // BATCH RESTORE: Group by type and restore all types in parallel
        // But keep execution synchronous for backwards compatibility
        let restoredCount = 0;

        // Process all types synchronously but prepare for parallel optimization
        // The actual parallelization happens within deserializeAll implementations
        Object.entries(session.instances).forEach(([type, instances]) => {
            const manager = managers.get(type);
            if (!manager) {
                logger.warn('SESSION', `SessionManager: No manager found for type "${type}"`);
                return;
            }

            const mgr = manager as Record<string, unknown>;
            if (typeof mgr.deserializeAll !== 'function') {
                return;
            }

            try {
                // Batch restore all instances of this type
                (mgr.deserializeAll as (data: InstanceData[]) => void)(instances);
                restoredCount += instances.length;
                logger.debug(
                    'SESSION',
                    `SessionManager: Restored ${instances.length} "${type}" instances`
                );

                // Restore previously active instance for this type if present
                const activeId = activeMap[type] || null;
                if (
                    activeId &&
                    typeof (mgr as { setActiveInstance?: (id: string) => void })
                        .setActiveInstance === 'function'
                ) {
                    try {
                        (mgr as { setActiveInstance: (id: string) => void }).setActiveInstance(
                            activeId
                        );
                    } catch (e) {
                        logger.warn(
                            'SESSION',
                            `SessionManager: Failed to set active instance for ${type}:`,
                            e
                        );
                    }
                }
            } catch (err) {
                logger.error(
                    'SESSION',
                    `SessionManager: Failed to restore instances for type "${type}":`,
                    err
                );
            }
        });

        // Restore z-index order from saved windowStack AFTER all instances are restored
        //
        // Hinweis (#130): Die Wiederherstellung der Fenster-Reihenfolge erfolgt bewusst
        // erst nach der Deserialisierung aller Instanzen und erwartet, dass der
        // __zIndexManager initialisiert ist und Fenster registriert wurden.
        // Multi-Instance-Integration öffnet/holt Modals beim Aktivieren nach vorn,
        // sodass der Stack hier befüllt ist und konsistent wiederhergestellt werden kann.
        const windowStack = session.windowStack || [];
        if (windowStack.length > 0) {
            const zIndexManager = window.__zIndexManager;
            if (zIndexManager && typeof zIndexManager.restoreWindowStack === 'function') {
                try {
                    zIndexManager.restoreWindowStack(windowStack);
                    logger.debug(
                        'SESSION',
                        `SessionManager: Restored z-index order for ${windowStack.length} windows`
                    );
                } catch (err) {
                    logger.warn(
                        'SESSION',
                        'SessionManager: Failed to restore window z-index order:',
                        err
                    );
                }
            }
        }

        logger.debug('SESSION', `SessionManager: Restored ${restoredCount} instances total`);

        perf?.mark('session:restore:end');
        perf?.measure('session:restore-duration', 'session:restore:start', 'session:restore:end');

        return restoredCount > 0;
    }

    /**
     * Configure debounce delay
     */
    function setDebounceDelay(ms: number): void {
        if (ms < 100 || ms > 5000) {
            logger.warn(
                'SESSION',
                `SessionManager: Invalid debounce delay ${ms}ms, must be 100-5000ms`
            );
            return;
        }
        debounceDelay = ms;
        logger.debug('SESSION', `SessionManager: Debounce delay set to ${ms}ms`);
    }

    /**
     * Get current debounce delay
     */
    function getDebounceDelay(): number {
        return debounceDelay;
    }

    /**
     * Clear all saved session data
     */
    function clear(): void {
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
     * Compatibility: return storage info expected by some legacy tests
     * Mirrors getStats but provides the shape `getStorageInfo` used in tests
     */
    function getStorageInfo() {
        const stats = getStats();
        return {
            hasSession: stats.hasSession,
            instanceCount: stats.instanceCount,
            types: stats.types,
            timestamp: stats.timestamp,
            sizeBytes: stats.sizeBytes,
            quotaExceeded: stats.quotaExceeded,
        };
    }

    /**
     * Export current session as JSON string
     * @returns JSON string of current session or null if no session exists
     */
    function exportSession(): string | null {
        // First save current state to ensure we export the latest
        performSave();

        const session = readSession();
        if (!session) {
            logger.warn('SESSION', 'SessionManager: No session to export');
            return null;
        }

        try {
            // Pretty-print for human readability
            const json = JSON.stringify(session, null, 2);
            logger.debug(
                'SESSION',
                `SessionManager: Exported session (${(json.length / 1024).toFixed(2)}KB)`
            );
            return json;
        } catch (err) {
            logger.error('SESSION', 'SessionManager: Failed to export session:', err);
            return null;
        }
    }

    /**
     * Import session from JSON string
     * @param json - JSON string containing session data
     * @returns true if import successful, false otherwise
     */
    function importSession(json: string): boolean {
        if (!json || typeof json !== 'string') {
            logger.error(
                'SESSION',
                'SessionManager: Invalid import data (must be non-empty string)'
            );
            return false;
        }

        let session: SessionData;
        try {
            session = JSON.parse(json) as SessionData;
        } catch (err) {
            logger.error('SESSION', 'SessionManager: Failed to parse import JSON:', err);
            return false;
        }

        // Validate schema
        if (!session || typeof session !== 'object') {
            logger.error('SESSION', 'SessionManager: Invalid session data (must be object)');
            return false;
        }

        if (!session.version || typeof session.version !== 'string') {
            logger.error('SESSION', 'SessionManager: Missing or invalid version field');
            return false;
        }

        // Version compatibility check
        if (session.version !== SESSION_VERSION) {
            logger.warn(
                'SESSION',
                `SessionManager: Version mismatch (imported: ${session.version}, current: ${SESSION_VERSION})`
            );
            // For now, we're strict about versions. Future: implement migration logic
            logger.error('SESSION', 'SessionManager: Cannot import session from different version');
            return false;
        }

        if (!session.instances || typeof session.instances !== 'object') {
            logger.error('SESSION', 'SessionManager: Missing or invalid instances field');
            return false;
        }

        // Write to localStorage (will validate quota)
        const success = writeSession(session);
        if (!success) {
            logger.error('SESSION', 'SessionManager: Failed to save imported session to storage');
            return false;
        }

        // Restore the imported session
        const restored = restoreSession();
        if (!restored) {
            logger.warn('SESSION', 'SessionManager: Imported session saved but restoration failed');
            return false;
        }

        logger.debug('SESSION', 'SessionManager: Successfully imported and restored session');
        return true;
    }

    // ===== Lifecycle Hooks =====

    /**
     * Initialize auto-save system and browser lifecycle hooks
     */
    function init(): void {
        logger.debug('SESSION', 'SessionManager: Initializing auto-save system');

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

        logger.debug('SESSION', `SessionManager: Initialized with ${debounceDelay}ms debounce`);
    }

    const SessionManager = {
        init,
        saveAll,
        saveAllSessions: saveAll, // Alias for backwards compatibility with tests
        saveInstanceType,
        restoreSession,
        clear,
        setDebounceDelay,
        getDebounceDelay,
        getStats,
        getStorageInfo,
        exportSession,
        importSession,
    };

    (window as unknown as { SessionManager: typeof SessionManager }).SessionManager =
        SessionManager;
})();
