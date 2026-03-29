/**
 * src/ts/multi-window-session.ts
 * Multi-Window Session Management
 * Handles saving/restoring window layouts and tab states for the new multi-window system
 */
import type { BaseWindow } from '../windows/base-window.js';
import type { BaseTab } from '../windows/base-tab.js';
import type { TabState } from '../windows/base-tab.js';
import WindowRegistry from '../windows/window-registry.js';
import { TerminalWindow } from '../apps/terminal/terminal-window.js';
import { TextEditorWindow } from '../apps/text-editor/text-editor-window.js';
import { FinderWindow } from '../apps/finder/finder-window.js';
import { PreviewWindow } from '../apps/preview/preview-window.js';
import { PhotosWindow } from '../apps/photos/photos-window.js';
import { AboutWindow } from '../apps/about/about-window.js';
import { SettingsWindow } from '../apps/settings/settings-window.js';
import { TerminalSession } from '../apps/terminal/terminal-session.js';
import { TextEditorDocument } from '../apps/text-editor/text-editor-document.js';
import { FinderView } from '../apps/finder/finder-view.js';
import logger from '../core/logger.js';

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
        [key: string]: unknown;
    };
}

export interface WindowSessionData {
    id: string;
    type: string; // 'terminal', 'text-editor', 'finder', 'preview', 'photos'
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
    metadata?: Record<string, unknown>;
}

/**
 * Legacy Single-Window Session (for migration)
 */
export interface LegacySession {
    version?: string;
    timestamp?: number;
    instances?: Record<string, unknown[]>; // Old instance manager format
    [key: string]: unknown;
}

/**
 * Raw tab data as it may appear in a legacy or partially-migrated session.
 * Extends TabState with optional legacy path/history fields stored at the tab level.
 */
interface LegacyTabData extends TabState {
    vfsCwd?: string;
    currentPath?: string;
    commandHistory?: unknown[];
}

/** Window session data that may use the legacy `sessions` key instead of `tabs`. */
interface LegacyWindowData extends Omit<WindowSessionData, 'tabs'> {
    tabs?: LegacyTabData[];
    sessions?: LegacyTabData[];
}

/** Multi-window session that may contain legacy window/tab data used during migration. */
interface LegacyMultiWindowSession extends Omit<MultiWindowSession, 'windows'> {
    windows: LegacyWindowData[];
}

/**
 * Shape of an individual tab record in a raw/legacy session (before normalization).
 * All fields are optional since the raw data may not be fully formed.
 */
interface RawTabData {
    id?: string;
    sessionId?: string; // Legacy ID field in older session formats
    type?: string;
    title?: string;
    icon?: string;
    contentState?: Record<string, unknown>;
    created?: number;
    modified?: number;
    vfsCwd?: string;
    currentPath?: string;
    commandHistory?: unknown[];
}

/**
 * Shape of an individual window record in a raw/legacy session (before normalization).
 */
interface RawWindowData {
    id?: string;
    windowId?: string; // Legacy ID field
    type?: string;
    position?: WindowSessionData['position'];
    zIndex?: number;
    isMinimized?: boolean;
    isMaximized?: boolean;
    activeTabId?: string | null;
    metadata?: Record<string, unknown>;
    tabs?: RawTabData[];
    sessions?: RawTabData[]; // Legacy alias for tabs
    windowType?: string; // Used in some old formats
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

        logger.debug('SESSION', '[MultiWindowSessionManager] Initializing...');

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
        logger.debug('SESSION', '[MultiWindowSessionManager] Initialized');
    }

    /**
     * Save current session to localStorage
     */
    saveSession(options: { immediate?: boolean } = {}): void {
        logger.debug('SESSION', '[MultiWindowSessionManager] saveSession called:', {
            immediate: options.immediate,
            isRestoring: this.isRestoring,
        });

        if (this.isRestoring) {
            logger.debug('SESSION', '[MultiWindowSessionManager] Skipping save during restore');
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
        logger.debug('SESSION', '[MultiWindowSessionManager] saveSessionImmediate called');

        if (this.autoSaveTimer !== null) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        try {
            logger.debug('SESSION', '[MultiWindowSessionManager] Creating session snapshot...');
            const session = this.createSession();
            logger.debug('SESSION', '[MultiWindowSessionManager] Session created:', {
                windows: session.windows.length,
                totalTabs: session.windows.reduce((sum, w) => sum + w.tabs.length, 0),
            });

            if (session.windows.length === 0) {
                const isMobileUIMode =
                    document.documentElement.getAttribute('data-ui-mode') === 'mobile';
                if (isMobileUIMode) {
                    try {
                        const existingSessionRaw = localStorage.getItem(
                            MultiWindowSessionManager.STORAGE_KEY
                        );
                        if (existingSessionRaw) {
                            const existingSession = JSON.parse(existingSessionRaw) as {
                                windows?: unknown[];
                            };
                            if (
                                Array.isArray(existingSession.windows) &&
                                existingSession.windows.length > 0
                            ) {
                                logger.debug(
                                    'SESSION',
                                    '[MultiWindowSessionManager] Skipping empty save in mobile mode to preserve existing desktop session'
                                );
                                return;
                            }
                        }
                    } catch (error) {
                        logger.warn(
                            'SESSION',
                            '[MultiWindowSessionManager] Failed to inspect existing session before mobile empty save:',
                            error
                        );
                    }
                }

                const legacyRaw = localStorage.getItem(
                    MultiWindowSessionManager.LEGACY_STORAGE_KEY
                );
                if (legacyRaw) {
                    try {
                        const legacySession = JSON.parse(legacyRaw) as LegacySession;
                        const legacyInstanceCount = Object.values(
                            legacySession.instances || {}
                        ).reduce(
                            (sum, entries) => sum + (Array.isArray(entries) ? entries.length : 0),
                            0
                        );
                        if (legacyInstanceCount > 0) {
                            localStorage.removeItem(MultiWindowSessionManager.STORAGE_KEY);
                            logger.debug(
                                'SESSION',
                                '[MultiWindowSessionManager] Skipping empty multi-window save because legacy session has restorable instances'
                            );
                            return;
                        }
                    } catch (error) {
                        logger.warn(
                            'SESSION',
                            '[MultiWindowSessionManager] Failed to inspect legacy session before empty save:',
                            error
                        );
                    }
                }
            }

            const serialized = JSON.stringify(session);
            logger.debug(
                'SESSION',
                '[MultiWindowSessionManager] Session serialized, length:',
                serialized.length
            );

            localStorage.setItem(MultiWindowSessionManager.STORAGE_KEY, serialized);
            logger.debug('SESSION', '[MultiWindowSessionManager] Session saved to localStorage');

            logger.debug('SESSION', '[MultiWindowSessionManager] Session saved:', {
                windows: session.windows.length,
                totalTabs: session.windows.reduce((sum, w) => sum + w.tabs.length, 0),
                isRestoring: this.isRestoring,
            });
        } catch (error) {
            logger.error('SESSION', '[MultiWindowSessionManager] Failed to save session:', error);
            if (error instanceof Error) {
                logger.error('SESSION', '[MultiWindowSessionManager] Error stack:', error.stack);
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
    private serializeTab(tab: BaseTab): TabState {
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
            created: typeof tab.metadata?.created === 'number' ? tab.metadata.created : Date.now(),
            modified:
                typeof tab.metadata?.modified === 'number' ? tab.metadata.modified : Date.now(),
        };
    }

    /**
     * Restore session from localStorage
     */
    async restoreSession(): Promise<boolean> {
        const perf = (
            window as {
                PerfMonitor?: {
                    mark?: (name: string) => void;
                    measure?: (name: string, start?: string, end?: string) => void;
                };
            }
        ).PerfMonitor;
        perf?.mark?.('session:restore:start');
        logger.debug(
            'SESSION',
            '[MultiWindowSessionManager] restoreSession() called, setting isRestoring=true'
        );
        this.isRestoring = true;

        try {
            // Try to load multi-window session
            const sessionData = localStorage.getItem(MultiWindowSessionManager.STORAGE_KEY);

            if (sessionData) {
                logger.debug(
                    'SESSION',
                    '[MultiWindowSessionManager] Found session data, parsing...'
                );
                const session = JSON.parse(sessionData) as MultiWindowSession;
                const hasRestorableWindows =
                    Array.isArray(session.windows) && session.windows.length > 0;
                logger.debug('SESSION', '[MultiWindowSessionManager] Session parsed:', {
                    windows: session.windows.length,
                    windowTypes: session.windows.map(w => w.type),
                });
                // Apply path migration in case there are legacy paths
                this.migrateSessionPaths(session);
                await this.restoreMultiWindowSession(session);
                logger.debug(
                    'SESSION',
                    '[MultiWindowSessionManager] Session restored successfully'
                );
                return hasRestorableWindows;
            }

            // Try to load legacy v1 session (multiWindowSession_v1)
            const legacyV1Data = localStorage.getItem(
                MultiWindowSessionManager.LEGACY_STORAGE_KEY_V1
            );
            if (legacyV1Data) {
                logger.debug(
                    'SESSION',
                    '[MultiWindowSessionManager] Migrating legacy v1 session...'
                );
                const rawSession = JSON.parse(legacyV1Data);
                // Normalize legacy format to current format
                const session = this.normalizeLegacyV1Session(rawSession) as MultiWindowSession;
                const hasRestorableWindows =
                    Array.isArray(session.windows) && session.windows.length > 0;
                // Apply path migration
                this.migrateSessionPaths(session);
                await this.restoreMultiWindowSession(session);
                // Clear legacy key and save in new format
                localStorage.removeItem(MultiWindowSessionManager.LEGACY_STORAGE_KEY_V1);
                this.saveSessionImmediate();
                return hasRestorableWindows;
            }

            // Try to migrate legacy session
            const legacyData = localStorage.getItem(MultiWindowSessionManager.LEGACY_STORAGE_KEY);
            if (legacyData) {
                logger.debug('SESSION', '[MultiWindowSessionManager] Migrating legacy session...');
                const legacySession = JSON.parse(legacyData) as LegacySession;
                await this.migrateLegacySession(legacySession);
                return true;
            }

            logger.debug('SESSION', '[MultiWindowSessionManager] No session to restore');
            return false;
        } catch (error) {
            logger.error(
                'SESSION',
                '[MultiWindowSessionManager] Failed to restore session:',
                error
            );
            return false;
        } finally {
            perf?.mark?.('session:restore:end');
            perf?.measure?.(
                'session:restore-duration',
                'session:restore:start',
                'session:restore:end'
            );
            logger.debug(
                'SESSION',
                '[MultiWindowSessionManager] restoreSession() complete, setting isRestoring=false'
            );
            this.isRestoring = false;
            // Signal that session restore is complete (even if it failed)
            window.__SESSION_RESTORED = true;
            logger.info('SESSION', '[MultiWindowSessionManager] __SESSION_RESTORED=true');
        }
    }

    /**
     * Restore multi-window session
     */
    private async restoreMultiWindowSession(session: MultiWindowSession): Promise<void> {
        logger.debug('SESSION', '[MultiWindowSessionManager] Restoring session:', {
            version: session.version,
            windows: session.windows.length,
            timestamp: new Date(session.timestamp),
        });

        // SAFETY: Limit maximum windows to prevent DOM explosion
        // NOTE: We intentionally allow multiple windows per type (e.g., multiple Finder instances)
        // while keeping a hard cap on total windows to avoid pathological saves.
        const MAX_TOTAL_WINDOWS = 10;

        if (session.windows.length > MAX_TOTAL_WINDOWS) {
            logger.warn(
                'SESSION',
                `[MultiWindowSessionManager] Session has ${session.windows.length} windows (max ${MAX_TOTAL_WINDOWS}). Clearing corrupted session.`
            );
            localStorage.removeItem(MultiWindowSessionManager.STORAGE_KEY);
            return;
        }

        // Sort windows by z-index to restore stacking order
        const sortedWindows = session.windows.sort((a, b) => a.zIndex - b.zIndex);

        // Restore each window
        for (const windowData of sortedWindows) {
            await this.restoreWindow(windowData);
        }

        this.finalizeRestoredWindowFocus();

        // Restore metadata (theme, language, etc.)
        if (session.metadata) {
            this.restoreMetadata(session.metadata);
        }

        logger.debug('SESSION', '[MultiWindowSessionManager] Session restored successfully');

        // If we filtered out windows, save the cleaned session
        // Update dock indicators after session restore
        window.updateDockIndicators?.();
        window.updateProgramLabelByTopModal?.();
    }

    /**
     * Ensure WindowRegistry active window points to the highest visible, non-minimized window
     * after restore. This prevents stale focus state when some restored windows are minimized.
     */
    private finalizeRestoredWindowFocus(): void {
        const windows = WindowRegistry.getAllWindows();
        if (!windows.length) {
            WindowRegistry.setActiveWindow(null);
            return;
        }

        const candidates = windows.filter(win => {
            if (win.isMinimized) return false;
            if (!win.element) return false;
            return !win.element.classList.contains('hidden');
        });

        const top = (candidates.length ? candidates : windows).reduce((best, current) => {
            return current.zIndex > best.zIndex ? current : best;
        });

        WindowRegistry.setActiveWindow(top?.id || null);
    }

    /**
     * Restore a single window with its tabs
     */
    private async restoreWindow(data: WindowSessionData): Promise<BaseWindow | null> {
        try {
            // Create window based on type (without showing it yet)
            const window = this.createWindowByType(data.type, data);
            if (!window) {
                logger.error(
                    'SESSION',
                    `[MultiWindowSessionManager] Unknown window type: ${data.type}`
                );
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
            if (typeof window.requestTabsRender === 'function') {
                window.requestTabsRender();
            }

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

            return window;
        } catch (error) {
            logger.error('SESSION', '[MultiWindowSessionManager] Failed to restore window:', error);
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

            case 'preview':
                return new PreviewWindow(config);

            case 'photos':
                return new PhotosWindow(config);

            case 'about':
                return new AboutWindow(config);

            case 'settings':
                return new SettingsWindow(config);

            default:
                return null;
        }
    }

    /**
     * Restore a single tab
     */
    private restoreTab(data: TabState): BaseTab | null {
        try {
            // Determine tab class based on type
            switch (data.type) {
                case 'terminal-session':
                    return TerminalSession.deserialize(data as TabState & Record<string, unknown>);

                case 'text-editor-document':
                    return TextEditorDocument.deserialize(
                        data as TabState & Record<string, unknown>
                    );

                case 'finder-view':
                    return FinderView.deserialize(data as TabState & Record<string, unknown>);

                default:
                    logger.warn(
                        'SESSION',
                        `[MultiWindowSessionManager] Unknown tab type: ${data.type}`
                    );
                    return null;
            }
        } catch (error) {
            logger.error('SESSION', '[MultiWindowSessionManager] Failed to restore tab:', error);
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
    private migrateSessionPaths(session: LegacyMultiWindowSession): void {
        if (!session || !session.windows) return;

        for (const window of session.windows) {
            // Handle legacy format: windows[].sessions[]
            const tabsArray = window.tabs || window.sessions || [];

            for (const tab of tabsArray) {
                // Migrate vfsCwd for terminal sessions (only if it's a string)
                if (tab.vfsCwd && typeof tab.vfsCwd === 'string') {
                    const migrated = this.migrateLegacyPath(tab.vfsCwd);
                    logger.debug(
                        'SESSION',
                        `[MultiWindowSessionManager] Migrating path: ${tab.vfsCwd} → ${migrated}`
                    );
                    tab.vfsCwd = migrated;
                }

                // Also check currentPath (legacy field) - only for terminal sessions
                // Skip Finder currentPath (it's an array of path segments, not a string)
                if (tab.currentPath && !tab.vfsCwd && typeof tab.currentPath === 'string') {
                    const migrated = this.migrateLegacyPath(tab.currentPath);
                    logger.debug(
                        'SESSION',
                        `[MultiWindowSessionManager] Migrating currentPath: ${tab.currentPath} → ${migrated}`
                    );
                    tab.vfsCwd = migrated;
                    tab.currentPath = migrated;
                }

                // Migrate contentState.vfsCwd if it exists (only if string)
                const contentState = tab.contentState as Record<string, unknown> | undefined;
                if (contentState?.vfsCwd && typeof contentState.vfsCwd === 'string') {
                    const migrated = this.migrateLegacyPath(contentState.vfsCwd);
                    contentState.vfsCwd = migrated;
                }

                // Migrate contentState.currentPath if it exists (only if string)
                // Skip Finder currentPath arrays
                if (contentState?.currentPath && typeof contentState.currentPath === 'string') {
                    const migrated = this.migrateLegacyPath(contentState.currentPath);
                    contentState.currentPath = migrated;
                }
            }
        }
    }

    /**
     * Normalize legacy session format to current format
     * Handles old format with windowId/sessions instead of id/tabs
     */
    private normalizeLegacyV1Session(session: LegacySession): LegacyMultiWindowSession {
        const normalized: LegacyMultiWindowSession = {
            version: MultiWindowSessionManager.VERSION,
            timestamp: session.timestamp || Date.now(),
            windows: [],
            metadata: (session.metadata || {}) as {
                [key: string]: unknown;
                theme?: string;
                language?: string;
            },
        };

        const rawWindows = (session.windows as RawWindowData[] | undefined) || [];
        for (const win of rawWindows) {
            const windowData: LegacyWindowData = {
                id: win.id || win.windowId || `window-${Date.now()}`,
                type: win.type || (session.windowType as string | undefined) || 'terminal',
                position: win.position || { x: 100, y: 100, width: 800, height: 600 },
                zIndex: win.zIndex || 100,
                isMinimized: win.isMinimized || false,
                isMaximized: win.isMaximized || false,
                activeTabId: win.activeTabId ?? null,
                tabs: [],
                metadata: win.metadata || {},
            };

            // Convert sessions[] to tabs[]
            const tabsSource: RawTabData[] = win.tabs || win.sessions || [];
            for (const tab of tabsSource) {
                const tabData: LegacyTabData = {
                    id: tab.id || tab.sessionId || `tab-${Date.now()}-${Math.random()}`,
                    type: tab.type || 'terminal-session',
                    title: tab.title || 'Terminal',
                    icon: tab.icon,
                    contentState: tab.contentState || {},
                    created: tab.created || Date.now(),
                    modified: tab.modified || Date.now(),
                };

                // Preserve top-level legacy path fields so migrateSessionPaths can find them
                if (tab.vfsCwd) tabData.vfsCwd = tab.vfsCwd;
                if (tab.currentPath) tabData.currentPath = tab.currentPath;
                if (tab.commandHistory) tabData.commandHistory = tab.commandHistory;

                windowData.tabs!.push(tabData);
            }

            // Set activeTabId if not set
            if (!windowData.activeTabId && windowData.tabs!.length > 0) {
                const firstTab = windowData.tabs![0];
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
        logger.debug('SESSION', '[MultiWindowSessionManager] Starting legacy migration...');

        const instances = legacy.instances || {};

        // Create terminal window if there are terminal sessions
        if (instances['terminal'] && instances['terminal'].length > 0) {
            const termWindow = TerminalWindow.create();

            for (const sessionData of instances['terminal']) {
                try {
                    const session = TerminalSession.deserialize(
                        sessionData as TabState & Record<string, unknown>
                    );
                    termWindow.addTab(session);
                } catch (error) {
                    logger.error(
                        'SESSION',
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
                    const doc = TextEditorDocument.deserialize(
                        docData as TabState & Record<string, unknown>
                    );
                    editorWindow.addTab(doc);
                } catch (error) {
                    logger.error(
                        'SESSION',
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
                    const view = FinderView.deserialize(
                        viewData as TabState & Record<string, unknown>
                    );
                    finderWindow.addTab(view);
                } catch (error) {
                    logger.error(
                        'SESSION',
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

        logger.debug('SESSION', '[MultiWindowSessionManager] Legacy migration completed');
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
        if (!jsonString || typeof jsonString !== 'string') {
            logger.error(
                'SESSION',
                '[MultiWindowSessionManager] Invalid import data (must be non-empty string)'
            );
            return false;
        }

        try {
            const parsed = JSON.parse(jsonString) as MultiWindowSession | LegacySession;

            if (!parsed || typeof parsed !== 'object') {
                logger.error('SESSION', '[MultiWindowSessionManager] Invalid import payload');
                return false;
            }

            this.isRestoring = true;

            WindowRegistry.closeAllWindows();

            if ('windows' in parsed && Array.isArray(parsed.windows)) {
                const session = parsed as MultiWindowSession;

                if (session.version !== MultiWindowSessionManager.VERSION) {
                    logger.error(
                        'SESSION',
                        `[MultiWindowSessionManager] Version mismatch (imported: ${session.version}, current: ${MultiWindowSessionManager.VERSION})`
                    );
                    return false;
                }

                this.migrateSessionPaths(session);
                localStorage.setItem(
                    MultiWindowSessionManager.STORAGE_KEY,
                    JSON.stringify(session)
                );
                await this.restoreMultiWindowSession(session);
                return true;
            }

            if ('instances' in parsed && parsed.instances && typeof parsed.instances === 'object') {
                const legacySession = parsed as LegacySession;
                const legacyVersion = String(legacySession.version || '');
                if (legacyVersion && legacyVersion !== '1.0') {
                    logger.error(
                        'SESSION',
                        `[MultiWindowSessionManager] Legacy import version mismatch (imported: ${legacyVersion}, expected: 1.0)`
                    );
                    return false;
                }

                await this.migrateLegacySession(legacySession);
                return true;
            }

            logger.error(
                'SESSION',
                '[MultiWindowSessionManager] Unsupported session format for import'
            );
            return false;
        } catch (error) {
            logger.error('SESSION', '[MultiWindowSessionManager] Failed to import session:', error);
            return false;
        } finally {
            this.isRestoring = false;
        }
    }

    /**
     * Clear current session
     */
    clearSession(): void {
        localStorage.removeItem(MultiWindowSessionManager.STORAGE_KEY);
        logger.debug('SESSION', '[MultiWindowSessionManager] Session cleared');
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
    private restoreMetadata(metadata: Record<string, unknown>): void {
        // Theme and language are handled by existing systems
        logger.debug('SESSION', '[MultiWindowSessionManager] Session metadata:', metadata);
    }

    /**
     * Get session info (for debugging)
     */
    getSessionInfo(): Record<string, unknown> | null {
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
        logger.debug('SESSION', '[MultiWindowSessionManager] Current session:', info);
    }
}

// Create and expose singleton
const multiWindowSessionManager = new MultiWindowSessionManager();
window.MultiWindowSessionManager = multiWindowSessionManager;

export default multiWindowSessionManager;
