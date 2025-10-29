/**
 * launchpad.ts
 * Launchpad system for displaying all available applications in a grid
 */

console.log('Launchpad loaded');

(() => {
    'use strict';

    // ===== Types =====

    interface AppItem {
        id: string;
        name: string;
        icon: string;
        programKey: string | null;
    }

    interface LaunchpadSystem {
        init(containerElement: HTMLElement | null): void;
        refresh(): void;
        clearSearch(): void;
        readonly container: HTMLElement | null;
    }

    // Use augmented window from globals.d.ts
    const global = window;

    // ===== State =====
    let container: HTMLElement | null = null;
    let searchInput: HTMLInputElement | null = null;
    let appsGrid: HTMLElement | null = null;
    let allApps: AppItem[] = [];
    let filteredApps: AppItem[] = [];

    // ===== Helper Functions =====

    /**
     * Local translate helper
     */
    function translate(key: string, fallback?: string): string {
        if (!global.appI18n || typeof global.appI18n.translate !== 'function') {
            return fallback || key;
        }
        const result = global.appI18n.translate(key);
        if (result === key && fallback) return fallback;
        return result;
    }

    // ===== Initialization =====

    /**
     * Initialize the Launchpad system
     */
    function init(containerElement: HTMLElement | null): void {
        if (!containerElement) {
            console.warn('LaunchpadSystem: No container element provided');
            return;
        }

        // Prevent re-initialization
        if (container) {
            console.warn('LaunchpadSystem: Already initialized');
            return;
        }

        container = containerElement;
        render();
        loadApps();
    }

    // ===== Rendering =====

    /**
     * Render the Launchpad UI
     */
    function render(): void {
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
        searchInput = container.querySelector<HTMLInputElement>('#launchpad-search-input');
        appsGrid = container.querySelector<HTMLElement>('#launchpad-apps-grid');

        // Attach event listeners
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
    }

    /**
     * Load all available applications from WindowManager
     */
    function loadApps(): void {
        if (!global.WindowManager) {
            console.warn('LaunchpadSystem: WindowManager not available');
            return;
        }

        // Get all registered windows
        const windowIds = global.WindowManager.getAllWindowIds();

        allApps = [];

        windowIds.forEach(windowId => {
            const config = global.WindowManager?.getConfig(windowId);
            const programInfo = global.WindowManager?.getProgramInfo(windowId);

            // Skip transient windows like program-info-modal
            if (config?.type === 'transient') {
                return;
            }

            // Skip the launchpad itself
            if (windowId === 'launchpad-modal') {
                return;
            }

            if (programInfo) {
                const info = programInfo as unknown as {
                    programLabel?: string;
                    icon?: string;
                };
                allApps.push({
                    id: windowId,
                    name: info.programLabel || translate('programs.default.label', 'App'),
                    icon: info.icon || './img/sucher.png',
                    programKey: config?.programKey || null,
                });
            }
        });

        filteredApps = [...allApps];
        renderApps();
    }

    /**
     * Handle search input
     */
    function handleSearch(event: Event): void {
        const target = event.target as HTMLInputElement;
        const query = target.value.toLowerCase().trim();

        if (!query) {
            filteredApps = [...allApps];
        } else {
            filteredApps = allApps.filter(app => app.name.toLowerCase().includes(query));
        }

        renderApps();
    }

    /**
     * Render the apps grid
     */
    function renderApps(): void {
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
            // Use ActionBus to open the app and close Launchpad
            appButton.setAttribute('data-action', 'launchpadOpenWindow');
            appButton.title = app.name;

            const iconContainer = document.createElement('div');
            iconContainer.className = 'launchpad-app-icon';

            // Render icon: image path or emoji
            const isImagePath =
                typeof app.icon === 'string' && /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(app.icon);
            if (
                isImagePath ||
                (typeof app.icon === 'string' &&
                    (app.icon.startsWith('./') || app.icon.startsWith('http')))
            ) {
                const icon = document.createElement('img');
                icon.src = app.icon;
                icon.alt = app.name;
                icon.draggable = false;
                iconContainer.appendChild(icon);
            } else if (typeof app.icon === 'string' && app.icon.trim().length) {
                const emoji = document.createElement('div');
                emoji.className = 'launchpad-app-emoji';
                emoji.textContent = app.icon;
                iconContainer.appendChild(emoji);
            } else {
                const fallback = document.createElement('img');
                fallback.src = './img/sucher.png';
                fallback.alt = app.name;
                fallback.draggable = false;
                iconContainer.appendChild(fallback);
            }

            const label = document.createElement('span');
            label.className = 'launchpad-app-label';
            label.textContent = app.name;

            appButton.appendChild(iconContainer);
            appButton.appendChild(label);

            // No explicit click handler; ActionBus will handle via data-action

            if (appsGrid) {
                appsGrid.appendChild(appButton);
            }
        });
    }

    // ===== Actions =====

    /**
     * Open an application and close Launchpad
     */
    function openApp(windowId: string): void {
        if (!windowId) return;

        // Close Launchpad
        const launchpadModal = document.getElementById('launchpad-modal');
        const launchpadDialog = global.dialogs?.['launchpad-modal'];
        if (launchpadModal && launchpadDialog && 'close' in launchpadDialog) {
            (launchpadDialog as { close(): void }).close();
        } else if (launchpadModal) {
            launchpadModal.classList.add('hidden');
        }

        // Open the selected app
        if (global.WindowManager?.open) {
            global.WindowManager.open(windowId);
            return;
        }
        const dialog = global.dialogs?.[windowId];
        if (dialog && 'open' in dialog && typeof dialog.open === 'function') {
            dialog.open();
        } else {
            const modalElement = document.getElementById(windowId);
            if (modalElement) {
                modalElement.classList.remove('hidden');
                global.bringDialogToFront?.(windowId);
                global.updateProgramLabelByTopModal?.();
            }
        }
    }

    /**
     * Refresh apps list (call when new apps are added)
     */
    function refresh(): void {
        loadApps();
    }

    /**
     * Clear search and reset to all apps
     */
    function clearSearch(): void {
        if (searchInput) {
            searchInput.value = '';
        }
        filteredApps = [...allApps];
        renderApps();
    }

    // ===== Event Listeners =====

    // Listen for language changes and refresh apps
    global.addEventListener('languagePreferenceChange', () => {
        if (container) {
            loadApps();
        }
    });

    // ===== ActionBus Integration =====

    // Register ActionBus action to open window and close launchpad
    if (global.ActionBus?.register) {
        global.ActionBus.register('launchpadOpenWindow', params => {
            const id =
                (params?.windowId as string) ||
                (params?.windowid as string) ||
                (params?.window as string) ||
                (params?.id as string);
            if (id) openApp(id);
        });
    }

    // ===== Global Export =====

    const LaunchpadSystemInstance: LaunchpadSystem = {
        init,
        refresh,
        clearSearch,
        get container() {
            return container;
        },
    };

    global.LaunchpadSystem = LaunchpadSystemInstance;
})();

export {};
