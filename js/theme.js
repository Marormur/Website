'use strict';
/**
 * src/ts/theme.ts
 * Theme management (dark/light/system) with safe typing and legacy compatibility.
 */
(() => {
    'use strict';
    // Constants from global config if available
    const win = window;
    const APP_CONSTANTS = win.APP_CONSTANTS || {};
    const THEME_KEY = APP_CONSTANTS.THEME_PREFERENCE_KEY || 'themePreference';
    const validThemePreferences = ['system', 'light', 'dark'];
    const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    let themePreference = (() => {
        const fromStorage = localStorage.getItem(THEME_KEY);
        return fromStorage && validThemePreferences.includes(fromStorage) ? fromStorage : 'system';
    })();
    function updateThemeFromPreference() {
        const useDark =
            themePreference === 'dark' || (themePreference === 'system' && systemDarkQuery.matches);
        document.documentElement.classList.toggle('dark', useDark);
    }
    function setThemePreference(pref) {
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
    function getThemePreference() {
        return themePreference;
    }
    // Initialize
    updateThemeFromPreference();
    const handleSystemThemeChange = () => {
        updateThemeFromPreference();
    };
    const mql = systemDarkQuery;
    if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', handleSystemThemeChange);
    } else if (typeof mql.addListener === 'function') {
        mql.addListener(handleSystemThemeChange);
    }
    // Global export
    const w = window;
    w['ThemeSystem'] = {
        setThemePreference,
        getThemePreference,
        updateThemeFromPreference,
    };
    // Legacy wrappers
    w['setThemePreference'] = setThemePreference;
    w['getThemePreference'] = getThemePreference;
})();
//# sourceMappingURL=theme.js.map
