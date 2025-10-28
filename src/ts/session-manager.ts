/**
 * src/ts/session-manager.ts — Session Management with Debounced Auto-Save
 * Centralized persistence for multi-instance window state
 */

(() => {
    'use strict';

    console.log('✅ SessionManager (TS) loaded');

    // ===== Types =====
    type InstanceData = {
        instanceId: string;
        type: string;
        title: string;
        state: Record<string, unknown>;
        metadata: Record<string, unknown>;
    };

    type SessionData = {
        instances: InstanceData[];
        timestamp: number;
        version: string;
    };

    type SaveOptions = {
        debounce?: boolean;
        immediate?: boolean;
    };

    // ===== Constants =====
    const SESSION_STORAGE_KEY = 'session:instances';
    const SESSION_VERSION = '1.0.0';
    const DEFAULT_DEBOUNCE_MS = 500;
    const MAX_STORAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB soft limit

    // ===== Module State =====
    let saveTimer: number | null = null;
    let debounceDelay = DEFAULT_DEBOUNCE_MS;
    let isEnabled = true;

    // ===== Helper Functions =====

    /**
     * Debounce wrapper for function calls
     */
    function debounce(fn: () => void, delay: number): void {
        if (saveTimer !== null) {
            clearTimeout(saveTimer);
        }
        saveTimer = window.setTimeout(() => {
            saveTimer = null;
            fn();
        }, delay);
    }

    /**
     * Get all instance managers from window
     */
    function getAllInstanceManagers(): Array<{
        type: string;
        manager: {
            serializeAll: () => Record<string, unknown>[];
        };
    }> {
        const w = window as unknown as Record<string, unknown>;
        const managers: Array<{
            type: string;
            manager: { serializeAll: () => Record<string, unknown>[] };
        }> = [];

        // Terminal instances
        const terminalMgr = w['TerminalInstanceManager'] as
            | { serializeAll?: () => Record<string, unknown>[] }
            | undefined;
        if (terminalMgr && typeof terminalMgr.serializeAll === 'function') {
            managers.push({ type: 'terminal', manager: terminalMgr as never });
        }

        // Text editor instances
        const editorMgr = w['TextEditorInstanceManager'] as
            | { serializeAll?: () => Record<string, unknown>[] }
            | undefined;
        if (editorMgr && typeof editorMgr.serializeAll === 'function') {
            managers.push({ type: 'text-editor', manager: editorMgr as never });
        }

        return managers;
    }

    /**
     * Estimate storage size of serialized data
     */
    function estimateSize(data: SessionData): number {
        try {
            return JSON.stringify(data).length * 2; // UTF-16 chars = 2 bytes each
        } catch {
            return 0;
        }
    }

    // ===== Core Functions =====

    /**
     * Save all instance state to localStorage
     */
    function saveAllInstances(): void {
        if (!isEnabled) {
            console.log('[SessionManager] Auto-save disabled, skipping save');
            return;
        }

        try {
            const managers = getAllInstanceManagers();
            const allInstances: InstanceData[] = [];

            managers.forEach(({ manager }) => {
                const serialized = manager.serializeAll();
                serialized.forEach(data => {
                    allInstances.push(data as InstanceData);
                });
            });

            const sessionData: SessionData = {
                instances: allInstances,
                timestamp: Date.now(),
                version: SESSION_VERSION,
            };

            // Check estimated size
            const estimatedSize = estimateSize(sessionData);
            if (estimatedSize > MAX_STORAGE_SIZE_BYTES) {
                console.warn(
                    `[SessionManager] Session data size (${Math.round(estimatedSize / 1024)}KB) exceeds soft limit. Some data may be truncated.`
                );
            }

            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
            console.log(
                `[SessionManager] Saved ${allInstances.length} instances (${Math.round(estimatedSize / 1024)}KB)`
            );
        } catch (error) {
            if (
                error instanceof Error &&
                (error.name === 'QuotaExceededError' ||
                    error.message.includes('quota') ||
                    error.message.includes('storage'))
            ) {
                console.warn(
                    '[SessionManager] Storage quota exceeded. Unable to save session state.',
                    error
                );
            } else {
                console.warn('[SessionManager] Failed to save session state:', error);
            }
        }
    }

    /**
     * Save with debouncing (default behavior)
     */
    function saveAll(options: SaveOptions = {}): void {
        const { debounce: shouldDebounce = true, immediate = false } = options;

        if (immediate || !shouldDebounce) {
            // Cancel any pending save
            if (saveTimer !== null) {
                clearTimeout(saveTimer);
                saveTimer = null;
            }
            saveAllInstances();
        } else {
            debounce(saveAllInstances, debounceDelay);
        }
    }

    /**
     * Load session data from localStorage
     */
    function loadSession(): SessionData | null {
        try {
            const raw = localStorage.getItem(SESSION_STORAGE_KEY);
            if (!raw) return null;

            const parsed = JSON.parse(raw) as SessionData;
            if (!parsed || typeof parsed !== 'object') return null;
            if (!Array.isArray(parsed.instances)) return null;

            console.log(`[SessionManager] Loaded session with ${parsed.instances.length} instances`);
            return parsed;
        } catch (error) {
            console.warn('[SessionManager] Failed to load session:', error);
            return null;
        }
    }

    /**
     * Clear all session data
     */
    function clearSession(): void {
        try {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            console.log('[SessionManager] Session cleared');
        } catch (error) {
            console.warn('[SessionManager] Failed to clear session:', error);
        }
    }

    /**
     * Configure debounce delay
     */
    function setDebounceDelay(ms: number): void {
        if (ms > 0 && ms < 60000) {
            debounceDelay = ms;
            console.log(`[SessionManager] Debounce delay set to ${ms}ms`);
        } else {
            console.warn(
                `[SessionManager] Invalid debounce delay: ${ms}. Must be between 1-60000ms`
            );
        }
    }

    /**
     * Enable or disable auto-save
     */
    function setEnabled(enabled: boolean): void {
        isEnabled = enabled;
        console.log(`[SessionManager] Auto-save ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get current configuration
     */
    function getConfig(): {
        enabled: boolean;
        debounceDelay: number;
        storageKey: string;
        version: string;
    } {
        return {
            enabled: isEnabled,
            debounceDelay,
            storageKey: SESSION_STORAGE_KEY,
            version: SESSION_VERSION,
        };
    }

    // ===== Auto-save Integration =====

    /**
     * Initialize auto-save hooks
     */
    function init(): void {
        // Save on window blur
        window.addEventListener('blur', () => {
            console.log('[SessionManager] Window blur - saving immediately');
            saveAll({ immediate: true });
        });

        // Save on beforeunload
        window.addEventListener('beforeunload', () => {
            console.log('[SessionManager] Before unload - saving immediately');
            saveAll({ immediate: true });
        });

        console.log('[SessionManager] Auto-save hooks initialized');
    }

    // ===== Public API =====

    const SessionManagerAPI = {
        // Core functions
        saveAll,
        loadSession,
        clearSession,

        // Configuration
        setDebounceDelay,
        setEnabled,
        getConfig,

        // Initialization
        init,

        // Constants (for testing)
        _STORAGE_KEY: SESSION_STORAGE_KEY,
        _VERSION: SESSION_VERSION,
    };

    // Export to window
    const w = window as unknown as Record<string, unknown>;
    w['SessionManager'] = SessionManagerAPI;

    // Auto-initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
