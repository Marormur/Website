/**
 * src/ts/finder-view.ts
 * FinderView – Ein Tab-Typ innerhalb eines Finder-Fensters.
 *
 * Verantwortlichkeiten
 * --------------------
 * - Stellt die UI der Dateiansicht bereit (Sidebar, Toolbar, Breadcrumbs, Content).
 * - Hält lokalen Zustand pro Tab (Quelle/Path, ViewMode, Sortierung, Favoriten, Recent Files).
 * - Aktualisiert den Tab‑Titel dynamisch, sodass immer der aktuelle Ordner/Context
 *   im Tab‑Label sichtbar ist.
 * - GitHub‑Integration: Repositories und deren Inhalte werden mit leichter Caching‑Schicht
 *   geladen (sowohl über interne Map als auch bevorzugt über GitHubAPI‑Cache, falls vorhanden).
 *
 * Zusammenspiel mit BaseWindow
 * ----------------------------
 * - Der FinderWindow‑Container rendert die Tab-Leiste via WindowTabs und verwaltet mehrere
 *   FinderView‑Instanzen (Multi‑Tab in einem Fenster – oder verteilt auf mehrere Fenster).
 * - FinderView ruft bei relevanten Änderungen _persistState() auf, was den Window‑State
 *   speichert; die Session enthält so alle offenen Finder‑Tabs inklusive Pfad/Ansicht.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { BaseTab, type TabConfig } from '../../windows/base-tab.js';
import { VirtualFS } from '../../services/virtual-fs.js';
import PreviewInstanceManager from '../../windows/preview-instance-manager.js';
import { h, diff, patch, createElement, type VNode } from '../../core/vdom.js';

const ROOT_FOLDER_NAME = 'Computer';

type ViewMode = 'list' | 'grid';

interface FileItem {
    name: string;
    type: 'folder' | 'file';
    icon?: string;
    size?: number;
    modified?: string;
    path?: string; // Full path for recent files navigation
}

interface RecentFile {
    name: string;
    path: string;
    icon: string;
    modified: string;
}

/**
 * Helper type for GitHub repository data
 */
interface GitHubRepo {
    name: string;
    [key: string]: unknown;
}

/**
 * Helper type for GitHub content item
 */
interface GitHubContentItem {
    name: string;
    type: string;
    size?: number;
    git_url?: string;
    [key: string]: unknown;
}

type FinderSource = 'computer' | 'github' | 'recent' | 'starred';

export class FinderView extends BaseTab {
    source: FinderSource;
    currentPath: string[];
    viewMode: ViewMode;
    sortBy: 'name' | 'date' | 'size' | 'type';
    sortOrder: 'asc' | 'desc';
    selectedItems: Set<string>;
    _renderedItems: FileItem[];
    _eventHandlersAttached: boolean;
    sidebarWidth: number;

    // Favorites and Recent Files
    favorites: Set<string>;
    recentFiles: RecentFile[];
    maxRecentFiles: number;

    // Search
    searchTerm: string;

    // GitHub Content Cache
    githubContentCache: Map<string, { data: any; timestamp: number }>;
    cacheTTL: number;

    dom: {
        toolbar: HTMLElement | null;
        breadcrumbs: HTMLElement | null;
        content: HTMLElement | null;
        viewListBtn: HTMLButtonElement | null;
        viewGridBtn: HTMLButtonElement | null;
        sidebar: HTMLElement | null;
        resizer: HTMLElement | null;
    };

    githubRepos: any[];
    githubError = false;
    githubErrorMessage = '';
    lastGithubItemsMap: Map<string, any>;

    // Track scroll position to restore after file open/close
    private _savedScrollPosition = 0;
    // Persist scroll positions per logical location (source + path)
    private _scrollPositions: Map<string, number> = new Map();

    // VDOM State - tracks virtual tree for efficient updates
    private _vTree: VNode | null = null;
    private _breadcrumbsVTree: VNode | null = null;

    constructor(config?: Partial<TabConfig> & { source?: FinderSource }) {
        super({
            type: 'finder-view',
            title: config?.title || 'Computer',
            icon: '💻',
            ...config,
        });

        this.source = config?.source || 'computer';
        this.currentPath = [];
        this.viewMode = 'list';
        this.sortBy = 'name';
        this.sortOrder = 'asc';
        this.selectedItems = new Set();
        this._renderedItems = [];
        this._eventHandlersAttached = false;
        this.sidebarWidth = config?.content?.sidebarWidth ?? 192; // default 12rem

        this.githubRepos = [];
        this.lastGithubItemsMap = new Map();

        // Initialize Favorites from saved state
        const savedFavorites = config?.content?.favorites || [];
        this.favorites = new Set(savedFavorites);

        // Load recent files from global storage (shared across all tabs/windows)
        this.recentFiles = FinderView.loadRecentFiles();
        this.maxRecentFiles = FinderView.MAX_RECENT_FILES;

        // Initialize Search
        this.searchTerm = '';

        // Initialize GitHub Cache
        this.githubContentCache = new Map();
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes

        this.dom = {
            toolbar: null,
            breadcrumbs: null,
            content: null,
            viewListBtn: null,
            viewGridBtn: null,
            sidebar: null,
            resizer: null,
        };
    }

    createDOM(): HTMLElement {
        const container = document.createElement('div');
        container.id = `${this.id}-container`;
        container.className = 'tab-content hidden w-full h-full flex flex-col min-h-0';

        const isGithub = this.source === 'github';
        container.innerHTML = `
            <div class="flex-1 flex gap-0 min-h-0 min-w-0 overflow-hidden">
                <aside id="finder-sidebar" class="shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto" style="width: ${this.sidebarWidth}px;">
                    <div class="py-2">
                        <div class="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide" data-i18n="finder.sidebar.favorites">FAVORITEN</div>
                        <button class="finder-sidebar-item" id="finder-sidebar-home" data-sidebar-action="home">
                            <span class="finder-sidebar-icon">🏠</span>
                            <span data-i18n="finder.sidebar.home">Home</span>
                        </button>
                        <button class="finder-sidebar-item finder-sidebar-active" id="finder-sidebar-computer" data-sidebar-action="computer">
                            <span class="finder-sidebar-icon">💻</span>
                            <span data-i18n="finder.sidebar.computer">Computer</span>
                        </button>
                        <button class="finder-sidebar-item" id="finder-sidebar-recent" data-sidebar-action="recent">
                            <span class="finder-sidebar-icon">🕒</span>
                            <span data-i18n="finder.sidebar.recent">Zuletzt verwendet</span>
                        </button>
                        <div class="px-3 py-1 mt-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide" data-i18n="finder.sidebar.locations">ORTE</div>
                        <button class="finder-sidebar-item" id="finder-sidebar-github" data-sidebar-action="github">
                            <span class="finder-sidebar-icon">📂</span>
                            <span data-i18n="finder.sidebar.github">GitHub Projekte</span>
                        </button>
                        <button class="finder-sidebar-item" id="finder-sidebar-starred" data-sidebar-action="starred">
                            <span class="finder-sidebar-icon">⭐</span>
                            <span data-i18n="finder.sidebar.starred">Markiert</span>
                        </button>
                    </div>
                </aside>
                <div class="finder-resizer shrink-0 w-1 md:w-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 cursor-col-resize" role="separator" aria-orientation="vertical" title="Größe ändern"></div>
                <div class="flex-1 flex flex-col min-h-0 min-w-0">
                    <div class="finder-toolbar px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                        <!-- Back / Root like old Finder -->
                        <button class="finder-toolbar-btn" data-action="navigate-up" data-i18n-title="finder.toolbar.back" title="Zurück">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                        </button>
                        <button class="finder-toolbar-btn" data-action="navigate-root" data-i18n-title="finder.toolbar.forward" title="Nach vorn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                        <!-- Breadcrumbs centered/left grow -->
                        <div class="flex-1 mx-2 min-w-0">
                            <div class="breadcrumbs text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 overflow-hidden"></div>
                        </div>
                        <!-- Optional: sort menu next to view controls -->
                        <div class="relative hidden md:block">
                            <button class="finder-toolbar-btn" data-action="toggle-sort" title="Sortierung">⇅</button>
                            <div class="finder-sort-menu hidden absolute right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-10" style="width: 180px;">
                                <button class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700" data-sort="name" data-i18n="context.finder.sortByName">Nach Name</button>
                                <button class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700" data-sort="date" data-i18n="context.finder.sortByDate">Nach Datum</button>
                                <button class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700" data-sort="size" data-i18n="context.finder.sortBySize">Nach Größe</button>
                                <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                                <button class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700" data-order="asc">↑ Aufsteigend</button>
                                <button class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700" data-order="desc">↓ Absteigend</button>
                            </div>
                        </div>
                        <button class="finder-toolbar-btn" data-action="toggle-favorite" title="Zu Favoriten" style="display: none;">⭐</button>
                        <div class="flex gap-1">
                            <button class="finder-toolbar-btn" data-action="view-list" data-i18n-title="finder.toolbar.listView" title="Listenansicht">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4m0 7h18v2H3v-2m0 7h18v2H3v-2Z" /></svg>
                            </button>
                            <button class="finder-toolbar-btn" data-action="view-grid" data-i18n-title="finder.toolbar.gridView" title="Rasteransicht">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3m10 0h8v8h-8V3M3 13h8v8H3v-8m10 0h8v8h-8v-8Z" /></svg>
                            </button>
                        </div>
                        <input type="text" class="finder-search px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0 w-28 sm:w-40 md:w-56 lg:w-72 xl:w-80" data-i18n-placeholder="finder.toolbar.search" placeholder="Suchen" />
                    </div>
                    <div class="finder-content flex-1 overflow-auto bg-white dark:bg-gray-800 min-w-0" data-finder-content></div>
                </div>
            </div>
        `;

        this.element = container;
        this.dom.toolbar = container.querySelector('.finder-toolbar');
        this.dom.breadcrumbs = container.querySelector('.breadcrumbs');
        this.dom.content = container.querySelector('.finder-content');
        this.dom.sidebar = container.querySelector('#finder-sidebar');
        this.dom.resizer = container.querySelector('.finder-resizer');
        this.dom.viewListBtn = null;
        this.dom.viewGridBtn = null;

        // Toolbar/Sidebar/Content Interaktionen anbinden
        this._attachEvents();
        this._attachSidebarEvents();
        this._attachResizeHandlers();
        this._setupContentEventHandlers();
        this._renderAll();

        // Apply i18n translations
        const w = window as any;
        if (w.appI18n) {
            w.appI18n.applyTranslations(container);
        }

        return container;
    }

    private _attachResizeHandlers(): void {
        const sidebar = this.dom.sidebar;
        const resizer = this.dom.resizer;
        const contentArea = this.element?.querySelector(
            '.flex-1.flex.gap-0.min-h-0.overflow-hidden'
        ) as HTMLElement | null;
        if (!sidebar || !resizer) return;

        const minWidth = 160; // px
        const maxWidth = 480; // px

        let startX = 0;
        let startWidth = 0;
        let dragging = false;

        const onMouseMove = (e: MouseEvent) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            let newWidth = Math.max(minWidth, Math.min(startWidth + dx, maxWidth));

            // Also ensure there's room for content (min 360px)
            const container = this.element as HTMLElement;
            if (container) {
                const total = container.clientWidth;
                const minContent = 360;
                newWidth = Math.min(newWidth, Math.max(total - minContent, minWidth));
            }

            sidebar.style.width = `${newWidth}px`;
            this.sidebarWidth = newWidth;
        };

        const stopDragging = () => {
            if (!dragging) return;
            dragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', stopDragging);
            document.body.classList.remove('select-none');
            this._persistState();
        };

        resizer.addEventListener('mousedown', (e: MouseEvent) => {
            e.preventDefault();
            dragging = true;
            startX = e.clientX;
            startWidth = sidebar.getBoundingClientRect().width;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', stopDragging);
            document.body.classList.add('select-none');
        });
    }

    private _attachEvents(): void {
        if (!this.element) return;
        const upBtn = this.element.querySelector<HTMLButtonElement>('[data-action="navigate-up"]');
        const rootBtn = this.element.querySelector<HTMLButtonElement>(
            '[data-action="navigate-root"]'
        );
        const listBtn = this.element.querySelector<HTMLButtonElement>('[data-action="view-list"]');
        const gridBtn = this.element.querySelector<HTMLButtonElement>('[data-action="view-grid"]');
        const searchInput = this.element.querySelector<HTMLInputElement>('.finder-search');
        const sortToggleBtn = this.element.querySelector<HTMLButtonElement>(
            '[data-action="toggle-sort"]'
        );
        const sortMenu = this.element.querySelector<HTMLElement>('.finder-sort-menu');
        const favoriteBtn = this.element.querySelector<HTMLButtonElement>(
            '[data-action="toggle-favorite"]'
        );

        upBtn?.addEventListener('click', () => this.navigateUp());
        rootBtn?.addEventListener('click', () => this.goRoot());
        listBtn?.addEventListener('click', () => this.setViewMode('list'));
        gridBtn?.addEventListener('click', () => this.setViewMode('grid'));

        // Search input
        searchInput?.addEventListener('input', e => {
            this.searchTerm = (e.target as HTMLInputElement).value;
            this.renderContent();
        });

        // Sort menu toggle
        sortToggleBtn?.addEventListener('click', () => {
            sortMenu?.classList.toggle('hidden');
        });

        // Sort menu items
        sortMenu?.querySelectorAll<HTMLButtonElement>('[data-sort]').forEach(btn => {
            btn.addEventListener('click', () => {
                const sortBy = btn.dataset.sort as 'name' | 'date' | 'size' | 'type';
                this.setSortBy(sortBy);
                sortMenu.classList.add('hidden');
            });
        });

        sortMenu?.querySelectorAll<HTMLButtonElement>('[data-order]').forEach(btn => {
            btn.addEventListener('click', () => {
                const order = btn.dataset.order as 'asc' | 'desc';
                this.setSortOrder(order);
                sortMenu.classList.add('hidden');
            });
        });

        // Close sort menu when clicking outside
        document.addEventListener('click', e => {
            if (
                !sortToggleBtn?.contains(e.target as Node) &&
                !sortMenu?.contains(e.target as Node)
            ) {
                sortMenu?.classList.add('hidden');
            }
        });

        // Favorite toggle
        favoriteBtn?.addEventListener('click', () => {
            if (this.currentPath.length > 0) {
                this.toggleFavorite(this.currentPath.join('/'));
            }
        });
    }

    private _attachSidebarEvents(): void {
        if (!this.element) return;

        // Sidebar navigation
        const sidebarButtons =
            this.element.querySelectorAll<HTMLButtonElement>('[data-sidebar-action]');
        sidebarButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.sidebarAction;

                // Handle action
                if (action === 'home') {
                    this.source = 'computer';
                    this.currentPath = ['home', 'marvin'];
                    this._persistState();
                    this._renderAll();
                } else if (action === 'computer') {
                    this.source = 'computer';
                    this.goRoot();
                } else if (action === 'github') {
                    this.source = 'github';
                    // Prefetch repos in background before navigating
                    const API = this.getAPI();
                    if (API && typeof API.prefetchUserRepos === 'function') {
                        const username = this.getGithubUsername();
                        API.prefetchUserRepos(username);
                    }
                    this.goRoot();
                } else if (action === 'recent') {
                    this.source = 'recent';
                    this.goRoot();
                } else if (action === 'starred') {
                    this.source = 'starred';
                    this.goRoot();
                }

                // Stelle sicher, dass das aktive Highlight dem finalen Zustand entspricht
                this._updateSidebarActiveHighlight();
            });
        });
    }

    private _setupContentEventHandlers(): void {
        if (this._eventHandlersAttached) {
            return;
        }
        // Delegation für Klick/Double‑Klick auf List/Grid‑Items
        const resolveItemEl = (evt: Event): HTMLElement | null => {
            const node = evt.target as Node | null;
            let el: Element | null = null;
            if (node && (node as Element).closest) {
                el = (node as Element).closest('[data-item-index]');
            } else if (node && (node as any).parentElement) {
                el = ((node as any).parentElement as Element).closest('[data-item-index]');
            }
            return el as HTMLElement | null;
        };

        this.dom.content?.addEventListener('click', e => {
            const itemEl = resolveItemEl(e);
            if (!itemEl) return;
            const idx = parseInt(itemEl.dataset.itemIndex || '-1', 10);
            const item = this._renderedItems[idx];
            if (!item) return;
            this._selectItem(item.name);
        });
        this.dom.content?.addEventListener('dblclick', e => {
            const itemEl = resolveItemEl(e);
            if (!itemEl) return;
            const idx = parseInt(itemEl.dataset.itemIndex || '-1', 10);
            const item = this._renderedItems[idx];
            if (!item) return;
            void this.openItem(item.name, item.type);
        });
        this._eventHandlersAttached = true;
    }

    private _renderAll(): void {
        // Save scroll position before re-rendering
        this._saveScrollPosition();

        this.renderBreadcrumbs();
        this.renderContent();
        this._updateSidebarActiveHighlight();

        // Restore scroll position after re-rendering with multiple attempts
        // to ensure it works even with async rendering
        this._restoreScrollPosition();
        requestAnimationFrame(() => {
            this._restoreScrollPosition();
        });
        // Additional delayed restore for reliability
        setTimeout(() => {
            this._restoreScrollPosition();
        }, 0);
    }

    renderBreadcrumbs(): void {
        if (!this.dom.breadcrumbs) return;
        // Ensure the tab title reflects the current folder/view
        this._updateTabLabel();

        // Build breadcrumb parts as VNodes
        const breadcrumbParts: VNode[] = [];
        const viewLabel = this.source === 'github' ? 'GitHub' : 'Computer';

        // Root button
        breadcrumbParts.push(
            h(
                'button',
                {
                    class: 'finder-breadcrumb-item',
                    'data-action': 'goRoot',
                },
                viewLabel
            )
        );

        // Path parts
        this.currentPath.forEach((part, index) => {
            if (this.source === 'computer' && index === 0 && part === ROOT_FOLDER_NAME) return;
            const pathUpToHere = this.currentPath.slice(0, index + 1).join('/');

            // Separator
            breadcrumbParts.push(h('span', { class: 'finder-breadcrumb-separator' }, '›'));

            // Path button
            breadcrumbParts.push(
                h(
                    'button',
                    {
                        class: 'finder-breadcrumb-item',
                        'data-action': 'goto',
                        'data-path': pathUpToHere,
                    },
                    part
                )
            );
        });

        // Create container VNode - we need a wrapper to track the virtual tree
        const newVTree = h(
            'div',
            { class: 'breadcrumb-wrapper flex items-center gap-1' },
            ...breadcrumbParts
        );

        // Apply VDOM updates
        if (!this._breadcrumbsVTree || !this.dom.breadcrumbs.firstChild) {
            // Initial render
            this.dom.breadcrumbs.innerHTML = '';
            const dom = createElement(newVTree);
            this.dom.breadcrumbs.appendChild(dom);
        } else {
            // Update: intelligent diff + patch
            const patches = diff(this._breadcrumbsVTree, newVTree);
            const container = this.dom.breadcrumbs.firstChild as HTMLElement;
            if (container) {
                patch(container, patches);
            }
        }

        this._breadcrumbsVTree = newVTree;

        // Set up event delegation for breadcrumb clicks
        // Note: We only need to attach these once, not on every render
        if (!this.dom.breadcrumbs.dataset.breadcrumbsInitialized) {
            this.dom.breadcrumbs.addEventListener('click', (e: Event) => {
                const target = e.target as HTMLElement;
                if (target.tagName === 'BUTTON') {
                    const action = target.dataset.action;
                    if (action === 'goRoot') {
                        this.goRoot();
                    } else if (action === 'goto') {
                        const path = target.dataset.path || '';
                        const parts = path.split('/').filter(Boolean);
                        this.navigateToPath(parts);
                    }
                }
            });
            this.dom.breadcrumbs.dataset.breadcrumbsInitialized = 'true';
        }
    }

    /**
     * Synchronisiert den aktiven Sidebar-Eintrag mit der aktuellen Quelle/Route.
     * Regeln:
     * - source=github → GitHub aktiv
     * - source=recent → Zuletzt verwendet aktiv
     * - source=starred → Markiert aktiv
     * - source=computer → Wenn Pfad mit 'home' beginnt → Home aktiv, sonst Computer
     */
    private _updateSidebarActiveHighlight(): void {
        if (!this.element) return;

        const sidebarButtons = this.element.querySelectorAll<HTMLElement>('[data-sidebar-action]');
        sidebarButtons.forEach(b => b.classList.remove('finder-sidebar-active'));

        let toActivate: string | null = null;
        switch (this.source) {
            case 'github':
                toActivate = '#finder-sidebar-github';
                break;
            case 'recent':
                toActivate = '#finder-sidebar-recent';
                break;
            case 'starred':
                toActivate = '#finder-sidebar-starred';
                break;
            case 'computer':
            default: {
                const atHome = this.currentPath.length > 0 && this.currentPath[0] === 'home';
                toActivate = atHome ? '#finder-sidebar-home' : '#finder-sidebar-computer';
                break;
            }
        }

        if (toActivate) {
            const el = this.element.querySelector(toActivate);
            el?.classList.add('finder-sidebar-active');
        }
    }

    renderContent(): void {
        if (!this.dom.content) return;

        let items: FileItem[] = [];

        if (this.source === 'github') {
            // GitHub wird asynchron gerendert, da ggf. Netzwerk/Caches betroffen sind
            void this.renderGithubContent();
            return;
        } else if (this.source === 'recent') {
            items = this.getRecentItems();
        } else if (this.source === 'starred') {
            items = this.getFavoriteItems();
        } else {
            items = this.getComputerItems();
        }

        // Apply search filter
        const filtered = this.filterItems(items, this.searchTerm);

        // Sort only if not in recent view (recent items are already sorted by date, newest first)
        const sorted = this.source === 'recent' ? filtered : this.sortItems(filtered);

        switch (this.viewMode) {
            case 'list':
                this.renderListView(sorted);
                break;
            case 'grid':
                this.renderGridView(sorted);
                break;
        }
    }

    getComputerItems(): FileItem[] {
        // VirtualFS root is '/'; currentPath is relative to /
        // For root, pass '/' or [] to VirtualFS.list()
        // For subfolders, pass path parts WITHOUT leading '/'
        const path = this.currentPath.length === 0 ? '/' : this.currentPath;
        const items = VirtualFS.list(path);
        return Object.entries(items).map(([name, item]: [string, any]) => ({
            name,
            type: item.type as 'folder' | 'file',
            icon: item.icon || (item.type === 'folder' ? '📁' : '📄'),
            size: item.size || 0,
            modified: item.modified || new Date().toISOString(),
        }));
    }

    sortItems(items: FileItem[]): FileItem[] {
        const sorted = [...items];
        sorted.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            let comparison = 0;
            switch (this.sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'size':
                    comparison = (a.size || 0) - (b.size || 0);
                    break;
                case 'date': {
                    const aTime = a.modified ? Date.parse(a.modified) : 0;
                    const bTime = b.modified ? Date.parse(b.modified) : 0;
                    comparison = bTime - aTime;
                    break;
                }
                case 'type':
                    comparison = (a.type || '').localeCompare(b.type || '');
                    break;
            }
            return this.sortOrder === 'asc' ? comparison : -comparison;
        });
        return sorted;
    }

    renderListView(items: FileItem[]): void {
        this._renderedItems = items;

        // Build virtual tree for list view
        const newVTree = h(
            'div',
            { class: 'p-2' },
            h(
                'table',
                { class: 'finder-list-table table-fixed w-full' },
                h(
                    'colgroup',
                    {},
                    h('col', {}),
                    h('col', { class: 'w-28' }),
                    h('col', { class: 'w-40' })
                ),
                h(
                    'thead',
                    {},
                    h(
                        'tr',
                        { class: 'text-left' },
                        h('th', { class: 'font-medium' }, 'Name'),
                        h('th', { class: 'text-right font-medium' }, 'Größe'),
                        h('th', { class: 'text-right font-medium' }, 'Geändert')
                    )
                ),
                h(
                    'tbody',
                    {},
                    ...items.map((item, i) => {
                        const isSelected = this.selectedItems.has(item.name);
                        const rowClass = isSelected
                            ? 'finder-list-item bg-blue-100 dark:bg-blue-900'
                            : 'finder-list-item';

                        const attrs: Record<string, unknown> = {
                            key: item.name,
                            class: rowClass,
                            'data-item-index': String(i),
                            'data-item-name': item.name,
                            'data-item-type': item.type,
                        };

                        if (item.path) {
                            attrs['data-item-path'] = item.path;
                        }

                        return h(
                            'tr',
                            attrs,
                            h(
                                'td',
                                { class: 'pr-2' },
                                h(
                                    'div',
                                    { class: 'flex items-center gap-2 min-w-0' },
                                    h(
                                        'span',
                                        { class: 'finder-item-icon shrink-0' },
                                        item.icon || ''
                                    ),
                                    h('span', { class: 'truncate block min-w-0' }, item.name)
                                )
                            ),
                            h(
                                'td',
                                { class: 'text-right whitespace-nowrap pl-2 pr-2' },
                                this.formatSize(item.size)
                            ),
                            h(
                                'td',
                                {
                                    class: 'text-right text-gray-500 dark:text-gray-400 whitespace-nowrap pl-2',
                                },
                                this.formatDate(item.modified)
                            )
                        );
                    })
                )
            )
        );

        // Apply VDOM updates
        if (!this._vTree || !this.dom.content?.firstChild) {
            // Initial render: create DOM from scratch
            this.dom.content!.innerHTML = '';
            const dom = createElement(newVTree);
            this.dom.content!.appendChild(dom);
        } else {
            // Update: intelligent diff + patch
            const patches = diff(this._vTree, newVTree);
            const container = this.dom.content!.firstChild as HTMLElement;
            if (container) {
                patch(container, patches);
            }
        }

        this._vTree = newVTree;
    }

    renderGridView(items: FileItem[]): void {
        this._renderedItems = items;

        // Build virtual tree for grid view
        const newVTree = h(
            'div',
            {
                class: 'finder-grid-container grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 p-3',
            },
            ...items.map((item, i) => {
                const isSelected = this.selectedItems.has(item.name);
                const itemClass = isSelected
                    ? 'finder-grid-item ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 bg-blue-100/60 dark:bg-blue-900/40 min-w-0 p-3 rounded'
                    : 'finder-grid-item min-w-0 p-3 rounded';

                const attrs: Record<string, unknown> = {
                    key: item.name,
                    class: itemClass,
                    'data-item-index': String(i),
                    'data-item-name': item.name,
                    'data-item-type': item.type,
                };

                if (item.path) {
                    attrs['data-item-path'] = item.path;
                }

                return h(
                    'div',
                    attrs,
                    h('div', { class: 'finder-grid-icon text-2xl mb-2' }, item.icon || ''),
                    h('div', { class: 'finder-grid-name truncate text-sm' }, item.name)
                );
            })
        );

        // Apply VDOM updates
        if (!this._vTree || !this.dom.content?.firstChild) {
            // Initial render: create DOM from scratch
            this.dom.content!.innerHTML = '';
            const dom = createElement(newVTree);
            this.dom.content!.appendChild(dom);
        } else {
            // Update: intelligent diff + patch
            const patches = diff(this._vTree, newVTree);
            const container = this.dom.content!.firstChild as HTMLElement;
            if (container) {
                patch(container, patches);
            }
        }

        this._vTree = newVTree;
    }

    formatSize(size?: number): string {
        if (!size) return '-';
        const units = ['B', 'KB', 'MB', 'GB'];
        let idx = 0;
        let val = size;
        while (val > 1024 && idx < units.length - 1) {
            val /= 1024;
            idx++;
        }
        return `${val.toFixed(1)} ${units[idx]}`;
    }

    formatDate(d?: string): string {
        if (!d) return '-';
        try {
            const dt = new Date(d);
            return dt.toLocaleString();
        } catch {
            return d;
        }
    }

    _selectItem(name: string): void {
        const wasSelected = this.selectedItems.has(name);
        const previouslySelected = Array.from(this.selectedItems);
        this.selectedItems.clear();

        if (!wasSelected) {
            this.selectedItems.add(name);
        }

        // Fast update: only modify changed items instead of querying all items
        // This significantly improves performance with large file lists
        if (this.dom.content) {
            // Remove selection from previously selected items
            for (const prevName of previouslySelected) {
                if (prevName !== name || wasSelected) {
                    const prevEl = this.dom.content.querySelector(
                        `[data-item-name="${CSS.escape(prevName)}"]`
                    );
                    if (prevEl) {
                        if (this.viewMode === 'list') {
                            prevEl.classList.remove('bg-blue-100', 'dark:bg-blue-900');
                        } else {
                            prevEl.classList.remove(
                                'ring-2',
                                'ring-blue-500',
                                'ring-offset-2',
                                'dark:ring-offset-gray-900',
                                'bg-blue-100/60',
                                'dark:bg-blue-900/40'
                            );
                        }
                    }
                }
            }

            // Add selection to newly selected item (if not deselecting)
            if (!wasSelected) {
                const newEl = this.dom.content.querySelector(
                    `[data-item-name="${CSS.escape(name)}"]`
                );
                if (newEl) {
                    if (this.viewMode === 'list') {
                        newEl.classList.add('bg-blue-100', 'dark:bg-blue-900');
                    } else {
                        newEl.classList.add(
                            'ring-2',
                            'ring-blue-500',
                            'ring-offset-2',
                            'dark:ring-offset-gray-900',
                            'bg-blue-100/60',
                            'dark:bg-blue-900/40'
                        );
                    }
                }
            }
        }
    }

    async openItem(name: string, type: 'folder' | 'file'): Promise<void> {
        if (type === 'folder') {
            this.navigateToFolder(name);
        } else {
            // Special handling for recent files: navigate to original location
            if (this.source === 'recent') {
                const item = this._renderedItems.find(i => i.name === name);
                if (item?.path) {
                    this.navigateToRecentFile(item.path);
                    return;
                }
            }

            // Track in recent files (only if not already in recent view)
            if (this.source !== 'recent') {
                this.addToRecent(name);
            }

            // Save scroll position before opening file
            this._saveScrollPosition();

            // Track selection: update DOM without full re-render to preserve scroll position
            this._selectItem(name);

            // Try to open file in an appropriate program (Text editor for text files)
            const ext = (name.split('.').pop() || '').toLowerCase();
            const textExts = new Set([
                'md',
                'txt',
                'js',
                'ts',
                'json',
                'html',
                'htm',
                'css',
                'py',
                'java',
                'c',
                'cpp',
                'h',
                'cs',
                'rs',
                'go',
                'rb',
                'php',
                'yml',
                'yaml',
                'xml',
                'sh',
                'bash',
            ]);
            const imageExts = new Set([
                'jpg',
                'jpeg',
                'png',
                'gif',
                'webp',
                'svg',
                'bmp',
                'ico',
                'tiff',
            ]);
            const pdfExts = new Set(['pdf']);

            // Helper to open text content in TextEditorWindow
            const openInTextEditor = (
                fileName: string,
                content: string,
                meta?: { repo?: string; path?: string }
            ) => {
                try {
                    const W = window as any;
                    let editorWindow: any = null;
                    // Prefer existing text-editor window
                    if (
                        W.WindowRegistry &&
                        typeof W.WindowRegistry.getWindowsByType === 'function'
                    ) {
                        const existing = W.WindowRegistry.getWindowsByType('text-editor');
                        if (existing && existing.length > 0) {
                            editorWindow = existing[0];
                        }
                    }

                    if (
                        !editorWindow &&
                        W.TextEditorWindow &&
                        typeof W.TextEditorWindow.create === 'function'
                    ) {
                        editorWindow = W.TextEditorWindow.create();
                    }

                    if (editorWindow && typeof editorWindow.createDocument === 'function') {
                        // Check if file is already open in a tab
                        const existingTabs = Array.from(editorWindow.tabs.values()) as any[];
                        const existingTab = existingTabs.find((tab: any) => tab.title === fileName);

                        if (existingTab) {
                            // File already open, just switch to that tab
                            editorWindow.setActiveTab(existingTab.id);
                            editorWindow.bringToFront?.();
                        } else {
                            // Create new document tab
                            const newDoc = editorWindow.createDocument(fileName, content);
                            // Activate the newly created tab
                            if (newDoc && newDoc.id) {
                                editorWindow.setActiveTab(newDoc.id);
                            }
                            editorWindow.bringToFront?.();
                        }
                        return true;
                    }

                    // Fallback: if a global TextEditorSystem exists, load remote file there
                    if (
                        W.TextEditorSystem &&
                        typeof W.TextEditorSystem.loadRemoteFile === 'function'
                    ) {
                        W.TextEditorSystem.loadRemoteFile({
                            content,
                            fileName,
                            repo: meta?.repo,
                            path: meta?.path,
                        });
                        return true;
                    }
                } catch (e) {
                    console.warn('[FinderView] Failed to open in text editor:', e);
                }
                return false;
            };

            // Handle local VirtualFS files
            if (this.source === 'computer') {
                try {
                    // VirtualFS expects path without leading '/' for arrays
                    const pathParts =
                        this.currentPath.length > 0 ? [...this.currentPath, name] : [name];
                    const content = (VirtualFS as any).readFile(pathParts);
                    if (content !== null && textExts.has(ext)) {
                        openInTextEditor(name, content);
                        return;
                    }
                } catch (e) {
                    console.warn('[FinderView] VirtualFS read failed:', e);
                }
            }

            // Handle GitHub-sourced files (fetch raw content if necessary)
            if (this.source === 'github') {
                const API = this.getAPI();
                const username = this.getGithubUsername();
                const repo = this.currentPath[0];
                const subPath = this.currentPath.slice(1).concat(name).join('/');
                const maybe = this.lastGithubItemsMap.get(name);

                // If the listing item contains a direct download_url (as our test mocks do), prefer it
                if (maybe && maybe.download_url) {
                    try {
                        if (imageExts.has(ext)) {
                            const url = maybe.download_url;
                            try {
                                // Try to fetch the resource and open as blob URL to avoid runtime 404/cors
                                const resp = await fetch(url);
                                if (resp.ok) {
                                    const blob = await resp.blob();
                                    const obj = URL.createObjectURL(blob);
                                    if (
                                        PreviewInstanceManager &&
                                        typeof PreviewInstanceManager.openImages === 'function'
                                    ) {
                                        PreviewInstanceManager.openImages([obj], 0, subPath);
                                    } else {
                                        window.open(url, '_blank');
                                    }
                                    return;
                                } else {
                                    // fallback to opening the remote URL
                                    window.open(url, '_blank');
                                    return;
                                }
                            } catch (efetch) {
                                console.warn(
                                    '[FinderView] fetch of download_url failed, falling back to open:',
                                    efetch
                                );
                                window.open(url, '_blank');
                                return;
                            }
                            return;
                        }
                        if (pdfExts.has(ext)) {
                            window.open(maybe.download_url, '_blank');
                            return;
                        }
                    } catch (eurl) {
                        console.warn('[FinderView] failed to open maybe.download_url:', eurl);
                    }
                }

                try {
                    // If API object already contains content (rare for listings), decode and open
                    if (maybe && maybe.content) {
                        const raw =
                            maybe.encoding === 'base64'
                                ? atob((maybe.content || '').replace(/\n/g, ''))
                                : maybe.content;
                        if (textExts.has(ext)) {
                            openInTextEditor(name, raw, { repo, path: subPath });
                            return;
                        }
                        // Try to handle images/pdf embedded in the listing object
                        try {
                            if (imageExts.has(ext)) {
                                const b64 =
                                    maybe.encoding === 'base64'
                                        ? (maybe.content || '').replace(/\n/g, '')
                                        : '';
                                if (b64) {
                                    const bytes = atob(b64);
                                    const arr = new Uint8Array(bytes.length);
                                    for (let i = 0; i < bytes.length; i++)
                                        arr[i] = bytes.charCodeAt(i);
                                    const mimeMap: Record<string, string> = {
                                        jpg: 'image/jpeg',
                                        jpeg: 'image/jpeg',
                                        png: 'image/png',
                                        gif: 'image/gif',
                                        webp: 'image/webp',
                                        svg: 'image/svg+xml',
                                        bmp: 'image/bmp',
                                        ico: 'image/x-icon',
                                        tiff: 'image/tiff',
                                    };
                                    const mime = mimeMap[ext] || 'application/octet-stream';
                                    const blob = new Blob([arr], { type: mime });
                                    const url = URL.createObjectURL(blob);
                                    if (
                                        PreviewInstanceManager &&
                                        typeof PreviewInstanceManager.openImages === 'function'
                                    ) {
                                        PreviewInstanceManager.openImages([url], 0, subPath);
                                    } else {
                                        window.open(url, '_blank');
                                    }
                                    return;
                                }
                            }
                            if (pdfExts.has(ext)) {
                                const b64 =
                                    maybe.encoding === 'base64'
                                        ? (maybe.content || '').replace(/\n/g, '')
                                        : '';
                                if (b64) {
                                    const bytes = atob(b64);
                                    const arr = new Uint8Array(bytes.length);
                                    for (let i = 0; i < bytes.length; i++)
                                        arr[i] = bytes.charCodeAt(i);
                                    const blob = new Blob([arr], { type: 'application/pdf' });
                                    const url = URL.createObjectURL(blob);
                                    window.open(url, '_blank');
                                    return;
                                }
                            }
                        } catch (eimg) {
                            console.warn('[FinderView] failed to open embedded object:', eimg);
                        }
                    }

                    // Otherwise fetch full file object from GitHub API
                    if (API && typeof API.fetchRepoContents === 'function') {
                        // Do NOT show a loading state - it would destroy scroll position
                        // Fetch in background silently
                        const fileObj = await API.fetchRepoContents(username, repo, subPath);
                        // If the API returned a direct download URL (common in mocks), prefer that for binaries
                        if (fileObj && fileObj.download_url) {
                            try {
                                if (imageExts.has(ext)) {
                                    const url = fileObj.download_url;
                                    try {
                                        const resp = await fetch(url);
                                        if (resp.ok) {
                                            const blob = await resp.blob();
                                            const obj = URL.createObjectURL(blob);
                                            PreviewInstanceManager.openImages([obj], 0, subPath);
                                            return;
                                        }
                                    } catch (ef) {
                                        console.warn(
                                            '[FinderView] failed to fetch image download_url:',
                                            ef
                                        );
                                    }
                                    window.open(fileObj.download_url, '_blank');
                                    return;
                                }
                                if (pdfExts.has(ext)) {
                                    window.open(fileObj.download_url, '_blank');
                                    return;
                                }
                            } catch (eurl) {
                                console.warn('[FinderView] failed to open download_url:', eurl);
                            }
                        }

                        // If fileObj contains base64 content we can handle text, images and pdfs
                        if (fileObj && fileObj.content && fileObj.encoding === 'base64') {
                            const rawBase64 = (fileObj.content || '').replace(/\n/g, '');
                            const rawText = atob(rawBase64);
                            if (textExts.has(ext)) {
                                openInTextEditor(name, rawText, { repo, path: subPath });
                                return;
                            }
                            try {
                                if (imageExts.has(ext)) {
                                    const bytes = atob(rawBase64);
                                    const arr = new Uint8Array(bytes.length);
                                    for (let i = 0; i < bytes.length; i++)
                                        arr[i] = bytes.charCodeAt(i);
                                    const mimeMap: Record<string, string> = {
                                        jpg: 'image/jpeg',
                                        jpeg: 'image/jpeg',
                                        png: 'image/png',
                                        gif: 'image/gif',
                                        webp: 'image/webp',
                                        svg: 'image/svg+xml',
                                        bmp: 'image/bmp',
                                        ico: 'image/x-icon',
                                        tiff: 'image/tiff',
                                    };
                                    const mime = mimeMap[ext] || 'application/octet-stream';
                                    const blob = new Blob([arr], { type: mime });
                                    const url = URL.createObjectURL(blob);
                                    if (
                                        PreviewInstanceManager &&
                                        typeof PreviewInstanceManager.openImages === 'function'
                                    ) {
                                        PreviewInstanceManager.openImages([url], 0, subPath);
                                    } else {
                                        window.open(url, '_blank');
                                    }
                                    return;
                                }
                                if (pdfExts.has(ext)) {
                                    const bytes = atob(rawBase64);
                                    const arr = new Uint8Array(bytes.length);
                                    for (let i = 0; i < bytes.length; i++)
                                        arr[i] = bytes.charCodeAt(i);
                                    const blob = new Blob([arr], { type: 'application/pdf' });
                                    const url = URL.createObjectURL(blob);
                                    window.open(url, '_blank');
                                    return;
                                }
                            } catch (e2) {
                                console.warn('[FinderView] Failed to open binary file:', e2);
                            }
                        } else {
                            const raw = fileObj ? fileObj.content || '' : '';
                            if (textExts.has(ext)) {
                                openInTextEditor(name, raw, { repo, path: subPath });
                                return;
                            }
                        }
                    }
                } catch (e: any) {
                    console.warn('[FinderView] Failed to load GitHub file:', e);
                }
            }

            // If nothing opened, leave selection (future: open images/pdf in viewer)
        }
    }

    /**
     * Navigate to a recent file's original location
     */
    private navigateToRecentFile(fullPath: string): void {
        // Parse path: e.g., "home/marvin/Documents/notes.txt"
        const parts = fullPath.split('/').filter(Boolean);
        if (parts.length === 0) return;

        const fileName = parts[parts.length - 1];
        if (!fileName) return;

        const folderParts = parts.slice(0, -1);

        // Switch to computer view and navigate to the folder
        this.source = 'computer';
        this.currentPath = folderParts;
        this._persistState();
        this._renderAll();

        // Select the file
        this._selectItem(fileName);
    }

    navigateToFolder(name: string): void {
        if (this.source === 'github') {
            this.currentPath = [...this.currentPath, name];
            this._persistState();
            this._renderAll();
            return;
        }
        // Check VirtualFS if folder exists
        // VirtualFS expects path without leading '/' for arrays, or string path like '/home'
        const targetPath = this.currentPath.length === 0 ? name : [...this.currentPath, name];
        const folder = VirtualFS.getFolder(targetPath);
        if (folder) {
            this.currentPath = [...this.currentPath, name];
            this._persistState();
            this._renderAll();
        }
    }

    navigateUp(): void {
        if (this.currentPath.length === 0) return;
        this.currentPath = this.currentPath.slice(0, -1);
        this._persistState();
        this._renderAll();
    }

    goRoot(): void {
        this.currentPath = [];
        this._persistState();
        this._renderAll();
    }

    navigateToPath(parts: string[]): void {
        this.currentPath = parts;
        this._persistState();
        this._renderAll();
    }

    setViewMode(mode: ViewMode): void {
        this.viewMode = mode;
        // Reset VDOM tree when switching view modes to force fresh render
        this._vTree = null;
        this.updateContentState({ viewMode: this.viewMode });
        this.renderContent();
    }

    setSortBy(sortBy: 'name' | 'date' | 'size' | 'type'): void {
        this.sortBy = sortBy;
        this._persistState();
        this.renderContent();
    }

    setSortOrder(order: 'asc' | 'desc'): void {
        this.sortOrder = order;
        this._persistState();
        this.renderContent();
    }

    // --- Favorites System ---
    toggleFavorite(path: string): void {
        if (this.favorites.has(path)) {
            this.favorites.delete(path);
        } else {
            this.favorites.add(path);
        }
        this._persistState();
        this.renderContent();
    }

    getFavoriteItems(): FileItem[] {
        const items: FileItem[] = [];
        for (const path of this.favorites) {
            const parts = path.split('/');
            const name = parts[parts.length - 1] || 'Unknown';
            items.push({
                name,
                type: 'folder',
                icon: '⭐',
                modified: new Date().toISOString(),
            });
        }
        return items;
    }

    // --- Recent Files System (Global Shared) ---
    private static RECENT_FILES_KEY = 'finder-recent-files';
    private static MAX_RECENT_FILES = 20;

    /**
     * Load recent files from global storage
     */
    private static loadRecentFiles(): RecentFile[] {
        try {
            const stored = localStorage.getItem(FinderView.RECENT_FILES_KEY);
            if (stored) {
                return JSON.parse(stored) as RecentFile[];
            }
        } catch (e) {
            console.warn('[FinderView] Failed to load recent files:', e);
        }
        return FinderView.getDefaultRecentFiles();
    }

    /**
     * Save recent files to global storage
     */
    private static saveRecentFiles(files: RecentFile[]): void {
        try {
            localStorage.setItem(FinderView.RECENT_FILES_KEY, JSON.stringify(files));
        } catch (e) {
            console.warn('[FinderView] Failed to save recent files:', e);
        }
    }

    /**
     * Get default recent files (with examples)
     */
    private static getDefaultRecentFiles(): RecentFile[] {
        const now = new Date().toISOString();
        const yesterday = new Date(Date.now() - 86400000).toISOString();
        const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

        return [
            {
                name: 'README.md',
                path: 'home/marvin/README.md',
                icon: '📝',
                modified: now,
            },
            {
                name: 'notes.txt',
                path: 'home/marvin/Documents/notes.txt',
                icon: '📝',
                modified: yesterday,
            },
            {
                name: 'project-plan.md',
                path: 'home/marvin/Documents/project-plan.md',
                icon: '📝',
                modified: twoDaysAgo,
            },
        ];
    }

    addToRecent(name: string): void {
        // Build full path from current location
        const pathParts = this.source === 'computer' ? this.currentPath : [];
        const fullPath = pathParts.length > 0 ? pathParts.join('/') + '/' + name : name;

        // Determine icon based on file extension
        const ext = name.split('.').pop()?.toLowerCase() || '';
        let icon = '📄';
        if (['md', 'txt'].includes(ext)) icon = '📝';
        else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) icon = '🖼️';
        else if (['pdf'].includes(ext)) icon = '�';
        else if (['zip', 'tar', 'gz'].includes(ext)) icon = '�';

        const recentFile: RecentFile = {
            name,
            path: fullPath,
            icon,
            modified: new Date().toISOString(),
        };

        // Load current global list
        const recentFiles = FinderView.loadRecentFiles();

        // Remove duplicate if exists
        const filtered = recentFiles.filter(f => f.path !== fullPath);

        // Add to front
        filtered.unshift(recentFile);

        // Limit to maxRecentFiles
        const limited = filtered.slice(0, FinderView.MAX_RECENT_FILES);

        // Save back to global storage
        FinderView.saveRecentFiles(limited);

        // Update local instance reference
        this.recentFiles = limited;
        this._persistState();
    }

    getRecentItems(): FileItem[] {
        // Always load fresh from global storage
        const recentFiles = FinderView.loadRecentFiles();
        // Note: recentFiles is already sorted with newest first (unshift in addToRecent)
        // So we can return them directly without additional sorting
        return recentFiles.map(rf => ({
            name: rf.name,
            type: 'file' as const,
            icon: rf.icon,
            modified: rf.modified,
            // Store path in a data attribute for navigation
            path: rf.path,
        }));
    }

    // --- Search Function ---
    filterItems(items: FileItem[], searchTerm: string): FileItem[] {
        if (!searchTerm || searchTerm.trim() === '') {
            return items;
        }
        const term = searchTerm.toLowerCase();
        return items.filter(item => item.name.toLowerCase().includes(term));
    }

    // --- State Persistence ---
    private _persistState(): void {
        // Update content state without triggering recursion
        this.contentState = {
            currentPath: this.currentPath,
            viewMode: this.viewMode,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            favorites: Array.from(this.favorites),
            recentFiles: this.recentFiles,
            sidebarWidth: this.sidebarWidth,
        };
        this.metadata.modified = Date.now();

        // Trigger parent window to save its state (which includes all tabs)
        if (this.parentWindow) {
            (this.parentWindow as any)._saveState?.();
        }
    }

    /**
     * Save current scroll position
     */
    private _saveScrollPosition(): void {
        if (this.dom.content) {
            const pos = this.dom.content.scrollTop;
            this._savedScrollPosition = pos;
            const key = this._locationKey();
            this._scrollPositions.set(key, pos);
        }
    }

    /**
     * Restore saved scroll position
     */
    private _restoreScrollPosition(): void {
        if (!this.dom.content) return;

        // Prefer persisted position for current location
        const key = this._locationKey();
        const persisted = this._scrollPositions.get(key) ?? 0;
        const target = this._savedScrollPosition > 0 ? this._savedScrollPosition : persisted;
        if (target > 0) {
            requestAnimationFrame(() => {
                if (this.dom.content) {
                    this.dom.content.scrollTop = target;
                }
            });
        }
    }

    /**
     * Build a stable key for current logical location
     */
    private _locationKey(): string {
        const path = this.currentPath.join('/');
        return `${this.source}:${path}`;
    }

    /**
     * Override show to restore scroll position
     */
    show(): void {
        super.show();
        this._restoreScrollPosition();
    }

    /**
     * Override hide to save scroll position
     */
    hide(): void {
        this._saveScrollPosition();
        super.hide();
    }

    serialize(): any {
        return {
            ...super.serialize(),
            source: this.source,
            currentPath: this.currentPath,
            viewMode: this.viewMode,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            favorites: Array.from(this.favorites),
            recentFiles: this.recentFiles,
            // Persist scroll positions for restoration
            scrollPositions: Array.from(this._scrollPositions.entries()),
            savedScrollPosition: this._savedScrollPosition,
        };
    }

    static deserialize(state: any): FinderView {
        const view = new FinderView({
            id: state.id,
            title: state.title || (state.source === 'github' ? 'GitHub' : 'Computer'),
            icon: state.icon || (state.source === 'github' ? '📦' : '💻'),
            source: (state.source as FinderSource) || 'computer',
            content: {
                ...state.contentState,
                favorites: state.favorites || state.contentState?.favorites || [],
                recentFiles: state.recentFiles || state.contentState?.recentFiles || [],
                sidebarWidth: state.sidebarWidth || state.contentState?.sidebarWidth || 192,
            },
        });
        view.currentPath = state.currentPath || [];
        view.viewMode = state.viewMode || 'list';
        view.sortBy = state.sortBy || 'name';
        view.sortOrder = state.sortOrder || 'asc';

        // Restore scroll positions from serialized data
        if (state.scrollPositions && Array.isArray(state.scrollPositions)) {
            view._scrollPositions = new Map(state.scrollPositions);
        }
        if (typeof state.savedScrollPosition === 'number') {
            view._savedScrollPosition = state.savedScrollPosition;
        }

        return view;
    }

    // --- GitHub Integration ---
    private getGithubUsername(): string {
        const w = window as any;
        return w.GITHUB_USERNAME || 'Marormur';
    }

    private getAPI(): any {
        const w = window as any;
        return w.GitHubAPI || null;
    }

    /**
     * Transform GitHub repos into FileItem array
     */
    private _transformRepoItems(repos: GitHubRepo[]): FileItem[] {
        return repos.map(repo => ({
            name: repo.name,
            type: 'folder' as const,
            icon: '📦',
        }));
    }

    /**
     * Transform GitHub content items into FileItem array
     */
    private _transformContentItems(contents: GitHubContentItem[]): FileItem[] {
        return contents.map(it => ({
            name: it.name,
            type: (it.type === 'dir' ? 'folder' : 'file') as 'folder' | 'file',
            icon: it.type === 'dir' ? '📁' : '📄',
            size: it.size ?? 0,
            modified: undefined,
        }));
    }

    /**
     * Render repository items (handles mapping, filtering, sorting)
     */
    private _renderRepoItems(repos: GitHubRepo[]): void {
        this.githubRepos = Array.isArray(repos) ? repos : [];
        const items = this._transformRepoItems(this.githubRepos);
        this.lastGithubItemsMap.clear();
        items.forEach(it => this.lastGithubItemsMap.set(it.name, it));

        const filtered = this.filterItems(items, this.searchTerm);
        this.renderListView(this.sortItems(filtered));
    }

    /**
     * Render content items (handles mapping, filtering, sorting)
     */
    private _renderContentItems(contents: GitHubContentItem[]): void {
        const items = this._transformContentItems(Array.isArray(contents) ? contents : []);
        this.lastGithubItemsMap.clear();
        (Array.isArray(contents) ? contents : []).forEach(it =>
            this.lastGithubItemsMap.set(it.name, it)
        );

        const filtered = this.filterItems(items, this.searchTerm);
        this.renderListView(this.sortItems(filtered));
    }

    async renderGithubContent(): Promise<void> {
        if (!this.dom.content) return;
        const API = this.getAPI();
        const username = this.getGithubUsername();

        if (!API) {
            this.dom.content.innerHTML =
                '<div class="p-4 text-sm text-red-500">GitHubAPI nicht geladen</div>';
            return;
        }

        try {
            if (this.currentPath.length === 0) {
                // Repos listing
                const cacheKey = 'repos';

                // Check cache state using the new API
                const cacheState = API.getCacheState
                    ? API.getCacheState('repos')
                    : API.isCacheStale('repos')
                      ? 'stale'
                      : API.readCache('repos')
                        ? 'fresh'
                        : 'missing';

                const cached = this._readGithubCache(cacheKey);
                const apiCached = API.readCache('repos');

                if (cached || apiCached) {
                    // Show cached data immediately (optimistic UI)
                    const repos = cached || apiCached;
                    this._renderRepoItems(repos as GitHubRepo[]);

                    // If data is stale, show refresh indicator and fetch in background
                    if (cacheState === 'stale') {
                        this._showRefreshIndicator();
                        API.fetchUserRepos(username)
                            .then((freshRepos: unknown) => {
                                API.writeCache('repos', '', '', freshRepos);
                                this._writeGithubCache(cacheKey, freshRepos);
                                this._renderRepoItems(freshRepos as GitHubRepo[]);
                                this._hideRefreshIndicator();
                            })
                            .catch((err: unknown) => {
                                console.warn('[FinderView] Background refresh failed:', err);
                                this._hideRefreshIndicator();
                                // Show subtle error state in refresh indicator
                                this._showRefreshError();
                            });
                    }
                } else {
                    // No cache - show loading skeleton
                    this._showLoadingSkeleton();

                    const repos = await API.fetchUserRepos(username);
                    API.writeCache('repos', '', '', repos);
                    this._writeGithubCache(cacheKey, repos);
                    this._renderRepoItems(repos as GitHubRepo[]);
                }
            } else {
                // Repo contents
                const repo = this.currentPath[0];
                const subPath = this.currentPath.slice(1).join('/');
                const cacheKey = `${repo}/${subPath}`;

                // Check cache state
                const cacheState = API.getCacheState
                    ? API.getCacheState('contents', repo, subPath)
                    : API.isCacheStale('contents', repo, subPath)
                      ? 'stale'
                      : API.readCache('contents', repo, subPath)
                        ? 'fresh'
                        : 'missing';

                const cached = this._readGithubCache(cacheKey);
                const apiCached = API.readCache('contents', repo, subPath);

                if (cached || apiCached) {
                    // Show cached data immediately (optimistic UI)
                    const contents = cached || apiCached;
                    this._renderContentItems(contents as GitHubContentItem[]);

                    // If data is stale, show refresh indicator and fetch in background
                    if (cacheState === 'stale') {
                        this._showRefreshIndicator();
                        API.fetchRepoContents(username, repo, subPath)
                            .then((freshContents: unknown) => {
                                API.writeCache('contents', repo, subPath, freshContents);
                                this._writeGithubCache(cacheKey, freshContents);
                                this._renderContentItems(freshContents as GitHubContentItem[]);
                                this._hideRefreshIndicator();
                            })
                            .catch((err: unknown) => {
                                console.warn('[FinderView] Background refresh failed:', err);
                                this._hideRefreshIndicator();
                                this._showRefreshError();
                            });
                    }
                } else {
                    // No cache - show loading skeleton
                    this._showLoadingSkeleton();

                    const contents = await API.fetchRepoContents(username, repo, subPath);
                    API.writeCache('contents', repo, subPath, contents);
                    this._writeGithubCache(cacheKey, contents);
                    this._renderContentItems(contents as GitHubContentItem[]);
                }
            }
        } catch (e: unknown) {
            this.githubError = true;
            this.githubErrorMessage = (e as Error)?.message || 'Unbekannter Fehler';
            this.dom.content.innerHTML = `<div class="p-4 text-sm text-red-500">GitHub Fehler: ${this.githubErrorMessage}</div>`;
        }
    }

    /**
     * Show a loading skeleton while fetching GitHub data
     */
    private _showLoadingSkeleton(): void {
        if (!this.dom.content) return;
        this.dom.content.innerHTML = `
            <div class="p-4">
                <div class="animate-pulse space-y-2">
                    ${Array.from(
                        { length: 5 },
                        () => `
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
                            <div class="flex-1 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        </div>
                    `
                    ).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Show refresh indicator in toolbar (data is being updated in background)
     */
    private _showRefreshIndicator(): void {
        if (!this.dom.toolbar) return;

        // Add a small refresh indicator to the toolbar
        let indicator = this.dom.toolbar.querySelector('.finder-refresh-indicator') as HTMLElement;
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className =
                'finder-refresh-indicator ml-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1';
            indicator.innerHTML = '<span class="animate-spin">⟳</span><span>Aktualisiere…</span>';
            const breadcrumbs = this.dom.toolbar.querySelector('.breadcrumbs');
            if (breadcrumbs?.parentElement) {
                breadcrumbs.parentElement.appendChild(indicator);
            }
        }
        indicator.style.display = 'flex';
    }

    /**
     * Hide refresh indicator
     */
    private _hideRefreshIndicator(): void {
        if (!this.dom.toolbar) return;
        const indicator = this.dom.toolbar.querySelector(
            '.finder-refresh-indicator'
        ) as HTMLElement;
        if (indicator) {
            indicator.style.display = 'none';
            // Clear any error state
            indicator.classList.remove('text-red-500');
            indicator.innerHTML = '<span class="animate-spin">⟳</span><span>Aktualisiere…</span>';
        }
    }

    /**
     * Show error state in refresh indicator
     */
    private _showRefreshError(): void {
        if (!this.dom.toolbar) return;
        const indicator = this.dom.toolbar.querySelector(
            '.finder-refresh-indicator'
        ) as HTMLElement;
        if (indicator) {
            indicator.classList.add('text-red-500');
            indicator.innerHTML = '<span>⚠</span><span>Aktualisierung fehlgeschlagen</span>';
            // Auto-hide after 3 seconds
            setTimeout(() => {
                if (indicator) {
                    indicator.style.display = 'none';
                }
            }, 3000);
        }
    }

    // --- GitHub Cache Helpers ---
    /**
     * Kleines In‑Memory‑TTL‑Cache pro FinderView. Verhindert übermäßige Re‑Renders
     * und beschleunigt Navigieren zwischen Ordnern/Repos.
     */
    private _readGithubCache(key: string): any | null {
        const cached = this.githubContentCache.get(key);
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.timestamp > this.cacheTTL) {
            // Cache expired
            this.githubContentCache.delete(key);
            return null;
        }

        return cached.data;
    }

    /** Schreibt einen Eintrag in den In‑Memory‑Cache. */
    private _writeGithubCache(key: string, data: any): void {
        this.githubContentCache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    /**
     * Ermittelt den sichtbaren Tab‑Titel: Am Root z. B. „GitHub“/„Computer“,
     * ansonsten der letzte Pfadteil. Dadurch entspricht der Tab immer dem Kontext.
     */
    private _updateTabLabel(): void {
        const w = window as any;
        const t = (key: string, fb: string) =>
            w.appI18n ? w.appI18n.translate(key, {}, { fallback: fb }) : fb;

        let label = '';
        const atRoot = this.currentPath.length === 0;
        switch (this.source) {
            case 'computer':
                label = atRoot
                    ? t('finder.sidebar.computer', 'Computer')
                    : this.currentPath[this.currentPath.length - 1];
                break;
            case 'github':
                // At root show generic GitHub view label, otherwise last path segment (repo or folder)
                label = atRoot
                    ? 'GitHub'
                    : this.currentPath[this.currentPath.length - 1] || 'GitHub';
                break;
            case 'recent':
                label = t('finder.sidebar.recent', 'Zuletzt verwendet');
                break;
            case 'starred':
                label = t('finder.sidebar.starred', 'Markiert');
                break;
            default:
                label = this.title || 'Finder';
        }

        if (this.title !== label) {
            this.setTitle(label);
        }
    }
}

(window as any).FinderView = FinderView;
