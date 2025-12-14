'use strict';
(function () {
    'use strict';
    // ============================================================================
    // Snap & Window Utilities
    // ============================================================================
    /**
     * Get the bottom position of the menu bar (header element).
     * @returns The bottom edge of the menu bar in pixels.
     */
    function getMenuBarBottom() {
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
    function clampWindowToMenuBar(target) {
        if (!target) return;
        const minTop = getMenuBarBottom();
        if (minTop <= 0) return;
        const computed = window.getComputedStyle(target);
        if (computed.position === 'static') {
            target.style.position = 'fixed';
        }
        const currentTop = parseFloat(target.style.top);
        const numericTop = Number.isNaN(currentTop) ? parseFloat(computed.top) : currentTop;
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
    function computeSnapMetrics(side) {
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
        const getDockReservedBottom = window.getDockReservedBottom;
        const dockReserve =
            typeof getDockReservedBottom === 'function' ? getDockReservedBottom() : 0;
        const height = Math.max(0, viewportHeight - top - dockReserve);
        return { left, top, width, height };
    }
    let snapPreviewElement = null;
    /**
     * Ensure the snap preview overlay element exists in the DOM.
     * @returns The snap preview element or null if DOM is unavailable.
     */
    function ensureSnapPreviewElement() {
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
    function showSnapPreview(side) {
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
    function hideSnapPreview() {
        if (!snapPreviewElement || !snapPreviewElement.isConnected) {
            return;
        }
        snapPreviewElement.classList.remove('snap-preview-visible');
        snapPreviewElement.removeAttribute('data-side');
    }
    const g = window;
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
//# sourceMappingURL=snap-utils.js.map
