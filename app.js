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
const modalIds = ["projects-modal", "about-modal", "settings-modal", "text-modal"];

// Für zukünftige z‑Index‑Verwaltung reserviert
let topZIndex = 1000;

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

// Funktion, um das aktuell oberste Modal zu ermitteln und den Program-Namen anzupassen
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

function updateProgramLabelByTopModal() {
    const topModal = getTopModal();
    if (topModal) {
        switch (topModal.id) {
            case "projects-modal":
                updateProgramLabel("Sucher");
                break;
            case "settings-modal":
                updateProgramLabel("Systemeinstellungen");
                break;
            case "text-modal":
                updateProgramLabel("Texteditor");
                break;
            default:
                updateProgramLabel("Sucher");
        }
    } else {
        updateProgramLabel("Sucher");
    }
}

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
        dropdownAbout.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (profileDropdown) profileDropdown.classList.add('hidden');
            window.dialogs["about-modal"].open();
            updateProgramLabelByTopModal();
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

    // Vereinheitlichte Registrierung der Close-Button Event Listener:
    const closeMapping = {
        "close-projects-modal": "projects-modal",
        "close-about-modal": "about-modal",
        "close-settings-modal": "settings-modal",
        "close-text-modal": "text-modal"
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
        const el = document.getElementById(id);
        return el && !el.classList.contains("hidden");
    });
    localStorage.setItem("openModals", JSON.stringify(openModals));
}

// Zustandsspeicherung: Offene Fenster wiederherstellen
function restoreOpenModals() {
    const openModals = JSON.parse(localStorage.getItem("openModals") || "[]");
    openModals.forEach(id => {
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

// Lädt GitHub-Repositories und cached sie im LocalStorage
function loadGithubRepos() {
    const username = "Marormur";
    const cacheKey = `githubRepos_${username}`;
    const cacheTimestampKey = `githubReposTimestamp_${username}`;
    const cacheDuration = 1000 * 60 * 60; // 1 Stunde
    const list = document.getElementById("repo-list");
    if (!list) return;

    const renderEmptyState = (message) => {
        list.innerHTML = "";
        const item = document.createElement("li");
        const card = document.createElement("div");
        card.className = "bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-gray-600 dark:text-gray-300";
        card.textContent = message;
        item.appendChild(card);
        list.appendChild(item);
    };

    const renderRepos = (repos) => {
        list.innerHTML = "";
        if (!Array.isArray(repos) || repos.length === 0) {
            renderEmptyState("Keine öffentlichen Repositories gefunden.");
            return;
        }
        repos.forEach(repo => {
            const item = document.createElement("li");
            const card = document.createElement("div");
            card.className = "bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition";

            const title = document.createElement("h3");
            title.className = "text-xl font-semibold mb-2";

            const link = document.createElement("a");
            link.className = "text-blue-600 hover:underline";
            link.href = repo.html_url || "#";
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = repo.name || "Unbenanntes Repository";

            const description = document.createElement("p");
            description.textContent = repo.description || "Keine Beschreibung verfügbar.";

            title.appendChild(link);
            card.appendChild(title);
            card.appendChild(description);
            item.appendChild(card);
            list.appendChild(item);
        });
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

    fetch(`https://api.github.com/users/${username}/repos`)
        .then(res => {
            if (!res.ok) {
                throw new Error(`GitHub API antwortete mit Status ${res.status}`);
            }
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
                renderEmptyState("Repos konnten nicht geladen werden. Bitte versuche es später erneut.");
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
        { modalId: "text-modal", indicatorId: "text-indicator" }
    ];
    indicatorMappings.forEach(mapping => {
        const modal = document.getElementById(mapping.modalId);
        const indicator = document.getElementById(mapping.indicatorId);
        if (modal && indicator) {
            if (!modal.classList.contains("hidden")) {
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
    }
    open() {
        hideMenuDropdowns();
        this.modal.classList.remove("hidden");
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
            // Wenn der Klick auf einen Schließen-Button innerhalb der Kopfzeile erfolgt, ignoriere den Drag-Vorgang
            if (e.target.closest('button[title="Schließen"]')) return;
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
        const target = this.windowEl || this.modal;
        if (target.querySelector('.resizer')) return;
        const computedPosition = window.getComputedStyle(target).position;
        if (!computedPosition || computedPosition === 'static') {
            target.style.position = 'relative';
        }
        target.style.overflow = "visible";
        const resizer = document.createElement('div');
        resizer.classList.add('resizer');
        resizer.style.width = "20px";
        resizer.style.height = "20px";
        resizer.style.position = "absolute";
        resizer.style.right = "0";
        resizer.style.bottom = "0";
        resizer.style.cursor = "se-resize";
        resizer.style.backgroundColor = "rgba(122, 122, 122, 0.5)";
        resizer.style.zIndex = "9999";
        target.appendChild(resizer);
        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const computedStyle = window.getComputedStyle(target);
            const startWidth = parseInt(computedStyle.width, 10);
            const startHeight = parseInt(computedStyle.height, 10);
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.zIndex = '9999';
            overlay.style.cursor = 'se-resize';
            overlay.style.backgroundColor = 'transparent';
            document.body.appendChild(overlay);
            const mouseMoveHandler = (e) => {
                window.requestAnimationFrame(() => {
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;
                    const newWidth = startWidth + dx;
                    const newHeight = startHeight + dy;
                    target.style.width = newWidth + "px";
                    target.style.height = newHeight + "px";
                });
            };
            const mouseUpHandler = (e) => {
                overlay.remove();
                overlay.removeEventListener('mousemove', mouseMoveHandler);
                overlay.removeEventListener('mouseup', mouseUpHandler);
                document.removeEventListener("mousemove", mouseMoveHandler);
                document.removeEventListener("mouseup", mouseUpHandler);
                saveWindowPositions();
            };
            overlay.addEventListener("mousemove", mouseMoveHandler);
            overlay.addEventListener("mouseup", mouseUpHandler);
        });
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
