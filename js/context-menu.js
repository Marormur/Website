'use strict';
/*
 * src/ts/context-menu.ts
 * Typed port of js/context-menu.js
 */
Object.defineProperty(exports, '__esModule', { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const guardKey = '__customContextMenuInit';
if (window[guardKey]) {
    // already initialized
} else {
    window[guardKey] = true;
    const i18n = window.appI18n || {
        translate: k => k,
        applyTranslations: _el => {},
    };
    const hideAllDropdowns =
        typeof window.hideMenuDropdowns === 'function'
            ? window.hideMenuDropdowns
            : () => {
                  const domUtils = window.DOMUtils;
                  document.querySelectorAll('.menu-dropdown').forEach(d => {
                      if (domUtils && typeof domUtils.hide === 'function') {
                          domUtils.hide(d);
                      } else {
                          d.classList.add('hidden');
                      }
                  });
                  document
                      .querySelectorAll('[aria-expanded="true"]')
                      .forEach(b => b.setAttribute('aria-expanded', 'false'));
              };
    function openModal(id) {
        const el = document.getElementById(id);
        if (!el) return;
        if (!window.dialogs) window.dialogs = {};
        if (!window.dialogs[id] && typeof window.Dialog === 'function') {
            try {
                window.dialogs[id] = new window.Dialog(id);
            } catch {
                // noop
            }
        }
        const dlg = window.dialogs[id];
        if (dlg && typeof dlg.open === 'function') {
            dlg.open();
        } else {
            const domUtils = window.DOMUtils;
            if (domUtils && typeof domUtils.show === 'function') {
                domUtils.show(el);
            } else {
                el.classList.remove('hidden');
            }
            if (typeof window.bringDialogToFront === 'function') {
                window.bringDialogToFront(id);
            }
        }
        if (typeof window.updateProgramLabelByTopModal === 'function') {
            window.updateProgramLabelByTopModal();
        }
    }
    function toggleDarkMode() {
        if (window.SystemUI && typeof window.SystemUI.handleSystemToggle === 'function') {
            window.SystemUI.handleSystemToggle('dark-mode');
        } else {
            const next = !document.documentElement.classList.contains('dark');
            document.documentElement.classList.toggle('dark', next);
            if (window.ThemeSystem && typeof window.ThemeSystem.setThemePreference === 'function') {
                window.ThemeSystem.setThemePreference(next ? 'dark' : 'light');
            }
        }
    }
    function getMenuItemsForTarget(target) {
        const items = [];
        const inDesktop = !!(target && target.closest && target.closest('#desktop'));
        const inDockItem = !!(target && target.closest && target.closest('#dock .dock-item'));
        const inImageModal = !!(target && target.closest && target.closest('#image-modal'));
        const inFinderModal = !!(
            target &&
            target.closest &&
            target.closest('[role="dialog"][id*="finder"]')
        );
        if (inDockItem) {
            const dockItem = target.closest('#dock .dock-item');
            const winId = dockItem && dockItem.getAttribute('data-window-id');
            if (winId) {
                items.push({
                    id: 'open-dock-window',
                    label: i18n.translate('context.open') || 'Öffnen',
                    action: () => openModal(winId),
                });
                items.push({ type: 'separator' });
            }
        }
        if (inImageModal && typeof window.getImageViewerState === 'function') {
            const st = window.getImageViewerState();
            if (st && st.hasImage) {
                items.push({
                    id: 'image-open-tab',
                    label:
                        i18n.translate('context.image.openInTab') ||
                        i18n.translate('menu.image.openInTab') ||
                        'Bild in neuem Tab öffnen',
                    action: () => {
                        if (typeof window.openActiveImageInNewTab === 'function')
                            window.openActiveImageInNewTab();
                    },
                });
                items.push({
                    id: 'image-save',
                    label:
                        i18n.translate('context.image.save') ||
                        i18n.translate('menu.image.saveImage') ||
                        'Bild sichern …',
                    action: () => {
                        if (typeof window.downloadActiveImage === 'function')
                            window.downloadActiveImage();
                    },
                });
                items.push({ type: 'separator' });
            }
        }
        if (inFinderModal) {
            const finderItem =
                target && target.closest && target.closest('.finder-list-item, .finder-grid-item');
            if (finderItem) {
                const itemName = finderItem.getAttribute('data-item-name');
                const itemType = finderItem.getAttribute('data-item-type');
                if (itemName && itemType) {
                    items.push({
                        id: 'finder-open-item',
                        label: i18n.translate('context.finder.openItem') || 'Öffnen',
                        action: () => {
                            if (
                                window.FinderSystem &&
                                typeof window.FinderSystem.openItem === 'function'
                            )
                                window.FinderSystem.openItem(itemName, itemType);
                        },
                    });
                    // "Open with Preview" for image files
                    const isImage = /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(itemName);
                    if (isImage && itemType === 'file') {
                        items.push({
                            id: 'finder-open-with-preview',
                            label:
                                i18n.translate('context.finder.openWithPreview') ||
                                'Öffnen mit Vorschau',
                            action: () => {
                                // Use ActionBus for simplicity
                                const ab = window.ActionBus;
                                if (ab && typeof ab.execute === 'function') {
                                    ab.execute('openWithPreview', { itemName });
                                }
                            },
                        });
                    }
                    items.push({ type: 'separator' });
                    items.push({
                        id: 'finder-get-info',
                        label: i18n.translate('context.finder.getInfo') || 'Informationen',
                        action: () => {
                            console.log('Get info for:', itemName, itemType);
                        },
                    });
                    return items;
                }
            }
            items.push({
                id: 'finder-refresh',
                label: i18n.translate('context.finder.refresh') || 'Aktualisieren',
                action: () => {
                    if (
                        window.FinderSystem &&
                        typeof window.FinderSystem.navigateTo === 'function'
                    ) {
                        const state = window.FinderSystem.getState();
                        if (state) {
                            window.FinderSystem.navigateTo(state.currentPath, state.currentView);
                        }
                    }
                },
            });
            items.push({ type: 'separator' });
            const currentViewMode =
                window.FinderSystem && window.FinderSystem.getState
                    ? window.FinderSystem.getState().viewMode
                    : 'list';
            if (currentViewMode !== 'list') {
                items.push({
                    id: 'finder-view-list',
                    label: i18n.translate('context.finder.viewList') || 'Als Liste',
                    action: () => {
                        if (
                            window.FinderSystem &&
                            typeof window.FinderSystem.setViewMode === 'function'
                        )
                            window.FinderSystem.setViewMode('list');
                    },
                });
            }
            if (currentViewMode !== 'grid') {
                items.push({
                    id: 'finder-view-grid',
                    label: i18n.translate('context.finder.viewGrid') || 'Als Raster',
                    action: () => {
                        if (
                            window.FinderSystem &&
                            typeof window.FinderSystem.setViewMode === 'function'
                        )
                            window.FinderSystem.setViewMode('grid');
                    },
                });
            }
            items.push({ type: 'separator' });
            items.push({
                id: 'finder-sort-name',
                label: i18n.translate('context.finder.sortByName') || 'Nach Name sortieren',
                action: () => {
                    if (window.FinderSystem && typeof window.FinderSystem.setSortBy === 'function')
                        window.FinderSystem.setSortBy('name');
                },
            });
            items.push({
                id: 'finder-sort-date',
                label: i18n.translate('context.finder.sortByDate') || 'Nach Datum sortieren',
                action: () => {
                    if (window.FinderSystem && typeof window.FinderSystem.setSortBy === 'function')
                        window.FinderSystem.setSortBy('date');
                },
            });
            items.push({
                id: 'finder-sort-size',
                label: i18n.translate('context.finder.sortBySize') || 'Nach Größe sortieren',
                action: () => {
                    if (window.FinderSystem && typeof window.FinderSystem.setSortBy === 'function')
                        window.FinderSystem.setSortBy('size');
                },
            });
            return items;
        }
        if (inDesktop) {
            items.push({
                id: 'open-finder',
                label: i18n.translate('context.openFinder') || 'Finder öffnen',
                action: () => {
                    const W = window;
                    W.FinderWindow?.focusOrCreate();
                },
            });
            items.push({
                id: 'open-text',
                label: i18n.translate('context.openTextEditor') || 'Texteditor öffnen',
                action: () => openModal('text-modal'),
            });
            items.push({
                id: 'open-projects',
                label: i18n.translate('context.openProjects') || 'Projekte öffnen',
                action: () => openModal('projects-modal'),
            });
            items.push({ type: 'separator' });
            items.push({
                id: 'toggle-dark',
                label: i18n.translate('context.toggleDarkMode') || 'Dark Mode umschalten',
                action: toggleDarkMode,
            });
            items.push({
                id: 'open-settings',
                label: i18n.translate('context.openSettings') || 'Systemeinstellungen …',
                action: () => openModal('settings-modal'),
            });
            items.push({ type: 'separator' });
            items.push({
                id: 'about',
                label: i18n.translate('context.about') || 'Über Marvin',
                action: () => openModal('about-modal'),
            });
            return items;
        }
        items.push({
            id: 'open-finder',
            label: i18n.translate('context.openFinder') || 'Finder öffnen',
            action: () => {
                const W = window;
                W.FinderWindow?.focusOrCreate();
            },
        });
        items.push({
            id: 'open-text',
            label: i18n.translate('context.openTextEditor') || 'Texteditor öffnen',
            action: () => openModal('text-modal'),
        });
        items.push({ type: 'separator' });
        items.push({
            id: 'toggle-dark',
            label: i18n.translate('context.toggleDarkMode') || 'Dark Mode umschalten',
            action: toggleDarkMode,
        });
        items.push({
            id: 'open-settings',
            label: i18n.translate('context.openSettings') || 'Systemeinstellungen …',
            action: () => openModal('settings-modal'),
        });
        items.push({ type: 'separator' });
        items.push({
            id: 'about',
            label: i18n.translate('context.about') || 'Über Marvin',
            action: () => openModal('about-modal'),
        });
        return items;
    }
    // Create DOM once
    const menu = document.createElement('ul');
    menu.id = 'context-menu';
    menu.className = 'menu-dropdown context-menu hidden';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', i18n.translate('context.menuLabel') || 'Kontextmenü');
    document.addEventListener('DOMContentLoaded', () => {
        if (!document.body.contains(menu)) document.body.appendChild(menu);
        try {
            i18n.applyTranslations(menu);
        } catch {}
    });
    function clearMenu() {
        while (menu.firstChild) menu.removeChild(menu.firstChild);
    }
    function renderMenu(items) {
        clearMenu();
        const fragment = document.createDocumentFragment();
        let firstFocusable = null;
        items.forEach((it, idx) => {
            if (it.type === 'separator') {
                const sep = document.createElement('li');
                sep.className = 'menu-separator';
                sep.setAttribute('role', 'separator');
                fragment.appendChild(sep);
                return;
            }
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'menu-item';
            btn.setAttribute('role', 'menuitem');
            btn.tabIndex = -1;
            btn.dataset.itemId = it.id || 'item-' + idx;
            const labelSpan = document.createElement('span');
            labelSpan.className = 'menu-item-label';
            labelSpan.textContent = it.label || '';
            btn.appendChild(labelSpan);
            btn.addEventListener('click', ev => {
                ev.stopPropagation();
                hideContextMenu();
                try {
                    if (it.action) {
                        it.action();
                    }
                } catch (e) {
                    console.warn('Context action failed', e);
                }
            });
            li.appendChild(btn);
            fragment.appendChild(li);
            if (!firstFocusable) firstFocusable = btn;
        });
        menu.appendChild(fragment);
        try {
            i18n.applyTranslations(menu);
        } catch {}
        return firstFocusable;
    }
    function clampPosition(x, y) {
        const rect = menu.getBoundingClientRect();
        const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        const margin = 6;
        const nx = Math.min(Math.max(margin, x), Math.max(margin, vw - rect.width - margin));
        const ny = Math.min(Math.max(margin, y), Math.max(margin, vh - rect.height - margin));
        return { x: nx, y: ny };
    }
    function showContextMenu(ev) {
        const target = ev.target instanceof Element ? ev.target : null;
        if (!target) return;
        if (target.closest('input, textarea, [contenteditable="true"]')) return;
        ev.preventDefault();
        ev.stopPropagation();
        hideAllDropdowns();
        buildAndOpenAt(ev.clientX, ev.clientY, target);
    }
    function buildAndOpenAt(x, y, target) {
        const items = getMenuItemsForTarget(target);
        const firstFocusable = renderMenu(items);
        if (document.body && menu.parentElement !== document.body) {
            document.body.appendChild(menu);
        } else if (document.body && document.body.lastElementChild !== menu) {
            document.body.appendChild(menu);
        }
        const domUtils = window.DOMUtils;
        if (domUtils && typeof domUtils.show === 'function') {
            domUtils.show(menu);
        } else {
            menu.classList.remove('hidden');
        }
        menu.style.left = Math.max(0, x) + 'px';
        menu.style.top = Math.max(0, y) + 'px';
        const clamped = clampPosition(x, y);
        menu.style.left = clamped.x + 'px';
        menu.style.top = clamped.y + 'px';
        if (lastInvokeWasKeyboard && firstFocusable) {
            firstFocusable.focus();
        }
        bindAutoClose();
    }
    function hideContextMenu() {
        const domUtils = window.DOMUtils;
        if (!menu.classList.contains('hidden')) {
            if (domUtils && typeof domUtils.hide === 'function') {
                domUtils.hide(menu);
            } else {
                menu.classList.add('hidden');
            }
        }
        unbindAutoClose();
    }
    let onDocClick = null;
    let onDocScroll = null;
    let onResize = null;
    let onKeyDown = null;
    function bindAutoClose() {
        unbindAutoClose();
        onDocClick = e => {
            const t = e.target instanceof Element ? e.target : null;
            if (!t) {
                hideContextMenu();
                return;
            }
            if (t.closest('#context-menu')) return;
            hideContextMenu();
        };
        onDocScroll = () => hideContextMenu();
        onResize = () => hideContextMenu();
        onKeyDown = e => {
            const items = Array.from(menu.querySelectorAll('.menu-item'));
            const focusIdx = items.findIndex(el => el === document.activeElement);
            if (e.key === 'Escape') {
                e.preventDefault();
                hideContextMenu();
                return;
            }
            if (!items.length) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = items[(Math.max(0, focusIdx) + 1) % items.length];
                if (next) next.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const next = items[(focusIdx > 0 ? focusIdx : items.length) - 1];
                if (next) next.focus();
            } else if (e.key === 'Home') {
                e.preventDefault();
                items[0]?.focus();
            } else if (e.key === 'End') {
                e.preventDefault();
                items[items.length - 1]?.focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
                if (
                    document.activeElement &&
                    document.activeElement.classList.contains('menu-item')
                ) {
                    e.preventDefault();
                    document.activeElement.click();
                }
            }
        };
        document.addEventListener('click', onDocClick, { capture: true });
        document.addEventListener('contextmenu', onDocClick, { capture: true });
        document.addEventListener('scroll', onDocScroll, { capture: true });
        window.addEventListener('resize', onResize);
        document.addEventListener('keydown', onKeyDown);
    }
    function unbindAutoClose() {
        if (onDocClick) document.removeEventListener('click', onDocClick, { capture: true });
        if (onDocClick)
            document.removeEventListener('contextmenu', onDocClick, {
                capture: true,
            });
        if (onDocScroll) document.removeEventListener('scroll', onDocScroll, { capture: true });
        if (onResize) window.removeEventListener('resize', onResize);
        if (onKeyDown) document.removeEventListener('keydown', onKeyDown);
        onDocClick = onDocScroll = onResize = onKeyDown = null;
    }
    let lastInvokeWasKeyboard = false;
    document.addEventListener('keydown', e => {
        if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
            lastInvokeWasKeyboard = true;
        }
    });
    document.addEventListener(
        'keyup',
        () => {
            lastInvokeWasKeyboard = false;
        },
        { capture: true }
    );
    document.addEventListener('contextmenu', showContextMenu);
    if (typeof window.bindDropdownTrigger === 'function') {
        document.querySelectorAll('[data-menubar-trigger-button="true"]').forEach(btn => {
            btn.addEventListener('click', () => hideContextMenu());
        });
    }
}
//# sourceMappingURL=context-menu.js.map
