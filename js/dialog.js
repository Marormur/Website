// Dialog window management module
// Exports: window.Dialog
(function (global) {
    'use strict';

    // Klasse zum Verwalten eines Fensters (Modal)
    class Dialog {
        constructor(modalId) {
            this.modal = document.getElementById(modalId);
            if (!this.modal) {
                throw new Error(`Kein Dialog mit der ID ${modalId} gefunden.`);
            }
            this.windowEl = (
                window.StorageSystem?.getDialogWindowElement ||
                ((modal) => modal?.querySelector('.autopointer') || modal)
            )(this.modal);
            this.lastDragPointerX = null;
            this.init();
        }
        init() {
            // Initialisiert Drag & Drop und Resizing
            this.makeDraggable();
            this.makeResizable();
            const closeButton = this.modal.querySelector(
                '.draggable-header button[id^="close-"]',
            );
            if (closeButton) {
                closeButton.style.cursor = 'pointer';
                closeButton.dataset.dialogAction = 'close';
                if (!closeButton.dataset.dialogBoundClose) {
                    closeButton.dataset.dialogBoundClose = 'true';
                    closeButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.close();
                    });
                }
            }
            // Verkabele macOS-ähnliche Titelbar-Buttons (Gelb = Minimize, Grün = Maximize)
            const minimizeEl = this.modal.querySelector(
                '.draggable-header .bg-yellow-500.rounded-full',
            );
            const maximizeEl = this.modal.querySelector(
                '.draggable-header .bg-green-500.rounded-full',
            );
            if (minimizeEl) {
                minimizeEl.style.cursor = 'pointer';
                minimizeEl.title = minimizeEl.title || 'Minimieren';
                minimizeEl.dataset.dialogAction = 'minimize';
                minimizeEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.minimize();
                });
            }
            if (maximizeEl) {
                maximizeEl.style.cursor = 'pointer';
                maximizeEl.title = maximizeEl.title || 'Maximieren';
                maximizeEl.dataset.dialogAction = 'maximize';
                maximizeEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleMaximize();
                });
            }
        }
        open() {
            hideMenuDropdowns();
            this.modal.classList.remove('hidden');
            // Öffnen hebt Minimiert-Status auf
            if (this.modal.dataset) {
                delete this.modal.dataset.minimized;
            }
            this.bringToFront();
            this.enforceMenuBarBoundary();
            saveOpenModals();
            updateDockIndicators();
            updateProgramLabelByTopModal();
        }
        close() {
            if (this.modal.classList.contains('hidden')) return;
            this.modal.classList.add('hidden');
            saveOpenModals();
            updateDockIndicators();
            updateProgramLabelByTopModal();
        }
        minimize() {
            // Markiere als minimiert und blende das Fenster aus, Dock-Anzeige bleibt erhalten
            if (this.modal.dataset) this.modal.dataset.minimized = 'true';
            if (!this.modal.classList.contains('hidden')) {
                this.modal.classList.add('hidden');
            }
            saveOpenModals();
            updateDockIndicators();
            updateProgramLabelByTopModal();
        }
        toggleMaximize() {
            const target = this.windowEl || this.modal;
            if (!target) return;
            // Wenn das Fenster angedockt ist, zunächst lösen, um konsistente Maße zu erhalten
            this.unsnap({ silent: true });
            const ds = this.modal.dataset || {};
            const isMax = ds.maximized === 'true';
            if (isMax) {
                // Zurücksetzen auf vorherige Größe/Position
                if (ds.prevLeft !== undefined) target.style.left = ds.prevLeft;
                if (ds.prevTop !== undefined) target.style.top = ds.prevTop;
                if (ds.prevWidth !== undefined)
                    target.style.width = ds.prevWidth;
                if (ds.prevHeight !== undefined)
                    target.style.height = ds.prevHeight;
                if (ds.prevPosition !== undefined)
                    target.style.position = ds.prevPosition;
                delete this.modal.dataset.maximized;
                delete this.modal.dataset.prevLeft;
                delete this.modal.dataset.prevTop;
                delete this.modal.dataset.prevWidth;
                delete this.modal.dataset.prevHeight;
                delete this.modal.dataset.prevPosition;
                this.enforceMenuBarBoundary();
                saveWindowPositions();
                return;
            }
            // Speichere aktuelle Größe/Position
            const computed = window.getComputedStyle(target);
            this.modal.dataset.prevLeft =
                target.style.left || computed.left || '';
            this.modal.dataset.prevTop = target.style.top || computed.top || '';
            this.modal.dataset.prevWidth =
                target.style.width || computed.width || '';
            this.modal.dataset.prevHeight =
                target.style.height || computed.height || '';
            this.modal.dataset.prevPosition =
                target.style.position || computed.position || '';
            // Auf maximierte Größe setzen (unterhalb der Menüleiste)
            const minTop = Math.round(getMenuBarBottom());
            target.style.position = 'fixed';
            target.style.left = '0px';
            target.style.top = `${minTop}px`;
            target.style.width = '100vw';
            // Höhe: restlicher Platz unterhalb der Menüleiste
            target.style.height = `calc(100vh - ${minTop}px)`;
            // Dock-Reserve berücksichtigen
            try {
                const __dockReserve = getDockReservedBottom();
                const __maxHeight = Math.max(
                    0,
                    (window.innerHeight || 0) - minTop - __dockReserve,
                );
                target.style.height = `${__maxHeight}px`;
            } catch (e) {
                /* noop */
            }
            this.modal.dataset.maximized = 'true';
            this.bringToFront();
            saveWindowPositions();
        }
        snapTo(side, options = {}) {
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
                ds.prevSnapHeight =
                    target.style.height || computed.height || '';
                ds.prevSnapPosition =
                    target.style.position || computed.position || '';
                ds.prevSnapRight = target.style.right || computed.right || '';
                ds.prevSnapBottom =
                    target.style.bottom || computed.bottom || '';
            }
            const metrics = computeSnapMetrics(side);
            if (!metrics) {
                this.unsnap({ silent: true });
                return null;
            }
            target.style.position = 'fixed';
            target.style.top = `${metrics.top}px`;
            target.style.left = `${metrics.left}px`;
            target.style.width = `${metrics.width}px`;
            // exakte Höhe unter Berücksichtigung des Docks
            target.style.height = `${metrics.height}px`;
            target.style.right = '';
            target.style.bottom = '';
            ds.snapped = side;
            this.bringToFront();
            hideSnapPreview();
            if (!silent) {
                saveWindowPositions();
            }
            return side;
        }
        unsnap(options = {}) {
            const target = this.windowEl || this.modal;
            if (!target) return false;
            const { silent = false } = options;
            const ds = this.modal.dataset || {};
            if (!ds.snapped) return false;
            const restore = (key, prop) => {
                if (Object.prototype.hasOwnProperty.call(ds, key)) {
                    const value = ds[key];
                    if (value === '') {
                        target.style[prop] = '';
                    } else {
                        target.style[prop] = value;
                    }
                    delete ds[key];
                } else {
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
            hideSnapPreview();
            this.enforceMenuBarBoundary();
            if (!silent) {
                saveWindowPositions();
            }
            return true;
        }
        applySnapAfterDrag(target, pointerX) {
            if (!target) {
                hideSnapPreview();
                return null;
            }
            const candidate = this.getSnapCandidate(target, pointerX);
            if (candidate) {
                const side = this.snapTo(candidate, { silent: true });
                hideSnapPreview();
                return side;
            }
            this.unsnap({ silent: true });
            hideSnapPreview();
            return null;
        }
        getSnapCandidate(target, pointerX) {
            if (!target) return null;
            const viewportWidth = Math.max(window.innerWidth || 0, 0);
            if (viewportWidth <= 0) return null;
            const threshold = Math.max(3, Math.min(14, viewportWidth * 0.0035));
            const rect = target.getBoundingClientRect();
            const pointerDistLeft =
                typeof pointerX === 'number'
                    ? Math.max(0, pointerX)
                    : Math.abs(rect.left);
            if (
                Math.abs(rect.left) <= threshold ||
                pointerDistLeft <= threshold
            ) {
                return 'left';
            }
            const distRight = viewportWidth - rect.right;
            const pointerDistRight =
                typeof pointerX === 'number'
                    ? Math.max(0, viewportWidth - pointerX)
                    : Math.abs(distRight);
            if (
                Math.abs(distRight) <= threshold ||
                pointerDistRight <= threshold
            ) {
                return 'right';
            }
            return null;
        }
        bringToFront() {
            // Erhöhe den globalen Z-Index‑Zähler und setze diesen Dialog nach vorn.
            // Durch das Hochzählen bleiben bestehende Reihenfolgen erhalten und verhindern, dass
            // ein anderer Dialog versehentlich überlagert wird. Sichtbare Modale werden nicht
            // zurückgesetzt, wodurch ständige Umsortierungen verhindert werden.
            topZIndex = (typeof topZIndex === 'number' ? topZIndex : 1000) + 1;
            const zValue = topZIndex.toString();
            this.modal.style.zIndex = zValue;
            if (this.windowEl) {
                this.windowEl.style.zIndex = zValue;
            }
        }
        refocus() {
            // Wird aufgerufen, wenn innerhalb des Modals geklickt wird
            this.bringToFront();
            hideMenuDropdowns();
            saveOpenModals();
            updateProgramLabelByTopModal();
        }
        makeDraggable() {
            const header = this.modal.querySelector('.draggable-header');
            const target = this.windowEl || this.modal;
            if (!header || !target) return;
            header.style.cursor = 'move';
            let offsetX = 0,
                offsetY = 0;
            header.addEventListener('mousedown', (e) => {
                this.refocus();
                // Wenn auf einen Steuerungs-Button geklickt wird (schließen/minimieren/maximieren), kein Drag starten
                if (e.target.closest('button[id^="close-"]')) return;
                if (e.target.closest('[data-dialog-action]')) return;
                // Beim maximierten Fenster kein Drag
                if (
                    this.modal.dataset &&
                    this.modal.dataset.maximized === 'true'
                )
                    return;
                const pointerX = e.clientX;
                const pointerY = e.clientY;
                const initialSnapSide = this.modal.dataset
                    ? this.modal.dataset.snapped
                    : null;
                let rect = target.getBoundingClientRect();
                let localOffsetX = pointerX - rect.left;
                let localOffsetY = pointerY - rect.top;
                if (initialSnapSide) {
                    const preservedOffsetX = localOffsetX;
                    const preservedOffsetY = localOffsetY;
                    this.unsnap({ silent: true });
                    // Positioniere das Fenster direkt unter dem Cursor mit den gespeicherten Offsets
                    const minTopAfterUnsnap = getMenuBarBottom();
                    target.style.position = 'fixed';
                    target.style.left = `${pointerX - preservedOffsetX}px`;
                    target.style.top = `${Math.max(minTopAfterUnsnap, pointerY - preservedOffsetY)}px`;
                    rect = target.getBoundingClientRect();
                    localOffsetX = pointerX - rect.left;
                    localOffsetY = pointerY - rect.top;
                }
                const computedPosition =
                    window.getComputedStyle(target).position;
                // Beim ersten Drag die aktuelle Position einfrieren, damit es nicht springt.
                if (
                    computedPosition === 'static' ||
                    computedPosition === 'relative'
                ) {
                    target.style.position = 'fixed';
                } else if (!target.style.position) {
                    target.style.position = computedPosition;
                }
                const minTop = getMenuBarBottom();
                target.style.left = `${pointerX - localOffsetX}px`;
                target.style.top = `${Math.max(minTop, pointerY - localOffsetY)}px`;
                clampWindowToMenuBar(target);
                const adjustedRect = target.getBoundingClientRect();
                offsetX = pointerX - adjustedRect.left;
                offsetY = pointerY - adjustedRect.top;
                this.lastDragPointerX = pointerX;
                // Transparentes Overlay erstellen, um Events abzufangen
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
                    overlay.remove();
                    overlay.removeEventListener('mousemove', mouseMoveHandler);
                    overlay.removeEventListener('mouseup', mouseUpHandler);
                    window.removeEventListener('mouseup', mouseUpHandler);
                    window.removeEventListener('blur', blurHandler);
                    window.removeEventListener('mousemove', mouseMoveHandler);
                    hideSnapPreview();
                    if (shouldSave) {
                        if (moved) {
                            this.applySnapAfterDrag(
                                target,
                                this.lastDragPointerX,
                            );
                        } else if (initialSnapSide) {
                            this.snapTo(initialSnapSide, { silent: true });
                        }
                        saveWindowPositions();
                    }
                    this.lastDragPointerX = null;
                };
                const mouseMoveHandler = (e) => {
                    moved = true;
                    window.requestAnimationFrame(() => {
                        const newLeft = e.clientX - offsetX;
                        const newTop = e.clientY - offsetY;
                        const minTop = getMenuBarBottom();
                        target.style.left = newLeft + 'px';
                        target.style.top = Math.max(minTop, newTop) + 'px';
                        this.lastDragPointerX = e.clientX;
                        const candidate = this.getSnapCandidate(
                            target,
                            this.lastDragPointerX,
                        );
                        if (candidate) {
                            showSnapPreview(candidate);
                        } else {
                            hideSnapPreview();
                        }
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
            if (this.modal.dataset.noResize === 'true') {
                return;
            }
            const target = this.windowEl || this.modal;
            if (!target) return;

            const existingHandles = target.querySelectorAll('.resizer');
            existingHandles.forEach((handle) => handle.remove());

            const computedPosition = window.getComputedStyle(target).position;
            if (!computedPosition || computedPosition === 'static') {
                target.style.position = 'relative';
            }

            const ensureFixedPosition = () => {
                const computed = window.getComputedStyle(target);
                const rect = target.getBoundingClientRect();
                if (
                    computed.position === 'static' ||
                    computed.position === 'relative'
                ) {
                    target.style.position = 'fixed';
                    target.style.left = rect.left + 'px';
                    target.style.top = rect.top + 'px';
                } else {
                    if (!target.style.left)
                        target.style.left = rect.left + 'px';
                    if (!target.style.top) target.style.top = rect.top + 'px';
                }
            };

            const createHandle = (handle) => {
                const resizer = document.createElement('div');
                resizer.classList.add('resizer', `resizer-${handle.name}`);
                resizer.style.position = 'absolute';
                resizer.style.zIndex = '9999';
                resizer.style.backgroundColor = 'transparent';
                resizer.style.pointerEvents = 'auto';
                resizer.style.touchAction = 'none';
                resizer.style.cursor = handle.cursor;
                Object.assign(resizer.style, handle.style);
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
                    if (!Number.isFinite(startLeft)) startLeft = rect.left;
                    if (!Number.isFinite(startTop)) startTop = rect.top;

                    const startWidth = rect.width;
                    const startHeight = rect.height;

                    const overlay = document.createElement('div');
                    overlay.style.position = 'fixed';
                    overlay.style.top = '0';
                    overlay.style.left = '0';
                    overlay.style.width = '100%';
                    overlay.style.height = '100%';
                    overlay.style.zIndex = '9999';
                    overlay.style.cursor = handle.cursor;
                    overlay.style.backgroundColor = 'transparent';
                    overlay.style.touchAction = 'none';
                    document.body.appendChild(overlay);

                    let resizing = true;

                    const applySize = (clientX, clientY) => {
                        if (!resizing) return;
                        window.requestAnimationFrame(() => {
                            const dx = clientX - startX;
                            const dy = clientY - startY;

                            let newWidth = startWidth;
                            let newHeight = startHeight;
                            let newLeft = startLeft;
                            let newTop = startTop;

                            if (handle.directions.includes('e')) {
                                newWidth = startWidth + dx;
                            }
                            if (handle.directions.includes('s')) {
                                newHeight = startHeight + dy;
                            }
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
                                if (handle.directions.includes('w')) {
                                    newLeft -= deficit;
                                }
                                newWidth = minWidth;
                            }
                            if (newHeight < minHeight) {
                                const deficit = minHeight - newHeight;
                                if (handle.directions.includes('n')) {
                                    newTop -= deficit;
                                }
                                newHeight = minHeight;
                            }

                            const minTop = getMenuBarBottom();
                            if (
                                handle.directions.includes('n') &&
                                newTop < minTop
                            ) {
                                const overshoot = minTop - newTop;
                                newTop = minTop;
                                newHeight = Math.max(
                                    minHeight,
                                    newHeight - overshoot,
                                );
                            }

                            if (
                                handle.directions.includes('w') ||
                                handle.directions.includes('e')
                            ) {
                                target.style.width =
                                    Math.max(minWidth, newWidth) + 'px';
                            }
                            if (
                                handle.directions.includes('s') ||
                                handle.directions.includes('n')
                            ) {
                                target.style.height =
                                    Math.max(minHeight, newHeight) + 'px';
                            }
                            if (handle.directions.includes('w')) {
                                target.style.left = newLeft + 'px';
                            }
                            if (handle.directions.includes('n')) {
                                target.style.top = newTop + 'px';
                            }
                        });
                    };

                    const stopResize = () => {
                        if (!resizing) return;
                        resizing = false;
                        overlay.remove();
                        overlay.removeEventListener(
                            'mousemove',
                            overlayMouseMove,
                        );
                        overlay.removeEventListener('mouseup', overlayMouseUp);
                        window.removeEventListener(
                            'mousemove',
                            windowMouseMove,
                        );
                        window.removeEventListener('mouseup', windowMouseUp);
                        window.removeEventListener('blur', onBlur);
                        clampWindowToMenuBar(target);
                        saveWindowPositions();
                    };

                    const overlayMouseMove = (moveEvent) =>
                        applySize(moveEvent.clientX, moveEvent.clientY);
                    const windowMouseMove = (moveEvent) =>
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

            const handles = [
                {
                    name: 'top',
                    cursor: 'n-resize',
                    directions: ['n'],
                    style: {
                        top: '-4px',
                        left: '12px',
                        right: '12px',
                        height: '8px',
                    },
                },
                {
                    name: 'bottom',
                    cursor: 's-resize',
                    directions: ['s'],
                    style: {
                        bottom: '-4px',
                        left: '12px',
                        right: '12px',
                        height: '8px',
                    },
                },
                {
                    name: 'left',
                    cursor: 'w-resize',
                    directions: ['w'],
                    style: {
                        left: '-4px',
                        top: '12px',
                        bottom: '12px',
                        width: '8px',
                    },
                },
                {
                    name: 'right',
                    cursor: 'e-resize',
                    directions: ['e'],
                    style: {
                        right: '-4px',
                        top: '12px',
                        bottom: '12px',
                        width: '8px',
                    },
                },
                {
                    name: 'top-left',
                    cursor: 'nw-resize',
                    directions: ['n', 'w'],
                    style: {
                        top: '-6px',
                        left: '-6px',
                        width: '14px',
                        height: '14px',
                    },
                },
                {
                    name: 'top-right',
                    cursor: 'ne-resize',
                    directions: ['n', 'e'],
                    style: {
                        top: '-6px',
                        right: '-6px',
                        width: '14px',
                        height: '14px',
                    },
                },
                {
                    name: 'bottom-left',
                    cursor: 'sw-resize',
                    directions: ['s', 'w'],
                    style: {
                        bottom: '-6px',
                        left: '-6px',
                        width: '14px',
                        height: '14px',
                    },
                },
                {
                    name: 'bottom-right',
                    cursor: 'se-resize',
                    directions: ['s', 'e'],
                    style: {
                        bottom: '-6px',
                        right: '-6px',
                        width: '14px',
                        height: '14px',
                    },
                },
            ];

            handles.forEach(createHandle);
        }
        enforceMenuBarBoundary() {
            clampWindowToMenuBar(this.windowEl || this.modal);
        }
        loadIframe(url) {
            // Creates or reuses a dedicated content container for iframes
            let contentArea = this.modal.querySelector('.dialog-content');
            if (!contentArea) {
                contentArea = document.createElement('div');
                contentArea.classList.add('dialog-content');
                contentArea.style.width = '100%';
                contentArea.style.height = '100%';
                this.modal.appendChild(contentArea);
            }
            // Clear any previous contents (e.g. existing iframes)
            contentArea.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            // allow attribute to permit fullscreen etc.
            iframe.setAttribute('allow', 'fullscreen');
            contentArea.appendChild(iframe);
            // When the iframe finishes loading its content we attempt to hook into its document
            iframe.addEventListener('load', () => {
                try {
                    // Attach a mousedown listener to the iframe's document so that any click inside the
                    // iframe (e.g. inside a contenteditable region) will refocus this modal. We also
                    // attach to the window as a fallback. Same-origin policy allows this for local files.
                    const cw = iframe.contentWindow;
                    if (cw && cw.document) {
                        const handler = () => {
                            // Defer bringing to front slightly to allow other event handlers to complete
                            requestAnimationFrame(() => {
                                this.refocus();
                            });
                        };
                        ['mousedown', 'click', 'touchstart'].forEach((evt) => {
                            cw.document.addEventListener(evt, handler);
                        });
                    } else if (cw) {
                        ['mousedown', 'click', 'touchstart'].forEach((evt) => {
                            cw.addEventListener(evt, () => {
                                requestAnimationFrame(() => {
                                    this.refocus();
                                });
                            });
                        });
                    }
                } catch (err) {
                    console.error(
                        'Could not attach mousedown event in iframe:',
                        err,
                    );
                }
            });
        }
        // Optional: speichert den Zustand des Fensters
        saveState() {
            return {
                left: this.modal.style.left,
                top: this.modal.style.top,
                width: this.modal.style.width,
                height: this.modal.style.height,
                zIndex: this.modal.style.zIndex,
            };
        }
        // Optional: restauriert einen gespeicherten Zustand
        restoreState(state) {
            if (!state) return;
            if (state.left) this.modal.style.left = state.left;
            if (state.top) this.modal.style.top = state.top;
            if (state.width) this.modal.style.width = state.width;
            if (state.height) this.modal.style.height = state.height;
            if (state.zIndex) this.modal.style.zIndex = state.zIndex;
        }
    }

    global.Dialog = Dialog;
})(window);
