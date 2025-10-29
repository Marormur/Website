"use strict";
(function () {
    'use strict';
    // (reserved) helper could be added later to skip shortcuts in inputs
    // Drag state for tab reordering
    let draggedTab = null;
    let draggedInstanceId = null;
    function createTabEl(instance, isActive) {
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
        const tabLabel = instance.metadata?.tabLabel;
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
    function renderTabs(container, manager, options, onSelect, onClose, onNew) {
        container.innerHTML = '';
        const bar = document.createElement('div');
        bar.className = 'window-tabs flex items-center gap-1 px-2 pt-2 select-none';
        const instances = manager.getAllInstances();
        const active = manager.getActiveInstance();
        const activeId = active?.instanceId ?? null;
        // Diagnostic: log all instance IDs being rendered as tabs
        console.log('[WindowTabs] Rendering tabs for instance IDs:', instances.map(i => i.instanceId));
        instances.forEach((inst) => {
            const tab = createTabEl(inst, inst.instanceId === activeId);
            // Click handlers
            tab.addEventListener('click', e => {
                const target = e.target;
                if (target.closest('.wt-tab-close')) {
                    onClose(inst.instanceId);
                }
                else {
                    onSelect(inst.instanceId);
                }
            });
            // Middle-click closes on supported devices
            tab.addEventListener('auxclick', (e) => {
                if (e.button === 1) {
                    onClose(inst.instanceId);
                }
            });
            // Drag and drop handlers for tab reordering
            tab.addEventListener('dragstart', (e) => {
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
                    t.classList.remove('border-l-4', 'border-l-blue-500');
                });
            });
            tab.addEventListener('dragover', (e) => {
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
                    t.classList.remove('border-l-4', 'border-l-blue-500');
                });
                tab.classList.add('border-l-4', 'border-l-blue-500');
            });
            tab.addEventListener('dragleave', () => {
                tab.classList.remove('border-l-4', 'border-l-blue-500');
            });
            tab.addEventListener('drop', (e) => {
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
                }
                else {
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
    function wrapManager(manager, onChange) {
        const createOrig = manager.createInstance.bind(manager);
        const destroyOrig = manager.destroyInstance.bind(manager);
        const setActiveOrig = manager.setActiveInstance.bind(manager);
        manager.createInstance = (cfg) => {
            const inst = createOrig(cfg);
            onChange();
            return inst;
        };
        manager.destroyInstance = (id) => {
            destroyOrig(id);
            onChange();
        };
        manager.setActiveInstance = (id) => {
            setActiveOrig(id);
            onChange();
        };
        return manager;
    }
    function createController(manager, mountEl, options = {}) {
        const wrapped = wrapManager(manager, () => controller.refresh());
        const controller = {
            el: mountEl,
            refresh() {
                renderTabs(mountEl, wrapped, options, id => wrapped.setActiveInstance(id), id => wrapped.destroyInstance(id));
            },
            destroy() {
                mountEl.innerHTML = '';
            },
            setTitle(instanceId, title) {
                const inst = wrapped.getInstance(instanceId);
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
        create(manager, mountEl, options) {
            return createController(manager, mountEl, options);
        },
    };
    window.WindowTabs = WindowTabs;
})();
//# sourceMappingURL=window-tabs.js.map