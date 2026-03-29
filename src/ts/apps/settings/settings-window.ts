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

        return modal;
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
