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

import { BaseTab, type TabConfig } from './base-tab.js';

const ROOT_FOLDER_NAME = 'Computer';

type ViewMode = 'list' | 'grid';

interface FileItem {
    name: string;
    type: 'folder' | 'file';
    icon?: string;
    size?: number;
    modified?: string;
}

interface RecentFile {
    name: string;
    path: string;
    icon: string;
    modified: string;
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

    // Simple in-memory virtual FS for the Computer view
    virtualFileSystem: Record<string, any>;

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
    };

    githubRepos: any[];
    githubError = false;
    githubErrorMessage = '';
    lastGithubItemsMap: Map<string, any>;

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

        this.virtualFileSystem = this._createVirtualFileSystem();
        this.githubRepos = [];
        this.lastGithubItemsMap = new Map();

        // Initialize Favorites and Recent Files from saved state
        const savedFavorites = config?.content?.favorites || [];
        this.favorites = new Set(savedFavorites);
        this.recentFiles = config?.content?.recentFiles || [];
        this.maxRecentFiles = 20;

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
        };
    }

    private _createVirtualFileSystem() {
        const rootFolder = {
            type: 'folder',
            icon: '💻',
            children: {
                Documents: {
                    type: 'folder',
                    icon: '📄',
                    children: {
                        'README.md': {
                            type: 'file',
                            icon: '📝',
                            size: 1024,
                            modified: new Date().toISOString(),
                        },
                    },
                },
                Downloads: { type: 'folder', icon: '⬇️', children: {} },
                Pictures: { type: 'folder', icon: '🖼️', children: {} },
                Music: { type: 'folder', icon: '🎵', children: {} },
                Videos: { type: 'folder', icon: '🎬', children: {} },
            },
        };
        return { [ROOT_FOLDER_NAME]: rootFolder } as Record<string, any>;
    }

    createDOM(): HTMLElement {
        const container = document.createElement('div');
        container.id = `${this.id}-container`;
        container.className = 'tab-content hidden w-full h-full flex flex-col min-h-0';

        const isGithub = this.source === 'github';
        container.innerHTML = `
            <div class="flex-1 flex gap-0 min-h-0 overflow-hidden">
                <aside class="w-48 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                    <div class="py-2">
                        <div class="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide" data-i18n="finder.sidebar.favorites">FAVORITEN</div>
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
                <div class="flex-1 flex flex-col min-h-0">
                    <div class="finder-toolbar px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                        <!-- Back / Root like old Finder -->
                        <button class="finder-toolbar-btn" data-action="navigate-up" data-i18n-title="finder.toolbar.back" title="Zurück">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                        </button>
                        <button class="finder-toolbar-btn" data-action="navigate-root" data-i18n-title="finder.toolbar.forward" title="Nach vorn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                        <!-- Breadcrumbs centered/left grow -->
                        <div class="flex-1 mx-2">
                            <div class="breadcrumbs text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1"></div>
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
                        <input type="text" class="finder-search px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" data-i18n-placeholder="finder.toolbar.search" placeholder="Suchen" style="width: 180px;" />
                    </div>
                    <div class="finder-content flex-1 overflow-auto bg-white dark:bg-gray-800" data-finder-content></div>
                </div>
            </div>
        `;

        this.element = container;
        this.dom.toolbar = container.querySelector('.finder-toolbar');
        this.dom.breadcrumbs = container.querySelector('.breadcrumbs');
        this.dom.content = container.querySelector('.finder-content');
        this.dom.viewListBtn = null;
        this.dom.viewGridBtn = null;

        // Toolbar/Sidebar/Content Interaktionen anbinden
        this._attachEvents();
        this._attachSidebarEvents();
        this._setupContentEventHandlers();
        this._renderAll();

        // Apply i18n translations
        const w = window as any;
        if (w.appI18n) {
            w.appI18n.applyTranslations(container);
        }

        return container;
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
                // Update active state
                sidebarButtons.forEach(b => b.classList.remove('finder-sidebar-active'));
                btn.classList.add('finder-sidebar-active');

                // Handle action
                if (action === 'computer') {
                    this.source = 'computer';
                    this.goRoot();
                } else if (action === 'github') {
                    this.source = 'github';
                    this.goRoot();
                } else if (action === 'recent') {
                    this.source = 'recent';
                    this.goRoot();
                } else if (action === 'starred') {
                    this.source = 'starred';
                    this.goRoot();
                }
            });
        });
    }

    private _setupContentEventHandlers(): void {
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
            this.openItem(item.name, item.type);
        });
    }

    private _renderAll(): void {
        this.renderBreadcrumbs();
        this.renderContent();
    }

    renderBreadcrumbs(): void {
        if (!this.dom.breadcrumbs) return;
        // Ensure the tab title reflects the current folder/view
        this._updateTabLabel();
        const parts: string[] = [];
        const viewLabel = this.source === 'github' ? 'GitHub' : 'Computer';
        parts.push(
            `<button class="finder-breadcrumb-item" data-action="goRoot">${viewLabel}</button>`
        );
        this.currentPath.forEach((part, index) => {
            if (this.source === 'computer' && index === 0 && part === ROOT_FOLDER_NAME) return;
            const pathUpToHere = this.currentPath.slice(0, index + 1).join('/');
            parts.push('<span class="finder-breadcrumb-separator">›</span>');
            parts.push(
                `<button class="finder-breadcrumb-item" data-action="goto" data-path="${pathUpToHere}">${part}</button>`
            );
        });
        this.dom.breadcrumbs.innerHTML = parts.join('');
        this.dom.breadcrumbs
            .querySelectorAll<HTMLButtonElement>('button[data-action="goto"]')
            .forEach(btn => {
                btn.addEventListener('click', () => {
                    const path = btn.dataset.path || '';
                    const parts = path.split('/').filter(Boolean);
                    this.navigateToPath(parts);
                });
            });
        const rootBtn = this.dom.breadcrumbs.querySelector<HTMLButtonElement>(
            'button[data-action="goRoot"]'
        );
        if (rootBtn) rootBtn.addEventListener('click', () => this.goRoot());
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
        const sorted = this.sortItems(filtered);

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
        let current: any = this.virtualFileSystem;
        for (const pathPart of this.currentPath) {
            if (current[pathPart] && current[pathPart].children)
                current = current[pathPart].children;
            else return [];
        }
        return Object.entries(current).map(([name, item]: [string, any]) => ({
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
        const rows = items
            .map(
                (item, i) => `
            <tr class="finder-list-item ${this.selectedItems.has(item.name) ? 'bg-blue-100 dark:bg-blue-900' : ''}" data-item-index="${i}" data-item-name="${item.name}" data-item-type="${item.type}">
                <td><span class="finder-item-icon">${item.icon || ''}</span>${item.name}</td>
                <td class="text-right">${this.formatSize(item.size)}</td>
                <td class="text-right text-gray-500 dark:text-gray-400">${this.formatDate(item.modified)}</td>
            </tr>
        `
            )
            .join('');
        this.dom.content!.innerHTML = `
            <div class="p-2">
                <table class="finder-list-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th class="text-right">Größe</th>
                            <th class="text-right">Geändert</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
        this._setupContentEventHandlers();
    }

    renderGridView(items: FileItem[]): void {
        this._renderedItems = items;
        const tiles = items
            .map(
                (item, i) => `
            <div class="finder-grid-item ${this.selectedItems.has(item.name) ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 bg-blue-100/60 dark:bg-blue-900/40' : ''}" data-item-index="${i}">
                <div class="finder-grid-icon">${item.icon || ''}</div>
                <div class="finder-grid-name">${item.name}</div>
            </div>
        `
            )
            .join('');
        this.dom.content!.innerHTML = `
            <div class="finder-grid-container">${tiles}</div>
        `;
        this._setupContentEventHandlers();
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
        this.selectedItems.clear();
        this.selectedItems.add(name);
        this.renderContent();
    }

    openItem(name: string, type: 'folder' | 'file'): void {
        if (type === 'folder') {
            this.navigateToFolder(name);
        } else {
            // Track in recent files
            this.addToRecent(name);
            // In Zukunft: Datei öffnen mit passender App
            // Hier nur Statusänderung
            this._selectItem(name);
        }
    }

    navigateToFolder(name: string): void {
        if (this.source === 'github') {
            this.currentPath = [...this.currentPath, name];
            this._persistState();
            this._renderAll();
            return;
        }
        // Resolve folder path based on current path
        let current: any = this.virtualFileSystem;
        for (const part of this.currentPath) {
            if (current[part] && current[part].children) current = current[part].children;
            else return;
        }
        const target = current[name];
        if (target && target.type === 'folder') {
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

    // --- Recent Files System ---
    addToRecent(name: string): void {
        const path = this.currentPath.join('/') + '/' + name;
        const icon = name.endsWith('.md') || name.endsWith('.txt') ? '📝' : '📄';
        const recentFile: RecentFile = {
            name,
            path,
            icon,
            modified: new Date().toISOString(),
        };

        // Remove duplicate if exists
        this.recentFiles = this.recentFiles.filter(f => f.path !== path);

        // Add to front
        this.recentFiles.unshift(recentFile);

        // Limit to maxRecentFiles
        if (this.recentFiles.length > this.maxRecentFiles) {
            this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
        }

        this._persistState();
    }

    getRecentItems(): FileItem[] {
        return this.recentFiles.map(rf => ({
            name: rf.name,
            type: 'file' as const,
            icon: rf.icon,
            modified: rf.modified,
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
        };
        this.metadata.modified = Date.now();

        // Trigger parent window to save its state (which includes all tabs)
        if (this.parentWindow) {
            (this.parentWindow as any)._saveState?.();
        }
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
            },
        });
        view.currentPath = state.currentPath || [];
        view.viewMode = state.viewMode || 'list';
        view.sortBy = state.sortBy || 'name';
        view.sortOrder = state.sortOrder || 'asc';
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

    async renderGithubContent(): Promise<void> {
        if (!this.dom.content) return;
        const API = this.getAPI();
        const username = this.getGithubUsername();
        this.dom.content.innerHTML = '<div class="p-4 text-sm opacity-80">Lade GitHub…</div>';

        if (!API) {
            this.dom.content.innerHTML =
                '<div class="p-4 text-sm text-red-500">GitHubAPI nicht geladen</div>';
            return;
        }

        try {
            if (this.currentPath.length === 0) {
                // Repos
                const cacheKey = 'repos';
                let repos: any;

                // Check our internal cache first
                const cached = this._readGithubCache(cacheKey);
                if (cached) {
                    repos = cached;
                } else {
                    // Check API cache
                    const apiCached = API.readCache('repos');
                    repos = apiCached ?? (await API.fetchUserRepos(username));
                    if (!apiCached) API.writeCache('repos', '', '', repos);
                    this._writeGithubCache(cacheKey, repos);
                }

                this.githubRepos = Array.isArray(repos) ? repos : [];
                const items: FileItem[] = this.githubRepos.map((repo: any) => ({
                    name: repo.name,
                    type: 'folder',
                    icon: '📦',
                }));
                this.lastGithubItemsMap.clear();
                items.forEach(it => this.lastGithubItemsMap.set(it.name, it));

                // Apply search filter for GitHub too
                const filtered = this.filterItems(items, this.searchTerm);
                this.renderListView(this.sortItems(filtered));
            } else {
                // Repo contents
                const repo = this.currentPath[0];
                const subPath = this.currentPath.slice(1).join('/');
                const cacheKey = `${repo}/${subPath}`;
                let contents: any;

                // Check our internal cache first
                const cached = this._readGithubCache(cacheKey);
                if (cached) {
                    contents = cached;
                } else {
                    // Check API cache
                    const apiCached = API.readCache('contents', repo, subPath);
                    contents = apiCached ?? (await API.fetchRepoContents(username, repo, subPath));
                    if (!apiCached) API.writeCache('contents', repo, subPath, contents);
                    this._writeGithubCache(cacheKey, contents);
                }

                const items: FileItem[] = (Array.isArray(contents) ? contents : []).map(
                    (it: any) => ({
                        name: it.name,
                        type: it.type === 'dir' ? 'folder' : 'file',
                        icon: it.type === 'dir' ? '📁' : '📄',
                        size: it.size ?? 0,
                        modified: it.git_url ? undefined : undefined,
                    })
                );
                this.lastGithubItemsMap.clear();
                (Array.isArray(contents) ? contents : []).forEach((it: any) =>
                    this.lastGithubItemsMap.set(it.name, it)
                );

                // Apply search filter for GitHub too
                const filtered = this.filterItems(items, this.searchTerm);
                this.renderListView(this.sortItems(filtered));
            }
        } catch (e: any) {
            this.githubError = true;
            this.githubErrorMessage = e?.message || 'Unbekannter Fehler';
            this.dom.content.innerHTML = `<div class="p-4 text-sm text-red-500">GitHub Fehler: ${this.githubErrorMessage}</div>`;
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
                label = atRoot ? 'GitHub' : this.currentPath[this.currentPath.length - 1];
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
