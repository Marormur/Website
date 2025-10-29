"use strict";
// window-configs.ts
// Registrierung aller Fenster/Modals
Object.defineProperty(exports, "__esModule", { value: true });
exports.windowConfigs = void 0;
exports.windowConfigs = [
    // ...bestehende Fenster...
    {
        id: 'preview-modal',
        type: 'persistent',
        programKey: 'programs.preview',
        icon: './img/preview.png',
        closeButtonId: 'close-preview-modal',
        metadata: {
            initHandler: function () {
                // Wird beim Öffnen ausgeführt
            }
        }
    },
    {
        id: 'photos-window',
        type: 'persistent',
        programKey: 'programs.photos',
        icon: './img/fotos.png',
        closeButtonId: 'close-photos-window',
        metadata: {
            useWindowChrome: true,
            initHandler: function () {
                if (typeof window.PhotosApp !== 'undefined' && typeof window.PhotosApp.init === 'function') {
                    window.PhotosApp.init();
                }
            }
        }
    }
];
// Registrierung im WindowManager (global)
if (typeof window !== 'undefined') {
    const w = window;
    if (w.WindowManager?.registerAll) {
        w.WindowManager.registerAll(exports.windowConfigs);
    }
}
//# sourceMappingURL=window-configs.js.map