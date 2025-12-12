(function () {
    'use strict';

    // ============================================================================
    // Snap & Window Utilities
    // ============================================================================

    /**
     * Get the bottom position of the menu bar (header element).
     * @returns The bottom edge of the menu bar in pixels.
     */
    function getMenuBarBottom(): number {
        const header = document.querySelector('body > header');
        if (!header) {
            return 0;
        }
        const rect = header.getBoundingClientRect();
        return rect.bottom;
    }

    /**
     * Clamp a window element so it doesn't overlap the menu bar.
     * @param target - The element to clamp (e.g., a modal or dialog window).
     */
    function clampWindowToMenuBar(target: HTMLElement | null): void {
        if (!target) return;
        const minTop = getMenuBarBottom();
        if (minTop <= 0) return;
        const computed = window.getComputedStyle(target);
        if (computed.position === 'static') {
            target.style.position = 'fixed';
        }
        const currentTop = parseFloat(target.style.top);
        const numericTop = Number.isNaN(currentTop)
            ? parseFloat(computed.top)
            : currentTop;
        if (!Number.isNaN(numericTop) && numericTop < minTop) {
            target.style.top = `${minTop}px`;
        } else if (Number.isNaN(numericTop)) {
            const rect = target.getBoundingClientRect();
            if (rect.top < minTop) {
                if (!target.style.left) {
                    target.style.left = `${rect.left}px`;
                }
                target.style.top = `${minTop}px`;
            }
        }
    }

    /**
     * Compute snap metrics for window snapping (left or right side).
     * @param side - The side to snap to ('left' or 'right').
     * @returns Snap metrics (left, top, width, height) or null if invalid.
     */
    function computeSnapMetrics(
        side: 'left' | 'right'
    ): { left: number; top: number; width: number; height: number } | null {
        if (side !== 'left' && side !== 'right') return null;
        const minTop = Math.round(getMenuBarBottom());
        const viewportWidth = Math.max(window.innerWidth || 0, 0);
        const viewportHeight = Math.max(window.innerHeight || 0, 0);
        if (viewportWidth <= 0 || viewportHeight <= 0) return null;
        const minWidth = Math.min(320, viewportWidth);
        const halfWidth = Math.round(viewportWidth / 2);
        const width = Math.max(Math.min(halfWidth, viewportWidth), minWidth);
        const left = side === 'left' ? 0 : Math.max(0, viewportWidth - width);
        const top = minTop;

        // Fetch dock reserved bottom height
        const getDockReservedBottom =
            (window as unknown as { getDockReservedBottom?: () => number }).getDockReservedBottom;
        const dockReserve = typeof getDockReservedBottom === 'function' ? getDockReservedBottom() : 0;

        const height = Math.max(0, viewportHeight - top - dockReserve);
        return { left, top, width, height };
    }

    let snapPreviewElement: HTMLElement | null = null;

    /**
     * Ensure the snap preview overlay element exists in the DOM.
     * @returns The snap preview element or null if DOM is unavailable.
     */
    function ensureSnapPreviewElement(): HTMLElement | null {
        if (snapPreviewElement && snapPreviewElement.isConnected) {
            return snapPreviewElement;
        }
        if (!document || !document.body) {
            return null;
        }
        snapPreviewElement = document.getElementById('snap-preview-overlay');
        if (!snapPreviewElement) {
            snapPreviewElement = document.createElement('div');
            snapPreviewElement.id = 'snap-preview-overlay';
            snapPreviewElement.setAttribute('aria-hidden', 'true');
            document.body.appendChild(snapPreviewElement);
        }
        return snapPreviewElement;
    }

    /**
     * Show a snap preview overlay on the specified side.
     * @param side - The side to preview snapping ('left' or 'right').
     */
    function showSnapPreview(side: 'left' | 'right'): void {
        const metrics = computeSnapMetrics(side);
        if (!metrics) {
            hideSnapPreview();
            return;
        }
        const el = ensureSnapPreviewElement();
        if (!el) return;
        el.style.left = `${metrics.left}px`;
        el.style.top = `${metrics.top}px`;
        el.style.width = `${metrics.width}px`;
        el.style.height = `${metrics.height}px`;
        el.setAttribute('data-side', side);
        el.classList.add('snap-preview-visible');
    }

    /**
     * Hide the snap preview overlay.
     */
    function hideSnapPreview(): void {
        if (!snapPreviewElement || !snapPreviewElement.isConnected) {
            return;
        }
        snapPreviewElement.classList.remove('snap-preview-visible');
        snapPreviewElement.removeAttribute('data-side');
    }

    // ============================================================================
    // Expose globally (guarded to avoid redeclare)
    // ============================================================================

    type GlobalWindow = typeof window & {
        getMenuBarBottom?: typeof getMenuBarBottom;
        clampWindowToMenuBar?: typeof clampWindowToMenuBar;
        computeSnapMetrics?: typeof computeSnapMetrics;
        showSnapPreview?: typeof showSnapPreview;
        hideSnapPreview?: typeof hideSnapPreview;
    };

    const g = window as GlobalWindow;

    if (typeof g.getMenuBarBottom !== 'function') {
        g.getMenuBarBottom = getMenuBarBottom;
    }
    if (typeof g.clampWindowToMenuBar !== 'function') {
        g.clampWindowToMenuBar = clampWindowToMenuBar;
    }
    if (typeof g.computeSnapMetrics !== 'function') {
        g.computeSnapMetrics = computeSnapMetrics;
    }
    if (typeof g.showSnapPreview !== 'function') {
        g.showSnapPreview = showSnapPreview;
    }
    if (typeof g.hideSnapPreview !== 'function') {
        g.hideSnapPreview = hideSnapPreview;
    }
})();
