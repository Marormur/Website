console.log('Window Configurations loaded');

/**
 * Window-Konfigurationen
 *
 * Hier werden alle Fenster/Modals definiert.
 * Um ein neues Fenster hinzuzufügen, einfach einen neuen Eintrag hier anlegen!
 */
(function () {
    'use strict';

    const windowConfigurations = [
        {
            id: 'finder-modal',
            type: 'persistent',
            programKey: 'programs.finder',
            icon: './img/sucher.png',
            closeButtonId: 'close-finder-modal',
            metadata: {
                initHandler: function () {
                    // Create first Finder instance when modal opens if none exist
                    if (
                        window.FinderInstanceManager &&
                        !window.FinderInstanceManager.hasInstances()
                    ) {
                        const inst = window.FinderInstanceManager.createInstance({
                            title: 'Finder',
                        });
                        // Ensure visibility and UI sync (tab bar + content) after fresh open
                        try {
                            const active =
                                inst && inst.instanceId
                                    ? inst
                                    : window.FinderInstanceManager.getActiveInstance?.();
                            if (active && window.MultiInstanceIntegration) {
                                // Show the active instance content
                                window.MultiInstanceIntegration.showInstance(
                                    'finder',
                                    active.instanceId
                                );
                                // If available, refresh the tab UI
                                const integ =
                                    window.MultiInstanceIntegration.getIntegration?.('finder');
                                integ?.tabManager?.addTab?.(active);

                                // Force tab UI refresh to ensure tab is rendered
                                if (integ?.tabManager?.controller?.refresh) {
                                    integ.tabManager.controller.refresh();
                                }
                            }
                        } catch (e) {
                            console.warn('Finder init post-create sync failed:', e);
                        }
                    }
                },
                openHandler: function () {
                    // On every open: ensure at least one Finder instance is available and visible
                    if (
                        window.FinderInstanceManager &&
                        !window.FinderInstanceManager.hasInstances()
                    ) {
                        const inst = window.FinderInstanceManager.createInstance({
                            title: 'Finder',
                        });
                        try {
                            const activeId =
                                (inst && inst.instanceId) ||
                                window.FinderInstanceManager.getActiveInstance?.()?.instanceId;
                            if (activeId && window.MultiInstanceIntegration) {
                                window.MultiInstanceIntegration.showInstance('finder', activeId);
                                const integ =
                                    window.MultiInstanceIntegration.getIntegration?.('finder');
                                if (
                                    integ &&
                                    integ.tabManager &&
                                    typeof integ.tabManager.addTab === 'function'
                                ) {
                                    integ.tabManager.addTab(inst || { instanceId: activeId });
                                }
                                // Force tab UI refresh to ensure tab is rendered
                                if (integ?.tabManager?.controller?.refresh) {
                                    integ.tabManager.controller.refresh();
                                }
                            }
                        } catch (e) {
                            console.warn('Finder open post-create sync failed:', e);
                        }
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
                skipMenubarUpdate: true, // Don't update menubar when launchpad is focused
                initHandler: function () {
                    // Initialize Launchpad module if not already done
                    if (window.LaunchpadSystem && !window.LaunchpadSystem.container) {
                        const container = document.getElementById('launchpad-container');
                        if (container) {
                            window.LaunchpadSystem.init(container);
                        }
                    }
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
                    // Initialize settings module if not already done
                    if (window.SettingsSystem && !window.SettingsSystem.container) {
                        const container = document.getElementById('settings-container');
                        if (container) {
                            window.SettingsSystem.init(container);
                        }
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
                    // Primary: Create first Text Editor instance when modal opens if none exist
                    if (
                        window.TextEditorInstanceManager &&
                        !window.TextEditorInstanceManager.hasInstances()
                    ) {
                        window.TextEditorInstanceManager.createInstance({
                            title: 'Editor',
                        });
                    }
                    // Fallback: Initialize old text editor module if instance manager not available
                    else if (window.TextEditorSystem && !window.TextEditorSystem.container) {
                        const container = document.getElementById('text-editor-container');
                        if (container) {
                            window.TextEditorSystem.init(container);
                        }
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
                    // Initialize Photos App when modal opens
                    if (window.PhotosApp && typeof window.PhotosApp.init === 'function') {
                        window.PhotosApp.init();
                    }
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
                    // Primary: Create first Terminal instance when modal opens if none exist
                    if (
                        window.TerminalInstanceManager &&
                        !window.TerminalInstanceManager.hasInstances()
                    ) {
                        window.TerminalInstanceManager.createInstance({
                            title: 'Terminal',
                        });
                    }
                    // Fallback: Initialize old terminal module if instance manager not available
                    else if (window.TerminalSystem && !window.TerminalSystem.container) {
                        const container = document.getElementById('terminal-container');
                        if (container) {
                            window.TerminalSystem.init(container);
                        }
                    }
                },
            },
        },
    ];

    // Automatisch alle Fenster registrieren wenn WindowManager verfügbar ist
    if (window.WindowManager) {
        window.WindowManager.registerAll(windowConfigurations);
        console.log(`Registered ${windowConfigurations.length} windows`);
    } else {
        // Fallback: Warte auf WindowManager
        document.addEventListener('DOMContentLoaded', () => {
            if (window.WindowManager) {
                window.WindowManager.registerAll(windowConfigurations);
                console.log(`Registered ${windowConfigurations.length} windows (delayed)`);
            }
        });
    }

    // Export für Zugriff von außen
    window.windowConfigurations = windowConfigurations;
})();
