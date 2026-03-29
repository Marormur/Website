// Desktop icon system for macOS-style portfolio
// TypeScript version. Use this file for new desktop shortcuts.
import { translate } from '../services/i18n';

// Access the global API exposed on window (no module export)
type WindowWithAPI = {
    API?: {
        window: { open: (id: unknown) => unknown };
    };
    FinderWindow?: {
        focusOrCreate?: () => {
            getState?: () => { currentView?: string };
        };
    };
};
const API = (window as unknown as WindowWithAPI).API;
const windowWithAPI = window as unknown as WindowWithAPI;

export interface DesktopShortcut {
    id: string;
    icon?: string;
    emoji?: string;
    labelKey: string;
    fallbackLabel: string;
    onOpen?: () => void;
}

export const DESKTOP_SHORTCUTS: DesktopShortcut[] = [
    {
        id: 'projects',
        emoji: '📁',
        labelKey: 'desktop.projects',
        fallbackLabel: 'Projekte',
        onOpen: () => {
            const actionBus = window.ActionBus;
            const executeAction = (actionName: string, params: Record<string, string> = {}) => {
                if (actionBus && typeof actionBus.execute === 'function') {
                    actionBus.execute(actionName, params);
                }
            };

            // Öffne Finder und navigiere direkt zu GitHub Projekte
            const finderWindow = windowWithAPI.FinderWindow?.focusOrCreate?.();
            const finderState = finderWindow?.getState?.();
            const alreadyInGithub = finderState?.currentView === 'github';

            // Preserve the currently open GitHub folder when the user is
            // already inside GitHub projects and only wants to refocus Finder.
            if (!alreadyInGithub) {
                executeAction('finder:switchView', { finderView: 'github' });
            }
        },
    },
    // {
    //     id: 'settings',
    //     emoji: '⚙️',
    //     labelKey: 'desktop.settings',
    //     fallbackLabel: 'Einstellungen',
    //     onOpen: () => API?.window.open('settings-modal'),
    // },
];

export function renderDesktopShortcuts(container: HTMLElement) {
    container.innerHTML = '';
    DESKTOP_SHORTCUTS.forEach(shortcut => {
        const el = document.createElement('button');
        el.className = 'desktop-icon-button';
        el.setAttribute('data-action', 'openDesktopItem');
        el.setAttribute('data-item-id', shortcut.id);
        el.setAttribute(
            'aria-label',
            translate(shortcut.labelKey, {}, { fallback: shortcut.fallbackLabel })
        );

        // Create the icon/emoji container
        const graphicDiv = document.createElement('div');
        graphicDiv.className = 'desktop-icon-graphic';

        if (shortcut.icon) {
            const img = document.createElement('img');
            img.src = shortcut.icon;
            img.alt = translate(shortcut.labelKey, {}, { fallback: shortcut.fallbackLabel });
            graphicDiv.appendChild(img);
        } else if (shortcut.emoji) {
            graphicDiv.textContent = shortcut.emoji;
        }

        el.appendChild(graphicDiv);

        const label = document.createElement('span');
        label.className = 'desktop-icon-label';
        label.textContent = translate(shortcut.labelKey, {}, { fallback: shortcut.fallbackLabel });
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

/**
 * Initialize desktop shortcuts - called by app-init
 */
export function initDesktop() {
    const container = document.getElementById('desktop-icons');
    if (container) {
        renderDesktopShortcuts(container);
    }
}

// Export to window for app-init.ts
declare global {
    interface Window {
        DesktopSystem?: {
            initDesktop: () => void;
        };
    }
}

if (typeof window !== 'undefined') {
    window.DesktopSystem = {
        initDesktop,
    };
}
