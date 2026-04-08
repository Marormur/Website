import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import {
    focusOrCreateWindowByType,
    showAndRegisterWindow,
} from '../../framework/controls/window-lifecycle.js';
import logger from '../../core/logger.js';
import {
    detectClientCoordinateScale,
    getLogicalViewportHeight,
    getLogicalViewportWidth,
    resolveElementLogicalPx,
    toLogicalClientPx,
    toRenderedClientPx,
    toLogicalPx,
} from '../../utils/viewport.js';
import { getDockReservedBottom } from '../../ui/dock.js';

/**
 * PURPOSE: Settings as BaseWindow subclass
 * Migrates legacy settings-modal dialog to modern multi-window architecture
 *
 * WHY: Consolidates window lifecycle mgmt, allows multiple Settings instances,
 *      leverages BaseWindow positioning/z-index/session-restore infrastructure
 *
 * PATTERN: Clones legacy .settings-window-shell template, initializes SettingsSystem
 *          component inline rather than relying on Dialog.js controller
 *
 * DEPENDENCIES:
 * - BaseWindow (inheritance)
 * - SettingsSystem globally (for .init() after DOM injection)
 * - #settings-modal template in index.html (contains .settings-window-shell + #settings-container)
 *
 * INVARIANT: Only one Settings window should be active at a time (enforced via
 *            focusOrCreate pattern). Settings state syncs to persisted preferences.
 */
export class SettingsWindow extends BaseWindow {
    constructor(config?: Partial<WindowConfig>) {
        super({
            type: 'settings',
            title: 'Systemeinstellungen',
            position: { x: 100, y: 80, width: 520, height: 660 },
            ...config,
        });
    }

    createDOM(): HTMLElement {
        const modal = super.createDOM();
        modal.classList.add('settings-window-shell');

        // IMPORTANT: Remove BaseWindow's auto-generated titlebar because SettingsSystem
        // renders its own titlebar inline (via renderTrafficLightControlsHTML in render()).
        // This prevents double titlebar.
        if (this.titlebarElement) {
            this.titlebarElement.remove();
            this.titlebarElement = null;
        }

        // Ensure legacy shell is not simultaneously visible when this BaseWindow variant opens.
        const legacyModal = document.getElementById('settings-modal');
        if (legacyModal) {
            legacyModal.classList.add('hidden');
            legacyModal.setAttribute('aria-hidden', 'true');
            legacyModal.style.display = 'none';
            legacyModal.style.pointerEvents = 'none';
        }

        // Set style overrides for Settings window
        modal.style.minWidth = '360px';
        modal.style.minHeight = '460px';

        // Hide tab bar
        const tabBar = modal.querySelector<HTMLElement>(`#${this.id}-tabs`);
        if (tabBar) {
            tabBar.classList.add('hidden');
            tabBar.style.display = 'none';
        }

        // Clone legacy settings template into contentElement
        if (this.contentElement) {
            this.contentElement.className = 'flex-1 overflow-hidden';

            const template = document.querySelector<HTMLElement>(
                '#settings-modal .settings-window-shell'
            );
            if (template) {
                // Extract and use only the inner content (#settings-container)
                const settingsContainer =
                    template.querySelector<HTMLElement>('#settings-container');
                if (settingsContainer) {
                    // Clone the container for fresh instance
                    const clonedContainer = settingsContainer.cloneNode(true) as HTMLElement;
                    this.contentElement.innerHTML = '';
                    this.contentElement.appendChild(clonedContainer);

                    // Initialize SettingsSystem in the cloned container
                    const SettingsSystem = (window as unknown as Record<string, unknown>)
                        ?.SettingsSystem as { init?: (el: HTMLElement) => void } | undefined;
                    if (SettingsSystem && typeof SettingsSystem.init === 'function') {
                        try {
                            SettingsSystem.init(clonedContainer);
                            logger.debug('APP', 'SettingsWindow: SettingsSystem initialized');
                        } catch (err) {
                            logger.warn(
                                'APP',
                                'SettingsWindow: Error initializing SettingsSystem',
                                err
                            );
                        }
                    }

                    // Apply i18n translations to cloned content
                    const w = window as unknown as Record<string, any>;
                    w.appI18n?.applyTranslations?.(clonedContainer);
                } else {
                    logger.warn('APP', 'SettingsWindow: settings-container not found in template');
                }
            } else {
                logger.warn('APP', 'SettingsWindow: Template not found');
            }
        }

        this.attachInlineHeaderDrag(modal);

        return modal;
    }

    /**
     * Settings uses inline draggable headers from SettingsSystem, therefore we need
     * a custom drag hookup after removing BaseWindow's default titlebar.
     */
    private attachInlineHeaderDrag(windowEl: HTMLElement): void {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        let activePointerId: number | null = null;
        let captureHeader: HTMLElement | null = null;
        let pointerScale = 1;
        let lastPointerXRendered: number | null = null;
        let lastPointerYLogical: number | null = null;
        let stopSelection: ((event: Event) => void) | null = null;
        let lastHandledHeaderDoubleClickAt = 0;

        const getSnapCandidate = (
            target: HTMLElement | null,
            pointerXRendered: number | null
        ): 'left' | 'right' | null => {
            if (!target) return null;

            const viewportWidth = Math.max(window.innerWidth || 0, 0);
            if (viewportWidth <= 0) return null;

            const threshold = Math.max(3, Math.min(14, viewportWidth * 0.0035));
            const rect = target.getBoundingClientRect();

            const pointerDistLeft =
                typeof pointerXRendered === 'number'
                    ? Math.abs(pointerXRendered)
                    : Math.abs(rect.left);
            if (Math.abs(rect.left) <= threshold || pointerDistLeft <= threshold) return 'left';

            const distRight = viewportWidth - rect.right;
            const pointerDistRight =
                typeof pointerXRendered === 'number'
                    ? Math.abs(viewportWidth - pointerXRendered)
                    : Math.abs(distRight);
            if (Math.abs(distRight) <= threshold || pointerDistRight <= threshold) return 'right';

            return null;
        };

        const snapToSide = (side: 'left' | 'right') => {
            const metrics = window.computeSnapMetrics?.(side);
            if (!metrics) return;

            if (!windowEl.dataset.snapped) {
                const rect = windowEl.getBoundingClientRect();
                windowEl.dataset.prevSnapLeft = `${Math.round(resolveElementLogicalPx(windowEl, 'left', rect.left))}`;
                windowEl.dataset.prevSnapTop = `${Math.round(resolveElementLogicalPx(windowEl, 'top', rect.top))}`;
                windowEl.dataset.prevSnapWidth = `${Math.round(resolveElementLogicalPx(windowEl, 'width', rect.width))}`;
                windowEl.dataset.prevSnapHeight = `${Math.round(resolveElementLogicalPx(windowEl, 'height', rect.height))}`;
            }

            this.isMaximized = false;
            windowEl.style.minWidth = '0px';
            windowEl.style.minHeight = '0px';
            windowEl.style.maxWidth = 'none';
            windowEl.style.maxHeight = 'none';
            windowEl.style.position = 'fixed';
            windowEl.style.left = `${metrics.left}px`;
            windowEl.style.top = `${metrics.top}px`;
            windowEl.style.width = `${metrics.width}px`;
            windowEl.style.height = `${metrics.height}px`;
            windowEl.dataset.snapped = side;

            this.position.x = metrics.left;
            this.position.y = metrics.top;
            this.position.width = metrics.width;
            this.position.height = metrics.height;
            this.bringToFront();
        };

        const executeHeaderDoubleClickAction = () => {
            this.bringToFront();
            const action = window.DockSystem?.getTitlebarDoubleClickAction?.() || 'zoom';
            if (action === 'minimize') {
                if (this.disableMinimize) return;
                this.minimize();
            } else {
                if (this.disableMaximize) return;
                this.toggleMaximize();
            }
        };

        const getTargetElement = (event: Event): HTMLElement | null => {
            const raw = event.target;
            if (raw instanceof HTMLElement) return raw;
            if (raw instanceof Node) return raw.parentElement;
            return null;
        };

        const beginDrag = (event: MouseEvent | PointerEvent) => {
            if (this.isMinimized) return;

            const targetElement = getTargetElement(event);
            const header = targetElement?.closest('.draggable-header') as HTMLElement | null;
            if (!header || !windowEl.contains(header)) return;

            if (
                targetElement?.closest(
                    'button, a, input, select, textarea, [role="button"], [data-action], [data-dialog-action]'
                )
            ) {
                return;
            }

            // Embedded browsers can miss native dblclick on custom draggable headers.
            // Handle it early via mousedown detail as a robust fallback.
            if (event instanceof MouseEvent && event.detail >= 2) {
                lastHandledHeaderDoubleClickAt = Date.now();
                executeHeaderDoubleClickAction();
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            if ('pointerId' in event) {
                if (!event.isPrimary || event.button !== 0) return;
            } else if (activePointerId !== null) {
                return;
            }

            this.bringToFront();
            event.preventDefault();

            // Restore from maximized state if needed before calculating offsets.
            // When dragging a maximized window, restore it first so offsets are correct.
            if (this.isMaximized) {
                this.toggleMaximize();
            }

            if (windowEl.dataset.snapped === 'left' || windowEl.dataset.snapped === 'right') {
                const restoreLeft = Number.parseFloat(windowEl.dataset.prevSnapLeft || '');
                const restoreTop = Number.parseFloat(windowEl.dataset.prevSnapTop || '');
                const restoreWidth = Number.parseFloat(windowEl.dataset.prevSnapWidth || '');
                const restoreHeight = Number.parseFloat(windowEl.dataset.prevSnapHeight || '');

                if (
                    Number.isFinite(restoreLeft) &&
                    Number.isFinite(restoreTop) &&
                    Number.isFinite(restoreWidth) &&
                    Number.isFinite(restoreHeight)
                ) {
                    windowEl.style.minWidth = '';
                    windowEl.style.minHeight = '';
                    windowEl.style.maxWidth = '';
                    windowEl.style.maxHeight = '';
                    windowEl.style.position = 'fixed';
                    windowEl.style.left = `${Math.round(restoreLeft)}px`;
                    windowEl.style.top = `${Math.round(restoreTop)}px`;
                    windowEl.style.width = `${Math.round(restoreWidth)}px`;
                    windowEl.style.height = `${Math.round(restoreHeight)}px`;
                    this.position.x = Math.round(restoreLeft);
                    this.position.y = Math.round(restoreTop);
                    this.position.width = Math.round(restoreWidth);
                    this.position.height = Math.round(restoreHeight);
                }

                delete windowEl.dataset.snapped;
                delete windowEl.dataset.prevSnapLeft;
                delete windowEl.dataset.prevSnapTop;
                delete windowEl.dataset.prevSnapWidth;
                delete windowEl.dataset.prevSnapHeight;
            }

            const rect = windowEl.getBoundingClientRect();
            pointerScale = detectClientCoordinateScale(event.clientX, event.clientY, rect);
            const pointerX = toLogicalClientPx(event.clientX, pointerScale);
            const pointerY = toLogicalClientPx(event.clientY, pointerScale);
            offsetX = pointerX - resolveElementLogicalPx(windowEl, 'left', rect.left);
            offsetY = pointerY - resolveElementLogicalPx(windowEl, 'top', rect.top);
            isDragging = true;
            windowEl.style.position = 'fixed';

            if ('pointerId' in event) {
                activePointerId = event.pointerId;
                captureHeader = header;
                try {
                    header.setPointerCapture(event.pointerId);
                } catch {
                    // Ignore capture failures in embedded browser variants.
                }
            }

            stopSelection = e => e.preventDefault();
            document.addEventListener('selectstart', stopSelection, true);
            document.body.classList.add('window-dragging');
            const selection = window.getSelection?.();
            if (selection && selection.rangeCount > 0) {
                selection.removeAllRanges();
            }
        };

        const updateDrag = (clientX: number, clientY: number) => {
            if (!isDragging) return;

            const pointerX = toLogicalClientPx(clientX, pointerScale);
            const pointerY = toLogicalClientPx(clientY, pointerScale);
            const minTop = Math.max(0, Math.round(toLogicalPx(window.getMenuBarBottom?.() || 0)));
            const rect = windowEl.getBoundingClientRect();
            const logicalWidth = resolveElementLogicalPx(windowEl, 'width', rect.width);
            const logicalHeight = resolveElementLogicalPx(windowEl, 'height', rect.height);
            const maxLeft = Math.max(0, getLogicalViewportWidth() - logicalWidth);
            const maxBottom = Math.max(0, Math.round(getDockReservedBottom()));
            const viewportLogicalHeight = getLogicalViewportHeight();
            const nextLeft = Math.max(0, Math.min(maxLeft, pointerX - offsetX));
            const unclampedTop = pointerY - offsetY;
            // If the window is taller than the available viewport slot, do not hard-clamp to maxTop.
            // Otherwise vertical dragging can get stuck right below the menu bar.
            const canFullyFitVertically =
                logicalHeight + minTop + maxBottom <= viewportLogicalHeight;
            const nextTop = canFullyFitVertically
                ? Math.max(
                      minTop,
                      Math.min(viewportLogicalHeight - logicalHeight - maxBottom, unclampedTop)
                  )
                : Math.max(minTop, unclampedTop);
            lastPointerXRendered = toRenderedClientPx(clientX, pointerScale);
            lastPointerYLogical = pointerY;

            windowEl.style.position = 'fixed';
            windowEl.style.left = `${Math.round(nextLeft)}px`;
            windowEl.style.top = `${Math.round(nextTop)}px`;
            this.position.x = Math.round(nextLeft);
            this.position.y = Math.round(nextTop);

            const candidate = getSnapCandidate(windowEl, lastPointerXRendered);
            if (candidate) window.showSnapPreview?.(candidate);
            else window.hideSnapPreview?.();
        };

        const endDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            document.body.classList.remove('window-dragging');

            if (stopSelection) {
                document.removeEventListener('selectstart', stopSelection, true);
                stopSelection = null;
            }

            if (activePointerId !== null && captureHeader?.hasPointerCapture?.(activePointerId)) {
                try {
                    captureHeader.releasePointerCapture(activePointerId);
                } catch {
                    // Ignore capture release failures.
                }
            }
            activePointerId = null;
            captureHeader = null;
            pointerScale = 1;

            const menuTop = Math.max(0, Math.round(toLogicalPx(window.getMenuBarBottom?.() || 0)));
            const topFillThreshold = 18;
            const droppedAtTop =
                typeof lastPointerYLogical === 'number' &&
                lastPointerYLogical <= menuTop + topFillThreshold;

            if (droppedAtTop && !this.disableMaximize && !this.isMaximized) {
                window.hideSnapPreview?.();
                this.toggleMaximize();
                lastPointerXRendered = null;
                lastPointerYLogical = null;
                return;
            }

            const candidate = getSnapCandidate(windowEl, lastPointerXRendered);
            if (candidate) {
                snapToSide(candidate);
            }
            window.hideSnapPreview?.();
            lastPointerXRendered = null;
            lastPointerYLogical = null;

            const saveState = (this as unknown as { _saveState?: () => void })._saveState;
            if (typeof saveState === 'function') {
                saveState.call(this);
            }
        };

        windowEl.addEventListener('pointerdown', beginDrag);
        windowEl.addEventListener('mousedown', beginDrag);

        window.addEventListener('pointermove', event => {
            if (!isDragging) return;
            if (activePointerId !== null && event.pointerId !== activePointerId) return;
            updateDrag(event.clientX, event.clientY);
        });

        window.addEventListener('mousemove', event => {
            if (!isDragging || activePointerId !== null) return;
            updateDrag(event.clientX, event.clientY);
        });

        window.addEventListener('pointerup', event => {
            if (activePointerId !== null && event.pointerId !== activePointerId) return;
            endDrag();
        });
        window.addEventListener('pointercancel', endDrag);
        window.addEventListener('mouseup', () => {
            if (activePointerId === null) endDrag();
        });
        window.addEventListener('blur', endDrag);

        windowEl.addEventListener('dblclick', event => {
            if (Date.now() - lastHandledHeaderDoubleClickAt < 400) {
                return;
            }

            const targetElement = getTargetElement(event);
            const header = targetElement?.closest('.draggable-header') as HTMLElement | null;
            if (!header || !windowEl.contains(header)) return;

            if (
                targetElement?.closest(
                    'button, a, input, select, textarea, [role="button"], [data-action], [data-dialog-action]'
                )
            ) {
                return;
            }

            executeHeaderDoubleClickAction();
            event.preventDefault();
        });
    }

    /**
     * Static factory: Create and register Settings window
     */
    static create(config?: Partial<WindowConfig>): SettingsWindow {
        const instance = new SettingsWindow(config);
        return showAndRegisterWindow(instance);
    }

    /**
     * Static helper: Focus or create Settings window (idempotent)
     */
    static focusOrCreate(config?: Partial<WindowConfig>): SettingsWindow {
        return focusOrCreateWindowByType<SettingsWindow>({
            type: 'settings',
            create: () => SettingsWindow.create(config),
        });
    }
}

window.SettingsWindow = SettingsWindow;
