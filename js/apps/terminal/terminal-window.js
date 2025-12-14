'use strict';
/**
 * src/ts/terminal-window.ts
 * Terminal-specific multi-window implementation
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, '__esModule', { value: true });
exports.TerminalWindow = void 0;
const base_window_js_1 = require('../../windows/base-window.js');
/**
 * TerminalWindow - Window for terminal sessions
 *
 * Features:
 * - Multiple terminal tabs per window
 * - Terminal-specific toolbar
 * - Session management
 */
class TerminalWindow extends base_window_js_1.BaseWindow {
    constructor(config) {
        super({
            type: 'terminal',
            title: 'Terminal',
            ...config,
        });
    }
    /**
     * Accessor for tests: alias tabs as sessions for Terminal nomenclature
     */
    get sessions() {
        return Array.from(this.tabs.values());
    }
    /**
     * Get the currently active session (active tab)
     * This getter provides test compatibility for accessing the active terminal session
     */
    get activeSession() {
        if (!this.activeTabId) return null;
        return this.tabs.get(this.activeTabId) || null;
    }
    /**
     * Create terminal-specific window DOM
     */
    createDOM() {
        const modal = super.createDOM();
        // Title is now set via i18n in BaseWindow
        return modal;
    }
    /**
     * Override tab rendering to use WindowTabs system
     */
    _renderTabs() {
        const W = window;
        if (!W.WindowTabs || !this.element) return;
        const tabBar = this.element.querySelector(`#${this.id}-tabs`);
        if (!tabBar) return;
        // Create a simple adapter for WindowTabs
        const makeInst = tab => ({
            instanceId: tab.id,
            title: tab.title,
            metadata: { tabLabel: tab.title },
            __tab: tab,
            show: () => tab.show(),
            hide: () => tab.hide(),
        });
        const adapter = {
            getAllInstances: () => Array.from(this.tabs.values()).map(makeInst),
            getActiveInstance: () => {
                const activeId = this.activeTabId;
                const t = activeId ? this.tabs.get(activeId) : null;
                return t ? makeInst(t) : null;
            },
            getAllInstanceIds: () => Array.from(this.tabs.keys()),
            getInstance: id => {
                const t = this.tabs.get(id) || null;
                return t ? makeInst(t) : null;
            },
            setActiveInstance: id => this.setActiveTab(id),
            createInstance: cfg => {
                const W = window;
                const session = W.TerminalSession
                    ? new W.TerminalSession({
                          title: cfg?.title || `Terminal ${this.tabs.size + 1}`,
                      })
                    : null;
                if (session) {
                    this.addTab(session);
                    return makeInst(session);
                }
                return null;
            },
            destroyInstance: id => this.removeTab(id),
            getInstanceCount: () => this.tabs.size,
            reorderInstances: newOrder => {
                const old = this.tabs;
                const rebuilt = new Map();
                newOrder.forEach(id => {
                    const t = old.get(id);
                    if (t) rebuilt.set(id, t);
                });
                old.forEach((t, id) => {
                    if (!rebuilt.has(id)) rebuilt.set(id, t);
                });
                this.tabs = rebuilt;
                this._renderTabs();
            },
            detachInstance: id => {
                const t = this.detachTab(id);
                return t ? makeInst(t) : null;
            },
            adoptInstance: inst => {
                const tab = inst.__tab || inst;
                this.addTab(tab);
                this.setActiveTab(tab.id);
                return makeInst(tab);
            },
        };
        // Clear existing tab controller if any
        if (this.tabController) {
            this.tabController.destroy();
        }
        // Create WindowTabs controller
        this.tabController = W.WindowTabs.create(adapter, tabBar, {
            addButton: true,
            onCreateInstanceTitle: () => `Terminal ${this.tabs.size + 1}`,
        });
    }
    /**
     * Create a new terminal session in this window
     */
    createSession(title) {
        const W = window;
        if (!W.TerminalSession) {
            console.error('TerminalSession class not loaded');
            return null;
        }
        const session = new W.TerminalSession({
            title: title || `Terminal ${this.tabs.size + 1}`,
        });
        this.addTab(session);
        return session;
    }
    /**
     * Static factory method to create a terminal window with one session
     */
    static create(config) {
        const window = new TerminalWindow(config);
        // Create initial session
        window.createSession();
        // Register window BEFORE showing it, so updateDockIndicators() can find it
        const W = globalThis;
        if (W.WindowRegistry) {
            W.WindowRegistry.registerWindow(window);
        }
        // Show window
        window.show();
        return window;
    }
    /**
     * Focus existing Terminal window or create new one (macOS-like Dock behavior)
     * - If no Terminal window exists, create a new one
     * - If Terminal windows exist, focus the most recently active one
     */
    static focusOrCreate(config) {
        const W = globalThis;
        if (!W.WindowRegistry) {
            // Fallback: create new if registry unavailable
            return TerminalWindow.create(config);
        }
        // Get all existing Terminal windows
        const terminalWindows = W.WindowRegistry.getWindowsByType('terminal');
        if (terminalWindows.length === 0) {
            // No Terminal window exists → create new one
            return TerminalWindow.create(config);
        }
        // Find the most recently active Terminal window (highest z-index)
        let mostRecentWindow = terminalWindows[0];
        for (const win of terminalWindows) {
            if (win.zIndex > mostRecentWindow.zIndex) {
                mostRecentWindow = win;
            }
        }
        // Ensure the window has at least one session
        if (mostRecentWindow.tabs.size === 0 && W.TerminalSession) {
            mostRecentWindow.createSession();
        }
        // Focus the most recent Terminal window
        mostRecentWindow.bringToFront();
        return mostRecentWindow;
    }
}
exports.TerminalWindow = TerminalWindow;
// Export to window for global access
window.TerminalWindow = TerminalWindow;
//# sourceMappingURL=terminal-window.js.map
