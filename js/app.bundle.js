"use strict";
var App = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/ts/dom-utils.ts
  var dom_utils_exports = {};
  __export(dom_utils_exports, {
    getById: () => getById,
    hide: () => hide,
    hideAll: () => hideAll,
    isVisible: () => isVisible,
    query: () => query,
    queryAll: () => queryAll,
    setVisibility: () => setVisibility,
    show: () => show,
    showAll: () => showAll,
    toggle: () => toggle
  });
  function show(element) {
    if (!element) return;
    element.classList.remove("hidden");
  }
  function hide(element) {
    if (!element) return;
    element.classList.add("hidden");
  }
  function toggle(element, visible) {
    if (!element) return;
    if (visible === void 0) {
      element.classList.toggle("hidden");
    } else {
      element.classList.toggle("hidden", !visible);
    }
  }
  function isVisible(element) {
    if (!element) return false;
    return !element.classList.contains("hidden");
  }
  function setVisibility(element, visible) {
    if (!element) return;
    element.classList.toggle("hidden", !visible);
  }
  function showAll(elements) {
    elements.forEach(show);
  }
  function hideAll(elements) {
    elements.forEach(hide);
  }
  function getById(id) {
    return document.getElementById(id);
  }
  function query(selector, parent = document) {
    return parent.querySelector(selector);
  }
  function queryAll(selector, parent = document) {
    return parent.querySelectorAll(selector);
  }
  var init_dom_utils = __esm({
    "src/ts/dom-utils.ts"() {
      "use strict";
      if (typeof window !== "undefined") {
        window.DOMUtils = {
          show,
          hide,
          toggle,
          isVisible,
          setVisibility,
          showAll,
          hideAll,
          getById,
          query,
          queryAll
        };
      }
      console.log("\u2705 DOMUtils loaded");
    }
  });

  // src/ts/constants.ts
  var THEME_PREFERENCE_KEY, VALID_THEME_PREFERENCES, FINDER_STATE_STORAGE_KEY, OPEN_WINDOWS_KEY, WINDOW_POSITIONS_KEY, MODAL_IDS, TRANSIENT_MODAL_IDS, BASE_Z_INDEX, MENUBAR_Z_INDEX, DOCK_Z_INDEX, MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT, DEFAULT_WINDOW_WIDTH, DEFAULT_WINDOW_HEIGHT, DOCK_MIN_HEIGHT, DOCK_MAX_HEIGHT, DOCK_MAGNIFICATION_SCALE, DOCK_MAGNIFICATION_RANGE, DESKTOP_ICON_SIZE, DESKTOP_ICON_SPACING, RUBBERBAND_MIN_DISTANCE, WINDOW_ANIMATION_DURATION, DOCK_ANIMATION_DURATION, MENU_ANIMATION_DURATION, GITHUB_CACHE_DURATION, GITHUB_API_BASE, SNAP_THRESHOLD, SNAP_SIDES, APP_CONSTANTS;
  var init_constants = __esm({
    "src/ts/constants.ts"() {
      "use strict";
      THEME_PREFERENCE_KEY = "themePreference";
      VALID_THEME_PREFERENCES = ["system", "light", "dark"];
      FINDER_STATE_STORAGE_KEY = "finderState";
      OPEN_WINDOWS_KEY = "openWindows";
      WINDOW_POSITIONS_KEY = "windowPositions";
      MODAL_IDS = [
        "finder-modal",
        "projects-modal",
        "about-modal",
        "settings-modal",
        "text-modal",
        "terminal-modal",
        "image-modal",
        "program-info-modal"
      ];
      TRANSIENT_MODAL_IDS = /* @__PURE__ */ new Set(["program-info-modal"]);
      BASE_Z_INDEX = 1e3;
      MENUBAR_Z_INDEX = 1e4;
      DOCK_Z_INDEX = 1e4;
      MIN_WINDOW_WIDTH = 240;
      MIN_WINDOW_HEIGHT = 160;
      DEFAULT_WINDOW_WIDTH = 600;
      DEFAULT_WINDOW_HEIGHT = 400;
      DOCK_MIN_HEIGHT = 48;
      DOCK_MAX_HEIGHT = 96;
      DOCK_MAGNIFICATION_SCALE = 1.5;
      DOCK_MAGNIFICATION_RANGE = 100;
      DESKTOP_ICON_SIZE = 64;
      DESKTOP_ICON_SPACING = 24;
      RUBBERBAND_MIN_DISTANCE = 10;
      WINDOW_ANIMATION_DURATION = 200;
      DOCK_ANIMATION_DURATION = 150;
      MENU_ANIMATION_DURATION = 100;
      GITHUB_CACHE_DURATION = 5 * 60 * 1e3;
      GITHUB_API_BASE = "https://api.github.com";
      SNAP_THRESHOLD = 100;
      SNAP_SIDES = ["left", "right"];
      APP_CONSTANTS = {
        THEME_PREFERENCE_KEY,
        VALID_THEME_PREFERENCES,
        FINDER_STATE_STORAGE_KEY,
        OPEN_WINDOWS_KEY,
        WINDOW_POSITIONS_KEY,
        MODAL_IDS,
        TRANSIENT_MODAL_IDS,
        BASE_Z_INDEX,
        MENUBAR_Z_INDEX,
        DOCK_Z_INDEX,
        MIN_WINDOW_WIDTH,
        MIN_WINDOW_HEIGHT,
        DEFAULT_WINDOW_WIDTH,
        DEFAULT_WINDOW_HEIGHT,
        DOCK_MIN_HEIGHT,
        DOCK_MAX_HEIGHT,
        DOCK_MAGNIFICATION_SCALE,
        DOCK_MAGNIFICATION_RANGE,
        DESKTOP_ICON_SIZE,
        DESKTOP_ICON_SPACING,
        RUBBERBAND_MIN_DISTANCE,
        WINDOW_ANIMATION_DURATION,
        DOCK_ANIMATION_DURATION,
        MENU_ANIMATION_DURATION,
        GITHUB_CACHE_DURATION,
        GITHUB_API_BASE,
        SNAP_THRESHOLD,
        SNAP_SIDES
      };
      if (typeof window !== "undefined") {
        window.APP_CONSTANTS = APP_CONSTANTS;
      }
    }
  });

  // src/ts/api.ts
  var require_api = __commonJS({
    "src/ts/api.ts"() {
      "use strict";
      console.log("API loaded");
      (function() {
        "use strict";
        function getWindowProp(propName) {
          return window[propName];
        }
        function callWindowMethod(objName, methodName, ...args) {
          const obj = getWindowProp(objName);
          if (obj && typeof obj[methodName] === "function") {
            return obj[methodName](...args);
          }
          return void 0;
        }
        function createModuleProxy(moduleName, methods) {
          const proxy = {};
          methods.forEach((method) => {
            proxy[method] = function(...args) {
              const module3 = getWindowProp(moduleName);
              if (module3 && typeof module3[method] === "function") {
                return module3[method](...args);
              }
              console.warn(`${moduleName}.${method} ist nicht verf\xFCgbar`);
              return void 0;
            };
          });
          return proxy;
        }
        const API = {
          error: createModuleProxy("ErrorHandler", [
            "enable",
            "disable",
            "getLogs",
            "clearLogs",
            "exportLogs"
          ]),
          performance: createModuleProxy("PerfMonitor", [
            "enable",
            "disable",
            "toggle",
            "mark",
            "measure",
            "report"
          ]),
          theme: createModuleProxy("ThemeSystem", [
            "setThemePreference",
            "getThemePreference",
            "applyTheme",
            "initTheme"
          ]),
          icon: createModuleProxy("IconSystem", [
            "ensureSvgNamespace",
            "getMenuIconSvg",
            "renderIconIntoElement"
          ]),
          dock: createModuleProxy("DockSystem", [
            "getDockReservedBottom",
            "initDockMagnification",
            "updateDockIndicators"
          ]),
          menu: createModuleProxy("MenuSystem", [
            "renderApplicationMenu",
            "handleMenuActionActivation",
            "registerMenuAction",
            "hideMenuDropdowns",
            "toggleMenuDropdown",
            "isAnyDropdownOpen"
          ]),
          desktop: createModuleProxy("DesktopSystem", [
            "initDesktop",
            "openDesktopItemById"
          ]),
          system: createModuleProxy("SystemUI", [
            "initSystemStatusControls",
            "updateAllSystemStatusUI",
            "handleSystemToggle",
            "setConnectedNetwork",
            "setBluetoothDevice",
            "setAudioDevice"
          ]),
          storage: createModuleProxy("StorageSystem", [
            "readFinderState",
            "writeFinderState",
            "clearFinderState",
            "saveOpenModals",
            "restoreOpenModals",
            "saveWindowPositions",
            "restoreWindowPositions",
            "resetWindowLayout",
            "getDialogWindowElement"
          ]),
          finder: createModuleProxy("FinderSystem", ["init", "openFinder", "closeFinder"]),
          textEditor: {
            init: (container) => callWindowMethod("TextEditorSystem", "init", container),
            loadRemoteFile: (payload) => callWindowMethod("TextEditorSystem", "loadRemoteFile", payload),
            showLoading: (payload) => callWindowMethod("TextEditorSystem", "showLoading", payload),
            showLoadError: (payload) => callWindowMethod("TextEditorSystem", "showLoadError", payload),
            clearEditor: () => callWindowMethod("TextEditorSystem", "clearEditor"),
            saveFile: () => callWindowMethod("TextEditorSystem", "saveFile"),
            openFile: () => callWindowMethod("TextEditorSystem", "openFile"),
            handleMenuAction: (action) => callWindowMethod("TextEditorSystem", "handleMenuAction", action)
          },
          settings: {
            init: (container) => callWindowMethod("SettingsSystem", "init", container),
            showSection: (section) => callWindowMethod("SettingsSystem", "showSection", section),
            syncThemePreference: () => callWindowMethod("SettingsSystem", "syncThemePreference"),
            syncLanguagePreference: () => callWindowMethod("SettingsSystem", "syncLanguagePreference")
          },
          window: {
            register: (config) => callWindowMethod("WindowManager", "register", config),
            registerAll: (configs) => callWindowMethod("WindowManager", "registerAll", configs),
            getConfig: (id) => callWindowMethod("WindowManager", "getConfig", id),
            open: (id) => callWindowMethod("WindowManager", "open", id),
            close: (id) => callWindowMethod("WindowManager", "close", id),
            bringToFront: (id) => callWindowMethod("WindowManager", "bringToFront", id),
            getTopWindow: () => callWindowMethod("WindowManager", "getTopWindow"),
            getProgramInfo: (id) => callWindowMethod("WindowManager", "getProgramInfo", id),
            getAllWindowIds: () => callWindowMethod("WindowManager", "getAllWindowIds") || [],
            getPersistentWindowIds: () => callWindowMethod("WindowManager", "getPersistentWindowIds") || [],
            getDialogInstance: (id) => callWindowMethod("WindowManager", "getDialogInstance", id),
            syncZIndexWithDOM: () => callWindowMethod("WindowManager", "syncZIndexWithDOM")
          },
          action: {
            register: (name, handler) => callWindowMethod("ActionBus", "register", name, handler),
            registerAll: (actions) => callWindowMethod("ActionBus", "registerAll", actions),
            execute: (name, params, element) => callWindowMethod("ActionBus", "execute", name, params, element)
          },
          i18n: {
            translate: (key, fallback) => {
              const appI18n = getWindowProp("appI18n");
              if (appI18n && typeof appI18n["translate"] === "function") {
                const result = appI18n["translate"](key);
                return result === key && fallback ? fallback : result;
              }
              return fallback || key;
            },
            setLanguagePreference: (lang) => callWindowMethod("appI18n", "setLanguagePreference", lang),
            getLanguagePreference: () => callWindowMethod("appI18n", "getLanguagePreference") || "system",
            getActiveLanguage: () => callWindowMethod("appI18n", "getActiveLanguage") || "en",
            applyTranslations: () => callWindowMethod("appI18n", "applyTranslations")
          },
          session: createModuleProxy("SessionManager", [
            "init",
            "saveAll",
            "saveInstanceType",
            "restoreSession",
            "clear",
            "setDebounceDelay",
            "getDebounceDelay",
            "getStats"
          ]),
          helpers: {
            getMenuBarBottom: () => {
              const header = document.querySelector("body > header");
              if (!header) return 0;
              return header.getBoundingClientRect().bottom;
            },
            clampWindowToMenuBar: (target) => {
              const fn = getWindowProp("clampWindowToMenuBar");
              if (typeof fn === "function") {
                return fn(target);
              }
              return void 0;
            },
            computeSnapMetrics: (side) => {
              const fn = getWindowProp("computeSnapMetrics");
              if (typeof fn === "function") {
                return fn(side);
              }
              return void 0;
            },
            showSnapPreview: (side) => {
              const fn = getWindowProp("showSnapPreview");
              if (typeof fn === "function") {
                fn(side);
              }
            },
            hideSnapPreview: () => {
              const fn = getWindowProp("hideSnapPreview");
              if (typeof fn === "function") {
                fn();
              }
            }
          }
        };
        window.API = API;
        const createLegacyWrapper = (apiPath) => {
          return function(...args) {
            const parts = apiPath.split(".");
            let fn = API;
            for (const part of parts) {
              fn = fn[part];
              if (!fn) {
                console.warn(`Legacy wrapper: ${apiPath} nicht gefunden`);
                return void 0;
              }
            }
            if (typeof fn === "function") {
              return fn(...args);
            }
            return fn;
          };
        };
        const w = window;
        w.setThemePreference = createLegacyWrapper("theme.setThemePreference");
        w.getThemePreference = createLegacyWrapper("theme.getThemePreference");
        w.ensureSvgNamespace = createLegacyWrapper("icon.ensureSvgNamespace");
        w.getMenuIconSvg = createLegacyWrapper("icon.getMenuIconSvg");
        w.renderIconIntoElement = createLegacyWrapper("icon.renderIconIntoElement");
        w.getDockReservedBottom = createLegacyWrapper("dock.getDockReservedBottom");
        w.initDockMagnification = createLegacyWrapper("dock.initDockMagnification");
        w.renderApplicationMenu = createLegacyWrapper("menu.renderApplicationMenu");
        w.handleMenuActionActivation = createLegacyWrapper("menu.handleMenuActionActivation");
        w.initDesktop = createLegacyWrapper("desktop.initDesktop");
        w.openDesktopItemById = createLegacyWrapper("desktop.openDesktopItemById");
        w.initSystemStatusControls = createLegacyWrapper("system.initSystemStatusControls");
        w.updateAllSystemStatusUI = createLegacyWrapper("system.updateAllSystemStatusUI");
        w.handleSystemToggle = createLegacyWrapper("system.handleSystemToggle");
        w.setConnectedNetwork = createLegacyWrapper("system.setConnectedNetwork");
        w.setBluetoothDevice = createLegacyWrapper("system.setBluetoothDevice");
        w.setAudioDevice = createLegacyWrapper("system.setAudioDevice");
        w.readFinderState = createLegacyWrapper("storage.readFinderState");
        w.writeFinderState = createLegacyWrapper("storage.writeFinderState");
        w.clearFinderState = createLegacyWrapper("storage.clearFinderState");
        w.saveOpenModals = createLegacyWrapper("storage.saveOpenModals");
        w.restoreOpenModals = createLegacyWrapper("storage.restoreOpenModals");
        w.saveWindowPositions = createLegacyWrapper("storage.saveWindowPositions");
        w.restoreWindowPositions = createLegacyWrapper("storage.restoreWindowPositions");
        w.resetWindowLayout = createLegacyWrapper("storage.resetWindowLayout");
      })();
    }
  });

  // src/ts/window-manager.ts
  var require_window_manager = __commonJS({
    "src/ts/window-manager.ts"() {
      "use strict";
      (() => {
        "use strict";
        class WindowConfig {
          constructor(options) {
            var _a;
            this.id = options.id;
            this.type = options.type || "persistent";
            this.programKey = options.programKey || "programs.default";
            this.icon = options.icon || "./img/sucher.png";
            this.closeButtonId = (_a = options.closeButtonId) != null ? _a : null;
            this.dialogInstance = null;
            this.metadata = options.metadata || {};
          }
          isTransient() {
            return this.type === "transient";
          }
          getProgramInfo() {
            const w = window;
            const i18n = w["appI18n"] || void 0;
            const translate2 = (i18n == null ? void 0 : i18n.translate) || ((key) => key);
            const aboutFields = ["name", "tagline", "version", "copyright"];
            const info = {
              modalId: this.id,
              programLabel: translate2(`${this.programKey}.label`),
              infoLabel: translate2(`${this.programKey}.infoLabel`),
              fallbackInfoModalId: this.metadata.fallbackInfoModalId || "program-info-modal",
              icon: this.icon,
              about: {}
            };
            aboutFields.forEach((field) => {
              info.about[field] = translate2(`${this.programKey}.about.${field}`);
            });
            return info;
          }
        }
        const windowRegistry = /* @__PURE__ */ new Map();
        const baseZIndex = 1e3;
        let topZIndex = 1e3;
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
            return config && config.dialogInstance || null;
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
          bringToFront(windowId) {
            const instance = this.getDialogInstance(windowId);
            if (instance && typeof instance.bringToFront === "function") {
              instance.bringToFront();
            } else {
              console.warn(`Keine Dialog-Instanz f\xFCr ${windowId} gefunden.`);
            }
          },
          open(windowId) {
            const config = this.getConfig(windowId);
            if (config && config.metadata && typeof config.metadata.initHandler === "function") {
              try {
                const md = config.metadata;
                if (typeof md.initHandler === "function") md.initHandler();
              } catch (e) {
                console.warn(`Init handler for ${windowId} threw:`, e);
              }
            }
            const instance = this.getDialogInstance(windowId);
            if (instance && typeof instance.open === "function") {
              instance.open();
            } else {
              const modal = document.getElementById(windowId);
              if (modal) {
                const domUtils = window.DOMUtils;
                if (domUtils && typeof domUtils.show === "function") {
                  domUtils.show(modal);
                } else {
                  modal.classList.remove("hidden");
                }
                this.bringToFront(windowId);
              }
            }
          },
          close(windowId) {
            const instance = this.getDialogInstance(windowId);
            if (instance && typeof instance.close === "function") {
              instance.close();
            } else {
              const modal = document.getElementById(windowId);
              if (modal) {
                const domUtils = window.DOMUtils;
                if (domUtils && typeof domUtils.hide === "function") {
                  domUtils.hide(modal);
                } else {
                  modal.classList.add("hidden");
                }
              }
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
              if (!modal) return;
              const modalZ = parseInt(window.getComputedStyle(modal).zIndex, 10);
              if (!Number.isNaN(modalZ)) maxZ = Math.max(maxZ, modalZ);
              const windowEl = this.getDialogWindowElement(modal);
              if (windowEl) {
                const contentZ = parseInt(window.getComputedStyle(windowEl).zIndex, 10);
                if (!Number.isNaN(contentZ)) maxZ = Math.max(maxZ, contentZ);
              }
            });
            topZIndex = maxZ;
            return maxZ;
          },
          getDialogWindowElement(modal) {
            if (!modal) return null;
            return modal.querySelector(".autopointer") || modal;
          },
          getProgramInfo(windowId) {
            const config = this.getConfig(windowId);
            if (config) return config.getProgramInfo();
            return this.getDefaultProgramInfo();
          },
          getDefaultProgramInfo() {
            const w = window;
            const i18n = w["appI18n"] || void 0;
            const translate2 = (i18n == null ? void 0 : i18n.translate) || ((key) => key);
            const programKey = "programs.default";
            return {
              modalId: null,
              programLabel: translate2(`${programKey}.label`),
              infoLabel: translate2(`${programKey}.infoLabel`),
              fallbackInfoModalId: "program-info-modal",
              icon: "./img/sucher.png",
              about: {
                name: translate2(`${programKey}.about.name`),
                tagline: translate2(`${programKey}.about.tagline`),
                version: translate2(`${programKey}.about.version`),
                copyright: translate2(`${programKey}.about.copyright`)
              }
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
          }
        };
        window.WindowManager = WindowManager;
        Object.defineProperty(window, "topZIndex", {
          get: () => WindowManager.topZIndex,
          set: (value) => {
            WindowManager.topZIndex = value;
          }
        });
      })();
    }
  });

  // src/ts/action-bus.ts
  var require_action_bus = __commonJS({
    "src/ts/action-bus.ts"() {
      "use strict";
      console.log("ActionBus loaded");
      (function() {
        "use strict";
        const actionHandlers = /* @__PURE__ */ new Map();
        const eventDelegates = [];
        const ActionBus = {
          /**
           * Registriert einen Action-Handler
           * @param {string} actionName - Name der Action
           * @param {Function} handler - Handler-Funktion (params, element) => void
           */
          register(actionName, handler) {
            if (!actionName || typeof handler !== "function") {
              console.error("Invalid action registration:", actionName);
              return;
            }
            actionHandlers.set(actionName, handler);
          },
          /**
           * Registriert mehrere Actions auf einmal
           * @param {Object} actions - Object mit actionName: handler Paaren
           */
          registerAll(actions) {
            Object.entries(actions).forEach(([name, handler]) => {
              this.register(name, handler);
            });
          },
          /**
           * Führt eine Action aus
           * @param {string} actionName - Name der Action
           * @param {Object} params - Parameter für die Action
           * @param {HTMLElement|null} element - Element das die Action ausgelöst hat
           */
          execute(actionName, params = {}, element = null) {
            const handler = actionHandlers.get(actionName);
            if (!handler) {
              console.warn(`No handler registered for action: ${actionName}`);
              return;
            }
            try {
              handler(params, element);
            } catch (error) {
              console.error(`Error executing action ${actionName}:`, error);
            }
          },
          /**
           * Initialisiert das Event-Delegation System
           * Sucht alle Elemente mit data-action und bindet sie
           */
          init() {
            this.delegateEvent("click", "[data-action]", (element, event) => {
              const actionName = element.getAttribute("data-action");
              const params = this.extractParams(element);
              if (element.tagName === "BUTTON" || element.tagName === "A") {
                event.preventDefault();
              }
              event.stopPropagation();
              this.execute(actionName, params, element);
            });
            this.delegateEvent("dblclick", "[data-action-dblclick]", (element, event) => {
              const actionName = element.getAttribute("data-action-dblclick");
              const params = this.extractParams(element);
              if (element.tagName === "BUTTON" || element.tagName === "A") {
                event.preventDefault();
              }
              event.stopPropagation();
              this.execute(actionName, params, element);
            });
            this.delegateEvent("mouseenter", "[data-action-hover]", (element) => {
              const actionName = element.getAttribute("data-action-hover");
              const params = this.extractParams(element);
              this.execute(actionName, params, element);
            });
            console.log("ActionBus initialized");
          },
          /**
           * Event-Delegation Helper
           */
          delegateEvent(eventType, selector, handler) {
            const delegate = (event) => {
              const target = event.target;
              if (!(target instanceof Element)) return;
              const element = target.closest(selector);
              if (element) {
                handler(element, event);
              }
            };
            document.addEventListener(eventType, delegate);
            eventDelegates.push({ eventType, delegate });
          },
          /**
           * Extrahiert Parameter aus data-* Attributen
           */
          extractParams(element) {
            const params = {};
            const dataset = element.dataset;
            for (const key in dataset) {
              if (key !== "action" && key !== "actionHover") {
                params[key] = dataset[key];
              }
            }
            return params;
          },
          /**
           * Cleanup - entfernt alle Event-Listener
           */
          destroy() {
            eventDelegates.forEach(({ eventType, delegate }) => {
              document.removeEventListener(eventType, delegate);
            });
            eventDelegates.length = 0;
            actionHandlers.clear();
          }
        };
        ActionBus.registerAll({
          // Preview: generischer Öffnen-Handler (unterstützt direkte URLs oder Delegation an Finder)
          openWithPreview: (params) => {
            var _a, _b, _c;
            try {
              const single = params["url"] || params["src"] || params["imageUrl"];
              const csv = params["urls"] || params["images"];
              const idx = parseInt(params["index"] || "0", 10) || 0;
              const path = params["path"] || params["imagePath"];
              const W = window;
              if (single) {
                const list = [single];
                if ((_a = W.PreviewInstanceManager) == null ? void 0 : _a.openImages) {
                  W.PreviewInstanceManager.openImages(list, 0, path);
                }
                return;
              }
              if (csv) {
                const list = csv.split(",").map((s) => s.trim()).filter(Boolean);
                if (list.length && ((_b = W.PreviewInstanceManager) == null ? void 0 : _b.openImages)) {
                  W.PreviewInstanceManager.openImages(
                    list,
                    Math.max(0, Math.min(idx, list.length - 1)),
                    path
                  );
                }
                return;
              }
              const itemName = params["itemName"] || params["name"];
              if (itemName && ((_c = W.FinderSystem) == null ? void 0 : _c.openItem)) {
                W.FinderSystem.openItem(itemName, "file");
              }
            } catch (e) {
              console.warn("openWithPreview failed:", e);
            }
          },
          // Fenster schließen
          closeWindow: (params) => {
            var _a, _b, _c;
            const windowId = params.windowId;
            if (!windowId) {
              console.warn("closeWindow: missing windowId");
              return;
            }
            const g = window;
            const wm = window.WindowManager;
            if (wm && typeof wm.close === "function") {
              wm.close(windowId);
            }
            (_a = g.saveOpenModals) == null ? void 0 : _a.call(g);
            (_b = g.updateDockIndicators) == null ? void 0 : _b.call(g);
            (_c = g.updateProgramLabelByTopModal) == null ? void 0 : _c.call(g);
          },
          // Fenster öffnen
          openWindow: (params) => {
            var _a, _b, _c, _d, _e, _f;
            const windowId = params.windowId;
            if (!windowId) {
              console.warn("openWindow: missing windowId");
              return;
            }
            const launchpadModal = document.getElementById("launchpad-modal");
            if (launchpadModal && !launchpadModal.classList.contains("hidden")) {
              const g = window;
              (_c = (_b = (_a = g.dialogs) == null ? void 0 : _a["launchpad-modal"]) == null ? void 0 : _b.close) == null ? void 0 : _c.call(_b);
            }
            (_e = (_d = window.WindowManager) == null ? void 0 : _d.open) == null ? void 0 : _e.call(_d, windowId);
            (_f = window.updateProgramLabelByTopModal) == null ? void 0 : _f.call(window);
          },
          // Aktuelles (oberstes) Fenster schließen
          closeTopWindow: () => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const g = window;
            (_a = g.hideMenuDropdowns) == null ? void 0 : _a.call(g);
            const maybeTop = (_c = (_b = g.WindowManager) == null ? void 0 : _b.getTopWindow) == null ? void 0 : _c.call(_b);
            let topId = null;
            if (typeof maybeTop === "string") {
              topId = maybeTop;
            } else if (maybeTop && typeof maybeTop === "object") {
              const obj = maybeTop;
              if (typeof obj.id === "string") topId = obj.id;
            }
            if (!topId) return;
            (_e = (_d = g.WindowManager) == null ? void 0 : _d.close) == null ? void 0 : _e.call(_d, topId);
            (_f = g.saveOpenModals) == null ? void 0 : _f.call(g);
            (_g = g.updateDockIndicators) == null ? void 0 : _g.call(g);
            (_h = g.updateProgramLabelByTopModal) == null ? void 0 : _h.call(g);
          },
          // Window-Layout zurücksetzen
          resetWindowLayout: () => {
            var _a, _b;
            const g = window;
            (_a = g.hideMenuDropdowns) == null ? void 0 : _a.call(g);
            (_b = g.resetWindowLayout) == null ? void 0 : _b.call(g);
          },
          // Program-Info Dialog öffnen
          openProgramInfo: (_params, _element) => {
            var _a, _b;
            const g = window;
            (_a = g.hideMenuDropdowns) == null ? void 0 : _a.call(g);
            (_b = g.openProgramInfoDialog) == null ? void 0 : _b.call(g, null);
          },
          // Über-Dialog öffnen (aus Apple-Menü)
          openAbout: () => {
            var _a, _b, _c, _d, _e;
            const g = window;
            (_a = g.hideMenuDropdowns) == null ? void 0 : _a.call(g);
            (_d = (_c = (_b = g.dialogs) == null ? void 0 : _b["about-modal"]) == null ? void 0 : _c.open) == null ? void 0 : _d.call(_c);
            (_e = g.updateProgramLabelByTopModal) == null ? void 0 : _e.call(g);
          },
          // Settings öffnen
          openSettings: () => {
            var _a, _b, _c, _d, _e;
            const g = window;
            (_a = g.hideMenuDropdowns) == null ? void 0 : _a.call(g);
            (_d = (_c = (_b = g.dialogs) == null ? void 0 : _b["settings-modal"]) == null ? void 0 : _c.open) == null ? void 0 : _d.call(_c);
            (_e = g.updateProgramLabelByTopModal) == null ? void 0 : _e.call(g);
          },
          // Desktop-Item öffnen (für Dock-Icons)
          openDesktopItem: (params) => {
            var _a;
            const itemId = params.itemId;
            if (!itemId) {
              console.warn("openDesktopItem: missing itemId");
              return;
            }
            const g = window;
            (_a = g.openDesktopItemById) == null ? void 0 : _a.call(g, itemId);
          },
          // Finder: eine Ebene nach oben
          "finder:navigateUp": () => {
            var _a, _b;
            const wf = window;
            (_b = (_a = wf.FinderSystem) == null ? void 0 : _a.navigateUp) == null ? void 0 : _b.call(_a);
          },
          // Finder: zur Root der aktuellen Ansicht
          "finder:goRoot": () => {
            var _a, _b;
            const wf = window;
            if (((_a = wf.FinderSystem) == null ? void 0 : _a.navigateTo) && ((_b = wf.FinderSystem) == null ? void 0 : _b.getState)) {
              const view = wf.FinderSystem.getState().currentView;
              wf.FinderSystem.navigateTo([], view);
            }
          },
          // Finder: Ansicht wechseln (computer/github/favorites/recent)
          "finder:switchView": (params) => {
            var _a, _b;
            const view = params["finderView"] || params.view;
            if (!view) {
              console.warn("finder:switchView: missing finderView");
              return;
            }
            const wf = window;
            (_b = (_a = wf.FinderSystem) == null ? void 0 : _a.navigateTo) == null ? void 0 : _b.call(_a, [], view);
          },
          // Finder: View-Mode setzen (list/grid/columns)
          "finder:setViewMode": (params) => {
            var _a, _b;
            const mode = params["viewMode"] || params["mode"];
            if (!mode) {
              console.warn("finder:setViewMode: missing viewMode");
              return;
            }
            const wf = window;
            (_b = (_a = wf.FinderSystem) == null ? void 0 : _a.setViewMode) == null ? void 0 : _b.call(_a, mode);
          },
          // Finder: Sortierung setzen
          "finder:setSortBy": (params) => {
            var _a, _b;
            const field = params["sortBy"] || params["field"];
            if (!field) {
              console.warn("finder:setSortBy: missing sortBy");
              return;
            }
            const wf = window;
            (_b = (_a = wf.FinderSystem) == null ? void 0 : _a.setSortBy) == null ? void 0 : _b.call(_a, field);
          },
          // Finder: In Pfad navigieren (data-path="A/B/C")
          "finder:navigateToPath": (params) => {
            var _a, _b;
            const raw = params.path || "";
            const parts = typeof raw === "string" && raw.length ? raw.split("/") : [];
            const wf = window;
            (_b = (_a = wf.FinderSystem) == null ? void 0 : _a.navigateTo) == null ? void 0 : _b.call(_a, parts);
          },
          // Finder: Item öffnen (Datei oder Ordner)
          "finder:openItem": (params) => {
            var _a, _b;
            const name = params["itemName"] || params["name"];
            const type = params["itemType"] || params["type"];
            if (!name || !type) {
              console.warn("finder:openItem: missing name/type");
              return;
            }
            const wf = window;
            (_b = (_a = wf.FinderSystem) == null ? void 0 : _a.openItem) == null ? void 0 : _b.call(_a, name, type);
          },
          // Settings: Show specific section
          "settings:showSection": (params) => {
            var _a, _b;
            const section = params["section"];
            if (!section) {
              console.warn("settings:showSection: missing section");
              return;
            }
            const W = window;
            (_b = (_a = W.SettingsSystem) == null ? void 0 : _a.showSection) == null ? void 0 : _b.call(_a, section);
          },
          // Session: Export current session as JSON file
          "session:export": () => {
            var _a, _b;
            const W = window;
            const translate2 = ((_a = W.appI18n) == null ? void 0 : _a.translate) || ((k) => k);
            if (!((_b = W.SessionManager) == null ? void 0 : _b.exportSession)) {
              console.error("SessionManager not available");
              return;
            }
            const json = W.SessionManager.exportSession();
            if (!json) {
              alert(translate2("menu.session.noSession"));
              return;
            }
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `session-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log("Session exported successfully");
          },
          // Session: Import session from JSON file
          "session:import": () => {
            var _a, _b;
            const W = window;
            const translate2 = ((_a = W.appI18n) == null ? void 0 : _a.translate) || ((k) => k);
            if (!((_b = W.SessionManager) == null ? void 0 : _b.importSession)) {
              console.error("SessionManager not available");
              return;
            }
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/json,.json";
            input.onchange = (e) => {
              var _a2;
              const file = (_a2 = e.target.files) == null ? void 0 : _a2[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (event) => {
                var _a3, _b2, _c;
                const json = (_a3 = event.target) == null ? void 0 : _a3.result;
                if (typeof json !== "string") {
                  alert(translate2("menu.session.importError"));
                  return;
                }
                const success = (_c = (_b2 = W.SessionManager) == null ? void 0 : _b2.importSession) == null ? void 0 : _c.call(_b2, json);
                if (success) {
                  console.log("Session imported successfully");
                } else {
                  alert(translate2("menu.session.importError"));
                }
              };
              reader.onerror = () => {
                alert(translate2("menu.session.importError"));
              };
              reader.readAsText(file);
            };
            input.click();
          }
        });
        window.ActionBus = ActionBus;
      })();
    }
  });

  // src/ts/dialog-utils.ts
  function getModalIds() {
    const win = window;
    if (win.WindowManager && typeof win.WindowManager.getAllWindowIds === "function") {
      return win.WindowManager.getAllWindowIds();
    }
    const w = window;
    const appConstants = w.APP_CONSTANTS;
    return (appConstants == null ? void 0 : appConstants.MODAL_IDS) || [];
  }
  function syncTopZIndexWithDOM() {
    const win = window;
    if (win.WindowManager && typeof win.WindowManager.syncZIndexWithDOM === "function") {
      win.WindowManager.syncZIndexWithDOM();
      return;
    }
    let maxZ = 1e3;
    const modalIds = getModalIds();
    modalIds.forEach((id) => {
      const modal = document.getElementById(id);
      if (!modal) return;
      const modalZ = parseInt(window.getComputedStyle(modal).zIndex, 10);
      if (!Number.isNaN(modalZ)) {
        maxZ = Math.max(maxZ, modalZ);
      }
    });
    const w = window;
    if (w.topZIndex !== void 0) {
      w.topZIndex = maxZ;
    }
  }
  function bringDialogToFront(dialogId) {
    var _a, _b, _c;
    if ((_a = window.dialogs) == null ? void 0 : _a[dialogId]) {
      (_c = (_b = window.dialogs[dialogId]).bringToFront) == null ? void 0 : _c.call(_b);
    } else {
      console.error("Kein Dialog mit der ID " + dialogId + " gefunden.");
    }
  }
  function bringAllWindowsToFront() {
    const modalIds = getModalIds();
    if (!window.dialogs || !modalIds || !Array.isArray(modalIds)) return;
    modalIds.forEach((id) => {
      var _a;
      const dialog = (_a = window.dialogs) == null ? void 0 : _a[id];
      if (dialog && dialog.modal && !dialog.modal.classList.contains("hidden") && typeof dialog.bringToFront === "function") {
        dialog.bringToFront();
      }
    });
  }
  var init_dialog_utils = __esm({
    "src/ts/dialog-utils.ts"() {
      "use strict";
      (() => {
        if (typeof window.syncTopZIndexWithDOM !== "function") {
          window.syncTopZIndexWithDOM = syncTopZIndexWithDOM;
        }
        if (typeof window.bringDialogToFront !== "function") {
          window.bringDialogToFront = bringDialogToFront;
        }
        if (typeof window.bringAllWindowsToFront !== "function") {
          window.bringAllWindowsToFront = bringAllWindowsToFront;
        }
      })();
    }
  });

  // src/ts/snap-utils.ts
  var require_snap_utils = __commonJS({
    "src/ts/snap-utils.ts"() {
      "use strict";
      (function() {
        "use strict";
        function getMenuBarBottom() {
          const header = document.querySelector("body > header");
          if (!header) {
            return 0;
          }
          const rect = header.getBoundingClientRect();
          return rect.bottom;
        }
        function clampWindowToMenuBar(target) {
          if (!target) return;
          const minTop = getMenuBarBottom();
          if (minTop <= 0) return;
          const computed = window.getComputedStyle(target);
          if (computed.position === "static") {
            target.style.position = "fixed";
          }
          const currentTop = parseFloat(target.style.top);
          const numericTop = Number.isNaN(currentTop) ? parseFloat(computed.top) : currentTop;
          if (!Number.isNaN(numericTop) && numericTop < minTop) {
            target.style.top = `${minTop}px`;
          } else if (Number.isNaN(numericTop)) {
            const rect = target.getBoundingClientRect();
            if (rect.top < minTop) {
              if (!target.style.left) {
                target.style.left = `${rect.left}px`;
              }
              target.style.top = `${minTop}px`;
            }
          }
        }
        function computeSnapMetrics(side) {
          if (side !== "left" && side !== "right") return null;
          const minTop = Math.round(getMenuBarBottom());
          const viewportWidth = Math.max(window.innerWidth || 0, 0);
          const viewportHeight = Math.max(window.innerHeight || 0, 0);
          if (viewportWidth <= 0 || viewportHeight <= 0) return null;
          const minWidth = Math.min(320, viewportWidth);
          const halfWidth = Math.round(viewportWidth / 2);
          const width = Math.max(Math.min(halfWidth, viewportWidth), minWidth);
          const left = side === "left" ? 0 : Math.max(0, viewportWidth - width);
          const top = minTop;
          const getDockReservedBottom2 = window.getDockReservedBottom;
          const dockReserve = typeof getDockReservedBottom2 === "function" ? getDockReservedBottom2() : 0;
          const height = Math.max(0, viewportHeight - top - dockReserve);
          return { left, top, width, height };
        }
        let snapPreviewElement = null;
        function ensureSnapPreviewElement() {
          if (snapPreviewElement && snapPreviewElement.isConnected) {
            return snapPreviewElement;
          }
          if (!document || !document.body) {
            return null;
          }
          snapPreviewElement = document.getElementById("snap-preview-overlay");
          if (!snapPreviewElement) {
            snapPreviewElement = document.createElement("div");
            snapPreviewElement.id = "snap-preview-overlay";
            snapPreviewElement.setAttribute("aria-hidden", "true");
            document.body.appendChild(snapPreviewElement);
          }
          return snapPreviewElement;
        }
        function showSnapPreview(side) {
          const metrics = computeSnapMetrics(side);
          if (!metrics) {
            hideSnapPreview();
            return;
          }
          const el = ensureSnapPreviewElement();
          if (!el) return;
          el.style.left = `${metrics.left}px`;
          el.style.top = `${metrics.top}px`;
          el.style.width = `${metrics.width}px`;
          el.style.height = `${metrics.height}px`;
          el.setAttribute("data-side", side);
          el.classList.add("snap-preview-visible");
        }
        function hideSnapPreview() {
          if (!snapPreviewElement || !snapPreviewElement.isConnected) {
            return;
          }
          snapPreviewElement.classList.remove("snap-preview-visible");
          snapPreviewElement.removeAttribute("data-side");
        }
        const g = window;
        if (typeof g.getMenuBarBottom !== "function") {
          g.getMenuBarBottom = getMenuBarBottom;
        }
        if (typeof g.clampWindowToMenuBar !== "function") {
          g.clampWindowToMenuBar = clampWindowToMenuBar;
        }
        if (typeof g.computeSnapMetrics !== "function") {
          g.computeSnapMetrics = computeSnapMetrics;
        }
        if (typeof g.showSnapPreview !== "function") {
          g.showSnapPreview = showSnapPreview;
        }
        if (typeof g.hideSnapPreview !== "function") {
          g.hideSnapPreview = hideSnapPreview;
        }
      })();
    }
  });

  // src/ts/program-actions.ts
  var require_program_actions = __commonJS({
    "src/ts/program-actions.ts"() {
      "use strict";
      (function() {
        "use strict";
        const gw = window;
        function getTextEditorIframe() {
          const dialogs = gw.dialogs;
          const dialog = dialogs ? dialogs["text-modal"] : null;
          if (!dialog || !dialog.modal) return null;
          return dialog.modal.querySelector("iframe");
        }
        function postToTextEditor(message, attempt = 0) {
          if (!message || typeof message !== "object") return;
          const legacy = gw.postToTextEditor;
          if (typeof legacy === "function") {
            legacy(message);
            return;
          }
          const iframe = getTextEditorIframe();
          if (iframe && iframe.contentWindow) {
            let targetOrigin = "*";
            if (window.location && typeof window.location.origin === "string" && window.location.origin !== "null") {
              targetOrigin = window.location.origin;
            }
            iframe.contentWindow.postMessage(message, targetOrigin);
            return;
          }
          if (attempt < 10) {
            setTimeout(() => postToTextEditor(message, attempt + 1), 120);
          } else {
            console.warn("Texteditor iframe nicht verf\xFCgbar, Nachricht verworfen.", message);
          }
        }
        function sendTextEditorMenuAction2(command) {
          if (!command) return;
          postToTextEditor({ type: "textEditor:menuAction", command });
        }
        function getImageViewerState() {
          const viewer = document.getElementById("image-viewer");
          if (!viewer) return { hasImage: false, src: "" };
          const hidden = viewer.classList.contains("hidden");
          const src = viewer.getAttribute("src") || viewer.src || "";
          const hasImage = Boolean(src && src.trim() && !hidden);
          return { hasImage, src };
        }
        function openActiveImageInNewTab() {
          const state = getImageViewerState();
          if (!state.hasImage || !state.src) return;
          window.open(state.src, "_blank", "noopener");
        }
        function downloadActiveImage() {
          const state = getImageViewerState();
          if (!state.hasImage || !state.src) return;
          const link = document.createElement("a");
          link.href = state.src;
          let fileName = "bild";
          try {
            const url = new URL(state.src, window.location.href);
            fileName = url.pathname.split("/").pop() || fileName;
          } catch {
            fileName = "bild";
          }
          link.download = fileName || "bild";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        if (typeof gw.getImageViewerState !== "function") gw.getImageViewerState = getImageViewerState;
        if (typeof gw.openActiveImageInNewTab !== "function") gw.openActiveImageInNewTab = openActiveImageInNewTab;
        if (typeof gw.downloadActiveImage !== "function") gw.downloadActiveImage = downloadActiveImage;
        if (typeof gw.sendTextEditorMenuAction !== "function") gw.sendTextEditorMenuAction = sendTextEditorMenuAction2;
      })();
    }
  });

  // src/ts/program-menu-sync.ts
  var require_program_menu_sync = __commonJS({
    "src/ts/program-menu-sync.ts"() {
      "use strict";
      (function() {
        "use strict";
        function resolveProgramInfo(modalId) {
          const wm = window.WindowManager;
          if (wm && typeof wm.getProgramInfo === "function") {
            return wm.getProgramInfo(modalId);
          }
          const translate2 = window.translate;
          const t = (k, fb) => translate2 ? translate2(k, fb) : fb || k;
          return {
            modalId: modalId || null,
            programLabel: t("programs.default.label"),
            infoLabel: t("programs.default.infoLabel"),
            fallbackInfoModalId: "program-info-modal",
            icon: "./img/sucher.png",
            about: {}
          };
        }
        function updateProgramLabel(newLabel) {
          const programLabel = document.getElementById("program-label");
          if (programLabel) programLabel.textContent = newLabel;
        }
        function getTopModal() {
          const wm = window.WindowManager;
          if (wm && typeof wm.getTopWindow === "function") {
            return wm.getTopWindow();
          }
          let top = null;
          let highest = 0;
          document.querySelectorAll(".modal:not(.hidden)").forEach((modal) => {
            const z = parseInt(getComputedStyle(modal).zIndex, 10) || 0;
            if (z > highest) {
              highest = z;
              top = modal;
            }
          });
          return top;
        }
        function updateProgramInfoMenu(info) {
          const infoLink = document.getElementById("about-program");
          if (!infoLink) return;
          const fallbackInfo = resolveProgramInfo(null);
          infoLink.textContent = info.infoLabel || fallbackInfo.infoLabel;
          const el = infoLink;
          if (info.fallbackInfoModalId) {
            el.dataset.fallbackInfoModalId = info.fallbackInfoModalId;
          } else if (el.dataset) {
            delete el.dataset.fallbackInfoModalId;
          }
        }
        function renderProgramInfo(info) {
          const modal = document.getElementById("program-info-modal");
          if (!modal) return;
          modal.dataset.infoTarget = info.modalId || "";
          const fallbackInfo = resolveProgramInfo(null);
          const about = info.about || fallbackInfo.about || {};
          const iconEl = modal.querySelector("#program-info-icon");
          if (iconEl) {
            if (info.icon) {
              iconEl.src = info.icon;
              iconEl.alt = about.name || info.programLabel || "Programm";
              iconEl.classList.remove("hidden");
            } else {
              iconEl.classList.add("hidden");
            }
          }
          const nameEl = modal.querySelector("#program-info-name");
          if (nameEl) {
            nameEl.textContent = about.name || info.programLabel || fallbackInfo.programLabel;
          }
          const taglineEl = modal.querySelector("#program-info-tagline");
          if (taglineEl) {
            const tagline = about.tagline || "";
            taglineEl.textContent = tagline;
            taglineEl.classList.toggle("hidden", !tagline);
          }
          const versionEl = modal.querySelector("#program-info-version");
          if (versionEl) {
            const version = about.version || "";
            versionEl.textContent = version;
            versionEl.classList.toggle("hidden", !version);
          }
          const copyrightEl = modal.querySelector("#program-info-copyright");
          if (copyrightEl) {
            const copyright = about.copyright || "";
            copyrightEl.textContent = copyright;
            copyrightEl.classList.toggle("hidden", !copyright);
          }
        }
        function renderApplicationMenu2(modalId) {
          const MenuSystem = window.MenuSystem;
          if (MenuSystem && typeof MenuSystem.renderApplicationMenu === "function") {
            MenuSystem.renderApplicationMenu(modalId);
          }
        }
        function getProgramInfo(modalId) {
          return resolveProgramInfo(modalId);
        }
        function openProgramInfoDialog(event, infoOverride) {
          var _a, _b;
          if (event) {
            event.preventDefault();
            event.stopPropagation();
          }
          const hideMenus = window.hideMenuDropdowns;
          if (hideMenus) hideMenus();
          const info = infoOverride || currentProgramInfo || getProgramInfo(null);
          currentProgramInfo = info;
          const infoEvent = new CustomEvent("programInfoRequested", {
            detail: { modalId: info.modalId, info },
            cancelable: true
          });
          const dispatchResult = window.dispatchEvent(infoEvent);
          if (!dispatchResult) return;
          const fallbackId = info.fallbackInfoModalId;
          if (!fallbackId) return;
          if (fallbackId === "program-info-modal") {
            renderProgramInfo(info);
          }
          const dialogs = window.dialogs;
          const dialogInstance = dialogs && dialogs[fallbackId];
          if (dialogInstance && typeof dialogInstance.open === "function") {
            dialogInstance.open();
          } else {
            const modalElement = document.getElementById(fallbackId);
            if (modalElement) {
              modalElement.classList.remove("hidden");
              const bringToFront = (_b = (_a = window.dialogs) == null ? void 0 : _a[fallbackId]) == null ? void 0 : _b.bringToFront;
              if (bringToFront) bringToFront();
              updateProgramLabelByTopModal();
            }
          }
        }
        function openProgramInfoFromMenu(targetModalId) {
          const info = resolveProgramInfo(targetModalId || null);
          openProgramInfoDialog(null, info);
        }
        let currentProgramInfo = resolveProgramInfo(null);
        function updateProgramLabelByTopModal() {
          const topModal = getTopModal();
          const wm = window.WindowManager;
          if (topModal && wm) {
            const config = wm.getConfig(topModal.id);
            if (config && config.metadata && config.metadata.skipMenubarUpdate) {
              const all = Array.from(document.querySelectorAll(".modal:not(.hidden)"));
              const sorted = all.sort((a, b) => (parseInt(getComputedStyle(b).zIndex, 10) || 0) - (parseInt(getComputedStyle(a).zIndex, 10) || 0));
              let next = null;
              for (const m of sorted) {
                const mc = wm.getConfig(m.id);
                if (!mc || !mc.metadata || !mc.metadata.skipMenubarUpdate) {
                  next = m;
                  break;
                }
              }
              if (next) {
                const info2 = getProgramInfo(next.id);
                currentProgramInfo = info2;
                updateProgramLabel(info2.programLabel);
                updateProgramInfoMenu(info2);
                renderApplicationMenu2(next.id);
                return info2;
              }
            }
          }
          let info;
          if (topModal && topModal.id === "program-info-modal" && currentProgramInfo && currentProgramInfo.modalId) {
            info = resolveProgramInfo(currentProgramInfo.modalId);
            currentProgramInfo = info;
          } else {
            info = getProgramInfo(topModal ? topModal.id : null);
            currentProgramInfo = info;
          }
          updateProgramLabel(info.programLabel);
          updateProgramInfoMenu(info);
          renderApplicationMenu2(topModal ? topModal.id : null);
          return info;
        }
        const alreadyWired = window.__programMenuSyncWired;
        if (!alreadyWired) {
          window.__programMenuSyncWired = true;
        }
        if (!alreadyWired) window.addEventListener("languagePreferenceChange", () => {
          const info = updateProgramLabelByTopModal();
          const programInfoModal = document.getElementById("program-info-modal");
          if (programInfoModal && !programInfoModal.classList.contains("hidden")) {
            const ds = programInfoModal.dataset;
            const targetId = ds["infoTarget"] || (info ? info.modalId : null) || null;
            const infoForDialog = resolveProgramInfo(targetId);
            renderProgramInfo(infoForDialog);
            if (info && info.modalId === infoForDialog.modalId) {
              currentProgramInfo = infoForDialog;
            }
          }
          const updateAllSystemStatusUI = window.updateAllSystemStatusUI;
          if (updateAllSystemStatusUI) updateAllSystemStatusUI();
        });
        if (!alreadyWired) window.addEventListener("themePreferenceChange", () => {
          const updateAllSystemStatusUI = window.updateAllSystemStatusUI;
          if (updateAllSystemStatusUI) updateAllSystemStatusUI();
        });
        window.updateProgramLabelByTopModal = updateProgramLabelByTopModal;
        window.openProgramInfoFromMenu = openProgramInfoFromMenu;
      })();
    }
  });

  // src/ts/menu.ts
  function registerMenuAction(handler) {
    if (typeof handler !== "function") return null;
    const actionId = `menu-action-${++menuActionIdCounter}`;
    menuActionHandlers.set(actionId, handler);
    return actionId;
  }
  function normalizeMenuItems(items, context) {
    var _a;
    if (!Array.isArray(items)) return [];
    const normalized = [];
    let previousWasSeparator = true;
    items.forEach((raw) => {
      const item = raw;
      if (!item) return;
      if (item.type === "separator") {
        if (previousWasSeparator) return;
        normalized.push({ type: "separator" });
        previousWasSeparator = true;
        return;
      }
      const clone = Object.assign({}, item);
      if (typeof item.disabled === "function")
        clone.disabled = item.disabled(context);
      if (typeof item.label === "function")
        clone.label = item.label(context);
      if (typeof item.shortcut === "function")
        clone.shortcut = item.shortcut(context);
      normalized.push(clone);
      previousWasSeparator = false;
    });
    while (normalized.length && ((_a = normalized[normalized.length - 1]) == null ? void 0 : _a.type) === "separator")
      normalized.pop();
    return normalized;
  }
  function buildDefaultMenuDefinition(context) {
    return buildFinderMenuDefinition(context);
  }
  function buildFinderMenuDefinition(context) {
    return [
      {
        id: "file",
        label: () => translate("menu.sections.file"),
        items: [
          {
            id: "finder-new-window",
            label: () => translate("menu.finder.newWindow"),
            shortcut: "\u2318N",
            icon: "new",
            action: () => {
              var _a;
              const mgr = window["FinderInstanceManager"];
              if (mgr && typeof mgr.createInstance === "function") {
                const count = mgr.getInstanceCount ? mgr.getInstanceCount() : ((_a = mgr.getAllInstances) == null ? void 0 : _a.call(mgr).length) || 0;
                mgr.createInstance({ title: `Finder ${count + 1}` });
              }
            }
          },
          {
            id: "finder-reload",
            label: () => translate("menu.finder.reload"),
            shortcut: "\u2318R",
            icon: "reload",
            action: () => {
              if (window["FinderSystem"] && typeof window["FinderSystem"].navigateTo === "function") {
                try {
                  const st = window["FinderSystem"].getState && window["FinderSystem"].getState();
                  if (st && Array.isArray(st.githubRepos)) st.githubRepos = [];
                  window["FinderSystem"].navigateTo([], "github");
                } catch (e) {
                  console.warn("Finder reload failed", e);
                }
              }
            }
          },
          { type: "separator" },
          {
            id: "session-export",
            label: () => translate("menu.session.export"),
            icon: "save",
            action: () => {
              const actionBus = window["ActionBus"];
              if (actionBus && typeof actionBus.execute === "function") {
                actionBus.execute("session:export");
              }
            }
          },
          {
            id: "session-import",
            label: () => translate("menu.session.import"),
            icon: "open",
            action: () => {
              const actionBus = window["ActionBus"];
              if (actionBus && typeof actionBus.execute === "function") {
                actionBus.execute("session:import");
              }
            }
          },
          { type: "separator" },
          {
            id: "finder-close",
            label: () => translate("menu.finder.close"),
            shortcut: "\u2318W",
            disabled: () => !(context && context.dialog),
            icon: "close",
            action: () => closeContextWindow(context)
          }
        ]
      },
      createWindowMenuSection(context),
      createHelpMenuSection(context, {
        itemKey: "menu.finder.help",
        infoModalId: "finder-modal",
        itemIcon: "help"
      })
    ];
  }
  function buildSettingsMenuDefinition(context) {
    return [
      {
        id: "file",
        label: () => translate("menu.sections.file"),
        items: [
          {
            id: "settings-close",
            label: () => translate("menu.settings.close"),
            shortcut: "\u2318W",
            disabled: () => !(context && context.dialog),
            icon: "close",
            action: () => closeContextWindow(context)
          }
        ]
      },
      createWindowMenuSection(context),
      createHelpMenuSection(context, {
        itemKey: "menu.settings.help",
        infoModalId: "settings-modal",
        itemIcon: "help"
      })
    ];
  }
  function buildTextEditorMenuDefinition(context) {
    return [
      {
        id: "file",
        label: () => translate("menu.sections.file"),
        items: [
          {
            id: "text-new",
            label: () => translate("menu.text.newFile"),
            shortcut: "\u2318N",
            icon: "newFile",
            action: () => sendTextEditorMenuAction("file:new")
          },
          {
            id: "text-open",
            label: () => translate("menu.text.open"),
            shortcut: "\u2318O",
            icon: "open",
            action: () => sendTextEditorMenuAction("file:open")
          },
          {
            id: "text-save",
            label: () => translate("menu.text.save"),
            shortcut: "\u2318S",
            icon: "save",
            action: () => sendTextEditorMenuAction("file:save")
          }
        ]
      },
      {
        id: "edit",
        label: () => translate("menu.sections.edit"),
        items: [
          {
            id: "text-undo",
            label: () => translate("menu.text.undo"),
            shortcut: "\u2318Z",
            icon: "undo",
            action: () => sendTextEditorMenuAction("edit:undo")
          },
          {
            id: "text-redo",
            label: () => translate("menu.text.redo"),
            shortcut: "\u21E7\u2318Z",
            icon: "redo",
            action: () => sendTextEditorMenuAction("edit:redo")
          },
          { type: "separator" },
          {
            id: "text-cut",
            label: () => translate("menu.text.cut"),
            shortcut: "\u2318X",
            icon: "cut",
            action: () => sendTextEditorMenuAction("edit:cut")
          },
          {
            id: "text-copy",
            label: () => translate("menu.text.copy"),
            shortcut: "\u2318C",
            icon: "copy",
            action: () => sendTextEditorMenuAction("edit:copy")
          },
          {
            id: "text-paste",
            label: () => translate("menu.text.paste"),
            shortcut: "\u2318V",
            icon: "paste",
            action: () => sendTextEditorMenuAction("edit:paste")
          },
          { type: "separator" },
          {
            id: "text-select-all",
            label: () => translate("menu.text.selectAll"),
            shortcut: "\u2318A",
            icon: "selectAll",
            action: () => sendTextEditorMenuAction("edit:selectAll")
          }
        ]
      },
      {
        id: "view",
        label: () => translate("menu.sections.view"),
        items: [
          {
            id: "text-toggle-wrap",
            label: () => translate("menu.text.toggleWrap"),
            shortcut: "\u2325\u2318W",
            icon: "wrap",
            action: () => sendTextEditorMenuAction("view:toggleWrap")
          }
        ]
      },
      createWindowMenuSection(context),
      createHelpMenuSection(context, {
        itemKey: "menu.text.help",
        infoModalId: "text-modal",
        itemIcon: "help"
      })
    ];
  }
  function buildImageViewerMenuDefinition(context) {
    const state = window["getImageViewerState"] ? window["getImageViewerState"]() : { hasImage: false };
    return [
      {
        id: "file",
        label: () => translate("menu.sections.file"),
        items: [
          {
            id: "image-open-tab",
            label: () => translate("menu.image.openInTab"),
            disabled: !state.hasImage,
            icon: "imageOpen",
            action: () => {
              if (window["openActiveImageInNewTab"]) window["openActiveImageInNewTab"]();
            }
          },
          {
            id: "image-download",
            label: () => translate("menu.image.saveImage"),
            disabled: !state.hasImage,
            icon: "download",
            action: () => {
              if (window["downloadActiveImage"]) window["downloadActiveImage"]();
            }
          },
          { type: "separator" },
          {
            id: "image-close",
            label: () => translate("menu.image.close"),
            shortcut: "\u2318W",
            disabled: () => !(context && context.dialog),
            icon: "close",
            action: () => closeContextWindow(context)
          }
        ]
      },
      createWindowMenuSection(context),
      createHelpMenuSection(context, {
        itemKey: "menu.image.help",
        infoModalId: "image-modal",
        itemIcon: "help"
      })
    ];
  }
  function buildAboutMenuDefinition(context) {
    return [
      {
        id: "file",
        label: () => translate("menu.sections.file"),
        items: [
          {
            id: "about-close",
            label: () => translate("menu.about.close"),
            shortcut: "\u2318W",
            disabled: () => !(context && context.dialog),
            icon: "close",
            action: () => closeContextWindow(context)
          }
        ]
      },
      createWindowMenuSection(context),
      createHelpMenuSection(context, {
        itemKey: "menu.about.help",
        infoModalId: "about-modal",
        itemIcon: "info"
      })
    ];
  }
  function buildProgramInfoMenuDefinition(context) {
    return [
      {
        id: "file",
        label: () => translate("menu.sections.file"),
        items: [
          {
            id: "program-info-close",
            label: () => translate("menu.programInfo.close"),
            shortcut: "\u2318W",
            disabled: () => !(context && context.dialog),
            icon: "close",
            action: () => closeContextWindow(context)
          }
        ]
      },
      createWindowMenuSection(context)
    ];
  }
  function buildTerminalMenuDefinition(context) {
    return [
      {
        id: "file",
        label: () => translate("menu.sections.file"),
        items: [
          {
            id: "terminal-new-window",
            label: () => translate("menu.terminal.newWindow"),
            shortcut: "\u2318N",
            icon: "terminal",
            action: () => {
              if (window["TerminalInstanceManager"] && typeof window["TerminalInstanceManager"].createInstance === "function")
                window["TerminalInstanceManager"].createInstance();
            }
          },
          { type: "separator" },
          {
            id: "terminal-close",
            label: () => translate("menu.terminal.close"),
            shortcut: "\u2318W",
            disabled: () => !(context && context.dialog),
            icon: "close",
            action: () => closeContextWindow(context)
          }
        ]
      },
      {
        id: "edit",
        label: () => translate("menu.sections.edit"),
        items: [
          {
            id: "terminal-clear",
            label: () => translate("menu.terminal.clear"),
            shortcut: "\u2318K",
            icon: "clear",
            action: () => {
              if (context && context.instanceId && window["TerminalInstanceManager"]) {
                const instance = window["TerminalInstanceManager"].getInstance(
                  context.instanceId
                );
                if (instance && instance.clearOutput) instance.clearOutput();
              }
            }
          }
        ]
      },
      createWindowMenuSection(context),
      createHelpMenuSection(context, {
        itemKey: "menu.terminal.help",
        infoModalId: "terminal-modal",
        itemIcon: "help"
      })
    ];
  }
  function createWindowMenuSection(context) {
    return {
      id: "window",
      label: () => translate("menu.sections.window"),
      items: getWindowMenuItems(context)
    };
  }
  function getWindowMenuItems(context) {
    const dialog = context && context.dialog;
    const hasDialog = Boolean(dialog && typeof dialog.close === "function");
    const items = [
      {
        id: "window-minimize",
        label: () => translate("menu.window.minimize"),
        shortcut: "\u2318M",
        disabled: !hasDialog,
        icon: "windowMinimize",
        action: () => {
          if (dialog && typeof dialog.minimize === "function") dialog.minimize();
        }
      },
      {
        id: "window-zoom",
        label: () => translate("menu.window.zoom"),
        shortcut: "\u2303\u2318F",
        disabled: !hasDialog,
        icon: "windowZoom",
        action: () => {
          if (dialog && typeof dialog.toggleMaximize === "function") dialog.toggleMaximize();
        }
      }
    ];
    const multiInstanceItems = getMultiInstanceMenuItems(context);
    if (multiInstanceItems.length > 0) {
      items.push({ type: "separator" });
      items.push(...multiInstanceItems);
    }
    items.push(
      { type: "separator" },
      {
        id: "window-all-front",
        label: () => translate("menu.window.bringToFront"),
        disabled: !hasAnyVisibleDialog(),
        icon: "windowFront",
        action: () => {
          if (window["bringAllWindowsToFront"]) window["bringAllWindowsToFront"]();
        }
      },
      { type: "separator" },
      {
        id: "window-close",
        label: () => translate("menu.window.close"),
        shortcut: "\u2318W",
        disabled: !hasDialog,
        icon: "close",
        action: () => closeContextWindow(context)
      }
    );
    return items;
  }
  function getMultiInstanceMenuItems(context) {
    const items = [];
    let manager = null;
    let typeLabel = null;
    let newInstanceKey = null;
    const modalId = context == null ? void 0 : context.modalId;
    if ((modalId === "finder-modal" || modalId === "projects-modal") && window["FinderInstanceManager"]) {
      manager = window["FinderInstanceManager"];
      typeLabel = "Finder";
      newInstanceKey = "menu.window.newFinder";
    } else if (modalId === "terminal-modal" && window["TerminalInstanceManager"]) {
      manager = window["TerminalInstanceManager"];
      typeLabel = "Terminal";
      newInstanceKey = "menu.window.newTerminal";
    } else if (modalId === "text-modal" && window["TextEditorInstanceManager"]) {
      manager = window["TextEditorInstanceManager"];
      typeLabel = "Editor";
      newInstanceKey = "menu.window.newEditor";
    }
    if (!manager) return items;
    items.push({
      id: "window-new-instance",
      label: () => translate(newInstanceKey || "menu.window.newWindow"),
      shortcut: "\u2318N",
      icon: "new",
      action: () => {
        const count = manager.getInstanceCount();
        manager.createInstance({ title: `${typeLabel} ${count + 1}` });
      }
    });
    const instances = manager.getAllInstances();
    if (instances.length > 1) {
      items.push({ type: "separator" });
      instances.forEach((instance, index) => {
        var _a;
        const isActive = ((_a = manager.getActiveInstance()) == null ? void 0 : _a.instanceId) === instance.instanceId;
        const numberLabel = `${typeLabel} ${index + 1}`;
        items.push({
          id: `window-instance-${instance.instanceId}`,
          label: () => `${isActive ? "\u2713 " : ""}${numberLabel}`,
          shortcut: index < 9 ? `\u2318${index + 1}` : void 0,
          action: () => {
            manager.setActiveInstance(instance.instanceId);
            const integration = window.multiInstanceIntegration;
            if (integration && typeof integration.updateInstanceVisibility === "function") {
              let type = null;
              if (manager === window.FinderInstanceManager) type = "finder";
              else if (manager === window.TerminalInstanceManager)
                type = "terminal";
              else if (manager === window.TextEditorInstanceManager)
                type = "text-editor";
              if (type) {
                integration.updateInstanceVisibility(type);
              }
            }
          }
        });
      });
      items.push(
        { type: "separator" },
        {
          id: "window-close-all",
          label: () => translate("menu.window.closeAll"),
          icon: "close",
          action: () => {
            var _a, _b;
            const base = translate("menu.window.closeAllConfirm");
            const confirmMsg = typeof base === "string" && base !== "menu.window.closeAllConfirm" ? base : `Close all ${typeLabel} (${instances.length})?`;
            if (confirm(confirmMsg)) {
              manager.destroyAllInstances();
              const targetModal = context == null ? void 0 : context.modalId;
              if (targetModal) {
                if (typeof ((_b = (_a = window["API"]) == null ? void 0 : _a.window) == null ? void 0 : _b.close) === "function") {
                  window["API"].window.close(targetModal);
                } else {
                  const el = document.getElementById(targetModal);
                  if (el && !el.classList.contains("hidden")) {
                    const domUtils = window.DOMUtils;
                    if (domUtils && typeof domUtils.hide === "function") {
                      domUtils.hide(el);
                    } else {
                      el.classList.add("hidden");
                    }
                  }
                }
              }
            }
          }
        }
      );
    }
    return items;
  }
  function createHelpMenuSection(context, overrides = {}) {
    const sectionKey = overrides.sectionKey || "menu.sections.help";
    const itemKey = overrides.itemKey || "menu.help.showHelp";
    const infoModalId = overrides.infoModalId || context.modalId || null;
    return {
      id: overrides.id || "help",
      label: () => translate(sectionKey),
      items: [
        {
          id: "help-show-info",
          label: () => translate(itemKey),
          icon: overrides.itemIcon || "help",
          action: () => {
            if (window["openProgramInfoFromMenu"])
              window["openProgramInfoFromMenu"](infoModalId);
          }
        }
      ]
    };
  }
  function renderApplicationMenu(activeModalId) {
    const container = document.getElementById("menubar-links");
    if (!container) return;
    const modalKey = activeModalId && menuDefinitions[activeModalId] ? activeModalId : "default";
    const builder = menuDefinitions[modalKey] || menuDefinitions.default;
    const context = createMenuContext(activeModalId || null);
    const sections = typeof builder === "function" ? builder(context) : Array.isArray(builder) ? builder : [];
    container.innerHTML = "";
    menuActionHandlers.clear();
    menuActionIdCounter = 0;
    currentMenuModalId = activeModalId || null;
    if (!Array.isArray(sections) || sections.length === 0) return;
    sections.forEach((section, sectionIndex) => {
      if (!section) return;
      const items = normalizeMenuItems(section.items, context);
      if (!items.length) return;
      const trigger = document.createElement("div");
      trigger.className = "menubar-trigger";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "menubar-item";
      button.dataset.menubarTriggerButton = "true";
      const label = typeof section.label === "function" ? section.label(context) : section.label;
      button.textContent = label || "";
      const sectionId = section.id || `section-${sectionIndex}`;
      const buttonId = `menubar-menu-${sectionId}`;
      const dropdownId = `menu-dropdown-${sectionId}`;
      button.id = buttonId;
      button.setAttribute("aria-haspopup", "menu");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-controls", dropdownId);
      const dropdown = document.createElement("ul");
      dropdown.id = dropdownId;
      dropdown.className = "menu-dropdown hidden";
      dropdown.setAttribute("role", "menu");
      dropdown.setAttribute("aria-labelledby", buttonId);
      items.forEach((item) => {
        if (item.type === "separator") {
          const separator = document.createElement("li");
          separator.className = "menu-separator";
          separator.setAttribute("role", "separator");
          separator.setAttribute("aria-hidden", "true");
          dropdown.appendChild(separator);
          return;
        }
        const li = document.createElement("li");
        li.setAttribute("role", "none");
        const tagName = item.href ? "a" : "button";
        const actionEl = document.createElement(tagName);
        actionEl.className = "menu-item";
        if (tagName === "button") actionEl.type = "button";
        else {
          actionEl.href = item.href;
          if (item.external) {
            actionEl.rel = "noopener noreferrer";
            actionEl.target = "_blank";
          }
        }
        const itemLabel = item.label !== null ? typeof item.label === "function" ? item.label(context) : item.label : "";
        const labelSpan = document.createElement("span");
        labelSpan.className = "menu-item-label";
        if (item.icon && window.IconSystem) {
          const iconSpan = document.createElement("span");
          iconSpan.className = "menu-item-icon";
          const iconSvg = window.IconSystem.getMenuIconSvg ? window.IconSystem.getMenuIconSvg(item.icon) : "";
          if (window.IconSystem.renderIconIntoElement)
            window.IconSystem.renderIconIntoElement(iconSpan, iconSvg, item.icon);
          labelSpan.appendChild(iconSpan);
        }
        labelSpan.appendChild(document.createTextNode(itemLabel));
        actionEl.appendChild(labelSpan);
        if (item.shortcut) {
          const shortcutSpan = document.createElement("span");
          shortcutSpan.className = "menu-item-shortcut";
          shortcutSpan.textContent = typeof item.shortcut === "function" ? item.shortcut() : item.shortcut;
          actionEl.appendChild(shortcutSpan);
        }
        actionEl.setAttribute("role", "menuitem");
        if (item.title) actionEl.title = item.title;
        const isDisabled = Boolean(item.disabled);
        if (isDisabled) {
          actionEl.setAttribute("aria-disabled", "true");
          if (tagName === "button") actionEl.disabled = true;
        } else if (typeof item.action === "function") {
          const actionId = registerMenuAction(item.action);
          if (actionId) actionEl.dataset.menuAction = actionId;
        }
        if (item.href && typeof item.onClick === "function") {
          actionEl.addEventListener("click", (event) => {
            const result = item.onClick(event);
            if (result === false) event.preventDefault();
          });
        }
        li.appendChild(actionEl);
        dropdown.appendChild(li);
      });
      if (!dropdown.childElementCount) return;
      trigger.appendChild(button);
      trigger.appendChild(dropdown);
      container.appendChild(trigger);
      if (window.bindDropdownTrigger)
        window.bindDropdownTrigger(button, { hoverRequiresOpen: true });
    });
  }
  function handleMenuActionActivation(event) {
    const target = event.target instanceof Element ? event.target.closest("[data-menu-action]") : null;
    if (!target) return;
    const actionId = target.getAttribute("data-menu-action");
    const handler = actionId ? menuActionHandlers.get(actionId) : null;
    if (typeof handler !== "function") return;
    event.preventDefault();
    event.stopPropagation();
    if (window.hideMenuDropdowns) window.hideMenuDropdowns();
    try {
      handler();
    } catch (err) {
      console.error("Error executing menu action:", err);
    }
  }
  function closeContextWindow(context) {
    const dialog = context && context.dialog;
    if (dialog && typeof dialog.close === "function") dialog.close();
  }
  function hasAnyVisibleDialog() {
    if (!window["dialogs"]) return false;
    return Object.values(window["dialogs"]).some(
      (d) => d && typeof d.isOpen === "function" ? d.isOpen() : Boolean(d && d.isOpen)
    );
  }
  function sendTextEditorMenuAction(actionType) {
    if (window.sendTextEditorMenuAction)
      window.sendTextEditorMenuAction(actionType);
  }
  function createMenuContext(modalId) {
    const w = window;
    if (w.createMenuContext && w.createMenuContext !== createMenuContext) {
      try {
        return w.createMenuContext(modalId);
      } catch (e) {
        console.warn("[Menu] createMenuContext override threw; falling back", e);
      }
    }
    return { modalId, dialog: null };
  }
  function translate(key, fallback) {
    if (window.appI18n && typeof window.appI18n.translate === "function") {
      const result = window.appI18n.translate(key);
      if (result === key && fallback) return fallback;
      return result;
    }
    return fallback || key;
  }
  function refreshCurrentMenu() {
    renderApplicationMenu(currentMenuModalId);
  }
  function setupInstanceManagerListeners() {
    const managers = [
      window["FinderInstanceManager"],
      window["TerminalInstanceManager"],
      window["TextEditorInstanceManager"]
    ];
    managers.forEach((manager) => {
      if (!manager || !manager.getAllInstances) return;
      const originalCreate = manager.createInstance;
      const originalDestroy = manager.destroyInstance;
      const originalDestroyAll = manager.destroyAllInstances;
      if (originalCreate)
        manager.createInstance = function(...args) {
          const result = originalCreate.apply(this, args);
          if (result) setTimeout(refreshCurrentMenu, 50);
          return result;
        };
      if (originalDestroy)
        manager.destroyInstance = function(...args) {
          const result = originalDestroy.apply(this, args);
          setTimeout(refreshCurrentMenu, 50);
          return result;
        };
      if (originalDestroyAll)
        manager.destroyAllInstances = function(...args) {
          const result = originalDestroyAll.apply(this, args);
          setTimeout(refreshCurrentMenu, 50);
          return result;
        };
    });
  }
  var menuActionHandlers, menuActionIdCounter, menuDefinitions, currentMenuModalId;
  var init_menu = __esm({
    "src/ts/menu.ts"() {
      "use strict";
      menuActionHandlers = /* @__PURE__ */ new Map();
      menuActionIdCounter = 0;
      menuDefinitions = {
        default: buildDefaultMenuDefinition,
        "finder-modal": buildFinderMenuDefinition,
        "projects-modal": buildFinderMenuDefinition,
        "settings-modal": buildSettingsMenuDefinition,
        "text-modal": buildTextEditorMenuDefinition,
        "image-modal": buildImageViewerMenuDefinition,
        "about-modal": buildAboutMenuDefinition,
        "program-info-modal": buildProgramInfoMenuDefinition,
        "terminal-modal": buildTerminalMenuDefinition
      };
      currentMenuModalId = null;
      if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", setupInstanceManagerListeners);
      else setTimeout(setupInstanceManagerListeners, 100);
      window.MenuSystem = {
        renderApplicationMenu,
        handleMenuActionActivation,
        menuDefinitions,
        getCurrentMenuModalId: () => currentMenuModalId
      };
      console.log("\u2705 MenuSystem loaded");
    }
  });

  // src/ts/dock.ts
  function getDockReservedBottom() {
    try {
      const dock = document.getElementById("dock");
      if (!dock || dock.classList.contains("hidden")) return 0;
      const rect = dock.getBoundingClientRect();
      const vh = Math.max(window.innerHeight || 0, 0);
      if (vh <= 0) return 0;
      return Math.round(Math.max(0, vh - rect.top));
    } catch {
      return 0;
    }
  }
  function initDockMagnification() {
    const dock = document.getElementById("dock");
    if (!dock) return;
    const icons = Array.from(dock.querySelectorAll(".dock-icon"));
    if (!icons.length) return;
    const items = icons.map((icon) => {
      const parent = icon.parentElement;
      const tooltip = parent ? parent.querySelector(".dock-tooltip") : null;
      return {
        icon,
        tooltip,
        baseHeight: icon.offsetHeight || 0
      };
    });
    let rafId = null;
    let pointerX = null;
    const maxScale = 1.6;
    const minScale = 1;
    const radius = 120;
    const sigma = radius / 3;
    const apply = () => {
      rafId = null;
      if (pointerX === null) {
        items.forEach(({ icon, tooltip }) => {
          icon.style.transform = "";
          icon.style.zIndex = "";
          if (tooltip) {
            tooltip.style.transform = "";
            tooltip.style.zIndex = "";
          }
        });
        return;
      }
      items.forEach(({ icon, tooltip, baseHeight }) => {
        const rect = icon.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const dx = Math.abs(pointerX - centerX);
        const influence = Math.exp(-(dx * dx) / (2 * sigma * sigma));
        const scale = Math.max(
          minScale,
          Math.min(maxScale, minScale + (maxScale - minScale) * influence)
        );
        const base = baseHeight || icon.offsetHeight || 0;
        const translateY = Math.max(0, (scale - 1) * base * 0.5);
        icon.style.transform = `translateY(-${translateY.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        icon.style.zIndex = scale > 1.01 ? "300" : "";
        if (tooltip) {
          const lift = Math.max(0, base * (scale - 1) - translateY);
          const gap = 12;
          tooltip.style.transform = `translateY(-${(lift + gap).toFixed(1)}px)`;
          tooltip.style.zIndex = "400";
        }
      });
    };
    const onMove = (e) => {
      pointerX = e.clientX;
      if (!rafId) rafId = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      pointerX = null;
      if (!rafId) rafId = requestAnimationFrame(apply);
    };
    dock.addEventListener("mousemove", onMove);
    dock.addEventListener("mouseleave", onLeave);
  }
  function loadDockOrder() {
    try {
      const raw = localStorage.getItem(DOCK_ORDER_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  function saveDockOrder(order) {
    try {
      localStorage.setItem(DOCK_ORDER_STORAGE_KEY, JSON.stringify(order || []));
    } catch {
    }
  }
  function getDockItemId(item) {
    if (!item) return null;
    return item.getAttribute("data-window-id") || null;
  }
  function getCurrentDockOrder() {
    const tray = document.querySelector("#dock .dock-tray");
    if (!tray) return [];
    return Array.from(tray.querySelectorAll(".dock-item")).map((it) => getDockItemId(it)).filter(Boolean);
  }
  function applyDockOrder(order) {
    if (!Array.isArray(order) || !order.length) return;
    const tray = document.querySelector("#dock .dock-tray");
    if (!tray) return;
    const items = Array.from(tray.querySelectorAll(".dock-item"));
    const map = new Map(items.map((it) => [getDockItemId(it), it]));
    const fragment = document.createDocumentFragment();
    order.forEach((id) => {
      const el = map.get(id);
      if (el) {
        fragment.appendChild(el);
        map.delete(id);
      }
    });
    for (const [, el] of map) fragment.appendChild(el);
    tray.appendChild(fragment);
  }
  function createPlaceholder(width, height) {
    const ph = document.createElement("div");
    ph.className = "dock-placeholder";
    ph.setAttribute("aria-hidden", "true");
    ph.style.width = Math.max(1, Math.round(width || 48)) + "px";
    ph.style.height = Math.max(1, Math.round(height || 48)) + "px";
    ph.style.opacity = "0";
    ph.style.pointerEvents = "none";
    return ph;
  }
  function initDockDragDrop() {
    const dock = document.getElementById("dock");
    const tray = dock ? dock.querySelector(".dock-tray") : null;
    if (!dock || !tray) return;
    const persisted = loadDockOrder();
    if (persisted && persisted.length) applyDockOrder(persisted);
    let draggedItem = null;
    let placeholder = null;
    let prevUserSelect = "";
    let suppressClicksUntil = 0;
    const updatePlaceholderSize = (ref) => {
      if (!placeholder || !ref) return;
      try {
        const r = ref.getBoundingClientRect();
        placeholder.style.width = r.width + "px";
        placeholder.style.height = r.height + "px";
      } catch {
      }
    };
    const placeRelativeTo = (targetItem, clientX) => {
      if (!tray || !targetItem) return;
      if (!placeholder) placeholder = createPlaceholder();
      updatePlaceholderSize(draggedItem || targetItem);
      const rect = targetItem.getBoundingClientRect();
      const insertBefore = clientX < rect.left + rect.width / 2;
      tray.insertBefore(placeholder, insertBefore ? targetItem : targetItem.nextSibling);
    };
    const handleTrayDragOver = (e) => {
      if (!draggedItem) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      const items = Array.from(tray.querySelectorAll(".dock-item")).filter(
        (it) => it !== draggedItem
      );
      if (!placeholder) placeholder = createPlaceholder();
      if (items.length === 0) {
        tray.appendChild(placeholder);
        return;
      }
      let target = null;
      for (const it of items) {
        const r = it.getBoundingClientRect();
        if (e.clientX < r.left + r.width / 2) {
          target = it;
          break;
        }
      }
      updatePlaceholderSize(draggedItem || items[0]);
      if (target) tray.insertBefore(placeholder, target);
      else tray.appendChild(placeholder);
    };
    const onDragStart = function(e) {
      const item = this.closest(".dock-item");
      if (!item) return;
      draggedItem = item;
      prevUserSelect = document.body.style.userSelect || "";
      document.body.style.userSelect = "none";
      suppressClicksUntil = Date.now() + 250;
      try {
        const icon = item.querySelector(".dock-icon") || item;
        const r2 = icon.getBoundingClientRect();
        if (e.dataTransfer) {
          e.dataTransfer.setData("text/plain", getDockItemId(item) || "");
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setDragImage(icon, r2.width / 2, r2.height / 2);
        }
      } catch {
      }
      const r = item.getBoundingClientRect();
      placeholder = createPlaceholder(r.width, r.height);
      tray.insertBefore(placeholder, item.nextSibling);
    };
    const onDragOver = (e) => {
      if (!draggedItem) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      const target = e.target.closest(".dock-item");
      if (!target || target === draggedItem) {
        handleTrayDragOver(e);
        return;
      }
      placeRelativeTo(target, e.clientX);
    };
    const finalizeDrop = () => {
      if (!draggedItem || !placeholder) return;
      tray.insertBefore(draggedItem, placeholder);
      placeholder.remove();
      placeholder = null;
      const order = getCurrentDockOrder();
      saveDockOrder(order);
    };
    const onDrop = (e) => {
      if (!draggedItem) return;
      e.preventDefault();
      const phDidNotMove = placeholder && placeholder.isConnected && (placeholder.previousSibling === draggedItem || placeholder.nextSibling === draggedItem);
      if (!placeholder || !placeholder.isConnected || phDidNotMove) {
        const x = e.clientX;
        const items = Array.from(tray.querySelectorAll(".dock-item")).filter(
          (it) => it !== draggedItem
        );
        let inserted = false;
        for (const it of items) {
          const r = it.getBoundingClientRect();
          if (x < r.left + r.width / 2) {
            tray.insertBefore(draggedItem, it);
            inserted = true;
            break;
          }
        }
        if (!inserted) tray.appendChild(draggedItem);
        const order = getCurrentDockOrder();
        saveDockOrder(order);
        cleanup();
        return;
      }
      finalizeDrop();
    };
    const cleanup = () => {
      if (placeholder && placeholder.isConnected) placeholder.remove();
      placeholder = null;
      draggedItem = null;
      document.body.style.userSelect = prevUserSelect;
    };
    const onDragEnd = () => {
      cleanup();
    };
    dock.addEventListener(
      "click",
      (ev) => {
        if (Date.now() < suppressClicksUntil || draggedItem) {
          ev.stopPropagation();
          ev.preventDefault();
        }
      },
      true
    );
    window.addEventListener("blur", cleanup);
    const enableDraggable = () => {
      tray.querySelectorAll(".dock-item").forEach((it) => {
        it.setAttribute("draggable", "true");
        it.addEventListener("dragstart", onDragStart);
      });
    };
    enableDraggable();
    tray.addEventListener("dragover", onDragOver);
    tray.addEventListener("drop", onDrop);
    tray.addEventListener("dragend", onDragEnd);
  }
  function updateDockIndicators() {
    const indicatorMappings = [
      { modalId: "finder-modal", indicatorId: "finder-indicator" },
      { modalId: "projects-modal", indicatorId: "projects-indicator" },
      { modalId: "settings-modal", indicatorId: "settings-indicator" },
      { modalId: "text-modal", indicatorId: "text-indicator" }
    ];
    indicatorMappings.forEach((mapping) => {
      const modal = document.getElementById(mapping.modalId);
      const indicator = document.getElementById(mapping.indicatorId);
      if (modal && indicator) {
        const minimized = modal.dataset && modal.dataset.minimized === "true";
        const domUtils = window.DOMUtils;
        if (!modal.classList.contains("hidden") || minimized) {
          if (domUtils && typeof domUtils.show === "function") {
            domUtils.show(indicator);
          } else {
            indicator.classList.remove("hidden");
          }
        } else {
          if (domUtils && typeof domUtils.hide === "function") {
            domUtils.hide(indicator);
          } else {
            indicator.classList.add("hidden");
          }
        }
      }
    });
  }
  var DOCK_ORDER_STORAGE_KEY;
  var init_dock = __esm({
    "src/ts/dock.ts"() {
      "use strict";
      DOCK_ORDER_STORAGE_KEY = "dock:order:v1";
      if (typeof window !== "undefined") {
        window.DockSystem = {
          getDockReservedBottom,
          initDockMagnification,
          initDockDragDrop,
          updateDockIndicators,
          getCurrentDockOrder,
          loadDockOrder,
          saveDockOrder,
          applyDockOrder
        };
        if (typeof window.updateDockIndicators !== "function") {
          window.updateDockIndicators = updateDockIndicators;
        }
      }
    }
  });

  // src/ts/dialog.ts
  var Dialog;
  var init_dialog = __esm({
    "src/ts/dialog.ts"() {
      "use strict";
      Dialog = class {
        constructor(modalId) {
          var _a;
          this.modalId = modalId;
          const el = document.getElementById(modalId);
          if (!el) {
            console.error(`Dialog: No element found with id "${modalId}"`);
            throw new Error(`No dialog with id ${modalId}`);
          }
          this.modal = el;
          const helper = (_a = window.StorageSystem) == null ? void 0 : _a.getDialogWindowElement;
          this.windowEl = helper ? helper(this.modal) : this.modal.querySelector(".autopointer") || this.modal;
          this.lastDragPointerX = null;
          this.init();
        }
        init() {
          this.makeDraggable();
          this.makeResizable();
          const closeButton = this.modal.querySelector(
            '.draggable-header button[id^="close-"]'
          );
          if (closeButton) {
            closeButton.style.cursor = "pointer";
            closeButton.dataset.dialogAction = "close";
            if (!closeButton.dataset.dialogBoundClose) {
              closeButton.dataset.dialogBoundClose = "true";
              closeButton.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.close();
              });
            }
          }
          const minimizeEl = this.modal.querySelector(
            ".draggable-header .bg-yellow-500.rounded-full"
          );
          const maximizeEl = this.modal.querySelector(
            ".draggable-header .bg-green-500.rounded-full"
          );
          if (minimizeEl) {
            minimizeEl.style.cursor = "pointer";
            minimizeEl.title = minimizeEl.title || "Minimieren";
            minimizeEl.dataset.dialogAction = "minimize";
            minimizeEl.addEventListener("click", (e) => {
              e.stopPropagation();
              this.minimize();
            });
          }
          if (maximizeEl) {
            maximizeEl.style.cursor = "pointer";
            maximizeEl.title = maximizeEl.title || "Maximieren";
            maximizeEl.dataset.dialogAction = "maximize";
            maximizeEl.addEventListener("click", (e) => {
              e.stopPropagation();
              this.toggleMaximize();
            });
          }
        }
        open() {
          var _a, _b, _c, _d;
          if (!this.modal) {
            console.error(`Cannot open dialog: modal element is undefined (id: ${this.modalId})`);
            return;
          }
          (_a = window.hideMenuDropdowns) == null ? void 0 : _a.call(window);
          const domUtils = window.DOMUtils;
          if (domUtils && typeof domUtils.show === "function") {
            domUtils.show(this.modal);
          } else {
            this.modal.classList.remove("hidden");
          }
          if (this.modal && this.modal.dataset) delete this.modal.dataset.minimized;
          this.bringToFront();
          this.enforceMenuBarBoundary();
          (_b = window.saveOpenModals) == null ? void 0 : _b.call(window);
          (_c = window.updateDockIndicators) == null ? void 0 : _c.call(window);
          (_d = window.updateProgramLabelByTopModal) == null ? void 0 : _d.call(window);
        }
        close() {
          var _a, _b, _c;
          if (this.modal.classList.contains("hidden")) return;
          const domUtils = window.DOMUtils;
          if (domUtils && typeof domUtils.hide === "function") {
            domUtils.hide(this.modal);
          } else {
            this.modal.classList.add("hidden");
          }
          const zIndexManager = window.__zIndexManager;
          if (zIndexManager && typeof zIndexManager.removeWindow === "function") {
            zIndexManager.removeWindow(this.modal.id);
          }
          (_a = window.saveOpenModals) == null ? void 0 : _a.call(window);
          (_b = window.updateDockIndicators) == null ? void 0 : _b.call(window);
          (_c = window.updateProgramLabelByTopModal) == null ? void 0 : _c.call(window);
        }
        minimize() {
          var _a, _b, _c;
          if (this.modal.dataset) this.modal.dataset.minimized = "true";
          const domUtils = window.DOMUtils;
          if (domUtils && typeof domUtils.hide === "function") {
            if (!this.modal.classList.contains("hidden")) {
              domUtils.hide(this.modal);
            }
          } else {
            if (!this.modal.classList.contains("hidden")) {
              this.modal.classList.add("hidden");
            }
          }
          (_a = window.saveOpenModals) == null ? void 0 : _a.call(window);
          (_b = window.updateDockIndicators) == null ? void 0 : _b.call(window);
          (_c = window.updateProgramLabelByTopModal) == null ? void 0 : _c.call(window);
        }
        toggleMaximize() {
          var _a, _b, _c, _d;
          const target = this.windowEl || this.modal;
          if (!target) return;
          this.unsnap({ silent: true });
          const ds = this.modal.dataset || {};
          const isMax = ds.maximized === "true";
          if (isMax) {
            if (ds.prevLeft !== void 0) target.style.left = ds.prevLeft;
            if (ds.prevTop !== void 0) target.style.top = ds.prevTop;
            if (ds.prevWidth !== void 0) target.style.width = ds.prevWidth;
            if (ds.prevHeight !== void 0) target.style.height = ds.prevHeight;
            if (ds.prevPosition !== void 0) target.style.position = ds.prevPosition;
            delete ds.maximized;
            delete ds.prevLeft;
            delete ds.prevTop;
            delete ds.prevWidth;
            delete ds.prevHeight;
            delete ds.prevPosition;
            this.enforceMenuBarBoundary();
            (_a = window.saveWindowPositions) == null ? void 0 : _a.call(window);
            return;
          }
          const computed = window.getComputedStyle(target);
          this.modal.dataset.prevLeft = target.style.left || computed.left || "";
          this.modal.dataset.prevTop = target.style.top || computed.top || "";
          this.modal.dataset.prevWidth = target.style.width || computed.width || "";
          this.modal.dataset.prevHeight = target.style.height || computed.height || "";
          this.modal.dataset.prevPosition = target.style.position || computed.position || "";
          const minTop = Math.round(((_b = window.getMenuBarBottom) == null ? void 0 : _b.call(window)) || 0);
          target.style.position = "fixed";
          target.style.left = "0px";
          target.style.top = `${minTop}px`;
          target.style.width = "100vw";
          target.style.height = `calc(100vh - ${minTop}px)`;
          try {
            const __dockReserve = ((_c = window.getDockReservedBottom) == null ? void 0 : _c.call(window)) || 0;
            const __maxHeight = Math.max(0, (window.innerHeight || 0) - minTop - __dockReserve);
            target.style.height = `${__maxHeight}px`;
          } catch {
          }
          this.modal.dataset.maximized = "true";
          this.bringToFront();
          (_d = window.saveWindowPositions) == null ? void 0 : _d.call(window);
        }
        snapTo(side, options = {}) {
          var _a, _b, _c;
          const target = this.windowEl || this.modal;
          if (!target) return null;
          if (side !== "left" && side !== "right") return null;
          const { silent = false } = options;
          const ds = this.modal.dataset || {};
          const alreadySnapped = ds.snapped;
          if (!alreadySnapped) {
            const computed = window.getComputedStyle(target);
            ds.prevSnapLeft = target.style.left || computed.left || "";
            ds.prevSnapTop = target.style.top || computed.top || "";
            ds.prevSnapWidth = target.style.width || computed.width || "";
            ds.prevSnapHeight = target.style.height || computed.height || "";
            ds.prevSnapPosition = target.style.position || computed.position || "";
            ds.prevSnapRight = target.style.right || computed.right || "";
            ds.prevSnapBottom = target.style.bottom || computed.bottom || "";
          }
          const metrics = (_a = window.computeSnapMetrics) == null ? void 0 : _a.call(window, side);
          if (!metrics) {
            this.unsnap({ silent: true });
            return null;
          }
          target.style.position = "fixed";
          target.style.top = `${metrics.top}px`;
          target.style.left = `${metrics.left}px`;
          target.style.width = `${metrics.width}px`;
          target.style.height = `${metrics.height}px`;
          target.style.right = "";
          target.style.bottom = "";
          this.modal.dataset.snapped = side;
          this.bringToFront();
          (_b = window.hideSnapPreview) == null ? void 0 : _b.call(window);
          if (!silent) (_c = window.saveWindowPositions) == null ? void 0 : _c.call(window);
          return side;
        }
        unsnap(options = {}) {
          var _a, _b;
          const target = this.windowEl || this.modal;
          if (!target) return false;
          const { silent = false } = options;
          const ds = this.modal.dataset || {};
          if (!ds.snapped) return false;
          const restore = (key, prop) => {
            if (Object.prototype.hasOwnProperty.call(ds, key)) {
              const value = ds[key];
              if (value === "") target.style[prop] = "";
              else target.style[prop] = value;
              delete ds[key];
            } else {
              target.style[prop] = "";
            }
          };
          restore("prevSnapLeft", "left");
          restore("prevSnapTop", "top");
          restore("prevSnapWidth", "width");
          restore("prevSnapHeight", "height");
          restore("prevSnapPosition", "position");
          restore("prevSnapRight", "right");
          restore("prevSnapBottom", "bottom");
          delete ds.snapped;
          (_a = window.hideSnapPreview) == null ? void 0 : _a.call(window);
          this.enforceMenuBarBoundary();
          if (!silent) (_b = window.saveWindowPositions) == null ? void 0 : _b.call(window);
          return true;
        }
        applySnapAfterDrag(target, pointerX) {
          var _a, _b, _c;
          if (!target) {
            (_a = window.hideSnapPreview) == null ? void 0 : _a.call(window);
            return null;
          }
          const candidate = this.getSnapCandidate(target, pointerX);
          if (candidate) {
            this.snapTo(candidate, { silent: true });
            (_b = window.hideSnapPreview) == null ? void 0 : _b.call(window);
            return candidate;
          }
          this.unsnap({ silent: true });
          (_c = window.hideSnapPreview) == null ? void 0 : _c.call(window);
          return null;
        }
        getSnapCandidate(target, pointerX) {
          if (!target) return null;
          const viewportWidth = Math.max(window.innerWidth || 0, 0);
          if (viewportWidth <= 0) return null;
          const threshold = Math.max(3, Math.min(14, viewportWidth * 35e-4));
          const rect = target.getBoundingClientRect();
          const pointerDistLeft = typeof pointerX === "number" ? Math.max(0, pointerX) : Math.abs(rect.left);
          if (Math.abs(rect.left) <= threshold || pointerDistLeft <= threshold) return "left";
          const distRight = viewportWidth - rect.right;
          const pointerDistRight = typeof pointerX === "number" ? Math.max(0, viewportWidth - pointerX) : Math.abs(distRight);
          if (Math.abs(distRight) <= threshold || pointerDistRight <= threshold) return "right";
          return null;
        }
        bringToFront() {
          const zIndexManager = window.__zIndexManager || this.initZIndexManager();
          zIndexManager.bringToFront(this.modal.id, this.modal, this.windowEl);
        }
        initZIndexManager() {
          if (window.__zIndexManager) {
            return window.__zIndexManager;
          }
          const BASE_Z_INDEX2 = 1e3;
          const MAX_WINDOW_Z_INDEX = 2147483500;
          const windowStack = [];
          window.__zIndexManager = {
            bringToFront(windowId, _modal, _windowEl) {
              const currentIndex = windowStack.indexOf(windowId);
              if (currentIndex !== -1) {
                windowStack.splice(currentIndex, 1);
              }
              windowStack.push(windowId);
              windowStack.forEach((id, index) => {
                const zIndex = BASE_Z_INDEX2 + index;
                const element = document.getElementById(id);
                if (element) {
                  const clampedZIndex = Math.min(zIndex, MAX_WINDOW_Z_INDEX);
                  element.style.zIndex = clampedZIndex.toString();
                  const win = element.querySelector(".window-container");
                  if (win) {
                    win.style.zIndex = clampedZIndex.toString();
                  }
                }
              });
              window.topZIndex = Math.min(
                BASE_Z_INDEX2 + windowStack.length,
                MAX_WINDOW_Z_INDEX
              );
            },
            removeWindow(windowId) {
              const index = windowStack.indexOf(windowId);
              if (index !== -1) {
                windowStack.splice(index, 1);
              }
            },
            getWindowStack() {
              return [...windowStack];
            },
            restoreWindowStack(savedStack) {
              windowStack.length = 0;
              savedStack.forEach((windowId) => {
                const element = document.getElementById(windowId);
                if (element) {
                  windowStack.push(windowId);
                }
              });
              windowStack.forEach((id, index) => {
                const zIndex = BASE_Z_INDEX2 + index;
                const element = document.getElementById(id);
                if (element) {
                  const clampedZIndex = Math.min(zIndex, MAX_WINDOW_Z_INDEX);
                  element.style.zIndex = clampedZIndex.toString();
                  const win = element.querySelector(".window-container");
                  if (win) {
                    win.style.zIndex = clampedZIndex.toString();
                  }
                }
              });
              window.topZIndex = Math.min(
                BASE_Z_INDEX2 + windowStack.length,
                MAX_WINDOW_Z_INDEX
              );
            },
            reset() {
              windowStack.length = 0;
              window.topZIndex = BASE_Z_INDEX2;
            }
          };
          return window.__zIndexManager;
        }
        refocus() {
          var _a, _b, _c;
          this.bringToFront();
          (_a = window.hideMenuDropdowns) == null ? void 0 : _a.call(window);
          (_b = window.saveOpenModals) == null ? void 0 : _b.call(window);
          (_c = window.updateProgramLabelByTopModal) == null ? void 0 : _c.call(window);
        }
        makeDraggable() {
          const header = this.modal.querySelector(".draggable-header");
          const target = this.windowEl || this.modal;
          if (!header || !target) return;
          header.style.cursor = "move";
          let offsetX = 0, offsetY = 0;
          header.addEventListener("mousedown", (e) => {
            var _a, _b, _c;
            this.refocus();
            if (e.target.closest && e.target.closest('button[id^="close-"]'))
              return;
            if (e.target.closest && e.target.closest("[data-dialog-action]"))
              return;
            if (this.modal.dataset && this.modal.dataset.maximized === "true") return;
            const pointerX = e.clientX;
            const pointerY = e.clientY;
            const initialSnapSide = this.modal.dataset ? this.modal.dataset.snapped : null;
            let rect = target.getBoundingClientRect();
            let localOffsetX = pointerX - rect.left;
            let localOffsetY = pointerY - rect.top;
            if (initialSnapSide) {
              const preservedOffsetX = localOffsetX;
              const preservedOffsetY = localOffsetY;
              this.unsnap({ silent: true });
              const minTopAfterUnsnap = ((_a = window.getMenuBarBottom) == null ? void 0 : _a.call(window)) || 0;
              target.style.position = "fixed";
              target.style.left = `${pointerX - preservedOffsetX}px`;
              target.style.top = `${Math.max(minTopAfterUnsnap, pointerY - preservedOffsetY)}px`;
              rect = target.getBoundingClientRect();
              localOffsetX = pointerX - rect.left;
              localOffsetY = pointerY - rect.top;
            }
            const computedPosition = window.getComputedStyle(target).position;
            if (computedPosition === "static" || computedPosition === "relative") {
              target.style.position = "fixed";
            } else if (!target.style.position) {
              target.style.position = computedPosition;
            }
            const minTop = ((_b = window.getMenuBarBottom) == null ? void 0 : _b.call(window)) || 0;
            target.style.left = `${pointerX - localOffsetX}px`;
            target.style.top = `${Math.max(minTop, pointerY - localOffsetY)}px`;
            (_c = window.clampWindowToMenuBar) == null ? void 0 : _c.call(window, target);
            const adjustedRect = target.getBoundingClientRect();
            offsetX = pointerX - adjustedRect.left;
            offsetY = pointerY - adjustedRect.top;
            this.lastDragPointerX = pointerX;
            const overlay = document.createElement("div");
            overlay.style.position = "fixed";
            overlay.style.top = "0";
            overlay.style.left = "0";
            overlay.style.width = "100%";
            overlay.style.height = "100%";
            overlay.style.zIndex = "9999";
            overlay.style.cursor = "move";
            overlay.style.backgroundColor = "transparent";
            document.body.appendChild(overlay);
            let isDragging = true;
            let moved = false;
            const cleanup = (shouldSave = true) => {
              var _a2, _b2;
              if (!isDragging) return;
              isDragging = false;
              overlay.remove();
              overlay.removeEventListener("mousemove", mouseMoveHandler);
              overlay.removeEventListener("mouseup", mouseUpHandler);
              window.removeEventListener("mouseup", mouseUpHandler);
              window.removeEventListener("blur", blurHandler);
              window.removeEventListener("mousemove", mouseMoveHandler);
              (_a2 = window.hideSnapPreview) == null ? void 0 : _a2.call(window);
              if (shouldSave) {
                if (moved) {
                  this.applySnapAfterDrag(target, this.lastDragPointerX);
                } else if (initialSnapSide) {
                  this.snapTo(initialSnapSide, { silent: true });
                }
                (_b2 = window.saveWindowPositions) == null ? void 0 : _b2.call(window);
              }
              this.lastDragPointerX = null;
            };
            const mouseMoveHandler = (e2) => {
              moved = true;
              window.requestAnimationFrame(() => {
                var _a2, _b2, _c2;
                const newLeft = e2.clientX - offsetX;
                const newTop = e2.clientY - offsetY;
                const minTop2 = ((_a2 = window.getMenuBarBottom) == null ? void 0 : _a2.call(window)) || 0;
                target.style.left = newLeft + "px";
                target.style.top = Math.max(minTop2, newTop) + "px";
                this.lastDragPointerX = e2.clientX;
                const candidate = this.getSnapCandidate(target, this.lastDragPointerX);
                if (candidate) (_b2 = window.showSnapPreview) == null ? void 0 : _b2.call(window, candidate);
                else (_c2 = window.hideSnapPreview) == null ? void 0 : _c2.call(window);
              });
            };
            const mouseUpHandler = () => cleanup(true);
            const blurHandler = () => cleanup(true);
            overlay.addEventListener("mousemove", mouseMoveHandler);
            overlay.addEventListener("mouseup", mouseUpHandler);
            window.addEventListener("mousemove", mouseMoveHandler);
            window.addEventListener("mouseup", mouseUpHandler);
            window.addEventListener("blur", blurHandler);
            e.preventDefault();
          });
        }
        makeResizable() {
          if (this.modal.dataset.noResize === "true") return;
          const target = this.windowEl || this.modal;
          if (!target) return;
          const existingHandles = target.querySelectorAll(".resizer");
          existingHandles.forEach((handle) => handle.remove());
          const computedPosition = window.getComputedStyle(target).position;
          if (!computedPosition || computedPosition === "static") target.style.position = "relative";
          const ensureFixedPosition = () => {
            const computed = window.getComputedStyle(target);
            const rect = target.getBoundingClientRect();
            if (computed.position === "static" || computed.position === "relative") {
              target.style.position = "fixed";
              target.style.left = rect.left + "px";
              target.style.top = rect.top + "px";
            } else {
              if (!target.style.left) target.style.left = rect.left + "px";
              if (!target.style.top) target.style.top = rect.top + "px";
            }
          };
          const createHandle = (handle) => {
            const resizer = document.createElement("div");
            resizer.classList.add("resizer", `resizer-${handle.name}`);
            Object.assign(resizer.style, {
              position: "absolute",
              zIndex: "9999",
              backgroundColor: "transparent",
              pointerEvents: "auto",
              touchAction: "none",
              cursor: handle.cursor,
              ...handle.style || {}
            });
            target.appendChild(resizer);
            const startResize = (event) => {
              event.preventDefault();
              event.stopPropagation();
              this.refocus();
              ensureFixedPosition();
              const startX = event.clientX;
              const startY = event.clientY;
              const rect = target.getBoundingClientRect();
              const computed = window.getComputedStyle(target);
              const minWidth = parseFloat(computed.minWidth) || 240;
              const minHeight = parseFloat(computed.minHeight) || 160;
              let startLeft = parseFloat(computed.left);
              let startTop = parseFloat(computed.top);
              if (!Number.isFinite(startLeft)) startLeft = rect.left;
              if (!Number.isFinite(startTop)) startTop = rect.top;
              const startWidth = rect.width;
              const startHeight = rect.height;
              const overlay = document.createElement("div");
              Object.assign(overlay.style, {
                position: "fixed",
                top: "0",
                left: "0",
                width: "100%",
                height: "100%",
                zIndex: "9999",
                cursor: handle.cursor,
                backgroundColor: "transparent",
                touchAction: "none"
              });
              document.body.appendChild(overlay);
              let resizing = true;
              const applySize = (clientX, clientY) => {
                if (!resizing) return;
                window.requestAnimationFrame(() => {
                  var _a;
                  const dx = clientX - startX;
                  const dy = clientY - startY;
                  let newWidth = startWidth;
                  let newHeight = startHeight;
                  let newLeft = startLeft;
                  let newTop = startTop;
                  if (handle.directions.includes("e")) newWidth = startWidth + dx;
                  if (handle.directions.includes("s")) newHeight = startHeight + dy;
                  if (handle.directions.includes("w")) {
                    newWidth = startWidth - dx;
                    newLeft = startLeft + dx;
                  }
                  if (handle.directions.includes("n")) {
                    newHeight = startHeight - dy;
                    newTop = startTop + dy;
                  }
                  if (newWidth < minWidth) {
                    const deficit = minWidth - newWidth;
                    if (handle.directions.includes("w")) newLeft -= deficit;
                    newWidth = minWidth;
                  }
                  if (newHeight < minHeight) {
                    const deficit = minHeight - newHeight;
                    if (handle.directions.includes("n")) newTop -= deficit;
                    newHeight = minHeight;
                  }
                  const minTop = ((_a = window.getMenuBarBottom) == null ? void 0 : _a.call(window)) || 0;
                  if (handle.directions.includes("n") && newTop < minTop) {
                    const overshoot = minTop - newTop;
                    newTop = minTop;
                    newHeight = Math.max(minHeight, newHeight - overshoot);
                  }
                  if (handle.directions.includes("w") || handle.directions.includes("e"))
                    target.style.width = Math.max(minWidth, newWidth) + "px";
                  if (handle.directions.includes("s") || handle.directions.includes("n"))
                    target.style.height = Math.max(minHeight, newHeight) + "px";
                  if (handle.directions.includes("w")) target.style.left = newLeft + "px";
                  if (handle.directions.includes("n")) target.style.top = newTop + "px";
                });
              };
              const stopResize = () => {
                var _a, _b;
                if (!resizing) return;
                resizing = false;
                overlay.remove();
                overlay.removeEventListener("mousemove", overlayMouseMove);
                overlay.removeEventListener("mouseup", overlayMouseUp);
                window.removeEventListener("mousemove", windowMouseMove);
                window.removeEventListener("mouseup", windowMouseUp);
                window.removeEventListener("blur", onBlur);
                (_a = window.clampWindowToMenuBar) == null ? void 0 : _a.call(window, target);
                (_b = window.saveWindowPositions) == null ? void 0 : _b.call(window);
              };
              const overlayMouseMove = (moveEvent) => applySize(moveEvent.clientX, moveEvent.clientY);
              const windowMouseMove = (moveEvent) => applySize(moveEvent.clientX, moveEvent.clientY);
              const overlayMouseUp = () => stopResize();
              const windowMouseUp = () => stopResize();
              const onBlur = () => stopResize();
              overlay.addEventListener("mousemove", overlayMouseMove);
              overlay.addEventListener("mouseup", overlayMouseUp);
              window.addEventListener("mousemove", windowMouseMove);
              window.addEventListener("mouseup", windowMouseUp);
              window.addEventListener("blur", onBlur);
            };
            resizer.addEventListener("mousedown", startResize);
          };
          target.style.overflow = "visible";
          const handles = [
            {
              name: "top",
              cursor: "n-resize",
              directions: ["n"],
              style: { top: "-4px", left: "12px", right: "12px", height: "8px" }
            },
            {
              name: "bottom",
              cursor: "s-resize",
              directions: ["s"],
              style: { bottom: "-4px", left: "12px", right: "12px", height: "8px" }
            },
            {
              name: "left",
              cursor: "w-resize",
              directions: ["w"],
              style: { left: "-4px", top: "12px", bottom: "12px", width: "8px" }
            },
            {
              name: "right",
              cursor: "e-resize",
              directions: ["e"],
              style: { right: "-4px", top: "12px", bottom: "12px", width: "8px" }
            },
            {
              name: "top-left",
              cursor: "nw-resize",
              directions: ["n", "w"],
              style: { top: "-6px", left: "-6px", width: "14px", height: "14px" }
            },
            {
              name: "top-right",
              cursor: "ne-resize",
              directions: ["n", "e"],
              style: { top: "-6px", right: "-6px", width: "14px", height: "14px" }
            },
            {
              name: "bottom-left",
              cursor: "sw-resize",
              directions: ["s", "w"],
              style: { bottom: "-6px", left: "-6px", width: "14px", height: "14px" }
            },
            {
              name: "bottom-right",
              cursor: "se-resize",
              directions: ["s", "e"],
              style: { bottom: "-6px", right: "-6px", width: "14px", height: "14px" }
            }
          ];
          handles.forEach(createHandle);
        }
        enforceMenuBarBoundary() {
          var _a;
          (_a = window.clampWindowToMenuBar) == null ? void 0 : _a.call(window, this.windowEl || this.modal);
        }
        loadIframe(url) {
          let contentArea = this.modal.querySelector(".dialog-content");
          if (!contentArea) {
            contentArea = document.createElement("div");
            contentArea.classList.add("dialog-content");
            contentArea.style.width = "100%";
            contentArea.style.height = "100%";
            this.modal.appendChild(contentArea);
          }
          contentArea.innerHTML = "";
          const iframe = document.createElement("iframe");
          iframe.src = url;
          iframe.style.width = "100%";
          iframe.style.height = "100%";
          iframe.style.border = "none";
          iframe.setAttribute("allow", "fullscreen");
          contentArea.appendChild(iframe);
          iframe.addEventListener("load", () => {
            try {
              const cw = iframe.contentWindow;
              if (cw && cw.document) {
                const handler = () => requestAnimationFrame(() => {
                  this.refocus();
                });
                ["mousedown", "click", "touchstart"].forEach((evt) => {
                  cw.document.addEventListener(evt, handler);
                });
              } else if (cw) {
                ["mousedown", "click", "touchstart"].forEach((evt) => {
                  cw.addEventListener(
                    evt,
                    () => requestAnimationFrame(() => {
                      this.refocus();
                    })
                  );
                });
              }
            } catch (err) {
              console.error("Could not attach mousedown event in iframe:", err);
            }
          });
        }
        saveState() {
          return {
            left: this.modal.style.left,
            top: this.modal.style.top,
            width: this.modal.style.width,
            height: this.modal.style.height,
            zIndex: this.modal.style.zIndex
          };
        }
        restoreState(state) {
          if (!state) return;
          if (state.left) this.modal.style.left = state.left;
          if (state.top) this.modal.style.top = state.top;
          if (state.width) this.modal.style.width = state.width;
          if (state.height) this.modal.style.height = state.height;
          if (state.zIndex) this.modal.style.zIndex = state.zIndex;
        }
      };
      window.Dialog = Dialog;
    }
  });

  // src/ts/menubar-utils.ts
  var require_menubar_utils = __commonJS({
    "src/ts/menubar-utils.ts"() {
      "use strict";
      (function() {
        "use strict";
        if (window.bindDropdownTrigger && window.hideMenuDropdowns) {
          return;
        }
        function hideMenuDropdowns() {
          const domUtils = window.DOMUtils;
          document.querySelectorAll(".menu-dropdown").forEach((dropdown) => {
            if (!dropdown.classList.contains("hidden")) {
              if (domUtils && typeof domUtils.hide === "function") {
                domUtils.hide(dropdown);
              } else {
                dropdown.classList.add("hidden");
              }
            }
          });
          document.querySelectorAll('[data-menubar-trigger-button="true"]').forEach((button) => {
            button.setAttribute("aria-expanded", "false");
          });
          document.querySelectorAll("[data-system-menu-trigger]").forEach((button) => {
            button.setAttribute("aria-expanded", "false");
          });
        }
        function isAnyDropdownOpen() {
          return Boolean(document.querySelector(".menu-dropdown:not(.hidden)"));
        }
        function toggleMenuDropdown(trigger, options = {}) {
          if (!trigger) return;
          const menuId = trigger.getAttribute("aria-controls");
          if (!menuId) return;
          const forceOpen = Boolean(options.forceOpen);
          let menu = document.getElementById(menuId);
          if (!menu) return;
          const wasOpen = !menu.classList.contains("hidden");
          const shouldOpen = forceOpen || !wasOpen;
          hideMenuDropdowns();
          if (shouldOpen) {
            if (!wasOpen) {
              const MenuSystem = window.MenuSystem;
              if (MenuSystem && typeof MenuSystem.renderApplicationMenu === "function") {
                const topModal = Array.from(
                  document.querySelectorAll(".modal:not(.hidden)")
                ).sort((a, b) => {
                  const zA = parseInt(getComputedStyle(a).zIndex, 10) || 0;
                  const zB = parseInt(getComputedStyle(b).zIndex, 10) || 0;
                  return zB - zA;
                })[0];
                const activeModalId = (topModal == null ? void 0 : topModal.id) || null;
                MenuSystem.renderApplicationMenu(activeModalId);
              }
              menu = document.getElementById(menuId);
              if (!menu) return;
            }
            const domUtils = window.DOMUtils;
            if (domUtils && typeof domUtils.show === "function") {
              domUtils.show(menu);
            } else {
              menu.classList.remove("hidden");
            }
            trigger.setAttribute("aria-expanded", "true");
          }
        }
        function bindDropdownTrigger(el, options = {}) {
          if (!el) return;
          const hoverRequiresExisting = options.hoverRequiresOpen !== void 0 ? options.hoverRequiresOpen : true;
          let clickJustOccurred = false;
          el.addEventListener("click", (event) => {
            event.stopPropagation();
            clickJustOccurred = true;
            const now = Date.now();
            window.__lastMenuInteractionAt = now;
            const menuId = el.getAttribute("aria-controls");
            const menu = menuId ? document.getElementById(menuId) : null;
            const isOpen = menu ? !menu.classList.contains("hidden") : false;
            const sinceFocus = now - (window.__lastMenuFocusAt || 0);
            if (isOpen && sinceFocus > 200) {
              hideMenuDropdowns();
              el.setAttribute("aria-expanded", "false");
            } else {
              toggleMenuDropdown(el, { forceOpen: true });
            }
            setTimeout(() => {
              clickJustOccurred = false;
            }, 200);
          });
          el.addEventListener("mouseenter", () => {
            if (clickJustOccurred) return;
            window.__lastMenuInteractionAt = Date.now();
            if (hoverRequiresExisting && !isAnyDropdownOpen()) return;
            toggleMenuDropdown(el, { forceOpen: true });
          });
          el.addEventListener("focus", () => {
            const now = Date.now();
            window.__lastMenuInteractionAt = now;
            window.__lastMenuFocusAt = now;
            toggleMenuDropdown(el, { forceOpen: true });
          });
        }
        function handleDocumentClickToCloseMenus(event) {
          const last = window.__lastMenuInteractionAt;
          if (last && Date.now() - last < 200) {
            return;
          }
          const target = event.target instanceof Element ? event.target : null;
          if (!target) return;
          if (target.closest(".menubar-trigger") || target.closest(".menu-dropdown")) return;
          hideMenuDropdowns();
        }
        function initMenubarWiring() {
          if (window.__menubarWired) return;
          window.__menubarWired = true;
          const appleMenuTrigger = document.getElementById("apple-menu-trigger");
          const programLabel = document.getElementById("program-label");
          bindDropdownTrigger(appleMenuTrigger, { hoverRequiresOpen: true });
          bindDropdownTrigger(programLabel, { hoverRequiresOpen: true });
          document.addEventListener("click", (event) => {
            const MenuSystem = window.MenuSystem;
            if (MenuSystem && typeof MenuSystem.handleMenuActionActivation === "function") {
              MenuSystem.handleMenuActionActivation(event);
            }
          });
          document.addEventListener("click", handleDocumentClickToCloseMenus);
          document.addEventListener("pointerdown", handleDocumentClickToCloseMenus, {
            capture: true
          });
          document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") hideMenuDropdowns();
          });
        }
        window.hideMenuDropdowns = hideMenuDropdowns;
        window.bindDropdownTrigger = bindDropdownTrigger;
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", initMenubarWiring, { once: true });
        } else {
          initMenubarWiring();
        }
      })();
    }
  });

  // src/ts/context-menu.ts
  var guardKey, openModal2, toggleDarkMode2, getMenuItemsForTarget2, clearMenu2, renderMenu2, clampPosition2, showContextMenu2, buildAndOpenAt2, hideContextMenu2, bindAutoClose2, unbindAutoClose2;
  var init_context_menu = __esm({
    "src/ts/context-menu.ts"() {
      "use strict";
      guardKey = "__customContextMenuInit";
      if (window[guardKey]) {
      } else {
        let openModal = function(id) {
          const el = document.getElementById(id);
          if (!el) return;
          if (!window.dialogs) window.dialogs = {};
          if (!window.dialogs[id] && typeof window.Dialog === "function") {
            try {
              window.dialogs[id] = new window.Dialog(id);
            } catch {
            }
          }
          const dlg = window.dialogs[id];
          if (dlg && typeof dlg.open === "function") {
            dlg.open();
          } else {
            const domUtils = window.DOMUtils;
            if (domUtils && typeof domUtils.show === "function") {
              domUtils.show(el);
            } else {
              el.classList.remove("hidden");
            }
            if (typeof window.bringDialogToFront === "function") {
              window.bringDialogToFront(id);
            }
          }
          if (typeof window.updateProgramLabelByTopModal === "function") {
            window.updateProgramLabelByTopModal();
          }
        }, toggleDarkMode = function() {
          if (window.SystemUI && typeof window.SystemUI.handleSystemToggle === "function") {
            window.SystemUI.handleSystemToggle("dark-mode");
          } else {
            const next = !document.documentElement.classList.contains("dark");
            document.documentElement.classList.toggle("dark", next);
            if (window.ThemeSystem && typeof window.ThemeSystem.setThemePreference === "function") {
              window.ThemeSystem.setThemePreference(next ? "dark" : "light");
            }
          }
        }, getMenuItemsForTarget = function(target) {
          const items = [];
          const inDesktop = !!(target && target.closest && target.closest("#desktop"));
          const inDockItem = !!(target && target.closest && target.closest("#dock .dock-item"));
          const inImageModal = !!(target && target.closest && target.closest("#image-modal"));
          const inFinderModal = !!(target && target.closest && target.closest("#finder-modal"));
          if (inDockItem) {
            const dockItem = target.closest("#dock .dock-item");
            const winId = dockItem && dockItem.getAttribute("data-window-id");
            if (winId) {
              items.push({
                id: "open-dock-window",
                label: i18n.translate("context.open") || "\xD6ffnen",
                action: () => openModal(winId)
              });
              items.push({ type: "separator" });
            }
          }
          if (inImageModal && typeof window.getImageViewerState === "function") {
            const st = window.getImageViewerState();
            if (st && st.hasImage) {
              items.push({
                id: "image-open-tab",
                label: i18n.translate("context.image.openInTab") || i18n.translate("menu.image.openInTab") || "Bild in neuem Tab \xF6ffnen",
                action: () => {
                  if (typeof window.openActiveImageInNewTab === "function")
                    window.openActiveImageInNewTab();
                }
              });
              items.push({
                id: "image-save",
                label: i18n.translate("context.image.save") || i18n.translate("menu.image.saveImage") || "Bild sichern \u2026",
                action: () => {
                  if (typeof window.downloadActiveImage === "function")
                    window.downloadActiveImage();
                }
              });
              items.push({ type: "separator" });
            }
          }
          if (inFinderModal) {
            const finderItem = target && target.closest && target.closest(".finder-list-item, .finder-grid-item");
            if (finderItem) {
              const itemName = finderItem.getAttribute("data-item-name");
              const itemType = finderItem.getAttribute("data-item-type");
              if (itemName && itemType) {
                items.push({
                  id: "finder-open-item",
                  label: i18n.translate("context.finder.openItem") || "\xD6ffnen",
                  action: () => {
                    if (window.FinderSystem && typeof window.FinderSystem.openItem === "function")
                      window.FinderSystem.openItem(itemName, itemType);
                  }
                });
                const isImage = /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(itemName);
                if (isImage && itemType === "file") {
                  items.push({
                    id: "finder-open-with-preview",
                    label: i18n.translate("context.finder.openWithPreview") || "\xD6ffnen mit Vorschau",
                    action: () => {
                      const ab = window.ActionBus;
                      if (ab && typeof ab.execute === "function") {
                        ab.execute("openWithPreview", { itemName });
                      }
                    }
                  });
                }
                items.push({ type: "separator" });
                items.push({
                  id: "finder-get-info",
                  label: i18n.translate("context.finder.getInfo") || "Informationen",
                  action: () => {
                    console.log("Get info for:", itemName, itemType);
                  }
                });
                return items;
              }
            }
            items.push({
              id: "finder-refresh",
              label: i18n.translate("context.finder.refresh") || "Aktualisieren",
              action: () => {
                if (window.FinderSystem && typeof window.FinderSystem.navigateTo === "function") {
                  const state = window.FinderSystem.getState();
                  if (state) {
                    window.FinderSystem.navigateTo(
                      state.currentPath,
                      state.currentView
                    );
                  }
                }
              }
            });
            items.push({ type: "separator" });
            const currentViewMode = window.FinderSystem && window.FinderSystem.getState ? window.FinderSystem.getState().viewMode : "list";
            if (currentViewMode !== "list") {
              items.push({
                id: "finder-view-list",
                label: i18n.translate("context.finder.viewList") || "Als Liste",
                action: () => {
                  if (window.FinderSystem && typeof window.FinderSystem.setViewMode === "function")
                    window.FinderSystem.setViewMode("list");
                }
              });
            }
            if (currentViewMode !== "grid") {
              items.push({
                id: "finder-view-grid",
                label: i18n.translate("context.finder.viewGrid") || "Als Raster",
                action: () => {
                  if (window.FinderSystem && typeof window.FinderSystem.setViewMode === "function")
                    window.FinderSystem.setViewMode("grid");
                }
              });
            }
            items.push({ type: "separator" });
            items.push({
              id: "finder-sort-name",
              label: i18n.translate("context.finder.sortByName") || "Nach Name sortieren",
              action: () => {
                if (window.FinderSystem && typeof window.FinderSystem.setSortBy === "function")
                  window.FinderSystem.setSortBy("name");
              }
            });
            items.push({
              id: "finder-sort-date",
              label: i18n.translate("context.finder.sortByDate") || "Nach Datum sortieren",
              action: () => {
                if (window.FinderSystem && typeof window.FinderSystem.setSortBy === "function")
                  window.FinderSystem.setSortBy("date");
              }
            });
            items.push({
              id: "finder-sort-size",
              label: i18n.translate("context.finder.sortBySize") || "Nach Gr\xF6\xDFe sortieren",
              action: () => {
                if (window.FinderSystem && typeof window.FinderSystem.setSortBy === "function")
                  window.FinderSystem.setSortBy("size");
              }
            });
            return items;
          }
          if (inDesktop) {
            items.push({
              id: "open-finder",
              label: i18n.translate("context.openFinder") || "Finder \xF6ffnen",
              action: () => openModal("finder-modal")
            });
            items.push({
              id: "open-text",
              label: i18n.translate("context.openTextEditor") || "Texteditor \xF6ffnen",
              action: () => openModal("text-modal")
            });
            items.push({
              id: "open-projects",
              label: i18n.translate("context.openProjects") || "Projekte \xF6ffnen",
              action: () => openModal("projects-modal")
            });
            items.push({ type: "separator" });
            items.push({
              id: "toggle-dark",
              label: i18n.translate("context.toggleDarkMode") || "Dark Mode umschalten",
              action: toggleDarkMode
            });
            items.push({
              id: "open-settings",
              label: i18n.translate("context.openSettings") || "Systemeinstellungen \u2026",
              action: () => openModal("settings-modal")
            });
            items.push({ type: "separator" });
            items.push({
              id: "about",
              label: i18n.translate("context.about") || "\xDCber Marvin",
              action: () => openModal("about-modal")
            });
            return items;
          }
          items.push({
            id: "open-finder",
            label: i18n.translate("context.openFinder") || "Finder \xF6ffnen",
            action: () => openModal("finder-modal")
          });
          items.push({
            id: "open-text",
            label: i18n.translate("context.openTextEditor") || "Texteditor \xF6ffnen",
            action: () => openModal("text-modal")
          });
          items.push({ type: "separator" });
          items.push({
            id: "toggle-dark",
            label: i18n.translate("context.toggleDarkMode") || "Dark Mode umschalten",
            action: toggleDarkMode
          });
          items.push({
            id: "open-settings",
            label: i18n.translate("context.openSettings") || "Systemeinstellungen \u2026",
            action: () => openModal("settings-modal")
          });
          items.push({ type: "separator" });
          items.push({
            id: "about",
            label: i18n.translate("context.about") || "\xDCber Marvin",
            action: () => openModal("about-modal")
          });
          return items;
        }, clearMenu = function() {
          while (menu.firstChild) menu.removeChild(menu.firstChild);
        }, renderMenu = function(items) {
          clearMenu();
          const fragment = document.createDocumentFragment();
          let firstFocusable = null;
          items.forEach((it, idx) => {
            if (it.type === "separator") {
              const sep = document.createElement("li");
              sep.className = "menu-separator";
              sep.setAttribute("role", "separator");
              fragment.appendChild(sep);
              return;
            }
            const li = document.createElement("li");
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "menu-item";
            btn.setAttribute("role", "menuitem");
            btn.tabIndex = -1;
            btn.dataset.itemId = it.id || "item-" + idx;
            const labelSpan = document.createElement("span");
            labelSpan.className = "menu-item-label";
            labelSpan.textContent = it.label || "";
            btn.appendChild(labelSpan);
            btn.addEventListener("click", (ev) => {
              ev.stopPropagation();
              hideContextMenu();
              try {
                if (it.action) {
                  it.action();
                }
              } catch (e) {
                console.warn("Context action failed", e);
              }
            });
            li.appendChild(btn);
            fragment.appendChild(li);
            if (!firstFocusable) firstFocusable = btn;
          });
          menu.appendChild(fragment);
          try {
            i18n.applyTranslations(menu);
          } catch {
          }
          return firstFocusable;
        }, clampPosition = function(x, y) {
          const rect = menu.getBoundingClientRect();
          const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
          const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
          const margin = 6;
          const nx = Math.min(Math.max(margin, x), Math.max(margin, vw - rect.width - margin));
          const ny = Math.min(Math.max(margin, y), Math.max(margin, vh - rect.height - margin));
          return { x: nx, y: ny };
        }, showContextMenu = function(ev) {
          const target = ev.target instanceof Element ? ev.target : null;
          if (!target) return;
          if (target.closest('input, textarea, [contenteditable="true"]')) return;
          ev.preventDefault();
          ev.stopPropagation();
          hideAllDropdowns();
          buildAndOpenAt(ev.clientX, ev.clientY, target);
        }, buildAndOpenAt = function(x, y, target) {
          const items = getMenuItemsForTarget(target);
          const firstFocusable = renderMenu(items);
          if (document.body && menu.parentElement !== document.body) {
            document.body.appendChild(menu);
          } else if (document.body && document.body.lastElementChild !== menu) {
            document.body.appendChild(menu);
          }
          const domUtils = window.DOMUtils;
          if (domUtils && typeof domUtils.show === "function") {
            domUtils.show(menu);
          } else {
            menu.classList.remove("hidden");
          }
          menu.style.left = Math.max(0, x) + "px";
          menu.style.top = Math.max(0, y) + "px";
          const clamped = clampPosition(x, y);
          menu.style.left = clamped.x + "px";
          menu.style.top = clamped.y + "px";
          if (lastInvokeWasKeyboard && firstFocusable) {
            firstFocusable.focus();
          }
          bindAutoClose();
        }, hideContextMenu = function() {
          const domUtils = window.DOMUtils;
          if (!menu.classList.contains("hidden")) {
            if (domUtils && typeof domUtils.hide === "function") {
              domUtils.hide(menu);
            } else {
              menu.classList.add("hidden");
            }
          }
          unbindAutoClose();
        }, bindAutoClose = function() {
          unbindAutoClose();
          onDocClick = (e) => {
            const t = e.target instanceof Element ? e.target : null;
            if (!t) {
              hideContextMenu();
              return;
            }
            if (t.closest("#context-menu")) return;
            hideContextMenu();
          };
          onDocScroll = () => hideContextMenu();
          onResize = () => hideContextMenu();
          onKeyDown = (e) => {
            var _a, _b;
            const items = Array.from(menu.querySelectorAll(".menu-item"));
            const focusIdx = items.findIndex((el) => el === document.activeElement);
            if (e.key === "Escape") {
              e.preventDefault();
              hideContextMenu();
              return;
            }
            if (!items.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              const next = items[(Math.max(0, focusIdx) + 1) % items.length];
              if (next) next.focus();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              const next = items[(focusIdx > 0 ? focusIdx : items.length) - 1];
              if (next) next.focus();
            } else if (e.key === "Home") {
              e.preventDefault();
              (_a = items[0]) == null ? void 0 : _a.focus();
            } else if (e.key === "End") {
              e.preventDefault();
              (_b = items[items.length - 1]) == null ? void 0 : _b.focus();
            } else if (e.key === "Enter" || e.key === " ") {
              if (document.activeElement && document.activeElement.classList.contains("menu-item")) {
                e.preventDefault();
                document.activeElement.click();
              }
            }
          };
          document.addEventListener("click", onDocClick, { capture: true });
          document.addEventListener("contextmenu", onDocClick, { capture: true });
          document.addEventListener("scroll", onDocScroll, { capture: true });
          window.addEventListener("resize", onResize);
          document.addEventListener("keydown", onKeyDown);
        }, unbindAutoClose = function() {
          if (onDocClick)
            document.removeEventListener("click", onDocClick, { capture: true });
          if (onDocClick)
            document.removeEventListener("contextmenu", onDocClick, {
              capture: true
            });
          if (onDocScroll)
            document.removeEventListener("scroll", onDocScroll, { capture: true });
          if (onResize) window.removeEventListener("resize", onResize);
          if (onKeyDown) document.removeEventListener("keydown", onKeyDown);
          onDocClick = onDocScroll = onResize = onKeyDown = null;
        };
        openModal2 = openModal, toggleDarkMode2 = toggleDarkMode, getMenuItemsForTarget2 = getMenuItemsForTarget, clearMenu2 = clearMenu, renderMenu2 = renderMenu, clampPosition2 = clampPosition, showContextMenu2 = showContextMenu, buildAndOpenAt2 = buildAndOpenAt, hideContextMenu2 = hideContextMenu, bindAutoClose2 = bindAutoClose, unbindAutoClose2 = unbindAutoClose;
        window[guardKey] = true;
        const i18n = window.appI18n || {
          translate: (k) => k,
          applyTranslations: (_el) => {
          }
        };
        const hideAllDropdowns = typeof window.hideMenuDropdowns === "function" ? window.hideMenuDropdowns : () => {
          const domUtils = window.DOMUtils;
          document.querySelectorAll(".menu-dropdown").forEach((d) => {
            if (domUtils && typeof domUtils.hide === "function") {
              domUtils.hide(d);
            } else {
              d.classList.add("hidden");
            }
          });
          document.querySelectorAll('[aria-expanded="true"]').forEach((b) => b.setAttribute("aria-expanded", "false"));
        };
        const menu = document.createElement("ul");
        menu.id = "context-menu";
        menu.className = "menu-dropdown context-menu hidden";
        menu.setAttribute("role", "menu");
        menu.setAttribute("aria-label", i18n.translate("context.menuLabel") || "Kontextmen\xFC");
        document.addEventListener("DOMContentLoaded", () => {
          if (!document.body.contains(menu)) document.body.appendChild(menu);
          try {
            i18n.applyTranslations(menu);
          } catch {
          }
        });
        let onDocClick = null;
        let onDocScroll = null;
        let onResize = null;
        let onKeyDown = null;
        let lastInvokeWasKeyboard = false;
        document.addEventListener("keydown", (e) => {
          if (e.key === "ContextMenu" || e.shiftKey && e.key === "F10") {
            lastInvokeWasKeyboard = true;
          }
        });
        document.addEventListener(
          "keyup",
          () => {
            lastInvokeWasKeyboard = false;
          },
          { capture: true }
        );
        document.addEventListener("contextmenu", showContextMenu);
        if (typeof window.bindDropdownTrigger === "function") {
          document.querySelectorAll('[data-menubar-trigger-button="true"]').forEach((btn) => {
            btn.addEventListener("click", () => hideContextMenu());
          });
        }
      }
    }
  });

  // src/ts/storage.ts
  var require_storage = __commonJS({
    "src/ts/storage.ts"() {
      "use strict";
      (() => {
        "use strict";
        console.log("\u2705 StorageSystem (TS) loaded");
        const w = window;
        const APP_CONSTANTS2 = w.APP_CONSTANTS || {};
        const FINDER_STATE_KEY = APP_CONSTANTS2.FINDER_STATE_STORAGE_KEY || "finderState";
        const OPEN_MODALS_KEY = "openModals";
        const MODAL_POSITIONS_KEY = "modalPositions";
        const getModalIds2 = () => {
          const ac = w.APP_CONSTANTS || void 0;
          const v = ac && ac["MODAL_IDS"];
          return Array.isArray(v) ? v : [];
        };
        const getTransientModalIds = () => {
          const ac = w.APP_CONSTANTS || void 0;
          const v = ac && ac["TRANSIENT_MODAL_IDS"];
          return v instanceof Set ? v : /* @__PURE__ */ new Set();
        };
        function readFinderState() {
          try {
            const raw = localStorage.getItem(FINDER_STATE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return null;
            const po = parsed;
            const repo = typeof po.repo === "string" ? po.repo.trim() : "";
            if (!repo) return null;
            return {
              repo,
              path: typeof po.path === "string" ? po.path : ""
            };
          } catch (err) {
            console.warn("Finder state konnte nicht gelesen werden:", err);
            return null;
          }
        }
        function writeFinderState(state) {
          if (!state || typeof state.repo !== "string" || !state.repo) {
            clearFinderState();
            return;
          }
          const payload = {
            repo: state.repo,
            path: typeof state.path === "string" ? state.path : ""
          };
          try {
            localStorage.setItem(FINDER_STATE_KEY, JSON.stringify(payload));
          } catch (err) {
            console.warn("Finder state konnte nicht gespeichert werden:", err);
          }
        }
        function clearFinderState() {
          try {
            localStorage.removeItem(FINDER_STATE_KEY);
          } catch (err) {
            console.warn("Finder state konnte nicht gel\xF6scht werden:", err);
          }
        }
        function saveOpenModals() {
          const modalIds = getModalIds2();
          const transientModalIds = getTransientModalIds();
          const openModals = modalIds.filter((id) => {
            if (transientModalIds.has(id)) return false;
            const el = document.getElementById(id);
            if (!el) return false;
            const minimized = el.dataset && el.dataset.minimized === "true";
            return !el.classList.contains("hidden") || minimized;
          });
          try {
            localStorage.setItem(OPEN_MODALS_KEY, JSON.stringify(openModals));
          } catch (err) {
            console.warn("Open modals konnte nicht gespeichert werden:", err);
          }
        }
        function restoreOpenModals() {
          const transientModalIds = getTransientModalIds();
          let openModals = [];
          try {
            openModals = JSON.parse(localStorage.getItem(OPEN_MODALS_KEY) || "[]");
          } catch (err) {
            console.warn("Open modals konnte nicht gelesen werden:", err);
            return;
          }
          openModals.forEach((id) => {
            if (transientModalIds.has(id)) return;
            const el = document.getElementById(id);
            if (!el) {
              console.warn(`Skipping restore of modal "${id}": element not found in DOM`);
              return;
            }
            const WindowManager = w["WindowManager"];
            if (WindowManager && typeof WindowManager.getConfig === "function") {
              const config = WindowManager.getConfig(id);
              if (!config) {
                console.warn(
                  `Skipping restore of modal "${id}": not registered in WindowManager`
                );
                return;
              }
            }
            const wm = w["WindowManager"];
            if (wm && typeof wm.open === "function") {
              try {
                wm.open(id);
              } catch (err) {
                console.warn(`Error restoring modal "${id}" via WindowManager:`, err);
                const dialogs = w["dialogs"];
                const dialogInstance = dialogs && dialogs[id];
                const openFn = dialogInstance && dialogInstance["open"];
                if (typeof openFn === "function") {
                  try {
                    openFn();
                  } catch (openErr) {
                    console.warn(
                      `Error restoring modal "${id}" via dialog.open():`,
                      openErr
                    );
                    const domUtils = w.DOMUtils;
                    if (domUtils && typeof domUtils.show === "function") {
                      domUtils.show(el);
                    } else {
                      el.classList.remove("hidden");
                    }
                  }
                } else {
                  const domUtils = w.DOMUtils;
                  if (domUtils && typeof domUtils.show === "function") {
                    domUtils.show(el);
                  } else {
                    el.classList.remove("hidden");
                  }
                }
              }
            } else {
              const dialogs = w["dialogs"];
              const dialogInstance = dialogs && dialogs[id];
              const openFn = dialogInstance && dialogInstance["open"];
              if (typeof openFn === "function") {
                try {
                  openFn();
                } catch (err) {
                  console.warn(`Error restoring modal "${id}":`, err);
                  const domUtils = w.DOMUtils;
                  if (domUtils && typeof domUtils.show === "function") {
                    domUtils.show(el);
                  } else {
                    el.classList.remove("hidden");
                  }
                }
              } else {
                const domUtils = w.DOMUtils;
                if (domUtils && typeof domUtils.show === "function") {
                  domUtils.show(el);
                } else {
                  el.classList.remove("hidden");
                }
              }
            }
          });
          const updateDockIndicators2 = w["updateDockIndicators"];
          if (typeof updateDockIndicators2 === "function") updateDockIndicators2();
          const updateProgramLabelByTopModal = w["updateProgramLabelByTopModal"];
          if (typeof updateProgramLabelByTopModal === "function") updateProgramLabelByTopModal();
        }
        function getDialogWindowElement(modal) {
          if (!modal) return null;
          return modal.querySelector(".autopointer") || modal;
        }
        function saveWindowPositions() {
          const modalIds = getModalIds2();
          const transientModalIds = getTransientModalIds();
          const positions = {};
          modalIds.forEach((id) => {
            if (transientModalIds.has(id)) return;
            const el = document.getElementById(id);
            const windowEl = getDialogWindowElement(el);
            if (el && windowEl) {
              positions[id] = {
                left: windowEl.style.left || "",
                top: windowEl.style.top || "",
                width: windowEl.style.width || "",
                height: windowEl.style.height || "",
                position: windowEl.style.position || ""
              };
            }
          });
          try {
            localStorage.setItem(MODAL_POSITIONS_KEY, JSON.stringify(positions));
          } catch (err) {
            console.warn("Window positions konnte nicht gespeichert werden:", err);
          }
        }
        function restoreWindowPositions() {
          const transientModalIds = getTransientModalIds();
          let positions = {};
          try {
            positions = JSON.parse(localStorage.getItem(MODAL_POSITIONS_KEY) || "{}");
          } catch (err) {
            console.warn("Window positions konnte nicht gelesen werden:", err);
            return;
          }
          Object.keys(positions).forEach((id) => {
            if (transientModalIds.has(id)) return;
            const el = document.getElementById(id);
            const windowEl = getDialogWindowElement(el);
            if (el && windowEl) {
              const stored = positions[id];
              if (!stored) return;
              if (stored.position) {
                windowEl.style.position = stored.position;
              } else if (stored.left || stored.top) {
                windowEl.style.position = "fixed";
              }
              if (stored.left) windowEl.style.left = stored.left;
              if (stored.top) windowEl.style.top = stored.top;
              if (stored.width) windowEl.style.width = stored.width;
              if (stored.height) windowEl.style.height = stored.height;
            }
            const clampWindowToMenuBar = w["clampWindowToMenuBar"];
            if (typeof clampWindowToMenuBar === "function") {
              clampWindowToMenuBar(windowEl);
            }
          });
        }
        function resetWindowLayout() {
          const modalIds = getModalIds2();
          modalIds.forEach((id) => {
            const modal = document.getElementById(id);
            const windowEl = getDialogWindowElement(modal);
            if (modal) {
              modal.style.zIndex = "";
            }
            if (windowEl) {
              windowEl.style.left = "";
              windowEl.style.top = "";
              windowEl.style.width = "";
              windowEl.style.height = "";
              windowEl.style.position = "";
              windowEl.style.zIndex = "";
            }
          });
          if (typeof w["topZIndex"] !== "undefined") {
            w["topZIndex"] = 1e3;
          }
          try {
            localStorage.removeItem(MODAL_POSITIONS_KEY);
          } catch (err) {
            console.warn("Modal positions konnte nicht gel\xF6scht werden:", err);
          }
          const hideMenuDropdowns = w["hideMenuDropdowns"];
          if (typeof hideMenuDropdowns === "function") hideMenuDropdowns();
          const syncTopZIndexWithDOM2 = w["syncTopZIndexWithDOM"];
          if (typeof syncTopZIndexWithDOM2 === "function") syncTopZIndexWithDOM2();
          const dialogs = w["dialogs"];
          if (dialogs) {
            Object.values(dialogs).forEach((dialog) => {
              const enforce = dialog["enforceMenuBarBoundary"];
              if (typeof enforce === "function") enforce();
            });
          }
          clearFinderState();
          const updateProgramLabelByTopModal = w["updateProgramLabelByTopModal"];
          if (typeof updateProgramLabelByTopModal === "function") updateProgramLabelByTopModal();
        }
        const api = {
          // Finder state
          readFinderState,
          writeFinderState,
          clearFinderState,
          // Open modals
          saveOpenModals,
          restoreOpenModals,
          // Window positions
          saveWindowPositions,
          restoreWindowPositions,
          getDialogWindowElement,
          // Layout reset
          resetWindowLayout
        };
        w["StorageSystem"] = api;
      })();
    }
  });

  // src/ts/session-manager.ts
  var require_session_manager = __commonJS({
    "src/ts/session-manager.ts"() {
      "use strict";
      console.log("SessionManager loaded");
      (() => {
        "use strict";
        const SESSION_STORAGE_KEY = "windowInstancesSession";
        const SESSION_VERSION = "1.0";
        const DEFAULT_DEBOUNCE_MS = 750;
        const MAX_STORAGE_SIZE = 5 * 1024 * 1024;
        let saveTimer = null;
        let debounceDelay = DEFAULT_DEBOUNCE_MS;
        let pendingSaveTypes = /* @__PURE__ */ new Set();
        let quotaExceeded = false;
        let saveInProgress = false;
        let lastSaveAttempt = 0;
        function estimateSize(data) {
          try {
            return JSON.stringify(data).length * 2;
          } catch {
            return 0;
          }
        }
        function checkStorageQuota(dataSize) {
          if (quotaExceeded) {
            return false;
          }
          return dataSize < MAX_STORAGE_SIZE;
        }
        function readSession() {
          try {
            const raw = localStorage.getItem(SESSION_STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return null;
            if (parsed.version !== SESSION_VERSION) {
              console.warn(
                `SessionManager: Version mismatch (stored: ${parsed.version}, expected: ${SESSION_VERSION})`
              );
              return null;
            }
            return parsed;
          } catch (err) {
            console.warn("SessionManager: Failed to read session:", err);
            return null;
          }
        }
        function writeSession(session) {
          const size = estimateSize(session);
          if (!checkStorageQuota(size)) {
            if (!quotaExceeded) {
              console.error("SessionManager: Storage quota exceeded. Auto-save disabled.");
              console.error(
                `Attempted to save ${(size / 1024).toFixed(2)}KB, limit is ${(MAX_STORAGE_SIZE / 1024).toFixed(2)}KB`
              );
              quotaExceeded = true;
            }
            return false;
          }
          try {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
            quotaExceeded = false;
            return true;
          } catch (err) {
            if (err instanceof Error && err.name === "QuotaExceededError") {
              console.error("SessionManager: Storage quota exceeded:", err);
              quotaExceeded = true;
            } else {
              console.error("SessionManager: Failed to write session:", err);
            }
            return false;
          }
        }
        function clearSession() {
          try {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            console.log("SessionManager: Session cleared");
          } catch (err) {
            console.warn("SessionManager: Failed to clear session:", err);
          }
        }
        function getInstanceManagers() {
          const managers = /* @__PURE__ */ new Map();
          const w = window;
          const knownManagers = [
            "TerminalInstanceManager",
            "TextEditorInstanceManager",
            "FinderInstanceManager"
          ];
          knownManagers.forEach((key) => {
            const manager = w[key];
            if (manager && typeof manager === "object") {
              const mgr = manager;
              const type = typeof mgr.type === "string" ? mgr.type : key.replace("InstanceManager", "").toLowerCase();
              managers.set(type, manager);
            }
          });
          return managers;
        }
        function serializeAllInstances() {
          const result = {};
          const active = {};
          const managers = getInstanceManagers();
          managers.forEach((manager, type) => {
            const mgr = manager;
            if (typeof mgr.serializeAll === "function") {
              try {
                const instances = mgr.serializeAll.call(mgr);
                if (Array.isArray(instances)) {
                  result[type] = instances;
                }
              } catch (err) {
                console.error(
                  `SessionManager: Failed to serialize instances for type "${type}":`,
                  err
                );
              }
            }
            try {
              if (typeof mgr.getActiveInstance === "function") {
                const activeInst = mgr.getActiveInstance.call(mgr);
                active[type] = (activeInst == null ? void 0 : activeInst.instanceId) || null;
              } else {
                active[type] = null;
              }
            } catch {
              active[type] = null;
            }
          });
          return { instances: result, active };
        }
        function performSave() {
          if (saveInProgress) {
            console.warn("SessionManager: Save already in progress, skipping");
            return;
          }
          saveInProgress = true;
          try {
            const { instances, active } = serializeAllInstances();
            const zIndexManager = window.__zIndexManager;
            const windowStack = zIndexManager && typeof zIndexManager.getWindowStack === "function" ? zIndexManager.getWindowStack() : [];
            const session = {
              version: SESSION_VERSION,
              timestamp: Date.now(),
              instances,
              active,
              windowStack
            };
            const success = writeSession(session);
            if (success) {
              const instanceCount = Object.values(instances).reduce(
                (sum, arr) => sum + arr.length,
                0
              );
              console.log(
                `SessionManager: Saved ${instanceCount} instances across ${Object.keys(instances).length} types`
              );
            }
            pendingSaveTypes.clear();
          } catch (err) {
            console.error("SessionManager: Save failed:", err);
          } finally {
            saveInProgress = false;
          }
        }
        function scheduleSave(instanceType) {
          if (instanceType) {
            pendingSaveTypes.add(instanceType);
          }
          if (saveTimer !== null) {
            clearTimeout(saveTimer);
          }
          saveTimer = window.setTimeout(() => {
            saveTimer = null;
            performSave();
          }, debounceDelay);
        }
        function saveAll(options = {}) {
          if (options.immediate) {
            if (saveTimer !== null) {
              clearTimeout(saveTimer);
              saveTimer = null;
            }
            performSave();
          } else {
            scheduleSave();
          }
        }
        function saveInstanceType(instanceType, options = {}) {
          if (options.immediate) {
            if (saveTimer !== null) {
              clearTimeout(saveTimer);
              saveTimer = null;
            }
            performSave();
          } else {
            scheduleSave(instanceType);
          }
        }
        function restoreSession() {
          const session = readSession();
          if (!session) {
            console.log("SessionManager: No session to restore");
            return false;
          }
          const managers = getInstanceManagers();
          let restoredCount = 0;
          const activeMap = session.active || {};
          Object.entries(session.instances).forEach(([type, instances]) => {
            const manager = managers.get(type);
            if (!manager) {
              console.warn(`SessionManager: No manager found for type "${type}"`);
              return;
            }
            const mgr = manager;
            if (typeof mgr.deserializeAll === "function") {
              try {
                mgr.deserializeAll(instances);
                restoredCount += instances.length;
                console.log(`SessionManager: Restored ${instances.length} "${type}" instances`);
                const activeId = activeMap[type] || null;
                if (activeId && typeof mgr.setActiveInstance === "function") {
                  try {
                    mgr.setActiveInstance(activeId);
                  } catch (e) {
                    console.warn(
                      `SessionManager: Failed to set active instance for ${type}:`,
                      e
                    );
                  }
                }
              } catch (err) {
                console.error(
                  `SessionManager: Failed to restore instances for type "${type}":`,
                  err
                );
              }
            }
          });
          const windowStack = session.windowStack || [];
          if (windowStack.length > 0) {
            const zIndexManager = window.__zIndexManager;
            if (zIndexManager && typeof zIndexManager.restoreWindowStack === "function") {
              try {
                zIndexManager.restoreWindowStack(windowStack);
                console.log(
                  `SessionManager: Restored z-index order for ${windowStack.length} windows`
                );
              } catch (err) {
                console.warn("SessionManager: Failed to restore window z-index order:", err);
              }
            }
          }
          console.log(`SessionManager: Restored ${restoredCount} instances total`);
          return restoredCount > 0;
        }
        function setDebounceDelay(ms) {
          if (ms < 100 || ms > 5e3) {
            console.warn(`SessionManager: Invalid debounce delay ${ms}ms, must be 100-5000ms`);
            return;
          }
          debounceDelay = ms;
          console.log(`SessionManager: Debounce delay set to ${ms}ms`);
        }
        function getDebounceDelay() {
          return debounceDelay;
        }
        function clear() {
          if (saveTimer !== null) {
            clearTimeout(saveTimer);
            saveTimer = null;
          }
          pendingSaveTypes.clear();
          clearSession();
          quotaExceeded = false;
        }
        function getStats() {
          const session = readSession();
          if (!session) {
            return {
              hasSession: false,
              instanceCount: 0,
              types: [],
              timestamp: null,
              sizeBytes: 0
            };
          }
          const instanceCount = Object.values(session.instances).reduce(
            (sum, arr) => sum + arr.length,
            0
          );
          const types = Object.keys(session.instances);
          const sizeBytes = estimateSize(session);
          return {
            hasSession: true,
            instanceCount,
            types,
            timestamp: session.timestamp,
            sizeBytes,
            quotaExceeded
          };
        }
        function exportSession() {
          performSave();
          const session = readSession();
          if (!session) {
            console.warn("SessionManager: No session to export");
            return null;
          }
          try {
            const json = JSON.stringify(session, null, 2);
            console.log(`SessionManager: Exported session (${(json.length / 1024).toFixed(2)}KB)`);
            return json;
          } catch (err) {
            console.error("SessionManager: Failed to export session:", err);
            return null;
          }
        }
        function importSession(json) {
          if (!json || typeof json !== "string") {
            console.error("SessionManager: Invalid import data (must be non-empty string)");
            return false;
          }
          let session;
          try {
            session = JSON.parse(json);
          } catch (err) {
            console.error("SessionManager: Failed to parse import JSON:", err);
            return false;
          }
          if (!session || typeof session !== "object") {
            console.error("SessionManager: Invalid session data (must be object)");
            return false;
          }
          if (!session.version || typeof session.version !== "string") {
            console.error("SessionManager: Missing or invalid version field");
            return false;
          }
          if (session.version !== SESSION_VERSION) {
            console.warn(
              `SessionManager: Version mismatch (imported: ${session.version}, current: ${SESSION_VERSION})`
            );
            console.error("SessionManager: Cannot import session from different version");
            return false;
          }
          if (!session.instances || typeof session.instances !== "object") {
            console.error("SessionManager: Missing or invalid instances field");
            return false;
          }
          const success = writeSession(session);
          if (!success) {
            console.error("SessionManager: Failed to save imported session to storage");
            return false;
          }
          const restored = restoreSession();
          if (!restored) {
            console.warn("SessionManager: Imported session saved but restoration failed");
            return false;
          }
          console.log("SessionManager: Successfully imported and restored session");
          return true;
        }
        function init() {
          console.log("SessionManager: Initializing auto-save system");
          window.addEventListener("blur", () => {
            saveAll({ immediate: true });
          });
          window.addEventListener("beforeunload", () => {
            performSave();
          });
          document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
              saveAll({ immediate: true });
            }
          });
          console.log(`SessionManager: Initialized with ${debounceDelay}ms debounce`);
        }
        function registerManager(_type, _manager) {
          console.log(`SessionManager: registerManager() is deprecated - using auto-discovery`);
        }
        function unregisterManager(_type) {
        }
        const SessionManager = {
          init,
          saveAll,
          saveAllSessions: saveAll,
          // Alias for backwards compatibility with tests
          saveInstanceType,
          restoreSession,
          clear,
          setDebounceDelay,
          getDebounceDelay,
          getStats,
          exportSession,
          importSession,
          registerManager,
          // Legacy compatibility
          unregisterManager
          // Legacy compatibility
        };
        window.SessionManager = SessionManager;
      })();
    }
  });

  // src/ts/theme.ts
  var require_theme = __commonJS({
    "src/ts/theme.ts"() {
      "use strict";
      (() => {
        "use strict";
        const win = window;
        const APP_CONSTANTS2 = win.APP_CONSTANTS || {};
        const THEME_KEY = APP_CONSTANTS2.THEME_PREFERENCE_KEY || "themePreference";
        const validThemePreferences = ["system", "light", "dark"];
        const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");
        let themePreference = (() => {
          const fromStorage = localStorage.getItem(THEME_KEY);
          return fromStorage && validThemePreferences.includes(fromStorage) ? fromStorage : "system";
        })();
        function updateThemeFromPreference() {
          const useDark = themePreference === "dark" || themePreference === "system" && systemDarkQuery.matches;
          document.documentElement.classList.toggle("dark", useDark);
        }
        function setThemePreference(pref) {
          if (!validThemePreferences.includes(pref)) return;
          themePreference = pref;
          localStorage.setItem(THEME_KEY, pref);
          updateThemeFromPreference();
          window.dispatchEvent(
            new CustomEvent("themePreferenceChange", {
              detail: { preference: pref }
            })
          );
        }
        function getThemePreference() {
          return themePreference;
        }
        updateThemeFromPreference();
        const handleSystemThemeChange = () => {
          updateThemeFromPreference();
        };
        const mql = systemDarkQuery;
        if (typeof mql.addEventListener === "function") {
          mql.addEventListener("change", handleSystemThemeChange);
        } else if (typeof mql.addListener === "function") {
          mql.addListener(handleSystemThemeChange);
        }
        const w = window;
        w["ThemeSystem"] = {
          setThemePreference,
          getThemePreference,
          updateThemeFromPreference
        };
        w["setThemePreference"] = setThemePreference;
        w["getThemePreference"] = getThemePreference;
      })();
    }
  });

  // src/ts/utils/auto-save-helper.ts
  function triggerAutoSave(type) {
    const w = window;
    const SessionManager = w.SessionManager;
    if (SessionManager && typeof SessionManager.saveInstanceType === "function") {
      try {
        SessionManager.saveInstanceType(type);
      } catch (error) {
        console.warn("Failed to trigger auto-save:", error);
      }
    }
  }
  var init_auto_save_helper = __esm({
    "src/ts/utils/auto-save-helper.ts"() {
      "use strict";
    }
  });

  // src/ts/base-window-instance.ts
  var BaseWindowInstance;
  var init_base_window_instance = __esm({
    "src/ts/base-window-instance.ts"() {
      "use strict";
      init_auto_save_helper();
      BaseWindowInstance = class {
        constructor(config) {
          this.instanceId = config.id || this._generateId();
          this.type = config.type || "unknown";
          this.title = config.title || "Untitled";
          this.container = null;
          this.windowElement = null;
          this.state = this._initializeState(config.initialState || {});
          this.eventListeners = /* @__PURE__ */ new Map();
          this.isInitialized = false;
          this.isVisible = false;
          this.metadata = config.metadata || {};
        }
        _generateId() {
          return `${this.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        _initializeState(initialState) {
          return {
            ...initialState,
            created: Date.now(),
            modified: Date.now()
          };
        }
        init(container) {
          if (this.isInitialized) {
            console.warn(`Instance ${this.instanceId} already initialized`);
            return;
          }
          this.container = container;
          this.render();
          this.attachEventListeners();
          this.isInitialized = true;
          this.emit("initialized");
        }
        // Subclasses must implement render
        render() {
          throw new Error("render() must be implemented by subclass");
        }
        attachEventListeners() {
        }
        show() {
          if (this.container) {
            this.container.classList.remove("hidden");
            this.isVisible = true;
            this.emit("shown");
          }
        }
        hide() {
          if (this.container) {
            this.container.classList.add("hidden");
            this.isVisible = false;
            this.emit("hidden");
          }
        }
        destroy() {
          this.emit("beforeDestroy");
          this.removeAllEventListeners();
          if (this.container) {
            try {
              if (typeof this.container.remove === "function") {
                this.container.remove();
              } else if (this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
              }
            } catch {
              try {
                this.container.innerHTML = "";
                this.container.classList.add("hidden");
              } catch {
              }
            }
            this.container = null;
          }
          this.windowElement = null;
          this.isInitialized = false;
          this.emit("destroyed");
        }
        updateState(updates) {
          const oldState = { ...this.state };
          this.state = {
            ...this.state,
            ...updates,
            modified: Date.now()
          };
          this.emit("stateChanged", { oldState, newState: this.state });
          this._triggerAutoSave();
        }
        _triggerAutoSave() {
          const w = window;
          if (w.SessionManager && typeof w.SessionManager.saveInstanceType === "function") {
            try {
              w.SessionManager.saveInstanceType(this.type);
            } catch (error) {
              console.warn("Failed to trigger auto-save:", error);
            }
          }
        }
        getState() {
          return { ...this.state };
        }
        serialize() {
          return {
            instanceId: this.instanceId,
            type: this.type,
            title: this.title,
            state: this.getState(),
            metadata: this.metadata
          };
        }
        deserialize(data) {
          if (data.state) this.state = data.state;
          if (data.title) this.title = data.title;
          if (data.metadata) this.metadata = { ...this.metadata, ...data.metadata };
          this.emit("deserialized");
        }
        emit(eventName, data) {
          const listeners = this.eventListeners.get(eventName) || [];
          listeners.forEach((callback) => {
            try {
              callback.call(this, data);
            } catch (error) {
              console.error(`Error in event listener for ${eventName}:`, error);
            }
          });
        }
        on(eventName, callback) {
          if (!this.eventListeners.has(eventName)) this.eventListeners.set(eventName, []);
          this.eventListeners.get(eventName).push(callback);
        }
        off(eventName, callback) {
          if (!this.eventListeners.has(eventName)) return;
          const listeners = this.eventListeners.get(eventName);
          const index = listeners.indexOf(callback);
          if (index > -1) listeners.splice(index, 1);
        }
        removeAllEventListeners() {
          this.eventListeners.clear();
        }
        focus() {
          if (this.container && this.isVisible) this.emit("focused");
        }
        blur() {
          this.emit("blurred");
        }
      };
      if (typeof window !== "undefined") {
        window.BaseWindowInstance = BaseWindowInstance;
      }
      console.log("BaseWindowInstance loaded");
      (function() {
        "use strict";
        class BaseWindowInstance2 {
          constructor(config) {
            this.instanceId = config.id || this._generateId();
            this.type = config.type || "unknown";
            this.title = config.title || "Untitled";
            this.container = null;
            this.windowElement = null;
            this.state = this._initializeState(config.initialState || {});
            this.eventListeners = /* @__PURE__ */ new Map();
            this.isInitialized = false;
            this.isVisible = false;
            this.metadata = config.metadata || {};
          }
          _generateId() {
            return `${this.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
          _initializeState(initialState) {
            return {
              ...initialState,
              created: Date.now(),
              modified: Date.now()
            };
          }
          init(container) {
            if (this.isInitialized) {
              console.warn(`Instance ${this.instanceId} already initialized`);
              return;
            }
            this.container = container;
            this.render();
            this.attachEventListeners();
            this.isInitialized = true;
            this.emit("initialized");
          }
          render() {
            throw new Error("render() must be implemented by subclass");
          }
          attachEventListeners() {
          }
          show() {
            if (this.container) {
              this.container.classList.remove("hidden");
              this.isVisible = true;
              this.emit("shown");
            }
          }
          hide() {
            if (this.container) {
              this.container.classList.add("hidden");
              this.isVisible = false;
              this.emit("hidden");
            }
          }
          destroy() {
            this.emit("beforeDestroy");
            this.removeAllEventListeners();
            if (this.container) {
              try {
                if (typeof this.container.remove === "function") {
                  this.container.remove();
                } else if (this.container.parentNode) {
                  this.container.parentNode.removeChild(
                    this.container
                  );
                }
              } catch {
                try {
                  this.container.innerHTML = "";
                  this.container.classList.add("hidden");
                } catch {
                }
              }
              this.container = null;
            }
            this.windowElement = null;
            this.isInitialized = false;
            this.emit("destroyed");
          }
          updateState(updates) {
            const oldState = { ...this.state };
            this.state = {
              ...this.state,
              ...updates,
              modified: Date.now()
            };
            this.emit("stateChanged", { oldState, newState: this.state });
            this._triggerAutoSave();
          }
          _triggerAutoSave() {
            triggerAutoSave(this.type);
          }
          getState() {
            return { ...this.state };
          }
          serialize() {
            return {
              instanceId: this.instanceId,
              type: this.type,
              title: this.title,
              state: this.getState(),
              metadata: this.metadata
            };
          }
          deserialize(data) {
            if (data.state) {
              this.state = data.state;
            }
            if (data.title) {
              this.title = data.title;
            }
            if (data.metadata) {
              this.metadata = { ...this.metadata, ...data.metadata };
            }
            this.emit("deserialized");
          }
          emit(eventName, data) {
            const listeners = this.eventListeners.get(eventName) || [];
            listeners.forEach((callback) => {
              try {
                callback.call(this, data);
              } catch (error) {
                console.error(`Error in event listener for ${eventName}:`, error);
              }
            });
          }
          on(eventName, callback) {
            if (!this.eventListeners.has(eventName)) {
              this.eventListeners.set(eventName, []);
            }
            this.eventListeners.get(eventName).push(callback);
          }
          off(eventName, callback) {
            if (!this.eventListeners.has(eventName)) return;
            const listeners = this.eventListeners.get(eventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          }
          removeAllEventListeners() {
            this.eventListeners.clear();
          }
          focus() {
            if (this.container && this.isVisible) {
              this.emit("focused");
            }
          }
          blur() {
            this.emit("blurred");
          }
        }
        window.BaseWindowInstance = BaseWindowInstance2;
      })();
    }
  });

  // src/ts/instance-manager.ts
  var require_instance_manager = __commonJS({
    "src/ts/instance-manager.ts"() {
      "use strict";
      init_auto_save_helper();
      console.log("InstanceManager loaded");
      (function() {
        "use strict";
        class InstanceManager {
          constructor(config) {
            this.type = config.type;
            this.instanceClass = config.instanceClass;
            this.maxInstances = config.maxInstances || 0;
            this.createContainer = config.createContainer || this._defaultCreateContainer.bind(this);
            this.instances = /* @__PURE__ */ new Map();
            this.activeInstanceId = null;
            this.instanceCounter = 0;
          }
          createInstance(config = {}) {
            if (this.maxInstances > 0 && this.instances.size >= this.maxInstances) {
              console.warn(`Maximum instances (${this.maxInstances}) reached for ${this.type}`);
              return null;
            }
            this.instanceCounter++;
            const instanceId = config.id || `${this.type}-${this.instanceCounter}`;
            if (config.id && this.instances.has(instanceId)) {
              console.warn(
                `Instance with id ${instanceId} already exists for ${this.type}; reusing existing instance.`
              );
              const existing = this.instances.get(instanceId);
              try {
                existing.title = config.title || existing.title;
                existing.metadata = {
                  ...existing.metadata,
                  ...config.metadata || {}
                };
              } catch {
              }
              this.setActiveInstance(instanceId);
              this._triggerAutoSave();
              return existing;
            }
            const container = this.createContainer(instanceId);
            if (!container) {
              console.error("Failed to create container for instance");
              return null;
            }
            const instanceConfig = {
              id: instanceId,
              type: this.type,
              title: config.title || `${this.type} ${this.instanceCounter}`,
              initialState: config.initialState || {},
              metadata: config.metadata || {}
            };
            const instance = new this.instanceClass(instanceConfig);
            try {
              instance.init(container);
              this.instances.set(instanceId, instance);
              this._setupInstanceEvents(instance);
              this.setActiveInstance(instanceId);
              this._triggerAutoSave();
              console.log(`Created instance: ${instanceId}`);
              return instance;
            } catch (error) {
              console.error("Failed to initialize instance:", error);
              container.remove();
              return null;
            }
          }
          getInstance(instanceId) {
            return this.instances.get(instanceId) || null;
          }
          getActiveInstance() {
            return this.activeInstanceId ? this.instances.get(this.activeInstanceId) || null : null;
          }
          setActiveInstance(instanceId) {
            if (this.instances.has(instanceId)) {
              const previousId = this.activeInstanceId;
              if (previousId === instanceId) {
                return;
              }
              this.activeInstanceId = instanceId;
              if (previousId) {
                const previousInstance = this.instances.get(previousId);
                if (previousInstance) {
                  previousInstance.blur();
                }
              }
              const instance = this.instances.get(instanceId);
              if (instance) {
                instance.focus();
              }
              this._triggerAutoSave();
              try {
                const KEY = "windowActiveInstances";
                const raw = localStorage.getItem(KEY);
                const map = raw ? JSON.parse(raw) : {};
                map[this.type] = this.activeInstanceId;
                localStorage.setItem(KEY, JSON.stringify(map));
              } catch {
              }
            }
          }
          getAllInstances() {
            return Array.from(this.instances.values());
          }
          getAllInstanceIds() {
            return Array.from(this.instances.keys());
          }
          destroyInstance(instanceId) {
            const instance = this.instances.get(instanceId);
            if (!instance) {
              console.warn(`Instance ${instanceId} not found`);
              return;
            }
            instance.destroy();
            this.instances.delete(instanceId);
            if (this.activeInstanceId === instanceId) {
              const remainingIds = this.getAllInstanceIds();
              const lastId = remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : void 0;
              this.activeInstanceId = lastId != null ? lastId : null;
            }
            this._triggerAutoSave();
            console.log(`Destroyed instance: ${instanceId}`);
          }
          destroyAllInstances() {
            this.instances.forEach((instance) => {
              instance.destroy();
            });
            this.instances.clear();
            this.activeInstanceId = null;
            this._triggerAutoSave();
          }
          hasInstances() {
            return this.instances.size > 0;
          }
          getInstanceCount() {
            return this.instances.size;
          }
          serializeAll() {
            const activeId = this.activeInstanceId;
            return this.getAllInstances().map((instance) => {
              const data = instance.serialize();
              try {
                const meta = data.metadata || {};
                if (instance.instanceId === activeId) {
                  meta.__active = true;
                }
                data.metadata = meta;
              } catch {
              }
              return data;
            });
          }
          deserializeAll(data) {
            if (!Array.isArray(data)) return;
            let desiredActiveId = null;
            data.forEach((instanceData) => {
              const instance = this.createInstance({
                id: instanceData.instanceId,
                title: instanceData.title,
                metadata: instanceData.metadata
              });
              if (instance && instanceData.state) {
                instance.deserialize(instanceData);
              }
              try {
                const meta = instanceData.metadata;
                if (meta && meta.__active) {
                  desiredActiveId = instanceData.instanceId || null;
                }
              } catch {
              }
            });
            if (desiredActiveId) {
              this.setActiveInstance(desiredActiveId);
            }
          }
          /**
           * Reorder instances to match the provided array of instance IDs
           * @param newOrder - Array of instance IDs in the desired order
           */
          reorderInstances(newOrder) {
            const validIds = newOrder.filter((id) => this.instances.has(id));
            if (validIds.length !== this.instances.size) {
              console.warn(
                "Invalid reorder: not all instance IDs provided or some IDs do not exist"
              );
              return;
            }
            const newMap = /* @__PURE__ */ new Map();
            validIds.forEach((id) => {
              const instance = this.instances.get(id);
              if (instance) {
                newMap.set(id, instance);
              }
            });
            this.instances = newMap;
            console.log("Instances reordered:", validIds);
          }
          _triggerAutoSave() {
            triggerAutoSave(this.type);
          }
          _defaultCreateContainer(instanceId) {
            const container = document.createElement("div");
            container.id = `${instanceId}-container`;
            container.className = "instance-container";
            document.body.appendChild(container);
            return container;
          }
          _setupInstanceEvents(instance) {
            instance.on("focused", () => {
              this.setActiveInstance(instance.instanceId);
            });
            instance.on("destroyed", () => {
              this.instances.delete(instance.instanceId);
            });
          }
        }
        window.InstanceManager = InstanceManager;
      })();
    }
  });

  // src/ts/window-chrome.ts
  var require_window_chrome = __commonJS({
    "src/ts/window-chrome.ts"() {
      "use strict";
      console.log("WindowChrome loaded");
      (function() {
        "use strict";
        function createControlButton(type, symbol, callback) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `window-control-btn window-${type}-btn`;
          btn.innerHTML = symbol;
          btn.style.cssText = "width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background-color 0.2s;";
          btn.addEventListener("mouseenter", () => {
            if (type === "close") {
              btn.style.backgroundColor = "#ef4444";
              btn.style.color = "#ffffff";
            } else {
              btn.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
            }
          });
          btn.addEventListener("mouseleave", () => {
            btn.style.backgroundColor = "transparent";
            btn.style.color = "";
          });
          if (callback) {
            btn.addEventListener("click", () => callback());
          }
          return btn;
        }
        function createToolbarButton(config) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "toolbar-btn px-2 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition";
          if (config.icon) {
            btn.innerHTML = config.icon;
          } else if (config.label) {
            btn.textContent = config.label;
          }
          if (config.title) btn.title = config.title;
          if (config.action) btn.dataset.action = config.action;
          if (config.onClick) btn.addEventListener("click", config.onClick);
          return btn;
        }
        const WindowChrome = {
          createTitlebar(config) {
            const titlebar = document.createElement("div");
            titlebar.className = "window-titlebar flex items-center justify-between px-3 py-2 bg-gray-200 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700";
            titlebar.style.cssText = "height: 32px; cursor: move; user-select: none;";
            const leftSide = document.createElement("div");
            leftSide.className = "flex items-center gap-2";
            if (config.icon) {
              const iconEl = document.createElement("span");
              iconEl.className = "window-icon";
              if (config.icon.startsWith("http") || config.icon.startsWith("./") || config.icon.startsWith("/")) {
                const img = document.createElement("img");
                img.src = config.icon;
                img.alt = "";
                img.style.cssText = "width: 16px; height: 16px; object-fit: contain;";
                iconEl.appendChild(img);
              } else {
                iconEl.textContent = config.icon;
                iconEl.style.fontSize = "16px";
              }
              leftSide.appendChild(iconEl);
            }
            const titleEl = document.createElement("span");
            titleEl.className = "window-title font-medium text-sm text-gray-800 dark:text-gray-200";
            titleEl.textContent = config.title || "Untitled";
            titleEl.dataset.titleTarget = "true";
            leftSide.appendChild(titleEl);
            titlebar.appendChild(leftSide);
            const rightSide = document.createElement("div");
            rightSide.className = "flex items-center gap-1";
            if (config.showMinimize) {
              rightSide.appendChild(createControlButton("minimize", "\u2212", config.onMinimize));
            }
            if (config.showMaximize) {
              rightSide.appendChild(createControlButton("maximize", "\u25A1", config.onMaximize));
            }
            if (config.showClose !== false) {
              rightSide.appendChild(createControlButton("close", "\xD7", config.onClose));
            }
            titlebar.appendChild(rightSide);
            return titlebar;
          },
          createToolbar(buttons) {
            const toolbar = document.createElement("div");
            toolbar.className = "window-toolbar flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700";
            buttons.forEach((btn) => {
              if (btn.type === "separator") {
                const separator = document.createElement("div");
                separator.className = "toolbar-separator";
                separator.style.cssText = "width: 1px; height: 20px; background: currentColor; opacity: 0.2;";
                toolbar.appendChild(separator);
              } else {
                toolbar.appendChild(createToolbarButton(btn));
              }
            });
            return toolbar;
          },
          createStatusBar(config) {
            const statusBar = document.createElement("div");
            statusBar.className = "window-statusbar flex items-center justify-between px-3 py-1 bg-gray-100 dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400";
            statusBar.style.cssText = "height: 24px;";
            const leftEl = document.createElement("span");
            leftEl.className = "statusbar-left";
            leftEl.textContent = config.leftContent || "";
            statusBar.appendChild(leftEl);
            const rightEl = document.createElement("span");
            rightEl.className = "statusbar-right";
            rightEl.textContent = config.rightContent || "";
            statusBar.appendChild(rightEl);
            return statusBar;
          },
          updateTitle(titlebar, newTitle) {
            const titleEl = titlebar.querySelector('[data-title-target="true"]');
            if (titleEl) titleEl.textContent = newTitle;
          },
          updateStatusBar(statusBar, side, content) {
            const target = statusBar.querySelector(`.statusbar-${side}`);
            if (target) target.textContent = content;
          },
          createWindowFrame(config) {
            const frame = document.createElement("div");
            frame.className = "window-frame flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden";
            const titlebar = this.createTitlebar({
              title: config.title || "Untitled",
              icon: config.icon,
              showClose: config.showClose,
              showMinimize: config.showMinimize,
              showMaximize: config.showMaximize,
              onClose: config.onClose,
              onMinimize: config.onMinimize,
              onMaximize: config.onMaximize
            });
            frame.appendChild(titlebar);
            if (config.toolbar) {
              const toolbar = this.createToolbar(config.toolbar);
              frame.appendChild(toolbar);
            }
            const content = document.createElement("div");
            content.className = "window-content flex-1 overflow-auto";
            frame.appendChild(content);
            let statusbar = null;
            if (config.showStatusBar) {
              statusbar = this.createStatusBar({
                leftContent: config.statusBarLeft || "",
                rightContent: config.statusBarRight || ""
              });
              frame.appendChild(statusbar);
            }
            return { frame, titlebar, content, statusbar };
          }
        };
        window.WindowChrome = WindowChrome;
      })();
    }
  });

  // src/ts/window-tabs.ts
  var require_window_tabs = __commonJS({
    "src/ts/window-tabs.ts"() {
      "use strict";
      (function() {
        "use strict";
        let draggedTab = null;
        let draggedInstanceId = null;
        function createTabEl(instance, isActive) {
          const tab = document.createElement("button");
          tab.type = "button";
          tab.className = [
            "wt-tab",
            "px-3 py-1 text-sm rounded-t-md border border-b-0",
            "transition-colors whitespace-nowrap flex items-center gap-2",
            isActive ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" : "bg-gray-200/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-800"
          ].join(" ");
          tab.dataset.instanceId = instance.instanceId;
          tab.draggable = true;
          const title = document.createElement("span");
          title.className = "wt-tab-title";
          title.textContent = instance.title || instance.instanceId;
          tab.appendChild(title);
          const close = document.createElement("span");
          close.className = "wt-tab-close ml-1 text-xs opacity-70 hover:opacity-100";
          close.textContent = "\xD7";
          close.setAttribute("aria-label", "Tab schlie\xDFen");
          close.title = "Tab schlie\xDFen";
          tab.appendChild(close);
          return tab;
        }
        function renderTabs(container, manager, options, onSelect, onClose, onNew) {
          var _a;
          container.innerHTML = "";
          const bar = document.createElement("div");
          bar.className = "window-tabs flex items-center gap-1 px-2 pt-2 select-none";
          const instances = manager.getAllInstances();
          const active = manager.getActiveInstance();
          const activeId = (_a = active == null ? void 0 : active.instanceId) != null ? _a : null;
          console.log(
            "[WindowTabs] Rendering tabs for instance IDs:",
            instances.map((i) => i.instanceId)
          );
          instances.forEach((inst) => {
            const tab = createTabEl(inst, inst.instanceId === activeId);
            tab.addEventListener("click", (e) => {
              const target = e.target;
              if (target.closest(".wt-tab-close")) {
                onClose(inst.instanceId);
              } else {
                onSelect(inst.instanceId);
              }
            });
            tab.addEventListener("auxclick", (e) => {
              if (e.button === 1) {
                onClose(inst.instanceId);
              }
            });
            tab.addEventListener("dragstart", (e) => {
              draggedTab = tab;
              draggedInstanceId = inst.instanceId;
              if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", inst.instanceId);
              }
              tab.style.opacity = "0.5";
            });
            tab.addEventListener("dragend", () => {
              tab.style.opacity = "1";
              draggedTab = null;
              draggedInstanceId = null;
              const allTabs = bar.querySelectorAll(".wt-tab");
              allTabs.forEach((t) => {
                t.classList.remove("border-l-4", "border-l-blue-500");
              });
            });
            tab.addEventListener("dragover", (e) => {
              e.preventDefault();
              if (e.dataTransfer) {
                e.dataTransfer.dropEffect = "move";
              }
              if (tab === draggedTab) {
                return;
              }
              const allTabs = bar.querySelectorAll(".wt-tab");
              allTabs.forEach((t) => {
                t.classList.remove("border-l-4", "border-l-blue-500");
              });
              tab.classList.add("border-l-4", "border-l-blue-500");
            });
            tab.addEventListener("dragleave", () => {
              tab.classList.remove("border-l-4", "border-l-blue-500");
            });
            tab.addEventListener("drop", (e) => {
              e.preventDefault();
              e.stopPropagation();
              tab.classList.remove("border-l-4", "border-l-blue-500");
              if (!draggedInstanceId || draggedInstanceId === inst.instanceId) {
                return;
              }
              const currentOrder = manager.getAllInstanceIds();
              const draggedIdx = currentOrder.indexOf(draggedInstanceId);
              const targetIdx = currentOrder.indexOf(inst.instanceId);
              if (draggedIdx === -1 || targetIdx === -1) {
                return;
              }
              const newOrder = [...currentOrder];
              newOrder.splice(draggedIdx, 1);
              const newTargetIdx = newOrder.indexOf(inst.instanceId);
              newOrder.splice(newTargetIdx, 0, draggedInstanceId);
              if (manager.reorderInstances) {
                manager.reorderInstances(newOrder);
                renderTabs(container, manager, options, onSelect, onClose, onNew);
              }
            });
            bar.appendChild(tab);
          });
          if (options.addButton !== false) {
            const addBtn = document.createElement("button");
            addBtn.type = "button";
            addBtn.className = "wt-add px-2 py-1 text-sm rounded-md border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700";
            addBtn.textContent = "+";
            addBtn.title = "Neue Instanz";
            addBtn.addEventListener("click", () => {
              var _a2;
              if (onNew) {
                onNew();
              } else {
                const title = (_a2 = options.onCreateInstanceTitle) == null ? void 0 : _a2.call(options);
                manager.createInstance({ title });
              }
            });
            bar.appendChild(addBtn);
          }
          container.appendChild(bar);
          const underline = document.createElement("div");
          underline.className = "h-px bg-gray-300 dark:bg-gray-700";
          container.appendChild(underline);
        }
        function wrapManager(manager, onChange) {
          const createOrig = manager.createInstance.bind(manager);
          const destroyOrig = manager.destroyInstance.bind(manager);
          const setActiveOrig = manager.setActiveInstance.bind(manager);
          manager.createInstance = (cfg) => {
            const inst = createOrig(cfg);
            onChange();
            return inst;
          };
          manager.destroyInstance = (id) => {
            destroyOrig(id);
            onChange();
          };
          manager.setActiveInstance = (id) => {
            setActiveOrig(id);
            onChange();
          };
          return manager;
        }
        function createController(manager, mountEl, options = {}) {
          const wrapped = wrapManager(manager, () => controller.refresh());
          const controller = {
            el: mountEl,
            refresh() {
              renderTabs(
                mountEl,
                wrapped,
                options,
                (id) => wrapped.setActiveInstance(id),
                (id) => wrapped.destroyInstance(id)
              );
            },
            destroy() {
              mountEl.innerHTML = "";
            },
            setTitle(instanceId, title) {
              const inst = wrapped.getInstance(instanceId);
              if (inst) {
                inst.title = title;
                this.refresh();
              }
            }
          };
          controller.refresh();
          return controller;
        }
        const WindowTabs = {
          /**
           * Create a window tabs bar bound to a specific InstanceManager.
           */
          create(manager, mountEl, options) {
            return createController(manager, mountEl, options);
          }
        };
        window.WindowTabs = WindowTabs;
      })();
    }
  });

  // src/ts/terminal-instance.ts
  var require_terminal_instance = __commonJS({
    "src/ts/terminal-instance.ts"() {
      "use strict";
      console.log("TerminalInstance (TS) loaded");
      (() => {
        "use strict";
        const Base = window.BaseWindowInstance;
        class TerminalInstance extends Base {
          constructor(config) {
            super({
              ...config,
              type: "terminal"
            });
            this.outputElement = null;
            this.inputElement = null;
            this.commandHistory = [];
            this.historyIndex = -1;
            this.currentPath = "~";
            this.fileSystem = {
              "~": {
                type: "directory",
                contents: {
                  Desktop: { type: "directory", contents: {} },
                  Documents: {
                    type: "directory",
                    contents: {
                      "readme.txt": {
                        type: "file",
                        content: "Willkommen im Terminal!"
                      }
                    }
                  },
                  Downloads: { type: "directory", contents: {} },
                  "welcome.txt": {
                    type: "file",
                    content: 'Willkommen auf Marvins Portfolio-Website!\n\nGib "help" ein, um eine Liste verf\xFCgbarer Befehle zu sehen.'
                  }
                }
              }
            };
          }
          // No override of _initializeState to avoid type modifier conflicts
          render() {
            if (!this.container) return;
            const html = `
                <div class="terminal-wrapper h-full flex flex-col bg-gray-900 text-green-400 font-mono text-sm">
                    <div class="terminal-output flex-1 overflow-y-auto p-4 space-y-1" data-terminal-output>
                    </div>
                    <div class="terminal-input-line flex items-center px-4 py-2 border-t border-gray-700">
                        <span class="terminal-prompt text-blue-400">guest@marvin:${this.currentPath}$</span>
                        <input
                            type="text"
                            class="flex-1 ml-2 bg-transparent outline-none text-green-400 terminal-input"
                            autocomplete="off"
                            spellcheck="false"
                            aria-label="Terminal input"
                            data-terminal-input
                        />
                    </div>
                </div>
            `;
            this.container.innerHTML = html;
            this.outputElement = this.container.querySelector("[data-terminal-output]");
            this.inputElement = this.container.querySelector("[data-terminal-input]");
            try {
              this.showWelcomeMessage();
            } catch {
            }
            if (this.inputElement && typeof this.inputElement.focus === "function") {
              this.inputElement.focus();
            }
          }
          attachEventListeners() {
            if (!this.inputElement) return;
            this.inputElement.addEventListener("keydown", (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const command = this.inputElement.value.trim();
                if (command) {
                  this.executeCommand(command);
                  this.commandHistory.push(command);
                  this.historyIndex = this.commandHistory.length;
                  this.updateState({ commandHistory: this.commandHistory });
                }
                this.inputElement.value = "";
                this.inputElement.focus();
              } else if (e.key === "Tab") {
                e.preventDefault();
                this.handleTabCompletion();
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                if (this.historyIndex > 0) {
                  this.historyIndex--;
                  const historyEntry = this.commandHistory[this.historyIndex];
                  if (historyEntry !== void 0) {
                    this.inputElement.value = historyEntry;
                  }
                }
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                if (this.historyIndex < this.commandHistory.length - 1) {
                  this.historyIndex++;
                  const historyEntry = this.commandHistory[this.historyIndex];
                  if (historyEntry !== void 0) {
                    this.inputElement.value = historyEntry;
                  }
                } else {
                  this.historyIndex = this.commandHistory.length;
                  this.inputElement.value = "";
                }
              }
            });
          }
          showWelcomeMessage() {
            this.addOutput(
              'Willkommen im Terminal! Gib "help" ein f\xFCr verf\xFCgbare Befehle.',
              "info"
            );
          }
          handleTabCompletion() {
            if (!this.inputElement) return;
            const input = this.inputElement.value;
            const [partialCmd, ...args] = input.split(" ");
            if (partialCmd === void 0) return;
            const availableCommands = [
              "help",
              "clear",
              "ls",
              "pwd",
              "cd",
              "cat",
              "echo",
              "date",
              "whoami"
            ];
            if (args.length === 0) {
              const matches = availableCommands.filter((cmd) => cmd.startsWith(partialCmd));
              if (matches.length === 1) {
                const match = matches[0];
                if (match !== void 0) {
                  this.inputElement.value = match + " ";
                }
              } else if (matches.length > 1) {
                this.addOutput(`guest@marvin:${this.currentPath}$ ${input}`, "command");
                this.addOutput(matches.join("  "), "info");
                const commonPrefix = this.findCommonPrefix(matches);
                if (commonPrefix.length > partialCmd.length) {
                  this.inputElement.value = commonPrefix;
                }
              }
            } else {
              if (partialCmd === "cd" || partialCmd === "cat") {
                this.completePathArgument(partialCmd, args[0] || "");
              }
            }
          }
          findCommonPrefix(strings) {
            if (!strings.length) return "";
            const firstString = strings[0];
            if (strings.length === 1) return firstString != null ? firstString : "";
            if (firstString === void 0) return "";
            let prefix = firstString;
            for (let i = 1; i < strings.length; i++) {
              const currentString = strings[i];
              if (currentString === void 0) continue;
              while (currentString.indexOf(prefix) !== 0) {
                prefix = prefix.substring(0, prefix.length - 1);
                if (!prefix) return "";
              }
            }
            return prefix;
          }
          completePathArgument(cmd, partial) {
            const currentDir = this.resolvePath(this.currentPath);
            if (!currentDir || currentDir.type !== "directory") return;
            const items = Object.keys(currentDir.contents);
            let matches;
            if (cmd === "cd") {
              matches = items.filter(
                (item) => currentDir.contents[item].type === "directory" && item.startsWith(partial)
              );
            } else {
              matches = items.filter(
                (item) => currentDir.contents[item].type === "file" && item.startsWith(partial)
              );
            }
            if (matches.length === 1) {
              this.inputElement.value = `${cmd} ${matches[0]}`;
            } else if (matches.length > 1) {
              this.addOutput(
                `guest@marvin:${this.currentPath}$ ${this.inputElement.value}`,
                "command"
              );
              const formatted = matches.map((item) => {
                const itemObj = currentDir.contents[item];
                if (!itemObj) return item;
                const prefix = itemObj.type === "directory" ? "\u{1F4C1} " : "\u{1F4C4} ";
                return prefix + item;
              });
              this.addOutput(formatted.join("  "), "info");
              const commonPrefix = this.findCommonPrefix(matches);
              if (commonPrefix.length > partial.length) {
                this.inputElement.value = `${cmd} ${commonPrefix}`;
              }
            }
          }
          executeCommand(command) {
            this.addOutput(`guest@marvin:${this.currentPath}$ ${command}`, "command");
            const [cmd, ...args] = command.split(" ");
            if (cmd === void 0) return;
            const commands = {
              help: () => this.showHelp(),
              clear: () => this.clearOutput(),
              ls: () => this.listDirectory(args[0]),
              pwd: () => this.printWorkingDirectory(),
              cd: () => this.changeDirectory(args[0]),
              cat: () => this.catFile(args[0]),
              echo: () => this.echo(args.join(" ")),
              date: () => this.showDate(),
              whoami: () => this.addOutput("guest", "output")
            };
            const commandFn = commands[cmd];
            if (commandFn !== void 0) {
              commandFn();
            } else {
              this.addOutput(
                `Befehl nicht gefunden: ${cmd}. Gib "help" ein f\xFCr verf\xFCgbare Befehle.`,
                "error"
              );
            }
          }
          addOutput(text, type = "output") {
            if (!this.outputElement) return;
            const line = document.createElement("div");
            line.className = `terminal-line terminal-${type}`;
            const colorMap = {
              command: "text-blue-400",
              output: "text-green-400",
              error: "text-red-400",
              info: "text-yellow-400"
            };
            line.className += ` ${colorMap[type] || "text-green-400"}`;
            line.textContent = text;
            this.outputElement.appendChild(line);
            this.outputElement.scrollTop = this.outputElement.scrollHeight;
          }
          clearOutput() {
            if (this.outputElement) this.outputElement.innerHTML = "";
          }
          showHelp() {
            const helpText = [
              "Verf\xFCgbare Befehle:",
              "  help         - Zeige diese Hilfe",
              "  clear        - L\xF6sche Ausgabe",
              "  ls [path]    - Liste Dateien (optional mit Pfad)",
              "  pwd          - Zeige aktuelles Verzeichnis",
              "  cd <dir>     - Wechsle Verzeichnis (., .., ~, relative/absolute Pfade)",
              "  cat <file>   - Zeige Dateiinhalt (auch mit Pfad: cat ./file oder cat dir/file)",
              "  echo <text>  - Gebe Text aus",
              "  date         - Zeige Datum/Zeit",
              "  whoami       - Zeige Benutzername",
              "",
              "Pfad-Beispiele:",
              "  .            - Aktuelles Verzeichnis",
              "  ..           - \xDCbergeordnetes Verzeichnis",
              "  ~            - Home-Verzeichnis",
              "  ./file       - Datei im aktuellen Verzeichnis",
              "  ../file      - Datei im \xFCbergeordneten Verzeichnis",
              "  dir/subdir   - Unterverzeichnis (relativ)",
              "",
              "Tipps:",
              "  \u2191/\u2193          - Durchsuche Befehlshistorie",
              "  Tab          - Vervollst\xE4ndige Befehle und Pfade"
            ];
            helpText.forEach((l) => this.addOutput(l, "info"));
          }
          listDirectory(path) {
            const targetPath = path ? this.normalizePath(path) : this.currentPath;
            const targetDir = this.resolvePath(targetPath);
            if (!targetDir) {
              this.addOutput(`Verzeichnis nicht gefunden: ${path || targetPath}`, "error");
              return;
            }
            if (targetDir.type !== "directory") {
              this.addOutput(`${path || targetPath} ist kein Verzeichnis`, "error");
              return;
            }
            const items = Object.keys(targetDir.contents);
            if (items.length === 0) this.addOutput("(leer)", "output");
            else {
              items.forEach((item) => {
                const itemObj = targetDir.contents[item];
                if (!itemObj) return;
                const prefix = itemObj.type === "directory" ? "\u{1F4C1} " : "\u{1F4C4} ";
                this.addOutput(prefix + item, "output");
              });
            }
          }
          printWorkingDirectory() {
            this.addOutput(this.currentPath, "output");
          }
          changeDirectory(path) {
            if (!path) {
              this.currentPath = "~";
              this.updatePrompt();
              return;
            }
            const newPath = this.normalizePath(path);
            const resolved = this.resolvePath(newPath);
            if (!resolved) {
              this.addOutput(`Verzeichnis nicht gefunden: ${path}`, "error");
              return;
            }
            if (resolved.type !== "directory") {
              this.addOutput(`${path} ist kein Verzeichnis`, "error");
              return;
            }
            this.currentPath = newPath;
            this.updatePrompt();
            this.updateState({ currentPath: this.currentPath });
          }
          catFile(filename) {
            var _a, _b;
            if (!filename) {
              this.addOutput("Dateiname fehlt", "error");
              return;
            }
            if (filename.includes("/")) {
              const normalizedPath = this.normalizePath(filename);
              const pathParts = normalizedPath.split("/").filter((p) => p !== "");
              const fileName = pathParts.pop();
              const dirPath = pathParts.length > 0 ? pathParts.join("/") : "~";
              const dir = this.resolvePath(dirPath);
              if (!dir) {
                this.addOutput(`Verzeichnis nicht gefunden: ${dirPath}`, "error");
                return;
              }
              const file = (_a = dir.contents) == null ? void 0 : _a[fileName];
              if (!file) this.addOutput(`Datei nicht gefunden: ${filename}`, "error");
              else if (file.type !== "file")
                this.addOutput(`${filename} ist keine Datei`, "error");
              else this.addOutput(file.content, "output");
            } else {
              const currentDir = this.resolvePath(this.currentPath);
              const file = (_b = currentDir == null ? void 0 : currentDir.contents) == null ? void 0 : _b[filename];
              if (!file) this.addOutput(`Datei nicht gefunden: ${filename}`, "error");
              else if (file.type !== "file")
                this.addOutput(`${filename} ist keine Datei`, "error");
              else this.addOutput(file.content, "output");
            }
          }
          echo(text) {
            this.addOutput(text, "output");
          }
          showDate() {
            this.addOutput((/* @__PURE__ */ new Date()).toString(), "output");
          }
          updatePrompt() {
            var _a;
            const prompt = (_a = this.container) == null ? void 0 : _a.querySelector(".terminal-prompt");
            if (prompt) {
              prompt.textContent = `guest@marvin:${this.currentPath}$`;
            }
          }
          resolvePath(path) {
            if (!path) return null;
            const normalizedPath = this.normalizePath(path);
            const homeNode = this.fileSystem["~"];
            if (normalizedPath === "~") return homeNode != null ? homeNode : null;
            if (homeNode === void 0) return null;
            let current = homeNode;
            const parts = normalizedPath.replace(/^~\/?/, "").split("/").filter((p) => p);
            for (const part of parts) {
              if (current.type !== "directory") return null;
              if (!current.contents || !current.contents[part])
                return null;
              const nextNode = current.contents[part];
              if (nextNode === void 0) return null;
              current = nextNode;
            }
            return current;
          }
          normalizePath(path) {
            if (!path || path === "~") return "~";
            if (path === ".") return this.currentPath;
            if (path === "./") return this.currentPath;
            let workingPath;
            if (path.startsWith("~")) workingPath = path;
            else if (path.startsWith("/")) workingPath = "~" + path;
            else
              workingPath = this.currentPath === "~" ? `~/${path}` : `${this.currentPath}/${path}`;
            const parts = workingPath.split("/").filter((p) => p !== "" && p !== ".");
            const resolved = [];
            for (const part of parts) {
              if (part === "..") {
                if (resolved.length > 0 && resolved[resolved.length - 1] !== "~") {
                  resolved.pop();
                }
              } else {
                resolved.push(part);
              }
            }
            if (resolved.length === 0 || resolved.length === 1 && resolved[0] === "~") return "~";
            if (resolved[0] !== "~") resolved.unshift("~");
            return resolved.join("/");
          }
          parentPath(path) {
            const parts = path.split("/").filter(Boolean);
            parts.pop();
            return parts.length > 0 ? "/" + parts.join("/") : "~";
          }
          serialize() {
            const baseSerialize = Base.prototype.serialize;
            const baseObj = baseSerialize.call(this);
            return {
              ...baseObj,
              currentPath: this.currentPath,
              commandHistory: this.commandHistory,
              fileSystem: this.fileSystem
            };
          }
          deserialize(data) {
            const baseDeserialize = Base.prototype.deserialize;
            baseDeserialize.call(this, data);
            const d = data;
            if (d.currentPath) {
              this.currentPath = d.currentPath;
              this.updatePrompt();
            }
            if (d.commandHistory) {
              this.commandHistory = d.commandHistory;
              this.historyIndex = this.commandHistory.length;
            }
            if (d.fileSystem) {
              this.fileSystem = d.fileSystem;
            }
          }
          focus() {
            const baseFocus = Base.prototype.focus;
            baseFocus.call(this);
            if (this.inputElement) this.inputElement.focus();
          }
        }
        window.TerminalInstance = TerminalInstance;
        const G = window;
        const InstanceManager = G["InstanceManager"];
        if (InstanceManager) {
          G["TerminalInstanceManager"] = new InstanceManager({
            type: "terminal",
            instanceClass: TerminalInstance,
            maxInstances: 0,
            createContainer: function(instanceId) {
              const terminalModalContainer = document.getElementById("terminal-container");
              if (!terminalModalContainer) {
                console.error("Terminal container not found");
                return null;
              }
              const container = document.createElement("div");
              container.id = `${instanceId}-container`;
              container.className = "terminal-instance-container h-full";
              const domUtils = window.DOMUtils;
              if (domUtils && typeof domUtils.hide === "function") {
                domUtils.hide(container);
              } else {
                container.classList.add("hidden");
              }
              terminalModalContainer.appendChild(container);
              return container;
            }
          });
        }
      })();
    }
  });

  // src/ts/text-editor-instance.ts
  var require_text_editor_instance = __commonJS({
    "src/ts/text-editor-instance.ts"() {
      "use strict";
      console.log("TextEditorInstance (TS) loaded");
      (() => {
        "use strict";
        const Base = window.BaseWindowInstance;
        class TextEditorInstance extends Base {
          constructor(config) {
            super({
              ...config,
              type: "text-editor"
            });
            this.editor = null;
            this.statusBar = null;
            this.saveButton = null;
            this.fileInput = null;
            this.wordCountDisplay = null;
            this.lineColDisplay = null;
            this.findReplacePanel = null;
            this.findInput = null;
            this.replaceInput = null;
            this.wrapMode = "off";
            this.currentRemoteFile = null;
            this.currentFilename = config.filename || "Untitled.txt";
            this.isDirty = false;
          }
          render() {
            if (!this.container) return;
            const isDark = document.documentElement.classList.contains("dark");
            this.container.innerHTML = `
                <div class="text-editor-wrapper flex flex-col h-full" style="background: ${isDark ? "#0f172a" : "#fafafa"}; color: ${isDark ? "#e5e7eb" : "#111827"};">
                    <!-- Toolbar -->
                    <div class="text-editor-toolbar flex-none" style="background: ${isDark ? "#1f2937" : "#f5f5f5"}; padding: 8px 12px; border-bottom: 1px solid ${isDark ? "#374151" : "#d1d5db"}; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <button type="button" class="text-editor-btn" data-action="clear" title="Neu">Neu</button>
                        <button type="button" class="text-editor-btn" data-action="open" title="\xD6ffnen">\xD6ffnen</button>
                        <button type="button" class="text-editor-btn text-save-btn" data-action="save" title="Speichern">Speichern</button>
                        <div class="toolbar-separator"></div>
                        <button type="button" class="text-editor-btn" data-action="bold" title="Fett" style="font-weight: bold;">B</button>
                        <button type="button" class="text-editor-btn" data-action="italic" title="Kursiv" style="font-style: italic;">I</button>
                        <button type="button" class="text-editor-btn" data-action="underline" title="Unterstrichen" style="text-decoration: underline;">U</button>
                        <div class="toolbar-separator"></div>
                        <button type="button" class="text-editor-btn" data-action="find" title="Suchen & Ersetzen">\u{1F50D}</button>
                        <button type="button" class="text-editor-btn" data-action="toggleWrap" title="Zeilenumbruch">\u23CE</button>
                        <input type="file" class="text-file-input"
                            accept=".txt,.md,.markdown,.html,.css,.js,.json,.yml,.yaml,.xml"
                            style="display:none">
                    </div>

                    <!-- Find/Replace Panel (hidden by default) -->
                    <div class="find-replace-panel" style="background: ${isDark ? "#1f2937" : "#f5f5f5"}; padding: 8px 12px; border-bottom: 1px solid ${isDark ? "#374151" : "#d1d5db"}; display: none; gap: 8px; align-items: center;">
                        <input type="text" class="find-input" placeholder="Suchen..." style="padding: 4px 8px; border: 1px solid ${isDark ? "#475569" : "#d1d5db"}; border-radius: 4px; background: ${isDark ? "#111827" : "#ffffff"}; color: inherit;">
                        <input type="text" class="replace-input" placeholder="Ersetzen..." style="padding: 4px 8px; border: 1px solid ${isDark ? "#475569" : "#d1d5db"}; border-radius: 4px; background: ${isDark ? "#111827" : "#ffffff"}; color: inherit;">
                        <button type="button" class="text-editor-btn" data-action="findNext">Weiter</button>
                        <button type="button" class="text-editor-btn" data-action="replaceOne">Ersetzen</button>
                        <button type="button" class="text-editor-btn" data-action="replaceAll">Alle ersetzen</button>
                        <button type="button" class="text-editor-btn" data-action="closeFindReplace">\u2715</button>
                    </div>

                    <!-- Status Bar for filename -->
                    <div class="text-file-status" style="padding: 6px 12px; border-bottom: 1px solid ${isDark ? "#374151" : "#d1d5db"}; background: ${isDark ? "#1f2937" : "#f5f5f5"}; font-size: 13px; opacity: 0.85; display: none;"></div>

                    <!-- Editor Textarea -->
                    <textarea class="text-editor-textarea flex-1 w-full resize-none p-4 border-0 outline-none"
                        spellcheck="false"
                        wrap="off"
                        style="background: ${isDark ? "#111827" : "#ffffff"}; color: inherit; font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Courier New', monospace; font-size: 14px; line-height: 1.6; tab-size: 4;"
                        placeholder="Text eingeben..."></textarea>

                    <!-- Status Bar -->
                    <div class="text-editor-statusbar flex-none" style="background: ${isDark ? "#1f2937" : "#f5f5f5"}; padding: 6px 12px; border-top: 1px solid ${isDark ? "#374151" : "#d1d5db"}; font-size: 12px; opacity: 0.75; display: flex; justify-content: space-between;">
                        <span class="word-count-display">W\xF6rter: 0 | Zeichen: 0</span>
                        <span class="line-col-display">Zeile 1, Spalte 1</span>
                    </div>
                </div>
            `;
            this._applyButtonStyles();
          }
          _applyButtonStyles() {
            if (!this.container) return;
            const isDark = document.documentElement.classList.contains("dark");
            const buttons = this.container.querySelectorAll(
              ".text-editor-btn"
            );
            buttons.forEach((btn) => {
              btn.style.cssText = `
                    padding: 6px 12px;
                    font-size: 13px;
                    border: 1px solid ${isDark ? "#475569" : "#d1d5db"};
                    background: ${isDark ? "#111827" : "#ffffff"};
                    color: inherit;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: background 0.2s;
                `;
            });
            const separators = this.container.querySelectorAll(".toolbar-separator");
            separators.forEach((sep) => {
              sep.style.cssText = `
                    width: 1px;
                    height: 20px;
                    background: ${isDark ? "#475569" : "#d1d5db"};
                    margin: 0 4px;
                `;
            });
          }
          attachEventListeners() {
            var _a, _b, _c, _d;
            if (!this.container) return;
            this.editor = this.container.querySelector(
              ".text-editor-textarea"
            );
            this.statusBar = this.container.querySelector(".text-file-status");
            this.saveButton = this.container.querySelector('[data-action="save"]');
            this.fileInput = this.container.querySelector(
              ".text-file-input"
            );
            this.wordCountDisplay = this.container.querySelector(".word-count-display");
            this.lineColDisplay = this.container.querySelector(".line-col-display");
            this.findReplacePanel = this.container.querySelector(".find-replace-panel");
            this.findInput = this.container.querySelector(".find-input");
            this.replaceInput = this.container.querySelector(
              ".replace-input"
            );
            if (this.state && this.state.content && this.editor) {
              this.editor.value = this.state.content;
            }
            (_a = this.editor) == null ? void 0 : _a.addEventListener("input", () => this._handleInput());
            (_b = this.editor) == null ? void 0 : _b.addEventListener("click", () => this._updateCursorPosition());
            (_c = this.editor) == null ? void 0 : _c.addEventListener("keyup", () => this._updateCursorPosition());
            (_d = this.editor) == null ? void 0 : _d.addEventListener("select", () => this._updateCursorPosition());
            this.container.addEventListener("click", (e) => {
              const target = e.target;
              const btn = target == null ? void 0 : target.closest("[data-action]");
              if (!btn) return;
              const action = btn.getAttribute("data-action");
              this._handleAction(action);
            });
            if (this.fileInput) {
              this.fileInput.addEventListener(
                "change",
                (e) => this._handleFileOpen(e)
              );
            }
            this._updateWordCount();
            this._updateCursorPosition();
            this._loadWrapPreference();
          }
          _handleAction(action) {
            const actions = {
              clear: () => this.clearContent(),
              open: () => this.openFile(),
              save: () => this.saveFile(),
              bold: () => this._wrapSelection("**", "**"),
              italic: () => this._wrapSelection("*", "*"),
              underline: () => this._wrapSelection("<u>", "</u>"),
              find: () => this.toggleFindReplace(),
              toggleWrap: () => this.toggleWrapMode(),
              findNext: () => this.findNext(),
              replaceOne: () => this.replaceOne(),
              replaceAll: () => this.replaceAll(),
              closeFindReplace: () => this.closeFindReplace()
            };
            if (actions[action]) actions[action]();
          }
          _handleInput() {
            this.isDirty = true;
            if (this.editor) {
              this.updateState({ content: this.editor.value });
              this._updateWordCount();
              this._updateSaveButton();
              const emit = Base.prototype.emit;
              emit.call(this, "contentChanged", { content: this.editor.value });
            }
          }
          _updateWordCount() {
            if (!this.editor || !this.wordCountDisplay) return;
            const text = this.editor.value;
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            const chars = text.length;
            this.wordCountDisplay.textContent = `W\xF6rter: ${words} | Zeichen: ${chars}`;
          }
          _updateCursorPosition() {
            if (!this.editor || !this.lineColDisplay) return;
            const pos = this.editor.selectionStart;
            const textBeforeCursor = this.editor.value.substring(0, pos);
            const line = (textBeforeCursor.match(/\n/g) || []).length + 1;
            const lastNewline = textBeforeCursor.lastIndexOf("\n");
            const col = pos - lastNewline;
            this.lineColDisplay.textContent = `Zeile ${line}, Spalte ${col}`;
            this.updateState({ cursorPosition: { line, col } });
          }
          _updateSaveButton() {
            if (!this.saveButton) return;
            if (this.isDirty) {
              this.saveButton.style.fontWeight = "bold";
              this.saveButton.setAttribute("title", "\xC4nderungen speichern");
            } else {
              this.saveButton.style.fontWeight = "normal";
              this.saveButton.setAttribute("title", "Speichern");
            }
          }
          clearContent() {
            if (this.isDirty && !confirm("Ungespeicherte \xC4nderungen gehen verloren. Fortfahren?")) {
              return;
            }
            if (this.editor) this.editor.value = "";
            this.currentFilename = "Untitled.txt";
            this.isDirty = false;
            this.updateState({ content: "", filename: this.currentFilename });
            this._updateWordCount();
            this._updateSaveButton();
            this._hideStatusBar();
            const emit = Base.prototype.emit;
            emit.call(this, "contentCleared");
          }
          openFile() {
            var _a;
            (_a = this.fileInput) == null ? void 0 : _a.click();
          }
          _handleFileOpen(event) {
            var _a;
            const target = event.target;
            const file = (_a = target == null ? void 0 : target.files) == null ? void 0 : _a[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target.result;
              if (this.editor) this.editor.value = result;
              this.currentFilename = file.name;
              this.isDirty = false;
              this.updateState({ content: result, filename: file.name });
              this._updateWordCount();
              this._updateSaveButton();
              this._showStatusBar(`Ge\xF6ffnet: ${file.name}`);
              const emit = Base.prototype.emit;
              emit.call(this, "fileOpened", { filename: file.name });
            };
            reader.readAsText(file);
          }
          saveFile() {
            var _a;
            const content = ((_a = this.editor) == null ? void 0 : _a.value) || "";
            const blob = new Blob([content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = this.currentFilename;
            a.click();
            URL.revokeObjectURL(url);
            this.isDirty = false;
            this._updateSaveButton();
            this._showStatusBar(`Gespeichert: ${this.currentFilename}`);
            const emit = Base.prototype.emit;
            emit.call(this, "fileSaved", { filename: this.currentFilename });
          }
          _wrapSelection(before, after) {
            if (!this.editor) return;
            const start = this.editor.selectionStart;
            const end = this.editor.selectionEnd;
            const selectedText = this.editor.value.substring(start, end);
            const replacement = before + selectedText + after;
            this.editor.setRangeText(replacement, start, end, "select");
            this.editor.focus();
            this._handleInput();
          }
          toggleWrapMode() {
            this.wrapMode = this.wrapMode === "soft" ? "off" : "soft";
            if (this.editor) {
              this.editor.wrap = this.wrapMode;
              this.editor.style.whiteSpace = this.wrapMode === "soft" ? "pre-wrap" : "pre";
            }
            try {
              localStorage.setItem(
                `textEditorWrapMode_${this.instanceId}`,
                this.wrapMode
              );
            } catch (e) {
              console.warn("Could not save wrap mode", e);
            }
            this.updateState({ wrapMode: this.wrapMode });
            this._showStatusBar(
              this.wrapMode === "soft" ? "Zeilenumbruch aktiviert" : "Zeilenumbruch deaktiviert"
            );
          }
          _loadWrapPreference() {
            try {
              const id = this.instanceId;
              const saved = localStorage.getItem(`textEditorWrapMode_${id}`);
              if (saved && this.editor) {
                this.wrapMode = saved;
                this.editor.wrap = this.wrapMode;
                this.editor.style.whiteSpace = this.wrapMode === "soft" ? "pre-wrap" : "pre";
              }
            } catch (e) {
              console.warn("Could not load wrap mode", e);
            }
          }
          toggleFindReplace() {
            var _a;
            if (!this.findReplacePanel) return;
            const isHidden = this.findReplacePanel.style.display === "none";
            this.findReplacePanel.style.display = isHidden ? "flex" : "none";
            if (isHidden && this.findInput) this.findInput.focus();
            else (_a = this.editor) == null ? void 0 : _a.focus();
          }
          closeFindReplace() {
            var _a;
            if (this.findReplacePanel) {
              this.findReplacePanel.style.display = "none";
              (_a = this.editor) == null ? void 0 : _a.focus();
            }
          }
          findNext() {
            if (!this.findInput || !this.editor) return;
            const searchText = this.findInput.value;
            if (!searchText) return;
            const content = this.editor.value;
            const currentPos = this.editor.selectionEnd;
            const index = content.indexOf(searchText, currentPos);
            if (index !== -1) {
              this.editor.setSelectionRange(index, index + searchText.length);
              this.editor.focus();
            } else {
              const firstIndex = content.indexOf(searchText);
              if (firstIndex !== -1) {
                this.editor.setSelectionRange(firstIndex, firstIndex + searchText.length);
                this.editor.focus();
              } else {
                this._showStatusBar("Nicht gefunden");
              }
            }
          }
          replaceOne() {
            if (!this.findInput || !this.replaceInput || !this.editor) return;
            const searchText = this.findInput.value;
            const replaceText = this.replaceInput.value;
            if (!searchText) return;
            const start = this.editor.selectionStart;
            const end = this.editor.selectionEnd;
            const selectedText = this.editor.value.substring(start, end);
            if (selectedText === searchText) {
              this.editor.setRangeText(replaceText, start, end, "end");
              this._handleInput();
            }
            this.findNext();
          }
          replaceAll() {
            if (!this.findInput || !this.replaceInput || !this.editor) return;
            const searchText = this.findInput.value;
            const replaceText = this.replaceInput.value;
            if (!searchText) return;
            const newContent = this.editor.value.split(searchText).join(replaceText);
            const count = (this.editor.value.match(new RegExp(searchText, "g")) || []).length;
            this.editor.value = newContent;
            this._handleInput();
            this._showStatusBar(`${count} Ersetzungen vorgenommen`);
          }
          _showStatusBar(message) {
            if (!this.statusBar) return;
            this.statusBar.textContent = message;
            this.statusBar.style.display = "block";
            setTimeout(() => this._hideStatusBar(), 3e3);
          }
          _hideStatusBar() {
            if (this.statusBar) this.statusBar.style.display = "none";
          }
          focus() {
            var _a;
            const baseFocus = Base.prototype.focus;
            baseFocus.call(this);
            (_a = this.editor) == null ? void 0 : _a.focus();
          }
          serialize() {
            var _a;
            const baseSerialize = Base.prototype.serialize;
            const baseObj = baseSerialize.call(this);
            return {
              ...baseObj,
              content: ((_a = this.editor) == null ? void 0 : _a.value) || "",
              filename: this.currentFilename,
              wrapMode: this.wrapMode,
              isDirty: this.isDirty
            };
          }
          deserialize(data) {
            const baseDeserialize = Base.prototype.deserialize;
            baseDeserialize.call(this, data);
            const d = data;
            if (d.content && this.editor) {
              this.editor.value = d.content;
              this._updateWordCount();
            }
            if (d.filename) this.currentFilename = d.filename;
            if (d.wrapMode) {
              this.wrapMode = d.wrapMode;
              if (this.editor) {
                this.editor.wrap = this.wrapMode;
                this.editor.style.whiteSpace = this.wrapMode === "soft" ? "pre-wrap" : "pre";
              }
            }
            if (typeof d.isDirty !== "undefined") {
              this.isDirty = d.isDirty;
              this._updateSaveButton();
            }
          }
        }
        window.TextEditorInstance = TextEditorInstance;
        const G = window;
        const InstanceManager = G["InstanceManager"];
        if (InstanceManager) {
          G["TextEditorInstanceManager"] = new InstanceManager({
            type: "text-editor",
            instanceClass: TextEditorInstance,
            maxInstances: 0,
            createContainer: function(instanceId) {
              const editorModalContainer = document.getElementById("text-editor-container");
              if (!editorModalContainer) {
                console.error("Text editor container not found");
                return null;
              }
              const container = document.createElement("div");
              container.id = `${instanceId}-container`;
              container.className = "text-editor-instance-container h-full";
              const domUtils = window.DOMUtils;
              if (domUtils && typeof domUtils.hide === "function") {
                domUtils.hide(container);
              } else {
                container.classList.add("hidden");
              }
              editorModalContainer.appendChild(container);
              return container;
            }
          });
        }
      })();
    }
  });

  // src/ts/text-editor.ts
  var require_text_editor = __commonJS({
    "src/ts/text-editor.ts"() {
      "use strict";
      var TextEditorSystem = {
        container: null,
        editor: null,
        statusBar: null,
        saveButton: null,
        fileInput: null,
        wrapMode: "off",
        currentRemoteFile: null,
        statusState: null,
        wordCountDisplay: null,
        lineColDisplay: null,
        findReplacePanel: null,
        findInput: null,
        replaceInput: null,
        toastContainer: null,
        /**
         * Initialize text editor in container
         * @param {HTMLElement|string} containerOrId - Container element or ID
         */
        init(containerOrId) {
          const container = typeof containerOrId === "string" ? document.getElementById(containerOrId) : containerOrId;
          if (!container) {
            console.error("Text editor container not found:", containerOrId);
            return;
          }
          this.container = container;
          this.render();
          this.cacheElements();
          this.loadWrapPreference();
          this.attachListeners();
          this.loadSavedContent();
          this.syncSaveButtonState();
          if (window.ActionBus) {
            this.registerActions();
          }
        },
        /**
         * Render text editor UI
         */
        render() {
          if (!this.container) return;
          this.container.innerHTML = `
                <div class="dialog-content flex flex-col h-full" style="background: var(--editor-body-bg, #fafafa); color: var(--editor-text, #111827);">
                    <!-- File Operations Toolbar -->
                    <div id="text-toolbar" class="flex-none" style="background: var(--editor-toolbar-bg, #f5f5f5); padding: 8px 12px; border-bottom: 1px solid var(--editor-toolbar-border, #d1d5db); display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <button type="button" data-action="textEditor:clear" class="text-editor-btn" data-i18n="textEditor.toolbar.clear" data-i18n-title="textEditor.toolbar.clear">Neu</button>
                        <button type="button" data-action="textEditor:open" class="text-editor-btn" data-i18n="textEditor.toolbar.open" data-i18n-title="textEditor.toolbar.open">\xD6ffnen</button>
                        <button type="button" data-action="textEditor:save" class="text-editor-btn" id="text-save-button" data-i18n="textEditor.toolbar.save" data-i18n-title="textEditor.toolbar.save">Speichern</button>
                        <div style="width: 1px; height: 20px; background: var(--editor-toolbar-border, #d1d5db); margin: 0 4px;"></div>
                        <button type="button" data-action="textEditor:bold" class="text-editor-btn" data-i18n-title="textEditor.toolbar.bold" style="font-weight: bold;">B</button>
                        <button type="button" data-action="textEditor:italic" class="text-editor-btn" data-i18n-title="textEditor.toolbar.italic" style="font-style: italic;">I</button>
                        <button type="button" data-action="textEditor:underline" class="text-editor-btn" data-i18n-title="textEditor.toolbar.underline" style="text-decoration: underline;">U</button>
                        <button type="button" data-action="textEditor:strikethrough" class="text-editor-btn" data-i18n-title="textEditor.toolbar.strikeThrough" style="text-decoration: line-through;">S</button>
                        <div style="width: 1px; height: 20px; background: var(--editor-toolbar-border, #d1d5db); margin: 0 4px;"></div>
                        <button type="button" data-action="textEditor:heading1" class="text-editor-btn" data-i18n-title="textEditor.toolbar.heading1">H1</button>
                        <button type="button" data-action="textEditor:heading2" class="text-editor-btn" data-i18n-title="textEditor.toolbar.heading2">H2</button>
                        <button type="button" data-action="textEditor:heading3" class="text-editor-btn" data-i18n-title="textEditor.toolbar.heading3">H3</button>
                        <div style="width: 1px; height: 20px; background: var(--editor-toolbar-border, #d1d5db); margin: 0 4px;"></div>
                        <button type="button" data-action="textEditor:unorderedList" class="text-editor-btn" data-i18n-title="textEditor.toolbar.unorderedList">\u2022 List</button>
                        <button type="button" data-action="textEditor:orderedList" class="text-editor-btn" data-i18n-title="textEditor.toolbar.orderedList">1. List</button>
                        <div style="width: 1px; height: 20px; background: var(--editor-toolbar-border, #d1d5db); margin: 0 4px;"></div>
                        <button type="button" data-action="textEditor:alignLeft" class="text-editor-btn" data-i18n-title="textEditor.toolbar.alignLeft">\u21E4</button>
                        <button type="button" data-action="textEditor:alignCenter" class="text-editor-btn" data-i18n-title="textEditor.toolbar.alignCenter">\u2261</button>
                        <button type="button" data-action="textEditor:alignRight" class="text-editor-btn" data-i18n-title="textEditor.toolbar.alignRight">\u21E5</button>
                        <div style="width: 1px; height: 20px; background: var(--editor-toolbar-border, #d1d5db); margin: 0 4px;"></div>
                        <button type="button" data-action="textEditor:insertLink" class="text-editor-btn" data-i18n-title="textEditor.toolbar.insertLink">\u{1F517}</button>
                        <button type="button" data-action="textEditor:findReplace" class="text-editor-btn" data-i18n-title="textEditor.toolbar.findReplace">\u{1F50D}</button>
                        <input type="file" id="text-file-input"
                            accept=".txt,.md,.markdown,.html,.htm,.css,.scss,.js,.jsx,.ts,.tsx,.json,.yml,.yaml,.xml,.csv,.tsv,.ini,.cfg,.conf,.env,.gitignore,.log,.c,.h,.cpp,.hpp,.java,.kt,.swift,.cs,.py,.rb,.php,.rs,.go,.sh,.bash,.zsh,.fish,.ps1,.bat"
                            style="display:none">
                    </div>
                    <!-- Find and Replace Panel (Hidden by default) -->
                    <div id="find-replace-panel" class="flex-none" style="background: var(--editor-toolbar-bg, #f5f5f5); padding: 8px 12px; border-bottom: 1px solid var(--editor-toolbar-border, #d1d5db); display: none; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <input type="text" id="find-input" data-i18n-placeholder="textEditor.findReplace.find" placeholder="Find..." style="padding: 4px 8px; border: 1px solid var(--editor-toolbar-border, #d1d5db); border-radius: 4px; background: var(--editor-surface-bg, #ffffff); color: var(--editor-text, #111827); font-size: 13px;">
                        <input type="text" id="replace-input" data-i18n-placeholder="textEditor.findReplace.replace" placeholder="Replace..." style="padding: 4px 8px; border: 1px solid var(--editor-toolbar-border, #d1d5db); border-radius: 4px; background: var(--editor-surface-bg, #ffffff); color: var(--editor-text, #111827); font-size: 13px;">
                        <button type="button" data-action="textEditor:findNext" class="text-editor-btn" data-i18n="textEditor.findReplace.next" data-i18n-title="textEditor.findReplace.next" style="font-size: 12px;">Next</button>
                        <button type="button" data-action="textEditor:replaceOne" class="text-editor-btn" data-i18n="textEditor.findReplace.replaceOne" data-i18n-title="textEditor.findReplace.replaceOne" style="font-size: 12px;">Replace</button>
                        <button type="button" data-action="textEditor:replaceAll" class="text-editor-btn" data-i18n="textEditor.findReplace.replaceAll" data-i18n-title="textEditor.findReplace.replaceAll" style="font-size: 12px;">Replace All</button>
                        <button type="button" data-action="textEditor:closeFindReplace" class="text-editor-btn" data-i18n="textEditor.findReplace.close" data-i18n-title="textEditor.findReplace.close" style="font-size: 12px;">\u2715</button>
                    </div>
                    <div id="text-file-status" class="flex-none" style="padding: 8px 16px; border-bottom: 1px solid var(--editor-toolbar-border, #d1d5db); background: var(--editor-body-bg, #fafafa); color: var(--editor-text, #111827); font-size: 14px; opacity: 0.75; display: none;"></div>
                    <textarea id="text-editor-textarea" spellcheck="false" wrap="off" class="flex-1 w-full resize-none p-4 border-0 outline-none"
                        style="background: var(--editor-surface-bg, #ffffff); color: inherit; font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 14px; line-height: 1.6; tab-size: 4;"
                        title="textarea"></textarea>
                    <!-- Status Bar with Word Count -->
                    <div id="word-count-bar" class="flex-none" style="background: var(--editor-toolbar-bg, #f5f5f5); padding: 6px 12px; border-top: 1px solid var(--editor-toolbar-border, #d1d5db); font-size: 12px; color: var(--editor-text, #111827); opacity: 0.75; display: flex; justify-content: space-between;">
                        <span id="word-count-display" data-i18n="textEditor.status.wordCount" data-i18n-params='{"words":0,"chars":0}'>Words: 0 | Characters: 0</span>
                        <span id="line-col-display" data-i18n="textEditor.status.position" data-i18n-params='{"line":1,"col":1}'>Line 1, Col 1</span>
                    </div>
                </div>
            `;
          this.updateCSSVariables();
          if (window.appI18n && typeof window.appI18n.applyTranslations === "function") {
            window.appI18n.applyTranslations();
          }
        },
        /**
         * Update CSS variables for dark mode
         */
        updateCSSVariables() {
          if (!this.container) return;
          const isDark = document.documentElement.classList.contains("dark");
          this.container.style.setProperty("--editor-body-bg", isDark ? "#0f172a" : "#fafafa");
          this.container.style.setProperty("--editor-text", isDark ? "#e5e7eb" : "#111827");
          this.container.style.setProperty("--editor-toolbar-bg", isDark ? "#1f2937" : "#f5f5f5");
          this.container.style.setProperty(
            "--editor-toolbar-border",
            isDark ? "#374151" : "#d1d5db"
          );
          this.container.style.setProperty(
            "--editor-toolbar-button-bg",
            isDark ? "#111827" : "#ffffff"
          );
          this.container.style.setProperty(
            "--editor-toolbar-button-hover",
            isDark ? "#1f2937" : "#e5e7eb"
          );
          this.container.style.setProperty(
            "--editor-toolbar-button-border",
            isDark ? "#475569" : "#d1d5db"
          );
          this.container.style.setProperty("--editor-surface-bg", isDark ? "#111827" : "#ffffff");
          const buttons = this.container.querySelectorAll(".text-editor-btn");
          buttons.forEach((btn) => {
            btn.style.margin = "0";
            btn.style.padding = "6px 12px";
            btn.style.fontSize = "14px";
            btn.style.border = `1px solid ${isDark ? "#475569" : "#d1d5db"}`;
            btn.style.background = isDark ? "#111827" : "#ffffff";
            btn.style.cursor = "pointer";
            btn.style.color = "inherit";
            btn.style.borderRadius = "6px";
          });
        },
        /**
         * Cache DOM elements
         */
        cacheElements() {
          if (!this.container) return;
          this.editor = this.container.querySelector(
            "#text-editor-textarea"
          );
          this.statusBar = this.container.querySelector("#text-file-status");
          this.saveButton = this.container.querySelector("#text-save-button");
          this.fileInput = this.container.querySelector("#text-file-input");
          this.wordCountDisplay = this.container.querySelector(
            "#word-count-display"
          );
          this.lineColDisplay = this.container.querySelector("#line-col-display");
          this.findReplacePanel = this.container.querySelector(
            "#find-replace-panel"
          );
          this.findInput = this.container.querySelector("#find-input");
          this.replaceInput = this.container.querySelector("#replace-input");
        },
        /**
         * Load wrap mode preference
         */
        loadWrapPreference() {
          const storedWrapMode = localStorage.getItem("textEditorWrapMode");
          this.wrapMode = storedWrapMode === "soft" ? "soft" : "off";
          this.applyWrapMode(this.wrapMode);
        },
        /**
         * Apply wrap mode
         * @param {string} mode - Wrap mode (soft|off)
         */
        applyWrapMode(mode) {
          if (!this.editor) return;
          const effective = mode != null ? mode : this.wrapMode;
          const normalized = effective === "soft" ? "soft" : "off";
          this.wrapMode = normalized;
          this.editor.wrap = normalized;
          this.editor.style.whiteSpace = normalized === "soft" ? "pre-wrap" : "pre";
          try {
            localStorage.setItem("textEditorWrapMode", normalized);
          } catch (err) {
            console.warn("Wrap preference could not be stored:", err);
          }
        },
        /**
         * Toggle wrap mode
         */
        toggleWrapMode() {
          const next = this.wrapMode === "soft" ? "off" : "soft";
          this.applyWrapMode(next);
          this.setStatusPlain(
            next === "soft" ? "Zeilenumbruch aktiviert" : "Zeilenumbruch deaktiviert"
          );
          this.focusEditor();
        },
        /**
         * Attach event listeners
         */
        attachListeners() {
          if (!this.editor || !this.fileInput) return;
          this.editor.addEventListener("input", () => {
            this.handleEditorInput();
            this.updateWordCount();
          });
          this.editor.addEventListener("click", () => {
            this.updateCursorPosition();
          });
          this.editor.addEventListener("keyup", () => {
            this.updateCursorPosition();
          });
          this.fileInput.addEventListener("change", (event) => {
            this.handleFileSelect(event);
          });
          const themeObserver = new MutationObserver(() => {
            this.updateCSSVariables();
          });
          themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"]
          });
          window.addEventListener("languagePreferenceChange", () => {
            this.updateDocumentTitle();
            this.applyStatusState();
          });
          this.updateWordCount();
          this.updateCursorPosition();
        },
        /**
         * Register actions with ActionBus
         */
        registerActions() {
          if (!window.ActionBus) return;
          window.ActionBus.registerAll({
            "textEditor:clear": () => this.clearEditor(),
            "textEditor:open": () => this.openFile(),
            "textEditor:save": () => this.saveFile(),
            "textEditor:toggleWrap": () => this.toggleWrapMode(),
            "textEditor:undo": () => this.execCommand("undo"),
            "textEditor:redo": () => this.execCommand("redo"),
            "textEditor:cut": () => this.execCommand("cut"),
            "textEditor:copy": () => this.execCommand("copy"),
            "textEditor:paste": () => this.handlePaste(),
            "textEditor:selectAll": () => this.selectAll(),
            // New formatting actions
            "textEditor:bold": () => this.wrapSelection("**", "**"),
            "textEditor:italic": () => this.wrapSelection("*", "*"),
            "textEditor:underline": () => this.wrapSelection("<u>", "</u>"),
            "textEditor:strikethrough": () => this.wrapSelection("~~", "~~"),
            "textEditor:heading1": () => this.insertHeading(1),
            "textEditor:heading2": () => this.insertHeading(2),
            "textEditor:heading3": () => this.insertHeading(3),
            "textEditor:unorderedList": () => this.insertList("unordered"),
            "textEditor:orderedList": () => this.insertList("ordered"),
            "textEditor:alignLeft": () => this.alignText("left"),
            "textEditor:alignCenter": () => this.alignText("center"),
            "textEditor:alignRight": () => this.alignText("right"),
            "textEditor:insertLink": () => this.insertLink(),
            "textEditor:findReplace": () => this.toggleFindReplace(),
            "textEditor:findNext": () => this.findNext(),
            "textEditor:replaceOne": () => this.replaceOne(),
            "textEditor:replaceAll": () => this.replaceAll(),
            "textEditor:closeFindReplace": () => this.closeFindReplace()
          });
        },
        /**
         * Handle editor input
         */
        handleEditorInput() {
          if (!this.editor) return;
          try {
            localStorage.setItem("textEditorContent", this.editor.value);
          } catch (err) {
            console.warn("Could not save editor content to localStorage:", err);
          }
          this.syncSaveButtonState();
        },
        /**
         * Handle file selection
         */
        handleFileSelect(event) {
          var _a;
          const input = event.target;
          const file = (_a = input == null ? void 0 : input.files) == null ? void 0 : _a[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (e) => {
            var _a2;
            const content = (_a2 = e.target) == null ? void 0 : _a2.result;
            if (typeof content === "string" && this.editor) {
              this.editor.value = content;
              this.updateWordCount();
              this.updateCursorPosition();
            }
            this.currentRemoteFile = { fileName: file.name, content: "" };
            this.updateDocumentTitle();
            this.setStatusPlain(file.name);
            this.syncSaveButtonState();
            this.focusEditor();
          };
          reader.readAsText(file);
          if (input) {
            input.value = "";
          }
        },
        /**
         * Load saved content from localStorage
         */
        loadSavedContent() {
          if (!this.editor) return;
          try {
            const saved = localStorage.getItem("textEditorContent");
            if (saved) {
              this.editor.value = saved;
              this.updateWordCount();
              this.updateCursorPosition();
            }
          } catch (err) {
            console.warn("Could not load saved content:", err);
          }
        },
        /**
         * Sync save button state
         */
        syncSaveButtonState() {
          if (!this.saveButton || !this.editor) return;
          this.saveButton.disabled = this.editor.value.length === 0;
        },
        /**
         * Focus editor
         */
        focusEditor() {
          if (this.editor) {
            this.editor.focus();
          }
        },
        /**
         * Clear editor
         */
        clearEditor() {
          if (!this.editor) return;
          this.editor.value = "";
          this.updateWordCount();
          this.updateCursorPosition();
          localStorage.removeItem("textEditorContent");
          this.currentRemoteFile = null;
          this.updateDocumentTitle();
          this.clearStatus();
          this.syncSaveButtonState();
          this.focusEditor();
        },
        /**
         * Open file picker
         */
        openFile() {
          if (this.fileInput) {
            this.fileInput.click();
          }
        },
        /**
         * Save file
         */
        saveFile() {
          if (!this.editor) return;
          const content = this.editor.value;
          const blob = new Blob([content], {
            type: "text/plain;charset=utf-8"
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const firstLine = content.split("\n")[0] || "text";
          const sanitized = firstLine.trim().substring(0, 20).replace(/[^a-zA-Z0-9-_]/g, "") || "text";
          a.download = `${sanitized}.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        /**
         * Execute document command
         * @param {string} command - Command to execute
         */
        execCommand(command) {
          this.focusEditor();
          try {
            if (!document.execCommand(command)) {
              this.setStatusPlain(`Command ${command} not available`);
            }
          } catch (err) {
            console.warn(`Command ${command} failed:`, err);
            this.setStatusPlain(`Command ${command} failed`);
          }
        },
        /**
         * Handle paste operation
         */
        handlePaste(e) {
          this.focusEditor();
          if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
            navigator.clipboard.readText().then((text) => {
              if (text && this.editor) {
                this.insertTextAtCursor(text);
              }
            }).catch(() => {
              this.execCommand("paste");
            });
          } else {
            this.execCommand("paste");
          }
        },
        /**
         * Select all text
         */
        selectAll() {
          this.focusEditor();
          if (this.editor) {
            this.editor.select();
          }
        },
        /**
         * Insert text at cursor position
         * @param {string} text - Text to insert
         */
        insertTextAtCursor(text) {
          if (!this.editor || typeof text !== "string") return;
          const start = typeof this.editor.selectionStart === "number" ? this.editor.selectionStart : this.editor.value.length;
          const end = typeof this.editor.selectionEnd === "number" ? this.editor.selectionEnd : start;
          this.editor.setRangeText(text, start, end, "end");
          this.editor.dispatchEvent(new Event("input", { bubbles: true }));
        },
        /**
         * Update document title
         */
        updateDocumentTitle() {
          const titleKey = this.currentRemoteFile && this.currentRemoteFile.fileName ? "textEditor.documentTitleWithFile" : "textEditor.documentTitle";
          const params = this.currentRemoteFile && this.currentRemoteFile.fileName ? { fileName: this.currentRemoteFile.fileName } : void 0;
          const { text } = this.resolveTranslation(titleKey, params);
          document.title = text;
        },
        /**
         * Format file label for display
         * @param {Object} meta - File metadata
         * @returns {string} Formatted label
         */
        formatFileLabel(meta = {}) {
          const parts = [];
          if (meta.repo) parts.push(meta.repo);
          if (meta.path) {
            parts.push(meta.path);
          } else if (meta.fileName) {
            parts.push(meta.fileName);
          }
          return parts.join(" / ");
        },
        /**
         * Set plain text status
         * @param {string} text - Status text
         */
        setStatusPlain(text) {
          if (!text) {
            this.clearStatus();
            return;
          }
          this.statusState = { type: "plain", text };
          this.applyStatusState();
        },
        /**
         * Set localized status
         * @param {string} key - Translation key
         * @param {Object} params - Translation parameters
         */
        setStatusLocalized(key, params) {
          this.statusState = {
            type: "i18n",
            key,
            params: params || void 0
          };
          this.applyStatusState();
        },
        /**
         * Clear status
         */
        clearStatus() {
          this.statusState = null;
          this.applyStatusState();
        },
        /**
         * Apply status state to UI
         */
        applyStatusState() {
          if (!this.statusBar) return;
          if (!this.statusState) {
            this.statusBar.textContent = "";
            this.statusBar.style.display = "none";
            this.statusBar.removeAttribute("data-i18n");
            this.statusBar.removeAttribute("data-i18n-params");
            return;
          }
          if (this.statusState.type === "i18n") {
            const { text, translated } = this.resolveTranslation(
              this.statusState.key,
              this.statusState.params
            );
            this.statusBar.textContent = text;
            if (translated) {
              this.statusBar.setAttribute("data-i18n", this.statusState.key);
              if (this.statusState.params) {
                this.statusBar.setAttribute(
                  "data-i18n-params",
                  JSON.stringify(this.statusState.params)
                );
              } else {
                this.statusBar.removeAttribute("data-i18n-params");
              }
              if (window.appI18n && typeof window.appI18n.applyTranslations === "function") {
                window.appI18n.applyTranslations();
              }
            } else {
              this.statusBar.removeAttribute("data-i18n");
              this.statusBar.removeAttribute("data-i18n-params");
            }
          } else {
            this.statusBar.removeAttribute("data-i18n");
            this.statusBar.removeAttribute("data-i18n-params");
            this.statusBar.textContent = this.statusState.text;
          }
          this.statusBar.style.display = "block";
        },
        /**
         * Resolve translation
         * @param {string} key - Translation key
         * @param {Object} params - Translation parameters
         * @returns {Object} Resolved translation
         */
        resolveTranslation(key, params) {
          if (!key) return { text: "", translated: false };
          const fallbackMessages = {
            "textEditor.documentTitle": () => "Texteditor",
            "textEditor.documentTitleWithFile": (p) => {
              const fileName = p && p.fileName ? p.fileName : "";
              return fileName ? `Texteditor \u2013 ${fileName}` : "Texteditor";
            },
            "textEditor.status.loading": () => "Lade Datei \u2026",
            "textEditor.status.loadingWithLabel": (p) => {
              const label = p && p.label ? p.label : "";
              return label ? `${label} (l\xE4dt \u2026)` : "Lade Datei \u2026";
            },
            "textEditor.status.loadError": () => "Datei konnte nicht geladen werden.",
            "textEditor.status.rateLimit": () => "GitHub Rate Limit erreicht. Bitte versuche es sp\xE4ter erneut.",
            "textEditor.status.wordCount": (p) => {
              const words = p && typeof p.words === "number" ? p.words : 0;
              const chars = p && typeof p.chars === "number" ? p.chars : 0;
              return `Words: ${words} | Characters: ${chars}`;
            },
            "textEditor.status.position": (p) => {
              const line = p && typeof p.line === "number" ? p.line : 1;
              const col = p && typeof p.col === "number" ? p.col : 1;
              return `Line ${line}, Col ${col}`;
            },
            "textEditor.findReplace.noMatch": () => "No match found",
            "textEditor.findReplace.replacedCount": (p) => {
              const count = p && typeof p.count === "number" ? p.count : 0;
              return `Replaced ${count} occurrence(s)`;
            }
          };
          try {
            if (window.appI18n && typeof window.appI18n.translate === "function") {
              const translated = window.appI18n.translate(key);
              if (translated && translated !== key) {
                return { text: translated, translated: true };
              }
            }
          } catch (err) {
            console.warn("Translation failed, falling back:", err);
          }
          const fallbackFn = fallbackMessages[key];
          if (typeof fallbackFn === "function") {
            return { text: fallbackFn(params || {}), translated: false };
          }
          return { text: key, translated: false };
        },
        // ==================== Public API for Finder Integration ====================
        /**
         * Load remote file into editor
         * @param {Object} payload - File payload
         * @param {string} payload.content - File content
         * @param {string} [payload.fileName] - File name
         * @param {string} [payload.repo] - Repository name
         * @param {string} [payload.path] - File path
         */
        loadRemoteFile(payload) {
          if (typeof payload.content !== "string") {
            console.warn("Invalid payload for loadRemoteFile:", payload);
            return;
          }
          const remotePayload = {
            content: payload.content,
            fileName: payload.fileName,
            repo: payload.repo,
            path: payload.path
          };
          if (this.editor) {
            this.editor.value = remotePayload.content;
            this.updateWordCount();
            this.updateCursorPosition();
          }
          this.currentRemoteFile = remotePayload;
          const label = this.formatFileLabel(remotePayload);
          this.updateDocumentTitle();
          this.setStatusPlain(label);
          try {
            localStorage.setItem("textEditorContent", remotePayload.content);
          } catch (err) {
            console.warn("Could not save to localStorage:", err);
          }
          this.syncSaveButtonState();
          this.focusEditor();
        },
        /**
         * Show loading state
         * @param {Object} payload - Loading payload
         * @param {string} [payload.fileName] - File name
         * @param {string} [payload.repo] - Repository name
         * @param {string} [payload.path] - File path
         */
        showLoading(payload = {}) {
          const label = this.formatFileLabel(payload);
          if (label) {
            this.setStatusLocalized("textEditor.status.loadingWithLabel", {
              label
            });
          } else {
            this.setStatusLocalized("textEditor.status.loading");
          }
        },
        /**
         * Show load error
         * @param {Object} payload - Error payload
         * @param {string} [payload.message] - Error message
         * @param {string} [payload.fileName] - File name
         * @param {string} [payload.repo] - Repository name
         * @param {string} [payload.path] - File path
         */
        showLoadError(payload = {}) {
          const label = this.formatFileLabel(payload);
          const fallback = this.resolveTranslation("textEditor.status.loadError");
          const message = payload && payload.message ? payload.message : fallback.text;
          if (label) {
            this.setStatusPlain(`${label} \u2014 ${message}`);
          } else {
            this.setStatusPlain(message);
          }
        },
        /**
         * Handle menu action
         * @param {string} action - Action name
         */
        handleMenuAction(action) {
          if (!action) return;
          const actionMap = {
            "file:new": "textEditor:clear",
            "file:open": "textEditor:open",
            "file:save": "textEditor:save",
            "edit:undo": "textEditor:undo",
            "edit:redo": "textEditor:redo",
            "edit:cut": "textEditor:cut",
            "edit:copy": "textEditor:copy",
            "edit:paste": "textEditor:paste",
            "edit:selectAll": "textEditor:selectAll",
            "view:toggleWrap": "textEditor:toggleWrap"
          };
          const mappedAction = actionMap[action];
          if (mappedAction && window.ActionBus) {
            window.ActionBus.execute(mappedAction);
          } else {
            console.warn("Unknown menu action:", action);
          }
        },
        // ==================== New Formatting Methods ====================
        /**
         * Wrap selected text with prefix and suffix
         * @param {string} prefix - Text to insert before selection
         * @param {string} suffix - Text to insert after selection
         */
        wrapSelection(prefix, suffix) {
          if (!this.editor) return;
          const start = this.editor.selectionStart;
          const end = this.editor.selectionEnd;
          const selectedText = this.editor.value.substring(start, end);
          const wrappedText = prefix + selectedText + suffix;
          this.editor.setRangeText(wrappedText, start, end, "select");
          this.editor.dispatchEvent(new Event("input", { bubbles: true }));
          this.focusEditor();
        },
        /**
         * Insert heading at current line
         * @param {number} level - Heading level (1-3)
         */
        insertHeading(level) {
          if (!this.editor) return;
          const start = this.editor.selectionStart;
          const text = this.editor.value;
          const lineStart = text.lastIndexOf("\n", start - 1) + 1;
          let lineEnd = text.indexOf("\n", start);
          if (lineEnd === -1) lineEnd = text.length;
          const currentLine = text.substring(lineStart, lineEnd);
          const prefix = "#".repeat(level) + " ";
          const headingMatch = currentLine.match(/^#+\s/);
          let newLine;
          if (headingMatch) {
            newLine = prefix + currentLine.substring(headingMatch[0].length);
          } else {
            newLine = prefix + currentLine;
          }
          this.editor.setRangeText(newLine, lineStart, lineEnd, "end");
          this.editor.dispatchEvent(new Event("input", { bubbles: true }));
          this.focusEditor();
        },
        /**
         * Insert list at current line or for selected lines
         * @param {string} type - List type ('ordered' or 'unordered')
         */
        insertList(type) {
          if (!this.editor) return;
          const start = this.editor.selectionStart;
          const end = this.editor.selectionEnd;
          const text = this.editor.value;
          const lineStart = text.lastIndexOf("\n", start - 1) + 1;
          let lineEnd = text.indexOf("\n", end);
          if (lineEnd === -1) lineEnd = text.length;
          const selectedLines = text.substring(lineStart, lineEnd).split("\n");
          const prefix = type === "ordered" ? null : "- ";
          const newLines = selectedLines.map((line, index) => {
            const cleanLine = line.replace(/^(?:\d+\.\s|-\s|\*\s)/, "");
            if (type === "ordered") {
              return `${index + 1}. ${cleanLine}`;
            }
            return `${prefix}${cleanLine}`;
          });
          const newText = newLines.join("\n");
          this.editor.setRangeText(newText, lineStart, lineEnd, "end");
          this.editor.dispatchEvent(new Event("input", { bubbles: true }));
          this.focusEditor();
        },
        /**
         * Align text (add HTML alignment tags)
         * @param {string} alignment - Alignment type ('left', 'center', 'right')
         */
        alignText(alignment) {
          if (!this.editor) return;
          const start = this.editor.selectionStart;
          const end = this.editor.selectionEnd;
          const text = this.editor.value;
          const lineStart = text.lastIndexOf("\n", start - 1) + 1;
          let lineEnd = text.indexOf("\n", end);
          if (lineEnd === -1) lineEnd = text.length;
          const selectedText = text.substring(lineStart, lineEnd);
          const alignedText = `<div style="text-align: ${alignment};">
${selectedText}
</div>`;
          this.editor.setRangeText(alignedText, lineStart, lineEnd, "end");
          this.editor.dispatchEvent(new Event("input", { bubbles: true }));
          this.focusEditor();
        },
        /**
         * Insert link at cursor or wrap selection
         */
        insertLink() {
          if (!this.editor) return;
          const start = this.editor.selectionStart;
          const end = this.editor.selectionEnd;
          const selectedText = this.editor.value.substring(start, end);
          const urlLabel = this.resolveTranslation("textEditor.insertLink.enterUrl").text || "Enter URL:";
          this.showInputModal(urlLabel, "https://example.com", "https://").then((url) => {
            var _a, _b;
            if (!url) return;
            const linkText = selectedText || "link text";
            const markdown = `[${linkText}](${url})`;
            (_a = this.editor) == null ? void 0 : _a.setRangeText(markdown, start, end, "end");
            (_b = this.editor) == null ? void 0 : _b.dispatchEvent(new Event("input", { bubbles: true }));
            this.focusEditor();
          });
        },
        /**
         * Update word and character count
         */
        updateWordCount() {
          if (!this.editor || !this.wordCountDisplay) return;
          const text = this.editor.value;
          const chars = text.length;
          const trimmedText = text.trim();
          const words = trimmedText === "" ? 0 : trimmedText.split(/\s+/).length;
          const wc = this.resolveTranslation("textEditor.status.wordCount", { words, chars });
          if (wc.translated) {
            this.wordCountDisplay.textContent = wc.text;
            return;
          }
          this.wordCountDisplay.textContent = `Words: ${words} | Characters: ${chars}`;
        },
        /**
         * Update cursor position display
         */
        updateCursorPosition() {
          if (!this.editor || !this.lineColDisplay) return;
          const text = this.editor.value;
          const pos = this.editor.selectionStart;
          const textBeforeCursor = text.substring(0, pos);
          const lines = textBeforeCursor.split("\n");
          const line = lines.length;
          const lastLine = lines[lines.length - 1] || "";
          const col = lastLine.length + 1;
          const posMsg = this.resolveTranslation("textEditor.status.position", { line, col });
          if (posMsg.translated) {
            this.lineColDisplay.textContent = posMsg.text;
            return;
          }
          this.lineColDisplay.textContent = `Line ${line}, Col ${col}`;
        },
        /**
         * Toggle find and replace panel
         */
        toggleFindReplace() {
          if (!this.findReplacePanel) return;
          if (this.findReplacePanel.style.display === "none") {
            this.findReplacePanel.style.display = "flex";
            if (this.findInput) {
              this.findInput.focus();
            }
          } else {
            this.findReplacePanel.style.display = "none";
            this.focusEditor();
          }
        },
        /**
         * Close find and replace panel
         */
        closeFindReplace() {
          if (!this.findReplacePanel) return;
          this.findReplacePanel.style.display = "none";
          this.focusEditor();
        },
        /**
         * Find next occurrence
         */
        findNext() {
          if (!this.editor || !this.findInput) return;
          const searchText = this.findInput.value;
          if (!searchText) return;
          const text = this.editor.value;
          const start = this.editor.selectionEnd;
          const index = text.indexOf(searchText, start);
          if (index !== -1) {
            this.editor.setSelectionRange(index, index + searchText.length);
            this.editor.focus();
          } else {
            const firstIndex = text.indexOf(searchText);
            if (firstIndex !== -1) {
              this.editor.setSelectionRange(firstIndex, firstIndex + searchText.length);
              this.editor.focus();
            } else {
              const message = this.resolveTranslation("textEditor.findReplace.noMatch").text || "No match found";
              this.showToast(message, "info");
            }
          }
        },
        /**
         * Replace one occurrence
         */
        replaceOne() {
          if (!this.editor || !this.findInput || !this.replaceInput) return;
          const searchText = this.findInput.value;
          const replaceText = this.replaceInput.value;
          if (!searchText) return;
          const start = this.editor.selectionStart;
          const end = this.editor.selectionEnd;
          const selectedText = this.editor.value.substring(start, end);
          if (selectedText === searchText) {
            this.editor.setRangeText(replaceText, start, end, "end");
            this.editor.dispatchEvent(new Event("input", { bubbles: true }));
            this.findNext();
          } else {
            this.findNext();
          }
        },
        /**
         * Replace all occurrences
         */
        replaceAll() {
          if (!this.editor || !this.findInput || !this.replaceInput) return;
          const searchText = this.findInput.value;
          const replaceText = this.replaceInput.value;
          if (!searchText) return;
          const text = this.editor.value;
          const parts = text.split(searchText);
          const count = parts.length - 1;
          if (count > 0) {
            const newText = parts.join(replaceText);
            this.editor.value = newText;
            this.editor.dispatchEvent(new Event("input", { bubbles: true }));
            const message = this.resolveTranslation("textEditor.findReplace.replacedCount", { count }).text || `Replaced ${count} occurrence(s)`;
            this.showToast(message, "success");
          } else {
            const message = this.resolveTranslation("textEditor.findReplace.noMatch").text || "No match found";
            this.showToast(message, "info");
          }
          this.focusEditor();
        },
        /**
         * Show toast notification
         * @param {string} message - Message to display
         * @param {string} type - Toast type: 'info', 'success', 'error'
         * @param {number} duration - Display duration in ms (default: 3000)
         */
        showToast(message, type = "info", duration = 3e3) {
          if (!this.container) return;
          const toast = document.createElement("div");
          toast.className = `text-editor-toast text-editor-toast-${type}`;
          toast.textContent = message;
          if (!this.toastContainer) {
            this.toastContainer = document.createElement("div");
            this.toastContainer.className = "text-editor-toast-container";
            this.container.appendChild(this.toastContainer);
          }
          this.toastContainer.appendChild(toast);
          setTimeout(() => toast.classList.add("show"), 10);
          setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
          }, duration);
        },
        /**
         * Show input modal dialog
         * @param {string} title - Modal title
         * @param {string} placeholder - Input placeholder
         * @param {string} defaultValue - Default input value
         * @returns {Promise<string|null>} Resolves with input value or null if cancelled
         */
        showInputModal(title, defaultValue = "", placeholder = "") {
          return new Promise((resolve) => {
            const modal = document.createElement("div");
            modal.className = "text-editor-modal-overlay";
            modal.innerHTML = `
                    <div class="text-editor-modal">
                        <div class="text-editor-modal-header">
                            <h3>${title}</h3>
                        </div>
                        <div class="text-editor-modal-body">
                            <input type="text" class="text-editor-modal-input" placeholder="${placeholder}" value="${defaultValue}">
                        </div>
                        <div class="text-editor-modal-footer">
                            <button class="text-editor-modal-btn text-editor-modal-btn-cancel">Cancel</button>
                            <button class="text-editor-modal-btn text-editor-modal-btn-confirm">OK</button>
                        </div>
                    </div>
                `;
            document.body.appendChild(modal);
            const input = modal.querySelector(".text-editor-modal-input");
            const cancelBtn = modal.querySelector(".text-editor-modal-btn-cancel");
            const confirmBtn = modal.querySelector(".text-editor-modal-btn-confirm");
            if (!input || !cancelBtn || !confirmBtn) {
              modal.remove();
              resolve(null);
              return;
            }
            setTimeout(() => {
              input == null ? void 0 : input.focus();
              input == null ? void 0 : input.select();
            }, 50);
            const cleanup = () => {
              modal.classList.add("closing");
              setTimeout(() => modal.remove(), 200);
            };
            const handleConfirm = () => {
              const value = input == null ? void 0 : input.value.trim();
              cleanup();
              resolve(value || "" || null);
            };
            const handleCancel = () => {
              cleanup();
              resolve(null);
            };
            confirmBtn.addEventListener("click", handleConfirm);
            cancelBtn.addEventListener("click", handleCancel);
            input.addEventListener("keydown", (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirm();
              } else if (e.key === "Escape") {
                e.preventDefault();
                handleCancel();
              }
            });
            modal.addEventListener("click", (e) => {
              if (e.target === modal) {
                handleCancel();
              }
            });
            setTimeout(() => modal.classList.add("show"), 10);
          });
        },
        /**
         * Destroy text editor
         */
        destroy() {
          if (this.container) {
            this.container.innerHTML = "";
            this.container = null;
          }
          this.editor = null;
          this.statusBar = null;
          this.saveButton = null;
          this.fileInput = null;
          this.wordCountDisplay = null;
          this.lineColDisplay = null;
          this.findReplacePanel = null;
          this.findInput = null;
          this.replaceInput = null;
          this.toastContainer = null;
        }
      };
      window.TextEditorSystem = TextEditorSystem;
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
          const container = document.getElementById("text-editor-container");
          if (container) {
            TextEditorSystem.init(container);
          }
        });
      } else {
        const container = document.getElementById("text-editor-container");
        if (container) {
          TextEditorSystem.init(container);
        }
      }
    }
  });

  // src/ts/settings.ts
  var init_settings = __esm({
    "src/ts/settings.ts"() {
      "use strict";
      console.log("Settings Module loaded");
      (() => {
        "use strict";
        const SettingsSystem = {
          currentSection: "general",
          container: null,
          /**
           * Initialize settings module in container
           */
          init(containerOrId) {
            const container = typeof containerOrId === "string" ? document.getElementById(containerOrId) : containerOrId;
            if (!container) {
              console.error("Settings container not found:", containerOrId);
              return;
            }
            this.container = container;
            this.render();
            this.attachListeners();
            this.syncThemePreference();
            this.syncLanguagePreference();
            this.showSection("general");
          },
          /**
           * Render settings UI
           */
          render() {
            if (!this.container) return;
            this.container.innerHTML = `
                <div class="flex dialog-content settings-panel rounded-b-xl overflow-hidden h-full">
                    <!-- Linke Seitenleiste -->
                    <div class="w-48 bg-gray-100 dark:bg-gray-700 p-4 space-y-1 overflow-auto">
                        <button type="button" class="w-full text-left cursor-pointer px-2 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded no-select"
                            data-action="settings:showSection"
                            data-section="general"
                            data-settings-page="general"
                            data-i18n="settingsPage.nav.general">
                            \u{1F464} Allgemein
                        </button>
                        <button type="button" class="w-full text-left cursor-pointer px-2 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded no-select"
                            data-action="settings:showSection"
                            data-section="display"
                            data-settings-page="display"
                            data-i18n="settingsPage.nav.display">
                            \u{1F5A5}\uFE0F Darstellung
                        </button>
                        <button type="button" class="w-full text-left cursor-pointer px-2 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded no-select"
                            data-action="settings:showSection"
                            data-section="language"
                            data-settings-page="language"
                            data-i18n="settingsPage.nav.language">
                            \u{1F310} Sprache
                        </button>
                    </div>
                    <!-- Rechte Hauptansicht -->
                    <div class="flex-1 p-6 overflow-auto text-gray-800 dark:text-gray-200">
                        <!-- Sektion: Allgemein -->
                        <div id="settings-general" class="">
                            <div class="flex flex-col items-start text-gray-700 dark:text-gray-200 mt-8 w-full space-y-4">
                                <img src="./img/profil.jpg" alt="Bild" class="w-24 h-24 object-contain mb-2">
                                <h2 class="text-xl font-semibold" data-i18n="settingsPage.general.name">Marvin Temmen</h2>
                                <p class="text-sm" data-i18n="settingsPage.general.birth">M\xE4rz 1999</p>
                                <div class="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 w-full grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8">
                                    <div class="text-gray-600 dark:text-gray-300" data-i18n="settingsPage.general.locationLabel">Wohnort</div>
                                    <div class="text-gray-800 dark:text-gray-100" data-i18n="settingsPage.general.locationValue">Deutschland</div>
                                    <div class="text-gray-600 dark:text-gray-300" data-i18n="settingsPage.general.jobLabel">Beruf</div>
                                    <div class="text-gray-800 dark:text-gray-100" data-i18n="settingsPage.general.jobValue">Softwareentwickler</div>
                                </div>
                            </div>
                        </div>
                        <!-- Sektion: Darstellung -->
                        <div id="settings-display" class="hidden">
                            <div class="flex flex-col gap-6 mt-4 w-full">
                                <div>
                                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100"
                                        data-i18n="settingsPage.display.title">Darstellung</h2>
                                    <p class="text-sm text-gray-600 dark:text-gray-300 mt-1"
                                        data-i18n="settingsPage.display.description">
                                        Passe das visuelle Erscheinungsbild der Oberfl\xE4che an.
                                    </p>
                                </div>
                                <fieldset class="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                                    <legend class="text-sm font-medium text-gray-700 dark:text-gray-200 px-1"
                                        data-i18n="settingsPage.display.legend">Darkmode</legend>
                                    <label class="flex items-center gap-3 cursor-pointer select-none">
                                        <input type="radio" name="theme-mode" value="system" class="h-4 w-4 text-blue-600 focus:ring-blue-500">
                                        <div>
                                            <span class="block text-sm font-medium text-gray-800 dark:text-gray-100"
                                                data-i18n="settingsPage.display.options.system.label">System</span>
                                            <span class="block text-xs text-gray-600 dark:text-gray-300"
                                                data-i18n="settingsPage.display.options.system.description">Folgt den aktuellen Systemeinstellungen.</span>
                                        </div>
                                    </label>
                                    <label class="flex items-center gap-3 cursor-pointer select-none">
                                        <input type="radio" name="theme-mode" value="light" class="h-4 w-4 text-blue-600 focus:ring-blue-500">
                                        <div>
                                            <span class="block text-sm font-medium text-gray-800 dark:text-gray-100"
                                                data-i18n="settingsPage.display.options.light.label">Hell</span>
                                            <span class="block text-xs text-gray-600 dark:text-gray-300"
                                                data-i18n="settingsPage.display.options.light.description">Bleibt immer im hellen Erscheinungsbild.</span>
                                        </div>
                                    </label>
                                    <label class="flex items-center gap-3 cursor-pointer select-none">
                                        <input type="radio" name="theme-mode" value="dark" class="h-4 w-4 text-blue-600 focus:ring-blue-500">
                                        <div>
                                            <span class="block text-sm font-medium text-gray-800 dark:text-gray-100"
                                                data-i18n="settingsPage.display.options.dark.label">Dunkel</span>
                                            <span class="block text-xs text-gray-600 dark:text-gray-300"
                                                data-i18n="settingsPage.display.options.dark.description">Bleibt immer im dunklen Erscheinungsbild.</span>
                                        </div>
                                    </label>
                                </fieldset>
                            </div>
                        </div>
                        <!-- Sektion: Sprache -->
                        <div id="settings-language" class="hidden">
                            <div class="flex flex-col gap-6 mt-4 w-full">
                                <div>
                                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100"
                                        data-i18n="settingsPage.language.title">Sprache</h2>
                                    <p class="text-sm text-gray-600 dark:text-gray-300 mt-1"
                                        data-i18n="settingsPage.language.description">
                                        W\xE4hle, in welcher Sprache die Oberfl\xE4che angezeigt wird.
                                    </p>
                                </div>
                                <fieldset class="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                                    <legend class="text-sm font-medium text-gray-700 dark:text-gray-200 px-1"
                                        data-i18n="settingsPage.language.legend">Bevorzugte Sprache</legend>
                                    <label class="flex items-center gap-3 cursor-pointer select-none">
                                        <input type="radio" name="language-preference" value="system"
                                            class="h-4 w-4 text-blue-600 focus:ring-blue-500">
                                        <div>
                                            <span class="block text-sm font-medium text-gray-800 dark:text-gray-100"
                                                data-i18n="settingsPage.language.options.system.label">System</span>
                                            <span class="block text-xs text-gray-600 dark:text-gray-300"
                                                data-i18n="settingsPage.language.options.system.description">Verwendet automatisch die Sprache deines Systems.</span>
                                        </div>
                                    </label>
                                    <label class="flex items-center gap-3 cursor-pointer select-none">
                                        <input type="radio" name="language-preference" value="de"
                                            class="h-4 w-4 text-blue-600 focus:ring-blue-500">
                                        <div>
                                            <span class="block text-sm font-medium text-gray-800 dark:text-gray-100"
                                                data-i18n="settingsPage.language.options.de.label">Deutsch</span>
                                            <span class="block text-xs text-gray-600 dark:text-gray-300"
                                                data-i18n="settingsPage.language.options.de.description">Zeigt Inhalte immer auf Deutsch.</span>
                                        </div>
                                    </label>
                                    <label class="flex items-center gap-3 cursor-pointer select-none">
                                        <input type="radio" name="language-preference" value="en"
                                            class="h-4 w-4 text-blue-600 focus:ring-blue-500">
                                        <div>
                                            <span class="block text-sm font-medium text-gray-800 dark:text-gray-100"
                                                data-i18n="settingsPage.language.options.en.label">Englisch</span>
                                            <span class="block text-xs text-gray-600 dark:text-gray-300"
                                                data-i18n="settingsPage.language.options.en.description">Zeigt Inhalte immer auf Englisch.</span>
                                        </div>
                                    </label>
                                </fieldset>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            const appI18n = window.appI18n;
            if (appI18n == null ? void 0 : appI18n.applyTranslations) {
              appI18n.applyTranslations(this.container);
            }
          },
          /**
           * Attach event listeners
           */
          attachListeners() {
            if (!this.container) return;
            const themeRadios = this.container.querySelectorAll('input[name="theme-mode"]');
            themeRadios.forEach((radio) => {
              radio.addEventListener("change", () => {
                var _a;
                if (!radio.checked) return;
                const theme = radio.value;
                const API = window.API;
                if ((_a = API == null ? void 0 : API.theme) == null ? void 0 : _a.setThemePreference) {
                  API.theme.setThemePreference(theme);
                } else {
                  const ThemeSystem = window.ThemeSystem;
                  if (ThemeSystem == null ? void 0 : ThemeSystem.setThemePreference) {
                    ThemeSystem.setThemePreference(theme);
                  }
                }
              });
            });
            const languageRadios = this.container.querySelectorAll('input[name="language-preference"]');
            languageRadios.forEach((radio) => {
              radio.addEventListener("change", () => {
                var _a;
                if (!radio.checked) return;
                const lang = radio.value;
                const API = window.API;
                if ((_a = API == null ? void 0 : API.i18n) == null ? void 0 : _a.setLanguagePreference) {
                  API.i18n.setLanguagePreference(lang);
                } else {
                  const appI18n = window.appI18n;
                  if (appI18n == null ? void 0 : appI18n.setLanguagePreference) {
                    appI18n.setLanguagePreference(lang);
                  }
                }
              });
            });
          },
          /**
           * Sync theme preference from global state
           */
          syncThemePreference() {
            var _a;
            if (!this.container) return;
            let preference = "system";
            const API = window.API;
            const ThemeSystem = window.ThemeSystem;
            if ((_a = API == null ? void 0 : API.theme) == null ? void 0 : _a.getThemePreference) {
              preference = API.theme.getThemePreference();
            } else if (ThemeSystem == null ? void 0 : ThemeSystem.getThemePreference) {
              preference = ThemeSystem.getThemePreference();
            }
            const themeRadios = this.container.querySelectorAll('input[name="theme-mode"]');
            themeRadios.forEach((radio) => {
              radio.checked = radio.value === preference;
            });
          },
          /**
           * Sync language preference from global state
           */
          syncLanguagePreference() {
            var _a;
            if (!this.container) return;
            let preference = "system";
            const API = window.API;
            const appI18n = window.appI18n;
            if ((_a = API == null ? void 0 : API.i18n) == null ? void 0 : _a.getLanguagePreference) {
              preference = API.i18n.getLanguagePreference();
            } else if (appI18n == null ? void 0 : appI18n.getLanguagePreference) {
              preference = appI18n.getLanguagePreference();
            }
            const languageRadios = this.container.querySelectorAll('input[name="language-preference"]');
            languageRadios.forEach((radio) => {
              radio.checked = radio.value === preference;
            });
          },
          /**
           * Show specific settings section
           */
          showSection(section) {
            if (!this.container) return;
            this.currentSection = section;
            const sections = ["general", "display", "language"];
            sections.forEach((name) => {
              var _a;
              const el = (_a = this.container) == null ? void 0 : _a.querySelector(`#settings-${name}`);
              if (el) {
                el.classList.add("hidden");
              }
            });
            const target = this.container.querySelector(`#settings-${section}`);
            if (target) {
              target.classList.remove("hidden");
            }
            const navItems = this.container.querySelectorAll('[data-action="settings:showSection"]');
            navItems.forEach((item) => {
              const itemSection = item.getAttribute("data-section");
              if (itemSection === section) {
                item.classList.add(
                  "bg-white",
                  "dark:bg-gray-600",
                  "text-gray-900",
                  "dark:text-gray-100",
                  "font-medium"
                );
              } else {
                item.classList.remove(
                  "bg-white",
                  "dark:bg-gray-600",
                  "text-gray-900",
                  "dark:text-gray-100",
                  "font-medium"
                );
              }
            });
          },
          /**
           * Destroy settings module
           */
          destroy() {
            if (this.container) {
              this.container.innerHTML = "";
              this.container = null;
            }
          }
        };
        window.SettingsSystem = SettingsSystem;
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () => {
            const container = document.getElementById("settings-container");
            if (container) {
              SettingsSystem.init(container);
            }
          });
        } else {
          const container = document.getElementById("settings-container");
          if (container) {
            SettingsSystem.init(container);
          }
        }
      })();
    }
  });

  // src/ts/image-viewer-utils.ts
  var require_image_viewer_utils = __commonJS({
    "src/ts/image-viewer-utils.ts"() {
      "use strict";
      (function() {
        "use strict";
        function getEl(id) {
          return document.getElementById(id);
        }
        function applyTranslations(el) {
          const w2 = window;
          if (el && w2.appI18n && typeof w2.appI18n.applyTranslations === "function") {
            w2.appI18n.applyTranslations(el);
          }
        }
        function setPlaceholder(messageKey, params) {
          const placeholder = getEl("image-placeholder");
          if (!placeholder) return;
          if (typeof messageKey !== "string" || messageKey.length === 0) {
            placeholder.removeAttribute("data-i18n");
            placeholder.removeAttribute("data-i18n-params");
            placeholder.textContent = "";
            const domUtils = window.DOMUtils;
            if (domUtils && typeof domUtils.hide === "function") {
              domUtils.hide(placeholder);
            } else {
              placeholder.classList.add("hidden");
            }
            state.placeholder = null;
            return;
          }
          placeholder.setAttribute("data-i18n", messageKey);
          if (params && Object.keys(params).length > 0) {
            placeholder.setAttribute("data-i18n-params", JSON.stringify(params));
          } else {
            placeholder.removeAttribute("data-i18n-params");
          }
          state.placeholder = { key: messageKey, params };
          applyTranslations(placeholder);
          {
            const domUtils = window.DOMUtils;
            if (domUtils && typeof domUtils.show === "function") {
              domUtils.show(placeholder);
            } else {
              placeholder.classList.remove("hidden");
            }
          }
        }
        function updateInfo(opts) {
          const infoEl = getEl("image-info");
          if (!infoEl) return;
          const parts = [];
          if (opts.repo) parts.push(opts.repo);
          if (opts.path) parts.push(opts.path);
          const meta = [];
          if (opts.dimensions) meta.push(opts.dimensions);
          if (typeof opts.size === "number" && opts.size > 0) {
            const kb = (opts.size / 1024).toFixed(1);
            meta.push(`${kb} KB`);
          }
          const info = [parts.join(" / "), meta.join(" \u2022 ")].filter(Boolean).join(" \u2014 ");
          if (info) {
            infoEl.textContent = info;
            const domUtils = window.DOMUtils;
            if (domUtils && typeof domUtils.show === "function") {
              domUtils.show(infoEl);
            } else {
              infoEl.classList.remove("hidden");
            }
          } else {
            infoEl.textContent = "";
            const domUtils = window.DOMUtils;
            if (domUtils && typeof domUtils.hide === "function") {
              domUtils.hide(infoEl);
            } else {
              infoEl.classList.add("hidden");
            }
          }
        }
        const state = { placeholder: null };
        const gw = window;
        if (!gw.__imageViewerUtilsWired) {
          gw.__imageViewerUtilsWired = true;
          window.addEventListener("languagePreferenceChange", () => {
            if (state.placeholder) {
              setPlaceholder(state.placeholder.key, state.placeholder.params);
            }
          });
        }
        const w = window;
        w.ImageViewerUtils = w.ImageViewerUtils || {};
        w.ImageViewerUtils.setPlaceholder = setPlaceholder;
        w.ImageViewerUtils.updateInfo = updateInfo;
        if (typeof w.setImagePlaceholder !== "function") w.setImagePlaceholder = setPlaceholder;
        if (typeof w.updateImageInfo !== "function") w.updateImageInfo = updateInfo;
      })();
    }
  });

  // src/ts/logger.ts
  var LOG_LEVELS, LOG_COLORS, Logger, logger;
  var init_logger = __esm({
    "src/ts/logger.ts"() {
      "use strict";
      LOG_LEVELS = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3,
        TRACE: 4
      };
      LOG_COLORS = {
        ERROR: "#ff0000",
        WARN: "#ff9800",
        INFO: "#2196f3",
        DEBUG: "#9c27b0",
        TRACE: "#607d8b"
      };
      Logger = class {
        constructor() {
          this.level = this.isDevelopment() ? LOG_LEVELS.TRACE : LOG_LEVELS.WARN;
          this.enabledCategories = /* @__PURE__ */ new Set(["*"]);
          this.format = "compact";
        }
        isDevelopment() {
          try {
            return location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.port !== "";
          } catch {
            return false;
          }
        }
        setLevel(level) {
          var _a;
          if (typeof level === "string") {
            this.level = (_a = LOG_LEVELS[level.toUpperCase()]) != null ? _a : LOG_LEVELS.INFO;
          } else {
            this.level = level;
          }
        }
        enableCategory(category) {
          if (category === "*") {
            this.enabledCategories.clear();
            this.enabledCategories.add("*");
          } else {
            this.enabledCategories.add(category);
          }
        }
        disableCategory(category) {
          this.enabledCategories.delete(category);
        }
        isCategoryEnabled(category) {
          return this.enabledCategories.has("*") || this.enabledCategories.has(category);
        }
        _log(level, category, message, ...args) {
          if (LOG_LEVELS[level] > this.level) return;
          if (!this.isCategoryEnabled(category)) return;
          const color = LOG_COLORS[level];
          const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
          if (this.format === "detailed") {
            console.log(
              `%c[${timestamp}] [${level}] [${category}]`,
              `color: ${color}; font-weight: bold`,
              message,
              ...args
            );
          } else {
            console.log(`%c[${category}]`, `color: ${color}`, message, ...args);
          }
        }
        error(category, message, ...args) {
          this._log("ERROR", category, message, ...args);
        }
        warn(category, message, ...args) {
          this._log("WARN", category, message, ...args);
        }
        info(category, message, ...args) {
          this._log("INFO", category, message, ...args);
        }
        debug(category, message, ...args) {
          this._log("DEBUG", category, message, ...args);
        }
        trace(category, message, ...args) {
          this._log("TRACE", category, message, ...args);
        }
        group(category, title) {
          if (!this.isCategoryEnabled(category)) return;
          console.group(title != null ? title : category);
        }
        groupEnd() {
          console.groupEnd();
        }
        time(label) {
          console.time(label);
        }
        timeEnd(label) {
          console.timeEnd(label);
        }
      };
      logger = new Logger();
      if (typeof window !== "undefined") {
        window.Logger = logger;
      }
      if (typeof module !== "undefined" && module.exports) {
        module.exports = logger;
      }
    }
  });

  // src/ts/keyboard-shortcuts.ts
  var require_keyboard_shortcuts = __commonJS({
    "src/ts/keyboard-shortcuts.ts"() {
      "use strict";
      (function() {
        "use strict";
        const state = {
          bindings: [],
          contextResolver: () => "global",
          globalListenerAttached: false
        };
        function isEditable(target) {
          var _a;
          if (!(target instanceof Element)) return false;
          const tag = (_a = target.tagName) == null ? void 0 : _a.toLowerCase();
          if (tag === "input" || tag === "textarea" || tag === "select") return true;
          return target.isContentEditable;
        }
        function nextIndex(current, total) {
          return (current + 1) % total;
        }
        function prevIndex(current, total) {
          return (current - 1 + total) % total;
        }
        function isBinding(x) {
          if (typeof x !== "object" || x === null) return false;
          const obj = x;
          return typeof obj.key === "string" && typeof obj.handler === "function";
        }
        function register(arg1, arg2 = {}) {
          if (isBinding(arg1)) {
            const b = arg1;
            state.bindings.push(b);
            ensureGlobalListener();
            return () => {
              const idx = state.bindings.indexOf(b);
              if (idx >= 0) state.bindings.splice(idx, 1);
            };
          }
          const manager = arg1;
          const scope = arg2.scope || document;
          const handler = (e) => {
            var _a;
            const mod = e.metaKey || e.ctrlKey;
            if (!mod) return;
            if (isEditable(e.target)) return;
            const key = e.key.toLowerCase();
            if (key === "n") {
              e.preventDefault();
              const title = (_a = arg2.newTitleFactory) == null ? void 0 : _a.call(arg2);
              manager.createInstance({ title });
              return;
            }
            const active = manager.getActiveInstance();
            const instances = manager.getAllInstances();
            const total = instances.length;
            if (total === 0) return;
            if (key === "w" && active) {
              e.preventDefault();
              manager.destroyInstance(active.instanceId);
              return;
            }
            if (key === "tab") {
              e.preventDefault();
              const currentIndex = active ? instances.findIndex((i) => i.instanceId === active.instanceId) : -1;
              const idx = e.shiftKey ? prevIndex(currentIndex, total) : nextIndex(currentIndex, total);
              const target = instances[idx];
              if (target) manager.setActiveInstance(target.instanceId);
              return;
            }
            if (/^[1-9]$/.test(key)) {
              e.preventDefault();
              const n = parseInt(key, 10);
              const idx = Math.min(n - 1, total - 1);
              const target = instances[idx];
              if (target) manager.setActiveInstance(target.instanceId);
              return;
            }
          };
          scope.addEventListener("keydown", handler);
          return () => scope.removeEventListener("keydown", handler);
        }
        function ensureGlobalListener() {
          if (state.globalListenerAttached) return;
          const listener = (e) => {
            var _a;
            const mod = e.metaKey || e.ctrlKey;
            if (!mod) return;
            if (isEditable(e.target)) return;
            const key = e.key.toLowerCase();
            const context = ((_a = state.contextResolver) == null ? void 0 : _a.call(state)) || "global";
            const binding = state.bindings.find((b) => {
              if (b.key.toLowerCase() !== key) return false;
              if (!!b.ctrl !== true) return false;
              if (!!b.shift !== !!e.shiftKey && b.shift !== void 0) return false;
              if (b.context && b.context !== context) return false;
              return true;
            });
            if (binding) {
              e.preventDefault();
              try {
                binding.handler();
              } catch {
              }
            }
          };
          document.addEventListener("keydown", listener);
          state.globalListenerAttached = true;
        }
        function setContextResolver(resolver) {
          state.contextResolver = resolver;
          ensureGlobalListener();
        }
        const KeyboardShortcuts = { register, setContextResolver };
        window.KeyboardShortcuts = KeyboardShortcuts;
      })();
    }
  });

  // src/ts/github-api.ts
  var require_github_api = __commonJS({
    "src/ts/github-api.ts"() {
      "use strict";
      (function() {
        "use strict";
        const GITHUB_CACHE_NS = "finderGithubCacheV1:";
        function getCacheTtl() {
          const dflt = 5 * 60 * 1e3;
          try {
            const constants = window.APP_CONSTANTS || {};
            const val = constants["GITHUB_CACHE_DURATION"];
            return typeof val === "number" ? val : dflt;
          } catch {
            return dflt;
          }
        }
        function makeCacheKey(kind, repo = "", subPath = "") {
          if (kind === "repos") return GITHUB_CACHE_NS + "repos";
          return `${GITHUB_CACHE_NS}contents:${repo}:${subPath}`;
        }
        function writeCache(kind, repo, subPath, data) {
          const key = makeCacheKey(kind, repo, subPath);
          try {
            const payload = { t: Date.now(), d: data };
            localStorage.setItem(key, JSON.stringify(payload));
          } catch {
          }
        }
        function readCache(kind, repo = "", subPath = "") {
          var _a;
          const key = makeCacheKey(kind, repo, subPath);
          try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return null;
            const ttl = getCacheTtl();
            if (typeof parsed.t !== "number" || Date.now() - parsed.t > ttl) return null;
            return (_a = parsed.d) != null ? _a : null;
          } catch {
            return null;
          }
        }
        function getHeaders() {
          const headers = { Accept: "application/vnd.github.v3+json" };
          try {
            const token = localStorage.getItem("githubToken");
            if (token && token.trim()) {
              headers["Authorization"] = `token ${token.trim()}`;
            }
          } catch {
          }
          return headers;
        }
        async function fetchJSON(url) {
          const res = await fetch(url, { headers: getHeaders() });
          if (!res.ok) {
            throw Object.assign(new Error(`GitHub API error: ${res.status}`), {
              status: res.status
            });
          }
          return res.json();
        }
        async function fetchUserRepos(username, params) {
          var _a, _b;
          const search = new globalThis.URLSearchParams();
          search.set("per_page", String((_a = params == null ? void 0 : params.per_page) != null ? _a : 100));
          search.set("sort", (_b = params == null ? void 0 : params.sort) != null ? _b : "updated");
          const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?${search.toString()}`;
          return fetchJSON(url);
        }
        async function fetchRepoContents(username, repo, subPath = "") {
          const pathPart = subPath ? `/${encodeURIComponent(subPath).replace(/%2F/g, "/")}` : "";
          const url = `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/contents${pathPart}`;
          return fetchJSON(url);
        }
        window.GitHubAPI = {
          getHeaders,
          readCache,
          writeCache,
          fetchJSON,
          fetchUserRepos,
          fetchRepoContents
        };
      })();
    }
  });

  // src/ts/photos-app.ts
  var require_photos_app = __commonJS({
    "src/ts/photos-app.ts"() {
      "use strict";
      var globalWindow = window;
      function t(key, fallback, params) {
        var _a;
        const translate2 = (_a = globalWindow.appI18n) == null ? void 0 : _a.translate;
        if (typeof translate2 === "function") {
          return translate2(key, params, { fallback });
        }
        return fallback;
      }
      (function photosAppFactory() {
        const state = {
          initialized: false,
          photos: [],
          filteredPhotos: [],
          filteredIndexMap: /* @__PURE__ */ new Map(),
          favorites: /* @__PURE__ */ new Set(),
          activeFilter: "all",
          activeSegment: "moments",
          searchTerm: "",
          isLoading: false,
          currentPage: 1,
          overlayVisible: false,
          selectedIndex: -1,
          activePhotoId: null,
          externalPhoto: null,
          pendingImageId: null,
          orientationCounts: { landscape: 0, portrait: 0, square: 0 }
        };
        const elements = {
          container: null,
          sidebar: null,
          gallery: null,
          loading: null,
          error: null,
          errorRetry: null,
          empty: null,
          placeholder: null,
          photoCount: null,
          refreshButton: null,
          searchInput: null,
          searchClear: null,
          sidebarButtons: [],
          segmentButtons: [],
          overlay: null,
          detailTitle: null,
          detailMeta: null,
          detailDimensions: null,
          detailCounter: null,
          detailOpen: null,
          detailDownload: null,
          detailFavorite: null,
          detailFavoriteLabel: null,
          detailFavoriteIcon: null,
          detailClose: null,
          detailPrev: null,
          detailNext: null,
          image: null,
          imageInfo: null,
          loader: null,
          countAll: null,
          countFavorites: null,
          countLandscape: null,
          countPortrait: null,
          countSquare: null,
          titlebar: null,
          statusbar: null
        };
        function isExternalPhoto(photo) {
          return photo.isExternal === true;
        }
        function renderWindow() {
          const WindowChrome = globalWindow.WindowChrome;
          if (!WindowChrome) {
            console.error("WindowChrome not available");
            return null;
          }
          const { frame, titlebar, content, statusbar } = WindowChrome.createWindowFrame({
            title: t("photos.title", "Fotos"),
            icon: "./img/fotos.png",
            showClose: true,
            showMinimize: false,
            showMaximize: false,
            onClose: () => {
              var _a, _b, _c;
              (_c = (_b = (_a = globalWindow.API) == null ? void 0 : _a.window) == null ? void 0 : _b.close) == null ? void 0 : _c.call(_b, "photos-window");
            },
            toolbar: [
              {
                label: "",
                icon: `<div class="relative flex-1 sm:flex-initial min-w-[200px]">
                        <input id="photos-search" type="search" placeholder="${t("photos.search.placeholder", "Nach Autor suchen")}" 
                            class="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        <button id="photos-search-clear" type="button" class="absolute inset-y-0 right-2 flex items-center text-xl text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 invisible pointer-events-none" 
                            title="${t("photos.search.clear", "Suche l\xF6schen")}">\xD7</button>
                    </div>`
              },
              { type: "separator" },
              {
                label: "",
                icon: `<div class="flex bg-gray-200 dark:bg-gray-800 rounded-full p-1 text-sm font-medium text-gray-600 dark:text-gray-300 shadow-inner" role="group">
                        <button type="button" data-photos-segment="moments" class="photos-segment-button">${t("photos.segments.moments", "Momente")}</button>
                        <button type="button" data-photos-segment="collections" class="photos-segment-button">${t("photos.segments.collections", "Sammlungen")}</button>
                        <button type="button" data-photos-segment="years" class="photos-segment-button">${t("photos.segments.years", "Jahre")}</button>
                    </div>`
              }
            ],
            showStatusBar: true,
            statusBarLeft: t("photos.status.countPlaceholder", "\u2013 Fotos"),
            statusBarRight: ""
          });
          elements.titlebar = titlebar;
          elements.statusbar = statusbar;
          const sidebar = document.createElement("aside");
          sidebar.className = "hidden md:flex flex-col w-56 border-r border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/60";
          sidebar.innerHTML = `
            <div class="px-5 pt-6 pb-4">
                <p class="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">${t("photos.sidebar.library", "Bibliothek")}</p>
                <nav class="mt-4 space-y-1" id="photos-sidebar">
                    <button type="button" data-photos-filter="all" class="photos-sidebar-button">
                        <span>${t("photos.sidebar.items.all", "Alle Fotos")}</span>
                        <span id="photos-count-all" class="photos-sidebar-count">\u2013</span>
                    </button>
                    <button type="button" data-photos-filter="favorites" class="photos-sidebar-button">
                        <span>${t("photos.sidebar.items.favorites", "Favoriten")}</span>
                        <span id="photos-count-favorites" class="photos-sidebar-count">0</span>
                    </button>
                </nav>
                <p class="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mt-6">${t("photos.sidebar.filters", "Filter")}</p>
                <nav class="mt-4 space-y-1">
                    <button type="button" data-photos-filter="landscape" class="photos-sidebar-button">
                        <span>${t("photos.sidebar.items.landscape", "Querformat")}</span>
                        <span id="photos-count-landscape" class="photos-sidebar-count">\u2013</span>
                    </button>
                    <button type="button" data-photos-filter="portrait" class="photos-sidebar-button">
                        <span>${t("photos.sidebar.items.portrait", "Hochformat")}</span>
                        <span id="photos-count-portrait" class="photos-sidebar-count">\u2013</span>
                    </button>
                    <button type="button" data-photos-filter="square" class="photos-sidebar-button">
                        <span>${t("photos.sidebar.items.square", "Quadratisch")}</span>
                        <span id="photos-count-square" class="photos-sidebar-count">\u2013</span>
                    </button>
                </nav>
            </div>
            <div class="px-5 pb-6 mt-auto">
                <button id="photos-refresh" type="button" class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 transition hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-300">
                    <span aria-hidden="true">\u21BB</span>
                    <span>${t("photos.sidebar.refresh", "Neu laden")}</span>
                </button>
                <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">${t("photos.sidebar.sourceNote", "Quelle: Lorem Picsum \u2013 zuf\xE4llige kuratierte Fotokollektionen.")}</p>
            </div>
        `;
          const mainArea = document.createElement("div");
          mainArea.className = "flex-1 flex flex-col min-h-0 relative";
          mainArea.innerHTML = `
            <div class="flex-1 relative min-h-0">
                <div id="photos-loading" class="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-20 hidden">
                    <div class="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-300">
                        <span class="h-10 w-10 border-4 border-gray-300 dark:border-gray-700 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin"></span>
                        <span class="text-sm font-medium">${t("photos.status.loading", "Lade Fotos\u2026")}</span>
                    </div>
                </div>
                <div id="photos-error" class="absolute inset-x-0 top-6 mx-auto max-w-lg bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-200 rounded-2xl shadow px-5 py-4 hidden">
                    <p class="font-semibold mb-1">${t("photos.errors.heading", "Fehler beim Laden")}</p>
                    <p class="text-sm">${t("photos.errors.description", "Bitte \xFCberpr\xFCfe deine Verbindung und versuche es erneut.")}</p>
                    <button id="photos-error-retry" type="button" class="mt-3 inline-flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-100 underline decoration-dotted">${t("photos.buttons.retry", "Erneut versuchen")}</button>
                </div>
                <div id="photos-gallery" class="absolute inset-0 overflow-y-auto px-5 sm:px-6 py-6 space-y-8"></div>
                <div id="photos-empty" class="absolute inset-0 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 hidden px-6">
                    <div>
                        <p class="text-lg font-semibold">${t("photos.empty.title", "Keine Fotos gefunden")}</p>
                        <p class="text-sm mt-1">${t("photos.empty.description", "Passe Suche oder Filter an, um weitere Ergebnisse zu sehen.")}</p>
                    </div>
                </div>
                <div id="image-placeholder" class="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400 text-center px-6 hidden pointer-events-none">${t("photos.placeholder", "W\xE4hle ein Foto aus, um Details zu sehen.")}</div>
            </div>
        `;
          const detailOverlay = document.createElement("div");
          detailOverlay.id = "photo-detail-overlay";
          detailOverlay.className = "absolute inset-0 hidden items-center justify-center px-4 py-10 bg-black/50 backdrop-blur-sm z-30";
          detailOverlay.innerHTML = `
            <div class="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full h-full flex flex-col">
                <div class="flex items-center gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <div class="flex-1 min-w-0">
                        <p id="photo-detail-title" class="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">${t("photos.detail.titleFallback", "Foto")}</p>
                        <p id="photo-detail-meta" class="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate"></p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="photo-detail-favorite" type="button" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium transition hover:bg-gray-200 dark:hover:bg-gray-700">
                            <span aria-hidden="true">\u2661</span>
                            <span>${t("photos.detail.favoriteAdd", "Zu Favoriten")}</span>
                        </button>
                        <a id="photo-detail-download" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm font-medium transition hover:bg-blue-500" href="#" target="_blank" rel="noreferrer">${t("photos.detail.download", "Herunterladen")}</a>
                        <button id="photo-detail-close" type="button" class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-lg leading-none transition hover:bg-gray-200 dark:hover:bg-gray-700" title="${t("common.close", "Schlie\xDFen")}">\xD7</button>
                    </div>
                </div>
                <div class="flex-1 flex overflow-hidden">
                    <button id="photo-detail-prev" type="button" class="hidden sm:flex items-center justify-center w-14 bg-transparent text-3xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition" title="${t("photos.detail.prev", "Vorheriges Foto")}">\u2039</button>
                    <div class="flex-1 relative bg-gray-50 dark:bg-gray-950 flex items-center justify-center overflow-hidden">
                        <img id="image-viewer" class="max-w-full max-h-full object-contain" alt="${t("photos.detail.imageAlt", "Ausgew\xE4hltes Foto")}" />
                        <div id="photo-detail-loader" class="absolute inset-0 flex items-center justify-center bg-gray-900/40 text-white text-sm font-medium hidden">${t("photos.detail.loader", "Foto wird geladen\u2026")}</div>
                    </div>
                    <button id="photo-detail-next" type="button" class="hidden sm:flex items-center justify-center w-14 bg-transparent text-3xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition" title="${t("photos.detail.next", "N\xE4chstes Foto")}">\u203A</button>
                </div>
                <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div class="flex-1 min-w-[200px]">
                        <p id="image-info" class="font-medium text-gray-700 dark:text-gray-200"></p>
                        <p id="photo-detail-dimensions" class="text-xs text-gray-500 dark:text-gray-400 mt-1"></p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span id="photo-detail-counter" class="text-xs font-medium"></span>
                        <a id="photo-detail-open" href="#" target="_blank" rel="noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">${t("photos.detail.openInBrowser", "Im Browser \xF6ffnen")}</a>
                    </div>
                </div>
            </div>
        `;
          const container = document.createElement("div");
          container.className = "flex h-full";
          container.appendChild(sidebar);
          container.appendChild(mainArea);
          content.appendChild(container);
          content.appendChild(detailOverlay);
          return frame;
        }
        function init() {
          var _a, _b, _c;
          if (state.initialized) {
            return;
          }
          state.initialized = true;
          const photosWindow = document.getElementById("photos-window");
          if (!photosWindow) {
            const frame = renderWindow();
            if (!frame) {
              console.error("Failed to render photos window");
              return;
            }
            let container = document.getElementById("photos-window");
            if (!container) {
              container = document.createElement("div");
              container.id = "photos-window";
              container.className = "fixed inset-0 flex items-center justify-center hidden modal relative";
              container.style.zIndex = "1000";
              document.body.appendChild(container);
            }
            const wrapper = document.createElement("div");
            wrapper.className = "w-[min(90vw,1100px)] h-[min(85vh,780px)]";
            wrapper.appendChild(frame);
            container.appendChild(wrapper);
            elements.container = container;
          } else {
            elements.container = photosWindow;
          }
          cacheElements();
          if (!elements.gallery) {
            return;
          }
          wireSidebar();
          wireSegments();
          wireSearch();
          wireGallery();
          wireDetail();
          (_c = (_a = globalWindow.appI18n) == null ? void 0 : _a.applyTranslations) == null ? void 0 : _c.call(_a, (_b = elements.container) != null ? _b : void 0);
          void fetchPhotos();
        }
        function cacheElements() {
          var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
          if (!elements.container) {
            return;
          }
          elements.sidebar = (_a = elements.container.querySelector("#photos-sidebar")) != null ? _a : null;
          elements.gallery = (_b = elements.container.querySelector("#photos-gallery")) != null ? _b : null;
          elements.loading = (_c = elements.container.querySelector("#photos-loading")) != null ? _c : null;
          elements.error = (_d = elements.container.querySelector("#photos-error")) != null ? _d : null;
          elements.errorRetry = elements.container.querySelector("#photos-error-retry");
          elements.empty = (_e = elements.container.querySelector("#photos-empty")) != null ? _e : null;
          elements.placeholder = (_f = elements.container.querySelector("#image-placeholder")) != null ? _f : null;
          elements.photoCount = (_h = (_g = elements.statusbar) == null ? void 0 : _g.querySelector(".statusbar-left")) != null ? _h : null;
          elements.refreshButton = elements.container.querySelector("#photos-refresh");
          elements.searchInput = elements.container.querySelector("#photos-search");
          elements.searchClear = elements.container.querySelector("#photos-search-clear");
          elements.overlay = (_i = elements.container.querySelector("#photo-detail-overlay")) != null ? _i : null;
          elements.detailTitle = (_j = elements.container.querySelector("#photo-detail-title")) != null ? _j : null;
          elements.detailMeta = (_k = elements.container.querySelector("#photo-detail-meta")) != null ? _k : null;
          elements.detailDimensions = (_l = elements.container.querySelector("#photo-detail-dimensions")) != null ? _l : null;
          elements.detailCounter = (_m = elements.container.querySelector("#photo-detail-counter")) != null ? _m : null;
          elements.detailOpen = elements.container.querySelector("#photo-detail-open");
          elements.detailDownload = elements.container.querySelector("#photo-detail-download");
          elements.detailFavorite = elements.container.querySelector("#photo-detail-favorite");
          elements.detailFavoriteLabel = (_o = (_n = elements.detailFavorite) == null ? void 0 : _n.querySelector("span:last-child")) != null ? _o : null;
          elements.detailFavoriteIcon = (_q = (_p = elements.detailFavorite) == null ? void 0 : _p.querySelector('span[aria-hidden="true"]')) != null ? _q : null;
          elements.detailClose = elements.container.querySelector("#photo-detail-close");
          elements.detailPrev = elements.container.querySelector("#photo-detail-prev");
          elements.detailNext = elements.container.querySelector("#photo-detail-next");
          elements.image = elements.container.querySelector("#image-viewer");
          elements.imageInfo = (_r = elements.container.querySelector("#image-info")) != null ? _r : null;
          elements.loader = (_s = elements.container.querySelector("#photo-detail-loader")) != null ? _s : null;
          elements.countAll = (_t = elements.container.querySelector("#photos-count-all")) != null ? _t : null;
          elements.countFavorites = (_u = elements.container.querySelector("#photos-count-favorites")) != null ? _u : null;
          elements.countLandscape = (_v = elements.container.querySelector("#photos-count-landscape")) != null ? _v : null;
          elements.countPortrait = (_w = elements.container.querySelector("#photos-count-portrait")) != null ? _w : null;
          elements.countSquare = (_x = elements.container.querySelector("#photos-count-square")) != null ? _x : null;
          const sidebarButtons = (_z = (_y = elements.sidebar) == null ? void 0 : _y.querySelectorAll("button[data-photos-filter]")) != null ? _z : [];
          elements.sidebarButtons = Array.from(sidebarButtons);
          const segmentButtons = elements.container.querySelectorAll("button[data-photos-segment]");
          elements.segmentButtons = Array.from(segmentButtons);
        }
        function wireSidebar() {
          var _a;
          elements.sidebarButtons.forEach((button) => {
            button.addEventListener("click", () => {
              const filter = button.getAttribute("data-photos-filter");
              if (!filter || state.activeFilter === filter) {
                return;
              }
              state.activeFilter = filter;
              syncSidebarSelection();
              applyFilters();
            });
          });
          syncSidebarSelection();
          (_a = elements.refreshButton) == null ? void 0 : _a.addEventListener("click", () => {
            void fetchPhotos({ refresh: true });
          });
        }
        function wireSegments() {
          elements.segmentButtons.forEach((button) => {
            button.addEventListener("click", () => {
              const segment = button.getAttribute("data-photos-segment");
              if (!segment || state.activeSegment === segment) {
                return;
              }
              state.activeSegment = segment;
              syncSegmentSelection();
              renderGallery();
            });
          });
          syncSegmentSelection();
        }
        function wireSearch() {
          var _a, _b;
          (_a = elements.searchInput) == null ? void 0 : _a.addEventListener("input", (event) => {
            const target = event.currentTarget;
            state.searchTerm = target.value;
            toggleSearchClear();
            applyFilters();
          });
          (_b = elements.searchClear) == null ? void 0 : _b.addEventListener("click", () => {
            if (!elements.searchInput) {
              return;
            }
            elements.searchInput.value = "";
            state.searchTerm = "";
            toggleSearchClear();
            applyFilters();
          });
          toggleSearchClear();
        }
        function wireGallery() {
          var _a;
          (_a = elements.gallery) == null ? void 0 : _a.addEventListener("click", (event) => {
            const target = event.target;
            if (!target) {
              return;
            }
            const card = target.closest("[data-photo-index]");
            if (!card) {
              return;
            }
            const rawIndex = card.getAttribute("data-photo-index");
            const index = rawIndex ? Number(rawIndex) : NaN;
            if (Number.isNaN(index) || index < 0) {
              return;
            }
            openDetail(index);
          });
        }
        function wireDetail() {
          var _a, _b, _c, _d, _e, _f;
          (_a = elements.detailClose) == null ? void 0 : _a.addEventListener("click", closeDetail);
          (_b = elements.overlay) == null ? void 0 : _b.addEventListener("click", (event) => {
            if (event.target === elements.overlay) {
              closeDetail();
            }
          });
          (_c = elements.detailPrev) == null ? void 0 : _c.addEventListener("click", () => moveSelection(-1));
          (_d = elements.detailNext) == null ? void 0 : _d.addEventListener("click", () => moveSelection(1));
          (_e = elements.detailFavorite) == null ? void 0 : _e.addEventListener("click", toggleFavorite);
          document.addEventListener("keydown", handleKeyNavigation);
          (_f = elements.errorRetry) == null ? void 0 : _f.addEventListener("click", () => {
            void fetchPhotos({ refresh: true });
          });
          if (elements.image) {
            elements.image.addEventListener("load", handleImageLoaded);
            elements.image.addEventListener("error", handleImageError);
          }
        }
        function handleImageLoaded() {
          setDetailLoading(false);
          if (!elements.image) {
            return;
          }
          if (state.pendingImageId) {
            const width = elements.image.naturalWidth;
            const height = elements.image.naturalHeight;
            const orientation = width === height ? "square" : width > height ? "landscape" : "portrait";
            if (state.externalPhoto && state.externalPhoto.id === state.pendingImageId) {
              state.externalPhoto.width = width;
              state.externalPhoto.height = height;
              state.externalPhoto.orientation = orientation;
            }
            if (state.overlayVisible) {
              const current = getCurrentDetailPhoto();
              if (current) {
                updateDetailMetadata(current);
              }
            }
          }
          state.pendingImageId = null;
        }
        function handleImageError() {
          setDetailLoading(false);
          if (elements.detailMeta) {
            elements.detailMeta.textContent = t(
              "photos.errors.detailImage",
              "The photo could not be loaded."
            );
          }
        }
        async function fetchPhotos(options = {}) {
          if (state.isLoading) {
            return;
          }
          setError(false);
          setLoading(true);
          try {
            const shouldRandomize = options.refresh || state.photos.length === 0;
            const page = shouldRandomize ? getRandomPage() : state.currentPage;
            const limit = 60;
            const response = await fetch(`https://picsum.photos/v2/list?page=${page}&limit=${limit}`);
            if (!response.ok) {
              throw new Error("Picsum request failed");
            }
            const data = await response.json();
            const mapped = data.map(mapPhotoItem);
            state.photos = mapped;
            state.currentPage = page;
            state.favorites.clear();
            state.externalPhoto = null;
            state.orientationCounts = calculateOrientationCounts(mapped);
            applyFilters();
            updateSidebarCounts();
          } catch (error) {
            console.warn("Photos app: failed to load", error);
            setError(true);
          } finally {
            setLoading(false);
          }
        }
        function mapPhotoItem(item, index) {
          const width = Number(item.width) || 0;
          const height = Number(item.height) || 0;
          const orientation = width === height ? "square" : width > height ? "landscape" : "portrait";
          const numericId = Number.parseInt(item.id, 10);
          const yearBase = Number.isFinite(numericId) ? numericId : index;
          const year = 2014 + (yearBase % 10 + 1);
          const sanitizedAuthor = item.author && item.author.trim().length > 0 ? item.author.trim() : t("photos.detail.unknownPhotographer", "Unknown photographer");
          const id = String(item.id);
          return {
            id,
            author: sanitizedAuthor,
            width,
            height,
            orientation,
            year,
            url: item.url,
            downloadUrl: item.download_url,
            thumbUrl: `https://picsum.photos/id/${id}/600/400`,
            largeUrl: `https://picsum.photos/id/${id}/1600/1200`
          };
        }
        function calculateOrientationCounts(photos) {
          return photos.reduce(
            (acc, photo) => {
              acc[photo.orientation] += 1;
              return acc;
            },
            { landscape: 0, portrait: 0, square: 0 }
          );
        }
        function applyFilters() {
          const search = state.searchTerm.trim().toLowerCase();
          const previousActiveId = state.overlayVisible ? state.activePhotoId : null;
          const filtered = state.photos.filter((photo) => {
            if (state.activeFilter === "favorites" && !state.favorites.has(photo.id)) {
              return false;
            }
            if (state.activeFilter === "landscape" && photo.orientation !== "landscape") {
              return false;
            }
            if (state.activeFilter === "portrait" && photo.orientation !== "portrait") {
              return false;
            }
            if (state.activeFilter === "square" && photo.orientation !== "square") {
              return false;
            }
            if (search && !photo.author.toLowerCase().includes(search)) {
              return false;
            }
            return true;
          });
          state.filteredPhotos = filtered;
          state.filteredIndexMap = new Map(filtered.map((photo, index) => [photo.id, index]));
          renderGallery();
          updateEmptyState();
          updatePhotoCount();
          updateSidebarCounts();
          if (previousActiveId) {
            const newIndex = state.filteredIndexMap.get(previousActiveId);
            if (typeof newIndex === "number") {
              state.selectedIndex = newIndex;
              updateNavigationButtons();
              updateCounter();
              setActiveCard(previousActiveId);
            } else if (!state.externalPhoto) {
              closeDetail();
            }
          }
        }
        function renderGallery() {
          if (!elements.gallery) {
            return;
          }
          elements.gallery.innerHTML = "";
          if (!state.filteredPhotos.length) {
            return;
          }
          const groups = buildGroups(state.filteredPhotos, state.activeSegment);
          groups.forEach((group) => {
            var _a;
            const section = document.createElement("section");
            section.className = "space-y-3";
            const heading = document.createElement("div");
            heading.className = "flex items-baseline justify-between px-2";
            const title = document.createElement("h3");
            title.className = "text-base font-semibold text-gray-800 dark:text-gray-100 tracking-wide";
            title.textContent = group.title;
            const count = document.createElement("span");
            count.className = "text-xs text-gray-500 dark:text-gray-400";
            const countKey = group.photos.length === 1 ? "photos.labels.photoSingular" : "photos.labels.photoPlural";
            const countLabel = t(countKey, group.photos.length === 1 ? "Photo" : "Photos");
            count.textContent = `${group.photos.length} ${countLabel}`;
            heading.append(title, count);
            section.append(heading);
            const grid = document.createElement("div");
            grid.className = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 auto-rows-[minmax(140px,_auto)]";
            group.photos.forEach((photo) => {
              var _a2;
              const index = (_a2 = state.filteredIndexMap.get(photo.id)) != null ? _a2 : -1;
              const card = document.createElement("button");
              card.type = "button";
              card.className = "photos-card relative group overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-800 shadow-md hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";
              card.dataset.photoId = photo.id;
              card.dataset.photoIndex = String(index);
              if (state.favorites.has(photo.id)) {
                card.dataset.favorite = "true";
              }
              if (state.activePhotoId === photo.id && state.overlayVisible) {
                card.dataset.selected = "true";
              }
              const image = document.createElement("img");
              image.src = photo.thumbUrl;
              image.alt = t("photos.gallery.alt", "Photo by {author}", { author: photo.author });
              image.loading = "lazy";
              image.className = "w-full h-full object-cover transition duration-300 group-hover:scale-105";
              const overlay = document.createElement("div");
              overlay.className = "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-3 py-2 text-left";
              const author = document.createElement("p");
              author.className = "text-white text-sm font-medium truncate";
              author.textContent = photo.author;
              const meta = document.createElement("p");
              meta.className = "text-white/80 text-[11px] uppercase tracking-[0.3em]";
              meta.textContent = `${photo.year} \u0393\xC7\xF3 ${formatOrientation(photo.orientation)}`;
              overlay.append(author, meta);
              card.append(image, overlay);
              grid.append(card);
            });
            section.append(grid);
            (_a = elements.gallery) == null ? void 0 : _a.append(section);
          });
        }
        function buildGroups(photos, segment) {
          if (segment === "collections") {
            const orientations = [
              { title: t("photos.collections.landscape", "Landscapes"), key: "landscape" },
              { title: t("photos.collections.portrait", "Portraits"), key: "portrait" },
              { title: t("photos.collections.square", "Squares"), key: "square" }
            ];
            return orientations.map((item) => ({ title: item.title, photos: photos.filter((photo) => photo.orientation === item.key) })).filter((group) => group.photos.length > 0);
          }
          if (segment === "years") {
            const byYear = /* @__PURE__ */ new Map();
            photos.forEach((photo) => {
              var _a;
              const collection = (_a = byYear.get(photo.year)) != null ? _a : [];
              collection.push(photo);
              byYear.set(photo.year, collection);
            });
            return Array.from(byYear.entries()).sort((a, b) => b[0] - a[0]).map(([year, group]) => ({ title: String(year), photos: group }));
          }
          const byAuthor = /* @__PURE__ */ new Map();
          photos.forEach((photo) => {
            var _a;
            const key = photo.author;
            const collection = (_a = byAuthor.get(key)) != null ? _a : [];
            collection.push(photo);
            byAuthor.set(key, collection);
          });
          return Array.from(byAuthor.entries()).sort((a, b) => {
            const latestA = Math.max(...a[1].map((item) => item.year));
            const latestB = Math.max(...b[1].map((item) => item.year));
            return latestB - latestA;
          }).map(([author, group]) => ({ title: author, photos: group }));
        }
        function formatOrientation(orientation) {
          if (orientation === "portrait") {
            return t("photos.orientations.portrait", "Portrait");
          }
          if (orientation === "square") {
            return t("photos.orientations.square", "Square");
          }
          return t("photos.orientations.landscape", "Landscape");
        }
        function setActiveCard(photoId) {
          if (!elements.gallery) {
            return;
          }
          const current = elements.gallery.querySelector('.photos-card[data-selected="true"]');
          if (current) {
            current.removeAttribute("data-selected");
          }
          const next = elements.gallery.querySelector(`.photos-card[data-photo-id="${photoId}"]`);
          if (next) {
            next.dataset.selected = "true";
          }
        }
        function clearActiveCard() {
          if (!elements.gallery) {
            return;
          }
          const current = elements.gallery.querySelector('.photos-card[data-selected="true"]');
          current == null ? void 0 : current.removeAttribute("data-selected");
        }
        function updateEmptyState() {
          var _a;
          const shouldShow = state.filteredPhotos.length === 0;
          (_a = elements.empty) == null ? void 0 : _a.classList.toggle("hidden", !shouldShow);
        }
        function updatePhotoCount() {
          const total = state.filteredPhotos.length;
          const labelKey = total === 1 ? "photos.labels.photoSingular" : "photos.labels.photoPlural";
          const label = t(labelKey, total === 1 ? "Photo" : "Photos");
          const segmentKey = state.activeSegment === "collections" ? "photos.segments.collections" : state.activeSegment === "years" ? "photos.segments.years" : "photos.segments.moments";
          const segmentFallback = state.activeSegment === "collections" ? "Collections" : state.activeSegment === "years" ? "Years" : "Moments";
          const segmentLabel = t(segmentKey, segmentFallback);
          const statusText = t(
            "photos.status.count",
            `${total} ${label} \u0393\xC7\xF3 ${segmentLabel}`,
            { count: total, label, segment: segmentLabel }
          );
          if (elements.statusbar && globalWindow.WindowChrome) {
            globalWindow.WindowChrome.updateStatusBar(elements.statusbar, "left", statusText);
          }
          if (elements.photoCount) {
            elements.photoCount.textContent = statusText;
          }
        }
        function updateSidebarCounts() {
          if (elements.countAll) {
            elements.countAll.textContent = String(state.photos.length);
          }
          if (elements.countFavorites) {
            elements.countFavorites.textContent = String(state.favorites.size);
          }
          if (elements.countLandscape) {
            elements.countLandscape.textContent = String(state.orientationCounts.landscape);
          }
          if (elements.countPortrait) {
            elements.countPortrait.textContent = String(state.orientationCounts.portrait);
          }
          if (elements.countSquare) {
            elements.countSquare.textContent = String(state.orientationCounts.square);
          }
        }
        function syncSidebarSelection() {
          elements.sidebarButtons.forEach((button) => {
            const filter = button.getAttribute("data-photos-filter");
            button.dataset.active = filter === state.activeFilter ? "true" : "false";
          });
        }
        function syncSegmentSelection() {
          elements.segmentButtons.forEach((button) => {
            const segment = button.getAttribute("data-photos-segment");
            button.dataset.active = segment === state.activeSegment ? "true" : "false";
          });
        }
        function toggleSearchClear() {
          if (!elements.searchClear) {
            return;
          }
          const hasValue = Boolean(state.searchTerm.trim());
          elements.searchClear.classList.toggle("invisible", !hasValue);
          elements.searchClear.classList.toggle("pointer-events-none", !hasValue);
        }
        function setLoading(isLoading) {
          var _a;
          state.isLoading = isLoading;
          (_a = elements.loading) == null ? void 0 : _a.classList.toggle("hidden", !isLoading);
        }
        function setError(hasError) {
          var _a;
          (_a = elements.error) == null ? void 0 : _a.classList.toggle("hidden", !hasError);
        }
        function openDetail(index, options = {}) {
          const overlay = elements.overlay;
          if (!overlay || !elements.image) {
            return;
          }
          let photo = null;
          if (options.external && options.photo) {
            photo = options.photo;
            state.externalPhoto = options.photo;
            state.selectedIndex = -1;
            state.activePhotoId = options.photo.id;
          } else {
            const selected = state.filteredPhotos[index];
            if (!selected) {
              return;
            }
            photo = selected;
            state.selectedIndex = index;
            state.activePhotoId = selected.id;
            state.externalPhoto = null;
          }
          state.overlayVisible = true;
          overlay.classList.remove("hidden");
          overlay.classList.add("flex");
          if (!photo) {
            return;
          }
          setDetailLoading(true);
          state.pendingImageId = photo.id;
          if ("largeUrl" in photo && photo.largeUrl) {
            elements.image.src = photo.largeUrl;
          } else {
            elements.image.src = photo.downloadUrl;
          }
          updateDetailMetadata(photo);
          updateNavigationButtons();
          updateCounter();
          if (!options.external) {
            setActiveCard(photo.id);
          } else {
            clearActiveCard();
          }
        }
        function getCurrentDetailPhoto() {
          var _a;
          if (state.externalPhoto) {
            return state.externalPhoto;
          }
          if (state.selectedIndex >= 0) {
            return (_a = state.filteredPhotos[state.selectedIndex]) != null ? _a : null;
          }
          return null;
        }
        function updateDetailMetadata(photo) {
          var _a;
          if (elements.detailTitle) {
            const fallbackTitle = t("photos.detail.unknownPhoto", "Unknown photo");
            elements.detailTitle.textContent = photo.author || fallbackTitle;
          }
          if (elements.imageInfo) {
            const label = isExternalPhoto(photo) && photo.sourceName ? photo.sourceName : photo.author;
            elements.imageInfo.textContent = label;
          }
          const orientationLabel = formatOrientation(photo.orientation);
          const metaParts = [];
          if (isExternalPhoto(photo)) {
            metaParts.push(t("photos.detail.externalLabel", "External photo"));
            if (photo.sourceName) {
              metaParts.push(photo.sourceName);
            }
          } else {
            metaParts.push(String(photo.year));
            metaParts.push(orientationLabel);
          }
          if (elements.detailMeta) {
            elements.detailMeta.textContent = metaParts.join(" \u0393\xC7\xF3 ");
          }
          if (elements.detailDimensions) {
            if (photo.width && photo.height) {
              elements.detailDimensions.textContent = t(
                "photos.detail.dimensions",
                `Resolution: ${photo.width} \u251C\xF9 ${photo.height}px`,
                { width: photo.width, height: photo.height }
              );
            } else {
              elements.detailDimensions.textContent = "";
            }
          }
          if (elements.detailOpen) {
            elements.detailOpen.href = (_a = photo.url) != null ? _a : photo.downloadUrl;
          }
          if (elements.detailDownload) {
            elements.detailDownload.href = photo.downloadUrl;
            elements.detailDownload.download = t(
              "photos.detail.downloadFilename",
              `photo-${photo.id}.jpg`,
              { id: photo.id }
            );
          }
          updateFavoriteButton(photo);
        }
        function updateFavoriteButton(photo) {
          if (!elements.detailFavorite || !elements.detailFavoriteLabel || !elements.detailFavoriteIcon) {
            return;
          }
          if (isExternalPhoto(photo)) {
            elements.detailFavorite.setAttribute("disabled", "true");
            elements.detailFavorite.classList.add("opacity-40", "pointer-events-none");
            elements.detailFavoriteLabel.textContent = t(
              "photos.detail.favoriteUnavailable",
              "Unavailable"
            );
            elements.detailFavoriteIcon.textContent = "\u0393\xC7\xF4";
            return;
          }
          const isFavorite = state.favorites.has(photo.id);
          elements.detailFavorite.removeAttribute("disabled");
          elements.detailFavorite.classList.remove("opacity-40", "pointer-events-none");
          const removeLabel = t("photos.detail.favoriteRemove", "Remove favorite");
          const addLabel = t("photos.detail.favoriteAdd", "Add to favorites");
          elements.detailFavoriteLabel.textContent = isFavorite ? removeLabel : addLabel;
          elements.detailFavoriteIcon.textContent = isFavorite ? "\u0393\xD6\xD1" : "\u0393\xD6\xED";
        }
        function closeDetail() {
          if (!elements.overlay) {
            return;
          }
          elements.overlay.classList.add("hidden");
          elements.overlay.classList.remove("flex");
          state.overlayVisible = false;
          state.selectedIndex = -1;
          state.activePhotoId = null;
          state.externalPhoto = null;
          state.pendingImageId = null;
          clearActiveCard();
          setDetailLoading(false);
        }
        function moveSelection(delta) {
          if (state.externalPhoto) {
            return;
          }
          const nextIndex = state.selectedIndex + delta;
          if (nextIndex < 0 || nextIndex >= state.filteredPhotos.length) {
            return;
          }
          openDetail(nextIndex);
        }
        function toggleFavorite() {
          if (state.externalPhoto) {
            return;
          }
          const photo = state.filteredPhotos[state.selectedIndex];
          if (!photo) {
            return;
          }
          if (state.favorites.has(photo.id)) {
            state.favorites.delete(photo.id);
          } else {
            state.favorites.add(photo.id);
          }
          updateFavoriteButton(photo);
          updateSidebarCounts();
          updateCardFavoriteState(photo.id);
        }
        function updateCardFavoriteState(photoId) {
          if (!elements.gallery) {
            return;
          }
          const card = elements.gallery.querySelector(`.photos-card[data-photo-id="${photoId}"]`);
          if (!card) {
            return;
          }
          if (state.favorites.has(photoId)) {
            card.dataset.favorite = "true";
          } else {
            card.removeAttribute("data-favorite");
          }
        }
        function updateNavigationButtons() {
          const hasPrev = state.selectedIndex > 0 && !state.externalPhoto;
          const hasNext = state.selectedIndex >= 0 && state.selectedIndex < state.filteredPhotos.length - 1 && !state.externalPhoto;
          if (elements.detailPrev) {
            elements.detailPrev.classList.toggle("opacity-30", !hasPrev);
            elements.detailPrev.classList.toggle("pointer-events-none", !hasPrev);
          }
          if (elements.detailNext) {
            elements.detailNext.classList.toggle("opacity-30", !hasNext);
            elements.detailNext.classList.toggle("pointer-events-none", !hasNext);
          }
        }
        function updateCounter() {
          if (!elements.detailCounter) {
            return;
          }
          if (state.externalPhoto) {
            elements.detailCounter.textContent = t("photos.detail.externalCounter", "External image");
            return;
          }
          if (state.selectedIndex >= 0) {
            elements.detailCounter.textContent = t(
              "photos.detail.counter",
              `${state.selectedIndex + 1} of ${state.filteredPhotos.length}`,
              { index: state.selectedIndex + 1, total: state.filteredPhotos.length }
            );
          } else {
            elements.detailCounter.textContent = "";
          }
        }
        function setDetailLoading(isLoading) {
          var _a;
          (_a = elements.loader) == null ? void 0 : _a.classList.toggle("hidden", !isLoading);
        }
        function handleKeyNavigation(event) {
          if (!state.overlayVisible) {
            return;
          }
          if (event.key === "Escape") {
            closeDetail();
          } else if (event.key === "ArrowLeft") {
            moveSelection(-1);
          } else if (event.key === "ArrowRight") {
            moveSelection(1);
          }
        }
        function getRandomPage() {
          return Math.floor(Math.random() * 10) + 1;
        }
        function showExternalImage(payload) {
          if (!payload || !payload.src) {
            return;
          }
          if (!state.initialized) {
            init();
          }
          const name = payload.name && payload.name.trim().length > 0 ? payload.name.trim() : t("photos.detail.externalFile", "External file");
          const externalPhoto = {
            id: `external-${Date.now()}`,
            author: name,
            downloadUrl: payload.src,
            largeUrl: payload.src,
            url: payload.src,
            sourceName: name,
            isExternal: true
          };
          openDetail(-1, { external: true, photo: externalPhoto });
        }
        function handleLanguageChange() {
          var _a, _b, _c;
          if (!state.initialized) {
            return;
          }
          renderGallery();
          updateEmptyState();
          updatePhotoCount();
          if (state.overlayVisible) {
            const current = getCurrentDetailPhoto();
            if (current) {
              updateDetailMetadata(current);
            }
            updateNavigationButtons();
            updateCounter();
          } else {
            updateCounter();
          }
          (_c = (_a = globalWindow.appI18n) == null ? void 0 : _a.applyTranslations) == null ? void 0 : _c.call(_a, (_b = elements.container) != null ? _b : void 0);
        }
        const api = {
          init,
          showExternalImage
        };
        globalWindow.PhotosApp = api;
        window.addEventListener("languagePreferenceChange", handleLanguageChange);
      })();
    }
  });

  // src/ts/legacy/window-configs.js
  var require_window_configs = __commonJS({
    "src/ts/legacy/window-configs.js"() {
      "use strict";
      console.log("Window Configurations loaded");
      (function() {
        "use strict";
        const windowConfigurations = [
          {
            id: "finder-modal",
            type: "persistent",
            programKey: "programs.finder",
            icon: "./img/sucher.png",
            closeButtonId: "close-finder-modal",
            metadata: {
              initHandler: function() {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                if (window.FinderInstanceManager && !window.FinderInstanceManager.hasInstances()) {
                  const inst = window.FinderInstanceManager.createInstance({
                    title: "Finder"
                  });
                  try {
                    const active = inst && inst.instanceId ? inst : (_b = (_a = window.FinderInstanceManager).getActiveInstance) == null ? void 0 : _b.call(_a);
                    if (active && window.MultiInstanceIntegration) {
                      window.MultiInstanceIntegration.showInstance(
                        "finder",
                        active.instanceId
                      );
                      const integ = (_d = (_c = window.MultiInstanceIntegration).getIntegration) == null ? void 0 : _d.call(_c, "finder");
                      (_f = (_e = integ == null ? void 0 : integ.tabManager) == null ? void 0 : _e.addTab) == null ? void 0 : _f.call(_e, active);
                      if ((_h = (_g = integ == null ? void 0 : integ.tabManager) == null ? void 0 : _g.controller) == null ? void 0 : _h.refresh) {
                        integ.tabManager.controller.refresh();
                      }
                    }
                  } catch (e) {
                    console.warn("Finder init post-create sync failed:", e);
                  }
                }
              },
              openHandler: function() {
                var _a, _b, _c, _d, _e, _f, _g;
                if (window.FinderInstanceManager && !window.FinderInstanceManager.hasInstances()) {
                  const inst = window.FinderInstanceManager.createInstance({
                    title: "Finder"
                  });
                  try {
                    const activeId = inst && inst.instanceId || ((_c = (_b = (_a = window.FinderInstanceManager).getActiveInstance) == null ? void 0 : _b.call(_a)) == null ? void 0 : _c.instanceId);
                    if (activeId && window.MultiInstanceIntegration) {
                      window.MultiInstanceIntegration.showInstance("finder", activeId);
                      const integ = (_e = (_d = window.MultiInstanceIntegration).getIntegration) == null ? void 0 : _e.call(_d, "finder");
                      if (integ && integ.tabManager && typeof integ.tabManager.addTab === "function") {
                        integ.tabManager.addTab(inst || { instanceId: activeId });
                      }
                      if ((_g = (_f = integ == null ? void 0 : integ.tabManager) == null ? void 0 : _f.controller) == null ? void 0 : _g.refresh) {
                        integ.tabManager.controller.refresh();
                      }
                    }
                  } catch (e) {
                    console.warn("Finder open post-create sync failed:", e);
                  }
                }
              }
            }
          },
          {
            id: "launchpad-modal",
            type: "persistent",
            programKey: "programs.launchpad",
            icon: "./img/launchpad.png",
            closeButtonId: "close-launchpad-modal",
            metadata: {
              skipMenubarUpdate: true,
              // Don't update menubar when launchpad is focused
              initHandler: function() {
                if (window.LaunchpadSystem && !window.LaunchpadSystem.container) {
                  const container = document.getElementById("launchpad-container");
                  if (container) {
                    window.LaunchpadSystem.init(container);
                  }
                }
                if (window.LaunchpadSystem && typeof window.LaunchpadSystem.refresh === "function") {
                  window.LaunchpadSystem.refresh();
                }
              }
            }
          },
          {
            id: "projects-modal",
            type: "persistent",
            programKey: "programs.projects",
            icon: "./img/sucher.png",
            closeButtonId: "close-projects-modal"
          },
          {
            id: "about-modal",
            type: "persistent",
            programKey: "programs.about",
            icon: "./img/profil.jpg",
            closeButtonId: "close-about-modal"
          },
          {
            id: "settings-modal",
            type: "persistent",
            programKey: "programs.settings",
            icon: "./img/settings.png",
            closeButtonId: "close-settings-modal",
            metadata: {
              initHandler: function() {
                if (window.SettingsSystem && !window.SettingsSystem.container) {
                  const container = document.getElementById("settings-container");
                  if (container) {
                    window.SettingsSystem.init(container);
                  }
                }
              }
            }
          },
          {
            id: "text-modal",
            type: "persistent",
            programKey: "programs.text",
            icon: "./img/notepad.png",
            closeButtonId: "close-text-modal",
            metadata: {
              initHandler: function() {
                if (window.TextEditorInstanceManager && !window.TextEditorInstanceManager.hasInstances()) {
                  window.TextEditorInstanceManager.createInstance({
                    title: "Editor"
                  });
                } else if (window.TextEditorSystem && !window.TextEditorSystem.container) {
                  const container = document.getElementById("text-editor-container");
                  if (container) {
                    window.TextEditorSystem.init(container);
                  }
                }
              }
            }
          },
          {
            id: "image-modal",
            type: "persistent",
            programKey: "programs.photos",
            icon: "./img/photos-app-icon.svg",
            closeButtonId: "close-image-modal",
            metadata: {
              initHandler: function() {
                if (window.PhotosApp && typeof window.PhotosApp.init === "function") {
                  window.PhotosApp.init();
                }
              }
            }
          },
          {
            id: "program-info-modal",
            type: "transient",
            programKey: "programs.default",
            icon: "./img/sucher.png",
            closeButtonId: "close-program-info-modal"
          },
          {
            id: "terminal-modal",
            type: "persistent",
            programKey: "programs.terminal",
            icon: "./img/terminal.png",
            closeButtonId: "close-terminal-modal",
            metadata: {
              initHandler: function() {
                if (window.TerminalInstanceManager && !window.TerminalInstanceManager.hasInstances()) {
                  window.TerminalInstanceManager.createInstance({
                    title: "Terminal"
                  });
                } else if (window.TerminalSystem && !window.TerminalSystem.container) {
                  const container = document.getElementById("terminal-container");
                  if (container) {
                    window.TerminalSystem.init(container);
                  }
                }
              }
            }
          }
        ];
        if (window.WindowManager) {
          window.WindowManager.registerAll(windowConfigurations);
          console.log(`Registered ${windowConfigurations.length} windows`);
        } else {
          document.addEventListener("DOMContentLoaded", () => {
            if (window.WindowManager) {
              window.WindowManager.registerAll(windowConfigurations);
              console.log(`Registered ${windowConfigurations.length} windows (delayed)`);
            }
          });
        }
        window.windowConfigurations = windowConfigurations;
      })();
    }
  });

  // src/ts/legacy/finder-instance.js
  var require_finder_instance = __commonJS({
    "src/ts/legacy/finder-instance.js"() {
      "use strict";
      console.log("FinderInstance loaded");
      (function() {
        "use strict";
        const ROOT_FOLDER_NAME = "Computer";
        class FinderInstance extends window.BaseWindowInstance {
          constructor(config) {
            super({
              ...config,
              type: "finder"
            });
            this.currentPath = [];
            this.currentView = "computer";
            this.selectedItems = /* @__PURE__ */ new Set();
            this.viewMode = "list";
            this.sortBy = "name";
            this.sortOrder = "asc";
            this.githubRepos = [];
            this.githubLoading = false;
            this.githubError = false;
            this.githubErrorMessage = "";
            this.lastGithubItemsMap = /* @__PURE__ */ new Map();
            this.favorites = /* @__PURE__ */ new Set();
            this.recentFiles = [];
            this.domRefs = {
              sidebarComputer: null,
              sidebarGithub: null,
              sidebarFavorites: null,
              sidebarRecent: null,
              breadcrumbs: null,
              contentArea: null,
              toolbar: null,
              searchInput: null
            };
            this.githubContentCache = /* @__PURE__ */ new Map();
            this.virtualFileSystem = this._createVirtualFileSystem();
          }
          /**
           * Create virtual file system for this instance
           * @private
           */
          _createVirtualFileSystem() {
            const rootFolder = {
              type: "folder",
              icon: "\u{1F4BB}",
              children: {
                Documents: {
                  type: "folder",
                  icon: "\u{1F4C4}",
                  children: {
                    "README.md": {
                      type: "file",
                      icon: "\u{1F4DD}",
                      content: "# Willkommen im Finder\n\nDies ist ein virtuelles Dateisystem.",
                      size: 1024
                    }
                  }
                },
                Downloads: {
                  type: "folder",
                  icon: "\u2B07\uFE0F",
                  children: {}
                },
                Pictures: {
                  type: "folder",
                  icon: "\u{1F5BC}\uFE0F",
                  children: {}
                },
                Music: {
                  type: "folder",
                  icon: "\u{1F3B5}",
                  children: {}
                },
                Videos: {
                  type: "folder",
                  icon: "\u{1F3AC}",
                  children: {}
                }
              }
            };
            return {
              [ROOT_FOLDER_NAME]: rootFolder
            };
          }
          /**
           * Initialize instance state
           * @protected
           */
          _initializeState(initialState) {
            return {
              ...super._initializeState(initialState),
              currentPath: initialState.currentPath || [],
              currentView: initialState.currentView || "computer",
              viewMode: initialState.viewMode || "list",
              sortBy: initialState.sortBy || "name",
              sortOrder: initialState.sortOrder || "asc",
              favorites: initialState.favorites || [],
              recentFiles: initialState.recentFiles || []
            };
          }
          /**
           * Render finder UI
           * @protected
           */
          render() {
            if (!this.container) return;
            const html = `
                <div class="finder-instance-wrapper flex-1 flex gap-0 min-h-0 overflow-hidden">
                    <!-- Sidebar -->
                    <aside class="w-48 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                        <div class="py-2">
                            <!-- Favoriten Section -->
                            <div class="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                                data-i18n="finder.sidebar.favorites">
                                Favoriten
                            </div>
                            <button id="finder-sidebar-computer" data-finder-sidebar-computer data-action="finder:switchView" data-finder-view="computer"
                                class="finder-sidebar-item finder-sidebar-active">
                                <span class="finder-sidebar-icon">\u{1F4BB}</span>
                                <span data-i18n="finder.sidebar.computer">Computer</span>
                            </button>
                            <button id="finder-sidebar-recent" data-finder-sidebar-recent data-action="finder:switchView" data-finder-view="recent"
                                class="finder-sidebar-item">
                                <span class="finder-sidebar-icon">\u{1F552}</span>
                                <span data-i18n="finder.sidebar.recent">Zuletzt ge\xF6ffnet</span>
                            </button>

                            <!-- Orte Section -->
                            <div class="px-3 py-1 mt-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                                data-i18n="finder.sidebar.locations">
                                Orte
                            </div>
                            <button id="finder-sidebar-github" data-finder-sidebar-github data-action="finder:switchView" data-finder-view="github"
                                class="finder-sidebar-item">
                                <span class="finder-sidebar-icon">\u{1F4C2}</span>
                                <span data-i18n="finder.sidebar.github">GitHub Projekte</span>
                            </button>
                            <button id="finder-sidebar-favorites" data-finder-sidebar-favorites data-action="finder:switchView"
                                data-finder-view="favorites" class="finder-sidebar-item">
                                <span class="finder-sidebar-icon">\u2B50</span>
                                <span data-i18n="finder.sidebar.starred">Mit Stern</span>
                            </button>
                        </div>
                    </aside>

                    <!-- Main Content Area -->
                    <div class="flex-1 flex flex-col min-h-0">
                        <!-- Toolbar -->
                        <div id="finder-toolbar" data-finder-toolbar
                            class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                            <button data-action="finder:navigateUp" class="finder-toolbar-btn" title="Zur\xFCck"
                                data-i18n-title="finder.toolbar.back">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button data-action="finder:goRoot" class="finder-toolbar-btn" title="Vorw\xE4rts"
                                data-i18n-title="finder.toolbar.forward">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </button>
                            <div class="flex-1 mx-2">
                                <div id="finder-path-breadcrumbs" data-finder-breadcrumbs
                                    class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                    <!-- Breadcrumbs werden dynamisch generiert -->
                                </div>
                            </div>
                            <div class="flex gap-1">
                                <button data-action="finder:setViewMode" data-view-mode="list" class="finder-toolbar-btn"
                                    title="Listenansicht" data-i18n-title="finder.toolbar.listView">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 4h18v2H3V4m0 7h18v2H3v-2m0 7h18v2H3v-2Z" />
                                    </svg>
                                </button>
                                <button data-action="finder:setViewMode" data-view-mode="grid" class="finder-toolbar-btn"
                                    title="Rasteransicht" data-i18n-title="finder.toolbar.gridView">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 3h8v8H3V3m10 0h8v8h-8V3M3 13h8v8H3v-8m10 0h8v8h-8v-8Z" />
                                    </svg>
                                </button>
                            </div>
                            <input id="finder-search-input" data-finder-search type="text" placeholder="Suchen"
                                data-i18n-placeholder="finder.toolbar.search"
                                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>

                        <!-- Content Area -->
                        <div id="finder-content-area" data-finder-content class="flex-1 overflow-auto bg-white dark:bg-gray-800 p-4">
                            <!-- Content wird dynamisch generiert -->
                        </div>
                    </div>
                </div>
            `;
            this.container.innerHTML = html;
            this.domRefs.sidebarComputer = this.container.querySelector(
              "[data-finder-sidebar-computer]"
            );
            this.domRefs.sidebarGithub = this.container.querySelector(
              "[data-finder-sidebar-github]"
            );
            this.domRefs.sidebarFavorites = this.container.querySelector(
              "[data-finder-sidebar-favorites]"
            );
            this.domRefs.sidebarRecent = this.container.querySelector(
              "[data-finder-sidebar-recent]"
            );
            this.domRefs.breadcrumbs = this.container.querySelector("[data-finder-breadcrumbs]");
            this.domRefs.contentArea = this.container.querySelector("[data-finder-content]");
            this.domRefs.toolbar = this.container.querySelector("[data-finder-toolbar]");
            this.domRefs.searchInput = this.container.querySelector("[data-finder-search]");
            try {
              if (window.appI18n && typeof window.appI18n.applyTranslations === "function") {
                window.appI18n.applyTranslations(this.container);
              }
            } catch {
            }
          }
          /**
           * Attach event listeners
           * @protected
           */
          attachEventListeners() {
            if (!this.container) return;
            this.container.addEventListener("click", (e) => this._handleClick(e));
            this.container.addEventListener("dblclick", (e) => this._handleDoubleClick(e));
            if (!this._skipInitialRender) {
              this.navigateTo(this.state.currentPath, this.state.currentView);
            }
          }
          /**
           * Handle click events
           * @private
           */
          _handleClick(e) {
            var _a;
            const action = (_a = e.target.closest("[data-action]")) == null ? void 0 : _a.dataset.action;
            if (!action) return;
            const handlers = {
              "finder:switchView": () => {
                var _a2;
                const view = (_a2 = e.target.closest("[data-finder-view]")) == null ? void 0 : _a2.dataset.finderView;
                if (view) this.switchView(view);
              },
              "finder:navigateUp": () => this.navigateUp(),
              "finder:goRoot": () => this.navigateTo([], this.currentView),
              "finder:navigateToPath": () => {
                var _a2;
                const path = (_a2 = e.target.closest("[data-path]")) == null ? void 0 : _a2.dataset.path;
                if (path) this.navigateTo(path);
              },
              "finder:setSortBy": () => {
                var _a2;
                const sortBy = (_a2 = e.target.closest("[data-sort-by]")) == null ? void 0 : _a2.dataset.sortBy;
                if (sortBy) this.setSortBy(sortBy);
              },
              "finder:setViewMode": () => {
                var _a2;
                const mode = (_a2 = e.target.closest("[data-view-mode]")) == null ? void 0 : _a2.dataset.viewMode;
                if (mode) this.setViewMode(mode);
              }
            };
            if (handlers[action]) {
              handlers[action]();
            }
          }
          /**
           * Handle double click events
           * @private
           */
          _handleDoubleClick(e) {
            const item = e.target.closest("[data-action-dblclick]");
            if (!item || item.dataset.actionDblclick !== "finder:openItem") return;
            const name = item.dataset.itemName;
            const type = item.dataset.itemType;
            if (name && type) {
              this.openItem(name, type);
            }
          }
          /**
           * Get current folder name for tab title
           */
          getCurrentFolderName() {
            var _a, _b, _c;
            const _lang = (((_b = (_a = window.appI18n) == null ? void 0 : _a.getActiveLanguage) == null ? void 0 : _b.call(_a)) || ((_c = document.documentElement) == null ? void 0 : _c.lang) || "de").toLowerCase();
            const _isDe = _lang.startsWith("de");
            if (this.currentPath.length === 0) {
              switch (this.currentView) {
                case "computer":
                  return _isDe ? "Computer" : "Computer";
                case "github":
                  return _isDe ? "GitHub Projekte" : "GitHub Projects";
                case "favorites":
                  return _isDe ? "Favoriten" : "Favorites";
                case "recent":
                  return _isDe ? "Zuletzt ge\xF6ffnet" : "Recently opened";
                default:
                  return "Finder";
              }
            }
            return this.currentPath[this.currentPath.length - 1];
          }
          /**
           * Update tab title to reflect current folder
           */
          updateTabTitle() {
            var _a, _b, _c;
            const folderName = this.getCurrentFolderName();
            this.title = folderName;
            try {
              const tabController = document.querySelector(`#finder-tabs-container`);
              if (tabController && window.multiInstanceIntegration) {
                const integration = (_b = (_a = window.multiInstanceIntegration.integrations) == null ? void 0 : _a.get) == null ? void 0 : _b.call(_a, "finder");
                if ((_c = integration == null ? void 0 : integration.tabManager) == null ? void 0 : _c.setTitle) {
                  integration.tabManager.setTitle(this.instanceId, folderName);
                }
              }
            } catch (e) {
            }
          }
          /**
           * Navigate to path
           */
          navigateTo(path, view = null) {
            if (view !== null) {
              this.currentView = view;
            }
            if (typeof path === "string") {
              this.currentPath = path === "" ? [] : path.split("/");
            } else if (Array.isArray(path)) {
              this.currentPath = [...path];
            }
            this.updateSidebarSelection();
            this.renderBreadcrumbs();
            this.renderContent();
            this.updateTabTitle();
            this.updateState({
              currentPath: this.currentPath,
              currentView: this.currentView
            });
          }
          /**
           * Navigate up one level
           */
          navigateUp() {
            if (this.currentPath.length > 0) {
              this.currentPath.pop();
              this.navigateTo(this.currentPath);
            }
          }
          /**
           * Navigate to folder
           */
          navigateToFolder(folderName) {
            this.currentPath.push(folderName);
            this.navigateTo(this.currentPath);
          }
          /**
           * Switch view
           */
          switchView(view) {
            this.currentPath = [];
            this.navigateTo([], view);
          }
          /**
           * Update sidebar selection
           */
          updateSidebarSelection() {
            const refs = this.domRefs;
            if (!refs) return;
            [
              refs.sidebarComputer,
              refs.sidebarGithub,
              refs.sidebarFavorites,
              refs.sidebarRecent
            ].forEach((el) => {
              if (el) el.classList.remove("finder-sidebar-active");
            });
            switch (this.currentView) {
              case "computer":
                if (refs.sidebarComputer)
                  refs.sidebarComputer.classList.add("finder-sidebar-active");
                break;
              case "github":
                if (refs.sidebarGithub)
                  refs.sidebarGithub.classList.add("finder-sidebar-active");
                break;
              case "favorites":
                if (refs.sidebarFavorites)
                  refs.sidebarFavorites.classList.add("finder-sidebar-active");
                break;
              case "recent":
                if (refs.sidebarRecent)
                  refs.sidebarRecent.classList.add("finder-sidebar-active");
                break;
            }
          }
          /**
           * Render breadcrumbs
           */
          renderBreadcrumbs() {
            var _a, _b, _c;
            if (!this.domRefs.breadcrumbs) return;
            const parts = [];
            const _lang = (((_b = (_a = window.appI18n) == null ? void 0 : _a.getActiveLanguage) == null ? void 0 : _b.call(_a)) || ((_c = document.documentElement) == null ? void 0 : _c.lang) || "de").toLowerCase();
            const _isDe = _lang.startsWith("de");
            let viewLabel = "";
            switch (this.currentView) {
              case "computer":
                viewLabel = _isDe ? "Computer" : "Computer";
                break;
              case "github":
                viewLabel = _isDe ? "GitHub Projekte" : "GitHub Projects";
                break;
              case "favorites":
                viewLabel = _isDe ? "Favoriten" : "Favorites";
                break;
              case "recent":
                viewLabel = _isDe ? "Zuletzt ge\xF6ffnet" : "Recently opened";
                break;
            }
            parts.push(
              `<button class="finder-breadcrumb-item" data-action="finder:goRoot">${viewLabel}</button>`
            );
            this.currentPath.forEach((part, index) => {
              if (index === 0 && this.currentView === "computer" && part === ROOT_FOLDER_NAME) {
                return;
              }
              const pathUpToHere = this.currentPath.slice(0, index + 1);
              parts.push('<span class="finder-breadcrumb-separator">\u203A</span>');
              parts.push(
                `<button class="finder-breadcrumb-item" data-action="finder:navigateToPath" data-path="${pathUpToHere.join("/")}">${part}</button>`
              );
            });
            this.domRefs.breadcrumbs.innerHTML = parts.join("");
          }
          /**
           * Render content area
           */
          renderContent() {
            var _a, _b, _c;
            if (!this.domRefs.contentArea) return;
            if (this.currentView === "github") {
              this.renderGithubContent();
              return;
            }
            const items = this.getCurrentItems();
            if (items.length === 0) {
              let emptyText = "Dieser Ordner ist leer";
              try {
                const lang = (((_b = (_a = window.appI18n) == null ? void 0 : _a.getActiveLanguage) == null ? void 0 : _b.call(_a)) || ((_c = document.documentElement) == null ? void 0 : _c.lang) || "de").toLowerCase();
                emptyText = lang.startsWith("de") ? "Dieser Ordner ist leer" : "This folder is empty";
              } catch {
              }
              this.domRefs.contentArea.innerHTML = `
                    <div class="finder-empty-state">
                        <div class="text-6xl mb-4">\u{1F4C2}</div>
                        <div class="text-gray-500 dark:text-gray-400">${emptyText}</div>
                    </div>
                `;
              return;
            }
            const sortedItems = this.sortItems(items);
            switch (this.viewMode) {
              case "list":
                this.renderListView(sortedItems);
                break;
              case "grid":
                this.renderGridView(sortedItems);
                break;
              case "columns":
                this.renderListView(sortedItems);
                break;
            }
          }
          /**
           * Get current items based on view and path
           */
          getCurrentItems() {
            switch (this.currentView) {
              case "computer":
                return this.getComputerItems();
              case "github":
                return this.getGithubItems();
              case "favorites":
                return this.getFavoriteItems();
              case "recent":
                return this.getRecentItems();
              default:
                return [];
            }
          }
          /**
           * Get computer items
           */
          getComputerItems() {
            let current = this.virtualFileSystem;
            for (const pathPart of this.currentPath) {
              if (current[pathPart] && current[pathPart].children) {
                current = current[pathPart].children;
              } else {
                return [];
              }
            }
            return Object.entries(current).map(([name, item]) => ({
              name,
              type: item.type,
              icon: item.icon || (item.type === "folder" ? "\u{1F4C1}" : "\u{1F4C4}"),
              size: item.size || 0,
              modified: item.modified || (/* @__PURE__ */ new Date()).toISOString()
            }));
          }
          /**
           * Get GitHub items (placeholder - simplified from finder.js)
           */
          getGithubItems() {
            return [];
          }
          /**
           * Get favorite items
           */
          getFavoriteItems() {
            return Array.from(this.favorites).map((path) => ({
              name: path.split("/").pop(),
              type: "favorite",
              icon: "\u2B50",
              path
            }));
          }
          /**
           * Get recent items
           */
          getRecentItems() {
            return this.recentFiles.map((file) => ({
              name: file.name,
              type: "recent",
              icon: file.icon || "\u{1F4C4}",
              path: file.path,
              modified: file.modified
            }));
          }
          /**
           * Sort items
           */
          sortItems(items) {
            const sorted = [...items];
            sorted.sort((a, b) => {
              if (a.type === "folder" && b.type !== "folder") return -1;
              if (a.type !== "folder" && b.type === "folder") return 1;
              let comparison = 0;
              switch (this.sortBy) {
                case "name":
                  comparison = a.name.localeCompare(b.name);
                  break;
                case "size":
                  comparison = (a.size || 0) - (b.size || 0);
                  break;
                case "date":
                  comparison = new Date(b.modified || 0) - new Date(a.modified || 0);
                  break;
                case "type":
                  comparison = (a.type || "").localeCompare(b.type || "");
                  break;
              }
              return this.sortOrder === "asc" ? comparison : -comparison;
            });
            return sorted;
          }
          /**
           * Render list view
           */
          renderListView(items) {
            const html = `
                <div id="finder-list-container">
                <table class="finder-list-table">
                    <thead>
                        <tr>
                            <th data-action="finder:setSortBy" data-sort-by="name">Name</th>
                            <th data-action="finder:setSortBy" data-sort-by="size">Gr\xF6\xDFe</th>
                            <th data-action="finder:setSortBy" data-sort-by="date">Ge\xE4ndert</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(
              (item) => `
                            <tr class="finder-list-item" data-action-dblclick="finder:openItem" data-item-name="${item.name}" data-item-type="${item.type}">
                                <td>
                                    <span class="finder-item-icon">${item.icon}</span>
                                    <span class="finder-item-name">${item.name}</span>
                                </td>
                                <td>${this.formatSize(item.size)}</td>
                                <td>${this.formatDate(item.modified)}</td>
                            </tr>
                        `
            ).join("")}
                    </tbody>
                </table>
                </div>
            `;
            this.domRefs.contentArea.innerHTML = html;
          }
          /**
           * Render grid view
           */
          renderGridView(items) {
            const html = `
                <div id="finder-list-container">
                <div class="finder-grid-container">
                    ${items.map(
              (item) => `
                        <div class="finder-grid-item" data-action-dblclick="finder:openItem" data-item-name="${item.name}" data-item-type="${item.type}">
                            <div class="finder-grid-icon">${item.icon}</div>
                            <div class="finder-grid-name">${item.name}</div>
                        </div>
                    `
            ).join("")}
                </div>
                </div>
            `;
            this.domRefs.contentArea.innerHTML = html;
          }
          /**
           * Open item
           */
          openItem(name, type) {
            if (type === "folder") {
              this.navigateToFolder(name);
            } else if (type === "file") {
              this.addToRecent(name);
              this.emit("fileOpened", { name, path: [...this.currentPath, name].join("/") });
              if (this.currentView === "github") {
                const item = this.lastGithubItemsMap.get(name);
                const isImage = /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(name);
                if (item && isImage && item.download_url) {
                  this.openImageViewer({
                    src: item.download_url,
                    name
                  });
                }
              }
            }
          }
          /**
           * Render GitHub view with async fetching and caching
           */
          async renderGithubContent() {
            const el = this.domRefs.contentArea;
            if (!el) return;
            if (this.currentPath.length === 0) {
              el.innerHTML = '<div class="finder-empty-state">Lade Repositories\u2026</div>';
              const repos = await this.fetchGithubRepos();
              this.lastGithubItemsMap.clear();
              const items2 = (repos || []).map((repo2) => ({
                name: repo2.name,
                type: "folder",
                icon: "\u{1F4E6}"
              }));
              items2.forEach((it) => this.lastGithubItemsMap.set(it.name, it));
              if (this.githubError && items2.length === 0) {
                el.innerHTML = '<div class="finder-empty-state text-center"><div class="text-2xl mb-2">\u26A0\uFE0F</div><div>Repositories could not be loaded (Repos konnten nicht geladen werden). Possible Rate Limit.</div></div>';
              } else if (items2.length === 0) {
                el.innerHTML = '<div class="finder-empty-state text-center">Keine \xF6ffentlichen Repositories gefunden</div>';
              } else {
                this.renderListView(items2);
              }
              return;
            }
            const repo = this.currentPath[0];
            const subPathParts = this.currentPath.slice(1);
            const subPath = subPathParts.join("/");
            el.innerHTML = '<div class="finder-empty-state">Lade Inhalte\u2026</div>';
            const contents = await this.fetchGithubContents(repo, subPath);
            this.lastGithubItemsMap.clear();
            const items = (contents || []).map((entry) => {
              const isDir = entry.type === "dir";
              return {
                name: entry.name,
                type: isDir ? "folder" : "file",
                icon: isDir ? "\u{1F4C1}" : "\u{1F4C4}",
                size: entry.size || 0,
                download_url: entry.download_url || null
              };
            });
            items.forEach((it) => this.lastGithubItemsMap.set(it.name, it));
            if (this.githubError && items.length === 0) {
              el.innerHTML = '<div class="finder-empty-state text-center"><div class="text-2xl mb-2">\u26A0\uFE0F</div><div>Repositories could not be loaded (Repos konnten nicht geladen werden). Possible Rate Limit.</div></div>';
            } else if (items.length === 0) {
              el.innerHTML = '<div class="finder-empty-state text-center">Dieser Ordner ist leer</div>';
            } else {
              this.renderListView(items);
            }
          }
          /**
           * Fetch GitHub repos for configured user
           */
          async fetchGithubRepos() {
            const GITHUB_USERNAME = "Marormur";
            try {
              if (Array.isArray(this.githubRepos) && this.githubRepos.length) {
                return this.githubRepos;
              }
              const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos`, {
                headers: { Accept: "application/vnd.github.v3+json" }
              });
              if (!res.ok) throw new Error("GitHub repos fetch failed");
              const data = await res.json();
              this.githubRepos = data || [];
              this.githubError = false;
              this.githubErrorMessage = "";
              return this.githubRepos;
            } catch (e) {
              console.warn("GitHub repos error:", e);
              this.githubError = true;
              this.githubErrorMessage = "Repositories could not be loaded";
              return [];
            }
          }
          /**
           * Fetch contents (files/folders) for a given repo and subPath
           */
          async fetchGithubContents(repo, subPath = "") {
            try {
              const key = `${repo}:${subPath}`;
              if (this.githubContentCache.has(key)) {
                return this.githubContentCache.get(key);
              }
              const base = `https://api.github.com/repos/Marormur/${repo}/contents`;
              const url = subPath ? `${base}/${this._encodeGithubPath(subPath)}` : base;
              const res = await fetch(url, {
                headers: { Accept: "application/vnd.github.v3+json" }
              });
              if (!res.ok) throw new Error("GitHub contents fetch failed");
              const data = await res.json();
              this.githubContentCache.set(key, data || []);
              this.githubError = false;
              this.githubErrorMessage = "";
              return data;
            } catch (e) {
              console.warn("GitHub contents error:", e);
              this.githubError = true;
              this.githubErrorMessage = "Repositories could not be loaded";
              return [];
            }
          }
          /**
           * Encode a GitHub path by encoding segments but keeping '/'
           */
          _encodeGithubPath(subPath) {
            if (!subPath) return "";
            return subPath.split("/").filter(Boolean).map((seg) => encodeURIComponent(seg)).join("/");
          }
          /**
           * Open image viewer modal with given src
           */
          openImageViewer({ src, name }) {
            var _a, _b;
            try {
              const img = document.getElementById("image-viewer");
              const info = document.getElementById("image-info");
              const placeholder = document.getElementById("image-placeholder");
              if (info) {
                info.textContent = name || "";
                info.classList.remove("hidden");
              }
              if (placeholder) placeholder.classList.add("hidden");
              if (img) {
                img.src = src;
                img.classList.remove("hidden");
              }
              if (window.PhotosApp && typeof window.PhotosApp.showExternalImage === "function") {
                window.PhotosApp.showExternalImage({ src, name });
              }
              if ((_b = (_a = window.API) == null ? void 0 : _a.window) == null ? void 0 : _b.open) {
                window.API.window.open("image-modal");
              } else {
                const modal = document.getElementById("image-modal");
                if (modal) modal.classList.remove("hidden");
              }
            } catch (e) {
              console.warn("Failed to open image viewer:", e);
            }
          }
          /**
           * Add to recent files
           */
          addToRecent(name) {
            const fullPath = [...this.currentPath, name].join("/");
            this.recentFiles.unshift({
              name,
              path: fullPath,
              icon: "\u{1F4C4}",
              modified: (/* @__PURE__ */ new Date()).toISOString()
            });
            this.recentFiles = this.recentFiles.slice(0, 20);
            this.updateState({ recentFiles: this.recentFiles });
          }
          /**
           * Set sort by
           */
          setSortBy(field) {
            if (this.sortBy === field) {
              this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
            } else {
              this.sortBy = field;
              this.sortOrder = "asc";
            }
            this.renderContent();
            this.updateState({ sortBy: this.sortBy, sortOrder: this.sortOrder });
          }
          /**
           * Set view mode
           */
          setViewMode(mode) {
            this.viewMode = mode;
            this.renderContent();
            this.updateState({ viewMode: this.viewMode });
          }
          /**
           * Format size
           */
          formatSize(bytes) {
            if (!bytes || bytes === 0) return "-";
            if (bytes < 1024) return bytes + " B";
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
            return (bytes / (1024 * 1024)).toFixed(1) + " MB";
          }
          /**
           * Format date
           */
          formatDate(dateStr) {
            if (!dateStr) return "-";
            const date = new Date(dateStr);
            return date.toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            });
          }
          /**
           * Serialize finder state
           */
          serialize() {
            return {
              ...super.serialize(),
              currentPath: this.currentPath,
              currentView: this.currentView,
              viewMode: this.viewMode,
              sortBy: this.sortBy,
              sortOrder: this.sortOrder,
              favorites: Array.from(this.favorites),
              recentFiles: this.recentFiles
            };
          }
          /**
           * Restore finder from saved state
           */
          deserialize(data) {
            this._skipInitialRender = true;
            super.deserialize(data);
            if (data.currentPath) {
              this.currentPath = data.currentPath;
            }
            if (data.currentView) {
              this.currentView = data.currentView;
            }
            if (data.viewMode) {
              this.viewMode = data.viewMode;
            }
            if (data.sortBy) {
              this.sortBy = data.sortBy;
            }
            if (data.sortOrder) {
              this.sortOrder = data.sortOrder;
            }
            if (data.favorites) {
              this.favorites = new Set(data.favorites);
            }
            if (data.recentFiles) {
              this.recentFiles = data.recentFiles;
            }
            this.navigateTo(this.currentPath, this.currentView);
          }
          /**
           * Focus finder
           */
          focus() {
            super.focus();
            if (this.domRefs.searchInput) {
            }
          }
        }
        window.FinderInstance = FinderInstance;
        if (window.InstanceManager) {
          window.FinderInstanceManager = new window.InstanceManager({
            type: "finder",
            instanceClass: FinderInstance,
            maxInstances: 0,
            // Unlimited
            createContainer: function(instanceId) {
              const finderModalContainer = document.getElementById("finder-container");
              if (!finderModalContainer) {
                console.error("Finder container not found");
                return null;
              }
              const container = document.createElement("div");
              container.id = `${instanceId}-container`;
              container.className = "finder-instance-container h-full flex-1 w-full min-w-0 flex flex-col min-h-0";
              container.classList.add("hidden");
              finderModalContainer.appendChild(container);
              return container;
            }
          });
        }
      })();
    }
  });

  // src/ts/legacy/launchpad.js
  var require_launchpad = __commonJS({
    "src/ts/legacy/launchpad.js"() {
      "use strict";
      console.log("Launchpad loaded");
      (function(global) {
        "use strict";
        let container = null;
        let searchInput = null;
        let appsGrid = null;
        let allApps = [];
        let filteredApps = [];
        function translate2(key, fallback) {
          if (!global.appI18n || typeof global.appI18n.translate !== "function") {
            return fallback || key;
          }
          const result = global.appI18n.translate(key);
          if (result === key && fallback) return fallback;
          return result;
        }
        function init(containerElement) {
          if (!containerElement) {
            console.warn("LaunchpadSystem: No container element provided");
            return;
          }
          if (container) {
            console.warn("LaunchpadSystem: Already initialized");
            return;
          }
          container = containerElement;
          render();
          loadApps();
        }
        function render() {
          if (!container) return;
          container.innerHTML = `
            <div class="launchpad-container">
                <div class="launchpad-search">
                    <input
                        id="launchpad-search-input"
                        type="text"
                        placeholder="${translate2("modals.launchpad.searchPlaceholder", "Search apps")}"
                        class="launchpad-search-input"
                    />
                </div>
                <div id="launchpad-apps-grid" class="launchpad-apps-grid">
                    <!-- Apps will be rendered here -->
                </div>
            </div>
        `;
          searchInput = container.querySelector("#launchpad-search-input");
          appsGrid = container.querySelector("#launchpad-apps-grid");
          if (searchInput) {
            searchInput.addEventListener("input", handleSearch);
          }
        }
        function loadApps() {
          if (!global.WindowManager) {
            console.warn("LaunchpadSystem: WindowManager not available");
            return;
          }
          const windowIds = global.WindowManager.getAllWindowIds();
          allApps = [];
          windowIds.forEach((windowId) => {
            const config = global.WindowManager.getConfig(windowId);
            const programInfo = global.WindowManager.getProgramInfo(windowId);
            if (config && config.type === "transient") {
              return;
            }
            if (windowId === "launchpad-modal") {
              return;
            }
            if (programInfo) {
              allApps.push({
                id: windowId,
                name: programInfo.programLabel || translate2("programs.default.label", "App"),
                icon: programInfo.icon || "./img/sucher.png",
                programKey: config ? config.programKey : null
              });
            }
          });
          filteredApps = [...allApps];
          renderApps();
        }
        function handleSearch(event) {
          const query2 = event.target.value.toLowerCase().trim();
          if (!query2) {
            filteredApps = [...allApps];
          } else {
            filteredApps = allApps.filter((app) => app.name.toLowerCase().includes(query2));
          }
          renderApps();
        }
        function renderApps() {
          if (!appsGrid) return;
          appsGrid.innerHTML = "";
          if (filteredApps.length === 0) {
            appsGrid.innerHTML = `
                <div class="launchpad-empty">
                    <p>${translate2("finder.empty", "No apps found")}</p>
                </div>
            `;
            return;
          }
          filteredApps.forEach((app) => {
            const appButton = document.createElement("button");
            appButton.className = "launchpad-app-button";
            appButton.setAttribute("data-window-id", app.id);
            appButton.setAttribute("data-action", "launchpadOpenWindow");
            appButton.title = app.name;
            const iconContainer = document.createElement("div");
            iconContainer.className = "launchpad-app-icon";
            const isImagePath = typeof app.icon === "string" && /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(app.icon);
            if (isImagePath || typeof app.icon === "string" && (app.icon.startsWith("./") || app.icon.startsWith("http"))) {
              const icon = document.createElement("img");
              icon.src = app.icon;
              icon.alt = app.name;
              icon.draggable = false;
              iconContainer.appendChild(icon);
            } else if (typeof app.icon === "string" && app.icon.trim().length) {
              const emoji = document.createElement("div");
              emoji.className = "launchpad-app-emoji";
              emoji.textContent = app.icon;
              iconContainer.appendChild(emoji);
            } else {
              const fallback = document.createElement("img");
              fallback.src = "./img/sucher.png";
              fallback.alt = app.name;
              fallback.draggable = false;
              iconContainer.appendChild(fallback);
            }
            const label = document.createElement("span");
            label.className = "launchpad-app-label";
            label.textContent = app.name;
            appButton.appendChild(iconContainer);
            appButton.appendChild(label);
            appsGrid.appendChild(appButton);
          });
        }
        function openApp(windowId) {
          if (!windowId) return;
          const launchpadModal = document.getElementById("launchpad-modal");
          if (launchpadModal && global.dialogs && global.dialogs["launchpad-modal"]) {
            global.dialogs["launchpad-modal"].close();
          } else if (launchpadModal) {
            launchpadModal.classList.add("hidden");
          }
          if (global.WindowManager && typeof global.WindowManager.open === "function") {
            global.WindowManager.open(windowId);
            return;
          }
          const dialog = global.dialogs && global.dialogs[windowId];
          if (dialog && typeof dialog.open === "function") {
            dialog.open();
          } else {
            const modalElement = document.getElementById(windowId);
            if (modalElement) {
              modalElement.classList.remove("hidden");
              if (typeof global.bringDialogToFront === "function") {
                global.bringDialogToFront(windowId);
              }
              if (typeof global.updateProgramLabelByTopModal === "function") {
                global.updateProgramLabelByTopModal();
              }
            }
          }
        }
        function refresh() {
          loadApps();
        }
        function clearSearch() {
          if (searchInput) {
            searchInput.value = "";
          }
          filteredApps = [...allApps];
          renderApps();
        }
        global.addEventListener("languagePreferenceChange", () => {
          if (container) {
            loadApps();
          }
        });
        if (global.ActionBus && typeof global.ActionBus.register === "function") {
          global.ActionBus.register("launchpadOpenWindow", (params) => {
            const id = (params == null ? void 0 : params.windowId) || (params == null ? void 0 : params.windowid) || (params == null ? void 0 : params.window) || (params == null ? void 0 : params.id);
            if (id) openApp(id);
          });
        }
        global.LaunchpadSystem = {
          init,
          refresh,
          clearSearch,
          get container() {
            return container;
          }
        };
      })(window);
    }
  });

  // src/ts/multi-instance-integration.ts
  var require_multi_instance_integration = __commonJS({
    "src/ts/multi-instance-integration.ts"() {
      "use strict";
      (() => {
        "use strict";
        class MultiInstanceIntegration {
          constructor() {
            this.integrations = /* @__PURE__ */ new Map();
            this.isInitialized = false;
          }
          init() {
            if (this.isInitialized) return;
            if (document.readyState === "loading") {
              document.addEventListener("DOMContentLoaded", () => this.setup());
            } else {
              this.setup();
            }
          }
          setup() {
            const W = window;
            if (!W.InstanceManager || !W.WindowTabs || !W.KeyboardShortcuts) {
              console.error("MultiInstanceIntegration: Required dependencies not loaded");
              return;
            }
            if (W.TerminalInstanceManager) this.setupTerminalIntegration();
            if (W.TextEditorInstanceManager) this.setupTextEditorIntegration();
            if (W.FinderInstanceManager) this.setupFinderIntegration();
            if (W.SessionManager) {
              if (W.TerminalInstanceManager)
                W.SessionManager.registerManager("terminal", W.TerminalInstanceManager);
              if (W.TextEditorInstanceManager)
                W.SessionManager.registerManager("text-editor", W.TextEditorInstanceManager);
              if (W.FinderInstanceManager)
                W.SessionManager.registerManager("finder", W.FinderInstanceManager);
              if (typeof W.SessionManager.restoreSession === "function") {
                W.SessionManager.restoreSession();
              }
              this.integrations.forEach((integration2, type) => {
                var _a;
                const { manager, tabManager } = integration2;
                try {
                  const maybe = tabManager;
                  const refreshFn = typeof (maybe == null ? void 0 : maybe.refresh) === "function" ? maybe.refresh.bind(maybe) : typeof ((_a = maybe == null ? void 0 : maybe.controller) == null ? void 0 : _a.refresh) === "function" ? maybe.controller.refresh.bind(maybe.controller) : null;
                  if (refreshFn) refreshFn();
                } catch {
                }
                try {
                  const raw = localStorage.getItem("windowActiveInstances");
                  if (raw) {
                    const map = JSON.parse(raw);
                    const wanted = (map == null ? void 0 : map[type]) || null;
                    if (wanted && typeof manager.setActiveInstance === "function") {
                      const exists = manager.getAllInstances().some((i) => i.instanceId === wanted);
                      if (exists) manager.setActiveInstance(wanted);
                    }
                  }
                } catch {
                }
                const active = manager.getActiveInstance();
                if (active) this.showInstance(type, active.instanceId);
              });
              W.SessionManager.init();
            }
            if (W.KeyboardShortcuts && typeof W.KeyboardShortcuts.setContextResolver === "function") {
              W.KeyboardShortcuts.setContextResolver(() => {
                try {
                  const wm = W.WindowManager;
                  const top = wm && typeof wm.getTopWindow === "function" ? wm.getTopWindow() : null;
                  const topId = (top == null ? void 0 : top.id) || "";
                  let match = "global";
                  this.integrations.forEach((val, key) => {
                    if (val && val.modalId === topId) match = key;
                  });
                  return match;
                } catch {
                  return "global";
                }
              });
            }
            this.isInitialized = true;
          }
          setupTerminalIntegration() {
            const W = window;
            const manager = W.TerminalInstanceManager;
            const origSetActive = manager.setActiveInstance.bind(manager);
            manager.setActiveInstance = (id) => {
              origSetActive(id);
              this.showInstance("terminal", id);
            };
            const origDestroy = manager.destroyInstance.bind(manager);
            manager.destroyInstance = (id) => {
              origDestroy(id);
              const remaining = manager.getAllInstances().length;
              if (remaining > 0) {
                const active = manager.getActiveInstance();
                if (active) this.showInstance("terminal", active.instanceId);
              }
            };
            const mount = document.getElementById("terminal-tabs-container");
            if (!mount) return;
            const controller = W.WindowTabs.create(manager, mount, {
              addButton: true,
              onCreateInstanceTitle: () => {
                var _a;
                return `Terminal ${(((_a = manager.getInstanceCount) == null ? void 0 : _a.call(manager)) || manager.getAllInstances().length) + 1}`;
              }
            });
            this.integrations.set("terminal", {
              manager,
              tabManager: controller,
              modalId: "terminal-modal",
              containerId: "terminal-container"
            });
            this.registerShortcutsForType("terminal", manager);
            this.updateInstanceVisibility("terminal");
            this.setupInstanceListeners("terminal");
          }
          setupTextEditorIntegration() {
            const W = window;
            const manager = W.TextEditorInstanceManager;
            const origSetActive = manager.setActiveInstance.bind(manager);
            manager.setActiveInstance = (id) => {
              origSetActive(id);
              this.showInstance("text-editor", id);
            };
            const origDestroy = manager.destroyInstance.bind(manager);
            manager.destroyInstance = (id) => {
              origDestroy(id);
              const remaining = manager.getAllInstances().length;
              if (remaining > 0) {
                const active = manager.getActiveInstance();
                if (active) this.showInstance("text-editor", active.instanceId);
              }
            };
            const mount = document.getElementById("text-editor-tabs-container");
            if (!mount) return;
            const controller = W.WindowTabs.create(manager, mount, {
              addButton: true,
              onCreateInstanceTitle: () => {
                var _a;
                return `Editor ${(((_a = manager.getInstanceCount) == null ? void 0 : _a.call(manager)) || manager.getAllInstances().length) + 1}`;
              }
            });
            this.integrations.set("text-editor", {
              manager,
              tabManager: controller,
              modalId: "text-modal",
              containerId: "text-editor-container"
            });
            this.registerShortcutsForType("text-editor", manager);
            this.updateInstanceVisibility("text-editor");
            this.setupInstanceListeners("text-editor");
          }
          setupFinderIntegration() {
            const W = window;
            const manager = W.FinderInstanceManager;
            const origSetActive = manager.setActiveInstance.bind(manager);
            manager.setActiveInstance = (id) => {
              origSetActive(id);
              this.showInstance("finder", id);
            };
            const origDestroy = manager.destroyInstance.bind(manager);
            manager.destroyInstance = (id) => {
              var _a, _b;
              origDestroy(id);
              const remaining = manager.getAllInstances().length;
              if (remaining === 0) {
                try {
                  const API = window.API;
                  if ((_a = API == null ? void 0 : API.window) == null ? void 0 : _a.close) API.window.close("finder-modal");
                  else (_b = document.getElementById("finder-modal")) == null ? void 0 : _b.classList.add("hidden");
                } catch {
                }
              } else {
                const active = manager.getActiveInstance();
                if (active) this.showInstance("finder", active.instanceId);
              }
            };
            const mount = document.getElementById("finder-tabs-container");
            if (!mount) return;
            const controller = W.WindowTabs.create(manager, mount, {
              addButton: true,
              onCreateInstanceTitle: () => {
                var _a;
                return `Finder ${(((_a = manager.getInstanceCount) == null ? void 0 : _a.call(manager)) || manager.getAllInstances().length) + 1}`;
              }
            });
            this.integrations.set("finder", {
              manager,
              tabManager: controller,
              modalId: "finder-modal",
              containerId: "finder-container"
            });
            this.registerShortcutsForType("finder", manager);
            this.updateInstanceVisibility("finder");
            this.setupInstanceListeners("finder");
          }
          setupInstanceListeners(type) {
            const integration2 = this.integrations.get(type);
            if (!integration2) return;
            const { manager } = integration2;
            const originalCreate = manager.createInstance.bind(manager);
            manager.createInstance = (config) => {
              const instance = originalCreate(config);
              const active = manager.getActiveInstance();
              if (active) {
                this.showInstance(type, active.instanceId);
              } else if (instance) {
                this.showInstance(type, instance.instanceId);
              }
              return instance;
            };
          }
          showInstance(type, instanceId) {
            const integration2 = this.integrations.get(type);
            if (!integration2) return;
            const instances = integration2.manager.getAllInstances();
            instances.forEach((inst) => {
              var _a, _b;
              if (inst.instanceId === instanceId) (_a = inst.show) == null ? void 0 : _a.call(inst);
              else (_b = inst.hide) == null ? void 0 : _b.call(inst);
            });
          }
          updateInstanceVisibility(type) {
            var _a;
            const integration2 = this.integrations.get(type);
            if (!integration2) return;
            const active = integration2.manager.getActiveInstance();
            if (active) {
              this.showInstance(type, active.instanceId);
            } else {
              const all = integration2.manager.getAllInstances();
              if (all.length > 0) {
                const firstId = (_a = all[0]) == null ? void 0 : _a.instanceId;
                if (firstId) {
                  integration2.manager.setActiveInstance(firstId);
                  this.showInstance(type, firstId);
                }
              }
            }
          }
          registerShortcutsForType(type, manager) {
            var _a;
            const W = window;
            const modalId = (_a = this.integrations.get(type)) == null ? void 0 : _a.modalId;
            const modalEl = modalId ? document.getElementById(modalId) : null;
            if (!modalEl) {
              console.error(`Cannot register shortcuts for ${type}: modal ${modalId} not found`);
              return;
            }
            const unregister = W.KeyboardShortcuts.register(manager, {
              scope: document,
              newTitleFactory: () => `${type} ${manager.getInstanceCount() + 1}`
            });
            const rec = this.integrations.get(type);
            if (rec) rec.unregisterShortcuts = unregister;
          }
        }
        const integration = new MultiInstanceIntegration();
        window.MultiInstanceIntegration = integration;
        window.multiInstanceIntegration = integration;
        integration.init();
      })();
    }
  });

  // src/ts/legacy/desktop.js
  var require_desktop = __commonJS({
    "src/ts/legacy/desktop.js"() {
      "use strict";
      (function(global) {
        "use strict";
        function translate2(key, fallback) {
          if (!global.appI18n || typeof global.appI18n.translate !== "function") {
            return fallback || key;
          }
          const result = global.appI18n.translate(key);
          if (result === key && fallback) return fallback;
          return result;
        }
        const DESKTOP_ITEMS = [
          // { id: 'about', modalId: 'about-modal', icon: './img/profil.jpg', labelKey: 'desktop.about', fallbackLabel: 'Über Marvin' },
          // Shortcut: Photos App
          {
            id: "photos",
            modalId: "image-modal",
            icon: "./img/photos-app-icon.svg",
            labelKey: "desktop.photos",
            fallbackLabel: "Fotos"
          },
          // Shortcut: GitHub "Ordner" öffnet den Finder direkt in der GitHub-Ansicht
          {
            id: "github",
            // Verwende Emoji-Icon für den Ordner, bis ein spezielles Icon vorhanden ist
            emoji: "\u{1F4C2}",
            labelKey: "desktop.github",
            fallbackLabel: "GitHub Projekte",
            onOpen: () => {
              var _a, _b, _c;
              if ((_b = (_a = window.API) == null ? void 0 : _a.window) == null ? void 0 : _b.open) {
                window.API.window.open("finder-modal");
              } else {
                const modal = document.getElementById("finder-modal");
                if (modal) modal.classList.remove("hidden");
              }
              if (window.FinderInstanceManager) {
                if (!window.FinderInstanceManager.hasInstances()) {
                  window.FinderInstanceManager.createInstance({ title: "Finder" });
                }
                const active = window.FinderInstanceManager.getActiveInstance() || window.FinderInstanceManager.getAllInstances()[0];
                if (active && typeof active.switchView === "function") {
                  active.switchView("github");
                  window.FinderInstanceManager.setActiveInstance(active.instanceId);
                  if ((_c = window.MultiInstanceIntegration) == null ? void 0 : _c.showInstance) {
                    window.MultiInstanceIntegration.showInstance(
                      "finder",
                      active.instanceId
                    );
                  } else if (typeof active.show === "function") {
                    active.show();
                  }
                }
                return true;
              }
              if (window.FinderSystem && typeof window.FinderSystem.navigateTo === "function") {
                window.FinderSystem.navigateTo([], "github");
                return true;
              }
              return false;
            }
          }
        ];
        const desktopItemsById = /* @__PURE__ */ new Map();
        const desktopButtons = /* @__PURE__ */ new Map();
        let desktopSelectedItemId = null;
        const desktopSelectedIds = /* @__PURE__ */ new Set();
        let desktopLastFocusedIndex = -1;
        let desktopSuppressBackgroundClick = false;
        function updateDesktopSelectionUI() {
          if (desktopLastFocusedIndex >= 0 && DESKTOP_ITEMS[desktopLastFocusedIndex]) {
            desktopSelectedItemId = DESKTOP_ITEMS[desktopLastFocusedIndex].id;
          } else {
            desktopSelectedItemId = desktopSelectedIds.size === 1 ? Array.from(desktopSelectedIds)[0] : null;
          }
          desktopButtons.forEach((btn, id) => {
            if (desktopSelectedIds.has(id)) {
              btn.dataset.selected = "true";
              btn.setAttribute("aria-selected", "true");
            } else {
              btn.removeAttribute("data-selected");
              btn.setAttribute("aria-selected", "false");
            }
          });
        }
        function getDesktopAreaElement() {
          return document.getElementById("desktop");
        }
        function getDesktopContainerElement() {
          return document.getElementById("desktop-icons");
        }
        function createDesktopButton(item, index) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "desktop-icon-button no-select";
          button.dataset.desktopItemId = item.id;
          button.dataset.desktopIndex = String(index);
          button.setAttribute("data-action-dblclick", "openDesktopItem");
          button.setAttribute("data-item-id", item.id);
          button.setAttribute("role", "option");
          button.setAttribute("aria-selected", "false");
          button.setAttribute("data-i18n-title", item.labelKey);
          button.setAttribute("data-i18n-aria-label", item.labelKey);
          const labelText = translate2(item.labelKey, item.fallbackLabel);
          button.title = labelText;
          button.setAttribute("aria-label", labelText);
          button.draggable = false;
          const graphic = document.createElement("span");
          graphic.className = "desktop-icon-graphic";
          if (item.icon) {
            const img = document.createElement("img");
            img.src = item.icon;
            img.alt = "";
            img.decoding = "async";
            img.referrerPolicy = "no-referrer";
            img.draggable = false;
            graphic.appendChild(img);
          } else if (item.emoji) {
            graphic.textContent = item.emoji;
          }
          button.appendChild(graphic);
          const label = document.createElement("span");
          label.className = "desktop-icon-label no-select";
          label.textContent = labelText;
          label.setAttribute("data-i18n", item.labelKey);
          button.appendChild(label);
          button.addEventListener("pointerdown", (event) => {
            if (!event) return;
            if (event.pointerType) {
              button.dataset.activePointerType = event.pointerType;
            } else {
              delete button.dataset.activePointerType;
            }
          });
          button.addEventListener(
            "touchstart",
            () => {
              button.dataset.activePointerType = "touch";
            },
            { passive: true }
          );
          button.addEventListener("mousedown", () => {
            button.dataset.activePointerType = "mouse";
          });
          button.addEventListener("click", (event) => {
            event.preventDefault();
            const index2 = Number(button.dataset.desktopIndex || 0);
            const isMeta = event.ctrlKey || event.metaKey;
            const isShift = event.shiftKey;
            if (isShift && desktopLastFocusedIndex >= 0) {
              const start = Math.min(desktopLastFocusedIndex, index2);
              const end = Math.max(desktopLastFocusedIndex, index2);
              for (let i = start; i <= end; i++) {
                const id = DESKTOP_ITEMS[i] && DESKTOP_ITEMS[i].id || null;
                if (id) desktopSelectedIds.add(id);
              }
              desktopLastFocusedIndex = index2;
              updateDesktopSelectionUI();
            } else if (isMeta) {
              if (desktopSelectedIds.has(item.id)) desktopSelectedIds.delete(item.id);
              else desktopSelectedIds.add(item.id);
              desktopLastFocusedIndex = index2;
              updateDesktopSelectionUI();
            } else {
              desktopSelectedIds.clear();
              desktopSelectedIds.add(item.id);
              desktopLastFocusedIndex = index2;
              updateDesktopSelectionUI();
            }
            const pointerType = button.dataset.activePointerType || "";
            const shouldOpenOnSingleTap = pointerType === "touch" || pointerType === "pen";
            if (shouldOpenOnSingleTap) {
              openDesktopItemById(item.id);
            }
            delete button.dataset.activePointerType;
          });
          button.addEventListener("keydown", handleDesktopKeydown);
          button.addEventListener("focus", () => {
            selectDesktopItem(item.id, { focus: false });
          });
          return button;
        }
        function renderDesktopIcons() {
          const container = getDesktopContainerElement();
          if (!container) return;
          container.innerHTML = "";
          desktopItemsById.clear();
          desktopButtons.clear();
          DESKTOP_ITEMS.forEach((item, index) => {
            desktopItemsById.set(item.id, item);
            const button = createDesktopButton(item, index);
            desktopButtons.set(item.id, button);
            container.appendChild(button);
          });
          if (global.appI18n && typeof global.appI18n.applyTranslations === "function") {
            global.appI18n.applyTranslations(container);
          }
        }
        function selectDesktopItem(itemId, options = {}) {
          const { focus = true } = options;
          if (desktopSelectedItemId && desktopSelectedItemId === itemId) {
            if (focus && desktopButtons.has(itemId)) {
              const btn = desktopButtons.get(itemId);
              if (typeof btn.focus === "function") {
                try {
                  btn.focus({ preventScroll: true });
                } catch {
                  btn.focus();
                }
              }
            }
            return;
          }
          if (desktopSelectedItemId && desktopButtons.has(desktopSelectedItemId)) {
            const previousButton = desktopButtons.get(desktopSelectedItemId);
            previousButton.removeAttribute("data-selected");
            previousButton.setAttribute("aria-selected", "false");
          }
          desktopSelectedIds.clear();
          if (itemId) desktopSelectedIds.add(itemId);
          desktopLastFocusedIndex = DESKTOP_ITEMS.findIndex((entry) => entry.id === itemId);
          updateDesktopSelectionUI();
          if (focus && itemId && desktopButtons.has(itemId)) {
            const nextButton = desktopButtons.get(itemId);
            if (typeof nextButton.focus === "function") {
              try {
                nextButton.focus({ preventScroll: true });
              } catch {
                nextButton.focus();
              }
            }
          }
        }
        function clearDesktopSelection(options = {}) {
          const { blur = false } = options;
          const hadSelection = desktopSelectedIds.size > 0 || desktopSelectedItemId !== null;
          desktopSelectedIds.clear();
          desktopLastFocusedIndex = -1;
          desktopSelectedItemId = null;
          desktopButtons.forEach((btn) => {
            btn.removeAttribute("data-selected");
            btn.setAttribute("aria-selected", "false");
          });
          if (!hadSelection) return;
          if (blur) {
            const prev = document.querySelector('.desktop-icon-button[aria-selected="true"]');
            if (prev && typeof prev.blur === "function") prev.blur();
          }
        }
        function focusDesktopItemByIndex(index) {
          if (!Array.isArray(DESKTOP_ITEMS) || DESKTOP_ITEMS.length === 0) return;
          if (index < 0) index = 0;
          if (index >= DESKTOP_ITEMS.length) index = DESKTOP_ITEMS.length - 1;
          const item = DESKTOP_ITEMS[index];
          if (!item) return;
          selectDesktopItem(item.id, { focus: true });
        }
        function moveDesktopSelection(offset) {
          if (!offset) return;
          if (!Array.isArray(DESKTOP_ITEMS) || DESKTOP_ITEMS.length === 0) return;
          const currentIndex = desktopSelectedItemId ? DESKTOP_ITEMS.findIndex((entry) => entry.id === desktopSelectedItemId) : -1;
          let targetIndex;
          if (currentIndex === -1) {
            targetIndex = offset > 0 ? 0 : DESKTOP_ITEMS.length - 1;
          } else {
            targetIndex = currentIndex + offset;
            if (targetIndex < 0) targetIndex = 0;
            if (targetIndex >= DESKTOP_ITEMS.length) targetIndex = DESKTOP_ITEMS.length - 1;
          }
          focusDesktopItemByIndex(targetIndex);
        }
        function openDesktopItem(item) {
          if (!item) return false;
          if (typeof item.onOpen === "function") return !!item.onOpen(item);
          if (item.modalId) {
            const dialog = global.dialogs && global.dialogs[item.modalId];
            if (dialog && typeof dialog.open === "function") {
              dialog.open();
              return true;
            }
            const modalElement = document.getElementById(item.modalId);
            if (modalElement) {
              modalElement.classList.remove("hidden");
              if (typeof global.bringDialogToFront === "function") {
                global.bringDialogToFront(item.modalId);
              }
              if (typeof global.updateProgramLabelByTopModal === "function") {
                global.updateProgramLabelByTopModal();
              }
              return true;
            }
          }
          if (item.href) {
            const target = item.target || "_blank";
            global.open(item.href, target, "noopener");
            return true;
          }
          return false;
        }
        function openDesktopItemById(itemId) {
          if (!itemId) return false;
          const item = desktopItemsById.get(itemId);
          if (!item) return false;
          selectDesktopItem(itemId, { focus: true });
          return openDesktopItem(item);
        }
        function handleDesktopKeydown(event) {
          const { key } = event;
          const target = event.currentTarget;
          if (!target || !target.dataset) return;
          const itemId = target.dataset.desktopItemId;
          if (!itemId) return;
          switch (key) {
            case "Enter":
            case " ":
              event.preventDefault();
              openDesktopItemById(itemId);
              return;
            case "ArrowDown":
            case "ArrowRight":
              event.preventDefault();
              moveDesktopSelection(1);
              return;
            case "ArrowUp":
            case "ArrowLeft":
              event.preventDefault();
              moveDesktopSelection(-1);
              return;
            case "Home":
              event.preventDefault();
              focusDesktopItemByIndex(0);
              return;
            case "End":
              event.preventDefault();
              focusDesktopItemByIndex(DESKTOP_ITEMS.length - 1);
              return;
            case "Escape":
              event.preventDefault();
              clearDesktopSelection({ blur: true });
              return;
            default:
              break;
          }
        }
        function handleDesktopBackgroundPointer(event) {
          if (event && typeof event.button === "number" && event.button !== 0) return;
          if (desktopSuppressBackgroundClick) return;
          if (event && event.target && event.target.closest(".desktop-icon-button")) return;
          clearDesktopSelection({ blur: true });
        }
        function initDesktop() {
          renderDesktopIcons();
          const desktopArea = getDesktopAreaElement();
          if (desktopArea) {
            desktopArea.addEventListener("click", handleDesktopBackgroundPointer);
            desktopArea.addEventListener("touchstart", handleDesktopBackgroundPointer, {
              passive: true
            });
            let rubber = null;
            let rubberStart = null;
            const onPointerMove = (e) => {
              if (!rubber || !rubberStart) return;
              const x1 = Math.min(rubberStart.x, e.clientX);
              const y1 = Math.min(rubberStart.y, e.clientY);
              const x2 = Math.max(rubberStart.x, e.clientX);
              const y2 = Math.max(rubberStart.y, e.clientY);
              rubber.style.left = x1 + "px";
              rubber.style.top = y1 + "px";
              rubber.style.width = x2 - x1 + "px";
              rubber.style.height = y2 - y1 + "px";
              desktopButtons.forEach((btn) => {
                const rect = btn.getBoundingClientRect();
                const intersects = !(rect.right < x1 || rect.left > x2 || rect.bottom < y1 || rect.top > y2);
                if (intersects) btn.classList.add("rubber-selected");
                else btn.classList.remove("rubber-selected");
              });
            };
            const onPointerUp = (e) => {
              if (!rubber || !rubberStart) return;
              const selected = [];
              desktopButtons.forEach((btn, id) => {
                if (btn.classList.contains("rubber-selected")) {
                  selected.push(id);
                  btn.classList.remove("rubber-selected");
                }
              });
              if (e.ctrlKey || e.metaKey) {
                selected.forEach((id) => {
                  if (desktopSelectedIds.has(id)) desktopSelectedIds.delete(id);
                  else desktopSelectedIds.add(id);
                });
              } else {
                desktopSelectedIds.clear();
                selected.forEach((id) => desktopSelectedIds.add(id));
              }
              if (selected.length > 0) {
                const lastId = selected[selected.length - 1];
                desktopLastFocusedIndex = DESKTOP_ITEMS.findIndex((entry) => entry.id === lastId);
              }
              updateDesktopSelectionUI();
              cleanupRubber();
            };
            const onPointerCancel = () => cleanupRubber();
            const onWindowBlur = () => cleanupRubber();
            const onVisibilityChange = () => {
              if (document.visibilityState !== "visible") cleanupRubber();
            };
            const cleanupRubber = () => {
              if (!rubber) return;
              desktopButtons.forEach((btn) => btn.classList.remove("rubber-selected"));
              try {
                rubber.remove();
              } catch {
              }
              rubber = null;
              rubberStart = null;
              window.removeEventListener("pointermove", onPointerMove);
              window.removeEventListener("pointerup", onPointerUp);
              window.removeEventListener("pointercancel", onPointerCancel);
              window.removeEventListener("blur", onWindowBlur);
              document.removeEventListener("visibilitychange", onVisibilityChange);
              desktopSuppressBackgroundClick = true;
              setTimeout(() => {
                desktopSuppressBackgroundClick = false;
              }, 120);
            };
            desktopArea.addEventListener("pointerdown", (e) => {
              if (e.button !== 0) return;
              if (e.target && e.target.closest && e.target.closest(".desktop-icon-button"))
                return;
              rubberStart = { x: e.clientX, y: e.clientY };
              rubber = document.createElement("div");
              rubber.className = "desktop-rubberband";
              Object.assign(rubber.style, {
                position: "fixed",
                left: rubberStart.x + "px",
                top: rubberStart.y + "px",
                width: "0px",
                height: "0px",
                zIndex: 99999,
                border: "1px dashed rgba(255,255,255,0.6)",
                background: "rgba(59,130,246,0.12)",
                pointerEvents: "none"
              });
              document.body.appendChild(rubber);
              desktopSuppressBackgroundClick = true;
              window.addEventListener("pointermove", onPointerMove);
              window.addEventListener("pointerup", onPointerUp);
              window.addEventListener("pointercancel", onPointerCancel);
              window.addEventListener("blur", onWindowBlur);
              document.addEventListener("visibilitychange", onVisibilityChange);
            });
          }
        }
        global.DesktopSystem = {
          initDesktop,
          renderDesktopIcons,
          selectDesktopItem,
          moveDesktopSelection,
          openDesktopItemById,
          clearDesktopSelection
        };
      })(window);
    }
  });

  // src/ts/legacy/system.js
  var require_system = __commonJS({
    "src/ts/legacy/system.js"() {
      "use strict";
      (function() {
        "use strict";
        console.log("\u2705 SystemUI loaded");
        const appI18n = window.appI18n || {
          translate: (key) => key,
          applyTranslations: () => {
          },
          getActiveLanguage: () => "en"
        };
        const IconSystem = window.IconSystem || {};
        const SYSTEM_ICONS = IconSystem.SYSTEM_ICONS || {};
        const ensureSvgNamespace = IconSystem.ensureSvgNamespace || ((svg) => svg);
        const renderIconIntoElement = IconSystem.renderIconIntoElement || (() => {
        });
        const ThemeSystem = window.ThemeSystem || {};
        const setThemePreference = ThemeSystem.setThemePreference || (() => {
        });
        const hideMenuDropdowns = window.hideMenuDropdowns || (() => {
          document.querySelectorAll(".menu-dropdown").forEach((dropdown) => {
            if (!dropdown.classList.contains("hidden")) {
              dropdown.classList.add("hidden");
            }
          });
          document.querySelectorAll('[data-menubar-trigger-button="true"]').forEach((button) => {
            button.setAttribute("aria-expanded", "false");
          });
          document.querySelectorAll("[data-system-menu-trigger]").forEach((button) => {
            button.setAttribute("aria-expanded", "false");
          });
        });
        const systemStatus = {
          wifi: true,
          bluetooth: true,
          focus: false,
          darkMode: document.documentElement.classList.contains("dark"),
          brightness: 80,
          volume: 65,
          audioDevice: "speakers",
          network: "HomeLAN",
          battery: 100,
          connectedBluetoothDevice: "AirPods"
        };
        function applySystemIcon(iconToken, iconKey) {
          const svg = SYSTEM_ICONS[iconKey];
          const markup = svg ? ensureSvgNamespace(svg) : "";
          document.querySelectorAll(`[data-icon="${iconToken}"]`).forEach((el) => {
            renderIconIntoElement(el, markup, iconToken);
          });
        }
        function updateSystemStateText(stateKey, text) {
          document.querySelectorAll(`[data-state="${stateKey}"]`).forEach((el) => {
            el.textContent = text !== null && text !== void 0 ? String(text) : "";
          });
        }
        function updateSystemToggleState(toggleKey, active) {
          const toggle2 = document.querySelector(`[data-system-toggle="${toggleKey}"]`);
          if (toggle2) {
            toggle2.classList.toggle("is-active", !!active);
            toggle2.setAttribute("aria-pressed", active ? "true" : "false");
          }
        }
        function updateSystemMenuCheckbox(actionKey, checked) {
          const checkbox = document.querySelector(`[data-system-action="${actionKey}"]`);
          if (checkbox) {
            checkbox.setAttribute("aria-pressed", checked ? "true" : "false");
            checkbox.classList.toggle("is-active", !!checked);
          }
        }
        function updateSystemSliderValue(type, value) {
          document.querySelectorAll(`[data-system-slider="${type}"]`).forEach((slider) => {
            if (Number(slider.value) !== value) {
              slider.value = value;
            }
          });
          document.querySelectorAll(`[data-state="${type}"]`).forEach((label) => {
            label.textContent = `${value}%`;
          });
        }
        function updateWifiUI() {
          const iconKey = systemStatus.wifi ? "wifiOn" : "wifiOff";
          applySystemIcon("wifi", iconKey);
          updateSystemStateText(
            "wifi",
            appI18n.translate(systemStatus.wifi ? "menubar.state.on" : "menubar.state.off")
          );
          updateSystemToggleState("wifi", systemStatus.wifi);
          updateSystemMenuCheckbox("toggle-wifi", systemStatus.wifi);
          document.querySelectorAll("#wifi-menu [data-network]").forEach((btn) => {
            const disabled = !systemStatus.wifi;
            if (disabled) {
              btn.setAttribute("aria-disabled", "true");
            } else {
              btn.removeAttribute("aria-disabled");
            }
          });
          setConnectedNetwork(systemStatus.network, { silent: true });
        }
        function updateBluetoothUI() {
          const iconKey = systemStatus.bluetooth ? "bluetoothOn" : "bluetoothOff";
          applySystemIcon("bluetooth", iconKey);
          updateSystemStateText(
            "bluetooth",
            appI18n.translate(systemStatus.bluetooth ? "menubar.state.on" : "menubar.state.off")
          );
          updateSystemToggleState("bluetooth", systemStatus.bluetooth);
          updateSystemMenuCheckbox("toggle-bluetooth", systemStatus.bluetooth);
          const devices = document.querySelectorAll("#bluetooth-menu [data-device]");
          devices.forEach((btn) => {
            const indicator = btn.querySelector(".system-network-indicator");
            if (indicator && !indicator.dataset.default) {
              indicator.dataset.default = indicator.textContent || "";
            }
            const disabled = !systemStatus.bluetooth;
            if (disabled) {
              btn.setAttribute("aria-disabled", "true");
            } else {
              btn.removeAttribute("aria-disabled");
            }
          });
          setBluetoothDevice(systemStatus.connectedBluetoothDevice, {
            silent: true,
            syncAudio: false
          });
        }
        function updateFocusUI() {
          updateSystemToggleState("focus", systemStatus.focus);
          updateSystemStateText(
            "focus",
            appI18n.translate(systemStatus.focus ? "menubar.state.active" : "menubar.state.off")
          );
        }
        function updateDarkModeUI() {
          const isDark = systemStatus.darkMode;
          updateSystemToggleState("dark-mode", isDark);
          updateSystemStateText(
            "dark-mode",
            appI18n.translate(isDark ? "menubar.state.active" : "menubar.state.off")
          );
          applySystemIcon("appearance", isDark ? "appearanceDark" : "appearanceLight");
        }
        function updateVolumeUI() {
          const value = Math.max(0, Math.min(100, Number(systemStatus.volume) || 0));
          systemStatus.volume = value;
          let iconKey = "volumeMute";
          if (value === 0) {
            iconKey = "volumeMute";
          } else if (value <= 33) {
            iconKey = "volumeLow";
          } else if (value <= 66) {
            iconKey = "volumeMedium";
          } else {
            iconKey = "volumeHigh";
          }
          applySystemIcon("volume", iconKey);
          updateSystemSliderValue("volume", value);
        }
        function updateBrightnessUI() {
          const value = Math.max(0, Math.min(100, Number(systemStatus.brightness) || 0));
          systemStatus.brightness = value;
          updateSystemSliderValue("brightness", value);
        }
        function updateBatteryUI() {
          applySystemIcon("battery", "batteryFull");
          updateSystemStateText("battery", `${systemStatus.battery}%`);
        }
        function updateAudioDeviceUI() {
          const active = systemStatus.audioDevice;
          document.querySelectorAll("[data-audio-device]").forEach((btn) => {
            const isActive = btn.dataset.audioDevice === active;
            btn.setAttribute("aria-pressed", isActive ? "true" : "false");
            btn.classList.toggle("is-active", isActive);
          });
        }
        function setConnectedNetwork(network, options = {}) {
          if (network) {
            systemStatus.network = network;
          }
          const activeNetwork = systemStatus.network;
          document.querySelectorAll("#wifi-menu [data-network]").forEach((btn) => {
            const indicator = btn.querySelector(".system-network-indicator");
            if (indicator && !indicator.dataset.default) {
              indicator.dataset.default = indicator.textContent || "";
            }
            const isActive = !btn.hasAttribute("aria-disabled") && btn.dataset.network === activeNetwork && systemStatus.wifi;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-pressed", isActive ? "true" : "false");
            if (indicator) {
              if (!systemStatus.wifi) {
                indicator.textContent = indicator.dataset.default || "";
              } else if (isActive) {
                indicator.textContent = appI18n.translate("menubar.state.connected");
              } else {
                indicator.textContent = indicator.dataset.default || "";
              }
            }
          });
          if (!options.silent) {
            hideMenuDropdowns();
          }
        }
        function setBluetoothDevice(deviceName, options = {}) {
          const syncAudio = options.syncAudio !== false;
          if (deviceName) {
            systemStatus.connectedBluetoothDevice = deviceName;
            if (syncAudio && deviceName === "AirPods") {
              systemStatus.audioDevice = "airpods";
            }
          }
          const activeDevice = systemStatus.connectedBluetoothDevice;
          document.querySelectorAll("#bluetooth-menu [data-device]").forEach((btn) => {
            const indicator = btn.querySelector(".system-network-indicator");
            if (indicator && !indicator.dataset.default) {
              indicator.dataset.default = indicator.textContent || "";
            }
            const isActive = systemStatus.bluetooth && btn.dataset.device === activeDevice;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-pressed", isActive ? "true" : "false");
            if (indicator) {
              if (!systemStatus.bluetooth) {
                indicator.textContent = indicator.dataset.default || "";
              } else if (isActive) {
                indicator.textContent = appI18n.translate("menubar.state.connected");
              } else {
                indicator.textContent = indicator.dataset.default || "";
              }
            }
          });
          updateAudioDeviceUI();
          if (!options.silent) {
            hideMenuDropdowns();
          }
        }
        function setAudioDevice(deviceKey, options = {}) {
          if (!deviceKey) return;
          systemStatus.audioDevice = deviceKey;
          if (deviceKey === "airpods") {
            systemStatus.connectedBluetoothDevice = "AirPods";
          }
          updateAudioDeviceUI();
          updateBluetoothUI();
          if (!options.silent) {
            hideMenuDropdowns();
          }
        }
        function handleSystemToggle(toggleKey) {
          switch (toggleKey) {
            case "wifi":
              systemStatus.wifi = !systemStatus.wifi;
              updateWifiUI();
              break;
            case "bluetooth":
              systemStatus.bluetooth = !systemStatus.bluetooth;
              updateBluetoothUI();
              break;
            case "focus":
              systemStatus.focus = !systemStatus.focus;
              updateFocusUI();
              break;
            case "dark-mode": {
              const next = !document.documentElement.classList.contains("dark");
              systemStatus.darkMode = next;
              if (typeof setThemePreference === "function") {
                setThemePreference(next ? "dark" : "light");
              } else {
                document.documentElement.classList.toggle("dark", next);
              }
              updateDarkModeUI();
              break;
            }
            default:
              break;
          }
        }
        function handleSystemAction(actionKey) {
          switch (actionKey) {
            case "toggle-wifi":
              handleSystemToggle("wifi");
              break;
            case "toggle-bluetooth":
              handleSystemToggle("bluetooth");
              break;
            case "open-network":
            case "open-bluetooth":
            case "open-sound":
              if (window.dialogs && window.dialogs["settings-modal"]) {
                window.dialogs["settings-modal"].open();
              } else {
                console.info(`Aktion "${actionKey}" w\xFCrde Einstellungen \xF6ffnen.`);
              }
              hideMenuDropdowns();
              break;
            case "open-spotlight":
            case "open-siri":
              console.info(`Aktion "${actionKey}" ausgel\xF6st.`);
              hideMenuDropdowns();
              break;
            default:
              break;
          }
        }
        function handleSystemSliderInput(type, value) {
          if (!Number.isFinite(value)) return;
          if (type === "volume") {
            systemStatus.volume = value;
            updateVolumeUI();
          } else if (type === "brightness") {
            systemStatus.brightness = value;
            updateBrightnessUI();
          }
        }
        function updateAllSystemStatusUI() {
          applySystemIcon("sun", "sun");
          applySystemIcon("moon", "moon");
          updateWifiUI();
          updateBluetoothUI();
          updateFocusUI();
          updateDarkModeUI();
          updateVolumeUI();
          updateBrightnessUI();
          updateBatteryUI();
          updateAudioDeviceUI();
        }
        function initSystemStatusControls() {
          document.querySelectorAll(".system-network-indicator").forEach((indicator) => {
            indicator.dataset.default = indicator.textContent || "";
          });
          document.querySelectorAll("[data-system-menu-trigger]").forEach((trigger) => {
            if (typeof window.bindDropdownTrigger === "function") {
              window.bindDropdownTrigger(trigger, {
                hoverRequiresOpen: true
              });
            }
          });
          document.querySelectorAll("[data-system-toggle]").forEach((toggle2) => {
            toggle2.dataset.action = "system:toggle";
          });
          document.querySelectorAll("[data-system-slider]").forEach((slider) => {
            ["pointerdown", "mousedown", "touchstart"].forEach((evt) => {
              slider.addEventListener(evt, (e) => e.stopPropagation());
            });
            slider.addEventListener("input", (event) => {
              event.stopPropagation();
              const value = Number(slider.value);
              handleSystemSliderInput(slider.dataset.systemSlider, value);
            });
          });
          document.querySelectorAll("[data-system-action]").forEach((btn) => {
            btn.dataset.action = "system:action";
          });
          document.querySelectorAll("[data-audio-device]").forEach((btn) => {
            btn.dataset.action = "system:setAudioDevice";
          });
          document.querySelectorAll("[data-network]").forEach((btn) => {
            btn.dataset.action = "system:setNetwork";
          });
          document.querySelectorAll("[data-device]").forEach((btn) => {
            btn.dataset.action = "system:setBluetoothDevice";
          });
          updateAllSystemStatusUI();
        }
        window.SystemUI = {
          initSystemStatusControls,
          updateAllSystemStatusUI,
          handleSystemToggle,
          handleSystemAction,
          handleSystemSliderInput,
          setConnectedNetwork,
          setBluetoothDevice,
          setAudioDevice,
          getSystemStatus: () => Object.assign({}, systemStatus)
        };
      })();
    }
  });

  // src/ts/app-init.ts
  function initModalIds() {
    var _a, _b, _c, _d, _e, _f;
    const win = window;
    if (win.WindowManager) {
      const modalIds = ((_b = (_a = win.WindowManager).getAllWindowIds) == null ? void 0 : _b.call(_a)) || [];
      const transientIds = ((_d = (_c = win.WindowManager).getTransientWindowIds) == null ? void 0 : _d.call(_c)) || [];
      return {
        modalIds,
        transientModalIds: new Set(transientIds)
      };
    } else {
      const modalIds = ((_e = win.APP_CONSTANTS) == null ? void 0 : _e.MODAL_IDS) || [
        "finder-modal",
        "projects-modal",
        "about-modal",
        "settings-modal",
        "text-modal",
        "terminal-modal",
        "image-modal",
        "program-info-modal"
      ];
      const transientModalIds = ((_f = win.APP_CONSTANTS) == null ? void 0 : _f.TRANSIENT_MODAL_IDS) || /* @__PURE__ */ new Set(["program-info-modal"]);
      return { modalIds, transientModalIds };
    }
  }
  function initApp() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
    const win = window;
    const funcs = window;
    const { modalIds } = initModalIds();
    if (win.ActionBus) {
      (_b = (_a = win.ActionBus).init) == null ? void 0 : _b.call(_a);
    }
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", function(e) {
        var _a2, _b2, _c2;
        const target = e.target;
        if (e.target === modal || modal.contains(target)) {
          (_a2 = funcs.hideMenuDropdowns) == null ? void 0 : _a2.call(funcs);
          (_b2 = funcs.bringDialogToFront) == null ? void 0 : _b2.call(funcs, modal.id);
          (_c2 = funcs.updateProgramLabelByTopModal) == null ? void 0 : _c2.call(funcs);
        }
      });
    });
    const dialogs = window.dialogs || {};
    window.dialogs = dialogs;
    if (modalIds && Array.isArray(modalIds)) {
      modalIds.forEach((id) => {
        var _a2, _b2;
        const modal = document.getElementById(id);
        if (!modal || !win.Dialog) return;
        try {
          const dialogInstance = new win.Dialog(id);
          dialogs[id] = dialogInstance;
          if (win.WindowManager) {
            (_b2 = (_a2 = win.WindowManager).setDialogInstance) == null ? void 0 : _b2.call(_a2, id, dialogInstance);
          }
        } catch (err) {
          console.error(`Failed to create dialog instance for "${id}":`, err);
        }
      });
    }
    const launchpadModal = document.getElementById("launchpad-modal");
    if (launchpadModal) {
      launchpadModal.addEventListener("click", function(e) {
        var _a2;
        try {
          const inner = launchpadModal.querySelector(".launchpad-modal-inner");
          const target = e.target;
          if (inner ? !inner.contains(target) : target === launchpadModal) {
            const launchpadDialog = dialogs["launchpad-modal"];
            (_a2 = launchpadDialog == null ? void 0 : launchpadDialog.close) == null ? void 0 : _a2.call(launchpadDialog);
          }
        } catch {
        }
      });
      document.addEventListener(
        "click",
        function(e) {
          var _a2;
          try {
            if (launchpadModal.classList.contains("hidden")) return;
            const inner = launchpadModal.querySelector(".launchpad-modal-inner");
            const target = e.target;
            if (inner && inner.contains(target)) return;
            const launchpadDialog = dialogs["launchpad-modal"];
            (_a2 = launchpadDialog == null ? void 0 : launchpadDialog.close) == null ? void 0 : _a2.call(launchpadDialog);
          } catch {
          }
        },
        true
      );
    }
    (_c = funcs.syncTopZIndexWithDOM) == null ? void 0 : _c.call(funcs);
    (_d = funcs.restoreWindowPositions) == null ? void 0 : _d.call(funcs);
    (_e = funcs.restoreOpenModals) == null ? void 0 : _e.call(funcs);
    (_f = funcs.initSystemStatusControls) == null ? void 0 : _f.call(funcs);
    (_g = funcs.initDesktop) == null ? void 0 : _g.call(funcs);
    if (win.FinderSystem && typeof win.FinderSystem.init === "function") {
      win.FinderSystem.init();
    }
    if (win.SettingsSystem) {
      const settingsContainer = document.getElementById("settings-container");
      if (settingsContainer) {
        (_i = (_h = win.SettingsSystem).init) == null ? void 0 : _i.call(_h, settingsContainer);
      }
    }
    if (win.TextEditorSystem) {
      const textEditorContainer = document.getElementById("text-editor-container");
      if (textEditorContainer) {
        (_k = (_j = win.TextEditorSystem).init) == null ? void 0 : _k.call(_j, textEditorContainer);
      }
    }
    if (!win.TerminalInstanceManager && win.TerminalSystem) {
      const terminalContainer = document.getElementById("terminal-container");
      if (terminalContainer) {
        (_m = (_l = win.TerminalSystem).init) == null ? void 0 : _m.call(_l, terminalContainer);
      }
    }
    (_n = funcs.initDockMagnification) == null ? void 0 : _n.call(funcs);
    if (win.DockSystem && typeof win.DockSystem.initDockDragDrop === "function") {
      win.DockSystem.initDockDragDrop();
    }
    if (win.SessionManager) {
      try {
        (_p = (_o = win.SessionManager).init) == null ? void 0 : _p.call(_o);
        setTimeout(() => {
          var _a2;
          if ((_a2 = win.SessionManager) == null ? void 0 : _a2.restoreSession) {
            win.SessionManager.restoreSession();
          }
        }, 100);
      } catch (err) {
        console.warn("SessionManager initialization failed:", err);
      }
    }
    try {
      const dockEl = document.getElementById("dock");
      if (dockEl) {
        if (dockEl.classList.contains("hidden")) dockEl.classList.remove("hidden");
        dockEl.style.display = dockEl.style.display || "";
        dockEl.style.visibility = dockEl.style.visibility || "visible";
      }
    } catch {
    }
    try {
      const dockEl = document.getElementById("dock");
      if (dockEl && dockEl.parentElement && dockEl.parentElement !== document.body) {
        document.body.appendChild(dockEl);
        console.info("[APP-INIT] moved #dock to document.body to avoid hidden ancestor(s)");
      }
    } catch {
    }
    try {
      const ensureModalsInBody = () => {
        try {
          const modals = Array.from(document.querySelectorAll(".modal"));
          let moved = false;
          modals.forEach((m) => {
            if (m.parentElement && m.parentElement !== document.body) {
              document.body.appendChild(m);
              moved = true;
            }
          });
          if (moved)
            console.info(
              "[APP-INIT] reparented misplaced .modal elements to document.body"
            );
          return moved;
        } catch {
          return false;
        }
      };
      ensureModalsInBody();
      setTimeout(ensureModalsInBody, 50);
      setTimeout(ensureModalsInBody, 200);
      setTimeout(ensureModalsInBody, 500);
    } catch {
    }
    try {
      const dockEl = document.getElementById("dock");
      if (dockEl) {
        const rect = dockEl.getBoundingClientRect();
        const cs = window.getComputedStyle(dockEl);
        console.info("[APP-INIT] Dock debug:", {
          className: dockEl.className,
          display: cs.display,
          visibility: cs.visibility,
          opacity: cs.opacity,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
          inViewport: rect.top < (window.innerHeight || 0) && rect.bottom > 0
        });
        try {
          const dbg = JSON.stringify({
            className: dockEl.className,
            display: cs.display,
            visibility: cs.visibility,
            opacity: cs.opacity,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            inViewport: rect.top < (window.innerHeight || 0) && rect.bottom > 0
          });
          dockEl.setAttribute("data-dock-debug", dbg);
        } catch {
        }
      } else {
        console.info("[APP-INIT] Dock debug: element not found");
      }
    } catch (e) {
      console.warn("[APP-INIT] Dock debug failed", e);
    }
    const gw = window;
    function markReady() {
      try {
        const ensureDockInBody = () => {
          try {
            const dockEl = document.getElementById("dock");
            if (dockEl && dockEl.parentElement && dockEl.parentElement !== document.body) {
              document.body.appendChild(dockEl);
              console.info("[APP-INIT] moved #dock to document.body (ensured at load)");
              return true;
            }
          } catch {
          }
          return false;
        };
        ensureDockInBody();
        setTimeout(ensureDockInBody, 50);
        setTimeout(ensureDockInBody, 200);
        setTimeout(ensureDockInBody, 500);
        gw.__APP_READY = true;
        console.info("[APP-INIT] __APP_READY=true");
      } catch {
      }
    }
    if (document.readyState === "complete") {
      markReady();
    } else {
      window.addEventListener("load", markReady, { once: true });
      setTimeout(() => {
        if (!gw.__APP_READY) {
          console.warn(
            "[APP-INIT] load event not observed within timeout; forcing __APP_READY"
          );
          markReady();
        }
      }, 4e3);
    }
  }
  var init_app_init = __esm({
    "src/ts/app-init.ts"() {
      "use strict";
      (() => {
        if (typeof window.initApp !== "function") {
          window.initApp = initApp;
        }
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", initApp);
        } else {
          initApp();
        }
      })();
    }
  });

  // src/ts/compat/expose-globals.ts
  var require_expose_globals = __commonJS({
    "src/ts/compat/expose-globals.ts"() {
      init_dom_utils();
      init_constants();
      var import_api = __toESM(require_api());
      var import_window_manager = __toESM(require_window_manager());
      var import_action_bus = __toESM(require_action_bus());
      init_dialog_utils();
      var import_snap_utils = __toESM(require_snap_utils());
      var import_program_actions = __toESM(require_program_actions());
      var import_program_menu_sync = __toESM(require_program_menu_sync());
      init_menu();
      init_dock();
      init_dialog();
      var import_menubar_utils = __toESM(require_menubar_utils());
      init_context_menu();
      var import_storage = __toESM(require_storage());
      var import_session_manager = __toESM(require_session_manager());
      var import_theme = __toESM(require_theme());
      init_base_window_instance();
      var import_instance_manager = __toESM(require_instance_manager());
      var import_window_chrome = __toESM(require_window_chrome());
      var import_window_tabs = __toESM(require_window_tabs());
      var import_terminal_instance = __toESM(require_terminal_instance());
      var import_text_editor_instance = __toESM(require_text_editor_instance());
      var import_text_editor = __toESM(require_text_editor());
      init_settings();
      var import_image_viewer_utils = __toESM(require_image_viewer_utils());
      init_logger();
      var import_keyboard_shortcuts = __toESM(require_keyboard_shortcuts());
      var import_github_api = __toESM(require_github_api());
      var import_photos_app = __toESM(require_photos_app());
      var import_window_configs = __toESM(require_window_configs());
      var import_finder_instance = __toESM(require_finder_instance());
      var import_launchpad = __toESM(require_launchpad());
      var import_multi_instance_integration = __toESM(require_multi_instance_integration());
      var import_desktop = __toESM(require_desktop());
      var import_system = __toESM(require_system());
      init_app_init();
      console.log("[BUNDLE] expose-globals.ts loading...");
      var w = window;
      if (!("DOMUtils" in w)) {
        w["DOMUtils"] = dom_utils_exports;
      }
      if (typeof w.initApp === "function") {
        console.log("[BUNDLE] Triggering initApp; readyState:", document.readyState);
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", w.initApp);
        } else {
          w.initApp();
        }
      } else {
        console.error("[BUNDLE] window.initApp is not defined; app initialization failed");
      }
      w.__BUNDLE_READY__ = true;
    }
  });
  return require_expose_globals();
})();
//# sourceMappingURL=app.bundle.js.map
