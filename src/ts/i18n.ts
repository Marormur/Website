// i18n.ts
// Erweiterung für Preview-App

export const de = {
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

export const en = {
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


export function translate(key: string, fallback?: string): string {
    // Einfache Lookup-Logik, kann später erweitert werden
    type AppI18nGlobal = { appI18n?: { getActiveLanguage?: () => string } };
    const win = (typeof window !== 'undefined' ? (window as unknown as AppI18nGlobal) : {} as AppI18nGlobal);
    const active = win.appI18n?.getActiveLanguage?.() || 'de';
    const dict = active === 'en' ? en : de;

    const parts = key.split('.');
    let current: unknown = dict as unknown;
    for (const part of parts) {
        if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
            current = (current as Record<string, unknown>)[part];
        } else {
            return fallback || key;
        }
    }
    return typeof current === 'string' ? current : (fallback || key);
}
