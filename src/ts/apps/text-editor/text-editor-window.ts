/**
 * src/ts/text-editor-window.ts
 * TextEditor-specific multi-window implementation
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import type { BaseTab } from '../../windows/base-tab.js';

/**
 * TextEditorWindow - Window for text editor documents
 *
 * Features:
 * - Multiple document tabs per window
 * - Text editing toolbar
 * - Document management
 */
export class TextEditorWindow extends BaseWindow {
    constructor(config?: Partial<WindowConfig>) {
        super({
            type: 'text-editor',
            title: 'TextEditor',
            ...config,
        });
    }

    /**
     * Create text-editor-specific window DOM
     */
    createDOM(): HTMLElement {
        const modal = super.createDOM();
        // Title is now set via i18n in BaseWindow
        return modal;
    }

    /**
     * Override tab rendering to use WindowTabs system
     */
    protected _renderTabs(): void {
        const W = window as any;
        if (!W.WindowTabs || !this.element) return;

        const tabBar = this.element.querySelector(`#${this.id}-tabs`);
        if (!tabBar) return;

        // Create a simple adapter for WindowTabs
        const makeInst = (tab: any) => ({
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
            createInstance: (cfg?: any) => {
                const W = window as any;
                const doc = W.TextEditorDocument
                    ? new W.TextEditorDocument({
                          title: cfg?.title || `Editor ${this.tabs.size + 1}`,
                      })
                    : null;
                if (doc) {
                    this.addTab(doc);
                    return makeInst(doc);
                }
                return null;
            },
            destroyInstance: (id: string) => this.removeTab(id),
            getInstanceCount: () => this.tabs.size,
            reorderInstances: (newOrder: string[]) => {
                const old = this.tabs;
                const rebuilt = new Map<string, any>();
                newOrder.forEach(id => {
                    const t = old.get(id);
                    if (t) rebuilt.set(id, t);
                });
                old.forEach((t, id) => {
                    if (!rebuilt.has(id)) rebuilt.set(id, t);
                });
                (this as any).tabs = rebuilt;
                this._renderTabs();
            },
            detachInstance: (id: string) => {
                const t = this.detachTab(id) as any;
                return t ? makeInst(t) : null;
            },
            adoptInstance: (inst: any) => {
                const tab = inst.__tab || inst;
                this.addTab(tab);
                this.setActiveTab(tab.id);
                return makeInst(tab);
            },
        };

        // Clear existing tab controller if any
        if ((this as any).tabController) {
            (this as any).tabController.destroy();
        }

        // Create WindowTabs controller
        (this as any).tabController = W.WindowTabs.create(adapter, tabBar as HTMLElement, {
            addButton: true,
            onCreateInstanceTitle: () => `Editor ${this.tabs.size + 1}`,
        });
    }

    /**
     * Create a new document in this window
     */
    createDocument(title?: string, content?: string): BaseTab | null {
        const W = window as any;
        if (!W.TextEditorDocument) {
            console.error('TextEditorDocument class not loaded');
            return null;
        }

        const doc = new W.TextEditorDocument({
            title: title || `Editor ${this.tabs.size + 1}`,
            content: { content: content || '' },
        });

        this.addTab(doc);
        return doc;
    }

    /**
     * Static factory method to create a text editor window with one document
     */
    static create(config?: Partial<WindowConfig>): TextEditorWindow {
        const window = new TextEditorWindow(config);

        // Create initial document
        window.createDocument();

        // Show window
        window.show();

        // Register with WindowRegistry
        const W = globalThis as any;
        if (W.WindowRegistry) {
            W.WindowRegistry.registerWindow(window);
        }

        return window;
    }
}

// Export to window for global access
(window as any).TextEditorWindow = TextEditorWindow;
