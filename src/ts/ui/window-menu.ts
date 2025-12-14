/**
 * Window Menu - macOS-style window management menu for the menubar.
 * Dynamically builds menu items based on active window instances (Finder, Terminal, etc.).
 * Shows instances, allows switching, creating new instances, and closing all.
 */

import logger from '../core/logger';
import type { BaseWindow } from '../windows/base-window.js';

const CATEGORY = 'WindowMenu';

interface WindowMenuConfig {
    appType: string;
    label: string;
}

type ActionParams = Record<string, string | undefined>;
type ActionBusLike = {
    register: (
        actionName: string,
        handler: (params: ActionParams, element: HTMLElement | null) => void
    ) => void;
};

type I18nLike = { translate?: (key: string, fallback?: string) => string };
type ApiLike = { i18n?: I18nLike };

type FinderWindowCtorLike = { create?: () => unknown };

type WindowRegistryLike = {
    getAllWindows?: (type?: string) => BaseWindow[];
    getActiveWindow?: () => BaseWindow | null;
    getWindow?: (windowId: string) => BaseWindow | null;
    closeAllWindows?: () => void;
    registerWindow?: (window: BaseWindow) => void;
    removeWindow?: (windowId: string) => void;
    setActiveWindow?: (windowId: string | null) => void;
};

type MenubarBindingLike = {
    bindDropdownTrigger?: (
        el: HTMLElement | null,
        options?: { hoverRequiresOpen?: boolean }
    ) => void;
};

function t(key: string, fallback: string): string {
    const api = (window as unknown as { API?: ApiLike }).API;
    return api?.i18n?.translate?.(key, fallback) ?? fallback;
}

/**
 * Build and refresh the Window menu based on currently active windows
 */
function rebuildWindowMenu(): void {
    try {
        const container = document.getElementById('window-menu-container');
        const dropdown = document.getElementById('window-menu-dropdown') as HTMLUListElement;

        if (!container || !dropdown) {
            logger.warn(CATEGORY, 'Window menu container not found in DOM');
            return;
        }

        // Get all active window instances grouped by app type.
        // WindowRegistry stores BaseWindow instances with shape: { id, type, zIndex, ... }
        const windowsByApp = new Map<string, BaseWindow[]>();
        const registry = (window as unknown as { WindowRegistry?: WindowRegistryLike })
            .WindowRegistry;
        const allWindows = registry?.getAllWindows?.() || [];

        allWindows.forEach((win: BaseWindow) => {
            const type = win?.type;
            if (!type) return;
            if (!windowsByApp.has(type)) {
                windowsByApp.set(type, []);
            }
            windowsByApp.get(type)!.push(win);
        });

        // Hide menu if no windows exist
        if (windowsByApp.size === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';

        // Clear existing items
        dropdown.innerHTML = '';

        const activeWindow = registry?.getActiveWindow?.();
        const appConfigs: WindowMenuConfig[] = [
            {
                appType: 'finder',
                label: t('apps.finder.label', 'Finder'),
            },
            {
                appType: 'terminal',
                label: t('apps.terminal.label', 'Terminal'),
            },
            {
                appType: 'text-editor',
                label: t('apps.text-editor.label', 'Schreibprogramm'),
            },
            {
                appType: 'photos',
                label: t('apps.photos.label', 'Fotos'),
            },
        ];

        // Build menu items for each app type
        appConfigs.forEach((config, index) => {
            const instances = windowsByApp.get(config.appType) || [];
            if (instances.length === 0) return;

            // Add separator before app section (except for first)
            if (index > 0) {
                const separator = document.createElement('li');
                separator.className = 'menu-separator';
                separator.setAttribute('role', 'separator');
                separator.setAttribute('aria-hidden', 'true');
                dropdown.appendChild(separator);
            }

            // Create menu item for each instance
            // Sort by zIndex to get a stable order that roughly matches on-screen stacking.
            const sorted = [...instances].sort((a, b) => (a?.zIndex || 0) - (b?.zIndex || 0));
            sorted.forEach((instance: BaseWindow, instanceIndex: number) => {
                const isActive = !!activeWindow && activeWindow.id === instance.id;
                const li = document.createElement('li');
                li.setAttribute('role', 'none');

                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'menu-item';
                button.setAttribute('role', 'menuitem');
                button.setAttribute('tabindex', '-1');
                button.dataset.windowId = instance.id;
                button.dataset.action = 'switchToWindow';
                button.dataset.param = instance.id;

                // Label: "App Name 1", "App Name 2", etc.
                const labelSpan = document.createElement('span');
                labelSpan.className = 'menu-item-label';
                labelSpan.textContent = `${config.label} ${instanceIndex + 1}`;

                button.appendChild(labelSpan);

                // Add checkmark if active
                if (isActive) {
                    const checkmark = document.createElement('span');
                    checkmark.className = 'menu-item-checkmark';
                    checkmark.textContent = '✓';
                    checkmark.style.marginLeft = '12px';
                    button.appendChild(checkmark);
                }

                li.appendChild(button);
                dropdown.appendChild(li);
            });
        });

        // Add separator before action items
        const sep = document.createElement('li');
        sep.className = 'menu-separator';
        sep.setAttribute('role', 'separator');
        sep.setAttribute('aria-hidden', 'true');
        dropdown.appendChild(sep);

        // "New Window" submenu (only for apps with instances)
        const newWindowLi = document.createElement('li');
        newWindowLi.setAttribute('role', 'none');
        const newWindowButton = document.createElement('button');
        newWindowButton.type = 'button';
        newWindowButton.className = 'menu-item';
        newWindowButton.setAttribute('role', 'menuitem');
        newWindowButton.setAttribute('tabindex', '-1');
        newWindowButton.dataset.action = 'newFinderWindow';

        const newWindowLabel = document.createElement('span');
        newWindowLabel.className = 'menu-item-label';
        newWindowLabel.dataset.i18n = 'menubar.window.newFinder';
        newWindowLabel.textContent = t('menubar.window.newFinder', 'Neuer Finder');

        newWindowButton.appendChild(newWindowLabel);
        newWindowLi.appendChild(newWindowButton);
        dropdown.appendChild(newWindowLi);

        // "Close All" action (only if multiple instances exist)
        const totalInstances = Array.from(windowsByApp.values()).reduce(
            (sum, arr) => sum + arr.length,
            0
        );
        if (totalInstances > 1) {
            const closeAllLi = document.createElement('li');
            closeAllLi.setAttribute('role', 'none');
            const closeAllButton = document.createElement('button');
            closeAllButton.type = 'button';
            closeAllButton.className = 'menu-item';
            closeAllButton.setAttribute('role', 'menuitem');
            closeAllButton.setAttribute('tabindex', '-1');
            closeAllButton.dataset.action = 'closeAllWindows';

            const closeAllLabel = document.createElement('span');
            closeAllLabel.className = 'menu-item-label';
            closeAllLabel.dataset.i18n = 'menubar.window.closeAll';
            closeAllLabel.textContent = t('menubar.window.closeAll', 'Alle schließen');

            closeAllButton.appendChild(closeAllLabel);
            closeAllLi.appendChild(closeAllButton);
            dropdown.appendChild(closeAllLi);
        }

        logger.info(CATEGORY, `Window menu rebuilt with ${allWindows.length} instances`);
    } catch (err) {
        logger.warn(CATEGORY, 'rebuildWindowMenu failed:', err);
        // Don't rethrow - let app continue
    }
}

/**
 * Initialize window menu: register actions and setup observers
 */
export function initializeWindowMenu(): void {
    try {
        const actionBus = (window as unknown as { ActionBus?: ActionBusLike }).ActionBus;
        if (!actionBus) {
            logger.warn(CATEGORY, 'ActionBus not available, delaying initialization');
            setTimeout(initializeWindowMenu, 100);
            return;
        }

        const W = window as unknown as {
            __windowMenuPatched?: boolean;
            WindowRegistry?: WindowRegistryLike;
            __windowMenuTriggerRetry?: number;
        };

        // Ensure the trigger is bound even if menubar-utils loads slightly later.
        const bindTriggerWithRetry = () => {
            const trigger = document.getElementById('window-menu-trigger');
            if (!trigger) return;

            if (trigger.getAttribute('data-window-menu-trigger-bound') === '1') return;
            const binder = window as unknown as MenubarBindingLike;
            if (typeof binder.bindDropdownTrigger === 'function') {
                binder.bindDropdownTrigger(trigger, { hoverRequiresOpen: true });
                trigger.setAttribute('data-window-menu-trigger-bound', '1');
                return;
            }

            // Retry shortly if menubar-utils was not ready yet.
            W.__windowMenuTriggerRetry = window.setTimeout(bindTriggerWithRetry, 150);
        };

        // Rebuild on menu open to ensure we never show stale state.
        // (The menubar dropdown animation can race with window creation in tests.)
        bindTriggerWithRetry();
        const trigger = document.getElementById('window-menu-trigger');
        if (trigger && trigger.getAttribute('data-window-menu-hooked') !== '1') {
            trigger.setAttribute('data-window-menu-hooked', '1');
            trigger.addEventListener(
                'click',
                () => {
                    rebuildWindowMenu();
                },
                true
            );
        }

        // Register action: switch to a specific window
        actionBus.register('switchToWindow', (params: ActionParams) => {
            try {
                const windowId = params?.param || params?.windowId;
                if (!windowId) return;
                const registry = (window as unknown as { WindowRegistry?: WindowRegistryLike })
                    .WindowRegistry;
                const win = registry?.getWindow?.(windowId);
                if (!win) return;
                // BaseWindow exposes bringToFront() which also updates WindowRegistry active window.
                if (typeof win.bringToFront === 'function') {
                    win.bringToFront();
                }
                logger.info(CATEGORY, `Switched to window ${windowId}`);
                rebuildWindowMenu();
            } catch (err) {
                logger.warn(CATEGORY, 'switchToWindow action failed:', err);
            }
        });

        // Register action: create new Finder window
        actionBus.register('newFinderWindow', () => {
            try {
                // The multi-window Finder implementation exposes FinderWindow.create().
                const FW = (window as unknown as { FinderWindow?: FinderWindowCtorLike })
                    .FinderWindow;
                if (FW && typeof FW.create === 'function') {
                    FW.create();
                    logger.info(CATEGORY, 'Created new Finder window');
                    setTimeout(rebuildWindowMenu, 50);
                    return;
                }
                logger.warn(
                    CATEGORY,
                    'FinderWindow.create() not available; cannot create new Finder window'
                );
            } catch (err) {
                logger.warn(CATEGORY, 'newFinderWindow action failed:', err);
            }
        });

        // Register action: close all windows
        actionBus.register('closeAllWindows', () => {
            try {
                const confirmed = confirm(
                    t('menubar.window.closeAllConfirm', 'Wirklich alle Fenster schließen?')
                );
                if (!confirmed) return;

                const registry = (window as unknown as { WindowRegistry?: WindowRegistryLike })
                    .WindowRegistry;
                if (registry && typeof registry.closeAllWindows === 'function') {
                    registry.closeAllWindows();
                }
                logger.info(CATEGORY, 'Closed all windows');
                rebuildWindowMenu();
            } catch (err) {
                logger.warn(CATEGORY, 'closeAllWindows action failed:', err);
            }
        });

        // Initial build
        rebuildWindowMenu();

        // Patch WindowRegistry to schedule rebuilds when windows are created/destroyed/focused.
        // We keep this lightweight and idempotent (guarded by a global flag).
        if (W.WindowRegistry && !W.__windowMenuPatched) {
            W.__windowMenuPatched = true;

            let scheduled = false;
            const schedule = () => {
                if (scheduled) return;
                scheduled = true;
                setTimeout(() => {
                    scheduled = false;
                    rebuildWindowMenu();
                }, 50);
            };

            try {
                const origRegisterWindow = W.WindowRegistry.registerWindow?.bind(W.WindowRegistry);
                if (origRegisterWindow) {
                    W.WindowRegistry.registerWindow = (win: BaseWindow) => {
                        origRegisterWindow(win);
                        schedule();
                    };
                }
            } catch (err) {
                logger.debug(CATEGORY, 'Could not patch WindowRegistry.registerWindow:', err);
            }

            try {
                const origRemoveWindow = W.WindowRegistry.removeWindow?.bind(W.WindowRegistry);
                if (origRemoveWindow) {
                    W.WindowRegistry.removeWindow = (windowId: string) => {
                        origRemoveWindow(windowId);
                        schedule();
                    };
                }
            } catch (err) {
                logger.debug(CATEGORY, 'Could not patch WindowRegistry.removeWindow:', err);
            }

            try {
                const origSetActive = W.WindowRegistry.setActiveWindow?.bind(W.WindowRegistry);
                if (origSetActive) {
                    W.WindowRegistry.setActiveWindow = (windowId: string | null) => {
                        origSetActive(windowId);
                        schedule();
                    };
                }
            } catch (err) {
                logger.debug(CATEGORY, 'Could not patch WindowRegistry.setActiveWindow:', err);
            }
        }

        logger.info(CATEGORY, 'Window menu initialized');
    } catch (err) {
        logger.error(CATEGORY, 'Window menu initialization failed:', err);
        // Don't rethrow - let app continue even if window menu fails
    }
}

/**
 * Expose rebuildWindowMenu for external calls
 */
export function refreshWindowMenu(): void {
    rebuildWindowMenu();
}
