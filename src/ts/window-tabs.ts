(function () {
    'use strict';

    // Minimal structural types to avoid runtime coupling
    type Instance = {
        instanceId: string;
        title: string;
        metadata?: Record<string, unknown>;
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
        reorderInstances?: (newOrder: string[]) => void;
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

    // Drag state for tab reordering
    let draggedTab: HTMLElement | null = null;
    let draggedInstanceId: string | null = null;

    function createTabEl(instance: Instance, isActive: boolean): HTMLElement {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = [
            'wt-tab',
            'px-3 py-1 text-sm rounded-t-md border border-b-0',
            'transition-colors whitespace-nowrap flex items-center gap-2',
            isActive
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700'
                : 'bg-gray-200/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-800',
        ].join(' ');
        tab.dataset.instanceId = instance.instanceId;
        tab.draggable = true;

        const title = document.createElement('span');
        title.className = 'wt-tab-title';
        const tabLabel = (instance as any).metadata?.tabLabel as string | undefined;
        title.textContent = tabLabel || instance.title || instance.instanceId;
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

        // Diagnostic: log all instance IDs being rendered as tabs
        console.log(
            '[WindowTabs] Rendering tabs for instance IDs:',
            instances.map(i => i.instanceId)
        );
        instances.forEach((inst: Instance) => {
            const tab = createTabEl(inst, inst.instanceId === activeId);
            // Click handlers
            tab.addEventListener('click', e => {
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
            // Drag and drop handlers for tab reordering
            tab.addEventListener('dragstart', (e: DragEvent) => {
                draggedTab = tab;
                draggedInstanceId = inst.instanceId;
                if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', inst.instanceId);
                }
                tab.style.opacity = '0.5';
            });
            tab.addEventListener('dragend', () => {
                tab.style.opacity = '1';
                draggedTab = null;
                draggedInstanceId = null;
                // Remove any drop indicators
                const allTabs = bar.querySelectorAll('.wt-tab');
                allTabs.forEach(t => {
                    (t as HTMLElement).classList.remove('border-l-4', 'border-l-blue-500');
                });
            });
            tab.addEventListener('dragover', (e: DragEvent) => {
                e.preventDefault();
                if (e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'move';
                }
                // Don't show indicator on the dragged tab itself
                if (tab === draggedTab) {
                    return;
                }
                // Show visual indicator
                const allTabs = bar.querySelectorAll('.wt-tab');
                allTabs.forEach(t => {
                    (t as HTMLElement).classList.remove('border-l-4', 'border-l-blue-500');
                });
                tab.classList.add('border-l-4', 'border-l-blue-500');
            });
            tab.addEventListener('dragleave', () => {
                tab.classList.remove('border-l-4', 'border-l-blue-500');
            });
            tab.addEventListener('drop', (e: DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                // Remove visual indicators
                tab.classList.remove('border-l-4', 'border-l-blue-500');
                if (!draggedInstanceId || draggedInstanceId === inst.instanceId) {
                    return;
                }
                // Get current order
                const currentOrder = manager.getAllInstanceIds();
                const draggedIdx = currentOrder.indexOf(draggedInstanceId);
                const targetIdx = currentOrder.indexOf(inst.instanceId);
                if (draggedIdx === -1 || targetIdx === -1) {
                    return;
                }
                // Create new order by moving dragged item before target
                const newOrder = [...currentOrder];
                newOrder.splice(draggedIdx, 1);
                const newTargetIdx = newOrder.indexOf(inst.instanceId);
                newOrder.splice(newTargetIdx, 0, draggedInstanceId);
                // Update instance order if manager supports it
                if (manager.reorderInstances) {
                    manager.reorderInstances(newOrder);
                    // Re-render tabs to reflect new order
                    renderTabs(container, manager, options, onSelect, onClose, onNew);
                }
            });
            bar.appendChild(tab);
        });

        if (options.addButton !== false) {
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className =
                'wt-add px-2 py-1 text-sm rounded-md border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700';
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

    function createController(
        manager: Manager,
        mountEl: HTMLElement,
        options: WindowTabsOptions = {}
    ): WindowTabsController {
        const wrapped = wrapManager(manager, () => controller.refresh());

        const controller: WindowTabsController = {
            el: mountEl,
            refresh() {
                renderTabs(
                    mountEl,
                    wrapped,
                    options,
                    id => wrapped.setActiveInstance(id),
                    id => wrapped.destroyInstance(id)
                );
            },
            destroy() {
                mountEl.innerHTML = '';
            },
            setTitle(instanceId: string, title: string) {
                const inst = wrapped.getInstance(instanceId) as any;
                if (inst) {
                    inst.metadata = { ...(inst.metadata || {}), tabLabel: title };
                    this.refresh();
                }
            },
        };

        controller.refresh();
        return controller;
    }

    const WindowTabs = {
        /**
         * Create a window tabs bar bound to a specific InstanceManager.
         */
        create(
            manager: Manager,
            mountEl: HTMLElement,
            options?: WindowTabsOptions
        ): WindowTabsController {
            return createController(manager, mountEl, options);
        },
    };

    (window as unknown as { [k: string]: unknown }).WindowTabs = WindowTabs;
})();
