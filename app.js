console.log('App.js loaded v3');
// =============================================================================
// Hinweis: Zentrale Systeme wurden in Module ausgelagert.
// Dieses File dient nur noch als schlanker Legacy-Wrapper für globale Helfer.
// =============================================================================

// Ensure appI18n exists on window for translations
if (!window.appI18n) {
    window.appI18n = {
        translate: (key) => key,
        applyTranslations: () => {},
        setLanguagePreference: () => {},
        getLanguagePreference: () => 'system',
        getActiveLanguage: () => 'en',
    };
}

// Lightweight translate helper exposed globally
if (typeof window.translate !== 'function') {
    window.translate = function (key, fallback) {
        const i18n = window.appI18n;
        if (!i18n || typeof i18n.translate !== 'function') {
            return fallback || key;
        }
        const result = i18n.translate(key);
        if (result === key && fallback) return fallback;
        return result;
    };
}

// Legacy Finder loader (deprecated): delegate to modern FinderSystem
function loadGithubRepos() {
    try {
        if (
            window.FinderSystem &&
            typeof window.FinderSystem.navigateTo === 'function'
        ) {
            const st =
                window.FinderSystem.getState &&
                window.FinderSystem.getState();
            if (st && Array.isArray(st.githubRepos)) st.githubRepos = [];
            window.FinderSystem.navigateTo([], 'github');
        }
    } catch (e) {
        console.warn('loadGithubRepos delegation failed', e);
    }
}

// Note: updateDockIndicators and other helpers are provided by their modules
// (dock.js, dialog-utils.js, snap-utils.js, program-menu-sync.js, etc.)
