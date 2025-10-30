/**
 * LaunchpadSystem (TypeScript)
 * Displays all registered persistent apps as a grid and opens selected apps.
 */

console.log('Launchpad (TS) loaded');

import { translate } from './i18n';

(() => {
    'use strict';

    type AppEntry = { id: string; name: string; icon: string; programKey?: string | null };

    let container: HTMLElement | null = null;
    let searchInput: HTMLInputElement | null = null;
    let appsGrid: HTMLElement | null = null;
    let allApps: AppEntry[] = [];
    let filteredApps: AppEntry[] = [];

    // translate() wird zentral aus i18n.ts importiert

    function init(containerElement: HTMLElement): void {
        if (!containerElement) {
            console.warn('LaunchpadSystem: No container element provided');
            return;
        }
        if (container) {
            console.warn('LaunchpadSystem: Already initialized');
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
                        placeholder="${translate('modals.launchpad.searchPlaceholder', 'Search apps')}"
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
        const WM = (window as any).WindowManager;
        if (!WM) {
            console.warn('LaunchpadSystem: WindowManager not available');
            return;
        }
        const windowIds: string[] = WM.getAllWindowIds();
        allApps = [];
        windowIds.forEach(id => {
            const cfg = WM.getConfig(id);
            const info = WM.getProgramInfo(id);
            if (cfg && cfg.type === 'transient') return; // skip transient
            if (id === 'launchpad-modal') return; // skip self
            if (info) {
                allApps.push({
                    id,
                    name: info.programLabel || translate('programs.default.label', 'App'),
                    icon: info.icon || './img/sucher.png',
                    programKey: cfg ? cfg.programKey : null,
                });
            }
        });
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
                    <p>${translate('finder.empty', 'No apps found')}</p>
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
            const icon = app.icon;
            const isImg = typeof icon === 'string' && /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(icon);
            if (
                isImg ||
                (typeof icon === 'string' && (icon.startsWith('./') || icon.startsWith('http')))
            ) {
                const img = document.createElement('img');
                img.src = icon;
                img.alt = app.name;
                img.draggable = false;
                iconWrap.appendChild(img);
            } else if (typeof icon === 'string' && icon.trim().length) {
                const emoji = document.createElement('div');
                emoji.className = 'launchpad-app-emoji';
                emoji.textContent = icon;
                iconWrap.appendChild(emoji);
            } else {
                const fallback = document.createElement('img');
                fallback.src = './img/sucher.png';
                fallback.alt = app.name;
                fallback.draggable = false;
                iconWrap.appendChild(fallback);
            }

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
        const w: any = window as any;
        const launchpadModal = document.getElementById('launchpad-modal');
        if (launchpadModal && w.dialogs && w.dialogs['launchpad-modal']) {
            w.dialogs['launchpad-modal'].close?.();
        } else if (launchpadModal) {
            launchpadModal.classList.add('hidden');
        }

        const WM = w.WindowManager;
        if (WM?.open) {
            WM.open(windowId);
            return;
        }
        const dialog = w.dialogs && w.dialogs[windowId];
        if (dialog?.open) dialog.open();
        else {
            const modalElement = document.getElementById(windowId);
            if (modalElement) {
                modalElement.classList.remove('hidden');
                w.bringDialogToFront?.(windowId);
                w.updateProgramLabelByTopModal?.();
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

    // Register ActionBus action to open window and close launchpad
    const AB = (window as any).ActionBus;
    if (typeof AB?.register === 'function') {
        (AB as any).register('launchpadOpenWindow', (params: any) => {
            const id = params?.windowId || params?.windowid || params?.window || params?.id;
            if (id) openApp(id);
        });
    }

    (window as any).LaunchpadSystem = {
        init,
        refresh,
        clearSearch,
        get container() {
            return container;
        },
    };
})();
