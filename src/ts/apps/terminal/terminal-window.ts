/**
 * src/ts/terminal-window.ts
 * Terminal-specific multi-window implementation
 */

import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import type { BaseTab } from '../../windows/base-tab.js';
import {
    createWindowTabsAdapter,
    mountWindowTabsController,
    reorderTabMap,
} from '../../framework/controls/window-tabs-adapter.js';
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

        const adapter = createWindowTabsAdapter({
            tabs: this.tabs,
            getActiveTabId: () => this.activeTabId,
            setActiveTab: (id: string) => this.setActiveTab(id),
            addTab: (tab: BaseTab) => this.addTab(tab),
            removeTab: (id: string) => this.removeTab(id),
            detachTab: (id: string) => this.detachTab(id),
            createTab: (cfg?: { title?: string }) => {
                const TerminalSessionCtor = window.TerminalSession;
                if (!TerminalSessionCtor) return null;
                return new TerminalSessionCtor({
                    title: cfg?.title || `Terminal ${this.tabs.size + 1}`,
                }) as unknown as BaseTab;
            },
            reorderTabs: (newOrder: string[]) => {
                this.tabs = reorderTabMap(this.tabs, newOrder);
                this._renderTabs();
            },
        });

        this.tabController = mountWindowTabsController({
            windowTabs: window.WindowTabs,
            tabBar: tabBar as HTMLElement,
            adapter,
            existingController: this.tabController,
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
