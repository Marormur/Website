/**
 * src/ts/text-editor-window.ts
 * TextEditor-specific multi-window implementation
 */

import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import type { BaseTab } from '../../windows/base-tab.js';

export class TextEditorWindow extends BaseWindow {
    /** WindowTabs controller for the tab bar – created lazily in _renderTabs. */
    private tabController?: {
        refresh: () => void;
        destroy: () => void;
        setTitle: (id: string, title: string) => void;
    } | null;

    constructor(config?: Partial<WindowConfig>) {
        super({
            type: 'text-editor',
            title: 'TextEditor',
            ...config,
        });
    }

    createDOM(): HTMLElement {
        const modal = super.createDOM();
        return modal;
    }

    protected _renderTabs(): void {
        if (!window.WindowTabs || !this.element) return;

        const tabBar = this.element.querySelector(`#${this.id}-tabs`);
        if (!tabBar) return;

        const makeInst = (tab: BaseTab) => ({
            instanceId: tab.id,
            title: tab.title,
            metadata: { tabLabel: tab.title },
            __tab: tab,
            show: () => tab.show(),
            hide: () => tab.hide(),
        });
        const adapter = {
            getAllInstances: () => Array.from(this.tabs.values()).map(makeInst),
            getActiveInstance: () => {
                const activeId = this.activeTabId;
                const t = activeId ? this.tabs.get(activeId) : null;
                return t ? makeInst(t) : null;
            },
            getAllInstanceIds: () => Array.from(this.tabs.keys()),
            getInstance: (id: string) => {
                const t = this.tabs.get(id) || null;
                return t ? makeInst(t) : null;
            },
            setActiveInstance: (id: string) => this.setActiveTab(id),
            createInstance: (cfg?: { title?: string }) => {
                const doc = window.TextEditorDocument
                    ? new window.TextEditorDocument({
                          title: cfg?.title || `Editor ${this.tabs.size + 1}`,
                      })
                    : null;
                if (doc) {
                    this.addTab(doc as unknown as BaseTab);
                    return makeInst(doc as unknown as BaseTab);
                }
                return null;
            },
            destroyInstance: (id: string) => this.removeTab(id),
            getInstanceCount: () => this.tabs.size,
            reorderInstances: (newOrder: string[]) => {
                const old = this.tabs;
                const rebuilt = new Map<string, BaseTab>();
                newOrder.forEach(id => {
                    const t = old.get(id);
                    if (t) rebuilt.set(id, t);
                });
                old.forEach((t, id) => {
                    if (!rebuilt.has(id)) rebuilt.set(id, t);
                });
                this.tabs = rebuilt;
                this._renderTabs();
            },
            detachInstance: (id: string) => {
                const t = this.detachTab(id);
                return t ? makeInst(t) : null;
            },
            adoptInstance: (inst: { instanceId?: string; __tab?: BaseTab; id?: string }) => {
                const tab = inst.__tab || (inst as unknown as BaseTab);
                this.addTab(tab);
                this.setActiveTab((tab as BaseTab).id);
                return makeInst(tab);
            },
        };

        if (this.tabController) {
            this.tabController.destroy();
        }

        this.tabController = window.WindowTabs.create!(adapter, tabBar as HTMLElement, {
            addButton: true,
            onCreateInstanceTitle: () => `Editor ${this.tabs.size + 1}`,
        });
    }

    createDocument(title?: string, content?: string): BaseTab | null {
        if (!window.TextEditorDocument) {
            console.error('TextEditorDocument class not loaded');
            return null;
        }

        const doc = new window.TextEditorDocument({
            title: title || `Editor ${this.tabs.size + 1}`,
            content: { content: content || '' },
        });

        this.addTab(doc as unknown as BaseTab);
        return doc as unknown as BaseTab;
    }

    static create(config?: Partial<WindowConfig>): TextEditorWindow {
        const window = new TextEditorWindow(config);

        // Create initial document
        window.createDocument();

        // Show window
        window.show();

        // Register with WindowRegistry
        if (globalThis.WindowRegistry) {
            globalThis.WindowRegistry.registerWindow?.(window);
        }

        return window;
    }
}

// Export to window for global access
window.TextEditorWindow = TextEditorWindow;
