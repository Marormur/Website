'use strict';
/**
 * src/ts/text-editor-window.ts
 * TextEditor-specific multi-window implementation
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, '__esModule', { value: true });
exports.TextEditorWindow = void 0;
const base_window_js_1 = require('./base-window.js');
/**
 * TextEditorWindow - Window for text editor documents
 *
 * Features:
 * - Multiple document tabs per window
 * - Text editing toolbar
 * - Document management
 */
class TextEditorWindow extends base_window_js_1.BaseWindow {
    constructor(config) {
        super({
            type: 'text-editor',
            title: 'TextEditor',
            ...config,
        });
    }
    /**
     * Create text-editor-specific window DOM
     */
    createDOM() {
        const modal = super.createDOM();
        // Title is now set via i18n in BaseWindow
        return modal;
    }
    /**
     * Override tab rendering to use WindowTabs system
     */
    _renderTabs() {
        const W = window;
        if (!W.WindowTabs || !this.element) return;
        const tabBar = this.element.querySelector(`#${this.id}-tabs`);
        if (!tabBar) return;
        // Create a simple adapter for WindowTabs
        const makeInst = tab => ({
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
            getInstance: id => {
                const t = this.tabs.get(id) || null;
                return t ? makeInst(t) : null;
            },
            setActiveInstance: id => this.setActiveTab(id),
            createInstance: cfg => {
                const W = window;
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
            destroyInstance: id => this.removeTab(id),
            getInstanceCount: () => this.tabs.size,
            reorderInstances: newOrder => {
                const old = this.tabs;
                const rebuilt = new Map();
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
            detachInstance: id => {
                const t = this.detachTab(id);
                return t ? makeInst(t) : null;
            },
            adoptInstance: inst => {
                const tab = inst.__tab || inst;
                this.addTab(tab);
                this.setActiveTab(tab.id);
                return makeInst(tab);
            },
        };
        // Clear existing tab controller if any
        if (this.tabController) {
            this.tabController.destroy();
        }
        // Create WindowTabs controller
        this.tabController = W.WindowTabs.create(adapter, tabBar, {
            addButton: true,
            onCreateInstanceTitle: () => `Editor ${this.tabs.size + 1}`,
        });
    }
    /**
     * Create a new document in this window
     */
    createDocument(title, content) {
        const W = window;
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
    static create(config) {
        const window = new TextEditorWindow(config);
        // Create initial document
        window.createDocument();
        // Show window
        window.show();
        // Register with WindowRegistry
        const W = globalThis;
        if (W.WindowRegistry) {
            W.WindowRegistry.registerWindow(window);
        }
        return window;
    }
}
exports.TextEditorWindow = TextEditorWindow;
// Export to window for global access
window.TextEditorWindow = TextEditorWindow;
//# sourceMappingURL=text-editor-window.js.map
