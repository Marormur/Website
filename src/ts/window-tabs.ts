(function () {
  'use strict';

  // Minimal structural types to avoid runtime coupling
  type Instance = {
    instanceId: string;
    title: string;
    focus?: () => void;
    blur?: () => void;
    destroy?: () => void;
    show?: () => void;
    hide?: () => void;
  };

  type InstanceConfig = {
    id?: string;
    type?: string;
    title?: string;
    initialState?: unknown;
    metadata?: Record<string, unknown>;
  };

  type Manager = {
    getAllInstances(): Instance[];
    getActiveInstance(): Instance | null;
    getAllInstanceIds(): string[];
    getInstance(id: string): Instance | null;
    setActiveInstance(id: string): void;
    createInstance(config?: Partial<InstanceConfig>): Instance | null;
    destroyInstance(id: string): void;
    getInstanceCount?: () => number;
  };

  interface WindowTabsOptions {
    addButton?: boolean;
    onCreateInstanceTitle?: () => string | undefined;
  }

  interface WindowTabsController {
    el: HTMLElement;
    refresh(): void;
    destroy(): void;
    setTitle(instanceId: string, title: string): void;
  }

  // (reserved) helper could be added later to skip shortcuts in inputs

  function createTabEl(instance: Instance, isActive: boolean): HTMLElement {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = [
      'wt-tab',
      'px-3 py-1 text-sm rounded-t-md border border-b-0',
      'transition-colors whitespace-nowrap flex items-center gap-2',
      isActive
        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700'
        : 'bg-gray-200/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-800'
    ].join(' ');
    tab.dataset.instanceId = instance.instanceId;

    const title = document.createElement('span');
    title.className = 'wt-tab-title';
    title.textContent = instance.title || instance.instanceId;
    tab.appendChild(title);

    const close = document.createElement('span');
    close.className = 'wt-tab-close ml-1 text-xs opacity-70 hover:opacity-100';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Tab schließen');
    close.title = 'Tab schließen';
    tab.appendChild(close);

    return tab;
  }

  function renderTabs(
    container: HTMLElement,
    manager: Manager,
    options: WindowTabsOptions,
    onSelect: (id: string) => void,
    onClose: (id: string) => void,
    onNew?: () => void
  ): void {
    container.innerHTML = '';

    const bar = document.createElement('div');
    bar.className = 'window-tabs flex items-center gap-1 px-2 pt-2 select-none';

    const instances = manager.getAllInstances();
    const active = manager.getActiveInstance();
    const activeId = active?.instanceId ?? null;

    instances.forEach((inst: Instance) => {
      const tab = createTabEl(inst, inst.instanceId === activeId);
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.wt-tab-close')) {
          onClose(inst.instanceId);
        } else {
          onSelect(inst.instanceId);
        }
      });
      // Middle-click closes on supported devices
      tab.addEventListener('auxclick', (e: MouseEvent) => {
        if (e.button === 1) {
          onClose(inst.instanceId);
        }
      });
      bar.appendChild(tab);
    });

    if (options.addButton !== false) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'wt-add px-2 py-1 text-sm rounded-md border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700';
      addBtn.textContent = '+';
      addBtn.title = 'Neue Instanz';
      addBtn.addEventListener('click', () => {
        if (onNew) {
          onNew();
        } else {
          const title = options.onCreateInstanceTitle?.();
          manager.createInstance({ title });
        }
        // refresh will be triggered by wrapper
      });
      bar.appendChild(addBtn);
    }

    container.appendChild(bar);

    // Bottom border under tabs
    const underline = document.createElement('div');
    underline.className = 'h-px bg-gray-300 dark:bg-gray-700';
    container.appendChild(underline);
  }

  function wrapManager(manager: Manager, onChange: () => void): Manager {
    const createOrig = manager.createInstance.bind(manager);
    const destroyOrig = manager.destroyInstance.bind(manager);
    const setActiveOrig = manager.setActiveInstance.bind(manager);

    type MutableManager = Manager & { [key: string]: unknown };
    (manager as MutableManager).createInstance = (cfg?: Partial<InstanceConfig>) => {
      const inst = createOrig(cfg);
      onChange();
      return inst;
    };
    (manager as MutableManager).destroyInstance = (id: string) => {
      destroyOrig(id);
      onChange();
    };
    (manager as MutableManager).setActiveInstance = (id: string) => {
      setActiveOrig(id);
      onChange();
    };
    return manager;
  }

  function createController(manager: Manager, mountEl: HTMLElement, options: WindowTabsOptions = {}): WindowTabsController {
    const wrapped = wrapManager(manager, () => controller.refresh());

    const controller: WindowTabsController = {
      el: mountEl,
      refresh() {
        renderTabs(mountEl, wrapped, options,
          (id) => wrapped.setActiveInstance(id),
          (id) => wrapped.destroyInstance(id)
        );
      },
      destroy() {
        mountEl.innerHTML = '';
      },
      setTitle(instanceId: string, title: string) {
        const inst = wrapped.getInstance(instanceId);
        if (inst) {
          inst.title = title;
          this.refresh();
        }
      }
    };

    controller.refresh();
    return controller;
  }

  const WindowTabs = {
    /**
     * Create a window tabs bar bound to a specific InstanceManager.
     */
    create(manager: Manager, mountEl: HTMLElement, options?: WindowTabsOptions): WindowTabsController {
      return createController(manager, mountEl, options);
    }
  };

  // Adapter expected by legacy integration code: WindowTabManager
  class WindowTabManager {
    private manager: Manager;
    private controller: WindowTabsController | null = null;
    private opts: {
      containerId: string;
      onTabSwitch?: (id: string) => void;
      onTabClose?: (id: string) => void;
      onNewTab?: () => void;
      onAllTabsClosed?: () => void;
    };

    constructor(config: { containerId: string; instanceManager: Manager; onTabSwitch?: (id: string) => void; onTabClose?: (id: string) => void; onNewTab?: () => void; onAllTabsClosed?: () => void; }) {
      this.manager = config.instanceManager;
      this.opts = {
        containerId: config.containerId,
        onTabSwitch: config.onTabSwitch,
        onTabClose: config.onTabClose,
        onNewTab: config.onNewTab,
        onAllTabsClosed: config.onAllTabsClosed,
      };
      const mount = document.getElementById(config.containerId);
      if (mount) {
        // Build controller with custom handlers
        const refreshWithHooks = () => {
          renderTabs(
            mount,
            this.manager,
            { addButton: true },
            (id) => {
              this.manager.setActiveInstance(id);
              this.opts.onTabSwitch?.(id);
            },
            (id) => {
              this.opts.onTabClose?.(id);
              this.manager.destroyInstance(id);
              
              // After destroying, get the new active instance and trigger onTabSwitch
              // to ensure its content is visible (fixes ghost tab / hidden content issue)
              const remaining = this.manager.getAllInstances();
              if (remaining.length === 0) {
                this.opts.onAllTabsClosed?.();
              } else {
                const newActive = this.manager.getActiveInstance();
                if (newActive) {
                  this.opts.onTabSwitch?.(newActive.instanceId);
                }
              }
            },
            () => {
              if (this.opts.onNewTab) {
                this.opts.onNewTab();
              } else {
                const next = (this.manager.getInstanceCount?.() || this.manager.getAllInstances().length) + 1;
                this.manager.createInstance({ title: `Instance ${next}` });
              }
            }
          );
        };

        this.controller = {
          el: mount,
          refresh: refreshWithHooks,
          destroy() { mount.innerHTML = ''; },
          setTitle: (instanceId: string, title: string) => {
            const inst = this.manager.getInstance(instanceId);
            if (inst) { inst.title = title; }
            refreshWithHooks();
          }
        } as unknown as WindowTabsController;

        // initial render
        this.controller.refresh();
      }
    }

    addTab(_instance: Instance): void {
      // Our rendering reflects manager state; just refresh
      this.controller?.refresh();
    }

    closeTab(instanceId: string): void {
      this.opts.onTabClose?.(instanceId);
      this.manager.destroyInstance(instanceId);
      
      // After destroying, get the new active instance and trigger onTabSwitch
      // to ensure its content is visible (fixes ghost tab / hidden content issue)
      const remaining = this.manager.getAllInstances();
      if (remaining.length === 0) {
        this.opts.onAllTabsClosed?.();
      } else {
        const newActive = this.manager.getActiveInstance();
        if (newActive) {
          this.opts.onTabSwitch?.(newActive.instanceId);
        }
      }
      
      this.controller?.refresh();
    }
  }

  (window as unknown as { [k: string]: unknown }).WindowTabs = WindowTabs;
  (window as unknown as { [k: string]: unknown }).WindowTabManager = WindowTabManager;
})();
