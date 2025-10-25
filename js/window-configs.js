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
            closeButtonId: 'close-finder-modal'
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
                }
            }
        },
        {
            id: 'projects-modal',
            type: 'persistent',
            programKey: 'programs.projects',
            icon: './img/sucher.png',
            closeButtonId: 'close-projects-modal'
        },
        {
            id: 'about-modal',
            type: 'persistent',
            programKey: 'programs.about',
            icon: './img/profil.jpg',
            closeButtonId: 'close-about-modal'
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
                }
            }
        },
        {
            id: 'text-modal',
            type: 'persistent',
            programKey: 'programs.text',
            icon: './img/notepad.png',
            closeButtonId: 'close-text-modal',
            metadata: {
                initHandler: function () {
                    // Initialize text editor module if not already done
                    if (window.TextEditorSystem && !window.TextEditorSystem.container) {
                        const container = document.getElementById('text-editor-container');
                        if (container) {
                            window.TextEditorSystem.init(container);
                        }
                    }
                }
            }
        },
        {
            id: 'image-modal',
            type: 'persistent',
            programKey: 'programs.image',
            icon: './img/imageviewer.png',
            closeButtonId: 'close-image-modal'
        },
        {
            id: 'program-info-modal',
            type: 'transient',
            programKey: 'programs.default',
            icon: './img/sucher.png',
            closeButtonId: 'close-program-info-modal'
        },
        {
            id: 'terminal-modal',
            type: 'persistent',
            programKey: 'programs.terminal',
            icon: './img/terminal.png',
            closeButtonId: 'close-terminal-modal',
            metadata: {
                initHandler: function () {
                    // Initialize terminal module if not already done
                    if (window.TerminalSystem && !window.TerminalSystem.container) {
                        const container = document.getElementById('terminal-container');
                        if (container) {
                            window.TerminalSystem.init(container);
                        }
                    }
                }
            }
        }
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
