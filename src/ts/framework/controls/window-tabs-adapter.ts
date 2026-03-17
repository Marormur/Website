import type { BaseTab } from '../../windows/base-tab.js';

export interface WindowTabsController {
    refresh: () => void;
    destroy: () => void;
    setTitle: (id: string, title: string) => void;
}

type WindowTabsFactory = {
    create?: (
        manager: ReturnType<typeof createWindowTabsAdapter>,
        container: HTMLElement,
        options: { addButton: boolean; onCreateInstanceTitle: () => string }
    ) => WindowTabsController;
};

interface WindowTabsInstance {
    instanceId: string;
    title: string;
    metadata: {
        tabLabel: string;
    };
    __tab: BaseTab;
    show: () => void;
    hide: () => void;
}

interface WindowTabsAdapterOptions {
    tabs: Map<string, BaseTab>;
    getActiveTabId: () => string | null;
    setActiveTab: (id: string) => void;
    addTab: (tab: BaseTab) => void;
    removeTab: (id: string) => void;
    detachTab: (id: string) => BaseTab | null;
    createTab: (config?: { title?: string }) => BaseTab | null;
    reorderTabs: (newOrder: string[]) => void;
}

export function reorderTabMap(
    tabs: Map<string, BaseTab>,
    newOrder: string[]
): Map<string, BaseTab> {
    const rebuilt = new Map<string, BaseTab>();

    newOrder.forEach(id => {
        const tab = tabs.get(id);
        if (tab) rebuilt.set(id, tab);
    });

    tabs.forEach((tab, id) => {
        if (!rebuilt.has(id)) rebuilt.set(id, tab);
    });

    return rebuilt;
}

function toInstance(tab: BaseTab): WindowTabsInstance {
    return {
        instanceId: tab.id,
        title: tab.title,
        metadata: { tabLabel: tab.title },
        __tab: tab,
        show: () => tab.show(),
        hide: () => tab.hide(),
    };
}

export function createWindowTabsAdapter(options: WindowTabsAdapterOptions) {
    return {
        getAllInstances: () => Array.from(options.tabs.values()).map(toInstance),
        getActiveInstance: () => {
            const activeId = options.getActiveTabId();
            const tab = activeId ? options.tabs.get(activeId) : null;
            return tab ? toInstance(tab) : null;
        },
        getAllInstanceIds: () => Array.from(options.tabs.keys()),
        getInstance: (id: string) => {
            const tab = options.tabs.get(id) || null;
            return tab ? toInstance(tab) : null;
        },
        setActiveInstance: (id: string) => options.setActiveTab(id),
        createInstance: (cfg?: { title?: string }) => {
            const tab = options.createTab(cfg);
            if (!tab) return null;
            options.addTab(tab);
            return toInstance(tab);
        },
        destroyInstance: (id: string) => options.removeTab(id),
        getInstanceCount: () => options.tabs.size,
        reorderInstances: (newOrder: string[]) => options.reorderTabs(newOrder),
        detachInstance: (id: string) => {
            const tab = options.detachTab(id);
            return tab ? toInstance(tab) : null;
        },
        adoptInstance: (inst: { __tab?: BaseTab } | BaseTab) => {
            const tab = (inst as { __tab?: BaseTab }).__tab || (inst as BaseTab);
            options.addTab(tab);
            options.setActiveTab(tab.id);
            return toInstance(tab);
        },
    };
}

export function mountWindowTabsController(options: {
    windowTabs: WindowTabsFactory | undefined;
    tabBar: HTMLElement;
    adapter: ReturnType<typeof createWindowTabsAdapter>;
    existingController?: WindowTabsController | null;
    onCreateInstanceTitle: () => string;
}): WindowTabsController | null {
    if (!options.windowTabs?.create) return null;

    if (options.existingController) {
        options.existingController.destroy();
    }

    return options.windowTabs.create(options.adapter, options.tabBar, {
        addButton: true,
        onCreateInstanceTitle: options.onCreateInstanceTitle,
    });
}
