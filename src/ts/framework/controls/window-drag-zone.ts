import {
    detectClientCoordinateScale,
    resolveElementLogicalPx,
    toLogicalClientPx,
    toRenderedClientPx,
} from '../../utils/viewport.js';

type SnapSide = 'left' | 'right';

interface DragRestoreContext {
    windowEl: HTMLElement;
    pointerX: number;
    pointerY: number;
}

interface WindowDragZoneBehaviorOptions {
    windowEl: HTMLElement;
    dragZoneSelector?: string;
    isInteractiveTarget: (target: HTMLElement | null) => boolean;
    bringToFront: () => void;
    isMaximized?: () => boolean;
    toggleMaximize: () => void;
    updatePosition: (x: number, y: number, windowEl: HTMLElement) => void;
    getSnapCandidate: (target: HTMLElement | null, pointerX: number | null) => SnapSide | null;
    snapTo: (side: SnapSide) => void;
    persistState: () => void;
    restoreFromSnappedDrag?: (context: DragRestoreContext) => void;
}

export function attachWindowDragZoneBehavior(options: WindowDragZoneBehaviorOptions): void {
    const DRAG_START_THRESHOLD_PX = 3;

    const setDragSelectionLock = (enabled: boolean): void => {
        document.body.classList.toggle('window-dragging', enabled);
        if (enabled) {
            window.hideMenuDropdowns?.();
            const selection = window.getSelection?.();
            selection?.removeAllRanges();
        }
    };

    const state = {
        isDragging: false,
        pendingDrag: false,
        startPointerX: 0,
        startPointerY: 0,
        offsetX: 0,
        offsetY: 0,
        pointerScale: 1,
        lastPointerX: null as number | null,
    };

    const dragZoneSelector = options.dragZoneSelector || '.finder-window-drag-zone';

    options.windowEl.addEventListener('mousedown', (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target?.closest(dragZoneSelector) || options.isInteractiveTarget(target)) return;

        if (options.isMaximized?.()) {
            options.toggleMaximize();
        }

        const rect = options.windowEl.getBoundingClientRect();
        state.pointerScale = detectClientCoordinateScale(e.clientX, e.clientY, rect);
        const pointerX = toLogicalClientPx(e.clientX, state.pointerScale);
        const pointerY = toLogicalClientPx(e.clientY, state.pointerScale);
        const liveRect = options.windowEl.getBoundingClientRect();

        state.pendingDrag = true;
        state.isDragging = false;
        state.startPointerX = pointerX;
        state.startPointerY = pointerY;
        state.offsetX = pointerX - resolveElementLogicalPx(options.windowEl, 'left', liveRect.left);
        state.offsetY = pointerY - resolveElementLogicalPx(options.windowEl, 'top', liveRect.top);
        state.lastPointerX = null;
        setDragSelectionLock(true);

        e.preventDefault();
    });

    options.windowEl.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        const dragZone = target?.closest(dragZoneSelector) as HTMLElement | null;
        if (!dragZone || options.isInteractiveTarget(target)) return;
        // Use browser-native click detail to only react on the second
        // click of a true double-click sequence on this drag zone.
        if (e.detail !== 2) return;

        options.bringToFront();
        options.toggleMaximize();
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
        const pointerX = toLogicalClientPx(e.clientX, state.pointerScale);
        const pointerY = toLogicalClientPx(e.clientY, state.pointerScale);
        const renderedPointerX = toRenderedClientPx(e.clientX, state.pointerScale);

        if (state.pendingDrag && !state.isDragging) {
            const movedX = Math.abs(pointerX - state.startPointerX);
            const movedY = Math.abs(pointerY - state.startPointerY);
            const movedEnough =
                movedX >= DRAG_START_THRESHOLD_PX || movedY >= DRAG_START_THRESHOLD_PX;
            if (!movedEnough) return;

            state.isDragging = true;
            state.pendingDrag = false;
            options.restoreFromSnappedDrag?.({ windowEl: options.windowEl, pointerX, pointerY });
            options.bringToFront();
        }

        if (!state.isDragging) return;

        const newX = pointerX - state.offsetX;
        const minTop = window.getMenuBarBottom?.() || 0;
        const newY = Math.max(minTop, pointerY - state.offsetY);

        options.updatePosition(newX, newY, options.windowEl);
        state.lastPointerX = renderedPointerX;

        const candidate = options.getSnapCandidate(options.windowEl, state.lastPointerX);
        if (candidate) window.showSnapPreview?.(candidate);
        else window.hideSnapPreview?.();
    });

    document.addEventListener('mouseup', () => {
        if (state.pendingDrag && !state.isDragging) {
            state.pendingDrag = false;
            state.pointerScale = 1;
            state.lastPointerX = null;
            setDragSelectionLock(false);
            return;
        }

        if (!state.isDragging) return;
        state.isDragging = false;

        const candidate = options.getSnapCandidate(options.windowEl, state.lastPointerX);
        if (candidate) options.snapTo(candidate);
        window.hideSnapPreview?.();

        state.pointerScale = 1;
        state.lastPointerX = null;
        setDragSelectionLock(false);
        options.persistState();
    });

    window.addEventListener('blur', () => {
        if (state.pendingDrag || state.isDragging) {
            state.pendingDrag = false;
            state.isDragging = false;
            state.pointerScale = 1;
            state.lastPointerX = null;
        }
        setDragSelectionLock(false);
        window.hideSnapPreview?.();
    });
}
