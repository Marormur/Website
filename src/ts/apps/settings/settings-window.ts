import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import {
    focusOrCreateWindowByType,
    showAndRegisterWindow,
} from '../../framework/controls/window-lifecycle.js';
import logger from '../../core/logger.js';

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
        let stopSelection: ((event: Event) => void) | null = null;
        let lastHandledHeaderDoubleClickAt = 0;

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

            const rect = windowEl.getBoundingClientRect();
            offsetX = event.clientX - rect.left;
            offsetY = event.clientY - rect.top;
            isDragging = true;

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

            const minTop = Math.max(0, Math.round(window.getMenuBarBottom?.() || 0));
            const rect = windowEl.getBoundingClientRect();
            const maxLeft = Math.max(0, window.innerWidth - rect.width);
            const nextLeft = Math.max(0, Math.min(maxLeft, clientX - offsetX));
            const nextTop = Math.max(minTop, clientY - offsetY);

            windowEl.style.position = 'fixed';
            windowEl.style.left = `${Math.round(nextLeft)}px`;
            windowEl.style.top = `${Math.round(nextTop)}px`;
            this.position.x = Math.round(nextLeft);
            this.position.y = Math.round(nextTop);
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
