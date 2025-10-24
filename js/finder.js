console.log('Finder.js loaded');

/**
 * Finder System - Vollwertiger Dateimanager
 * 
 * Features:
 * - Virtuelle Ordnerstruktur (Computer, Downloads, Dokumente, etc.)
 * - Integration mit GitHub-Projekten
 * - Favoriten und zuletzt geöffnete Dateien
 * - File Upload & Download
 * - Dateiverwaltung (Ordner erstellen, umbenennen, löschen)
 */

(function () {
    'use strict';

    // ============================================================================
    // Virtuelle Dateistruktur
    // ============================================================================

    const virtualFileSystem = {
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
                            content: '# Willkommen im Finder\n\nDies ist ein virtuelles Dateisystem.',
                            size: 1024
                        }
                    }
                },
                Downloads: {
                    type: 'folder',
                    icon: '⬇️',
                    children: {}
                },
                Pictures: {
                    type: 'folder',
                    icon: '🖼️',
                    children: {}
                },
                Music: {
                    type: 'folder',
                    icon: '🎵',
                    children: {}
                },
                Videos: {
                    type: 'folder',
                    icon: '🎬',
                    children: {}
                }
            }
        }
    };

    // ============================================================================
    // Finder State
    // ============================================================================

    const finderState = {
        currentPath: [],
        currentView: 'computer', // 'computer', 'github', 'favorites', 'recent'
        selectedItems: new Set(),
        viewMode: 'list', // 'list', 'grid', 'columns'
        sortBy: 'name', // 'name', 'date', 'size', 'type'
        sortOrder: 'asc', // 'asc', 'desc'
        githubRepos: [],
        githubLoading: false,
        githubError: false,
        favorites: new Set(),
        recentFiles: []
    };

    // GitHub Integration (lightweight, embedded in Finder)
    const GITHUB_USERNAME = 'Marormur';
    const githubContentCache = new Map(); // key: `${repo}:${path}` => Array of items
    const GITHUB_CACHE_NS = 'finderGithubCacheV1:';

    function getGithubHeaders() {
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        try {
            const token = localStorage.getItem('githubToken');
            if (token && token.trim()) {
                headers['Authorization'] = `token ${token.trim()}`;
            }
        } catch (_) { /* ignore */ }
        return headers;
    }

    function getCacheTtl() {
        const dflt = 5 * 60 * 1000;
        try {
            const constants = window.APP_CONSTANTS || {};
            return typeof constants.GITHUB_CACHE_DURATION === 'number' ? constants.GITHUB_CACHE_DURATION : dflt;
        } catch (_) { return dflt; }
    }
    function makeCacheKey(kind, repo = '', subPath = '') {
        if (kind === 'repos') return GITHUB_CACHE_NS + 'repos';
        return `${GITHUB_CACHE_NS}contents:${repo}:${subPath}`;
    }
    function writeCache(kind, repo, subPath, data) {
        const key = makeCacheKey(kind, repo, subPath);
        try {
            const payload = { t: Date.now(), d: data };
            localStorage.setItem(key, JSON.stringify(payload));
        } catch (_) { /* ignore */ }
    }
    function readCache(kind, repo, subPath) {
        const key = makeCacheKey(kind, repo, subPath);
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            const ttl = getCacheTtl();
            if (typeof parsed.t !== 'number' || (Date.now() - parsed.t) > ttl) return null;
            return Array.isArray(parsed.d) ? parsed.d : null;
        } catch (_) { return null; }
    }

    // ============================================================================
    // DOM References
    // ============================================================================

    let domRefs = null;

    function initDomRefs() {
        if (domRefs) return domRefs;

        domRefs = {
            sidebarComputer: document.getElementById('finder-sidebar-computer'),
            sidebarGithub: document.getElementById('finder-sidebar-github'),
            sidebarFavorites: document.getElementById('finder-sidebar-favorites'),
            sidebarRecent: document.getElementById('finder-sidebar-recent'),
            breadcrumbs: document.getElementById('finder-path-breadcrumbs'),
            contentArea: document.getElementById('finder-content-area'),
            toolbar: document.getElementById('finder-toolbar'),
            searchInput: document.getElementById('finder-search-input')
        };

        return domRefs;
    }

    // ============================================================================
    // Navigation
    // ============================================================================

    function navigateTo(path, view = null) {
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

    function navigateUp() {
        if (finderState.currentPath.length > 0) {
            finderState.currentPath.pop();
            navigateTo(finderState.currentPath);
        }
    }

    function navigateToFolder(folderName) {
        finderState.currentPath.push(folderName);
        navigateTo(finderState.currentPath);
    }

    // ============================================================================
    // Sidebar
    // ============================================================================

    function updateSidebarSelection() {
        const refs = initDomRefs();
        if (!refs) return;

        // Entferne alle aktiven Markierungen
        [refs.sidebarComputer, refs.sidebarGithub, refs.sidebarFavorites, refs.sidebarRecent].forEach(el => {
            if (el) el.classList.remove('finder-sidebar-active');
        });

        // Markiere aktuelle Ansicht
        switch (finderState.currentView) {
            case 'computer':
                if (refs.sidebarComputer) refs.sidebarComputer.classList.add('finder-sidebar-active');
                break;
            case 'github':
                if (refs.sidebarGithub) refs.sidebarGithub.classList.add('finder-sidebar-active');
                break;
            case 'favorites':
                if (refs.sidebarFavorites) refs.sidebarFavorites.classList.add('finder-sidebar-active');
                break;
            case 'recent':
                if (refs.sidebarRecent) refs.sidebarRecent.classList.add('finder-sidebar-active');
                break;
        }
    }

    // ============================================================================
    // Breadcrumbs
    // ============================================================================

    function renderBreadcrumbs() {
        const refs = initDomRefs();
        if (!refs || !refs.breadcrumbs) return;

        const parts = [];

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

        parts.push(`<button class="finder-breadcrumb-item" data-action="finder:goRoot">${viewLabel}</button>`);

        // Pfad-Teile (überspringe ersten Teil wenn er gleich dem View-Label ist)
        finderState.currentPath.forEach((part, index) => {
            // Überspringe "Computer" wenn wir in der Computer-Ansicht sind und es der erste Pfad-Teil ist
            if (index === 0 && finderState.currentView === 'computer' && part === 'Computer') {
                return; // Überspringe diesen Teil
            }

            const pathUpToHere = finderState.currentPath.slice(0, index + 1);
            parts.push(`<span class="finder-breadcrumb-separator">›</span>`);
            parts.push(`<button class="finder-breadcrumb-item" data-action="finder:navigateToPath" data-path="${pathUpToHere.join('/')}">${part}</button>`);
        });

        refs.breadcrumbs.innerHTML = parts.join('');
    }

    // ============================================================================
    // Content Rendering
    // ============================================================================

    function getCurrentItems() {
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

    function getComputerItems() {
        let current = virtualFileSystem;

        for (const pathPart of finderState.currentPath) {
            if (current[pathPart] && current[pathPart].children) {
                current = current[pathPart].children;
            } else {
                return [];
            }
        }

        return Object.entries(current).map(([name, item]) => ({
            name,
            type: item.type,
            icon: item.icon || (item.type === 'folder' ? '📁' : '📄'),
            size: item.size || 0,
            modified: item.modified || new Date().toISOString()
        }));
    }

    function getGithubItems() {
        // Root der GitHub-Ansicht: Repos anzeigen
        if (finderState.currentPath.length === 0) {
            // Versuche, Cache direkt zu nutzen
            if (!finderState.githubRepos.length) {
                const cachedRepos = readCache('repos');
                if (Array.isArray(cachedRepos) && cachedRepos.length) {
                    // cachedRepos sind bereits in gemapptem Format
                    return cachedRepos;
                }
            }
            if (!finderState.githubRepos.length && !finderState.githubLoading && !finderState.githubError) {
                finderState.githubLoading = true;
                fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`, {
                    headers: getGithubHeaders()
                })
                    .then(r => {
                        if (!r.ok) {
                            // Spezifische Rate-Limit-Behandlung
                            if (r.status === 403) {
                                finderState.githubError = true;
                                return Promise.reject(r);
                            }
                            return Promise.reject(r);
                        }
                        return r.json();
                    })
                    .then(repos => {
                        const list = (Array.isArray(repos) ? repos : []).map(r => ({
                            name: r.name || (window.translate ? window.translate('finder.repoUnnamed') : 'Unbenanntes Repository'),
                            type: 'folder',
                            icon: '📂',
                            size: 0,
                            modified: r.updated_at || r.pushed_at || r.created_at || new Date().toISOString(),
                            html_url: r.html_url
                        }));
                        finderState.githubRepos = repos || [];
                        writeCache('repos', '', '', list);
                        finderState.githubError = false;
                    })
                    .catch(() => {
                        finderState.githubError = true;
                    })
                    .finally(() => {
                        finderState.githubLoading = false;
                        renderContent();
                    });
            }
            if (finderState.githubLoading) {
                return [
                    { name: (window.translate ? window.translate('finder.loadingFiles') : 'Lade Dateien …'), type: 'info', icon: '⏳', size: 0 }
                ];
            }
            if (finderState.githubError) {
                // Fallback auf Cache, falls verfügbar
                const cachedRepos = readCache('repos');
                if (Array.isArray(cachedRepos) && cachedRepos.length) {
                    return cachedRepos;
                }
                return [
                    { name: (window.translate ? window.translate('finder.rateLimit') : 'GitHub Rate Limit erreicht. Bitte versuche es später erneut.'), type: 'info', icon: '⚠️', size: 0 }
                ];
            }
            if (!finderState.githubRepos.length) {
                return [
                    { name: (window.translate ? window.translate('finder.noRepositories') : 'Keine öffentlichen Repositories gefunden.'), type: 'info', icon: 'ℹ️', size: 0 }
                ];
            }
            return finderState.githubRepos.map(r => ({
                name: r.name || (window.translate ? window.translate('finder.repoUnnamed') : 'Unbenanntes Repository'),
                type: 'folder',
                icon: '📂',
                size: 0,
                modified: r.updated_at || r.pushed_at || r.created_at || new Date().toISOString(),
                html_url: r.html_url
            }));
        }

        // Innerhalb eines Repos: Dateien/Ordner des Pfads anzeigen
        const repo = finderState.currentPath[0];
        const subPath = finderState.currentPath.slice(1).join('/');
        const cacheKey = `${repo}:${subPath}`;
        let cached = githubContentCache.get(cacheKey);
        if (!cached) {
            const fromStorage = readCache('contents', repo, subPath);
            if (Array.isArray(fromStorage) && fromStorage.length) {
                cached = fromStorage;
                githubContentCache.set(cacheKey, cached);
            }
        }
        if (!cached && !finderState.githubLoading && !finderState.githubError) {
            finderState.githubLoading = true;
            const pathPart = subPath ? `/${encodeURIComponent(subPath).replace(/%2F/g, '/')}` : '';
            fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${encodeURIComponent(repo)}/contents${pathPart}`, {
                headers: getGithubHeaders()
            })
                .then(r => {
                    if (!r.ok) {
                        if (r.status === 403) {
                            finderState.githubError = true;
                            return Promise.reject(r);
                        }
                        return Promise.reject(r);
                    }
                    return r.json();
                })
                .then(items => {
                    const mapped = (Array.isArray(items) ? items : [items]).map(it => {
                        const isDir = it.type === 'dir';
                        return {
                            name: it.name,
                            type: isDir ? 'folder' : 'file',
                            icon: isDir ? '📁' : '📄',
                            size: it.size || 0,
                            modified: '',
                            url: it.url,
                            html_url: it.html_url,
                            download_url: it.download_url
                        };
                    });
                    githubContentCache.set(cacheKey, mapped);
                    writeCache('contents', repo, subPath, mapped);
                    finderState.githubError = false;
                })
                .catch(() => {
                    // Auf Cache zurückfallen, falls vorhanden
                    const fallback = readCache('contents', repo, subPath) || [];
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
                { name: (window.translate ? window.translate('finder.loadingFiles') : 'Lade Dateien …'), type: 'info', icon: '⏳', size: 0 }
            ];
        }
        if (finderState.githubError && !cached) {
            const fallback = readCache('contents', repo, subPath);
            if (Array.isArray(fallback) && fallback.length) {
                return fallback;
            }
            return [
                { name: (window.translate ? window.translate('finder.rateLimit') : 'GitHub Rate Limit erreicht. Bitte versuche es später erneut.'), type: 'info', icon: '⚠️', size: 0 }
            ];
        }
        const list = Array.isArray(cached) ? cached : [];
        if (!list.length) {
            return [
                { name: (window.translate ? window.translate('finder.emptyDirectory') : 'Keine Dateien in diesem Verzeichnis gefunden.'), type: 'info', icon: '📁', size: 0 }
            ];
        }
        return list;
    }

    function getFavoriteItems() {
        return Array.from(finderState.favorites).map(path => ({
            name: path.split('/').pop(),
            type: 'favorite',
            icon: '⭐',
            path
        }));
    }

    function getRecentItems() {
        return finderState.recentFiles.map(file => ({
            name: file.name,
            type: 'recent',
            icon: file.icon || '📄',
            path: file.path,
            modified: file.modified
        }));
    }

    function renderContent() {
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

    function sortItems(items) {
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
                    comparison = new Date(b.modified || 0) - new Date(a.modified || 0);
                    break;
                case 'type':
                    comparison = (a.type || '').localeCompare(b.type || '');
                    break;
            }

            return finderState.sortOrder === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }

    function renderListView(items) {
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
                    ${items.map(item => `
                        <tr class="finder-list-item" data-action-dblclick="finder:openItem" data-item-name="${item.name}" data-item-type="${item.type}">
                            <td>
                                <span class="finder-item-icon">${item.icon}</span>
                                <span class="finder-item-name">${item.name}</span>
                            </td>
                            <td>${formatSize(item.size)}</td>
                            <td>${formatDate(item.modified)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        refs.contentArea.innerHTML = html;
    }

    function renderGridView(items) {
        const refs = initDomRefs();
        if (!refs || !refs.contentArea) return;

        const html = `
            <div class="finder-grid-container">
                ${items.map(item => `
                    <div class="finder-grid-item" data-action-dblclick="finder:openItem" data-item-name="${item.name}" data-item-type="${item.type}">
                        <div class="finder-grid-icon">${item.icon}</div>
                        <div class="finder-grid-name">${item.name}</div>
                    </div>
                `).join('')}
            </div>
        `;

        refs.contentArea.innerHTML = html;
    }

    function renderColumnsView(items) {
        // Column view für später
        renderListView(items);
    }

    // ============================================================================
    // Item Actions
    // ============================================================================

    function openItem(name, type) {
        if (type === 'folder') {
            navigateToFolder(name);
        } else if (type === 'action') {
            const items = getCurrentItems();
            const item = items.find(i => i.name === name);
            if (item && item.action) {
                item.action();
            }
        } else if (type === 'file') {
            openFile(name);
        }
    }

    function openFile(name) {
        // Füge zu zuletzt geöffnet hinzu
        addToRecent(name);

        // GitHub-spezifische Datei-Öffnung (inline)
        if (finderState.currentView === 'github') {
            const items = getCurrentItems();
            const entry = items.find(i => i && i.name === name);
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
        const ext = name.split('.').pop().toLowerCase();
        if (['txt', 'md', 'js', 'json', 'html', 'css'].includes(ext)) {
            if (window.dialogs && window.dialogs['text-modal']) {
                window.dialogs['text-modal'].open();
            }
        } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
            if (window.dialogs && window.dialogs['image-modal']) {
                window.dialogs['image-modal'].open();
            }
        }
    }

    // ============================================================================
    // Utilities
    // ============================================================================

    // Dateityp-Erkennung analog zu app.js
    const textFileExtensions = [
        '.txt', '.md', '.markdown', '.mdx', '.json', '.jsonc', '.csv', '.tsv', '.yaml', '.yml',
        '.xml', '.html', '.htm', '.css', '.scss', '.sass', '.less',
        '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.vue',
        '.c', '.h', '.cpp', '.hpp', '.cc', '.cxx', '.hh', '.ino',
        '.java', '.kt', '.kts', '.swift', '.cs', '.py', '.rb', '.php', '.rs', '.go',
        '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
        '.ini', '.cfg', '.conf', '.config', '.env', '.gitignore', '.gitattributes',
        '.log', '.sql'
    ];
    const imageFileExtensions = [
        '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.svg', '.tiff', '.tif', '.heic', '.heif', '.avif'
    ];
    function isProbablyTextFile(filename) {
        if (!filename) return false;
        const lower = String(filename).toLowerCase();
        return textFileExtensions.some(ext => lower.endsWith(ext));
    }
    function isImageFile(filename) {
        if (!filename) return false;
        const lower = String(filename).toLowerCase();
        return imageFileExtensions.some(ext => lower.endsWith(ext));
    }

    function ensureImageViewerOpen() {
        const dlg = window.dialogs && window.dialogs['image-modal'];
        if (dlg && typeof dlg.open === 'function') {
            dlg.open();
            return dlg;
        }
        if (typeof window.showTab === 'function') {
            window.showTab('image');
        }
        return null;
    }
    function ensureTextEditorOpen() {
        const dlg = window.dialogs && window.dialogs['text-modal'];
        if (dlg && typeof dlg.open === 'function') {
            dlg.open();
            return dlg;
        }
        if (typeof window.showTab === 'function') {
            window.showTab('text');
        }
        return null;
    }

    function getTextEditorIframe() {
        const dlg = window.dialogs && window.dialogs['text-modal'];
        if (!dlg || !dlg.modal) return null;
        return dlg.modal.querySelector('iframe');
    }
    function postToTextEditor(message, attempt = 0) {
        const iframe = getTextEditorIframe();
        if (iframe && iframe.contentWindow) {
            let targetOrigin = '*';
            if (window.location && typeof window.location.origin === 'string' && window.location.origin !== 'null') {
                targetOrigin = window.location.origin;
            }
            iframe.contentWindow.postMessage(message, targetOrigin);
            return;
        }
        if (attempt < 10) {
            setTimeout(() => postToTextEditor(message, attempt + 1), 120);
        }
    }

    function openGithubImage(entry) {
        const dlg = ensureImageViewerOpen();
        const img = document.getElementById('image-viewer');
        const placeholder = document.getElementById('image-placeholder');
        if (img) {
            img.src = '';
            img.classList.add('hidden');
        }
        if (placeholder) {
            placeholder.classList.remove('hidden');
        }
        const finalize = (src) => {
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
            fetch(entry.url, { headers: { 'Accept': 'application/vnd.github.v3+json' } })
                .then(r => r.ok ? r.json() : Promise.reject(r))
                .then(data => {
                    if (data && typeof data.download_url === 'string') {
                        finalize(data.download_url);
                    }
                })
                .catch(() => { /* silently ignore */ });
        }
    }

    function openGithubText(entry) {
        const dlg = ensureTextEditorOpen();
        const payloadBase = { fileName: entry.name, size: entry.size };
        postToTextEditor({ type: 'textEditor:showLoading', payload: payloadBase });
        const fetchText = () => {
            if (entry.download_url) {
                return fetch(entry.download_url).then(r => {
                    if (!r.ok) throw new Error('Download failed');
                    return r.text();
                });
            }
            if (entry.url) {
                return fetch(entry.url, { headers: { 'Accept': 'application/vnd.github.v3+json' } })
                    .then(r => r.ok ? r.json() : Promise.reject(r))
                    .then(data => {
                        if (data && typeof data.download_url === 'string') {
                            return fetch(data.download_url).then(r => {
                                if (!r.ok) throw new Error('Download failed');
                                return r.text();
                            });
                        }
                        if (data && data.encoding === 'base64' && typeof data.content === 'string') {
                            try {
                                return atob(data.content.replace(/\s/g, ''));
                            } catch (_) {
                                throw new Error('Decode error');
                            }
                        }
                        throw new Error('No content');
                    });
            }
            return Promise.reject(new Error('No source'));
        };
        fetchText()
            .then(content => {
                postToTextEditor({ type: 'textEditor:loadRemoteFile', payload: Object.assign({}, payloadBase, { content }) });
                if (dlg && typeof dlg.bringToFront === 'function') dlg.bringToFront();
            })
            .catch(() => {
                postToTextEditor({ type: 'textEditor:loadError', payload: Object.assign({}, payloadBase, { message: 'Fehler beim Laden' }) });
            });
    }

    function formatSize(bytes) {
        if (!bytes || bytes === 0) return '-';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    function setSortBy(field) {
        if (finderState.sortBy === field) {
            finderState.sortOrder = finderState.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            finderState.sortBy = field;
            finderState.sortOrder = 'asc';
        }
        renderContent();
    }

    function setViewMode(mode) {
        finderState.viewMode = mode;
        renderContent();
        saveFinderState();
    }

    function addToRecent(name) {
        const fullPath = [...finderState.currentPath, name].join('/');
        finderState.recentFiles.unshift({
            name,
            path: fullPath,
            icon: '📄',
            modified: new Date().toISOString()
        });

        // Limit auf 20 Items
        finderState.recentFiles = finderState.recentFiles.slice(0, 20);
        saveFinderState();
    }

    function toggleFavorite(path) {
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

    function saveFinderState() {
        try {
            const state = {
                currentPath: finderState.currentPath,
                currentView: finderState.currentView,
                viewMode: finderState.viewMode,
                sortBy: finderState.sortBy,
                sortOrder: finderState.sortOrder,
                favorites: Array.from(finderState.favorites),
                recentFiles: finderState.recentFiles
            };
            localStorage.setItem('finderAdvancedState', JSON.stringify(state));
        } catch (e) {
            console.warn('Could not save finder state:', e);
        }
    }

    function loadFinderState() {
        try {
            const saved = localStorage.getItem('finderAdvancedState');
            if (saved) {
                const state = JSON.parse(saved);
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

    function init() {
        loadFinderState();
        initDomRefs();
        navigateTo(finderState.currentPath, finderState.currentView);

        // i18n-Übersetzungen anwenden
        if (window.appI18n && typeof window.appI18n.applyTranslations === 'function') {
            const finderModal = document.getElementById('finder-modal');
            if (finderModal) {
                window.appI18n.applyTranslations(finderModal);
            }
        }
    }

    // ============================================================================
    // Public API
    // ============================================================================

    window.FinderSystem = {
        init,
        navigateTo,
        navigateUp,
        navigateToFolder,
        openItem,
        setSortBy,
        setViewMode,
        toggleFavorite,
        getState: () => finderState
    };

    // Init wird von app.js nach Dialog-Initialisierung aufgerufen
    // Keine automatische Initialisierung hier

})();
