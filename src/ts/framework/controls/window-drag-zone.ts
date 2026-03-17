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
    toggleMaximize: () => void;
    updatePosition: (x: number, y: number, windowEl: HTMLElement) => void;
    getSnapCandidate: (target: HTMLElement | null, pointerX: number | null) => SnapSide | null;
    snapTo: (side: SnapSide) => void;
    persistState: () => void;
    restoreFromSnappedDrag?: (context: DragRestoreContext) => void;
}

export function attachWindowDragZoneBehavior(options: WindowDragZoneBehaviorOptions): void {
    const state = {
        isDragging: false,
        offsetX: 0,
        offsetY: 0,
        pointerScale: 1,
        lastPointerX: null as number | null,
    };

    const dragZoneSelector = options.dragZoneSelector || '.finder-window-drag-zone';

    options.windowEl.addEventListener('mousedown', (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target?.closest(dragZoneSelector) || options.isInteractiveTarget(target)) return;

        const rect = options.windowEl.getBoundingClientRect();
        state.pointerScale = detectClientCoordinateScale(e.clientX, e.clientY, rect);
        const pointerX = toLogicalClientPx(e.clientX, state.pointerScale);
        const pointerY = toLogicalClientPx(e.clientY, state.pointerScale);
        const renderedPointerX = toRenderedClientPx(e.clientX, state.pointerScale);

        options.restoreFromSnappedDrag?.({ windowEl: options.windowEl, pointerX, pointerY });

        const liveRect = options.windowEl.getBoundingClientRect();
        state.isDragging = true;
        state.offsetX = pointerX - resolveElementLogicalPx(options.windowEl, 'left', liveRect.left);
        state.offsetY = pointerY - resolveElementLogicalPx(options.windowEl, 'top', liveRect.top);
        state.lastPointerX = renderedPointerX;
        options.bringToFront();
        e.preventDefault();
    });

    options.windowEl.addEventListener('dblclick', (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target?.closest(dragZoneSelector) || options.isInteractiveTarget(target)) return;

        options.bringToFront();
        options.toggleMaximize();
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
        if (!state.isDragging) return;

        const pointerX = toLogicalClientPx(e.clientX, state.pointerScale);
        const pointerY = toLogicalClientPx(e.clientY, state.pointerScale);
        const renderedPointerX = toRenderedClientPx(e.clientX, state.pointerScale);
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
        if (!state.isDragging) return;
        state.isDragging = false;

        const candidate = options.getSnapCandidate(options.windowEl, state.lastPointerX);
        if (candidate) options.snapTo(candidate);
        window.hideSnapPreview?.();

        state.pointerScale = 1;
        state.lastPointerX = null;
        options.persistState();
    });
}
