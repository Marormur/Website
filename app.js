// app.js

let topZIndex = 1000;
function bringToFront(modalId) {
    topZIndex++;
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.zIndex = topZIndex;
    }
}

// Falls noch nicht vorhanden, kannst du dies auch in den DOMContentLoaded-Handler einfügen, um 
// sicherzustellen, dass alle Modale den Klick-Listener erhalten:
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function (e) {
            // Verhindere, dass Klicks auf interaktive Elemente im Modal den Fokuswechsel stören.
            // Wir prüfen also, ob der Target-Node das Modal selbst (oder ein direkter Kindknoten) ist.
            if (e.target === modal || modal.contains(e.target)) {
                bringToFront(modal.id);
                updateProgramLabelByTopModal();
            }
        });
    });
});

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
            document.getElementById('about-modal').classList.remove('hidden');
            updateProgramLabelByTopModal();
        });
    }

    if (settingsButton) {
        settingsButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (profileDropdown) profileDropdown.classList.add('hidden');
            document.getElementById('settings-modal').classList.remove('hidden');
            updateProgramLabelByTopModal();
        });
    }

    if (closeProjectsButton) {
        closeProjectsButton.addEventListener("click", function () {
            document.getElementById("projects-modal").classList.add("hidden");
            updateProgramLabelByTopModal();
            saveOpenModals();
        });
    }
    if (closeAboutButton) {
        closeAboutButton.addEventListener("click", function () {
            document.getElementById("about-modal").classList.add("hidden");
            updateProgramLabelByTopModal();
            saveOpenModals();
        });
    }
    if (closeSettingsButton) {
        closeSettingsButton.addEventListener("click", function () {
            document.getElementById("settings-modal").classList.add("hidden");
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

// Drag & Drop für Modale
function makeDraggable(modalId) {
    const modal = document.getElementById(modalId);
    const header = modal.querySelector('.draggable-header');
    if (!header) return;
    header.style.cursor = 'move';
    let offsetX = 0, offsetY = 0;
    header.addEventListener('mousedown', function (e) {
        offsetX = e.clientX - modal.getBoundingClientRect().left;
        offsetY = e.clientY - modal.getBoundingClientRect().top;
        modal.style.position = 'absolute';
        function mouseMoveHandler(e) {
            window.requestAnimationFrame(() => {
                modal.style.left = (e.clientX - offsetX) + 'px';
                modal.style.top = (e.clientY - offsetY) + 'px';
            });
        }
        function mouseUpHandler(e) {
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            saveWindowPositions();
        }
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        e.preventDefault();
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

document.addEventListener('DOMContentLoaded', function () {
    initEventHandlers();
    restoreOpenModals();
    restoreWindowPositions();
    makeDraggable("projects-modal");
    makeDraggable("about-modal");
    makeDraggable("settings-modal");
    loadGithubRepos();
});

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