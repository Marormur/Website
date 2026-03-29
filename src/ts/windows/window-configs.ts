import logger from '../core/logger.js';
import { WINDOW_ICONS } from './window-icons.js';
/*
 * src/ts/window-configs.ts
 * Single source of truth for all window/modal definitions.
 * Replaces legacy src/ts/legacy/window-configs.js
 */

type WindowType = 'persistent' | 'transient';

export interface WindowConfiguration {
    id: string;
    type: WindowType;
    programKey: string; // i18n key root for program label
    icon: string;
    closeButtonId: string | null;
    // Use a broad shape to align with WindowManager expectations
    metadata?: Record<string, unknown>;
}

declare global {
    interface Window {
        windowConfigurations?: WindowConfiguration[];
    }
}

// Build the configurations list. Keep order stable; WindowManager load order matters.
export const windowConfigurations: WindowConfiguration[] = [
    {
        id: 'launchpad-modal',
        type: 'persistent',
        programKey: 'programs.launchpad',
        icon: WINDOW_ICONS.launchpad,
        closeButtonId: 'close-launchpad-modal',
        metadata: {
            // Launchpad darf seinen initHandler auch während der Session-Restore-Phase ausführen,
            // damit das Grid direkt verfügbar ist (Tests klicken oft sehr früh).
            runInitDuringRestore: true,
            skipMenubarUpdate: true,
            initHandler: function () {
                // Initialize Launchpad module if not already
                if (window.LaunchpadSystem && !window.LaunchpadSystem?.container) {
                    const container = document.getElementById('launchpad-container');
                    if (container) window.LaunchpadSystem.init?.(container);
                }
                // Refresh apps when opening
                if (window.LaunchpadSystem?.refresh) window.LaunchpadSystem.refresh();
            },
        },
    },
    {
        id: 'projects-modal',
        type: 'persistent',
        programKey: 'programs.projects',
        icon: WINDOW_ICONS.finder,
        closeButtonId: 'close-projects-modal',
    },
    {
        id: 'about-modal',
        type: 'persistent',
        programKey: 'programs.about',
        icon: WINDOW_ICONS.profile,
        closeButtonId: 'close-about-modal',
    },
    {
        id: 'settings-modal',
        type: 'persistent',
        programKey: 'programs.settings',
        icon: WINDOW_ICONS.settings,
        closeButtonId: 'close-settings-modal',
        metadata: {
            initHandler: function () {
                if (window.SettingsSystem && !window.SettingsSystem?.container) {
                    const container = document.getElementById('settings-container');
                    if (container) window.SettingsSystem.init?.(container);
                }
            },
        },
    },
    {
        id: 'text-modal',
        type: 'persistent',
        programKey: 'programs.text',
        icon: WINDOW_ICONS.textEditor,
        closeButtonId: 'close-text-modal',
        metadata: {
            initHandler: function () {
                // Primary: Create first TextEditor instance when modal opens if none exist
                if (
                    window.TextEditorInstanceManager &&
                    !window.TextEditorInstanceManager.hasInstances()
                ) {
                    window.TextEditorInstanceManager.createInstance({
                        title: 'Neues Dokument',
                    });
                }
            },
        },
    },
    {
        id: 'preview-modal',
        type: 'persistent',
        programKey: 'programs.preview',
        icon: WINDOW_ICONS.preview,
        closeButtonId: null,
        metadata: {
            initHandler: function () {
                window.PreviewWindow?.focusOrCreate?.();
            },
        },
    },
    {
        id: 'image-modal',
        // Legacy key for Photos app; handled by PhotosWindow (no static modal in index.html).
        type: 'transient',
        programKey: 'programs.photos',
        icon: WINDOW_ICONS.photos,
        closeButtonId: null,
        metadata: {
            initHandler: function () {
                // Route to PhotosWindow if a caller still opens via legacy key.
                window.PhotosWindow?.focusOrCreate?.();
            },
        },
    },
    {
        id: 'program-info-modal',
        type: 'transient',
        programKey: 'programs.default',
        icon: WINDOW_ICONS.default,
        closeButtonId: 'close-program-info-modal',
    },
];

// Auto-register with WindowManager when available (module load time)
if (window.WindowManager) {
    window.WindowManager.registerAll(windowConfigurations);
    logger.debug('WINDOW', `[WindowConfigs] Registered ${windowConfigurations.length} windows`);
} else {
    // Fallback: register after DOMContentLoaded if WindowManager loads later
    document.addEventListener('DOMContentLoaded', () => {
        if (window.WindowManager) {
            window.WindowManager.registerAll(windowConfigurations);
            logger.debug(
                'WINDOW',
                `[WindowConfigs] Registered ${windowConfigurations.length} windows (delayed)`
            );
        }
    });
}

// Expose configs for diagnostics and external tools
window.windowConfigurations = windowConfigurations;

export default windowConfigurations;
