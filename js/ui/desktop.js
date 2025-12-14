'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.DESKTOP_SHORTCUTS = void 0;
exports.renderDesktopShortcuts = renderDesktopShortcuts;
exports.handleDesktopShortcutClick = handleDesktopShortcutClick;
exports.initDesktop = initDesktop;
// Desktop icon system for macOS-style portfolio
// TypeScript version. Use this file for new desktop shortcuts.
const i18n_1 = require('../services/i18n');
const API = window.API;
exports.DESKTOP_SHORTCUTS = [
    {
        id: 'projects',
        emoji: '📁',
        labelKey: 'desktop.projects',
        fallbackLabel: 'Projekte',
        onOpen: () => {
            const W = window;
            if (W.FinderWindow?.focusOrCreate) {
                W.FinderWindow.focusOrCreate();
            }
            // Navigiere zum Projects-Ordner
            const w = window;
            if (w.FinderSystem?.navigateTo) {
                w.FinderSystem.navigateTo('projects');
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
function renderDesktopShortcuts(container) {
    container.innerHTML = '';
    exports.DESKTOP_SHORTCUTS.forEach(shortcut => {
        const el = document.createElement('button');
        el.className = 'desktop-icon-button';
        el.setAttribute('data-action', 'openDesktopItem');
        el.setAttribute('data-item-id', shortcut.id);
        el.setAttribute(
            'aria-label',
            (0, i18n_1.translate)(shortcut.labelKey, {}, { fallback: shortcut.fallbackLabel })
        );
        // Create the icon/emoji container
        const graphicDiv = document.createElement('div');
        graphicDiv.className = 'desktop-icon-graphic';
        if (shortcut.icon) {
            const img = document.createElement('img');
            img.src = shortcut.icon;
            img.alt = (0, i18n_1.translate)(
                shortcut.labelKey,
                {},
                { fallback: shortcut.fallbackLabel }
            );
            graphicDiv.appendChild(img);
        } else if (shortcut.emoji) {
            graphicDiv.textContent = shortcut.emoji;
        }
        el.appendChild(graphicDiv);
        const label = document.createElement('span');
        label.className = 'desktop-icon-label';
        label.textContent = (0, i18n_1.translate)(
            shortcut.labelKey,
            {},
            { fallback: shortcut.fallbackLabel }
        );
        el.appendChild(label);
        container.appendChild(el);
    });
}
function handleDesktopShortcutClick(id) {
    const shortcut = exports.DESKTOP_SHORTCUTS.find(s => s.id === id);
    if (shortcut && shortcut.onOpen) {
        shortcut.onOpen();
    }
}
/**
 * Initialize desktop shortcuts - called by app-init
 */
function initDesktop() {
    const container = document.getElementById('desktop-icons');
    if (container) {
        renderDesktopShortcuts(container);
    }
}
if (typeof window !== 'undefined') {
    window.DesktopSystem = {
        initDesktop,
    };
}
//# sourceMappingURL=desktop.js.map
