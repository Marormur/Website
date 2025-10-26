// ============================================================================
// src/ts/storage.ts — Persistence & State Management Module (TypeScript)
// Mirrors js/storage.js API and preserves global export window.StorageSystem
// ============================================================================

(() => {
  'use strict';

  console.log('✅ StorageSystem (TS) loaded');

  // ===== Types =====
  type FinderState = { repo: string; path?: string } | null;
  type Positions = Record<
    string,
    { left: string; top: string; width: string; height: string; position: string }
  >;

  // ===== Module Dependencies / Constants =====
  const w = window as unknown as Record<string, unknown>;
  const APP_CONSTANTS = (w.APP_CONSTANTS as Record<string, unknown>) || {};

  const FINDER_STATE_KEY =
    (APP_CONSTANTS.FINDER_STATE_STORAGE_KEY as string) || 'finderState';
  const OPEN_MODALS_KEY = 'openModals';
  const MODAL_POSITIONS_KEY = 'modalPositions';

  const getModalIds = (): string[] => {
    const ac = (w.APP_CONSTANTS as Record<string, unknown> | undefined) || undefined;
    const v = ac && (ac['MODAL_IDS'] as unknown);
    return Array.isArray(v) ? (v as string[]) : [];
  };
  const getTransientModalIds = (): Set<string> => {
    const ac = (w.APP_CONSTANTS as Record<string, unknown> | undefined) || undefined;
    const v = ac && (ac['TRANSIENT_MODAL_IDS'] as unknown);
    return v instanceof Set ? (v as Set<string>) : new Set<string>();
  };

  // ===== Finder State Persistence =====

  function readFinderState(): FinderState {
    try {
      const raw = localStorage.getItem(FINDER_STATE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const po = parsed as Record<string, unknown>;
      const repo = typeof po.repo === 'string' ? po.repo.trim() : '';
      if (!repo) return null;
      return {
        repo,
        path: typeof po.path === 'string' ? po.path : '',
      };
    } catch (err) {
      console.warn('Finder state konnte nicht gelesen werden:', err);
      return null;
    }
  }

  function writeFinderState(state: { repo: string; path?: string } | null | undefined): void {
    if (!state || typeof state.repo !== 'string' || !state.repo) {
      clearFinderState();
      return;
    }
    const payload = {
      repo: state.repo,
      path: typeof state.path === 'string' ? state.path : '',
    };
    try {
      localStorage.setItem(FINDER_STATE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('Finder state konnte nicht gespeichert werden:', err);
    }
  }

  function clearFinderState(): void {
    try {
      localStorage.removeItem(FINDER_STATE_KEY);
    } catch (err) {
      console.warn('Finder state konnte nicht gelöscht werden:', err);
    }
  }

  // ===== Open Modals Persistence =====

  function saveOpenModals(): void {
    const modalIds = getModalIds();
    const transientModalIds = getTransientModalIds();

    const openModals = modalIds.filter((id) => {
      if (transientModalIds.has(id)) return false;
      const el = document.getElementById(id) as HTMLElement | null;
      if (!el) return false;
      const minimized = el.dataset && el.dataset.minimized === 'true';
      return !el.classList.contains('hidden') || minimized;
    });

    try {
      localStorage.setItem(OPEN_MODALS_KEY, JSON.stringify(openModals));
    } catch (err) {
      console.warn('Open modals konnte nicht gespeichert werden:', err);
    }
  }

  function restoreOpenModals(): void {
    const transientModalIds = getTransientModalIds();
    let openModals: string[] = [];

    try {
      openModals = JSON.parse(localStorage.getItem(OPEN_MODALS_KEY) || '[]');
    } catch (err) {
      console.warn('Open modals konnte nicht gelesen werden:', err);
      return;
    }

    openModals.forEach((id) => {
      // Skip transient modals
      if (transientModalIds.has(id)) return;

      // Validate modal exists in DOM
      const el = document.getElementById(id);
      if (!el) {
        console.warn(`Skipping restore of modal "${id}": element not found in DOM`);
        return;
      }

      // Validate modal is registered in WindowManager (if available)
      const WindowManager = w['WindowManager'] as { getConfig?: (id: string) => unknown } | undefined;
      if (WindowManager && typeof WindowManager.getConfig === 'function') {
        const config = WindowManager.getConfig(id);
        if (!config) {
          console.warn(`Skipping restore of modal "${id}": not registered in WindowManager`);
          return;
        }
      }

      // Attempt to restore via dialog instance
      const dialogs = w['dialogs'] as Record<string, unknown> | undefined;
      const dialogInstance = dialogs && (dialogs[id] as Record<string, unknown> | null);
      const openFn = dialogInstance && (dialogInstance['open'] as (() => void) | undefined);
      
      if (typeof openFn === 'function') {
        try {
          openFn();
        } catch (err) {
          console.warn(`Error restoring modal "${id}":`, err);
          // Fallback: try to show element directly
          el.classList.remove('hidden');
        }
      } else {
        // Fallback: no dialog instance, just show the element
        el.classList.remove('hidden');
      }
    });

    // Update dock indicators and program label (if available)
    const updateDockIndicators = w['updateDockIndicators'] as (() => void) | undefined;
    if (typeof updateDockIndicators === 'function') updateDockIndicators();
    const updateProgramLabelByTopModal = w['updateProgramLabelByTopModal'] as (() => void) | undefined;
    if (typeof updateProgramLabelByTopModal === 'function') updateProgramLabelByTopModal();
  }

  // ===== Window Positions & Sizes =====

  function getDialogWindowElement(modal: HTMLElement | null): HTMLElement | null {
    if (!modal) return null;
    return (modal.querySelector('.autopointer') as HTMLElement | null) || modal;
  }

  function saveWindowPositions(): void {
    const modalIds = getModalIds();
    const transientModalIds = getTransientModalIds();
    const positions: Positions = {};

    modalIds.forEach((id) => {
      if (transientModalIds.has(id)) return;
      const el = document.getElementById(id) as HTMLElement | null;
      const windowEl = getDialogWindowElement(el);
      if (el && windowEl) {
        positions[id] = {
          left: (windowEl.style.left || ''),
          top: (windowEl.style.top || ''),
          width: (windowEl.style.width || ''),
          height: (windowEl.style.height || ''),
          position: (windowEl.style.position || ''),
        };
      }
    });

    try {
      localStorage.setItem(MODAL_POSITIONS_KEY, JSON.stringify(positions));
    } catch (err) {
      console.warn('Window positions konnte nicht gespeichert werden:', err);
    }
  }

  function restoreWindowPositions(): void {
    const transientModalIds = getTransientModalIds();
    let positions: Positions = {};

    try {
      positions = JSON.parse(localStorage.getItem(MODAL_POSITIONS_KEY) || '{}');
    } catch (err) {
      console.warn('Window positions konnte nicht gelesen werden:', err);
      return;
    }

    Object.keys(positions).forEach((id) => {
      if (transientModalIds.has(id)) return;
      const el = document.getElementById(id) as HTMLElement | null;
      const windowEl = getDialogWindowElement(el);
      if (el && windowEl) {
        const stored = positions[id];
        // noUncheckedIndexedAccess: positions[id] may be undefined
        if (!stored) return;

        if (stored.position) {
          windowEl.style.position = stored.position;
        } else if (stored.left || stored.top) {
          windowEl.style.position = 'fixed';
        }
        if (stored.left) windowEl.style.left = stored.left;
        if (stored.top) windowEl.style.top = stored.top;
        if (stored.width) windowEl.style.width = stored.width;
        if (stored.height) windowEl.style.height = stored.height;
      }

      const clampWindowToMenuBar = w['clampWindowToMenuBar'] as ((el: HTMLElement | null) => void) | undefined;
      if (typeof clampWindowToMenuBar === 'function') {
        clampWindowToMenuBar(windowEl);
      }
    });
  }

  // ===== Layout Reset =====

  function resetWindowLayout(): void {
    const modalIds = getModalIds();

    modalIds.forEach((id) => {
      const modal = document.getElementById(id) as HTMLElement | null;
      const windowEl = getDialogWindowElement(modal);
      if (modal) {
        modal.style.zIndex = '';
      }
      if (windowEl) {
        windowEl.style.left = '';
        windowEl.style.top = '';
        windowEl.style.width = '';
        windowEl.style.height = '';
        windowEl.style.position = '';
        windowEl.style.zIndex = '';
      }
    });

    if (typeof w['topZIndex'] !== 'undefined') {
      w['topZIndex'] = 1000 as unknown;
    }

    try {
      localStorage.removeItem(MODAL_POSITIONS_KEY);
    } catch (err) {
      console.warn('Modal positions konnte nicht gelöscht werden:', err);
    }

    const hideMenuDropdowns = w['hideMenuDropdowns'] as (() => void) | undefined;
    if (typeof hideMenuDropdowns === 'function') hideMenuDropdowns();

    const syncTopZIndexWithDOM = w['syncTopZIndexWithDOM'] as (() => void) | undefined;
    if (typeof syncTopZIndexWithDOM === 'function') syncTopZIndexWithDOM();

    const dialogs = w['dialogs'] as Record<string, unknown> | undefined;
    if (dialogs) {
      Object.values(dialogs).forEach((dialog) => {
        const enforce = (dialog as Record<string, unknown>)['enforceMenuBarBoundary'] as
          | (() => void)
          | undefined;
        if (typeof enforce === 'function') enforce();
      });
    }

    // Clear finder state
    clearFinderState();

    const updateProgramLabelByTopModal = w['updateProgramLabelByTopModal'] as (() => void) | undefined;
    if (typeof updateProgramLabelByTopModal === 'function') updateProgramLabelByTopModal();
  }

  // ===== Public API (global) =====

  const api = {
    // Finder state
    readFinderState,
    writeFinderState,
    clearFinderState,

    // Open modals
    saveOpenModals,
    restoreOpenModals,

    // Window positions
    saveWindowPositions,
    restoreWindowPositions,
    getDialogWindowElement,

    // Layout reset
    resetWindowLayout,
  };

  w['StorageSystem'] = api;
})();
