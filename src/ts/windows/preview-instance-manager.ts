import { PreviewWindow, PreviewWindowState } from '../apps/preview/preview-window.js';

export class PreviewInstanceManager {
    static openImages(images: string[], startIndex = 0, path?: string): void {
        if (!Array.isArray(images) || images.length === 0) return;
        const idx = Math.max(0, Math.min(startIndex, images.length - 1));
        PreviewWindow.focusOrCreate().openImages(images, idx, path);
    }
}

type WindowWithPreviewMgr = { PreviewInstanceManager?: typeof PreviewInstanceManager };
(window as unknown as WindowWithPreviewMgr).PreviewInstanceManager = PreviewInstanceManager;
export default PreviewInstanceManager;
