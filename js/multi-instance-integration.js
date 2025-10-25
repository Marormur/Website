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
            if (
                !window.InstanceManager ||
                !window.WindowTabManager ||
                !window.KeyboardShortcuts
            ) {
                console.error(
                    'MultiInstanceIntegration: Required dependencies not loaded',
                );
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
                        window.TerminalInstanceManager,
                    );
                }
                if (window.TextEditorInstanceManager) {
                    window.SessionManager.registerManager(
                        'text-editor',
                        window.TextEditorInstanceManager,
                    );
                }
                if (window.FinderInstanceManager) {
                    window.SessionManager.registerManager('finder', window.FinderInstanceManager);
                }

                // Start auto-save
                window.SessionManager.startAutoSave();
            }

            // Provide a precise context resolver to KeyboardShortcuts
            if (window.KeyboardShortcuts && typeof window.KeyboardShortcuts.setContextResolver === 'function') {
                window.KeyboardShortcuts.setContextResolver(() => {
                    try {
                        const wm = window.WindowManager;
                        const top = wm && typeof wm.getTopWindow === 'function' ? wm.getTopWindow() : null;
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
                onTabSwitch: (instanceId) => {
                    // Set as active in manager first
                    window.TerminalInstanceManager.setActiveInstance(
                        instanceId,
                    );
                    // Then show/hide instances
                    this.showInstance('terminal', instanceId);
                },
                onTabClose: (_instanceId) => {
                    // Instance will be destroyed by tab manager
                },
                onNewTab: () => {
                    // Create a new terminal instance
                    const count =
                        window.TerminalInstanceManager.getInstanceCount();
                    window.TerminalInstanceManager.createInstance({
                        title: `Terminal ${count + 1}`,
                    });
                },
            });

            // Register keyboard shortcuts for Terminal
            this.registerShortcutsForType(
                'terminal',
                window.TerminalInstanceManager,
            );

            // Store integration info
            this.integrations.set('terminal', {
                manager: window.TerminalInstanceManager,
                tabManager: terminalTabManager,
                modalId: 'terminal-modal',
                containerId: 'terminal-container',
            });

            // Add tabs for any existing instances
            const existingTerminals =
                window.TerminalInstanceManager.getAllInstances();
            existingTerminals.forEach((instance) => {
                terminalTabManager.addTab(instance);
            });

            // Show the active instance if any exist
            if (existingTerminals.length > 0) {
                const activeInstance =
                    window.TerminalInstanceManager.getActiveInstance();
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
                onTabSwitch: (instanceId) => {
                    // Set as active in manager first
                    window.TextEditorInstanceManager.setActiveInstance(
                        instanceId,
                    );
                    // Then show/hide instances
                    this.showInstance('text-editor', instanceId);
                },
                onTabClose: (_instanceId) => {
                    // Instance will be destroyed by tab manager
                },
                onNewTab: () => {
                    // Create a new text editor instance
                    const count =
                        window.TextEditorInstanceManager.getInstanceCount();
                    window.TextEditorInstanceManager.createInstance({
                        title: `Editor ${count + 1}`,
                    });
                },
            });

            // Register keyboard shortcuts for Text Editor
            this.registerShortcutsForType(
                'text-editor',
                window.TextEditorInstanceManager,
            );

            // Store integration info
            this.integrations.set('text-editor', {
                manager: window.TextEditorInstanceManager,
                tabManager: editorTabManager,
                modalId: 'text-modal',
                containerId: 'text-editor-container',
            });

            // Add tabs for any existing instances
            const existingEditors =
                window.TextEditorInstanceManager.getAllInstances();
            existingEditors.forEach((instance) => {
                editorTabManager.addTab(instance);
            });

            // Show the active instance if any exist
            if (existingEditors.length > 0) {
                const activeInstance =
                    window.TextEditorInstanceManager.getActiveInstance();
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
                onTabSwitch: (instanceId) => {
                    // Set as active in manager first
                    window.FinderInstanceManager.setActiveInstance(instanceId);
                    // Then show/hide instances
                    this.showInstance('finder', instanceId);
                },
                onTabClose: (_instanceId) => {
                    // Instance will be destroyed by tab manager
                },
                onNewTab: () => {
                    // Create a new finder instance
                    const count = window.FinderInstanceManager.getInstanceCount();
                    window.FinderInstanceManager.createInstance({
                        title: `Finder ${count + 1}`
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
                }
            });

            // Register keyboard shortcuts for Finder
            this.registerShortcutsForType('finder', window.FinderInstanceManager);

            // Store integration info
            this.integrations.set('finder', {
                manager: window.FinderInstanceManager,
                tabManager: finderTabManager,
                modalId: 'finder-modal',
                containerId: 'finder-container'
            });

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
            manager.createInstance = (config) => {
                const instance = originalCreate(config);
                if (instance) {
                    // Add tab for this instance
                    tabManager.addTab(instance);

                    // Show/hide instances based on active state
                    this.updateInstanceVisibility(type);
                }
                return instance;
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
            instances.forEach((instance) => {
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
            // Cmd/Ctrl+N - New instance
            window.KeyboardShortcuts.register({
                key: 'n',
                ctrl: true,
                handler: () => {
                    const activeInstance = manager.getActiveInstance();
                    if (activeInstance && activeInstance.isVisible) {
                        manager.createInstance({
                            title: `${type} ${manager.getInstanceCount() + 1}`,
                        });
                    }
                },
                description: `New ${type} instance`,
                context: type,
            });

            // Cmd/Ctrl+W - Close instance
            window.KeyboardShortcuts.register({
                key: 'w',
                ctrl: true,
                handler: () => {
                    const activeInstance = manager.getActiveInstance();
                    if (activeInstance && activeInstance.isVisible) {
                        // Use tab manager's closeTab to properly remove tab UI and destroy instance
                        const integration = this.integrations.get(type);
                        if (integration && integration.tabManager) {
                            integration.tabManager.closeTab(activeInstance.instanceId);
                        } else {
                            // Fallback if no tab manager (shouldn't happen in multi-instance integrations)
                            manager.destroyInstance(activeInstance.instanceId);
                        }
                    }
                },
                description: `Close ${type} instance`,
                context: type,
            });

            // Cmd/Ctrl+Tab - Next tab
            window.KeyboardShortcuts.register({
                key: 'tab',
                ctrl: true,
                handler: () => {
                    const instances = manager.getAllInstances();
                    const activeInstance = manager.getActiveInstance();

                    if (instances.length <= 1 || !activeInstance) return;

                    const currentIndex = instances.findIndex(
                        (i) => i.instanceId === activeInstance.instanceId,
                    );
                    const nextIndex = (currentIndex + 1) % instances.length;
                    manager.setActiveInstance(instances[nextIndex].instanceId);
                },
                description: `Next ${type} tab`,
                context: type,
            });

            // Cmd/Ctrl+Shift+Tab - Previous tab
            window.KeyboardShortcuts.register({
                key: 'tab',
                ctrl: true,
                shift: true,
                handler: () => {
                    const instances = manager.getAllInstances();
                    const activeInstance = manager.getActiveInstance();

                    if (instances.length <= 1 || !activeInstance) return;

                    const currentIndex = instances.findIndex(
                        (i) => i.instanceId === activeInstance.instanceId,
                    );
                    const prevIndex =
                        (currentIndex - 1 + instances.length) %
                        instances.length;
                    manager.setActiveInstance(instances[prevIndex].instanceId);
                },
                description: `Previous ${type} tab`,
                context: type,
            });

            // Cmd/Ctrl+1-9 - Jump to specific tab
            for (let i = 1; i <= 9; i++) {
                window.KeyboardShortcuts.register({
                    key: i.toString(),
                    ctrl: true,
                    handler: () => {
                        const instances = manager.getAllInstances();
                        if (instances[i - 1]) {
                            manager.setActiveInstance(
                                instances[i - 1].instanceId,
                            );
                        }
                    },
                    description: `Jump to ${type} tab ${i}`,
                    context: type,
                });
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
