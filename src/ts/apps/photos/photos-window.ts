/*
 * PhotosWindow — integrates the Photos app into the BaseWindow system
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';

export class PhotosWindow extends BaseWindow {
    constructor(config?: Partial<WindowConfig>) {
        super({
            type: 'photos',
            title: 'Fotos',
            ...config,
        });
    }

    createDOM(): HTMLElement {
        const win = super.createDOM();

        // Remove default tab bar for this app (we don't use tabs here)
        const tabBar = win.querySelector('.window-tab-bar');
        if (tabBar) tabBar.remove();

        // Ensure content area is flexible
        if (this.contentElement) {
            this.contentElement.className = 'flex-1 overflow-hidden flex';
        }

        // Build app content via global PhotosApp helper (in photos-app.ts)
        const builder = (window as any).PhotosAppBuildContent as
            | (() => { container: HTMLElement; detailOverlay: HTMLElement })
            | undefined;
        if (typeof builder === 'function') {
            const { container, detailOverlay } = builder();
            this.contentElement?.appendChild(container);
            this.contentElement?.appendChild(detailOverlay);
        }

        // Create and attach status bar (use WindowChrome if available)
        const WindowChrome = (window as any).WindowChrome;
        if (WindowChrome && win) {
            const status = WindowChrome.createStatusBar({
                leftContent:
                    (window as any).appI18n?.translate?.('photos.status.countPlaceholder', {
                        fallback: '– Fotos',
                    }) || '– Fotos',
                rightContent: '',
            });
            win.appendChild(status);

            // Expose statusbar for photos app to use
            (window as any).PhotosAppAttachToWindow?.(win as HTMLElement);
        } else {
            // Still call attach so the app can cache elements and init
            (window as any).PhotosAppAttachToWindow?.(win as HTMLElement);
        }

        return win;
    }

    static create(config?: Partial<WindowConfig>): PhotosWindow {
        const w = new PhotosWindow(config);
        w.show();
        const W = globalThis as any;
        if (W.WindowRegistry) W.WindowRegistry.registerWindow(w);
        return w;
    }
}

// Expose on window for global access
(window as any).PhotosWindow = PhotosWindow;
