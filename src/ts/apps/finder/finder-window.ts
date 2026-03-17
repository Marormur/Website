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
import { resolveElementLogicalPx, toLogicalPx } from '../../utils/viewport.js';

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
                    const initialRect = dragEl.getBoundingClientRect();
                    const preservedOffsetX = pointerX - toLogicalPx(initialRect.left);
                    const preservedOffsetY = pointerY - toLogicalPx(initialRect.top);
                    this.unsnap();
                    const minTopAfterUnsnap = window.getMenuBarBottom?.() || 0;
                    dragEl.style.position = 'fixed';
                    dragEl.style.left = `${pointerX - preservedOffsetX}px`;
                    dragEl.style.top = `${Math.max(minTopAfterUnsnap, pointerY - preservedOffsetY)}px`;
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
                    ? new window.FinderView({ title: cfg?.title || `Computer`, source: 'computer' })
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

/**
 * FinderSystem shim – re-exposes the legacy FinderSystemAPI global that
 * context-menu.ts, desktop.ts and other callers rely on after finder.ts
 * was deprecated. All operations delegate to the active FinderWindow tab.
 *
 * PURPOSE: Preserve backward-compatible global API without reintroducing
 *          the monolithic finder.ts.
 * DEPENDENCY: Must run after window.FinderWindow is set. Callers guard with
 *             `window.FinderSystem &&` so it's safe to initialise lazily here.
 */
function _getActiveFV(): Record<string, unknown> | null {
    if (!window.WindowRegistry) return null;
    const wins = (window.WindowRegistry.getWindowsByType?.('finder') ?? []) as FinderWindow[];
    if (wins.length === 0) return null;
    // Pick the window with the highest z-index (most recently focused)
    const win = wins.reduce((a, b) => (a.zIndex >= b.zIndex ? a : b));
    const activeTab = win.activeTabId ? win.tabs.get(win.activeTabId) : null;
    const firstTab = win.tabs.values().next().value as BaseTab | undefined;
    const tab = activeTab ?? firstTab ?? null;
    if (!win.activeTabId && tab?.id) {
        win.setActiveTab(tab.id);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return tab ? (tab as any) : null;
}

function _ensureActiveFV(): Record<string, unknown> | null {
    const existing = _getActiveFV();
    if (existing) return existing;

    const win = FinderWindow.focusOrCreate();
    if (!win.activeTabId && win.tabs.size === 0) {
        win.createView('Computer');
    }
    if (!win.activeTabId) {
        const firstId = win.tabs.keys().next().value as string | undefined;
        if (firstId) win.setActiveTab(firstId);
    }

    return _getActiveFV();
}

window.FinderSystem = {
    init(): void {},
    openFinder(): void {
        FinderWindow.focusOrCreate();
    },
    closeFinder(): void {
        if (!window.WindowRegistry) return;
        (window.WindowRegistry.getWindowsByType?.('finder') ?? []).forEach((w: unknown) =>
            (w as { close?: () => void }).close?.()
        );
    },
    /** Navigate to a path/view. Pass view='github' to open GitHub Projekte in gallery mode. */
    navigateTo(path: string[] | string, view?: FinderCurrentView | null): void {
        const fv = _ensureActiveFV();
        if (!fv) return;
        if (view === 'github') {
            const openGithubProjects = fv['openGithubProjects'] as
                | ((this: Record<string, unknown>) => void)
                | undefined;
            if (typeof openGithubProjects === 'function') {
                openGithubProjects.call(fv);
            } else {
                // Legacy fallback for older FinderView implementations.
                fv['source'] = 'github';
                (fv['setViewMode'] as ((m: string) => void) | undefined)?.('gallery');
                (fv['goRoot'] as () => void)?.();
            }
            return;
        }
        fv['source'] = 'computer';
        const parts = Array.isArray(path)
            ? (path as string[])
            : path
              ? String(path).split('/').filter(Boolean)
              : [];
        (fv['navigateToPath'] as (p: string[]) => void)?.(parts);
    },
    navigateUp(): void {
        (_getActiveFV()?.['navigateUp'] as (() => void) | undefined)?.();
    },
    navigateToFolder(folderName: string): void {
        (_getActiveFV()?.['navigateToFolder'] as ((n: string) => void) | undefined)?.(folderName);
    },
    openItem(name: string, type: string): void {
        void (
            _getActiveFV()?.['openItem'] as ((n: string, t: string) => Promise<void>) | undefined
        )?.(name, type);
    },
    setSortBy(field: 'name' | 'date' | 'size' | 'type'): void {
        const keyMap: Record<string, string> = {
            name: 'name',
            date: 'dateModified',
            size: 'size',
            type: 'type',
        };
        (_getActiveFV()?.['setSortBy'] as ((k: string) => void) | undefined)?.(
            keyMap[field] ?? 'name'
        );
    },
    setViewMode(mode: 'list' | 'grid' | 'columns' | 'gallery'): void {
        const normalized = mode === 'columns' ? 'list' : mode;
        (_getActiveFV()?.['setViewMode'] as ((m: string) => void) | undefined)?.(normalized);
    },
    toggleFavorite(path: string): void {
        (_getActiveFV()?.['toggleFavorite'] as ((p: string) => void) | undefined)?.(path);
    },
    getState() {
        const fv = _getActiveFV();
        if (!fv) return null;
        return {
            currentPath: fv['currentPath'] as string[],
            currentView: fv['source'] as FinderCurrentView,
            viewMode: fv['viewMode'] as 'list' | 'grid',
        };
    },
};
