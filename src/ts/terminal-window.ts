/**
 * src/ts/terminal-window.ts
 * Terminal-specific multi-window implementation
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { BaseWindow, type WindowConfig } from './base-window.js';
import type { BaseTab } from './base-tab.js';

/**
 * TerminalWindow - Window for terminal sessions
 *
 * Features:
 * - Multiple terminal tabs per window
 * - Terminal-specific toolbar
 * - Session management
 */
export class TerminalWindow extends BaseWindow {
    constructor(config?: Partial<WindowConfig>) {
        super({
            type: 'terminal',
            title: 'Terminal',
            ...config,
        });
    }

    /**
     * Create terminal-specific window DOM
     */
    createDOM(): HTMLElement {
        const modal = super.createDOM();
        // Title is now set via i18n in BaseWindow
        return modal;
    }

    /**
     * Override tab rendering to use WindowTabs system
     */
    protected _renderTabs(): void {
        const W = window as any;
        if (!W.WindowTabs || !this.element) return;

        const tabBar = this.element.querySelector(`#${this.id}-tabs`);
        if (!tabBar) return;

        // Create a simple adapter for WindowTabs
        const makeInst = (tab: any) => ({
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
            getInstance: (id: string) => {
                const t = this.tabs.get(id) || null;
                return t ? makeInst(t) : null;
            },
            setActiveInstance: (id: string) => this.setActiveTab(id),
            createInstance: (cfg?: any) => {
                const W = window as any;
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
            destroyInstance: (id: string) => this.removeTab(id),
            getInstanceCount: () => this.tabs.size,
            reorderInstances: (newOrder: string[]) => {
                const old = this.tabs;
                const rebuilt = new Map<string, any>();
                newOrder.forEach(id => {
                    const t = old.get(id);
                    if (t) rebuilt.set(id, t);
                });
                old.forEach((t, id) => {
                    if (!rebuilt.has(id)) rebuilt.set(id, t);
                });
                (this as any).tabs = rebuilt;
                this._renderTabs();
            },
            detachInstance: (id: string) => {
                const t = this.detachTab(id) as any;
                return t ? makeInst(t) : null;
            },
            adoptInstance: (inst: any) => {
                const tab = inst.__tab || inst;
                this.addTab(tab);
                this.setActiveTab(tab.id);
                return makeInst(tab);
            },
        };

        // Clear existing tab controller if any
        if ((this as any).tabController) {
            (this as any).tabController.destroy();
        }

        // Create WindowTabs controller
        (this as any).tabController = W.WindowTabs.create(adapter, tabBar as HTMLElement, {
            addButton: true,
            onCreateInstanceTitle: () => `Terminal ${this.tabs.size + 1}`,
        });
    }

    /**
     * Create a new terminal session in this window
     */
    createSession(title?: string): BaseTab | null {
        const W = window as any;
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
    static create(config?: Partial<WindowConfig>): TerminalWindow {
        const window = new TerminalWindow(config);

        // Create initial session
        window.createSession();

        // Show window
        window.show();

        // Register with WindowRegistry
        const W = globalThis as any;
        if (W.WindowRegistry) {
            W.WindowRegistry.registerWindow(window);
        }

        return window;
    }

    /**
     * Focus existing Terminal window or create new one (macOS-like Dock behavior)
     * - If no Terminal window exists, create a new one
     * - If Terminal windows exist, focus the most recently active one
     */
    static focusOrCreate(config?: Partial<WindowConfig>): TerminalWindow {
        const W = globalThis as any;
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

        // Focus the most recent Terminal window
        mostRecentWindow.bringToFront();
        return mostRecentWindow;
    }
}

// Export to window for global access
(window as any).TerminalWindow = TerminalWindow;
