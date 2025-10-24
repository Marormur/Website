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
        favorites: new Set(),
        recentFiles: []
    };

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

        parts.push(`<button class="finder-breadcrumb-item" onclick="window.FinderSystem.navigateTo([], '${finderState.currentView}')">${viewLabel}</button>`);

        // Pfad-Teile (überspringe ersten Teil wenn er gleich dem View-Label ist)
        finderState.currentPath.forEach((part, index) => {
            // Überspringe "Computer" wenn wir in der Computer-Ansicht sind und es der erste Pfad-Teil ist
            if (index === 0 && finderState.currentView === 'computer' && part === 'Computer') {
                return; // Überspringe diesen Teil
            }

            const pathUpToHere = finderState.currentPath.slice(0, index + 1);
            parts.push(`<span class="finder-breadcrumb-separator">›</span>`);
            parts.push(`<button class="finder-breadcrumb-item" onclick="window.FinderSystem.navigateTo(['${pathUpToHere.join("','")}'])">${part}</button>`);
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
        // Wenn wir in der GitHub-Ansicht sind, öffne das Projects-Modal im Hintergrund
        // und zeige eine Integration an
        if (finderState.currentPath.length === 0) {
            // Root-Level: Zeige GitHub als Aktion
            return [
                {
                    name: '📂 Meine GitHub Repositories',
                    type: 'action',
                    icon: '�',
                    size: 0,
                    modified: new Date().toISOString(),
                    action: () => {
                        // Öffne das Projects-Modal für volle Funktionalität
                        if (window.dialogs && window.dialogs['projects-modal']) {
                            window.dialogs['projects-modal'].open();
                            // Bringe es in den Vordergrund
                            if (typeof window.dialogs['projects-modal'].bringToFront === 'function') {
                                window.dialogs['projects-modal'].bringToFront();
                            }
                        }
                    }
                }
            ];
        }
        return [];
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
                        <th onclick="window.FinderSystem.setSortBy('name')">Name</th>
                        <th onclick="window.FinderSystem.setSortBy('size')">Größe</th>
                        <th onclick="window.FinderSystem.setSortBy('date')">Geändert</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr class="finder-list-item" ondblclick="window.FinderSystem.openItem('${item.name}', '${item.type}')">
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
                    <div class="finder-grid-item" ondblclick="window.FinderSystem.openItem('${item.name}', '${item.type}')">
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

        // Öffne basierend auf Dateityp
        const ext = name.split('.').pop().toLowerCase();

        if (['txt', 'md', 'js', 'json', 'html', 'css'].includes(ext)) {
            // Textdatei im Editor öffnen
            if (window.dialogs && window.dialogs['text-modal']) {
                window.dialogs['text-modal'].open();
            }
        } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
            // Bild im Viewer öffnen
            if (window.dialogs && window.dialogs['image-modal']) {
                window.dialogs['image-modal'].open();
            }
        }
    }

    // ============================================================================
    // Utilities
    // ============================================================================

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
