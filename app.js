console.log('App.js loaded v3');
// ============================================================================
// HINWEIS: Zentrale Systeme wurden in Module ausgelagert:
//
// NEUE SYSTEME:
// - window-manager.js: Zentrale Fensterverwaltung & Registry
// - action-bus.js: Deklaratives Event-System
// - window-configs.js: Alle Fenster-Definitionen
// - api.js: Saubere Schnittstelle zu allen Modulen
//
// BESTEHENDE MODULE:
// - constants.js: Konstanten
// - icons.js: Icon-Management
// - theme.js: Theme-Management
// - dock.js: Dock-System
// - menu.js: Menu-System
// - desktop.js: Desktop-Items
// - system.js: System-UI (WiFi, Bluetooth, etc.)
// - storage.js: Persistence
// - finder.js: Finder-System
// - dialog.js: Dialog-Klasse
//
// ZUGRIFF AUF SYSTEME:
// Über das zentrale API-Objekt: API.theme.setPreference('dark')
// Oder Legacy-Funktionen (werden automatisch erstellt)
// ============================================================================

// ===== App.js Konfiguration =====

// Modal-IDs und App-Initialisierung werden jetzt von app-init.js verwaltet

// Ensure appI18n exists on window for translations
if (!window.appI18n) {
    window.appI18n = {
        translate: (key) => key,
        applyTranslations: () => {},
        setLanguagePreference: () => {},
        getLanguagePreference: () => 'system',
        getActiveLanguage: () => 'en',
    };
}

// Lightweight translate helper exposed globally
if (typeof window.translate !== 'function') {
    window.translate = function (key, fallback) {
        const i18n = window.appI18n;
        if (!i18n || typeof i18n.translate !== 'function') {
            return fallback || key;
        }
        const result = i18n.translate(key);
        if (result === key && fallback) return fallback;
        return result;
    };
}

// ============================================================================
// Program Info wird jetzt vom WindowManager verwaltet
// Legacy-Support für bestehenden Code
// ============================================================================

// resolveProgramInfo handled by program-menu-sync.js

// Legacy currentProgramInfo/currentMenuModalId handled in program-menu-sync/menu.js

// ============================================================================
// menuDefinitions, menuActionIdCounter, menuActionHandlers sind jetzt in menu.js
// System status (WiFi, Bluetooth, etc.) ist jetzt in system.js
// ============================================================================

// syncTopZIndexWithDOM, bringDialogToFront, bringAllWindowsToFront provided by dialog-utils.js

// getMenuBarBottom, clampWindowToMenuBar, computeSnapMetrics, show/hideSnapPreview provided by snap-utils.js

// ============================================================================
// Dock-Funktionen sind jetzt in dock.js
// Aliase werden bereits oben definiert
// ============================================================================

// DOMContentLoaded initialization and modal setup handled by app-init.js

// Zentrale Funktion zum Aktualisieren des Program-Menütexts
// updateProgramLabel handled by program-menu-sync.js

// Funktion, um das aktuell oberste Modal zu ermitteln
// getTopModal handled by program-menu-sync.js

// getProgramInfo/updateProgramInfoMenu/renderProgramInfo handled by program-menu-sync.js

// openProgramInfoDialog handled by program-menu-sync.js


// ============================================================================
// renderApplicationMenu und handleMenuActionActivation sind VOLLSTÄNDIG in menu.js
// Diese werden über Aliase (Zeile 31-32) aufgerufen: window.MenuSystem.renderApplicationMenu
// Die alten Implementierungen wurden entfernt, um Konflikte zu vermeiden
// ============================================================================

// ============================================================================
// MENU-HELPER-FUNKTIONEN sind jetzt in menu.js
// createWindowMenuSection, getWindowMenuItems, createHelpMenuSection
// wurden nach menu.js verschoben.
// ============================================================================

// ============================================================================
// MENU-DEFINITIONEN sind jetzt in menu.js
// Die Funktionen buildDefaultMenuDefinition, buildFinderMenuDefinition, etc.
// wurden nach menu.js verschoben.
// ============================================================================

// openProgramInfoFromMenu is provided by program-menu-sync.js

// sendTextEditorMenuAction is provided by program-actions.js

// getImageViewerState provided by program-actions.js

// openActiveImageInNewTab is provided by program-actions.js

// downloadActiveImage is provided by program-actions.js

// updateProgramLabelByTopModal provided by program-menu-sync.js

// Menubar wiring moved to menubar-utils.js

// ============================================================================
// Persistence functions are now in storage.js (window.StorageSystem)
// ============================================================================

// Lädt GitHub-Repositories und cached sie im LocalStorage
function loadGithubRepos() {
    const username = 'Marormur';
    const cacheKey = `githubRepos_${username}`;
    const cacheTimestampKey = `githubReposTimestamp_${username}`;
    const cacheDuration = 1000 * 60 * 60; // 1 Stunde
    const list = document.getElementById('repo-list');
    const fileList = document.getElementById('repo-files');
    const breadcrumbs = document.getElementById('finder-breadcrumbs');
    const finderMain = document.getElementById('finder-main');
    const finderPlaceholder = document.getElementById('finder-placeholder');
    const imageViewer = document.getElementById('image-viewer');
    const imageInfo = document.getElementById('image-info');
    const imagePlaceholder = document.getElementById('image-placeholder');
    if (
        !list ||
        !fileList ||
        !breadcrumbs ||
        !finderMain ||
        !finderPlaceholder ||
        !imageViewer ||
        !imageInfo ||
        !imagePlaceholder
    )
        return;

    const supportsAbortController =
        typeof window.AbortController === 'function';

    const state = {
        repos: [],
        selectedRepo: null,
        selectedPath: '',
        contentCache: {},
        repoButtons: new Map(),
        imageAbortController: null,
    };

    let pendingFinderState = readFinderState();
    const RATE_LIMIT_ERROR = 'RATE_LIMIT';
    const NOT_FOUND_ERROR = 'NOT_FOUND';
    const githubHeaders = { Accept: 'application/vnd.github+json' };
    const withGithubOptions = (options = {}) => {
        const merged = Object.assign({}, options);
        const optionHeaders = options.headers || {};
        merged.headers = Object.assign({}, githubHeaders, optionHeaders);
        return merged;
    };
    const createRateLimitError = () => {
        const error = new Error('GitHub API rate limit reached');
        error.code = RATE_LIMIT_ERROR;
        return error;
    };
    const createNotFoundError = () => {
        const error = new Error('Requested GitHub resource was not found');
        error.code = NOT_FOUND_ERROR;
        return error;
    };
    const isRateLimitResponse = (res) => {
        if (!res) return false;
        if (res.status !== 403) return false;
        const remaining = res.headers
            ? res.headers.get('x-ratelimit-remaining')
            : null;
        return remaining === '0';
    };
    const assertGithubResponseOk = (res) => {
        if (res.ok) return res;
        if (res.status === 404) {
            throw createNotFoundError();
        }
        if (isRateLimitResponse(res)) {
            throw createRateLimitError();
        }
        const error = new Error(
            `GitHub API antwortete mit Status ${res.status}`,
        );
        error.status = res.status;
        throw error;
    };
    const isRateLimitError = (error) =>
        Boolean(error && error.code === RATE_LIMIT_ERROR);
    const isNotFoundError = (error) =>
        Boolean(error && error.code === NOT_FOUND_ERROR);

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

    const isProbablyTextFile = (name) => {
        if (!name || typeof name !== 'string') return false;
        const lower = name.toLowerCase();
        return textFileExtensions.some((ext) => lower.endsWith(ext));
    };

    const isImageFile = (name) => {
        if (!name || typeof name !== 'string') return false;
        const lower = name.toLowerCase();
        return imageFileExtensions.some((ext) => lower.endsWith(ext));
    };

    const getTextEditorIframe = () => {
        const dialog = window.dialogs ? window.dialogs['text-modal'] : null;
        if (!dialog || !dialog.modal) return null;
        return dialog.modal.querySelector('iframe');
    };

    const postToTextEditor = (message, attempt = 0) => {
        if (!message || typeof message !== 'object') {
            return;
        }
        const iframe = getTextEditorIframe();
        if (iframe && iframe.contentWindow) {
            let targetOrigin = '*';
            if (
                window.location &&
                typeof window.location.origin === 'string' &&
                window.location.origin !== 'null'
            ) {
                targetOrigin = window.location.origin;
            }
            iframe.contentWindow.postMessage(message, targetOrigin);
            return;
        }
        if (attempt < 10) {
            setTimeout(() => postToTextEditor(message, attempt + 1), 120);
        } else {
            console.warn(
                'Texteditor iframe nicht verfügbar, Nachricht konnte nicht gesendet werden.',
                message,
            );
        }
    };

    const decodeBase64ToText = (input) => {
        if (typeof input !== 'string') return null;
        try {
            const cleaned = input.replace(/\s/g, '');
            if (typeof window.atob !== 'function') {
                console.warn('window.atob ist nicht verfügbar.');
                return null;
            }
            const binary = window.atob(cleaned);
            if (typeof window.TextDecoder === 'function') {
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i += 1) {
                    bytes[i] = binary.charCodeAt(i);
                }
                return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
            }
            // Fallback für sehr alte Browser
            const percentEncoded = Array.prototype.map
                .call(binary, (char) => {
                    return `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`;
                })
                .join('');
            return decodeURIComponent(percentEncoded);
        } catch (err) {
            console.error('Konnte Base64-Inhalt nicht dekodieren:', err);
            return null;
        }
    };

    const ensureTextEditorOpen = () => {
        const dialog = window.dialogs ? window.dialogs['text-modal'] : null;
        if (dialog && typeof dialog.open === 'function') {
            dialog.open();
            return dialog;
        }
        if (typeof showTab === 'function') {
            showTab('text');
        }
        return null;
    };

    const ensureImageViewerOpen = () => {
        const dialog = window.dialogs ? window.dialogs['image-modal'] : null;
        if (dialog && typeof dialog.open === 'function') {
            dialog.open();
            return dialog;
        }
        if (typeof showTab === 'function') {
            showTab('image');
        }
        return null;
    };

    let imagePlaceholderState = null;
    const setImagePlaceholder = (messageKey, params) => {
        if (
            window.ImageViewerUtils &&
            typeof window.ImageViewerUtils.setPlaceholder === 'function'
        ) {
            window.ImageViewerUtils.setPlaceholder(messageKey, params);
            imagePlaceholderState = { key: messageKey, params };
            return;
        }
        if (!imagePlaceholder) return;
        if (typeof messageKey !== 'string' || messageKey.length === 0) {
            imagePlaceholder.removeAttribute('data-i18n');
            imagePlaceholder.removeAttribute('data-i18n-params');
            imagePlaceholder.textContent = '';
            imagePlaceholder.classList.add('hidden');
            imagePlaceholderState = null;
            return;
        }
        imagePlaceholder.setAttribute('data-i18n', messageKey);
        if (params && Object.keys(params).length > 0) {
            imagePlaceholder.setAttribute(
                'data-i18n-params',
                JSON.stringify(params),
            );
        } else {
            imagePlaceholder.removeAttribute('data-i18n-params');
        }
        imagePlaceholderState = {
            key: messageKey,
            params: params || undefined,
        };
        appI18n.applyTranslations(imagePlaceholder);
        imagePlaceholder.classList.remove('hidden');
    };

    window.addEventListener('languagePreferenceChange', () => {
        if (imagePlaceholderState) {
            setImagePlaceholder(
                imagePlaceholderState.key,
                imagePlaceholderState.params,
            );
        }
    });

    const updateImageInfo = ({ repo, path, dimensions, size }) => {
        if (
            window.ImageViewerUtils &&
            typeof window.ImageViewerUtils.updateInfo === 'function'
        ) {
            window.ImageViewerUtils.updateInfo({ repo, path, dimensions, size });
            return;
        }
        if (!imageInfo) return;
        const parts = [];
        if (repo) parts.push(repo);
        if (path) parts.push(path);
        const meta = [];
        if (dimensions) meta.push(dimensions);
        if (typeof size === 'number' && size > 0) {
            const kb = (size / 1024).toFixed(1);
            meta.push(`${kb} KB`);
        }
        const info = [parts.join(' / '), meta.join(' • ')]
            .filter(Boolean)
            .join(' — ');
        if (info) {
            imageInfo.textContent = info;
            imageInfo.classList.remove('hidden');
        } else {
            imageInfo.textContent = '';
            imageInfo.classList.add('hidden');
        }
    };

    const openImageFileInViewer = (repoName, path, entry) => {
        if (!entry || !entry.name) return;
        const viewerDialog = ensureImageViewerOpen();
        const filePath = path ? `${path}/${entry.name}` : entry.name;

        if (supportsAbortController && state.imageAbortController) {
            state.imageAbortController.abort();
        }
        state.imageAbortController = supportsAbortController
            ? new AbortController()
            : null;

        if (imageViewer) {
            imageViewer.src = '';
            imageViewer.classList.add('hidden');
        }
        updateImageInfo({ repo: repoName, path: filePath, size: entry.size });
        setImagePlaceholder('finder.loadingImage', { name: entry.name });

        const finalize = (src) => {
            if (!imageViewer) return;
            imageViewer.onload = () => {
                const natural = `${imageViewer.naturalWidth} × ${imageViewer.naturalHeight}px`;
                updateImageInfo({
                    repo: repoName,
                    path: filePath,
                    size: entry.size,
                    dimensions: natural,
                });
                setImagePlaceholder('');
                imageViewer.classList.remove('hidden');
                renderApplicationMenu('image-modal');
                if (
                    viewerDialog &&
                    typeof viewerDialog.bringToFront === 'function'
                ) {
                    viewerDialog.bringToFront();
                }
            };
            imageViewer.onerror = () => {
                setImagePlaceholder('finder.imageLoadError');
                imageViewer.classList.add('hidden');
                renderApplicationMenu('image-modal');
            };
            imageViewer.src = src;
        };

        const downloadUrl = entry.download_url;
        if (downloadUrl) {
            finalize(downloadUrl);
            return;
        }

        const fetchOptions =
            supportsAbortController && state.imageAbortController
                ? withGithubOptions({
                    signal: state.imageAbortController.signal,
                })
                : withGithubOptions();

        fetch(repoPathToUrl(repoName, filePath), fetchOptions)
            .then((res) => {
                assertGithubResponseOk(res);
                return res.json();
            })
            .then((data) => {
                if (!data || typeof data !== 'object' || data.type !== 'file') {
                    throw new Error(
                        'Unerwartetes Antwortformat beim Laden einer Bilddatei.',
                    );
                }
                if (typeof data.download_url === 'string') {
                    finalize(data.download_url);
                    return;
                }
                if (
                    data.encoding === 'base64' &&
                    typeof data.content === 'string'
                ) {
                    const cleaned = data.content.replace(/\s/g, '');
                    finalize(
                        `data:${data.content_type || 'image/*'};base64,${cleaned}`,
                    );
                    return;
                }
                throw new Error('Keine Quelle für das Bild verfügbar.');
            })
            .catch((err) => {
                if (err.name === 'AbortError') {
                    return;
                }
                if (isRateLimitError(err)) {
                    setImagePlaceholder('finder.rateLimit');
                } else {
                    console.error('Fehler beim Laden der Bilddatei:', err);
                    setImagePlaceholder('finder.imageLoadErrorRetry');
                }
            });
    };

    const openTextFileInEditor = (repoName, path, entry) => {
        if (!entry || !entry.name) return;
        const textDialog = ensureTextEditorOpen();
        const filePath = path ? `${path}/${entry.name}` : entry.name;
        const payloadBase = {
            repo: repoName,
            path: filePath,
            fileName: entry.name,
            size: entry.size,
        };
        postToTextEditor({
            type: 'textEditor:showLoading',
            payload: payloadBase,
        });

        const fetchContent = () => {
            if (entry.download_url) {
                return fetch(entry.download_url).then((res) => {
                    if (!res.ok) {
                        throw new Error(
                            `Download-URL antwortete mit Status ${res.status}`,
                        );
                    }
                    return res.text();
                });
            }
            return fetch(repoPathToUrl(repoName, filePath), withGithubOptions())
                .then((res) => {
                    assertGithubResponseOk(res);
                    return res.json();
                })
                .then((fileData) => {
                    if (
                        !fileData ||
                        typeof fileData !== 'object' ||
                        fileData.type !== 'file'
                    ) {
                        throw new Error(
                            'Unerwartetes Antwortformat beim Laden einer Datei.',
                        );
                    }
                    if (
                        fileData.encoding === 'base64' &&
                        typeof fileData.content === 'string'
                    ) {
                        const decoded = decodeBase64ToText(fileData.content);
                        if (decoded === null) {
                            throw new Error(
                                'Base64-Inhalt konnte nicht dekodiert werden.',
                            );
                        }
                        return decoded;
                    }
                    if (typeof fileData.download_url === 'string') {
                        return fetch(fileData.download_url).then((res) => {
                            if (!res.ok) {
                                throw new Error(
                                    `Download-URL antwortete mit Status ${res.status}`,
                                );
                            }
                            return res.text();
                        });
                    }
                    throw new Error(
                        'Keine gültige Quelle für den Dateiinhalt gefunden.',
                    );
                });
        };

        fetchContent()
            .then((content) => {
                postToTextEditor({
                    type: 'textEditor:loadRemoteFile',
                    payload: Object.assign({}, payloadBase, {
                        content,
                    }),
                });
                if (
                    textDialog &&
                    typeof textDialog.bringToFront === 'function'
                ) {
                    textDialog.bringToFront();
                }
            })
            .catch((err) => {
                console.error(
                    'Fehler beim Laden der Datei für den Texteditor:',
                    err,
                );
                const messageKey = isRateLimitError(err)
                    ? 'textEditor.status.rateLimit'
                    : 'finder.fileLoadError';
                postToTextEditor({
                    type: 'textEditor:loadError',
                    payload: Object.assign({}, payloadBase, {
                        message: appI18n.translate(messageKey),
                    }),
                });
            });
    };

    const showPlaceholder = () => {
        finderPlaceholder.classList.remove('hidden');
        finderMain.classList.add('hidden');
        breadcrumbs.textContent = '';
        fileList.innerHTML = '';
    };

    const renderFileMessage = (messageKey, params) => {
        fileList.innerHTML = '';
        const item = document.createElement('li');
        item.className = 'px-4 py-3 text-sm text-gray-500 dark:text-gray-400';
        item.setAttribute('data-i18n', messageKey);
        if (params && Object.keys(params).length > 0) {
            item.setAttribute('data-i18n-params', JSON.stringify(params));
        }
        appI18n.applyTranslations(item);
        fileList.appendChild(item);
    };

    const renderEmptySidebarState = (messageKey) => {
        list.innerHTML = '';
        const item = document.createElement('li');
        item.className = 'px-4 py-3 text-sm text-gray-500 dark:text-gray-400';
        item.setAttribute('data-i18n', messageKey);
        appI18n.applyTranslations(item);
        list.appendChild(item);
        showPlaceholder();
    };

    const updateSidebarHighlight = () => {
        state.repoButtons.forEach((button, repoName) => {
            if (repoName === state.selectedRepo) {
                button.classList.add(
                    'bg-blue-100',
                    'dark:bg-blue-900/40',
                    'border-l-blue-500',
                    'dark:border-l-blue-400',
                );
            } else {
                button.classList.remove(
                    'bg-blue-100',
                    'dark:bg-blue-900/40',
                    'border-l-blue-500',
                    'dark:border-l-blue-400',
                );
            }
        });
    };

    const renderBreadcrumbs = (repoName, path) => {
        breadcrumbs.innerHTML = '';
        const elements = [];

        const createCrumbButton = (label, targetPath) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className =
                'text-blue-600 dark:text-blue-400 hover:underline';
            button.textContent = label;
            button.addEventListener('click', () =>
                loadRepoPath(repoName, targetPath),
            );
            return button;
        };

        elements.push(createCrumbButton(repoName, ''));

        if (path) {
            const segments = path.split('/').filter(Boolean);
            let cumulative = '';
            segments.forEach((segment) => {
                cumulative = cumulative ? `${cumulative}/${segment}` : segment;
                elements.push(createCrumbButton(segment, cumulative));
            });
        }

        elements.forEach((element, index) => {
            if (index > 0) {
                breadcrumbs.appendChild(document.createTextNode(' / '));
            }
            breadcrumbs.appendChild(element);
        });
    };

    const parentPath = (path) => {
        if (!path) return '';
        const parts = path.split('/').filter(Boolean);
        parts.pop();
        return parts.join('/');
    };

    const storeCacheEntry = (repoName, path, contents) => {
        const normalized = path || '';
        if (!state.contentCache[repoName]) {
            state.contentCache[repoName] = {};
        }
        state.contentCache[repoName][normalized] = contents;
    };

    const readCacheEntry = (repoName, path) => {
        const normalized = path || '';
        return state.contentCache[repoName]
            ? state.contentCache[repoName][normalized]
            : undefined;
    };

    const renderFiles = (contents, repoName, path) => {
        fileList.innerHTML = '';
        if (!Array.isArray(contents) || contents.length === 0) {
            renderFileMessage('finder.emptyDirectory');
            return;
        }

        if (path) {
            const li = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button';
            button.className =
                'w-full text-left px-4 py-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700';
            const backWrapper = document.createElement('span');
            backWrapper.className = 'flex items-center gap-2';
            const backIcon = document.createElement('span');
            backIcon.textContent = '◀︎';
            const backLabel = document.createElement('span');
            backLabel.className = 'font-medium';
            backLabel.setAttribute('data-i18n', 'finder.back');
            appI18n.applyTranslations(backLabel);
            backWrapper.appendChild(backIcon);
            backWrapper.appendChild(backLabel);
            button.appendChild(backWrapper);
            button.addEventListener('click', () =>
                loadRepoPath(repoName, parentPath(path)),
            );
            li.appendChild(button);
            fileList.appendChild(li);
        }

        const sorted = contents.slice().sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name, 'de', {
                    sensitivity: 'base',
                });
            }
            return a.type === 'dir' ? -1 : 1;
        });

        sorted.forEach((entry) => {
            const li = document.createElement('li');
            if (entry.type === 'dir') {
                const button = document.createElement('button');
                button.type = 'button';
                button.className =
                    'w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition';
                const label = document.createElement('span');
                label.className =
                    'flex items-center gap-2 text-gray-700 dark:text-gray-200';
                const folderIcon = document.createElement('span');
                folderIcon.textContent = '📁';
                const folderName = document.createElement('span');
                folderName.className = 'font-medium';
                folderName.textContent = entry.name;
                label.appendChild(folderIcon);
                label.appendChild(folderName);
                const chevron = document.createElement('span');
                chevron.className = 'text-gray-400';
                chevron.textContent = '›';
                button.appendChild(label);
                button.appendChild(chevron);
                button.addEventListener('click', () => {
                    const nextPath = path
                        ? `${path}/${entry.name}`
                        : entry.name;
                    loadRepoPath(repoName, nextPath);
                });
                li.appendChild(button);
            } else if (isImageFile(entry.name)) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className =
                    'w-full text-left px-4 py-3 flex items-center justify-between gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition';
                const label = document.createElement('span');
                label.className = 'flex items-center gap-2';
                const fileIcon = document.createElement('span');
                fileIcon.textContent = '🖼️';
                const fileName = document.createElement('span');
                fileName.textContent = entry.name;
                label.appendChild(fileIcon);
                label.appendChild(fileName);
                button.appendChild(label);
                const openHint = document.createElement('span');
                openHint.className =
                    'text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider';
                openHint.setAttribute('data-i18n', 'finder.imageViewer');
                appI18n.applyTranslations(openHint);
                button.appendChild(openHint);
                button.addEventListener('click', () =>
                    openImageFileInViewer(repoName, path, entry),
                );
                li.appendChild(button);
            } else if (isProbablyTextFile(entry.name)) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className =
                    'w-full text-left px-4 py-3 flex items-center justify-between gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition';
                const label = document.createElement('span');
                label.className = 'flex items-center gap-2';
                const fileIcon = document.createElement('span');
                fileIcon.textContent = '📄';
                const fileName = document.createElement('span');
                fileName.textContent = entry.name;
                label.appendChild(fileIcon);
                label.appendChild(fileName);
                button.appendChild(label);
                const openHint = document.createElement('span');
                openHint.className =
                    'text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider';
                openHint.setAttribute('data-i18n', 'finder.textEditor');
                appI18n.applyTranslations(openHint);
                button.appendChild(openHint);
                button.addEventListener('click', () =>
                    openTextFileInEditor(repoName, path, entry),
                );
                li.appendChild(button);
            } else {
                const link = document.createElement('a');
                link.href = entry.html_url || entry.download_url || '#';
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.className =
                    'block px-4 py-3 flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition';
                const fileIcon = document.createElement('span');
                fileIcon.textContent = '📄';
                const fileName = document.createElement('span');
                fileName.textContent = entry.name;
                link.appendChild(fileIcon);
                link.appendChild(fileName);
                li.appendChild(link);
            }
            fileList.appendChild(li);
        });
    };

    const repoPathToUrl = (repoName, path) => {
        const encodedSegments = path
            ? path.split('/').filter(Boolean).map(encodeURIComponent).join('/')
            : '';
        return `https://api.github.com/repos/${username}/${repoName}/contents${encodedSegments ? '/' + encodedSegments : ''}`;
    };

    const loadRepoPath = (repoName, path = '') => {
        pendingFinderState = null;
        state.selectedRepo = repoName;
        state.selectedPath = path;
        finderPlaceholder.classList.add('hidden');
        finderMain.classList.remove('hidden');
        updateSidebarHighlight();
        renderBreadcrumbs(repoName, path);
        if (repoName) {
            writeFinderState({ repo: repoName, path });
        } else {
            clearFinderState();
        }

        const cached = readCacheEntry(repoName, path);
        if (cached) {
            renderFiles(cached, repoName, path);
            return;
        }

        renderFileMessage('finder.loadingFiles');
        fetch(repoPathToUrl(repoName, path), withGithubOptions())
            .then((res) => {
                assertGithubResponseOk(res);
                return res.json();
            })
            .then((contents) => {
                if (!Array.isArray(contents)) {
                    throw new Error(
                        'Unerwartetes Antwortformat der GitHub API',
                    );
                }
                storeCacheEntry(repoName, path, contents);
                renderFiles(contents, repoName, path);
            })
            .catch((err) => {
                if (isRateLimitError(err)) {
                    renderFileMessage('finder.rateLimit');
                } else if (isNotFoundError(err)) {
                    renderFileMessage('finder.pathNotFound');
                    if (
                        state.selectedRepo === repoName &&
                        state.selectedPath === path
                    ) {
                        writeFinderState({ repo: repoName, path: '' });
                    }
                } else {
                    console.error('Fehler beim Laden der Repo-Inhalte:', err);
                    renderFileMessage('finder.filesLoadError');
                }
            });
    };

    const renderRepos = (repos) => {
        list.innerHTML = '';
        state.repoButtons.clear();
        state.repos = Array.isArray(repos) ? repos.slice() : [];
        if (!Array.isArray(repos) || repos.length === 0) {
            clearFinderState();
            renderEmptySidebarState('finder.noRepositories');
            return;
        }

        const locale = appI18n.getActiveLanguage
            ? appI18n.getActiveLanguage()
            : 'de';
        state.repos
            .slice()
            .sort((a, b) =>
                a.name.localeCompare(b.name, locale, { sensitivity: 'base' }),
            )
            .forEach((repo) => {
                const item = document.createElement('li');
                const button = document.createElement('button');
                button.type = 'button';
                button.className =
                    'w-full px-4 py-3 text-left flex flex-col gap-1 border-l-4 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition';
                const name = document.createElement('span');
                name.className =
                    'font-semibold text-gray-800 dark:text-gray-100 truncate';
                if (repo.name) {
                    name.textContent = repo.name;
                    name.removeAttribute('data-i18n');
                } else {
                    name.setAttribute('data-i18n', 'finder.repoUnnamed');
                    appI18n.applyTranslations(name);
                }
                const description = document.createElement('span');
                description.className =
                    'text-sm text-gray-500 dark:text-gray-400 truncate';
                if (repo.description) {
                    description.textContent = repo.description;
                    description.removeAttribute('data-i18n');
                } else {
                    description.setAttribute(
                        'data-i18n',
                        'finder.repoDescriptionMissing',
                    );
                    appI18n.applyTranslations(description);
                }
                button.appendChild(name);
                button.appendChild(description);
                item.appendChild(button);
                list.appendChild(item);
                if (repo.name) {
                    button.addEventListener('click', () =>
                        loadRepoPath(repo.name, ''),
                    );
                    state.repoButtons.set(repo.name, button);
                } else {
                    button.disabled = true;
                }
            });

        updateSidebarHighlight();

        if (pendingFinderState && typeof pendingFinderState.repo === 'string') {
            if (state.repoButtons.has(pendingFinderState.repo)) {
                const target = pendingFinderState;
                pendingFinderState = null;
                loadRepoPath(target.repo, target.path || '');
                return;
            }
            pendingFinderState = null;
            clearFinderState();
        }

        if (state.selectedRepo && state.repoButtons.has(state.selectedRepo)) {
            return;
        }
        if (state.selectedRepo && !state.repoButtons.has(state.selectedRepo)) {
            clearFinderState();
            state.selectedRepo = null;
            state.selectedPath = '';
        }
        showPlaceholder();
    };

    const tryRenderCachedRepos = () => {
        const cachedRepos = localStorage.getItem(cacheKey);
        const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
        if (!cachedRepos || !cachedTimestamp) {
            return { served: false, fresh: false };
        }
        try {
            const parsed = JSON.parse(cachedRepos);
            if (!Array.isArray(parsed)) {
                return { served: false, fresh: false };
            }
            renderRepos(parsed);
            const age = Date.now() - parseInt(cachedTimestamp, 10);
            const isFresh = Number.isFinite(age) && age < cacheDuration;
            return { served: true, fresh: isFresh };
        } catch (err) {
            console.warn('Konnte Cache nicht lesen:', err);
            return { served: false, fresh: false };
        }
    };

    const cacheStatus = tryRenderCachedRepos();
    if (cacheStatus.fresh) {
        return;
    }

    fetch(
        `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
        withGithubOptions(),
    )
        .then((res) => {
            assertGithubResponseOk(res);
            return res.json();
        })
        .then((repos) => {
            if (!Array.isArray(repos)) {
                throw new Error('Unerwartetes Antwortformat der GitHub API');
            }
            localStorage.setItem(cacheKey, JSON.stringify(repos));
            localStorage.setItem(cacheTimestampKey, Date.now().toString());
            renderRepos(repos);
        })
        .catch((err) => {
            console.error('Fehler beim Laden der Repos:', err);
            if (!cacheStatus.served) {
                if (isRateLimitError(err)) {
                    clearFinderState();
                    renderEmptySidebarState('finder.rateLimit');
                } else {
                    renderEmptySidebarState('finder.repositoriesError');
                }
            }
        });
}

// updateDockIndicators provided by dock.js

// Dialog-Klasse wurde nach js/dialog.js extrahiert und steht global als window.Dialog zur Verfügung.
