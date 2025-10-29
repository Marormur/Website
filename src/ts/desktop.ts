// Desktop icon system for macOS-style portfolio
// TypeScript version. Use this file for new desktop shortcuts.
import { translate } from './i18n';

// Access the global API exposed on window (no module export)
type WindowWithAPI = { API?: {
    window: { open: (id: unknown) => unknown }
} };
const API = ((window as unknown as WindowWithAPI).API);

export interface DesktopShortcut {
    id: string;
    icon?: string;
    emoji?: string;
    labelKey: string;
    fallbackLabel: string;
    onOpen?: () => void;
}

export const DESKTOP_SHORTCUTS: DesktopShortcut[] = [
    // Desktop shortcuts can be added here
    // Example:
    // {
    //     id: 'example',
    //     icon: './img/example.svg',
    //     labelKey: 'desktop.example',
    //     fallbackLabel: 'Example',
    //     onOpen: () => API?.window.open('example-modal'),
    // },
];

export function renderDesktopShortcuts(container: HTMLElement) {
    container.innerHTML = '';
    DESKTOP_SHORTCUTS.forEach(shortcut => {
        const el = document.createElement('button');
        el.className = 'desktop-shortcut';
        el.setAttribute('data-action', 'openDesktopItem');
        el.setAttribute('data-item-id', shortcut.id);
        el.setAttribute('aria-label', translate(shortcut.labelKey, shortcut.fallbackLabel));
        if (shortcut.icon) {
            const img = document.createElement('img');
            img.src = shortcut.icon;
            img.alt = translate(shortcut.labelKey, shortcut.fallbackLabel);
            img.className = 'desktop-shortcut-icon';
            el.appendChild(img);
        } else if (shortcut.emoji) {
            el.textContent = shortcut.emoji;
        }
        const label = document.createElement('span');
        label.className = 'desktop-shortcut-label';
        label.textContent = translate(shortcut.labelKey, shortcut.fallbackLabel);
        el.appendChild(label);
        container.appendChild(el);
    });
}

export function handleDesktopShortcutClick(id: string) {
    const shortcut = DESKTOP_SHORTCUTS.find(s => s.id === id);
    if (shortcut && shortcut.onOpen) {
        shortcut.onOpen();
    }
}
