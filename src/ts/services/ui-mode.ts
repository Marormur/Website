/**
 * src/ts/services/ui-mode.ts
 * UI mode management (desktop/mobile/auto) with persistent preference and safe fallbacks.
 */

import { getString, setString } from '../services/storage-utils.js';

(() => {
    'use strict';

    type UIModePreference = 'auto' | 'desktop' | 'mobile';
    type EffectiveUIMode = 'desktop' | 'mobile';

    const win = window as unknown as Record<string, unknown>;
    const APP_CONSTANTS = (win.APP_CONSTANTS as Record<string, unknown>) || {};

    const UI_MODE_KEY = (APP_CONSTANTS.UI_MODE_PREFERENCE_KEY as string) || 'uiModePreference';
    const MOBILE_WIDTH_THRESHOLD = 900;
    const MOBILE_HEIGHT_THRESHOLD = 760;

    const validPreferences: UIModePreference[] = ['auto', 'desktop', 'mobile'];

    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    const anyCoarsePointerQuery = window.matchMedia('(any-pointer: coarse)');

    let preference: UIModePreference = (() => {
        const fromStorage = getString(UI_MODE_KEY) as UIModePreference | null;
        return (
            fromStorage && validPreferences.includes(fromStorage) ? fromStorage : 'auto'
        ) as UIModePreference;
    })();

    function parseUIModeFromUrl(): UIModePreference | null {
        try {
            const search = new URLSearchParams(window.location.search);
            const raw = search.get('ui-mode') || search.get('uiMode') || search.get('mode') || null;
            if (!raw) return null;

            const normalized = raw.trim().toLowerCase();
            if (normalized === 'mobile' || normalized === 'ios') return 'mobile';
            if (normalized === 'desktop' || normalized === 'mac') return 'desktop';
            if (normalized === 'auto') return 'auto';
            return null;
        } catch {
            return null;
        }
    }

    const forcedPreferenceFromUrl = parseUIModeFromUrl();
    if (forcedPreferenceFromUrl) {
        preference = forcedPreferenceFromUrl;
    }

    let effectiveMode: EffectiveUIMode = 'desktop';

    function isCoarsePointerDevice(): boolean {
        return coarsePointerQuery.matches || anyCoarsePointerQuery.matches;
    }

    function detectAutoMode(): EffectiveUIMode {
        const isSmallViewport =
            window.innerWidth <= MOBILE_WIDTH_THRESHOLD ||
            window.innerHeight <= MOBILE_HEIGHT_THRESHOLD;

        // Require a mobile-like viewport and coarse pointer to avoid false positives on small desktop panes.
        return isSmallViewport && isCoarsePointerDevice() ? 'mobile' : 'desktop';
    }

    function resolveEffectiveMode(pref: UIModePreference): EffectiveUIMode {
        if (pref === 'mobile') return 'mobile';
        if (pref === 'desktop') return 'desktop';
        return detectAutoMode();
    }

    function applyEffectiveMode(mode: EffectiveUIMode): void {
        document.documentElement.setAttribute('data-ui-mode', mode);
        document.body?.setAttribute('data-ui-mode', mode);
    }

    function emitModeChange(reason: 'preference' | 'viewport'): void {
        window.dispatchEvent(
            new CustomEvent('uiModePreferenceChange', {
                detail: {
                    preference,
                    effectiveMode,
                    reason,
                },
            })
        );

        window.dispatchEvent(
            new CustomEvent('uiModeEffectiveChange', {
                detail: {
                    mode: effectiveMode,
                    preference,
                    reason,
                },
            })
        );

        const MenuSystem = (
            window as Window & {
                MenuSystem?: { renderApplicationMenu?: (modalId?: string | null) => void };
            }
        ).MenuSystem;
        const currentModalId = MenuSystem?.getCurrentMenuModalId?.();
        MenuSystem?.renderApplicationMenu?.(currentModalId ?? null);
    }

    function refreshEffectiveMode(reason: 'preference' | 'viewport'): void {
        const nextMode = resolveEffectiveMode(preference);
        const changed = nextMode !== effectiveMode;

        effectiveMode = nextMode;
        applyEffectiveMode(effectiveMode);

        if (changed || reason === 'preference') {
            emitModeChange(reason);
        }
    }

    function setUIModePreference(nextPreference: UIModePreference): void {
        if (!validPreferences.includes(nextPreference)) return;

        preference = nextPreference;
        setString(UI_MODE_KEY, nextPreference);
        refreshEffectiveMode('preference');
    }

    function getUIModePreference(): UIModePreference {
        return preference;
    }

    function getEffectiveUIMode(): EffectiveUIMode {
        return effectiveMode;
    }

    function isMobileMode(): boolean {
        return effectiveMode === 'mobile';
    }

    const handleEnvironmentChange = () => {
        if (preference !== 'auto') return;
        refreshEffectiveMode('viewport');
    };

    window.addEventListener('resize', handleEnvironmentChange);

    type MQLLegacy = MediaQueryList & {
        addListener?: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void;
    };

    const bindMediaListener = (query: MediaQueryList) => {
        const mql = query as MQLLegacy;
        if (typeof mql.addEventListener === 'function') {
            mql.addEventListener('change', handleEnvironmentChange as EventListener);
        } else if (typeof mql.addListener === 'function') {
            mql.addListener(
                handleEnvironmentChange as (this: MediaQueryList, ev: MediaQueryListEvent) => void
            );
        }
    };

    bindMediaListener(coarsePointerQuery);
    bindMediaListener(anyCoarsePointerQuery);

    refreshEffectiveMode('preference');

    const globalWindow = window as unknown as Record<string, unknown>;
    globalWindow.UiModeSystem = {
        setUIModePreference,
        getUIModePreference,
        getEffectiveUIMode,
        isMobileMode,
    };

    globalWindow.setUIModePreference = setUIModePreference;
    globalWindow.getUIModePreference = getUIModePreference;
})();
