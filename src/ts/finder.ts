/**
 * finder.ts
 * Finder System - Vollwertiger Dateimanager
 *
 * Features:
 * - Virtuelle Ordnerstruktur (Computer, Downloads, Dokumente, etc.)
 * - Integration mit GitHub-Projekten
 * - Favoriten und zuletzt geöffnete Dateien
 * - File Upload & Download
 * - Dateiverwaltung (Ordner erstellen, umbenennen, löschen)
 */

console.log('Finder.js loaded');

(() => {
    'use strict';

    // ============================================================================
    // Types
    // ============================================================================

    interface VirtualFileSystemFile {
        type: 'file';
        icon: string;
        content: string;
        size: number;
        modified?: string;
    }

    interface VirtualFileSystemFolder {
        type: 'folder';
        icon: string;
        children: Record<string, VirtualFileSystemFile | VirtualFileSystemFolder>;
    }

    type VirtualFileSystemItem = VirtualFileSystemFile | VirtualFileSystemFolder;

    interface GitHubRepo {
        name: string;
        updated_at?: string;
        pushed_at?: string;
        created_at?: string;
        html_url?: string;
    }

    interface GitHubContentItem {
        name: string;
        type: string;
        size?: number;
        url?: string;
        html_url?: string;
        download_url?: string;
    }

    interface FinderItem {
        name: string;
        type: string;
        icon: string;
        size?: number;
        modified?: string;
        path?: string;
        html_url?: string;
        url?: string;
        download_url?: string;
        action?: () => void;
    }

    interface RecentFile {
        name: string;
        path: string;
        icon: string;
        modified: string;
    }

    type ViewMode = 'list' | 'grid' | 'columns';
    type SortBy = 'name' | 'date' | 'size' | 'type';
    type SortOrder = 'asc' | 'desc';
    type CurrentView = 'computer' | 'github' | 'favorites' | 'recent';

    interface FinderState {
        currentPath: string[];
        currentView: CurrentView;
        selectedItems: Set<string>;
        viewMode: ViewMode;
        sortBy: SortBy;
        sortOrder: SortOrder;
        githubRepos: GitHubRepo[];
        githubLoading: boolean;
        githubError: boolean;
        favorites: Set<string>;
        recentFiles: RecentFile[];
    }

    interface DomRefs {
        sidebarComputer: HTMLElement | null;
        sidebarGithub: HTMLElement | null;
        sidebarFavorites: HTMLElement | null;
        sidebarRecent: HTMLElement | null;
        breadcrumbs: HTMLElement | null;
        contentArea: HTMLElement | null;
        toolbar: HTMLElement | null;
        searchInput: HTMLInputElement | null;
    }

    interface FinderSystemType {
        init(): void;
        navigateTo(path: string[] | string, view?: CurrentView | null): void;
        navigateUp(): void;
        navigateToFolder(folderName: string): void;
        openItem(name: string, type: string): void;
        setSortBy(field: SortBy): void;
        setViewMode(mode: ViewMode): void;
        toggleFavorite(path: string): void;
        getState(): FinderState;
        openFinder(): void;
        closeFinder(): void;
    }

    interface CachePayload {
        t: number;
        d: unknown;
    }

    interface GitHubAPIWindow {
        GitHubAPI?: {
            getHeaders(): Record<string, string>;
            writeCache(kind: string, repo: string, subPath: string, data: unknown): void;
            readCache(kind: string, repo: string, subPath: string): unknown[] | null;
            fetchUserRepos(
                username: string,
                options: { per_page: number; sort: string }
            ): Promise<GitHubRepo[]>;
            fetchRepoContents(
                username: string,
                repo: string,
                subPath?: string
            ): Promise<GitHubContentItem[]>;
            fetchJSON(url: string): Promise<unknown>;
        };
        APP_CONSTANTS?: {
            GITHUB_CACHE_DURATION: number;
        };
        dialogs?: Record<string, { open(): void; bringToFront?(): void }>;
        showTab?(tab: string): void;
        translate?(key: string): string;
        appI18n?: {
            applyTranslations(el: HTMLElement): void;
        };
        API?: {
            textEditor?: {
                showLoading(payload: { fileName: string; size?: number }): void;
                loadRemoteFile(payload: { fileName: string; size?: number; content: string }): void;
                showLoadError(payload: { fileName: string; size?: number; message: string }): void;
            };
        };
        TextEditorSystem?: {
            showLoading(payload: { fileName: string; size?: number }): void;
            loadRemoteFile(payload: { fileName: string; size?: number; content: string }): void;
            showLoadError(payload: { fileName: string; size?: number; message: string }): void;
        };
    }

    // ============================================================================
    // Virtuelle Dateistruktur
    // ============================================================================

    const virtualFileSystem: Record<string, VirtualFileSystemFolder> = {
        Computer: {
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
        },
    };

    // ============================================================================
    // Finder State
    // ============================================================================

    const finderState: FinderState = {
        currentPath: [],
        currentView: 'computer',
        selectedItems: new Set(),
        viewMode: 'list',
        sortBy: 'name',
        sortOrder: 'asc',
        githubRepos: [],
        githubLoading: false,
        githubError: false,
        favorites: new Set(),
        recentFiles: [],
    };

    // GitHub Integration (lightweight, embedded in Finder)
    const GITHUB_USERNAME = 'Marormur';
    const githubContentCache = new Map<string, FinderItem[]>();
    const GITHUB_CACHE_NS = 'finderGithubCacheV1:';

    const global = window as Window & GitHubAPIWindow;

    function getGithubHeaders(): Record<string, string> {
        if (global.GitHubAPI && typeof global.GitHubAPI.getHeaders === 'function') {
            return global.GitHubAPI.getHeaders();
        }
        const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
        try {
            const token = localStorage.getItem('githubToken');
            if (token && token.trim()) {
                headers['Authorization'] = `token ${token.trim()}`;
            }
        } catch {
            /* ignore */
        }
        return headers;
    }

    function getCacheTtl(): number {
        const dflt = 5 * 60 * 1000;
        try {
            const constants = global.APP_CONSTANTS;
            if (constants && typeof constants.GITHUB_CACHE_DURATION === 'number') {
                return constants.GITHUB_CACHE_DURATION;
            }
            return dflt;
        } catch {
            return dflt;
        }
    }

    function makeCacheKey(kind: string, repo = '', subPath = ''): string {
        if (kind === 'repos') return GITHUB_CACHE_NS + 'repos';
        return `${GITHUB_CACHE_NS}contents:${repo}:${subPath}`;
    }

    function writeCache(kind: string, repo: string, subPath: string, data: unknown): void {
        if (global.GitHubAPI && typeof global.GitHubAPI.writeCache === 'function') {
            global.GitHubAPI.writeCache(kind, repo, subPath, data);
            return;
        }
        const key = makeCacheKey(kind, repo, subPath);
        try {
            const payload: CachePayload = { t: Date.now(), d: data };
            localStorage.setItem(key, JSON.stringify(payload));
        } catch {
            /* ignore */
        }
    }

    function readCache(kind: string, repo = '', subPath = ''): unknown[] | null {
        if (global.GitHubAPI && typeof global.GitHubAPI.readCache === 'function') {
            const result = global.GitHubAPI.readCache(kind, repo, subPath);
            return Array.isArray(result) ? result : null;
        }
        const key = makeCacheKey(kind, repo, subPath);
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as CachePayload;
            if (!parsed || typeof parsed !== 'object') return null;
            const ttl = getCacheTtl();
            if (typeof parsed.t !== 'number' || Date.now() - parsed.t > ttl) return null;
            return Array.isArray(parsed.d) ? (parsed.d as unknown[]) : null;
        } catch {
            return null;
        }
    }

    // ============================================================================
    // DOM References
    // ============================================================================

    let domRefs: DomRefs | null = null;

    function initDomRefs(): DomRefs | null {
        if (domRefs) return domRefs;

        domRefs = {
            sidebarComputer: document.getElementById('finder-sidebar-computer'),
            sidebarGithub: document.getElementById('finder-sidebar-github'),
            sidebarFavorites: document.getElementById('finder-sidebar-favorites'),
            sidebarRecent: document.getElementById('finder-sidebar-recent'),
            breadcrumbs: document.getElementById('finder-path-breadcrumbs'),
            contentArea: document.getElementById('finder-content-area'),
            toolbar: document.getElementById('finder-toolbar'),
            searchInput: document.getElementById(
                'finder-search-input'
            ) as HTMLInputElement | null,
        };

        return domRefs;
    }

    // ============================================================================
    // Navigation
    // ============================================================================

    function navigateTo(path: string[] | string, view: CurrentView | null = null): void {
        if (view !== null) {
            finderState.currentView = view;
        }

        if (typeof path === 'string') {
            finderState.currentPath = path === '' ? [] : path.split('/');
        } else if (Array.isArray(path)) {
            finderState.currentPath = [...path];
        }

        updateSidebarSelection();
        renderBreadcrumbs();
        renderContent();
        saveFinderState();
    }

    function navigateUp(): void {
        if (finderState.currentPath.length > 0) {
            finderState.currentPath.pop();
            navigateTo(finderState.currentPath);
        }
    }

    function navigateToFolder(folderName: string): void {
        finderState.currentPath.push(folderName);
        navigateTo(finderState.currentPath);
    }

    // ============================================================================
    // Sidebar
    // ============================================================================

    function updateSidebarSelection(): void {
        const refs = initDomRefs();
        if (!refs) return;

        // Entferne alle aktiven Markierungen
        [refs.sidebarComputer, refs.sidebarGithub, refs.sidebarFavorites, refs.sidebarRecent].forEach(
            (el) => {
                if (el) el.classList.remove('finder-sidebar-active');
            }
        );

        // Markiere aktuelle Ansicht
        switch (finderState.currentView) {
            case 'computer':
                if (refs.sidebarComputer)
                    refs.sidebarComputer.classList.add('finder-sidebar-active');
                break;
            case 'github':
                if (refs.sidebarGithub) refs.sidebarGithub.classList.add('finder-sidebar-active');
                break;
            case 'favorites':
                if (refs.sidebarFavorites)
                    refs.sidebarFavorites.classList.add('finder-sidebar-active');
                break;
            case 'recent':
                if (refs.sidebarRecent) refs.sidebarRecent.classList.add('finder-sidebar-active');
                break;
        }
    }

    // ============================================================================
    // Breadcrumbs
    // ============================================================================

    function renderBreadcrumbs(): void {
        const refs = initDomRefs();
        if (!refs || !refs.breadcrumbs) return;

        const parts: string[] = [];

        // Ansichtsname
        let viewLabel = '';
        switch (finderState.currentView) {
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

        parts.push(
            `<button class="finder-breadcrumb-item" data-action="finder:goRoot">${viewLabel}</button>`
        );

        // Pfad-Teile (überspringe ersten Teil wenn er gleich dem View-Label ist)
        finderState.currentPath.forEach((part, index) => {
            // Überspringe "Computer" wenn wir in der Computer-Ansicht sind und es der erste Pfad-Teil ist
            if (index === 0 && finderState.currentView === 'computer' && part === 'Computer') {
                return; // Überspringe diesen Teil
            }

            const pathUpToHere = finderState.currentPath.slice(0, index + 1);
            parts.push('<span class="finder-breadcrumb-separator">›</span>');
            parts.push(
                `<button class="finder-breadcrumb-item" data-action="finder:navigateToPath" data-path="${pathUpToHere.join('/')}">${part}</button>`
            );
        });

        refs.breadcrumbs.innerHTML = parts.join('');
    }

    // ============================================================================
    // Content Rendering
    // ============================================================================

    function getCurrentItems(): FinderItem[] {
        switch (finderState.currentView) {
            case 'computer':
                return getComputerItems();
            case 'github':
                return getGithubItems();
            case 'favorites':
                return getFavoriteItems();
            case 'recent':
                return getRecentItems();
            default:
                return [];
        }
    }

    function getComputerItems(): FinderItem[] {
        let current: Record<string, VirtualFileSystemItem> = virtualFileSystem;

        for (const pathPart of finderState.currentPath) {
            const item = current[pathPart];
            if (item && item.type === 'folder') {
                current = item.children;
            } else {
                return [];
            }
        }

        return Object.entries(current).map(([name, item]) => ({
            name,
            type: item.type,
            icon: item.icon || (item.type === 'folder' ? '📁' : '📄'),
            size: 'size' in item ? item.size : 0,
            modified: 'modified' in item ? item.modified : new Date().toISOString(),
        }));
    }

    function getGithubItems(): FinderItem[] {
        // Root der GitHub-Ansicht: Repos anzeigen
        if (finderState.currentPath.length === 0) {
            // Versuche, Cache direkt zu nutzen
            if (!finderState.githubRepos.length) {
                const cachedRepos = readCache('repos');
                if (Array.isArray(cachedRepos) && cachedRepos.length) {
                    // cachedRepos sind bereits in gemapptem Format
                    return cachedRepos as FinderItem[];
                }
            }
            if (
                !finderState.githubRepos.length &&
                !finderState.githubLoading &&
                !finderState.githubError
            ) {
                finderState.githubLoading = true;
                (global.GitHubAPI && global.GitHubAPI.fetchUserRepos
                    ? global.GitHubAPI.fetchUserRepos(GITHUB_USERNAME, {
                          per_page: 100,
                          sort: 'updated',
                      })
                    : fetch(
                          `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`,
                          {
                              headers: getGithubHeaders(),
                          }
                      ).then((r) => (r.ok ? r.json() : Promise.reject(r)))
                )
                    .then((repos: GitHubRepo[]) => {
                        const list = (Array.isArray(repos) ? repos : []).map((r) => ({
                            name:
                                r.name ||
                                (global.translate
                                    ? global.translate('finder.repoUnnamed')
                                    : 'Unbenanntes Repository'),
                            type: 'folder',
                            icon: '📂',
                            size: 0,
                            modified:
                                r.updated_at ||
                                r.pushed_at ||
                                r.created_at ||
                                new Date().toISOString(),
                            html_url: r.html_url,
                        }));
                        finderState.githubRepos = repos || [];
                        writeCache('repos', '', '', list);
                        finderState.githubError = false;
                    })
                    .catch((err: { status?: number }) => {
                        if (err && err.status === 403) {
                            finderState.githubError = true;
                        }
                        finderState.githubError = true;
                    })
                    .finally(() => {
                        finderState.githubLoading = false;
                        renderContent();
                    });
            }
            if (finderState.githubLoading) {
                return [
                    {
                        name: global.translate
                            ? global.translate('finder.loadingFiles')
                            : 'Lade Dateien …',
                        type: 'info',
                        icon: '⏳',
                        size: 0,
                    },
                ];
            }
            if (finderState.githubError) {
                // Fallback auf Cache, falls verfügbar
                const cachedRepos = readCache('repos');
                if (Array.isArray(cachedRepos) && cachedRepos.length) {
                    return cachedRepos as FinderItem[];
                }
                return [
                    {
                        name: global.translate
                            ? global.translate('finder.rateLimit')
                            : 'GitHub Rate Limit erreicht. Bitte versuche es später erneut.',
                        type: 'info',
                        icon: '⚠️',
                        size: 0,
                    },
                ];
            }
            if (!finderState.githubRepos.length) {
                return [
                    {
                        name: global.translate
                            ? global.translate('finder.noRepositories')
                            : 'Keine öffentlichen Repositories gefunden.',
                        type: 'info',
                        icon: 'ℹ️',
                        size: 0,
                    },
                ];
            }
            return finderState.githubRepos.map((r) => ({
                name:
                    r.name ||
                    (global.translate
                        ? global.translate('finder.repoUnnamed')
                        : 'Unbenanntes Repository'),
                type: 'folder',
                icon: '📂',
                size: 0,
                modified: r.updated_at || r.pushed_at || r.created_at || new Date().toISOString(),
                html_url: r.html_url,
            }));
        }

        // Innerhalb eines Repos: Dateien/Ordner des Pfads anzeigen
        const repo = finderState.currentPath[0];
        if (!repo) {
            return [];
        }
        const subPath = finderState.currentPath.slice(1).join('/');
        const cacheKey = `${repo}:${subPath}`;
        let cached = githubContentCache.get(cacheKey);
        if (!cached) {
            const fromStorage = readCache('contents', repo, subPath);
            if (Array.isArray(fromStorage) && fromStorage.length) {
                cached = fromStorage as FinderItem[];
                githubContentCache.set(cacheKey, cached);
            }
        }
        if (!cached && !finderState.githubLoading && !finderState.githubError) {
            finderState.githubLoading = true;
            const pathPart = subPath ? `/${encodeURIComponent(subPath).replace(/%2F/g, '/')}` : '';
            (global.GitHubAPI && global.GitHubAPI.fetchRepoContents
                ? global.GitHubAPI.fetchRepoContents(GITHUB_USERNAME, repo, subPath || '')
                : fetch(
                      `https://api.github.com/repos/${GITHUB_USERNAME}/${encodeURIComponent(
                          repo
                      )}/contents${pathPart}`,
                      {
                          headers: getGithubHeaders(),
                      }
                  ).then((r) => (r.ok ? r.json() : Promise.reject(r)))
            )
                .then((items: GitHubContentItem | GitHubContentItem[]) => {
                    const mapped = (Array.isArray(items) ? items : [items]).map((it) => {
                        const isDir = it.type === 'dir';
                        return {
                            name: it.name,
                            type: isDir ? 'folder' : 'file',
                            icon: isDir ? '📁' : '📄',
                            size: it.size || 0,
                            modified: '',
                            url: it.url,
                            html_url: it.html_url,
                            download_url: it.download_url,
                        };
                    });
                    githubContentCache.set(cacheKey, mapped);
                    writeCache('contents', repo, subPath || '', mapped);
                    finderState.githubError = false;
                })
                .catch((err: { status?: number }) => {
                    if (err && err.status === 403) {
                        finderState.githubError = true;
                    }
                    // Auf Cache zurückfallen, falls vorhanden
                    const fallback = (readCache('contents', repo, subPath) as FinderItem[]) || [];
                    githubContentCache.set(cacheKey, fallback);
                    finderState.githubError = true;
                })
                .finally(() => {
                    finderState.githubLoading = false;
                    renderContent();
                });
        }
        if (finderState.githubLoading && !cached) {
            return [
                {
                    name: global.translate
                        ? global.translate('finder.loadingFiles')
                        : 'Lade Dateien …',
                    type: 'info',
                    icon: '⏳',
                    size: 0,
                },
            ];
        }
        if (finderState.githubError && !cached) {
            const fallback = readCache('contents', repo, subPath);
            if (Array.isArray(fallback) && fallback.length) {
                return fallback as FinderItem[];
            }
            return [
                {
                    name: global.translate
                        ? global.translate('finder.rateLimit')
                        : 'GitHub Rate Limit erreicht. Bitte versuche es später erneut.',
                    type: 'info',
                    icon: '⚠️',
                    size: 0,
                },
            ];
        }
        const list = Array.isArray(cached) ? cached : [];
        if (!list.length) {
            return [
                {
                    name: global.translate
                        ? global.translate('finder.emptyDirectory')
                        : 'Keine Dateien in diesem Verzeichnis gefunden.',
                    type: 'info',
                    icon: '📁',
                    size: 0,
                },
            ];
        }
        return list;
    }

    function getFavoriteItems(): FinderItem[] {
        return Array.from(finderState.favorites).map((path) => ({
            name: path.split('/').pop() || '',
            type: 'favorite',
            icon: '⭐',
            path,
        }));
    }

    function getRecentItems(): FinderItem[] {
        return finderState.recentFiles.map((file) => ({
            name: file.name,
            type: 'recent',
            icon: file.icon || '📄',
            path: file.path,
            modified: file.modified,
        }));
    }

    function renderContent(): void {
        const refs = initDomRefs();
        if (!refs || !refs.contentArea) return;

        const items = getCurrentItems();

        if (items.length === 0) {
            refs.contentArea.innerHTML = `
                <div class="finder-empty-state">
                    <div class="text-6xl mb-4">📂</div>
                    <div class="text-gray-500 dark:text-gray-400">Dieser Ordner ist leer</div>
                </div>
            `;
            return;
        }

        // Sortiere Items
        const sortedItems = sortItems(items);

        // Render basierend auf viewMode
        switch (finderState.viewMode) {
            case 'list':
                renderListView(sortedItems);
                break;
            case 'grid':
                renderGridView(sortedItems);
                break;
            case 'columns':
                renderColumnsView(sortedItems);
                break;
        }
    }

    function sortItems(items: FinderItem[]): FinderItem[] {
        const sorted = [...items];

        // Ordner zuerst
        sorted.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;

            // Dann nach sortBy
            let comparison = 0;
            switch (finderState.sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'size':
                    comparison = (a.size || 0) - (b.size || 0);
                    break;
                case 'date':
                    comparison =
                        new Date(b.modified || 0).getTime() -
                        new Date(a.modified || 0).getTime();
                    break;
                case 'type':
                    comparison = (a.type || '').localeCompare(b.type || '');
                    break;
            }

            return finderState.sortOrder === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }

    function renderListView(items: FinderItem[]): void {
        const refs = initDomRefs();
        if (!refs || !refs.contentArea) return;

        const html = `
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
                        .map(
                            (item) => `
                        <tr class="finder-list-item" data-action-dblclick="finder:openItem" data-item-name="${item.name}" data-item-type="${item.type}">
                            <td>
                                <span class="finder-item-icon">${item.icon}</span>
                                <span class="finder-item-name">${item.name}</span>
                            </td>
                            <td>${formatSize(item.size)}</td>
                            <td>${formatDate(item.modified)}</td>
                        </tr>
                    `
                        )
                        .join('')}
                </tbody>
            </table>
        `;

        refs.contentArea.innerHTML = html;
    }

    function renderGridView(items: FinderItem[]): void {
        const refs = initDomRefs();
        if (!refs || !refs.contentArea) return;

        const html = `
            <div class="finder-grid-container">
                ${items
                    .map(
                        (item) => `
                    <div class="finder-grid-item" data-action-dblclick="finder:openItem" data-item-name="${item.name}" data-item-type="${item.type}">
                        <div class="finder-grid-icon">${item.icon}</div>
                        <div class="finder-grid-name">${item.name}</div>
                    </div>
                `
                    )
                    .join('')}
            </div>
        `;

        refs.contentArea.innerHTML = html;
    }

    function renderColumnsView(items: FinderItem[]): void {
        // Column view für später
        renderListView(items);
    }

    // ============================================================================
    // Item Actions
    // ============================================================================

    function openItem(name: string, type: string): void {
        if (type === 'folder') {
            navigateToFolder(name);
        } else if (type === 'action') {
            const items = getCurrentItems();
            const item = items.find((i) => i.name === name);
            if (item && item.action) {
                item.action();
            }
        } else if (type === 'file') {
            openFile(name);
        }
    }

    function openFile(name: string): void {
        // Füge zu zuletzt geöffnet hinzu
        addToRecent(name);

        // GitHub-spezifische Datei-Öffnung (inline)
        if (finderState.currentView === 'github') {
            const items = getCurrentItems();
            const entry = items.find((i) => i && i.name === name);
            const isImage = isImageFile(name);
            const isText = isProbablyTextFile(name);
            if (entry && (isImage || isText)) {
                if (isImage) {
                    openGithubImage(entry);
                    return;
                }
                if (isText) {
                    openGithubText(entry);
                    return;
                }
            }
        }

        // Fallback: Öffne Editor/Viewer ohne GitHub-Content-Load
        const ext = name.split('.').pop()?.toLowerCase();
        if (ext && ['txt', 'md', 'js', 'json', 'html', 'css'].includes(ext)) {
            if (global.dialogs && global.dialogs['text-modal']) {
                global.dialogs['text-modal'].open();
            }
        } else if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
            if (global.dialogs && global.dialogs['image-modal']) {
                global.dialogs['image-modal'].open();
            }
        }
    }

    // ============================================================================
    // Utilities
    // ============================================================================

    // Dateityp-Erkennung analog zu app.js
    const textFileExtensions = [
        '.txt',
        '.md',
        '.markdown',
        '.mdx',
        '.json',
        '.jsonc',
        '.csv',
        '.tsv',
        '.yaml',
        '.yml',
        '.xml',
        '.html',
        '.htm',
        '.css',
        '.scss',
        '.sass',
        '.less',
        '.js',
        '.mjs',
        '.cjs',
        '.ts',
        '.tsx',
        '.jsx',
        '.vue',
        '.c',
        '.h',
        '.cpp',
        '.hpp',
        '.cc',
        '.cxx',
        '.hh',
        '.ino',
        '.java',
        '.kt',
        '.kts',
        '.swift',
        '.cs',
        '.py',
        '.rb',
        '.php',
        '.rs',
        '.go',
        '.sh',
        '.bash',
        '.zsh',
        '.fish',
        '.ps1',
        '.bat',
        '.cmd',
        '.ini',
        '.cfg',
        '.conf',
        '.config',
        '.env',
        '.gitignore',
        '.gitattributes',
        '.log',
        '.sql',
    ];

    const imageFileExtensions = [
        '.png',
        '.jpg',
        '.jpeg',
        '.gif',
        '.webp',
        '.bmp',
        '.ico',
        '.svg',
        '.tiff',
        '.tif',
        '.heic',
        '.heif',
        '.avif',
    ];

    function isProbablyTextFile(filename: string): boolean {
        if (!filename) return false;
        const lower = String(filename).toLowerCase();
        return textFileExtensions.some((ext) => lower.endsWith(ext));
    }

    function isImageFile(filename: string): boolean {
        if (!filename) return false;
        const lower = String(filename).toLowerCase();
        return imageFileExtensions.some((ext) => lower.endsWith(ext));
    }

    function ensureImageViewerOpen(): { open(): void; bringToFront?(): void } | null {
        const dlg = global.dialogs && global.dialogs['image-modal'];
        if (dlg && typeof dlg.open === 'function') {
            dlg.open();
            return dlg;
        }
        if (typeof global.showTab === 'function') {
            global.showTab('image');
        }
        return null;
    }

    function ensureTextEditorOpen(): { open(): void; bringToFront?(): void } | null {
        const dlg = global.dialogs && global.dialogs['text-modal'];
        if (dlg && typeof dlg.open === 'function') {
            dlg.open();
            return dlg;
        }
        if (typeof global.showTab === 'function') {
            global.showTab('text');
        }
        return null;
    }

    function openGithubImage(entry: FinderItem): void {
        const dlg = ensureImageViewerOpen();
        const img = document.getElementById('image-viewer') as HTMLImageElement | null;
        const placeholder = document.getElementById('image-placeholder');
        if (img) {
            img.src = '';
            img.classList.add('hidden');
        }
        if (placeholder) {
            placeholder.classList.remove('hidden');
        }
        const finalize = (src: string) => {
            if (!img) return;
            img.onload = () => {
                if (placeholder) placeholder.classList.add('hidden');
                img.classList.remove('hidden');
                if (dlg && typeof dlg.bringToFront === 'function') dlg.bringToFront();
            };
            img.onerror = () => {
                if (placeholder) placeholder.classList.remove('hidden');
                img.classList.add('hidden');
            };
            img.src = src;
        };
        if (entry.download_url) {
            finalize(entry.download_url);
            return;
        }
        if (entry.url) {
            const p =
                global.GitHubAPI && global.GitHubAPI.fetchJSON
                    ? global.GitHubAPI.fetchJSON(entry.url)
                    : fetch(entry.url, {
                          headers: { Accept: 'application/vnd.github.v3+json' },
                      }).then((r) => (r.ok ? r.json() : Promise.reject(r)));
            p.then((data: { download_url?: string }) => {
                if (data && typeof data.download_url === 'string') {
                    finalize(data.download_url);
                }
            }).catch(() => {
                /* silently ignore */
            });
        }
    }

    function openGithubText(entry: FinderItem): void {
        const dlg = ensureTextEditorOpen();
        const payloadBase = { fileName: entry.name, size: entry.size };

        // Show loading state via direct API call
        if (global.API && global.API.textEditor) {
            global.API.textEditor.showLoading(payloadBase);
        } else if (global.TextEditorSystem) {
            global.TextEditorSystem.showLoading(payloadBase);
        }

        const fetchText = (): Promise<string> => {
            if (entry.download_url) {
                return fetch(entry.download_url).then((r) => {
                    if (!r.ok) throw new Error('Download failed');
                    return r.text();
                });
            }
            if (entry.url) {
                const p =
                    global.GitHubAPI && global.GitHubAPI.fetchJSON
                        ? global.GitHubAPI.fetchJSON(entry.url)
                        : fetch(entry.url, {
                              headers: { Accept: 'application/vnd.github.v3+json' },
                          }).then((r) => (r.ok ? r.json() : Promise.reject(r)));
                return p.then((data: { download_url?: string; encoding?: string; content?: string }) => {
                    if (data && typeof data.download_url === 'string') {
                        return fetch(data.download_url).then((r) => {
                            if (!r.ok) throw new Error('Download failed');
                            return r.text();
                        });
                    }
                    if (data && data.encoding === 'base64' && typeof data.content === 'string') {
                        try {
                            return atob(data.content.replace(/\s/g, ''));
                        } catch {
                            throw new Error('Decode error');
                        }
                    }
                    throw new Error('No content');
                });
            }
            return Promise.reject(new Error('No source'));
        };
        fetchText()
            .then((content) => {
                // Load remote file via direct API call
                if (global.API && global.API.textEditor) {
                    global.API.textEditor.loadRemoteFile(
                        Object.assign({}, payloadBase, { content })
                    );
                } else if (global.TextEditorSystem) {
                    global.TextEditorSystem.loadRemoteFile(
                        Object.assign({}, payloadBase, { content })
                    );
                }
                if (dlg && typeof dlg.bringToFront === 'function') dlg.bringToFront();
            })
            .catch(() => {
                // Show error via direct API call
                if (global.API && global.API.textEditor) {
                    global.API.textEditor.showLoadError(
                        Object.assign({}, payloadBase, {
                            message: 'Fehler beim Laden',
                        })
                    );
                } else if (global.TextEditorSystem) {
                    global.TextEditorSystem.showLoadError(
                        Object.assign({}, payloadBase, {
                            message: 'Fehler beim Laden',
                        })
                    );
                }
            });
    }

    function formatSize(bytes: number | undefined): string {
        if (!bytes || bytes === 0) return '-';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function formatDate(dateStr: string | undefined): string {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }

    function setSortBy(field: SortBy): void {
        if (finderState.sortBy === field) {
            finderState.sortOrder = finderState.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            finderState.sortBy = field;
            finderState.sortOrder = 'asc';
        }
        renderContent();
    }

    function setViewMode(mode: ViewMode): void {
        finderState.viewMode = mode;
        renderContent();
        saveFinderState();
    }

    function addToRecent(name: string): void {
        const fullPath = [...finderState.currentPath, name].join('/');
        finderState.recentFiles.unshift({
            name,
            path: fullPath,
            icon: '📄',
            modified: new Date().toISOString(),
        });

        // Limit auf 20 Items
        finderState.recentFiles = finderState.recentFiles.slice(0, 20);
        saveFinderState();
    }

    function toggleFavorite(path: string): void {
        if (finderState.favorites.has(path)) {
            finderState.favorites.delete(path);
        } else {
            finderState.favorites.add(path);
        }
        saveFinderState();
    }

    // ============================================================================
    // Persistence
    // ============================================================================

    interface SavedFinderState {
        currentPath: string[];
        currentView: CurrentView;
        viewMode: ViewMode;
        sortBy: SortBy;
        sortOrder: SortOrder;
        favorites: string[];
        recentFiles: RecentFile[];
    }

    function saveFinderState(): void {
        try {
            const state: SavedFinderState = {
                currentPath: finderState.currentPath,
                currentView: finderState.currentView,
                viewMode: finderState.viewMode,
                sortBy: finderState.sortBy,
                sortOrder: finderState.sortOrder,
                favorites: Array.from(finderState.favorites),
                recentFiles: finderState.recentFiles,
            };
            localStorage.setItem('finderAdvancedState', JSON.stringify(state));
        } catch (e) {
            console.warn('Could not save finder state:', e);
        }
    }

    function loadFinderState(): void {
        try {
            const saved = localStorage.getItem('finderAdvancedState');
            if (saved) {
                const state = JSON.parse(saved) as Partial<SavedFinderState>;
                finderState.currentPath = state.currentPath || [];
                finderState.currentView = state.currentView || 'computer';
                finderState.viewMode = state.viewMode || 'list';
                finderState.sortBy = state.sortBy || 'name';
                finderState.sortOrder = state.sortOrder || 'asc';
                finderState.favorites = new Set(state.favorites || []);
                finderState.recentFiles = state.recentFiles || [];
            }
        } catch (e) {
            console.warn('Could not load finder state:', e);
        }
    }

    // ============================================================================
    // Initialization
    // ============================================================================

    function init(): void {
        loadFinderState();
        initDomRefs();
        navigateTo(finderState.currentPath, finderState.currentView);

        // i18n-Übersetzungen anwenden
        if (global.appI18n && typeof global.appI18n.applyTranslations === 'function') {
            const finderModal = document.getElementById('finder-modal');
            if (finderModal) {
                global.appI18n.applyTranslations(finderModal);
            }
        }
    }

    // ============================================================================
    // Public API
    // ============================================================================

    const FinderSystemInstance: FinderSystemType = {
        init,
        navigateTo,
        navigateUp,
        navigateToFolder,
        openItem,
        setSortBy,
        setViewMode,
        toggleFavorite,
        getState: () => finderState,
        // Stub methods for compatibility with global FinderSystemAPI
        openFinder: () => {
            const finderModal = global.dialogs?.['finder-modal'];
            if (finderModal && typeof finderModal.open === 'function') {
                finderModal.open();
            }
        },
        closeFinder: () => {
            const finderModal = global.dialogs?.['finder-modal'];
            if (finderModal && 'close' in finderModal && typeof finderModal.close === 'function') {
                (finderModal as { close(): void }).close();
            }
        },
    };

    (global as Window & { FinderSystem: FinderSystemType }).FinderSystem = FinderSystemInstance;

    // Init wird von app.js nach Dialog-Initialisierung aufgerufen
    // Keine automatische Initialisierung hier
})();

export {};
