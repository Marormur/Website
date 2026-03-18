/*
 * src/ts/dialog.ts
 * Typed port of js/dialog.js
 */

import { getZIndexManager } from '../windows/z-index-manager.js';
import logger from '../core/logger.js';
import {
    detectClientCoordinateScale,
    getLogicalViewportWidth,
    getLogicalViewportHeight,
    resolveElementLogicalPx,
    toLogicalClientPx,
    toLogicalPx,
    toRenderedClientPx,
} from '../utils/viewport.js';

export class Dialog {
    modal: HTMLElement;
    modalId: string;
    windowEl: HTMLElement | null;
    lastDragPointerX: number | null;

    constructor(modalId: string) {
        this.modalId = modalId;
        const el = document.getElementById(modalId);
        if (!el) {
            logger.error('UI', `Dialog: No element found with id "${modalId}"`);
            throw new Error(`No dialog with id ${modalId}`);
        }
        this.modal = el as HTMLElement;
        // Legacy helper may provide an element wrapper
        const helper = window.StorageSystem?.getDialogWindowElement;
        this.windowEl = helper
            ? helper(this.modal)
            : (this.modal.querySelector('.autopointer') as HTMLElement) || this.modal;
        this.lastDragPointerX = null;
        this.init();
    }

    init() {
        this.makeDraggable();
        this.makeResizable();
        const closeButton = this.modal.querySelector(
            '.draggable-header button[id^="close-"]'
        ) as HTMLElement | null;
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

        const minimizeEl = this.modal.querySelector(
            '.draggable-header .traffic-light-control--minimize, .draggable-header .bg-yellow-500.rounded-full'
        ) as HTMLElement | null;
        const maximizeEl = this.modal.querySelector(
            '.draggable-header .traffic-light-control--maximize, .draggable-header .bg-green-500.rounded-full'
        ) as HTMLElement | null;
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
            logger.error(
                'UI',
                `Cannot open dialog: modal element is undefined (id: ${this.modalId})`
            );
            return;
        }

        // Ensure instance creation for windows that need it
        this._ensureInstanceIfNeeded();

        // preserve original behavior
        window.hideMenuDropdowns?.();

        // Use DOMUtils if available, fallback to classList
        const domUtils = window.DOMUtils;
        if (domUtils && typeof domUtils.show === 'function') {
            domUtils.show(this.modal);
        } else {
            this.modal.classList.remove('hidden');
        }

        if (this.modal && this.modal.dataset) delete this.modal.dataset.minimized;
        this.bringToFront();
        this.enforceMenuBarBoundary();
        window.saveOpenModals?.();
        window.updateDockIndicators?.();
        window.updateProgramLabelByTopModal?.();
    }

    private _ensureInstanceIfNeeded() {
        // Check if this window has the ensureInstanceOnOpen flag
        const config = window.WindowManager?.getConfig?.(this.modalId) as
            | Record<string, unknown>
            | undefined;
        if (
            !config ||
            !(config.metadata as Record<string, unknown> | undefined)?.ensureInstanceOnOpen
        )
            return;
    }

    close() {
        if (this.modal.classList.contains('hidden')) return;

        // Use DOMUtils if available, fallback to classList
        const domUtils = window.DOMUtils;
        if (domUtils && typeof domUtils.hide === 'function') {
            domUtils.hide(this.modal);
        } else {
            this.modal.classList.add('hidden');
        }

        // Remove from z-index manager stack
        const zIndexManager = getZIndexManager();
        zIndexManager.removeWindow(this.modal.id);

        window.saveOpenModals?.();
        window.updateDockIndicators?.();
        window.updateProgramLabelByTopModal?.();
    }

    minimize() {
        if (this.modal.dataset) this.modal.dataset.minimized = 'true';

        // Use DOMUtils if available, fallback to classList
        const domUtils = window.DOMUtils;
        if (domUtils && typeof domUtils.hide === 'function') {
            if (!this.modal.classList.contains('hidden')) {
                domUtils.hide(this.modal);
            }
        } else {
            if (!this.modal.classList.contains('hidden')) {
                this.modal.classList.add('hidden');
            }
        }

        window.saveOpenModals?.();
        window.updateDockIndicators?.();
        window.updateProgramLabelByTopModal?.();
    }

    center() {
        const target = this.windowEl || this.modal;
        if (!target) return;

        this.unsnap({ silent: true });
        if (this.modal.dataset?.maximized === 'true') {
            this.toggleMaximize();
        }

        const rect = target.getBoundingClientRect();
        const width = Math.round(rect.width || target.offsetWidth || 0);
        const height = Math.round(rect.height || target.offsetHeight || 0);
        const minTop = Math.round(window.getMenuBarBottom?.() || 0);
        const dockReserve = Math.round(window.getDockReservedBottom?.() || 0);
        const viewportWidth = Math.max(getLogicalViewportWidth(), width);
        const availableHeight = Math.max(height, getLogicalViewportHeight() - minTop - dockReserve);

        target.style.position = 'fixed';
        target.style.maxWidth = '';
        target.style.maxHeight = '';
        target.style.right = '';
        target.style.bottom = '';
        target.style.left = `${Math.max(0, Math.round((viewportWidth - width) / 2))}px`;
        target.style.top = `${minTop + Math.max(0, Math.round((availableHeight - height) / 2))}px`;

        window.clampWindowToMenuBar?.(target);
        this.bringToFront();
        window.saveWindowPositions?.();
    }

    toggleMaximize() {
        const target = this.windowEl || this.modal;
        if (!target) return;
        this.unsnap({ silent: true });
        const ds = this.modal.dataset || {};
        const isMax = ds.maximized === 'true';
        if (isMax) {
            if (ds.prevLeft !== undefined) target.style.left = ds.prevLeft;
            if (ds.prevTop !== undefined) target.style.top = ds.prevTop;
            if (ds.prevWidth !== undefined) target.style.width = ds.prevWidth;
            if (ds.prevHeight !== undefined) target.style.height = ds.prevHeight;
            if (ds.prevPosition !== undefined) target.style.position = ds.prevPosition;
            target.style.maxWidth = '';
            target.style.maxHeight = '';
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
        target.style.maxWidth = 'none';
        target.style.maxHeight = 'none';
        target.style.position = 'fixed';
        target.style.left = '0px';
        target.style.top = `${minTop}px`;
        target.style.width = `${getLogicalViewportWidth()}px`;
        target.style.height = `${getLogicalViewportHeight() - minTop}px`;
        try {
            const __dockReserve = window.getDockReservedBottom?.() || 0;
            const __maxHeight = Math.max(0, getLogicalViewportHeight() - minTop - __dockReserve);
            target.style.height = `${__maxHeight}px`;
        } catch {}
        this.modal.dataset.maximized = 'true';
        this.bringToFront();
        window.saveWindowPositions?.();
    }

    snapTo(side: 'left' | 'right', options: { silent?: boolean } = {}) {
        const target = this.windowEl || this.modal;
        if (!target) return null;
        if (side !== 'left' && side !== 'right') return null;
        const { silent = false } = options;
        const ds = this.modal.dataset || {};
        const alreadySnapped = ds.snapped;
        if (!alreadySnapped) {
            const computed = window.getComputedStyle(target);
            ds.prevSnapLeft = target.style.left || computed.left || '';
            ds.prevSnapTop = target.style.top || computed.top || '';
            ds.prevSnapWidth = target.style.width || computed.width || '';
            ds.prevSnapHeight = target.style.height || computed.height || '';
            ds.prevSnapMaxWidth = target.style.maxWidth || '';
            ds.prevSnapMaxHeight = target.style.maxHeight || '';
            ds.prevSnapPosition = target.style.position || computed.position || '';
            ds.prevSnapRight = target.style.right || computed.right || '';
            ds.prevSnapBottom = target.style.bottom || computed.bottom || '';
        }
        const metrics = window.computeSnapMetrics?.(side);
        if (!metrics) {
            this.unsnap({ silent: true });
            return null;
        }
        target.style.maxWidth = 'none';
        target.style.maxHeight = 'none';
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
        if (!silent) window.saveWindowPositions?.();
        return side;
    }

    unsnap(options: { silent?: boolean } = {}) {
        const target = this.windowEl || this.modal;
        if (!target) return false;
        const { silent = false } = options;
        const ds = this.modal.dataset || {};
        if (!ds.snapped) return false;
        const restore = (key: string, prop: string) => {
            const style = target.style as unknown as Record<string, string>;
            if (Object.prototype.hasOwnProperty.call(ds, key)) {
                const value = ds[key];
                style[prop] = value ?? '';
                delete ds[key];
            } else {
                style[prop] = '';
            }
        };
        restore('prevSnapLeft', 'left');
        restore('prevSnapTop', 'top');
        restore('prevSnapWidth', 'width');
        restore('prevSnapHeight', 'height');
        restore('prevSnapMaxWidth', 'maxWidth');
        restore('prevSnapMaxHeight', 'maxHeight');
        restore('prevSnapPosition', 'position');
        restore('prevSnapRight', 'right');
        restore('prevSnapBottom', 'bottom');
        delete ds.snapped;
        window.hideSnapPreview?.();
        this.enforceMenuBarBoundary();
        if (!silent) window.saveWindowPositions?.();
        return true;
    }

    applySnapAfterDrag(target: HTMLElement | null, pointerX: number | null) {
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

    getSnapCandidate(target: HTMLElement | null, pointerX: number | null) {
        if (!target) return null;
        const viewportWidth = Math.max(window.innerWidth || 0, 0);
        if (viewportWidth <= 0) return null;
        const threshold = Math.max(3, Math.min(14, viewportWidth * 0.0035));
        const rect = target.getBoundingClientRect();
        const pointerDistLeft =
            typeof pointerX === 'number' ? Math.abs(pointerX) : Math.abs(rect.left);
        if (Math.abs(rect.left) <= threshold || pointerDistLeft <= threshold) return 'left';
        const distRight = viewportWidth - rect.right;
        const pointerDistRight =
            typeof pointerX === 'number' ? Math.abs(viewportWidth - pointerX) : Math.abs(distRight);
        if (Math.abs(distRight) <= threshold || pointerDistRight <= threshold) return 'right';
        return null;
    }

    bringToFront() {
        // Use a robust z-index management system that maintains a sorted window stack
        // and reassigns z-indexes to prevent reaching the maximum
        const zIndexManager = getZIndexManager();
        zIndexManager.bringToFront(this.modal.id, this.modal, this.windowEl);

        // Legacy modals (settings/about/etc.) are not represented as BaseWindow instances.
        // Clear active multi-window selection so menu/focus logic follows the actual top modal.
        if (this.modalId && !this.modalId.startsWith('window-')) {
            window.WindowRegistry?.setActiveWindow?.(null);
        }
    }

    refocus() {
        this.bringToFront();
        window.hideMenuDropdowns?.();
        window.saveOpenModals?.();
        window.updateProgramLabelByTopModal?.();
    }

    makeDraggable() {
        const target = this.windowEl || this.modal;
        if (!target) return;
        let offsetX = 0,
            offsetY = 0;
        let pointerScale = 1;
        const handleMouseDown = (e: MouseEvent) => {
            const dragHeader = (e.target as Element).closest?.(
                '.draggable-header'
            ) as HTMLElement | null;
            if (!dragHeader || !this.modal.contains(dragHeader)) return;
            this.refocus();
            if (
                (e.target as Element).closest &&
                (e.target as Element).closest('button[id^="close-"]')
            )
                return;
            if (
                (e.target as Element).closest &&
                (e.target as Element).closest('[data-dialog-action]')
            )
                return;
            if (this.modal.dataset && this.modal.dataset.maximized === 'true') return;
            const currentRect = target.getBoundingClientRect();
            pointerScale = detectClientCoordinateScale(e.clientX, e.clientY, currentRect);
            const pointerX = e.clientX;
            const pointerY = e.clientY;
            const logicalPointerX = toLogicalClientPx(pointerX, pointerScale);
            const logicalPointerY = toLogicalClientPx(pointerY, pointerScale);
            const renderedPointerX = toRenderedClientPx(pointerX, pointerScale);
            const initialSnapSide = this.modal.dataset ? this.modal.dataset.snapped : null;
            let rect = target.getBoundingClientRect();
            let localOffsetX = logicalPointerX - resolveElementLogicalPx(target, 'left', rect.left);
            let localOffsetY = logicalPointerY - resolveElementLogicalPx(target, 'top', rect.top);
            if (initialSnapSide) {
                const snappedWidth = Math.max(
                    1,
                    resolveElementLogicalPx(target, 'width', rect.width)
                );
                const snappedHeight = Math.max(
                    1,
                    resolveElementLogicalPx(target, 'height', rect.height)
                );
                const preservedOffsetX = Math.max(0, Math.min(snappedWidth, localOffsetX));
                const preservedOffsetY = Math.max(0, Math.min(snappedHeight, localOffsetY));

                this.unsnap({ silent: true });

                rect = target.getBoundingClientRect();
                const restoredWidth = Math.max(1, toLogicalPx(rect.width));
                const restoredHeight = Math.max(1, toLogicalPx(rect.height));
                localOffsetX = Math.max(0, Math.min(restoredWidth, preservedOffsetX));
                localOffsetY = Math.max(0, Math.min(restoredHeight, preservedOffsetY));
            }
            const computedPosition = window.getComputedStyle(target).position;
            if (computedPosition === 'static' || computedPosition === 'relative') {
                target.style.position = 'fixed';
            } else if (!target.style.position) {
                target.style.position = computedPosition;
            }
            const minTop = window.getMenuBarBottom?.() || 0;
            target.style.left = `${logicalPointerX - localOffsetX}px`;
            target.style.top = `${Math.max(minTop, logicalPointerY - localOffsetY)}px`;
            window.clampWindowToMenuBar?.(target);
            const adjustedRect = target.getBoundingClientRect();
            offsetX = logicalPointerX - resolveElementLogicalPx(target, 'left', adjustedRect.left);
            offsetY = logicalPointerY - resolveElementLogicalPx(target, 'top', adjustedRect.top);
            this.lastDragPointerX = renderedPointerX;
            document.body.classList.add('window-dragging');
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
                if (!isDragging) return;
                isDragging = false;
                document.body.classList.remove('window-dragging');
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
                    } else if (initialSnapSide === 'left' || initialSnapSide === 'right') {
                        this.snapTo(initialSnapSide, { silent: true });
                    }
                    window.saveWindowPositions?.();
                }
                pointerScale = 1;
                this.lastDragPointerX = null;
            };
            const mouseMoveHandler = (e2: MouseEvent) => {
                moved = true;
                window.requestAnimationFrame(() => {
                    const pointerLogicalX = toLogicalClientPx(e2.clientX, pointerScale);
                    const pointerLogicalY = toLogicalClientPx(e2.clientY, pointerScale);
                    const newLeft = pointerLogicalX - offsetX;
                    const newTop = pointerLogicalY - offsetY;
                    const minTop = window.getMenuBarBottom?.() || 0;
                    target.style.left = newLeft + 'px';
                    target.style.top = Math.max(minTop, newTop) + 'px';
                    this.lastDragPointerX = toRenderedClientPx(e2.clientX, pointerScale);
                    const candidate = this.getSnapCandidate(target, this.lastDragPointerX);
                    if (candidate) window.showSnapPreview?.(candidate);
                    else window.hideSnapPreview?.();
                });
            };
            const mouseUpHandler = (e2: MouseEvent) => {
                this.lastDragPointerX = toRenderedClientPx(e2.clientX, pointerScale);
                cleanup(true);
            };
            const blurHandler = () => cleanup(true);
            overlay.addEventListener('mousemove', mouseMoveHandler);
            overlay.addEventListener('mouseup', mouseUpHandler);
            window.addEventListener('mousemove', mouseMoveHandler);
            window.addEventListener('mouseup', mouseUpHandler);
            window.addEventListener('blur', blurHandler);
            e.preventDefault();
        };
        const handleDoubleClick = (e: MouseEvent) => {
            const dragHeader = (e.target as Element).closest?.(
                '.draggable-header'
            ) as HTMLElement | null;
            if (!dragHeader || !this.modal.contains(dragHeader)) return;
            if ((e.target as Element).closest?.('button, a, input, select, textarea')) return;
            if ((e.target as Element).closest?.('[data-dialog-action]')) return;

            this.refocus();
            this.toggleMaximize();
            e.preventDefault();
        };
        this.modal.addEventListener('mousedown', handleMouseDown);
        this.modal.addEventListener('dblclick', handleDoubleClick);
    }

    makeResizable() {
        if (this.modal.dataset.noResize === 'true') return;
        const resizeAxis = this.modal.dataset.resizeAxis || 'both';
        const target = this.windowEl || this.modal;
        if (!target) return;
        const existingHandles = target.querySelectorAll('.resizer');
        existingHandles.forEach(handle => handle.remove());
        const computedPosition = window.getComputedStyle(target).position;
        if (!computedPosition || computedPosition === 'static') target.style.position = 'relative';

        const ensureFixedPosition = () => {
            const computed = window.getComputedStyle(target);
            const rect = target.getBoundingClientRect();
            if (computed.position === 'static' || computed.position === 'relative') {
                target.style.position = 'fixed';
                target.style.left = rect.left + 'px';
                target.style.top = rect.top + 'px';
            } else {
                if (!target.style.left) target.style.left = rect.left + 'px';
                if (!target.style.top) target.style.top = rect.top + 'px';
            }
        };

        type ResizeHandle = {
            name: string;
            cursor: string;
            directions: ('n' | 's' | 'e' | 'w')[];
            style?: Record<string, string>;
        };

        const createHandle = (handle: ResizeHandle) => {
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
            const startResize = (event: MouseEvent) => {
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
                if (!Number.isFinite(startLeft)) startLeft = rect.left;
                if (!Number.isFinite(startTop)) startTop = rect.top;
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
                const applySize = (clientX: number, clientY: number) => {
                    if (!resizing) return;
                    window.requestAnimationFrame(() => {
                        const dx = clientX - startX;
                        const dy = clientY - startY;
                        let newWidth = startWidth;
                        let newHeight = startHeight;
                        let newLeft = startLeft;
                        let newTop = startTop;
                        if (handle.directions.includes('e')) newWidth = startWidth + dx;
                        if (handle.directions.includes('s')) newHeight = startHeight + dy;
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
                            if (handle.directions.includes('w')) newLeft -= deficit;
                            newWidth = minWidth;
                        }
                        if (newHeight < minHeight) {
                            const deficit = minHeight - newHeight;
                            if (handle.directions.includes('n')) newTop -= deficit;
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
                        if (handle.directions.includes('w')) target.style.left = newLeft + 'px';
                        if (handle.directions.includes('n')) target.style.top = newTop + 'px';
                    });
                };
                const stopResize = () => {
                    if (!resizing) return;
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
                const overlayMouseMove = (moveEvent: MouseEvent) =>
                    applySize(moveEvent.clientX, moveEvent.clientY);
                const windowMouseMove = (moveEvent: MouseEvent) =>
                    applySize(moveEvent.clientX, moveEvent.clientY);
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
        const handles: ResizeHandle[] = [
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

        const filteredHandles =
            resizeAxis === 'y'
                ? handles.filter(handle =>
                      handle.directions.every(dir => dir === 'n' || dir === 's')
                  )
                : resizeAxis === 'x'
                  ? handles.filter(handle =>
                        handle.directions.every(dir => dir === 'e' || dir === 'w')
                    )
                  : handles;

        filteredHandles.forEach(createHandle);
    }

    enforceMenuBarBoundary() {
        window.clampWindowToMenuBar?.(this.windowEl || this.modal);
    }

    loadIframe(url: string) {
        let contentArea = this.modal.querySelector('.dialog-content') as HTMLElement | null;
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
                const cw = iframe.contentWindow as Window | null;
                if (cw && cw.document) {
                    const handler = () =>
                        requestAnimationFrame(() => {
                            this.refocus();
                        });
                    ['mousedown', 'click', 'touchstart'].forEach(evt => {
                        cw.document.addEventListener(evt, handler);
                    });
                } else if (cw) {
                    ['mousedown', 'click', 'touchstart'].forEach(evt => {
                        cw.addEventListener(evt, () =>
                            requestAnimationFrame(() => {
                                this.refocus();
                            })
                        );
                    });
                }
            } catch (err) {
                logger.error('UI', 'Could not attach mousedown event in iframe:', err);
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

    restoreState(state: {
        left?: string;
        top?: string;
        width?: string;
        height?: string;
        zIndex?: string;
    }) {
        if (!state) return;
        if (state.left) this.modal.style.left = state.left;
        if (state.top) this.modal.style.top = state.top;
        if (state.width) this.modal.style.width = state.width;
        if (state.height) this.modal.style.height = state.height;
        if (state.zIndex) this.modal.style.zIndex = state.zIndex;
    }
}
// Note: Type declaration is in types/index.d.ts
(window as unknown as { Dialog: typeof Dialog }).Dialog = Dialog;
export default Dialog;
