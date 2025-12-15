/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Multi-Instance Modal Integration (TypeScript)
 * Integrates the tab system with existing modals (Terminal, TextEditor, Finder)
 * Wires up keyboard shortcuts and session management
 */

import { getJSON } from '../services/storage-utils.js';

(() => {
    'use strict';

    type Instance = { instanceId: string; show?: () => void; hide?: () => void };
    type Manager = {
        getAllInstances(): Instance[];
        getActiveInstance(): Instance | null;
        getAllInstanceIds?: () => string[];
        getInstanceCount: () => number;
        setActiveInstance(id: string): void;
        createInstance(cfg?: { title?: string }): Instance | null;
        destroyInstance(id: string): void;
    };

    type IntegrationRecord = {
        manager: Manager;
        tabManager: unknown;
        modalId: string;
        containerId: string;
        unregisterShortcuts?: () => void;
    };

    type WireOptions = {
        type: string;
        manager: Manager;
        modalId: string | null;
        tabMountId: string;
        containerId: string;
        addButton?: boolean;
        titleFactory?: (manager: Manager) => string;
        onEmpty?: () => void;
    };

    class MultiInstanceIntegration {
        private integrations: Map<string, IntegrationRecord> = new Map();
        private isInitialized = false;

        init() {
            if (this.isInitialized) return;
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        }

        private setup() {
            const W = window as unknown as Record<string, any>;
            if (!W.InstanceManager || !W.WindowTabs || !W.KeyboardShortcuts) {
                console.error('MultiInstanceIntegration: Required dependencies not loaded');
                return;
            }

            if (W.TerminalInstanceManager)
                this.wireManager({
                    type: 'terminal',
                    manager: W.TerminalInstanceManager,
                    modalId: 'terminal-modal',
                    tabMountId: 'terminal-tabs-container',
                    containerId: 'terminal-container',
                    addButton: true,
                    titleFactory: manager =>
                        `Terminal ${(manager.getInstanceCount?.() || manager.getAllInstances().length) + 1}`,
                    onEmpty: () => this.closeModalOrHide('terminal-modal'),
                });

            if (W.TextEditorInstanceManager)
                this.wireManager({
                    type: 'text-editor',
                    manager: W.TextEditorInstanceManager,
                    modalId: 'text-modal',
                    tabMountId: 'text-editor-tabs-container',
                    containerId: 'text-editor-container',
                    addButton: true,
                    titleFactory: manager =>
                        `Editor ${(manager.getInstanceCount?.() || manager.getAllInstances().length) + 1}`,
                    onEmpty: () => this.closeModalOrHide('text-modal'),
                });

            if (W.FinderInstanceManager)
                this.wireManager({
                    type: 'finder',
                    manager: W.FinderInstanceManager,
                    modalId: null, // legacy finder-modal removed
                    tabMountId: 'finder-tabs-container',
                    containerId: 'finder-container',
                    addButton: true,
                    titleFactory: manager =>
                        `Finder ${(manager.getInstanceCount?.() || manager.getAllInstances().length) + 1}`,
                    // onEmpty intentionally no-op for Finder
                });

            // Ensure tabs/controllers reflect any pre-existing state and show active instance.
            // Session restoration is orchestrated by app-init; we intentionally do not call
            // SessionManager.restoreSession() or init() here to avoid duplicate restores.
            this.integrations.forEach((integration, type) => {
                const { manager, tabManager } = integration;
                // Support both legacy adapter ({controller: {refresh}}) and new controller ({refresh})
                try {
                    const maybe = tabManager as any;
                    const refreshFn =
                        typeof maybe?.refresh === 'function'
                            ? maybe.refresh.bind(maybe)
                            : typeof maybe?.controller?.refresh === 'function'
                              ? maybe.controller.refresh.bind(maybe.controller)
                              : null;
                    if (refreshFn) refreshFn();
                } catch {}
                // Try to restore previously selected tab from a simple localStorage map (fallback)
                try {
                    const map = getJSON<Record<string, string | null>>('windowActiveInstances', {});
                    const wanted = map?.[type] || null;
                    if (wanted && typeof (manager as any).setActiveInstance === 'function') {
                        // Only set if the instance exists to avoid creating new ones
                        const exists = manager.getAllInstances().some(i => i.instanceId === wanted);
                        if (exists) (manager as any).setActiveInstance(wanted);
                    }
                } catch {}

                const active = manager.getActiveInstance();
                if (active) this.showInstance(type, active.instanceId);
            });

            // Scope keyboard shortcuts by top window
            if (
                W.KeyboardShortcuts &&
                typeof W.KeyboardShortcuts.setContextResolver === 'function'
            ) {
                W.KeyboardShortcuts.setContextResolver(() => {
                    try {
                        const wm = W.WindowManager;
                        const top =
                            wm && typeof wm.getTopWindow === 'function' ? wm.getTopWindow() : null;
                        const topId = top?.id || '';
                        let match = 'global';
                        this.integrations.forEach((val, key) => {
                            if (val && val.modalId === topId) match = key;
                        });
                        return match;
                    } catch {
                        return 'global';
                    }
                });
            }

            this.isInitialized = true;
        }

        /**
         * Generic wiring for an InstanceManager + WindowTabs + keyboard shortcuts
         */
        private wireManager(options: WireOptions) {
            const {
                type,
                manager,
                modalId,
                tabMountId,
                containerId,
                addButton = true,
                titleFactory,
                onEmpty,
            } = options;

            const W = window as unknown as Record<string, any>;
            const mount = document.getElementById(tabMountId);
            if (!mount) return;

            const controller = W.WindowTabs.create(manager, mount, {
                addButton,
                onCreateInstanceTitle: () =>
                    titleFactory?.(manager) ||
                    `${type} ${(manager.getInstanceCount?.() || manager.getAllInstances().length) + 1}`,
            });

            const origSetActive = manager.setActiveInstance.bind(manager);
            manager.setActiveInstance = (id: string) => {
                origSetActive(id);
                this.showInstance(type, id);
            };

            const origDestroy = manager.destroyInstance.bind(manager);
            manager.destroyInstance = (id: string) => {
                origDestroy(id);
                const remaining = manager.getAllInstances().length;
                if (remaining === 0) {
                    onEmpty?.();
                } else {
                    const active = manager.getActiveInstance();
                    if (active) this.showInstance(type, active.instanceId);
                }
            };

            this.integrations.set(type, {
                manager,
                tabManager: controller,
                modalId: modalId || '',
                containerId,
            });

            this.registerShortcutsForType(type, manager, modalId || undefined);
            this.updateInstanceVisibility(type);
            this.setupInstanceListeners(type);
        }

        /** Close modal via API.window.close or DOM hide fallback */
        private closeModalOrHide(modalId: string) {
            try {
                const API = (window as any).API;
                if (API?.window?.close) {
                    API.window.close(modalId);
                    return;
                }
                const modal = document.getElementById(modalId);
                if (!modal) return;
                const domUtils = (window as any).DOMUtils;
                if (domUtils && typeof domUtils.hide === 'function') {
                    domUtils.hide(modal);
                } else {
                    modal.classList.add('hidden');
                }
            } catch {
                /* ignore */
            }
        }

        private setupInstanceListeners(type: string) {
            const integration = this.integrations.get(type);
            if (!integration) return;
            const { manager } = integration;

            const originalCreate = manager.createInstance.bind(manager);
            manager.createInstance = (config?: { title?: string }) => {
                const instance = originalCreate(config);
                // After create, prefer showing the active; otherwise show the created one
                const active = manager.getActiveInstance();
                if (active) {
                    this.showInstance(type, active.instanceId);
                } else if (instance) {
                    this.showInstance(type, instance.instanceId);
                }
                return instance;
            };
        }

        showInstance(type: string, instanceId: string) {
            const integration = this.integrations.get(type);
            if (!integration) return;

            // Ensure the associated modal/window is opened and on top so that
            // the z-index manager tracks it in the window stack.
            // Applicable for terminal/text-editor which have a modal container.
            try {
                if (integration.modalId) {
                    const wm = (window as any).WindowManager;
                    const modal = document.getElementById(integration.modalId);
                    if (modal) {
                        const isHidden = modal.classList.contains('hidden');
                        if (wm && typeof wm.open === 'function' && isHidden) {
                            wm.open(integration.modalId);
                        } else if (wm && typeof wm.bringToFront === 'function') {
                            // Even if already visible, push to top for consistent stacking
                            wm.bringToFront(integration.modalId);
                        }
                    }
                }
            } catch {
                /* non-fatal */
            }

            const instances = integration.manager.getAllInstances();
            instances.forEach(inst => {
                if (inst.instanceId === instanceId) inst.show?.();
                else inst.hide?.();
            });
        }

        updateInstanceVisibility(type: string) {
            const integration = this.integrations.get(type);
            if (!integration) return;
            const active = integration.manager.getActiveInstance();
            if (active) {
                this.showInstance(type, active.instanceId);
            } else {
                const all = integration.manager.getAllInstances();
                if (all.length > 0) {
                    const firstId = all[0]?.instanceId;
                    if (firstId) {
                        // Ensure a consistent active selection
                        integration.manager.setActiveInstance(firstId);
                        this.showInstance(type, firstId);
                    }
                }
            }
        }

        private registerShortcutsForType(type: string, manager: Manager, modalId?: string) {
            const W = window as unknown as Record<string, any>;
            if (modalId) {
                const modalEl = document.getElementById(modalId);
                if (!modalEl) {
                    console.error(
                        `Cannot register shortcuts for ${type}: modal ${modalId} not found`
                    );
                    return;
                }
            }
            const unregister = W.KeyboardShortcuts.register(manager, {
                scope: document,
                newTitleFactory: () => `${type} ${manager.getInstanceCount() + 1}`,
            });
            const rec = this.integrations.get(type);
            if (rec) rec.unregisterShortcuts = unregister;
        }
    }

    // Create and expose singleton (retain both names for compatibility)
    const integration = new MultiInstanceIntegration();
    (window as any).MultiInstanceIntegration = integration;
    (window as any).multiInstanceIntegration = integration;
    integration.init();
})();
