/**
 * src/ts/multi-window-session.ts
 * Multi-Window Session Management
 * Handles saving/restoring window layouts and tab states for the new multi-window system
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { BaseWindow } from './base-window.js';
import type { TabState } from './base-tab.js';
import WindowRegistry from './window-registry.js';
import { TerminalWindow } from './terminal-window.js';
import { TextEditorWindow } from './text-editor-window.js';
import { FinderWindow } from './finder-window.js';
import { TerminalSession } from './terminal-session.js';
import { TextEditorDocument } from './text-editor-document.js';
import { FinderView } from './finder-view.js';

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
        this.isRestoring = true;

        try {
            // Try to load multi-window session
            const sessionData = localStorage.getItem(MultiWindowSessionManager.STORAGE_KEY);

            if (sessionData) {
                const session = JSON.parse(sessionData) as MultiWindowSession;
                await this.restoreMultiWindowSession(session);
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
            this.isRestoring = false;
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
        const typeCount = new Map<string, number>();
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
        const windowsByType = new Map<string, number>();
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
                window.setActiveTab(Array.from(window.tabs.keys())[0]);
            }

            // Show window and register
            window.show();
            WindowRegistry.registerWindow(window);

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
                termWindow.setActiveTab(Array.from(termWindow.tabs.keys())[0]);
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
                editorWindow.setActiveTab(Array.from(editorWindow.tabs.keys())[0]);
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
                finderWindow.setActiveTab(Array.from(finderWindow.tabs.keys())[0]);
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
