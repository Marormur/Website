'use strict';
console.log('InstanceManager loaded');
(function () {
    'use strict';
    class InstanceManager {
        constructor(config) {
            this.type = config.type;
            this.instanceClass = config.instanceClass;
            this.maxInstances = config.maxInstances || 0;
            this.createContainer = config.createContainer || this._defaultCreateContainer.bind(this);
            this.instances = new Map();
            this.activeInstanceId = null;
            this.instanceCounter = 0;
        }
        createInstance(config = {}) {
            if (this.maxInstances > 0 && this.instances.size >= this.maxInstances) {
                console.warn(`Maximum instances (${this.maxInstances}) reached for ${this.type}`);
                return null;
            }
            this.instanceCounter++;
            const instanceId = config.id || `${this.type}-${this.instanceCounter}`;
            const container = this.createContainer(instanceId);
            if (!container) {
                console.error('Failed to create container for instance');
                return null;
            }
            const instanceConfig = {
                id: instanceId,
                type: this.type,
                title: config.title || `${this.type} ${this.instanceCounter}`,
                initialState: config.initialState || {},
                metadata: config.metadata || {},
            };
            const instance = new this.instanceClass(instanceConfig);
            try {
                instance.init(container);
                this.instances.set(instanceId, instance);
                this.activeInstanceId = instanceId;
                this._setupInstanceEvents(instance);
                console.log(`Created instance: ${instanceId}`);
                return instance;
            }
            catch (error) {
                console.error('Failed to initialize instance:', error);
                container.remove();
                return null;
            }
        }
        getInstance(instanceId) {
            return this.instances.get(instanceId) || null;
        }
        getActiveInstance() {
            return this.activeInstanceId ? this.instances.get(this.activeInstanceId) || null : null;
        }
        setActiveInstance(instanceId) {
            if (this.instances.has(instanceId)) {
                const previousId = this.activeInstanceId;
                // Guard: avoid recursion if already active
                if (previousId === instanceId) {
                    return;
                }
                this.activeInstanceId = instanceId;
                // Blur previous instance
                if (previousId) {
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
        getAllInstances() {
            return Array.from(this.instances.values());
        }
        getAllInstanceIds() {
            return Array.from(this.instances.keys());
        }
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
                // noUncheckedIndexedAccess: array access returns T | undefined
                const lastId = remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : undefined;
                this.activeInstanceId = lastId ?? null;
            }
            console.log(`Destroyed instance: ${instanceId}`);
        }
        destroyAllInstances() {
            this.instances.forEach((instance) => {
                instance.destroy();
            });
            this.instances.clear();
            this.activeInstanceId = null;
        }
        hasInstances() {
            return this.instances.size > 0;
        }
        getInstanceCount() {
            return this.instances.size;
        }
        serializeAll() {
            return this.getAllInstances().map((instance) => instance.serialize());
        }
        deserializeAll(data) {
            if (!Array.isArray(data))
                return;
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
         * Reorder instances to match the provided array of instance IDs
         * @param newOrder - Array of instance IDs in the desired order
         */
        reorderInstances(newOrder) {
            // Validate that all IDs exist
            const validIds = newOrder.filter(id => this.instances.has(id));
            if (validIds.length !== this.instances.size) {
                console.warn('Invalid reorder: not all instance IDs provided or some IDs do not exist');
                return;
            }
            // Create a new Map with the desired order
            const newMap = new Map();
            validIds.forEach(id => {
                const instance = this.instances.get(id);
                if (instance) {
                    newMap.set(id, instance);
                }
            });
            // Replace the instances map
            this.instances = newMap;
            console.log('Instances reordered:', validIds);
        }
        _defaultCreateContainer(instanceId) {
            const container = document.createElement('div');
            container.id = `${instanceId}-container`;
            container.className = 'instance-container';
            document.body.appendChild(container);
            return container;
        }
        _setupInstanceEvents(instance) {
            instance.on('focused', () => {
                this.setActiveInstance(instance.instanceId);
            });
            instance.on('destroyed', () => {
                this.instances.delete(instance.instanceId);
            });
        }
    }
    window.InstanceManager = InstanceManager;
})();
//# sourceMappingURL=instance-manager.js.map