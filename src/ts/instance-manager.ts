import { triggerAutoSave } from './utils/auto-save-helper.js';

console.log('InstanceManager loaded');

(function () {
    'use strict';

    type BaseInstanceLike = {
        instanceId: string;
        init: (container: HTMLElement) => void;
        destroy: () => void;
        blur: () => void;
        focus: () => void;
        serialize: () => Record<string, unknown>;
        deserialize: (data: Record<string, unknown>) => void;
        on: (event: string, callback: (data?: unknown) => void) => void;
    };

    type InstanceConstructor = new (config: Record<string, unknown>) => BaseInstanceLike;

    type ManagerConfig = {
        type: string;
        instanceClass: InstanceConstructor;
        maxInstances?: number;
        createContainer?: (instanceId: string) => HTMLElement | null;
    };

    type CreateInstanceConfig = {
        id?: string;
        title?: string;
        initialState?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
    };

    class InstanceManager {
        type: string;
        instanceClass: InstanceConstructor;
        maxInstances: number;
        createContainer: (instanceId: string) => HTMLElement | null;
        instances: Map<string, BaseInstanceLike>;
        activeInstanceId: string | null;
        instanceCounter: number;

        constructor(config: ManagerConfig) {
            this.type = config.type;
            this.instanceClass = config.instanceClass;
            this.maxInstances = config.maxInstances || 0;
            this.createContainer =
                config.createContainer || this._defaultCreateContainer.bind(this);

            this.instances = new Map();
            this.activeInstanceId = null;
            this.instanceCounter = 0;
        }

        createInstance(config: CreateInstanceConfig = {}): BaseInstanceLike | null {
            if (this.maxInstances > 0 && this.instances.size >= this.maxInstances) {
                console.warn(`Maximum instances (${this.maxInstances}) reached for ${this.type}`);
                return null;
            }

            this.instanceCounter++;
            const instanceId = config.id || `${this.type}-${this.instanceCounter}`;

            // Guard: If an instance with this ID already exists, reuse it instead of creating
            // a new container. This prevents duplicate DOM containers and double-rendering
            // when restore flows or legacy init handlers accidentally create the same ID twice.
            if (config.id && this.instances.has(instanceId)) {
                console.warn(
                    `Instance with id ${instanceId} already exists for ${this.type}; reusing existing instance.`
                );
                const existing = this.instances.get(instanceId)!;
                // Optionally update title/metadata
                try {
                    (existing as any).title = config.title || (existing as any).title;
                    (existing as any).metadata = {
                        ...(existing as any).metadata,
                        ...(config.metadata || {}),
                    };
                } catch {}
                // Make it active to sync with UI
                this.setActiveInstance(instanceId);
                // Trigger auto-save to persist consistency
                this._triggerAutoSave();
                return existing;
            }

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

                this._setupInstanceEvents(instance);

                // Set as active instance (triggers focus and events)
                this.setActiveInstance(instanceId);

                // Trigger auto-save after instance creation
                this._triggerAutoSave();

                console.log(`Created instance: ${instanceId}`);
                return instance;
            } catch (error) {
                console.error('Failed to initialize instance:', error);
                container.remove();
                return null;
            }
        }

        getInstance(instanceId: string): BaseInstanceLike | null {
            return this.instances.get(instanceId) || null;
        }

        getActiveInstance(): BaseInstanceLike | null {
            return this.activeInstanceId ? this.instances.get(this.activeInstanceId) || null : null;
        }

        setActiveInstance(instanceId: string): void {
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

                // Persist active tab selection (debounced via SessionManager)
                this._triggerAutoSave();

                // Additionally persist active selection per type in localStorage for robust restore
                try {
                    const KEY = 'windowActiveInstances';
                    const raw = localStorage.getItem(KEY);
                    const map = raw ? (JSON.parse(raw) as Record<string, string | null>) : {};
                    map[this.type] = this.activeInstanceId;
                    localStorage.setItem(KEY, JSON.stringify(map));
                } catch {
                    // ignore storage failures
                }
            }
        }

        getAllInstances(): BaseInstanceLike[] {
            return Array.from(this.instances.values());
        }

        getAllInstanceIds(): string[] {
            return Array.from(this.instances.keys());
        }

        destroyInstance(instanceId: string): void {
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
                const lastId =
                    remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : undefined;
                this.activeInstanceId = lastId ?? null;
            }

            // Trigger auto-save after instance destruction
            this._triggerAutoSave();

            console.log(`Destroyed instance: ${instanceId}`);
        }

        destroyAllInstances(): void {
            this.instances.forEach(instance => {
                instance.destroy();
            });
            this.instances.clear();
            this.activeInstanceId = null;

            // Trigger auto-save after destroying all instances
            this._triggerAutoSave();
        }

        hasInstances(): boolean {
            return this.instances.size > 0;
        }

        getInstanceCount(): number {
            return this.instances.size;
        }

        serializeAll(): Record<string, unknown>[] {
            const activeId = this.activeInstanceId;
            return this.getAllInstances().map(instance => {
                const data = instance.serialize();
                try {
                    // Mark the active instance in metadata for robust restoration without schema changes
                    const meta = (data as any).metadata || {};
                    if (instance.instanceId === activeId) {
                        meta.__active = true;
                    }
                    (data as any).metadata = meta;
                } catch {
                    /* ignore */
                }
                return data;
            });
        }

        deserializeAll(data: unknown): void {
            if (!Array.isArray(data)) return;
            let desiredActiveId: string | null = null;

            data.forEach((instanceData: Record<string, unknown>) => {
                const instance = this.createInstance({
                    id: instanceData.instanceId as string | undefined,
                    title: instanceData.title as string | undefined,
                    metadata: instanceData.metadata as Record<string, unknown> | undefined,
                });

                if (instance && instanceData.state) {
                    instance.deserialize(instanceData);
                }

                // If this instance was marked active previously, remember it for final activation
                try {
                    const meta = instanceData.metadata as Record<string, unknown> | undefined;
                    if (meta && (meta as any).__active) {
                        desiredActiveId = (instanceData.instanceId as string) || null;
                    }
                } catch {
                    /* ignore */
                }
            });

            if (desiredActiveId) {
                this.setActiveInstance(desiredActiveId);
            }
        }

        /**
         * Reorder instances to match the provided array of instance IDs
         * @param newOrder - Array of instance IDs in the desired order
         */
        reorderInstances(newOrder: string[]): void {
            // Validate that all IDs exist
            const validIds = newOrder.filter(id => this.instances.has(id));
            if (validIds.length !== this.instances.size) {
                console.warn(
                    'Invalid reorder: not all instance IDs provided or some IDs do not exist'
                );
                return;
            }

            // Create a new Map with the desired order
            const newMap = new Map<string, BaseInstanceLike>();
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

        private _triggerAutoSave(): void {
            triggerAutoSave(this.type);
        }

        private _defaultCreateContainer(instanceId: string): HTMLElement {
            const container = document.createElement('div');
            container.id = `${instanceId}-container`;
            container.className = 'instance-container';
            document.body.appendChild(container);
            return container;
        }

        private _setupInstanceEvents(instance: BaseInstanceLike): void {
            instance.on('focused', () => {
                this.setActiveInstance(instance.instanceId);
            });

            instance.on('destroyed', () => {
                this.instances.delete(instance.instanceId);
            });
        }
    }

    (window as unknown as { InstanceManager: typeof InstanceManager }).InstanceManager =
        InstanceManager;
})();
