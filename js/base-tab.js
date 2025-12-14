'use strict';
/**
 * src/ts/base-tab.ts
 * Base class for tabs within a window
 * Each tab represents a content instance (Terminal Session, Document, etc.)
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, '__esModule', { value: true });
exports.BaseTab = void 0;
/**
 * BaseTab – Basisklasse für Inhalte innerhalb eines Fensters
 *
 * Architektur
 * -----------
 * - Ein Tab gehört immer genau einem Fenster (parentWindow) – kann aber via
 *   Drag&Drop in ein anderes Fenster verschoben werden.
 * - Der Inhalt (createDOM/render) ist unabhängig vom Fenstercontainer.
 * - Relevanter Zustand wird in contentState gehalten und bei Änderungen
 *   gespeichert (_saveState), damit Session‑Restore funktioniert.
 *
 * Erweiterung
 * -----------
 * - Subklassen MÜSSEN createDOM() überschreiben und können onShow/onHide
 *   nutzen.
 * - setTitle() benachrichtigt das Elternfenster zur Aktualisierung der Tabbar
 *   (z. B. wenn sich der Ordnername im Finder ändert).
 */
class BaseTab {
    constructor(config) {
        this.id = config.id || this._generateId();
        this.type = config.type;
        this.title = config.title || 'Untitled';
        this.icon = config.icon;
        this.parentWindow = null;
        this.element = null;
        this.contentState = config.content || {};
        this.metadata = config.metadata || {
            created: Date.now(),
            modified: Date.now(),
        };
        this.isVisible = false;
    }
    _generateId() {
        return `tab-${this.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Set parent window (called when tab is added to a window)
     */
    setParentWindow(window) {
        this.parentWindow = window;
    }
    /**
     * Erstellt das DOM des Tabs. Subklassen MÜSSEN überschreiben. Der Default
     * liefert nur einen Platzhalter.
     */
    createDOM() {
        const container = document.createElement('div');
        container.id = `${this.id}-container`;
        container.className = 'tab-content hidden w-full h-full';
        container.textContent = `Tab content for ${this.title}`;
        this.element = container;
        return container;
    }
    /**
     * Rendering-Hook. Subklassen implementieren hier die eigentliche UI.
     */
    render() {
        if (!this.element) {
            this.createDOM();
        }
    }
    /**
     * Tab sichtbar machen und ggf. in die Content‑Area des Elternfensters einhängen.
     */
    show() {
        if (!this.element) {
            this.render();
            // Add to parent window's content area
            if (this.parentWindow?.contentElement) {
                this.parentWindow.contentElement.appendChild(this.element);
            }
        }
        this.element?.classList.remove('hidden');
        this.isVisible = true;
        this.onShow();
    }
    /**
     * Tab verbergen (DOM bleibt erhalten, CSS .hidden).
     */
    hide() {
        this.element?.classList.add('hidden');
        this.isVisible = false;
        this.onHide();
    }
    /**
     * Lifecycle‑Hook beim Anzeigen.
     */
    onShow() {
        // Subclasses can override
    }
    /**
     * Lifecycle‑Hook beim Verbergen.
     */
    onHide() {
        // Subclasses can override
    }
    /**
     * Tabtitel aktualisieren und Parent zur Tabbar‑Re‑Render benachrichtigen.
     */
    setTitle(title) {
        this.title = title;
        this.metadata.modified = Date.now();
        // Notify parent window to re-render tabs
        if (this.parentWindow) {
            this.parentWindow._renderTabs?.();
        }
    }
    /**
     * Content‑State aktualisieren (z. B. Cursorposition, offene Datei, Sortierung,...)
     */
    updateContentState(updates) {
        this.contentState = {
            ...this.contentState,
            ...updates,
        };
        this.metadata.modified = Date.now();
        this._saveState();
    }
    /**
     * Serialize tab state for session management
     */
    serialize() {
        return {
            id: this.id,
            type: this.type,
            title: this.title,
            icon: this.icon,
            contentState: this.contentState,
            created: this.metadata.created,
            modified: this.metadata.modified || Date.now(),
        };
    }
    /**
     * Rehydrierung – Subklassen überschreiben diese Methode meist, um ihren
     * konkreten Zustand zurückzusetzen.
     */
    static deserialize(state) {
        return new BaseTab({
            id: state.id,
            type: state.type,
            title: state.title,
            icon: state.icon,
            content: state.contentState,
            metadata: {
                created: state.created,
                modified: state.modified,
            },
        });
    }
    _saveState() {
        // Save tab state via parent window's session manager
        if (this.parentWindow) {
            // Trigger parent window to save its state (which includes all tabs)
            this.parentWindow._saveState?.();
        }
    }
    /**
     * Transfer tab to another window
     */
    transferTo(targetWindow) {
        if (!this.parentWindow || this.parentWindow === targetWindow) return;
        // Remove from current window
        this.parentWindow.removeTab(this.id);
        // Add to target window
        targetWindow.addTab(this);
    }
    /**
     * Destroy tab and cleanup
     */
    destroy() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
        this.parentWindow = null;
        this._saveState();
    }
}
exports.BaseTab = BaseTab;
// Export to window for global access
window.BaseTab = BaseTab;
//# sourceMappingURL=base-tab.js.map
