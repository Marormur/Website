'use strict';
/**
 * src/ts/multi-window-session.ts
 * Multi-Window Session Management
 * Handles saving/restoring window layouts and tab states for the new multi-window system
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
const window_registry_js_1 = __importDefault(require('./window-registry.js'));
const terminal_window_js_1 = require('./terminal-window.js');
const text_editor_window_js_1 = require('./text-editor-window.js');
const finder_window_js_1 = require('./finder-window.js');
const terminal_session_js_1 = require('./terminal-session.js');
const text_editor_document_js_1 = require('./text-editor-document.js');
const finder_view_js_1 = require('./finder-view.js');
/**
 * MultiWindowSessionManager - Handles multi-window session persistence
 *
 * Features:
 * - Save/restore window positions and tab states
 * - Auto-save with debouncing
 * - Legacy session migration
 * - Export/import session JSON
 *
 * Note: This coexists with the legacy SessionManager for backwards compatibility
 */
class MultiWindowSessionManager {
    constructor() {
        this.autoSaveTimer = null;
        this.isRestoring = false;
        this.initialized = false;
    }
    /**
     * Initialize session manager
     */
    init() {
        if (this.initialized) return;
        console.log('[MultiWindowSessionManager] Initializing...');
        // Save on window blur
        window.addEventListener('blur', () => {
            this.saveSession({ immediate: true });
        });
        // Save on beforeunload
        window.addEventListener('beforeunload', () => {
            this.saveSessionImmediate();
        });
        // Save on visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveSession({ immediate: true });
            }
        });
        this.initialized = true;
        console.log('[MultiWindowSessionManager] Initialized');
    }
    /**
     * Save current session to localStorage
     */
    saveSession(options = {}) {
        if (this.isRestoring) {
            console.log('[MultiWindowSessionManager] Skipping save during restore');
            return;
        }
        if (options.immediate) {
            this.saveSessionImmediate();
        } else {
            this.scheduleAutoSave();
        }
    }
    /**
     * Save session immediately (bypasses debounce)
     */
    saveSessionImmediate() {
        if (this.autoSaveTimer !== null) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        try {
            const session = this.createSession();
            localStorage.setItem(MultiWindowSessionManager.STORAGE_KEY, JSON.stringify(session));
            console.log('[MultiWindowSessionManager] Session saved:', {
                windows: session.windows.length,
                totalTabs: session.windows.reduce((sum, w) => sum + w.tabs.length, 0),
            });
        } catch (error) {
            console.error('[MultiWindowSessionManager] Failed to save session:', error);
        }
    }
    /**
     * Schedule auto-save (debounced)
     */
    scheduleAutoSave() {
        if (this.autoSaveTimer !== null) {
            clearTimeout(this.autoSaveTimer);
        }
        this.autoSaveTimer = window.setTimeout(() => {
            this.saveSessionImmediate();
        }, MultiWindowSessionManager.AUTO_SAVE_DELAY);
    }
    /**
     * Create session object from current state
     */
    createSession() {
        const windows = window_registry_js_1.default.getAllWindows();
        return {
            version: MultiWindowSessionManager.VERSION,
            timestamp: Date.now(),
            windows: windows.map(window => this.serializeWindow(window)),
            metadata: {
                theme: this.getCurrentTheme(),
                language: this.getCurrentLanguage(),
            },
        };
    }
    /**
     * Serialize a window and all its tabs
     */
    serializeWindow(window) {
        const tabs = Array.from(window.tabs.values());
        return {
            id: window.id,
            type: window.type,
            position: { ...window.position },
            zIndex: window.zIndex,
            isMinimized: window.isMinimized,
            isMaximized: window.isMaximized,
            activeTabId: window.activeTabId,
            tabs: tabs.map(tab => this.serializeTab(tab)),
            metadata: window.metadata,
        };
    }
    /**
     * Serialize a tab
     */
    serializeTab(tab) {
        // Use tab's own serialize method if available
        if (typeof tab.serialize === 'function') {
            return tab.serialize();
        }
        // Fallback to basic serialization
        return {
            id: tab.id,
            type: tab.type,
            title: tab.title,
            icon: tab.icon,
            contentState: tab.contentState || {},
            created: tab.metadata?.created || Date.now(),
            modified: tab.metadata?.modified || Date.now(),
        };
    }
    /**
     * Restore session from localStorage
     */
    async restoreSession() {
        this.isRestoring = true;
        try {
            // Try to load multi-window session
            const sessionData = localStorage.getItem(MultiWindowSessionManager.STORAGE_KEY);
            if (sessionData) {
                const session = JSON.parse(sessionData);
                await this.restoreMultiWindowSession(session);
                return true;
            }
            // Try to migrate legacy session
            const legacyData = localStorage.getItem(MultiWindowSessionManager.LEGACY_STORAGE_KEY);
            if (legacyData) {
                console.log('[MultiWindowSessionManager] Migrating legacy session...');
                const legacySession = JSON.parse(legacyData);
                await this.migrateLegacySession(legacySession);
                return true;
            }
            console.log('[MultiWindowSessionManager] No session to restore');
            return false;
        } catch (error) {
            console.error('[MultiWindowSessionManager] Failed to restore session:', error);
            return false;
        } finally {
            this.isRestoring = false;
        }
    }
    /**
     * Restore multi-window session
     */
    async restoreMultiWindowSession(session) {
        console.log('[MultiWindowSessionManager] Restoring session:', {
            version: session.version,
            windows: session.windows.length,
            timestamp: new Date(session.timestamp),
        });
        // SAFETY: Limit maximum windows to prevent DOM explosion
        // Allow multiple windows per type (e.g., 3 Finder windows, 2 Terminal windows)
        const MAX_WINDOWS_PER_TYPE = 3;
        const MAX_TOTAL_WINDOWS = 10;
        if (session.windows.length > MAX_TOTAL_WINDOWS) {
            console.warn(
                `[MultiWindowSessionManager] Session has ${session.windows.length} windows (max ${MAX_TOTAL_WINDOWS}). Clearing corrupted session.`
            );
            localStorage.removeItem(MultiWindowSessionManager.STORAGE_KEY);
            return;
        }
        // Count windows by type - if any type has more than 1, clear the session
        const typeCount = new Map();
        session.windows.forEach(w => {
            const count = typeCount.get(w.type) || 0;
            typeCount.set(w.type, count + 1);
        });
        // Check for duplicates
        for (const [type, count] of typeCount.entries()) {
            if (count > MAX_WINDOWS_PER_TYPE) {
                console.warn(
                    `[MultiWindowSessionManager] Session has ${count} ${type} windows (max ${MAX_WINDOWS_PER_TYPE}). Clearing corrupted session.`
                );
                localStorage.removeItem(MultiWindowSessionManager.STORAGE_KEY);
                return;
            }
        }
        // Count windows by type and filter excessive ones
        const windowsByType = new Map();
        const filteredWindows = session.windows.filter(w => {
            const count = windowsByType.get(w.type) || 0;
            if (count >= MAX_WINDOWS_PER_TYPE) {
                console.warn(
                    `[MultiWindowSessionManager] Skipping ${w.type} window (limit ${MAX_WINDOWS_PER_TYPE} reached)`
                );
                return false;
            }
            windowsByType.set(w.type, count + 1);
            return true;
        });
        // Sort windows by z-index to restore stacking order
        const sortedWindows = filteredWindows.sort((a, b) => a.zIndex - b.zIndex);
        // Restore each window
        for (const windowData of sortedWindows) {
            await this.restoreWindow(windowData);
        }
        // Restore metadata (theme, language, etc.)
        if (session.metadata) {
            this.restoreMetadata(session.metadata);
        }
        console.log('[MultiWindowSessionManager] Session restored successfully');
        // Update dock indicators after session restore
        const W = window;
        W.updateDockIndicators?.();
    }
    /**
     * Restore a single window with its tabs
     */
    async restoreWindow(data) {
        try {
            // Create window based on type (without showing it yet)
            const window = this.createWindowByType(data.type, data);
            if (!window) {
                console.error(`[MultiWindowSessionManager] Unknown window type: ${data.type}`);
                return null;
            }
            // Restore tabs
            for (const tabData of data.tabs) {
                const tab = this.restoreTab(tabData);
                if (tab) {
                    window.addTab(tab);
                }
            }
            // Set active tab
            if (data.activeTabId && window.tabs.has(data.activeTabId)) {
                window.setActiveTab(data.activeTabId);
            } else if (window.tabs.size > 0) {
                // Fallback to first tab
                const firstTabId = Array.from(window.tabs.keys())[0];
                if (firstTabId) window.setActiveTab(firstTabId);
            }
            // Show window and register
            window.show();
            window_registry_js_1.default.registerWindow(window);
            // Apply window state after DOM is ready
            setTimeout(() => {
                if (window.element) {
                    window.element.style.zIndex = String(data.zIndex);
                    // Restore position
                    if (data.position && !data.isMaximized) {
                        window.element.style.left = `${data.position.x}px`;
                        window.element.style.top = `${data.position.y}px`;
                        window.element.style.width = `${data.position.width}px`;
                        window.element.style.height = `${data.position.height}px`;
                        // Update internal position tracking
                        window.position = { ...data.position };
                    }
                    if (data.isMinimized) {
                        window.minimize();
                    } else if (data.isMaximized && !window.isMaximized) {
                        window.toggleMaximize();
                    }
                }
            }, 0);
            return window;
        } catch (error) {
            console.error('[MultiWindowSessionManager] Failed to restore window:', error);
            return null;
        }
    }
    /**
     * Create window by type
     */
    createWindowByType(type, data) {
        const config = {
            id: data.id,
            type: type,
            position: data.position,
            metadata: data.metadata,
        };
        switch (type) {
            case 'terminal':
                return new terminal_window_js_1.TerminalWindow(config);
            case 'text-editor':
                return new text_editor_window_js_1.TextEditorWindow(config);
            case 'finder':
                return new finder_window_js_1.FinderWindow(config);
            default:
                return null;
        }
    }
    /**
     * Restore a single tab
     */
    restoreTab(data) {
        try {
            // Determine tab class based on type
            switch (data.type) {
                case 'terminal-session':
                    return terminal_session_js_1.TerminalSession.deserialize(data);
                case 'text-editor-document':
                    return text_editor_document_js_1.TextEditorDocument.deserialize(data);
                case 'finder-view':
                    return finder_view_js_1.FinderView.deserialize(data);
                default:
                    console.warn(`[MultiWindowSessionManager] Unknown tab type: ${data.type}`);
                    return null;
            }
        } catch (error) {
            console.error('[MultiWindowSessionManager] Failed to restore tab:', error);
            return null;
        }
    }
    /**
     * Migrate legacy single-window session to multi-window format
     */
    async migrateLegacySession(legacy) {
        console.log('[MultiWindowSessionManager] Starting legacy migration...');
        const instances = legacy.instances || {};
        // Create terminal window if there are terminal sessions
        if (instances['terminal'] && instances['terminal'].length > 0) {
            const termWindow = terminal_window_js_1.TerminalWindow.create();
            for (const sessionData of instances['terminal']) {
                try {
                    const session = terminal_session_js_1.TerminalSession.deserialize(sessionData);
                    termWindow.addTab(session);
                } catch (error) {
                    console.error(
                        '[MultiWindowSessionManager] Failed to migrate terminal session:',
                        error
                    );
                }
            }
            if (termWindow.tabs.size > 0) {
                const firstTabId = Array.from(termWindow.tabs.keys())[0];
                if (firstTabId) termWindow.setActiveTab(firstTabId);
            }
        }
        // Create text editor window if there are documents
        if (instances['text-editor'] && instances['text-editor'].length > 0) {
            const editorWindow = text_editor_window_js_1.TextEditorWindow.create();
            for (const docData of instances['text-editor']) {
                try {
                    const doc = text_editor_document_js_1.TextEditorDocument.deserialize(docData);
                    editorWindow.addTab(doc);
                } catch (error) {
                    console.error(
                        '[MultiWindowSessionManager] Failed to migrate text editor document:',
                        error
                    );
                }
            }
            if (editorWindow.tabs.size > 0) {
                const firstTabId = Array.from(editorWindow.tabs.keys())[0];
                if (firstTabId) editorWindow.setActiveTab(firstTabId);
            }
        }
        // Create finder window if there are finder instances
        if (instances['finder'] && instances['finder'].length > 0) {
            const finderWindow = finder_window_js_1.FinderWindow.create();
            for (const viewData of instances['finder']) {
                try {
                    const view = finder_view_js_1.FinderView.deserialize(viewData);
                    finderWindow.addTab(view);
                } catch (error) {
                    console.error(
                        '[MultiWindowSessionManager] Failed to migrate finder view:',
                        error
                    );
                }
            }
            if (finderWindow.tabs.size > 0) {
                const firstTabId = Array.from(finderWindow.tabs.keys())[0];
                if (firstTabId) finderWindow.setActiveTab(firstTabId);
            }
        }
        // Save new format and clear legacy
        this.saveSessionImmediate();
        localStorage.removeItem(MultiWindowSessionManager.LEGACY_STORAGE_KEY);
        console.log('[MultiWindowSessionManager] Legacy migration completed');
    }
    /**
     * Export session as JSON string
     */
    exportSession() {
        const session = this.createSession();
        return JSON.stringify(session, null, 2);
    }
    /**
     * Import session from JSON string
     */
    async importSession(jsonString) {
        try {
            const session = JSON.parse(jsonString);
            // Validate version
            if (session.version !== MultiWindowSessionManager.VERSION) {
                console.warn(
                    '[MultiWindowSessionManager] Version mismatch, attempting import anyway'
                );
            }
            // Close all current windows
            window_registry_js_1.default.closeAllWindows();
            // Restore imported session
            await this.restoreMultiWindowSession(session);
            return true;
        } catch (error) {
            console.error('[MultiWindowSessionManager] Failed to import session:', error);
            return false;
        }
    }
    /**
     * Clear current session
     */
    clearSession() {
        localStorage.removeItem(MultiWindowSessionManager.STORAGE_KEY);
        console.log('[MultiWindowSessionManager] Session cleared');
    }
    /**
     * Get current theme preference
     */
    getCurrentTheme() {
        return localStorage.getItem('theme-preference') || 'auto';
    }
    /**
     * Get current language preference
     */
    getCurrentLanguage() {
        return localStorage.getItem('language-preference') || 'de';
    }
    /**
     * Restore session metadata
     */
    restoreMetadata(metadata) {
        // Theme and language are handled by existing systems
        console.log('[MultiWindowSessionManager] Session metadata:', metadata);
    }
    /**
     * Get session info (for debugging)
     */
    getSessionInfo() {
        const sessionData = localStorage.getItem(MultiWindowSessionManager.STORAGE_KEY);
        if (!sessionData) return null;
        try {
            const session = JSON.parse(sessionData);
            return {
                version: session.version,
                timestamp: new Date(session.timestamp),
                windowCount: session.windows.length,
                tabCount: session.windows.reduce((sum, w) => sum + w.tabs.length, 0),
                windows: session.windows.map(w => ({
                    type: w.type,
                    tabs: w.tabs.length,
                    activeTab: w.activeTabId,
                    position: w.position,
                })),
            };
        } catch {
            return null;
        }
    }
    /**
     * Debug log current session state
     */
    debugLog() {
        const info = this.getSessionInfo();
        console.log('[MultiWindowSessionManager] Current session:', info);
    }
}
MultiWindowSessionManager.STORAGE_KEY = 'multi-window-session';
MultiWindowSessionManager.LEGACY_STORAGE_KEY = 'windowInstancesSession'; // Old SessionManager key
MultiWindowSessionManager.VERSION = '1.0.0';
MultiWindowSessionManager.AUTO_SAVE_DELAY = 2000; // 2 seconds debounce
// Create and expose singleton
const multiWindowSessionManager = new MultiWindowSessionManager();
window.MultiWindowSessionManager = multiWindowSessionManager;
exports.default = multiWindowSessionManager;
//# sourceMappingURL=multi-window-session.js.map
