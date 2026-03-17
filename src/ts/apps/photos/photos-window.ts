/*
 * PhotosWindow — integrates the Photos app into the BaseWindow system.
 * Design: Same sidebar + content language as FinderWindow and System Settings:
 *   - Inset frosted-glass sidebar panel with traffic lights (photos-sidebar-shell / photos-sidebar-panel)
 *   - photos-content-topbar with segment switcher + search
 *   - No separate titlebar; drag handled via finder-window-drag-zone zones
 */

import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import { configureInsetWindowShell } from '../../framework/controls/inset-window-shell.js';
import {
    focusOrCreateWindowByType,
    showAndRegisterWindow,
} from '../../framework/controls/window-lifecycle.js';
import { attachWindowDragZoneBehavior } from '../../framework/controls/window-drag-zone.js';

export class PhotosWindow extends BaseWindow {
    constructor(config?: Partial<WindowConfig>) {
        super({
            type: 'photos',
            title: 'Fotos',
            ...config,
        });
    }

    createDOM(): HTMLElement {
        const win = super.createDOM();

        // Apply same visual shell as FinderWindow: glassmorphism outer frame
        this.titlebarElement = configureInsetWindowShell({
            windowEl: win,
            titlebarElement: this.titlebarElement,
            shellClassName: 'photos-window-shell',
            cssVariables: {
                '--photos-window-radius': '1.125rem',
                '--photos-sidebar-inset': '0.5rem',
                '--photos-sidebar-width': '224px',
            },
            contentClassName: 'flex-1 overflow-hidden relative',
        });

        // Build app layout via shared builder (photos-app.ts)
        // The returned container already includes the detail overlay — do NOT append it again.
        const builder = window.PhotosAppBuildContent as
            | (() => { container: HTMLElement; detailOverlay: HTMLElement })
            | undefined;
        if (typeof builder === 'function') {
            const { container } = builder();
            this.contentElement?.appendChild(container);
        }

        // Wire up element references and start the app
        window.PhotosAppAttachToWindow?.(win as HTMLElement);

        // Enable drag via finder-window-drag-zone (same mechanism as FinderWindow)
        this.attachDragHandlers(win);

        return win;
    }

    /**
     * Enables window dragging via elements with class `finder-window-drag-zone`.
     * Interactive children (buttons, inputs, .finder-no-drag) are excluded.
     * DEPENDENCY: must run after createDOM() so the drag zones exist in the DOM.
     */
    private attachDragHandlers(windowEl: HTMLElement): void {
        const isInteractiveTarget = (target: HTMLElement | null): boolean => {
            if (!target) return false;
            if (target.closest('.finder-no-drag')) return true;
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
        });
    }

    private getSnapCandidate(
        target: HTMLElement | null,
        pointerX: number | null
    ): 'left' | 'right' | null {
        if (!target) return null;
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

    /**
     * PURPOSE: Returns the frontmost existing Photos window or creates a new one.
     * WHY: Dock icon click should focus an open window rather than spawn duplicates.
     * INVARIANT: At most one Photos window is active at a time (single-instance app).
     */
    static focusOrCreate(config?: Partial<WindowConfig>): PhotosWindow {
        return focusOrCreateWindowByType<PhotosWindow>({
            type: 'photos',
            create: () => PhotosWindow.create(config),
        });
    }

    static create(config?: Partial<WindowConfig>): PhotosWindow {
        const w = new PhotosWindow(config);
        return showAndRegisterWindow(w);
    }
}

// Expose on window for global access
window.PhotosWindow = PhotosWindow;
