'use strict';
/**
 * src/ts/base-window.ts
 * Base class for multi-window system
 * Each window can contain multiple tabs with drag & drop support
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, '__esModule', { value: true });
exports.BaseWindow = void 0;
const z_index_manager_js_1 = require('./z-index-manager.js');
/**
 * BaseWindow - Fundament des neuen Fenster-Systems
 *
 * Überblick
 * ---------
 * Ein BaseWindow ist ein frei bewegliches, resizables „App‑Fenster“ – kein klassischer
 * Fullscreen-Modal. Jedes Fenster besitzt eine eigene Tab-Leiste und kann mehrere
 * Inhalts-Tabs (Instanzen von BaseTab) aufnehmen. Tabs lassen sich zwischen Fenstern
 * verschieben (Drag&Drop) oder in ein neues Fenster „herausziehen“.
 *
 * Ziele
 * -----
 * - Einheitliche API für Text-Editor, Terminal, Finder etc.
 * - Persistenz: Fensterzustand (Position, Größe, Tabs, aktiver Tab) wird über
 *   Session-Manager konserviert.
 * - Interop mit alter Infrastruktur: Registrierung im (legacy) WindowManager, damit
 *   MenülLeiste/ProgramLabel korrekt wechseln.
 *
 * Lebenszyklus
 * ------------
 * 1) new SubclassOfBaseWindow({...})
 * 2) show() -> erzeugt DOM, rendert Tabbar/Content, setzt Fokus/Z‑Index
 * 3) addTab()/setActiveTab() -> Tabs werden an Content‑Area angehängt
 * 4) hide()/close()/destroy()
 *
 * Erweiterung
 * -----------
 * - Subklassen überschreiben createDOM() und optional _renderTabs(), wenn eine
 *   eigene Tabbar (z. B. via WindowTabs) genutzt wird.
 * - BaseWindow kümmert sich um Drag/Resize/Fokus/Z‑Index/Session‑Save.
 */
class BaseWindow {
    constructor(config) {
        // Set type FIRST, before generating ID (ID generation uses this.type)
        this.type = config.type;
        this.id = config.id || this._generateId();
        this.element = null;
        this.titlebarElement = null;
        this.contentElement = null;
        this.position = config.position || this._getDefaultPosition();
        this.zIndex = 1000;
        this.isMinimized = false;
        this.isMaximized = false;
        this.tabs = new Map();
        this.activeTabId = null;
        this.metadata = config.metadata || {};
        this.dragState = {
            isDragging: false,
            startX: 0,
            startY: 0,
            offsetX: 0,
            offsetY: 0,
        };
        // Add initial tabs if provided
        if (config.tabs) {
            config.tabs.forEach(tab => this.addTab(tab));
        }
    }
    _generateId() {
        return `window-${this.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    _getDefaultPosition() {
        // Center window with slight offset for multiple windows
        const offset = Math.random() * 100 - 50;
        return {
            x: window.innerWidth / 2 - 400 + offset,
            y: window.innerHeight / 2 - 300 + offset,
            width: 800,
            height: 600,
        };
    }
    /**
     * Create the window DOM element.
     * Subklassen können überschreiben, wenn z. B. eine dedizierte Tabbar
     * oder zusätzliche UI‑Elemente nötig sind. Wichtig: setze this.element,
     * this.titlebarElement und this.contentElement.
     */
    createDOM() {
        // Create window container (no modal overlay - this is a floating window, not a modal dialog)
        const windowEl = document.createElement('div');
        windowEl.id = this.id;
        // Add 'modal' class for compatibility with existing focus/z-index management
        windowEl.className =
            'modal multi-window hidden fixed bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg flex flex-col max-h-[90vh] min-w-[560px] min-h-[360px]';
        windowEl.setAttribute('role', 'dialog');
        windowEl.setAttribute('aria-modal', 'false'); // Not a modal
        // Override modal pointer-events: none
        windowEl.style.pointerEvents = 'auto';
        // Set position and size
        windowEl.style.left = `${this.position.x}px`;
        windowEl.style.top = `${this.position.y}px`;
        windowEl.style.width = `${this.position.width}px`;
        windowEl.style.height = `${this.position.height}px`;
        windowEl.style.zIndex = String(this.zIndex);
        // Titlebar (draggable) – enthält die drei Mac‑Kontrollpunkte und die window‑Überschrift
        this.titlebarElement = this._createTitlebar();
        windowEl.appendChild(this.titlebarElement);
        // Tab bar container
        const tabBar = document.createElement('div');
        tabBar.id = `${this.id}-tabs`;
        tabBar.className = 'window-tab-bar';
        windowEl.appendChild(tabBar);
        // Content area
        this.contentElement = document.createElement('div');
        this.contentElement.id = `${this.id}-content`;
        this.contentElement.className = 'flex-1 overflow-hidden';
        windowEl.appendChild(this.contentElement);
        this.element = windowEl;
        // Beweglichkeit / Fokus / Größe
        this._attachDragHandlers();
        this._attachFocusHandler();
        this._attachResizeHandlers();
        // Register with legacy WindowManager for menubar integration
        this._registerWithWindowManager();
        // Apply i18n translations to window elements
        const W = window;
        if (W.appI18n && typeof W.appI18n.applyTranslations === 'function') {
            W.appI18n.applyTranslations(windowEl);
        }
        return windowEl;
    }
    /**
     * Baut die Titelleiste inklusive Close/Minimize/Maximize „Dots“.
     * Events sind an BaseWindow‑Methoden gebunden (close/minimize/toggleMaximize).
     */
    _createTitlebar() {
        const titlebar = document.createElement('div');
        titlebar.className =
            'window-titlebar flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-t-lg draggable-header cursor-move';
        // Window controls (macOS style: close, minimize, maximize as dots)
        const controls = document.createElement('div');
        controls.className = 'flex space-x-2';
        // Close button (red dot)
        const closeBtn = document.createElement('button');
        closeBtn.className = 'ml-auto text-2xl leading-none text-gray-700 dark:text-gray-300';
        closeBtn.title = 'Schließen';
        closeBtn.setAttribute('data-i18n-title', 'common.close');
        closeBtn.innerHTML = '<div class="w-3 h-3 bg-red-500 rounded-full"></div>';
        closeBtn.addEventListener('click', () => this.close());
        // Minimize button (yellow dot) - clickable div with title
        const minBtn = document.createElement('div');
        minBtn.className = 'w-3 h-3 bg-yellow-500 rounded-full cursor-pointer';
        minBtn.title = 'Minimieren';
        minBtn.setAttribute('data-i18n-title', 'menuItems.window.minimize');
        minBtn.addEventListener('click', () => this.minimize());
        // Maximize button (green dot) - clickable div with title
        const maxBtn = document.createElement('div');
        maxBtn.className = 'w-3 h-3 bg-green-500 rounded-full cursor-pointer';
        maxBtn.title = 'Zoomen';
        maxBtn.setAttribute('data-i18n-title', 'menuItems.window.zoom');
        maxBtn.addEventListener('click', () => this.toggleMaximize());
        controls.appendChild(closeBtn);
        controls.appendChild(minBtn);
        controls.appendChild(maxBtn);
        // Title
        const title = document.createElement('h2');
        title.className = 'ml-4 font-semibold text-gray-700 dark:text-gray-300 no-select';
        // Set i18n key based on window type
        // Map text-editor to text for i18n key
        const typeKey = this.type === 'text-editor' ? 'text' : this.type;
        const titleKey = `desktop.${typeKey}`;
        title.setAttribute('data-i18n', titleKey);
        title.textContent = this.metadata.title || this.type; // Fallback before i18n
        titlebar.appendChild(controls);
        titlebar.appendChild(title);
        return titlebar;
    }
    /**
     * Ermöglicht Dragging des Fensters über die Titelleiste.
     * Speicherung der Position erfolgt am Ende des Drags via _saveState().
     */
    _attachDragHandlers() {
        if (!this.titlebarElement) return;
        this.titlebarElement.addEventListener('mousedown', e => {
            if (e.target.tagName === 'BUTTON') return; // Ignore control buttons
            this.dragState.isDragging = true;
            this.dragState.startX = e.clientX;
            this.dragState.startY = e.clientY;
            const rect = this.element?.getBoundingClientRect();
            if (rect) {
                this.dragState.offsetX = this.dragState.startX - rect.left;
                this.dragState.offsetY = this.dragState.startY - rect.top;
            }
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!this.dragState.isDragging || !this.element) return;
            const newX = e.clientX - this.dragState.offsetX;
            const newY = e.clientY - this.dragState.offsetY;
            this.position.x = newX;
            this.position.y = newY;
            this._updatePosition();
        });
        document.addEventListener('mouseup', () => {
            if (this.dragState.isDragging) {
                this.dragState.isDragging = false;
                this._saveState();
            }
        });
    }
    /**
     * Klick in das Fenster bringt es nach vorne und aktualisiert Menubar‑Status.
     */
    _attachFocusHandler() {
        if (!this.element) return;
        // Bring window to front when clicked anywhere
        this.element.addEventListener('mousedown', () => {
            this.bringToFront();
        });
    }
    /**
     * Fügt 8 Resize‑Griffe hinzu (N, S, E, W sowie Ecken).
     * Während des Resizings wird ein Overlay gesetzt, um Mouse‑Events zuverlässig
     * zu capturen. Mindestgrößen werden berücksichtigt.
     */
    _attachResizeHandlers() {
        if (!this.element) return;
        // Remove existing resize handles
        const existingHandles = this.element.querySelectorAll('.resizer');
        existingHandles.forEach(handle => handle.remove());
        const createHandle = handle => {
            const resizer = document.createElement('div');
            resizer.classList.add('resizer', `resizer-${handle.name}`);
            Object.assign(resizer.style, {
                position: 'absolute',
                zIndex: '9999',
                backgroundColor: 'transparent',
                pointerEvents: 'auto',
                touchAction: 'none',
                cursor: handle.cursor,
                ...(handle.style || {}),
            });
            this.element.appendChild(resizer);
            const startResize = event => {
                event.preventDefault();
                event.stopPropagation();
                this.bringToFront();
                const startX = event.clientX;
                const startY = event.clientY;
                const rect = this.element.getBoundingClientRect();
                const computed = window.getComputedStyle(this.element);
                const minWidth = parseFloat(computed.minWidth) || 560;
                const minHeight = parseFloat(computed.minHeight) || 360;
                let startLeft = parseFloat(computed.left);
                let startTop = parseFloat(computed.top);
                if (!Number.isFinite(startLeft)) startLeft = rect.left;
                if (!Number.isFinite(startTop)) startTop = rect.top;
                const startWidth = rect.width;
                const startHeight = rect.height;
                // Create overlay to capture mouse events
                const overlay = document.createElement('div');
                Object.assign(overlay.style, {
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    zIndex: '9999',
                    cursor: handle.cursor,
                    backgroundColor: 'transparent',
                    touchAction: 'none',
                });
                document.body.appendChild(overlay);
                let resizing = true;
                const applySize = (clientX, clientY) => {
                    if (!resizing) return;
                    window.requestAnimationFrame(() => {
                        const dx = clientX - startX;
                        const dy = clientY - startY;
                        let newWidth = startWidth;
                        let newHeight = startHeight;
                        let newLeft = startLeft;
                        let newTop = startTop;
                        // Apply direction-based changes
                        if (handle.directions.includes('e')) newWidth = startWidth + dx;
                        if (handle.directions.includes('s')) newHeight = startHeight + dy;
                        if (handle.directions.includes('w')) {
                            newWidth = startWidth - dx;
                            newLeft = startLeft + dx;
                        }
                        if (handle.directions.includes('n')) {
                            newHeight = startHeight - dy;
                            newTop = startTop + dy;
                        }
                        // Enforce minimum size
                        if (newWidth < minWidth) {
                            const deficit = minWidth - newWidth;
                            if (handle.directions.includes('w')) newLeft -= deficit;
                            newWidth = minWidth;
                        }
                        if (newHeight < minHeight) {
                            const deficit = minHeight - newHeight;
                            if (handle.directions.includes('n')) newTop -= deficit;
                            newHeight = minHeight;
                        }
                        // Enforce menu bar boundary
                        const minTop = window.getMenuBarBottom?.() || 0;
                        if (handle.directions.includes('n') && newTop < minTop) {
                            const overshoot = minTop - newTop;
                            newTop = minTop;
                            newHeight = Math.max(minHeight, newHeight - overshoot);
                        }
                        // Apply new size and position
                        if (handle.directions.includes('w') || handle.directions.includes('e')) {
                            this.element.style.width = Math.max(minWidth, newWidth) + 'px';
                            this.position.width = Math.max(minWidth, newWidth);
                        }
                        if (handle.directions.includes('s') || handle.directions.includes('n')) {
                            this.element.style.height = Math.max(minHeight, newHeight) + 'px';
                            this.position.height = Math.max(minHeight, newHeight);
                        }
                        if (handle.directions.includes('w')) {
                            this.element.style.left = newLeft + 'px';
                            this.position.x = newLeft;
                        }
                        if (handle.directions.includes('n')) {
                            this.element.style.top = newTop + 'px';
                            this.position.y = newTop;
                        }
                    });
                };
                const stopResize = () => {
                    if (!resizing) return;
                    resizing = false;
                    overlay.remove();
                    overlay.removeEventListener('mousemove', overlayMouseMove);
                    overlay.removeEventListener('mouseup', overlayMouseUp);
                    window.removeEventListener('mousemove', windowMouseMove);
                    window.removeEventListener('mouseup', windowMouseUp);
                    window.removeEventListener('blur', onBlur);
                    // Save state after resize
                    this._saveState();
                };
                const overlayMouseMove = moveEvent =>
                    applySize(moveEvent.clientX, moveEvent.clientY);
                const windowMouseMove = moveEvent =>
                    applySize(moveEvent.clientX, moveEvent.clientY);
                const overlayMouseUp = () => stopResize();
                const windowMouseUp = () => stopResize();
                const onBlur = () => stopResize();
                overlay.addEventListener('mousemove', overlayMouseMove);
                overlay.addEventListener('mouseup', overlayMouseUp);
                window.addEventListener('mousemove', windowMouseMove);
                window.addEventListener('mouseup', windowMouseUp);
                window.addEventListener('blur', onBlur);
            };
            resizer.addEventListener('mousedown', startResize);
        };
        // Resize handles (8 directions)
        const handles = [
            {
                name: 'top',
                cursor: 'n-resize',
                directions: ['n'],
                style: { top: '-4px', left: '12px', right: '12px', height: '8px' },
            },
            {
                name: 'bottom',
                cursor: 's-resize',
                directions: ['s'],
                style: { bottom: '-4px', left: '12px', right: '12px', height: '8px' },
            },
            {
                name: 'left',
                cursor: 'w-resize',
                directions: ['w'],
                style: { left: '-4px', top: '12px', bottom: '12px', width: '8px' },
            },
            {
                name: 'right',
                cursor: 'e-resize',
                directions: ['e'],
                style: { right: '-4px', top: '12px', bottom: '12px', width: '8px' },
            },
            {
                name: 'top-left',
                cursor: 'nw-resize',
                directions: ['n', 'w'],
                style: { top: '-6px', left: '-6px', width: '14px', height: '14px' },
            },
            {
                name: 'top-right',
                cursor: 'ne-resize',
                directions: ['n', 'e'],
                style: { top: '-6px', right: '-6px', width: '14px', height: '14px' },
            },
            {
                name: 'bottom-left',
                cursor: 'sw-resize',
                directions: ['s', 'w'],
                style: { bottom: '-6px', left: '-6px', width: '14px', height: '14px' },
            },
            {
                name: 'bottom-right',
                cursor: 'se-resize',
                directions: ['s', 'e'],
                style: { bottom: '-6px', right: '-6px', width: '14px', height: '14px' },
            },
        ];
        handles.forEach(createHandle);
    }
    _updatePosition() {
        if (!this.element) return;
        // Update position on the window element itself
        this.element.style.left = `${this.position.x}px`;
        this.element.style.top = `${this.position.y}px`;
    }
    /**
     * Fenster anzeigen. Erzeugt bei Bedarf das DOM, hängt Tabs an die Content‑Area an
     * und ruft bringToFront() + Menubar‑Update. Persistiert den Zustand.
     */
    show() {
        if (!this.element) {
            this.createDOM();
            document.body.appendChild(this.element);
            // Append all existing tabs to content area
            if (this.contentElement) {
                this.tabs.forEach(tab => {
                    if (tab.element && !this.contentElement.contains(tab.element)) {
                        this.contentElement.appendChild(tab.element);
                    }
                });
            }
        }
        if (this.element) {
            const domUtils = window.DOMUtils;
            if (domUtils && typeof domUtils.show === 'function') {
                domUtils.show(this.element);
            } else {
                this.element.classList.remove('hidden');
            }
        }
        this.bringToFront();
        // Update menubar to reflect new active window
        const W = window;
        W.updateProgramLabelByTopModal?.();
        W.updateDockIndicators?.();
        this._saveState();
    }
    /**
     * Fenster ausblenden und Menubar entsprechend aktualisieren.
     */
    hide() {
        this.element?.classList.add('hidden');
        // Update menubar to reflect next top window
        const W = window;
        W.updateProgramLabelByTopModal?.();
        const menuSystem = W.MenuSystem;
        if (menuSystem?.renderApplicationMenu) {
            const current = menuSystem.getCurrentMenuModalId?.();
            menuSystem.renderApplicationMenu(current);
        }
        this._saveState();
    }
    /**
     * Fenster schließen. Übergibt die endgültige Entfernung an den WindowRegistry,
     * sodass dieser Aufräumarbeiten übernehmen kann.
     */
    close() {
        this.hide();
        // Remove from z-index manager stack
        const W = window;
        const zIndexManager = (0, z_index_manager_js_1.getZIndexManager)();
        zIndexManager.removeWindow(this.id);
        // WindowRegistry will handle cleanup
        if (W.WindowRegistry) {
            W.WindowRegistry.removeWindow(this.id);
        }
        // Update dock indicators after window is closed
        W.updateDockIndicators?.();
        // Refresh menus after closing in case active app changes
        const menuSystem = W.MenuSystem;
        if (menuSystem?.renderApplicationMenu) {
            const current = menuSystem.getCurrentMenuModalId?.();
            menuSystem.renderApplicationMenu(current);
        }
    }
    /**
     * Fenster minimieren (aktuell nur Hide + Flag). Integration in Dock/Taskbar
     * kann später hier erfolgen.
     */
    minimize() {
        this.isMinimized = true;
        this.hide();
        // TODO: Add to dock/taskbar
    }
    /**
     * Maximieren/Restore. Setzt inline‑Styles auf das innere Window‑Element.
     */
    toggleMaximize() {
        this.isMaximized = !this.isMaximized;
        if (!this.element) return;
        const windowEl = this.element.querySelector('div');
        if (!windowEl) return;
        if (this.isMaximized) {
            windowEl.style.width = '95vw';
            windowEl.style.height = '95vh';
        } else {
            windowEl.style.width = `${this.position.width}px`;
            windowEl.style.height = `${this.position.height}px`;
        }
        this._saveState();
    }
    /**
     * Nach vorne holen. Nutzt bevorzugt den (legacy) __zIndexManager, ansonsten
     * WindowRegistry.getNextZIndex(). Aktualisiert die Menubar.
     */
    bringToFront() {
        const W = window;
        const zIndexManager = (0, z_index_manager_js_1.getZIndexManager)();
        zIndexManager.bringToFront(this.id, this.element, this.element);
        // Sync local zIndex with DOM assignment
        if (this.element) {
            const currentZ = parseInt(this.element.style.zIndex || '0', 10);
            if (!Number.isNaN(currentZ)) this.zIndex = currentZ;
        }
        // Notify menubar about focus change
        // Track active window in WindowRegistry if available
        W.WindowRegistry?.setActiveWindow?.(this.id);
        W.updateProgramLabelByTopModal?.();
        // Refresh dynamic application menu (e.g. switch to Terminal menu)
        const menuSystem = W.MenuSystem;
        if (menuSystem?.renderApplicationMenu) {
            // Pass current menu modal id so sections rebuild with new active context
            const current = menuSystem.getCurrentMenuModalId?.();
            menuSystem.renderApplicationMenu(current);
        }
    }
    /**
     * Tab hinzufügen. Erzeugt bei Bedarf dessen DOM und hängt ihn in die Content‑Area.
     * Falls noch kein aktiver Tab existiert, wird dieser gesetzt. Rendert die Tabbar neu
     * und speichert den Zustand.
     */
    addTab(tab) {
        this.tabs.set(tab.id, tab);
        tab.setParentWindow(this);
        // Create tab DOM if not exists
        if (!tab.element) {
            tab.element = tab.createDOM();
        }
        // Append tab content to window content area (only if window DOM exists)
        if (tab.element && this.contentElement) {
            this.contentElement.appendChild(tab.element);
        }
        // If window DOM doesn't exist yet, tab will be added when show() is called
        if (!this.activeTabId) {
            this.setActiveTab(tab.id);
        }
        this._renderTabs();
        this._saveState();
    }
    /**
     * Tab entfernen und ggf. anderen Tab aktivieren. Bei Leere wird das Fenster
     * automatisch geschlossen.
     */
    removeTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;
        tab.destroy();
        this.tabs.delete(tabId);
        // If this was the active tab, activate another
        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            this.activeTabId = remainingTabs[0] || null;
            if (this.activeTabId) {
                this.setActiveTab(this.activeTabId);
            }
        }
        // If no tabs left, close window
        if (this.tabs.size === 0) {
            this.close();
        } else {
            this._renderTabs();
            this._saveState();
        }
    }
    /**
     * Tab abkoppeln (z. B. für Drag&Drop in anderes Fenster). Der Tab bleibt bestehen,
     * wird aber aus diesem Fenster entfernt und versteckt.
     */
    detachTab(tabId) {
        const tab = this.tabs.get(tabId) || null;
        if (!tab) return null;
        // Hide but do not destroy
        tab.hide();
        tab.setParentWindow(null);
        this.tabs.delete(tabId);
        // Adjust active tab
        if (this.activeTabId === tabId) {
            const remaining = Array.from(this.tabs.keys());
            this.activeTabId = remaining[0] || null;
            if (this.activeTabId) this.setActiveTab(this.activeTabId);
        }
        if (this.tabs.size === 0) {
            this.close();
        } else {
            this._renderTabs();
            this._saveState();
        }
        return tab;
    }
    /**
     * Tab in ein Ziel‑Fenster verschieben.
     */
    transferTabTo(target, tabId) {
        const tab = this.detachTab(tabId);
        if (tab) {
            target.addTab(tab);
            target.setActiveTab(tab.id);
        }
    }
    /**
     * Aktiven Tab setzen (zeigt diesen und versteckt alle anderen).
     */
    setActiveTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;
        // Hide all tabs
        this.tabs.forEach(t => t.hide());
        // Show active tab
        this.activeTabId = tabId;
        tab.show();
        this._renderTabs();
        this._saveState();
    }
    /**
     * Einfache Default‑Tabbar. Subklassen (z. B. FinderWindow/TextEditorWindow) können
     * diese Methode überschreiben und die dedizierte WindowTabs‑Leiste nutzen.
     */
    _renderTabs() {
        // Basic implementation - subclasses should override
        const tabBar = this.element?.querySelector(`#${this.id}-tabs`);
        if (!tabBar) return;
        tabBar.innerHTML = '';
        this.tabs.forEach(tab => {
            const tabEl = document.createElement('button');
            tabEl.className = `px-3 py-1 text-sm ${tab.id === this.activeTabId ? 'bg-white dark:bg-gray-900' : 'bg-gray-200 dark:bg-gray-800'}`;
            tabEl.textContent = tab.title;
            tabEl.addEventListener('click', () => this.setActiveTab(tab.id));
            tabBar.appendChild(tabEl);
        });
    }
    /**
     * Serialisierung des Fensterzustands (für Session‑Restore).
     */
    serialize() {
        return {
            id: this.id,
            type: this.type,
            position: { ...this.position },
            zIndex: this.zIndex,
            isMinimized: this.isMinimized,
            isMaximized: this.isMaximized,
            activeTabId: this.activeTabId,
            tabs: Array.from(this.tabs.keys()),
            created: this.metadata.created || Date.now(),
            modified: Date.now(),
        };
    }
    /**
     * Rehydrierung aus persistiertem Zustand. Subklassen können eigene
     * deserialize‑Routinen bereitstellen.
     */
    static deserialize(state) {
        const window = new BaseWindow({
            id: state.id,
            type: state.type,
            position: state.position,
            metadata: {
                created: state.created,
            },
        });
        window.zIndex = state.zIndex;
        window.isMinimized = state.isMinimized;
        window.isMaximized = state.isMaximized;
        window.activeTabId = state.activeTabId;
        return window;
    }
    _saveState() {
        const W = window;
        // Trigger multi-window session save (debounced)
        if (W.MultiWindowSessionManager) {
            W.MultiWindowSessionManager.saveSession();
        }
        // Legacy session manager (for backwards compatibility)
        if (W.SessionManager) {
            W.SessionManager.saveWindowState?.(this.serialize());
        }
    }
    /**
     * Vollständiges Aufräumen: Tabs zerstören, DOM entfernen, Menubar aktualisieren
     * und Session speichern.
     */
    destroy() {
        // Destroy all tabs
        this.tabs.forEach(tab => tab.destroy());
        this.tabs.clear();
        // Remove DOM
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
        this._saveState();
        // Update menubar after destruction
        const W = window;
        W.updateProgramLabelByTopModal?.();
    }
    /**
     * Registrierung im (legacy) WindowManager, damit ProgramLabel/Anwendungsmenüs
     * korrekt auf das aktive Fenster gemappt werden. Diese Brücke hält die neue
     * Multi‑Window‑Welt kompatibel zur bestehenden Menubar.
     */
    _registerWithWindowManager() {
        const W = window;
        const WM = W.WindowManager;
        if (!WM || typeof WM.getConfig !== 'function' || typeof WM.register !== 'function') return;
        if (WM.getConfig(this.id)) return; // already registered
        // Map window types to programKey/icon used by the menubar
        const map = {
            finder: { programKey: 'programs.finder', icon: './img/sucher.png' },
            'text-editor': { programKey: 'programs.text', icon: './img/notepad.png' },
            terminal: { programKey: 'programs.terminal', icon: './img/terminal.png' },
        };
        const meta = map[this.type] || { programKey: 'programs.default', icon: './img/sucher.png' };
        try {
            WM.register({
                id: this.id,
                type: 'persistent',
                programKey: meta.programKey,
                icon: meta.icon,
                closeButtonId: null,
                metadata: {
                    /* dynamic multi-window */
                },
            });
            if (typeof WM.setDialogInstance === 'function') {
                WM.setDialogInstance(this.id, {
                    open: () => this.show(),
                    close: () => this.hide(),
                    bringToFront: () => this.bringToFront(),
                });
            }
        } catch (e) {
            console.warn('[BaseWindow] WM.register failed for', this.id, e);
        }
    }
}
exports.BaseWindow = BaseWindow;
// Export to window for global access
window.BaseWindow = BaseWindow;
//# sourceMappingURL=base-window.js.map
