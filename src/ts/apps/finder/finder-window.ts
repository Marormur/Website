/**
 * src/ts/finder-window.ts
 * Finder-specific multi-window implementation
 */

import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import type { BaseTab } from '../../windows/base-tab.js';
import logger from '../../core/logger.js';

export class FinderWindow extends BaseWindow {
    /** WindowTabs controller for the tab bar – created lazily in _doRenderTabs. */
    private tabController?: {
        refresh: () => void;
        destroy: () => void;
        setTitle: (id: string, title: string) => void;
    } | null;
    private finderDragState = {
        isDragging: false,
        offsetX: 0,
        offsetY: 0,
    };

    constructor(config?: Partial<WindowConfig>) {
        super({
            type: 'finder',
            title: 'Finder',
            ...config,
        });
    }

    createDOM(): HTMLElement {
        const windowEl = super.createDOM();

        // Keep Finder-specific corner geometry centralized via CSS custom properties
        // so outer window and inset sidebar stay perfectly aligned.
        windowEl.classList.add('finder-window-shell');
        windowEl.style.setProperty('--finder-window-radius', '1.125rem');
        windowEl.style.setProperty('--finder-sidebar-inset', '0.5rem');
        windowEl.style.borderRadius = 'var(--finder-window-radius)';

        // Finder ships its own in-content top chrome. Remove legacy BaseWindow titlebar
        // so traffic lights are not duplicated.
        this.titlebarElement?.remove();
        this.titlebarElement = null;

        // Remove BaseWindow's tab bar from window chrome
        const baseTabBar = windowEl.querySelector('.window-tab-bar');
        if (baseTabBar) {
            baseTabBar.remove();
        }

        // Adjust content element for Finder (flex layout)
        if (this.contentElement) {
            this.contentElement.classList.add('flex');
        }

        this.attachFinderDragHandlers(windowEl);

        return windowEl;
    }

    private attachFinderDragHandlers(windowEl: HTMLElement): void {
        const isInteractiveTarget = (target: HTMLElement | null): boolean => {
            if (!target) return false;
            if (target.closest('.finder-no-drag')) return true;
            if (target.closest('.finder-tabs-container')) return true;
            if (target.closest('[data-resize-handle="sidebar"]')) return true;
            return Boolean(target.closest('button, input, select, textarea, a, [role="button"]'));
        };

        windowEl.addEventListener('mousedown', (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            const inFinderDragZone = target?.closest('.finder-window-drag-zone');
            if (!inFinderDragZone || isInteractiveTarget(target)) return;

            const rect = windowEl.getBoundingClientRect();
            this.finderDragState.isDragging = true;
            this.finderDragState.offsetX = e.clientX - rect.left;
            this.finderDragState.offsetY = e.clientY - rect.top;
            this.bringToFront();
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e: MouseEvent) => {
            if (!this.finderDragState.isDragging || !this.element) return;

            const newX = e.clientX - this.finderDragState.offsetX;
            const newY = e.clientY - this.finderDragState.offsetY;
            this.position.x = newX;
            this.position.y = newY;
            this.element.style.left = `${newX}px`;
            this.element.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!this.finderDragState.isDragging) return;
            this.finderDragState.isDragging = false;
            // Persist final position through BaseWindow's existing state mechanism.
            (this as unknown as { _saveState?: () => void })._saveState?.();
        });
    }

    show(): void {
        super.show();
        // Render tabs after window is shown and DOM exists
        this._renderTabs();
    }

    protected _renderTabs(): void {
        // Trigger a re-render of all tabs to ensure their tab lists are up to date
        this.tabs.forEach(tab => {
            const t = tab as BaseTab & { refresh?: () => void };
            if (typeof t.refresh === 'function') {
                t.refresh();
            }
        });

        // Force a micro-task delay to allow VDOM to complete rendering
        Promise.resolve().then(() => {
            if (window.__TEST_MODE__) {
                logger.debug('FINDER', '[FinderWindow] Tabs rendered, count:', this.tabs.size);
            }
        });
    }

    private _doRenderTabs(): void {
        if (!window.WindowTabs || !this.element) {
            return;
        }
        const tabBar = this.element.querySelector(`#${this.id}-tabs`);
        if (!tabBar) {
            return;
        }

        // Always show tab bar for Finder (unlike Terminal/TextEditor)
        (tabBar as HTMLElement).style.display = '';

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
                const view = window.FinderView
                    ? new window.FinderView({ title: cfg?.title || `Computer`, source: 'computer' })
                    : null;
                if (view) {
                    this.addTab(view as unknown as BaseTab);
                    this.setActiveTab((view as unknown as BaseTab).id);
                    return makeInst(view as unknown as BaseTab);
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

        // Destroy existing controller before creating new one
        if (this.tabController) {
            this.tabController.destroy();
        }
        this.tabController = window.WindowTabs.create!(adapter, tabBar as HTMLElement, {
            addButton: true,
            onCreateInstanceTitle: () => `Tab ${this.tabs.size + 1}`,
        });
    }

    createView(title?: string): BaseTab | null {
        if (!window.FinderView) {
            logger.error('FINDER', 'FinderView class not loaded');
            return null;
        }
        const view = new window.FinderView({ title: title || `Computer`, source: 'computer' });
        this.addTab(view as unknown as BaseTab);
        this.setActiveTab((view as unknown as BaseTab).id);

        // Trigger re-render of all tabs to update their tab lists
        this._renderTabs();

        return view as unknown as BaseTab;
    }

    createGithubView(title?: string): BaseTab | null {
        if (!window.FinderView) {
            logger.error('FINDER', 'FinderView class not loaded');
            return null;
        }
        const view = new window.FinderView({
            title: title || `GitHub`,
            source: 'github',
            icon: '📦',
        });
        this.addTab(view as unknown as BaseTab);
        this.setActiveTab((view as unknown as BaseTab).id);

        // Trigger re-render of all tabs to update their tab lists
        this._renderTabs();

        return view as unknown as BaseTab;
    }

    static create(config?: Partial<WindowConfig>): FinderWindow {
        const win = new FinderWindow(config);
        win.createView('Computer');

        // Register window BEFORE showing it, so updateDockIndicators() can find it
        if (window.WindowRegistry) window.WindowRegistry.registerWindow?.(win);

        win.show();

        // Explicitly render tabs (timing: must happen after window is shown and in DOM)
        win.requestTabsRender();

        return win;
    }

    static focusOrCreate(config?: Partial<WindowConfig>): FinderWindow {
        if (!window.WindowRegistry) {
            return FinderWindow.create(config);
        }

        const finderWindows = (window.WindowRegistry.getWindowsByType?.('finder') ??
            []) as FinderWindow[];

        if (finderWindows.length === 0) {
            return FinderWindow.create(config);
        }

        let mostRecentWindow = finderWindows[0]!;
        for (const win of finderWindows) {
            if (win.zIndex > mostRecentWindow.zIndex) {
                mostRecentWindow = win;
            }
        }

        mostRecentWindow.bringToFront();
        return mostRecentWindow;
    }
}

window.FinderWindow = FinderWindow;
