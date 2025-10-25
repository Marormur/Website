console.log('InstanceManager loaded');

/**
 * InstanceManager - Manages multiple instances of a window type
 * 
 * Provides centralized management for multi-instance windows (Finder, Terminal, TextEditor).
 * Handles instance lifecycle, active instance tracking, and state persistence.
 * 
 * Features:
 * - Multiple windows of the same type simultaneously
 * - Centralized instance registry and lifecycle management
 * - Active instance tracking and focus management
 * - State persistence and restoration via serialize/deserialize
 * - Maximum instance limits (configurable per type)
 * 
 * @module InstanceManager
 * @example
 * // Create a terminal instance manager
 * const terminalManager = new InstanceManager({
 *     type: 'terminal',
 *     instanceClass: TerminalInstance,
 *     maxInstances: 5,
 *     createContainer: (id) => {
 *         const div = document.createElement('div');
 *         div.id = `${id}-container`;
 *         document.body.appendChild(div);
 *         return div;
 *     }
 * });
 * 
 * // Create instances
 * const term1 = terminalManager.createInstance({ title: 'Dev Terminal' });
 * const term2 = terminalManager.createInstance({ title: 'Build Terminal' });
 * 
 * // Manage instances
 * terminalManager.setActiveInstance(term1.instanceId);
 * terminalManager.destroyInstance(term2.instanceId);
 */
(function () {
    'use strict';

    /**
     * Manages multiple instances of a window type
     */
    class InstanceManager {
        /**
         * Create an instance manager for a specific window type
         * 
         * @param {Object} config - Manager configuration
         * @param {string} config.type - Window type identifier (e.g., 'finder', 'terminal', 'text-editor')
         * @param {Class} config.instanceClass - Class to instantiate (must extend BaseWindowInstance)
         * @param {number} [config.maxInstances=0] - Maximum allowed instances (0 = unlimited)
         * @param {Function} [config.createContainer] - Custom container creation function. Receives instanceId, returns HTMLElement
         * 
         * @example
         * new InstanceManager({
         *     type: 'terminal',
         *     instanceClass: TerminalInstance,
         *     maxInstances: 10,
         *     createContainer: (id) => { ... }
         * });
         */
        constructor(config) {
            this.type = config.type;
            this.instanceClass = config.instanceClass;
            this.maxInstances = config.maxInstances || 0;
            this.createContainer =
                config.createContainer ||
                this._defaultCreateContainer.bind(this);

            this.instances = new Map();
            this.activeInstanceId = null;
            this.instanceCounter = 0;
        }

        /**
         * Create a new instance of the managed window type
         * 
         * Enforces max instance limits, creates DOM container, instantiates the window class,
         * initializes it, and registers event listeners.
         * 
         * @param {Object} [config={}] - Instance configuration
         * @param {string} [config.id] - Explicit instance ID (auto-generated if omitted)
         * @param {string} [config.title] - Window title (defaults to "{type} {counter}")
         * @param {Object} [config.initialState] - Initial state object passed to instance
         * @param {Object} [config.metadata] - Additional metadata for the instance
         * 
         * @returns {BaseWindowInstance|null} Created instance or null if creation failed
         * 
         * @example
         * const terminal = manager.createInstance({
         *     title: 'Production Server',
         *     initialState: { currentPath: '/var/www' },
         *     metadata: { environment: 'production' }
         * });
         */
        createInstance(config = {}) {
            // Check max instances limit
            if (
                this.maxInstances > 0 &&
                this.instances.size >= this.maxInstances
            ) {
                console.warn(
                    `Maximum instances (${this.maxInstances}) reached for ${this.type}`,
                );
                return null;
            }

            this.instanceCounter++;
            const instanceId =
                config.id || `${this.type}-${this.instanceCounter}`;

            // Create DOM container
            const container = this.createContainer(instanceId);
            if (!container) {
                console.error('Failed to create container for instance');
                return null;
            }

            // Create instance
            const instanceConfig = {
                id: instanceId,
                type: this.type,
                title: config.title || `${this.type} ${this.instanceCounter}`,
                initialState: config.initialState || {},
                metadata: config.metadata || {},
            };

            const instance = new this.instanceClass(instanceConfig);

            // Initialize instance
            try {
                instance.init(container);
                this.instances.set(instanceId, instance);
                this.activeInstanceId = instanceId;

                // Setup instance event listeners
                this._setupInstanceEvents(instance);

                console.log(`Created instance: ${instanceId}`);
                return instance;
            } catch (error) {
                console.error('Failed to initialize instance:', error);
                container.remove();
                return null;
            }
        }

        /**
         * Get a specific instance by its ID
         * 
         * @param {string} instanceId - Instance identifier to retrieve
         * @returns {BaseWindowInstance|null} Instance object or null if not found
         * 
         * @example
         * const term = manager.getInstance('terminal-1');
         * if (term) term.executeCommand('ls -la');
         */
        getInstance(instanceId) {
            return this.instances.get(instanceId) || null;
        }

        /**
         * Get the currently active (focused) instance
         * 
         * @returns {BaseWindowInstance|null} Active instance or null if none active
         * 
         * @example
         * const activeTerminal = terminalManager.getActiveInstance();
         * if (activeTerminal) console.log(activeTerminal.state);
         */
        getActiveInstance() {
            return this.activeInstanceId
                ? this.instances.get(this.activeInstanceId)
                : null;
        }

        /**
         * Set the active (focused) instance
         * 
         * Blurs the previously active instance and focuses the new one.
         * Instance must exist in the registry.
         * 
         * @param {string} instanceId - ID of instance to activate
         * 
         * @example
         * manager.setActiveInstance('terminal-2');
         */
        setActiveInstance(instanceId) {
            if (this.instances.has(instanceId)) {
                const previousId = this.activeInstanceId;
                this.activeInstanceId = instanceId;

                // Blur previous instance
                if (previousId && previousId !== instanceId) {
                    const previousInstance = this.instances.get(previousId);
                    if (previousInstance) {
                        previousInstance.blur();
                    }
                }

                // Focus new instance
                const instance = this.instances.get(instanceId);
                if (instance) {
                    instance.focus();
                }
            }
        }

        /**
         * Get all instances as an array
         * 
         * @returns {Array<BaseWindowInstance>} Array of all instance objects
         * 
         * @example
         * manager.getAllInstances().forEach(term => term.executeCommand('clear'));
         */
        getAllInstances() {
            return Array.from(this.instances.values());
        }

        /**
         * Get all instance IDs as an array
         * 
         * @returns {Array<string>} Array of instance ID strings
         * 
         * @example
         * const ids = manager.getAllInstanceIds(); // ['terminal-1', 'terminal-2']
         */
        getAllInstanceIds() {
            return Array.from(this.instances.keys());
        }

        /**
         * Destroy a specific instance and remove it from the registry
         * 
         * Calls instance.destroy() for cleanup, removes from registry,
         * and updates active instance if the destroyed instance was active.
         * 
         * @param {string} instanceId - ID of instance to destroy
         * 
         * @example
         * manager.destroyInstance('terminal-3');
         */
        destroyInstance(instanceId) {
            const instance = this.instances.get(instanceId);
            if (!instance) {
                console.warn(`Instance ${instanceId} not found`);
                return;
            }

            instance.destroy();
            this.instances.delete(instanceId);

            // Update active instance if needed
            if (this.activeInstanceId === instanceId) {
                const remainingIds = this.getAllInstanceIds();
                this.activeInstanceId =
                    remainingIds.length > 0
                        ? remainingIds[remainingIds.length - 1]
                        : null;
            }

            console.log(`Destroyed instance: ${instanceId}`);
        }

        /**
         * Destroy all instances managed by this manager
         * 
         * Calls destroy() on each instance, clears the registry,
         * and resets active instance to null.
         * 
         * @example
         * manager.destroyAllInstances(); // Clean slate
         */
        destroyAllInstances() {
            this.instances.forEach((instance) => {
                instance.destroy();
            });
            this.instances.clear();
            this.activeInstanceId = null;
        }

        /**
         * Check if this manager has any active instances
         * 
         * @returns {boolean} True if at least one instance exists
         * 
         * @example
         * if (!manager.hasInstances()) {
         *     console.log('No terminals open');
         * }
         */
        hasInstances() {
            return this.instances.size > 0;
        }

        /**
         * Get the total number of instances
         * 
         * @returns {number} Count of instances in the registry
         * 
         * @example
         * console.log(`${manager.getInstanceCount()} terminals open`);
         */
        getInstanceCount() {
            return this.instances.size;
        }

        /**
         * Serialize all instances for state persistence
         * 
         * Calls serialize() on each instance to collect state snapshots.
         * Used for saving window layouts to localStorage.
         * 
         * @returns {Array<Object>} Array of serialized instance state objects
         * 
         * @example
         * const states = manager.serializeAll();
         * localStorage.setItem('terminal-states', JSON.stringify(states));
         */
        serializeAll() {
            return this.getAllInstances().map((instance) =>
                instance.serialize(),
            );
        }

        /**
         * Restore instances from serialized state data
         * 
         * Creates new instances and restores their state from previously saved data.
         * Used for restoring window layouts from localStorage.
         * 
         * @param {Array<Object>} data - Array of serialized instance states
         * 
         * @example
         * const states = JSON.parse(localStorage.getItem('terminal-states'));
         * manager.deserializeAll(states);
         */
        deserializeAll(data) {
            if (!Array.isArray(data)) return;

            data.forEach((instanceData) => {
                const instance = this.createInstance({
                    id: instanceData.instanceId,
                    title: instanceData.title,
                    metadata: instanceData.metadata,
                });

                if (instance && instanceData.state) {
                    instance.deserialize(instanceData);
                }
            });
        }

        /**
         * Create default DOM container for an instance
         * 
         * @private
         * @param {string} instanceId - Unique identifier for the instance
         * @returns {HTMLElement} Container div appended to document.body
         */
        _defaultCreateContainer(instanceId) {
            const container = document.createElement('div');
            container.id = `${instanceId}-container`;
            container.className = 'instance-container';
            document.body.appendChild(container);
            return container;
        }

        /**
         * Setup event listeners for instance lifecycle events
         * 
         * Listens to 'focused' event to update active instance tracking,
         * and 'destroyed' event to remove instance from registry.
         * 
         * @private
         * @param {BaseWindowInstance} instance - Instance to attach listeners to
         */
        _setupInstanceEvents(instance) {
            instance.on('focused', () => {
                this.setActiveInstance(instance.instanceId);
            });

            instance.on('destroyed', () => {
                this.instances.delete(instance.instanceId);
            });
        }
    }

    // Export to global scope
    window.InstanceManager = InstanceManager;
})();
