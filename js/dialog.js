/* EXPORTS STUB FOR BROWSER */
var exports = {};
"use strict";
/*
 * src/ts/dialog.ts
 * Typed port of js/dialog.js
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dialog = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
class Dialog {
    constructor(modalId) {
        const el = document.getElementById(modalId);
        if (!el)
            throw new Error(`No dialog with id ${modalId}`);
        this.modal = el;
        // Legacy helper may provide an element wrapper
        const helper = window.StorageSystem?.getDialogWindowElement;
        this.windowEl = helper
            ? helper(this.modal)
            : this.modal.querySelector('.autopointer') || this.modal;
        this.lastDragPointerX = null;
        this.init();
    }
    init() {
        this.makeDraggable();
        this.makeResizable();
        const closeButton = this.modal.querySelector('.draggable-header button[id^="close-"]');
        if (closeButton) {
            closeButton.style.cursor = 'pointer';
            closeButton.dataset.dialogAction = 'close';
            if (!closeButton.dataset.dialogBoundClose) {
                closeButton.dataset.dialogBoundClose = 'true';
                closeButton.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.close();
                });
            }
        }
        const minimizeEl = this.modal.querySelector('.draggable-header .bg-yellow-500.rounded-full');
        const maximizeEl = this.modal.querySelector('.draggable-header .bg-green-500.rounded-full');
        if (minimizeEl) {
            minimizeEl.style.cursor = 'pointer';
            minimizeEl.title = minimizeEl.title || 'Minimieren';
            minimizeEl.dataset.dialogAction = 'minimize';
            minimizeEl.addEventListener('click', e => {
                e.stopPropagation();
                this.minimize();
            });
        }
        if (maximizeEl) {
            maximizeEl.style.cursor = 'pointer';
            maximizeEl.title = maximizeEl.title || 'Maximieren';
            maximizeEl.dataset.dialogAction = 'maximize';
            maximizeEl.addEventListener('click', e => {
                e.stopPropagation();
                this.toggleMaximize();
            });
        }
    }
    open() {
        if (!this.modal) {
            console.error('Cannot open dialog: modal element is undefined');
            return;
        }
        // preserve original behavior
        window.hideMenuDropdowns?.();
        this.modal.classList.remove('hidden');
        if (this.modal.dataset)
            delete this.modal.dataset.minimized;
        this.bringToFront();
        this.enforceMenuBarBoundary();
        window.saveOpenModals?.();
        window.updateDockIndicators?.();
        window.updateProgramLabelByTopModal?.();
    }
    close() {
        if (this.modal.classList.contains('hidden'))
            return;
        this.modal.classList.add('hidden');
        // Remove from z-index manager stack
        const zIndexManager = window.__zIndexManager;
        if (zIndexManager && typeof zIndexManager.removeWindow === 'function') {
            zIndexManager.removeWindow(this.modal.id);
        }
        window.saveOpenModals?.();
        window.updateDockIndicators?.();
        window.updateProgramLabelByTopModal?.();
    }
    minimize() {
        if (this.modal.dataset)
            this.modal.dataset.minimized = 'true';
        if (!this.modal.classList.contains('hidden'))
            this.modal.classList.add('hidden');
        window.saveOpenModals?.();
        window.updateDockIndicators?.();
        window.updateProgramLabelByTopModal?.();
    }
    toggleMaximize() {
        const target = this.windowEl || this.modal;
        if (!target)
            return;
        this.unsnap({ silent: true });
        const ds = this.modal.dataset || {};
        const isMax = ds.maximized === 'true';
        if (isMax) {
            if (ds.prevLeft !== undefined)
                target.style.left = ds.prevLeft;
            if (ds.prevTop !== undefined)
                target.style.top = ds.prevTop;
            if (ds.prevWidth !== undefined)
                target.style.width = ds.prevWidth;
            if (ds.prevHeight !== undefined)
                target.style.height = ds.prevHeight;
            if (ds.prevPosition !== undefined)
                target.style.position = ds.prevPosition;
            delete ds.maximized;
            delete ds.prevLeft;
            delete ds.prevTop;
            delete ds.prevWidth;
            delete ds.prevHeight;
            delete ds.prevPosition;
            this.enforceMenuBarBoundary();
            window.saveWindowPositions?.();
            return;
        }
        const computed = window.getComputedStyle(target);
        this.modal.dataset.prevLeft = target.style.left || computed.left || '';
        this.modal.dataset.prevTop = target.style.top || computed.top || '';
        this.modal.dataset.prevWidth = target.style.width || computed.width || '';
        this.modal.dataset.prevHeight = target.style.height || computed.height || '';
        this.modal.dataset.prevPosition = target.style.position || computed.position || '';
        const minTop = Math.round(window.getMenuBarBottom?.() || 0);
        target.style.position = 'fixed';
        target.style.left = '0px';
        target.style.top = `${minTop}px`;
        target.style.width = '100vw';
        target.style.height = `calc(100vh - ${minTop}px)`;
        try {
            const __dockReserve = window.getDockReservedBottom?.() || 0;
            const __maxHeight = Math.max(0, (window.innerHeight || 0) - minTop - __dockReserve);
            target.style.height = `${__maxHeight}px`;
        }
        catch { }
        this.modal.dataset.maximized = 'true';
        this.bringToFront();
        window.saveWindowPositions?.();
    }
    snapTo(side, options = {}) {
        const target = this.windowEl || this.modal;
        if (!target)
            return null;
        if (side !== 'left' && side !== 'right')
            return null;
        const { silent = false } = options;
        const ds = this.modal.dataset || {};
        const alreadySnapped = ds.snapped;
        if (!alreadySnapped) {
            const computed = window.getComputedStyle(target);
            ds.prevSnapLeft = target.style.left || computed.left || '';
            ds.prevSnapTop = target.style.top || computed.top || '';
            ds.prevSnapWidth = target.style.width || computed.width || '';
            ds.prevSnapHeight = target.style.height || computed.height || '';
            ds.prevSnapPosition = target.style.position || computed.position || '';
            ds.prevSnapRight = target.style.right || computed.right || '';
            ds.prevSnapBottom = target.style.bottom || computed.bottom || '';
        }
        const metrics = window.computeSnapMetrics?.(side);
        if (!metrics) {
            this.unsnap({ silent: true });
            return null;
        }
        target.style.position = 'fixed';
        target.style.top = `${metrics.top}px`;
        target.style.left = `${metrics.left}px`;
        target.style.width = `${metrics.width}px`;
        target.style.height = `${metrics.height}px`;
        target.style.right = '';
        target.style.bottom = '';
        this.modal.dataset.snapped = side;
        this.bringToFront();
        window.hideSnapPreview?.();
        if (!silent)
            window.saveWindowPositions?.();
        return side;
    }
    unsnap(options = {}) {
        const target = this.windowEl || this.modal;
        if (!target)
            return false;
        const { silent = false } = options;
        const ds = this.modal.dataset || {};
        if (!ds.snapped)
            return false;
        const restore = (key, prop) => {
            if (Object.prototype.hasOwnProperty.call(ds, key)) {
                const value = ds[key];
                if (value === '')
                    target.style[prop] = '';
                else
                    target.style[prop] = value;
                delete ds[key];
            }
            else {
                target.style[prop] = '';
            }
        };
        restore('prevSnapLeft', 'left');
        restore('prevSnapTop', 'top');
        restore('prevSnapWidth', 'width');
        restore('prevSnapHeight', 'height');
        restore('prevSnapPosition', 'position');
        restore('prevSnapRight', 'right');
        restore('prevSnapBottom', 'bottom');
        delete ds.snapped;
        window.hideSnapPreview?.();
        this.enforceMenuBarBoundary();
        if (!silent)
            window.saveWindowPositions?.();
        return true;
    }
    applySnapAfterDrag(target, pointerX) {
        if (!target) {
            window.hideSnapPreview?.();
            return null;
        }
        const candidate = this.getSnapCandidate(target, pointerX);
        if (candidate) {
            this.snapTo(candidate, { silent: true });
            window.hideSnapPreview?.();
            return candidate;
        }
        this.unsnap({ silent: true });
        window.hideSnapPreview?.();
        return null;
    }
    getSnapCandidate(target, pointerX) {
        if (!target)
            return null;
        const viewportWidth = Math.max(window.innerWidth || 0, 0);
        if (viewportWidth <= 0)
            return null;
        const threshold = Math.max(3, Math.min(14, viewportWidth * 0.0035));
        const rect = target.getBoundingClientRect();
        const pointerDistLeft = typeof pointerX === 'number' ? Math.max(0, pointerX) : Math.abs(rect.left);
        if (Math.abs(rect.left) <= threshold || pointerDistLeft <= threshold)
            return 'left';
        const distRight = viewportWidth - rect.right;
        const pointerDistRight = typeof pointerX === 'number'
            ? Math.max(0, viewportWidth - pointerX)
            : Math.abs(distRight);
        if (Math.abs(distRight) <= threshold || pointerDistRight <= threshold)
            return 'right';
        return null;
    }
    bringToFront() {
        // Use a robust z-index management system that maintains a sorted window stack
        // and reassigns z-indexes to prevent reaching the maximum
        const zIndexManager = window.__zIndexManager || this.initZIndexManager();
        zIndexManager.bringToFront(this.modal.id, this.modal, this.windowEl);
    }
    initZIndexManager() {
        // Initialize global z-index manager if not exists
        if (window.__zIndexManager) {
            return window.__zIndexManager;
        }
        const BASE_Z_INDEX = 1000;
        const MAX_WINDOW_Z_INDEX = 2147483500; // Below Dock (2147483550) and Launchpad (2147483600)
        const windowStack = []; // Ordered list of window IDs (bottom to top)
        window.__zIndexManager = {
            bringToFront(windowId, _modal, _windowEl) {
                // Remove from current position if exists
                const currentIndex = windowStack.indexOf(windowId);
                if (currentIndex !== -1) {
                    windowStack.splice(currentIndex, 1);
                }
                // Add to top of stack
                windowStack.push(windowId);
                // Reassign z-indexes to all windows in stack
                // This prevents z-index from growing indefinitely
                windowStack.forEach((id, index) => {
                    const zIndex = BASE_Z_INDEX + index;
                    const element = document.getElementById(id);
                    if (element) {
                        // Clamp to maximum to ensure critical UI elements stay on top
                        const clampedZIndex = Math.min(zIndex, MAX_WINDOW_Z_INDEX);
                        element.style.zIndex = clampedZIndex.toString();
                        // Also update windowEl if it's a separate element
                        const win = element.querySelector('.window-container');
                        if (win) {
                            win.style.zIndex = clampedZIndex.toString();
                        }
                    }
                });
                // Update legacy topZIndex for compatibility
                window.topZIndex = Math.min(BASE_Z_INDEX + windowStack.length, MAX_WINDOW_Z_INDEX);
            },
            removeWindow(windowId) {
                const index = windowStack.indexOf(windowId);
                if (index !== -1) {
                    windowStack.splice(index, 1);
                }
            },
            getWindowStack() {
                return [...windowStack];
            },
            reset() {
                windowStack.length = 0;
                window.topZIndex = BASE_Z_INDEX;
            }
        };
        return window.__zIndexManager;
    }
    refocus() {
        this.bringToFront();
        window.hideMenuDropdowns?.();
        window.saveOpenModals?.();
        window.updateProgramLabelByTopModal?.();
    }
    makeDraggable() {
        const header = this.modal.querySelector('.draggable-header');
        const target = this.windowEl || this.modal;
        if (!header || !target)
            return;
        header.style.cursor = 'move';
        let offsetX = 0, offsetY = 0;
        header.addEventListener('mousedown', (e) => {
            this.refocus();
            if (e.target.closest &&
                e.target.closest('button[id^="close-"]'))
                return;
            if (e.target.closest &&
                e.target.closest('[data-dialog-action]'))
                return;
            if (this.modal.dataset && this.modal.dataset.maximized === 'true')
                return;
            const pointerX = e.clientX;
            const pointerY = e.clientY;
            const initialSnapSide = this.modal.dataset ? this.modal.dataset.snapped : null;
            let rect = target.getBoundingClientRect();
            let localOffsetX = pointerX - rect.left;
            let localOffsetY = pointerY - rect.top;
            if (initialSnapSide) {
                const preservedOffsetX = localOffsetX;
                const preservedOffsetY = localOffsetY;
                this.unsnap({ silent: true });
                const minTopAfterUnsnap = window.getMenuBarBottom?.() || 0;
                target.style.position = 'fixed';
                target.style.left = `${pointerX - preservedOffsetX}px`;
                target.style.top = `${Math.max(minTopAfterUnsnap, pointerY - preservedOffsetY)}px`;
                rect = target.getBoundingClientRect();
                localOffsetX = pointerX - rect.left;
                localOffsetY = pointerY - rect.top;
            }
            const computedPosition = window.getComputedStyle(target).position;
            if (computedPosition === 'static' || computedPosition === 'relative') {
                target.style.position = 'fixed';
            }
            else if (!target.style.position) {
                target.style.position = computedPosition;
            }
            const minTop = window.getMenuBarBottom?.() || 0;
            target.style.left = `${pointerX - localOffsetX}px`;
            target.style.top = `${Math.max(minTop, pointerY - localOffsetY)}px`;
            window.clampWindowToMenuBar?.(target);
            const adjustedRect = target.getBoundingClientRect();
            offsetX = pointerX - adjustedRect.left;
            offsetY = pointerY - adjustedRect.top;
            this.lastDragPointerX = pointerX;
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.zIndex = '9999';
            overlay.style.cursor = 'move';
            overlay.style.backgroundColor = 'transparent';
            document.body.appendChild(overlay);
            let isDragging = true;
            let moved = false;
            const cleanup = (shouldSave = true) => {
                if (!isDragging)
                    return;
                isDragging = false;
                overlay.remove();
                overlay.removeEventListener('mousemove', mouseMoveHandler);
                overlay.removeEventListener('mouseup', mouseUpHandler);
                window.removeEventListener('mouseup', mouseUpHandler);
                window.removeEventListener('blur', blurHandler);
                window.removeEventListener('mousemove', mouseMoveHandler);
                window.hideSnapPreview?.();
                if (shouldSave) {
                    if (moved) {
                        this.applySnapAfterDrag(target, this.lastDragPointerX);
                    }
                    else if (initialSnapSide) {
                        this.snapTo(initialSnapSide, { silent: true });
                    }
                    window.saveWindowPositions?.();
                }
                this.lastDragPointerX = null;
            };
            const mouseMoveHandler = (e2) => {
                moved = true;
                window.requestAnimationFrame(() => {
                    const newLeft = e2.clientX - offsetX;
                    const newTop = e2.clientY - offsetY;
                    const minTop = window.getMenuBarBottom?.() || 0;
                    target.style.left = newLeft + 'px';
                    target.style.top = Math.max(minTop, newTop) + 'px';
                    this.lastDragPointerX = e2.clientX;
                    const candidate = this.getSnapCandidate(target, this.lastDragPointerX);
                    if (candidate)
                        window.showSnapPreview?.(candidate);
                    else
                        window.hideSnapPreview?.();
                });
            };
            const mouseUpHandler = () => cleanup(true);
            const blurHandler = () => cleanup(true);
            overlay.addEventListener('mousemove', mouseMoveHandler);
            overlay.addEventListener('mouseup', mouseUpHandler);
            window.addEventListener('mousemove', mouseMoveHandler);
            window.addEventListener('mouseup', mouseUpHandler);
            window.addEventListener('blur', blurHandler);
            e.preventDefault();
        });
    }
    makeResizable() {
        if (this.modal.dataset.noResize === 'true')
            return;
        const target = this.windowEl || this.modal;
        if (!target)
            return;
        const existingHandles = target.querySelectorAll('.resizer');
        existingHandles.forEach(handle => handle.remove());
        const computedPosition = window.getComputedStyle(target).position;
        if (!computedPosition || computedPosition === 'static')
            target.style.position = 'relative';
        const ensureFixedPosition = () => {
            const computed = window.getComputedStyle(target);
            const rect = target.getBoundingClientRect();
            if (computed.position === 'static' || computed.position === 'relative') {
                target.style.position = 'fixed';
                target.style.left = rect.left + 'px';
                target.style.top = rect.top + 'px';
            }
            else {
                if (!target.style.left)
                    target.style.left = rect.left + 'px';
                if (!target.style.top)
                    target.style.top = rect.top + 'px';
            }
        };
        const createHandle = (handle) => {
            const resizer = document.createElement('div');
            resizer.classList.add('resizer', `resizer-${handle.name}`);
            Object.assign(resizer.style, {
                position: 'absolute',
                zIndex: '9999',
                backgroundColor: 'transparent',
                pointerEvents: 'auto',
                touchAction: 'none',
                cursor: handle.cursor,
                ...(handle.style || {}),
            });
            target.appendChild(resizer);
            const startResize = (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.refocus();
                ensureFixedPosition();
                const startX = event.clientX;
                const startY = event.clientY;
                const rect = target.getBoundingClientRect();
                const computed = window.getComputedStyle(target);
                const minWidth = parseFloat(computed.minWidth) || 240;
                const minHeight = parseFloat(computed.minHeight) || 160;
                let startLeft = parseFloat(computed.left);
                let startTop = parseFloat(computed.top);
                if (!Number.isFinite(startLeft))
                    startLeft = rect.left;
                if (!Number.isFinite(startTop))
                    startTop = rect.top;
                const startWidth = rect.width;
                const startHeight = rect.height;
                const overlay = document.createElement('div');
                Object.assign(overlay.style, {
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    zIndex: '9999',
                    cursor: handle.cursor,
                    backgroundColor: 'transparent',
                    touchAction: 'none',
                });
                document.body.appendChild(overlay);
                let resizing = true;
                const applySize = (clientX, clientY) => {
                    if (!resizing)
                        return;
                    window.requestAnimationFrame(() => {
                        const dx = clientX - startX;
                        const dy = clientY - startY;
                        let newWidth = startWidth;
                        let newHeight = startHeight;
                        let newLeft = startLeft;
                        let newTop = startTop;
                        if (handle.directions.includes('e'))
                            newWidth = startWidth + dx;
                        if (handle.directions.includes('s'))
                            newHeight = startHeight + dy;
                        if (handle.directions.includes('w')) {
                            newWidth = startWidth - dx;
                            newLeft = startLeft + dx;
                        }
                        if (handle.directions.includes('n')) {
                            newHeight = startHeight - dy;
                            newTop = startTop + dy;
                        }
                        if (newWidth < minWidth) {
                            const deficit = minWidth - newWidth;
                            if (handle.directions.includes('w'))
                                newLeft -= deficit;
                            newWidth = minWidth;
                        }
                        if (newHeight < minHeight) {
                            const deficit = minHeight - newHeight;
                            if (handle.directions.includes('n'))
                                newTop -= deficit;
                            newHeight = minHeight;
                        }
                        const minTop = window.getMenuBarBottom?.() || 0;
                        if (handle.directions.includes('n') && newTop < minTop) {
                            const overshoot = minTop - newTop;
                            newTop = minTop;
                            newHeight = Math.max(minHeight, newHeight - overshoot);
                        }
                        if (handle.directions.includes('w') || handle.directions.includes('e'))
                            target.style.width = Math.max(minWidth, newWidth) + 'px';
                        if (handle.directions.includes('s') || handle.directions.includes('n'))
                            target.style.height = Math.max(minHeight, newHeight) + 'px';
                        if (handle.directions.includes('w'))
                            target.style.left = newLeft + 'px';
                        if (handle.directions.includes('n'))
                            target.style.top = newTop + 'px';
                    });
                };
                const stopResize = () => {
                    if (!resizing)
                        return;
                    resizing = false;
                    overlay.remove();
                    overlay.removeEventListener('mousemove', overlayMouseMove);
                    overlay.removeEventListener('mouseup', overlayMouseUp);
                    window.removeEventListener('mousemove', windowMouseMove);
                    window.removeEventListener('mouseup', windowMouseUp);
                    window.removeEventListener('blur', onBlur);
                    window.clampWindowToMenuBar?.(target);
                    window.saveWindowPositions?.();
                };
                const overlayMouseMove = (moveEvent) => applySize(moveEvent.clientX, moveEvent.clientY);
                const windowMouseMove = (moveEvent) => applySize(moveEvent.clientX, moveEvent.clientY);
                const overlayMouseUp = () => stopResize();
                const windowMouseUp = () => stopResize();
                const onBlur = () => stopResize();
                overlay.addEventListener('mousemove', overlayMouseMove);
                overlay.addEventListener('mouseup', overlayMouseUp);
                window.addEventListener('mousemove', windowMouseMove);
                window.addEventListener('mouseup', windowMouseUp);
                window.addEventListener('blur', onBlur);
            };
            resizer.addEventListener('mousedown', startResize);
        };
        target.style.overflow = 'visible';
        const handles = [
            {
                name: 'top',
                cursor: 'n-resize',
                directions: ['n'],
                style: { top: '-4px', left: '12px', right: '12px', height: '8px' },
            },
            {
                name: 'bottom',
                cursor: 's-resize',
                directions: ['s'],
                style: { bottom: '-4px', left: '12px', right: '12px', height: '8px' },
            },
            {
                name: 'left',
                cursor: 'w-resize',
                directions: ['w'],
                style: { left: '-4px', top: '12px', bottom: '12px', width: '8px' },
            },
            {
                name: 'right',
                cursor: 'e-resize',
                directions: ['e'],
                style: { right: '-4px', top: '12px', bottom: '12px', width: '8px' },
            },
            {
                name: 'top-left',
                cursor: 'nw-resize',
                directions: ['n', 'w'],
                style: { top: '-6px', left: '-6px', width: '14px', height: '14px' },
            },
            {
                name: 'top-right',
                cursor: 'ne-resize',
                directions: ['n', 'e'],
                style: { top: '-6px', right: '-6px', width: '14px', height: '14px' },
            },
            {
                name: 'bottom-left',
                cursor: 'sw-resize',
                directions: ['s', 'w'],
                style: { bottom: '-6px', left: '-6px', width: '14px', height: '14px' },
            },
            {
                name: 'bottom-right',
                cursor: 'se-resize',
                directions: ['s', 'e'],
                style: { bottom: '-6px', right: '-6px', width: '14px', height: '14px' },
            },
        ];
        handles.forEach(createHandle);
    }
    enforceMenuBarBoundary() {
        window.clampWindowToMenuBar?.(this.windowEl || this.modal);
    }
    loadIframe(url) {
        let contentArea = this.modal.querySelector('.dialog-content');
        if (!contentArea) {
            contentArea = document.createElement('div');
            contentArea.classList.add('dialog-content');
            contentArea.style.width = '100%';
            contentArea.style.height = '100%';
            this.modal.appendChild(contentArea);
        }
        contentArea.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.setAttribute('allow', 'fullscreen');
        contentArea.appendChild(iframe);
        iframe.addEventListener('load', () => {
            try {
                const cw = iframe.contentWindow;
                if (cw && cw.document) {
                    const handler = () => requestAnimationFrame(() => {
                        this.refocus();
                    });
                    ['mousedown', 'click', 'touchstart'].forEach(evt => {
                        cw.document.addEventListener(evt, handler);
                    });
                }
                else if (cw) {
                    ['mousedown', 'click', 'touchstart'].forEach(evt => {
                        cw.addEventListener(evt, () => requestAnimationFrame(() => {
                            this.refocus();
                        }));
                    });
                }
            }
            catch (err) {
                console.error('Could not attach mousedown event in iframe:', err);
            }
        });
    }
    saveState() {
        return {
            left: this.modal.style.left,
            top: this.modal.style.top,
            width: this.modal.style.width,
            height: this.modal.style.height,
            zIndex: this.modal.style.zIndex,
        };
    }
    restoreState(state) {
        if (!state)
            return;
        if (state.left)
            this.modal.style.left = state.left;
        if (state.top)
            this.modal.style.top = state.top;
        if (state.width)
            this.modal.style.width = state.width;
        if (state.height)
            this.modal.style.height = state.height;
        if (state.zIndex)
            this.modal.style.zIndex = state.zIndex;
    }
}
exports.Dialog = Dialog;
// Note: Type declaration is in types/index.d.ts
window.Dialog = Dialog;
exports.default = Dialog;
//# sourceMappingURL=dialog.js.map