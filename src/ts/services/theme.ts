/**
 * src/ts/theme.ts
 * Theme management (dark/light/system) with safe typing and legacy compatibility.
 */

import { getString, setString } from '../services/storage-utils.js';

(() => {
    'use strict';

    type ThemePref = 'system' | 'light' | 'dark';

    // Constants from global config if available
    const win = window as unknown as Record<string, unknown>;
    const APP_CONSTANTS = (win.APP_CONSTANTS as Record<string, unknown>) || {};

    const THEME_KEY = (APP_CONSTANTS.THEME_PREFERENCE_KEY as string) || 'themePreference';
    const DISPLAY_SCALE_KEY =
        (APP_CONSTANTS.DISPLAY_SCALE_PREFERENCE_KEY as string) || 'displayScalePreference';
    const DEFAULT_DISPLAY_SCALE = 1;
    const MIN_DISPLAY_SCALE = 0.7;
    const MAX_DISPLAY_SCALE = 1.3;

    const validThemePreferences: ThemePref[] = ['system', 'light', 'dark'];

    const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

    let themePreference: ThemePref = (() => {
        const fromStorage = getString(THEME_KEY) as ThemePref | null;
        return (
            fromStorage && validThemePreferences.includes(fromStorage) ? fromStorage : 'system'
        ) as ThemePref;
    })();

    function clampDisplayScale(scale: number): number {
        return Math.max(MIN_DISPLAY_SCALE, Math.min(MAX_DISPLAY_SCALE, scale));
    }

    function getRecommendedDisplayScale(): number {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        let recommendation = DEFAULT_DISPLAY_SCALE;

        // Width contributes the most because the app is desktop-layout heavy.
        if (viewportWidth < 1280) {
            recommendation -= Math.min(0.14, (1280 - viewportWidth) / 4200);
        } else if (viewportWidth > 1700) {
            recommendation += Math.min(0.12, (viewportWidth - 1700) / 2600);
        }

        // Height adjusts for cramped VS Code panes where vertical space is limited.
        if (viewportHeight < 760) {
            recommendation -= Math.min(0.06, (760 - viewportHeight) / 3000);
        } else if (viewportHeight > 1000) {
            recommendation += Math.min(0.08, (viewportHeight - 1000) / 1800);
        }

        // High-DPI displays in a small viewport usually feel visually larger.
        if (dpr >= 2) recommendation -= 0.02;
        if (dpr >= 2.5) recommendation -= 0.02;

        // Snap to slider granularity (5%-steps) for deterministic suggestions.
        const steppedRecommendation = Math.round(recommendation * 20) / 20;
        return clampDisplayScale(steppedRecommendation);
    }

    let displayScalePreference = (() => {
        const fromStorage = Number.parseFloat(getString(DISPLAY_SCALE_KEY) || '');
        if (!Number.isFinite(fromStorage)) {
            return getRecommendedDisplayScale();
        }
        return clampDisplayScale(fromStorage);
    })();

    function formatScale(scale: number): string {
        return scale.toFixed(2).replace(/\.00$/, '').replace(/0$/, '');
    }

    function applyDisplayScale(scale: number): void {
        const safeScale = clampDisplayScale(scale);
        document.documentElement.style.setProperty('--app-display-scale', formatScale(safeScale));
        // Chromium (inkl. VS Code Webview) skaliert via CSS zoom konsistent das komplette UI.
        document.documentElement.style.setProperty('zoom', formatScale(safeScale));
    }

    function setDisplayScalePreference(scale: number): void {
        if (!Number.isFinite(scale)) return;

        const safeScale = clampDisplayScale(scale);
        displayScalePreference = safeScale;
        setString(DISPLAY_SCALE_KEY, formatScale(safeScale));
        applyDisplayScale(safeScale);

        window.dispatchEvent(
            new CustomEvent('displayScalePreferenceChange', {
                detail: { scale: safeScale },
            })
        );
    }

    function getDisplayScalePreference(): number {
        return displayScalePreference;
    }

    function updateThemeFromPreference(): void {
        const useDark =
            themePreference === 'dark' || (themePreference === 'system' && systemDarkQuery.matches);
        document.documentElement.classList.toggle('dark', useDark);
    }

    function setThemePreference(pref: ThemePref): void {
        if (!validThemePreferences.includes(pref)) return;

        const perf = (
            window as {
                PerfMonitor?: {
                    mark: (n: string) => void;
                    measure: (n: string, s?: string, e?: string) => void;
                };
            }
        ).PerfMonitor;
        perf?.mark('theme:change:start');

        themePreference = pref;
        setString(THEME_KEY, pref);
        updateThemeFromPreference();

        // Notify other modules
        window.dispatchEvent(
            new CustomEvent('themePreferenceChange', {
                detail: { preference: pref },
            })
        );

        perf?.mark('theme:change:end');
        perf?.measure('theme:change-duration', 'theme:change:start', 'theme:change:end');
    }

    function getThemePreference(): ThemePref {
        return themePreference;
    }

    // Initialize
    updateThemeFromPreference();
    applyDisplayScale(displayScalePreference);

    const handleSystemThemeChange = () => {
        updateThemeFromPreference();
    };

    type MQLLegacy = MediaQueryList & {
        addListener?: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void;
        removeListener?: (
            listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void
        ) => void;
    };
    const mql = systemDarkQuery as MQLLegacy;
    if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', handleSystemThemeChange as EventListener);
    } else if (typeof mql.addListener === 'function') {
        mql.addListener(
            handleSystemThemeChange as (this: MediaQueryList, ev: MediaQueryListEvent) => void
        );
    }

    // Global export
    const w = window as unknown as Record<string, unknown>;
    w['ThemeSystem'] = {
        setThemePreference,
        getThemePreference,
        updateThemeFromPreference,
        setDisplayScalePreference,
        getDisplayScalePreference,
        getRecommendedDisplayScale,
        applyDisplayScale,
    };

    // Legacy wrappers
    w['setThemePreference'] = setThemePreference;
    w['getThemePreference'] = getThemePreference;
    w['setDisplayScalePreference'] = setDisplayScalePreference;
    w['getDisplayScalePreference'] = getDisplayScalePreference;
    w['getRecommendedDisplayScale'] = getRecommendedDisplayScale;
})();
