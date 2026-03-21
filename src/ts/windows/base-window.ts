/**
 * src/ts/base-window.ts
 * Base class for multi-window system
 * Each window can contain multiple tabs with drag & drop support
 */
import type { BaseTab } from '../windows/base-tab.js';
import { getZIndexManager } from './z-index-manager.js';
import logger from '../core/logger.js';
import { WINDOW_ICONS } from './window-icons.js';
import {
    detectClientCoordinateScale,
    getLogicalViewportWidth,
    getLogicalViewportHeight,
    resolveElementLogicalPx,
    toLogicalClientPx,
    toRenderedClientPx,
} from '../utils/viewport.js';
import { createTrafficLightControlsElement } from '../framework/controls/traffic-lights.js';

export interface WindowPosition {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface WindowConfig {
    id?: string;
    type: string; // 'terminal', 'text-editor', 'finder'
    title?: string;
    position?: WindowPosition;
    tabs?: BaseTab[];
    metadata?: Record<string, unknown>;
}

export interface WindowState {
    id: string;
    type: string;
    position: WindowPosition;
    zIndex: number;
    isMinimized: boolean;
    isMaximized: boolean;
    activeTabId: string | null;
    tabs: string[]; // Tab IDs
    created: number;
    modified: number;
}

/**
 * BaseWindow - Fundament des neuen Fenster-Systems
 *
 * Überblick
 * ---------
 * Ein BaseWindow ist ein frei bewegliches, resizables „App‑Fenster“ – kein klassischer
 * Fullscreen-Modal. Jedes Fenster besitzt eine eigene Tab-Leiste und kann mehrere
 * Inhalts-Tabs (Instanzen von BaseTab) aufnehmen. Tabs lassen sich zwischen Fenstern
 * verschieben (Drag&Drop) oder in ein neues Fenster „herausziehen“.
 *
 * Ziele
 * -----
 * - Einheitliche API für Text-Editor, Terminal, Finder etc.
 * - Persistenz: Fensterzustand (Position, Größe, Tabs, aktiver Tab) wird über
 *   Session-Manager konserviert.
 * - Interop mit alter Infrastruktur: Registrierung im (legacy) WindowManager, damit
 *   MenülLeiste/ProgramLabel korrekt wechseln.
 *
 * Lebenszyklus
 * ------------
 * 1) new SubclassOfBaseWindow({...})
 * 2) show() -> erzeugt DOM, rendert Tabbar/Content, setzt Fokus/Z‑Index
 * 3) addTab()/setActiveTab() -> Tabs werden an Content‑Area angehängt
 * 4) hide()/close()/destroy()
 *
 * Erweiterung
 * -----------
 * - Subklassen überschreiben createDOM() und optional _renderTabs(), wenn eine
 *   eigene Tabbar (z. B. via WindowTabs) genutzt wird.
 * - BaseWindow kümmert sich um Drag/Resize/Fokus/Z‑Index/Session‑Save.
 */
export class BaseWindow {
    id: string;
    type: string;
    element: HTMLElement | null;
    titlebarElement: HTMLElement | null;
    contentElement: HTMLElement | null;
    position: WindowPosition;
    zIndex: number;
    isMinimized: boolean;
    isMaximized: boolean;
    tabs: Map<string, BaseTab>;
    activeTabId: string | null;
    metadata: Record<string, unknown>;
    private restoreBeforeMaximize: WindowPosition | null;
    private desktopLayoutBeforeMobile: {
        position: WindowPosition;
        isMaximized: boolean;
        snappedSide: 'left' | 'right' | null;
        restoreBeforeMaximize: WindowPosition | null;
    } | null = null;
    private dragState: {
        isDragging: boolean;
        startX: number;
        startY: number;
        offsetX: number;
        offsetY: number;
        pointerScale: number;
        lastPointerX: number | null;
    };

    private _isMobileUIMode(): boolean {
        return document.documentElement.getAttribute('data-ui-mode') === 'mobile';
    }

    private _applyResponsiveWindowLayout(): void {
        if (!this.element) return;

        if (!this._isMobileUIMode()) {
            this.element.removeAttribute('data-window-ui-mode');
            return;
        }

        // Save desktop geometry exactly once before entering mobile fill mode.
        if (!this.desktopLayoutBeforeMobile) {
            const snappedValue = this.element.dataset.snapped;
            this.desktopLayoutBeforeMobile = {
                position: {
                    x: this.position.x,
                    y: this.position.y,
                    width: this.position.width,
                    height: this.position.height,
                },
                isMaximized: this.isMaximized,
                snappedSide:
                    snappedValue === 'left' || snappedValue === 'right' ? snappedValue : null,
                restoreBeforeMaximize: this.restoreBeforeMaximize
                    ? {
                          x: this.restoreBeforeMaximize.x,
                          y: this.restoreBeforeMaximize.y,
                          width: this.restoreBeforeMaximize.width,
                          height: this.restoreBeforeMaximize.height,
                      }
                    : null,
            };
        }

        const minTop = Math.round(window.getMenuBarBottom?.() || 0);
        const dockReserve = Math.round(window.getDockReservedBottom?.() || 0);
        const maxHeight = Math.max(0, getLogicalViewportHeight() - minTop - dockReserve);
        const logicalWidth = Math.max(1, getLogicalViewportWidth());

        this.element.setAttribute('data-window-ui-mode', 'mobile');
        this.element.style.minWidth = '0px';
        this.element.style.minHeight = '0px';
        this.element.style.maxWidth = 'none';
        this.element.style.maxHeight = 'none';
        this.element.style.left = '0px';
        this.element.style.top = `${minTop}px`;
        this.element.style.width = `${logicalWidth}px`;
        this.element.style.height = `${maxHeight}px`;

        this.isMaximized = true;
        this.position.x = 0;
        this.position.y = minTop;
        this.position.width = logicalWidth;
        this.position.height = maxHeight;
    }

    private _restoreDesktopLayoutAfterMobile(): void {
        if (!this.element || !this.desktopLayoutBeforeMobile) return;

        const snapshot = this.desktopLayoutBeforeMobile;
        const target = this.element;

        target.style.minWidth = '';
        target.style.minHeight = '';
        target.style.maxWidth = '';
        target.style.maxHeight = '';
        target.style.left = `${snapshot.position.x}px`;
        target.style.top = `${snapshot.position.y}px`;
        target.style.width = `${snapshot.position.width}px`;
        target.style.height = `${snapshot.position.height}px`;

        if (snapshot.snappedSide) {
            target.dataset.snapped = snapshot.snappedSide;
        } else {
            delete target.dataset.snapped;
        }

        this.isMaximized = snapshot.isMaximized;
        this.position.x = snapshot.position.x;
        this.position.y = snapshot.position.y;
        this.position.width = snapshot.position.width;
        this.position.height = snapshot.position.height;
        this.restoreBeforeMaximize = snapshot.restoreBeforeMaximize
            ? {
                  x: snapshot.restoreBeforeMaximize.x,
                  y: snapshot.restoreBeforeMaximize.y,
                  width: snapshot.restoreBeforeMaximize.width,
                  height: snapshot.restoreBeforeMaximize.height,
              }
            : null;

        target.removeAttribute('data-window-ui-mode');
        this.desktopLayoutBeforeMobile = null;
        this._saveState();
    }

    constructor(config: WindowConfig) {
        // Set type FIRST, before generating ID (ID generation uses this.type)
        this.type = config.type;
        this.id = config.id || this._generateId();
        this.element = null;
        this.titlebarElement = null;
        this.contentElement = null;
        this.position = config.position || this._getDefaultPosition();
        this.zIndex = 1000;
        this.isMinimized = false;
        this.isMaximized = false;
        this.tabs = new Map();
        this.activeTabId = null;
        this.metadata = config.metadata || {};
        this.restoreBeforeMaximize = null;
        this.dragState = {
            isDragging: false,
            startX: 0,
            startY: 0,
            offsetX: 0,
            offsetY: 0,
            pointerScale: 1,
            lastPointerX: null,
        };

        // Add initial tabs if provided
        if (config.tabs) {
            config.tabs.forEach(tab => this.addTab(tab));
        }
    }

    private _generateId(): string {
        return `window-${this.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private _getDefaultPosition(): WindowPosition {
        // Center window with slight offset for multiple windows
        const offset = Math.random() * 100 - 50;
        return {
            x: getLogicalViewportWidth() / 2 - 400 + offset,
            y: getLogicalViewportHeight() / 2 - 300 + offset,
            width: 800,
            height: 600,
        };
    }

    /**
     * Create the window DOM element.
     * Subklassen können überschreiben, wenn z. B. eine dedizierte Tabbar
     * oder zusätzliche UI‑Elemente nötig sind. Wichtig: setze this.element,
     * this.titlebarElement und this.contentElement.
     */
    createDOM(): HTMLElement {
        // Create window container (no modal overlay - this is a floating window, not a modal dialog)
        const windowEl = document.createElement('div');
        windowEl.id = this.id;
        // Add 'modal' class for compatibility with existing focus/z-index management
        windowEl.className =
            'modal multi-window hidden fixed bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg flex flex-col max-h-[90vh] min-w-[560px] min-h-[360px]';
        windowEl.setAttribute('role', 'dialog');
        windowEl.setAttribute('aria-modal', 'false'); // Not a modal

        // Override modal pointer-events: none
        windowEl.style.pointerEvents = 'auto';

        // Set position and size
        windowEl.style.left = `${this.position.x}px`;
        windowEl.style.top = `${this.position.y}px`;
        windowEl.style.width = `${this.position.width}px`;
        windowEl.style.height = `${this.position.height}px`;
        windowEl.style.zIndex = String(this.zIndex);

        // Titlebar (draggable) – enthält die drei Mac‑Kontrollpunkte und die window‑Überschrift
        this.titlebarElement = this._createTitlebar();
        windowEl.appendChild(this.titlebarElement);

        // Tab bar container
        const tabBar = document.createElement('div');
        tabBar.id = `${this.id}-tabs`;
        tabBar.className = 'window-tab-bar';
        windowEl.appendChild(tabBar);

        // Content area
        this.contentElement = document.createElement('div');
        this.contentElement.id = `${this.id}-content`;
        this.contentElement.className = 'flex-1 overflow-hidden';
        windowEl.appendChild(this.contentElement);

        this.element = windowEl;

        // Beweglichkeit / Fokus / Größe
        this._attachDragHandlers();
        this._attachFocusHandler();
        this._attachResizeHandlers();

        // Register with legacy WindowManager for menubar integration
        this._registerWithWindowManager();

        // Apply i18n translations to window elements
        const W = window;
        if (W.appI18n && typeof W.appI18n.applyTranslations === 'function') {
            W.appI18n.applyTranslations(windowEl);
        }

        return windowEl;
    }

    /**
     * Baut die Titelleiste inklusive Close/Minimize/Maximize „Dots“.
     * Events sind an BaseWindow‑Methoden gebunden (close/minimize/toggleMaximize).
     */
    private _createTitlebar(): HTMLElement {
        const titlebar = document.createElement('div');
        titlebar.className =
            'window-titlebar flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-t-lg draggable-header cursor-move';

        // Window controls (macOS style: close, minimize, maximize as dots)
        const controls = createTrafficLightControlsElement({
            close: {
                title: 'Schließen',
                i18nTitleKey: 'common.close',
                onClick: () => this.close(),
            },
            minimize: {
                title: 'Minimieren',
                i18nTitleKey: 'menuItems.window.minimize',
                onClick: () => this.minimize(),
            },
            maximize: {
                title: 'Füllen',
                i18nTitleKey: 'menu.window.zoom',
                onClick: () => this.toggleMaximize(),
            },
        });

        // Title
        const title = document.createElement('h2');
        title.className = 'ml-4 font-semibold text-gray-700 dark:text-gray-300 no-select';

        // Set i18n key based on window type
        // Map text-editor to text for i18n key
        const typeKey = this.type === 'text-editor' ? 'text' : this.type;
        const titleKey = `desktop.${typeKey}`;
        title.setAttribute('data-i18n', titleKey);
        title.textContent = (this.metadata.title as string | undefined) || this.type; // Fallback before i18n

        titlebar.appendChild(controls);
        titlebar.appendChild(title);

        return titlebar;
    }

    /**
     * Ermöglicht Dragging des Fensters über die Titelleiste.
     * Speicherung der Position erfolgt am Ende des Drags via _saveState().
     */
    private _attachDragHandlers(): void {
        if (!this.titlebarElement) return;

        this.titlebarElement.addEventListener('mousedown', (e: MouseEvent) => {
            if (this._isMobileUIMode()) return;
            if ((e.target as HTMLElement).tagName === 'BUTTON') return; // Ignore control buttons

            const currentRect = this.element?.getBoundingClientRect();
            this.dragState.pointerScale = currentRect
                ? detectClientCoordinateScale(e.clientX, e.clientY, currentRect)
                : 1;
            const pointerX = toLogicalClientPx(e.clientX, this.dragState.pointerScale);
            const pointerY = toLogicalClientPx(e.clientY, this.dragState.pointerScale);
            const renderedPointerX = toRenderedClientPx(e.clientX, this.dragState.pointerScale);

            if (
                this.element &&
                currentRect &&
                (this.element.dataset.snapped === 'left' ||
                    this.element.dataset.snapped === 'right')
            ) {
                const snappedLeft = resolveElementLogicalPx(this.element, 'left', currentRect.left);
                const snappedTop = resolveElementLogicalPx(this.element, 'top', currentRect.top);
                const snappedWidth = Math.max(
                    1,
                    resolveElementLogicalPx(this.element, 'width', currentRect.width)
                );
                const snappedHeight = Math.max(
                    1,
                    resolveElementLogicalPx(this.element, 'height', currentRect.height)
                );
                const preservedOffsetX = Math.max(
                    0,
                    Math.min(snappedWidth, pointerX - snappedLeft)
                );
                const preservedOffsetY = Math.max(
                    0,
                    Math.min(snappedHeight, pointerY - snappedTop)
                );

                this._unsnap();

                const restoredRect = this.element.getBoundingClientRect();
                const restoredWidth = Math.max(
                    1,
                    resolveElementLogicalPx(this.element, 'width', restoredRect.width)
                );
                const restoredHeight = Math.max(
                    1,
                    resolveElementLogicalPx(this.element, 'height', restoredRect.height)
                );
                const clampedOffsetX = Math.max(0, Math.min(restoredWidth, preservedOffsetX));
                const clampedOffsetY = Math.max(0, Math.min(restoredHeight, preservedOffsetY));
                const minTop = window.getMenuBarBottom?.() || 0;
                const dockReserve = Math.round(window.getDockReservedBottom?.() || 0);
                const maxLeft = Math.max(0, getLogicalViewportWidth() - restoredWidth);
                const maxTop = Math.max(
                    minTop,
                    getLogicalViewportHeight() - dockReserve - restoredHeight
                );
                const restoredLeft = Math.max(0, Math.min(maxLeft, pointerX - clampedOffsetX));
                const restoredTop = Math.max(minTop, Math.min(maxTop, pointerY - clampedOffsetY));

                this.element.style.left = `${Math.round(restoredLeft)}px`;
                this.element.style.top = `${Math.round(restoredTop)}px`;
                this.position.x = Math.round(restoredLeft);
                this.position.y = Math.round(restoredTop);
            }

            this.dragState.isDragging = true;
            this.dragState.startX = pointerX;
            this.dragState.startY = pointerY;
            this.dragState.lastPointerX = renderedPointerX;

            const element = this.element;
            const rect = element?.getBoundingClientRect();
            if (element && rect) {
                this.dragState.offsetX =
                    this.dragState.startX - resolveElementLogicalPx(element, 'left', rect.left);
                this.dragState.offsetY =
                    this.dragState.startY - resolveElementLogicalPx(element, 'top', rect.top);
            }

            e.preventDefault();
        });

        this.titlebarElement.addEventListener('dblclick', (e: MouseEvent) => {
            if (this._isMobileUIMode()) return;
            const target = e.target as HTMLElement | null;
            if (target?.closest('button, a, input, select, textarea, [role="button"]')) {
                return;
            }

            this.bringToFront();
            const action = window.DockSystem?.getTitlebarDoubleClickAction?.() || 'zoom';
            if (action === 'minimize') {
                this.minimize();
            } else {
                this.toggleMaximize();
            }
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e: MouseEvent) => {
            if (!this.dragState.isDragging || !this.element) return;

            const pointerX = toLogicalClientPx(e.clientX, this.dragState.pointerScale);
            const pointerY = toLogicalClientPx(e.clientY, this.dragState.pointerScale);
            const renderedPointerX = toRenderedClientPx(e.clientX, this.dragState.pointerScale);
            const newX = pointerX - this.dragState.offsetX;
            const minTop = window.getMenuBarBottom?.() || 0;
            const newY = Math.max(minTop, pointerY - this.dragState.offsetY);

            this.position.x = newX;
            this.position.y = newY;
            this.dragState.lastPointerX = renderedPointerX;

            this._updatePosition();

            const candidate = this._getSnapCandidate(this.element, this.dragState.lastPointerX);
            if (candidate) window.showSnapPreview?.(candidate);
            else window.hideSnapPreview?.();
        });

        document.addEventListener('mouseup', (e: MouseEvent) => {
            if (this.dragState.isDragging) {
                this.dragState.isDragging = false;
                const target = this.element;
                if (target) {
                    this.dragState.lastPointerX = toRenderedClientPx(
                        e.clientX,
                        this.dragState.pointerScale
                    );
                    const candidate = this._getSnapCandidate(target, this.dragState.lastPointerX);
                    if (candidate) this._snapTo(candidate);
                    window.hideSnapPreview?.();
                }
                this.dragState.pointerScale = 1;
                this.dragState.lastPointerX = null;
                this._saveState();
            }
        });
    }

    private _getSnapCandidate(
        target: HTMLElement | null,
        pointerX: number | null
    ): 'left' | 'right' | null {
        if (!target) return null;

        // Snap detection uses rendered coordinates (clientX + getBoundingClientRect)
        // and therefore intentionally relies on window.innerWidth.
        const viewportWidth = Math.max(window.innerWidth || 0, 0);
        if (viewportWidth <= 0) return null;

        const threshold = Math.max(3, Math.min(14, viewportWidth * 0.0035));
        const rect = target.getBoundingClientRect();

        const pointerDistLeft =
            typeof pointerX === 'number' ? Math.abs(pointerX) : Math.abs(rect.left);
        if (Math.abs(rect.left) <= threshold || pointerDistLeft <= threshold) return 'left';

        const distRight = viewportWidth - rect.right;
        const pointerDistRight =
            typeof pointerX === 'number' ? Math.abs(viewportWidth - pointerX) : Math.abs(distRight);
        if (Math.abs(distRight) <= threshold || pointerDistRight <= threshold) return 'right';

        return null;
    }

    private _snapTo(side: 'left' | 'right'): void {
        const target = this.element;
        if (!target) return;

        this.isMaximized = false;

        if (!target.dataset.snapped) {
            const rect = target.getBoundingClientRect();
            target.dataset.prevSnapLeft = `${Math.round(resolveElementLogicalPx(target, 'left', rect.left))}`;
            target.dataset.prevSnapTop = `${Math.round(resolveElementLogicalPx(target, 'top', rect.top))}`;
            target.dataset.prevSnapWidth = `${Math.round(resolveElementLogicalPx(target, 'width', rect.width))}`;
            target.dataset.prevSnapHeight = `${Math.round(resolveElementLogicalPx(target, 'height', rect.height))}`;
        }

        const metrics = window.computeSnapMetrics?.(side);
        if (!metrics) return;

        // Snap should consume the full computed area; the default 90vh cap would otherwise
        // leave a visible gap to the dock/bottom edge.
        target.style.minWidth = '0px';
        target.style.minHeight = '0px';
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

    /**
     * Reflow policy for managed layouts (snap/maximize) after viewport size changes.
     * Free-positioned windows are intentionally left untouched.
     */
    handleViewportResize(): void {
        const target = this.element;
        if (!target || target.classList.contains('hidden')) return;

        if (!this._isMobileUIMode() && target.getAttribute('data-window-ui-mode') === 'mobile') {
            this._restoreDesktopLayoutAfterMobile();
            return;
        }

        if (this._isMobileUIMode()) {
            this._applyResponsiveWindowLayout();
            return;
        }

        const snappedSide = target.dataset.snapped;
        if (snappedSide === 'left' || snappedSide === 'right') {
            const metrics = window.computeSnapMetrics?.(snappedSide);
            if (!metrics) return;

            target.style.minWidth = '0px';
            target.style.minHeight = '0px';
            target.style.maxWidth = 'none';
            target.style.maxHeight = 'none';
            target.style.position = 'fixed';
            target.style.left = `${metrics.left}px`;
            target.style.top = `${metrics.top}px`;
            target.style.width = `${metrics.width}px`;
            target.style.height = `${metrics.height}px`;

            this.position.x = metrics.left;
            this.position.y = metrics.top;
            this.position.width = metrics.width;
            this.position.height = metrics.height;
            return;
        }

        if (!this.isMaximized) return;

        const minTop = Math.round(window.getMenuBarBottom?.() || 0);
        const dockReserve = Math.round(window.getDockReservedBottom?.() || 0);
        // In maximize mode we must always fit the currently available viewport area,
        // even when it is smaller than the normal window minimum height.
        const maxHeight = Math.max(0, getLogicalViewportHeight() - minTop - dockReserve);

        target.style.minWidth = '0px';
        target.style.minHeight = '0px';
        target.style.maxWidth = 'none';
        target.style.maxHeight = 'none';
        target.style.left = '0px';
        target.style.top = `${minTop}px`;
        target.style.width = `${getLogicalViewportWidth() || this.position.width}px`;
        target.style.height = `${maxHeight}px`;

        const logicalWidth = getLogicalViewportWidth();
        this.position.x = 0;
        this.position.y = minTop;
        this.position.width = logicalWidth || this.position.width;
        this.position.height = maxHeight;
    }

    private _unsnap(): void {
        const target = this.element;
        if (!target) return;
        if (!(target.dataset.snapped === 'left' || target.dataset.snapped === 'right')) return;

        const restoreLeft = Number.parseFloat(target.dataset.prevSnapLeft || '');
        const restoreTop = Number.parseFloat(target.dataset.prevSnapTop || '');
        const restoreWidth = Number.parseFloat(target.dataset.prevSnapWidth || '');
        const restoreHeight = Number.parseFloat(target.dataset.prevSnapHeight || '');

        const hasRestore =
            Number.isFinite(restoreLeft) &&
            Number.isFinite(restoreTop) &&
            Number.isFinite(restoreWidth) &&
            Number.isFinite(restoreHeight);

        if (hasRestore) {
            target.style.minWidth = '';
            target.style.minHeight = '';
            target.style.maxWidth = '';
            target.style.maxHeight = '';
            target.style.position = 'fixed';
            target.style.left = `${Math.round(restoreLeft)}px`;
            target.style.top = `${Math.round(restoreTop)}px`;
            target.style.width = `${Math.round(restoreWidth)}px`;
            target.style.height = `${Math.round(restoreHeight)}px`;

            this.position.x = Math.round(restoreLeft);
            this.position.y = Math.round(restoreTop);
            this.position.width = Math.round(restoreWidth);
            this.position.height = Math.round(restoreHeight);
        }

        delete target.dataset.snapped;
        delete target.dataset.prevSnapLeft;
        delete target.dataset.prevSnapTop;
        delete target.dataset.prevSnapWidth;
        delete target.dataset.prevSnapHeight;
    }

    /**
     * Klick in das Fenster bringt es nach vorne und aktualisiert Menubar‑Status.
     */
    private _attachFocusHandler(): void {
        if (!this.element) return;

        // Bring window to front when clicked anywhere
        this.element.addEventListener('mousedown', () => {
            this.bringToFront();
        });
    }

    /**
     * Fügt 8 Resize‑Griffe hinzu (N, S, E, W sowie Ecken).
     * Während des Resizings wird ein Overlay gesetzt, um Mouse‑Events zuverlässig
     * zu capturen. Mindestgrößen werden berücksichtigt.
     */
    private _attachResizeHandlers(): void {
        if (!this.element) return;

        // Remove existing resize handles
        const existingHandles = this.element.querySelectorAll('.resizer');
        existingHandles.forEach(handle => handle.remove());

        type ResizeHandle = {
            name: string;
            cursor: string;
            directions: ('n' | 's' | 'e' | 'w')[];
            style?: Record<string, string>;
        };

        const createHandle = (handle: ResizeHandle) => {
            const resizer = document.createElement('div');
            resizer.classList.add('resizer', `resizer-${handle.name}`);
            Object.assign(resizer.style, {
                position: 'absolute',
                zIndex: '9999',
                // Safari can ignore fully transparent hit-targets for cursor feedback.
                // Keep this effectively invisible but still reliably hit-testable.
                backgroundColor: 'rgba(0, 0, 0, 0.001)',
                pointerEvents: 'auto',
                touchAction: 'none',
                cursor: handle.cursor,
                ...(handle.style || {}),
            });

            this.element!.appendChild(resizer);

            const startResize = (event: MouseEvent) => {
                if (this._isMobileUIMode()) return;
                event.preventDefault();
                event.stopPropagation();

                this.bringToFront();

                const startX = event.clientX;
                const startY = event.clientY;
                const rect = this.element!.getBoundingClientRect();
                const computed = window.getComputedStyle(this.element!);
                const minWidth = parseFloat(computed.minWidth) || 560;
                const minHeight = parseFloat(computed.minHeight) || 360;

                let startLeft = parseFloat(computed.left);
                let startTop = parseFloat(computed.top);
                if (!Number.isFinite(startLeft)) startLeft = rect.left;
                if (!Number.isFinite(startTop)) startTop = rect.top;

                const startWidth = rect.width;
                const startHeight = rect.height;

                // Create overlay to capture mouse events
                const overlay = document.createElement('div');
                Object.assign(overlay.style, {
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    zIndex: '9999',
                    cursor: handle.cursor,
                    backgroundColor: 'transparent',
                    touchAction: 'none',
                });
                document.body.appendChild(overlay);

                let resizing = true;

                const applySize = (clientX: number, clientY: number) => {
                    if (!resizing) return;

                    window.requestAnimationFrame(() => {
                        const dx = clientX - startX;
                        const dy = clientY - startY;
                        let newWidth = startWidth;
                        let newHeight = startHeight;
                        let newLeft = startLeft;
                        let newTop = startTop;

                        // Apply direction-based changes
                        if (handle.directions.includes('e')) newWidth = startWidth + dx;
                        if (handle.directions.includes('s')) newHeight = startHeight + dy;
                        if (handle.directions.includes('w')) {
                            newWidth = startWidth - dx;
                            newLeft = startLeft + dx;
                        }
                        if (handle.directions.includes('n')) {
                            newHeight = startHeight - dy;
                            newTop = startTop + dy;
                        }

                        // Enforce minimum size
                        if (newWidth < minWidth) {
                            const deficit = minWidth - newWidth;
                            if (handle.directions.includes('w')) newLeft -= deficit;
                            newWidth = minWidth;
                        }
                        if (newHeight < minHeight) {
                            const deficit = minHeight - newHeight;
                            if (handle.directions.includes('n')) newTop -= deficit;
                            newHeight = minHeight;
                        }

                        // Enforce menu bar boundary
                        const minTop = window.getMenuBarBottom?.() || 0;
                        if (handle.directions.includes('n') && newTop < minTop) {
                            const overshoot = minTop - newTop;
                            newTop = minTop;
                            newHeight = Math.max(minHeight, newHeight - overshoot);
                        }

                        // Apply new size and position
                        if (handle.directions.includes('w') || handle.directions.includes('e')) {
                            this.element!.style.width = Math.max(minWidth, newWidth) + 'px';
                            this.position.width = Math.max(minWidth, newWidth);
                        }
                        if (handle.directions.includes('s') || handle.directions.includes('n')) {
                            this.element!.style.height = Math.max(minHeight, newHeight) + 'px';
                            this.position.height = Math.max(minHeight, newHeight);
                        }
                        if (handle.directions.includes('w')) {
                            this.element!.style.left = newLeft + 'px';
                            this.position.x = newLeft;
                        }
                        if (handle.directions.includes('n')) {
                            this.element!.style.top = newTop + 'px';
                            this.position.y = newTop;
                        }
                    });
                };

                const stopResize = () => {
                    if (!resizing) return;
                    resizing = false;
                    overlay.remove();
                    overlay.removeEventListener('mousemove', overlayMouseMove);
                    overlay.removeEventListener('mouseup', overlayMouseUp);
                    window.removeEventListener('mousemove', windowMouseMove);
                    window.removeEventListener('mouseup', windowMouseUp);
                    window.removeEventListener('blur', onBlur);

                    // Save state after resize
                    this._saveState();
                };

                const overlayMouseMove = (moveEvent: MouseEvent) =>
                    applySize(moveEvent.clientX, moveEvent.clientY);
                const windowMouseMove = (moveEvent: MouseEvent) =>
                    applySize(moveEvent.clientX, moveEvent.clientY);
                const overlayMouseUp = () => stopResize();
                const windowMouseUp = () => stopResize();
                const onBlur = () => stopResize();

                overlay.addEventListener('mousemove', overlayMouseMove);
                overlay.addEventListener('mouseup', overlayMouseUp);
                window.addEventListener('mousemove', windowMouseMove);
                window.addEventListener('mouseup', windowMouseUp);
                window.addEventListener('blur', onBlur);
            };

            resizer.addEventListener('mousedown', startResize);
        };

        // Resize handles (8 directions)
        const handles: ResizeHandle[] = [
            {
                name: 'top',
                cursor: 'n-resize',
                directions: ['n'],
                style: { top: '0', left: '10px', right: '10px', height: '10px' },
            },
            {
                name: 'bottom',
                cursor: 's-resize',
                directions: ['s'],
                style: { bottom: '0', left: '10px', right: '10px', height: '10px' },
            },
            {
                name: 'left',
                cursor: 'w-resize',
                directions: ['w'],
                style: { left: '0', top: '10px', bottom: '10px', width: '10px' },
            },
            {
                name: 'right',
                cursor: 'e-resize',
                directions: ['e'],
                style: { right: '0', top: '10px', bottom: '10px', width: '10px' },
            },
            {
                name: 'top-left',
                cursor: 'nw-resize',
                directions: ['n', 'w'],
                style: { top: '0', left: '0', width: '14px', height: '14px' },
            },
            {
                name: 'top-right',
                cursor: 'ne-resize',
                directions: ['n', 'e'],
                style: { top: '0', right: '0', width: '14px', height: '14px' },
            },
            {
                name: 'bottom-left',
                cursor: 'sw-resize',
                directions: ['s', 'w'],
                style: { bottom: '0', left: '0', width: '14px', height: '14px' },
            },
            {
                name: 'bottom-right',
                cursor: 'se-resize',
                directions: ['s', 'e'],
                style: { bottom: '0', right: '0', width: '14px', height: '14px' },
            },
        ];

        handles.forEach(createHandle);
    }

    private _updatePosition(): void {
        if (!this.element) return;

        // Update position on the window element itself
        this.element.style.left = `${this.position.x}px`;
        this.element.style.top = `${this.position.y}px`;
    }

    /**
     * Fenster anzeigen. Erzeugt bei Bedarf das DOM, hängt Tabs an die Content‑Area an
     * und ruft bringToFront() + Menubar‑Update. Persistiert den Zustand.
     */
    show(): void {
        if (!this.element) {
            this.createDOM();
            document.body.appendChild(this.element!);

            // Append all existing tabs to content area
            if (this.contentElement) {
                this.tabs.forEach(tab => {
                    if (tab.element && !this.contentElement!.contains(tab.element)) {
                        this.contentElement!.appendChild(tab.element);
                    }
                });
            }
        }

        if (this.element) {
            const domUtils = window.DOMUtils;
            if (domUtils && typeof domUtils.show === 'function') {
                domUtils.show(this.element);
            } else {
                this.element.classList.remove('hidden');
            }
            this._applyResponsiveWindowLayout();
        }
        this.bringToFront();
        // Update menubar to reflect new active window
        const W = window;
        W.updateProgramLabelByTopModal?.();
        W.updateDockIndicators?.();
        this._saveState();
    }

    /**
     * Fenster ausblenden und Menubar entsprechend aktualisieren.
     */
    hide(): void {
        this.element?.classList.add('hidden');
        // Update menubar to reflect next top window
        const W = window;
        W.updateProgramLabelByTopModal?.();
        const menuSystem = W.MenuSystem;
        if (menuSystem?.renderApplicationMenu) {
            const current = menuSystem.getCurrentMenuModalId?.();
            menuSystem.renderApplicationMenu(current);
        }
        this._saveState();
    }

    /**
     * Fenster schließen. Übergibt die endgültige Entfernung an den WindowRegistry,
     * sodass dieser Aufräumarbeiten übernehmen kann.
     */
    close(): void {
        this.hide();

        // Remove from z-index manager stack
        const W = window;
        const zIndexManager = getZIndexManager();
        zIndexManager.removeWindow(this.id);

        // WindowRegistry will handle cleanup
        if (W.WindowRegistry) {
            W.WindowRegistry.removeWindow?.(this.id);
        }

        // Update dock indicators after window is closed
        W.updateDockIndicators?.();
        // Refresh menus after closing in case active app changes
        const menuSystem = W.MenuSystem;
        if (menuSystem?.renderApplicationMenu) {
            const current = menuSystem.getCurrentMenuModalId?.();
            menuSystem.renderApplicationMenu(current);
        }
    }

    /**
     * Fenster minimieren (aktuell nur Hide + Flag). Integration in Dock/Taskbar
     * kann später hier erfolgen.
     */
    minimize(): void {
        this.isMinimized = true;
        if (
            this.element &&
            window.DockSystem?.animateWindowMinimize?.(this.element, this.id, () => this.hide())
        ) {
            return;
        }
        this.hide();
    }

    /**
     * Zentriert das Fenster innerhalb des verfügbaren Viewports zwischen Menüleiste und Dock.
     */
    center(): void {
        if (!this.element) return;

        if (this.isMaximized) {
            this.isMaximized = false;
            this.element.style.minWidth = '';
            this.element.style.minHeight = '';
            this.element.style.maxWidth = '';
            this.element.style.maxHeight = '';
            this.element.style.width = `${this.position.width}px`;
            this.desktopLayoutBeforeMobile = null;
            this.element.style.height = `${this.position.height}px`;
        }

        // getLogicalViewportWidth() normalisiert CSS zoom — window.innerWidth allein wäre
        // bei zoom != 1 die physische Breite, nicht die logische DOM-Breite.
        const viewportWidth = Math.max(getLogicalViewportWidth(), this.position.width);
        const minTop = Math.round(window.getMenuBarBottom?.() || 0);
        const dockReserve = Math.round(window.getDockReservedBottom?.() || 0);
        const availableHeight = Math.max(
            this.position.height,
            getLogicalViewportHeight() - minTop - dockReserve
        );

        this.position.x = Math.max(0, Math.round((viewportWidth - this.position.width) / 2));
        this.position.y =
            minTop + Math.max(0, Math.round((availableHeight - this.position.height) / 2));

        this.element.style.left = `${this.position.x}px`;
        this.element.style.top = `${this.position.y}px`;
        this.element.style.width = `${this.position.width}px`;
        this.element.style.height = `${this.position.height}px`;

        this.bringToFront();
        this._saveState();
    }

    /**
     * Maximieren/Restore. Skaliert das eigentliche Fenster-Root und nutzt die
     * zuletzt bekannte Fensterposition als Restore-Zustand.
     */
    toggleMaximize(): void {
        this.isMaximized = !this.isMaximized;

        if (!this.element) return;
        const windowEl = this.element;

        if (this.isMaximized) {
            const rect = windowEl.getBoundingClientRect();
            const currentLeft = parseFloat(windowEl.style.left);
            const currentTop = parseFloat(windowEl.style.top);
            const resolvedLeft = Number.isFinite(currentLeft)
                ? currentLeft
                : resolveElementLogicalPx(windowEl, 'left', rect.left);
            const resolvedTop = Number.isFinite(currentTop)
                ? currentTop
                : resolveElementLogicalPx(windowEl, 'top', rect.top);
            const currentWidth = parseFloat(windowEl.style.width);
            const currentHeight = parseFloat(windowEl.style.height);
            this.restoreBeforeMaximize = {
                x: Math.round(resolvedLeft),
                y: Math.round(resolvedTop),
                width: Math.round(
                    Number.isFinite(currentWidth)
                        ? currentWidth
                        : resolveElementLogicalPx(
                              windowEl,
                              'width',
                              rect.width || this.position.width
                          )
                ),
                height: Math.round(
                    Number.isFinite(currentHeight)
                        ? currentHeight
                        : resolveElementLogicalPx(
                              windowEl,
                              'height',
                              rect.height || this.position.height
                          )
                ),
            };

            const minTop = Math.round(window.getMenuBarBottom?.() || 0);
            const dockReserve = Math.round(window.getDockReservedBottom?.() || 0);
            // Maximized windows should fit exactly into the menu/dock-constrained viewport.
            const maxHeight = Math.max(0, getLogicalViewportHeight() - minTop - dockReserve);

            windowEl.style.minWidth = '0px';
            windowEl.style.minHeight = '0px';
            windowEl.style.maxWidth = 'none';
            windowEl.style.maxHeight = 'none';
            windowEl.style.left = '0px';
            windowEl.style.top = `${minTop}px`;
            windowEl.style.width = `${getLogicalViewportWidth() || this.position.width}px`;
            windowEl.style.height = `${maxHeight}px`;
        } else {
            const restore = this.restoreBeforeMaximize || this.position;
            windowEl.style.minWidth = '';
            windowEl.style.minHeight = '';
            windowEl.style.maxWidth = '';
            windowEl.style.maxHeight = '';
            windowEl.style.left = `${restore.x}px`;
            windowEl.style.top = `${restore.y}px`;
            windowEl.style.width = `${restore.width}px`;
            windowEl.style.height = `${restore.height}px`;

            this.position = { ...restore };
            this.restoreBeforeMaximize = null;
        }

        this._saveState();
    }

    /**
     * Nach vorne holen. Nutzt bevorzugt den (legacy) __zIndexManager, ansonsten
     * WindowRegistry.getNextZIndex(). Aktualisiert die Menubar.
     */
    bringToFront(): void {
        const W = window;
        const zIndexManager = getZIndexManager();
        zIndexManager.bringToFront(this.id, this.element, this.element);
        // Sync local zIndex with DOM assignment
        if (this.element) {
            const currentZ = parseInt(this.element.style.zIndex || '0', 10);
            if (!Number.isNaN(currentZ)) this.zIndex = currentZ;
        }
        // Notify menubar about focus change
        // Track active window in WindowRegistry if available
        W.WindowRegistry?.setActiveWindow?.(this.id);
        W.updateProgramLabelByTopModal?.();
        W.updateDockIndicators?.();
        // Refresh dynamic application menu (e.g. switch to Terminal menu)
        const menuSystem = W.MenuSystem;
        if (menuSystem?.renderApplicationMenu) {
            // Pass current menu modal id so sections rebuild with new active context
            const current = menuSystem.getCurrentMenuModalId?.();
            menuSystem.renderApplicationMenu(current);
        }
    }

    /**
     * Tab hinzufügen. Erzeugt bei Bedarf dessen DOM und hängt ihn in die Content‑Area.
     * Falls noch kein aktiver Tab existiert, wird dieser gesetzt. Rendert die Tabbar neu
     * und speichert den Zustand.
     */
    addTab(tab: BaseTab): void {
        this.tabs.set(tab.id, tab);
        tab.setParentWindow(this);

        // Create tab DOM if not exists
        if (!tab.element) {
            tab.element = tab.createDOM();
        }

        // Append tab content to window content area (only if window DOM exists)
        if (tab.element && this.contentElement) {
            this.contentElement.appendChild(tab.element);
        }
        // If window DOM doesn't exist yet, tab will be added when show() is called

        if (!this.activeTabId) {
            this.setActiveTab(tab.id);
        }

        this._renderTabs();
        this._saveState();
    }

    /**
     * Tab entfernen und ggf. anderen Tab aktivieren. Bei Leere wird das Fenster
     * automatisch geschlossen.
     */
    removeTab(tabId: string): void {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        tab.destroy();
        this.tabs.delete(tabId);

        // If this was the active tab, activate another
        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            this.activeTabId = remainingTabs[0] || null;
            if (this.activeTabId) {
                this.setActiveTab(this.activeTabId);
            }
        }

        // If no tabs left, close window
        if (this.tabs.size === 0) {
            this.close();
        } else {
            this._renderTabs();
            // Force DOM update to complete before saving state
            // This ensures tests can observe the updated tab count immediately
            requestAnimationFrame(() => {
                this._saveState();
            });
        }
    }

    /**
     * Tab abkoppeln (z. B. für Drag&Drop in anderes Fenster). Der Tab bleibt bestehen,
     * wird aber aus diesem Fenster entfernt und versteckt.
     */
    detachTab(tabId: string): BaseTab | null {
        const tab = this.tabs.get(tabId) || null;
        if (!tab) return null;

        // Hide but do not destroy
        tab.hide();
        tab.setParentWindow(null);
        this.tabs.delete(tabId);

        // Adjust active tab
        if (this.activeTabId === tabId) {
            const remaining = Array.from(this.tabs.keys());
            this.activeTabId = remaining[0] || null;
            if (this.activeTabId) this.setActiveTab(this.activeTabId);
        }

        if (this.tabs.size === 0) {
            this.close();
        } else {
            this._renderTabs();
            // Force DOM update to complete before saving state
            requestAnimationFrame(() => {
                this._saveState();
            });
        }

        return tab;
    }

    /**
     * Tab in ein Ziel‑Fenster verschieben.
     */
    transferTabTo(target: BaseWindow, tabId: string): void {
        const tab = this.detachTab(tabId);
        if (tab) {
            target.addTab(tab);
            target.setActiveTab(tab.id);
        }
    }

    /**
     * Aktiven Tab setzen (zeigt diesen und versteckt alle anderen).
     */
    setActiveTab(tabId: string): void {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        // Hide all tabs
        this.tabs.forEach(t => t.hide());

        // Show active tab
        this.activeTabId = tabId;
        tab.show();

        this._renderTabs();
        this._saveState();
    }

    /**
     * Einfache Default‑Tabbar. Subklassen (z. B. FinderWindow/TextEditorWindow) können
     * diese Methode überschreiben und die dedizierte WindowTabs‑Leiste nutzen.
     */
    protected _renderTabs(): void {
        // Basic implementation - subclasses should override
        const tabBar = this.element?.querySelector(`#${this.id}-tabs`);
        if (!tabBar) return;

        tabBar.innerHTML = '';

        this.tabs.forEach(tab => {
            const tabEl = document.createElement('button');
            tabEl.className = `px-3 py-1 text-sm ${tab.id === this.activeTabId ? 'bg-white dark:bg-gray-900' : 'bg-gray-200 dark:bg-gray-800'}`;
            tabEl.textContent = tab.title;
            tabEl.addEventListener('click', () => this.setActiveTab(tab.id));

            tabBar.appendChild(tabEl);
        });
    }

    /**
     * Public entry point to trigger a tab bar re-render.
     * Called by BaseTab when the tab title changes.
     */
    requestTabsRender(): void {
        this._renderTabs();
    }

    /**
     * Public entry point to trigger a session state save.
     * Called by contained tabs when their content state changes.
     */
    requestSave(): void {
        this._saveState();
    }

    /**
     * Serialisierung des Fensterzustands (für Session‑Restore).
     */
    serialize(): WindowState {
        return {
            id: this.id,
            type: this.type,
            position: { ...this.position },
            zIndex: this.zIndex,
            isMinimized: this.isMinimized,
            isMaximized: this.isMaximized,
            activeTabId: this.activeTabId,
            tabs: Array.from(this.tabs.keys()),
            created: (this.metadata.created as number | undefined) ?? Date.now(),
            modified: Date.now(),
        };
    }

    /**
     * Rehydrierung aus persistiertem Zustand. Subklassen können eigene
     * deserialize‑Routinen bereitstellen.
     */
    static deserialize(state: WindowState): BaseWindow {
        const window = new BaseWindow({
            id: state.id,
            type: state.type,
            position: state.position,
            metadata: {
                created: state.created,
            },
        });

        window.zIndex = state.zIndex;
        window.isMinimized = state.isMinimized;
        window.isMaximized = state.isMaximized;
        window.activeTabId = state.activeTabId;

        return window;
    }

    protected _saveState(): void {
        const W = window;

        // Trigger multi-window session save (debounced)
        if (W.MultiWindowSessionManager) {
            W.MultiWindowSessionManager.saveSession?.();
        }

        // Legacy session manager (for backwards compatibility)
        if (W.SessionManager) {
            W.SessionManager.saveWindowState?.(this.serialize());
        }
    }

    /**
     * Vollständiges Aufräumen: Tabs zerstören, DOM entfernen, Menubar aktualisieren
     * und Session speichern.
     */
    destroy(): void {
        // Destroy all tabs
        this.tabs.forEach(tab => tab.destroy());
        this.tabs.clear();

        // Remove DOM
        if (this.element) {
            this.element.remove();
            this.element = null;
        }

        this._saveState();
        // Update menubar after destruction
        const W = window;
        W.updateProgramLabelByTopModal?.();
    }

    /**
     * Registrierung im (legacy) WindowManager, damit ProgramLabel/Anwendungsmenüs
     * korrekt auf das aktive Fenster gemappt werden. Diese Brücke hält die neue
     * Multi‑Window‑Welt kompatibel zur bestehenden Menubar.
     */
    private _registerWithWindowManager(): void {
        const W = window;
        const WM = W.WindowManager;
        if (!WM || typeof WM.getConfig !== 'function' || typeof WM.register !== 'function') return;
        if (WM.getConfig(this.id)) return; // already registered

        // Map window types to programKey/icon used by the menubar
        const map: Record<string, { programKey: string; icon: string }> = {
            finder: { programKey: 'programs.finder', icon: WINDOW_ICONS.finder },
            preview: { programKey: 'programs.preview', icon: WINDOW_ICONS.preview },
            'text-editor': { programKey: 'programs.text', icon: WINDOW_ICONS.textEditor },
            terminal: { programKey: 'programs.terminal', icon: WINDOW_ICONS.terminal },
            photos: { programKey: 'programs.photos', icon: WINDOW_ICONS.photos },
        };
        const meta = map[this.type] || {
            programKey: 'programs.default',
            icon: WINDOW_ICONS.default,
        };

        try {
            WM.register({
                id: this.id,
                type: 'persistent',
                programKey: meta.programKey,
                icon: meta.icon,
                closeButtonId: null,
                metadata: {
                    /* dynamic multi-window */
                },
            });
            if (typeof WM.setDialogInstance === 'function') {
                WM.setDialogInstance(this.id, {
                    open: () => this.show(),
                    close: () => this.hide(),
                    bringToFront: () => this.bringToFront(),
                });
            }
        } catch (e) {
            logger.warn('WINDOW', '[BaseWindow] WM.register failed for', this.id, e);
        }
    }
}

// Export to window for global access
window.BaseWindow = BaseWindow;
