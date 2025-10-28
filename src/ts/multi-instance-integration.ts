/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Multi-Instance Modal Integration (TypeScript)
 * Integrates the tab system with existing modals (Terminal, TextEditor, Finder)
 * Wires up keyboard shortcuts and session management
 */

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

            if (W.TerminalInstanceManager) this.setupTerminalIntegration();
            if (W.TextEditorInstanceManager) this.setupTextEditorIntegration();
            if (W.FinderInstanceManager) this.setupFinderIntegration();

            if (W.SessionManager) {
                if (W.TerminalInstanceManager)
                    W.SessionManager.registerManager('terminal', W.TerminalInstanceManager);
                if (W.TextEditorInstanceManager)
                    W.SessionManager.registerManager('text-editor', W.TextEditorInstanceManager);
                if (W.FinderInstanceManager)
                    W.SessionManager.registerManager('finder', W.FinderInstanceManager);

                W.SessionManager.restoreAllSessions();

                // Ensure tabs/controllers reflect restored state and show active instance
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
                    const active = manager.getActiveInstance();
                    if (active) this.showInstance(type, active.instanceId);
                });

                W.SessionManager.startAutoSave();
            }

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

        private setupTerminalIntegration() {
            const W = window as unknown as Record<string, any>;
            const manager = W.TerminalInstanceManager as Manager;
            // Hook active switch to also update visibility
            const origSetActive = manager.setActiveInstance.bind(manager);
            manager.setActiveInstance = (id: string) => {
                origSetActive(id);
                this.showInstance('terminal', id);
            };
            // Hook destroy to ensure visibility and state stay consistent
            const origDestroy = manager.destroyInstance.bind(manager);
            manager.destroyInstance = (id: string) => {
                origDestroy(id);
                const remaining = manager.getAllInstances().length;
                if (remaining > 0) {
                    const active = manager.getActiveInstance();
                    if (active) this.showInstance('terminal', active.instanceId);
                }
            };

            const mount = document.getElementById('terminal-tabs-container');
            if (!mount) return;
            const controller = W.WindowTabs.create(manager, mount, {
                addButton: true,
                onCreateInstanceTitle: () =>
                    `Terminal ${(manager.getInstanceCount?.() || manager.getAllInstances().length) + 1}`,
            });

            this.integrations.set('terminal', {
                manager,
                tabManager: controller,
                modalId: 'terminal-modal',
                containerId: 'terminal-container',
            });

            this.registerShortcutsForType('terminal', manager);
            // Ensure the current active instance is visible in the UI
            this.updateInstanceVisibility('terminal');
            // Ensure visibility after future instance creations
            this.setupInstanceListeners('terminal');
        }

        private setupTextEditorIntegration() {
            const W = window as unknown as Record<string, any>;
            const manager = W.TextEditorInstanceManager as Manager;
            const origSetActive = manager.setActiveInstance.bind(manager);
            manager.setActiveInstance = (id: string) => {
                origSetActive(id);
                this.showInstance('text-editor', id);
            };
            const origDestroy = manager.destroyInstance.bind(manager);
            manager.destroyInstance = (id: string) => {
                origDestroy(id);
                const remaining = manager.getAllInstances().length;
                if (remaining > 0) {
                    const active = manager.getActiveInstance();
                    if (active) this.showInstance('text-editor', active.instanceId);
                }
            };

            const mount = document.getElementById('text-editor-tabs-container');
            if (!mount) return;
            const controller = W.WindowTabs.create(manager, mount, {
                addButton: true,
                onCreateInstanceTitle: () =>
                    `Editor ${(manager.getInstanceCount?.() || manager.getAllInstances().length) + 1}`,
            });

            this.integrations.set('text-editor', {
                manager,
                tabManager: controller,
                modalId: 'text-modal',
                containerId: 'text-editor-container',
            });

            this.registerShortcutsForType('text-editor', manager);
            this.updateInstanceVisibility('text-editor');
            this.setupInstanceListeners('text-editor');
        }

        private setupFinderIntegration() {
            const W = window as unknown as Record<string, any>;
            const manager = W.FinderInstanceManager as Manager;
            const origSetActive = manager.setActiveInstance.bind(manager);
            manager.setActiveInstance = (id: string) => {
                origSetActive(id);
                this.showInstance('finder', id);
            };
            const origDestroy = manager.destroyInstance.bind(manager);
            manager.destroyInstance = (id: string) => {
                origDestroy(id);
                const remaining = manager.getAllInstances().length;
                if (remaining === 0) {
                    try {
                        const API = (window as any).API;
                        if (API?.window?.close) API.window.close('finder-modal');
                        else document.getElementById('finder-modal')?.classList.add('hidden');
                    } catch {}
                } else {
                    const active = manager.getActiveInstance();
                    if (active) this.showInstance('finder', active.instanceId);
                }
            };

            const mount = document.getElementById('finder-tabs-container');
            if (!mount) return;
            const controller = W.WindowTabs.create(manager, mount, {
                addButton: true,
                onCreateInstanceTitle: () =>
                    `Finder ${(manager.getInstanceCount?.() || manager.getAllInstances().length) + 1}`,
            });

            this.integrations.set('finder', {
                manager,
                tabManager: controller,
                modalId: 'finder-modal',
                containerId: 'finder-container',
            });

            this.registerShortcutsForType('finder', manager);
            this.updateInstanceVisibility('finder');
            this.setupInstanceListeners('finder');
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
                    const firstId = all[0].instanceId;
                    // Ensure a consistent active selection
                    integration.manager.setActiveInstance(firstId);
                    this.showInstance(type, firstId);
                }
            }
        }

        private registerShortcutsForType(type: string, manager: Manager) {
            const W = window as unknown as Record<string, any>;
            const modalId = this.integrations.get(type)?.modalId;
            const modalEl = modalId ? document.getElementById(modalId) : null;
            if (!modalEl) {
                console.error(`Cannot register shortcuts for ${type}: modal ${modalId} not found`);
                return;
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

