const THEME_PREFERENCE_KEY = 'themePreference';
const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const validThemePreferences = ['system', 'light', 'dark'];
let themePreference = localStorage.getItem(THEME_PREFERENCE_KEY);
if (!validThemePreferences.includes(themePreference)) {
    themePreference = 'system';
}
function updateThemeFromPreference() {
    const useDark = themePreference === 'dark' || (themePreference === 'system' && systemDarkQuery.matches);
    document.documentElement.classList.toggle('dark', useDark);
}
function setThemePreference(pref) {
    if (!validThemePreferences.includes(pref)) return;
    themePreference = pref;
    localStorage.setItem(THEME_PREFERENCE_KEY, pref);
    updateThemeFromPreference();
    window.dispatchEvent(new CustomEvent('themePreferenceChange', { detail: { preference: pref } }));
}
function getThemePreference() {
    return themePreference;
}
window.setThemePreference = setThemePreference;
window.getThemePreference = getThemePreference;
updateThemeFromPreference();
const handleSystemThemeChange = () => {
    updateThemeFromPreference();
};
if (typeof systemDarkQuery.addEventListener === 'function') {
    systemDarkQuery.addEventListener('change', handleSystemThemeChange);
} else if (typeof systemDarkQuery.addListener === 'function') {
    systemDarkQuery.addListener(handleSystemThemeChange);
}
// Liste aller Modal-IDs, die von der Desktop-Shell verwaltet werden
const modalIds = ["projects-modal", "about-modal", "settings-modal", "text-modal", "image-modal", "program-info-modal"];
const transientModalIds = new Set(["program-info-modal"]);

// Für zukünftige z‑Index‑Verwaltung reserviert
let topZIndex = 1000;
const FINDER_STATE_STORAGE_KEY = 'finderState';

function readFinderState() {
    try {
        const raw = localStorage.getItem(FINDER_STATE_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        const repo = typeof parsed.repo === 'string' ? parsed.repo.trim() : '';
        if (!repo) return null;
        return {
            repo,
            path: typeof parsed.path === 'string' ? parsed.path : ''
        };
    } catch (err) {
        console.warn('Finder state konnte nicht gelesen werden:', err);
        return null;
    }
}

function writeFinderState(state) {
    if (!state || typeof state.repo !== 'string' || !state.repo) {
        clearFinderState();
        return;
    }
    const payload = {
        repo: state.repo,
        path: typeof state.path === 'string' ? state.path : ''
    };
    try {
        localStorage.setItem(FINDER_STATE_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
        console.warn('Finder state konnte nicht gespeichert werden:', err);
    }
}

function clearFinderState() {
    try {
        localStorage.removeItem(FINDER_STATE_STORAGE_KEY);
    } catch (err) {
        console.warn('Finder state konnte nicht gelöscht werden:', err);
    }
}

const appI18n = window.appI18n || {
    translate: (key) => key,
    applyTranslations: () => { },
    setLanguagePreference: () => { },
    getLanguagePreference: () => 'system',
    getActiveLanguage: () => 'en'
};

const programInfoDefinitions = {
    default: {
        programKey: 'programs.default',
        fallbackInfoModalId: 'program-info-modal',
        icon: './img/sucher.png'
    },
    "projects-modal": {
        programKey: 'programs.projects',
        icon: './img/sucher.png'
    },
    "settings-modal": {
        programKey: 'programs.settings',
        icon: './img/settings.png'
    },
    "text-modal": {
        programKey: 'programs.text',
        icon: './img/notepad.png'
    },
    "image-modal": {
        programKey: 'programs.image',
        icon: './img/imageviewer.png'
    },
    "about-modal": {
        programKey: 'programs.about',
        icon: './img/profil.jpg'
    }
};

function resolveProgramInfo(modalId) {
    const definition = Object.assign({}, programInfoDefinitions.default, modalId ? programInfoDefinitions[modalId] || {} : {});
    const programKey = definition.programKey || programInfoDefinitions.default.programKey || 'programs.default';
    const aboutFields = ['name', 'tagline', 'version', 'copyright'];
    const info = {
        modalId: modalId || null,
        programLabel: appI18n.translate(`${programKey}.label`),
        infoLabel: appI18n.translate(`${programKey}.infoLabel`),
        fallbackInfoModalId: definition.fallbackInfoModalId || 'program-info-modal',
        icon: definition.icon || programInfoDefinitions.default.icon,
        about: {}
    };
    aboutFields.forEach((field) => {
        info.about[field] = appI18n.translate(`${programKey}.about.${field}`);
    });
    return info;
}

let currentProgramInfo = resolveProgramInfo(null);
let currentMenuModalId = null;
let menuActionIdCounter = 0;
const menuActionHandlers = new Map();

const menuDefinitions = {
    default: buildDefaultMenuDefinition,
    "projects-modal": buildFinderMenuDefinition,
    "settings-modal": buildSettingsMenuDefinition,
    "text-modal": buildTextEditorMenuDefinition,
    "image-modal": buildImageViewerMenuDefinition,
    "about-modal": buildAboutMenuDefinition,
    "program-info-modal": buildProgramInfoMenuDefinition
};

const systemStatus = {
    wifi: true,
    bluetooth: true,
    focus: false,
    darkMode: document.documentElement.classList.contains('dark'),
    brightness: 80,
    volume: 65,
    audioDevice: 'speakers',
    network: 'HomeLAN',
    battery: 100,
    connectedBluetoothDevice: 'AirPods'
};

const SYSTEM_ICONS = {
    wifiOn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 18.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m0-3.75a4.75 4.75 0 0 1 3.35 1.37L12 19.22l-3.35-3.35A4.75 4.75 0 0 1 12 14.5m0-4.5a8.74 8.74 0 0 1 6.21 2.57L21.06 15l-1.77 1.77-1.63-1.63A6.24 6.24 0 0 0 12 12.5a6.24 6.24 0 0 0-4.66 2.64l-1.63 1.63L3.94 15l2.85-2.85A8.74 8.74 0 0 1 12 10z" fill="currentColor"/></svg>',
    wifiOff: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 18.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m0-3.75a4.75 4.75 0 0 1 3.35 1.37l-1.77 1.77-4.5-4.5A4.74 4.74 0 0 1 12 14.5m0-4.5a8.74 8.74 0 0 1 6.21 2.57l-1.77 1.77-10-10A12.78 12.78 0 0 1 12 6M4.27 3 3 4.27l4.2 4.2A8.64 8.64 0 0 0 3 12l1.77 1.77A10.72 10.72 0 0 1 12 10c1.2 0 2.37.2 3.46.58l1.7 1.7a8.62 8.62 0 0 0-1.39-.88l1.42 1.42a10.44 10.44 0 0 1 1.91 1.38l1.88-1.88z" fill="currentColor"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    bluetoothOn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a1 1 0 0 1 .64.23l5 4.2a1 1 0 0 1-.05 1.58L14.28 12l3.31 3.99a1 1 0 0 1 .05 1.58l-5 4.2A1 1 0 0 1 11 21v-6.34L8.7 16.9l-1.4-1.4 3.7-3.5-3.7-3.5 1.4-1.4L11 9.34V3a1 1 0 0 1 1-1Zm1 4.85v3.28l1.82-1.64Zm1.82 9.94L13 13.38v3.77Z" fill="currentColor"/></svg>',
    bluetoothOff: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a1 1 0 0 1 .64.23l3.68 3.09-1.38 1.23-2.94-2.46V9.3L10.39 8l-1.1 1.1 3.71 3.52-1.08.98 1.08 1 1.11-1.01 1.44 1.36-2.37 2v-3.36l-2.26-2.15-2.78 2.64 1.4 1.4L11 14.66V21a1 1 0 0 1-1.64.77l-3.68-3.09 1.38-1.23 2.94 2.46v-3.5l-7-6.63L4.27 8 20 23.73 21.27 22 13 13.34l5-4.53a1 1 0 0 0-.05-1.58L12.64 2.23A1 1 0 0 0 12 2Z" fill="currentColor"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79Z" fill="currentColor"/></svg>',
    appearanceLight: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4a8 8 0 0 1 0 16" fill="currentColor" opacity="0.4"/></svg>',
    appearanceDark: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 20a8 8 0 0 0 0-16" fill="currentColor" opacity="0.75"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4a1 1 0 0 1-1-1V2h2v1a1 1 0 0 1-1 1Zm0 18a1 1 0 0 1-1-1v-1h2v1a1 1 0 0 1-1 1Zm8-9a1 1 0 0 1-1-1h1a1 1 0 0 1 1 1Zm-16 0a1 1 0 0 1-1-1h1a1 1 0 0 1-1 1Zm12.66 6.66-1.41-1.41 1.06-1.06 1.41 1.41ZM6.69 6.7 5.28 5.28 6.34 4.22 7.75 5.63ZM18.37 4.22l1.06 1.06-1.41 1.41-1.06-1.06ZM5.63 18.37l-1.41 1.41-1.06-1.06 1.41-1.41ZM12 7a5 5 0 1 1-5 5 5 5 0 0 1 5-5Z" fill="currentColor"/></svg>',
    volumeMute: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 9v6h4l5 5V4l-5 5H5z" fill="currentColor"/><path d="m16 9 5 5m0-5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    volumeLow: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 9v6h4l5 5V4l-5 5H5z" fill="currentColor"/><path d="M16.5 12a3 3 0 0 0-1.5-2.6v5.2a3 3 0 0 0 1.5-2.6Z" fill="currentColor"/></svg>',
    volumeMedium: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 9v6h4l5 5V4l-5 5H5z" fill="currentColor"/><path d="M16.5 12a3 3 0 0 0-1.5-2.6v5.2a3 3 0 0 0 1.5-2.6Z" fill="currentColor"/><path d="M19.5 12a5 5 0 0 0-2.5-4.33v8.66A5 5 0 0 0 19.5 12Z" fill="currentColor" opacity="0.7"/></svg>',
    volumeHigh: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 9v6h4l5 5V4l-5 5H5z" fill="currentColor"/><path d="M16.5 12a3 3 0 0 0-1.5-2.6v5.2a3 3 0 0 0 1.5-2.6Z" fill="currentColor"/><path d="M19.5 12a5 5 0 0 0-2.5-4.33v8.66A5 5 0 0 0 19.5 12Z" fill="currentColor" opacity="0.7"/><path d="M22 12a7 7 0 0 0-3.5-6.06v12.12A7 7 0 0 0 22 12Z" fill="currentColor" opacity="0.45"/></svg>',
    batteryFull: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17 7h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v1h-1v-1H8v1H7v-1H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1V6h1v1h8V6h1zM6 9v6h12V9z" fill="currentColor"/><rect x="7" y="10" width="10" height="4" rx="1" fill="currentColor"/></svg>'
};

const MENU_ICONS = {
    finder: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 4h8v6H4zm0 10h8v6H4zm10-10h6v6h-6zm0 10h6v6h-6z" fill="currentColor"/></svg>',
    reload: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-9.9 1H5a7 7 0 0 0 13.94 1A7 7 0 0 0 12 6z" fill="currentColor"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4L12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5z" fill="currentColor"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6m0-7 2.25 2.5 3.22-.84.73 3.27 3.05 1.36-1.36 3.05 1.36 3.05-3.05 1.36-.73 3.27-3.22-.84L12 22l-2.25-2.5-3.22.84-.73-3.27-3.05-1.36L3.11 12 1.75 8.95l3.05-1.36.73-3.27 3.22.84Z" fill="currentColor"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 7h2V9h-2zm0 4h2v6h-2z" fill="currentColor"/><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Z" fill="currentColor"/></svg>',
    newFile: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm2 16H8v-2h8Zm0-4H8v-2h8Zm-3-6V3.5L18.5 8Z" fill="currentColor"/></svg>',
    open: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 19H8a2 2 0 0 1-2-2V5h7l2 2h6Z" fill="currentColor"/><path d="M5 9h16v9a2 2 0 0 1-2 2H9" fill="currentColor" opacity="0.4"/></svg>',
    save: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7Zm0 16H5v-6h12Zm0-8H5V5h10v4h2Z" fill="currentColor"/></svg>',
    undo: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5 9 8l3 3V9a5 5 0 0 1 5 5 5 5 0 0 1-4.77 4.99V21A7 7 0 0 0 19 14a7 7 0 0 0-7-7Z" fill="currentColor"/><path d="M9 8v3l3-3Z" fill="currentColor"/></svg>',
    redo: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 5 3 3-3 3V9a5 5 0 0 0-5 5 5 5 0 0 0 4.77 4.99V21A7 7 0 0 1 5 14a7 7 0 0 1 7-7Z" fill="currentColor"/><path d="M15 8v3l-3-3Z" fill="currentColor"/></svg>',
    cut: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 7.5 11.17 9 2 18.17 3.83 20 13 10.83 14.5 12.33l-5 5A3.5 3.5 0 1 0 12 19a3.49 3.49 0 0 0-.17-1.06l1.61-1.61L19 21h3l-8-8 4.35-4.35A3.49 3.49 0 0 0 20.5 9a3.5 3.5 0 1 0-3.5-3.5 3.49 3.49 0 0 0 .33 1.5L9 15.83 7.5 14.33l1.61-1.61A3.49 3.49 0 0 0 9 12a3.5 3.5 0 1 0-.33-6.5Z" fill="currentColor"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12Z" fill="currentColor"/><path d="M20 5H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h12Z" fill="currentColor"/></svg>',
    paste: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 4h-3.18A3 3 0 0 0 13 2h-2a3 3 0 0 0-2.82 2H5a2 2 0 0 0-2 2v1h18V6a2 2 0 0 0-2-2Zm-7-1h2a1 1 0 0 1 1 1h-4a1 1 0 0 1 1-1Z" fill="currentColor"/><path d="M4 9v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" fill="currentColor"/></svg>',
    selectAll: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 3H5v2h2V3Zm4 0H9v2h2V3Zm4 0h-2v2h2V3Zm4 0h-2v2h2V3ZM7 7H5v2h2V7Zm12 0h-2v2h2V7ZM7 11H5v2h2v-2Zm12 0h-2v2h2v-2ZM7 15H5v2h2v-2Zm12 0h-2v2h2v-2ZM7 19H5v2h2v-2Zm4 0H9v2h2v-2Zm4 0h-2v2h2v-2Zm4 0h-2v2h2v-2Z" fill="currentColor"/></svg>',
    wrap: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16v2H4Zm0 4h9v2H4Zm0 8h9v2H4Zm16-5h-5a3 3 0 0 0 0 6h3a1 1 0 0 0 0-2h-3a1 1 0 0 1 0-2h5Z" fill="currentColor"/></svg>',
    imageOpen: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5v14h14V5Zm12 12H7V7h10Z" fill="currentColor"/><path d="M9 13s1.5-2 3-2 3 2 3 2l2-3v6H7V9l2 4Z" fill="currentColor"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v10l3.5-3.5 1.5 1.5-6 6-6-6 1.5-1.5L11 13V3Z" fill="currentColor"/><path d="M5 18h14v2H5Z" fill="currentColor"/></svg>',
    window: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6H4Zm0 8v6a2 2 0 0 0 2 2h6v-8Z" fill="currentColor"/></svg>',
    help: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 18h2v-2h-2Zm1-16a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Zm0-14a4 4 0 0 1 4 4c0 3-4 3.25-4 5h-2c0-3 4-3.25 4-5a2 2 0 0 0-4 0H8a4 4 0 0 1 4-4Z" fill="currentColor"/></svg>',
    projects: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 4h8v6H4zm0 10h8v6H4zm10-10h6v6h-6zm0 10h6v6h-6z" fill="currentColor"/></svg>',
    appearance: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4a8 8 0 0 1 0 16" fill="currentColor" opacity="0.4"/></svg>',
    windowMinimize: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="2" rx="1" fill="currentColor"/></svg>',
    windowZoom: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5h6v2H7v4H5Zm8-2h6a2 2 0 0 1 2 2v6h-2V7h-4Zm8 16h-6v-2h4v-4h2Zm-8 2H5a2 2 0 0 1-2-2v-6h2v4h4Z" fill="currentColor"/></svg>',
    windowFront: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h12v12H4Z" fill="currentColor" opacity="0.5"/><path d="M8 3h12v12H8Z" fill="currentColor"/></svg>'
};

const ICON_FALLBACK_EMOJI = {
    wifi: '📶',
    bluetooth: '🔵',
    focus: '🌙',
    'dark-mode': '🌓',
    sun: '☀️',
    moon: '🌙',
    appearance: '🎨',
    volume: '🔊',
    battery: '🔋',
    finder: '🗂️',
    reload: '🔄',
    close: '✖️',
    settings: '⚙️',
    info: 'ℹ️',
    newFile: '🆕',
    open: '📂',
    save: '💾',
    undo: '↩️',
    redo: '↪️',
    cut: '✂️',
    copy: '📄',
    paste: '📋',
    selectAll: '✅',
    wrap: '🧵',
    imageOpen: '🖼️',
    download: '⬇️',
    window: '🪟',
    windowMinimize: '➖',
    windowZoom: '🟢',
    windowFront: '⬆️',
    help: '❓',
    projects: '🧰'
};

const svgParser = typeof DOMParser === 'function' ? new DOMParser() : null;

function ensureSvgNamespace(svgMarkup) {
    if (typeof svgMarkup !== 'string' || !svgMarkup.length) {
        return '';
    }
    if (svgMarkup.includes('xmlns')) {
        return svgMarkup;
    }
    return svgMarkup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
}

function getMenuIconSvg(iconKey) {
    if (!iconKey) return '';
    const svg = MENU_ICONS[iconKey] || '';
    return ensureSvgNamespace(svg);
}

function renderIconIntoElement(target, svgMarkup, fallbackKey) {
    if (!target) return;
    while (target.firstChild) {
        target.removeChild(target.firstChild);
    }
    if (svgMarkup && svgParser) {
        try {
            const doc = svgParser.parseFromString(svgMarkup, 'image/svg+xml');
            const svgEl = doc && doc.documentElement;
            if (svgEl && svgEl.tagName && svgEl.tagName.toLowerCase() === 'svg') {
                const imported = target.ownerDocument.importNode(svgEl, true);
                if (!imported.getAttribute('width')) {
                    imported.setAttribute('width', target.dataset.iconSize || '16');
                }
                if (!imported.getAttribute('height')) {
                    imported.setAttribute('height', target.dataset.iconSize || '16');
                }
                imported.setAttribute('focusable', 'false');
                imported.setAttribute('aria-hidden', 'true');
                target.appendChild(imported);
                return;
            }
        } catch (err) {
            console.warn('SVG parsing failed; falling back to emoji.', err);
        }
    }
    const fallback = ICON_FALLBACK_EMOJI[fallbackKey] || '';
    if (fallback) {
        target.textContent = fallback;
    }
}

function applySystemIcon(iconToken, iconKey) {
    const svg = SYSTEM_ICONS[iconKey];
    const markup = svg ? ensureSvgNamespace(svg) : '';
    document.querySelectorAll(`[data-icon="${iconToken}"]`).forEach(el => {
        renderIconIntoElement(el, markup, iconToken);
    });
}

function updateSystemStateText(stateKey, text) {
    document.querySelectorAll(`[data-state="${stateKey}"]`).forEach(el => {
        el.textContent = text;
    });
}

function updateSystemToggleState(toggleKey, active) {
    const toggle = document.querySelector(`[data-system-toggle="${toggleKey}"]`);
    if (toggle) {
        toggle.classList.toggle('is-active', !!active);
        toggle.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
}

function updateSystemMenuCheckbox(actionKey, checked) {
    const checkbox = document.querySelector(`[data-system-action="${actionKey}"]`);
    if (checkbox) {
        checkbox.setAttribute('aria-pressed', checked ? 'true' : 'false');
        checkbox.classList.toggle('is-active', !!checked);
    }
}

function updateSystemSliderValue(type, value) {
    document.querySelectorAll(`[data-system-slider="${type}"]`).forEach(slider => {
        if (Number(slider.value) !== value) {
            slider.value = value;
        }
    });
    document.querySelectorAll(`[data-state="${type}"]`).forEach(label => {
        label.textContent = `${value}%`;
    });
}

function updateWifiUI() {
    const iconKey = systemStatus.wifi ? 'wifiOn' : 'wifiOff';
    applySystemIcon('wifi', iconKey);
    updateSystemStateText('wifi', systemStatus.wifi ? 'Ein' : 'Aus');
    updateSystemToggleState('wifi', systemStatus.wifi);
    updateSystemMenuCheckbox('toggle-wifi', systemStatus.wifi);
    document.querySelectorAll('#wifi-menu [data-network]').forEach(btn => {
        const disabled = !systemStatus.wifi;
        if (disabled) {
            btn.setAttribute('aria-disabled', 'true');
        } else {
            btn.removeAttribute('aria-disabled');
        }
    });
    setConnectedNetwork(systemStatus.network, { silent: true });
}

function updateBluetoothUI() {
    const iconKey = systemStatus.bluetooth ? 'bluetoothOn' : 'bluetoothOff';
    applySystemIcon('bluetooth', iconKey);
    updateSystemStateText('bluetooth', systemStatus.bluetooth ? 'Ein' : 'Aus');
    updateSystemToggleState('bluetooth', systemStatus.bluetooth);
    updateSystemMenuCheckbox('toggle-bluetooth', systemStatus.bluetooth);
    const devices = document.querySelectorAll('#bluetooth-menu [data-device]');
    devices.forEach(btn => {
        const indicator = btn.querySelector('.system-network-indicator');
        if (indicator && !indicator.dataset.default) {
            indicator.dataset.default = indicator.textContent || '';
        }
        const disabled = !systemStatus.bluetooth;
        if (disabled) {
            btn.setAttribute('aria-disabled', 'true');
        } else {
            btn.removeAttribute('aria-disabled');
        }
    });
    setBluetoothDevice(systemStatus.connectedBluetoothDevice, { silent: true, syncAudio: false });
}

function updateFocusUI() {
    updateSystemToggleState('focus', systemStatus.focus);
    updateSystemStateText('focus', systemStatus.focus ? 'Aktiv' : 'Aus');
}

function updateDarkModeUI() {
    const isDark = systemStatus.darkMode;
    updateSystemToggleState('dark-mode', isDark);
    updateSystemStateText('dark-mode', isDark ? 'Aktiv' : 'Aus');
    applySystemIcon('appearance', isDark ? 'appearanceDark' : 'appearanceLight');
}

function updateVolumeUI() {
    const value = Math.max(0, Math.min(100, Number(systemStatus.volume) || 0));
    systemStatus.volume = value;
    let iconKey = 'volumeMute';
    if (value === 0) {
        iconKey = 'volumeMute';
    } else if (value <= 33) {
        iconKey = 'volumeLow';
    } else if (value <= 66) {
        iconKey = 'volumeMedium';
    } else {
        iconKey = 'volumeHigh';
    }
    applySystemIcon('volume', iconKey);
    updateSystemSliderValue('volume', value);
}

function updateBrightnessUI() {
    const value = Math.max(0, Math.min(100, Number(systemStatus.brightness) || 0));
    systemStatus.brightness = value;
    updateSystemSliderValue('brightness', value);
}

function updateBatteryUI() {
    applySystemIcon('battery', 'batteryFull');
    updateSystemStateText('battery', `${systemStatus.battery}%`);
}

function updateAudioDeviceUI() {
    const active = systemStatus.audioDevice;
    document.querySelectorAll('[data-audio-device]').forEach(btn => {
        const isActive = btn.dataset.audioDevice === active;
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        btn.classList.toggle('is-active', isActive);
    });
}

function setConnectedNetwork(network, options = {}) {
    if (network) {
        systemStatus.network = network;
    }
    const activeNetwork = systemStatus.network;
    document.querySelectorAll('#wifi-menu [data-network]').forEach(btn => {
        const indicator = btn.querySelector('.system-network-indicator');
        if (indicator && !indicator.dataset.default) {
            indicator.dataset.default = indicator.textContent || '';
        }
        const isActive = !btn.hasAttribute('aria-disabled') && btn.dataset.network === activeNetwork && systemStatus.wifi;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        if (indicator) {
            if (!systemStatus.wifi) {
                indicator.textContent = 'Aus';
            } else if (isActive) {
                indicator.textContent = 'Verbunden';
            } else {
                indicator.textContent = indicator.dataset.default || '';
            }
        }
    });
    if (!options.silent) {
        hideMenuDropdowns();
    }
}

function setBluetoothDevice(deviceName, options = {}) {
    const syncAudio = options.syncAudio !== false;
    if (deviceName) {
        systemStatus.connectedBluetoothDevice = deviceName;
        if (syncAudio && deviceName === 'AirPods') {
            systemStatus.audioDevice = 'airpods';
        }
    }
    const activeDevice = systemStatus.connectedBluetoothDevice;
    document.querySelectorAll('#bluetooth-menu [data-device]').forEach(btn => {
        const indicator = btn.querySelector('.system-network-indicator');
        if (indicator && !indicator.dataset.default) {
            indicator.dataset.default = indicator.textContent || '';
        }
        const isActive = systemStatus.bluetooth && btn.dataset.device === activeDevice;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        if (indicator) {
            if (!systemStatus.bluetooth) {
                indicator.textContent = 'Aus';
            } else if (isActive) {
                indicator.textContent = 'Verbunden';
            } else {
                indicator.textContent = indicator.dataset.default || '';
            }
        }
    });
    updateAudioDeviceUI();
    if (!options.silent) {
        hideMenuDropdowns();
    }
}

function setAudioDevice(deviceKey, options = {}) {
    if (!deviceKey) return;
    systemStatus.audioDevice = deviceKey;
    if (deviceKey === 'airpods') {
        systemStatus.connectedBluetoothDevice = 'AirPods';
    }
    updateAudioDeviceUI();
    updateBluetoothUI();
    if (!options.silent) {
        hideMenuDropdowns();
    }
}

function handleSystemToggle(toggleKey) {
    switch (toggleKey) {
        case 'wifi':
            systemStatus.wifi = !systemStatus.wifi;
            updateWifiUI();
            break;
        case 'bluetooth':
            systemStatus.bluetooth = !systemStatus.bluetooth;
            updateBluetoothUI();
            break;
        case 'focus':
            systemStatus.focus = !systemStatus.focus;
            updateFocusUI();
            break;
        case 'dark-mode': {
            const next = !document.documentElement.classList.contains('dark');
            systemStatus.darkMode = next;
            if (typeof setThemePreference === 'function') {
                setThemePreference(next ? 'dark' : 'light');
            } else {
                document.documentElement.classList.toggle('dark', next);
            }
            updateDarkModeUI();
            break;
        }
        default:
            break;
    }
}

function handleSystemAction(actionKey) {
    switch (actionKey) {
        case 'toggle-wifi':
            handleSystemToggle('wifi');
            break;
        case 'toggle-bluetooth':
            handleSystemToggle('bluetooth');
            break;
        case 'open-network':
        case 'open-bluetooth':
        case 'open-sound':
            if (window.dialogs && window.dialogs['settings-modal']) {
                window.dialogs['settings-modal'].open();
            } else if (typeof showTab === 'function') {
                showTab('settings');
            }
            hideMenuDropdowns();
            break;
        case 'open-spotlight':
        case 'open-siri':
            console.info(`Aktion "${actionKey}" ausgelöst.`);
            hideMenuDropdowns();
            break;
        default:
            break;
    }
}

function handleSystemSliderInput(type, value) {
    if (!Number.isFinite(value)) return;
    if (type === 'volume') {
        systemStatus.volume = value;
        updateVolumeUI();
    } else if (type === 'brightness') {
        systemStatus.brightness = value;
        updateBrightnessUI();
    }
}

function updateAllSystemStatusUI() {
    applySystemIcon('sun', 'sun');
    applySystemIcon('moon', 'moon');
    updateWifiUI();
    updateBluetoothUI();
    updateFocusUI();
    updateDarkModeUI();
    updateVolumeUI();
    updateBrightnessUI();
    updateBatteryUI();
    updateAudioDeviceUI();
}

function initSystemStatusControls() {
    document.querySelectorAll('.system-network-indicator').forEach(indicator => {
        if (!indicator.dataset.default) {
            indicator.dataset.default = indicator.textContent || '';
        }
    });

    document.querySelectorAll('[data-system-menu-trigger]').forEach(trigger => {
        bindDropdownTrigger(trigger, { hoverRequiresOpen: true });
    });

    document.querySelectorAll('[data-system-toggle]').forEach(toggle => {
        toggle.addEventListener('click', (event) => {
            event.stopPropagation();
            handleSystemToggle(toggle.dataset.systemToggle);
        });
    });

    document.querySelectorAll('[data-system-slider]').forEach(slider => {
        ['pointerdown', 'mousedown', 'touchstart'].forEach(evt => {
            slider.addEventListener(evt, e => e.stopPropagation());
        });
        slider.addEventListener('input', (event) => {
            event.stopPropagation();
            const value = Number(slider.value);
            handleSystemSliderInput(slider.dataset.systemSlider, value);
        });
    });

    document.querySelectorAll('[data-system-action]').forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            handleSystemAction(btn.dataset.systemAction);
        });
    });

    document.querySelectorAll('[data-audio-device]').forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (btn.getAttribute('aria-disabled') === 'true') return;
            setAudioDevice(btn.dataset.audioDevice);
        });
    });

    document.querySelectorAll('[data-network]').forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (btn.getAttribute('aria-disabled') === 'true') return;
            setConnectedNetwork(btn.dataset.network);
        });
    });

    document.querySelectorAll('[data-device]').forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (btn.getAttribute('aria-disabled') === 'true') return;
            setBluetoothDevice(btn.dataset.device, { syncAudio: true });
        });
    });

    updateAllSystemStatusUI();
}

function syncTopZIndexWithDOM() {
    let maxZ = Number.isFinite(topZIndex) ? topZIndex : 1000;
    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (!modal) return;
        const modalZ = parseInt(window.getComputedStyle(modal).zIndex, 10);
        if (!Number.isNaN(modalZ)) {
            maxZ = Math.max(maxZ, modalZ);
        }
        const windowEl = getDialogWindowElement(modal);
        if (windowEl) {
            const contentZ = parseInt(window.getComputedStyle(windowEl).zIndex, 10);
            if (!Number.isNaN(contentZ)) {
                maxZ = Math.max(maxZ, contentZ);
            }
        }
    });
    topZIndex = maxZ;
}

function getMenuBarBottom() {
    const header = document.querySelector('body > header');
    if (!header) {
        return 0;
    }
    const rect = header.getBoundingClientRect();
    return rect.bottom;
}

// Ermittelt die vom Dock belegte Reserve am unteren Rand (in Pixeln)
function getDockReservedBottom() {
    const dock = document.getElementById('dock');
    if (!dock || dock.classList.contains('hidden')) return 0;
    const rect = dock.getBoundingClientRect();
    const vh = Math.max(window.innerHeight || 0, 0);
    if (vh <= 0) return 0;
    return Math.round(Math.max(0, vh - rect.top));
}

function clampWindowToMenuBar(target) {
    if (!target) return;
    const minTop = getMenuBarBottom();
    if (minTop <= 0) return;
    const computed = window.getComputedStyle(target);
    if (computed.position === 'static') {
        target.style.position = 'fixed';
    }
    const currentTop = parseFloat(target.style.top);
    const numericTop = Number.isNaN(currentTop) ? parseFloat(computed.top) : currentTop;
    if (!Number.isNaN(numericTop) && numericTop < minTop) {
        target.style.top = `${minTop}px`;
    } else if (Number.isNaN(numericTop)) {
        const rect = target.getBoundingClientRect();
        if (rect.top < minTop) {
            if (!target.style.left) {
                target.style.left = `${rect.left}px`;
            }
            target.style.top = `${minTop}px`;
        }
    }
}

function computeSnapMetrics(side) {
    if (side !== 'left' && side !== 'right') return null;
    const minTop = Math.round(getMenuBarBottom());
    const viewportWidth = Math.max(window.innerWidth || 0, 0);
    const viewportHeight = Math.max(window.innerHeight || 0, 0);
    if (viewportWidth <= 0 || viewportHeight <= 0) return null;
    const minWidth = Math.min(320, viewportWidth);
    const halfWidth = Math.round(viewportWidth / 2);
    const width = Math.max(Math.min(halfWidth, viewportWidth), minWidth);
    const left = side === 'left' ? 0 : Math.max(0, viewportWidth - width);
    const top = minTop;
    const dockReserve = getDockReservedBottom();
    const height = Math.max(0, viewportHeight - top - dockReserve);
    return { left, top, width, height };
}

let snapPreviewElement = null;

function ensureSnapPreviewElement() {
    if (snapPreviewElement && snapPreviewElement.isConnected) {
        return snapPreviewElement;
    }
    if (!document || !document.body) {
        return null;
    }
    snapPreviewElement = document.getElementById('snap-preview-overlay');
    if (!snapPreviewElement) {
        snapPreviewElement = document.createElement('div');
        snapPreviewElement.id = 'snap-preview-overlay';
        snapPreviewElement.setAttribute('aria-hidden', 'true');
        document.body.appendChild(snapPreviewElement);
    }
    return snapPreviewElement;
}

function showSnapPreview(side) {
    const metrics = computeSnapMetrics(side);
    if (!metrics) {
        hideSnapPreview();
        return;
    }
    const el = ensureSnapPreviewElement();
    if (!el) return;
    el.style.left = `${metrics.left}px`;
    el.style.top = `${metrics.top}px`;
    el.style.width = `${metrics.width}px`;
    el.style.height = `${metrics.height}px`;
    el.setAttribute('data-side', side);
    el.classList.add('snap-preview-visible');
}

function hideSnapPreview() {
    if (!snapPreviewElement || !snapPreviewElement.isConnected) {
        return;
    }
    snapPreviewElement.classList.remove('snap-preview-visible');
    snapPreviewElement.removeAttribute('data-side');
}

// Dock-Magnification im macOS-Stil
function initDockMagnification() {
    const dock = document.getElementById('dock');
    if (!dock) return;
    const icons = Array.from(dock.querySelectorAll('.dock-icon'));
    if (!icons.length) return;
    const items = icons.map(icon => {
        const parent = icon.parentElement;
        const tooltip = parent ? parent.querySelector('.dock-tooltip') : null;
        return {
            icon,
            tooltip,
            baseHeight: icon.offsetHeight || 0
        };
    });
    let rafId = null;
    let pointerX = null;
    const maxScale = 1.6;
    const minScale = 1.0;
    const radius = 120; // Einflussradius in px
    const sigma = radius / 3;
    const apply = () => {
        rafId = null;
        if (pointerX == null) {
            items.forEach(({ icon, tooltip }) => {
                icon.style.transform = '';
                icon.style.zIndex = '';
                if (tooltip) {
                    tooltip.style.transform = '';
                    tooltip.style.zIndex = '';
                }
            });
            return;
        }
        items.forEach(({ icon, tooltip, baseHeight }) => {
            const rect = icon.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const dx = Math.abs(pointerX - cx);
            const influence = Math.exp(-(dx * dx) / (2 * sigma * sigma)); // 0..1
            const scale = minScale + (maxScale - minScale) * influence;
            const translateY = -8 * influence; // leichtes Anheben
            icon.style.transformOrigin = 'bottom center';
            icon.style.transform = `translateY(${translateY.toFixed(1)}px) scale(${scale.toFixed(3)})`;
            icon.style.zIndex = String(100 + Math.round(influence * 100));
            if (tooltip) {
                const base = baseHeight || icon.offsetHeight || 0;
                const lift = Math.max(0, base * (scale - 1) - translateY);
                const gap = 12; // zusätzlicher Abstand zwischen Icon und Tooltip
                tooltip.style.transform = `translateY(-${(lift + gap).toFixed(1)}px)`;
                tooltip.style.zIndex = '400';
            }
        });
    };
    const onMove = (e) => { pointerX = e.clientX; if (!rafId) rafId = requestAnimationFrame(apply); };
    const onLeave = () => { pointerX = null; if (!rafId) rafId = requestAnimationFrame(apply); };
    dock.addEventListener('mousemove', onMove);
    dock.addEventListener('mouseleave', onLeave);
}

document.addEventListener('DOMContentLoaded', function () {
    // Wenn auf einen sichtbaren Modalcontainer geklickt wird, hole das Fenster in den Vordergrund
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function (e) {
            // Verhindere, dass Klicks auf interaktive Elemente im Modal den Fokuswechsel stören.
            if (e.target === modal || modal.contains(e.target)) {
                hideMenuDropdowns();
                bringDialogToFront(modal.id);
                updateProgramLabelByTopModal();
            }
        });
    });

    window.dialogs = {};
    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (!modal) return;
        window.dialogs[id] = new Dialog(id);
    });

    syncTopZIndexWithDOM();
    restoreWindowPositions();
    restoreOpenModals();
    loadGithubRepos();
    initEventHandlers();
    initSystemStatusControls();

    if (window.dialogs["settings-modal"]) {
        window.dialogs["settings-modal"].loadIframe("./settings.html");
    }
    if (window.dialogs["text-modal"]) {
        // Lädt den Rich‑Text‑Editor in einem IFrame und registriert einen mousedown‑Handler
        // damit Klicks im Editorfenster das Modal in den Vordergrund holen.
        window.dialogs["text-modal"].loadIframe("./text.html");
    }
    initDockMagnification();
});

function bringDialogToFront(dialogId) {
    if (window.dialogs[dialogId]) {
        window.dialogs[dialogId].bringToFront();
    } else {
        console.error("Kein Dialog mit der ID " + dialogId + " gefunden.");
    }
}

// Zentrale Funktion zum Aktualisieren des Program-Menütexts
function updateProgramLabel(newLabel) {
    const programLabel = document.getElementById("program-label");
    if (programLabel) {
        programLabel.innerText = newLabel;
    }
}

// Funktion, um das aktuell oberste Modal zu ermitteln
function getTopModal() {
    let topModal = null;
    let highestZ = 0;
    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (modal && !modal.classList.contains("hidden")) {
            const zIndex = parseInt(getComputedStyle(modal).zIndex, 10) || 0;
            if (zIndex > highestZ) {
                highestZ = zIndex;
                topModal = modal;
            }
        }
    });
    return topModal;
}

function getProgramInfo(modalId) {
    return resolveProgramInfo(modalId);
}

function updateProgramInfoMenu(info) {
    const infoLink = document.getElementById("about-program");
    if (!infoLink) return;
    const fallbackInfo = resolveProgramInfo(null);
    infoLink.innerText = info.infoLabel || fallbackInfo.infoLabel;
    if (info.fallbackInfoModalId) {
        infoLink.dataset.fallbackInfoModalId = info.fallbackInfoModalId;
    } else {
        delete infoLink.dataset.fallbackInfoModalId;
    }
}

function renderProgramInfo(info) {
    const modal = document.getElementById("program-info-modal");
    if (!modal) return;
    modal.dataset.infoTarget = info.modalId || "";
    const fallbackInfo = resolveProgramInfo(null);
    const about = info.about || fallbackInfo.about || {};
    const iconEl = modal.querySelector("#program-info-icon");
    if (iconEl) {
        if (info.icon) {
            iconEl.src = info.icon;
            iconEl.alt = about.name || info.programLabel || "Programm";
            iconEl.classList.remove("hidden");
        } else {
            iconEl.classList.add("hidden");
        }
    }
    const nameEl = modal.querySelector("#program-info-name");
    if (nameEl) {
        nameEl.textContent = about.name || info.programLabel || fallbackInfo.programLabel;
    }
    const taglineEl = modal.querySelector("#program-info-tagline");
    if (taglineEl) {
        const tagline = about.tagline || "";
        taglineEl.textContent = tagline;
        taglineEl.classList.toggle("hidden", !tagline);
    }
    const versionEl = modal.querySelector("#program-info-version");
    if (versionEl) {
        const version = about.version || "";
        versionEl.textContent = version;
        versionEl.classList.toggle("hidden", !version);
    }
    const copyrightEl = modal.querySelector("#program-info-copyright");
    if (copyrightEl) {
        const copyright = about.copyright || "";
        copyrightEl.textContent = copyright;
        copyrightEl.classList.toggle("hidden", !copyright);
    }
}

function openProgramInfoDialog(event, infoOverride) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    hideMenuDropdowns();
    const info = infoOverride || currentProgramInfo || getProgramInfo(null);
    currentProgramInfo = info;
    const infoEvent = new CustomEvent("programInfoRequested", {
        detail: {
            modalId: info.modalId,
            info
        },
        cancelable: true
    });
    const dispatchResult = window.dispatchEvent(infoEvent);
    if (!dispatchResult) {
        return;
    }
    const fallbackId = info.fallbackInfoModalId;
    if (!fallbackId) {
        return;
    }
    if (fallbackId === "program-info-modal") {
        renderProgramInfo(info);
    }
    const dialogInstance = window.dialogs && window.dialogs[fallbackId];
    if (dialogInstance && typeof dialogInstance.open === "function") {
        dialogInstance.open();
    } else {
        const modalElement = document.getElementById(fallbackId);
        if (modalElement) {
            modalElement.classList.remove("hidden");
            bringDialogToFront(fallbackId);
            updateProgramLabelByTopModal();
        } else {
            console.warn(`Kein Fallback-Info-Dialog für ${fallbackId} gefunden.`);
        }
    }
}

function createMenuContext(modalId) {
    const resolvedId = modalId || null;
    const dialog = resolvedId && window.dialogs ? window.dialogs[resolvedId] : null;
    return {
        modalId: resolvedId,
        dialog,
        info: resolveProgramInfo(resolvedId)
    };
}

function registerMenuAction(handler) {
    if (typeof handler !== 'function') {
        return null;
    }
    const actionId = `menu-action-${++menuActionIdCounter}`;
    menuActionHandlers.set(actionId, handler);
    return actionId;
}

function normalizeMenuItems(items, context) {
    if (!Array.isArray(items)) return [];
    const normalized = [];
    let previousWasSeparator = true;
    items.forEach(item => {
        if (!item) return;
        if (item.type === 'separator') {
            if (previousWasSeparator) {
                return;
            }
            normalized.push({ type: 'separator' });
            previousWasSeparator = true;
            return;
        }
        const clone = Object.assign({}, item);
        if (typeof clone.disabled === 'function') {
            clone.disabled = clone.disabled(context);
        }
        if (typeof clone.label === 'function') {
            clone.label = clone.label(context);
        }
        if (typeof clone.shortcut === 'function') {
            clone.shortcut = clone.shortcut(context);
        }
        normalized.push(clone);
        previousWasSeparator = false;
    });
    while (normalized.length && normalized[normalized.length - 1].type === 'separator') {
        normalized.pop();
    }
    return normalized;
}

function renderApplicationMenu(activeModalId) {
    const container = document.getElementById('menubar-links');
    if (!container) return;
    const modalKey = activeModalId && menuDefinitions[activeModalId] ? activeModalId : 'default';
    const builder = menuDefinitions[modalKey] || menuDefinitions.default;
    const context = createMenuContext(activeModalId || null);
    const sections = typeof builder === 'function' ? builder(context) : Array.isArray(builder) ? builder : [];
    container.innerHTML = '';
    menuActionHandlers.clear();
    menuActionIdCounter = 0;
    currentMenuModalId = activeModalId || null;
    if (!Array.isArray(sections) || sections.length === 0) {
        return;
    }
    sections.forEach((section, sectionIndex) => {
        if (!section) return;
        const items = normalizeMenuItems(section.items, context);
        if (!items.length) return;
        const trigger = document.createElement('div');
        trigger.className = 'menubar-trigger';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'menubar-item';
        button.dataset.menubarTriggerButton = 'true';
        const label = typeof section.label === 'function' ? section.label(context) : section.label;
        button.textContent = label || '';
        const sectionId = section.id || `section-${sectionIndex}`;
        const buttonId = `menubar-menu-${sectionId}`;
        const dropdownId = `menu-dropdown-${sectionId}`;
        button.id = buttonId;
        button.setAttribute('aria-haspopup', 'true');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', dropdownId);
        const dropdown = document.createElement('ul');
        dropdown.id = dropdownId;
        dropdown.className = 'menu-dropdown hidden';
        dropdown.setAttribute('role', 'menu');
        dropdown.setAttribute('aria-labelledby', buttonId);
        items.forEach(item => {
            if (item.type === 'separator') {
                const separator = document.createElement('li');
                separator.className = 'menu-separator';
                separator.setAttribute('role', 'separator');
                separator.setAttribute('aria-hidden', 'true');
                dropdown.appendChild(separator);
                return;
            }
            const li = document.createElement('li');
            li.setAttribute('role', 'none');
            const tagName = item.href ? 'a' : 'button';
            const actionEl = document.createElement(tagName);
            actionEl.className = 'menu-item';
            if (tagName === 'button') {
                actionEl.type = 'button';
            } else {
                actionEl.href = item.href;
                if (item.external) {
                    actionEl.rel = 'noopener noreferrer';
                    actionEl.target = '_blank';
                }
            }
            const itemLabel = item.label != null ? item.label : '';
            const labelSpan = document.createElement('span');
            labelSpan.className = 'menu-item-label';
            if (item.icon) {
                const iconSpan = document.createElement('span');
                iconSpan.className = 'menu-item-icon';
                const iconSvg = getMenuIconSvg(item.icon);
                renderIconIntoElement(iconSpan, iconSvg, item.icon);
                labelSpan.appendChild(iconSpan);
            }
            labelSpan.appendChild(document.createTextNode(itemLabel));
            actionEl.appendChild(labelSpan);
            if (item.shortcut) {
                const shortcutSpan = document.createElement('span');
                shortcutSpan.className = 'menu-item-shortcut';
                shortcutSpan.textContent = item.shortcut;
                actionEl.appendChild(shortcutSpan);
            }
            actionEl.setAttribute('role', 'menuitem');
            if (item.title) {
                actionEl.title = item.title;
            }
            const isDisabled = Boolean(item.disabled);
            if (isDisabled) {
                actionEl.setAttribute('aria-disabled', 'true');
                if (tagName === 'button') {
                    actionEl.disabled = true;
                }
            } else if (typeof item.action === 'function') {
                const actionId = registerMenuAction(item.action);
                if (actionId) {
                    actionEl.dataset.menuAction = actionId;
                }
            }
            if (item.href && typeof item.onClick === 'function') {
                actionEl.addEventListener('click', (event) => {
                    const result = item.onClick(event);
                    if (result === false) {
                        event.preventDefault();
                    }
                });
            }
            li.appendChild(actionEl);
            dropdown.appendChild(li);
        });
        if (!dropdown.childElementCount) {
            return;
        }
        trigger.appendChild(button);
        trigger.appendChild(dropdown);
        container.appendChild(trigger);
        bindDropdownTrigger(button, { hoverRequiresOpen: true });
    });
}

function handleMenuActionActivation(event) {
    const target = event.target instanceof Element ? event.target.closest('[data-menu-action]') : null;
    if (!target) return;
    const actionId = target.getAttribute('data-menu-action');
    const handler = actionId ? menuActionHandlers.get(actionId) : null;
    if (typeof handler !== 'function') return;
    event.preventDefault();
    event.stopPropagation();
    hideMenuDropdowns();
    try {
        handler();
    } catch (err) {
        console.error('Fehler beim Ausführen eines Menübefehls:', err);
    }
}

function createWindowMenuSection(context) {
    return {
        id: 'window',
        label: 'Fenster',
        items: getWindowMenuItems(context)
    };
}

function getWindowMenuItems(context) {
    const dialog = context && context.dialog;
    const hasDialog = Boolean(dialog && typeof dialog.close === 'function');
    return [
        {
            id: 'window-minimize',
            label: 'Minimieren',
            shortcut: '⌘M',
            disabled: !hasDialog,
            icon: 'windowMinimize',
            action: () => {
                if (dialog && typeof dialog.minimize === 'function') {
                    dialog.minimize();
                }
            }
        },
        {
            id: 'window-zoom',
            label: 'Zoomen',
            shortcut: '⌃⌘F',
            disabled: !hasDialog,
            icon: 'windowZoom',
            action: () => {
                if (dialog && typeof dialog.toggleMaximize === 'function') {
                    dialog.toggleMaximize();
                }
            }
        },
        {
            type: 'separator'
        },
        {
            id: 'window-all-front',
            label: 'Alle nach vorne bringen',
            disabled: !hasAnyVisibleDialog(),
            icon: 'windowFront',
            action: bringAllWindowsToFront
        },
        {
            type: 'separator'
        },
        {
            id: 'window-close',
            label: 'Fenster schließen',
            shortcut: '⌘W',
            disabled: !hasDialog,
            icon: 'close',
            action: () => closeContextWindow(context)
        }
    ];
}

function createHelpMenuSection(context, overrides = {}) {
    const sectionLabel = overrides.sectionLabel || 'Hilfe';
    const itemLabel = overrides.itemLabel || 'Programmhilfe anzeigen';
    const infoModalId = overrides.infoModalId || context.modalId || null;
    return {
        id: overrides.id || 'help',
        label: sectionLabel,
        items: [
            {
                id: 'help-show-info',
                label: itemLabel,
                icon: overrides.itemIcon || 'help',
                action: () => openProgramInfoFromMenu(infoModalId)
            }
        ]
    };
}

function buildDefaultMenuDefinition(context) {
    return buildFinderMenuDefinition(context);
}

function buildFinderMenuDefinition(context) {
    return [
        {
            id: 'file',
            label: 'Ablage',
            items: [
                {
                    id: 'finder-new-window',
                    label: 'Neues Finder-Fenster',
                    shortcut: '⌘N',
                    icon: 'finder',
                    action: () => showTab('projects')
                },
                {
                    id: 'finder-reload',
                    label: 'Finder neu laden',
                    shortcut: '⌘R',
                    icon: 'reload',
                    action: loadGithubRepos
                },
                {
                    type: 'separator'
                },
                {
                    id: 'finder-close',
                    label: 'Fenster schließen',
                    shortcut: '⌘W',
                    disabled: () => !(context && context.dialog),
                    icon: 'close',
                    action: () => closeContextWindow(context)
                }
            ]
        },
        createWindowMenuSection(context),
        createHelpMenuSection(context, { itemLabel: 'Finder-Hilfe anzeigen', infoModalId: 'projects-modal', itemIcon: 'help' })
    ];
}

function buildSettingsMenuDefinition(context) {
    return [
        {
            id: 'file',
            label: 'Ablage',
            items: [
                {
                    id: 'settings-close',
                    label: 'Fenster schließen',
                    shortcut: '⌘W',
                    disabled: () => !(context && context.dialog),
                    icon: 'close',
                    action: () => closeContextWindow(context)
                }
            ]
        },
        createWindowMenuSection(context),
        createHelpMenuSection(context, { itemLabel: 'Einstellungs-Hilfe anzeigen', infoModalId: 'settings-modal', itemIcon: 'help' })
    ];
}

function buildTextEditorMenuDefinition(context) {
    return [
        {
            id: 'file',
            label: 'Ablage',
            items: [
                {
                    id: 'text-new',
                    label: 'Neu',
                    shortcut: '⌘N',
                    icon: 'newFile',
                    action: () => sendTextEditorMenuAction('file:new')
                },
                {
                    id: 'text-open',
                    label: 'Öffnen …',
                    shortcut: '⌘O',
                    icon: 'open',
                    action: () => sendTextEditorMenuAction('file:open')
                },
                {
                    id: 'text-save',
                    label: 'Speichern',
                    shortcut: '⌘S',
                    icon: 'save',
                    action: () => sendTextEditorMenuAction('file:save')
                }
            ]
        },
        {
            id: 'edit',
            label: 'Bearbeiten',
            items: [
                {
                    id: 'text-undo',
                    label: 'Rückgängig',
                    shortcut: '⌘Z',
                    icon: 'undo',
                    action: () => sendTextEditorMenuAction('edit:undo')
                },
                {
                    id: 'text-redo',
                    label: 'Wiederholen',
                    shortcut: '⇧⌘Z',
                    icon: 'redo',
                    action: () => sendTextEditorMenuAction('edit:redo')
                },
                {
                    type: 'separator'
                },
                {
                    id: 'text-cut',
                    label: 'Ausschneiden',
                    shortcut: '⌘X',
                    icon: 'cut',
                    action: () => sendTextEditorMenuAction('edit:cut')
                },
                {
                    id: 'text-copy',
                    label: 'Kopieren',
                    shortcut: '⌘C',
                    icon: 'copy',
                    action: () => sendTextEditorMenuAction('edit:copy')
                },
                {
                    id: 'text-paste',
                    label: 'Einfügen',
                    shortcut: '⌘V',
                    icon: 'paste',
                    action: () => sendTextEditorMenuAction('edit:paste')
                },
                {
                    type: 'separator'
                },
                {
                    id: 'text-select-all',
                    label: 'Alles auswählen',
                    shortcut: '⌘A',
                    icon: 'selectAll',
                    action: () => sendTextEditorMenuAction('edit:selectAll')
                }
            ]
        },
        {
            id: 'view',
            label: 'Darstellung',
            items: [
                {
                    id: 'text-toggle-wrap',
                    label: 'Zeilenumbruch umschalten',
                    shortcut: '⌥⌘W',
                    icon: 'wrap',
                    action: () => sendTextEditorMenuAction('view:toggleWrap')
                }
            ]
        },
        createWindowMenuSection(context),
        createHelpMenuSection(context, { itemLabel: 'Texteditor-Hilfe anzeigen', infoModalId: 'text-modal', itemIcon: 'help' })
    ];
}

function buildImageViewerMenuDefinition(context) {
    const state = getImageViewerState();
    return [
        {
            id: 'file',
            label: 'Ablage',
            items: [
                {
                    id: 'image-open-tab',
                    label: 'Bild in neuem Tab öffnen',
                    disabled: !state.hasImage,
                    icon: 'imageOpen',
                    action: openActiveImageInNewTab
                },
                {
                    id: 'image-download',
                    label: 'Bild sichern …',
                    disabled: !state.hasImage,
                    icon: 'download',
                    action: downloadActiveImage
                },
                {
                    type: 'separator'
                },
                {
                    id: 'image-close',
                    label: 'Fenster schließen',
                    shortcut: '⌘W',
                    disabled: () => !(context && context.dialog),
                    icon: 'close',
                    action: () => closeContextWindow(context)
                }
            ]
        },
        createWindowMenuSection(context),
        createHelpMenuSection(context, { itemLabel: 'Bildbetrachter-Hilfe anzeigen', infoModalId: 'image-modal', itemIcon: 'help' })
    ];
}

function buildAboutMenuDefinition(context) {
    return [
        {
            id: 'file',
            label: 'Ablage',
            items: [
                {
                    id: 'about-close',
                    label: 'Fenster schließen',
                    shortcut: '⌘W',
                    disabled: () => !(context && context.dialog),
                    icon: 'close',
                    action: () => closeContextWindow(context)
                }
            ]
        },
        createWindowMenuSection(context),
        createHelpMenuSection(context, { itemLabel: 'Über Marvin', infoModalId: 'about-modal', itemIcon: 'info' })
    ];
}

function buildProgramInfoMenuDefinition(context) {
    return [
        {
            id: 'file',
            label: 'Ablage',
            items: [
                {
                    id: 'program-info-close',
                    label: 'Fenster schließen',
                    shortcut: '⌘W',
                    disabled: () => !(context && context.dialog),
                    icon: 'close',
                    action: () => closeContextWindow(context)
                }
            ]
        },
        createWindowMenuSection(context)
    ];
}

function closeContextWindow(context) {
    const dialog = context && context.dialog;
    if (dialog && typeof dialog.close === 'function') {
        dialog.close();
    } else if (context && context.modalId) {
        const modal = document.getElementById(context.modalId);
        if (modal && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
            saveOpenModals();
            updateDockIndicators();
            updateProgramLabelByTopModal();
        }
    }
}

function hasAnyVisibleDialog() {
    if (!window.dialogs) return false;
    return Object.values(window.dialogs).some(dialog => dialog && dialog.modal && !dialog.modal.classList.contains('hidden'));
}

function bringAllWindowsToFront() {
    if (!window.dialogs) return;
    modalIds.forEach(id => {
        const dialog = window.dialogs[id];
        if (dialog && dialog.modal && !dialog.modal.classList.contains('hidden') && typeof dialog.bringToFront === 'function') {
            dialog.bringToFront();
        }
    });
}

function openProgramInfoFromMenu(targetModalId) {
    const info = resolveProgramInfo(targetModalId || null);
    openProgramInfoDialog(null, info);
}

function sendTextEditorMenuAction(command) {
    if (!command) return;
    postToTextEditor({
        type: 'textEditor:menuAction',
        command
    });
}

function getImageViewerState() {
    const viewer = document.getElementById('image-viewer');
    if (!viewer) {
        return { hasImage: false, src: '' };
    }
    const hidden = viewer.classList.contains('hidden');
    const src = viewer.getAttribute('src') || viewer.src || '';
    const hasImage = Boolean(src && src.trim() && !hidden);
    return { hasImage, src };
}

function openActiveImageInNewTab() {
    const state = getImageViewerState();
    if (!state.hasImage || !state.src) return;
    window.open(state.src, '_blank', 'noopener');
}

function downloadActiveImage() {
    const state = getImageViewerState();
    if (!state.hasImage || !state.src) return;
    const link = document.createElement('a');
    link.href = state.src;
    let fileName = 'bild';
    try {
        const url = new URL(state.src, window.location.href);
        fileName = url.pathname.split('/').pop() || fileName;
    } catch (err) {
        fileName = 'bild';
    }
    link.download = fileName || 'bild';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function updateProgramLabelByTopModal() {
    const topModal = getTopModal();
    let info;
    if (topModal && topModal.id === "program-info-modal" && currentProgramInfo && currentProgramInfo.modalId) {
        info = resolveProgramInfo(currentProgramInfo.modalId);
        currentProgramInfo = info;
    } else {
        info = getProgramInfo(topModal ? topModal.id : null);
        currentProgramInfo = info;
    }
    updateProgramLabel(info.programLabel);
    updateProgramInfoMenu(info);
    renderApplicationMenu(topModal ? topModal.id : null);
    return info;
}

window.addEventListener("languagePreferenceChange", () => {
    const info = updateProgramLabelByTopModal();
    const programInfoModal = document.getElementById("program-info-modal");
    if (programInfoModal && !programInfoModal.classList.contains("hidden")) {
        const targetId = programInfoModal.dataset.infoTarget || (info ? info.modalId : null) || null;
        const infoForDialog = resolveProgramInfo(targetId);
        renderProgramInfo(infoForDialog);
        // Wenn der Programminfo-Dialog das aktive Programm repräsentiert, synchronisieren wir den aktuellen Zustand
        if (info && info.modalId === infoForDialog.modalId) {
            currentProgramInfo = infoForDialog;
        }
    }
});

window.addEventListener('themePreferenceChange', () => {
    systemStatus.darkMode = document.documentElement.classList.contains('dark');
    updateDarkModeUI();
});

function hideMenuDropdowns() {
    document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
        if (!dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
        }
    });
    document.querySelectorAll('[data-menubar-trigger-button="true"]').forEach(button => {
        button.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('[data-system-menu-trigger]').forEach(button => {
        button.setAttribute('aria-expanded', 'false');
    });
}

function isAnyDropdownOpen() {
    return Boolean(document.querySelector('.menu-dropdown:not(.hidden)'));
}

function toggleMenuDropdown(trigger, options = {}) {
    if (!trigger) return;
    const menuId = trigger.getAttribute('aria-controls');
    if (!menuId) return;
    const menu = document.getElementById(menuId);
    if (!menu) return;
    const forceOpen = Boolean(options.forceOpen);
    const wasOpen = !menu.classList.contains('hidden');
    const shouldOpen = forceOpen || !wasOpen;
    hideMenuDropdowns();
    if (shouldOpen) {
        menu.classList.remove('hidden');
        trigger.setAttribute('aria-expanded', 'true');
    }
}

function bindDropdownTrigger(trigger, options = {}) {
    if (!trigger) return;
    const hoverRequiresExisting = options.hoverRequiresOpen !== undefined ? options.hoverRequiresOpen : true;
    trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleMenuDropdown(trigger);
    });
    trigger.addEventListener('mouseenter', () => {
        if (hoverRequiresExisting && !isAnyDropdownOpen()) {
            return;
        }
        toggleMenuDropdown(trigger, { forceOpen: true });
    });
    trigger.addEventListener('focus', () => {
        toggleMenuDropdown(trigger, { forceOpen: true });
    });
}

// Zentrale Event-Handler für Menü und Dropdowns
function initEventHandlers() {
    const appleMenuTrigger = document.getElementById('apple-menu-trigger');
    const programLabel = document.getElementById('program-label');
    const dropdownAbout = document.getElementById('dropdown-about');
    const aboutProgramLink = document.getElementById('about-program');
    const resetLayoutButton = document.getElementById('dropdown-reset-layout');
    const closeProgramButton = document.getElementById('program-close-current');
    const settingsButton = document.getElementById('dropdown-settings');

    bindDropdownTrigger(appleMenuTrigger, { hoverRequiresOpen: true });
    bindDropdownTrigger(programLabel, { hoverRequiresOpen: true });

    document.addEventListener('click', handleMenuActionActivation);
    document.addEventListener('click', hideMenuDropdowns);

    if (dropdownAbout) {
        dropdownAbout.addEventListener('click', (event) => {
            openProgramInfoDialog(event, getProgramInfo("about-modal"));
        });
    }

    if (aboutProgramLink) {
        aboutProgramLink.addEventListener('click', (event) => {
            openProgramInfoDialog(event);
        });
    }

    if (resetLayoutButton) {
        resetLayoutButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            resetWindowLayout();
        });
    }

    if (settingsButton) {
        settingsButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            hideMenuDropdowns();
            window.dialogs["settings-modal"].open();
            updateProgramLabelByTopModal();
        });
    }

    if (closeProgramButton) {
        closeProgramButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            hideMenuDropdowns();
            const topModal = getTopModal();
            if (!topModal) {
                return;
            }
            const dialogInstance = window.dialogs && window.dialogs[topModal.id];
            if (dialogInstance && typeof dialogInstance.close === 'function') {
                dialogInstance.close();
            } else {
                topModal.classList.add('hidden');
                saveOpenModals();
                updateDockIndicators();
                updateProgramLabelByTopModal();
            }
        });
    }

    // Vereinheitlichte Registrierung der Close-Button Event Listener:
    const closeMapping = {
        "close-projects-modal": "projects-modal",
        "close-about-modal": "about-modal",
        "close-settings-modal": "settings-modal",
        "close-text-modal": "text-modal",
        "close-image-modal": "image-modal",
        "close-program-info-modal": "program-info-modal"
    };
    Object.entries(closeMapping).forEach(([btnId, modalId]) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (window.dialogs[modalId]) {
                    window.dialogs[modalId].close();
                } else {
                    const modal = document.getElementById(modalId);
                    if (modal) modal.classList.add("hidden");
                    saveOpenModals();
                    updateDockIndicators();
                    updateProgramLabelByTopModal();
                }
            });
        }
    });
}

// Zustandsspeicherung: Offene Fenster speichern
function saveOpenModals() {
    const openModals = modalIds.filter(id => {
        if (transientModalIds.has(id)) return false;
        const el = document.getElementById(id);
        if (!el) return false;
        // Als "offen" zählen sowohl sichtbare als auch minimierte Fenster
        const minimized = el.dataset && el.dataset.minimized === 'true';
        return !el.classList.contains("hidden") || minimized;
    });
    localStorage.setItem("openModals", JSON.stringify(openModals));
}

// Zustandsspeicherung: Offene Fenster wiederherstellen
function restoreOpenModals() {
    const openModals = JSON.parse(localStorage.getItem("openModals") || "[]");
    openModals.forEach(id => {
        if (transientModalIds.has(id)) return;
        const dialogInstance = window.dialogs && window.dialogs[id];
        if (dialogInstance) {
            dialogInstance.open();
        } else {
            const el = document.getElementById(id);
            if (el) el.classList.remove("hidden");
        }
    });
    updateDockIndicators();
    updateProgramLabelByTopModal();
}

// Speichern der Fensterpositionen
function getDialogWindowElement(modal) {
    if (!modal) return null;
    return modal.querySelector('.autopointer') || modal;
}

function saveWindowPositions() {
    const positions = {};
    modalIds.forEach(id => {
        if (transientModalIds.has(id)) return;
        const el = document.getElementById(id);
        const windowEl = getDialogWindowElement(el);
        if (el && windowEl) {
            positions[id] = {
                left: windowEl.style.left || "",
                top: windowEl.style.top || "",
                width: windowEl.style.width || "",
                height: windowEl.style.height || "",
                position: windowEl.style.position || ""
            };
        }
    });
    localStorage.setItem("modalPositions", JSON.stringify(positions));
}

function restoreWindowPositions() {
    const positions = JSON.parse(localStorage.getItem("modalPositions") || "{}");
    Object.keys(positions).forEach(id => {
        if (transientModalIds.has(id)) return;
        const el = document.getElementById(id);
        const windowEl = getDialogWindowElement(el);
        if (el && windowEl) {
            const stored = positions[id];
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
        clampWindowToMenuBar(windowEl);
    });
}

function resetWindowLayout() {
    modalIds.forEach(id => {
        const modal = document.getElementById(id);
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
    topZIndex = 1000;
    localStorage.removeItem("modalPositions");
    hideMenuDropdowns();
    syncTopZIndexWithDOM();
    if (window.dialogs) {
        Object.values(window.dialogs).forEach(dialog => {
            if (dialog && typeof dialog.enforceMenuBarBoundary === 'function') {
                dialog.enforceMenuBarBoundary();
            }
        });
    }
    clearFinderState();
    updateProgramLabelByTopModal();
}

// Lädt GitHub-Repositories und cached sie im LocalStorage
function loadGithubRepos() {
    const username = "Marormur";
    const cacheKey = `githubRepos_${username}`;
    const cacheTimestampKey = `githubReposTimestamp_${username}`;
    const cacheDuration = 1000 * 60 * 60; // 1 Stunde
    const list = document.getElementById("repo-list");
    const fileList = document.getElementById("repo-files");
    const breadcrumbs = document.getElementById("finder-breadcrumbs");
    const finderMain = document.getElementById("finder-main");
    const finderPlaceholder = document.getElementById("finder-placeholder");
    const imageViewer = document.getElementById("image-viewer");
    const imageInfo = document.getElementById("image-info");
    const imagePlaceholder = document.getElementById("image-placeholder");
    if (!list || !fileList || !breadcrumbs || !finderMain || !finderPlaceholder || !imageViewer || !imageInfo || !imagePlaceholder) return;

    const supportsAbortController = typeof window.AbortController === "function";

    const state = {
        repos: [],
        selectedRepo: null,
        selectedPath: "",
        contentCache: {},
        repoButtons: new Map(),
        imageAbortController: null
    };

    let pendingFinderState = readFinderState();
    const RATE_LIMIT_ERROR = 'RATE_LIMIT';
    const NOT_FOUND_ERROR = 'NOT_FOUND';
    const githubHeaders = { Accept: 'application/vnd.github+json' };
    const withGithubOptions = (options = {}) => {
        const merged = Object.assign({}, options);
        const optionHeaders = options.headers || {};
        merged.headers = Object.assign({}, githubHeaders, optionHeaders);
        return merged;
    };
    const createRateLimitError = () => {
        const error = new Error("GitHub API rate limit reached");
        error.code = RATE_LIMIT_ERROR;
        return error;
    };
    const createNotFoundError = () => {
        const error = new Error("Requested GitHub resource was not found");
        error.code = NOT_FOUND_ERROR;
        return error;
    };
    const isRateLimitResponse = (res) => {
        if (!res) return false;
        if (res.status !== 403) return false;
        const remaining = res.headers ? res.headers.get('x-ratelimit-remaining') : null;
        return remaining === '0';
    };
    const assertGithubResponseOk = (res) => {
        if (res.ok) return res;
        if (res.status === 404) {
            throw createNotFoundError();
        }
        if (isRateLimitResponse(res)) {
            throw createRateLimitError();
        }
        const error = new Error(`GitHub API antwortete mit Status ${res.status}`);
        error.status = res.status;
        throw error;
    };
    const isRateLimitError = (error) => Boolean(error && error.code === RATE_LIMIT_ERROR);
    const isNotFoundError = (error) => Boolean(error && error.code === NOT_FOUND_ERROR);

    const textFileExtensions = [
        ".txt", ".md", ".markdown", ".mdx", ".json", ".jsonc", ".csv", ".tsv", ".yaml", ".yml",
        ".xml", ".html", ".htm", ".css", ".scss", ".sass", ".less",
        ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".vue",
        ".c", ".h", ".cpp", ".hpp", ".cc", ".cxx", ".hh", ".ino",
        ".java", ".kt", ".kts", ".swift", ".cs", ".py", ".rb", ".php", ".rs", ".go",
        ".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat", ".cmd",
        ".ini", ".cfg", ".conf", ".config", ".env", ".gitignore", ".gitattributes",
        ".log", ".sql"
    ];

    const imageFileExtensions = [
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".svg", ".tiff", ".tif", ".heic", ".heif", ".avif"
    ];

    const isProbablyTextFile = (name) => {
        if (!name || typeof name !== "string") return false;
        const lower = name.toLowerCase();
        return textFileExtensions.some(ext => lower.endsWith(ext));
    };

    const isImageFile = (name) => {
        if (!name || typeof name !== "string") return false;
        const lower = name.toLowerCase();
        return imageFileExtensions.some(ext => lower.endsWith(ext));
    };

    const getTextEditorIframe = () => {
        const dialog = window.dialogs ? window.dialogs["text-modal"] : null;
        if (!dialog || !dialog.modal) return null;
        return dialog.modal.querySelector("iframe");
    };

    const postToTextEditor = (message, attempt = 0) => {
        if (!message || typeof message !== "object") {
            return;
        }
        const iframe = getTextEditorIframe();
        if (iframe && iframe.contentWindow) {
            let targetOrigin = '*';
            if (window.location && typeof window.location.origin === 'string' && window.location.origin !== 'null') {
                targetOrigin = window.location.origin;
            }
            iframe.contentWindow.postMessage(message, targetOrigin);
            return;
        }
        if (attempt < 10) {
            setTimeout(() => postToTextEditor(message, attempt + 1), 120);
        } else {
            console.warn("Texteditor iframe nicht verfügbar, Nachricht konnte nicht gesendet werden.", message);
        }
    };

    const decodeBase64ToText = (input) => {
        if (typeof input !== "string") return null;
        try {
            const cleaned = input.replace(/\s/g, "");
            if (typeof window.atob !== "function") {
                console.warn("window.atob ist nicht verfügbar.");
                return null;
            }
            const binary = window.atob(cleaned);
            if (typeof window.TextDecoder === "function") {
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i += 1) {
                    bytes[i] = binary.charCodeAt(i);
                }
                return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
            }
            // Fallback für sehr alte Browser
            const percentEncoded = Array.prototype.map.call(binary, (char) => {
                return `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`;
            }).join("");
            return decodeURIComponent(percentEncoded);
        } catch (err) {
            console.error("Konnte Base64-Inhalt nicht dekodieren:", err);
            return null;
        }
    };

    const ensureTextEditorOpen = () => {
        const dialog = window.dialogs ? window.dialogs["text-modal"] : null;
        if (dialog && typeof dialog.open === "function") {
            dialog.open();
            return dialog;
        }
        if (typeof showTab === "function") {
            showTab("text");
        }
        return null;
    };

    const ensureImageViewerOpen = () => {
        const dialog = window.dialogs ? window.dialogs["image-modal"] : null;
        if (dialog && typeof dialog.open === "function") {
            dialog.open();
            return dialog;
        }
        if (typeof showTab === "function") {
            showTab("image");
        }
        return null;
    };

    let imagePlaceholderState = null;
    const setImagePlaceholder = (messageKey, params) => {
        if (!imagePlaceholder) return;
        if (typeof messageKey !== "string" || messageKey.length === 0) {
            imagePlaceholder.removeAttribute("data-i18n");
            imagePlaceholder.removeAttribute("data-i18n-params");
            imagePlaceholder.textContent = "";
            imagePlaceholder.classList.add("hidden");
            imagePlaceholderState = null;
            return;
        }
        imagePlaceholder.setAttribute("data-i18n", messageKey);
        if (params && Object.keys(params).length > 0) {
            imagePlaceholder.setAttribute("data-i18n-params", JSON.stringify(params));
        } else {
            imagePlaceholder.removeAttribute("data-i18n-params");
        }
        imagePlaceholderState = { key: messageKey, params: params || undefined };
        appI18n.applyTranslations(imagePlaceholder);
        imagePlaceholder.classList.remove("hidden");
    };

    window.addEventListener("languagePreferenceChange", () => {
        if (imagePlaceholderState) {
            setImagePlaceholder(imagePlaceholderState.key, imagePlaceholderState.params);
        }
    });

    const updateImageInfo = ({ repo, path, dimensions, size }) => {
        if (!imageInfo) return;
        const parts = [];
        if (repo) parts.push(repo);
        if (path) parts.push(path);
        const meta = [];
        if (dimensions) meta.push(dimensions);
        if (typeof size === "number" && size > 0) {
            const kb = (size / 1024).toFixed(1);
            meta.push(`${kb} KB`);
        }
        const info = [
            parts.join(" / "),
            meta.join(" • ")
        ].filter(Boolean).join(" — ");
        if (info) {
            imageInfo.textContent = info;
            imageInfo.classList.remove("hidden");
        } else {
            imageInfo.textContent = "";
            imageInfo.classList.add("hidden");
        }
    };

    const openImageFileInViewer = (repoName, path, entry) => {
        if (!entry || !entry.name) return;
        const viewerDialog = ensureImageViewerOpen();
        const filePath = path ? `${path}/${entry.name}` : entry.name;

        if (supportsAbortController && state.imageAbortController) {
            state.imageAbortController.abort();
        }
        state.imageAbortController = supportsAbortController ? new AbortController() : null;

        if (imageViewer) {
            imageViewer.src = "";
            imageViewer.classList.add("hidden");
        }
        updateImageInfo({ repo: repoName, path: filePath, size: entry.size });
        setImagePlaceholder("finder.loadingImage", { name: entry.name });

        const finalize = (src) => {
            if (!imageViewer) return;
            imageViewer.onload = () => {
                const natural = `${imageViewer.naturalWidth} × ${imageViewer.naturalHeight}px`;
                updateImageInfo({ repo: repoName, path: filePath, size: entry.size, dimensions: natural });
                setImagePlaceholder("");
                imageViewer.classList.remove("hidden");
                renderApplicationMenu('image-modal');
                if (viewerDialog && typeof viewerDialog.bringToFront === "function") {
                    viewerDialog.bringToFront();
                }
            };
            imageViewer.onerror = () => {
                setImagePlaceholder("finder.imageLoadError");
                imageViewer.classList.add("hidden");
                renderApplicationMenu('image-modal');
            };
            imageViewer.src = src;
        };

        const downloadUrl = entry.download_url;
        if (downloadUrl) {
            finalize(downloadUrl);
            return;
        }

        const fetchOptions = supportsAbortController && state.imageAbortController
            ? withGithubOptions({ signal: state.imageAbortController.signal })
            : withGithubOptions();

        fetch(repoPathToUrl(repoName, filePath), fetchOptions)
            .then(res => {
                assertGithubResponseOk(res);
                return res.json();
            })
            .then(data => {
                if (!data || typeof data !== "object" || data.type !== "file") {
                    throw new Error("Unerwartetes Antwortformat beim Laden einer Bilddatei.");
                }
                if (typeof data.download_url === "string") {
                    finalize(data.download_url);
                    return;
                }
                if (data.encoding === "base64" && typeof data.content === "string") {
                    const cleaned = data.content.replace(/\s/g, "");
                    finalize(`data:${data.content_type || "image/*"};base64,${cleaned}`);
                    return;
                }
                throw new Error("Keine Quelle für das Bild verfügbar.");
            })
            .catch(err => {
                if (err.name === "AbortError") {
                    return;
                }
                if (isRateLimitError(err)) {
                    setImagePlaceholder("finder.rateLimit");
                } else {
                    console.error("Fehler beim Laden der Bilddatei:", err);
                    setImagePlaceholder("finder.imageLoadErrorRetry");
                }
            });
    };

    const openTextFileInEditor = (repoName, path, entry) => {
        if (!entry || !entry.name) return;
        const textDialog = ensureTextEditorOpen();
        const filePath = path ? `${path}/${entry.name}` : entry.name;
        const payloadBase = {
            repo: repoName,
            path: filePath,
            fileName: entry.name,
            size: entry.size
        };
        postToTextEditor({
            type: "textEditor:showLoading",
            payload: payloadBase
        });

        const fetchContent = () => {
            if (entry.download_url) {
                return fetch(entry.download_url).then(res => {
                    if (!res.ok) {
                        throw new Error(`Download-URL antwortete mit Status ${res.status}`);
                    }
                    return res.text();
                });
            }
            return fetch(repoPathToUrl(repoName, filePath), withGithubOptions())
                .then(res => {
                    assertGithubResponseOk(res);
                    return res.json();
                })
                .then(fileData => {
                    if (!fileData || typeof fileData !== "object" || fileData.type !== "file") {
                        throw new Error("Unerwartetes Antwortformat beim Laden einer Datei.");
                    }
                    if (fileData.encoding === "base64" && typeof fileData.content === "string") {
                        const decoded = decodeBase64ToText(fileData.content);
                        if (decoded === null) {
                            throw new Error("Base64-Inhalt konnte nicht dekodiert werden.");
                        }
                        return decoded;
                    }
                    if (typeof fileData.download_url === "string") {
                        return fetch(fileData.download_url).then(res => {
                            if (!res.ok) {
                                throw new Error(`Download-URL antwortete mit Status ${res.status}`);
                            }
                            return res.text();
                        });
                    }
                    throw new Error("Keine gültige Quelle für den Dateiinhalt gefunden.");
                });
        };

        fetchContent()
            .then(content => {
                postToTextEditor({
                    type: "textEditor:loadRemoteFile",
                    payload: Object.assign({}, payloadBase, {
                        content
                    })
                });
                if (textDialog && typeof textDialog.bringToFront === "function") {
                    textDialog.bringToFront();
                }
            })
            .catch(err => {
                console.error("Fehler beim Laden der Datei für den Texteditor:", err);
                const messageKey = isRateLimitError(err) ? "textEditor.status.rateLimit" : "finder.fileLoadError";
                postToTextEditor({
                    type: "textEditor:loadError",
                    payload: Object.assign({}, payloadBase, {
                        message: appI18n.translate(messageKey)
                    })
                });
            });
    };

    const showPlaceholder = () => {
        finderPlaceholder.classList.remove("hidden");
        finderMain.classList.add("hidden");
        breadcrumbs.textContent = "";
        fileList.innerHTML = "";
    };

    const renderFileMessage = (messageKey, params) => {
        fileList.innerHTML = "";
        const item = document.createElement("li");
        item.className = "px-4 py-3 text-sm text-gray-500 dark:text-gray-400";
        item.setAttribute("data-i18n", messageKey);
        if (params && Object.keys(params).length > 0) {
            item.setAttribute("data-i18n-params", JSON.stringify(params));
        }
        appI18n.applyTranslations(item);
        fileList.appendChild(item);
    };

    const renderEmptySidebarState = (messageKey) => {
        list.innerHTML = "";
        const item = document.createElement("li");
        item.className = "px-4 py-3 text-sm text-gray-500 dark:text-gray-400";
        item.setAttribute("data-i18n", messageKey);
        appI18n.applyTranslations(item);
        list.appendChild(item);
        showPlaceholder();
    };

    const updateSidebarHighlight = () => {
        state.repoButtons.forEach((button, repoName) => {
            if (repoName === state.selectedRepo) {
                button.classList.add("bg-blue-100", "dark:bg-blue-900/40", "border-l-blue-500", "dark:border-l-blue-400");
            } else {
                button.classList.remove("bg-blue-100", "dark:bg-blue-900/40", "border-l-blue-500", "dark:border-l-blue-400");
            }
        });
    };

    const renderBreadcrumbs = (repoName, path) => {
        breadcrumbs.innerHTML = "";
        const elements = [];

        const createCrumbButton = (label, targetPath) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "text-blue-600 dark:text-blue-400 hover:underline";
            button.textContent = label;
            button.addEventListener("click", () => loadRepoPath(repoName, targetPath));
            return button;
        };

        elements.push(createCrumbButton(repoName, ""));

        if (path) {
            const segments = path.split("/").filter(Boolean);
            let cumulative = "";
            segments.forEach(segment => {
                cumulative = cumulative ? `${cumulative}/${segment}` : segment;
                elements.push(createCrumbButton(segment, cumulative));
            });
        }

        elements.forEach((element, index) => {
            if (index > 0) {
                breadcrumbs.appendChild(document.createTextNode(" / "));
            }
            breadcrumbs.appendChild(element);
        });
    };

    const parentPath = (path) => {
        if (!path) return "";
        const parts = path.split("/").filter(Boolean);
        parts.pop();
        return parts.join("/");
    };

    const storeCacheEntry = (repoName, path, contents) => {
        const normalized = path || "";
        if (!state.contentCache[repoName]) {
            state.contentCache[repoName] = {};
        }
        state.contentCache[repoName][normalized] = contents;
    };

    const readCacheEntry = (repoName, path) => {
        const normalized = path || "";
        return state.contentCache[repoName] ? state.contentCache[repoName][normalized] : undefined;
    };

    const renderFiles = (contents, repoName, path) => {
        fileList.innerHTML = "";
        if (!Array.isArray(contents) || contents.length === 0) {
            renderFileMessage("finder.emptyDirectory");
            return;
        }

        if (path) {
            const li = document.createElement("li");
            const button = document.createElement("button");
            button.type = "button";
            button.className = "w-full text-left px-4 py-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700";
            const backWrapper = document.createElement("span");
            backWrapper.className = "flex items-center gap-2";
            const backIcon = document.createElement("span");
            backIcon.textContent = "◀︎";
            const backLabel = document.createElement("span");
            backLabel.className = "font-medium";
            backLabel.setAttribute("data-i18n", "finder.back");
            appI18n.applyTranslations(backLabel);
            backWrapper.appendChild(backIcon);
            backWrapper.appendChild(backLabel);
            button.appendChild(backWrapper);
            button.addEventListener("click", () => loadRepoPath(repoName, parentPath(path)));
            li.appendChild(button);
            fileList.appendChild(li);
        }

        const sorted = contents.slice().sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name, "de", { sensitivity: "base" });
            }
            return a.type === "dir" ? -1 : 1;
        });

        sorted.forEach(entry => {
            const li = document.createElement("li");
            if (entry.type === "dir") {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition";
                const label = document.createElement("span");
                label.className = "flex items-center gap-2 text-gray-700 dark:text-gray-200";
                const folderIcon = document.createElement("span");
                folderIcon.textContent = "📁";
                const folderName = document.createElement("span");
                folderName.className = "font-medium";
                folderName.textContent = entry.name;
                label.appendChild(folderIcon);
                label.appendChild(folderName);
                const chevron = document.createElement("span");
                chevron.className = "text-gray-400";
                chevron.textContent = "›";
                button.appendChild(label);
                button.appendChild(chevron);
                button.addEventListener("click", () => {
                    const nextPath = path ? `${path}/${entry.name}` : entry.name;
                    loadRepoPath(repoName, nextPath);
                });
                li.appendChild(button);
            } else if (isImageFile(entry.name)) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "w-full text-left px-4 py-3 flex items-center justify-between gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition";
                const label = document.createElement("span");
                label.className = "flex items-center gap-2";
                const fileIcon = document.createElement("span");
                fileIcon.textContent = "🖼️";
                const fileName = document.createElement("span");
                fileName.textContent = entry.name;
                label.appendChild(fileIcon);
                label.appendChild(fileName);
                button.appendChild(label);
                const openHint = document.createElement("span");
                openHint.className = "text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider";
                openHint.setAttribute("data-i18n", "finder.imageViewer");
                appI18n.applyTranslations(openHint);
                button.appendChild(openHint);
                button.addEventListener("click", () => openImageFileInViewer(repoName, path, entry));
                li.appendChild(button);
            } else if (isProbablyTextFile(entry.name)) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "w-full text-left px-4 py-3 flex items-center justify-between gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition";
                const label = document.createElement("span");
                label.className = "flex items-center gap-2";
                const fileIcon = document.createElement("span");
                fileIcon.textContent = "📄";
                const fileName = document.createElement("span");
                fileName.textContent = entry.name;
                label.appendChild(fileIcon);
                label.appendChild(fileName);
                button.appendChild(label);
                const openHint = document.createElement("span");
                openHint.className = "text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider";
                openHint.setAttribute("data-i18n", "finder.textEditor");
                appI18n.applyTranslations(openHint);
                button.appendChild(openHint);
                button.addEventListener("click", () => openTextFileInEditor(repoName, path, entry));
                li.appendChild(button);
            } else {
                const link = document.createElement("a");
                link.href = entry.html_url || entry.download_url || "#";
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.className = "block px-4 py-3 flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition";
                const fileIcon = document.createElement("span");
                fileIcon.textContent = "📄";
                const fileName = document.createElement("span");
                fileName.textContent = entry.name;
                link.appendChild(fileIcon);
                link.appendChild(fileName);
                li.appendChild(link);
            }
            fileList.appendChild(li);
        });
    };

    const repoPathToUrl = (repoName, path) => {
        const encodedSegments = path ? path.split("/").filter(Boolean).map(encodeURIComponent).join("/") : "";
        return `https://api.github.com/repos/${username}/${repoName}/contents${encodedSegments ? "/" + encodedSegments : ""}`;
    };

    const loadRepoPath = (repoName, path = "") => {
        pendingFinderState = null;
        state.selectedRepo = repoName;
        state.selectedPath = path;
        finderPlaceholder.classList.add("hidden");
        finderMain.classList.remove("hidden");
        updateSidebarHighlight();
        renderBreadcrumbs(repoName, path);
        if (repoName) {
            writeFinderState({ repo: repoName, path });
        } else {
            clearFinderState();
        }

        const cached = readCacheEntry(repoName, path);
        if (cached) {
            renderFiles(cached, repoName, path);
            return;
        }

        renderFileMessage("finder.loadingFiles");
        fetch(repoPathToUrl(repoName, path), withGithubOptions())
            .then(res => {
                assertGithubResponseOk(res);
                return res.json();
            })
            .then(contents => {
                if (!Array.isArray(contents)) {
                    throw new Error("Unerwartetes Antwortformat der GitHub API");
                }
                storeCacheEntry(repoName, path, contents);
                renderFiles(contents, repoName, path);
            })
            .catch(err => {
                if (isRateLimitError(err)) {
                    renderFileMessage("finder.rateLimit");
                } else if (isNotFoundError(err)) {
                    renderFileMessage("finder.pathNotFound");
                    if (state.selectedRepo === repoName && state.selectedPath === path) {
                        writeFinderState({ repo: repoName, path: "" });
                    }
                } else {
                    console.error("Fehler beim Laden der Repo-Inhalte:", err);
                    renderFileMessage("finder.filesLoadError");
                }
            });
    };

    const renderRepos = (repos) => {
        list.innerHTML = "";
        state.repoButtons.clear();
        state.repos = Array.isArray(repos) ? repos.slice() : [];
        if (!Array.isArray(repos) || repos.length === 0) {
            clearFinderState();
            renderEmptySidebarState("finder.noRepositories");
            return;
        }

        const locale = appI18n.getActiveLanguage ? appI18n.getActiveLanguage() : "de";
        state.repos
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: "base" }))
            .forEach(repo => {
                const item = document.createElement("li");
                const button = document.createElement("button");
                button.type = "button";
                button.className = "w-full px-4 py-3 text-left flex flex-col gap-1 border-l-4 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition";
                const name = document.createElement("span");
                name.className = "font-semibold text-gray-800 dark:text-gray-100 truncate";
                if (repo.name) {
                    name.textContent = repo.name;
                    name.removeAttribute("data-i18n");
                } else {
                    name.setAttribute("data-i18n", "finder.repoUnnamed");
                    appI18n.applyTranslations(name);
                }
                const description = document.createElement("span");
                description.className = "text-sm text-gray-500 dark:text-gray-400 truncate";
                if (repo.description) {
                    description.textContent = repo.description;
                    description.removeAttribute("data-i18n");
                } else {
                    description.setAttribute("data-i18n", "finder.repoDescriptionMissing");
                    appI18n.applyTranslations(description);
                }
                button.appendChild(name);
                button.appendChild(description);
                item.appendChild(button);
                list.appendChild(item);
                if (repo.name) {
                    button.addEventListener("click", () => loadRepoPath(repo.name, ""));
                    state.repoButtons.set(repo.name, button);
                } else {
                    button.disabled = true;
                }
            });

        updateSidebarHighlight();

        if (pendingFinderState && typeof pendingFinderState.repo === "string") {
            if (state.repoButtons.has(pendingFinderState.repo)) {
                const target = pendingFinderState;
                pendingFinderState = null;
                loadRepoPath(target.repo, target.path || "");
                return;
            }
            pendingFinderState = null;
            clearFinderState();
        }

        if (state.selectedRepo && state.repoButtons.has(state.selectedRepo)) {
            return;
        }
        if (state.selectedRepo && !state.repoButtons.has(state.selectedRepo)) {
            clearFinderState();
            state.selectedRepo = null;
            state.selectedPath = "";
        }
        showPlaceholder();
    };

    const tryRenderCachedRepos = () => {
        const cachedRepos = localStorage.getItem(cacheKey);
        const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
        if (!cachedRepos || !cachedTimestamp) {
            return { served: false, fresh: false };
        }
        try {
            const parsed = JSON.parse(cachedRepos);
            if (!Array.isArray(parsed)) {
                return { served: false, fresh: false };
            }
            renderRepos(parsed);
            const age = Date.now() - parseInt(cachedTimestamp, 10);
            const isFresh = Number.isFinite(age) && age < cacheDuration;
            return { served: true, fresh: isFresh };
        } catch (err) {
            console.warn("Konnte Cache nicht lesen:", err);
            return { served: false, fresh: false };
        }
    };

    const cacheStatus = tryRenderCachedRepos();
    if (cacheStatus.fresh) {
        return;
    }

    fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, withGithubOptions())
        .then(res => {
            assertGithubResponseOk(res);
            return res.json();
        })
        .then(repos => {
            if (!Array.isArray(repos)) {
                throw new Error("Unerwartetes Antwortformat der GitHub API");
            }
            localStorage.setItem(cacheKey, JSON.stringify(repos));
            localStorage.setItem(cacheTimestampKey, Date.now().toString());
            renderRepos(repos);
        })
        .catch(err => {
            console.error("Fehler beim Laden der Repos:", err);
            if (!cacheStatus.served) {
                if (isRateLimitError(err)) {
                    clearFinderState();
                    renderEmptySidebarState("finder.rateLimit");
                } else {
                    renderEmptySidebarState("finder.repositoriesError");
                }
            }
        });
}

// Hilfsfunktionen für das Laden des Parent-Dialogs
function loaded(node) {
    const dialogId = recursiveParentSearch(node);
    if (!dialogId) return null;
    if (window.dialogs && window.dialogs[dialogId]) {
        return window.dialogs[dialogId];
    }
    const dialog = new Dialog(dialogId);
    if (!window.dialogs) {
        window.dialogs = {};
    }
    window.dialogs[dialogId] = dialog;
    return dialog;
}

function recursiveParentSearch(node) {
    if (node.classList != undefined && node.classList.contains("modal")) {
        return node.id.toString();
    }
    else if (node.parentNode == null)
        return null;
    else return recursiveParentSearch(node.parentNode);
}

function updateDockIndicators() {
    // Definiere hier, welche Modale mit welchen Indikatoren verbunden werden sollen.
    const indicatorMappings = [
        { modalId: "projects-modal", indicatorId: "projects-indicator" },
        { modalId: "settings-modal", indicatorId: "settings-indicator" },
        { modalId: "text-modal", indicatorId: "text-indicator" },
        { modalId: "image-modal", indicatorId: "image-indicator" }
    ];
    indicatorMappings.forEach(mapping => {
        const modal = document.getElementById(mapping.modalId);
        const indicator = document.getElementById(mapping.indicatorId);
        if (modal && indicator) {
            // Dot anzeigen, wenn Fenster sichtbar ODER minimiert ist
            const minimized = modal.dataset && modal.dataset.minimized === 'true';
            if (!modal.classList.contains("hidden") || minimized) {
                indicator.classList.remove("hidden");
            } else {
                indicator.classList.add("hidden");
            }
        }
    });
}

// Blendet alle Sektionen der Einstellungen aus und zeigt nur die gewünschte an
function showSettingsSection(section) {
    const allSections = ["settings-general", "settings-display", "settings-about", "settings-network", "settings-battery"];
    allSections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add("hidden");
        }
    });
    const target = document.getElementById(`settings-${section}`);
    if (target) {
        target.classList.remove("hidden");
    }
}

// Klasse zum Verwalten eines Fensters (Modal)
class Dialog {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        if (!this.modal) {
            throw new Error(`Kein Dialog mit der ID ${modalId} gefunden.`);
        }
        this.windowEl = getDialogWindowElement(this.modal);
        this.lastDragPointerX = null;
        this.init();
    }
    init() {
        // Initialisiert Drag & Drop und Resizing
        this.makeDraggable();
        this.makeResizable();
        const closeButton = this.modal.querySelector('.draggable-header button[id^="close-"]');
        if (closeButton) {
            closeButton.style.cursor = 'pointer';
            closeButton.dataset.dialogAction = 'close';
            if (!closeButton.dataset.dialogBoundClose) {
                closeButton.dataset.dialogBoundClose = 'true';
                closeButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.close();
                });
            }
        }
        // Verkabele macOS-ähnliche Titelbar-Buttons (Gelb = Minimize, Grün = Maximize)
        const minimizeEl = this.modal.querySelector('.draggable-header .bg-yellow-500.rounded-full');
        const maximizeEl = this.modal.querySelector('.draggable-header .bg-green-500.rounded-full');
        if (minimizeEl) {
            minimizeEl.style.cursor = 'pointer';
            minimizeEl.title = minimizeEl.title || 'Minimieren';
            minimizeEl.dataset.dialogAction = 'minimize';
            minimizeEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.minimize();
            });
        }
        if (maximizeEl) {
            maximizeEl.style.cursor = 'pointer';
            maximizeEl.title = maximizeEl.title || 'Maximieren';
            maximizeEl.dataset.dialogAction = 'maximize';
            maximizeEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMaximize();
            });
        }
    }
    open() {
        hideMenuDropdowns();
        this.modal.classList.remove("hidden");
        // Öffnen hebt Minimiert-Status auf
        if (this.modal.dataset) {
            delete this.modal.dataset.minimized;
        }
        this.bringToFront();
        this.enforceMenuBarBoundary();
        saveOpenModals();
        updateDockIndicators();
        updateProgramLabelByTopModal();
    }
    close() {
        if (this.modal.classList.contains("hidden")) return;
        this.modal.classList.add("hidden");
        saveOpenModals();
        updateDockIndicators();
        updateProgramLabelByTopModal();
    }
    minimize() {
        // Markiere als minimiert und blende das Fenster aus, Dock-Anzeige bleibt erhalten
        if (this.modal.dataset) this.modal.dataset.minimized = 'true';
        if (!this.modal.classList.contains('hidden')) {
            this.modal.classList.add('hidden');
        }
        saveOpenModals();
        updateDockIndicators();
        updateProgramLabelByTopModal();
    }
    toggleMaximize() {
        const target = this.windowEl || this.modal;
        if (!target) return;
        // Wenn das Fenster angedockt ist, zunächst lösen, um konsistente Maße zu erhalten
        this.unsnap({ silent: true });
        const ds = this.modal.dataset || {};
        const isMax = ds.maximized === 'true';
        if (isMax) {
            // Zurücksetzen auf vorherige Größe/Position
            if (ds.prevLeft !== undefined) target.style.left = ds.prevLeft;
            if (ds.prevTop !== undefined) target.style.top = ds.prevTop;
            if (ds.prevWidth !== undefined) target.style.width = ds.prevWidth;
            if (ds.prevHeight !== undefined) target.style.height = ds.prevHeight;
            if (ds.prevPosition !== undefined) target.style.position = ds.prevPosition;
            delete this.modal.dataset.maximized;
            delete this.modal.dataset.prevLeft;
            delete this.modal.dataset.prevTop;
            delete this.modal.dataset.prevWidth;
            delete this.modal.dataset.prevHeight;
            delete this.modal.dataset.prevPosition;
            this.enforceMenuBarBoundary();
            saveWindowPositions();
            return;
        }
        // Speichere aktuelle Größe/Position
        const computed = window.getComputedStyle(target);
        this.modal.dataset.prevLeft = target.style.left || computed.left || '';
        this.modal.dataset.prevTop = target.style.top || computed.top || '';
        this.modal.dataset.prevWidth = target.style.width || computed.width || '';
        this.modal.dataset.prevHeight = target.style.height || computed.height || '';
        this.modal.dataset.prevPosition = target.style.position || computed.position || '';
        // Auf maximierte Größe setzen (unterhalb der Menüleiste)
        const minTop = Math.round(getMenuBarBottom());
        target.style.position = 'fixed';
        target.style.left = '0px';
        target.style.top = `${minTop}px`;
        target.style.width = '100vw';
        // Höhe: restlicher Platz unterhalb der Menüleiste
        target.style.height = `calc(100vh - ${minTop}px)`;
        // Dock-Reserve berücksichtigen
        try {
            const __dockReserve = getDockReservedBottom();
            const __maxHeight = Math.max(0, (window.innerHeight || 0) - minTop - __dockReserve);
            target.style.height = `${__maxHeight}px`;
        } catch (e) { /* noop */ }
        this.modal.dataset.maximized = 'true';
        this.bringToFront();
        saveWindowPositions();
    }
    snapTo(side, options = {}) {
        const target = this.windowEl || this.modal;
        if (!target) return null;
        if (side !== 'left' && side !== 'right') return null;
        const { silent = false } = options;
        const ds = this.modal.dataset || {};
        const alreadySnapped = ds.snapped;
        if (!alreadySnapped) {
            const computed = window.getComputedStyle(target);
            ds.prevSnapLeft = target.style.left || computed.left || '';
            ds.prevSnapTop = target.style.top || computed.top || '';
            ds.prevSnapWidth = target.style.width || computed.width || '';
            ds.prevSnapHeight = target.style.height || computed.height || '';
            ds.prevSnapPosition = target.style.position || computed.position || '';
            ds.prevSnapRight = target.style.right || computed.right || '';
            ds.prevSnapBottom = target.style.bottom || computed.bottom || '';
        }
        const metrics = computeSnapMetrics(side);
        if (!metrics) {
            this.unsnap({ silent: true });
            return null;
        }
        target.style.position = 'fixed';
        target.style.top = `${metrics.top}px`;
        target.style.left = `${metrics.left}px`;
        target.style.width = `${metrics.width}px`;
        // exakte Höhe unter Berücksichtigung des Docks
        target.style.height = `${metrics.height}px`;
        target.style.right = '';
        target.style.bottom = '';
        ds.snapped = side;
        this.bringToFront();
        hideSnapPreview();
        if (!silent) {
            saveWindowPositions();
        }
        return side;
    }
    unsnap(options = {}) {
        const target = this.windowEl || this.modal;
        if (!target) return false;
        const { silent = false } = options;
        const ds = this.modal.dataset || {};
        if (!ds.snapped) return false;
        const restore = (key, prop) => {
            if (Object.prototype.hasOwnProperty.call(ds, key)) {
                const value = ds[key];
                if (value === '') {
                    target.style[prop] = '';
                } else {
                    target.style[prop] = value;
                }
                delete ds[key];
            } else {
                target.style[prop] = '';
            }
        };
        restore('prevSnapLeft', 'left');
        restore('prevSnapTop', 'top');
        restore('prevSnapWidth', 'width');
        restore('prevSnapHeight', 'height');
        restore('prevSnapPosition', 'position');
        restore('prevSnapRight', 'right');
        restore('prevSnapBottom', 'bottom');
        delete ds.snapped;
        hideSnapPreview();
        this.enforceMenuBarBoundary();
        if (!silent) {
            saveWindowPositions();
        }
        return true;
    }
    applySnapAfterDrag(target, pointerX) {
        if (!target) {
            hideSnapPreview();
            return null;
        }
        const candidate = this.getSnapCandidate(target, pointerX);
        if (candidate) {
            const side = this.snapTo(candidate, { silent: true });
            hideSnapPreview();
            return side;
        }
        this.unsnap({ silent: true });
        hideSnapPreview();
        return null;
    }
    getSnapCandidate(target, pointerX) {
        if (!target) return null;
        const viewportWidth = Math.max(window.innerWidth || 0, 0);
        if (viewportWidth <= 0) return null;
        const threshold = Math.max(3, Math.min(14, viewportWidth * 0.0035));
        const rect = target.getBoundingClientRect();
        const pointerDistLeft = typeof pointerX === 'number' ? Math.max(0, pointerX) : Math.abs(rect.left);
        if (Math.abs(rect.left) <= threshold || pointerDistLeft <= threshold) {
            return 'left';
        }
        const distRight = viewportWidth - rect.right;
        const pointerDistRight = typeof pointerX === 'number' ? Math.max(0, viewportWidth - pointerX) : Math.abs(distRight);
        if (Math.abs(distRight) <= threshold || pointerDistRight <= threshold) {
            return 'right';
        }
        return null;
    }
    bringToFront() {
        // Erhöhe den globalen Z-Index‑Zähler und setze diesen Dialog nach vorn.
        // Durch das Hochzählen bleiben bestehende Reihenfolgen erhalten und verhindern, dass
        // ein anderer Dialog versehentlich überlagert wird. Sichtbare Modale werden nicht
        // zurückgesetzt, wodurch ständige Umsortierungen verhindert werden.
        topZIndex = (typeof topZIndex === 'number' ? topZIndex : 1000) + 1;
        const zValue = topZIndex.toString();
        this.modal.style.zIndex = zValue;
        if (this.windowEl) {
            this.windowEl.style.zIndex = zValue;
        }
    }
    refocus() {
        // Wird aufgerufen, wenn innerhalb des Modals geklickt wird
        this.bringToFront();
        hideMenuDropdowns();
        saveOpenModals();
        updateProgramLabelByTopModal();
    }
    makeDraggable() {
        const header = this.modal.querySelector('.draggable-header');
        const target = this.windowEl || this.modal;
        if (!header || !target) return;
        header.style.cursor = 'move';
        let offsetX = 0, offsetY = 0;
        header.addEventListener('mousedown', (e) => {
            this.refocus();
            // Wenn auf einen Steuerungs-Button geklickt wird (schließen/minimieren/maximieren), kein Drag starten
            if (e.target.closest('button[id^="close-"]')) return;
            if (e.target.closest('[data-dialog-action]')) return;
            // Beim maximierten Fenster kein Drag
            if (this.modal.dataset && this.modal.dataset.maximized === 'true') return;
            const pointerX = e.clientX;
            const pointerY = e.clientY;
            const initialSnapSide = this.modal.dataset ? this.modal.dataset.snapped : null;
            let rect = target.getBoundingClientRect();
            let localOffsetX = pointerX - rect.left;
            let localOffsetY = pointerY - rect.top;
            if (initialSnapSide) {
                const preservedOffsetX = localOffsetX;
                const preservedOffsetY = localOffsetY;
                this.unsnap({ silent: true });
                // Positioniere das Fenster direkt unter dem Cursor mit den gespeicherten Offsets
                const minTopAfterUnsnap = getMenuBarBottom();
                target.style.position = 'fixed';
                target.style.left = `${pointerX - preservedOffsetX}px`;
                target.style.top = `${Math.max(minTopAfterUnsnap, pointerY - preservedOffsetY)}px`;
                rect = target.getBoundingClientRect();
                localOffsetX = pointerX - rect.left;
                localOffsetY = pointerY - rect.top;
            }
            const computedPosition = window.getComputedStyle(target).position;
            // Beim ersten Drag die aktuelle Position einfrieren, damit es nicht springt.
            if (computedPosition === 'static' || computedPosition === 'relative') {
                target.style.position = 'fixed';
            } else if (!target.style.position) {
                target.style.position = computedPosition;
            }
            const minTop = getMenuBarBottom();
            target.style.left = `${pointerX - localOffsetX}px`;
            target.style.top = `${Math.max(minTop, pointerY - localOffsetY)}px`;
            clampWindowToMenuBar(target);
            const adjustedRect = target.getBoundingClientRect();
            offsetX = pointerX - adjustedRect.left;
            offsetY = pointerY - adjustedRect.top;
            this.lastDragPointerX = pointerX;
            // Transparentes Overlay erstellen, um Events abzufangen
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.zIndex = '9999';
            overlay.style.cursor = 'move';
            overlay.style.backgroundColor = 'transparent';
            document.body.appendChild(overlay);
            let isDragging = true;
            let moved = false;
            const cleanup = (shouldSave = true) => {
                if (!isDragging) return;
                isDragging = false;
                overlay.remove();
                overlay.removeEventListener('mousemove', mouseMoveHandler);
                overlay.removeEventListener('mouseup', mouseUpHandler);
                window.removeEventListener('mouseup', mouseUpHandler);
                window.removeEventListener('blur', blurHandler);
                window.removeEventListener('mousemove', mouseMoveHandler);
                hideSnapPreview();
                if (shouldSave) {
                    if (moved) {
                        this.applySnapAfterDrag(target, this.lastDragPointerX);
                    } else if (initialSnapSide) {
                        this.snapTo(initialSnapSide, { silent: true });
                    }
                    saveWindowPositions();
                }
                this.lastDragPointerX = null;
            };
            const mouseMoveHandler = (e) => {
                moved = true;
                window.requestAnimationFrame(() => {
                    const newLeft = e.clientX - offsetX;
                    const newTop = e.clientY - offsetY;
                    const minTop = getMenuBarBottom();
                    target.style.left = newLeft + 'px';
                    target.style.top = Math.max(minTop, newTop) + 'px';
                    this.lastDragPointerX = e.clientX;
                    const candidate = this.getSnapCandidate(target, this.lastDragPointerX);
                    if (candidate) {
                        showSnapPreview(candidate);
                    } else {
                        hideSnapPreview();
                    }
                });
            };
            const mouseUpHandler = () => cleanup(true);
            const blurHandler = () => cleanup(true);
            overlay.addEventListener('mousemove', mouseMoveHandler);
            overlay.addEventListener('mouseup', mouseUpHandler);
            window.addEventListener('mousemove', mouseMoveHandler);
            window.addEventListener('mouseup', mouseUpHandler);
            window.addEventListener('blur', blurHandler);
            e.preventDefault();
        });
    }
    makeResizable() {
        if (this.modal.dataset.noResize === "true") {
            return;
        }
        const target = this.windowEl || this.modal;
        if (!target) return;

        const existingHandles = target.querySelectorAll('.resizer');
        existingHandles.forEach(handle => handle.remove());

        const computedPosition = window.getComputedStyle(target).position;
        if (!computedPosition || computedPosition === 'static') {
            target.style.position = 'relative';
        }

        const ensureFixedPosition = () => {
            const computed = window.getComputedStyle(target);
            const rect = target.getBoundingClientRect();
            if (computed.position === 'static' || computed.position === 'relative') {
                target.style.position = 'fixed';
                target.style.left = rect.left + 'px';
                target.style.top = rect.top + 'px';
            } else {
                if (!target.style.left) target.style.left = rect.left + 'px';
                if (!target.style.top) target.style.top = rect.top + 'px';
            }
        };

        const createHandle = (handle) => {
            const resizer = document.createElement('div');
            resizer.classList.add('resizer', `resizer-${handle.name}`);
            resizer.style.position = 'absolute';
            resizer.style.zIndex = '9999';
            resizer.style.backgroundColor = 'transparent';
            resizer.style.pointerEvents = 'auto';
            resizer.style.touchAction = 'none';
            resizer.style.cursor = handle.cursor;
            Object.assign(resizer.style, handle.style);
            target.appendChild(resizer);

            const startResize = (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.refocus();
                ensureFixedPosition();

                const startX = event.clientX;
                const startY = event.clientY;
                const rect = target.getBoundingClientRect();
                const computed = window.getComputedStyle(target);
                const minWidth = parseFloat(computed.minWidth) || 240;
                const minHeight = parseFloat(computed.minHeight) || 160;

                let startLeft = parseFloat(computed.left);
                let startTop = parseFloat(computed.top);
                if (!Number.isFinite(startLeft)) startLeft = rect.left;
                if (!Number.isFinite(startTop)) startTop = rect.top;

                const startWidth = rect.width;
                const startHeight = rect.height;

                const overlay = document.createElement('div');
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.zIndex = '9999';
                overlay.style.cursor = handle.cursor;
                overlay.style.backgroundColor = 'transparent';
                overlay.style.touchAction = 'none';
                document.body.appendChild(overlay);

                let resizing = true;

                const applySize = (clientX, clientY) => {
                    if (!resizing) return;
                    window.requestAnimationFrame(() => {
                        const dx = clientX - startX;
                        const dy = clientY - startY;

                        let newWidth = startWidth;
                        let newHeight = startHeight;
                        let newLeft = startLeft;
                        let newTop = startTop;

                        if (handle.directions.includes('e')) {
                            newWidth = startWidth + dx;
                        }
                        if (handle.directions.includes('s')) {
                            newHeight = startHeight + dy;
                        }
                        if (handle.directions.includes('w')) {
                            newWidth = startWidth - dx;
                            newLeft = startLeft + dx;
                        }
                        if (handle.directions.includes('n')) {
                            newHeight = startHeight - dy;
                            newTop = startTop + dy;
                        }

                        if (newWidth < minWidth) {
                            const deficit = minWidth - newWidth;
                            if (handle.directions.includes('w')) {
                                newLeft -= deficit;
                            }
                            newWidth = minWidth;
                        }
                        if (newHeight < minHeight) {
                            const deficit = minHeight - newHeight;
                            if (handle.directions.includes('n')) {
                                newTop -= deficit;
                            }
                            newHeight = minHeight;
                        }

                        const minTop = getMenuBarBottom();
                        if (handle.directions.includes('n') && newTop < minTop) {
                            const overshoot = minTop - newTop;
                            newTop = minTop;
                            newHeight = Math.max(minHeight, newHeight - overshoot);
                        }

                        if (handle.directions.includes('w') || handle.directions.includes('e')) {
                            target.style.width = Math.max(minWidth, newWidth) + 'px';
                        }
                        if (handle.directions.includes('s') || handle.directions.includes('n')) {
                            target.style.height = Math.max(minHeight, newHeight) + 'px';
                        }
                        if (handle.directions.includes('w')) {
                            target.style.left = newLeft + 'px';
                        }
                        if (handle.directions.includes('n')) {
                            target.style.top = newTop + 'px';
                        }
                    });
                };

                const stopResize = () => {
                    if (!resizing) return;
                    resizing = false;
                    overlay.remove();
                    overlay.removeEventListener('mousemove', overlayMouseMove);
                    overlay.removeEventListener('mouseup', overlayMouseUp);
                    window.removeEventListener('mousemove', windowMouseMove);
                    window.removeEventListener('mouseup', windowMouseUp);
                    window.removeEventListener('blur', onBlur);
                    clampWindowToMenuBar(target);
                    saveWindowPositions();
                };

                const overlayMouseMove = (moveEvent) => applySize(moveEvent.clientX, moveEvent.clientY);
                const windowMouseMove = (moveEvent) => applySize(moveEvent.clientX, moveEvent.clientY);
                const overlayMouseUp = () => stopResize();
                const windowMouseUp = () => stopResize();
                const onBlur = () => stopResize();

                overlay.addEventListener('mousemove', overlayMouseMove);
                overlay.addEventListener('mouseup', overlayMouseUp);
                window.addEventListener('mousemove', windowMouseMove);
                window.addEventListener('mouseup', windowMouseUp);
                window.addEventListener('blur', onBlur);
            };

            resizer.addEventListener('mousedown', startResize);
        };

        target.style.overflow = 'visible';

        const handles = [
            {
                name: 'top',
                cursor: 'n-resize',
                directions: ['n'],
                style: { top: '-4px', left: '12px', right: '12px', height: '8px' }
            },
            {
                name: 'bottom',
                cursor: 's-resize',
                directions: ['s'],
                style: { bottom: '-4px', left: '12px', right: '12px', height: '8px' }
            },
            {
                name: 'left',
                cursor: 'w-resize',
                directions: ['w'],
                style: { left: '-4px', top: '12px', bottom: '12px', width: '8px' }
            },
            {
                name: 'right',
                cursor: 'e-resize',
                directions: ['e'],
                style: { right: '-4px', top: '12px', bottom: '12px', width: '8px' }
            },
            {
                name: 'top-left',
                cursor: 'nw-resize',
                directions: ['n', 'w'],
                style: { top: '-6px', left: '-6px', width: '14px', height: '14px' }
            },
            {
                name: 'top-right',
                cursor: 'ne-resize',
                directions: ['n', 'e'],
                style: { top: '-6px', right: '-6px', width: '14px', height: '14px' }
            },
            {
                name: 'bottom-left',
                cursor: 'sw-resize',
                directions: ['s', 'w'],
                style: { bottom: '-6px', left: '-6px', width: '14px', height: '14px' }
            },
            {
                name: 'bottom-right',
                cursor: 'se-resize',
                directions: ['s', 'e'],
                style: {
                    bottom: '-6px',
                    right: '-6px',
                    width: '14px',
                    height: '14px'
                }
            }
        ];

        handles.forEach(createHandle);
    }
    enforceMenuBarBoundary() {
        clampWindowToMenuBar(this.windowEl || this.modal);
    }
    loadIframe(url) {
        // Creates or reuses a dedicated content container for iframes
        let contentArea = this.modal.querySelector('.dialog-content');
        if (!contentArea) {
            contentArea = document.createElement('div');
            contentArea.classList.add('dialog-content');
            contentArea.style.width = "100%";
            contentArea.style.height = "100%";
            this.modal.appendChild(contentArea);
        }
        // Clear any previous contents (e.g. existing iframes)
        contentArea.innerHTML = "";
        const iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        // allow attribute to permit fullscreen etc.
        iframe.setAttribute("allow", "fullscreen");
        contentArea.appendChild(iframe);
        // When the iframe finishes loading its content we attempt to hook into its document
        iframe.addEventListener("load", () => {
            try {
                // Attach a mousedown listener to the iframe's document so that any click inside the
                // iframe (e.g. inside a contenteditable region) will refocus this modal. We also
                // attach to the window as a fallback. Same-origin policy allows this for local files.
                const cw = iframe.contentWindow;
                if (cw && cw.document) {
                    const handler = () => {
                        // Defer bringing to front slightly to allow other event handlers to complete
                        requestAnimationFrame(() => {
                            this.refocus();
                        });
                    };
                    ['mousedown', 'click', 'touchstart'].forEach(evt => {
                        cw.document.addEventListener(evt, handler);
                    });
                } else if (cw) {
                    ['mousedown', 'click', 'touchstart'].forEach(evt => {
                        cw.addEventListener(evt, () => {
                            requestAnimationFrame(() => {
                                this.refocus();
                            });
                        });
                    });
                }
            } catch (err) {
                console.error("Could not attach mousedown event in iframe:", err);
            }
        });
    }
    // Optional: speichert den Zustand des Fensters
    saveState() {
        return {
            left: this.modal.style.left,
            top: this.modal.style.top,
            width: this.modal.style.width,
            height: this.modal.style.height,
            zIndex: this.modal.style.zIndex,
        };
    }
    // Optional: restauriert einen gespeicherten Zustand
    restoreState(state) {
        if (!state) return;
        if (state.left) this.modal.style.left = state.left;
        if (state.top) this.modal.style.top = state.top;
        if (state.width) this.modal.style.width = state.width;
        if (state.height) this.modal.style.height = state.height;
        if (state.zIndex) this.modal.style.zIndex = state.zIndex;
    }
}
