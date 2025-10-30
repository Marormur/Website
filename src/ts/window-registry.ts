/**
 * src/ts/window-registry.ts
 * Central registry for managing all windows in the multi-window system
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { BaseWindow, WindowState } from './base-window.js';

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

    constructor() {
        this.windows = new Map();
        // Start with a higher base to avoid conflicts with legacy modals
        // Will sync with WindowManager if available
        this.nextZIndex = 1000;
        this.initialized = false;
    }

    /**
     * Sync z-index with WindowManager to avoid conflicts
     */
    private _syncZIndexWithWindowManager(): void {
        const W = window as any;
        if (W.WindowManager && typeof W.WindowManager.getTopZIndex === 'function') {
            const legacyTopZ = W.WindowManager.getTopZIndex();
            if (legacyTopZ >= this.nextZIndex) {
                this.nextZIndex = legacyTopZ + 1;
            }
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

        this.initialized = true;
    }

    /**
     * Register a window
     */
    registerWindow(window: BaseWindow): void {
        this.windows.set(window.id, window);
        console.log(`[WindowRegistry] Registered window: ${window.id} (type: ${window.type})`);
    }

    /**
     * Remove a window
     */
    removeWindow(windowId: string): void {
        const window = this.windows.get(windowId);
        if (window) {
            window.destroy();
            this.windows.delete(windowId);
            console.log(`[WindowRegistry] Removed window: ${windowId}`);
        }
    }

    /**
     * Get a window by ID
     */
    getWindow(windowId: string): BaseWindow | null {
        return this.windows.get(windowId) || null;
    }

    /**
     * Get all windows
     */
    getAllWindows(): BaseWindow[] {
        return Array.from(this.windows.values());
    }

    /**
     * Get windows by type
     */
    getWindowsByType(type: string): BaseWindow[] {
        return Array.from(this.windows.values()).filter(w => w.type === type);
    }

    /**
     * Get next z-index for stacking
     */
    getNextZIndex(): number {
        // Sync with WindowManager to ensure we're always on top of legacy modals
        this._syncZIndexWithWindowManager();
        this.nextZIndex += 1;

        // Notify WindowManager of our new z-index so it can stay in sync
        const W = window as any;
        if (W.WindowManager && typeof W.WindowManager.updateTopZIndex === 'function') {
            W.WindowManager.updateTopZIndex(this.nextZIndex);
        }

        return this.nextZIndex;
    }

    /**
     * Get current top z-index without incrementing
     */
    getTopZIndex(): number {
        return this.nextZIndex;
    }

    /**
     * Update top z-index from external source (e.g., WindowManager)
     */
    updateTopZIndex(newZIndex: number): void {
        if (newZIndex > this.nextZIndex) {
            this.nextZIndex = newZIndex;
        }
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
        const windows = Array.from(this.windows.values());
        if (windows.length === 0) return null;

        return windows.reduce((top, current) => {
            return current.zIndex > top.zIndex ? current : top;
        });
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
            console.log(`[WindowRegistry] Restore window ${state.id} (type: ${state.type})`);
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
(window as any).WindowRegistry = registry;

// Initialize registry when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => registry.init());
} else {
    registry.init();
}

export default registry;
