'use strict';
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
exports.PreviewInstanceManager = void 0;
const preview_window_instance_1 = __importDefault(require('./preview-window-instance'));
class PreviewInstanceManager {
    static createInstance(config = {}) {
        this.instanceCounter++;
        const instanceId = `${this.type}-${this.instanceCounter}`;
        const instance = new preview_window_instance_1.default({
            id: instanceId,
            type: this.type,
            title: config.path ? `Preview: ${config.path}` : 'Preview',
            initialState: config,
        });
        this.instances.set(instanceId, instance);
        return instance;
    }
    /** Ensure a single initialized instance attached to #preview-container */
    static getOrCreateSingleton() {
        const existing = this.instances.get(this.singletonId);
        if (existing && existing.isInitialized) return existing;
        const containerRoot = document.getElementById('preview-container');
        if (!containerRoot) {
            console.error('Preview container #preview-container not found');
            return null;
        }
        // Create/ensure inner container for the instance
        let instContainer = containerRoot.querySelector('#preview-instance-container');
        if (!instContainer) {
            instContainer = document.createElement('div');
            instContainer.id = 'preview-instance-container';
            instContainer.className = 'h-full flex flex-col min-h-0';
            containerRoot.appendChild(instContainer);
        }
        const instance = new preview_window_instance_1.default({
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
    static openImages(images, startIndex = 0, path) {
        if (!Array.isArray(images) || images.length === 0) return;
        // Open preview modal first (if WindowManager / Dialog API is available)
        try {
            const W = window;
            if (W.API?.window?.open) W.API.window.open('preview-modal');
            else W.WindowManager?.open?.('preview-modal');
        } catch {}
        // Ensure the preview container is visible so headless tests can detect the image
        try {
            const containerRoot = document.getElementById('preview-container');
            if (containerRoot) {
                containerRoot.classList.remove('hidden');
                containerRoot.style.pointerEvents = 'auto';
            }
        } catch (_) {
            /* ignore */
        }
        const instance = this.getOrCreateSingleton();
        if (!instance) return;
        const idx = Math.max(0, Math.min(startIndex, images.length - 1));
        instance.updateState({ images, currentIndex: idx, path: path || undefined });
        instance.render();
        // Ensure visible
        instance.show?.();
    }
    static getInstance(instanceId) {
        return this.instances.get(instanceId);
    }
    static destroyInstance(instanceId) {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.destroy();
            this.instances.delete(instanceId);
        }
    }
    static destroyAll() {
        this.instances.forEach(instance => instance.destroy());
        this.instances.clear();
    }
}
exports.PreviewInstanceManager = PreviewInstanceManager;
PreviewInstanceManager.type = 'preview';
PreviewInstanceManager.instances = new Map();
PreviewInstanceManager.instanceCounter = 0;
PreviewInstanceManager.singletonId = 'preview-single';
window.PreviewInstanceManager = PreviewInstanceManager;
exports.default = PreviewInstanceManager;
//# sourceMappingURL=preview-instance-manager.js.map
