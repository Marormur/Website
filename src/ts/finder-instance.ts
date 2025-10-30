/*
 * finder-instance.ts
 * TypeScript port of the multi-instance Finder implementation.
 * Exposes window.FinderInstance and window.FinderInstanceManager for compatibility.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
    interface Window {
        FinderInstance?: any;
        FinderInstanceManager?: any;
    }
}

const ROOT_FOLDER_NAME = 'Computer';

type ViewMode = 'list' | 'grid' | 'columns';
type ViewKind = 'computer' | 'github' | 'favorites' | 'recent';

interface FileItem {
    name: string;
    type: 'folder' | 'file' | 'favorite' | 'recent' | string;
    icon?: string;
    size?: number;
    modified?: string;
    download_url?: string | null;
    path?: string;
}

interface FinderState {
    currentPath: string[];
    currentView: ViewKind;
    viewMode: ViewMode;
    sortBy: 'name' | 'date' | 'size' | 'type';
    sortOrder: 'asc' | 'desc';
    favorites: string[];
    recentFiles: Array<{ name: string; path: string; icon?: string; modified: string }>;
}

type BaseLike = {
    container: HTMLElement | null;
    updateState: (u: Record<string, unknown>) => void;
    instanceId: string;
    state: Record<string, unknown>;
} & Record<string, unknown>;
type BaseCtor = new (cfg: Record<string, unknown>) => BaseLike;
const Base = (window as unknown as { BaseWindowInstance: BaseCtor }).BaseWindowInstance;

class FinderInstance extends Base {
    currentPath: string[] = [];
    currentView: ViewKind = 'computer';
    selectedItems: Set<string> = new Set();
    viewMode: ViewMode = 'list';
    sortBy: 'name' | 'date' | 'size' | 'type' = 'name';
    sortOrder: 'asc' | 'desc' = 'asc';
    githubRepos: any[] = [];
    githubLoading = false;
    githubError = false;
    githubErrorMessage = '';
    lastGithubItemsMap: Map<string, any> = new Map();
    favorites: Set<string> = new Set();
    recentFiles: Array<{ name: string; path: string; icon?: string; modified: string }> = [];
    _lastSelectedIndex: number | null = null;
    _renderedItems: FileItem[] = [];
    domRefs: {
        sidebarComputer: HTMLElement | null;
        sidebarGithub: HTMLElement | null;
        sidebarFavorites: HTMLElement | null;
        sidebarRecent: HTMLElement | null;
        breadcrumbs: HTMLElement | null;
        contentArea: HTMLElement | null;
        toolbar: HTMLElement | null;
        searchInput: HTMLInputElement | null;
    } = {
        sidebarComputer: null,
        sidebarGithub: null,
        sidebarFavorites: null,
        sidebarRecent: null,
        breadcrumbs: null,
        contentArea: null,
        toolbar: null,
        searchInput: null,
    };

    githubContentCache: Map<string, any[]> = new Map();
    virtualFileSystem: Record<string, any> = {};

    constructor(config: any) {
        super({ ...config, type: 'finder' });
        this.selectedItems = new Set();
        this._lastSelectedIndex = null;
        this._renderedItems = [];
        this.githubContentCache = new Map();
        this.virtualFileSystem = this._createVirtualFileSystem();
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
                            content:
                                '# Willkommen im Finder\n\nDies ist ein virtuelles Dateisystem.',
                            size: 1024,
                        },
                    },
                },
                Downloads: { type: 'folder', icon: '⬇️', children: {} },
                Pictures: { type: 'folder', icon: '🖼️', children: {} },
                Music: { type: 'folder', icon: '🎵', children: {} },
                Videos: { type: 'folder', icon: '🎬', children: {} },
            },
        };
        return { [ROOT_FOLDER_NAME]: rootFolder };
    }

    protected _initializeState(initialState: Partial<FinderState>) {
        return {
            currentPath: initialState.currentPath || [],
            currentView: (initialState.currentView as ViewKind) || 'computer',
            viewMode: (initialState.viewMode as ViewMode) || 'list',
            sortBy: (initialState.sortBy as FinderState['sortBy']) || 'name',
            sortOrder: (initialState.sortOrder as FinderState['sortOrder']) || 'asc',
            favorites: initialState.favorites || [],
            recentFiles: initialState.recentFiles || [],
        } as FinderState;
    }

    render() {
        if (!this.container) return;
        const html = `
            <div class="finder-instance-wrapper flex-1 flex gap-0 min-h-0 overflow-hidden">
                <aside class="w-48 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                    <div class="py-2">
                        <div class="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide" data-i18n="finder.sidebar.favorites">Favoriten</div>
                        <button id="finder-sidebar-computer" data-finder-sidebar-computer data-action="finder:switchView" data-finder-view="computer" class="finder-sidebar-item finder-sidebar-active">
                            <span class="finder-sidebar-icon">💻</span>
                            <span data-i18n="finder.sidebar.computer">Computer</span>
                        </button>
                        <button id="finder-sidebar-recent" data-finder-sidebar-recent data-action="finder:switchView" data-finder-view="recent" class="finder-sidebar-item">
                            <span class="finder-sidebar-icon">🕒</span>
                            <span data-i18n="finder.sidebar.recent">Zuletzt geöffnet</span>
                        </button>
                        <div class="px-3 py-1 mt-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide" data-i18n="finder.sidebar.locations">Orte</div>
                        <button id="finder-sidebar-github" data-finder-sidebar-github data-action="finder:switchView" data-finder-view="github" class="finder-sidebar-item">
                            <span class="finder-sidebar-icon">📂</span>
                            <span data-i18n="finder.sidebar.github">GitHub Projekte</span>
                        </button>
                        <button id="finder-sidebar-favorites" data-finder-sidebar-favorites data-action="finder:switchView" data-finder-view="favorites" class="finder-sidebar-item">
                            <span class="finder-sidebar-icon">⭐</span>
                            <span data-i18n="finder.sidebar.starred">Mit Stern</span>
                        </button>
                    </div>
                </aside>
                <div class="flex-1 flex flex-col min-h-0">
                    <div id="finder-toolbar" data-finder-toolbar class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                        <button data-action="finder:navigateUp" class="finder-toolbar-btn" title="Zurück" data-i18n-title="finder.toolbar.back">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                        </button>
                        <button data-action="finder:goRoot" class="finder-toolbar-btn" title="Vorwärts" data-i18n-title="finder.toolbar.forward">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                        <div class="flex-1 mx-2">
                            <div id="finder-path-breadcrumbs" data-finder-breadcrumbs class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400"></div>
                        </div>
                        <div class="flex gap-1">
                            <button data-action="finder:setViewMode" data-view-mode="list" class="finder-toolbar-btn" title="Listenansicht" data-i18n-title="finder.toolbar.listView">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4m0 7h18v2H3v-2m0 7h18v2H3v-2Z" /></svg>
                            </button>
                            <button data-action="finder:setViewMode" data-view-mode="grid" class="finder-toolbar-btn" title="Rasteransicht" data-i18n-title="finder.toolbar.gridView">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3m10 0h8v8h-8V3M3 13h8v8H3v-8m10 0h8v8h-8v-8Z" /></svg>
                            </button>
                        </div>
                        <input id="finder-search-input" data-finder-search type="text" placeholder="Suchen" data-i18n-placeholder="finder.toolbar.search" class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div id="finder-content-area" data-finder-content class="flex-1 overflow-auto bg-white dark:bg-gray-800 p-4"></div>
                </div>
            </div>`;

        this.container.innerHTML = html;

        this.domRefs.sidebarComputer = this.container.querySelector(
            '[data-finder-sidebar-computer]'
        );
        this.domRefs.sidebarGithub = this.container.querySelector('[data-finder-sidebar-github]');
        this.domRefs.sidebarFavorites = this.container.querySelector(
            '[data-finder-sidebar-favorites]'
        );
        this.domRefs.sidebarRecent = this.container.querySelector('[data-finder-sidebar-recent]');
        this.domRefs.breadcrumbs = this.container.querySelector('[data-finder-breadcrumbs]');
        this.domRefs.contentArea = this.container.querySelector('[data-finder-content]');
        this.domRefs.toolbar = this.container.querySelector('[data-finder-toolbar]');
        this.domRefs.searchInput = this.container.querySelector('[data-finder-search]');

        try {
            if (window.appI18n && typeof window.appI18n.applyTranslations === 'function') {
                window.appI18n.applyTranslations();
            }
        } catch {
            /* noop */
        }
    }

    attachEventListeners() {
        if (!this.container) return;
        this.container.addEventListener('click', (e: Event) => this._handleClick(e));
        this.container.addEventListener('dblclick', (e: Event) => this._handleDoubleClick(e));
        if (!(this as any)._skipInitialRender) {
            this.navigateTo(
                (this as any).state?.currentPath || [],
                (this as any).state?.currentView || this.currentView
            );
        }
    }

    private _handleClick(e: any) {
        const contentRoot: HTMLElement | null = this.domRefs?.contentArea || this.container;
        if (contentRoot && contentRoot.contains(e.target)) {
            const itemEl: HTMLElement | null =
                e.target.closest?.('.finder-list-item, .finder-grid-item') || null;
            const isEmptySpacer = (e.target as HTMLElement).id === 'finder-empty-spacer';
            const isContainerClick = (e.target as HTMLElement).id === 'finder-list-container';
            if (!itemEl || isEmptySpacer || isContainerClick) {
                if (this.selectedItems.size) {
                    this.selectedItems.clear();
                    this._lastSelectedIndex = null;
                    // Optimistically remove selection classes before re-render
                    try {
                        const rows = contentRoot.querySelectorAll('.finder-list-item');
                        rows.forEach((r: Element) => {
                            (r as HTMLElement).classList.remove('bg-blue-100', 'dark:bg-blue-900');
                        });
                    } catch {}
                    this.renderContent();
                }
                // If click did not hit an item, treat as background click and stop further handling
                if (!itemEl || isEmptySpacer || isContainerClick) {
                    e.stopPropagation?.();
                    e.preventDefault?.();
                    return;
                }
            }
        }

        const clickedItem: HTMLElement | null =
            e.target.closest?.('.finder-list-item, .finder-grid-item') || null;
        if (clickedItem && (clickedItem as any).dataset) {
            const name = (clickedItem as any).dataset.itemName as string;
            const type = (clickedItem as any).dataset.itemType as string;
            const idxStr = (clickedItem as any).dataset.index as string;
            const index = typeof idxStr === 'string' ? parseInt(idxStr, 10) : NaN;
            if (name && type) {
                this._handleItemSelection({ name, type, index, event: e });
                e.stopPropagation?.();
                e.preventDefault?.();
                return;
            }
        }

        const action = e.target.closest?.('[data-action]')?.dataset.action as string | undefined;
        if (!action) return;

        const handlers: Record<string, () => void> = {
            'finder:switchView': () => {
                const view = e.target.closest('[data-finder-view]')?.dataset.finderView as ViewKind;
                if (view) this.switchView(view);
            },
            'finder:navigateUp': () => this.navigateUp(),
            'finder:goRoot': () => this.navigateTo([], this.currentView),
            'finder:navigateToPath': () => {
                const path = e.target.closest('[data-path]')?.dataset.path as string;
                if (path !== undefined) this.navigateTo(path);
            },
            'finder:setSortBy': () => {
                const sortBy = e.target.closest('[data-sort-by]')?.dataset
                    .sortBy as FinderState['sortBy'];
                if (sortBy) this.setSortBy(sortBy);
            },
            'finder:setViewMode': () => {
                const mode = e.target.closest('[data-view-mode]')?.dataset.viewMode as ViewMode;
                if (mode) this.setViewMode(mode);
            },
        };

        if (handlers[action]) handlers[action]();
    }

    private _handleDoubleClick(e: any) {
        const item = e.target.closest?.('[data-action-dblclick]');
        if (!item || item.dataset.actionDblclick !== 'finder:openItem') return;
        const name = item.dataset.itemName as string;
        const type = item.dataset.itemType as string;
        if (name && type) this.openItem(name, type);
    }

    private _handleItemSelection({
        name,
        type: _type,
        index,
        event,
    }: {
        name: string;
        type: string;
        index: number;
        event: any;
    }) {
        const isShift = !!event.shiftKey;
        const isToggle = !!(event.metaKey || event.ctrlKey);
        const count = Array.isArray(this._renderedItems) ? this._renderedItems.length : 0;

        if (isShift && count > 0 && this._lastSelectedIndex !== null && !Number.isNaN(index)) {
            const start = Math.max(0, Math.min(this._lastSelectedIndex, index));
            const end = Math.min(count - 1, Math.max(this._lastSelectedIndex, index));
            if (!isToggle) this.selectedItems.clear();
            for (let i = start; i <= end; i++) {
                const it = this._renderedItems[i];
                if (it && it.name) this.selectedItems.add(it.name);
            }
        } else if (isToggle) {
            if (this.selectedItems.has(name)) this.selectedItems.delete(name);
            else this.selectedItems.add(name);
            this._lastSelectedIndex = Number.isNaN(index) ? null : index;
        } else {
            this.selectedItems.clear();
            this.selectedItems.add(name);
            this._lastSelectedIndex = Number.isNaN(index) ? null : index;
        }
        this.renderContent();
    }

    getCurrentFolderName() {
        const _lang = (
            window.appI18n?.getActiveLanguage?.() ||
            document.documentElement?.lang ||
            'de'
        ).toLowerCase();
        const _isDe = _lang.startsWith('de');
        if (this.currentPath.length === 0) {
            switch (this.currentView) {
                case 'computer':
                    return _isDe ? 'Computer' : 'Computer';
                case 'github':
                    return _isDe ? 'GitHub Projekte' : 'GitHub Projects';
                case 'favorites':
                    return _isDe ? 'Favoriten' : 'Favorites';
                case 'recent':
                    return _isDe ? 'Zuletzt geöffnet' : 'Recently opened';
                default:
                    return 'Finder';
            }
        }
        return this.currentPath[this.currentPath.length - 1];
    }

    updateTabTitle() {
        const folderName = this.getCurrentFolderName();
        // Only update the visible tab label, do not overwrite the instance title
        (this as any).metadata = { ...((this as any).metadata || {}), tabLabel: folderName };
        try {
            const tabController = document.querySelector('#finder-tabs-container');
            if (tabController && (window as any).multiInstanceIntegration) {
                const integration = (window as any).multiInstanceIntegration.integrations?.get?.(
                    'finder'
                );
                if (integration?.tabManager?.setTitle) {
                    integration.tabManager.setTitle((this as any).instanceId, folderName);
                }
            }
        } catch {
            /* ignore */
        }
    }

    navigateTo(path: string | string[], view: ViewKind | null = null) {
        if (view !== null) this.currentView = view;
        if (typeof path === 'string') this.currentPath = path === '' ? [] : path.split('/');
        else if (Array.isArray(path)) this.currentPath = [...path];
        this.selectedItems.clear();
        this._lastSelectedIndex = null;
        this.updateSidebarSelection();
        this.renderBreadcrumbs();
        this.renderContent();
        this.updateTabTitle();
        (this as any).updateState?.({
            currentPath: this.currentPath,
            currentView: this.currentView,
        });
    }

    navigateUp() {
        if (this.currentPath.length > 0) {
            this.currentPath.pop();
            this.navigateTo(this.currentPath);
        }
    }

    navigateToFolder(folderName: string) {
        this.currentPath.push(folderName);
        this.navigateTo(this.currentPath);
    }

    switchView(view: ViewKind) {
        this.currentPath = [];
        this.navigateTo([], view);
    }

    updateSidebarSelection() {
        const refs = this.domRefs;
        if (!refs) return;
        [
            refs.sidebarComputer,
            refs.sidebarGithub,
            refs.sidebarFavorites,
            refs.sidebarRecent,
        ].forEach(el => {
            if (el) el.classList.remove('finder-sidebar-active');
        });
        switch (this.currentView) {
            case 'computer':
                refs.sidebarComputer?.classList.add('finder-sidebar-active');
                break;
            case 'github':
                refs.sidebarGithub?.classList.add('finder-sidebar-active');
                break;
            case 'favorites':
                refs.sidebarFavorites?.classList.add('finder-sidebar-active');
                break;
            case 'recent':
                refs.sidebarRecent?.classList.add('finder-sidebar-active');
                break;
        }
    }

    renderBreadcrumbs() {
        if (!this.domRefs.breadcrumbs) return;
        const parts: string[] = [];
        const _lang = (
            window.appI18n?.getActiveLanguage?.() ||
            document.documentElement?.lang ||
            'de'
        ).toLowerCase();
        const _isDe = _lang.startsWith('de');
        let viewLabel = '';
        switch (this.currentView) {
            case 'computer':
                viewLabel = _isDe ? 'Computer' : 'Computer';
                break;
            case 'github':
                viewLabel = _isDe ? 'GitHub Projekte' : 'GitHub Projects';
                break;
            case 'favorites':
                viewLabel = _isDe ? 'Favoriten' : 'Favorites';
                break;
            case 'recent':
                viewLabel = _isDe ? 'Zuletzt geöffnet' : 'Recently opened';
                break;
        }
        parts.push(
            `<button class="finder-breadcrumb-item" data-action="finder:goRoot">${viewLabel}</button>`
        );
        this.currentPath.forEach((part, index) => {
            if (index === 0 && this.currentView === 'computer' && part === ROOT_FOLDER_NAME) return;
            const pathUpToHere = this.currentPath.slice(0, index + 1);
            parts.push('<span class="finder-breadcrumb-separator">›</span>');
            parts.push(
                `<button class="finder-breadcrumb-item" data-action="finder:navigateToPath" data-path="${pathUpToHere.join('/')}">${part}</button>`
            );
        });
        this.domRefs.breadcrumbs.innerHTML = parts.join('');
    }

    renderContent() {
        if (!this.domRefs.contentArea) return;
        if (this.currentView === 'github') {
            this.renderGithubContent();
            return;
        }
        const items = this.getCurrentItems();
        if (items.length === 0) {
            let emptyText = 'Dieser Ordner ist leer';
            try {
                const lang = (
                    window.appI18n?.getActiveLanguage?.() ||
                    document.documentElement?.lang ||
                    'de'
                ).toLowerCase();
                emptyText = lang.startsWith('de')
                    ? 'Dieser Ordner ist leer'
                    : 'This folder is empty';
            } catch {}
            this.domRefs.contentArea.innerHTML = `<div class="finder-empty-state"><div class="text-6xl mb-4">📂</div><div class="text-gray-500 dark:text-gray-400">${emptyText}</div></div>`;
            return;
        }
        const sortedItems = this.sortItems(items);
        switch (this.viewMode) {
            case 'list':
                this.renderListView(sortedItems);
                break;
            case 'grid':
                this.renderGridView(sortedItems);
                break;
            case 'columns':
                this.renderListView(sortedItems);
                break;
        }
    }

    getCurrentItems(): FileItem[] {
        switch (this.currentView) {
            case 'computer':
                return this.getComputerItems();
            case 'github':
                return this.getGithubItems();
            case 'favorites':
                return this.getFavoriteItems();
            case 'recent':
                return this.getRecentItems();
            default:
                return [];
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
            type: item.type,
            icon: item.icon || (item.type === 'folder' ? '📁' : '📄'),
            size: item.size || 0,
            modified: item.modified || new Date().toISOString(),
        }));
    }

    getGithubItems(): FileItem[] {
        return [];
    }

    getFavoriteItems(): FileItem[] {
        return Array.from(this.favorites).map(path => ({
            name: path.split('/').pop() || path,
            type: 'favorite',
            icon: '⭐',
            path,
        }));
    }

    getRecentItems(): FileItem[] {
        return this.recentFiles.map(file => ({
            name: file.name,
            type: 'recent',
            icon: file.icon || '📄',
            path: file.path,
            modified: file.modified,
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

    renderListView(items: FileItem[]) {
        this._renderedItems = items;
        const rows = items
            .map((item, i) => {
                const isSelected = this.selectedItems.has(item.name);
                const selectedCls = isSelected ? 'bg-blue-100 dark:bg-blue-900' : '';
                return `
                <tr class="finder-list-item ${selectedCls}" data-index="${i}" data-action-dblclick="finder:openItem" data-item-name="${item.name}" data-item-type="${item.type}">
                    <td><span class="finder-item-icon">${item.icon || ''}</span><span class="finder-item-name">${item.name}</span></td>
                    <td>${this.formatSize(item.size)}</td>
                    <td>${this.formatDate(item.modified)}</td>
                </tr>`;
            })
            .join('');
        this.domRefs.contentArea!.innerHTML = `
                        <div id="finder-list-container">
                            <table class="finder-list-table">
                <thead>
                  <tr>
                    <th data-action="finder:setSortBy" data-sort-by="name">Name</th>
                    <th data-action="finder:setSortBy" data-sort-by="size">Größe</th>
                    <th data-action="finder:setSortBy" data-sort-by="date">Geändert</th>
                  </tr>
                </thead>
                                <tbody>${rows}</tbody>
                            </table>
                            <div id="finder-empty-spacer" style="height: 32px;"></div>
            </div>`;
    }

    renderGridView(items: FileItem[]) {
        this._renderedItems = items;
        const tiles = items
            .map((item, i) => {
                const isSelected = this.selectedItems.has(item.name);
                const selectedCls = isSelected
                    ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 bg-blue-100/60 dark:bg-blue-900/40'
                    : '';
                return `
              <div class="finder-grid-item ${selectedCls}" data-index="${i}" data-action-dblclick="finder:openItem" data-item-name="${item.name}" data-item-type="${item.type}">
                <div class="finder-grid-icon">${item.icon || ''}</div>
                <div class="finder-grid-name">${item.name}</div>
              </div>`;
            })
            .join('');
        this.domRefs.contentArea!.innerHTML = `
                    <div id="finder-list-container">
                        <div class="finder-grid-container">${tiles}</div>
                        <div id="finder-empty-spacer" style="height: 32px;"></div>
                    </div>`;
    }

    openItem(name: string, type: string) {
        if (type === 'folder') {
            this.navigateToFolder(name);
        } else if (type === 'file') {
            this.addToRecent(name);
            (this as any).emit?.('fileOpened', {
                name,
                path: [...this.currentPath, name].join('/'),
            });
            if (this.currentView === 'github') {
                const item = this.lastGithubItemsMap.get(name);
                const isImage = /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(name);
                if (item && isImage && item.download_url) {
                    this.openImageViewer({ src: item.download_url, name });
                }
            }
        }
    }

    async renderGithubContent() {
        const el = this.domRefs.contentArea;
        if (!el) return;
        if (this.currentPath.length === 0) {
            el.innerHTML = '<div class="finder-empty-state">Lade Repositories…</div>';
            const repos = await this.fetchGithubRepos();
            this.lastGithubItemsMap.clear();
            const items = (repos || []).map((repo: any) => ({
                name: repo.name,
                type: 'folder',
                icon: '📦',
            }));
            items.forEach((it: any) => this.lastGithubItemsMap.set(it.name, it));
            if (this.githubError && items.length === 0) {
                el.innerHTML =
                    '<div class="finder-empty-state text-center"><div class="text-2xl mb-2">⚠️</div><div>Repositories could not be loaded (Repos konnten nicht geladen werden). Possible Rate Limit.</div></div>';
            } else if (items.length === 0) {
                el.innerHTML =
                    '<div class="finder-empty-state text-center">Keine öffentlichen Repositories gefunden</div>';
            } else {
                this.renderListView(items);
            }
            return;
        }
        const repo = this.currentPath[0];
        if (!repo) {
            return;
        }
        const subPathParts = this.currentPath.slice(1);
        const subPath = subPathParts.join('/');
        el.innerHTML = '<div class="finder-empty-state">Lade Inhalte…</div>';
        const contents = await this.fetchGithubContents(repo, subPath);
        this.lastGithubItemsMap.clear();
        const items = (contents || []).map((entry: any) => {
            const isDir = entry.type === 'dir';
            return {
                name: entry.name,
                type: isDir ? 'folder' : 'file',
                icon: isDir ? '📁' : '📄',
                size: entry.size || 0,
                download_url: entry.download_url || null,
            } as FileItem;
        });
        items.forEach((it: any) => this.lastGithubItemsMap.set(it.name, it));
        if (this.githubError && items.length === 0) {
            el.innerHTML =
                '<div class="finder-empty-state text-center"><div class="text-2xl mb-2">⚠️</div><div>Repositories could not be loaded (Repos konnten nicht geladen werden). Possible Rate Limit.</div></div>';
        } else if (items.length === 0) {
            el.innerHTML =
                '<div class="finder-empty-state text-center">Dieser Ordner ist leer</div>';
        } else {
            this.renderListView(items);
        }
    }

    async fetchGithubRepos() {
        const GITHUB_USERNAME = 'Marormur';
        try {
            if (Array.isArray(this.githubRepos) && this.githubRepos.length) return this.githubRepos;
            const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos`, {
                headers: { Accept: 'application/vnd.github.v3+json' },
            });
            if (!res.ok) throw new Error('GitHub repos fetch failed');
            const data = await res.json();
            this.githubRepos = data || [];
            this.githubError = false;
            this.githubErrorMessage = '';
            return this.githubRepos;
        } catch (e) {
            console.warn('GitHub repos error:', e);
            this.githubError = true;
            this.githubErrorMessage = 'Repositories could not be loaded';
            return [];
        }
    }

    async fetchGithubContents(repo: string, subPath = '') {
        try {
            const key = `${repo}:${subPath}`;
            if (this.githubContentCache.has(key)) return this.githubContentCache.get(key);
            const base = `https://api.github.com/repos/Marormur/${repo}/contents`;
            const url = subPath ? `${base}/${this._encodeGithubPath(subPath)}` : base;
            const res = await fetch(url, { headers: { Accept: 'application/vnd.github.v3+json' } });
            if (!res.ok) throw new Error('GitHub contents fetch failed');
            const data = await res.json();
            this.githubContentCache.set(key, data || []);
            this.githubError = false;
            this.githubErrorMessage = '';
            return data;
        } catch (e) {
            console.warn('GitHub contents error:', e);
            this.githubError = true;
            this.githubErrorMessage = 'Repositories could not be loaded';
            return [];
        }
    }

    private _encodeGithubPath(subPath: string) {
        if (!subPath) return '';
        return subPath
            .split('/')
            .filter(Boolean)
            .map(seg => encodeURIComponent(seg))
            .join('/');
    }

    openImageViewer({ src, name }: { src: string; name: string }) {
        try {
            const img = document.getElementById('image-viewer') as HTMLImageElement | null;
            const info = document.getElementById('image-info');
            const placeholder = document.getElementById('image-placeholder');
            if (info) {
                info.textContent = name || '';
                info.classList.remove('hidden');
            }
            if (placeholder) placeholder.classList.add('hidden');
            if (img) {
                img.src = src;
                img.classList.remove('hidden');
            }
            const w = window as unknown as {
                PhotosApp?: { showExternalImage?: (params: { src: string; name: string }) => void };
                API?: { window?: { open?: (id: string) => void } };
            };
            if (w.PhotosApp && typeof w.PhotosApp.showExternalImage === 'function') {
                w.PhotosApp.showExternalImage({ src, name });
            }
            if (w.API?.window?.open) {
                w.API.window.open('image-modal');
            } else {
                const modal = document.getElementById('image-modal');
                if (modal) modal.classList.remove('hidden');
            }
        } catch (e) {
            console.warn('Failed to open image viewer:', e);
        }
    }

    addToRecent(name: string) {
        const fullPath = [...this.currentPath, name].join('/');
        this.recentFiles.unshift({
            name,
            path: fullPath,
            icon: '📄',
            modified: new Date().toISOString(),
        });
        this.recentFiles = this.recentFiles.slice(0, 20);
        (this as any).updateState?.({ recentFiles: this.recentFiles });
    }

    setSortBy(field: FinderState['sortBy']) {
        if (this.sortBy === field) this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        else {
            this.sortBy = field;
            this.sortOrder = 'asc';
        }
        this.renderContent();
        (this as any).updateState?.({ sortBy: this.sortBy, sortOrder: this.sortOrder });
    }

    setViewMode(mode: ViewMode) {
        this.viewMode = mode;
        this.renderContent();
        (this as any).updateState?.({ viewMode: this.viewMode });
    }

    formatSize(bytes?: number) {
        if (!bytes || bytes === 0) return '-';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    formatDate(dateStr?: string) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }

    serialize(): Record<string, unknown> {
        const baseSerialize = (
            Base.prototype as unknown as { serialize: () => Record<string, unknown> }
        ).serialize;
        const baseObj = baseSerialize.call(this) as Record<string, unknown>;
        return {
            ...baseObj,
            currentPath: this.currentPath,
            currentView: this.currentView,
            viewMode: this.viewMode,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder,
            favorites: Array.from(this.favorites),
            recentFiles: this.recentFiles,
        };
    }

    deserialize(data: Record<string, unknown>): void {
        const baseDeserialize = (
            Base.prototype as unknown as { deserialize: (d: Record<string, unknown>) => void }
        ).deserialize;
        baseDeserialize.call(this, data);
        const d = data as {
            currentPath?: string[];
            currentView?: ViewKind;
            viewMode?: ViewMode;
            sortBy?: 'name' | 'date' | 'size' | 'type';
            sortOrder?: 'asc' | 'desc';
            favorites?: string[];
            recentFiles?: Array<{ name: string; path: string; icon?: string; modified: string }>;
        };
        if (d.currentPath) this.currentPath = d.currentPath;
        if (d.currentView) this.currentView = d.currentView;
        if (d.viewMode) this.viewMode = d.viewMode;
        if (d.sortBy) this.sortBy = d.sortBy;
        if (d.sortOrder) this.sortOrder = d.sortOrder;
        if (d.favorites) this.favorites = new Set(d.favorites);
        if (d.recentFiles) this.recentFiles = d.recentFiles;
        this.navigateTo(this.currentPath, this.currentView);
    }

    focus(): void {
        const baseFocus = (Base.prototype as unknown as { focus: () => void }).focus;
        baseFocus.call(this);
        // Do not autofocus search input automatically
    }
}

(window as unknown as { FinderInstance: typeof FinderInstance }).FinderInstance = FinderInstance;

const G = window as unknown as Record<string, unknown>;
type InstanceManagerCtor = new (cfg: Record<string, unknown>) => unknown;
const InstanceManager = G['InstanceManager'] as unknown as InstanceManagerCtor | undefined;
if (InstanceManager) {
    (G['FinderInstanceManager'] as unknown) = new (InstanceManager as InstanceManagerCtor)({
        type: 'finder',
        instanceClass: FinderInstance,
        maxInstances: 0,
        createContainer: function (instanceId: string): HTMLElement {
            const finderModalContainer = document.getElementById('finder-container');
            const container = document.createElement('div');
            container.id = `${instanceId}-container`;
            container.className =
                'finder-instance-container h-full flex-1 w-full min-w-0 flex flex-col min-h-0';
            container.classList.add('hidden');
            if (finderModalContainer) {
                finderModalContainer.appendChild(container);
            } else {
                console.error('Finder container not found; using document.body as fallback');
                document.body.appendChild(container);
            }
            return container;
        },
    });
}

export {};
