console.log('WindowManager loaded');

/**
 * WindowManager - Zentrale Verwaltung für alle Fenster/Modals
 * 
 * Vorteile:
 * - Neue Fenster können sich selbst registrieren
 * - Alle Fenster-Metadaten an einem Ort
 * - Keine hart-kodierten Arrays mehr
 * - Einfache Erweiterbarkeit für neue Features
 */
(function () {
    'use strict';

    const windowRegistry = new Map();
    let baseZIndex = 1000;
    let topZIndex = 1000;

    // Window-Konfiguration
    class WindowConfig {
        constructor(options) {
            this.id = options.id;
            this.type = options.type || 'persistent'; // 'persistent' oder 'transient'
            this.programKey = options.programKey || 'programs.default';
            this.icon = options.icon || './img/sucher.png';
            this.closeButtonId = options.closeButtonId || null;
            this.dialogInstance = null;
            this.metadata = options.metadata || {};
        }

        isTransient() {
            return this.type === 'transient';
        }

        getProgramInfo() {
            const i18n = window.appI18n;
            const translate = i18n?.translate || ((key) => key);

            const aboutFields = ['name', 'tagline', 'version', 'copyright'];
            const info = {
                modalId: this.id,
                programLabel: translate(`${this.programKey}.label`),
                infoLabel: translate(`${this.programKey}.infoLabel`),
                fallbackInfoModalId: this.metadata.fallbackInfoModalId || 'program-info-modal',
                icon: this.icon,
                about: {}
            };

            aboutFields.forEach((field) => {
                info.about[field] = translate(`${this.programKey}.about.${field}`);
            });

            return info;
        }
    }

    const WindowManager = {
        /**
         * Registriert ein neues Fenster im System
         */
        register(config) {
            const windowConfig = new WindowConfig(config);
            windowRegistry.set(config.id, windowConfig);
            return windowConfig;
        },

        /**
         * Registriert mehrere Fenster auf einmal
         */
        registerAll(configs) {
            configs.forEach(config => this.register(config));
        },

        /**
         * Gibt die Konfiguration eines Fensters zurück
         */
        getConfig(windowId) {
            return windowRegistry.get(windowId) || null;
        },

        /**
         * Gibt alle registrierten Fenster-IDs zurück
         */
        getAllWindowIds() {
            return Array.from(windowRegistry.keys());
        },

        /**
         * Gibt alle persistenten Fenster zurück
         */
        getPersistentWindowIds() {
            return this.getAllWindowIds().filter(id => {
                const config = this.getConfig(id);
                return config && !config.isTransient();
            });
        },

        /**
         * Gibt alle transienten Fenster zurück
         */
        getTransientWindowIds() {
            return this.getAllWindowIds().filter(id => {
                const config = this.getConfig(id);
                return config && config.isTransient();
            });
        },

        /**
         * Setzt die Dialog-Instanz für ein Fenster
         */
        setDialogInstance(windowId, instance) {
            const config = this.getConfig(windowId);
            if (config) {
                config.dialogInstance = instance;
            }
        },

        /**
         * Gibt die Dialog-Instanz eines Fensters zurück
         */
        getDialogInstance(windowId) {
            const config = this.getConfig(windowId);
            return config?.dialogInstance || null;
        },

        /**
         * Gibt alle Dialog-Instanzen zurück
         */
        getAllDialogInstances() {
            const dialogs = {};
            windowRegistry.forEach((config, id) => {
                if (config.dialogInstance) {
                    dialogs[id] = config.dialogInstance;
                }
            });
            return dialogs;
        },

        /**
         * Gibt das oberste sichtbare Fenster zurück
         */
        getTopWindow() {
            let topModal = null;
            let highestZ = 0;

            this.getAllWindowIds().forEach(id => {
                const modal = document.getElementById(id);
                if (modal && !modal.classList.contains("hidden")) {
                    const zIndex = parseInt(getComputedStyle(modal).zIndex, 10) || 0;
                    if (zIndex > highestZ) {
                        highestZ = zIndex;
                        topModal = modal;
                    }
                }
            });

            return topModal;
        },

        /**
         * Bringt ein Fenster in den Vordergrund
         */
        bringToFront(windowId) {
            const instance = this.getDialogInstance(windowId);
            if (instance && typeof instance.bringToFront === 'function') {
                instance.bringToFront();
            } else {
                console.warn(`Keine Dialog-Instanz für ${windowId} gefunden.`);
            }
        },

        /**
         * Öffnet ein Fenster
         */
        open(windowId) {
            const instance = this.getDialogInstance(windowId);
            if (instance && typeof instance.open === 'function') {
                instance.open();
            } else {
                const modal = document.getElementById(windowId);
                if (modal) {
                    modal.classList.remove('hidden');
                    this.bringToFront(windowId);
                }
            }
        },

        /**
         * Schließt ein Fenster
         */
        close(windowId) {
            const instance = this.getDialogInstance(windowId);
            if (instance && typeof instance.close === 'function') {
                instance.close();
            } else {
                const modal = document.getElementById(windowId);
                if (modal) {
                    modal.classList.add('hidden');
                }
            }
        },

        /**
         * Z-Index Management
         */
        getNextZIndex() {
            topZIndex++;
            return topZIndex;
        },

        syncZIndexWithDOM() {
            let maxZ = baseZIndex;

            this.getAllWindowIds().forEach(id => {
                const modal = document.getElementById(id);
                if (!modal) return;

                const modalZ = parseInt(window.getComputedStyle(modal).zIndex, 10);
                if (!Number.isNaN(modalZ)) {
                    maxZ = Math.max(maxZ, modalZ);
                }

                const windowEl = this.getDialogWindowElement(modal);
                if (windowEl) {
                    const contentZ = parseInt(window.getComputedStyle(windowEl).zIndex, 10);
                    if (!Number.isNaN(contentZ)) {
                        maxZ = Math.max(maxZ, contentZ);
                    }
                }
            });

            topZIndex = maxZ;
            return maxZ;
        },

        getDialogWindowElement(modal) {
            if (!modal) return null;
            return modal.querySelector('.autopointer') || modal;
        },

        /**
         * Gibt Program-Info für ein Fenster zurück
         */
        getProgramInfo(windowId) {
            const config = this.getConfig(windowId);
            if (config) {
                return config.getProgramInfo();
            }

            // Fallback für nicht-registrierte Fenster
            return this.getDefaultProgramInfo();
        },

        getDefaultProgramInfo() {
            const i18n = window.appI18n;
            const translate = i18n?.translate || ((key) => key);
            const programKey = 'programs.default';

            return {
                modalId: null,
                programLabel: translate(`${programKey}.label`),
                infoLabel: translate(`${programKey}.infoLabel`),
                fallbackInfoModalId: 'program-info-modal',
                icon: './img/sucher.png',
                about: {
                    name: translate(`${programKey}.about.name`),
                    tagline: translate(`${programKey}.about.tagline`),
                    version: translate(`${programKey}.about.version`),
                    copyright: translate(`${programKey}.about.copyright`)
                }
            };
        },

        // Expose internal state für Migration
        get topZIndex() {
            return topZIndex;
        },

        set topZIndex(value) {
            topZIndex = value;
        },

        get baseZIndex() {
            return baseZIndex;
        }
    };

    // Globaler Export
    window.WindowManager = WindowManager;

    // Legacy-Kompatibilität
    Object.defineProperty(window, 'topZIndex', {
        get: () => WindowManager.topZIndex,
        set: (value) => { WindowManager.topZIndex = value; }
    });

})();
