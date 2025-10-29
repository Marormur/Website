"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DESKTOP_SHORTCUTS = void 0;
exports.renderDesktopShortcuts = renderDesktopShortcuts;
exports.handleDesktopShortcutClick = handleDesktopShortcutClick;
// Desktop icon system for macOS-style portfolio
// TypeScript version. Use this file for new desktop shortcuts.
const i18n_1 = require("./i18n");
const API = (window.API);
exports.DESKTOP_SHORTCUTS = [
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
function renderDesktopShortcuts(container) {
    container.innerHTML = '';
    exports.DESKTOP_SHORTCUTS.forEach(shortcut => {
        const el = document.createElement('button');
        el.className = 'desktop-shortcut';
        el.setAttribute('data-action', 'openDesktopItem');
        el.setAttribute('data-item-id', shortcut.id);
        el.setAttribute('aria-label', (0, i18n_1.translate)(shortcut.labelKey, shortcut.fallbackLabel));
        if (shortcut.icon) {
            const img = document.createElement('img');
            img.src = shortcut.icon;
            img.alt = (0, i18n_1.translate)(shortcut.labelKey, shortcut.fallbackLabel);
            img.className = 'desktop-shortcut-icon';
            el.appendChild(img);
        }
        else if (shortcut.emoji) {
            el.textContent = shortcut.emoji;
        }
        const label = document.createElement('span');
        label.className = 'desktop-shortcut-label';
        label.textContent = (0, i18n_1.translate)(shortcut.labelKey, shortcut.fallbackLabel);
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
//# sourceMappingURL=desktop.js.map