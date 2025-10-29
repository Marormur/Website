import PreviewWindowInstance, { PreviewWindowState } from './preview-window-instance';

export class PreviewInstanceManager {
    static type = 'preview';
    static instances: Map<string, PreviewWindowInstance> = new Map();
    static instanceCounter = 0;
    static singletonId = 'preview-single';

    static createInstance(config: Partial<PreviewWindowState> = {}): PreviewWindowInstance {
        this.instanceCounter++;
        const instanceId = `${this.type}-${this.instanceCounter}`;
        const instance = new PreviewWindowInstance({
            id: instanceId,
            type: this.type,
            title: config.path ? `Preview: ${config.path}` : 'Preview',
            initialState: config,
        });
        this.instances.set(instanceId, instance);
        return instance;
    }

    /** Ensure a single initialized instance attached to #preview-container */
    static getOrCreateSingleton(): PreviewWindowInstance | null {
        const existing = this.instances.get(this.singletonId);
        if (existing && (existing as any).isInitialized) return existing;
        const containerRoot = document.getElementById('preview-container');
        if (!containerRoot) {
            console.error('Preview container #preview-container not found');
            return null;
        }
        // Create/ensure inner container for the instance
        let instContainer = containerRoot.querySelector('#preview-instance-container') as HTMLElement | null;
        if (!instContainer) {
            instContainer = document.createElement('div');
            instContainer.id = 'preview-instance-container';
            instContainer.className = 'h-full flex flex-col min-h-0';
            containerRoot.appendChild(instContainer);
        }
        const instance = new PreviewWindowInstance({
            id: this.singletonId,
            type: this.type,
            title: 'Preview',
            initialState: { images: [], currentIndex: 0, zoom: 1 },
        });
        try {
            instance.init(instContainer);
        } catch (e) {
            console.error('Failed to initialize Preview instance:', e);
            return null;
        }
        this.instances.set(this.singletonId, instance);
        return instance;
    }

    /** Open a list of images in the Preview (ensures modal and instance) */
    static openImages(images: string[], startIndex = 0, path?: string): void {
        if (!Array.isArray(images) || images.length === 0) return;
        // Open preview modal first
        try {
            const W = window as unknown as Window & { API?: any; WindowManager?: any };
            if (W.API?.window?.open) W.API.window.open('preview-modal');
            else W.WindowManager?.open?.('preview-modal');
        } catch {}

        const instance = this.getOrCreateSingleton();
        if (!instance) return;
        const idx = Math.max(0, Math.min(startIndex, images.length - 1));
        instance.updateState({ images, currentIndex: idx, path: path || undefined });
        instance.render();
        // Ensure visible
        (instance as any).show?.();
    }

    static getInstance(instanceId: string): PreviewWindowInstance | undefined {
        return this.instances.get(instanceId);
    }

    static destroyInstance(instanceId: string): void {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.destroy();
            this.instances.delete(instanceId);
        }
    }

    static destroyAll(): void {
        this.instances.forEach(instance => instance.destroy());
        this.instances.clear();
    }
}

type WindowWithPreviewMgr = { PreviewInstanceManager?: typeof PreviewInstanceManager };
(window as unknown as WindowWithPreviewMgr).PreviewInstanceManager = PreviewInstanceManager;
export default PreviewInstanceManager;
