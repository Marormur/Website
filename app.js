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

document.addEventListener('DOMContentLoaded', function () {
    // Wenn auf einen sichtbaren Modalcontainer geklickt wird, hole das Fenster in den Vordergrund
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function (e) {
            // Verhindere, dass Klicks auf interaktive Elemente im Modal den Fokuswechsel stören.
            if (e.target === modal || modal.contains(e.target)) {
                bringDialogToFront(modal.id);
                updateProgramLabelByTopModal();
            }
        });
    });

    initEventHandlers();
    restoreOpenModals();
    restoreWindowPositions();
    loadGithubRepos();

    // Erzeuge globale Dialog-Instanzen für jede App
    window.dialogs = {};
    window.dialogs["projects-modal"] = new Dialog("projects-modal");
    // Inhalte können direkt in das Modal gerendert werden; optional: iframe laden
    window.dialogs["about-modal"] = new Dialog("about-modal");
    window.dialogs["settings-modal"] = new Dialog("settings-modal");
    window.dialogs["settings-modal"].loadIframe("./settings.html");
    window.dialogs["text-modal"] = new Dialog("text-modal");
    // Lädt den Rich‑Text‑Editor in einem IFrame und registriert einen mousedown‑Handler
    // damit Klicks im Editorfenster das Modal in den Vordergrund holen.
    window.dialogs["text-modal"].loadIframe("./text.html");
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

    document.addEventListener('click', function () {
        if (profileDropdown) {
            profileDropdown.classList.add('hidden');
        }
        if (programDropdown) {
            programDropdown.classList.add('hidden');
        }
    });

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
                }
                updateProgramLabelByTopModal();
                saveOpenModals();
                updateDockIndicators();
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
        const el = document.getElementById(id);
        if (el) el.classList.remove("hidden");
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
    });
}

// Lädt GitHub-Repositories und cached sie im LocalStorage
function loadGithubRepos() {
    const username = "Marormur";
    const cacheKey = `githubRepos_${username}`;
    const cacheTimestampKey = `githubReposTimestamp_${username}`;
    const cacheDuration = 1000 * 60 * 60; // 1 Stunde
    function loadRepos(repos) {
        const list = document.getElementById("repo-list");
        list.innerHTML = "";
        if (Array.isArray(repos)) {
            repos.forEach(repo => {
                const item = document.createElement("li");
                item.innerHTML = `
                    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition">
                        <h3 class="text-xl font-semibold mb-2">
                          <a href="${repo.html_url}" target="_blank" class="text-blue-600 hover:underline">${repo.name}</a>
                        </h3>
                        <p>${repo.description || "Keine Beschreibung"}</p>
                    </div>
                `;
                list.appendChild(item);
            });
        } else {
            console.error("Unerwartetes API-Response-Format:", repos);
        }
    }
    const cachedRepos = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
    if (cachedRepos && cachedTimestamp) {
        const age = Date.now() - parseInt(cachedTimestamp, 10);
        if (age < cacheDuration) {
            const repos = JSON.parse(cachedRepos);
            loadRepos(repos);
            return;
        }
    }
    fetch(`https://api.github.com/users/${username}/repos`)
        .then(res => res.json())
        .then(repos => {
            localStorage.setItem(cacheKey, JSON.stringify(repos));
            localStorage.setItem(cacheTimestampKey, Date.now().toString());
            loadRepos(repos);
        })
        .catch(err => {
            console.error("Fehler beim Laden der Repos:", err);
        });
}

// Hilfsfunktionen für das Laden des Parent-Dialogs
function loaded(node) {
    var dialog = new Dialog(recursiveParentSearch(node));
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
        restoreWindowPositions();
    }
    open() {
        this.modal.classList.remove("hidden");
        this.bringToFront();
        saveOpenModals();
        updateDockIndicators();
    }
    close() {
        this.modal.classList.add("hidden");
        updateProgramLabelByTopModal();
        updateProgramLabelByTopModal();
        updateDockIndicators();
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
                    target.style.left = (e.clientX - offsetX) + 'px';
                    target.style.top = (e.clientY - offsetY) + 'px';
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
