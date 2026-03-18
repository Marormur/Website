/**
 * LaunchpadSystem (TypeScript)
 * Displays all registered persistent apps as a grid and opens selected apps.
 */

import logger from '../core/logger.js';
import { translate } from '../services/i18n';
import { WINDOW_ICONS, renderProgramIcon, resolveProgramIcon } from '../windows/window-icons.js';

logger.debug('UI', 'Launchpad (TS) loaded');

(() => {
    'use strict';

    type AppEntry = { id: string; name: string; icon: string; programKey?: string | null };

    const CANONICAL_PROGRAM_WINDOW_IDS: Record<string, string> = {
        'programs.finder': 'finder-modal',
        'programs.terminal': 'terminal',
        'programs.text': 'text-modal',
        'programs.photos': 'image-modal',
    };

    let container: HTMLElement | null = null;
    let searchInput: HTMLInputElement | null = null;
    let appsGrid: HTMLElement | null = null;
    let allApps: AppEntry[] = [];
    let filteredApps: AppEntry[] = [];

    // translate() wird zentral aus i18n.ts importiert

    function init(containerElement: HTMLElement): void {
        if (!containerElement) {
            logger.warn('UI', 'LaunchpadSystem: No container element provided');
            return;
        }
        if (container) {
            logger.warn('UI', 'LaunchpadSystem: Already initialized');
            return;
        }
        container = containerElement;
        render();
        loadApps();
    }

    function render(): void {
        if (!container) return;
        container.innerHTML = `
            <div class="launchpad-container">
                <div class="launchpad-search">
                    <input
                        id="launchpad-search-input"
                        type="text"
                        placeholder="${translate('modals.launchpad.searchPlaceholder') || 'Search apps'}"
                        class="launchpad-search-input"
                    />
                </div>
                <div id="launchpad-apps-grid" class="launchpad-apps-grid"></div>
            </div>
        `;

        searchInput = container.querySelector<HTMLInputElement>('#launchpad-search-input');
        appsGrid = container.querySelector<HTMLElement>('#launchpad-apps-grid');
        if (searchInput) searchInput.addEventListener('input', handleSearch);
    }

    function loadApps(): void {
        const WM = window.WindowManager;
        if (!WM) {
            logger.warn('UI', 'LaunchpadSystem: WindowManager not available');
            return;
        }
        const windowIds: string[] = WM.getAllWindowIds();
        allApps = [];
        const seenProgramKeys = new Set<string>();

        windowIds.forEach(id => {
            const cfg = WM.getConfig(id);
            const info = WM.getProgramInfo(id) as
                | { programLabel?: string; icon?: string }
                | undefined;
            // Keep transient windows out of Launchpad, but expose Photos there by design.
            if (cfg && cfg.type === 'transient' && id !== 'image-modal') return;
            if (id === 'launchpad-modal') return; // skip self

            // Skip system modals that shouldn't appear in Launchpad
            if (id === 'projects-modal') return; // GitHub Projekte - system modal
            if (id === 'about-modal') return; // About - system modal
            if (id === 'program-info-modal') return; // Program info - system modal

            // Deduplicate multi-window app types and use canonical launch IDs.
            // Dynamic window ids can outlive destroyed instances in WindowManager
            // and would reopen stale empty shells.
            const programKey = cfg?.programKey || '';
            const canonicalWindowId =
                CANONICAL_PROGRAM_WINDOW_IDS[programKey] || (cfg?.id as string) || id;
            const isMultiWindowType = Boolean(CANONICAL_PROGRAM_WINDOW_IDS[programKey]);

            if (isMultiWindowType && seenProgramKeys.has(programKey)) {
                return; // skip duplicate instance of same app type
            }
            if (isMultiWindowType) {
                seenProgramKeys.add(programKey);
            }

            if (info) {
                allApps.push({
                    id: canonicalWindowId,
                    name: info.programLabel || translate('programs.default.label') || 'App',
                    icon: resolveProgramIcon(info.icon) || './img/sucher.png',
                    programKey: cfg ? cfg.programKey : null,
                });
            }
        });

        // Finder is a core app and should be visible in Launchpad even before
        // the first multi-window Finder instance registers itself in WindowManager.
        if (!seenProgramKeys.has('programs.finder')) {
            allApps.push({
                id: 'finder-modal',
                name: translate('programs.finder.label', 'Finder') || 'Finder',
                icon: resolveProgramIcon(WINDOW_ICONS.finder),
                programKey: 'programs.finder',
            });
        }

        filteredApps = [...allApps];
        renderApps();
    }

    function handleSearch(e: Event): void {
        const q = (e.target as HTMLInputElement).value.toLowerCase().trim();
        filteredApps = q ? allApps.filter(a => a.name.toLowerCase().includes(q)) : [...allApps];
        renderApps();
    }

    function renderApps(): void {
        if (!appsGrid) return;
        appsGrid.innerHTML = '';
        if (filteredApps.length === 0) {
            appsGrid.innerHTML = `
                <div class="launchpad-empty">
                    <p>${translate('finder.empty') || 'No apps found'}</p>
                </div>
            `;
            return;
        }
        const grid = appsGrid;
        if (!grid) return;
        filteredApps.forEach(app => {
            const btn = document.createElement('button');
            btn.className = 'launchpad-app-button';
            btn.setAttribute('data-window-id', app.id);
            btn.setAttribute('data-action', 'launchpadOpenWindow');
            btn.title = app.name;

            const iconWrap = document.createElement('div');
            iconWrap.className = 'launchpad-app-icon';
            renderProgramIcon(iconWrap, app.icon);

            const label = document.createElement('span');
            label.className = 'launchpad-app-label';
            label.textContent = app.name;

            btn.appendChild(iconWrap);
            btn.appendChild(label);
            grid.appendChild(btn);
        });
    }

    function openApp(windowId: string): void {
        if (!windowId) return;
        const launchpadModal = document.getElementById('launchpad-modal');
        if (launchpadModal && window.dialogs && window.dialogs['launchpad-modal']) {
            window.dialogs['launchpad-modal'].close?.();
        } else if (launchpadModal) {
            launchpadModal.classList.add('hidden');
        }

        // image-modal now maps to the new PhotosWindow implementation.
        // Do not fall back to the legacy static image-modal dialog.
        if (windowId === 'finder-modal') {
            const finder = (window as unknown as { FinderWindow?: { focusOrCreate?: () => void } })
                .FinderWindow;
            if (finder?.focusOrCreate) {
                finder.focusOrCreate();
                return;
            }
            logger.warn('UI', 'LaunchpadSystem: FinderWindow unavailable for finder-modal');
        }

        if (windowId === 'image-modal') {
            const photos = (window as unknown as { PhotosWindow?: { focusOrCreate?: () => void } })
                .PhotosWindow;
            if (photos?.focusOrCreate) {
                photos.focusOrCreate();
                return;
            }
            logger.warn(
                'UI',
                'LaunchpadSystem: PhotosWindow unavailable, skipping legacy image-modal fallback'
            );
            return;
        }

        const WM = window.WindowManager;
        if (WM?.open) {
            WM.open(windowId);
            return;
        }
        const dialog = window.dialogs && window.dialogs[windowId];
        if (dialog?.open) {
            dialog.open();
        } else {
            const modalElement = document.getElementById(windowId);
            if (modalElement) {
                const domUtils = window.DOMUtils;
                if (domUtils && typeof domUtils.show === 'function') {
                    domUtils.show(modalElement);
                } else {
                    modalElement.classList.remove('hidden');
                }
                window.bringDialogToFront?.(windowId);
                window.updateProgramLabelByTopModal?.();
            }
        }
    }

    function refresh(): void {
        loadApps();
    }

    function clearSearch(): void {
        if (searchInput) searchInput.value = '';
        filteredApps = [...allApps];
        renderApps();
    }

    window.addEventListener('languagePreferenceChange', () => {
        if (container) loadApps();
    });

    window.addEventListener('iconThemeChange', () => {
        if (container) loadApps();
    });

    // Register ActionBus action to open window and close launchpad
    const AB = window.ActionBus;
    if (typeof AB?.register === 'function') {
        AB.register('launchpadOpenWindow', (params: Record<string, unknown> | undefined) => {
            const id =
                params?.['windowId'] ||
                params?.['windowid'] ||
                params?.['window'] ||
                params?.['id'];
            if (id) openApp(id as string);
        });
    }

    window.LaunchpadSystem = {
        init,
        refresh,
        clearSearch,
        get container() {
            return container;
        },
    };
})();
