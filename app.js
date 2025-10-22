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

    if (window.dialogs["settings-modal"]) {
        window.dialogs["settings-modal"].loadIframe("./settings.html");
    }
    if (window.dialogs["text-modal"]) {
        // Lädt den Rich‑Text‑Editor in einem IFrame und registriert einen mousedown‑Handler
        // damit Klicks im Editorfenster das Modal in den Vordergrund holen.
        window.dialogs["text-modal"].loadIframe("./text.html");
    }
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

function hideMenuDropdowns() {
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown) {
        profileDropdown.classList.add('hidden');
    }
    const programDropdown = document.getElementById('program-dropdown');
    if (programDropdown) {
        programDropdown.classList.add('hidden');
    }
}

// Zentrale Event-Handler für Menü und Dropdowns
function initEventHandlers() {
    const profileContainer = document.getElementById('profile-container');
    const profileDropdown = document.getElementById('profile-dropdown');
    const programDropdown = document.getElementById('program-dropdown');
    const programLabel = document.getElementById('program-label');
    const dropdownAbout = document.getElementById('dropdown-about');
    const aboutProgramLink = document.getElementById('about-program');
    const resetLayoutButton = document.getElementById('dropdown-reset-layout');
    const closeProgramButton = document.getElementById('program-close-current');
    const settingsButton = document.getElementById('dropdown-settings');

    profileContainer.addEventListener('click', function (event) {
        if (programDropdown) { programDropdown.classList.add('hidden'); }
        if (profileDropdown) { profileDropdown.classList.toggle('hidden'); }
        event.stopPropagation();
    });

    programLabel.addEventListener('click', function (event) {
        event.stopPropagation();
        if (profileDropdown) profileDropdown.classList.add('hidden');
        if (programDropdown) { programDropdown.classList.toggle('hidden'); }
    });

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
            if (profileDropdown) profileDropdown.classList.add('hidden');
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
            const targetOrigin = window.location ? window.location.origin : '*';
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
                if (viewerDialog && typeof viewerDialog.bringToFront === "function") {
                    viewerDialog.bringToFront();
                }
            };
            imageViewer.onerror = () => {
                setImagePlaceholder("finder.imageLoadError");
                imageViewer.classList.add("hidden");
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
        const minTop = getMenuBarBottom();
        target.style.position = 'fixed';
        target.style.left = '0px';
        target.style.top = `${minTop}px`;
        target.style.width = '100vw';
        // Höhe: restlicher Platz unterhalb der Menüleiste
        target.style.height = `calc(100vh - ${minTop}px)`;
        this.modal.dataset.maximized = 'true';
        this.bringToFront();
        saveWindowPositions();
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
            const rect = target.getBoundingClientRect();
            const computedPosition = window.getComputedStyle(target).position;
            // Beim ersten Drag die aktuelle Position einfrieren, damit es nicht springt.
            if (computedPosition === 'static' || computedPosition === 'relative') {
                target.style.position = 'fixed';
                target.style.left = rect.left + 'px';
                target.style.top = rect.top + 'px';
            } else {
                if (!target.style.left) target.style.left = rect.left + 'px';
                if (!target.style.top) target.style.top = rect.top + 'px';
            }
            clampWindowToMenuBar(target);
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
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
            const cleanup = (shouldSave = true) => {
                if (!isDragging) return;
                isDragging = false;
                overlay.remove();
                overlay.removeEventListener('mousemove', mouseMoveHandler);
                overlay.removeEventListener('mouseup', mouseUpHandler);
                window.removeEventListener('mouseup', mouseUpHandler);
                window.removeEventListener('blur', blurHandler);
                window.removeEventListener('mousemove', mouseMoveHandler);
                if (shouldSave) {
                    saveWindowPositions();
                }
            };
            const mouseMoveHandler = (e) => {
                window.requestAnimationFrame(() => {
                    const newLeft = e.clientX - offsetX;
                    const newTop = e.clientY - offsetY;
                    const minTop = getMenuBarBottom();
                    target.style.left = newLeft + 'px';
                    target.style.top = Math.max(minTop, newTop) + 'px';
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
