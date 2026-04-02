/**
 * WindowManager - Central registry for windows/modals with z-index and program metadata (TypeScript).
 * Mirrors js/window-manager.js behavior while adding types and preserving global API.
 *
 * Exposed globally as `window.WindowManager`.
 *
 * @module window-manager
 *
 * @example
 * ```typescript
 * // Open a registered window (window IDs match those in window-configs.ts, e.g. 'settings-modal')
 * window.WindowManager.open('settings-modal');
 *
 * // Bring an already-visible window to the foreground
 * window.WindowManager.bringToFront('about-modal');
 *
 * // Query all persistent windows
 * const ids = window.WindowManager.getPersistentWindowIds();
 * ```
 */

import { BASE_Z_INDEX, getZIndexManager } from './z-index-manager.js';
import logger from '../core/logger.js';
import { resolveProgramIcon, WINDOW_ICONS } from './window-icons.js';

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
            this.icon = options.icon || WINDOW_ICONS.default;
            this.closeButtonId = options.closeButtonId ?? null;
            this.dialogInstance = null;
            this.metadata = options.metadata || {};
        }

        isTransient(): boolean {
            return this.type === 'transient';
        }

        getProgramInfo(): ProgramInfo {
            const w = window as unknown as Record<string, unknown>;
            const i18n =
                (w['appI18n'] as { translate?: (k: string) => string } | undefined) || undefined;
            const translate = i18n?.translate || ((key: string) => key);

            const aboutFields = ['name', 'tagline', 'version', 'copyright'];
            const info: ProgramInfo = {
                modalId: this.id,
                programLabel: translate(`${this.programKey}.label`),
                infoLabel: translate(`${this.programKey}.infoLabel`),
                fallbackInfoModalId:
                    (this.metadata.fallbackInfoModalId as string) || 'program-info-modal',
                icon: resolveProgramIcon(this.icon),
                about: {},
            };
            aboutFields.forEach(field => {
                info.about[field] = translate(`${this.programKey}.about.${field}`);
            });
            return info;
        }
    }

    const windowRegistry = new Map<string, WindowConfig>();
    const zIndexManager = getZIndexManager();

    type ManagedWindowLike = {
        id: string;
        type: string;
        zIndex: number;
        close?: () => void;
    };

    function resolveModernWindowType(windowId: string): string | null {
        if (windowId === 'projects-modal' || windowId === 'finder-modal') return 'finder';
        if (windowId === 'terminal-modal' || windowId === 'terminal') return 'terminal';
        if (windowId === 'text-modal') return 'text-editor';
        if (windowId === 'settings-modal') return 'settings';
        if (windowId === 'about-modal') return 'about';
        return null;
    }

    function getFrontmostManagedWindowByType(type: string): ManagedWindowLike | null {
        const windows = (window.WindowRegistry?.getWindowsByType?.(type) ??
            []) as ManagedWindowLike[];
        if (!Array.isArray(windows) || windows.length === 0) return null;

        return windows.reduce((top, current) => (current.zIndex > top.zIndex ? current : top));
    }

    function hideLegacyModalShell(windowId: string): void {
        const legacyModal = document.getElementById(windowId);
        if (!legacyModal) return;

        const domUtils = (window as any).DOMUtils;
        if (domUtils && typeof domUtils.hide === 'function') {
            domUtils.hide(legacyModal);
        } else {
            legacyModal.classList.add('hidden');
        }
        if (legacyModal.dataset) delete legacyModal.dataset.minimized;
    }

    function syncLegacyModernWindowOpen(windowId: string): boolean {
        const resolvedType = resolveModernWindowType(windowId);
        if (!resolvedType) return false;

        let openedWindow: unknown = null;

        if (resolvedType === 'finder') {
            openedWindow =
                window.FinderWindow?.focusOrCreate?.() || window.FinderWindow?.create?.();
        } else if (resolvedType === 'terminal') {
            openedWindow =
                window.TerminalWindow?.focusOrCreate?.() || window.TerminalWindow?.create?.();
        } else if (resolvedType === 'text-editor') {
            openedWindow =
                window.TextEditorWindow?.focusOrCreate?.() || window.TextEditorWindow?.create?.();
        } else if (resolvedType === 'settings') {
            openedWindow =
                window.SettingsWindow?.focusOrCreate?.() || window.SettingsWindow?.create?.();
        } else if (resolvedType === 'about') {
            openedWindow = window.AboutWindow?.focusOrCreate?.() || window.AboutWindow?.create?.();
        }

        if (!openedWindow) return false;

        hideLegacyModalShell(windowId);
        window.hideMenuDropdowns?.();
        window.saveOpenModals?.();
        window.updateDockIndicators?.();
        window.updateProgramLabelByTopModal?.();
        return true;
    }

    function syncLegacyModernWindowClose(windowId: string): boolean {
        const resolvedType = resolveModernWindowType(windowId);
        if (!resolvedType) return false;

        const activeWindow = window.WindowRegistry?.getActiveWindow?.() as ManagedWindowLike | null;
        const targetWindow =
            activeWindow?.type === resolvedType
                ? activeWindow
                : getFrontmostManagedWindowByType(resolvedType);

        if (!targetWindow?.close) return false;

        targetWindow.close();
        return true;
    }

    const WindowManager = {
        /**
         * Get current top z-index for synchronization.
         *
         * @returns The highest z-index currently in use.
         */
        getTopZIndex(): number {
            return zIndexManager.getTopZIndex();
        },

        /**
         * Ensure the internal top-z-index is at least `newZIndex`.
         *
         * Used to synchronize after external z-index changes (e.g., from WindowRegistry).
         *
         * @param newZIndex - Minimum z-index to enforce.
         */
        updateTopZIndex(newZIndex: number): void {
            zIndexManager.ensureTopZIndex(newZIndex);
        },
        /**
         * Register a window configuration.
         *
         * @param config - Window configuration options.
         * @returns The created `WindowConfig` instance.
         */
        register(config: WindowConfigOptions): WindowConfig {
            const windowConfig = new WindowConfig(config);
            windowRegistry.set(config.id, windowConfig);
            // Notify listeners (e.g. Launchpad) so they can refresh their app list.
            window.dispatchEvent(
                new CustomEvent('windowRegistered', {
                    detail: { windowId: config.id },
                    bubbles: false,
                    cancelable: false,
                })
            );
            return windowConfig;
        },

        /**
         * Register multiple window configurations at once.
         *
         * @param configs - Array of window configuration options.
         */
        registerAll(configs: WindowConfigOptions[]): void {
            configs.forEach(c => this.register(c));
        },

        /**
         * Retrieve the `WindowConfig` for a registered window.
         *
         * @param windowId - The HTML element ID of the window.
         * @returns `WindowConfig` or `null` if not registered.
         */
        getConfig(windowId: string): WindowConfig | null {
            return windowRegistry.get(windowId) || null;
        },

        /**
         * Return the IDs of all registered windows.
         *
         * @returns Array of window ID strings.
         */
        getAllWindowIds(): string[] {
            return Array.from(windowRegistry.keys());
        },

        /**
         * Return the IDs of all registered persistent (non-transient) windows.
         *
         * @returns Array of window ID strings.
         */
        getPersistentWindowIds(): string[] {
            return this.getAllWindowIds().filter(id => {
                const config = this.getConfig(id);
                return !!config && !config.isTransient();
            });
        },

        /**
         * Return the IDs of all registered transient windows.
         *
         * @returns Array of window ID strings.
         */
        getTransientWindowIds(): string[] {
            return this.getAllWindowIds().filter(id => {
                const config = this.getConfig(id);
                return !!config && config.isTransient();
            });
        },

        /**
         * Attach a `DialogLike` instance to a registered window.
         *
         * @param windowId - The window's element ID.
         * @param instance - The dialog controller to attach.
         */
        setDialogInstance(windowId: string, instance: DialogLike): void {
            const config = this.getConfig(windowId);
            if (config) {
                config.dialogInstance = instance;
            }
        },

        /**
         * Retrieve the `DialogLike` instance associated with a window.
         *
         * @param windowId - The window's element ID.
         * @returns The dialog instance, or `null`.
         */
        getDialogInstance(windowId: string): DialogLike {
            const config = this.getConfig(windowId);
            return (config && config.dialogInstance) || null;
        },

        /**
         * Return all registered dialog instances keyed by window ID.
         *
         * @returns Record mapping window IDs to `DialogLike` instances.
         */
        getAllDialogInstances(): Record<string, DialogLike> {
            const instances: Record<string, DialogLike> = {};
            windowRegistry.forEach((config, id) => {
                if (config.dialogInstance) {
                    instances[id] = config.dialogInstance;
                }
            });
            return instances;
        },

        /**
         * Return the DOM element with the highest z-index (the topmost window).
         *
         * @returns The topmost window `HTMLElement`, or `null`.
         */
        getTopWindow(): HTMLElement | null {
            return zIndexManager.getTopWindowElement();
        },

        /**
         * Bring a window to the foreground by raising its z-index.
         *
         * If the window has a registered `DialogLike` instance, its `bringToFront` method
         * is called. Otherwise the DOM element's z-index is updated directly.
         *
         * @param windowId - The window's element ID.
         */
        bringToFront(windowId: string): void {
            const perf = (
                window as {
                    PerfMonitor?: {
                        mark: (n: string) => void;
                        measure: (n: string, s?: string, e?: string) => void;
                    };
                }
            ).PerfMonitor;
            perf?.mark(`window:bringToFront:${windowId}:start`);

            const instance = this.getDialogInstance(windowId);
            if (instance && typeof instance.bringToFront === 'function') {
                instance.bringToFront();
                return;
            }

            const modal = document.getElementById(windowId);
            if (!modal) {
                logger.warn('WINDOW', `Keine Dialog-Instanz für ${windowId} gefunden.`);
                return;
            }
            const windowEl = this.getDialogWindowElement(modal);
            zIndexManager.bringToFront(windowId, modal, windowEl);

            perf?.mark(`window:bringToFront:${windowId}:end`);
            perf?.measure(
                `window:bringToFront:${windowId}`,
                `window:bringToFront:${windowId}:start`,
                `window:bringToFront:${windowId}:end`
            );
        },

        /**
         * Open a window (make it visible and bring it to the front).
         *
         * If the window has a `DialogLike` instance registered, its `open()` method is called.
         * Otherwise the DOM element's `hidden` class is removed.
         *
         * @param windowId - The window's element ID.
         */
        open(windowId: string): void {
            const perf = (
                window as {
                    PerfMonitor?: {
                        mark: (n: string) => void;
                        measure?: (n: string, s?: string, e?: string) => void;
                    };
                }
            ).PerfMonitor;
            perf?.mark(`window:open:${windowId}:start`);

            if (syncLegacyModernWindowOpen(windowId)) {
                perf?.mark(`window:open:${windowId}:end`);
                if (perf?.measure) {
                    perf.measure(
                        `window:open:${windowId}`,
                        `window:open:${windowId}:start`,
                        `window:open:${windowId}:end`
                    );
                }
                return;
            }

            // Dispatch windowOpened event so UI components (like Launchpad) can refresh
            const openedEvent = new CustomEvent('windowOpened', {
                detail: { windowId },
                bubbles: false,
                cancelable: false,
            });
            window.dispatchEvent(openedEvent);
            const config = this.getConfig(windowId);
            // Run the configured initHandler on every open. Some windows rely on
            // per-open initialization (e.g., Finder multi-instance recreation).
            const g = window as unknown as {
                __SESSION_RESTORE_IN_PROGRESS?: boolean;
            };
            const allowInitDuringRestore = !!(
                config?.metadata &&
                (config.metadata as Record<string, unknown> & { runInitDuringRestore?: boolean })
                    .runInitDuringRestore
            );

            if (
                config &&
                config.metadata &&
                typeof (config.metadata as Record<string, unknown>).initHandler === 'function' &&
                (!g.__SESSION_RESTORE_IN_PROGRESS || allowInitDuringRestore)
            ) {
                try {
                    const md = config.metadata as Record<string, unknown> & {
                        initHandler?: () => void;
                    };
                    if (typeof md.initHandler === 'function') md.initHandler();
                } catch (e) {
                    logger.warn('WINDOW', `Init handler for ${windowId} threw:`, e);
                }
            }
            const instance = this.getDialogInstance(windowId);
            if (instance && typeof instance.open === 'function') {
                instance.open();
            } else {
                const modal = document.getElementById(windowId);
                if (modal) {
                    const domUtils = (window as any).DOMUtils;
                    if (domUtils && typeof domUtils.show === 'function') {
                        domUtils.show(modal);
                    } else {
                        modal.classList.remove('hidden');
                    }
                    this.bringToFront(windowId);
                }
            }

            perf?.mark(`window:open:${windowId}:end`);
            if (perf?.measure) {
                perf.measure(
                    `window:open:${windowId}`,
                    `window:open:${windowId}:start`,
                    `window:open:${windowId}:end`
                );
            }
        },

        /**
         * Close a window (hide it).
         *
         * If the window has a `DialogLike` instance registered, its `close()` method is called.
         * Otherwise the DOM element is hidden via the `hidden` CSS class.
         *
         * @param windowId - The window's element ID.
         */
        close(windowId: string): void {
            const perf = (
                window as {
                    PerfMonitor?: {
                        mark: (n: string) => void;
                        measure: (n: string, s?: string, e?: string) => void;
                    };
                }
            ).PerfMonitor;
            perf?.mark(`window:close:${windowId}:start`);

            if (syncLegacyModernWindowClose(windowId)) {
                perf?.mark(`window:close:${windowId}:end`);
                perf?.measure(
                    `window:close:${windowId}`,
                    `window:close:${windowId}:start`,
                    `window:close:${windowId}:end`
                );
                return;
            }

            // Notify listeners (e.g. Launchpad) so they can refresh their app list.
            window.dispatchEvent(
                new CustomEvent('windowClosed', {
                    detail: { windowId },
                    bubbles: false,
                    cancelable: false,
                })
            );

            const instance = this.getDialogInstance(windowId);
            if (instance && typeof instance.close === 'function') {
                instance.close();
            } else {
                const modal = document.getElementById(windowId);
                if (modal) {
                    const domUtils = (window as any).DOMUtils;
                    if (domUtils && typeof domUtils.hide === 'function') {
                        domUtils.hide(modal);
                    } else {
                        modal.classList.add('hidden');
                    }
                }
            }

            perf?.mark(`window:close:${windowId}:end`);
            perf?.measure(
                `window:close:${windowId}`,
                `window:close:${windowId}:start`,
                `window:close:${windowId}:end`
            );
        },

        /**
         * Allocate the next available z-index value.
         *
         * @returns The next z-index integer.
         */
        getNextZIndex(): number {
            return zIndexManager.bumpZIndex();
        },

        /**
         * Synchronize the internal z-index counter with the highest value currently in the DOM.
         *
         * @returns The discovered maximum z-index.
         */
        syncZIndexWithDOM(): number {
            return zIndexManager.syncFromDOM();
        },

        /**
         * Return the draggable window element inside a modal overlay.
         *
         * Looks for a `.autopointer` child first; falls back to the modal itself.
         *
         * @param modal - The modal overlay element.
         * @returns The inner window element, or `null` if `modal` is `null`.
         */
        getDialogWindowElement(modal: HTMLElement | null): HTMLElement | null {
            if (!modal) return null;
            return (modal.querySelector('.autopointer') as HTMLElement | null) || modal;
        },

        /**
         * Return program metadata (label, icon, about) for a registered window.
         *
         * Falls back to default program info if the window is not registered.
         *
         * @param windowId - The window's element ID.
         * @returns `ProgramInfo` for the window.
         */
        getProgramInfo(windowId: string): ProgramInfo {
            const config = this.getConfig(windowId);
            if (config) return config.getProgramInfo();
            return this.getDefaultProgramInfo();
        },

        getDefaultProgramInfo(): ProgramInfo {
            const w = window as unknown as Record<string, unknown>;
            const i18n =
                (w['appI18n'] as { translate?: (k: string) => string } | undefined) || undefined;
            const translate = i18n?.translate || ((key: string) => key);
            const programKey = 'programs.default';
            return {
                modalId: null,
                programLabel: translate(`${programKey}.label`),
                infoLabel: translate(`${programKey}.infoLabel`),
                fallbackInfoModalId: 'program-info-modal',
                icon: resolveProgramIcon(WINDOW_ICONS.default),
                about: {
                    name: translate(`${programKey}.about.name`),
                    tagline: translate(`${programKey}.about.tagline`),
                    version: translate(`${programKey}.about.version`),
                    copyright: translate(`${programKey}.about.copyright`),
                },
            };
        },

        get topZIndex(): number {
            return zIndexManager.getTopZIndex();
        },
        set topZIndex(value: number) {
            zIndexManager.ensureTopZIndex(value);
        },
        get baseZIndex(): number {
            return BASE_Z_INDEX;
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
