console.log('InstanceManager loaded');

/**
 * InstanceManager - Verwaltet mehrere Instanzen eines Fenstertyps
 * 
 * Ermöglicht:
 * - Mehrere Finder, Terminal, TextEditor Fenster gleichzeitig
 * - Zentrale Instance-Verwaltung
 * - Lifecycle-Management
 * - Persistierung und Wiederherstellung
 */
(function () {
    'use strict';

    /**
     * Manages multiple instances of a window type
     */
    class InstanceManager {
        /**
         * @param {Object} config
         * @param {string} config.type - Window type (e.g., 'finder', 'terminal')
         * @param {Class} config.instanceClass - Class to instantiate
         * @param {number} config.maxInstances - Maximum number of instances (0 = unlimited)
         * @param {Function} config.createContainer - Function to create DOM container
         */
        constructor(config) {
            this.type = config.type;
            this.instanceClass = config.instanceClass;
            this.maxInstances = config.maxInstances || 0;
            this.createContainer = config.createContainer || this._defaultCreateContainer.bind(this);

            this.instances = new Map();
            this.activeInstanceId = null;
            this.instanceCounter = 0;
        }

        /**
         * Create a new instance
         * @param {Object} config - Instance configuration
         * @returns {BaseWindowInstance|null}
         */
        createInstance(config = {}) {
            // Check max instances limit
            if (this.maxInstances > 0 && this.instances.size >= this.maxInstances) {
                console.warn(`Maximum instances (${this.maxInstances}) reached for ${this.type}`);
                return null;
            }

            this.instanceCounter++;
            const instanceId = config.id || `${this.type}-${this.instanceCounter}`;

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
                metadata: config.metadata || {}
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
         * Get instance by ID
         * @param {string} instanceId
         * @returns {BaseWindowInstance|null}
         */
        getInstance(instanceId) {
            return this.instances.get(instanceId) || null;
        }

        /**
         * Get active instance
         * @returns {BaseWindowInstance|null}
         */
        getActiveInstance() {
            return this.activeInstanceId ? this.instances.get(this.activeInstanceId) : null;
        }

        /**
         * Set active instance
         * @param {string} instanceId
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
         * Get all instances
         * @returns {Array<BaseWindowInstance>}
         */
        getAllInstances() {
            return Array.from(this.instances.values());
        }

        /**
         * Get all instance IDs
         * @returns {Array<string>}
         */
        getAllInstanceIds() {
            return Array.from(this.instances.keys());
        }

        /**
         * Destroy an instance
         * @param {string} instanceId
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
                this.activeInstanceId = remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : null;
            }

            console.log(`Destroyed instance: ${instanceId}`);
        }

        /**
         * Destroy all instances
         */
        destroyAllInstances() {
            this.instances.forEach((instance, id) => {
                instance.destroy();
            });
            this.instances.clear();
            this.activeInstanceId = null;
        }

        /**
         * Check if type has any instances
         * @returns {boolean}
         */
        hasInstances() {
            return this.instances.size > 0;
        }

        /**
         * Get instance count
         * @returns {number}
         */
        getInstanceCount() {
            return this.instances.size;
        }

        /**
         * Serialize all instances for persistence
         * @returns {Array<Object>}
         */
        serializeAll() {
            return this.getAllInstances().map(instance => instance.serialize());
        }

        /**
         * Restore instances from serialized data
         * @param {Array<Object>} data
         */
        deserializeAll(data) {
            if (!Array.isArray(data)) return;

            data.forEach(instanceData => {
                const instance = this.createInstance({
                    id: instanceData.instanceId,
                    title: instanceData.title,
                    metadata: instanceData.metadata
                });

                if (instance && instanceData.state) {
                    instance.deserialize(instanceData);
                }
            });
        }

        /**
         * Default container creation
         * @private
         */
        _defaultCreateContainer(instanceId) {
            const container = document.createElement('div');
            container.id = `${instanceId}-container`;
            container.className = 'instance-container';
            document.body.appendChild(container);
            return container;
        }

        /**
         * Setup event listeners for an instance
         * @private
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
