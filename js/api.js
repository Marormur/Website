console.log('API loaded');

/**
 * API - Zentrale Schnittstelle zu allen Modulen
 * 
 * Vorteile:
 * - Keine vielen einzelnen Wrapper-Funktionen mehr
 * - Konsistenter Zugriff auf alle Module
 * - Einfache Fehlerbehandlung
 * - Auto-Completion in modernen IDEs
 * 
 * Verwendung:
 * API.theme.setPreference('dark')
 * API.window.open('finder-modal')
 * API.dock.getMagnification()
 */
(function () {
    'use strict';

    /**
     * Safe Module Proxy - ruft Modul-Funktionen nur auf wenn sie existieren
     */
    function createModuleProxy(moduleName, methods) {
        const proxy = {};

        methods.forEach(method => {
            proxy[method] = function (...args) {
                const module = window[moduleName];
                if (module && typeof module[method] === 'function') {
                    return module[method](...args);
                }
                console.warn(`${moduleName}.${method} ist nicht verfügbar`);
                return undefined;
            };
        });

        return proxy;
    }

    const API = {
        // Theme-System
        theme: createModuleProxy('ThemeSystem', [
            'setThemePreference',
            'getThemePreference',
            'applyTheme',
            'initTheme'
        ]),

        // Icon-System
        icon: createModuleProxy('IconSystem', [
            'ensureSvgNamespace',
            'getMenuIconSvg',
            'renderIconIntoElement'
        ]),

        // Dock-System
        dock: createModuleProxy('DockSystem', [
            'getDockReservedBottom',
            'initDockMagnification',
            'updateDockIndicators'
        ]),

        // Menu-System
        menu: createModuleProxy('MenuSystem', [
            'renderApplicationMenu',
            'handleMenuActionActivation',
            'registerMenuAction',
            'hideMenuDropdowns',
            'toggleMenuDropdown',
            'isAnyDropdownOpen'
        ]),

        // Desktop-System
        desktop: createModuleProxy('DesktopSystem', [
            'initDesktop',
            'openDesktopItemById'
        ]),

        // System-UI (WiFi, Bluetooth, etc.)
        system: createModuleProxy('SystemUI', [
            'initSystemStatusControls',
            'updateAllSystemStatusUI',
            'handleSystemToggle',
            'setConnectedNetwork',
            'setBluetoothDevice',
            'setAudioDevice'
        ]),

        // Storage & Persistence
        storage: createModuleProxy('StorageSystem', [
            'readFinderState',
            'writeFinderState',
            'clearFinderState',
            'saveOpenModals',
            'restoreOpenModals',
            'saveWindowPositions',
            'restoreWindowPositions',
            'resetWindowLayout',
            'getDialogWindowElement'
        ]),

        // Finder
        finder: createModuleProxy('FinderSystem', [
            'init',
            'openFinder',
            'closeFinder'
        ]),

        // Text Editor
        textEditor: {
            init: (container) => window.TextEditorSystem?.init(container),
            loadRemoteFile: (payload) => window.TextEditorSystem?.loadRemoteFile(payload),
            showLoading: (payload) => window.TextEditorSystem?.showLoading(payload),
            showLoadError: (payload) => window.TextEditorSystem?.showLoadError(payload),
            clearEditor: () => window.TextEditorSystem?.clearEditor(),
            saveFile: () => window.TextEditorSystem?.saveFile(),
            openFile: () => window.TextEditorSystem?.openFile(),
            handleMenuAction: (action) => window.TextEditorSystem?.handleMenuAction(action)
        },

        // Settings
        settings: {
            init: (container) => window.SettingsSystem?.init(container),
            showSection: (section) => window.SettingsSystem?.showSection(section),
            syncThemePreference: () => window.SettingsSystem?.syncThemePreference(),
            syncLanguagePreference: () => window.SettingsSystem?.syncLanguagePreference()
        },

        // Window-Manager
        window: {
            register: (config) => window.WindowManager?.register(config),
            registerAll: (configs) => window.WindowManager?.registerAll(configs),
            getConfig: (id) => window.WindowManager?.getConfig(id),
            open: (id) => window.WindowManager?.open(id),
            close: (id) => window.WindowManager?.close(id),
            bringToFront: (id) => window.WindowManager?.bringToFront(id),
            getTopWindow: () => window.WindowManager?.getTopWindow(),
            getProgramInfo: (id) => window.WindowManager?.getProgramInfo(id),
            getAllWindowIds: () => window.WindowManager?.getAllWindowIds() || [],
            getPersistentWindowIds: () => window.WindowManager?.getPersistentWindowIds() || [],
            getDialogInstance: (id) => window.WindowManager?.getDialogInstance(id),
            syncZIndexWithDOM: () => window.WindowManager?.syncZIndexWithDOM()
        },

        // Action-Bus
        action: {
            register: (name, handler) => window.ActionBus?.register(name, handler),
            registerAll: (actions) => window.ActionBus?.registerAll(actions),
            execute: (name, params, element) => window.ActionBus?.execute(name, params, element)
        },

        // I18n
        i18n: {
            translate: (key, fallback) => {
                if (window.appI18n?.translate) {
                    const result = window.appI18n.translate(key);
                    return result === key && fallback ? fallback : result;
                }
                return fallback || key;
            },
            setLanguagePreference: (lang) => window.appI18n?.setLanguagePreference(lang),
            getLanguagePreference: () => window.appI18n?.getLanguagePreference() || 'system',
            getActiveLanguage: () => window.appI18n?.getActiveLanguage() || 'en',
            applyTranslations: () => window.appI18n?.applyTranslations()
        },

        // Helper-Funktionen die in app.js bleiben
        helpers: {
            getMenuBarBottom: () => {
                const header = document.querySelector('body > header');
                if (!header) return 0;
                return header.getBoundingClientRect().bottom;
            },

            clampWindowToMenuBar: (target) => {
                if (window.clampWindowToMenuBar) {
                    return window.clampWindowToMenuBar(target);
                }
            },

            computeSnapMetrics: (side) => {
                if (window.computeSnapMetrics) {
                    return window.computeSnapMetrics(side);
                }
            },

            showSnapPreview: (side) => {
                if (window.showSnapPreview) {
                    window.showSnapPreview(side);
                }
            },

            hideSnapPreview: () => {
                if (window.hideSnapPreview) {
                    window.hideSnapPreview();
                }
            }
        }
    };

    // Globaler Export
    window.API = API;

    // Legacy-Kompatibilität - erstelle globale Funktionen die API verwenden
    // Damit alter Code weiter funktioniert
    const createLegacyWrapper = (apiPath) => {
        return function (...args) {
            const parts = apiPath.split('.');
            let fn = API;
            for (const part of parts) {
                fn = fn[part];
                if (!fn) {
                    console.warn(`Legacy wrapper: ${apiPath} nicht gefunden`);
                    return undefined;
                }
            }
            if (typeof fn === 'function') {
                return fn(...args);
            }
            return fn;
        };
    };

    // Theme
    window.setThemePreference = createLegacyWrapper('theme.setThemePreference');
    window.getThemePreference = createLegacyWrapper('theme.getThemePreference');

    // Icon
    window.ensureSvgNamespace = createLegacyWrapper('icon.ensureSvgNamespace');
    window.getMenuIconSvg = createLegacyWrapper('icon.getMenuIconSvg');
    window.renderIconIntoElement = createLegacyWrapper('icon.renderIconIntoElement');

    // Dock
    window.getDockReservedBottom = createLegacyWrapper('dock.getDockReservedBottom');
    window.initDockMagnification = createLegacyWrapper('dock.initDockMagnification');

    // Menu
    window.renderApplicationMenu = createLegacyWrapper('menu.renderApplicationMenu');
    window.handleMenuActionActivation = createLegacyWrapper('menu.handleMenuActionActivation');

    // Desktop
    window.initDesktop = createLegacyWrapper('desktop.initDesktop');
    window.openDesktopItemById = createLegacyWrapper('desktop.openDesktopItemById');

    // System
    window.initSystemStatusControls = createLegacyWrapper('system.initSystemStatusControls');
    window.updateAllSystemStatusUI = createLegacyWrapper('system.updateAllSystemStatusUI');
    window.handleSystemToggle = createLegacyWrapper('system.handleSystemToggle');
    window.setConnectedNetwork = createLegacyWrapper('system.setConnectedNetwork');
    window.setBluetoothDevice = createLegacyWrapper('system.setBluetoothDevice');
    window.setAudioDevice = createLegacyWrapper('system.setAudioDevice');

    // Storage
    window.readFinderState = createLegacyWrapper('storage.readFinderState');
    window.writeFinderState = createLegacyWrapper('storage.writeFinderState');
    window.clearFinderState = createLegacyWrapper('storage.clearFinderState');
    window.saveOpenModals = createLegacyWrapper('storage.saveOpenModals');
    window.restoreOpenModals = createLegacyWrapper('storage.restoreOpenModals');
    window.saveWindowPositions = createLegacyWrapper('storage.saveWindowPositions');
    window.restoreWindowPositions = createLegacyWrapper('storage.restoreWindowPositions');
    window.resetWindowLayout = createLegacyWrapper('storage.resetWindowLayout');

})();
