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

    type AppCategory =
        | 'all'
        | 'utilities'
        | 'productivity'
        | 'developer'
        | 'entertainment'
        | 'creativity'
        | 'social';

    type AppEntry = {
        id: string;
        name: string;
        icon: string;
        programKey?: string | null;
        category?: AppCategory;
    };

    const CORE_LAUNCHPAD_APPS: AppEntry[] = [
        {
            id: 'finder-modal',
            name: translate('programs.finder.label', 'Finder') || 'Finder',
            icon: resolveProgramIcon(WINDOW_ICONS.finder),
            programKey: 'programs.finder',
        },
        {
            id: 'terminal',
            name: translate('programs.terminal.label', 'Terminal') || 'Terminal',
            icon: resolveProgramIcon(WINDOW_ICONS.terminal),
            programKey: 'programs.terminal',
        },
    ];

    const CANONICAL_PROGRAM_WINDOW_IDS: Record<string, string> = {
        'programs.finder': 'finder-modal',
        'programs.terminal': 'terminal',
        'programs.preview': 'preview-modal',
        'programs.calendar': 'calendar-modal',
        'programs.text': 'text-modal',
        'programs.codeEditor': 'code-editor-modal',
        'programs.photos': 'image-modal',
        // Settings and About have known static modal IDs, so dynamic instances
        // (window-settings-*, window-about-*) are deduplicated against them.
        'programs.settings': 'settings-modal',
        'programs.about': 'about-modal',
    };

    let container: HTMLElement | null = null;
    let searchInput: HTMLInputElement | null = null;
    let categoryBar: HTMLElement | null = null;
    let appsGrid: HTMLElement | null = null;
    let allApps: AppEntry[] = [];
    let filteredApps: AppEntry[] = [];
    let activeCategory: AppCategory = 'all';
    let searchQuery = '';

    const CATEGORY_ORDER: AppCategory[] = [
        'all',
        'utilities',
        'productivity',
        'developer',
        'entertainment',
        'creativity',
        'social',
    ];

    // translate() wird zentral aus i18n.ts importiert

    function isGermanLocale(): boolean {
        const docLang = (document.documentElement.lang || '').toLowerCase();
        if (docLang) return docLang.startsWith('de');
        return (navigator.language || '').toLowerCase().startsWith('de');
    }

    function getCategoryLabel(category: AppCategory): string {
        const de: Record<AppCategory, string> = {
            all: 'Alle',
            utilities: 'Dienstprogramme',
            productivity: 'Produktivität & Finanzen',
            developer: 'Developer Tools',
            entertainment: 'Unterhaltung',
            creativity: 'Kreativität',
            social: 'Soziale Netze',
        };
        const en: Record<AppCategory, string> = {
            all: 'All',
            utilities: 'Utilities',
            productivity: 'Productivity & Finance',
            developer: 'Developer Tools',
            entertainment: 'Entertainment',
            creativity: 'Creativity',
            social: 'Social',
        };
        return isGermanLocale() ? de[category] : en[category];
    }

    function inferCategory(app: Pick<AppEntry, 'id' | 'name' | 'programKey'>): AppCategory {
        const haystack = `${app.id} ${app.name} ${app.programKey || ''}`.toLowerCase();

        if (
            /terminal|code|studio|developer|dev|editor|text|console|debug|preview|vscode/.test(
                haystack
            )
        ) {
            return 'developer';
        }
        if (/settings|finder|system|monitor|utility|about|preferences/.test(haystack)) {
            return 'utilities';
        }
        if (/photos|image|camera|design|draw|media|creative/.test(haystack)) {
            return 'creativity';
        }
        if (/mail|message|chat|social|discord|slack|whatsapp/.test(haystack)) {
            return 'social';
        }
        if (/game|music|video|tv|entertainment|player/.test(haystack)) {
            return 'entertainment';
        }
        if (/project|task|calendar|notes|finance|productivity/.test(haystack)) {
            return 'productivity';
        }

        return 'utilities';
    }

    function applyFilters(): void {
        filteredApps = allApps.filter(app => {
            const categoryMatch = activeCategory === 'all' || app.category === activeCategory;
            if (!categoryMatch) return false;
            if (!searchQuery) return true;
            return app.name.toLowerCase().includes(searchQuery);
        });
        renderApps();
    }

    function renderCategoryBar(): void {
        if (!categoryBar) return;
        const bar = categoryBar;

        const available = new Set<AppCategory>(['all']);
        allApps.forEach(app => {
            if (app.category) available.add(app.category);
        });

        bar.innerHTML = '';
        CATEGORY_ORDER.forEach(category => {
            if (!available.has(category)) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'launchpad-category-pill';
            if (category === activeCategory) {
                button.classList.add('is-active');
            }
            button.textContent = getCategoryLabel(category);
            button.setAttribute('data-category', category);
            button.setAttribute('aria-pressed', category === activeCategory ? 'true' : 'false');
            bar.appendChild(button);
        });
    }

    function handleCategoryClick(event: Event): void {
        const target = event.target as HTMLElement | null;
        if (!target) return;
        const categoryButton = target.closest<HTMLButtonElement>('[data-category]');
        if (!categoryButton) return;
        event.stopPropagation();
        const category = categoryButton.getAttribute('data-category') as AppCategory | null;
        if (!category || activeCategory === category) return;
        activeCategory = category;
        renderCategoryBar();
        applyFilters();
    }

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
                <div class="launchpad-header">
                    <div class="launchpad-header-title-wrap">
                        <span class="launchpad-header-glyph" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="4" height="4" rx="1" fill="currentColor" />
                                <rect x="10" y="3" width="4" height="4" rx="1" fill="currentColor" />
                                <rect x="17" y="3" width="4" height="4" rx="1" fill="currentColor" />
                                <rect x="3" y="10" width="4" height="4" rx="1" fill="currentColor" />
                                <rect x="10" y="10" width="4" height="4" rx="1" fill="currentColor" />
                                <rect x="17" y="10" width="4" height="4" rx="1" fill="currentColor" />
                                <rect x="3" y="17" width="4" height="4" rx="1" fill="currentColor" />
                                <rect x="10" y="17" width="4" height="4" rx="1" fill="currentColor" />
                                <rect x="17" y="17" width="4" height="4" rx="1" fill="currentColor" />
                            </svg>
                        </span>
                        <h2 class="launchpad-header-title">${translate('dock.launchpad', 'Apps') || 'Apps'}</h2>
                    </div>
                    <button type="button" class="launchpad-header-menu" aria-label="Launchpad options">
                        <span></span><span></span><span></span>
                    </button>
                </div>
                <div class="launchpad-search">
                    <span class="launchpad-search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="2" />
                            <path d="M20 20L16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                        </svg>
                    </span>
                    <input
                        id="launchpad-search-input"
                        type="text"
                        placeholder="${translate('modals.launchpad.searchPlaceholder') || 'Search apps'}"
                        class="launchpad-search-input"
                    />
                </div>
                <div id="launchpad-category-bar" class="launchpad-category-bar" role="toolbar"></div>
                <div id="launchpad-apps-grid" class="launchpad-apps-grid"></div>
            </div>
        `;

        searchInput = container.querySelector<HTMLInputElement>('#launchpad-search-input');
        categoryBar = container.querySelector<HTMLElement>('#launchpad-category-bar');
        appsGrid = container.querySelector<HTMLElement>('#launchpad-apps-grid');
        if (searchInput) searchInput.addEventListener('input', handleSearch);
        if (categoryBar) categoryBar.addEventListener('click', handleCategoryClick);
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
        const seenCanonicalIds = new Set<string>();

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

            // Skip if we've already added this canonical window ID or app type
            if (seenCanonicalIds.has(canonicalWindowId)) {
                return;
            }
            if (isMultiWindowType && seenProgramKeys.has(programKey)) {
                return;
            }

            // Mark as seen for deduplication
            seenCanonicalIds.add(canonicalWindowId);
            if (programKey && isMultiWindowType) {
                seenProgramKeys.add(programKey);
            }

            if (info) {
                allApps.push({
                    id: canonicalWindowId,
                    name: info.programLabel || translate('programs.default.label') || 'App',
                    icon: resolveProgramIcon(info.icon) || './src/ts/apps/finder/sucher.png',
                    programKey: cfg ? cfg.programKey : null,
                    category: inferCategory({
                        id: canonicalWindowId,
                        name: info.programLabel || translate('programs.default.label') || 'App',
                        programKey: cfg ? cfg.programKey : null,
                    }),
                });
            }
        });

        CORE_LAUNCHPAD_APPS.forEach(app => {
            if (
                seenCanonicalIds.has(app.id) ||
                (app.programKey && seenProgramKeys.has(app.programKey))
            ) {
                return;
            }
            allApps.push({ ...app, category: inferCategory(app) });
        });

        renderCategoryBar();
        applyFilters();
    }

    function handleSearch(e: Event): void {
        searchQuery = (e.target as HTMLInputElement).value.toLowerCase().trim();
        applyFilters();
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
        if (launchpadModal && window.WindowManager?.close) {
            window.WindowManager.close('launchpad-modal');
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

        if (windowId === 'terminal' || windowId === 'terminal-modal') {
            const terminal = (
                window as unknown as { TerminalWindow?: { focusOrCreate?: () => void } }
            ).TerminalWindow;
            if (terminal?.focusOrCreate) {
                terminal.focusOrCreate();
                return;
            }
            logger.warn('UI', 'LaunchpadSystem: TerminalWindow unavailable for terminal');
            return;
        }

        if (windowId === 'calendar-modal') {
            const calendar = (
                window as unknown as { CalendarWindow?: { focusOrCreate?: () => void } }
            ).CalendarWindow;
            if (calendar?.focusOrCreate) {
                calendar.focusOrCreate();
                return;
            }
            logger.warn(
                'UI',
                'LaunchpadSystem: CalendarWindow unavailable, skipping legacy calendar fallback'
            );
            return;
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

    function refresh(): void {
        loadApps();
    }

    function clearSearch(): void {
        if (searchInput) searchInput.value = '';
        searchQuery = '';
        activeCategory = 'all';
        renderCategoryBar();
        applyFilters();
    }

    window.addEventListener('languagePreferenceChange', () => {
        if (container) loadApps();
    });

    window.addEventListener('iconThemeChange', () => {
        if (container) loadApps();
    });

    // Refresh when windows are opened/closed/registered to prevent stale-entry duplicates.
    window.addEventListener('windowOpened', () => {
        if (container) loadApps();
    });
    window.addEventListener('windowClosed', () => {
        if (container) loadApps();
    });
    window.addEventListener('windowRegistered', () => {
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

    /**
     * Initialize launchpad in fullscreen mode (for mobile paging)
     * PURPOSE: Render launchpad grid on second mobile screen
     * INPUT: containerElement (should be #launchpad-fullscreen-container)
     * NOTES: Similar to init() but adapted for fullscreen/mobile context
     */
    function initFullscreen(containerElement: HTMLElement): void {
        if (!containerElement) {
            logger.warn('UI', 'LaunchpadSystem: No fullscreen container element provided');
            return;
        }

        container = containerElement;

        // Render fullscreen layout
        containerElement.innerHTML = `
            <div class="launchpad-apps-grid mobile-launchpad-grid"></div>
        `;

        appsGrid = containerElement.querySelector<HTMLElement>('.launchpad-apps-grid');
        loadApps();
    }

    window.LaunchpadSystem = {
        init,
        initFullscreen,
        refresh,
        clearSearch,
        get container() {
            return container;
        },
    } as Record<string, unknown>;
})();
