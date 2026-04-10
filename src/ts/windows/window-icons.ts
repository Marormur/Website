/**
 * PURPOSE: Centralized icons for window/program metadata.
 * WHY: Keep program icon choices in one place and allow all UI surfaces to
 *      render either raster assets or emoji consistently.
 */
import { getString, setString } from '../services/storage-utils.js';

export type ProgramIconKey =
    | 'finder'
    | 'preview'
    | 'textEditor'
    | 'codeEditor'
    | 'terminal'
    | 'photos'
    | 'calendar'
    | 'launchpad'
    | 'profile'
    | 'settings'
    | 'default';

export type ProgramIconTheme = 'emoji' | 'custom';

const ICON_THEME_KEY = 'programIconTheme';
const DEFAULT_ICON_THEME: ProgramIconTheme = 'custom';

const PROGRAM_ICON_SETS: Record<ProgramIconTheme, Record<ProgramIconKey, string>> = {
    emoji: {
        finder: '🗂️',
        preview: '🔎',
        textEditor: '📝',
        codeEditor: '⌨️',
        terminal: '💻',
        photos: '🖼️',
        calendar: '📅',
        launchpad: '🚀',
        profile: '👤',
        settings: '⚙️',
        default: '🪟',
    },
    custom: {
        finder: './img/sucher.png',
        preview: './img/imageviewer.png',
        textEditor: './img/notepad.png',
        codeEditor: './img/notepad.png',
        terminal: './img/terminal.png',
        photos: './img/photos-app-icon.svg',
        calendar: './img/calendar-app-icon.svg',
        launchpad: './img/launchpad.png',
        profile: './img/profil.jpg',
        settings: './img/settings.png',
        default: './img/sucher.png',
    },
};

const allIconThemes: ProgramIconTheme[] = ['emoji', 'custom'];

let currentProgramIconTheme: ProgramIconTheme = (() => {
    const storedTheme = getString(ICON_THEME_KEY) as ProgramIconTheme | null;
    return storedTheme && allIconThemes.includes(storedTheme) ? storedTheme : DEFAULT_ICON_THEME;
})();

const WINDOW_ICONS = {
    get finder(): string {
        return getProgramIcon('finder');
    },
    get textEditor(): string {
        return getProgramIcon('textEditor');
    },
    get codeEditor(): string {
        return getProgramIcon('codeEditor');
    },
    get preview(): string {
        return getProgramIcon('preview');
    },
    get terminal(): string {
        return getProgramIcon('terminal');
    },
    get photos(): string {
        return getProgramIcon('photos');
    },
    get calendar(): string {
        return getProgramIcon('calendar');
    },
    get launchpad(): string {
        return getProgramIcon('launchpad');
    },
    get profile(): string {
        return getProgramIcon('profile');
    },
    get settings(): string {
        return getProgramIcon('settings');
    },
    get default(): string {
        return getProgramIcon('default');
    },
};

export { WINDOW_ICONS };

const IMAGE_ICON_PATTERN = /\.(png|jpe?g|gif|svg|webp|avif)$/i;
const ICON_SOURCE_ATTRIBUTE = 'programIconSource';
const ICON_KEY_ATTRIBUTE = 'programIconKey';

const iconValueToKey = new Map<string, ProgramIconKey>();

const registerIconValues = () => {
    allIconThemes.forEach(theme => {
        const iconEntries = PROGRAM_ICON_SETS[theme];
        (Object.keys(iconEntries) as ProgramIconKey[]).forEach(iconKey => {
            const iconValue = iconEntries[iconKey];
            iconValueToKey.set(iconValue, iconKey);
        });
    });
};

registerIconValues();

function isProgramIconTheme(value: string | null | undefined): value is ProgramIconTheme {
    return !!value && allIconThemes.includes(value as ProgramIconTheme);
}

export function getProgramIconTheme(): ProgramIconTheme {
    return currentProgramIconTheme;
}

export function getProgramIcon(iconKey: ProgramIconKey): string {
    return PROGRAM_ICON_SETS[currentProgramIconTheme][iconKey];
}

export function resolveProgramIcon(icon: string | null | undefined): string {
    if (typeof icon !== 'string') {
        return getProgramIcon('default');
    }

    const normalizedIcon = icon.trim();
    if (!normalizedIcon) {
        return getProgramIcon('default');
    }

    if (
        (Object.keys(PROGRAM_ICON_SETS.emoji) as ProgramIconKey[]).includes(
            normalizedIcon as ProgramIconKey
        )
    ) {
        return getProgramIcon(normalizedIcon as ProgramIconKey);
    }

    const iconKey = iconValueToKey.get(normalizedIcon);
    if (iconKey) {
        return getProgramIcon(iconKey);
    }

    return normalizedIcon;
}

export function refreshProgramIcons(root: ParentNode = document): void {
    root.querySelectorAll<HTMLElement>(`[data-${ICON_SOURCE_ATTRIBUTE}]`).forEach(target => {
        const storedKey = target.dataset[ICON_KEY_ATTRIBUTE] as ProgramIconKey | undefined;
        const storedSource = target.dataset[ICON_SOURCE_ATTRIBUTE];
        if (storedKey) {
            renderProgramIcon(target, storedKey);
            return;
        }
        if (storedSource) {
            renderProgramIcon(target, storedSource);
        }
    });
}

export function setProgramIconTheme(theme: ProgramIconTheme): void {
    if (!isProgramIconTheme(theme) || theme === currentProgramIconTheme) {
        return;
    }

    currentProgramIconTheme = theme;
    setString(ICON_THEME_KEY, theme);
    refreshProgramIcons(document);

    window.dispatchEvent(
        new CustomEvent('iconThemeChange', {
            detail: { theme },
        })
    );
}

/**
 * PURPOSE: Detect whether a program icon string should be rendered as an image.
 * WHY: Most application surfaces now accept either emoji or legacy asset paths.
 */
export function isImageIcon(icon: string | null | undefined): boolean {
    if (typeof icon !== 'string') {
        return false;
    }

    const normalizedIcon = icon.trim();
    if (!normalizedIcon) {
        return false;
    }

    return (
        normalizedIcon.startsWith('http://') ||
        normalizedIcon.startsWith('https://') ||
        normalizedIcon.startsWith('./') ||
        normalizedIcon.startsWith('/') ||
        normalizedIcon.startsWith('data:image/') ||
        IMAGE_ICON_PATTERN.test(normalizedIcon)
    );
}

/**
 * PURPOSE: Render a program icon into an existing host element.
 * WHY: Dock, titlebars and program info need the same image-vs-emoji behavior
 *      without duplicating DOM branching and sizing logic.
 */
export function renderProgramIcon(
    target: HTMLElement | null,
    icon: string | null | undefined
): void {
    if (!target) {
        return;
    }

    const rawIcon = typeof icon === 'string' && icon.trim() ? icon.trim() : 'default';
    const resolvedIcon = resolveProgramIcon(rawIcon);
    const iconKey = (Object.keys(PROGRAM_ICON_SETS.emoji) as ProgramIconKey[]).includes(
        rawIcon as ProgramIconKey
    )
        ? (rawIcon as ProgramIconKey)
        : iconValueToKey.get(rawIcon);

    target.dataset[ICON_SOURCE_ATTRIBUTE] = rawIcon;
    if (iconKey) {
        target.dataset[ICON_KEY_ATTRIBUTE] = iconKey;
    } else {
        delete target.dataset[ICON_KEY_ATTRIBUTE];
    }
    target.replaceChildren();

    if (isImageIcon(resolvedIcon)) {
        const image = document.createElement('img');
        image.src = resolvedIcon;
        image.alt = '';
        image.draggable = false;
        image.className = 'program-icon-image';
        image.setAttribute('aria-hidden', 'true');
        target.appendChild(image);
        return;
    }

    const emoji = document.createElement('span');
    emoji.className = 'program-icon-emoji';
    emoji.textContent = resolvedIcon;
    emoji.setAttribute('aria-hidden', 'true');
    target.appendChild(emoji);
}

declare global {
    interface Window {
        IconThemeSystem?: {
            getProgramIconTheme: () => ProgramIconTheme;
            setProgramIconTheme: (theme: ProgramIconTheme) => void;
            getProgramIcon: (iconKey: ProgramIconKey) => string;
            refreshProgramIcons: (root?: ParentNode) => void;
        };
    }
}

if (typeof window !== 'undefined') {
    window.IconThemeSystem = {
        getProgramIconTheme,
        setProgramIconTheme,
        getProgramIcon,
        refreshProgramIcons,
    };
}
