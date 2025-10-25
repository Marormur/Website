/**
 * Menu System Module
 * 
 * Verwaltet die macOS-Menüleiste mit dynamischen Menüdefinitionen für
 * verschiedene Programme (Finder, Einstellungen, Texteditor, etc.).
 * 
 * Features:
 * - Dynamische Menü-Generierung basierend auf aktivem Fenster
 * - Menu-Action-Handler mit eindeutigen IDs
 * - Programm-spezifische Menüdefinitionen
 * - Keyboard-Shortcuts (⌘N, ⌘S, etc.)
 * - Window-Management-Menü (Minimieren, Zoom, etc.)
 * - Help-Menü mit Programminfo
 */

(function () {
    'use strict';

    // ============================================================================
    // MENU ACTION MANAGEMENT
    // ============================================================================

    let menuActionIdCounter = 0;
    const menuActionHandlers = new Map();

    function registerMenuAction(handler) {
        if (typeof handler !== 'function') {
            return null;
        }
        const actionId = `menu-action-${++menuActionIdCounter}`;
        menuActionHandlers.set(actionId, handler);
        return actionId;
    }

    function normalizeMenuItems(items, context) {
        if (!Array.isArray(items)) return [];
        const normalized = [];
        let previousWasSeparator = true;

        items.forEach(item => {
            if (!item) return;

            // Handle separators (keine doppelten Separatoren)
            if (item.type === 'separator') {
                if (previousWasSeparator) return;
                normalized.push({ type: 'separator' });
                previousWasSeparator = true;
                return;
            }

            // Clone und evaluate functions
            const clone = Object.assign({}, item);
            if (typeof clone.disabled === 'function') {
                clone.disabled = clone.disabled(context);
            }
            if (typeof clone.label === 'function') {
                clone.label = clone.label(context);
            }
            if (typeof clone.shortcut === 'function') {
                clone.shortcut = clone.shortcut(context);
            }

            normalized.push(clone);
            previousWasSeparator = false;
        });

        // Entferne trailing separators
        while (normalized.length && normalized[normalized.length - 1].type === 'separator') {
            normalized.pop();
        }

        return normalized;
    }

    // ============================================================================
    // MENU DEFINITIONS - Programm-spezifische Menüs
    // ============================================================================

    function buildDefaultMenuDefinition(context) {
        return buildFinderMenuDefinition(context);
    }

    function buildFinderMenuDefinition(context) {
        return [
            {
                id: 'file',
                label: () => translate('menu.sections.file'),
                items: [
                    {
                        id: 'finder-new-window',
                        label: () => translate('menu.finder.newWindow'),
                        shortcut: '⌘N',
                        icon: 'finder',
                        action: () => {
                            // Open a new Finder window
                            if (window.showTab) window.showTab('finder');
                        }
                    },
                    {
                        id: 'finder-reload',
                        label: () => translate('menu.finder.reload'),
                        shortcut: '⌘R',
                        icon: 'reload',
                        action: () => {
                            if (window.loadGithubRepos) window.loadGithubRepos();
                        }
                    },
                    {
                        type: 'separator'
                    },
                    {
                        id: 'finder-close',
                        label: () => translate('menu.finder.close'),
                        shortcut: '⌘W',
                        disabled: () => !(context && context.dialog),
                        icon: 'close',
                        action: () => closeContextWindow(context)
                    }
                ]
            },
            createWindowMenuSection(context),
            createHelpMenuSection(context, {
                itemKey: 'menu.finder.help',
                // Show Finder program info, not Projects
                infoModalId: 'finder-modal',
                itemIcon: 'help'
            })
        ];
    }

    function buildSettingsMenuDefinition(context) {
        return [
            {
                id: 'file',
                label: () => translate('menu.sections.file'),
                items: [
                    {
                        id: 'settings-close',
                        label: () => translate('menu.settings.close'),
                        shortcut: '⌘W',
                        disabled: () => !(context && context.dialog),
                        icon: 'close',
                        action: () => closeContextWindow(context)
                    }
                ]
            },
            createWindowMenuSection(context),
            createHelpMenuSection(context, {
                itemKey: 'menu.settings.help',
                infoModalId: 'settings-modal',
                itemIcon: 'help'
            })
        ];
    }

    function buildTextEditorMenuDefinition(context) {
        return [
            {
                id: 'file',
                label: () => translate('menu.sections.file'),
                items: [
                    {
                        id: 'text-new',
                        label: () => translate('menu.text.newFile'),
                        shortcut: '⌘N',
                        icon: 'newFile',
                        action: () => sendTextEditorMenuAction('file:new')
                    },
                    {
                        id: 'text-open',
                        label: () => translate('menu.text.open'),
                        shortcut: '⌘O',
                        icon: 'open',
                        action: () => sendTextEditorMenuAction('file:open')
                    },
                    {
                        id: 'text-save',
                        label: () => translate('menu.text.save'),
                        shortcut: '⌘S',
                        icon: 'save',
                        action: () => sendTextEditorMenuAction('file:save')
                    }
                ]
            },
            {
                id: 'edit',
                label: () => translate('menu.sections.edit'),
                items: [
                    {
                        id: 'text-undo',
                        label: () => translate('menu.text.undo'),
                        shortcut: '⌘Z',
                        icon: 'undo',
                        action: () => sendTextEditorMenuAction('edit:undo')
                    },
                    {
                        id: 'text-redo',
                        label: () => translate('menu.text.redo'),
                        shortcut: '⇧⌘Z',
                        icon: 'redo',
                        action: () => sendTextEditorMenuAction('edit:redo')
                    },
                    {
                        type: 'separator'
                    },
                    {
                        id: 'text-cut',
                        label: () => translate('menu.text.cut'),
                        shortcut: '⌘X',
                        icon: 'cut',
                        action: () => sendTextEditorMenuAction('edit:cut')
                    },
                    {
                        id: 'text-copy',
                        label: () => translate('menu.text.copy'),
                        shortcut: '⌘C',
                        icon: 'copy',
                        action: () => sendTextEditorMenuAction('edit:copy')
                    },
                    {
                        id: 'text-paste',
                        label: () => translate('menu.text.paste'),
                        shortcut: '⌘V',
                        icon: 'paste',
                        action: () => sendTextEditorMenuAction('edit:paste')
                    },
                    {
                        type: 'separator'
                    },
                    {
                        id: 'text-select-all',
                        label: () => translate('menu.text.selectAll'),
                        shortcut: '⌘A',
                        icon: 'selectAll',
                        action: () => sendTextEditorMenuAction('edit:selectAll')
                    }
                ]
            },
            {
                id: 'view',
                label: () => translate('menu.sections.view'),
                items: [
                    {
                        id: 'text-toggle-wrap',
                        label: () => translate('menu.text.toggleWrap'),
                        shortcut: '⌥⌘W',
                        icon: 'wrap',
                        action: () => sendTextEditorMenuAction('view:toggleWrap')
                    }
                ]
            },
            createWindowMenuSection(context),
            createHelpMenuSection(context, {
                itemKey: 'menu.text.help',
                infoModalId: 'text-modal',
                itemIcon: 'help'
            })
        ];
    }

    function buildImageViewerMenuDefinition(context) {
        const state = window.getImageViewerState ? window.getImageViewerState() : { hasImage: false };
        return [
            {
                id: 'file',
                label: () => translate('menu.sections.file'),
                items: [
                    {
                        id: 'image-open-tab',
                        label: () => translate('menu.image.openInTab'),
                        disabled: !state.hasImage,
                        icon: 'imageOpen',
                        action: () => {
                            if (window.openActiveImageInNewTab) window.openActiveImageInNewTab();
                        }
                    },
                    {
                        id: 'image-download',
                        label: () => translate('menu.image.saveImage'),
                        disabled: !state.hasImage,
                        icon: 'download',
                        action: () => {
                            if (window.downloadActiveImage) window.downloadActiveImage();
                        }
                    },
                    {
                        type: 'separator'
                    },
                    {
                        id: 'image-close',
                        label: () => translate('menu.image.close'),
                        shortcut: '⌘W',
                        disabled: () => !(context && context.dialog),
                        icon: 'close',
                        action: () => closeContextWindow(context)
                    }
                ]
            },
            createWindowMenuSection(context),
            createHelpMenuSection(context, {
                itemKey: 'menu.image.help',
                infoModalId: 'image-modal',
                itemIcon: 'help'
            })
        ];
    }

    function buildAboutMenuDefinition(context) {
        return [
            {
                id: 'file',
                label: () => translate('menu.sections.file'),
                items: [
                    {
                        id: 'about-close',
                        label: () => translate('menu.about.close'),
                        shortcut: '⌘W',
                        disabled: () => !(context && context.dialog),
                        icon: 'close',
                        action: () => closeContextWindow(context)
                    }
                ]
            },
            createWindowMenuSection(context),
            createHelpMenuSection(context, {
                itemKey: 'menu.about.help',
                infoModalId: 'about-modal',
                itemIcon: 'info'
            })
        ];
    }

    function buildProgramInfoMenuDefinition(context) {
        return [
            {
                id: 'file',
                label: () => translate('menu.sections.file'),
                items: [
                    {
                        id: 'program-info-close',
                        label: () => translate('menu.programInfo.close'),
                        shortcut: '⌘W',
                        disabled: () => !(context && context.dialog),
                        icon: 'close',
                        action: () => closeContextWindow(context)
                    }
                ]
            },
            createWindowMenuSection(context)
        ];
    }

    function buildTerminalMenuDefinition(context) {
        return [
            {
                id: 'file',
                label: () => translate('menu.sections.file'),
                items: [
                    {
                        id: 'terminal-new-window',
                        label: () => translate('menu.terminal.newWindow'),
                        shortcut: '⌘N',
                        icon: 'terminal',
                        action: () => {
                            // Create new terminal instance
                            if (window.TerminalInstanceManager && window.TerminalInstanceManager.createInstance) {
                                window.TerminalInstanceManager.createInstance();
                            }
                        }
                    },
                    {
                        type: 'separator'
                    },
                    {
                        id: 'terminal-close',
                        label: () => translate('menu.terminal.close'),
                        shortcut: '⌘W',
                        disabled: () => !(context && context.dialog),
                        icon: 'close',
                        action: () => closeContextWindow(context)
                    }
                ]
            },
            {
                id: 'edit',
                label: () => translate('menu.sections.edit'),
                items: [
                    {
                        id: 'terminal-clear',
                        label: () => translate('menu.terminal.clear'),
                        shortcut: '⌘K',
                        icon: 'clear',
                        action: () => {
                            // Send clear command to active terminal
                            if (context && context.instanceId && window.TerminalInstanceManager) {
                                const instance = window.TerminalInstanceManager.getInstance(context.instanceId);
                                if (instance && instance.clearOutput) {
                                    instance.clearOutput();
                                }
                            }
                        }
                    }
                ]
            },
            createWindowMenuSection(context),
            createHelpMenuSection(context, {
                itemKey: 'menu.terminal.help',
                infoModalId: 'terminal-modal',
                itemIcon: 'help'
            })
        ];
    }

    // ============================================================================
    // HELPER MENU SECTIONS
    // ============================================================================

    function createWindowMenuSection(context) {
        return {
            id: 'window',
            label: () => translate('menu.sections.window'),
            items: getWindowMenuItems(context)
        };
    }

    function getWindowMenuItems(context) {
        const dialog = context && context.dialog;
        const hasDialog = Boolean(dialog && typeof dialog.close === 'function');

        return [
            {
                id: 'window-minimize',
                label: () => translate('menu.window.minimize'),
                shortcut: '⌘M',
                disabled: !hasDialog,
                icon: 'windowMinimize',
                action: () => {
                    if (dialog && typeof dialog.minimize === 'function') {
                        dialog.minimize();
                    }
                }
            },
            {
                id: 'window-zoom',
                label: () => translate('menu.window.zoom'),
                shortcut: '⌃⌘F',
                disabled: !hasDialog,
                icon: 'windowZoom',
                action: () => {
                    if (dialog && typeof dialog.toggleMaximize === 'function') {
                        dialog.toggleMaximize();
                    }
                }
            },
            {
                type: 'separator'
            },
            {
                id: 'window-all-front',
                label: () => translate('menu.window.bringToFront'),
                disabled: !hasAnyVisibleDialog(),
                icon: 'windowFront',
                action: () => {
                    if (window.bringAllWindowsToFront) window.bringAllWindowsToFront();
                }
            },
            {
                type: 'separator'
            },
            {
                id: 'window-close',
                label: () => translate('menu.window.close'),
                shortcut: '⌘W',
                disabled: !hasDialog,
                icon: 'close',
                action: () => closeContextWindow(context)
            }
        ];
    }

    function createHelpMenuSection(context, overrides = {}) {
        const sectionKey = overrides.sectionKey || 'menu.sections.help';
        const itemKey = overrides.itemKey || 'menu.help.showHelp';
        const infoModalId = overrides.infoModalId || context.modalId || null;

        return {
            id: overrides.id || 'help',
            label: () => translate(sectionKey),
            items: [
                {
                    id: 'help-show-info',
                    label: () => translate(itemKey),
                    icon: overrides.itemIcon || 'help',
                    action: () => {
                        if (window.openProgramInfoFromMenu) {
                            window.openProgramInfoFromMenu(infoModalId);
                        }
                    }
                }
            ]
        };
    }

    // ============================================================================
    // MENU RENDERING
    // ============================================================================

    const menuDefinitions = {
        default: buildDefaultMenuDefinition,
        "finder-modal": buildFinderMenuDefinition,
        "projects-modal": buildFinderMenuDefinition,
        "settings-modal": buildSettingsMenuDefinition,
        "text-modal": buildTextEditorMenuDefinition,
        "image-modal": buildImageViewerMenuDefinition,
        "about-modal": buildAboutMenuDefinition,
        "program-info-modal": buildProgramInfoMenuDefinition,
        "terminal-modal": buildTerminalMenuDefinition
    };

    let currentMenuModalId = null;

    function renderApplicationMenu(activeModalId) {
        const container = document.getElementById('menubar-links');
        if (!container) return;

        const modalKey = activeModalId && menuDefinitions[activeModalId] ? activeModalId : 'default';
        const builder = menuDefinitions[modalKey] || menuDefinitions.default;
        const context = createMenuContext(activeModalId || null);
        const sections = typeof builder === 'function' ? builder(context) : Array.isArray(builder) ? builder : [];

        container.innerHTML = '';
        menuActionHandlers.clear();
        menuActionIdCounter = 0;
        currentMenuModalId = activeModalId || null;

        if (!Array.isArray(sections) || sections.length === 0) {
            return;
        }

        sections.forEach((section, sectionIndex) => {
            if (!section) return;

            const items = normalizeMenuItems(section.items, context);
            if (!items.length) return;

            const trigger = document.createElement('div');
            trigger.className = 'menubar-trigger';

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'menubar-item';
            button.dataset.menubarTriggerButton = 'true';

            const label = typeof section.label === 'function' ? section.label(context) : section.label;
            button.textContent = label || '';

            const sectionId = section.id || `section-${sectionIndex}`;
            const buttonId = `menubar-menu-${sectionId}`;
            const dropdownId = `menu-dropdown-${sectionId}`;

            button.id = buttonId;
            button.setAttribute('aria-haspopup', 'menu');
            button.setAttribute('aria-expanded', 'false');
            button.setAttribute('aria-controls', dropdownId);

            const dropdown = document.createElement('ul');
            dropdown.id = dropdownId;
            dropdown.className = 'menu-dropdown hidden';
            dropdown.setAttribute('role', 'menu');
            dropdown.setAttribute('aria-labelledby', buttonId);

            items.forEach(item => {
                if (item.type === 'separator') {
                    const separator = document.createElement('li');
                    separator.className = 'menu-separator';
                    separator.setAttribute('role', 'separator');
                    separator.setAttribute('aria-hidden', 'true');
                    dropdown.appendChild(separator);
                    return;
                }

                const li = document.createElement('li');
                li.setAttribute('role', 'none');

                const tagName = item.href ? 'a' : 'button';
                const actionEl = document.createElement(tagName);
                actionEl.className = 'menu-item';

                if (tagName === 'button') {
                    actionEl.type = 'button';
                } else {
                    actionEl.href = item.href;
                    if (item.external) {
                        actionEl.rel = 'noopener noreferrer';
                        actionEl.target = '_blank';
                    }
                }

                const itemLabel = item.label != null ? (typeof item.label === 'function' ? item.label(context) : item.label) : '';

                const labelSpan = document.createElement('span');
                labelSpan.className = 'menu-item-label';

                // Icon (falls vorhanden)
                if (item.icon && window.IconSystem) {
                    const iconSpan = document.createElement('span');
                    iconSpan.className = 'menu-item-icon';
                    const iconSvg = window.IconSystem.getMenuIconSvg ? window.IconSystem.getMenuIconSvg(item.icon) : '';
                    if (window.IconSystem.renderIconIntoElement) {
                        window.IconSystem.renderIconIntoElement(iconSpan, iconSvg, item.icon);
                    }
                    labelSpan.appendChild(iconSpan);
                }

                labelSpan.appendChild(document.createTextNode(itemLabel));
                actionEl.appendChild(labelSpan);

                // Shortcut (falls vorhanden)
                if (item.shortcut) {
                    const shortcutSpan = document.createElement('span');
                    shortcutSpan.className = 'menu-item-shortcut';
                    shortcutSpan.textContent = item.shortcut;
                    actionEl.appendChild(shortcutSpan);
                }

                actionEl.setAttribute('role', 'menuitem');
                if (item.title) {
                    actionEl.title = item.title;
                }

                const isDisabled = Boolean(item.disabled);
                if (isDisabled) {
                    actionEl.setAttribute('aria-disabled', 'true');
                    if (tagName === 'button') {
                        actionEl.disabled = true;
                    }
                } else if (typeof item.action === 'function') {
                    const actionId = registerMenuAction(item.action);
                    if (actionId) {
                        actionEl.dataset.menuAction = actionId;
                    }
                }

                if (item.href && typeof item.onClick === 'function') {
                    actionEl.addEventListener('click', (event) => {
                        const result = item.onClick(event);
                        if (result === false) {
                            event.preventDefault();
                        }
                    });
                }

                li.appendChild(actionEl);
                dropdown.appendChild(li);
            });

            if (!dropdown.childElementCount) {
                return;
            }

            trigger.appendChild(button);
            trigger.appendChild(dropdown);
            container.appendChild(trigger);

            // Bind dropdown functionality
            if (window.bindDropdownTrigger) {
                window.bindDropdownTrigger(button, { hoverRequiresOpen: true });
            }
        });
    }

    function handleMenuActionActivation(event) {
        const target = event.target instanceof Element ? event.target.closest('[data-menu-action]') : null;
        if (!target) return;

        const actionId = target.getAttribute('data-menu-action');
        const handler = actionId ? menuActionHandlers.get(actionId) : null;

        if (typeof handler !== 'function') return;

        event.preventDefault();
        event.stopPropagation();

        if (window.hideMenuDropdowns) window.hideMenuDropdowns();

        try {
            handler();
        } catch (err) {
            console.error('Fehler beim Ausführen eines Menübefehls:', err);
        }
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    function closeContextWindow(context) {
        const dialog = context && context.dialog;
        if (dialog && typeof dialog.close === 'function') {
            dialog.close();
        }
    }

    function hasAnyVisibleDialog() {
        if (!window.dialogs) return false;
        return Object.values(window.dialogs).some(d => d && d.isOpen && d.isOpen());
    }

    function sendTextEditorMenuAction(actionType) {
        if (window.sendTextEditorMenuAction) {
            window.sendTextEditorMenuAction(actionType);
        }
    }

    function createMenuContext(modalId) {
        if (window.createMenuContext) {
            return window.createMenuContext(modalId);
        }
        // Fallback minimal context
        return { modalId: modalId, dialog: null };
    }

    function translate(key, fallback) {
        if (window.appI18n && typeof window.appI18n.translate === 'function') {
            const result = window.appI18n.translate(key);
            if (result === key && fallback) return fallback;
            return result;
        }
        return fallback || key;
    }

    // ============================================================================
    // EXPORT
    // ============================================================================

    window.MenuSystem = {
        renderApplicationMenu,
        handleMenuActionActivation,
        menuDefinitions,
        getCurrentMenuModalId: () => currentMenuModalId
    };

    console.log('✅ MenuSystem loaded');

})();
