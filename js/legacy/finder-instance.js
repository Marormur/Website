"use strict";
console.log('FinderInstance loaded');
/**
 * FinderInstance - Multi-Instance fähiger Finder-Implementierung
 *
 * Ermöglicht mehrere Finder-Fenster mit isolierten States
 * Zeigt, wie das Finder-Modul für Multi-Instance umgebaut werden kann
 */
(function () {
    'use strict';
    // Constants
    const ROOT_FOLDER_NAME = 'Computer';
    /**
     * Single Finder Instance
     * Extends BaseWindowInstance to support multiple finder windows
     */
    class FinderInstance extends window.BaseWindowInstance {
        constructor(config) {
            super({
                ...config,
                type: 'finder',
            });
            // Finder-specific state
            this.currentPath = [];
            this.currentView = 'computer'; // 'computer', 'github', 'favorites', 'recent'
            this.selectedItems = new Set();
            this.viewMode = 'list'; // 'list', 'grid', 'columns'
            this.sortBy = 'name'; // 'name', 'date', 'size', 'type'
            this.sortOrder = 'asc'; // 'asc', 'desc'
            this.githubRepos = [];
            this.githubLoading = false;
            this.githubError = false;
            this.githubErrorMessage = '';
            this.lastGithubItemsMap = new Map();
            this.favorites = new Set();
            this.recentFiles = [];
            // DOM References (per instance)
            this.domRefs = {
                sidebarComputer: null,
                sidebarGithub: null,
                sidebarFavorites: null,
                sidebarRecent: null,
                breadcrumbs: null,
                contentArea: null,
                toolbar: null,
                searchInput: null,
            };
            // GitHub cache
            this.githubContentCache = new Map();
            // Virtual file system (per instance)
            this.virtualFileSystem = this._createVirtualFileSystem();
        }
        /**
         * Create virtual file system for this instance
         * @private
         */
        _createVirtualFileSystem() {
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
                                content: '# Willkommen im Finder\n\nDies ist ein virtuelles Dateisystem.',
                                size: 1024,
                            },
                        },
                    },
                    Downloads: {
                        type: 'folder',
                        icon: '⬇️',
                        children: {},
                    },
                    Pictures: {
                        type: 'folder',
                        icon: '🖼️',
                        children: {},
                    },
                    Music: {
                        type: 'folder',
                        icon: '🎵',
                        children: {},
                    },
                    Videos: {
                        type: 'folder',
                        icon: '🎬',
                        children: {},
                    },
                },
            };
            return {
                [ROOT_FOLDER_NAME]: rootFolder,
            };
        }
        /**
         * Initialize instance state
         * @protected
         */
        _initializeState(initialState) {
            return {
                ...super._initializeState(initialState),
                currentPath: initialState.currentPath || [],
                currentView: initialState.currentView || 'computer',
                viewMode: initialState.viewMode || 'list',
                sortBy: initialState.sortBy || 'name',
                sortOrder: initialState.sortOrder || 'asc',
                favorites: initialState.favorites || [],
                recentFiles: initialState.recentFiles || [],
            };
        }
        /**
         * Render finder UI
         * @protected
         */
        render() {
            if (!this.container)
                return;
            const html = `
                <div class="finder-instance-wrapper flex-1 flex gap-0 min-h-0 overflow-hidden">
                    <!-- Sidebar -->
                    <aside class="w-48 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                        <div class="py-2">
                            <!-- Favoriten Section -->
                            <div class="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                                data-i18n="finder.sidebar.favorites">
                                Favoriten
                            </div>
                            <button id="finder-sidebar-computer" data-finder-sidebar-computer data-action="finder:switchView" data-finder-view="computer"
                                class="finder-sidebar-item finder-sidebar-active">
                                <span class="finder-sidebar-icon">💻</span>
                                <span data-i18n="finder.sidebar.computer">Computer</span>
                            </button>
                            <button id="finder-sidebar-recent" data-finder-sidebar-recent data-action="finder:switchView" data-finder-view="recent"
                                class="finder-sidebar-item">
                                <span class="finder-sidebar-icon">🕒</span>
                                <span data-i18n="finder.sidebar.recent">Zuletzt geöffnet</span>
                            </button>

                            <!-- Orte Section -->
                            <div class="px-3 py-1 mt-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                                data-i18n="finder.sidebar.locations">
                                Orte
                            </div>
                            <button id="finder-sidebar-github" data-finder-sidebar-github data-action="finder:switchView" data-finder-view="github"
                                class="finder-sidebar-item">
                                <span class="finder-sidebar-icon">📂</span>
                                <span data-i18n="finder.sidebar.github">GitHub Projekte</span>
                            </button>
                            <button id="finder-sidebar-favorites" data-finder-sidebar-favorites data-action="finder:switchView"
                                data-finder-view="favorites" class="finder-sidebar-item">
                                <span class="finder-sidebar-icon">⭐</span>
                                <span data-i18n="finder.sidebar.starred">Mit Stern</span>
                            </button>
                        </div>
                    </aside>

                    <!-- Main Content Area -->
                    <div class="flex-1 flex flex-col min-h-0">
                        <!-- Toolbar -->
                        <div id="finder-toolbar" data-finder-toolbar
                            class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                            <button data-action="finder:navigateUp" class="finder-toolbar-btn" title="Zurück"
                                data-i18n-title="finder.toolbar.back">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button data-action="finder:goRoot" class="finder-toolbar-btn" title="Vorwärts"
                                data-i18n-title="finder.toolbar.forward">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </button>
                            <div class="flex-1 mx-2">
                                <div id="finder-path-breadcrumbs" data-finder-breadcrumbs
                                    class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                    <!-- Breadcrumbs werden dynamisch generiert -->
                                </div>
                            </div>
                            <div class="flex gap-1">
                                <button data-action="finder:setViewMode" data-view-mode="list" class="finder-toolbar-btn"
                                    title="Listenansicht" data-i18n-title="finder.toolbar.listView">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 4h18v2H3V4m0 7h18v2H3v-2m0 7h18v2H3v-2Z" />
                                    </svg>
                                </button>
                                <button data-action="finder:setViewMode" data-view-mode="grid" class="finder-toolbar-btn"
                                    title="Rasteransicht" data-i18n-title="finder.toolbar.gridView">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 3h8v8H3V3m10 0h8v8h-8V3M3 13h8v8H3v-8m10 0h8v8h-8v-8Z" />
                                    </svg>
                                </button>
                            </div>
                            <input id="finder-search-input" data-finder-search type="text" placeholder="Suchen"
                                data-i18n-placeholder="finder.toolbar.search"
                                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>

                        <!-- Content Area -->
                        <div id="finder-content-area" data-finder-content class="flex-1 overflow-auto bg-white dark:bg-gray-800 p-4">
                            <!-- Content wird dynamisch generiert -->
                        </div>
                    </div>
                </div>
            `;
            this.container.innerHTML = html;
            // Cache DOM references
            this.domRefs.sidebarComputer = this.container.querySelector('[data-finder-sidebar-computer]');
            this.domRefs.sidebarGithub = this.container.querySelector('[data-finder-sidebar-github]');
            this.domRefs.sidebarFavorites = this.container.querySelector('[data-finder-sidebar-favorites]');
            this.domRefs.sidebarRecent = this.container.querySelector('[data-finder-sidebar-recent]');
            this.domRefs.breadcrumbs = this.container.querySelector('[data-finder-breadcrumbs]');
            this.domRefs.contentArea = this.container.querySelector('[data-finder-content]');
            this.domRefs.toolbar = this.container.querySelector('[data-finder-toolbar]');
            this.domRefs.searchInput = this.container.querySelector('[data-finder-search]');
        }
        /**
         * Attach event listeners
         * @protected
         */
        attachEventListeners() {
            if (!this.container)
                return;
            // Delegate events on container
            this.container.addEventListener('click', e => this._handleClick(e));
            this.container.addEventListener('dblclick', e => this._handleDoubleClick(e));
            // Initial render
            this.navigateTo(this.state.currentPath, this.state.currentView);
        }
        /**
         * Handle click events
         * @private
         */
        _handleClick(e) {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (!action)
                return;
            const handlers = {
                'finder:switchView': () => {
                    const view = e.target.closest('[data-finder-view]')?.dataset.finderView;
                    if (view)
                        this.switchView(view);
                },
                'finder:navigateUp': () => this.navigateUp(),
                'finder:goRoot': () => this.navigateTo([], this.currentView),
                'finder:navigateToPath': () => {
                    const path = e.target.closest('[data-path]')?.dataset.path;
                    if (path)
                        this.navigateTo(path);
                },
                'finder:setSortBy': () => {
                    const sortBy = e.target.closest('[data-sort-by]')?.dataset.sortBy;
                    if (sortBy)
                        this.setSortBy(sortBy);
                },
                'finder:setViewMode': () => {
                    const mode = e.target.closest('[data-view-mode]')?.dataset.viewMode;
                    if (mode)
                        this.setViewMode(mode);
                },
            };
            if (handlers[action]) {
                handlers[action]();
            }
        }
        /**
         * Handle double click events
         * @private
         */
        _handleDoubleClick(e) {
            const item = e.target.closest('[data-action-dblclick]');
            if (!item || item.dataset.actionDblclick !== 'finder:openItem')
                return;
            const name = item.dataset.itemName;
            const type = item.dataset.itemType;
            if (name && type) {
                this.openItem(name, type);
            }
        }
        /**
         * Navigate to path
         */
        navigateTo(path, view = null) {
            if (view !== null) {
                this.currentView = view;
            }
            if (typeof path === 'string') {
                this.currentPath = path === '' ? [] : path.split('/');
            }
            else if (Array.isArray(path)) {
                this.currentPath = [...path];
            }
            this.updateSidebarSelection();
            this.renderBreadcrumbs();
            this.renderContent();
            this.updateState({
                currentPath: this.currentPath,
                currentView: this.currentView,
            });
        }
        /**
         * Navigate up one level
         */
        navigateUp() {
            if (this.currentPath.length > 0) {
                this.currentPath.pop();
                this.navigateTo(this.currentPath);
            }
        }
        /**
         * Navigate to folder
         */
        navigateToFolder(folderName) {
            this.currentPath.push(folderName);
            this.navigateTo(this.currentPath);
        }
        /**
         * Switch view
         */
        switchView(view) {
            this.currentPath = [];
            this.navigateTo([], view);
        }
        /**
         * Update sidebar selection
         */
        updateSidebarSelection() {
            const refs = this.domRefs;
            if (!refs)
                return;
            // Remove all active marks
            [
                refs.sidebarComputer,
                refs.sidebarGithub,
                refs.sidebarFavorites,
                refs.sidebarRecent,
            ].forEach(el => {
                if (el)
                    el.classList.remove('finder-sidebar-active');
            });
            // Mark current view
            switch (this.currentView) {
                case 'computer':
                    if (refs.sidebarComputer)
                        refs.sidebarComputer.classList.add('finder-sidebar-active');
                    break;
                case 'github':
                    if (refs.sidebarGithub)
                        refs.sidebarGithub.classList.add('finder-sidebar-active');
                    break;
                case 'favorites':
                    if (refs.sidebarFavorites)
                        refs.sidebarFavorites.classList.add('finder-sidebar-active');
                    break;
                case 'recent':
                    if (refs.sidebarRecent)
                        refs.sidebarRecent.classList.add('finder-sidebar-active');
                    break;
            }
        }
        /**
         * Render breadcrumbs
         */
        renderBreadcrumbs() {
            if (!this.domRefs.breadcrumbs)
                return;
            const parts = [];
            // View label
            let viewLabel = '';
            switch (this.currentView) {
                case 'computer':
                    viewLabel = 'Computer';
                    break;
                case 'github':
                    viewLabel = 'GitHub Projekte';
                    break;
                case 'favorites':
                    viewLabel = 'Favoriten';
                    break;
                case 'recent':
                    viewLabel = 'Zuletzt geöffnet';
                    break;
            }
            parts.push(`<button class="finder-breadcrumb-item" data-action="finder:goRoot">${viewLabel}</button>`);
            // Path parts
            this.currentPath.forEach((part, index) => {
                // Skip root folder name if we're in computer view and it's the first part
                if (index === 0 && this.currentView === 'computer' && part === ROOT_FOLDER_NAME) {
                    return;
                }
                const pathUpToHere = this.currentPath.slice(0, index + 1);
                parts.push('<span class="finder-breadcrumb-separator">›</span>');
                parts.push(`<button class="finder-breadcrumb-item" data-action="finder:navigateToPath" data-path="${pathUpToHere.join('/')}">${part}</button>`);
            });
            this.domRefs.breadcrumbs.innerHTML = parts.join('');
        }
        /**
         * Render content area
         */
        renderContent() {
            if (!this.domRefs.contentArea)
                return;
            // Special handling for GitHub view (async loading)
            if (this.currentView === 'github') {
                this.renderGithubContent();
                return;
            }
            const items = this.getCurrentItems();
            if (items.length === 0) {
                this.domRefs.contentArea.innerHTML = `
                    <div class="finder-empty-state">
                        <div class="text-6xl mb-4">📂</div>
                        <div class="text-gray-500 dark:text-gray-400">Dieser Ordner ist leer</div>
                    </div>
                `;
                return;
            }
            // Sort items
            const sortedItems = this.sortItems(items);
            // Render based on view mode
            switch (this.viewMode) {
                case 'list':
                    this.renderListView(sortedItems);
                    break;
                case 'grid':
                    this.renderGridView(sortedItems);
                    break;
                case 'columns':
                    this.renderListView(sortedItems); // Fallback to list for now
                    break;
            }
        }
        /**
         * Get current items based on view and path
         */
        getCurrentItems() {
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
        /**
         * Get computer items
         */
        getComputerItems() {
            let current = this.virtualFileSystem;
            for (const pathPart of this.currentPath) {
                if (current[pathPart] && current[pathPart].children) {
                    current = current[pathPart].children;
                }
                else {
                    return [];
                }
            }
            return Object.entries(current).map(([name, item]) => ({
                name,
                type: item.type,
                icon: item.icon || (item.type === 'folder' ? '📁' : '📄'),
                size: item.size || 0,
                modified: item.modified || new Date().toISOString(),
            }));
        }
        /**
         * Get GitHub items (placeholder - simplified from finder.js)
         */
        getGithubItems() {
            // Fallback (should be handled by renderGithubContent)
            return [];
        }
        /**
         * Get favorite items
         */
        getFavoriteItems() {
            return Array.from(this.favorites).map(path => ({
                name: path.split('/').pop(),
                type: 'favorite',
                icon: '⭐',
                path,
            }));
        }
        /**
         * Get recent items
         */
        getRecentItems() {
            return this.recentFiles.map(file => ({
                name: file.name,
                type: 'recent',
                icon: file.icon || '📄',
                path: file.path,
                modified: file.modified,
            }));
        }
        /**
         * Sort items
         */
        sortItems(items) {
            const sorted = [...items];
            sorted.sort((a, b) => {
                // Folders first
                if (a.type === 'folder' && b.type !== 'folder')
                    return -1;
                if (a.type !== 'folder' && b.type === 'folder')
                    return 1;
                // Then by sortBy
                let comparison = 0;
                switch (this.sortBy) {
                    case 'name':
                        comparison = a.name.localeCompare(b.name);
                        break;
                    case 'size':
                        comparison = (a.size || 0) - (b.size || 0);
                        break;
                    case 'date':
                        comparison = new Date(b.modified || 0) - new Date(a.modified || 0);
                        break;
                    case 'type':
                        comparison = (a.type || '').localeCompare(b.type || '');
                        break;
                }
                return this.sortOrder === 'asc' ? comparison : -comparison;
            });
            return sorted;
        }
        /**
         * Render list view
         */
        renderListView(items) {
            const html = `
                <div id="finder-list-container">
                <table class="finder-list-table">
                    <thead>
                        <tr>
                            <th data-action="finder:setSortBy" data-sort-by="name">Name</th>
                            <th data-action="finder:setSortBy" data-sort-by="size">Größe</th>
                            <th data-action="finder:setSortBy" data-sort-by="date">Geändert</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items
                .map(item => `
                            <tr class="finder-list-item" data-action-dblclick="finder:openItem" data-item-name="${item.name}" data-item-type="${item.type}">
                                <td>
                                    <span class="finder-item-icon">${item.icon}</span>
                                    <span class="finder-item-name">${item.name}</span>
                                </td>
                                <td>${this.formatSize(item.size)}</td>
                                <td>${this.formatDate(item.modified)}</td>
                            </tr>
                        `)
                .join('')}
                    </tbody>
                </table>
                </div>
            `;
            this.domRefs.contentArea.innerHTML = html;
        }
        /**
         * Render grid view
         */
        renderGridView(items) {
            const html = `
                <div id="finder-list-container">
                <div class="finder-grid-container">
                    ${items
                .map(item => `
                        <div class="finder-grid-item" data-action-dblclick="finder:openItem" data-item-name="${item.name}" data-item-type="${item.type}">
                            <div class="finder-grid-icon">${item.icon}</div>
                            <div class="finder-grid-name">${item.name}</div>
                        </div>
                    `)
                .join('')}
                </div>
                </div>
            `;
            this.domRefs.contentArea.innerHTML = html;
        }
        /**
         * Open item
         */
        openItem(name, type) {
            if (type === 'folder') {
                this.navigateToFolder(name);
            }
            else if (type === 'file') {
                // Add to recent files
                this.addToRecent(name);
                // Emit event for file opening (can be handled by parent)
                this.emit('fileOpened', { name, path: [...this.currentPath, name].join('/') });
                // If in GitHub view and image file, open Preview
                if (this.currentView === 'github') {
                    const item = this.lastGithubItemsMap.get(name);
                    const isImage = /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(name);
                    if (item && isImage && item.download_url) {
                        // Collect all images in current folder
                        const allImages = [];
                        let startIndex = 0;
                        let idx = 0;
                        this.lastGithubItemsMap.forEach((entry, key) => {
                            if (/\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(key) && entry.download_url) {
                                if (key === name)
                                    startIndex = idx;
                                allImages.push(entry.download_url);
                                idx++;
                            }
                        });
                        // Open Preview with all images
                        if (window.PreviewInstanceManager && typeof window.PreviewInstanceManager.openImages === 'function') {
                            const fullPath = [...this.currentPath, name].join('/');
                            window.PreviewInstanceManager.openImages(allImages, startIndex, fullPath);
                        }
                    }
                }
            }
        }
        /**
         * Render GitHub view with async fetching and caching
         */
        async renderGithubContent() {
            const el = this.domRefs.contentArea;
            if (!el)
                return;
            // Root (list repos)
            if (this.currentPath.length === 0) {
                // Loading placeholder
                el.innerHTML = '<div class="finder-empty-state">Lade Repositories…</div>';
                const repos = await this.fetchGithubRepos();
                this.lastGithubItemsMap.clear();
                const items = (repos || []).map(repo => ({
                    name: repo.name,
                    type: 'folder',
                    icon: '📦',
                }));
                items.forEach(it => this.lastGithubItemsMap.set(it.name, it));
                if (this.githubError && items.length === 0) {
                    el.innerHTML =
                        '<div class="finder-empty-state text-center"><div class="text-2xl mb-2">⚠️</div><div>Repositories could not be loaded (Repos konnten nicht geladen werden). Possible Rate Limit.</div></div>';
                }
                else if (items.length === 0) {
                    el.innerHTML =
                        '<div class="finder-empty-state text-center">Keine öffentlichen Repositories gefunden</div>';
                }
                else {
                    this.renderListView(items);
                }
                return;
            }
            // Repo and subpaths
            const repo = this.currentPath[0];
            const subPathParts = this.currentPath.slice(1);
            const subPath = subPathParts.join('/');
            el.innerHTML = '<div class="finder-empty-state">Lade Inhalte…</div>';
            const contents = await this.fetchGithubContents(repo, subPath);
            this.lastGithubItemsMap.clear();
            const items = (contents || []).map(entry => {
                const isDir = entry.type === 'dir';
                return {
                    name: entry.name,
                    type: isDir ? 'folder' : 'file',
                    icon: isDir ? '📁' : '📄',
                    size: entry.size || 0,
                    download_url: entry.download_url || null,
                };
            });
            items.forEach(it => this.lastGithubItemsMap.set(it.name, it));
            if (this.githubError && items.length === 0) {
                el.innerHTML =
                    '<div class="finder-empty-state text-center"><div class="text-2xl mb-2">⚠️</div><div>Repositories could not be loaded (Repos konnten nicht geladen werden). Possible Rate Limit.</div></div>';
            }
            else if (items.length === 0) {
                el.innerHTML =
                    '<div class="finder-empty-state text-center">Dieser Ordner ist leer</div>';
            }
            else {
                this.renderListView(items);
            }
        }
        /**
         * Fetch GitHub repos for configured user
         */
        async fetchGithubRepos() {
            const GITHUB_USERNAME = 'Marormur';
            try {
                // Simple in-memory cache per instance
                if (Array.isArray(this.githubRepos) && this.githubRepos.length) {
                    return this.githubRepos;
                }
                const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos`, {
                    headers: { Accept: 'application/vnd.github.v3+json' },
                });
                if (!res.ok)
                    throw new Error('GitHub repos fetch failed');
                const data = await res.json();
                this.githubRepos = data || [];
                this.githubError = false;
                this.githubErrorMessage = '';
                return this.githubRepos;
            }
            catch (e) {
                console.warn('GitHub repos error:', e);
                this.githubError = true;
                this.githubErrorMessage = 'Repositories could not be loaded';
                return [];
            }
        }
        /**
         * Fetch contents (files/folders) for a given repo and subPath
         */
        async fetchGithubContents(repo, subPath = '') {
            try {
                const key = `${repo}:${subPath}`;
                if (this.githubContentCache.has(key)) {
                    return this.githubContentCache.get(key);
                }
                const base = `https://api.github.com/repos/Marormur/${repo}/contents`;
                const url = subPath ? `${base}/${this._encodeGithubPath(subPath)}` : base;
                const res = await fetch(url, {
                    headers: { Accept: 'application/vnd.github.v3+json' },
                });
                if (!res.ok)
                    throw new Error('GitHub contents fetch failed');
                const data = await res.json();
                this.githubContentCache.set(key, data || []);
                this.githubError = false;
                this.githubErrorMessage = '';
                return data;
            }
            catch (e) {
                console.warn('GitHub contents error:', e);
                this.githubError = true;
                this.githubErrorMessage = 'Repositories could not be loaded';
                return [];
            }
        }
        /**
         * Encode a GitHub path by encoding segments but keeping '/'
         */
        _encodeGithubPath(subPath) {
            if (!subPath)
                return '';
            return subPath
                .split('/')
                .filter(Boolean)
                .map(seg => encodeURIComponent(seg))
                .join('/');
        }
        /**
         * Open image viewer modal with given src
         */
        openImageViewer({ src, name }) {
            try {
                const img = document.getElementById('image-viewer');
                const info = document.getElementById('image-info');
                const placeholder = document.getElementById('image-placeholder');
                if (info) {
                    info.textContent = name || '';
                    info.classList.remove('hidden');
                }
                if (placeholder)
                    placeholder.classList.add('hidden');
                if (img) {
                    img.src = src;
                    img.classList.remove('hidden');
                }
                // Notify Photos App about external image if available
                if (window.PhotosApp && typeof window.PhotosApp.showExternalImage === 'function') {
                    window.PhotosApp.showExternalImage({ src, name });
                }
                if (window.API?.window?.open) {
                    window.API.window.open('image-modal');
                }
                else {
                    const modal = document.getElementById('image-modal');
                    if (modal)
                        modal.classList.remove('hidden');
                }
            }
            catch (e) {
                console.warn('Failed to open image viewer:', e);
            }
        }
        /**
         * Add to recent files
         */
        addToRecent(name) {
            const fullPath = [...this.currentPath, name].join('/');
            this.recentFiles.unshift({
                name,
                path: fullPath,
                icon: '📄',
                modified: new Date().toISOString(),
            });
            // Limit to 20 items
            this.recentFiles = this.recentFiles.slice(0, 20);
            this.updateState({ recentFiles: this.recentFiles });
        }
        /**
         * Set sort by
         */
        setSortBy(field) {
            if (this.sortBy === field) {
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            }
            else {
                this.sortBy = field;
                this.sortOrder = 'asc';
            }
            this.renderContent();
            this.updateState({ sortBy: this.sortBy, sortOrder: this.sortOrder });
        }
        /**
         * Set view mode
         */
        setViewMode(mode) {
            this.viewMode = mode;
            this.renderContent();
            this.updateState({ viewMode: this.viewMode });
        }
        /**
         * Format size
         */
        formatSize(bytes) {
            if (!bytes || bytes === 0)
                return '-';
            if (bytes < 1024)
                return bytes + ' B';
            if (bytes < 1024 * 1024)
                return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
        /**
         * Format date
         */
        formatDate(dateStr) {
            if (!dateStr)
                return '-';
            const date = new Date(dateStr);
            return date.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        }
        /**
         * Serialize finder state
         */
        serialize() {
            return {
                ...super.serialize(),
                currentPath: this.currentPath,
                currentView: this.currentView,
                viewMode: this.viewMode,
                sortBy: this.sortBy,
                sortOrder: this.sortOrder,
                favorites: Array.from(this.favorites),
                recentFiles: this.recentFiles,
            };
        }
        /**
         * Restore finder from saved state
         */
        deserialize(data) {
            super.deserialize(data);
            if (data.currentPath) {
                this.currentPath = data.currentPath;
            }
            if (data.currentView) {
                this.currentView = data.currentView;
            }
            if (data.viewMode) {
                this.viewMode = data.viewMode;
            }
            if (data.sortBy) {
                this.sortBy = data.sortBy;
            }
            if (data.sortOrder) {
                this.sortOrder = data.sortOrder;
            }
            if (data.favorites) {
                this.favorites = new Set(data.favorites);
            }
            if (data.recentFiles) {
                this.recentFiles = data.recentFiles;
            }
            // Re-render
            this.navigateTo(this.currentPath, this.currentView);
        }
        /**
         * Focus finder
         */
        focus() {
            super.focus();
            if (this.domRefs.searchInput) {
                // Don't auto-focus search input, just bring to front
            }
        }
    }
    // Export
    window.FinderInstance = FinderInstance;
    // Create Finder Instance Manager
    if (window.InstanceManager) {
        window.FinderInstanceManager = new window.InstanceManager({
            type: 'finder',
            instanceClass: FinderInstance,
            maxInstances: 0, // Unlimited
            createContainer: function (instanceId) {
                // Create container and append to finder modal container
                const finderModalContainer = document.getElementById('finder-container');
                if (!finderModalContainer) {
                    console.error('Finder container not found');
                    return null;
                }
                const container = document.createElement('div');
                container.id = `${instanceId}-container`;
                // Make this container a flex column so the rendered content's flex-1 can expand
                container.className = 'finder-instance-container h-full flex flex-col min-h-0';
                // Initially hidden (will be shown by integration layer)
                container.classList.add('hidden');
                finderModalContainer.appendChild(container);
                return container;
            },
        });
    }
})();
//# sourceMappingURL=finder-instance.js.map