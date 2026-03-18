import { translate } from '../../services/i18n';
import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import { configureInsetWindowShell } from '../../framework/controls/inset-window-shell.js';
import { renderInsetSidebarShellHTML } from '../../framework/controls/inset-sidebar-shell.js';
import { createTrafficLightControlsElement } from '../../framework/controls/traffic-lights.js';
import {
    focusOrCreateWindowByType,
    showAndRegisterWindow,
} from '../../framework/controls/window-lifecycle.js';
import { attachWindowDragZoneBehavior } from '../../framework/controls/window-drag-zone.js';

export interface PreviewWindowState {
    images?: string[];
    currentIndex?: number;
    path?: string;
    zoom?: number;
}

type ViewerState = { hasImage: boolean; src: string; title?: string };

export class PreviewWindow extends BaseWindow {
    private images: string[] = [];
    private currentIndex = 0;
    private currentPath = '';
    private zoom = 1;
    private readonly trackedObjectUrls = new Set<string>();
    private keydownListener?: (event: KeyboardEvent) => void;
    private languageChangeListener?: () => void;
    private imageElement: HTMLImageElement | null = null;
    private emptyStateElement: HTMLElement | null = null;
    private pathLabelElement: HTMLElement | null = null;
    private counterElement: HTMLElement | null = null;
    private statusPathElement: HTMLElement | null = null;
    private statusCounterElement: HTMLElement | null = null;
    private zoomLabelElement: HTMLElement | null = null;
    private titleElement: HTMLElement | null = null;
    private subtitleElement: HTMLElement | null = null;
    private hintElement: HTMLElement | null = null;
    private prevButton: HTMLButtonElement | null = null;
    private nextButton: HTMLButtonElement | null = null;
    private zoomInButton: HTMLButtonElement | null = null;
    private zoomOutButton: HTMLButtonElement | null = null;
    private openButton: HTMLButtonElement | null = null;
    private downloadButton: HTMLButtonElement | null = null;

    constructor(config?: Partial<WindowConfig>) {
        super({
            type: 'preview',
            title: translate('programs.preview.label', 'Vorschau') || 'Vorschau',
            ...config,
        });
    }

    createDOM(): HTMLElement {
        const windowEl = super.createDOM();

        this.titlebarElement = configureInsetWindowShell({
            windowEl,
            titlebarElement: this.titlebarElement,
            shellClassName: 'preview-window-shell',
            cssVariables: {
                '--preview-window-radius': '1.125rem',
                '--preview-sidebar-inset': '0.5rem',
                '--preview-sidebar-width': '238px',
            },
            contentClassName: 'flex-1 overflow-hidden relative',
        });

        const root = document.createElement('div');
        root.className = 'preview-app-shell';

        const sidebarShell = document.createElement('div');
        sidebarShell.innerHTML = renderInsetSidebarShellHTML({
            shellClassName: 'preview-sidebar-shell',
            panelClassName: 'preview-sidebar-panel',
            topClassName: 'finder-window-drag-zone flex items-center gap-2 px-3',
            topAttributes: {
                style: 'height:44px;flex-shrink:0;cursor:move;',
            },
            topHtml: '',
            bodyClassName: 'flex-1 min-h-0 flex flex-col px-3 pb-3',
            bodyAttributes: {
                style: 'padding-top:8px;',
            },
            bodyHtml: `
                <div class="preview-sidebar-meta">
                    <div class="preview-sidebar-meta-card">
                        <span class="preview-sidebar-meta-label" data-preview-label="file">${translate('preview.labels.file', 'Datei')}</span>
                        <strong class="preview-sidebar-meta-value" data-preview-title>${translate('preview.noImage', 'Kein Bild ausgewählt')}</strong>
                    </div>
                    <div class="preview-sidebar-meta-card">
                        <span class="preview-sidebar-meta-label" data-preview-label="path">${translate('preview.labels.path', 'Pfad')}</span>
                        <span class="preview-sidebar-meta-value preview-sidebar-path" data-preview-path>–</span>
                    </div>
                    <div class="preview-sidebar-meta-card">
                        <span class="preview-sidebar-meta-label" data-preview-label="status">${translate('preview.labels.status', 'Status')}</span>
                        <span class="preview-sidebar-meta-value" data-preview-counter>0 / 0</span>
                    </div>
                    <div class="preview-sidebar-meta-card">
                        <span class="preview-sidebar-meta-label" data-preview-label="zoom">${translate('preview.labels.zoom', 'Zoom')}</span>
                        <span class="preview-sidebar-meta-value" data-preview-zoom>100%</span>
                    </div>
                </div>
                <div class="preview-sidebar-shortcuts">
                    <p class="preview-sidebar-section-label" data-preview-label="shortcuts">${translate('preview.labels.shortcuts', 'Shortcuts')}</p>
                    <ul class="preview-sidebar-shortcut-list">
                        <li><span>← →</span><span data-preview-shortcut="prevNext">${translate('preview.prev', 'Vorheriges Bild')} / ${translate('preview.next', 'Nächstes Bild')}</span></li>
                        <li><span>+</span><span data-preview-shortcut="zoomIn">${translate('preview.zoomIn', 'Vergrößern')}</span></li>
                        <li><span>-</span><span data-preview-shortcut="zoomOut">${translate('preview.zoomOut', 'Verkleinern')}</span></li>
                    </ul>
                </div>
            `,
        });

        const sidebarTop = sidebarShell.querySelector('.finder-window-drag-zone');
        if (sidebarTop) {
            sidebarTop.appendChild(
                createTrafficLightControlsElement({
                    defaults: { noDrag: true },
                    close: {
                        title: translate('common.close', 'Schließen'),
                        i18nTitleKey: 'common.close',
                        onClick: () => this.close(),
                    },
                    minimize: {
                        title: translate('menu.window.minimize', 'Minimieren'),
                        i18nTitleKey: 'menu.window.minimize',
                        onClick: () => this.minimize(),
                    },
                    maximize: {
                        title: translate('menu.window.zoom', 'Füllen'),
                        i18nTitleKey: 'menu.window.zoom',
                        onClick: () => this.toggleMaximize(),
                    },
                })
            );
        }

        const mainArea = document.createElement('div');
        mainArea.className = 'preview-main-area';
        mainArea.innerHTML = `
            <div class="preview-content-topbar finder-window-drag-zone">
                <div class="preview-toolbar finder-no-drag" role="toolbar" data-preview-toolbar="navigation" aria-label="${translate('preview.aria.toolbarNavigation', 'Preview toolbar')}">
                    <button type="button" class="preview-toolbar-button" data-preview-action="prev">←</button>
                    <button type="button" class="preview-toolbar-button" data-preview-action="next">→</button>
                    <span class="preview-toolbar-separator" aria-hidden="true"></span>
                    <button type="button" class="preview-toolbar-button" data-preview-action="zoom-out">−</button>
                    <button type="button" class="preview-toolbar-button" data-preview-action="zoom-in">+</button>
                </div>
                <div class="preview-title-cluster">
                    <strong data-preview-title-inline>${translate('preview.noImage', 'Kein Bild ausgewählt')}</strong>
                    <span data-preview-hint>${translate('preview.imageViewer', 'Bildbetrachter')}</span>
                </div>
                <div class="preview-toolbar finder-no-drag" role="toolbar" data-preview-toolbar="fileActions" aria-label="${translate('preview.aria.toolbarFileActions', 'Preview file actions')}">
                    <button type="button" class="preview-toolbar-button preview-toolbar-button--wide" data-preview-action="open-tab">↗</button>
                    <button type="button" class="preview-toolbar-button preview-toolbar-button--wide" data-preview-action="download">↓</button>
                </div>
            </div>
            <div class="preview-stage-wrap">
                <div class="preview-stage">
                    <div class="preview-stage-empty" data-preview-empty>
                        <div class="preview-stage-empty-icon" aria-hidden="true">🖼️</div>
                        <strong data-preview-empty-title>${translate('preview.noImage', 'Kein Bild ausgewählt')}</strong>
                        <p data-preview-empty-copy>${translate('preview.placeholder', 'Öffne eine Bilddatei aus dem Sucher, um die Vorschau zu sehen.')}</p>
                    </div>
                    <img class="preview-stage-image hidden" data-preview-image alt="" />
                </div>
            </div>
            <div class="window-statusbar preview-statusbar">
                <span data-preview-path-inline>–</span>
                <span data-preview-status-inline>0 / 0</span>
            </div>
        `;

        root.appendChild(sidebarShell.firstElementChild || sidebarShell);
        root.appendChild(mainArea);
        this.contentElement?.appendChild(root);

        this.titleElement = root.querySelector('[data-preview-title]');
        this.subtitleElement = root.querySelector('[data-preview-title-inline]');
        this.pathLabelElement = root.querySelector('[data-preview-path]');
        this.counterElement = root.querySelector('[data-preview-counter]');
        this.statusPathElement = root.querySelector('[data-preview-path-inline]');
        this.statusCounterElement = root.querySelector('[data-preview-status-inline]');
        this.zoomLabelElement = root.querySelector('[data-preview-zoom]');
        this.hintElement = root.querySelector('[data-preview-hint]');
        this.emptyStateElement = root.querySelector('[data-preview-empty]');
        this.imageElement = root.querySelector('[data-preview-image]');
        this.prevButton = root.querySelector('[data-preview-action="prev"]');
        this.nextButton = root.querySelector('[data-preview-action="next"]');
        this.zoomOutButton = root.querySelector('[data-preview-action="zoom-out"]');
        this.zoomInButton = root.querySelector('[data-preview-action="zoom-in"]');
        this.openButton = root.querySelector('[data-preview-action="open-tab"]');
        this.downloadButton = root.querySelector('[data-preview-action="download"]');

        this.bindActions(root);
        this.attachDragHandlers(windowEl);
        this.attachKeyboardShortcuts();
        this.attachLanguageChangeListener();
        this.applyI18n();
        this.renderViewer();

        return windowEl;
    }

    openImages(images: string[], startIndex = 0, path?: string): void {
        if (!Array.isArray(images) || images.length === 0) return;
        const nextImages = images.filter(Boolean);
        if (nextImages.length === 0) return;

        this.revokeRemovedObjectUrls(nextImages);
        nextImages.forEach(image => {
            if (image.startsWith('blob:')) this.trackedObjectUrls.add(image);
        });

        this.images = nextImages;
        this.currentIndex = Math.max(0, Math.min(startIndex, nextImages.length - 1));
        this.currentPath = path || '';
        this.zoom = 1;
        this.renderViewer();
        this.show();
        this.bringToFront();
    }

    getViewerState(): ViewerState {
        const src = this.images[this.currentIndex] || '';
        return {
            hasImage: Boolean(src),
            src,
            title: this.getCurrentFileName(),
        };
    }

    openCurrentImageInNewTab(): void {
        const state = this.getViewerState();
        if (!state.hasImage || !state.src) return;
        window.open(state.src, '_blank', 'noopener');
    }

    downloadCurrentImage(): void {
        const state = this.getViewerState();
        if (!state.hasImage || !state.src) return;

        const link = document.createElement('a');
        link.href = state.src;
        link.download =
            this.getCurrentFileName() || translate('preview.download.defaultFileName', 'image');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    close(): void {
        this.cleanup();
        super.close();
    }

    private bindActions(root: HTMLElement): void {
        root.addEventListener('click', event => {
            const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
                '[data-preview-action]'
            );
            if (!target) return;

            const action = target.dataset.previewAction;
            switch (action) {
                case 'prev':
                    this.prevImage();
                    break;
                case 'next':
                    this.nextImage();
                    break;
                case 'zoom-in':
                    this.zoomIn();
                    break;
                case 'zoom-out':
                    this.zoomOut();
                    break;
                case 'open-tab':
                    this.openCurrentImageInNewTab();
                    break;
                case 'download':
                    this.downloadCurrentImage();
                    break;
                default:
                    break;
            }
        });
    }

    private attachKeyboardShortcuts(): void {
        if (this.keydownListener) {
            document.removeEventListener('keydown', this.keydownListener);
        }

        this.keydownListener = (event: KeyboardEvent) => {
            const activeWindow = window.WindowRegistry?.getActiveWindow?.();
            if (activeWindow?.id !== this.id) return;

            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                this.prevImage();
                return;
            }
            if (event.key === 'ArrowRight') {
                event.preventDefault();
                this.nextImage();
                return;
            }
            if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                this.zoomIn();
                return;
            }
            if (event.key === '-') {
                event.preventDefault();
                this.zoomOut();
            }
        };

        document.addEventListener('keydown', this.keydownListener);
    }

    private attachDragHandlers(windowEl: HTMLElement): void {
        const isInteractiveTarget = (target: HTMLElement | null): boolean => {
            if (!target) return false;
            if (target.closest('.finder-no-drag')) return true;
            return Boolean(target.closest('button, input, select, textarea, a, [role="button"]'));
        };

        attachWindowDragZoneBehavior({
            windowEl,
            isInteractiveTarget,
            bringToFront: () => this.bringToFront(),
            toggleMaximize: () => this.toggleMaximize(),
            updatePosition: (x: number, y: number, targetEl: HTMLElement) => {
                this.position.x = x;
                this.position.y = y;
                targetEl.style.left = `${x}px`;
                targetEl.style.top = `${y}px`;
            },
            getSnapCandidate: (target: HTMLElement | null, pointerX: number | null) =>
                this.getSnapCandidate(target, pointerX),
            snapTo: (side: 'left' | 'right') => this.snapTo(side),
            persistState: () => {
                (this as unknown as { _saveState?: () => void })._saveState?.();
            },
        });
    }

    private getSnapCandidate(
        target: HTMLElement | null,
        pointerX: number | null
    ): 'left' | 'right' | null {
        if (!target) return null;
        const viewportWidth = Math.max(window.innerWidth || 0, 0);
        if (viewportWidth <= 0) return null;

        const threshold = Math.max(3, Math.min(14, viewportWidth * 0.0035));
        const rect = target.getBoundingClientRect();

        const pointerDistLeft =
            typeof pointerX === 'number' ? Math.max(0, pointerX) : Math.abs(rect.left);
        if (Math.abs(rect.left) <= threshold || pointerDistLeft <= threshold) return 'left';

        const distRight = viewportWidth - rect.right;
        const pointerDistRight =
            typeof pointerX === 'number'
                ? Math.max(0, viewportWidth - pointerX)
                : Math.abs(distRight);
        if (Math.abs(distRight) <= threshold || pointerDistRight <= threshold) return 'right';

        return null;
    }

    private snapTo(side: 'left' | 'right'): void {
        const target = this.element;
        if (!target) return;
        const metrics = window.computeSnapMetrics?.(side);
        if (!metrics) return;

        target.style.maxWidth = 'none';
        target.style.maxHeight = 'none';
        target.style.position = 'fixed';
        target.style.left = `${metrics.left}px`;
        target.style.top = `${metrics.top}px`;
        target.style.width = `${metrics.width}px`;
        target.style.height = `${metrics.height}px`;
        target.dataset.snapped = side;

        this.position.x = metrics.left;
        this.position.y = metrics.top;
        this.position.width = metrics.width;
        this.position.height = metrics.height;
        this.bringToFront();
    }

    private renderViewer(): void {
        const state = this.getViewerState();
        const fileName =
            this.getCurrentFileName() || translate('preview.noImage', 'Kein Bild ausgewählt');
        const pathLabel = this.currentPath || '–';
        const counterLabel = this.images.length
            ? `${this.currentIndex + 1} / ${this.images.length}`
            : '0 / 0';
        const zoomLabel = `${Math.round(this.zoom * 100)}%`;

        if (this.titleElement) this.titleElement.textContent = fileName;
        if (this.subtitleElement) this.subtitleElement.textContent = fileName;
        if (this.pathLabelElement) this.pathLabelElement.textContent = pathLabel;
        if (this.counterElement) this.counterElement.textContent = counterLabel;
        if (this.statusPathElement) this.statusPathElement.textContent = pathLabel;
        if (this.statusCounterElement) this.statusCounterElement.textContent = counterLabel;
        if (this.zoomLabelElement) this.zoomLabelElement.textContent = zoomLabel;
        if (this.hintElement) {
            this.hintElement.textContent = state.hasImage
                ? translate('preview.imageViewer', 'Bildbetrachter')
                : translate(
                      'preview.placeholder',
                      'Öffne eine Bilddatei aus dem Sucher, um die Vorschau zu sehen.'
                  );
        }

        if (this.imageElement) {
            this.imageElement.src = state.src || '';
            this.imageElement.alt = fileName;
            this.imageElement.style.transform = `scale(${this.zoom})`;
            this.imageElement.classList.toggle('hidden', !state.hasImage);
        }
        if (this.emptyStateElement) {
            this.emptyStateElement.classList.toggle('hidden', state.hasImage);
        }

        const disableNav = this.images.length <= 1;
        this.prevButton?.toggleAttribute('disabled', disableNav);
        this.nextButton?.toggleAttribute('disabled', disableNav);
        this.zoomInButton?.toggleAttribute('disabled', !state.hasImage);
        this.zoomOutButton?.toggleAttribute('disabled', !state.hasImage);
        this.openButton?.toggleAttribute('disabled', !state.hasImage);
        this.downloadButton?.toggleAttribute('disabled', !state.hasImage);
    }

    private zoomIn(): void {
        if (!this.images.length) return;
        this.zoom = Math.min(this.zoom + 0.12, 3);
        this.renderViewer();
    }

    private zoomOut(): void {
        if (!this.images.length) return;
        this.zoom = Math.max(this.zoom - 0.12, 0.3);
        this.renderViewer();
    }

    private nextImage(): void {
        if (this.images.length <= 1) return;
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        this.zoom = 1;
        this.renderViewer();
    }

    private prevImage(): void {
        if (this.images.length <= 1) return;
        this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.zoom = 1;
        this.renderViewer();
    }

    private getCurrentFileName(): string {
        if (this.currentPath) {
            const pathSegments = this.currentPath.split('/').filter(Boolean);
            const lastSegment = pathSegments[pathSegments.length - 1];
            if (lastSegment) return lastSegment;
        }

        const currentSrc = this.images[this.currentIndex] || '';
        if (!currentSrc) return '';
        try {
            const url = new URL(currentSrc, window.location.href);
            const lastSegment = url.pathname.split('/').filter(Boolean).pop();
            return lastSegment || currentSrc;
        } catch {
            return currentSrc;
        }
    }

    private revokeRemovedObjectUrls(nextImages: string[]): void {
        Array.from(this.trackedObjectUrls).forEach(url => {
            if (nextImages.includes(url)) return;
            try {
                URL.revokeObjectURL(url);
            } catch {
                // Ignore blob cleanup failures.
            }
            this.trackedObjectUrls.delete(url);
        });
    }

    private cleanup(): void {
        if (this.keydownListener) {
            document.removeEventListener('keydown', this.keydownListener);
            this.keydownListener = undefined;
        }
        if (this.languageChangeListener) {
            window.removeEventListener('languagePreferenceChange', this.languageChangeListener);
            this.languageChangeListener = undefined;
        }
        this.revokeRemovedObjectUrls([]);
    }

    private attachLanguageChangeListener(): void {
        if (this.languageChangeListener) {
            window.removeEventListener('languagePreferenceChange', this.languageChangeListener);
        }

        // Re-translate static labels and refresh dynamic state text when language changes.
        this.languageChangeListener = () => {
            this.applyI18n();
            this.renderViewer();
        };
        window.addEventListener('languagePreferenceChange', this.languageChangeListener);
    }

    private applyI18n(): void {
        const root = this.contentElement;
        if (!root) return;

        const labelFile = root.querySelector<HTMLElement>('[data-preview-label="file"]');
        if (labelFile) labelFile.textContent = translate('preview.labels.file', 'Datei');

        const labelPath = root.querySelector<HTMLElement>('[data-preview-label="path"]');
        if (labelPath) labelPath.textContent = translate('preview.labels.path', 'Pfad');

        const labelStatus = root.querySelector<HTMLElement>('[data-preview-label="status"]');
        if (labelStatus) labelStatus.textContent = translate('preview.labels.status', 'Status');

        const labelZoom = root.querySelector<HTMLElement>('[data-preview-label="zoom"]');
        if (labelZoom) labelZoom.textContent = translate('preview.labels.zoom', 'Zoom');

        const labelShortcuts = root.querySelector<HTMLElement>('[data-preview-label="shortcuts"]');
        if (labelShortcuts)
            labelShortcuts.textContent = translate('preview.labels.shortcuts', 'Shortcuts');

        const shortcutPrevNext = root.querySelector<HTMLElement>(
            '[data-preview-shortcut="prevNext"]'
        );
        if (shortcutPrevNext) {
            shortcutPrevNext.textContent = `${translate('preview.prev', 'Vorheriges Bild')} / ${translate('preview.next', 'Nächstes Bild')}`;
        }

        const shortcutZoomIn = root.querySelector<HTMLElement>('[data-preview-shortcut="zoomIn"]');
        if (shortcutZoomIn) shortcutZoomIn.textContent = translate('preview.zoomIn', 'Vergrößern');

        const shortcutZoomOut = root.querySelector<HTMLElement>(
            '[data-preview-shortcut="zoomOut"]'
        );
        if (shortcutZoomOut)
            shortcutZoomOut.textContent = translate('preview.zoomOut', 'Verkleinern');

        const emptyTitle = root.querySelector<HTMLElement>('[data-preview-empty-title]');
        if (emptyTitle)
            emptyTitle.textContent = translate('preview.noImage', 'Kein Bild ausgewählt');

        const emptyCopy = root.querySelector<HTMLElement>('[data-preview-empty-copy]');
        if (emptyCopy) {
            emptyCopy.textContent = translate(
                'preview.placeholder',
                'Öffne eine Bilddatei aus dem Sucher, um die Vorschau zu sehen.'
            );
        }

        const toolbarNavigation = root.querySelector<HTMLElement>(
            '[data-preview-toolbar="navigation"]'
        );
        if (toolbarNavigation) {
            toolbarNavigation.setAttribute(
                'aria-label',
                translate('preview.aria.toolbarNavigation', 'Preview toolbar')
            );
        }

        const toolbarFileActions = root.querySelector<HTMLElement>(
            '[data-preview-toolbar="fileActions"]'
        );
        if (toolbarFileActions) {
            toolbarFileActions.setAttribute(
                'aria-label',
                translate('preview.aria.toolbarFileActions', 'Preview file actions')
            );
        }
    }

    static focusOrCreate(config?: Partial<WindowConfig>): PreviewWindow {
        return focusOrCreateWindowByType<PreviewWindow>({
            type: 'preview',
            create: () => PreviewWindow.create(config),
        });
    }

    static create(config?: Partial<WindowConfig>): PreviewWindow {
        const windowInstance = new PreviewWindow(config);
        return showAndRegisterWindow(windowInstance);
    }

    static getActiveInstance(): PreviewWindow | null {
        const activeWindow = window.WindowRegistry?.getActiveWindow?.();
        if (activeWindow?.type === 'preview') {
            return activeWindow as PreviewWindow;
        }
        return null;
    }

    static getActiveViewerState(): ViewerState | null {
        return PreviewWindow.getActiveInstance()?.getViewerState() || null;
    }

    static openActiveImageInNewTab(): void {
        PreviewWindow.getActiveInstance()?.openCurrentImageInNewTab();
    }

    static downloadActiveImage(): void {
        PreviewWindow.getActiveInstance()?.downloadCurrentImage();
    }
}

window.PreviewWindow = PreviewWindow;
