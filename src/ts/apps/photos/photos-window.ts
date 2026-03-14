/*
 * PhotosWindow — integrates the Photos app into the BaseWindow system.
 * Design: Same sidebar + content language as FinderWindow and System Settings:
 *   - Inset frosted-glass sidebar panel with traffic lights (photos-sidebar-shell / photos-sidebar-panel)
 *   - photos-content-topbar with segment switcher + search
 *   - No separate titlebar; drag handled via finder-window-drag-zone zones
 */

import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';

export class PhotosWindow extends BaseWindow {
    private photosDragState = {
        isDragging: false,
        offsetX: 0,
        offsetY: 0,
        lastPointerX: null as number | null,
    };

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
        win.classList.add('photos-window-shell');
        // These CSS custom properties drive the photos-sidebar-panel border-radius
        // (window-radius minus sidebar-inset = panel corner radius)
        win.style.setProperty('--photos-window-radius', '1.125rem');
        win.style.setProperty('--photos-sidebar-inset', '0.5rem');
        win.style.setProperty('--photos-sidebar-width', '224px');
        win.style.borderRadius = 'var(--photos-window-radius)';

        // Remove default tab bar (Photos has no tabs)
        const tabBar = win.querySelector('.window-tab-bar');
        if (tabBar) tabBar.remove();

        // Remove default titlebar — traffic lights live inside the sidebar panel
        this.titlebarElement?.remove();
        this.titlebarElement = null;

        // Content area fills the full window; sidebar is absolute-positioned inside it
        if (this.contentElement) {
            this.contentElement.className = 'flex-1 overflow-hidden relative';
        }

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

        windowEl.addEventListener('mousedown', (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target?.closest('.finder-window-drag-zone') || isInteractiveTarget(target)) return;

            const rect = windowEl.getBoundingClientRect();
            this.photosDragState.isDragging = true;
            this.photosDragState.offsetX = e.clientX - rect.left;
            this.photosDragState.offsetY = e.clientY - rect.top;
            this.photosDragState.lastPointerX = e.clientX;
            this.bringToFront();
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e: MouseEvent) => {
            if (!this.photosDragState.isDragging || !this.element) return;
            const newX = e.clientX - this.photosDragState.offsetX;
            const minTop = window.getMenuBarBottom?.() || 0;
            const newY = Math.max(minTop, e.clientY - this.photosDragState.offsetY);
            this.position.x = newX;
            this.position.y = newY;
            this.element.style.left = `${newX}px`;
            this.element.style.top = `${newY}px`;
            this.photosDragState.lastPointerX = e.clientX;

            const candidate = this.getSnapCandidate(
                this.element,
                this.photosDragState.lastPointerX
            );
            if (candidate) window.showSnapPreview?.(candidate);
            else window.hideSnapPreview?.();
        });

        document.addEventListener('mouseup', () => {
            if (!this.photosDragState.isDragging) return;
            this.photosDragState.isDragging = false;

            const target = this.element;
            if (target) {
                const candidate = this.getSnapCandidate(target, this.photosDragState.lastPointerX);
                if (candidate) this.snapTo(candidate);
                window.hideSnapPreview?.();
            }

            this.photosDragState.lastPointerX = null;
            (this as unknown as { _saveState?: () => void })._saveState?.();
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
        if (window.WindowRegistry) {
            const existing = (window.WindowRegistry.getWindowsByType?.('photos') ??
                []) as PhotosWindow[];
            if (existing.length > 0) {
                let top = existing[0]!;
                for (const w of existing) {
                    if (w.zIndex > top.zIndex) top = w;
                }
                top.bringToFront();
                return top;
            }
        }
        return PhotosWindow.create(config);
    }

    static create(config?: Partial<WindowConfig>): PhotosWindow {
        const w = new PhotosWindow(config);
        w.show();
        if (window.WindowRegistry) window.WindowRegistry.registerWindow?.(w);
        return w;
    }
}

// Expose on window for global access
window.PhotosWindow = PhotosWindow;
