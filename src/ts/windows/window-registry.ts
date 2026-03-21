/**
 * src/ts/window-registry.ts
 * Central registry for managing all windows in the multi-window system
 */
import type { BaseWindow, WindowState } from '../windows/base-window.js';
import { BASE_Z_INDEX, getZIndexManager } from './z-index-manager.js';
import logger from '../core/logger.js';

/**
 * WindowRegistry - Singleton for managing all windows
 *
 * Responsibilities:
 * - Track all open windows
 * - Manage z-index stacking
 * - Provide window lookup
 * - Coordinate window lifecycle
 */
class WindowRegistry {
    private windows: Map<string, BaseWindow>;
    private nextZIndex: number;
    private initialized: boolean;
    private activeWindowId: string | null;
    private zIndexManager = getZIndexManager();
    private viewportResizeFrameId: number | null;

    private _isMobileUIMode(): boolean {
        return document.documentElement.getAttribute('data-ui-mode') === 'mobile';
    }

    private _applyMobileWindowVisibility(): void {
        const isMobile = this._isMobileUIMode();

        this.windows.forEach(windowInstance => {
            if (!windowInstance.element) return;

            if (!isMobile) {
                windowInstance.element.removeAttribute('data-mobile-inactive');
                return;
            }

            const isActive = this.activeWindowId === windowInstance.id;
            if (isActive) {
                windowInstance.element.removeAttribute('data-mobile-inactive');
            } else {
                windowInstance.element.setAttribute('data-mobile-inactive', 'true');
            }
        });
    }

    constructor() {
        this.windows = new Map();
        // Start with a higher base to avoid conflicts with legacy modals
        // Will sync with WindowManager if available
        this.nextZIndex = BASE_Z_INDEX;
        this.initialized = false;
        this.activeWindowId = null;
        this.viewportResizeFrameId = null;
    }

    /**
     * Sync z-index with WindowManager to avoid conflicts
     */
    private _syncZIndexWithWindowManager(): void {
        const legacyTopZ = window.WindowManager?.getTopZIndex?.();
        if (typeof legacyTopZ === 'number') {
            this.nextZIndex = this.zIndexManager.ensureTopZIndex(legacyTopZ);
        } else {
            this.nextZIndex = this.zIndexManager.getTopZIndex();
        }
    }

    init(): void {
        if (this.initialized) return;

        // Sync z-index with legacy WindowManager
        this._syncZIndexWithWindowManager();

        // Listen for clicks to bring windows to front
        document.addEventListener('mousedown', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const modal = target.closest('.modal');
            if (modal) {
                const windowId = modal.id;
                const window = this.windows.get(windowId);
                if (window) {
                    window.bringToFront();
                }
            }
        });

        // Keep managed window states (snap/maximize) aligned with viewport changes.
        window.addEventListener('resize', () => {
            if (this.viewportResizeFrameId !== null) {
                window.cancelAnimationFrame(this.viewportResizeFrameId);
            }
            this.viewportResizeFrameId = window.requestAnimationFrame(() => {
                this.viewportResizeFrameId = null;
                this.windows.forEach(windowInstance => {
                    windowInstance.handleViewportResize();
                });
            });
        });

        window.addEventListener('uiModeEffectiveChange', () => {
            this.windows.forEach(windowInstance => {
                windowInstance.handleViewportResize();
            });
            this._applyMobileWindowVisibility();
        });

        this.initialized = true;
    }

    /**
     * Register a window
     */
    registerWindow(window: BaseWindow): void {
        this.windows.set(window.id, window);
        logger.debug(
            'WINDOW',
            `[WindowRegistry] Registered window: ${window.id} (type: ${window.type})`
        );
        // If no active window yet, set the first registered as active
        if (!this.activeWindowId) this.activeWindowId = window.id;
        this._applyMobileWindowVisibility();
    }

    /**
     * Remove a window
     */
    removeWindow(windowId: string): void {
        const window = this.windows.get(windowId);
        if (window) {
            window.destroy();
            this.windows.delete(windowId);
            logger.debug('WINDOW', `[WindowRegistry] Removed window: ${windowId}`);
            // Update active window if needed
            if (this.activeWindowId === windowId) {
                const top = this.getTopWindow();
                this.activeWindowId = top ? top.id : null;
            }
            this._applyMobileWindowVisibility();
        }
    }

    /**
     * Get a window by ID
     */
    getWindow(windowId: string): BaseWindow | null {
        return this.windows.get(windowId) || null;
    }

    /**
     * Get all windows, optionally filtered by type
     * @param type - Optional window type filter (e.g., 'terminal', 'finder', 'text-editor')
     */
    getAllWindows(type?: string): BaseWindow[] {
        const allWindows = Array.from(this.windows.values());
        return type ? allWindows.filter(w => w.type === type) : allWindows;
    }

    /**
     * Get windows by type
     * @deprecated Use getAllWindows(type) instead
     */
    getWindowsByType(type: string): BaseWindow[] {
        return this.getAllWindows(type);
    }

    /**
     * Get next z-index for stacking
     */
    getNextZIndex(): number {
        // Sync with WindowManager to ensure we're always on top of legacy modals
        this._syncZIndexWithWindowManager();
        this.nextZIndex = this.zIndexManager.bumpZIndex();
        return this.nextZIndex;
    }

    /**
     * Get current top z-index without incrementing
     */
    getTopZIndex(): number {
        this.nextZIndex = this.zIndexManager.getTopZIndex();
        return this.nextZIndex;
    }

    /**
     * Update top z-index from external source (e.g., WindowManager)
     */
    updateTopZIndex(newZIndex: number): void {
        this.nextZIndex = this.zIndexManager.ensureTopZIndex(newZIndex);
    }

    /**
     * Close all windows of a specific type
     */
    closeAllWindowsOfType(type: string): void {
        const windows = this.getWindowsByType(type);
        windows.forEach(window => window.close());
    }

    /**
     * Close all windows
     */
    closeAllWindows(): void {
        const windows = Array.from(this.windows.values());
        windows.forEach(window => window.close());
    }

    /**
     * Get top-most window
     */
    getTopWindow(): BaseWindow | null {
        const topId = this.zIndexManager.getTopWindowId();
        if (topId) {
            const win = this.windows.get(topId);
            if (win) return win;
        }
        const windows = Array.from(this.windows.values());
        if (windows.length === 0) return null;

        return windows.reduce((top, current) => {
            return current.zIndex > top.zIndex ? current : top;
        });
    }

    /**
     * Mark a window as actively focused. Consumers (menus) can use this
     * to react to focus changes and render the correct application menu.
     */
    setActiveWindow(windowId: string | null): void {
        this.activeWindowId = windowId;
        this._applyMobileWindowVisibility();
        window.updateDockIndicators?.();
    }

    /**
     * Retrieve the currently active window, if known.
     */
    getActiveWindow(): BaseWindow | null {
        if (!this.activeWindowId) return null;
        return this.windows.get(this.activeWindowId) || null;
    }

    /**
     * Serialize all windows for session management
     */
    serializeAll(): WindowState[] {
        return Array.from(this.windows.values()).map(w => w.serialize());
    }

    /**
     * Restore windows from session
     */
    restoreFromSession(states: WindowState[]): void {
        states.forEach(state => {
            // Window types need to create their specific window classes
            // This will be handled by the session manager with window factories
            logger.debug(
                'WINDOW',
                `[WindowRegistry] Restore window ${state.id} (type: ${state.type})`
            );
        });
    }

    /**
     * Get count of windows by type
     */
    getWindowCount(type?: string): number {
        if (type) {
            return this.getWindowsByType(type).length;
        }
        return this.windows.size;
    }

    /**
     * Check if any windows are open
     */
    hasOpenWindows(): boolean {
        return this.windows.size > 0;
    }

    /**
     * Find window containing a specific tab
     */
    findWindowByTabId(tabId: string): BaseWindow | null {
        for (const window of this.windows.values()) {
            if (window.tabs.has(tabId)) {
                return window;
            }
        }
        return null;
    }

    /**
     * Debug: Log all windows
     */
    debugLogWindows(): void {
        logger.debug('WINDOW', '[WindowRegistry] Open windows:', {
            total: this.windows.size,
            windows: Array.from(this.windows.values()).map(w => ({
                id: w.id,
                type: w.type,
                tabs: w.tabs.size,
                zIndex: w.zIndex,
                minimized: w.isMinimized,
                maximized: w.isMaximized,
            })),
        });
    }
}

// Create and expose singleton
const registry = new WindowRegistry();
window.WindowRegistry = registry as any;

// Initialize registry when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => registry.init());
} else {
    registry.init();
}

export default registry;
