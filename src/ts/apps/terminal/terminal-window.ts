/**
 * src/ts/terminal-window.ts
 * Terminal-specific multi-window implementation
 */

import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import type { BaseTab } from '../../windows/base-tab.js';
import logger from '../../core/logger.js';

/**
 * TerminalWindow - Window for terminal sessions
 *
 * Features:
 * - Multiple terminal tabs per window
 * - Terminal-specific toolbar
 * - Session management
 */
export class TerminalWindow extends BaseWindow {
    /** WindowTabs controller for the tab bar – created lazily in _renderTabs. */
    private tabController?: {
        refresh: () => void;
        destroy: () => void;
        setTitle: (id: string, title: string) => void;
    } | null;

    constructor(config?: Partial<WindowConfig>) {
        super({
            type: 'terminal',
            title: 'Terminal',
            ...config,
        });
    }

    /**
     * Accessor for tests: alias tabs as sessions for Terminal nomenclature
     */
    get sessions(): BaseTab[] {
        return Array.from(this.tabs.values());
    }

    /**
     * Get the currently active session (active tab)
     * This getter provides test compatibility for accessing the active terminal session
     */
    get activeSession(): BaseTab | null {
        if (!this.activeTabId) return null;
        return this.tabs.get(this.activeTabId) || null;
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
        if (!window.WindowTabs || !this.element) return;

        const tabBar = this.element.querySelector(`#${this.id}-tabs`);
        if (!tabBar) return;

        // Create a simple adapter for WindowTabs
        const makeInst = (tab: BaseTab) => ({
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
            createInstance: (cfg?: { title?: string }) => {
                const TerminalSessionCtor = window.TerminalSession;
                const session = TerminalSessionCtor
                    ? new TerminalSessionCtor({
                          title: cfg?.title || `Terminal ${this.tabs.size + 1}`,
                      })
                    : null;
                if (session) {
                    this.addTab(session as unknown as BaseTab);
                    return makeInst(session as unknown as BaseTab);
                }
                return null;
            },
            destroyInstance: (id: string) => this.removeTab(id),
            getInstanceCount: () => this.tabs.size,
            reorderInstances: (newOrder: string[]) => {
                const old = this.tabs;
                const rebuilt = new Map<string, BaseTab>();
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
            detachInstance: (id: string) => {
                const t = this.detachTab(id);
                return t ? makeInst(t) : null;
            },
            adoptInstance: (inst: { instanceId?: string; __tab?: BaseTab; id?: string }) => {
                const tab = inst.__tab || (inst as unknown as BaseTab);
                this.addTab(tab);
                this.setActiveTab((tab as BaseTab).id);
                return makeInst(tab);
            },
        };

        // Clear existing tab controller if any
        if (this.tabController) {
            this.tabController.destroy();
        }

        // Create WindowTabs controller
        this.tabController = window.WindowTabs.create!(adapter, tabBar as HTMLElement, {
            addButton: true,
            onCreateInstanceTitle: () => `Terminal ${this.tabs.size + 1}`,
        });
    }

    /**
     * Create a new terminal session in this window
     */
    createSession(title?: string): BaseTab | null {
        if (!window.TerminalSession) {
            logger.error('TERMINAL', 'TerminalSession class not loaded');
            return null;
        }

        const session = new window.TerminalSession({
            title: title || `Terminal ${this.tabs.size + 1}`,
        });

        this.addTab(session as unknown as BaseTab);
        return session as unknown as BaseTab;
    }

    /**
     * Static factory method to create a terminal window with one session
     */
    static create(config?: Partial<WindowConfig>): TerminalWindow {
        const window = new TerminalWindow(config);

        // Create initial session
        window.createSession();

        // Register window BEFORE showing it, so updateDockIndicators() can find it
        globalThis.window.WindowRegistry?.registerWindow?.(window);

        // Show window
        window.show();

        // Explicitly render tabs (timing: must happen after window is shown and in DOM)
        window.requestTabsRender();

        return window;
    }

    /**
     * Focus existing Terminal window or create new one (macOS-like Dock behavior)
     * - If no Terminal window exists, create a new one
     * - If Terminal windows exist, focus the most recently active one
     */
    static focusOrCreate(config?: Partial<WindowConfig>): TerminalWindow {
        if (!window.WindowRegistry) {
            // Fallback: create new if registry unavailable
            return TerminalWindow.create(config);
        }

        // Get all existing Terminal windows
        const terminalWindows = (window.WindowRegistry.getWindowsByType?.('terminal') ??
            []) as TerminalWindow[];

        if (terminalWindows.length === 0) {
            // No Terminal window exists → create new one
            return TerminalWindow.create(config);
        }

        // Find the most recently active Terminal window (highest z-index)
        let mostRecentWindow = terminalWindows[0]!;
        for (const win of terminalWindows) {
            if (win.zIndex > mostRecentWindow.zIndex) {
                mostRecentWindow = win;
            }
        }
        // Ensure the window has at least one session
        if (mostRecentWindow.tabs.size === 0 && window.TerminalSession) {
            mostRecentWindow.createSession();
        }

        // Focus the most recent Terminal window
        mostRecentWindow.bringToFront();
        return mostRecentWindow;
    }
}

// Export to window for global access
window.TerminalWindow = TerminalWindow;
