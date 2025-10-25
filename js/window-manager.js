/**
 * WindowManager - Central registry for windows/modals with z-index and program metadata (TypeScript).
 * Mirrors js/window-manager.js behavior while adding types and preserving global API.
 */
(() => {
    'use strict';
    class WindowConfig {
        constructor(options) {
            this.id = options.id;
            this.type = options.type || 'persistent';
            this.programKey = options.programKey || 'programs.default';
            this.icon = options.icon || './img/sucher.png';
            this.closeButtonId = options.closeButtonId ?? null;
            this.dialogInstance = null;
            this.metadata = options.metadata || {};
        }
        isTransient() {
            return this.type === 'transient';
        }
        getProgramInfo() {
            const w = window;
            const i18n = w['appI18n'] || undefined;
            const translate = i18n?.translate || ((key) => key);
            const aboutFields = ['name', 'tagline', 'version', 'copyright'];
            const info = {
                modalId: this.id,
                programLabel: translate(`${this.programKey}.label`),
                infoLabel: translate(`${this.programKey}.infoLabel`),
                fallbackInfoModalId: this.metadata.fallbackInfoModalId || 'program-info-modal',
                icon: this.icon,
                about: {},
            };
            aboutFields.forEach((field) => {
                info.about[field] = translate(`${this.programKey}.about.${field}`);
            });
            return info;
        }
    }
    const windowRegistry = new Map();
    const baseZIndex = 1000;
    let topZIndex = 1000;
    const WindowManager = {
        register(config) {
            const windowConfig = new WindowConfig(config);
            windowRegistry.set(config.id, windowConfig);
            return windowConfig;
        },
        registerAll(configs) {
            configs.forEach((c) => this.register(c));
        },
        getConfig(windowId) {
            return windowRegistry.get(windowId) || null;
        },
        getAllWindowIds() {
            return Array.from(windowRegistry.keys());
        },
        getPersistentWindowIds() {
            return this.getAllWindowIds().filter((id) => {
                const config = this.getConfig(id);
                return !!config && !config.isTransient();
            });
        },
        getTransientWindowIds() {
            return this.getAllWindowIds().filter((id) => {
                const config = this.getConfig(id);
                return !!config && config.isTransient();
            });
        },
        setDialogInstance(windowId, instance) {
            const config = this.getConfig(windowId);
            if (config) {
                config.dialogInstance = instance;
            }
        },
        getDialogInstance(windowId) {
            const config = this.getConfig(windowId);
            return (config && config.dialogInstance) || null;
        },
        getAllDialogInstances() {
            const dialogs = {};
            windowRegistry.forEach((config, id) => {
                if (config.dialogInstance) {
                    dialogs[id] = config.dialogInstance;
                }
            });
            return dialogs;
        },
        getTopWindow() {
            let topModal = null;
            let highestZ = 0;
            this.getAllWindowIds().forEach((id) => {
                const modal = document.getElementById(id);
                if (modal && !modal.classList.contains('hidden')) {
                    const zIndex = parseInt(getComputedStyle(modal).zIndex, 10) || 0;
                    if (zIndex > highestZ) {
                        highestZ = zIndex;
                        topModal = modal;
                    }
                }
            });
            return topModal;
        },
        bringToFront(windowId) {
            const instance = this.getDialogInstance(windowId);
            if (instance && typeof instance.bringToFront === 'function') {
                instance.bringToFront();
            }
            else {
                console.warn(`Keine Dialog-Instanz für ${windowId} gefunden.`);
            }
        },
        open(windowId) {
            const config = this.getConfig(windowId);
            if (config && config.metadata && typeof config.metadata.initHandler === 'function') {
                try {
                    const md = config.metadata;
                    if (!md.__initialized) {
                        if (typeof md.initHandler === 'function') {
                            md.initHandler();
                        }
                        md.__initialized = true;
                    }
                }
                catch (e) {
                    console.warn(`Init handler for ${windowId} threw:`, e);
                }
            }
            const instance = this.getDialogInstance(windowId);
            if (instance && typeof instance.open === 'function') {
                instance.open();
            }
            else {
                const modal = document.getElementById(windowId);
                if (modal) {
                    modal.classList.remove('hidden');
                    this.bringToFront(windowId);
                }
            }
        },
        close(windowId) {
            const instance = this.getDialogInstance(windowId);
            if (instance && typeof instance.close === 'function') {
                instance.close();
            }
            else {
                const modal = document.getElementById(windowId);
                if (modal)
                    modal.classList.add('hidden');
            }
        },
        getNextZIndex() {
            topZIndex++;
            return topZIndex;
        },
        syncZIndexWithDOM() {
            let maxZ = baseZIndex;
            this.getAllWindowIds().forEach((id) => {
                const modal = document.getElementById(id);
                if (!modal)
                    return;
                const modalZ = parseInt(window.getComputedStyle(modal).zIndex, 10);
                if (!Number.isNaN(modalZ))
                    maxZ = Math.max(maxZ, modalZ);
                const windowEl = this.getDialogWindowElement(modal);
                if (windowEl) {
                    const contentZ = parseInt(window.getComputedStyle(windowEl).zIndex, 10);
                    if (!Number.isNaN(contentZ))
                        maxZ = Math.max(maxZ, contentZ);
                }
            });
            topZIndex = maxZ;
            return maxZ;
        },
        getDialogWindowElement(modal) {
            if (!modal)
                return null;
            return modal.querySelector('.autopointer') || modal;
        },
        getProgramInfo(windowId) {
            const config = this.getConfig(windowId);
            if (config)
                return config.getProgramInfo();
            return this.getDefaultProgramInfo();
        },
        getDefaultProgramInfo() {
            const w = window;
            const i18n = w['appI18n'] || undefined;
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
                    copyright: translate(`${programKey}.about.copyright`),
                },
            };
        },
        get topZIndex() {
            return topZIndex;
        },
        set topZIndex(value) {
            topZIndex = value;
        },
        get baseZIndex() {
            return baseZIndex;
        },
    };
    window.WindowManager = WindowManager;
    Object.defineProperty(window, 'topZIndex', {
        get: () => WindowManager.topZIndex,
        set: (value) => {
            WindowManager.topZIndex = value;
        },
    });
})();
//# sourceMappingURL=window-manager.js.map