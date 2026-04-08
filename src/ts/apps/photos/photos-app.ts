import logger from '../../core/logger.js';
import { WINDOW_ICONS } from '../../windows/window-icons.js';

/*
 * Fotos-App v2 – iOS-inspiriertes Design mit Bottom-Navigation (Mobile) / Top-Tab-Bar (Desktop).
 * Lädt Bilder aus der Picsum API, gruppiert nach Jahr, mit Detail-Viewer und Favoritenverwaltung.
 */

type Orientation = 'landscape' | 'portrait' | 'square';
type SidebarFilter = 'all' | 'favorites' | Orientation;
type SegmentView = 'years' | 'albums' | 'favorites' | 'moments';
type PhotoTab = 'photos' | 'albums' | 'for-you' | 'shared';
type GroupByOption = 'year' | 'month';

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
    gallery: HTMLElement | null;
    loading: HTMLElement | null;
    error: HTMLElement | null;
    errorRetry: HTMLButtonElement | null;
    empty: HTMLElement | null;
    placeholder: HTMLElement | null;
    photoCount: HTMLElement | null;
    searchInput: HTMLInputElement | null;
    searchClear: HTMLButtonElement | null;
    tabButtons: Record<PhotoTab, HTMLButtonElement | null>;
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
    titlebar: HTMLElement | null;
    statusbar: HTMLElement | null;
    tabContent: HTMLElement | null;
    galleryWrapper: HTMLElement | null;
    segmentSwitcher: HTMLElement | null;
    scrollYearMarkers: HTMLElement | null;
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
    activeTab: PhotoTab;
    groupBy: GroupByOption;
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
    PhotosWindow?: {
        create: () => { element?: HTMLElement | null } | null;
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
        activeSegment: 'years',
        searchTerm: '',
        isLoading: false,
        currentPage: 1,
        overlayVisible: false,
        selectedIndex: -1,
        activePhotoId: null,
        externalPhoto: null,
        pendingImageId: null,
        orientationCounts: { landscape: 0, portrait: 0, square: 0 },
        activeTab: 'photos',
        groupBy: 'year',
    };

    const elements: PhotosElements = {
        container: null,
        gallery: null,
        loading: null,
        error: null,
        errorRetry: null,
        empty: null,
        placeholder: null,
        photoCount: null,
        searchInput: null,
        searchClear: null,
        tabButtons: {
            photos: null,
            albums: null,
            'for-you': null,
            shared: null,
        },
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
        titlebar: null,
        statusbar: null,
        tabContent: null,
        galleryWrapper: null,
        segmentSwitcher: null,
        scrollYearMarkers: null,
    };

    let scrollDateFramePending = false;

    function isExternalPhoto(photo: AnyPhotoItem): photo is ExternalPhotoItem {
        return (photo as ExternalPhotoItem).isExternal === true;
    }

    function renderWindow(): HTMLElement | null {
        const WindowChrome = globalWindow.WindowChrome;
        if (!WindowChrome) {
            logger.error('UI', 'WindowChrome not available');
            return null;
        }

        const { frame, titlebar, content, statusbar } = WindowChrome.createWindowFrame({
            title: t('photos.title', 'Fotos'),
            icon: WINDOW_ICONS.photos,
            showClose: true,
            showMinimize: false,
            showMaximize: false,
            onClose: () => {
                globalWindow.API?.window?.close?.('photos-window');
            },
            toolbar: [
                {
                    label: '',
                    icon: `<div id="photos-toolbar-search" class="relative flex items-center gap-1 min-w-0">
                        <button id="photos-search-toggle" type="button"
                            class="shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            aria-label="${t('photos.search.placeholder', 'Nach Autor suchen')}"
                            title="${t('photos.search.placeholder', 'Nach Autor suchen')}"
                            aria-expanded="true">
                            <svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="9" r="6.5"/><line x1="14" y1="14" x2="18.5" y2="18.5"/></svg>
                        </button>
                        <div id="photos-search-input-wrap" class="relative flex items-center">
                            <input id="photos-search" type="search" placeholder="${t('photos.search.placeholder', 'Nach Autor suchen')}"
                                class="w-36 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 px-4 py-1.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                            <button id="photos-search-clear" type="button" class="absolute inset-y-0 right-2 flex items-center text-xl text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 invisible pointer-events-none"
                                title="${t('photos.search.clear', 'Suche löschen')}">×</button>
                        </div>
                    </div>`,
                },
            ],
            showStatusBar: true,
            statusBarLeft: t('photos.status.countPlaceholder', '– Fotos'),
            statusBarRight: '',
        });

        elements.titlebar = titlebar;
        elements.statusbar = statusbar;

        const { container: contentContainer } = createPhotosContent();
        content.appendChild(contentContainer);

        return frame;
    }

    /**
     * iOS-inspired layout:
     * - Desktop (≥768px): Floating bottom tab panel above gallery
     * - Mobile (<768px): Bottom tab bar
     * - Responsive gallery grid with year grouping
     * - Inverse feed: newest photos at bottom on init, scroll up to see older
     */
    function createPhotosContent(): { container: HTMLElement; detailOverlay: HTMLElement } {
        const container = document.createElement('div');
        container.className = 'flex flex-col h-full w-full overflow-hidden relative';

        // ── Top Bar (desktop only): search and secondary controls ─────────────────
        const topTabBar = document.createElement('div');
        topTabBar.id = 'photos-top-tabs';
        topTabBar.className =
            'hidden md:flex absolute top-3 right-4 z-20 items-center justify-end pointer-events-none';
        topTabBar.innerHTML = `
            <div class="finder-no-drag pointer-events-auto relative flex items-center gap-1 rounded-full border border-gray-200/80 dark:border-gray-700/80 bg-white/90 dark:bg-gray-900/90 p-1.5 shadow-lg backdrop-blur-md">
                <button data-photos-top-search-toggle type="button"
                    class="shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    aria-label="${t('photos.search.placeholder', 'Nach Autor suchen')}"
                    title="${t('photos.search.placeholder', 'Nach Autor suchen')}">
                    <svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="9" r="6.5"/><line x1="14" y1="14" x2="18.5" y2="18.5"/></svg>
                </button>
                <div data-photos-top-search-input class="relative min-w-0">
                    <input id="photos-search" type="text"
                        placeholder="${t('photos.search.placeholder', 'Nach Autor suchen')}"
                        class="h-8 w-36 lg:w-44 min-w-0 rounded-full border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-900/70 pl-3 pr-3 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
            </div>
        `;

        // ── Main content area (tab content + gallery) - takes up remaining space ────
        const mainContent = document.createElement('div');
        mainContent.className = 'flex-1 flex flex-col min-h-0 overflow-hidden';

        // Photos Tab specific: segment switcher (Years/Albums/Favorites) + gallery
        const photosTabContent = document.createElement('div');
        photosTabContent.id = 'photos-tab-content';
        photosTabContent.className = 'relative flex flex-col h-full min-h-0 overflow-hidden';
        photosTabContent.innerHTML = `
            <!-- Segment Switcher (Inside Photos Tab) -->
            <div class="hidden md:flex absolute top-3 left-1/2 -translate-x-1/2 z-20 items-center justify-center finder-no-drag pointer-events-none">
                <div class="pointer-events-auto flex rounded-full border border-gray-200/80 dark:border-gray-700/80 bg-white/90 dark:bg-gray-900/90 p-1 text-sm font-medium text-gray-600 dark:text-gray-300 shadow-lg backdrop-blur-md" role="group">
                    <button type="button" data-photos-segment="years" class="photos-segment-button px-4 py-1.5 rounded-full transition">${t('photos.segments.years', 'Jahre')}</button>
                    <button type="button" data-photos-segment="albums" class="photos-segment-button px-4 py-1.5 rounded-full transition">${t('photos.segments.albums', 'Alben')}</button>
                    <button type="button" data-photos-segment="favorites" class="photos-segment-button px-4 py-1.5 rounded-full transition">${t('photos.segments.favorites', 'Favoriten')}</button>
                </div>
            </div>

            <!-- Gallery Wrapper with Inverse Scroll -->
            <div id="photos-gallery-wrapper" class="flex-1 relative min-h-0 overflow-hidden rounded-t-3xl">
                <div id="photos-loading" class="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-20 opacity-0 pointer-events-none">
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
                <!-- Main gallery with inverse scroll (transform: scaleY(-1) or JS scroll) -->
                <div id="photos-gallery" class="absolute inset-0 overflow-y-auto rounded-t-3xl px-3 sm:px-6 pt-6 md:pt-24 pb-20 md:pb-24 space-y-8"></div>
                <div id="photos-scroll-year-markers" aria-hidden="true" class="absolute right-1 top-6 bottom-20 w-12 pointer-events-none"></div>
                <div id="photos-empty" class="absolute inset-0 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 opacity-0 pointer-events-none px-6">
                    <div>
                        <p class="text-lg font-semibold">${t('photos.empty.title', 'Keine Fotos gefunden')}</p>
                        <p class="text-sm mt-1">${t('photos.empty.description', 'Passe Suche oder Filter an.')}</p>
                    </div>
                </div>
                <div id="image-placeholder" class="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400 text-center px-6 opacity-0 pointer-events-none">${t('photos.placeholder', 'Wähle ein Foto aus.')}</div>
            </div>
        `;

        // Placeholder Tab Contents (Albums, For You, Shared)
        const albumsTabContent = document.createElement('div');
        albumsTabContent.id = 'albums-tab-content';
        albumsTabContent.className = 'hidden flex-1 flex items-center justify-center';
        albumsTabContent.innerHTML = `<p class="text-gray-500 dark:text-gray-400">${t('photos.placeholder.comingSoon', 'Alben folgen in Kürze')}</p>`;

        const forYouTabContent = document.createElement('div');
        forYouTabContent.id = 'for-you-tab-content';
        forYouTabContent.className = 'hidden flex-1 flex items-center justify-center';
        forYouTabContent.innerHTML = `<p class="text-gray-500 dark:text-gray-400">${t('photos.placeholder.comingSoon', 'Kommt bald')}</p>`;

        const sharedTabContent = document.createElement('div');
        sharedTabContent.id = 'shared-tab-content';
        sharedTabContent.className = 'hidden flex-1 flex items-center justify-center';
        sharedTabContent.innerHTML = `<p class="text-gray-500 dark:text-gray-400">${t('photos.placeholder.comingSoon', 'Kommt bald')}</p>`;

        mainContent.append(photosTabContent, albumsTabContent, forYouTabContent, sharedTabContent);

        // ── Desktop Floating Tab Panel (pill, above gallery) ──────────────────────
        const desktopFloatingTabs = document.createElement('div');
        desktopFloatingTabs.id = 'photos-desktop-tabs';
        desktopFloatingTabs.className =
            'hidden md:flex absolute bottom-4 left-1/2 -translate-x-1/2 z-20 items-center gap-1 rounded-full border border-gray-200/80 dark:border-gray-700/80 bg-white/90 dark:bg-gray-900/90 p-1 shadow-lg backdrop-blur-md finder-no-drag';
        desktopFloatingTabs.innerHTML = `
            <button data-photo-tab="photos" class="photos-tab-button active inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 transition" aria-label="Photos">
                <span aria-hidden="true">📷</span>
                <span>${t('photos.tabs.photos', 'Fotos')}</span>
            </button>
            <button data-photo-tab="albums" class="photos-tab-button inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 transition" aria-label="Albums">
                <span aria-hidden="true">🗂️</span>
                <span>${t('photos.tabs.albums', 'Alben')}</span>
            </button>
            <button data-photo-tab="for-you" class="photos-tab-button inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 transition" aria-label="For You">
                <span aria-hidden="true">✨</span>
                <span class="whitespace-nowrap">${t('photos.tabs.for-you', 'Für dich')}</span>
            </button>
            <button data-photo-tab="shared" class="photos-tab-button inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 transition" aria-label="Shared">
                <span aria-hidden="true">👥</span>
                <span>${t('photos.tabs.shared', 'Geteilt')}</span>
            </button>
        `;

        // ── Bottom Tab Navigation (visible on mobile, hidden on desktop) ────────────
        const bottomTabBar = document.createElement('div');
        bottomTabBar.id = 'photos-bottom-tabs';
        bottomTabBar.className =
            'md:hidden absolute bottom-0 left-0 right-0 flex items-center justify-around px-2 py-2 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm';
        bottomTabBar.innerHTML = `
            <button data-photo-tab="photos" class="photos-tab-button active flex flex-col items-center gap-1 py-2 px-3 rounded-lg text-blue-600 dark:text-blue-400 transition" aria-label="Photos">
                <span class="text-xl">📷</span>
                <span class="text-xs font-medium">${t('photos.tabs.photos', 'Fotos')}</span>
            </button>
            <button data-photo-tab="albums" class="photos-tab-button flex flex-col items-center gap-1 py-2 px-3 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition" aria-label="Albums">
                <span class="text-xl">🗂️</span>
                <span class="text-xs font-medium">${t('photos.tabs.albums', 'Alben')}</span>
            </button>
            <button data-photo-tab="for-you" class="photos-tab-button flex flex-col items-center gap-1 py-2 px-3 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition" aria-label="For You">
                <span class="text-xl">✨</span>
                <span class="text-xs font-medium">${t('photos.tabs.for-you', 'Für dich')}</span>
            </button>
            <button data-photo-tab="shared" class="photos-tab-button flex flex-col items-center gap-1 py-2 px-3 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition" aria-label="Shared">
                <span class="text-xl">👥</span>
                <span class="text-xs font-medium">${t('photos.tabs.shared', 'Geteilt')}</span>
            </button>
        `;

        container.append(topTabBar, mainContent, desktopFloatingTabs, bottomTabBar);

        // ── Detail Overlay (absolute, z-30) ────────────────────────────────────────
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
                <div class="flex-1 overflow-hidden pointer-events-none">
                    <div class="relative h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center overflow-hidden pointer-events-none">
                        <button id="photo-detail-prev" type="button" class="hidden sm:inline-flex absolute left-6 top-1/2 z-20 h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-3xl text-gray-500 shadow-sm backdrop-blur-sm pointer-events-auto transition hover:bg-white hover:text-gray-700 dark:bg-gray-900/80 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-gray-100" title="${t('photos.detail.prev', 'Vorheriges Foto')}">‹</button>
                        <img id="image-viewer" class="max-w-full max-h-full object-contain" alt="${t('photos.detail.imageAlt', 'Ausgewähltes Foto')}" />
                        <div id="photo-detail-loader" class="absolute inset-0 flex items-center justify-center bg-gray-900/40 text-white text-sm font-medium opacity-0 pointer-events-none">${t('photos.detail.loader', 'Foto wird geladen…')}</div>
                        <button id="photo-detail-next" type="button" class="hidden sm:inline-flex absolute right-24 top-1/2 z-20 h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-3xl text-gray-500 shadow-sm backdrop-blur-sm pointer-events-auto transition hover:bg-white hover:text-gray-700 dark:bg-gray-900/80 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-gray-100" title="${t('photos.detail.next', 'Nächstes Foto')}">›</button>
                    </div>
                </div>
                <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div class="flex-1" style="min-width:200px;">
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
        container.appendChild(detailOverlay);

        return { container, detailOverlay };
    }

    globalWindow.PhotosAppBuildContent = createPhotosContent;

    function cacheElements(): void {
        if (!elements.container) return;

        elements.gallery = elements.container.querySelector('#photos-gallery') ?? null;
        elements.galleryWrapper =
            elements.container.querySelector('#photos-gallery-wrapper') ?? null;
        elements.scrollYearMarkers =
            elements.container.querySelector('#photos-scroll-year-markers') ?? null;
        elements.loading = elements.container.querySelector('#photos-loading') ?? null;
        elements.error = elements.container.querySelector('#photos-error') ?? null;
        elements.errorRetry = elements.container.querySelector(
            '#photos-error-retry'
        ) as HTMLButtonElement | null;
        elements.empty = elements.container.querySelector('#photos-empty') ?? null;
        elements.placeholder = elements.container.querySelector('#image-placeholder') ?? null;
        elements.photoCount = elements.statusbar?.querySelector('.statusbar-left') ?? null;
        elements.searchInput = elements.container.querySelector(
            '#photos-search'
        ) as HTMLInputElement | null;
        elements.searchClear = elements.container.querySelector(
            '#photos-search-clear'
        ) as HTMLButtonElement | null;

        // Cache tab buttons (both top and bottom)
        const tabButtonsTD = elements.container.querySelectorAll('[data-photo-tab]');
        tabButtonsTD.forEach(btn => {
            const tab = btn.getAttribute('data-photo-tab') as PhotoTab;
            elements.tabButtons[tab] = btn as HTMLButtonElement;
        });

        // Cache segment buttons
        elements.segmentButtons = Array.from(
            elements.container.querySelectorAll('[data-photos-segment]')
        );

        // Cache overlay and detail elements
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
    }

    function wireTabNavigation(): void {
        // Event delegation: catches both top and bottom tab buttons
        elements.container?.addEventListener('click', event => {
            const btn = (event.target as HTMLElement).closest('[data-photo-tab]');
            if (!btn) return;
            const tab = btn.getAttribute('data-photo-tab') as PhotoTab;
            if (tab) switchTab(tab);
        });
    }

    function switchTab(tab: PhotoTab): void {
        state.activeTab = tab;

        // Update ALL tab buttons in DOM (top + bottom bars via querySelectorAll)
        const isDesktop = window.matchMedia('(min-width: 768px)').matches;
        const allTabBtns = elements.container?.querySelectorAll('[data-photo-tab]') ?? [];
        allTabBtns.forEach(btn => {
            const t = btn.getAttribute('data-photo-tab');
            const isActive = t === tab;
            btn.classList.toggle('active', isActive);
            if (isDesktop) {
                btn.classList.toggle('bg-blue-100', isActive);
                btn.classList.toggle('dark:bg-blue-900/30', isActive);
                btn.classList.toggle('text-blue-600', isActive);
                btn.classList.toggle('dark:text-blue-400', isActive);
                btn.classList.toggle('text-gray-700', !isActive);
                btn.classList.toggle('dark:text-gray-300', !isActive);
            } else {
                btn.classList.toggle('text-blue-600', isActive);
                btn.classList.toggle('dark:text-blue-400', isActive);
                btn.classList.toggle('text-gray-600', !isActive);
                btn.classList.toggle('dark:text-gray-400', !isActive);
            }
        });

        // Show/hide tab contents
        const allContents = elements.container?.querySelectorAll('[id$="-tab-content"]') ?? [];
        allContents.forEach(content => {
            content.classList.add('hidden');
        });

        const tabContent = elements.container?.querySelector(`#${tab}-tab-content`);
        if (tabContent) {
            tabContent.classList.remove('hidden');
        }

        // If switching to photos tab, ensure gallery is rendered
        if (tab === 'photos' && elements.gallery) {
            renderGallery();
        } else {
            elements.scrollYearMarkers?.classList.add('opacity-0');
        }
    }

    function wireSegments(): void {
        elements.segmentButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const segment = btn.getAttribute('data-photos-segment') as SegmentView;
                state.activeSegment = segment;

                elements.segmentButtons.forEach(b => {
                    const isSegActive = b.getAttribute('data-photos-segment') === segment;
                    b.classList.toggle('bg-blue-600', isSegActive);
                    b.classList.toggle('text-white', isSegActive);
                    b.classList.toggle('bg-transparent', !isSegActive);
                    b.classList.toggle('text-gray-600', !isSegActive);
                    b.classList.toggle('dark:text-gray-300', !isSegActive);
                });

                renderGallery();
            });
        });

        // Initialize first segment button as active
        if (elements.segmentButtons.length > 0) {
            elements.segmentButtons[0]?.classList.add('bg-blue-600', 'text-white');
        }
    }

    /**
     * Fallback-Schwellen fuer kompakte Suche. Zusaetzlich wird echte Ueberlappung gemessen.
     * Damit kollabiert die Suche auch dann, wenn UI-Elemente sich optisch in die Quere kommen.
     */
    const SEARCH_COMPACT_THRESHOLD = 420;
    const SEARCH_TOPBAR_COMPACT_FALLBACK_THRESHOLD = 760;

    function shouldCompactToolbarSearch(): boolean {
        if (!elements.container) return false;
        if (elements.container.offsetWidth < SEARCH_COMPACT_THRESHOLD) return true;

        const toolbar = elements.container.querySelector<HTMLElement>('.window-toolbar');
        if (!toolbar) return false;

        // Wenn die Toolbar selbst schmal wird, bleibt nur das Icon robust nutzbar.
        return toolbar.clientWidth < 300;
    }

    function shouldCompactTopSearch(): boolean {
        if (!elements.container) return false;
        if (window.matchMedia('(max-width: 767px)').matches) return true;
        if (elements.container.offsetWidth < SEARCH_TOPBAR_COMPACT_FALLBACK_THRESHOLD) return true;

        const topTabBar = elements.container.querySelector<HTMLElement>('#photos-top-tabs');
        const searchPill = topTabBar?.firstElementChild as HTMLElement | null;
        const segmentGroup = elements.container.querySelector<HTMLElement>(
            '#photos-tab-content [role="group"]'
        );
        const contentArea = elements.container.querySelector<HTMLElement>('#photos-tab-content');

        if (!topTabBar || !searchPill || !segmentGroup || !contentArea) {
            return false;
        }

        if (searchPill.offsetParent === null || segmentGroup.offsetParent === null) {
            return false;
        }

        const searchRect = searchPill.getBoundingClientRect();
        const segmentRect = segmentGroup.getBoundingClientRect();
        const contentRect = contentArea.getBoundingClientRect();

        const collisionPadding = 12;
        const collidesWithSegments = segmentRect.right + collisionPadding >= searchRect.left;
        const overflowsContent = searchRect.right > contentRect.right - 8;

        return collidesWithSegments || overflowsContent;
    }

    function applySearchCompactState(isToolbarCompact: boolean, isTopSearchCompact: boolean): void {
        // Toolbar-Suche (im Titelbereich)
        const toolbarInputWrap = elements.container?.querySelector<HTMLElement>(
            '#photos-search-input-wrap'
        );
        const toolbarToggle =
            elements.container?.querySelector<HTMLButtonElement>('#photos-search-toggle');
        if (toolbarInputWrap) {
            toolbarInputWrap.classList.toggle('hidden', isToolbarCompact);
        }
        if (toolbarToggle) {
            toolbarToggle.setAttribute('aria-expanded', isToolbarCompact ? 'false' : 'true');
        }

        // Floating Top-Tab-Bar-Suche (Desktop-Inhaltbereich)
        const topTabBar = elements.container?.querySelector<HTMLElement>('#photos-top-tabs');
        if (topTabBar) {
            const topInputWrap = topTabBar.querySelector<HTMLElement>(
                '[data-photos-top-search-input]'
            );
            if (topInputWrap) {
                topInputWrap.classList.toggle('hidden', isTopSearchCompact);
            }
        }
    }

    /** Beobachtet die Container-Breite und kollabiert die Suche bei schmalen Fenstern. */
    function wireSearchResize(): void {
        if (!elements.container || typeof ResizeObserver === 'undefined') return;

        // Initialen Zustand synchron setzen
        applySearchCompactState(shouldCompactToolbarSearch(), shouldCompactTopSearch());

        const observer = new ResizeObserver(([entry]) => {
            // Neben der Breite auch tatsaechliche Ueberlappungen neu auswerten.
            if (!entry) return;
            applySearchCompactState(shouldCompactToolbarSearch(), shouldCompactTopSearch());
        });
        observer.observe(elements.container);
    }

    /**
     * Verdrahtet den Such-Toggle-Button (Icon-only-Modus):
     * Klick auf das Icon öffnet das Eingabefeld; Escape schließt es wieder.
     */
    function wireSearchToggle(): void {
        elements.container?.addEventListener('click', e => {
            const toggleBtn = (e.target as HTMLElement).closest<HTMLButtonElement>(
                '#photos-search-toggle'
            );
            if (!toggleBtn) return;

            const inputWrap = elements.container?.querySelector<HTMLElement>(
                '#photos-search-input-wrap'
            );
            if (!inputWrap) return;

            // Im kompakten Modus: Eingabefeld ein-/ausblenden
            const isNowHidden = inputWrap.classList.contains('hidden');
            inputWrap.classList.toggle('hidden', !isNowHidden);
            toggleBtn.setAttribute('aria-expanded', String(isNowHidden));
            if (isNowHidden) {
                elements.searchInput?.focus();
            }
        });

        elements.container?.addEventListener('focusout', e => {
            const inputWrap = elements.container?.querySelector<HTMLElement>(
                '#photos-search-input-wrap'
            );
            if (!inputWrap || inputWrap.classList.contains('hidden')) return;

            const target = e.target as Node | null;
            const related = (e as FocusEvent).relatedTarget as Node | null;
            if (!target || !inputWrap.contains(target)) return;
            if (related && inputWrap.contains(related)) return;
            if (!shouldCompactToolbarSearch()) return;

            inputWrap.classList.add('hidden');
            const toggleBtn =
                elements.container?.querySelector<HTMLButtonElement>('#photos-search-toggle');
            toggleBtn?.setAttribute('aria-expanded', 'false');
        });

        // Floating Top-Tab-Bar toggle (Desktop)
        elements.container?.addEventListener('click', e => {
            if (!(e.target as HTMLElement).closest('[data-photos-top-search-toggle]')) return;
            const topTabBar = elements.container?.querySelector<HTMLElement>('#photos-top-tabs');
            const topInputWrap = topTabBar?.querySelector<HTMLElement>(
                '[data-photos-top-search-input]'
            );
            if (!topInputWrap) return;

            const isNowHidden = topInputWrap.classList.contains('hidden');
            topInputWrap.classList.toggle('hidden', !isNowHidden);
            if (isNowHidden) {
                topTabBar?.querySelector<HTMLInputElement>('input')?.focus();
            }
        });

        elements.container?.addEventListener('focusout', e => {
            const topTabBar = elements.container?.querySelector<HTMLElement>('#photos-top-tabs');
            const topInputWrap = topTabBar?.querySelector<HTMLElement>(
                '[data-photos-top-search-input]'
            );
            if (!topInputWrap || topInputWrap.classList.contains('hidden')) return;

            const target = e.target as Node | null;
            const related = (e as FocusEvent).relatedTarget as Node | null;
            if (!target || !topInputWrap.contains(target)) return;
            if (related && topInputWrap.contains(related)) return;
            if (!shouldCompactTopSearch()) return;

            topInputWrap.classList.add('hidden');
        });
    }

    function wireSearch(): void {
        elements.searchInput?.addEventListener('input', e => {
            state.searchTerm = (e.target as HTMLInputElement).value;
            const hasText = state.searchTerm.length > 0;
            elements.searchClear?.classList.toggle('hidden', !hasText);
            applyFilters();
        });

        elements.searchInput?.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                // Suchfeld leeren
                if (state.searchTerm) {
                    state.searchTerm = '';
                    if (elements.searchInput) elements.searchInput.value = '';
                    elements.searchClear?.classList.add('hidden');
                    applyFilters();
                }
                // Im kompakten Modus Eingabefeld wieder verbergen
                const container = elements.container;
                if (container && shouldCompactToolbarSearch()) {
                    const inputWrap = container.querySelector<HTMLElement>(
                        '#photos-search-input-wrap'
                    );
                    const toggle =
                        container.querySelector<HTMLButtonElement>('#photos-search-toggle');
                    inputWrap?.classList.add('hidden');
                    toggle?.setAttribute('aria-expanded', 'false');
                }
                event.preventDefault();
                return;
            }
        });

        elements.searchClear?.addEventListener('click', () => {
            state.searchTerm = '';
            if (elements.searchInput) {
                elements.searchInput.value = '';
            }
            elements.searchClear?.classList.add('hidden');
            applyFilters();
        });
    }

    function wireGallery(): void {
        if (!elements.gallery) return;

        elements.gallery.addEventListener('click', event => {
            const card = (event.target as HTMLElement).closest('[data-photo-id]');
            if (!card) return;
            const photoId = card.getAttribute('data-photo-id');
            if (photoId) {
                const index = state.filteredIndexMap.get(photoId);
                if (typeof index === 'number') {
                    openDetail(index);
                }
            }
        });

        elements.gallery.addEventListener('scroll', () => {
            if (scrollDateFramePending) return;
            scrollDateFramePending = true;
            window.requestAnimationFrame(() => {
                scrollDateFramePending = false;
                updateActiveYearMarker();
            });
        });
    }

    function getVisibleGalleryYear(): string | null {
        if (!elements.gallery) return null;

        const sections = Array.from(
            elements.gallery.querySelectorAll<HTMLElement>('section[data-photo-year]')
        );
        if (!sections.length) return null;

        const galleryRect = elements.gallery.getBoundingClientRect();
        const probeY = galleryRect.top + galleryRect.height * 0.3;

        let activeSection = sections[0] ?? null;
        sections.forEach(section => {
            if (section.getBoundingClientRect().top <= probeY) {
                activeSection = section;
            }
        });

        return activeSection?.dataset.photoYear ?? null;
    }

    function renderScrollYearMarkers(): void {
        if (!elements.gallery || !elements.scrollYearMarkers) return;

        const sections = Array.from(
            elements.gallery.querySelectorAll<HTMLElement>('section[data-photo-year]')
        );
        elements.scrollYearMarkers.innerHTML = '';
        if (!sections.length) {
            elements.scrollYearMarkers.classList.add('opacity-0');
            return;
        }

        const maxScrollTop = Math.max(
            1,
            elements.gallery.scrollHeight - elements.gallery.clientHeight
        );
        const markerFragment = document.createDocumentFragment();

        sections.forEach(section => {
            const year = section.dataset.photoYear;
            if (!year) return;

            const marker = document.createElement('div');
            marker.className = 'absolute right-0 -translate-y-1/2 flex items-center gap-2';
            marker.style.top = `${Math.min(100, Math.max(0, (section.offsetTop / maxScrollTop) * 100))}%`;
            marker.dataset.yearMarker = year;

            const label = document.createElement('span');
            label.className =
                'text-[10px] font-semibold text-gray-500 dark:text-gray-400 opacity-70 transition-opacity';
            label.textContent = year;

            const dot = document.createElement('span');
            dot.className =
                'h-1.5 w-1.5 rounded-full bg-gray-400/90 dark:bg-gray-500/90 transition-all';
            dot.setAttribute('data-year-dot', 'true');

            marker.append(label, dot);
            markerFragment.appendChild(marker);
        });

        elements.scrollYearMarkers.appendChild(markerFragment);
        elements.scrollYearMarkers.classList.remove('opacity-0');
        updateActiveYearMarker();
    }

    function updateActiveYearMarker(): void {
        const activeYear = getVisibleGalleryYear();
        const markers =
            elements.scrollYearMarkers?.querySelectorAll<HTMLElement>('[data-year-marker]');
        if (!markers || !markers.length) return;

        markers.forEach(marker => {
            const dot = marker.querySelector<HTMLElement>('[data-year-dot="true"]');
            const label = marker.querySelector<HTMLElement>('span');
            const isActive = activeYear === marker.dataset.yearMarker;

            if (dot) {
                dot.classList.toggle('h-2.5', isActive);
                dot.classList.toggle('w-2.5', isActive);
                dot.classList.toggle('bg-blue-500', isActive);
                dot.classList.toggle('dark:bg-blue-400', isActive);
                dot.classList.toggle('bg-gray-400/90', !isActive);
                dot.classList.toggle('dark:bg-gray-500/90', !isActive);
            }
            if (label) {
                label.classList.toggle('opacity-100', isActive);
                label.classList.toggle('text-gray-700', isActive);
                label.classList.toggle('dark:text-gray-200', isActive);
                label.classList.toggle('opacity-70', !isActive);
                label.classList.toggle('text-gray-500', !isActive);
                label.classList.toggle('dark:text-gray-400', !isActive);
            }
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
        if (!elements.image) return;
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
                'Foto konnte nicht geladen werden.'
            );
        }
    }

    async function fetchPhotos(options: { refresh?: boolean } = {}): Promise<void> {
        if (state.isLoading) return;
        setError(false);
        setLoading(true);
        try {
            const shouldRandomize = options.refresh || state.photos.length === 0;
            const page = shouldRandomize ? getRandomPage() : state.currentPage;
            const limit = 60;
            const response = await fetch(
                `https://picsum.photos/v2/list?page=${page}&limit=${limit}`
            );
            if (!response.ok) throw new Error('Picsum request failed');
            const data = (await response.json()) as PicsumApiPhoto[];
            // Picsum has ~4200 photos; if this page is beyond the last populated page,
            // the API returns [] with status 200 — retry with page 1 as fallback.
            const source =
                Array.isArray(data) && data.length > 0
                    ? data
                    : await (async () => {
                          const fallback = await fetch(
                              `https://picsum.photos/v2/list?page=1&limit=${limit}`
                          );
                          if (!fallback.ok) throw new Error('Picsum fallback request failed');
                          return fallback.json() as Promise<PicsumApiPhoto[]>;
                      })();
            const mapped = (source as PicsumApiPhoto[]).map(mapPhotoItem);
            state.photos = mapped;
            state.currentPage = page;
            state.favorites.clear();
            state.externalPhoto = null;
            state.orientationCounts = calculateOrientationCounts(mapped);
            applyFilters();
        } catch (error) {
            logger.warn('UI', 'Photos app: failed to load', error);
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
                : t('photos.detail.unknownPhotographer', 'Unbekannter Fotograf');
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
            if (state.activeFilter === 'favorites' && !state.favorites.has(photo.id)) return false;
            if (state.activeFilter === 'landscape' && photo.orientation !== 'landscape')
                return false;
            if (state.activeFilter === 'portrait' && photo.orientation !== 'portrait') return false;
            if (state.activeFilter === 'square' && photo.orientation !== 'square') return false;
            if (search && !photo.author.toLowerCase().includes(search)) return false;
            return true;
        });
        state.filteredPhotos = filtered;
        state.filteredIndexMap = new Map(filtered.map((photo, index) => [photo.id, index]));
        renderGallery();
        updateEmptyState();
        updatePhotoCount();
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

    /**
     * Render gallery with year-based grouping.
     * Photos are grouped by year, oldest year first (ascending order).
     */
    function renderGallery(): void {
        if (!elements.gallery) return;
        elements.gallery.innerHTML = '';
        if (!state.filteredPhotos.length) {
            if (elements.scrollYearMarkers) {
                elements.scrollYearMarkers.innerHTML = '';
                elements.scrollYearMarkers.classList.add('opacity-0');
            }
            return;
        }

        const groups = buildYearGroups(state.filteredPhotos);
        groups.forEach(group => {
            const section = document.createElement('section');
            section.className = 'space-y-3';
            section.dataset.photoYear = group.title;

            const heading = document.createElement('div');
            heading.className = 'flex items-baseline justify-between px-2';
            const title = document.createElement('h3');
            title.className =
                'text-base font-semibold text-gray-800 dark:text-gray-100 tracking-wide';
            title.textContent = group.title;
            const count = document.createElement('span');
            count.className = 'text-xs text-gray-500 dark:text-gray-400';
            count.textContent = `${group.photos.length} ${group.photos.length === 1 ? t('photos.labels.photoSingular', 'Foto') : t('photos.labels.photoPlural', 'Fotos')}`;
            heading.append(title, count);
            section.append(heading);

            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3';

            group.photos.forEach(photo => {
                const card = document.createElement('div');
                card.className =
                    'group relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition';
                card.setAttribute('data-photo-id', photo.id);
                card.innerHTML = `
                    <img src="${photo.thumbUrl}" alt="" class="w-full h-full object-cover" loading="lazy" />
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition"></div>
                `;
                grid.appendChild(card);
            });

            section.appendChild(grid);
            elements.gallery!.appendChild(section);
        });

        // Inverted feed: start at the bottom so newest photos are visible first.
        setTimeout(() => {
            if (!elements.gallery) return;
            elements.gallery.scrollTop = elements.gallery.scrollHeight;
            renderScrollYearMarkers();
            updateActiveYearMarker();
        }, 100);
    }

    /**
     * Group photos by year, ascending order (oldest first).
     */
    function buildYearGroups(photos: PhotoLibraryItem[]): PhotoGroup[] {
        const grouped = new Map<number, PhotoLibraryItem[]>();
        photos.forEach(photo => {
            if (!grouped.has(photo.year)) {
                grouped.set(photo.year, []);
            }
            grouped.get(photo.year)!.push(photo);
        });

        const years = Array.from(grouped.keys()).sort((a, b) => a - b);
        return years.map(year => ({
            title: year.toString(),
            photos: grouped.get(year)!,
        }));
    }

    function updateEmptyState(): void {
        const isEmpty = state.filteredPhotos.length === 0;
        elements.empty?.classList.toggle('opacity-0', !isEmpty);
        elements.empty?.classList.toggle('pointer-events-none', !isEmpty);
        elements.gallery?.classList.toggle('opacity-0', isEmpty);
        elements.gallery?.classList.toggle('pointer-events-none', isEmpty);
        if (isEmpty) {
            elements.scrollYearMarkers?.classList.add('opacity-0');
        } else {
            elements.scrollYearMarkers?.classList.remove('opacity-0');
        }
    }

    function updatePhotoCount(): void {
        const count = state.filteredPhotos.length;
        if (elements.photoCount) {
            elements.photoCount.textContent = `${count} ${count === 1 ? t('photos.labels.photoSingular', 'Foto') : t('photos.labels.photoPlural', 'Fotos')}`;
        }
    }

    function openDetail(index: number): void {
        if (index < 0 || index >= state.filteredPhotos.length) return;
        state.selectedIndex = index;
        const photo = state.filteredPhotos[index];
        if (!photo) return;
        state.activePhotoId = photo.id;
        state.overlayVisible = true;
        updateDetail();
        elements.overlay?.classList.remove('hidden');
        // Disable resizer pointer-events so they don't intercept nav buttons inside the overlay.
        elements.container?.querySelectorAll<HTMLElement>('.resizer').forEach(r => {
            r.style.pointerEvents = 'none';
        });
    }

    function closeDetail(): void {
        state.overlayVisible = false;
        state.selectedIndex = -1;
        state.activePhotoId = null;
        elements.overlay?.classList.add('hidden');
        // Restore resizer pointer-events.
        elements.container?.querySelectorAll<HTMLElement>('.resizer').forEach(r => {
            r.style.pointerEvents = '';
        });
    }

    function updateDetail(): void {
        const current = getCurrentDetailPhoto();
        if (!current) return;
        updateDetailMetadata(current);
        loadDetailImage(current);
        updateNavigationButtons();
        updateCounter();
        setActiveCard(current.id);
    }

    function getCurrentDetailPhoto(): AnyPhotoItem | null {
        if (state.externalPhoto) return state.externalPhoto;
        if (state.selectedIndex >= 0 && state.selectedIndex < state.filteredPhotos.length) {
            const photo = state.filteredPhotos[state.selectedIndex];
            return photo ?? null;
        }
        return null;
    }

    function updateDetailMetadata(photo: AnyPhotoItem): void {
        if (elements.detailTitle) {
            elements.detailTitle.textContent = isExternalPhoto(photo)
                ? photo.sourceName || t('photos.detail.titleFallback', 'Foto')
                : t('photos.detail.titleFallback', 'Foto');
        }
        if (elements.detailMeta) {
            elements.detailMeta.textContent = photo.author;
        }
        if (!isExternalPhoto(photo)) {
            if (elements.detailDimensions) {
                elements.detailDimensions.textContent = `${photo.width} × ${photo.height}px`;
            }
        }
    }

    function loadDetailImage(photo: AnyPhotoItem): void {
        if (!elements.image) return;
        state.pendingImageId = photo.id;
        setDetailLoading(true);
        elements.image.src = isExternalPhoto(photo) ? photo.largeUrl : photo.largeUrl;
        if (elements.detailDownload) {
            elements.detailDownload.href = photo.downloadUrl;
            elements.detailDownload.download = `photo-${photo.id}`;
        }
        if (elements.detailOpen) {
            elements.detailOpen.href = photo.url ?? photo.downloadUrl;
        }
        updateFavoriteButton();
    }

    function updateNavigationButtons(): void {
        const isFirst = state.selectedIndex <= 0;
        const isLast = state.selectedIndex >= state.filteredPhotos.length - 1;
        if (elements.detailPrev) {
            elements.detailPrev.classList.toggle('opacity-50', isFirst);
            elements.detailPrev.classList.toggle('cursor-not-allowed', isFirst);
        }
        if (elements.detailNext) {
            elements.detailNext.classList.toggle('opacity-50', isLast);
            elements.detailNext.classList.toggle('cursor-not-allowed', isLast);
        }
    }

    function updateCounter(): void {
        if (elements.detailCounter) {
            elements.detailCounter.textContent = `${state.selectedIndex + 1} / ${state.filteredPhotos.length}`;
        }
    }

    function setActiveCard(photoId: string): void {
        elements.gallery?.querySelectorAll('[data-photo-id]').forEach(card => {
            const isActive = card.getAttribute('data-photo-id') === photoId;
            card.classList.toggle('ring-2', isActive);
            card.classList.toggle('ring-blue-500', isActive);
        });
    }

    function moveSelection(direction: number): void {
        const newIndex = state.selectedIndex + direction;
        if (newIndex >= 0 && newIndex < state.filteredPhotos.length) {
            openDetail(newIndex);
        }
    }

    function toggleFavorite(): void {
        if (!state.activePhotoId) return;
        const isFavorited = state.favorites.has(state.activePhotoId);
        if (isFavorited) {
            state.favorites.delete(state.activePhotoId);
        } else {
            state.favorites.add(state.activePhotoId);
        }
        updateFavoriteButton();
    }

    function updateFavoriteButton(): void {
        const isFavorited = state.activePhotoId && state.favorites.has(state.activePhotoId);
        if (elements.detailFavorite) {
            elements.detailFavorite.classList.toggle('bg-red-100', !!isFavorited);
            elements.detailFavorite.classList.toggle('dark:bg-red-900/30', !!isFavorited);
            elements.detailFavorite.classList.toggle('text-red-600', !!isFavorited);
            elements.detailFavorite.classList.toggle('dark:text-red-400', !!isFavorited);
            if (elements.detailFavoriteIcon) {
                elements.detailFavoriteIcon.textContent = isFavorited ? '♥' : '♡';
            }
            if (elements.detailFavoriteLabel) {
                elements.detailFavoriteLabel.textContent = isFavorited
                    ? t('photos.detail.favoriteRemove', 'Aus Favoriten')
                    : t('photos.detail.favoriteAdd', 'Zu Favoriten');
            }
        }
    }

    function setDetailLoading(loading: boolean): void {
        if (elements.loader) {
            elements.loader.classList.toggle('opacity-0', !loading);
            elements.loader.classList.add('pointer-events-none');
        }
    }

    function setLoading(loading: boolean): void {
        state.isLoading = loading;
        if (elements.loading) {
            elements.loading.classList.toggle('opacity-0', !loading);
            elements.loading.classList.toggle('pointer-events-none', !loading);
        }
    }

    function setError(hasError: boolean): void {
        if (elements.error) {
            elements.error.classList.toggle('hidden', !hasError);
        }
    }

    function handleKeyNavigation(event: KeyboardEvent): void {
        if (!state.overlayVisible) return;
        if (event.key === 'Escape') closeDetail();
        if (event.key === 'ArrowLeft') moveSelection(-1);
        if (event.key === 'ArrowRight') moveSelection(1);
    }

    function getRandomPage(): number {
        // Picsum v2 API has ~4200 photos; pages beyond ~70 (limit=60) return empty arrays.
        // Stay well within the safe range to avoid empty-result fallbacks.
        return Math.floor(Math.random() * 60) + 1;
    }

    function attachToWindow(container: HTMLElement): void {
        if (!container) return;
        elements.container = container;
        elements.titlebar = container.querySelector('.window-titlebar') ?? null;
        elements.statusbar = container.querySelector('.window-statusbar') ?? null;

        cacheElements();
        wireTabNavigation();
        wireSegments();
        wireSearch();
        wireSearchToggle();
        wireSearchResize();
        wireGallery();
        wireDetail();
        globalWindow.appI18n?.applyTranslations?.(elements.container ?? undefined);
        void fetchPhotos();
    }

    globalWindow.PhotosAppAttachToWindow = attachToWindow;

    function init(): void {
        if (state.initialized) return;
        state.initialized = true;

        const existing = document.getElementById('photos-window');
        if (!existing) {
            const PhotosWindow = globalWindow.PhotosWindow;
            if (PhotosWindow && typeof PhotosWindow.create === 'function') {
                const win = PhotosWindow.create() as { element?: HTMLElement | null } | null;
                if (win && win.element) {
                    win.element.id = 'photos-window';
                    elements.container = win.element as HTMLElement;
                }
            } else {
                const frame = renderWindow();
                if (!frame) {
                    logger.error('UI', 'Failed to render photos window');
                    return;
                }

                let container = document.getElementById('photos-window');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'photos-window';
                    container.className =
                        'fixed inset-0 flex items-center justify-center hidden modal relative';
                    container.style.zIndex = '1000';
                    document.body.appendChild(container);
                }

                const wrapper = document.createElement('div');
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
        if (!elements.gallery) return;

        wireTabNavigation();
        wireSegments();
        wireSearch();
        wireSearchToggle();
        wireSearchResize();
        wireGallery();
        wireDetail();
        globalWindow.appI18n?.applyTranslations?.(elements.container ?? undefined);
        void fetchPhotos();
    }

    globalWindow.PhotosApp = {
        init,
        showExternalImage: payload => {
            state.externalPhoto = {
                id: `external-${Date.now()}`,
                author: t('photos.detail.unknownPhotographer', 'Unbekannter Fotograf'),
                downloadUrl: payload.src,
                largeUrl: payload.src,
                url: payload.src,
                sourceName: payload.name,
                isExternal: true,
            };
            const index = 0;
            openDetail(index);
        },
    };
})();
