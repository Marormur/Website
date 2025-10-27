"use strict";
console.log('API loaded');
(function () {
    'use strict';
    // Helper to safely access window properties
    function getWindowProp(propName) {
        return window[propName];
    }
    // Helper to call a method on a window property
    function callWindowMethod(objName, methodName, ...args) {
        const obj = getWindowProp(objName);
        if (obj && typeof obj[methodName] === 'function') {
            return obj[methodName](...args);
        }
        return undefined;
    }
    function createModuleProxy(moduleName, methods) {
        const proxy = {};
        methods.forEach((method) => {
            proxy[method] = function (...args) {
                const module = getWindowProp(moduleName);
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
        error: createModuleProxy('ErrorHandler', [
            'enable',
            'disable',
            'getLogs',
            'clearLogs',
            'exportLogs',
        ]),
        performance: createModuleProxy('PerfMonitor', [
            'enable',
            'disable',
            'toggle',
            'mark',
            'measure',
            'report',
        ]),
        theme: createModuleProxy('ThemeSystem', [
            'setThemePreference',
            'getThemePreference',
            'applyTheme',
            'initTheme',
        ]),
        icon: createModuleProxy('IconSystem', [
            'ensureSvgNamespace',
            'getMenuIconSvg',
            'renderIconIntoElement',
        ]),
        dock: createModuleProxy('DockSystem', [
            'getDockReservedBottom',
            'initDockMagnification',
            'updateDockIndicators',
        ]),
        menu: createModuleProxy('MenuSystem', [
            'renderApplicationMenu',
            'handleMenuActionActivation',
            'registerMenuAction',
            'hideMenuDropdowns',
            'toggleMenuDropdown',
            'isAnyDropdownOpen',
        ]),
        desktop: createModuleProxy('DesktopSystem', [
            'initDesktop',
            'openDesktopItemById',
        ]),
        system: createModuleProxy('SystemUI', [
            'initSystemStatusControls',
            'updateAllSystemStatusUI',
            'handleSystemToggle',
            'setConnectedNetwork',
            'setBluetoothDevice',
            'setAudioDevice',
        ]),
        storage: createModuleProxy('StorageSystem', [
            'readFinderState',
            'writeFinderState',
            'clearFinderState',
            'saveOpenModals',
            'restoreOpenModals',
            'saveWindowPositions',
            'restoreWindowPositions',
            'resetWindowLayout',
            'getDialogWindowElement',
        ]),
        finder: createModuleProxy('FinderSystem', ['init', 'openFinder', 'closeFinder']),
        textEditor: {
            init: (container) => callWindowMethod('TextEditorSystem', 'init', container),
            loadRemoteFile: (payload) => callWindowMethod('TextEditorSystem', 'loadRemoteFile', payload),
            showLoading: (payload) => callWindowMethod('TextEditorSystem', 'showLoading', payload),
            showLoadError: (payload) => callWindowMethod('TextEditorSystem', 'showLoadError', payload),
            clearEditor: () => callWindowMethod('TextEditorSystem', 'clearEditor'),
            saveFile: () => callWindowMethod('TextEditorSystem', 'saveFile'),
            openFile: () => callWindowMethod('TextEditorSystem', 'openFile'),
            handleMenuAction: (action) => callWindowMethod('TextEditorSystem', 'handleMenuAction', action),
        },
        settings: {
            init: (container) => callWindowMethod('SettingsSystem', 'init', container),
            showSection: (section) => callWindowMethod('SettingsSystem', 'showSection', section),
            syncThemePreference: () => callWindowMethod('SettingsSystem', 'syncThemePreference'),
            syncLanguagePreference: () => callWindowMethod('SettingsSystem', 'syncLanguagePreference'),
        },
        window: {
            register: (config) => callWindowMethod('WindowManager', 'register', config),
            registerAll: (configs) => callWindowMethod('WindowManager', 'registerAll', configs),
            getConfig: (id) => callWindowMethod('WindowManager', 'getConfig', id),
            open: (id) => callWindowMethod('WindowManager', 'open', id),
            close: (id) => callWindowMethod('WindowManager', 'close', id),
            bringToFront: (id) => callWindowMethod('WindowManager', 'bringToFront', id),
            getTopWindow: () => callWindowMethod('WindowManager', 'getTopWindow'),
            getProgramInfo: (id) => callWindowMethod('WindowManager', 'getProgramInfo', id),
            getAllWindowIds: () => callWindowMethod('WindowManager', 'getAllWindowIds') || [],
            getPersistentWindowIds: () => callWindowMethod('WindowManager', 'getPersistentWindowIds') || [],
            getDialogInstance: (id) => callWindowMethod('WindowManager', 'getDialogInstance', id),
            syncZIndexWithDOM: () => callWindowMethod('WindowManager', 'syncZIndexWithDOM'),
        },
        action: {
            register: (name, handler) => callWindowMethod('ActionBus', 'register', name, handler),
            registerAll: (actions) => callWindowMethod('ActionBus', 'registerAll', actions),
            execute: (name, params, element) => callWindowMethod('ActionBus', 'execute', name, params, element),
        },
        i18n: {
            translate: (key, fallback) => {
                const appI18n = getWindowProp('appI18n');
                if (appI18n && typeof appI18n['translate'] === 'function') {
                    const result = appI18n['translate'](key);
                    return result === key && fallback ? fallback : result;
                }
                return fallback || key;
            },
            setLanguagePreference: (lang) => callWindowMethod('appI18n', 'setLanguagePreference', lang),
            getLanguagePreference: () => callWindowMethod('appI18n', 'getLanguagePreference') || 'system',
            getActiveLanguage: () => callWindowMethod('appI18n', 'getActiveLanguage') || 'en',
            applyTranslations: () => callWindowMethod('appI18n', 'applyTranslations'),
        },
        helpers: {
            getMenuBarBottom: () => {
                const header = document.querySelector('body > header');
                if (!header)
                    return 0;
                return header.getBoundingClientRect().bottom;
            },
            clampWindowToMenuBar: (target) => {
                const fn = getWindowProp('clampWindowToMenuBar');
                if (typeof fn === 'function') {
                    return fn(target);
                }
                return undefined;
            },
            computeSnapMetrics: (side) => {
                const fn = getWindowProp('computeSnapMetrics');
                if (typeof fn === 'function') {
                    return fn(side);
                }
                return undefined;
            },
            showSnapPreview: (side) => {
                const fn = getWindowProp('showSnapPreview');
                if (typeof fn === 'function') {
                    fn(side);
                }
            },
            hideSnapPreview: () => {
                const fn = getWindowProp('hideSnapPreview');
                if (typeof fn === 'function') {
                    fn();
                }
            },
        },
    };
    window.API = API;
    // Legacy compatibility wrappers
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
    const w = window;
    // Theme
    w.setThemePreference = createLegacyWrapper('theme.setThemePreference');
    w.getThemePreference = createLegacyWrapper('theme.getThemePreference');
    // Icon
    w.ensureSvgNamespace = createLegacyWrapper('icon.ensureSvgNamespace');
    w.getMenuIconSvg = createLegacyWrapper('icon.getMenuIconSvg');
    w.renderIconIntoElement = createLegacyWrapper('icon.renderIconIntoElement');
    // Dock
    w.getDockReservedBottom = createLegacyWrapper('dock.getDockReservedBottom');
    w.initDockMagnification = createLegacyWrapper('dock.initDockMagnification');
    // Menu
    w.renderApplicationMenu = createLegacyWrapper('menu.renderApplicationMenu');
    w.handleMenuActionActivation = createLegacyWrapper('menu.handleMenuActionActivation');
    // Desktop
    w.initDesktop = createLegacyWrapper('desktop.initDesktop');
    w.openDesktopItemById = createLegacyWrapper('desktop.openDesktopItemById');
    // System
    w.initSystemStatusControls = createLegacyWrapper('system.initSystemStatusControls');
    w.updateAllSystemStatusUI = createLegacyWrapper('system.updateAllSystemStatusUI');
    w.handleSystemToggle = createLegacyWrapper('system.handleSystemToggle');
    w.setConnectedNetwork = createLegacyWrapper('system.setConnectedNetwork');
    w.setBluetoothDevice = createLegacyWrapper('system.setBluetoothDevice');
    w.setAudioDevice = createLegacyWrapper('system.setAudioDevice');
    // Storage
    w.readFinderState = createLegacyWrapper('storage.readFinderState');
    w.writeFinderState = createLegacyWrapper('storage.writeFinderState');
    w.clearFinderState = createLegacyWrapper('storage.clearFinderState');
    w.saveOpenModals = createLegacyWrapper('storage.saveOpenModals');
    w.restoreOpenModals = createLegacyWrapper('storage.restoreOpenModals');
    w.saveWindowPositions = createLegacyWrapper('storage.saveWindowPositions');
    w.restoreWindowPositions = createLegacyWrapper('storage.restoreWindowPositions');
    w.resetWindowLayout = createLegacyWrapper('storage.resetWindowLayout');
})();
//# sourceMappingURL=api.js.map