/**
 * theme.js
 * Theme-Management (Dark/Light Mode) für den macOS Desktop-Klon
 */

// ============================================================================
// Theme-System
// ============================================================================

const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const validThemePreferences = window.APP_CONSTANTS?.VALID_THEME_PREFERENCES || [
    'system',
    'light',
    'dark',
];

let themePreference = localStorage.getItem(
    window.APP_CONSTANTS?.THEME_PREFERENCE_KEY || 'themePreference',
);
if (!validThemePreferences.includes(themePreference)) {
    themePreference = 'system';
}

/**
 * Aktualisiert das Theme basierend auf der aktuellen Präferenz
 */
function updateThemeFromPreference() {
    const useDark =
        themePreference === 'dark' ||
        (themePreference === 'system' && systemDarkQuery.matches);
    document.documentElement.classList.toggle('dark', useDark);
}

/**
 * Setzt die Theme-Präferenz
 * @param {string} pref - 'system' | 'light' | 'dark'
 */
function setThemePreference(pref) {
    if (!validThemePreferences.includes(pref)) return;

    themePreference = pref;
    localStorage.setItem(
        window.APP_CONSTANTS?.THEME_PREFERENCE_KEY || 'themePreference',
        pref,
    );
    updateThemeFromPreference();

    // Dispatch Event für andere Module
    window.dispatchEvent(
        new CustomEvent('themePreferenceChange', {
            detail: { preference: pref },
        }),
    );
}

/**
 * Gibt die aktuelle Theme-Präferenz zurück
 * @returns {string} 'system' | 'light' | 'dark'
 */
function getThemePreference() {
    return themePreference;
}

// Initiales Theme setzen
updateThemeFromPreference();

// System-Theme-Änderungen beobachten
const handleSystemThemeChange = () => {
    updateThemeFromPreference();
};

if (typeof systemDarkQuery.addEventListener === 'function') {
    systemDarkQuery.addEventListener('change', handleSystemThemeChange);
} else if (typeof systemDarkQuery.addListener === 'function') {
    systemDarkQuery.addListener(handleSystemThemeChange);
}

// ============================================================================
// Global Export
// ============================================================================
if (typeof window !== 'undefined') {
    window.ThemeSystem = {
        setThemePreference,
        getThemePreference,
        updateThemeFromPreference,
    };

    // Abwärtskompatibilität
    window.setThemePreference = setThemePreference;
    window.getThemePreference = getThemePreference;
}
