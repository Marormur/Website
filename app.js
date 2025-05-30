tailwind.config = { darkMode: 'media' };
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
}
const modalIds = ["projects-modal", "about-modal", "settings-modal", "text-modal"];

let topZIndex = 1000;

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function (e) {
            // Verhindere, dass Klicks auf interaktive Elemente im Modal den Fokuswechsel stören.
            // Wir prüfen also, ob der Target-Node das Modal selbst (oder ein direkter Kindknoten) ist.
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

    window.dialogs = {};
    window.dialogs["projects-modal"] = new Dialog("projects-modal");
    // window.dialogs["projects-modal"].loadIframe("./projekte.html");
    window.dialogs["about-modal"] = new Dialog("about-modal");
    window.dialogs["settings-modal"] = new Dialog("settings-modal");
    window.dialogs["settings-modal"].loadIframe("./settings.html");
    window.dialogs["text-modal"] = new Dialog("text-modal");
    // window.dialogs["text-modal"].loadIframe("./text.html");
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

// Zentrale Event-Handler
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
function saveWindowPositions() {
    const positions = {};
    modalIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            positions[id] = {
                left: el.style.left || "",
                top: el.style.top || "",
                width: el.style.width || "",
                height: el.style.height || ""
            };
        }
    });
    localStorage.setItem("modalPositions", JSON.stringify(positions));
}

function restoreWindowPositions() {
    const positions = JSON.parse(localStorage.getItem("modalPositions") || "{}");
    Object.keys(positions).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.left = positions[id].left;
            el.style.top = positions[id].top;
            el.style.width = positions[id].width;
            el.style.height = positions[id].height;
        }
    });
}

function loadGithubRepos() {
    const username = "Marormur";
    const cacheKey = `githubRepos_${username}`;
    const cacheTimestampKey = `githubReposTimestamp_${username}`;
    const cacheDuration = 1000 * 60 * 60; // 1 hour
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

function loaded(node) {
    var dialog = new Dialog(recursiveParentSearch(node));
    return dialog;
}

function recursiveParentSearch(node) {
    if (node.classList != undefined && node.classList.contains("modal")) {
        return node.id.toString();
    }
    else if (node.parentNode == null)
        return null
    else return recursiveParentSearch(node.parentNode);
}

function updateDockIndicators() {
    // Definiere hier, welche Modale mit welchen Indikatoren verbunden werden sollen.
    // Passe die Einträge an, falls du neue Dialoge (und entsprechende Indicator-Elemente) hinzufügen möchtest.
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
function showSettingsSection(section) {
    const allSections = ["settings-general", "settings-about", "settings-network", "settings-battery"];
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

function recursiveChildSearch(children) {
    console.log(children);
    for (var child in children) {
        console.log(child)
        if (child.contains('dialog-content'))
            return child;

        temp = this.recursiveChildSearch(child.children);

        if (temp.innerHTML.contains('dialog-content'))
            return temp;
    }

    return null;
}

class Dialog {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        if (!this.modal) {
            throw new Error(`Kein Dialog mit der ID ${modalId} gefunden.`);
        }
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
        // Liste aller relevanten Modal-IDs – passe die Liste an, falls du weitere Dialoge hast.
        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            if (modal && !modal.classList.contains("hidden")) {
                modal.style.zIndex = 1000;
            }
        });
        // Setze dem aktuellen Fenster einen höheren z-Index, damit es oben liegt.
        this.modal.style.zIndex = 1100;
    }

    refocus() {
        console.log("Test");
        this.bringToFront();
        saveOpenModals();
        updateProgramLabelByTopModal();
        // Hier kannst du deinen Testcode einfügen
    }

    makeDraggable() {
        // Sucht innerhalb des Modals nach einer draggablen Kopfzeile.
        const header = this.modal.querySelector('.draggable-header');
        if (!header) return;
        header.style.cursor = 'move';
        let offsetX = 0, offsetY = 0;
        header.addEventListener('mousedown', (e) => {
            this.refocus();
            // Wenn der Klick auf einen Schließen-Button innerhalb der Kopfzeile erfolgt, ignoriere den Drag-Vorgang
            if (e.target.closest('button[title="Schließen"]')) return;
            offsetX = e.clientX - this.modal.getBoundingClientRect().left;
            offsetY = e.clientY - this.modal.getBoundingClientRect().top;

            // Stelle sicher, dass das Modal absolut positioniert ist
            if (getComputedStyle(this.modal).position !== 'absolute') {
                this.modal.style.position = 'absolute';
            }

            // Transparentes Overlay erstellen
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

            const mouseMoveHandler = (e) => {
                window.requestAnimationFrame(() => {
                    this.modal.style.left = (e.clientX - offsetX) + 'px';
                    this.modal.style.top = (e.clientY - offsetY) + 'px';
                });
            };

            const mouseUpHandler = (e) => {
                // Overlay entfernen, sobald der Mausknopf losgelassen wurde
                overlay.remove();
                overlay.removeEventListener('mousemove', mouseMoveHandler);
                overlay.removeEventListener('mouseup', mouseUpHandler);
                document.removeEventListener('mousemove', mouseMoveHandler);
                saveWindowPositions();
            };

            // Eventlistener dem Overlay hinzufügen (statt direkt auf document)
            overlay.addEventListener('mousemove', mouseMoveHandler);
            overlay.addEventListener('mouseup', mouseUpHandler);

            // Verhindere das Standardverhalten
            e.preventDefault();
        });
    }

    makeResizable() {
        // Verwende als Ziel-Element das innere Dialog-Element, falls vorhanden, sonst das Modal selbst.
        const target = this.modal.querySelector('.autopointer') || this.modal;

        // Falls bereits ein Resizer im Ziel-Element existiert, beenden
        if (target.querySelector('.resizer')) return;

        // Sicherstellen, dass das Ziel-Element positioniert ist:
        const computedPosition = window.getComputedStyle(target).position;
        if (!computedPosition || computedPosition === 'static') {
            target.style.position = 'relative';
        }

        // Setze Overflow auf visible, damit der Resizer nicht abgeschnitten wird.
        target.style.overflow = "visible";

        // Erstelle den Resizer.
        const resizer = document.createElement('div');
        resizer.classList.add('resizer');
        resizer.style.width = "20px";
        resizer.style.height = "20px";
        resizer.style.position = "absolute";
        resizer.style.right = "0";
        resizer.style.bottom = "0";
        resizer.style.cursor = "se-resize";
        resizer.style.backgroundColor = "rgba(122, 122, 122, 0.5)";
        resizer.style.zIndex = "9999"; // Damit der Resizer immer sichtbar ist.

        target.appendChild(resizer);

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const computedStyle = window.getComputedStyle(target);
            const startWidth = parseInt(computedStyle.width, 10);
            const startHeight = parseInt(computedStyle.height, 10);

            // Transparentes Overlay erstellen, um alle Mouse-Events abzufangen
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
                // Overlay entfernen und Event-Listener bereinigen
                overlay.remove();
                overlay.removeEventListener('mousemove', mouseMoveHandler);
                overlay.removeEventListener('mouseup', mouseUpHandler);
                document.removeEventListener("mousemove", mouseMoveHandler);
                document.removeEventListener("mouseup", mouseUpHandler);
                saveWindowPositions();
                // Optional: Hier den neuen Zustand speichern
            };

            overlay.addEventListener("mousemove", mouseMoveHandler);
            overlay.addEventListener("mouseup", mouseUpHandler);
        });
    }

    loadIframe(url) {
        // Versuche, einen vorhandenen dialog-content-Bereich zu finden
        let contentArea = this.modal.querySelector('.dialog-content');
        if (!contentArea) {
            contentArea = document.createElement('div');
            contentArea.classList.add('dialog-content');
            contentArea.style.width = "100%";
            contentArea.style.height = "100%";
            this.modal.appendChild(contentArea);
        }
        // Lösche alte Inhalte
        contentArea.innerHTML = "";
        // Erstelle das iframe
        const iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        iframe.setAttribute("allow", "fullscreen");

        contentArea.appendChild(iframe);

        // Sobald das iframe geladen ist, wird in dessen Dokument ein mousedown-Eventlistener registriert,
        // der das Modal in den Vordergrund bringt.
        iframe.addEventListener("load", () => {
            setTimeout(500);
            console.log(iframe.children);
            iframe.parentNode.parentNode.setAttribute("click", "test()");
            console.log(iframe.parentNode.parentNode.outerHTML);

            console.log(iframe.innerHTML);
            if (iframe.innerHTML == "") {
                //iframe.src = iframe.src;
                return;

            }
            try {
                console.log(iframe.src);

                iframe.addEventListener("mousedown", (e) => {
                    this.refocus();
                });
            } catch (err) {
                console.error("Could not attach mousedown event in iframe:", err);
            }
        });
    }
    // Optional: Methode zum Speichern des aktuellen Zustands des Fensters
    saveState() {
        return {
            left: this.modal.style.left,
            top: this.modal.style.top,
            width: this.modal.style.width,
            height: this.modal.style.height,
            zIndex: this.modal.style.zIndex,
        };
    }

    // Optional: Methode zum Wiederherstellen eines gespeicherten Zustands
    restoreState(state) {
        if (!state) return;
        if (state.left) this.modal.style.left = state.left;
        if (state.top) this.modal.style.top = state.top;
        if (state.width) this.modal.style.width = state.width;
        if (state.height) this.modal.style.height = state.height;
        if (state.zIndex) this.modal.style.zIndex = state.zIndex;
    }
}