/**
 * src/ts/finder-window.ts
 * Finder-specific multi-window implementation
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import type { BaseTab } from '../../windows/base-tab.js';

export class FinderWindow extends BaseWindow {
    constructor(config?: Partial<WindowConfig>) {
        super({
            type: 'finder',
            title: 'Finder',
            ...config,
        });
    }

    createDOM(): HTMLElement {
        const windowEl = super.createDOM();

        // Remove BaseWindow's tab bar from window chrome
        const baseTabBar = windowEl.querySelector('.window-tab-bar');
        if (baseTabBar) {
            baseTabBar.remove();
        }

        // Adjust content element for Finder (flex layout)
        if (this.contentElement) {
            this.contentElement.classList.add('flex');
        }

        return windowEl;
    }

    show(): void {
        super.show();
        // Render tabs after window is shown and DOM exists
        this._renderTabs();
    }

    protected _renderTabs(): void {
        // Trigger a re-render of all tabs to ensure their tab lists are up to date
        this.tabs.forEach(tab => {
            if ((tab as any).refresh) {
                (tab as any).refresh();
            }
        });
    }

    private _doRenderTabs(): void {
        const W = window as any;
        if (!W.WindowTabs || !this.element) {
            return;
        }
        const tabBar = this.element.querySelector(`#${this.id}-tabs`);
        if (!tabBar) {
            return;
        }

        // Always show tab bar for Finder (unlike Terminal/TextEditor)
        // Tab bar contains navigation and "+" button
        (tabBar as HTMLElement).style.display = '';

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
                const view = W.FinderView
                    ? new W.FinderView({ title: cfg?.title || `Computer`, source: 'computer' })
                    : null;
                if (view) {
                    this.addTab(view);
                    // Aktiviere den neuen Tab direkt nach dem Erstellen
                    this.setActiveTab(view.id);
                    return makeInst(view);
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

        // Destroy existing controller before creating new one
        if ((this as any).tabController) {
            (this as any).tabController.destroy();
        }
        (this as any).tabController = W.WindowTabs.create(adapter, tabBar as HTMLElement, {
            addButton: true,
            onCreateInstanceTitle: () => `Tab ${this.tabs.size + 1}`,
        });
    }

    createView(title?: string): BaseTab | null {
        const W = window as any;
        if (!W.FinderView) {
            console.error('FinderView class not loaded');
            return null;
        }
        const view = new W.FinderView({ title: title || `Computer`, source: 'computer' });
        this.addTab(view);
        this.setActiveTab(view.id);

        // Trigger re-render of all tabs to update their tab lists
        this._renderTabs();

        return view;
    }

    createGithubView(title?: string): BaseTab | null {
        const W = window as any;
        if (!W.FinderView) {
            console.error('FinderView class not loaded');
            return null;
        }
        const view = new W.FinderView({ title: title || `GitHub`, source: 'github', icon: '📦' });
        this.addTab(view);
        this.setActiveTab(view.id);

        // Trigger re-render of all tabs to update their tab lists
        this._renderTabs();

        return view;
    }

    static create(config?: Partial<WindowConfig>): FinderWindow {
        const window = new FinderWindow(config);
        window.createView('Computer');

        // Register window BEFORE showing it, so updateDockIndicators() can find it
        const W = globalThis as any;
        if (W.WindowRegistry) W.WindowRegistry.registerWindow(window);

        window.show();

        // Explicitly render tabs (timing: must happen after window is shown and in DOM)
        (window as any)._renderTabs?.();

        return window;
    }

    /**
     * Focus existing Finder window or create new one (macOS-like Dock behavior)
     * - If no Finder window exists, create a new one
     * - If Finder windows exist, focus the most recently active one
     */
    static focusOrCreate(config?: Partial<WindowConfig>): FinderWindow {
        const W = globalThis as any;
        if (!W.WindowRegistry) {
            // Fallback: create new if registry unavailable
            return FinderWindow.create(config);
        }

        // Get all existing Finder windows
        const finderWindows = W.WindowRegistry.getWindowsByType('finder');

        if (finderWindows.length === 0) {
            // No Finder window exists → create new one
            return FinderWindow.create(config);
        }

        // Find the most recently active Finder window (highest z-index)
        let mostRecentWindow = finderWindows[0];
        for (const win of finderWindows) {
            if (win.zIndex > mostRecentWindow.zIndex) {
                mostRecentWindow = win;
            }
        }

        // Focus the most recent Finder window
        mostRecentWindow.bringToFront();
        return mostRecentWindow;
    }
}

(window as any).FinderWindow = FinderWindow;
