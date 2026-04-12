/**
 * src/ts/finder-window.ts
 * Finder-specific multi-window implementation
 */

import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import type { BaseTab } from '../../windows/base-tab.js';
import { configureInsetWindowShell } from '../../framework/controls/inset-window-shell.js';
import {
    focusOrCreateWindowByType,
    showAndRegisterWindow,
} from '../../framework/controls/window-lifecycle.js';
import {
    createWindowTabsAdapter,
    mountWindowTabsController,
    reorderTabMap,
} from '../../framework/controls/window-tabs-adapter.js';
import logger from '../../core/logger.js';
import { attachWindowDragZoneBehavior } from '../../framework/controls/window-drag-zone.js';
import { getDockReservedBottom } from '../../ui/dock.js';
import {
    getLogicalViewportHeight,
    getLogicalViewportWidth,
    resolveElementLogicalPx,
} from '../../utils/viewport.js';

type FinderCurrentView = 'computer' | 'github' | 'favorites' | 'recent';

export class FinderWindow extends BaseWindow {
    /** WindowTabs controller for the tab bar – created lazily in _doRenderTabs. */
    private tabController?: {
        refresh: () => void;
        destroy: () => void;
        setTitle: (id: string, title: string) => void;
    } | null;
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
        this.titlebarElement = configureInsetWindowShell({
            windowEl,
            titlebarElement: this.titlebarElement,
            shellClassName: 'finder-window-shell',
            cssVariables: {
                '--finder-window-radius': '1.125rem',
                '--finder-sidebar-inset': '0.5rem',
            },
            contentClassListAdd: ['flex'],
        });

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

        attachWindowDragZoneBehavior({
            windowEl,
            isInteractiveTarget,
            bringToFront: () => this.bringToFront(),
            isMaximized: () => this.isMaximized,
            toggleMaximize: () => this.toggleMaximize(),
            updatePosition: (x: number, y: number, targetEl: HTMLElement) => {
                this.position.x = x;
                this.position.y = y;
                targetEl.style.left = `${x}px`;
                targetEl.style.top = `${y}px`;
            },
            getSnapCandidate: (target: HTMLElement | null, pointerX: number | null) =>
                this.getSnapCandidate(target, pointerX),
            snapTo: (side: 'left' | 'right') => this.snapTo(side),
            persistState: () => {
                (this as unknown as { _saveState?: () => void })._saveState?.();
            },
            restoreFromSnappedDrag: ({ windowEl: dragEl, pointerX, pointerY }) => {
                if (dragEl.dataset.snapped === 'left' || dragEl.dataset.snapped === 'right') {
                    const snappedRect = dragEl.getBoundingClientRect();
                    const snappedLeft = resolveElementLogicalPx(dragEl, 'left', snappedRect.left);
                    const snappedTop = resolveElementLogicalPx(dragEl, 'top', snappedRect.top);
                    const snappedWidth = Math.max(
                        1,
                        resolveElementLogicalPx(dragEl, 'width', snappedRect.width)
                    );
                    const snappedHeight = Math.max(
                        1,
                        resolveElementLogicalPx(dragEl, 'height', snappedRect.height)
                    );
                    const preservedOffsetX = Math.max(
                        0,
                        Math.min(snappedWidth, pointerX - snappedLeft)
                    );
                    const preservedOffsetY = Math.max(
                        0,
                        Math.min(snappedHeight, pointerY - snappedTop)
                    );

                    this.unsnap();

                    const restoredRect = dragEl.getBoundingClientRect();
                    const restoredWidth = Math.max(
                        1,
                        resolveElementLogicalPx(dragEl, 'width', restoredRect.width)
                    );
                    const restoredHeight = Math.max(
                        1,
                        resolveElementLogicalPx(dragEl, 'height', restoredRect.height)
                    );
                    const clampedOffsetX = Math.max(0, Math.min(restoredWidth, preservedOffsetX));
                    const clampedOffsetY = Math.max(0, Math.min(restoredHeight, preservedOffsetY));
                    const minTop = window.getMenuBarBottom?.() || 0;
                    const dockReserve = Math.round(getDockReservedBottom());
                    const maxLeft = Math.max(0, getLogicalViewportWidth() - restoredWidth);
                    const maxTop = Math.max(
                        minTop,
                        getLogicalViewportHeight() - dockReserve - restoredHeight
                    );
                    const restoredLeft = Math.max(0, Math.min(maxLeft, pointerX - clampedOffsetX));
                    const restoredTop = Math.max(
                        minTop,
                        Math.min(maxTop, pointerY - clampedOffsetY)
                    );

                    dragEl.style.left = `${Math.round(restoredLeft)}px`;
                    dragEl.style.top = `${Math.round(restoredTop)}px`;
                    this.position.x = Math.round(restoredLeft);
                    this.position.y = Math.round(restoredTop);
                }
            },
        });
    }

    private getSnapCandidate(
        target: HTMLElement | null,
        pointerX: number | null
    ): 'left' | 'right' | null {
        if (!target) return null;
        // Snap-Detection läuft im gerenderten Koordinatenraum (clientX + getBoundingClientRect).
        // Deshalb hier bewusst window.innerWidth statt logischer Viewport-Breite verwenden.
        const viewportWidth = Math.max(window.innerWidth || 0, 0);
        if (viewportWidth <= 0) return null;

        const threshold = Math.max(3, Math.min(14, viewportWidth * 0.0035));
        const rect = target.getBoundingClientRect();

        const pointerDistLeft =
            typeof pointerX === 'number' ? Math.max(0, pointerX) : Math.abs(rect.left);
        if (Math.abs(rect.left) <= threshold || pointerDistLeft <= threshold) return 'left';

        const distRight = viewportWidth - rect.right;
        const pointerDistRight =
            typeof pointerX === 'number'
                ? Math.max(0, viewportWidth - pointerX)
                : Math.abs(distRight);
        if (Math.abs(distRight) <= threshold || pointerDistRight <= threshold) return 'right';

        return null;
    }

    private snapTo(side: 'left' | 'right'): void {
        const target = this.element;
        if (!target) return;

        this.isMaximized = false;

        if (!target.dataset.snapped) {
            const rect = target.getBoundingClientRect();
            target.dataset.prevSnapLeft = `${Math.round(resolveElementLogicalPx(target, 'left', rect.left))}`;
            target.dataset.prevSnapTop = `${Math.round(resolveElementLogicalPx(target, 'top', rect.top))}`;
            target.dataset.prevSnapWidth = `${Math.round(resolveElementLogicalPx(target, 'width', rect.width))}`;
            target.dataset.prevSnapHeight = `${Math.round(resolveElementLogicalPx(target, 'height', rect.height))}`;
        }

        const metrics = window.computeSnapMetrics?.(side);
        if (!metrics) return;

        // Allow full-height snap; otherwise max-h:90vh creates visible edge gaps.
        target.style.maxWidth = 'none';
        target.style.maxHeight = 'none';
        target.style.position = 'fixed';
        target.style.left = `${metrics.left}px`;
        target.style.top = `${metrics.top}px`;
        target.style.width = `${metrics.width}px`;
        target.style.height = `${metrics.height}px`;
        target.dataset.snapped = side;

        this.position.x = metrics.left;
        this.position.y = metrics.top;
        this.position.width = metrics.width;
        this.position.height = metrics.height;
        this.bringToFront();
    }

    private unsnap(): void {
        const target = this.element;
        if (!target) return;
        if (!(target.dataset.snapped === 'left' || target.dataset.snapped === 'right')) return;

        const restoreLeft = Number.parseFloat(target.dataset.prevSnapLeft || '');
        const restoreTop = Number.parseFloat(target.dataset.prevSnapTop || '');
        const restoreWidth = Number.parseFloat(target.dataset.prevSnapWidth || '');
        const restoreHeight = Number.parseFloat(target.dataset.prevSnapHeight || '');

        const hasRestore =
            Number.isFinite(restoreLeft) &&
            Number.isFinite(restoreTop) &&
            Number.isFinite(restoreWidth) &&
            Number.isFinite(restoreHeight);

        if (hasRestore) {
            target.style.maxWidth = '';
            target.style.maxHeight = '';
            target.style.position = 'fixed';
            target.style.left = `${Math.round(restoreLeft)}px`;
            target.style.top = `${Math.round(restoreTop)}px`;
            target.style.width = `${Math.round(restoreWidth)}px`;
            target.style.height = `${Math.round(restoreHeight)}px`;

            this.position.x = Math.round(restoreLeft);
            this.position.y = Math.round(restoreTop);
            this.position.width = Math.round(restoreWidth);
            this.position.height = Math.round(restoreHeight);
        }

        delete target.dataset.snapped;
        delete target.dataset.prevSnapLeft;
        delete target.dataset.prevSnapTop;
        delete target.dataset.prevSnapWidth;
        delete target.dataset.prevSnapHeight;
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

        const adapter = createWindowTabsAdapter({
            tabs: this.tabs,
            getActiveTabId: () => this.activeTabId,
            setActiveTab: (id: string) => this.setActiveTab(id),
            addTab: (tab: BaseTab) => this.addTab(tab),
            removeTab: (id: string) => this.removeTab(id),
            detachTab: (id: string) => this.detachTab(id),
            createTab: (cfg?: { title?: string }) => {
                const view = window.FinderView
                    ? new window.FinderView({
                          title: cfg?.title || `Marvintosh HD`,
                          source: 'computer',
                      })
                    : null;
                return view as unknown as BaseTab | null;
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
            onCreateInstanceTitle: () => `Tab ${this.tabs.size + 1}`,
        });
    }

    createView(title?: string): BaseTab | null {
        if (!window.FinderView) {
            logger.error('FINDER', 'FinderView class not loaded');
            return null;
        }
        const view = new window.FinderView({ title: title || `Marvintosh HD`, source: 'computer' });
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

        return showAndRegisterWindow(win, { requestTabsRender: true });
    }

    static focusOrCreate(config?: Partial<WindowConfig>): FinderWindow {
        return focusOrCreateWindowByType<FinderWindow>({
            type: 'finder',
            create: () => FinderWindow.create(config),
        });
    }
}

window.FinderWindow = FinderWindow;
