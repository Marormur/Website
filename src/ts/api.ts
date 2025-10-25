console.log('API loaded');

(function () {
  'use strict';

  type ModuleMethod = (...args: unknown[]) => unknown;

  type ModuleProxy<T extends string[]> = {
    [K in T[number]]: ModuleMethod;
  };

  // Helper to safely access window properties
  function getWindowProp(propName: string): unknown {
    return (window as unknown as Record<string, unknown>)[propName];
  }

  // Helper to call a method on a window property
  function callWindowMethod(objName: string, methodName: string, ...args: unknown[]): unknown {
    const obj = getWindowProp(objName);
    if (obj && typeof (obj as Record<string, unknown>)[methodName] === 'function') {
      return ((obj as Record<string, unknown>)[methodName] as ModuleMethod)(...args);
    }
    return undefined;
  }

  function createModuleProxy<T extends string[]>(
    moduleName: string,
    methods: T,
  ): ModuleProxy<T> {
    const proxy = {} as ModuleProxy<T>;

    methods.forEach((method) => {
      (proxy as Record<string, ModuleMethod>)[method] = function (...args: unknown[]): unknown {
        const module = getWindowProp(moduleName);
        if (module && typeof (module as Record<string, unknown>)[method] === 'function') {
          return ((module as Record<string, unknown>)[method] as ModuleMethod)(...args);
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
    ] as const),

    performance: createModuleProxy('PerfMonitor', [
      'enable',
      'disable',
      'toggle',
      'mark',
      'measure',
      'report',
    ] as const),

    theme: createModuleProxy('ThemeSystem', [
      'setThemePreference',
      'getThemePreference',
      'applyTheme',
      'initTheme',
    ] as const),

    icon: createModuleProxy('IconSystem', [
      'ensureSvgNamespace',
      'getMenuIconSvg',
      'renderIconIntoElement',
    ] as const),

    dock: createModuleProxy('DockSystem', [
      'getDockReservedBottom',
      'initDockMagnification',
      'updateDockIndicators',
    ] as const),

    menu: createModuleProxy('MenuSystem', [
      'renderApplicationMenu',
      'handleMenuActionActivation',
      'registerMenuAction',
      'hideMenuDropdowns',
      'toggleMenuDropdown',
      'isAnyDropdownOpen',
    ] as const),

    desktop: createModuleProxy('DesktopSystem', [
      'initDesktop',
      'openDesktopItemById',
    ] as const),

    system: createModuleProxy('SystemUI', [
      'initSystemStatusControls',
      'updateAllSystemStatusUI',
      'handleSystemToggle',
      'setConnectedNetwork',
      'setBluetoothDevice',
      'setAudioDevice',
    ] as const),

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
    ] as const),

    finder: createModuleProxy('FinderSystem', ['init', 'openFinder', 'closeFinder'] as const),

    textEditor: {
      init: (container: unknown) => callWindowMethod('TextEditorSystem', 'init', container),
      loadRemoteFile: (payload: unknown) => callWindowMethod('TextEditorSystem', 'loadRemoteFile', payload),
      showLoading: (payload: unknown) => callWindowMethod('TextEditorSystem', 'showLoading', payload),
      showLoadError: (payload: unknown) => callWindowMethod('TextEditorSystem', 'showLoadError', payload),
      clearEditor: () => callWindowMethod('TextEditorSystem', 'clearEditor'),
      saveFile: () => callWindowMethod('TextEditorSystem', 'saveFile'),
      openFile: () => callWindowMethod('TextEditorSystem', 'openFile'),
      handleMenuAction: (action: unknown) => callWindowMethod('TextEditorSystem', 'handleMenuAction', action),
    },

    settings: {
      init: (container: unknown) => callWindowMethod('SettingsSystem', 'init', container),
      showSection: (section: unknown) => callWindowMethod('SettingsSystem', 'showSection', section),
      syncThemePreference: () => callWindowMethod('SettingsSystem', 'syncThemePreference'),
      syncLanguagePreference: () => callWindowMethod('SettingsSystem', 'syncLanguagePreference'),
    },

    window: {
      register: (config: unknown) => callWindowMethod('WindowManager', 'register', config),
      registerAll: (configs: unknown) => callWindowMethod('WindowManager', 'registerAll', configs),
      getConfig: (id: unknown) => callWindowMethod('WindowManager', 'getConfig', id),
      open: (id: unknown) => callWindowMethod('WindowManager', 'open', id),
      close: (id: unknown) => callWindowMethod('WindowManager', 'close', id),
      bringToFront: (id: unknown) => callWindowMethod('WindowManager', 'bringToFront', id),
      getTopWindow: () => callWindowMethod('WindowManager', 'getTopWindow'),
      getProgramInfo: (id: unknown) => callWindowMethod('WindowManager', 'getProgramInfo', id),
      getAllWindowIds: (): string[] => (callWindowMethod('WindowManager', 'getAllWindowIds') as string[]) || [],
      getPersistentWindowIds: (): string[] =>
        (callWindowMethod('WindowManager', 'getPersistentWindowIds') as string[]) || [],
      getDialogInstance: (id: unknown) => callWindowMethod('WindowManager', 'getDialogInstance', id),
      syncZIndexWithDOM: () => callWindowMethod('WindowManager', 'syncZIndexWithDOM'),
    },

    action: {
      register: (name: unknown, handler: unknown) => callWindowMethod('ActionBus', 'register', name, handler),
      registerAll: (actions: unknown) => callWindowMethod('ActionBus', 'registerAll', actions),
      execute: (name: unknown, params: unknown, element: unknown) =>
        callWindowMethod('ActionBus', 'execute', name, params, element),
    },

    i18n: {
      translate: (key: string, fallback?: string): string => {
        const appI18n = getWindowProp('appI18n');
        if (appI18n && typeof (appI18n as Record<string, unknown>)['translate'] === 'function') {
          const result = ((appI18n as Record<string, unknown>)['translate'] as (k: string) => string)(key);
          return result === key && fallback ? fallback : result;
        }
        return fallback || key;
      },
      setLanguagePreference: (lang: unknown) => callWindowMethod('appI18n', 'setLanguagePreference', lang),
      getLanguagePreference: (): string => (callWindowMethod('appI18n', 'getLanguagePreference') as string) || 'system',
      getActiveLanguage: (): string => (callWindowMethod('appI18n', 'getActiveLanguage') as string) || 'en',
      applyTranslations: () => callWindowMethod('appI18n', 'applyTranslations'),
    },

    helpers: {
      getMenuBarBottom: (): number => {
        const header = document.querySelector('body > header');
        if (!header) return 0;
        return header.getBoundingClientRect().bottom;
      },

      clampWindowToMenuBar: (target: unknown): unknown => {
        const fn = getWindowProp('clampWindowToMenuBar');
        if (typeof fn === 'function') {
          return (fn as (t: unknown) => unknown)(target);
        }
        return undefined;
      },

      computeSnapMetrics: (side: unknown): unknown => {
        const fn = getWindowProp('computeSnapMetrics');
        if (typeof fn === 'function') {
          return (fn as (s: unknown) => unknown)(side);
        }
        return undefined;
      },

      showSnapPreview: (side: unknown): void => {
        const fn = getWindowProp('showSnapPreview');
        if (typeof fn === 'function') {
          (fn as (s: unknown) => void)(side);
        }
      },

      hideSnapPreview: (): void => {
        const fn = getWindowProp('hideSnapPreview');
        if (typeof fn === 'function') {
          (fn as () => void)();
        }
      },
    },
  } as const;

  (window as unknown as { API: typeof API }).API = API;

  // Legacy compatibility wrappers
  const createLegacyWrapper = (apiPath: string): ((...args: unknown[]) => unknown) => {
    return function (...args: unknown[]): unknown {
      const parts = apiPath.split('.');
      let fn: unknown = API;
      for (const part of parts) {
        fn = (fn as Record<string, unknown>)[part];
        if (!fn) {
          console.warn(`Legacy wrapper: ${apiPath} nicht gefunden`);
          return undefined;
        }
      }
      if (typeof fn === 'function') {
        return (fn as (...a: unknown[]) => unknown)(...args);
      }
      return fn;
    };
  };

  const w = window as unknown as Record<string, unknown>;

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
