console.log('MultiInstanceIntegration loaded');

/**
 * Multi-Instance Modal Integration
 *
 * Integrates the tab system with existing modals (Terminal, TextEditor)
 * Wires up keyboard shortcuts and session management
 */
(function () {
    'use strict';

    /**
     * Integration manager for multi-instance modals
     */
    class MultiInstanceIntegration {
        constructor() {
            this.integrations = new Map();
            this.isInitialized = false;
        }

        /**
         * Initialize multi-instance integration
         */
        init() {
            if (this.isInitialized) {
                console.warn('MultiInstanceIntegration already initialized');
                return;
            }

            // Wait for DOM and all dependencies to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.setup();
                });
            } else {
                this.setup();
            }
        }

        /**
         * Setup integrations
         */
        setup() {
            console.log('MultiInstanceIntegration: Setting up...');

            // Check if required dependencies are available
            if (!window.InstanceManager || !window.WindowTabManager || !window.KeyboardShortcuts) {
                console.error('MultiInstanceIntegration: Required dependencies not loaded');
                return;
            }

            // Setup Terminal integration if available
            if (window.TerminalInstanceManager) {
                this.setupTerminalIntegration();
            }

            // Setup Text Editor integration if available
            if (window.TextEditorInstanceManager) {
                this.setupTextEditorIntegration();
            }

            // Setup Finder integration if available
            if (window.FinderInstanceManager) {
                this.setupFinderIntegration();
            }

            // Register managers with session manager
            if (window.SessionManager) {
                if (window.TerminalInstanceManager) {
                    window.SessionManager.registerManager(
                        'terminal',
                        window.TerminalInstanceManager
                    );
                }
                if (window.TextEditorInstanceManager) {
                    window.SessionManager.registerManager(
                        'text-editor',
                        window.TextEditorInstanceManager
                    );
                }
                if (window.FinderInstanceManager) {
                    window.SessionManager.registerManager('finder', window.FinderInstanceManager);
                }

                // Start auto-save
                window.SessionManager.startAutoSave();
            }

            // Provide a precise context resolver to KeyboardShortcuts
            if (
                window.KeyboardShortcuts &&
                typeof window.KeyboardShortcuts.setContextResolver === 'function'
            ) {
                window.KeyboardShortcuts.setContextResolver(() => {
                    try {
                        const wm = window.WindowManager;
                        const top =
                            wm && typeof wm.getTopWindow === 'function' ? wm.getTopWindow() : null;
                        const topId = top?.id || '';
                        // Find matching integration by modalId
                        let match = 'global';
                        this.integrations.forEach((val, key) => {
                            if (val && val.modalId === topId) {
                                match = key;
                            }
                        });
                        return match;
                    } catch {
                        return 'global';
                    }
                });
            }

            this.isInitialized = true;
            console.log('MultiInstanceIntegration: Setup complete');
        }

        /**
         * Setup Terminal modal integration
         */
        setupTerminalIntegration() {
            console.log('Setting up Terminal integration...');

            // Create tab manager for terminal
            const terminalTabManager = new window.WindowTabManager({
                containerId: 'terminal-tabs-container',
                instanceManager: window.TerminalInstanceManager,
                onTabSwitch: instanceId => {
                    // Set as active in manager first
                    window.TerminalInstanceManager.setActiveInstance(instanceId);
                    // Then show/hide instances
                    this.showInstance('terminal', instanceId);
                },
                onTabClose: _instanceId => {
                    // Instance will be destroyed by tab manager
                },
                onNewTab: () => {
                    // Create a new terminal instance
                    const count = window.TerminalInstanceManager.getInstanceCount();
                    window.TerminalInstanceManager.createInstance({
                        title: `Terminal ${count + 1}`,
                    });
                },
            });

            // Store integration info
            this.integrations.set('terminal', {
                manager: window.TerminalInstanceManager,
                tabManager: terminalTabManager,
                modalId: 'terminal-modal',
                containerId: 'terminal-container',
            });

            // Register keyboard shortcuts for Terminal (after integration is stored)
            this.registerShortcutsForType('terminal', window.TerminalInstanceManager);

            // Add tabs for any existing instances
            const existingTerminals = window.TerminalInstanceManager.getAllInstances();
            existingTerminals.forEach(instance => {
                terminalTabManager.addTab(instance);
            });

            // Show the active instance if any exist
            if (existingTerminals.length > 0) {
                const activeInstance = window.TerminalInstanceManager.getActiveInstance();
                if (activeInstance) {
                    this.showInstance('terminal', activeInstance.instanceId);
                }
            }

            // Listen for new instances and add tabs
            this.setupInstanceListeners('terminal');
        }

        /**
         * Setup Text Editor modal integration
         */
        setupTextEditorIntegration() {
            console.log('Setting up TextEditor integration...');

            // Create tab manager for text editor
            const editorTabManager = new window.WindowTabManager({
                containerId: 'text-editor-tabs-container',
                instanceManager: window.TextEditorInstanceManager,
                onTabSwitch: instanceId => {
                    // Set as active in manager first
                    window.TextEditorInstanceManager.setActiveInstance(instanceId);
                    // Then show/hide instances
                    this.showInstance('text-editor', instanceId);
                },
                onTabClose: _instanceId => {
                    // Instance will be destroyed by tab manager
                },
                onNewTab: () => {
                    // Create a new text editor instance
                    const count = window.TextEditorInstanceManager.getInstanceCount();
                    window.TextEditorInstanceManager.createInstance({
                        title: `Editor ${count + 1}`,
                    });
                },
            });

            // Store integration info
            this.integrations.set('text-editor', {
                manager: window.TextEditorInstanceManager,
                tabManager: editorTabManager,
                modalId: 'text-modal',
                containerId: 'text-editor-container',
            });

            // Register keyboard shortcuts for Text Editor (after integration is stored)
            this.registerShortcutsForType('text-editor', window.TextEditorInstanceManager);

            // Add tabs for any existing instances
            const existingEditors = window.TextEditorInstanceManager.getAllInstances();
            existingEditors.forEach(instance => {
                editorTabManager.addTab(instance);
            });

            // Show the active instance if any exist
            if (existingEditors.length > 0) {
                const activeInstance = window.TextEditorInstanceManager.getActiveInstance();
                if (activeInstance) {
                    this.showInstance('text-editor', activeInstance.instanceId);
                }
            }

            // Listen for new instances and add tabs
            this.setupInstanceListeners('text-editor');
        }

        /**
         * Setup Finder modal integration
         */
        setupFinderIntegration() {
            console.log('Setting up Finder integration...');

            // Create tab manager for finder
            const finderTabManager = new window.WindowTabManager({
                containerId: 'finder-tabs-container',
                instanceManager: window.FinderInstanceManager,
                onTabSwitch: instanceId => {
                    // Set as active in manager first
                    window.FinderInstanceManager.setActiveInstance(instanceId);
                    // Then show/hide instances
                    this.showInstance('finder', instanceId);
                },
                onTabClose: _instanceId => {
                    // Instance will be destroyed by tab manager
                },
                onNewTab: () => {
                    // Create a new finder instance
                    const count = window.FinderInstanceManager.getInstanceCount();
                    window.FinderInstanceManager.createInstance({
                        title: `Finder ${count + 1}`,
                    });
                },
                // Close the Finder modal if the last tab was closed
                onAllTabsClosed: () => {
                    if (window.API?.window?.close) {
                        window.API.window.close('finder-modal');
                    } else {
                        const modal = document.getElementById('finder-modal');
                        if (modal) modal.classList.add('hidden');
                    }
                },
            });

            // Store integration info
            this.integrations.set('finder', {
                manager: window.FinderInstanceManager,
                tabManager: finderTabManager,
                modalId: 'finder-modal',
                containerId: 'finder-container',
            });

            // Register keyboard shortcuts for Finder (after integration is stored)
            this.registerShortcutsForType('finder', window.FinderInstanceManager);

            // Add tabs for any existing instances
            const existingFinders = window.FinderInstanceManager.getAllInstances();
            existingFinders.forEach(instance => {
                finderTabManager.addTab(instance);
            });

            // Show the active instance if any exist
            if (existingFinders.length > 0) {
                const activeInstance = window.FinderInstanceManager.getActiveInstance();
                if (activeInstance) {
                    this.showInstance('finder', activeInstance.instanceId);
                }
            }

            // Listen for new instances and add tabs
            this.setupInstanceListeners('finder');
        }

        /**
         * Setup listeners for instance creation/destruction
         * @param {string} type - Instance type
         */
        setupInstanceListeners(type) {
            const integration = this.integrations.get(type);
            if (!integration) return;

            const { manager, tabManager, containerId: _containerId } = integration;

            // Listen for instance creation (via manager)
            const originalCreate = manager.createInstance.bind(manager);
            manager.createInstance = config => {
                const instance = originalCreate(config);
                if (instance) {
                    // Add tab for this instance
                    tabManager.addTab(instance);

                    // Show/hide instances based on active state
                    this.updateInstanceVisibility(type);
                }
                return instance;
            };

            // Listen for instance destruction (via manager)
            const originalDestroy = manager.destroyInstance.bind(manager);
            manager.destroyInstance = instanceId => {
                originalDestroy(instanceId);
                // After destruction, force tab UI refresh to ensure sync
                if (
                    tabManager &&
                    tabManager.controller &&
                    typeof tabManager.controller.refresh === 'function'
                ) {
                    tabManager.controller.refresh();
                }
            };
        }

        /**
         * Show a specific instance and hide others
         * @param {string} type - Instance type
         * @param {string} instanceId - Instance ID to show
         */
        showInstance(type, instanceId) {
            const integration = this.integrations.get(type);
            if (!integration) return;

            const instances = integration.manager.getAllInstances();
            instances.forEach(instance => {
                if (instance.instanceId === instanceId) {
                    instance.show();
                } else {
                    instance.hide();
                }
            });
        }

        /**
         * Update visibility of all instances for a type
         * @param {string} type - Instance type
         */
        updateInstanceVisibility(type) {
            const integration = this.integrations.get(type);
            if (!integration) return;

            const activeInstance = integration.manager.getActiveInstance();
            if (activeInstance) {
                this.showInstance(type, activeInstance.instanceId);
            }
        }

        /**
         * Register keyboard shortcuts for a window type
         * @param {string} type - Window type
         * @param {InstanceManager} manager - Instance manager
         */
        registerShortcutsForType(type, manager) {
            // Get the modal element to scope shortcuts to
            const integration = this.integrations.get(type);
            const modalId = integration?.modalId;
            if (!modalId) {
                console.error(`Cannot register shortcuts for ${type}: no modalId found`);
                return;
            }

            const modalElement = document.getElementById(modalId);
            if (!modalElement) {
                console.error(
                    `Cannot register shortcuts for ${type}: modal element ${modalId} not found`
                );
                return;
            }

            console.log(`Registering shortcuts for ${type} on modal ${modalId}`, modalElement);

            // Use manager-style registration scoped to document
            // Modal-scoped registration doesn't work because keyboard events require element focus
            // Instead, we rely on the manager's instance state to determine if shortcuts should fire
            const unregister = window.KeyboardShortcuts.register(manager, {
                scope: document,
                newTitleFactory: () => `${type} ${manager.getInstanceCount() + 1}`,
            });

            console.log(`Successfully registered shortcuts for ${type}`);

            // Store unregister function for cleanup if needed
            if (integration) {
                integration.unregisterShortcuts = unregister;
            }
        }

        /**
         * Get integration for a type
         * @param {string} type
         * @returns {Object|null}
         */
        getIntegration(type) {
            return this.integrations.get(type) || null;
        }
    }

    // Create singleton instance
    const integration = new MultiInstanceIntegration();

    // Export to global scope
    window.MultiInstanceIntegration = integration;

    // Auto-initialize
    integration.init();
})();

