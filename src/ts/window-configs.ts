/*
 * src/ts/window-configs.ts
 * Single source of truth for all window/modal definitions.
 * Replaces legacy src/ts/legacy/window-configs.js
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

type WindowType = 'persistent' | 'transient';

export interface WindowConfiguration {
    id: string;
    type: WindowType;
    programKey: string; // i18n key root for program label
    icon: string;
    closeButtonId: string;
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
        id: 'finder-modal',
        type: 'persistent',
        programKey: 'programs.finder',
        icon: './img/sucher.png',
        closeButtonId: 'close-finder-modal',
        metadata: {
            initHandler: function () {
                // Do NOT auto-create Finder instances on init; just refresh UI if available
                try {
                    const integ = window.MultiInstanceIntegration?.getIntegration?.('finder');
                    integ?.tabManager?.controller?.refresh?.();
                } catch (e) {
                    console.warn('Finder init refresh failed:', e);
                }
            },
            openHandler: function () {
                // Do NOT auto-create Finder instances on open; only ensure active is shown
                try {
                    const activeId =
                        window.FinderInstanceManager?.getActiveInstance?.()?.instanceId;
                    if (activeId && window.MultiInstanceIntegration) {
                        window.MultiInstanceIntegration.showInstance?.('finder', activeId);
                        const integ = window.MultiInstanceIntegration.getIntegration?.('finder');
                        // Force tab UI refresh to ensure tab visibility
                        integ?.tabManager?.controller?.refresh?.();
                    }
                } catch (e) {
                    console.warn('Finder open refresh failed:', e);
                }
            },
        },
    },
    {
        id: 'launchpad-modal',
        type: 'persistent',
        programKey: 'programs.launchpad',
        icon: './img/launchpad.png',
        closeButtonId: 'close-launchpad-modal',
        metadata: {
            skipMenubarUpdate: true,
            initHandler: function () {
                // Initialize Launchpad module if not already
                if (window.LaunchpadSystem && !(window as any).LaunchpadSystem?.container) {
                    const container = document.getElementById('launchpad-container');
                    if (container) window.LaunchpadSystem.init(container);
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
        icon: './img/sucher.png',
        closeButtonId: 'close-projects-modal',
    },
    {
        id: 'about-modal',
        type: 'persistent',
        programKey: 'programs.about',
        icon: './img/profil.jpg',
        closeButtonId: 'close-about-modal',
    },
    {
        id: 'settings-modal',
        type: 'persistent',
        programKey: 'programs.settings',
        icon: './img/settings.png',
        closeButtonId: 'close-settings-modal',
        metadata: {
            initHandler: function () {
                if (window.SettingsSystem && !(window as any).SettingsSystem?.container) {
                    const container = document.getElementById('settings-container');
                    if (container) window.SettingsSystem.init(container);
                }
            },
        },
    },
    {
        id: 'text-modal',
        type: 'persistent',
        programKey: 'programs.text',
        icon: './img/notepad.png',
        closeButtonId: 'close-text-modal',
        metadata: {
            initHandler: function () {
                // Do NOT auto-create instances when multi-instance manager is available
                // Fallback legacy editor init only
                if (
                    !window.TextEditorInstanceManager &&
                    window.TextEditorSystem &&
                    !(window as any).TextEditorSystem?.container
                ) {
                    const container = document.getElementById('text-editor-container');
                    if (container) window.TextEditorSystem.init(container);
                }
            },
        },
    },
    {
        id: 'image-modal',
        type: 'persistent',
        programKey: 'programs.photos',
        icon: './img/photos-app-icon.svg',
        closeButtonId: 'close-image-modal',
        metadata: {
            initHandler: function () {
                if (window.PhotosApp?.init) window.PhotosApp.init();
            },
        },
    },
    {
        id: 'program-info-modal',
        type: 'transient',
        programKey: 'programs.default',
        icon: './img/sucher.png',
        closeButtonId: 'close-program-info-modal',
    },
    {
        id: 'terminal-modal',
        type: 'persistent',
        programKey: 'programs.terminal',
        icon: './img/terminal.png',
        closeButtonId: 'close-terminal-modal',
        metadata: {
            initHandler: function () {
                // Do NOT auto-create instances when multi-instance manager is available
                // Fallback legacy terminal init only
                if (
                    !window.TerminalInstanceManager &&
                    window.TerminalSystem &&
                    !(window as any).TerminalSystem?.container
                ) {
                    const container = document.getElementById('terminal-container');
                    if (container) window.TerminalSystem.init(container);
                }
            },
        },
    },
];

// Auto-register with WindowManager when available (module load time)
if (window.WindowManager) {
    window.WindowManager.registerAll(windowConfigurations);
    console.log(`[WindowConfigs] Registered ${windowConfigurations.length} windows`);
} else {
    // Fallback: register after DOMContentLoaded if WindowManager loads later
    document.addEventListener('DOMContentLoaded', () => {
        if (window.WindowManager) {
            window.WindowManager.registerAll(windowConfigurations);
            console.log(
                `[WindowConfigs] Registered ${windowConfigurations.length} windows (delayed)`
            );
        }
    });
}

// Expose configs for diagnostics and external tools
window.windowConfigurations = windowConfigurations;

export default windowConfigurations;
