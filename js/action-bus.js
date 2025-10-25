console.log('ActionBus loaded');

/**
 * ActionBus - Deklaratives Event-System
 *
 * Vorteile:
 * - Kein manuelles addEventListener mehr für repetitive Aktionen
 * - Actions können über data-action="actionName" triggert werden
 * - Zentrale Verwaltung aller UI-Aktionen
 * - Einfaches Hinzufügen neuer Aktionen
 *
 * Verwendung:
 * HTML: <button data-action="closeWindow" data-window-id="finder-modal">Schließen</button>
 * JS: ActionBus.register('closeWindow', (params, element) => { ... });
 */
(function () {
    'use strict';

    const actionHandlers = new Map();
    const eventDelegates = [];

    const ActionBus = {
        /**
         * Registriert einen Action-Handler
         * @param {string} actionName - Name der Action
         * @param {function} handler - Handler-Funktion (params, element) => void
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
         * @param {HTMLElement} element - Element das die Action ausgelöst hat
         */
        execute(actionName, params = {}, element = null) {
            const handler = actionHandlers.get(actionName);
            if (!handler) {
                console.warn(`No handler registered for action: ${actionName}`);
                return;
            }

            try {
                handler(params, element);
            } catch (error) {
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
            this.delegateEvent(
                'dblclick',
                '[data-action-dblclick]',
                (element, event) => {
                    const actionName = element.getAttribute(
                        'data-action-dblclick',
                    );
                    const params = this.extractParams(element);
                    if (
                        element.tagName === 'BUTTON' ||
                        element.tagName === 'A'
                    ) {
                        event.preventDefault();
                    }
                    event.stopPropagation();
                    this.execute(actionName, params, element);
                },
            );

            // Support für data-action-hover
            this.delegateEvent(
                'mouseenter',
                '[data-action-hover]',
                (element, event) => {
                    const actionName =
                        element.getAttribute('data-action-hover');
                    const params = this.extractParams(element);
                    this.execute(actionName, params, element);
                },
            );

            console.log('ActionBus initialized');
        },

        /**
         * Event-Delegation Helper
         */
        delegateEvent(eventType, selector, handler) {
            const delegate = (event) => {
                const target = event.target;
                if (!target || typeof target.closest !== 'function') return;

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

            if (window.WindowManager) {
                window.WindowManager.close(windowId);
            }

            // Callbacks
            if (window.saveOpenModals) window.saveOpenModals();
            if (window.updateDockIndicators) window.updateDockIndicators();
            if (window.updateProgramLabelByTopModal)
                window.updateProgramLabelByTopModal();
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
            if (
                launchpadModal &&
                !launchpadModal.classList.contains('hidden')
            ) {
                if (window.dialogs?.['launchpad-modal']?.close) {
                    window.dialogs['launchpad-modal'].close();
                }
            }

            if (window.WindowManager) {
                window.WindowManager.open(windowId);
            }

            // Callbacks
            if (window.updateProgramLabelByTopModal)
                window.updateProgramLabelByTopModal();
        },

        // Aktuelles (oberstes) Fenster schließen
        closeTopWindow: () => {
            if (window.hideMenuDropdowns) window.hideMenuDropdowns();

            const topModal = window.WindowManager?.getTopWindow();
            if (!topModal) return;

            if (window.WindowManager) {
                window.WindowManager.close(topModal.id);
            }

            if (window.saveOpenModals) window.saveOpenModals();
            if (window.updateDockIndicators) window.updateDockIndicators();
            if (window.updateProgramLabelByTopModal)
                window.updateProgramLabelByTopModal();
        },

        // Window-Layout zurücksetzen
        resetWindowLayout: () => {
            if (window.hideMenuDropdowns) window.hideMenuDropdowns();
            if (window.resetWindowLayout) window.resetWindowLayout();
        },

        // Program-Info Dialog öffnen
        openProgramInfo: (params, element) => {
            if (window.hideMenuDropdowns) window.hideMenuDropdowns();
            if (window.openProgramInfoDialog) {
                window.openProgramInfoDialog(null);
            }
        },

        // Über-Dialog öffnen (aus Apple-Menü)
        openAbout: () => {
            if (window.hideMenuDropdowns) window.hideMenuDropdowns();
            if (window.dialogs?.['about-modal']) {
                window.dialogs['about-modal'].open();
            }
            if (window.updateProgramLabelByTopModal)
                window.updateProgramLabelByTopModal();
        },

        // Settings öffnen
        openSettings: () => {
            if (window.hideMenuDropdowns) window.hideMenuDropdowns();
            if (window.dialogs?.['settings-modal']) {
                window.dialogs['settings-modal'].open();
            }
            if (window.updateProgramLabelByTopModal)
                window.updateProgramLabelByTopModal();
        },

        // Desktop-Item öffnen (für Dock-Icons)
        openDesktopItem: (params) => {
            const itemId = params.itemId;
            if (!itemId) {
                console.warn('openDesktopItem: missing itemId');
                return;
            }
            if (window.openDesktopItemById) {
                window.openDesktopItemById(itemId);
            }
        },

        // Finder: eine Ebene nach oben
        'finder:navigateUp': () => {
            if (window.FinderSystem?.navigateUp) {
                window.FinderSystem.navigateUp();
            }
        },

        // Finder: zur Root der aktuellen Ansicht
        'finder:goRoot': () => {
            if (
                window.FinderSystem?.navigateTo &&
                window.FinderSystem?.getState
            ) {
                const view = window.FinderSystem.getState().currentView;
                window.FinderSystem.navigateTo([], view);
            }
        },

        // Finder: Ansicht wechseln (computer/github/favorites/recent)
        'finder:switchView': (params) => {
            const view = params.finderView || params.view;
            if (!view) {
                console.warn('finder:switchView: missing finderView');
                return;
            }
            if (window.FinderSystem?.navigateTo) {
                window.FinderSystem.navigateTo([], view);
            }
        },

        // Finder: View-Mode setzen (list/grid/columns)
        'finder:setViewMode': (params) => {
            const mode = params.viewMode || params.mode;
            if (!mode) {
                console.warn('finder:setViewMode: missing viewMode');
                return;
            }
            if (window.FinderSystem?.setViewMode) {
                window.FinderSystem.setViewMode(mode);
            }
        },

        // Finder: Sortierung setzen
        'finder:setSortBy': (params) => {
            const field = params.sortBy || params.field;
            if (!field) {
                console.warn('finder:setSortBy: missing sortBy');
                return;
            }
            if (window.FinderSystem?.setSortBy) {
                window.FinderSystem.setSortBy(field);
            }
        },

        // Finder: In Pfad navigieren (data-path="A/B/C")
        'finder:navigateToPath': (params) => {
            const raw = params.path || '';
            const parts =
                typeof raw === 'string' && raw.length ? raw.split('/') : [];
            if (window.FinderSystem?.navigateTo) {
                window.FinderSystem.navigateTo(parts);
            }
        },

        // Finder: Item öffnen (Datei oder Ordner)
        'finder:openItem': (params) => {
            const name = params.itemName || params.name;
            const type = params.itemType || params.type;
            if (!name || !type) {
                console.warn('finder:openItem: missing name/type');
                return;
            }
            if (window.FinderSystem?.openItem) {
                window.FinderSystem.openItem(name, type);
            }
        },
    });

    // Globaler Export
    window.ActionBus = ActionBus;
})();
