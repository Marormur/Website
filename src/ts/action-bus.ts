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

    type Params = Record<string, string | undefined>;
    type Handler = (params: Params, element: HTMLElement | null) => void;

    // Narrowly typed window surface we rely on
    type GlobalExtras = {
        dialogs?: Record<string, { open?: () => void; close?: () => void }>;
        hideMenuDropdowns?: () => void;
        resetWindowLayout?: () => void;
        openProgramInfoDialog?: (arg: unknown) => void;
        updateProgramLabelByTopModal?: () => void;
        saveOpenModals?: () => void;
        updateDockIndicators?: () => void;
    };

    // Helper type to access the subset of FinderSystem APIs we call here
    type FinderSystemLite = {
        navigateUp?: () => void;
        getState?: () => { currentView: string };
        navigateTo?: (parts: string[], view?: string) => void;
        setViewMode?: (mode: string) => void;
        setSortBy?: (field: string) => void;
        openItem?: (name: string, type: string) => void;
    };
    type WF = Window & { FinderSystem?: FinderSystemLite };

    const actionHandlers = new Map<string, Handler>();
    const eventDelegates: Array<{ eventType: string; delegate: (e: Event) => void }> = [];

    const ActionBus = {
        /**
         * Registriert einen Action-Handler
         * @param {string} actionName - Name der Action
         * @param {Function} handler - Handler-Funktion (params, element) => void
         */
        register(actionName: string, handler: Handler) {
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
        registerAll(actions: Record<string, Handler>) {
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
        execute(actionName: string, params: Params = {}, element: HTMLElement | null = null) {
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
                const actionName = element.getAttribute('data-action') as string;
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
                const actionName = element.getAttribute('data-action-dblclick') as string;
                const params = this.extractParams(element);
                if (element.tagName === 'BUTTON' || element.tagName === 'A') {
                    event.preventDefault();
                }
                event.stopPropagation();
                this.execute(actionName, params, element);
            });

            // Support für data-action-hover
            this.delegateEvent('mouseenter', '[data-action-hover]', element => {
                const actionName = element.getAttribute('data-action-hover') as string;
                const params = this.extractParams(element);
                this.execute(actionName, params, element);
            });

            console.log('ActionBus initialized');
        },

        /**
         * Event-Delegation Helper
         */
        delegateEvent(
            eventType: string,
            selector: string,
            handler: (element: HTMLElement, event: Event) => void
        ) {
            const delegate = (event: Event) => {
                const target = event.target;
                if (!(target instanceof Element)) return;

                const element = target.closest(selector) as HTMLElement | null;
                if (element) {
                    handler(element, event);
                }
            };

            document.addEventListener(eventType, delegate as EventListener);
            eventDelegates.push({ eventType, delegate });
        },

        /**
         * Extrahiert Parameter aus data-* Attributen
         */
        extractParams(element: HTMLElement): Params {
            const params: Params = {};
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
                document.removeEventListener(eventType, delegate as EventListener);
            });
            eventDelegates.length = 0;
            actionHandlers.clear();
        },
    } as const;

    // Standard-Actions registrieren
    ActionBus.registerAll({
        // Preview: generischer Öffnen-Handler (unterstützt direkte URLs oder Delegation an Finder)
        openWithPreview: (params: Params) => {
            try {
                // 1) Direkte URL-Übergabe (ein Bild)
                const single = (params['url'] || params['src'] || params['imageUrl']) as
                    | string
                    | undefined;
                // 2) Liste als CSV
                const csv = (params['urls'] || params['images']) as string | undefined;
                // 3) Startindex
                const idx = parseInt((params['index'] || '0') as string, 10) || 0;
                // 4) Pfad (Anzeigezwecke)
                const path = (params['path'] || params['imagePath']) as string | undefined;

                const W = window as unknown as Window & {
                    PreviewInstanceManager?: any;
                    FinderSystem?: any;
                };

                if (single) {
                    const list = [single];
                    if (W.PreviewInstanceManager?.openImages) {
                        W.PreviewInstanceManager.openImages(list, 0, path);
                    }
                    return;
                }
                if (csv) {
                    const list = csv
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean);
                    if (list.length && W.PreviewInstanceManager?.openImages) {
                        W.PreviewInstanceManager.openImages(
                            list,
                            Math.max(0, Math.min(idx, list.length - 1)),
                            path
                        );
                    }
                    return;
                }

                // Fallback: Falls aus Finder mit Item-Name aufgerufen
                const itemName = (params['itemName'] || params['name']) as string | undefined;
                if (itemName && W.FinderSystem?.openItem) {
                    W.FinderSystem.openItem(itemName, 'file');
                }
            } catch (e) {
                console.warn('openWithPreview failed:', e);
            }
        },
        // Fenster schließen
        closeWindow: (params: Params) => {
            const windowId = params.windowId;
            if (!windowId) {
                console.warn('closeWindow: missing windowId');
                return;
            }

            const g = window as unknown as Window & GlobalExtras;
            const wm = (window as Window & { WindowManager?: { close?: (id: string) => void } })
                .WindowManager;
            if (wm && typeof wm.close === 'function') {
                wm.close(windowId);
            }

            // Callbacks
            g.saveOpenModals?.();
            g.updateDockIndicators?.();
            g.updateProgramLabelByTopModal?.();
        },

        // Fenster öffnen
        openWindow: (params: Params) => {
            const windowId = params.windowId;
            if (!windowId) {
                console.warn('openWindow: missing windowId');
                return;
            }

            // Close launchpad if it's open (clicking dock icon while launchpad is visible)
            const launchpadModal = document.getElementById('launchpad-modal');
            if (launchpadModal && !launchpadModal.classList.contains('hidden')) {
                const g = window as unknown as Window & GlobalExtras;
                g.dialogs?.['launchpad-modal']?.close?.();
            }

            // SPECIAL: Use Multi-Window system for Finder instead of legacy modal
            if (windowId === 'finder-modal') {
                const win = window as any;
                if (win.FinderWindow && typeof win.FinderWindow.create === 'function') {
                    win.FinderWindow.create();
                    return;
                }
            }

            (
                window as Window & { WindowManager?: { open?: (id: string) => void } }
            ).WindowManager?.open?.(windowId);

            // Callbacks
            (window as unknown as Window & GlobalExtras).updateProgramLabelByTopModal?.();
        },

        // Aktuelles (oberstes) Fenster schließen
        closeTopWindow: () => {
            const g = window as unknown as Window &
                GlobalExtras & {
                    WindowManager?: { getTopWindow?: () => unknown; close?: (id: string) => void };
                };
            g.hideMenuDropdowns?.();

            const maybeTop = g.WindowManager?.getTopWindow?.();
            let topId: string | null = null;
            if (typeof maybeTop === 'string') {
                topId = maybeTop;
            } else if (maybeTop && typeof maybeTop === 'object') {
                const obj = maybeTop as Record<string, unknown>;
                if (typeof obj.id === 'string') topId = obj.id;
            }
            if (!topId) return;

            g.WindowManager?.close?.(topId);

            g.saveOpenModals?.();
            g.updateDockIndicators?.();
            g.updateProgramLabelByTopModal?.();
        },

        // Window-Layout zurücksetzen
        resetWindowLayout: () => {
            const g = window as unknown as Window & GlobalExtras;
            g.hideMenuDropdowns?.();
            g.resetWindowLayout?.();
        },

        // Program-Info Dialog öffnen
        openProgramInfo: (_params: Params, _element: HTMLElement | null) => {
            const g = window as unknown as Window & GlobalExtras;
            g.hideMenuDropdowns?.();
            g.openProgramInfoDialog?.(null);
        },

        // Über-Dialog öffnen (aus Apple-Menü)
        openAbout: () => {
            const g = window as unknown as Window & GlobalExtras;
            g.hideMenuDropdowns?.();
            g.dialogs?.['about-modal']?.open?.();
            g.updateProgramLabelByTopModal?.();
        },

        // Settings öffnen
        openSettings: () => {
            const g = window as unknown as Window & GlobalExtras;
            g.hideMenuDropdowns?.();
            g.dialogs?.['settings-modal']?.open?.();
            g.updateProgramLabelByTopModal?.();
        },

        // Desktop-Item öffnen (für Dock-Icons)
        openDesktopItem: (params: Params) => {
            const itemId = params.itemId;
            if (!itemId) {
                console.warn('openDesktopItem: missing itemId');
                return;
            }
            // Lazy import to avoid circular dependency
            import('./desktop.js').then(({ DESKTOP_SHORTCUTS }) => {
                const shortcut = DESKTOP_SHORTCUTS.find(s => s.id === itemId);
                if (shortcut?.onOpen) {
                    shortcut.onOpen();
                } else {
                    console.warn(`openDesktopItem: no shortcut found for id "${itemId}"`);
                }
            });
        },

        // Finder: eine Ebene nach oben
        'finder:navigateUp': () => {
            const wf = window as unknown as WF;
            wf.FinderSystem?.navigateUp?.();
        },

        // Finder: zur Root der aktuellen Ansicht
        'finder:goRoot': () => {
            const wf = window as unknown as WF;
            if (wf.FinderSystem?.navigateTo && wf.FinderSystem?.getState) {
                const view = wf.FinderSystem.getState().currentView;
                wf.FinderSystem.navigateTo([], view);
            }
        },

        // Finder: Ansicht wechseln (computer/github/favorites/recent)
        'finder:switchView': (params: Params) => {
            const view = params['finderView'] || params.view;
            if (!view) {
                console.warn('finder:switchView: missing finderView');
                return;
            }
            const wf = window as unknown as WF;
            wf.FinderSystem?.navigateTo?.([], view as string);
        },

        // Finder: View-Mode setzen (list/grid/columns)
        'finder:setViewMode': (params: Params) => {
            const mode = params['viewMode'] || params['mode'];
            if (!mode) {
                console.warn('finder:setViewMode: missing viewMode');
                return;
            }
            const wf = window as unknown as WF;
            wf.FinderSystem?.setViewMode?.(mode as string);
        },

        // Finder: Sortierung setzen
        'finder:setSortBy': (params: Params) => {
            const field = params['sortBy'] || params['field'];
            if (!field) {
                console.warn('finder:setSortBy: missing sortBy');
                return;
            }
            const wf = window as unknown as WF;
            wf.FinderSystem?.setSortBy?.(field as string);
        },

        // Finder: In Pfad navigieren (data-path="A/B/C")
        'finder:navigateToPath': (params: Params) => {
            const raw = params.path || '';
            const parts = typeof raw === 'string' && raw.length ? raw.split('/') : [];
            const wf = window as unknown as WF;
            wf.FinderSystem?.navigateTo?.(parts);
        },

        // Finder: Item öffnen (Datei oder Ordner)
        'finder:openItem': (params: Params) => {
            const name = params['itemName'] || params['name'];
            const type = params['itemType'] || params['type'];
            if (!name || !type) {
                console.warn('finder:openItem: missing name/type');
                return;
            }
            const wf = window as unknown as WF;
            wf.FinderSystem?.openItem?.(name as string, type as string);
        },

        // Settings: Show specific section
        'settings:showSection': (params: Params) => {
            const section = params['section'];
            if (!section) {
                console.warn('settings:showSection: missing section');
                return;
            }
            const W = window as unknown as Window & {
                SettingsSystem?: { showSection?: (section: string) => void };
            };
            W.SettingsSystem?.showSection?.(section as string);
        },

        // Session: Export current session as JSON file
        'session:export': () => {
            const W = window as unknown as Window & {
                SessionManager?: { exportSession?: () => string | null };
                appI18n?: { translate?: (key: string) => string };
            };
            const translate = W.appI18n?.translate || ((k: string) => k);

            if (!W.SessionManager?.exportSession) {
                console.error('SessionManager not available');
                return;
            }

            const json = W.SessionManager.exportSession();
            if (!json) {
                alert(translate('menu.session.noSession'));
                return;
            }

            // Create download link
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('Session exported successfully');
        },

        // Session: Import session from JSON file
        'session:import': () => {
            const W = window as unknown as Window & {
                SessionManager?: { importSession?: (json: string) => boolean };
                appI18n?: { translate?: (key: string) => string };
            };
            const translate = W.appI18n?.translate || ((k: string) => k);

            if (!W.SessionManager?.importSession) {
                console.error('SessionManager not available');
                return;
            }

            // Create file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json,.json';
            input.onchange = e => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = event => {
                    const json = event.target?.result;
                    if (typeof json !== 'string') {
                        alert(translate('menu.session.importError'));
                        return;
                    }

                    const success = W.SessionManager?.importSession?.(json);
                    if (success) {
                        console.log('Session imported successfully');
                    } else {
                        alert(translate('menu.session.importError'));
                    }
                };
                reader.onerror = () => {
                    alert(translate('menu.session.importError'));
                };
                reader.readAsText(file);
            };
            input.click();
        },
    });

    // Globaler Export
    (window as unknown as { ActionBus: typeof ActionBus }).ActionBus = ActionBus;
})();
