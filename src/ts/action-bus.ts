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
    openDesktopItemById?: (id: string) => void;
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
      this.delegateEvent('mouseenter', '[data-action-hover]', (element) => {
        const actionName = element.getAttribute('data-action-hover') as string;
        const params = this.extractParams(element);
        this.execute(actionName, params, element);
      });

      console.log('ActionBus initialized');
    },

    /**
     * Event-Delegation Helper
     */
    delegateEvent(eventType: string, selector: string, handler: (element: HTMLElement, event: Event) => void) {
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
    // Fenster schließen
    closeWindow: (params: Params) => {
      const windowId = params.windowId;
      if (!windowId) {
        console.warn('closeWindow: missing windowId');
        return;
      }

      const g = window as unknown as Window & GlobalExtras;
      const wm = (window as Window & { WindowManager?: { close?: (id: string) => void } }).WindowManager;
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

      (window as Window & { WindowManager?: { open?: (id: string) => void } }).WindowManager?.open?.(windowId);

      // Callbacks
      (window as unknown as Window & GlobalExtras).updateProgramLabelByTopModal?.();
    },

    // Aktuelles (oberstes) Fenster schließen
    closeTopWindow: () => {
      const g = window as unknown as Window & GlobalExtras & { WindowManager?: { getTopWindow?: () => unknown; close?: (id: string) => void } };
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
      const g = window as unknown as Window & GlobalExtras;
      g.openDesktopItemById?.(itemId);
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
  });

  // Globaler Export
  (window as unknown as { ActionBus: typeof ActionBus }).ActionBus = ActionBus;
})();
