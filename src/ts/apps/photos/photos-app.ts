/*
 * Fotos-App ΓÇô inspiriert von der macOS Fotos Anwendung.
 * L├ñdt Bilder aus der Picsum API, gruppiert sie in verschiedene Ansichten
 * und stellt einen Detail-Viewer inklusive Favoritenverwaltung bereit.
 */

type Orientation = 'landscape' | 'portrait' | 'square';
type SidebarFilter = 'all' | 'favorites' | Orientation;
type SegmentView = 'moments' | 'collections' | 'years';

interface PicsumApiPhoto {
    id: string;
    author: string;
    width: number;
    height: number;
    url: string;
    download_url: string;
}

interface PhotoLibraryItem {
    id: string;
    author: string;
    width: number;
    height: number;
    orientation: Orientation;
    year: number;
    url: string;
    downloadUrl: string;
    thumbUrl: string;
    largeUrl: string;
}

interface ExternalPhotoItem {
    id: string;
    author: string;
    downloadUrl: string;
    largeUrl: string;
    url?: string;
    width?: number;
    height?: number;
    orientation?: Orientation;
    sourceName?: string;
    isExternal: true;
}

type AnyPhotoItem = PhotoLibraryItem | ExternalPhotoItem;

interface PhotosElements {
    container: HTMLElement | null;
    sidebar: HTMLElement | null;
    gallery: HTMLElement | null;
    loading: HTMLElement | null;
    error: HTMLElement | null;
    errorRetry: HTMLButtonElement | null;
    empty: HTMLElement | null;
    placeholder: HTMLElement | null;
    photoCount: HTMLElement | null;
    refreshButton: HTMLButtonElement | null;
    searchInput: HTMLInputElement | null;
    searchClear: HTMLButtonElement | null;
    sidebarButtons: HTMLButtonElement[];
    segmentButtons: HTMLButtonElement[];
    overlay: HTMLElement | null;
    detailTitle: HTMLElement | null;
    detailMeta: HTMLElement | null;
    detailDimensions: HTMLElement | null;
    detailCounter: HTMLElement | null;
    detailOpen: HTMLAnchorElement | null;
    detailDownload: HTMLAnchorElement | null;
    detailFavorite: HTMLButtonElement | null;
    detailFavoriteLabel: HTMLElement | null;
    detailFavoriteIcon: HTMLElement | null;
    detailClose: HTMLButtonElement | null;
    detailPrev: HTMLButtonElement | null;
    detailNext: HTMLButtonElement | null;
    image: HTMLImageElement | null;
    imageInfo: HTMLElement | null;
    loader: HTMLElement | null;
    countAll: HTMLElement | null;
    countFavorites: HTMLElement | null;
    countLandscape: HTMLElement | null;
    countPortrait: HTMLElement | null;
    countSquare: HTMLElement | null;
    titlebar: HTMLElement | null;
    statusbar: HTMLElement | null;
}
interface PhotosState {
    initialized: boolean;
    photos: PhotoLibraryItem[];
    filteredPhotos: PhotoLibraryItem[];
    filteredIndexMap: Map<string, number>;
    favorites: Set<string>;
    activeFilter: SidebarFilter;
    activeSegment: SegmentView;
    searchTerm: string;
    isLoading: boolean;
    currentPage: number;
    overlayVisible: boolean;
    selectedIndex: number;
    activePhotoId: string | null;
    externalPhoto: ExternalPhotoItem | null;
    pendingImageId: string | null;
    orientationCounts: Record<Orientation, number>;
}

interface PhotosAppApi {
    init: () => void;
    showExternalImage: (payload: { src: string; name?: string }) => void;
}

interface PhotoGroup {
    title: string;
    photos: PhotoLibraryItem[];
}

type TranslateFn = (
    key: string,
    params?: Record<string, unknown>,
    options?: { fallback?: string }
) => string;

const globalWindow = window as typeof window & {
    appI18n?: {
        translate?: TranslateFn;
        applyTranslations?: (root?: Element | Document) => void;
    };
    PhotosApp?: PhotosAppApi;
    WindowChrome?: {
        createWindowFrame: (config: unknown) => {
            frame: HTMLElement;
            titlebar: HTMLElement;
            content: HTMLElement;
            statusbar: HTMLElement | null;
        };
        updateStatusBar: (statusbar: HTMLElement, side: 'left' | 'right', content: string) => void;
    };
    API?: {
        window?: {
            close?: (windowId: string) => void;
        };
    };
};

function t(key: string, fallback: string, params?: Record<string, unknown>): string {
    const translate = globalWindow.appI18n?.translate;
    if (typeof translate === 'function') {
        return translate(key, params, { fallback });
    }
    return fallback;
}

(function photosAppFactory() {
    const state: PhotosState = {
        initialized: false,
        photos: [],
        filteredPhotos: [],
        filteredIndexMap: new Map(),
        favorites: new Set(),
        activeFilter: 'all',
        activeSegment: 'moments',
        searchTerm: '',
        isLoading: false,
        currentPage: 1,
        overlayVisible: false,
        selectedIndex: -1,
        activePhotoId: null,
        externalPhoto: null,
        pendingImageId: null,
        orientationCounts: { landscape: 0, portrait: 0, square: 0 },
    };

    const elements: PhotosElements = {
        container: null,
        sidebar: null,
        gallery: null,
        loading: null,
        error: null,
        errorRetry: null,
        empty: null,
        placeholder: null,
        photoCount: null,
        refreshButton: null,
        searchInput: null,
        searchClear: null,
        sidebarButtons: [],
        segmentButtons: [],
        overlay: null,
        detailTitle: null,
        detailMeta: null,
        detailDimensions: null,
        detailCounter: null,
        detailOpen: null,
        detailDownload: null,
        detailFavorite: null,
        detailFavoriteLabel: null,
        detailFavoriteIcon: null,
        detailClose: null,
        detailPrev: null,
        detailNext: null,
        image: null,
        imageInfo: null,
        loader: null,
        countAll: null,
        countFavorites: null,
        countLandscape: null,
        countPortrait: null,
        countSquare: null,
        titlebar: null,
        statusbar: null,
    };
    function isExternalPhoto(photo: AnyPhotoItem): photo is ExternalPhotoItem {
        return (photo as ExternalPhotoItem).isExternal === true;
    }

    function renderWindow(): HTMLElement | null {
        const WindowChrome = globalWindow.WindowChrome;
        if (!WindowChrome) {
            console.error('WindowChrome not available');
            return null;
        }

        const { frame, titlebar, content, statusbar } = WindowChrome.createWindowFrame({
            title: t('photos.title', 'Fotos'),
            icon: './img/fotos.png',
            showClose: true,
            showMinimize: false,
            showMaximize: false,
            onClose: () => {
                globalWindow.API?.window?.close?.('photos-window');
            },
            toolbar: [
                {
                    label: '',
                    icon: `<div class="relative flex-1 sm:flex-initial min-w-[200px]">
                        <input id="photos-search" type="search" placeholder="${t('photos.search.placeholder', 'Nach Autor suchen')}" 
                            class="w-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        <button id="photos-search-clear" type="button" class="absolute inset-y-0 right-2 flex items-center text-xl text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 invisible pointer-events-none" 
                            title="${t('photos.search.clear', 'Suche löschen')}">×</button>
                    </div>`,
                },
                { type: 'separator' },
                {
                    label: '',
                    icon: `<div class="flex bg-gray-200 dark:bg-gray-800 rounded-full p-1 text-sm font-medium text-gray-600 dark:text-gray-300 shadow-inner" role="group">
                        <button type="button" data-photos-segment="moments" class="photos-segment-button">${t('photos.segments.moments', 'Momente')}</button>
                        <button type="button" data-photos-segment="collections" class="photos-segment-button">${t('photos.segments.collections', 'Sammlungen')}</button>
                        <button type="button" data-photos-segment="years" class="photos-segment-button">${t('photos.segments.years', 'Jahre')}</button>
                    </div>`,
                },
            ],
            showStatusBar: true,
            statusBarLeft: t('photos.status.countPlaceholder', '– Fotos'),
            statusBarRight: '',
        });

        // Store references
        elements.titlebar = titlebar;
        elements.statusbar = statusbar;

        // Build content and append (extracted into helper for reuse with BaseWindow)
        const { container: contentContainer, detailOverlay: detailOverlayEl } =
            createPhotosContent();
        content.appendChild(contentContainer);
        content.appendChild(detailOverlayEl);

        return frame;
    }

    // Build the shared content (sidebar, main area, detail overlay).
    // This is extracted so it can be used both by the legacy modal flow and
    // by the BaseWindow-based `PhotosWindow` implementation.
    function createPhotosContent(): { container: HTMLElement; detailOverlay: HTMLElement } {
        // Build sidebar
        const sidebar = document.createElement('aside');
        sidebar.className =
            'hidden md:flex flex-col w-56 border-r border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/60';
        sidebar.innerHTML = `
            <div class="px-5 pt-6 pb-4">
                <p class="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">${t('photos.sidebar.library', 'Bibliothek')}</p>
                <nav class="mt-4 space-y-1" id="photos-sidebar">
                    <button type="button" data-photos-filter="all" class="photos-sidebar-button">
                        <span>${t('photos.sidebar.items.all', 'Alle Fotos')}</span>
                        <span id="photos-count-all" class="photos-sidebar-count">–</span>
                    </button>
                    <button type="button" data-photos-filter="favorites" class="photos-sidebar-button">
                        <span>${t('photos.sidebar.items.favorites', 'Favoriten')}</span>
                        <span id="photos-count-favorites" class="photos-sidebar-count">0</span>
                    </button>
                </nav>
                <p class="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mt-6">${t('photos.sidebar.filters', 'Filter')}</p>
                <nav class="mt-4 space-y-1">
                    <button type="button" data-photos-filter="landscape" class="photos-sidebar-button">
                        <span>${t('photos.sidebar.items.landscape', 'Querformat')}</span>
                        <span id="photos-count-landscape" class="photos-sidebar-count">–</span>
                    </button>
                    <button type="button" data-photos-filter="portrait" class="photos-sidebar-button">
                        <span>${t('photos.sidebar.items.portrait', 'Hochformat')}</span>
                        <span id="photos-count-portrait" class="photos-sidebar-count">–</span>
                    </button>
                    <button type="button" data-photos-filter="square" class="photos-sidebar-button">
                        <span>${t('photos.sidebar.items.square', 'Quadratisch')}</span>
                        <span id="photos-count-square" class="photos-sidebar-count">–</span>
                    </button>
                </nav>
            </div>
            <div class="px-5 pb-6 mt-auto">
                <button id="photos-refresh" type="button" class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 transition hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-300">
                    <span aria-hidden="true">↻</span>
                    <span>${t('photos.sidebar.refresh', 'Neu laden')}</span>
                </button>
                <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">${t('photos.sidebar.sourceNote', 'Quelle: Lorem Picsum – zufällige kuratierte Fotokollektionen.')}</p>
            </div>
        `;

        // Build main area
        const mainArea = document.createElement('div');
        mainArea.className = 'flex-1 flex flex-col min-h-0 relative';
        mainArea.innerHTML = `
            <div class="flex-1 relative min-h-0">
                <div id="photos-loading" class="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-20 hidden">
                    <div class="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-300">
                        <span class="h-10 w-10 border-4 border-gray-300 dark:border-gray-700 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin"></span>
                        <span class="text-sm font-medium">${t('photos.status.loading', 'Lade Fotos…')}</span>
                    </div>
                </div>
                <div id="photos-error" class="absolute inset-x-0 top-6 mx-auto max-w-lg bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-200 rounded-2xl shadow px-5 py-4 hidden">
                    <p class="font-semibold mb-1">${t('photos.errors.heading', 'Fehler beim Laden')}</p>
                    <p class="text-sm">${t('photos.errors.description', 'Bitte überprüfe deine Verbindung und versuche es erneut.')}</p>
                    <button id="photos-error-retry" type="button" class="mt-3 inline-flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-100 underline decoration-dotted">${t('photos.buttons.retry', 'Erneut versuchen')}</button>
                </div>
                <div id="photos-gallery" class="absolute inset-0 overflow-y-auto px-5 sm:px-6 py-6 space-y-8"></div>
                <div id="photos-empty" class="absolute inset-0 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 hidden px-6">
                    <div>
                        <p class="text-lg font-semibold">${t('photos.empty.title', 'Keine Fotos gefunden')}</p>
                        <p class="text-sm mt-1">${t('photos.empty.description', 'Passe Suche oder Filter an, um weitere Ergebnisse zu sehen.')}</p>
                    </div>
                </div>
                <div id="image-placeholder" class="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400 text-center px-6 hidden pointer-events-none">${t('photos.placeholder', 'Wähle ein Foto aus, um Details zu sehen.')}</div>
            </div>
        `;

        // Detail overlay
        const detailOverlay = document.createElement('div');
        detailOverlay.id = 'photo-detail-overlay';
        detailOverlay.className =
            'absolute inset-0 hidden items-center justify-center px-4 py-10 bg-black/50 backdrop-blur-sm z-30';
        detailOverlay.innerHTML = `
            <div class="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full h-full flex flex-col">
                <div class="flex items-center gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <div class="flex-1 min-w-0">
                        <p id="photo-detail-title" class="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">${t('photos.detail.titleFallback', 'Foto')}</p>
                        <p id="photo-detail-meta" class="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate"></p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="photo-detail-favorite" type="button" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium transition hover:bg-gray-200 dark:hover:bg-gray-700">
                            <span aria-hidden="true">♡</span>
                            <span>${t('photos.detail.favoriteAdd', 'Zu Favoriten')}</span>
                        </button>
                        <a id="photo-detail-download" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm font-medium transition hover:bg-blue-500" href="#" target="_blank" rel="noreferrer">${t('photos.detail.download', 'Herunterladen')}</a>
                        <button id="photo-detail-close" type="button" class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-lg leading-none transition hover:bg-gray-200 dark:hover:bg-gray-700" title="${t('common.close', 'Schließen')}">×</button>
                    </div>
                </div>
                <div class="flex-1 flex overflow-hidden">
                    <button id="photo-detail-prev" type="button" class="hidden sm:flex items-center justify-center w-14 bg-transparent text-3xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition" title="${t('photos.detail.prev', 'Vorheriges Foto')}">‹</button>
                    <div class="flex-1 relative bg-gray-50 dark:bg-gray-950 flex items-center justify-center overflow-hidden">
                        <img id="image-viewer" class="max-w-full max-h-full object-contain" alt="${t('photos.detail.imageAlt', 'Ausgewähltes Foto')}" />
                        <div id="photo-detail-loader" class="absolute inset-0 flex items-center justify-center bg-gray-900/40 text-white text-sm font-medium hidden">${t('photos.detail.loader', 'Foto wird geladen…')}</div>
                    </div>
                    <button id="photo-detail-next" type="button" class="hidden sm:flex items-center justify-center w-14 bg-transparent text-3xl text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition" title="${t('photos.detail.next', 'Nächstes Foto')}">›</button>
                </div>
                <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div class="flex-1 min-w-[200px]">
                        <p id="image-info" class="font-medium text-gray-700 dark:text-gray-200"></p>
                        <p id="photo-detail-dimensions" class="text-xs text-gray-500 dark:text-gray-400 mt-1"></p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span id="photo-detail-counter" class="text-xs font-medium"></span>
                        <a id="photo-detail-open" href="#" target="_blank" rel="noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">${t('photos.detail.openInBrowser', 'Im Browser öffnen')}</a>
                    </div>
                </div>
            </div>
        `;

        // Combine layout
        const container = document.createElement('div');
        container.className = 'flex h-full';
        container.appendChild(sidebar);
        container.appendChild(mainArea);

        return { container, detailOverlay };
    }

    // Expose a safe builder for window integration
    globalWindow.PhotosAppBuildContent = createPhotosContent;

    // Attach the app to an existing window element (used by PhotosWindow)
    function attachToWindow(container: HTMLElement): void {
        if (!container) return;
        elements.container = container;
        elements.titlebar = container.querySelector('.window-titlebar') ?? null;
        elements.statusbar = container.querySelector('.window-statusbar') ?? null;

        cacheElements();
        wireSidebar();
        wireSegments();
        wireSearch();
        wireGallery();
        wireDetail();
        globalWindow.appI18n?.applyTranslations?.(elements.container ?? undefined);
        void fetchPhotos();
    }

    globalWindow.PhotosAppAttachToWindow = attachToWindow;

    function init(): void {
        if (state.initialized) {
            return;
        }
        state.initialized = true;

        // Prefer the BaseWindow (multi-window) implementation when available
        const existing = document.getElementById('photos-window');
        if (!existing) {
            const PhotosWindow = (window as any).PhotosWindow;
            if (typeof PhotosWindow === 'function') {
                // Create a PhotosWindow instance which will attach app content
                const win = PhotosWindow.create();
                if (win && win.element) {
                    // Keep legacy id for tests/selection
                    win.element.id = 'photos-window';
                    elements.container = win.element as HTMLElement;
                }
            } else {
                // Fallback: create the old modal-based UI
                const frame = renderWindow();
                if (!frame) {
                    console.error('Failed to render photos window');
                    return;
                }

                // Find or create container
                let container = document.getElementById('photos-window');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'photos-window';
                    container.className =
                        'fixed inset-0 flex items-center justify-center hidden modal relative';
                    container.style.zIndex = '1000';
                    document.body.appendChild(container);
                }

                // Inject frame
                const wrapper = document.createElement('div');
                // Match the standard window wrapper used elsewhere (rounded corners, shadow, bg + sizing)
                wrapper.className =
                    'bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl autopointer flex flex-col w-[min(90vw,1100px)] h-[min(85vh,780px)]';
                wrapper.appendChild(frame);
                container.appendChild(wrapper);

                elements.container = container;
            }
        } else {
            elements.container = existing;
        }

        cacheElements();
        if (!elements.gallery) {
            return;
        }
        wireSidebar();
        wireSegments();
        wireSearch();
        wireGallery();
        wireDetail();
        globalWindow.appI18n?.applyTranslations?.(elements.container ?? undefined);
        void fetchPhotos();
    }

    function cacheElements(): void {
        if (!elements.container) {
            return;
        }
        elements.sidebar = elements.container.querySelector('#photos-sidebar') ?? null;
        elements.gallery = elements.container.querySelector('#photos-gallery') ?? null;
        elements.loading = elements.container.querySelector('#photos-loading') ?? null;
        elements.error = elements.container.querySelector('#photos-error') ?? null;
        elements.errorRetry = elements.container.querySelector(
            '#photos-error-retry'
        ) as HTMLButtonElement | null;
        elements.empty = elements.container.querySelector('#photos-empty') ?? null;
        elements.placeholder = elements.container.querySelector('#image-placeholder') ?? null;
        elements.photoCount = elements.statusbar?.querySelector('.statusbar-left') ?? null;
        elements.refreshButton = elements.container.querySelector(
            '#photos-refresh'
        ) as HTMLButtonElement | null;
        elements.searchInput = elements.container.querySelector(
            '#photos-search'
        ) as HTMLInputElement | null;
        elements.searchClear = elements.container.querySelector(
            '#photos-search-clear'
        ) as HTMLButtonElement | null;
        elements.overlay = elements.container.querySelector('#photo-detail-overlay') ?? null;
        elements.detailTitle = elements.container.querySelector('#photo-detail-title') ?? null;
        elements.detailMeta = elements.container.querySelector('#photo-detail-meta') ?? null;
        elements.detailDimensions =
            elements.container.querySelector('#photo-detail-dimensions') ?? null;
        elements.detailCounter = elements.container.querySelector('#photo-detail-counter') ?? null;
        elements.detailOpen = elements.container.querySelector(
            '#photo-detail-open'
        ) as HTMLAnchorElement | null;
        elements.detailDownload = elements.container.querySelector(
            '#photo-detail-download'
        ) as HTMLAnchorElement | null;
        elements.detailFavorite = elements.container.querySelector(
            '#photo-detail-favorite'
        ) as HTMLButtonElement | null;
        elements.detailFavoriteLabel =
            elements.detailFavorite?.querySelector('span:last-child') ?? null;
        elements.detailFavoriteIcon =
            elements.detailFavorite?.querySelector('span[aria-hidden="true"]') ?? null;
        elements.detailClose = elements.container.querySelector(
            '#photo-detail-close'
        ) as HTMLButtonElement | null;
        elements.detailPrev = elements.container.querySelector(
            '#photo-detail-prev'
        ) as HTMLButtonElement | null;
        elements.detailNext = elements.container.querySelector(
            '#photo-detail-next'
        ) as HTMLButtonElement | null;
        elements.image = elements.container.querySelector(
            '#image-viewer'
        ) as HTMLImageElement | null;
        elements.imageInfo = elements.container.querySelector('#image-info') ?? null;
        elements.loader = elements.container.querySelector('#photo-detail-loader') ?? null;
        elements.countAll = elements.container.querySelector('#photos-count-all') ?? null;
        elements.countFavorites =
            elements.container.querySelector('#photos-count-favorites') ?? null;
        elements.countLandscape =
            elements.container.querySelector('#photos-count-landscape') ?? null;
        elements.countPortrait = elements.container.querySelector('#photos-count-portrait') ?? null;
        elements.countSquare = elements.container.querySelector('#photos-count-square') ?? null;

        const sidebarButtons =
            elements.sidebar?.querySelectorAll<HTMLButtonElement>('button[data-photos-filter]') ??
            [];
        elements.sidebarButtons = Array.from(sidebarButtons);
        const segmentButtons = elements.container.querySelectorAll<HTMLButtonElement>(
            'button[data-photos-segment]'
        );
        elements.segmentButtons = Array.from(segmentButtons);
    }

    function wireSidebar(): void {
        elements.sidebarButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-photos-filter') as SidebarFilter | null;
                if (!filter || state.activeFilter === filter) {
                    return;
                }
                state.activeFilter = filter;
                syncSidebarSelection();
                applyFilters();
            });
        });
        syncSidebarSelection();
        elements.refreshButton?.addEventListener('click', () => {
            void fetchPhotos({ refresh: true });
        });
    }

    function wireSegments(): void {
        elements.segmentButtons.forEach(button => {
            button.addEventListener('click', () => {
                const segment = button.getAttribute('data-photos-segment') as SegmentView | null;
                if (!segment || state.activeSegment === segment) {
                    return;
                }
                state.activeSegment = segment;
                syncSegmentSelection();
                renderGallery();
            });
        });
        syncSegmentSelection();
    }

    function wireSearch(): void {
        elements.searchInput?.addEventListener('input', event => {
            const target = event.currentTarget as HTMLInputElement;
            state.searchTerm = target.value;
            toggleSearchClear();
            applyFilters();
        });
        elements.searchClear?.addEventListener('click', () => {
            if (!elements.searchInput) {
                return;
            }
            elements.searchInput.value = '';
            state.searchTerm = '';
            toggleSearchClear();
            applyFilters();
        });
        toggleSearchClear();
    }

    function wireGallery(): void {
        elements.gallery?.addEventListener('click', event => {
            const target = event.target as HTMLElement | null;
            if (!target) {
                return;
            }
            const card = target.closest<HTMLElement>('[data-photo-index]');
            if (!card) {
                return;
            }
            const rawIndex = card.getAttribute('data-photo-index');
            const index = rawIndex ? Number(rawIndex) : NaN;
            if (Number.isNaN(index) || index < 0) {
                return;
            }
            openDetail(index);
        });
    }

    function wireDetail(): void {
        elements.detailClose?.addEventListener('click', closeDetail);
        elements.overlay?.addEventListener('click', event => {
            if (event.target === elements.overlay) {
                closeDetail();
            }
        });
        elements.detailPrev?.addEventListener('click', () => moveSelection(-1));
        elements.detailNext?.addEventListener('click', () => moveSelection(1));
        elements.detailFavorite?.addEventListener('click', toggleFavorite);
        document.addEventListener('keydown', handleKeyNavigation);
        elements.errorRetry?.addEventListener('click', () => {
            void fetchPhotos({ refresh: true });
        });
        if (elements.image) {
            elements.image.addEventListener('load', handleImageLoaded);
            elements.image.addEventListener('error', handleImageError);
        }
    }

    function handleImageLoaded(): void {
        setDetailLoading(false);
        if (!elements.image) {
            return;
        }
        if (state.pendingImageId) {
            const width = elements.image.naturalWidth;
            const height = elements.image.naturalHeight;
            const orientation =
                width === height ? 'square' : width > height ? 'landscape' : 'portrait';
            if (state.externalPhoto && state.externalPhoto.id === state.pendingImageId) {
                state.externalPhoto.width = width;
                state.externalPhoto.height = height;
                state.externalPhoto.orientation = orientation;
            }
            if (state.overlayVisible) {
                const current = getCurrentDetailPhoto();
                if (current) {
                    updateDetailMetadata(current);
                }
            }
        }
        state.pendingImageId = null;
    }

    function handleImageError(): void {
        setDetailLoading(false);
        if (elements.detailMeta) {
            elements.detailMeta.textContent = t(
                'photos.errors.detailImage',
                'The photo could not be loaded.'
            );
        }
    }

    async function fetchPhotos(options: { refresh?: boolean } = {}): Promise<void> {
        if (state.isLoading) {
            return;
        }
        setError(false);
        setLoading(true);
        try {
            const shouldRandomize = options.refresh || state.photos.length === 0;
            const page = shouldRandomize ? getRandomPage() : state.currentPage;
            const limit = 60;
            const response = await fetch(
                `https://picsum.photos/v2/list?page=${page}&limit=${limit}`
            );
            if (!response.ok) {
                throw new Error('Picsum request failed');
            }
            const data = (await response.json()) as PicsumApiPhoto[];
            const mapped = data.map(mapPhotoItem);
            state.photos = mapped;
            state.currentPage = page;
            state.favorites.clear();
            state.externalPhoto = null;
            state.orientationCounts = calculateOrientationCounts(mapped);
            applyFilters();
            updateSidebarCounts();
        } catch (error) {
            console.warn('Photos app: failed to load', error);
            setError(true);
        } finally {
            setLoading(false);
        }
    }

    function mapPhotoItem(item: PicsumApiPhoto, index: number): PhotoLibraryItem {
        const width = Number(item.width) || 0;
        const height = Number(item.height) || 0;
        const orientation: Orientation =
            width === height ? 'square' : width > height ? 'landscape' : 'portrait';
        const numericId = Number.parseInt(item.id, 10);
        const yearBase = Number.isFinite(numericId) ? numericId : index;
        const year = 2014 + ((yearBase % 10) + 1);
        const sanitizedAuthor =
            item.author && item.author.trim().length > 0
                ? item.author.trim()
                : t('photos.detail.unknownPhotographer', 'Unknown photographer');
        const id = String(item.id);
        return {
            id,
            author: sanitizedAuthor,
            width,
            height,
            orientation,
            year,
            url: item.url,
            downloadUrl: item.download_url,
            thumbUrl: `https://picsum.photos/id/${id}/600/400`,
            largeUrl: `https://picsum.photos/id/${id}/1600/1200`,
        };
    }

    function calculateOrientationCounts(photos: PhotoLibraryItem[]): Record<Orientation, number> {
        return photos.reduce(
            (acc, photo) => {
                acc[photo.orientation] += 1;
                return acc;
            },
            { landscape: 0, portrait: 0, square: 0 } as Record<Orientation, number>
        );
    }

    function applyFilters(): void {
        const search = state.searchTerm.trim().toLowerCase();
        const previousActiveId = state.overlayVisible ? state.activePhotoId : null;
        const filtered = state.photos.filter(photo => {
            if (state.activeFilter === 'favorites' && !state.favorites.has(photo.id)) {
                return false;
            }
            if (state.activeFilter === 'landscape' && photo.orientation !== 'landscape') {
                return false;
            }
            if (state.activeFilter === 'portrait' && photo.orientation !== 'portrait') {
                return false;
            }
            if (state.activeFilter === 'square' && photo.orientation !== 'square') {
                return false;
            }
            if (search && !photo.author.toLowerCase().includes(search)) {
                return false;
            }
            return true;
        });
        state.filteredPhotos = filtered;
        state.filteredIndexMap = new Map(filtered.map((photo, index) => [photo.id, index]));
        renderGallery();
        updateEmptyState();
        updatePhotoCount();
        updateSidebarCounts();
        if (previousActiveId) {
            const newIndex = state.filteredIndexMap.get(previousActiveId);
            if (typeof newIndex === 'number') {
                state.selectedIndex = newIndex;
                updateNavigationButtons();
                updateCounter();
                setActiveCard(previousActiveId);
            } else if (!state.externalPhoto) {
                closeDetail();
            }
        }
    }

    function renderGallery(): void {
        if (!elements.gallery) {
            return;
        }
        elements.gallery.innerHTML = '';
        if (!state.filteredPhotos.length) {
            return;
        }
        const groups = buildGroups(state.filteredPhotos, state.activeSegment);
        groups.forEach(group => {
            const section = document.createElement('section');
            section.className = 'space-y-3';

            const heading = document.createElement('div');
            heading.className = 'flex items-baseline justify-between px-2';
            const title = document.createElement('h3');
            title.className =
                'text-base font-semibold text-gray-800 dark:text-gray-100 tracking-wide';
            title.textContent = group.title;
            const count = document.createElement('span');
            count.className = 'text-xs text-gray-500 dark:text-gray-400';
            const countKey =
                group.photos.length === 1
                    ? 'photos.labels.photoSingular'
                    : 'photos.labels.photoPlural';
            const countLabel = t(countKey, group.photos.length === 1 ? 'Photo' : 'Photos');
            count.textContent = `${group.photos.length} ${countLabel}`;
            heading.append(title, count);
            section.append(heading);

            const grid = document.createElement('div');
            grid.className =
                'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 auto-rows-[minmax(140px,_auto)]';

            group.photos.forEach(photo => {
                const index = state.filteredIndexMap.get(photo.id) ?? -1;
                const card = document.createElement('button');
                card.type = 'button';
                card.className =
                    'photos-card relative group overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-800 shadow-md hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';
                card.dataset.photoId = photo.id;
                card.dataset.photoIndex = String(index);
                if (state.favorites.has(photo.id)) {
                    card.dataset.favorite = 'true';
                }
                if (state.activePhotoId === photo.id && state.overlayVisible) {
                    card.dataset.selected = 'true';
                }

                const image = document.createElement('img');
                image.src = photo.thumbUrl;
                image.alt = t('photos.gallery.alt', 'Photo by {author}', { author: photo.author });
                image.loading = 'lazy';
                image.className =
                    'w-full h-full object-cover transition duration-300 group-hover:scale-105';

                const overlay = document.createElement('div');
                overlay.className =
                    'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-3 py-2 text-left';
                const author = document.createElement('p');
                author.className = 'text-white text-sm font-medium truncate';
                author.textContent = photo.author;
                const meta = document.createElement('p');
                meta.className = 'text-white/80 text-[11px] uppercase tracking-[0.3em]';
                meta.textContent = `${photo.year} ΓÇó ${formatOrientation(photo.orientation)}`;
                overlay.append(author, meta);

                card.append(image, overlay);
                grid.append(card);
            });

            section.append(grid);
            elements.gallery?.append(section);
        });
    }

    function buildGroups(photos: PhotoLibraryItem[], segment: SegmentView): PhotoGroup[] {
        if (segment === 'collections') {
            const orientations: Array<{ title: string; key: Orientation }> = [
                { title: t('photos.collections.landscape', 'Landscapes'), key: 'landscape' },
                { title: t('photos.collections.portrait', 'Portraits'), key: 'portrait' },
                { title: t('photos.collections.square', 'Squares'), key: 'square' },
            ];
            return orientations
                .map(item => ({
                    title: item.title,
                    photos: photos.filter(photo => photo.orientation === item.key),
                }))
                .filter(group => group.photos.length > 0);
        }
        if (segment === 'years') {
            const byYear = new Map<number, PhotoLibraryItem[]>();
            photos.forEach(photo => {
                const collection = byYear.get(photo.year) ?? [];
                collection.push(photo);
                byYear.set(photo.year, collection);
            });
            return Array.from(byYear.entries())
                .sort((a, b) => b[0] - a[0])
                .map(([year, group]) => ({ title: String(year), photos: group }));
        }
        // moments -> group by author
        const byAuthor = new Map<string, PhotoLibraryItem[]>();
        photos.forEach(photo => {
            const key = photo.author;
            const collection = byAuthor.get(key) ?? [];
            collection.push(photo);
            byAuthor.set(key, collection);
        });
        return Array.from(byAuthor.entries())
            .sort((a, b) => {
                const latestA = Math.max(...a[1].map(item => item.year));
                const latestB = Math.max(...b[1].map(item => item.year));
                return latestB - latestA;
            })
            .map(([author, group]) => ({ title: author, photos: group }));
    }

    function formatOrientation(orientation: Orientation | undefined): string {
        if (orientation === 'portrait') {
            return t('photos.orientations.portrait', 'Portrait');
        }
        if (orientation === 'square') {
            return t('photos.orientations.square', 'Square');
        }
        return t('photos.orientations.landscape', 'Landscape');
    }

    function setActiveCard(photoId: string): void {
        if (!elements.gallery) {
            return;
        }
        const current = elements.gallery.querySelector<HTMLElement>(
            '.photos-card[data-selected="true"]'
        );
        if (current) {
            current.removeAttribute('data-selected');
        }
        const next = elements.gallery.querySelector<HTMLElement>(
            `.photos-card[data-photo-id="${photoId}"]`
        );
        if (next) {
            next.dataset.selected = 'true';
        }
    }

    function clearActiveCard(): void {
        if (!elements.gallery) {
            return;
        }
        const current = elements.gallery.querySelector<HTMLElement>(
            '.photos-card[data-selected="true"]'
        );
        current?.removeAttribute('data-selected');
    }

    function updateEmptyState(): void {
        const shouldShow = state.filteredPhotos.length === 0;
        elements.empty?.classList.toggle('hidden', !shouldShow);
    }

    function updatePhotoCount(): void {
        const total = state.filteredPhotos.length;
        const labelKey = total === 1 ? 'photos.labels.photoSingular' : 'photos.labels.photoPlural';
        const label = t(labelKey, total === 1 ? 'Photo' : 'Photos');
        const segmentKey =
            state.activeSegment === 'collections'
                ? 'photos.segments.collections'
                : state.activeSegment === 'years'
                  ? 'photos.segments.years'
                  : 'photos.segments.moments';
        const segmentFallback =
            state.activeSegment === 'collections'
                ? 'Collections'
                : state.activeSegment === 'years'
                  ? 'Years'
                  : 'Moments';
        const segmentLabel = t(segmentKey, segmentFallback);
        const statusText = t('photos.status.count', `${total} ${label} ΓÇó ${segmentLabel}`, {
            count: total,
            label,
            segment: segmentLabel,
        });

        // Update statusbar if available
        if (elements.statusbar && globalWindow.WindowChrome) {
            globalWindow.WindowChrome.updateStatusBar(elements.statusbar, 'left', statusText);
        }

        // Fallback for old photo-count element
        if (elements.photoCount) {
            elements.photoCount.textContent = statusText;
        }
    }

    function updateSidebarCounts(): void {
        if (elements.countAll) {
            elements.countAll.textContent = String(state.photos.length);
        }
        if (elements.countFavorites) {
            elements.countFavorites.textContent = String(state.favorites.size);
        }
        if (elements.countLandscape) {
            elements.countLandscape.textContent = String(state.orientationCounts.landscape);
        }
        if (elements.countPortrait) {
            elements.countPortrait.textContent = String(state.orientationCounts.portrait);
        }
        if (elements.countSquare) {
            elements.countSquare.textContent = String(state.orientationCounts.square);
        }
    }

    function syncSidebarSelection(): void {
        elements.sidebarButtons.forEach(button => {
            const filter = button.getAttribute('data-photos-filter') as SidebarFilter | null;
            button.dataset.active = filter === state.activeFilter ? 'true' : 'false';
        });
    }

    function syncSegmentSelection(): void {
        elements.segmentButtons.forEach(button => {
            const segment = button.getAttribute('data-photos-segment') as SegmentView | null;
            button.dataset.active = segment === state.activeSegment ? 'true' : 'false';
        });
    }

    function toggleSearchClear(): void {
        if (!elements.searchClear) {
            return;
        }
        const hasValue = Boolean(state.searchTerm.trim());
        elements.searchClear.classList.toggle('invisible', !hasValue);
        elements.searchClear.classList.toggle('pointer-events-none', !hasValue);
    }

    function setLoading(isLoading: boolean): void {
        state.isLoading = isLoading;
        elements.loading?.classList.toggle('hidden', !isLoading);
    }

    function setError(hasError: boolean): void {
        elements.error?.classList.toggle('hidden', !hasError);
    }

    function openDetail(
        index: number,
        options: { external?: boolean; photo?: ExternalPhotoItem } = {}
    ): void {
        const overlay = elements.overlay;
        if (!overlay || !elements.image) {
            return;
        }
        let photo: AnyPhotoItem | null = null;
        if (options.external && options.photo) {
            photo = options.photo;
            state.externalPhoto = options.photo;
            state.selectedIndex = -1;
            state.activePhotoId = options.photo.id;
        } else {
            const selected = state.filteredPhotos[index];
            if (!selected) {
                return;
            }
            photo = selected;
            state.selectedIndex = index;
            state.activePhotoId = selected.id;
            state.externalPhoto = null;
        }
        state.overlayVisible = true;
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        if (!photo) {
            return;
        }
        setDetailLoading(true);
        state.pendingImageId = photo.id;
        if ('largeUrl' in photo && photo.largeUrl) {
            elements.image.src = photo.largeUrl;
        } else {
            elements.image.src = photo.downloadUrl;
        }
        updateDetailMetadata(photo);
        updateNavigationButtons();
        updateCounter();
        if (!options.external) {
            setActiveCard(photo.id);
        } else {
            clearActiveCard();
        }
    }

    function getCurrentDetailPhoto(): AnyPhotoItem | null {
        if (state.externalPhoto) {
            return state.externalPhoto;
        }
        if (state.selectedIndex >= 0) {
            return state.filteredPhotos[state.selectedIndex] ?? null;
        }
        return null;
    }

    function updateDetailMetadata(photo: AnyPhotoItem): void {
        if (elements.detailTitle) {
            const fallbackTitle = t('photos.detail.unknownPhoto', 'Unknown photo');
            elements.detailTitle.textContent = photo.author || fallbackTitle;
        }
        if (elements.imageInfo) {
            const label =
                isExternalPhoto(photo) && photo.sourceName ? photo.sourceName : photo.author;
            elements.imageInfo.textContent = label;
        }
        const orientationLabel = formatOrientation(photo.orientation);
        const metaParts: string[] = [];
        if (isExternalPhoto(photo)) {
            metaParts.push(t('photos.detail.externalLabel', 'External photo'));
            if (photo.sourceName) {
                metaParts.push(photo.sourceName);
            }
        } else {
            metaParts.push(String(photo.year));
            metaParts.push(orientationLabel);
        }
        if (elements.detailMeta) {
            elements.detailMeta.textContent = metaParts.join(' ΓÇó ');
        }
        if (elements.detailDimensions) {
            if (photo.width && photo.height) {
                elements.detailDimensions.textContent = t(
                    'photos.detail.dimensions',
                    `Resolution: ${photo.width} ├ù ${photo.height}px`,
                    { width: photo.width, height: photo.height }
                );
            } else {
                elements.detailDimensions.textContent = '';
            }
        }
        if (elements.detailOpen) {
            elements.detailOpen.href = photo.url ?? photo.downloadUrl;
        }
        if (elements.detailDownload) {
            elements.detailDownload.href = photo.downloadUrl;
            elements.detailDownload.download = t(
                'photos.detail.downloadFilename',
                `photo-${photo.id}.jpg`,
                { id: photo.id }
            );
        }
        updateFavoriteButton(photo);
    }

    function updateFavoriteButton(photo: AnyPhotoItem): void {
        if (
            !elements.detailFavorite ||
            !elements.detailFavoriteLabel ||
            !elements.detailFavoriteIcon
        ) {
            return;
        }
        if (isExternalPhoto(photo)) {
            elements.detailFavorite.setAttribute('disabled', 'true');
            elements.detailFavorite.classList.add('opacity-40', 'pointer-events-none');
            elements.detailFavoriteLabel.textContent = t(
                'photos.detail.favoriteUnavailable',
                'Unavailable'
            );
            elements.detailFavoriteIcon.textContent = 'ΓÇô';
            return;
        }
        const isFavorite = state.favorites.has(photo.id);
        elements.detailFavorite.removeAttribute('disabled');
        elements.detailFavorite.classList.remove('opacity-40', 'pointer-events-none');
        const removeLabel = t('photos.detail.favoriteRemove', 'Remove favorite');
        const addLabel = t('photos.detail.favoriteAdd', 'Add to favorites');
        elements.detailFavoriteLabel.textContent = isFavorite ? removeLabel : addLabel;
        elements.detailFavoriteIcon.textContent = isFavorite ? 'ΓÖÑ' : 'ΓÖí';
    }

    function closeDetail(): void {
        if (!elements.overlay) {
            return;
        }
        elements.overlay.classList.add('hidden');
        elements.overlay.classList.remove('flex');
        state.overlayVisible = false;
        state.selectedIndex = -1;
        state.activePhotoId = null;
        state.externalPhoto = null;
        state.pendingImageId = null;
        clearActiveCard();
        setDetailLoading(false);
    }

    function moveSelection(delta: number): void {
        if (state.externalPhoto) {
            return;
        }
        const nextIndex = state.selectedIndex + delta;
        if (nextIndex < 0 || nextIndex >= state.filteredPhotos.length) {
            return;
        }
        openDetail(nextIndex);
    }

    function toggleFavorite(): void {
        if (state.externalPhoto) {
            return;
        }
        const photo = state.filteredPhotos[state.selectedIndex];
        if (!photo) {
            return;
        }
        if (state.favorites.has(photo.id)) {
            state.favorites.delete(photo.id);
        } else {
            state.favorites.add(photo.id);
        }
        updateFavoriteButton(photo);
        updateSidebarCounts();
        updateCardFavoriteState(photo.id);
    }

    function updateCardFavoriteState(photoId: string): void {
        if (!elements.gallery) {
            return;
        }
        const card = elements.gallery.querySelector<HTMLElement>(
            `.photos-card[data-photo-id="${photoId}"]`
        );
        if (!card) {
            return;
        }
        if (state.favorites.has(photoId)) {
            card.dataset.favorite = 'true';
        } else {
            card.removeAttribute('data-favorite');
        }
    }

    function updateNavigationButtons(): void {
        const hasPrev = state.selectedIndex > 0 && !state.externalPhoto;
        const hasNext =
            state.selectedIndex >= 0 &&
            state.selectedIndex < state.filteredPhotos.length - 1 &&
            !state.externalPhoto;
        if (elements.detailPrev) {
            elements.detailPrev.classList.toggle('opacity-30', !hasPrev);
            elements.detailPrev.classList.toggle('pointer-events-none', !hasPrev);
        }
        if (elements.detailNext) {
            elements.detailNext.classList.toggle('opacity-30', !hasNext);
            elements.detailNext.classList.toggle('pointer-events-none', !hasNext);
        }
    }

    function updateCounter(): void {
        if (!elements.detailCounter) {
            return;
        }
        if (state.externalPhoto) {
            elements.detailCounter.textContent = t(
                'photos.detail.externalCounter',
                'External image'
            );
            return;
        }
        if (state.selectedIndex >= 0) {
            elements.detailCounter.textContent = t(
                'photos.detail.counter',
                `${state.selectedIndex + 1} of ${state.filteredPhotos.length}`,
                { index: state.selectedIndex + 1, total: state.filteredPhotos.length }
            );
        } else {
            elements.detailCounter.textContent = '';
        }
    }

    function setDetailLoading(isLoading: boolean): void {
        elements.loader?.classList.toggle('hidden', !isLoading);
    }

    function handleKeyNavigation(event: KeyboardEvent): void {
        if (!state.overlayVisible) {
            return;
        }
        if (event.key === 'Escape') {
            closeDetail();
        } else if (event.key === 'ArrowLeft') {
            moveSelection(-1);
        } else if (event.key === 'ArrowRight') {
            moveSelection(1);
        }
    }

    function getRandomPage(): number {
        return Math.floor(Math.random() * 10) + 1;
    }

    function showExternalImage(payload: { src: string; name?: string }): void {
        if (!payload || !payload.src) {
            return;
        }
        if (!state.initialized) {
            init();
        }
        const name =
            payload.name && payload.name.trim().length > 0
                ? payload.name.trim()
                : t('photos.detail.externalFile', 'External file');
        const externalPhoto: ExternalPhotoItem = {
            id: `external-${Date.now()}`,
            author: name,
            downloadUrl: payload.src,
            largeUrl: payload.src,
            url: payload.src,
            sourceName: name,
            isExternal: true,
        };
        openDetail(-1, { external: true, photo: externalPhoto });
    }

    function handleLanguageChange(): void {
        if (!state.initialized) {
            return;
        }
        renderGallery();
        updateEmptyState();
        updatePhotoCount();
        if (state.overlayVisible) {
            const current = getCurrentDetailPhoto();
            if (current) {
                updateDetailMetadata(current);
            }
            updateNavigationButtons();
            updateCounter();
        } else {
            updateCounter();
        }
        globalWindow.appI18n?.applyTranslations?.(elements.container ?? undefined);
    }

    const api: PhotosAppApi = {
        init,
        showExternalImage,
    };

    globalWindow.PhotosApp = api;

    window.addEventListener('languagePreferenceChange', handleLanguageChange);

    // Don't auto-init - let WindowManager handle it
    // if (document.readyState === 'loading') {
    //     document.addEventListener('DOMContentLoaded', init, { once: true });
    // } else {
    //     init();
    // }
})();
