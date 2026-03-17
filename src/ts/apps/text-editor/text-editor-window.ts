/**
 * src/ts/text-editor-window.ts
 * TextEditor-specific multi-window implementation
 */

import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import type { BaseTab } from '../../windows/base-tab.js';
import { createWindowTabsAdapter } from '../../framework/controls/window-tabs-adapter.js';
import logger from '../../core/logger.js';

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

        const adapter = createWindowTabsAdapter({
            tabs: this.tabs,
            getActiveTabId: () => this.activeTabId,
            setActiveTab: (id: string) => this.setActiveTab(id),
            addTab: (tab: BaseTab) => this.addTab(tab),
            removeTab: (id: string) => this.removeTab(id),
            detachTab: (id: string) => this.detachTab(id),
            createTab: (cfg?: { title?: string }) => {
                if (!window.TextEditorDocument) return null;
                return new window.TextEditorDocument({
                    title: cfg?.title || `Neues Dokument ${this.tabs.size + 1}`,
                }) as unknown as BaseTab;
            },
            reorderTabs: (newOrder: string[]) => {
                const old = this.tabs;
                const rebuilt = new Map<string, BaseTab>();
                newOrder.forEach(id => {
                    const tab = old.get(id);
                    if (tab) rebuilt.set(id, tab);
                });
                old.forEach((tab, id) => {
                    if (!rebuilt.has(id)) rebuilt.set(id, tab);
                });
                this.tabs = rebuilt;
                this._renderTabs();
            },
        });

        if (this.tabController) {
            this.tabController.destroy();
        }

        this.tabController = window.WindowTabs.create!(adapter, tabBar as HTMLElement, {
            addButton: true,
            onCreateInstanceTitle: () => `Neues Dokument ${this.tabs.size + 1}`,
        });
    }

    createDocument(title?: string, content?: string): BaseTab | null {
        if (!window.TextEditorDocument) {
            logger.error('UI', 'TextEditorDocument class not loaded');
            return null;
        }

        const doc = new window.TextEditorDocument({
            title: title || `Neues Dokument ${this.tabs.size + 1}`,
            content: { content: content || '' },
        });

        this.addTab(doc as unknown as BaseTab);
        return doc as unknown as BaseTab;
    }

    static create(config?: Partial<WindowConfig>): TextEditorWindow {
        const window = new TextEditorWindow(config);

        // Create initial document
        window.createDocument();

        // Register window BEFORE showing it, same timing semantics as TerminalWindow.
        // This ensures WindowTabs can resolve the live instance consistently during first paint.
        globalThis.window.WindowRegistry?.registerWindow?.(window);

        // Show window
        window.show();

        // Ensure WindowTabs rendering is executed after window is attached to the DOM.
        window.requestTabsRender();

        return window;
    }
}

// Export to window for global access
window.TextEditorWindow = TextEditorWindow;
