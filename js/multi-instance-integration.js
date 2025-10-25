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

            // Register managers with session manager
            if (window.SessionManager) {
                if (window.TerminalInstanceManager) {
                    window.SessionManager.registerManager('terminal', window.TerminalInstanceManager);
                }
                if (window.TextEditorInstanceManager) {
                    window.SessionManager.registerManager('text-editor', window.TextEditorInstanceManager);
                }

                // Start auto-save
                window.SessionManager.startAutoSave();
            }

            this.isInitialized = true;
            console.log('MultiInstanceIntegration: Setup complete');
        }

        /**
         * Setup Terminal modal integration
         */
        setupTerminalIntegration() {
            console.log('Setting up Terminal integration...');

            // Register keyboard shortcuts for Terminal
            this.registerShortcutsForType('terminal', window.TerminalInstanceManager);

            // Store integration info
            this.integrations.set('terminal', {
                manager: window.TerminalInstanceManager,
                modalId: 'terminalModal'
            });
        }

        /**
         * Setup Text Editor modal integration
         */
        setupTextEditorIntegration() {
            console.log('Setting up TextEditor integration...');

            // Register keyboard shortcuts for Text Editor
            this.registerShortcutsForType('text-editor', window.TextEditorInstanceManager);

            // Store integration info
            this.integrations.set('text-editor', {
                manager: window.TextEditorInstanceManager,
                modalId: 'textEditorModal'
            });
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
                            title: `${type} ${manager.getInstanceCount() + 1}`
                        });
                    }
                },
                description: `New ${type} instance`,
                context: type
            });

            // Cmd/Ctrl+W - Close instance
            window.KeyboardShortcuts.register({
                key: 'w',
                ctrl: true,
                handler: () => {
                    const activeInstance = manager.getActiveInstance();
                    if (activeInstance && activeInstance.isVisible) {
                        manager.destroyInstance(activeInstance.instanceId);
                    }
                },
                description: `Close ${type} instance`,
                context: type
            });

            // Cmd/Ctrl+Tab - Next tab
            window.KeyboardShortcuts.register({
                key: 'tab',
                ctrl: true,
                handler: () => {
                    const instances = manager.getAllInstances();
                    const activeInstance = manager.getActiveInstance();
                    
                    if (instances.length <= 1 || !activeInstance) return;
                    
                    const currentIndex = instances.findIndex(i => i.instanceId === activeInstance.instanceId);
                    const nextIndex = (currentIndex + 1) % instances.length;
                    manager.setActiveInstance(instances[nextIndex].instanceId);
                },
                description: `Next ${type} tab`,
                context: type
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
                    
                    const currentIndex = instances.findIndex(i => i.instanceId === activeInstance.instanceId);
                    const prevIndex = (currentIndex - 1 + instances.length) % instances.length;
                    manager.setActiveInstance(instances[prevIndex].instanceId);
                },
                description: `Previous ${type} tab`,
                context: type
            });

            // Cmd/Ctrl+1-9 - Jump to specific tab
            for (let i = 1; i <= 9; i++) {
                window.KeyboardShortcuts.register({
                    key: i.toString(),
                    ctrl: true,
                    handler: () => {
                        const instances = manager.getAllInstances();
                        if (instances[i - 1]) {
                            manager.setActiveInstance(instances[i - 1].instanceId);
                        }
                    },
                    description: `Jump to ${type} tab ${i}`,
                    context: type
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
