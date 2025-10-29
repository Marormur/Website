"use strict";
// i18n.ts
// Erweiterung für Preview-App
Object.defineProperty(exports, "__esModule", { value: true });
exports.en = exports.de = void 0;
exports.translate = translate;
exports.de = {
    programs: {
        preview: {
            label: 'Vorschau',
            infoLabel: 'Bildvorschau',
            about: {
                name: 'Vorschau',
                tagline: 'Schnelle Bildanzeige',
                version: '1.0',
                copyright: '© 2025 Marormur'
            }
        },
        photos: {
            label: 'Fotos',
            infoLabel: 'Fotos App',
            about: {
                name: 'Fotos',
                tagline: 'Deine Bilder auf einen Klick',
                version: '1.0',
                copyright: '© 2025 Marormur'
            }
        }
    },
    desktop: {
        photos: 'Fotos',
        github: 'GitHub Projekte',
    },
    preview: {
        noImage: 'Kein Bild ausgewählt',
        zoomIn: 'Vergrößern',
        zoomOut: 'Verkleinern',
        next: 'Nächstes Bild',
        prev: 'Vorheriges Bild',
        dragDrop: 'Bild hierher ziehen',
        contextMenu: 'Kontextmenü'
    }
};
exports.en = {
    programs: {
        preview: {
            label: 'Preview',
            infoLabel: 'Image Preview',
            about: {
                name: 'Preview',
                tagline: 'Quick image viewer',
                version: '1.0',
                copyright: '© 2025 Marormur'
            }
        },
        photos: {
            label: 'Photos',
            infoLabel: 'Photos App',
            about: {
                name: 'Photos',
                tagline: 'Your images at a click',
                version: '1.0',
                copyright: '© 2025 Marormur'
            }
        }
    },
    desktop: {
        photos: 'Photos',
        github: 'GitHub Projects',
    },
    preview: {
        noImage: 'No image selected',
        zoomIn: 'Zoom in',
        zoomOut: 'Zoom out',
        next: 'Next image',
        prev: 'Previous image',
        dragDrop: 'Drag image here',
        contextMenu: 'Context menu'
    }
};
function translate(key, fallback) {
    const win = (typeof window !== 'undefined' ? window : {});
    const active = win.appI18n?.getActiveLanguage?.() || 'de';
    const dict = active === 'en' ? exports.en : exports.de;
    const parts = key.split('.');
    let current = dict;
    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        }
        else {
            return fallback || key;
        }
    }
    return typeof current === 'string' ? current : (fallback || key);
}
//# sourceMappingURL=i18n.js.map