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
                iframeUrl: './settings.html'
            }
        },
        {
            id: 'text-modal',
            type: 'persistent',
            programKey: 'programs.text',
            icon: './img/notepad.png',
            closeButtonId: 'close-text-modal',
            metadata: {
                iframeUrl: './text.html'
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
