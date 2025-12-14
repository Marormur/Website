'use strict';
/**
 * WindowManager - Central registry for windows/modals with z-index and program metadata (TypeScript).
 * Mirrors js/window-manager.js behavior while adding types and preserving global API.
 */
Object.defineProperty(exports, '__esModule', { value: true });
const z_index_manager_js_1 = require('./z-index-manager.js');
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
            const translate = i18n?.translate || (key => key);
            const aboutFields = ['name', 'tagline', 'version', 'copyright'];
            const info = {
                modalId: this.id,
                programLabel: translate(`${this.programKey}.label`),
                infoLabel: translate(`${this.programKey}.infoLabel`),
                fallbackInfoModalId: this.metadata.fallbackInfoModalId || 'program-info-modal',
                icon: this.icon,
                about: {},
            };
            aboutFields.forEach(field => {
                info.about[field] = translate(`${this.programKey}.about.${field}`);
            });
            return info;
        }
    }
    const windowRegistry = new Map();
    const zIndexManager = (0, z_index_manager_js_1.getZIndexManager)();
    const WindowManager = {
        /**
         * Get current top z-index for synchronization
         */
        getTopZIndex() {
            return zIndexManager.getTopZIndex();
        },
        /**
         * Update top z-index from external source (e.g., WindowRegistry)
         */
        updateTopZIndex(newZIndex) {
            zIndexManager.ensureTopZIndex(newZIndex);
        },
        register(config) {
            const windowConfig = new WindowConfig(config);
            windowRegistry.set(config.id, windowConfig);
            return windowConfig;
        },
        registerAll(configs) {
            configs.forEach(c => this.register(c));
        },
        getConfig(windowId) {
            return windowRegistry.get(windowId) || null;
        },
        getAllWindowIds() {
            return Array.from(windowRegistry.keys());
        },
        getPersistentWindowIds() {
            return this.getAllWindowIds().filter(id => {
                const config = this.getConfig(id);
                return !!config && !config.isTransient();
            });
        },
        getTransientWindowIds() {
            return this.getAllWindowIds().filter(id => {
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
            return zIndexManager.getTopWindowElement();
        },
        bringToFront(windowId) {
            const instance = this.getDialogInstance(windowId);
            if (instance && typeof instance.bringToFront === 'function') {
                instance.bringToFront();
                return;
            }
            const modal = document.getElementById(windowId);
            if (!modal) {
                console.warn(`Keine Dialog-Instanz für ${windowId} gefunden.`);
                return;
            }
            const windowEl = this.getDialogWindowElement(modal);
            zIndexManager.bringToFront(windowId, modal, windowEl);
        },
        open(windowId) {
            const config = this.getConfig(windowId);
            // Run the configured initHandler on every open. Some windows rely on
            // per-open initialization (e.g., Finder multi-instance recreation).
            const g = window;
            const allowInitDuringRestore = !!(
                config?.metadata && config.metadata.runInitDuringRestore
            );
            if (
                config &&
                config.metadata &&
                typeof config.metadata.initHandler === 'function' &&
                (!g.__SESSION_RESTORE_IN_PROGRESS || allowInitDuringRestore)
            ) {
                try {
                    const md = config.metadata;
                    if (typeof md.initHandler === 'function') md.initHandler();
                } catch (e) {
                    console.warn(`Init handler for ${windowId} threw:`, e);
                }
            }
            const instance = this.getDialogInstance(windowId);
            if (instance && typeof instance.open === 'function') {
                instance.open();
            } else {
                const modal = document.getElementById(windowId);
                if (modal) {
                    const domUtils = window.DOMUtils;
                    if (domUtils && typeof domUtils.show === 'function') {
                        domUtils.show(modal);
                    } else {
                        modal.classList.remove('hidden');
                    }
                    this.bringToFront(windowId);
                }
            }
        },
        close(windowId) {
            const instance = this.getDialogInstance(windowId);
            if (instance && typeof instance.close === 'function') {
                instance.close();
            } else {
                const modal = document.getElementById(windowId);
                if (modal) {
                    const domUtils = window.DOMUtils;
                    if (domUtils && typeof domUtils.hide === 'function') {
                        domUtils.hide(modal);
                    } else {
                        modal.classList.add('hidden');
                    }
                }
            }
        },
        getNextZIndex() {
            return zIndexManager.bumpZIndex();
        },
        syncZIndexWithDOM() {
            return zIndexManager.syncFromDOM();
        },
        getDialogWindowElement(modal) {
            if (!modal) return null;
            return modal.querySelector('.autopointer') || modal;
        },
        getProgramInfo(windowId) {
            const config = this.getConfig(windowId);
            if (config) return config.getProgramInfo();
            return this.getDefaultProgramInfo();
        },
        getDefaultProgramInfo() {
            const w = window;
            const i18n = w['appI18n'] || undefined;
            const translate = i18n?.translate || (key => key);
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
            return zIndexManager.getTopZIndex();
        },
        set topZIndex(value) {
            zIndexManager.ensureTopZIndex(value);
        },
        get baseZIndex() {
            return z_index_manager_js_1.BASE_Z_INDEX;
        },
    };
    window.WindowManager = WindowManager;
    Object.defineProperty(window, 'topZIndex', {
        get: () => WindowManager.topZIndex,
        set: value => {
            WindowManager.topZIndex = value;
        },
    });
})();
//# sourceMappingURL=window-manager.js.map
