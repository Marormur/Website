'use strict';
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
exports.PreviewWindowInstance = void 0;
const base_window_instance_1 = __importDefault(require('./base-window-instance'));
const WindowChrome = window.WindowChrome;
class PreviewWindowInstance extends base_window_instance_1.default {
    constructor(config) {
        super(config);
        this._prevImages = [];
        // Base ctor initializes state; extend with preview defaults
        this.updateState({
            zoom: 1,
            images: [],
            currentIndex: 0,
        });
    }
    render() {
        if (!this.container) return;
        this.container.innerHTML = '';
        const titlebar = WindowChrome.createTitlebar({
            title: this.title,
            icon: './img/preview.png',
            showClose: true,
            showMinimize: true,
            showMaximize: false,
            onClose: () => this.destroy(),
        });
        this.container.appendChild(titlebar);
        // Toolbar
        const toolbar = WindowChrome.createToolbar([
            { label: 'Zoom In', icon: '🔍+', onClick: () => this.zoomIn() },
            { label: 'Zoom Out', icon: '🔍-', onClick: () => this.zoomOut() },
            { type: 'separator' },
            { label: 'Previous', icon: '⬅️', onClick: () => this.prevImage() },
            { label: 'Next', icon: '➡️', onClick: () => this.nextImage() },
        ]);
        this.container.appendChild(toolbar);
        // Image area
        const imageArea = document.createElement('div');
        imageArea.className = 'preview-image-area flex justify-center items-center';
        imageArea.style.height = 'calc(100% - 80px)';
        imageArea.style.position = 'relative';
        imageArea.ondrop = e => this.handleDrop(e);
        imageArea.ondragover = e => e.preventDefault();
        const st = this.getState();
        const images = st.images || [];
        const idx = st.currentIndex ?? 0;
        // Revoke previous blob URLs that are no longer used
        try {
            const prev = this._prevImages || [];
            const removed = prev.filter(p => p && p.startsWith('blob:') && !images.includes(p));
            removed.forEach(u => {
                try {
                    URL.revokeObjectURL(u);
                } catch (e) {}
            });
        } catch (e) {}
        if (images.length > 0 && images[idx]) {
            const img = document.createElement('img');
            img.src = images[idx];
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.transform = `scale(${st.zoom ?? 1})`;
            img.style.display = 'block';
            img.style.visibility = 'hidden';
            img.draggable = true;
            img.addEventListener('contextmenu', e => this.showContextMenu(e));
            img.addEventListener('load', () => {
                img.style.visibility = 'visible';
                img.style.opacity = '1';
            });
            img.addEventListener('error', () => {
                /* ignore image load errors for now */
            });
            imageArea.appendChild(img);
        } else {
            // Placeholder UI
            const placeholder = document.createElement('div');
            placeholder.className = 'text-gray-500 dark:text-gray-400 text-center px-6';
            placeholder.textContent = 'No image selected';
            imageArea.appendChild(placeholder);
        }
        this.container.appendChild(imageArea);
        // Store images to allow revoking blob URLs on next render/destroy
        this._prevImages = images.slice();
        // Statusbar
        const counter = images.length > 0 ? `${idx + 1} / ${images.length}` : '';
        const statusBar = WindowChrome.createStatusBar({
            leftContent: st.path || '',
            rightContent: `Zoom: ${Math.round((st.zoom || 1) * 100)}% ${counter}`,
        });
        this.container.appendChild(statusBar);
        // Keyboard shortcuts
        this.attachKeyboardShortcuts();
    }
    attachKeyboardShortcuts() {
        // Remove previous listener to avoid duplicates
        if (this.keydownListener) {
            document.removeEventListener('keydown', this.keydownListener);
        }
        this.keydownListener = e => {
            if (!this.isVisible) return;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.prevImage();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.nextImage();
            }
        };
        document.addEventListener('keydown', this.keydownListener);
    }
    zoomIn() {
        const st = this.getState();
        this.updateState({ zoom: Math.min((st.zoom || 1) + 0.1, 3) });
        this.render();
    }
    zoomOut() {
        const st = this.getState();
        this.updateState({ zoom: Math.max((st.zoom || 1) - 0.1, 0.2) });
        this.render();
    }
    nextImage() {
        const st = this.getState();
        const images = st.images || [];
        if (images.length === 0) return;
        const next = ((st.currentIndex ?? 0) + 1) % images.length;
        this.updateState({ currentIndex: next });
        this.render();
    }
    prevImage() {
        const st = this.getState();
        const images = st.images || [];
        if (images.length === 0) return;
        const prev = ((st.currentIndex ?? 0) - 1 + images.length) % images.length;
        this.updateState({ currentIndex: prev });
        this.render();
    }
    handleDrop(e) {
        e.preventDefault();
        const files = e.dataTransfer?.files;
        if (files && files.length > 0 && files[0]) {
            const url = URL.createObjectURL(files[0]);
            this.updateState({ images: [url], currentIndex: 0 });
            this.render();
        }
    }
    showContextMenu(e) {
        e.preventDefault();
        // TODO: Implement custom context menu (copy, save, open in new tab)
    }
    destroy() {
        // Clean up keyboard listener before base destroy
        if (this.keydownListener) {
            document.removeEventListener('keydown', this.keydownListener);
        }
        // Revoke any remaining blob URLs we previously created
        try {
            (this._prevImages || []).forEach(u => {
                if (u && u.startsWith('blob:')) {
                    try {
                        URL.revokeObjectURL(u);
                    } catch (e) {}
                }
            });
        } catch (e) {}
        super.destroy();
    }
}
exports.PreviewWindowInstance = PreviewWindowInstance;
window.PreviewWindowInstance = PreviewWindowInstance;
exports.default = PreviewWindowInstance;
//# sourceMappingURL=preview-window-instance.js.map
