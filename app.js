// app.js
tailwind.config = { darkMode: 'media' };
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
}

let topZIndex = 1000;

// Falls noch nicht vorhanden, kannst du dies auch in den DOMContentLoaded-Handler einfügen, um 
// sicherzustellen, dass alle Modale den Klick-Listener erhalten:
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
    makeResizable("projects-modal");

    window.dialogs = {};
    window.dialogs["projects-modal"] = new Dialog("projects-modal");
    window.dialogs["about-modal"] = new Dialog("about-modal");
    window.dialogs["settings-modal"] = new Dialog("settings-modal");
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
    const modalIds = ["projects-modal", "about-modal", "settings-modal"];
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
    const closeProjectsButton = document.getElementById("close-projects-modal");
    const closeAboutButton = document.getElementById("close-about-modal");
    const closeSettingsButton = document.getElementById("close-settings-modal");

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

    if (closeProjectsButton) {
        closeProjectsButton.addEventListener("click", function () {
            window.dialogs["projects-modal"].close();
            updateProgramLabelByTopModal();
            saveOpenModals();
        });
    }
    if (closeAboutButton) {
        closeAboutButton.addEventListener("click", function () {
            window.dialogs["about-modal"].close();
            updateProgramLabelByTopModal();
            saveOpenModals();
        });
    }
    if (closeSettingsButton) {
        closeSettingsButton.addEventListener("click", function () {
            window.dialogs["settings-modal"].close();
            updateProgramLabelByTopModal();
            saveOpenModals();
        });
    }
}

// Zustandsspeicherung: Offene Fenster speichern
const modalIds = ["projects-modal", "about-modal", "settings-modal"];
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
        if (el) { positions[id] = { left: el.style.left || "", top: el.style.top || "" }; }
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
        }
    });
}

function makeResizable(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    // Erstelle einen Resizer, der im rechten unteren Eck positioniert wird
    const resizer = document.createElement('div');
    resizer.style.width = "16px";
    resizer.style.height = "16px";
    resizer.style.position = "absolute";
    resizer.style.right = "0";
    resizer.style.bottom = "0";
    resizer.style.cursor = "se-resize";
    // Hintergrundfarbe für den Resizer; im Dark Mode könntest du diesen Wert anpassen
    resizer.style.background = "rgba(0, 0, 0, 0.2)";
    modal.appendChild(resizer);

    resizer.addEventListener('mousedown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        let startX = e.clientX;
        let startY = e.clientY;
        let startWidth = parseInt(window.getComputedStyle(modal).width, 10);
        let startHeight = parseInt(window.getComputedStyle(modal).height, 10);

        function onMouseMove(e) {
            window.requestAnimationFrame(() => {
                let newWidth = startWidth + e.clientX - startX;
                let newHeight = startHeight + e.clientY - startY;
                modal.style.width = newWidth + "px";
                modal.style.height = newHeight + "px";
            });
        }
        function onMouseUp(e) {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            saveWindowPositions(); // Speichert die neue Größe im localStorage
        }
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
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

function updateDockIndicators() {
    const projectsModal = document.getElementById("projects-modal");
    const projectsIndicator = document.getElementById("projects-indicator");
    if (projectsModal && projectsIndicator) {
        if (!projectsModal.classList.contains("hidden")) {
            projectsIndicator.classList.remove("hidden");
        } else {
            projectsIndicator.classList.add("hidden");
        }
    }
    const settingsModal = document.getElementById("settings-modal");
    const settingsIndicator = document.getElementById("settings-indicator");
    if (settingsModal && settingsIndicator) {
        if (!settingsModal.classList.contains("hidden")) {
            settingsIndicator.classList.remove("hidden");
        } else {
            settingsIndicator.classList.add("hidden");
        }
    }
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
    }

    open() {
        this.modal.classList.remove("hidden");
        this.bringToFront();
    }

    close() {
        this.modal.classList.add("hidden");
    }

    bringToFront() {
        // Liste aller relevanten Modal-IDs – passe die Liste an, falls du weitere Dialoge hast.
        const modalIds = ["projects-modal", "about-modal", "settings-modal"];
        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.style.zIndex = 1000; // Basiswert für alle Fenster
            }
        });
        // Setze dem aktuellen Fenster einen höheren z-Index, damit es oben liegt.
        this.modal.style.zIndex = 1010;
    }

    makeDraggable() {
        // Sucht innerhalb des Modals nach einer draggablen Kopfzeile.
        const header = this.modal.querySelector('.draggable-header');
        if (!header) return;
        header.style.cursor = 'move';
        let offsetX = 0, offsetY = 0;
        header.addEventListener('mousedown', (e) => {
            offsetX = e.clientX - this.modal.getBoundingClientRect().left;
            offsetY = e.clientY - this.modal.getBoundingClientRect().top;
            // Stelle sicher, dass das Modal per absolute Positionierung frei bewegbar ist.
            if (getComputedStyle(this.modal).position !== 'absolute') {
                this.modal.style.position = 'absolute';
            }
            const mouseMoveHandler = (e) => {
                window.requestAnimationFrame(() => {
                    this.modal.style.left = (e.clientX - offsetX) + 'px';
                    this.modal.style.top = (e.clientY - offsetY) + 'px';
                });
            };
            const mouseUpHandler = (e) => {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
                // Optionale Speicherung: this.saveState(); wenn du Zustände persistieren möchtest.
            };
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
            e.preventDefault();
        });
    }

    makeResizable() {
        // Erstellt einen Resizer im rechten unteren Eck, falls nicht bereits vorhanden.
        if (this.modal.querySelector('.resizer')) return;  // nur einmal hinzufügen
        const resizer = document.createElement('div');
        resizer.classList.add('resizer');
        resizer.style.width = "32px";
        resizer.style.height = "32px";
        resizer.style.position = "absolute";
        resizer.style.right = "0";
        resizer.style.bottom = "0";
        resizer.style.cursor = "se-resize";
        resizer.style.background = "rgba(0, 0, 0, 0.2)";
        this.modal.appendChild(resizer);

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = parseInt(window.getComputedStyle(this.modal).width, 10);
            const startHeight = parseInt(window.getComputedStyle(this.modal).height, 10);
            const mouseMoveHandler = (e) => {
                window.requestAnimationFrame(() => {
                    let newWidth = startWidth + e.clientX - startX;
                    let newHeight = startHeight + e.clientY - startY;
                    this.modal.style.width = newWidth + "px";
                    this.modal.style.height = newHeight + "px";
                });
            };
            const mouseUpHandler = (e) => {
                document.removeEventListener("mousemove", mouseMoveHandler);
                document.removeEventListener("mouseup", mouseUpHandler);
                // Optional: this.saveState(); wenn du die neue Größe persistieren möchtest.
            };
            document.addEventListener("mousemove", mouseMoveHandler);
            document.addEventListener("mouseup", mouseUpHandler);
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