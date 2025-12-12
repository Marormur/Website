// Ambient types for InstanceManager

declare interface InstanceManagerOptions<T extends BaseWindowInstance = BaseWindowInstance> {
  type: string;
  instanceClass: new (config: BaseWindowInstanceConfig<unknown>) => T;
  maxInstances?: number; // 0 = unlimited
  createContainer?: (instanceId: string) => HTMLElement;
}

declare class InstanceManager<T extends BaseWindowInstance = BaseWindowInstance> {
  constructor(config: InstanceManagerOptions<T>);
  type: string;
  maxInstances: number;

  createInstance(config?: Partial<BaseWindowInstanceConfig<unknown>>): T | null;
  getInstance(instanceId: string): T | null;
  getActiveInstance(): T | null;
  setActiveInstance(instanceId: string): void;
  getAllInstances(): T[];
  getAllInstanceIds(): string[];
  destroyInstance(instanceId: string): void;
  destroyAllInstances(): void;
  hasInstances(): boolean;
  getInstanceCount(): number;
  serializeAll(): unknown[];
  deserializeAll(data: unknown): void;
}

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
