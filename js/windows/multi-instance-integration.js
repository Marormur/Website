'use strict';
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Multi-Instance Modal Integration (TypeScript)
 * Integrates the tab system with existing modals (Terminal, TextEditor, Finder)
 * Wires up keyboard shortcuts and session management
 */
Object.defineProperty(exports, '__esModule', { value: true });
const storage_utils_js_1 = require('../services/storage-utils.js');
(() => {
    'use strict';
    class MultiInstanceIntegration {
        constructor() {
            this.integrations = new Map();
            this.isInitialized = false;
        }
        init() {
            if (this.isInitialized) return;
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        }
        setup() {
            const W = window;
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
                    const maybe = tabManager;
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
                    const map = (0, storage_utils_js_1.getJSON)('windowActiveInstances', {});
                    const wanted = map?.[type] || null;
                    if (wanted && typeof manager.setActiveInstance === 'function') {
                        // Only set if the instance exists to avoid creating new ones
                        const exists = manager.getAllInstances().some(i => i.instanceId === wanted);
                        if (exists) manager.setActiveInstance(wanted);
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
        wireManager(options) {
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
            const W = window;
            const mount = document.getElementById(tabMountId);
            if (!mount) return;
            const controller = W.WindowTabs.create(manager, mount, {
                addButton,
                onCreateInstanceTitle: () =>
                    titleFactory?.(manager) ||
                    `${type} ${(manager.getInstanceCount?.() || manager.getAllInstances().length) + 1}`,
            });
            const origSetActive = manager.setActiveInstance.bind(manager);
            manager.setActiveInstance = id => {
                origSetActive(id);
                this.showInstance(type, id);
            };
            const origDestroy = manager.destroyInstance.bind(manager);
            manager.destroyInstance = id => {
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
        closeModalOrHide(modalId) {
            try {
                const API = window.API;
                if (API?.window?.close) {
                    API.window.close(modalId);
                    return;
                }
                const modal = document.getElementById(modalId);
                if (!modal) return;
                const domUtils = window.DOMUtils;
                if (domUtils && typeof domUtils.hide === 'function') {
                    domUtils.hide(modal);
                } else {
                    modal.classList.add('hidden');
                }
            } catch {
                /* ignore */
            }
        }
        setupInstanceListeners(type) {
            const integration = this.integrations.get(type);
            if (!integration) return;
            const { manager } = integration;
            const originalCreate = manager.createInstance.bind(manager);
            manager.createInstance = config => {
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
        showInstance(type, instanceId) {
            const integration = this.integrations.get(type);
            if (!integration) return;
            const instances = integration.manager.getAllInstances();
            instances.forEach(inst => {
                if (inst.instanceId === instanceId) inst.show?.();
                else inst.hide?.();
            });
        }
        updateInstanceVisibility(type) {
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
        registerShortcutsForType(type, manager, modalId) {
            const W = window;
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
    window.MultiInstanceIntegration = integration;
    window.multiInstanceIntegration = integration;
    integration.init();
})();
//# sourceMappingURL=multi-instance-integration.js.map
