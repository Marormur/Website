"use strict";
/*
 * Fotos-App – inspiriert von der macOS Fotos Anwendung.
 * Lädt Bilder aus der Picsum API, gruppiert sie in verschiedene Ansichten
 * und stellt einen Detail-Viewer inklusive Favoritenverwaltung bereit.
 */
const globalWindow = window;
function t(key, fallback, params) {
    const translate = globalWindow.appI18n?.translate;
    if (typeof translate === 'function') {
        return translate(key, params, { fallback });
    }
    return fallback;
}
(function photosAppFactory() {
    const state = {
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
    const elements = {
        modal: null,
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
    };
    function isExternalPhoto(photo) {
        return photo.isExternal === true;
    }
    function init() {
        if (state.initialized) {
            return;
        }
        state.initialized = true;
        cacheElements();
        if (!elements.modal || !elements.gallery) {
            return;
        }
        wireSidebar();
        wireSegments();
        wireSearch();
        wireGallery();
        wireDetail();
        globalWindow.appI18n?.applyTranslations?.(elements.modal ?? undefined);
        void fetchPhotos();
    }
    function cacheElements() {
        elements.modal = document.getElementById('image-modal');
        elements.sidebar = document.getElementById('photos-sidebar');
        elements.gallery = document.getElementById('photos-gallery');
        elements.loading = document.getElementById('photos-loading');
        elements.error = document.getElementById('photos-error');
        elements.errorRetry = document.getElementById('photos-error-retry');
        elements.empty = document.getElementById('photos-empty');
        elements.placeholder = document.getElementById('image-placeholder');
        elements.photoCount = document.getElementById('photo-count');
        elements.refreshButton = document.getElementById('photos-refresh');
        elements.searchInput = document.getElementById('photos-search');
        elements.searchClear = document.getElementById('photos-search-clear');
        elements.overlay = document.getElementById('photo-detail-overlay');
        elements.detailTitle = document.getElementById('photo-detail-title');
        elements.detailMeta = document.getElementById('photo-detail-meta');
        elements.detailDimensions = document.getElementById('photo-detail-dimensions');
        elements.detailCounter = document.getElementById('photo-detail-counter');
        elements.detailOpen = document.getElementById('photo-detail-open');
        elements.detailDownload = document.getElementById('photo-detail-download');
        elements.detailFavorite = document.getElementById('photo-detail-favorite');
        elements.detailFavoriteLabel = elements.detailFavorite?.querySelector('span:last-child') ?? null;
        elements.detailFavoriteIcon = elements.detailFavorite?.querySelector('span[aria-hidden="true"]') ?? null;
        elements.detailClose = document.getElementById('photo-detail-close');
        elements.detailPrev = document.getElementById('photo-detail-prev');
        elements.detailNext = document.getElementById('photo-detail-next');
        elements.image = document.getElementById('image-viewer');
        elements.imageInfo = document.getElementById('image-info');
        elements.loader = document.getElementById('photo-detail-loader');
        elements.countAll = document.getElementById('photos-count-all');
        elements.countFavorites = document.getElementById('photos-count-favorites');
        elements.countLandscape = document.getElementById('photos-count-landscape');
        elements.countPortrait = document.getElementById('photos-count-portrait');
        elements.countSquare = document.getElementById('photos-count-square');
        const sidebarButtons = elements.sidebar?.querySelectorAll('button[data-photos-filter]') ?? [];
        elements.sidebarButtons = Array.from(sidebarButtons);
        const segmentButtons = document.querySelectorAll('button[data-photos-segment]');
        elements.segmentButtons = Array.from(segmentButtons);
    }
    function wireSidebar() {
        elements.sidebarButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-photos-filter');
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
    function wireSegments() {
        elements.segmentButtons.forEach(button => {
            button.addEventListener('click', () => {
                const segment = button.getAttribute('data-photos-segment');
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
    function wireSearch() {
        elements.searchInput?.addEventListener('input', event => {
            const target = event.currentTarget;
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
    function wireGallery() {
        elements.gallery?.addEventListener('click', event => {
            const target = event.target;
            if (!target) {
                return;
            }
            const card = target.closest('[data-photo-index]');
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
    function wireDetail() {
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
    function handleImageLoaded() {
        setDetailLoading(false);
        if (!elements.image) {
            return;
        }
        if (state.pendingImageId) {
            const width = elements.image.naturalWidth;
            const height = elements.image.naturalHeight;
            const orientation = width === height ? 'square' : width > height ? 'landscape' : 'portrait';
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
    function handleImageError() {
        setDetailLoading(false);
        if (elements.detailMeta) {
            elements.detailMeta.textContent = t('photos.errors.detailImage', 'Das Foto konnte nicht geladen werden.');
        }
    }
    async function fetchPhotos(options = {}) {
        if (state.isLoading) {
            return;
        }
        setError(false);
        setLoading(true);
        try {
            const shouldRandomize = options.refresh || state.photos.length === 0;
            const page = shouldRandomize ? getRandomPage() : state.currentPage;
            const limit = 60;
            const response = await fetch(`https://picsum.photos/v2/list?page=${page}&limit=${limit}`);
            if (!response.ok) {
                throw new Error('Picsum request failed');
            }
            const data = (await response.json());
            const mapped = data.map(mapPhotoItem);
            state.photos = mapped;
            state.currentPage = page;
            state.favorites.clear();
            state.externalPhoto = null;
            state.orientationCounts = calculateOrientationCounts(mapped);
            applyFilters();
            updateSidebarCounts();
        }
        catch (error) {
            console.warn('Fotos-App: Laden fehlgeschlagen', error);
            setError(true);
        }
        finally {
            setLoading(false);
        }
    }
    function mapPhotoItem(item, index) {
        const width = Number(item.width) || 0;
        const height = Number(item.height) || 0;
        const orientation = width === height ? 'square' : width > height ? 'landscape' : 'portrait';
        const numericId = Number.parseInt(item.id, 10);
        const yearBase = Number.isFinite(numericId) ? numericId : index;
        const year = 2014 + ((yearBase % 10) + 1);
        const sanitizedAuthor = item.author && item.author.trim().length > 0
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
    function calculateOrientationCounts(photos) {
        return photos.reduce((acc, photo) => {
            acc[photo.orientation] += 1;
            return acc;
        }, { landscape: 0, portrait: 0, square: 0 });
    }
    function applyFilters() {
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
            }
            else if (!state.externalPhoto) {
                closeDetail();
            }
        }
    }
    function renderGallery() {
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
            title.className = 'text-base font-semibold text-gray-800 dark:text-gray-100 tracking-wide';
            title.textContent = group.title;
            const count = document.createElement('span');
            count.className = 'text-xs text-gray-500 dark:text-gray-400';
            const countKey = group.photos.length === 1 ? 'photos.labels.photoSingular' : 'photos.labels.photoPlural';
            const countLabel = t(countKey, group.photos.length === 1 ? 'Foto' : 'Fotos');
            count.textContent = `${group.photos.length} ${countLabel}`;
            heading.append(title, count);
            section.append(heading);
            const grid = document.createElement('div');
            grid.className = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 auto-rows-[minmax(140px,_auto)]';
            group.photos.forEach(photo => {
                const index = state.filteredIndexMap.get(photo.id) ?? -1;
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'photos-card relative group overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-800 shadow-md hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';
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
                image.alt = t('photos.gallery.alt', 'Foto von {author}', { author: photo.author });
                image.loading = 'lazy';
                image.className = 'w-full h-full object-cover transition duration-300 group-hover:scale-105';
                const overlay = document.createElement('div');
                overlay.className = 'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-3 py-2 text-left';
                const author = document.createElement('p');
                author.className = 'text-white text-sm font-medium truncate';
                author.textContent = photo.author;
                const meta = document.createElement('p');
                meta.className = 'text-white/80 text-[11px] uppercase tracking-[0.3em]';
                meta.textContent = `${photo.year} • ${formatOrientation(photo.orientation)}`;
                overlay.append(author, meta);
                card.append(image, overlay);
                grid.append(card);
            });
            section.append(grid);
            elements.gallery?.append(section);
        });
    }
    function buildGroups(photos, segment) {
        if (segment === 'collections') {
            const orientations = [
                { title: t('photos.collections.landscape', 'Horizonte'), key: 'landscape' },
                { title: t('photos.collections.portrait', 'Porträts'), key: 'portrait' },
                { title: t('photos.collections.square', 'Quadrate'), key: 'square' },
            ];
            return orientations
                .map(item => ({ title: item.title, photos: photos.filter(photo => photo.orientation === item.key) }))
                .filter(group => group.photos.length > 0);
        }
        if (segment === 'years') {
            const byYear = new Map();
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
        const byAuthor = new Map();
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
    function formatOrientation(orientation) {
        if (orientation === 'portrait') {
            return t('photos.orientations.portrait', 'Porträt');
        }
        if (orientation === 'square') {
            return t('photos.orientations.square', 'Quadrat');
        }
        return t('photos.orientations.landscape', 'Querformat');
    }
    function setActiveCard(photoId) {
        if (!elements.gallery) {
            return;
        }
        const current = elements.gallery.querySelector('.photos-card[data-selected="true"]');
        if (current) {
            current.removeAttribute('data-selected');
        }
        const next = elements.gallery.querySelector(`.photos-card[data-photo-id="${photoId}"]`);
        if (next) {
            next.dataset.selected = 'true';
        }
    }
    function clearActiveCard() {
        if (!elements.gallery) {
            return;
        }
        const current = elements.gallery.querySelector('.photos-card[data-selected="true"]');
        current?.removeAttribute('data-selected');
    }
    function updateEmptyState() {
        const shouldShow = state.filteredPhotos.length === 0;
        elements.empty?.classList.toggle('hidden', !shouldShow);
    }
    function updatePhotoCount() {
        if (!elements.photoCount) {
            return;
        }
        const total = state.filteredPhotos.length;
        const labelKey = total === 1 ? 'photos.labels.photoSingular' : 'photos.labels.photoPlural';
        const label = t(labelKey, total === 1 ? 'Foto' : 'Fotos');
        const segmentKey = state.activeSegment === 'collections'
            ? 'photos.segments.collections'
            : state.activeSegment === 'years'
                ? 'photos.segments.years'
                : 'photos.segments.moments';
        const segmentFallback = state.activeSegment === 'collections'
            ? 'Sammlungen'
            : state.activeSegment === 'years'
                ? 'Jahre'
                : 'Momente';
        const segmentLabel = t(segmentKey, segmentFallback);
        elements.photoCount.textContent = t('photos.status.count', `${total} ${label} • ${segmentLabel}`, { count: total, label, segment: segmentLabel });
    }
    function updateSidebarCounts() {
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
    function syncSidebarSelection() {
        elements.sidebarButtons.forEach(button => {
            const filter = button.getAttribute('data-photos-filter');
            button.dataset.active = filter === state.activeFilter ? 'true' : 'false';
        });
    }
    function syncSegmentSelection() {
        elements.segmentButtons.forEach(button => {
            const segment = button.getAttribute('data-photos-segment');
            button.dataset.active = segment === state.activeSegment ? 'true' : 'false';
        });
    }
    function toggleSearchClear() {
        if (!elements.searchClear) {
            return;
        }
        const hasValue = Boolean(state.searchTerm.trim());
        elements.searchClear.classList.toggle('invisible', !hasValue);
        elements.searchClear.classList.toggle('pointer-events-none', !hasValue);
    }
    function setLoading(isLoading) {
        state.isLoading = isLoading;
        elements.loading?.classList.toggle('hidden', !isLoading);
    }
    function setError(hasError) {
        elements.error?.classList.toggle('hidden', !hasError);
    }
    function openDetail(index, options = {}) {
        const overlay = elements.overlay;
        if (!overlay || !elements.image) {
            return;
        }
        let photo = null;
        if (options.external && options.photo) {
            photo = options.photo;
            state.externalPhoto = options.photo;
            state.selectedIndex = -1;
            state.activePhotoId = options.photo.id;
        }
        else {
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
        }
        else {
            elements.image.src = photo.downloadUrl;
        }
        updateDetailMetadata(photo);
        updateNavigationButtons();
        updateCounter();
        if (!options.external) {
            setActiveCard(photo.id);
        }
        else {
            clearActiveCard();
        }
    }
    function getCurrentDetailPhoto() {
        if (state.externalPhoto) {
            return state.externalPhoto;
        }
        if (state.selectedIndex >= 0) {
            return state.filteredPhotos[state.selectedIndex] ?? null;
        }
        return null;
    }
    function updateDetailMetadata(photo) {
        if (elements.detailTitle) {
            const fallbackTitle = t('photos.detail.unknownPhoto', 'Unbekanntes Foto');
            elements.detailTitle.textContent = photo.author || fallbackTitle;
        }
        if (elements.imageInfo) {
            const label = isExternalPhoto(photo) && photo.sourceName ? photo.sourceName : photo.author;
            elements.imageInfo.textContent = label;
        }
        const orientationLabel = formatOrientation(photo.orientation);
        const metaParts = [];
        if (isExternalPhoto(photo)) {
            metaParts.push(t('photos.detail.externalLabel', 'Externes Foto'));
            if (photo.sourceName) {
                metaParts.push(photo.sourceName);
            }
        }
        else {
            metaParts.push(String(photo.year));
            metaParts.push(orientationLabel);
        }
        if (elements.detailMeta) {
            elements.detailMeta.textContent = metaParts.join(' • ');
        }
        if (elements.detailDimensions) {
            if (photo.width && photo.height) {
                elements.detailDimensions.textContent = t('photos.detail.dimensions', `Auflösung: ${photo.width} × ${photo.height}px`, { width: photo.width, height: photo.height });
            }
            else {
                elements.detailDimensions.textContent = '';
            }
        }
        if (elements.detailOpen) {
            elements.detailOpen.href = photo.url ?? photo.downloadUrl;
        }
        if (elements.detailDownload) {
            elements.detailDownload.href = photo.downloadUrl;
            elements.detailDownload.download = t('photos.detail.downloadFilename', `foto-${photo.id}.jpg`, { id: photo.id });
        }
        updateFavoriteButton(photo);
    }
    function updateFavoriteButton(photo) {
        if (!elements.detailFavorite || !elements.detailFavoriteLabel || !elements.detailFavoriteIcon) {
            return;
        }
        if (isExternalPhoto(photo)) {
            elements.detailFavorite.setAttribute('disabled', 'true');
            elements.detailFavorite.classList.add('opacity-40', 'pointer-events-none');
            elements.detailFavoriteLabel.textContent = t('photos.detail.favoriteUnavailable', 'Nicht verfügbar');
            elements.detailFavoriteIcon.textContent = '–';
            return;
        }
        const isFavorite = state.favorites.has(photo.id);
        elements.detailFavorite.removeAttribute('disabled');
        elements.detailFavorite.classList.remove('opacity-40', 'pointer-events-none');
        const removeLabel = t('photos.detail.favoriteRemove', 'Favorit entfernen');
        const addLabel = t('photos.detail.favoriteAdd', 'Zu Favoriten');
        elements.detailFavoriteLabel.textContent = isFavorite ? removeLabel : addLabel;
        elements.detailFavoriteIcon.textContent = isFavorite ? '♥' : '♡';
    }
    function closeDetail() {
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
    function moveSelection(delta) {
        if (state.externalPhoto) {
            return;
        }
        const nextIndex = state.selectedIndex + delta;
        if (nextIndex < 0 || nextIndex >= state.filteredPhotos.length) {
            return;
        }
        openDetail(nextIndex);
    }
    function toggleFavorite() {
        if (state.externalPhoto) {
            return;
        }
        const photo = state.filteredPhotos[state.selectedIndex];
        if (!photo) {
            return;
        }
        if (state.favorites.has(photo.id)) {
            state.favorites.delete(photo.id);
        }
        else {
            state.favorites.add(photo.id);
        }
        updateFavoriteButton(photo);
        updateSidebarCounts();
        updateCardFavoriteState(photo.id);
    }
    function updateCardFavoriteState(photoId) {
        if (!elements.gallery) {
            return;
        }
        const card = elements.gallery.querySelector(`.photos-card[data-photo-id="${photoId}"]`);
        if (!card) {
            return;
        }
        if (state.favorites.has(photoId)) {
            card.dataset.favorite = 'true';
        }
        else {
            card.removeAttribute('data-favorite');
        }
    }
    function updateNavigationButtons() {
        const hasPrev = state.selectedIndex > 0 && !state.externalPhoto;
        const hasNext = state.selectedIndex >= 0 &&
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
    function updateCounter() {
        if (!elements.detailCounter) {
            return;
        }
        if (state.externalPhoto) {
            elements.detailCounter.textContent = t('photos.detail.externalCounter', 'Externes Bild');
            return;
        }
        if (state.selectedIndex >= 0) {
            elements.detailCounter.textContent = t('photos.detail.counter', `${state.selectedIndex + 1} von ${state.filteredPhotos.length}`, { index: state.selectedIndex + 1, total: state.filteredPhotos.length });
        }
        else {
            elements.detailCounter.textContent = '';
        }
    }
    function setDetailLoading(isLoading) {
        elements.loader?.classList.toggle('hidden', !isLoading);
    }
    function handleKeyNavigation(event) {
        if (!state.overlayVisible) {
            return;
        }
        if (event.key === 'Escape') {
            closeDetail();
        }
        else if (event.key === 'ArrowLeft') {
            moveSelection(-1);
        }
        else if (event.key === 'ArrowRight') {
            moveSelection(1);
        }
    }
    function getRandomPage() {
        return Math.floor(Math.random() * 10) + 1;
    }
    function showExternalImage(payload) {
        if (!payload || !payload.src) {
            return;
        }
        if (!state.initialized) {
            init();
        }
        const name = payload.name && payload.name.trim().length > 0
            ? payload.name.trim()
            : t('photos.detail.externalFile', 'Externe Datei');
        const externalPhoto = {
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
    function handleLanguageChange() {
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
        }
        else {
            updateCounter();
        }
        globalWindow.appI18n?.applyTranslations?.(elements.modal ?? undefined);
    }
    const api = {
        init,
        showExternalImage,
    };
    globalWindow.PhotosApp = api;
    window.addEventListener('languagePreferenceChange', handleLanguageChange);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    }
    else {
        init();
    }
})();
//# sourceMappingURL=photos-app.js.map