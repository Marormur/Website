/**
 * launchpad.js
 * Launchpad system for displaying all available applications in a grid
 */
console.log('Launchpad loaded');

(function (global) {
    'use strict';

    // State
    let container = null;
    let searchInput = null;
    let appsGrid = null;
    let allApps = [];
    let filteredApps = [];

    // Local translate helper
    function translate(key, fallback) {
        if (!global.appI18n || typeof global.appI18n.translate !== 'function') {
            return fallback || key;
        }
        const result = global.appI18n.translate(key);
        if (result === key && fallback) return fallback;
        return result;
    }

    /**
     * Initialize the Launchpad system
     */
    function init(containerElement) {
        if (!containerElement) {
            console.warn('LaunchpadSystem: No container element provided');
            return;
        }

        container = containerElement;
        render();
        loadApps();
    }

    /**
     * Render the Launchpad UI
     */
    function render() {
        if (!container) return;

        container.innerHTML = `
            <div class="launchpad-container">
                <div class="launchpad-search">
                    <input 
                        id="launchpad-search-input" 
                        type="text" 
                        placeholder="${translate('modals.launchpad.searchPlaceholder', 'Search apps')}"
                        class="launchpad-search-input"
                    />
                </div>
                <div id="launchpad-apps-grid" class="launchpad-apps-grid">
                    <!-- Apps will be rendered here -->
                </div>
            </div>
        `;

        // Get references
        searchInput = container.querySelector('#launchpad-search-input');
        appsGrid = container.querySelector('#launchpad-apps-grid');

        // Attach event listeners
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
    }

    /**
     * Load all available applications from WindowManager
     */
    function loadApps() {
        if (!global.WindowManager) {
            console.warn('LaunchpadSystem: WindowManager not available');
            return;
        }

        // Get all registered windows
        const windowIds = global.WindowManager.getAllWindowIds();
        
        allApps = [];
        
        windowIds.forEach(windowId => {
            const config = global.WindowManager.getConfig(windowId);
            const programInfo = global.WindowManager.getProgramInfo(windowId);
            
            // Skip transient windows like program-info-modal
            if (config && config.type === 'transient') {
                return;
            }

            // Skip the launchpad itself
            if (windowId === 'launchpad-modal') {
                return;
            }

            if (programInfo) {
                allApps.push({
                    id: windowId,
                    name: programInfo.programLabel || translate('programs.default.label', 'App'),
                    icon: programInfo.icon || './img/sucher.png',
                    programKey: config ? config.programKey : null
                });
            }
        });

        filteredApps = [...allApps];
        renderApps();
    }

    /**
     * Handle search input
     */
    function handleSearch(event) {
        const query = event.target.value.toLowerCase().trim();

        if (!query) {
            filteredApps = [...allApps];
        } else {
            filteredApps = allApps.filter(app => 
                app.name.toLowerCase().includes(query)
            );
        }

        renderApps();
    }

    /**
     * Render the apps grid
     */
    function renderApps() {
        if (!appsGrid) return;

        appsGrid.innerHTML = '';

        if (filteredApps.length === 0) {
            appsGrid.innerHTML = `
                <div class="launchpad-empty">
                    <p>${translate('finder.empty', 'No apps found')}</p>
                </div>
            `;
            return;
        }

        filteredApps.forEach(app => {
            const appButton = document.createElement('button');
            appButton.className = 'launchpad-app-button';
            appButton.setAttribute('data-window-id', app.id);
            appButton.setAttribute('data-action', 'openWindow');
            appButton.title = app.name;

            const iconContainer = document.createElement('div');
            iconContainer.className = 'launchpad-app-icon';

            const icon = document.createElement('img');
            icon.src = app.icon;
            icon.alt = app.name;
            icon.draggable = false;

            iconContainer.appendChild(icon);

            const label = document.createElement('span');
            label.className = 'launchpad-app-label';
            label.textContent = app.name;

            appButton.appendChild(iconContainer);
            appButton.appendChild(label);

            // Click handler
            appButton.addEventListener('click', () => {
                openApp(app.id);
            });

            appsGrid.appendChild(appButton);
        });
    }

    /**
     * Open an application and close Launchpad
     */
    function openApp(windowId) {
        if (!windowId) return;

        // Close Launchpad
        const launchpadModal = document.getElementById('launchpad-modal');
        if (launchpadModal && global.dialogs && global.dialogs['launchpad-modal']) {
            global.dialogs['launchpad-modal'].close();
        } else if (launchpadModal) {
            launchpadModal.classList.add('hidden');
        }

        // Open the selected app
        if (global.WindowManager) {
            const dialog = global.dialogs && global.dialogs[windowId];
            if (dialog && typeof dialog.open === 'function') {
                dialog.open();
            } else {
                const modalElement = document.getElementById(windowId);
                if (modalElement) {
                    modalElement.classList.remove('hidden');
                    if (typeof global.bringDialogToFront === 'function') {
                        global.bringDialogToFront(windowId);
                    }
                    if (typeof global.updateProgramLabelByTopModal === 'function') {
                        global.updateProgramLabelByTopModal();
                    }
                }
            }
        }
    }

    /**
     * Refresh apps list (call when new apps are added)
     */
    function refresh() {
        loadApps();
    }

    /**
     * Clear search and reset to all apps
     */
    function clearSearch() {
        if (searchInput) {
            searchInput.value = '';
        }
        filteredApps = [...allApps];
        renderApps();
    }

    // Export
    global.LaunchpadSystem = {
        init,
        refresh,
        clearSearch
    };

})(window);
