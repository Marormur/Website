/**
 * ActionBus - Declarative event system to wire UI actions via data-action attributes.
 *
 * Example:
 *   <button data-action="closeWindow" data-window-id="finder-modal">Close</button>
 *   ActionBus.register('closeWindow', (params, el) => { ... })
 */
console.log('ActionBus loaded');
(function () {
    'use strict';
    const actionHandlers = new Map();
    const eventDelegates = [];
    const ActionBus = {
        /**
         * Registriert einen Action-Handler
         * @param {string} actionName - Name der Action
         * @param {Function} handler - Handler-Funktion (params, element) => void
         */
        register(actionName, handler) {
            if (!actionName || typeof handler !== 'function') {
                console.error('Invalid action registration:', actionName);
                return;
            }
            actionHandlers.set(actionName, handler);
        },
        /**
         * Registriert mehrere Actions auf einmal
         * @param {Object} actions - Object mit actionName: handler Paaren
         */
        registerAll(actions) {
            Object.entries(actions).forEach(([name, handler]) => {
                this.register(name, handler);
            });
        },
        /**
         * Führt eine Action aus
         * @param {string} actionName - Name der Action
         * @param {Object} params - Parameter für die Action
         * @param {HTMLElement|null} element - Element das die Action ausgelöst hat
         */
        execute(actionName, params = {}, element = null) {
            const handler = actionHandlers.get(actionName);
            if (!handler) {
                console.warn(`No handler registered for action: ${actionName}`);
                return;
            }
            try {
                handler(params, element);
            }
            catch (error) {
                console.error(`Error executing action ${actionName}:`, error);
            }
        },
        /**
         * Initialisiert das Event-Delegation System
         * Sucht alle Elemente mit data-action und bindet sie
         */
        init() {
            // Click-Events
            this.delegateEvent('click', '[data-action]', (element, event) => {
                const actionName = element.getAttribute('data-action');
                const params = this.extractParams(element);
                // Prevent default for buttons and links
                if (element.tagName === 'BUTTON' || element.tagName === 'A') {
                    event.preventDefault();
                }
                event.stopPropagation();
                this.execute(actionName, params, element);
            });
            // Double-click support for data-action-dblclick
            this.delegateEvent('dblclick', '[data-action-dblclick]', (element, event) => {
                const actionName = element.getAttribute('data-action-dblclick');
                const params = this.extractParams(element);
                if (element.tagName === 'BUTTON' || element.tagName === 'A') {
                    event.preventDefault();
                }
                event.stopPropagation();
                this.execute(actionName, params, element);
            });
            // Support für data-action-hover
            this.delegateEvent('mouseenter', '[data-action-hover]', (element) => {
                const actionName = element.getAttribute('data-action-hover');
                const params = this.extractParams(element);
                this.execute(actionName, params, element);
            });
            console.log('ActionBus initialized');
        },
        /**
         * Event-Delegation Helper
         */
        delegateEvent(eventType, selector, handler) {
            const delegate = (event) => {
                const target = event.target;
                if (!(target instanceof Element))
                    return;
                const element = target.closest(selector);
                if (element) {
                    handler(element, event);
                }
            };
            document.addEventListener(eventType, delegate);
            eventDelegates.push({ eventType, delegate });
        },
        /**
         * Extrahiert Parameter aus data-* Attributen
         */
        extractParams(element) {
            const params = {};
            const dataset = element.dataset;
            // Alle data-* Attribute durchgehen, außer data-action selbst
            for (const key in dataset) {
                if (key !== 'action' && key !== 'actionHover') {
                    params[key] = dataset[key];
                }
            }
            return params;
        },
        /**
         * Cleanup - entfernt alle Event-Listener
         */
        destroy() {
            eventDelegates.forEach(({ eventType, delegate }) => {
                document.removeEventListener(eventType, delegate);
            });
            eventDelegates.length = 0;
            actionHandlers.clear();
        },
    };
    // Standard-Actions registrieren
    ActionBus.registerAll({
        // Fenster schließen
        closeWindow: (params) => {
            const windowId = params.windowId;
            if (!windowId) {
                console.warn('closeWindow: missing windowId');
                return;
            }
            const g = window;
            if (window.WindowManager?.close) {
                window.WindowManager.close(windowId);
            }
            // Callbacks
            g.saveOpenModals?.();
            g.updateDockIndicators?.();
            g.updateProgramLabelByTopModal?.();
        },
        // Fenster öffnen
        openWindow: (params) => {
            const windowId = params.windowId;
            if (!windowId) {
                console.warn('openWindow: missing windowId');
                return;
            }
            // Close launchpad if it's open (clicking dock icon while launchpad is visible)
            const launchpadModal = document.getElementById('launchpad-modal');
            if (launchpadModal && !launchpadModal.classList.contains('hidden')) {
                const g = window;
                g.dialogs?.['launchpad-modal']?.close?.();
            }
            window.WindowManager?.open?.(windowId);
            // Callbacks
            window.updateProgramLabelByTopModal?.();
        },
        // Aktuelles (oberstes) Fenster schließen
        closeTopWindow: () => {
            const g = window;
            g.hideMenuDropdowns?.();
            const maybeTop = g.WindowManager?.getTopWindow?.();
            let topId = null;
            if (typeof maybeTop === 'string') {
                topId = maybeTop;
            }
            else if (maybeTop && typeof maybeTop === 'object') {
                const obj = maybeTop;
                if (typeof obj.id === 'string')
                    topId = obj.id;
            }
            if (!topId)
                return;
            g.WindowManager?.close?.(topId);
            g.saveOpenModals?.();
            g.updateDockIndicators?.();
            g.updateProgramLabelByTopModal?.();
        },
        // Window-Layout zurücksetzen
        resetWindowLayout: () => {
            const g = window;
            g.hideMenuDropdowns?.();
            g.resetWindowLayout?.();
        },
        // Program-Info Dialog öffnen
        openProgramInfo: (_params, _element) => {
            const g = window;
            g.hideMenuDropdowns?.();
            g.openProgramInfoDialog?.(null);
        },
        // Über-Dialog öffnen (aus Apple-Menü)
        openAbout: () => {
            const g = window;
            g.hideMenuDropdowns?.();
            g.dialogs?.['about-modal']?.open?.();
            g.updateProgramLabelByTopModal?.();
        },
        // Settings öffnen
        openSettings: () => {
            const g = window;
            g.hideMenuDropdowns?.();
            g.dialogs?.['settings-modal']?.open?.();
            g.updateProgramLabelByTopModal?.();
        },
        // Desktop-Item öffnen (für Dock-Icons)
        openDesktopItem: (params) => {
            const itemId = params.itemId;
            if (!itemId) {
                console.warn('openDesktopItem: missing itemId');
                return;
            }
            const g = window;
            g.openDesktopItemById?.(itemId);
        },
        // Finder: eine Ebene nach oben
        'finder:navigateUp': () => {
            const wf = window;
            wf.FinderSystem?.navigateUp?.();
        },
        // Finder: zur Root der aktuellen Ansicht
        'finder:goRoot': () => {
            const wf = window;
            if (wf.FinderSystem?.navigateTo && wf.FinderSystem?.getState) {
                const view = wf.FinderSystem.getState().currentView;
                wf.FinderSystem.navigateTo([], view);
            }
        },
        // Finder: Ansicht wechseln (computer/github/favorites/recent)
        'finder:switchView': (params) => {
            const view = params['finderView'] || params.view;
            if (!view) {
                console.warn('finder:switchView: missing finderView');
                return;
            }
            const wf = window;
            wf.FinderSystem?.navigateTo?.([], view);
        },
        // Finder: View-Mode setzen (list/grid/columns)
        'finder:setViewMode': (params) => {
            const mode = params['viewMode'] || params['mode'];
            if (!mode) {
                console.warn('finder:setViewMode: missing viewMode');
                return;
            }
            const wf = window;
            wf.FinderSystem?.setViewMode?.(mode);
        },
        // Finder: Sortierung setzen
        'finder:setSortBy': (params) => {
            const field = params['sortBy'] || params['field'];
            if (!field) {
                console.warn('finder:setSortBy: missing sortBy');
                return;
            }
            const wf = window;
            wf.FinderSystem?.setSortBy?.(field);
        },
        // Finder: In Pfad navigieren (data-path="A/B/C")
        'finder:navigateToPath': (params) => {
            const raw = params.path || '';
            const parts = typeof raw === 'string' && raw.length ? raw.split('/') : [];
            const wf = window;
            wf.FinderSystem?.navigateTo?.(parts);
        },
        // Finder: Item öffnen (Datei oder Ordner)
        'finder:openItem': (params) => {
            const name = params['itemName'] || params['name'];
            const type = params['itemType'] || params['type'];
            if (!name || !type) {
                console.warn('finder:openItem: missing name/type');
                return;
            }
            const wf = window;
            wf.FinderSystem?.openItem?.(name, type);
        },
        // System UI: toggle (e.g., Wi-Fi, Bluetooth)
        'system:toggle': (params, el) => {
            const key = params['systemToggle'] || params['toggle'] || params['key'];
            if (!key) {
                console.warn('system:toggle: missing systemToggle');
                return;
            }
            if (el && el.getAttribute && el.getAttribute('aria-disabled') === 'true') return;
            window.SystemUI?.handleSystemToggle?.(key);
        },
        // System UI: generic action (e.g., open settings)
        'system:action': (params, el) => {
            const action = params['systemAction'] || params['action'];
            if (!action) {
                console.warn('system:action: missing systemAction');
                return;
            }
            if (el && el.getAttribute && el.getAttribute('aria-disabled') === 'true') return;
            window.SystemUI?.handleSystemAction?.(action);
        },
        // System UI: set audio device
        'system:setAudioDevice': (params, el) => {
            const dev = params['audioDevice'] || params['device'];
            if (!dev) {
                console.warn('system:setAudioDevice: missing audioDevice');
                return;
            }
            if (el && el.getAttribute && el.getAttribute('aria-disabled') === 'true') return;
            window.SystemUI?.setAudioDevice?.(dev);
        },
        // System UI: set network
        'system:setNetwork': (params, el) => {
            const net = params['network'];
            if (!net) {
                console.warn('system:setNetwork: missing network');
                return;
            }
            if (el && el.getAttribute && el.getAttribute('aria-disabled') === 'true') return;
            window.SystemUI?.setConnectedNetwork?.(net);
        },
        // System UI: set bluetooth device
        'system:setBluetoothDevice': (params, el) => {
            const dev = params['device'];
            if (!dev) {
                console.warn('system:setBluetoothDevice: missing device');
                return;
            }
            if (el && el.getAttribute && el.getAttribute('aria-disabled') === 'true') return;
            window.SystemUI?.setBluetoothDevice?.(dev, { syncAudio: true });
        },
    });
    // Globaler Export
    window.ActionBus = ActionBus;
})();
//# sourceMappingURL=action-bus.js.map