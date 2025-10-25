/**
 * src/ts/theme.ts
 * Theme management (dark/light/system) with safe typing and legacy compatibility.
 */

(() => {
  'use strict';

  type ThemePref = 'system' | 'light' | 'dark';

  // Constants from global config if available
  const win = window as unknown as Record<string, unknown>;
  const APP_CONSTANTS = (win.APP_CONSTANTS as Record<string, unknown>) || {};

  const THEME_KEY =
    (APP_CONSTANTS.THEME_PREFERENCE_KEY as string) || 'themePreference';

  const validThemePreferences: ThemePref[] = ['system', 'light', 'dark'];

  const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  let themePreference: ThemePref = (() => {
    const fromStorage = localStorage.getItem(THEME_KEY) as ThemePref | null;
    return (fromStorage && validThemePreferences.includes(fromStorage)
      ? fromStorage
      : 'system') as ThemePref;
  })();

  function updateThemeFromPreference(): void {
    const useDark =
      themePreference === 'dark' ||
      (themePreference === 'system' && systemDarkQuery.matches);
    document.documentElement.classList.toggle('dark', useDark);
  }

  function setThemePreference(pref: ThemePref): void {
    if (!validThemePreferences.includes(pref)) return;
    themePreference = pref;
    localStorage.setItem(THEME_KEY, pref);
    updateThemeFromPreference();

    // Notify other modules
    window.dispatchEvent(
      new CustomEvent('themePreferenceChange', {
        detail: { preference: pref },
      })
    );
  }

  function getThemePreference(): ThemePref {
    return themePreference;
  }

  // Initialize
  updateThemeFromPreference();

  const handleSystemThemeChange = () => {
    updateThemeFromPreference();
  };

  type MQLLegacy = MediaQueryList & {
    addListener?: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void;
    removeListener?: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void;
  };
  const mql = systemDarkQuery as MQLLegacy;
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', handleSystemThemeChange as EventListener);
  } else if (typeof mql.addListener === 'function') {
    mql.addListener(handleSystemThemeChange as (this: MediaQueryList, ev: MediaQueryListEvent) => void);
  }

  // Global export
  const w = window as unknown as Record<string, unknown>;
  w['ThemeSystem'] = {
    setThemePreference,
    getThemePreference,
    updateThemeFromPreference,
  };

  // Legacy wrappers
  w['setThemePreference'] = setThemePreference;
  w['getThemePreference'] = getThemePreference;
})();
