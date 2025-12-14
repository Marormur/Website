'use strict';
/**
 * src/ts/window-registry.ts
 * Central registry for managing all windows in the multi-window system
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, '__esModule', { value: true });
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
    constructor() {
        this.windows = new Map();
        // Start with a higher base to avoid conflicts with legacy modals
        // Will sync with WindowManager if available
        this.nextZIndex = 1000;
        this.initialized = false;
        this.activeWindowId = null;
    }
    /**
     * Sync z-index with WindowManager to avoid conflicts
     */
    _syncZIndexWithWindowManager() {
        const W = window;
        if (W.WindowManager && typeof W.WindowManager.getTopZIndex === 'function') {
            const legacyTopZ = W.WindowManager.getTopZIndex();
            if (legacyTopZ >= this.nextZIndex) {
                this.nextZIndex = legacyTopZ + 1;
            }
        }
    }
    init() {
        if (this.initialized) return;
        // Sync z-index with legacy WindowManager
        this._syncZIndexWithWindowManager();
        // Listen for clicks to bring windows to front
        document.addEventListener('mousedown', e => {
            const target = e.target;
            const modal = target.closest('.modal');
            if (modal) {
                const windowId = modal.id;
                const window = this.windows.get(windowId);
                if (window) {
                    window.bringToFront();
                }
            }
        });
        this.initialized = true;
    }
    /**
     * Register a window
     */
    registerWindow(window) {
        this.windows.set(window.id, window);
        console.log(`[WindowRegistry] Registered window: ${window.id} (type: ${window.type})`);
        // If no active window yet, set the first registered as active
        if (!this.activeWindowId) this.activeWindowId = window.id;
    }
    /**
     * Remove a window
     */
    removeWindow(windowId) {
        const window = this.windows.get(windowId);
        if (window) {
            window.destroy();
            this.windows.delete(windowId);
            console.log(`[WindowRegistry] Removed window: ${windowId}`);
            // Update active window if needed
            if (this.activeWindowId === windowId) {
                const top = this.getTopWindow();
                this.activeWindowId = top ? top.id : null;
            }
        }
    }
    /**
     * Get a window by ID
     */
    getWindow(windowId) {
        return this.windows.get(windowId) || null;
    }
    /**
     * Get all windows
     */
    getAllWindows() {
        return Array.from(this.windows.values());
    }
    /**
     * Get windows by type
     */
    getWindowsByType(type) {
        return Array.from(this.windows.values()).filter(w => w.type === type);
    }
    /**
     * Get next z-index for stacking
     */
    getNextZIndex() {
        // Sync with WindowManager to ensure we're always on top of legacy modals
        this._syncZIndexWithWindowManager();
        this.nextZIndex += 1;
        // Notify WindowManager of our new z-index so it can stay in sync
        const W = window;
        if (W.WindowManager && typeof W.WindowManager.updateTopZIndex === 'function') {
            W.WindowManager.updateTopZIndex(this.nextZIndex);
        }
        return this.nextZIndex;
    }
    /**
     * Get current top z-index without incrementing
     */
    getTopZIndex() {
        return this.nextZIndex;
    }
    /**
     * Update top z-index from external source (e.g., WindowManager)
     */
    updateTopZIndex(newZIndex) {
        if (newZIndex > this.nextZIndex) {
            this.nextZIndex = newZIndex;
        }
    }
    /**
     * Close all windows of a specific type
     */
    closeAllWindowsOfType(type) {
        const windows = this.getWindowsByType(type);
        windows.forEach(window => window.close());
    }
    /**
     * Close all windows
     */
    closeAllWindows() {
        const windows = Array.from(this.windows.values());
        windows.forEach(window => window.close());
    }
    /**
     * Get top-most window
     */
    getTopWindow() {
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
    setActiveWindow(windowId) {
        this.activeWindowId = windowId;
    }
    /**
     * Retrieve the currently active window, if known.
     */
    getActiveWindow() {
        if (!this.activeWindowId) return null;
        return this.windows.get(this.activeWindowId) || null;
    }
    /**
     * Serialize all windows for session management
     */
    serializeAll() {
        return Array.from(this.windows.values()).map(w => w.serialize());
    }
    /**
     * Restore windows from session
     */
    restoreFromSession(states) {
        states.forEach(state => {
            // Window types need to create their specific window classes
            // This will be handled by the session manager with window factories
            console.log(`[WindowRegistry] Restore window ${state.id} (type: ${state.type})`);
        });
    }
    /**
     * Get count of windows by type
     */
    getWindowCount(type) {
        if (type) {
            return this.getWindowsByType(type).length;
        }
        return this.windows.size;
    }
    /**
     * Check if any windows are open
     */
    hasOpenWindows() {
        return this.windows.size > 0;
    }
    /**
     * Find window containing a specific tab
     */
    findWindowByTabId(tabId) {
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
    debugLogWindows() {
        console.log('[WindowRegistry] Open windows:', {
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
window.WindowRegistry = registry;
// Initialize registry when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => registry.init());
} else {
    registry.init();
}
exports.default = registry;
//# sourceMappingURL=window-registry.js.map
