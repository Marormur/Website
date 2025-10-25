/**
 * WindowManager - Central registry for windows/modals with z-index and program metadata (TypeScript).
 * Mirrors js/window-manager.js behavior while adding types and preserving global API.
 */

(() => {
  'use strict';

  type WindowType = 'persistent' | 'transient';

  type DialogLike = {
    open?: () => void;
    close?: () => void;
    bringToFront?: () => void;
  } | null;

  type WindowConfigOptions = {
    id: string;
    type?: WindowType;
    programKey?: string;
    icon?: string;
    closeButtonId?: string | null;
    metadata?: Record<string, unknown>;
  };

  type ProgramInfo = {
    modalId: string | null;
    programLabel: string;
    infoLabel: string;
    fallbackInfoModalId: string;
    icon: string;
    about: Record<string, string>;
  };

  class WindowConfig {
    id: string;
    type: WindowType;
    programKey: string;
    icon: string;
    closeButtonId: string | null;
    dialogInstance: DialogLike;
    metadata: Record<string, unknown>;

    constructor(options: WindowConfigOptions) {
      this.id = options.id;
      this.type = options.type || 'persistent';
      this.programKey = options.programKey || 'programs.default';
      this.icon = options.icon || './img/sucher.png';
      this.closeButtonId = options.closeButtonId ?? null;
      this.dialogInstance = null;
      this.metadata = options.metadata || {};
    }

    isTransient(): boolean {
      return this.type === 'transient';
    }

    getProgramInfo(): ProgramInfo {
      const w = window as unknown as Record<string, unknown>;
      const i18n = (w['appI18n'] as { translate?: (k: string) => string } | undefined) || undefined;
      const translate = i18n?.translate || ((key: string) => key);

      const aboutFields = ['name', 'tagline', 'version', 'copyright'];
      const info: ProgramInfo = {
        modalId: this.id,
        programLabel: translate(`${this.programKey}.label`),
        infoLabel: translate(`${this.programKey}.infoLabel`),
        fallbackInfoModalId: (this.metadata.fallbackInfoModalId as string) || 'program-info-modal',
        icon: this.icon,
        about: {},
      };
      aboutFields.forEach((field) => {
        info.about[field] = translate(`${this.programKey}.about.${field}`);
      });
      return info;
    }
  }

  const windowRegistry = new Map<string, WindowConfig>();
  const baseZIndex = 1000;
  let topZIndex = 1000;

  const WindowManager = {
    register(config: WindowConfigOptions): WindowConfig {
      const windowConfig = new WindowConfig(config);
      windowRegistry.set(config.id, windowConfig);
      return windowConfig;
    },

    registerAll(configs: WindowConfigOptions[]): void {
      configs.forEach((c) => this.register(c));
    },

    getConfig(windowId: string): WindowConfig | null {
      return windowRegistry.get(windowId) || null;
    },

    getAllWindowIds(): string[] {
      return Array.from(windowRegistry.keys());
    },

    getPersistentWindowIds(): string[] {
      return this.getAllWindowIds().filter((id) => {
        const config = this.getConfig(id);
        return !!config && !config.isTransient();
      });
    },

    getTransientWindowIds(): string[] {
      return this.getAllWindowIds().filter((id) => {
        const config = this.getConfig(id);
        return !!config && config.isTransient();
      });
    },

    setDialogInstance(windowId: string, instance: DialogLike): void {
      const config = this.getConfig(windowId);
      if (config) {
        config.dialogInstance = instance;
      }
    },

    getDialogInstance(windowId: string): DialogLike {
      const config = this.getConfig(windowId);
      return (config && config.dialogInstance) || null;
    },

    getAllDialogInstances(): Record<string, DialogLike> {
      const dialogs: Record<string, DialogLike> = {};
      windowRegistry.forEach((config, id) => {
        if (config.dialogInstance) {
          dialogs[id] = config.dialogInstance;
        }
      });
      return dialogs;
    },

    getTopWindow(): HTMLElement | null {
      let topModal: HTMLElement | null = null;
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

    bringToFront(windowId: string): void {
      const instance = this.getDialogInstance(windowId);
      if (instance && typeof instance.bringToFront === 'function') {
        instance.bringToFront();
      } else {
        console.warn(`Keine Dialog-Instanz für ${windowId} gefunden.`);
      }
    },

    open(windowId: string): void {
      const config = this.getConfig(windowId);
      if (config && config.metadata && typeof (config.metadata as Record<string, unknown>).initHandler === 'function') {
        try {
          const md = config.metadata as Record<string, unknown> & { __initialized?: boolean; initHandler?: () => void };
          if (!md.__initialized) {
            if (typeof md.initHandler === 'function') {
              md.initHandler();
            }
            md.__initialized = true;
          }
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
          modal.classList.remove('hidden');
          this.bringToFront(windowId);
        }
      }
    },

    close(windowId: string): void {
      const instance = this.getDialogInstance(windowId);
      if (instance && typeof instance.close === 'function') {
        instance.close();
      } else {
        const modal = document.getElementById(windowId);
        if (modal) modal.classList.add('hidden');
      }
    },

    getNextZIndex(): number {
      topZIndex++;
      return topZIndex;
    },

    syncZIndexWithDOM(): number {
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

    getDialogWindowElement(modal: HTMLElement | null): HTMLElement | null {
      if (!modal) return null;
      return (modal.querySelector('.autopointer') as HTMLElement | null) || modal;
    },

    getProgramInfo(windowId: string): ProgramInfo {
      const config = this.getConfig(windowId);
      if (config) return config.getProgramInfo();
      return this.getDefaultProgramInfo();
    },

    getDefaultProgramInfo(): ProgramInfo {
      const w = window as unknown as Record<string, unknown>;
      const i18n = (w['appI18n'] as { translate?: (k: string) => string } | undefined) || undefined;
      const translate = i18n?.translate || ((key: string) => key);
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

    get topZIndex(): number {
      return topZIndex;
    },
    set topZIndex(value: number) {
      topZIndex = value;
    },
    get baseZIndex(): number {
      return baseZIndex;
    },
  };

  (window as unknown as { WindowManager: typeof WindowManager }).WindowManager = WindowManager;

  Object.defineProperty(window, 'topZIndex', {
    get: () => WindowManager.topZIndex,
    set: (value: number) => {
      WindowManager.topZIndex = value;
    },
  });
})();
