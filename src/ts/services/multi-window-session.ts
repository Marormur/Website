/**
 * src/ts/multi-window-session.ts
 * Multi-Window Session Management
 * Handles saving/restoring window layouts and tab states for the new multi-window system
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { BaseWindow } from '../windows/base-window.js';
import type { TabState } from '../windows/base-tab.js';
import WindowRegistry from '../windows/window-registry.js';
import { TerminalWindow } from '../apps/terminal/terminal-window.js';
import { TextEditorWindow } from '../apps/text-editor/text-editor-window.js';
import { FinderWindow } from '../apps/finder/finder-window.js';
import { TerminalSession } from '../apps/terminal/terminal-session.js';
import { TextEditorDocument } from '../apps/text-editor/text-editor-document.js';
import { FinderView } from '../apps/finder/finder-view.js';

/**
 * Multi-Window Session Schema v1.0
 */
export interface MultiWindowSession {
    version: string; // Schema version for migration
    timestamp: number;
    windows: WindowSessionData[];
    metadata?: {
        theme?: string;
        language?: string;
        [key: string]: any;
    };
}

export interface WindowSessionData {
    id: string;
    type: string; // 'terminal', 'text-editor', 'finder'
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    zIndex: number;
    isMinimized: boolean;
    isMaximized: boolean;
    activeTabId: string | null;
    tabs: TabState[];
    metadata?: Record<string, any>;
}

/**
 * Legacy Single-Window Session (for migration)
 */
export interface LegacySession {
    version?: string;
    timestamp?: number;
    instances?: Record<string, any[]>; // Old instance manager format
    [key: string]: any;
}

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
    private static STORAGE_KEY = 'multi-window-session';
    private static LEGACY_STORAGE_KEY = 'windowInstancesSession'; // Old SessionManager key
    private static LEGACY_STORAGE_KEY_V1 = 'multiWindowSession_v1'; // Legacy multi-window session key
    private static VERSION = '1.0.0';
    private static AUTO_SAVE_DELAY = 2000; // 2 seconds debounce

    private autoSaveTimer: number | null = null;
    private isRestoring = false;
    private initialized = false;

    /**
     * Initialize session manager
     */
    init(): void {
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
    saveSession(options: { immediate?: boolean } = {}): void {
        console.log('[MultiWindowSessionManager] saveSession called:', {
            immediate: options.immediate,
            isRestoring: this.isRestoring,
        });

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
    private saveSessionImmediate(): void {
        console.log('[MultiWindowSessionManager] saveSessionImmediate called');

        if (this.autoSaveTimer !== null) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        try {
            console.log('[MultiWindowSessionManager] Creating session snapshot...');
            const session = this.createSession();
            console.log('[MultiWindowSessionManager] Session created:', {
                windows: session.windows.length,
                totalTabs: session.windows.reduce((sum, w) => sum + w.tabs.length, 0),
            });

            const serialized = JSON.stringify(session);
            console.log(
                '[MultiWindowSessionManager] Session serialized, length:',
                serialized.length
            );

            localStorage.setItem(MultiWindowSessionManager.STORAGE_KEY, serialized);
            console.log('[MultiWindowSessionManager] Session saved to localStorage');

            console.log('[MultiWindowSessionManager] Session saved:', {
                windows: session.windows.length,
                totalTabs: session.windows.reduce((sum, w) => sum + w.tabs.length, 0),
                isRestoring: this.isRestoring,
            });
        } catch (error) {
            console.error('[MultiWindowSessionManager] Failed to save session:', error);
            if (error instanceof Error) {
                console.error('[MultiWindowSessionManager] Error stack:', error.stack);
            }
        }
    }

    /**
     * Schedule auto-save (debounced)
     */
    private scheduleAutoSave(): void {
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
    private createSession(): MultiWindowSession {
        const windows = WindowRegistry.getAllWindows();

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
    private serializeWindow(window: BaseWindow): WindowSessionData {
        const tabs = Array.from(window.tabs.values());

        // CRITICAL: Read z-index from DOM, not from instance variable
        // Instance variable may be stale if assignZIndices() was called
        // but window.zIndex wasn't updated (happens for non-active windows)
        let domZIndex = window.zIndex;
        if (window.element) {
            const parsed = parseInt(window.element.style.zIndex || '0', 10);
            if (!Number.isNaN(parsed)) {
                domZIndex = parsed;
                // Also update instance variable to keep them in sync
                window.zIndex = parsed;
            }
        }

        return {
            id: window.id,
            type: window.type,
            position: { ...window.position },
            zIndex: domZIndex,
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
    private serializeTab(tab: any): TabState {
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
    async restoreSession(): Promise<boolean> {
        console.log(
            '[MultiWindowSessionManager] restoreSession() called, setting isRestoring=true'
        );
        this.isRestoring = true;

        try {
            // Try to load multi-window session
            const sessionData = localStorage.getItem(MultiWindowSessionManager.STORAGE_KEY);

            if (sessionData) {
                console.log('[MultiWindowSessionManager] Found session data, parsing...');
                const session = JSON.parse(sessionData) as MultiWindowSession;
                console.log('[MultiWindowSessionManager] Session parsed:', {
                    windows: session.windows.length,
                    windowTypes: session.windows.map(w => w.type),
                });
                // Apply path migration in case there are legacy paths
                this.migrateSessionPaths(session);
                await this.restoreMultiWindowSession(session);
                console.log('[MultiWindowSessionManager] Session restored successfully');
                return true;
            }

            // Try to load legacy v1 session (multiWindowSession_v1)
            const legacyV1Data = localStorage.getItem(
                MultiWindowSessionManager.LEGACY_STORAGE_KEY_V1
            );
            if (legacyV1Data) {
                console.log('[MultiWindowSessionManager] Migrating legacy v1 session...');
                const rawSession = JSON.parse(legacyV1Data);
                // Normalize legacy format to current format
                const session = this.normalizeLegacyV1Session(rawSession);
                // Apply path migration
                this.migrateSessionPaths(session);
                await this.restoreMultiWindowSession(session);
                // Clear legacy key and save in new format
                localStorage.removeItem(MultiWindowSessionManager.LEGACY_STORAGE_KEY_V1);
                this.saveSessionImmediate();
                return true;
            }

            // Try to migrate legacy session
            const legacyData = localStorage.getItem(MultiWindowSessionManager.LEGACY_STORAGE_KEY);
            if (legacyData) {
                console.log('[MultiWindowSessionManager] Migrating legacy session...');
                const legacySession = JSON.parse(legacyData) as LegacySession;
                await this.migrateLegacySession(legacySession);
                return true;
            }

            console.log('[MultiWindowSessionManager] No session to restore');
            return false;
        } catch (error) {
            console.error('[MultiWindowSessionManager] Failed to restore session:', error);
            return false;
        } finally {
            console.log(
                '[MultiWindowSessionManager] restoreSession() complete, setting isRestoring=false'
            );
            this.isRestoring = false;
            // Signal that session restore is complete (even if it failed)
            (window as any).__SESSION_RESTORED = true;
            console.info('[MultiWindowSessionManager] __SESSION_RESTORED=true');
        }
    }

    /**
     * Restore multi-window session
     */
    private async restoreMultiWindowSession(session: MultiWindowSession): Promise<void> {
        console.log('[MultiWindowSessionManager] Restoring session:', {
            version: session.version,
            windows: session.windows.length,
            timestamp: new Date(session.timestamp),
        });

        // SAFETY: Limit maximum windows to prevent DOM explosion
        // Strategy: Allow only 1 window per type on auto-restore to prevent duplicate windows
        // Users can still manually open multiple windows, but auto-restore keeps it clean
        const MAX_WINDOWS_PER_TYPE_AUTO_RESTORE = 1;
        const MAX_TOTAL_WINDOWS = 10;

        if (session.windows.length > MAX_TOTAL_WINDOWS) {
            console.warn(
                `[MultiWindowSessionManager] Session has ${session.windows.length} windows (max ${MAX_TOTAL_WINDOWS}). Clearing corrupted session.`
            );
            localStorage.removeItem(MultiWindowSessionManager.STORAGE_KEY);
            return;
        }

        // Count windows by type and filter to max 1 per type
        // This ensures clean auto-restore without duplicate windows
        const windowsByType = new Map<string, number>();
        const filteredWindows = session.windows.filter(w => {
            const count = windowsByType.get(w.type) || 0;
            if (count >= MAX_WINDOWS_PER_TYPE_AUTO_RESTORE) {
                console.warn(
                    `[MultiWindowSessionManager] Skipping ${w.type} window during auto-restore (limit ${MAX_WINDOWS_PER_TYPE_AUTO_RESTORE} per type)`
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

        // If we filtered out windows, save the cleaned session
        if (filteredWindows.length < session.windows.length) {
            console.log(
                `[MultiWindowSessionManager] Filtered ${session.windows.length - filteredWindows.length} duplicate windows, saving cleaned session`
            );
            // Save will happen automatically when isRestoring = false
        }

        // Update dock indicators after session restore
        const W = window as any;
        W.updateDockIndicators?.();
    }

    /**
     * Restore a single window with its tabs
     */
    private async restoreWindow(data: WindowSessionData): Promise<BaseWindow | null> {
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
            WindowRegistry.registerWindow(window);

            // Force tab rendering after window is shown and in DOM
            // This ensures tabs are visible even if they were added before the window was shown
            if (typeof (window as any)._renderTabs === 'function') {
                (window as any)._renderTabs();
            }

            // Apply window state after DOM is ready
            setTimeout(() => {
                if (window.element) {
                    window.element.style.zIndex = String(data.zIndex);
                    // CRITICAL: Also update the instance variable to match DOM
                    // Without this, getTopWindow() fallback will return wrong window
                    window.zIndex = data.zIndex;

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
    private createWindowByType(type: string, data: WindowSessionData): BaseWindow | null {
        const config = {
            id: data.id,
            type: type,
            position: data.position,
            metadata: data.metadata,
        };

        switch (type) {
            case 'terminal':
                return new TerminalWindow(config);

            case 'text-editor':
                return new TextEditorWindow(config);

            case 'finder':
                return new FinderWindow(config);

            default:
                return null;
        }
    }

    /**
     * Restore a single tab
     */
    private restoreTab(data: TabState): any {
        try {
            // Determine tab class based on type
            switch (data.type) {
                case 'terminal-session':
                    return TerminalSession.deserialize(data);

                case 'text-editor-document':
                    return TextEditorDocument.deserialize(data);

                case 'finder-view':
                    return FinderView.deserialize(data);

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
     * Migrate legacy path formats (Computer/Home → /home/marvin)
     * Only migrates string paths. Returns default for non-string or empty values.
     */
    private migrateLegacyPath(path: string | undefined | null): string {
        // Type guard: Only migrate strings. Skip arrays, objects, etc.
        if (!path || typeof path !== 'string') return '/home/marvin';

        // Already in new format
        if (path.startsWith('/')) return path;

        // Computer/Home → /home/marvin
        if (path === 'Computer' || path === '~') {
            return '/home/marvin';
        }

        if (path.startsWith('Computer/Home')) {
            // Computer/Home → /home/marvin
            // Computer/Home/Documents → /home/marvin/Documents
            const subPath = path.slice('Computer/Home'.length);
            return subPath ? `/home/marvin${subPath}` : '/home/marvin';
        }

        if (path.startsWith('Computer/')) {
            // Computer/Documents → /home/marvin/Documents
            const subPath = path.slice('Computer/'.length);
            return `/home/marvin/${subPath}`;
        }

        // Handle tilde expansion
        if (path.startsWith('~/')) {
            return '/home/marvin/' + path.slice(2);
        }

        // Relative path - prepend /home/marvin/
        return `/home/marvin/${path}`;
    }

    /**
     * Migrate paths in session data
     */
    private migrateSessionPaths(session: any): void {
        if (!session || !session.windows) return;

        for (const window of session.windows) {
            // Handle legacy format: windows[].sessions[]
            const tabsArray = window.tabs || window.sessions || [];

            for (const tab of tabsArray) {
                // Migrate vfsCwd for terminal sessions (only if it's a string)
                if (tab.vfsCwd && typeof tab.vfsCwd === 'string') {
                    const migrated = this.migrateLegacyPath(tab.vfsCwd);
                    console.log(
                        `[MultiWindowSessionManager] Migrating path: ${tab.vfsCwd} → ${migrated}`
                    );
                    tab.vfsCwd = migrated;
                }

                // Also check currentPath (legacy field) - only for terminal sessions
                // Skip Finder currentPath (it's an array of path segments, not a string)
                if (tab.currentPath && !tab.vfsCwd && typeof tab.currentPath === 'string') {
                    const migrated = this.migrateLegacyPath(tab.currentPath);
                    console.log(
                        `[MultiWindowSessionManager] Migrating currentPath: ${tab.currentPath} → ${migrated}`
                    );
                    tab.vfsCwd = migrated;
                    tab.currentPath = migrated;
                }

                // Migrate contentState.vfsCwd if it exists (only if string)
                if (tab.contentState?.vfsCwd && typeof tab.contentState.vfsCwd === 'string') {
                    const migrated = this.migrateLegacyPath(tab.contentState.vfsCwd);
                    tab.contentState.vfsCwd = migrated;
                }

                // Migrate contentState.currentPath if it exists (only if string)
                // Skip Finder currentPath arrays
                if (
                    tab.contentState?.currentPath &&
                    typeof tab.contentState.currentPath === 'string'
                ) {
                    const migrated = this.migrateLegacyPath(tab.contentState.currentPath);
                    tab.contentState.currentPath = migrated;
                }
            }
        }
    }

    /**
     * Normalize legacy session format to current format
     * Handles old format with windowId/sessions instead of id/tabs
     */
    private normalizeLegacyV1Session(session: any): MultiWindowSession {
        const normalized: MultiWindowSession = {
            version: MultiWindowSessionManager.VERSION,
            timestamp: session.timestamp || Date.now(),
            windows: [],
            metadata: session.metadata || {},
        };

        for (const window of session.windows || []) {
            const windowData: WindowSessionData = {
                id: window.id || window.windowId || `window-${Date.now()}`,
                type: window.type || session.windowType || 'terminal',
                position: window.position || { x: 100, y: 100, width: 800, height: 600 },
                zIndex: window.zIndex || 100,
                isMinimized: window.isMinimized || false,
                isMaximized: window.isMaximized || false,
                activeTabId: window.activeTabId || null,
                tabs: [],
                metadata: window.metadata || {},
            };

            // Convert sessions[] to tabs[]
            const tabsSource = window.tabs || window.sessions || [];
            for (const tab of tabsSource) {
                const tabData: any = {
                    id: tab.id || tab.sessionId || `tab-${Date.now()}-${Math.random()}`,
                    type: tab.type || 'terminal-session',
                    title: tab.title || 'Terminal',
                    icon: tab.icon,
                    contentState: tab.contentState || {},
                    created: tab.created || Date.now(),
                    modified: tab.modified || Date.now(),
                };

                // Copy relevant fields to tab data
                if (tab.vfsCwd) tabData.vfsCwd = tab.vfsCwd;
                if (tab.currentPath) tabData.currentPath = tab.currentPath;
                if (tab.commandHistory) tabData.commandHistory = tab.commandHistory;

                windowData.tabs.push(tabData);
            }

            // Set activeTabId if not set
            if (!windowData.activeTabId && windowData.tabs.length > 0) {
                const firstTab = windowData.tabs[0];
                if (firstTab) {
                    windowData.activeTabId = firstTab.id;
                }
            }

            normalized.windows.push(windowData);
        }

        return normalized;
    }

    /**
     * Migrate legacy single-window session to multi-window format
     */
    private async migrateLegacySession(legacy: LegacySession): Promise<void> {
        console.log('[MultiWindowSessionManager] Starting legacy migration...');

        const instances = legacy.instances || {};

        // Create terminal window if there are terminal sessions
        if (instances['terminal'] && instances['terminal'].length > 0) {
            const termWindow = TerminalWindow.create();

            for (const sessionData of instances['terminal']) {
                try {
                    const session = TerminalSession.deserialize(sessionData);
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
            const editorWindow = TextEditorWindow.create();

            for (const docData of instances['text-editor']) {
                try {
                    const doc = TextEditorDocument.deserialize(docData);
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
            const finderWindow = FinderWindow.create();

            for (const viewData of instances['finder']) {
                try {
                    const view = FinderView.deserialize(viewData);
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
    exportSession(): string {
        const session = this.createSession();
        return JSON.stringify(session, null, 2);
    }

    /**
     * Import session from JSON string
     */
    async importSession(jsonString: string): Promise<boolean> {
        try {
            const session = JSON.parse(jsonString) as MultiWindowSession;

            // Validate version
            if (session.version !== MultiWindowSessionManager.VERSION) {
                console.warn(
                    '[MultiWindowSessionManager] Version mismatch, attempting import anyway'
                );
            }

            // Close all current windows
            WindowRegistry.closeAllWindows();

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
    clearSession(): void {
        localStorage.removeItem(MultiWindowSessionManager.STORAGE_KEY);
        console.log('[MultiWindowSessionManager] Session cleared');
    }

    /**
     * Get current theme preference
     */
    private getCurrentTheme(): string {
        return localStorage.getItem('theme-preference') || 'auto';
    }

    /**
     * Get current language preference
     */
    private getCurrentLanguage(): string {
        return localStorage.getItem('language-preference') || 'de';
    }

    /**
     * Restore session metadata
     */
    private restoreMetadata(metadata: Record<string, any>): void {
        // Theme and language are handled by existing systems
        console.log('[MultiWindowSessionManager] Session metadata:', metadata);
    }

    /**
     * Get session info (for debugging)
     */
    getSessionInfo(): any {
        const sessionData = localStorage.getItem(MultiWindowSessionManager.STORAGE_KEY);
        if (!sessionData) return null;

        try {
            const session = JSON.parse(sessionData) as MultiWindowSession;
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
    debugLog(): void {
        const info = this.getSessionInfo();
        console.log('[MultiWindowSessionManager] Current session:', info);
    }
}

// Create and expose singleton
const multiWindowSessionManager = new MultiWindowSessionManager();
(window as any).MultiWindowSessionManager = multiWindowSessionManager;

export default multiWindowSessionManager;
