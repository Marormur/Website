/*
 LEGACY JS: This file is part of the repository's legacy JavaScript sources.
 Maintained in-place. Prefer editing corresponding TypeScript sources in src/ts when available.
 Last edited (lint-maintenance): 2025-10-27
*/
// Desktop icons and selection logic
// Exports: window.DesktopSystem
(function (global) {
    'use strict';

    // Local translate helper (doesn't depend on app.js)
    function translate(key, fallback) {
        if (!global.appI18n || typeof global.appI18n.translate !== 'function') {
            return fallback || key;
        }
        const result = global.appI18n.translate(key);
        if (result === key && fallback) return fallback;
        return result;
    }

    const DESKTOP_ITEMS = [
        // { id: 'about', modalId: 'about-modal', icon: './img/profil.jpg', labelKey: 'desktop.about', fallbackLabel: 'Über Marvin' },
        // Shortcut: Photos App
        {
            id: 'photos',
            modalId: 'image-modal',
            icon: './img/photos-app-icon.svg',
            labelKey: 'desktop.photos',
            fallbackLabel: 'Fotos',
        },
        // Shortcut: GitHub "Ordner" öffnet den Finder direkt in der GitHub-Ansicht
        {
            id: 'github',
            // Verwende Emoji-Icon für den Ordner, bis ein spezielles Icon vorhanden ist
            emoji: '📂',
            labelKey: 'desktop.github',
            fallbackLabel: 'GitHub Projekte',
            onOpen: () => {
                // Öffne Finder-Modal (neues Fenster-System)
                if (window.API?.window?.open) {
                    window.API.window.open('finder-modal');
                } else {
                    const modal = document.getElementById('finder-modal');
                    if (modal) modal.classList.remove('hidden');
                }

                // Multi-Instance bevorzugt
                if (window.FinderInstanceManager) {
                    // Stelle sicher, dass mindestens eine Instanz existiert
                    if (!window.FinderInstanceManager.hasInstances()) {
                        window.FinderInstanceManager.createInstance({ title: 'Finder' });
                    }
                    const active =
                        window.FinderInstanceManager.getActiveInstance() ||
                        window.FinderInstanceManager.getAllInstances()[0];
                    if (active && typeof active.switchView === 'function') {
                        active.switchView('github');
                        // Bringe die Instanz in den Vordergrund
                        window.FinderInstanceManager.setActiveInstance(active.instanceId);
                        if (window.MultiInstanceIntegration?.showInstance) {
                            window.MultiInstanceIntegration.showInstance(
                                'finder',
                                active.instanceId
                            );
                        } else if (typeof active.show === 'function') {
                            active.show();
                        }
                    }
                    return true;
                }

                // Fallback auf Legacy FinderSystem
                if (window.FinderSystem && typeof window.FinderSystem.navigateTo === 'function') {
                    window.FinderSystem.navigateTo([], 'github');
                    return true;
                }

                return false;
            },
        },
    ];

    const desktopItemsById = new Map();
    const desktopButtons = new Map();
    let desktopSelectedItemId = null;
    const desktopSelectedIds = new Set();
    let desktopLastFocusedIndex = -1;
    let desktopSuppressBackgroundClick = false;

    function updateDesktopSelectionUI() {
        if (desktopLastFocusedIndex >= 0 && DESKTOP_ITEMS[desktopLastFocusedIndex]) {
            desktopSelectedItemId = DESKTOP_ITEMS[desktopLastFocusedIndex].id;
        } else {
            desktopSelectedItemId =
                desktopSelectedIds.size === 1 ? Array.from(desktopSelectedIds)[0] : null;
        }
        desktopButtons.forEach((btn, id) => {
            if (desktopSelectedIds.has(id)) {
                btn.dataset.selected = 'true';
                btn.setAttribute('aria-selected', 'true');
            } else {
                btn.removeAttribute('data-selected');
                btn.setAttribute('aria-selected', 'false');
            }
        });
    }

    function getDesktopAreaElement() {
        return document.getElementById('desktop');
    }
    function getDesktopContainerElement() {
        return document.getElementById('desktop-icons');
    }

    function createDesktopButton(item, index) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'desktop-icon-button no-select';
        button.dataset.desktopItemId = item.id;
        button.dataset.desktopIndex = String(index);
        // Use ActionBus for double-click to open; keep single-tap logic locally for touch/pen
        button.setAttribute('data-action-dblclick', 'openDesktopItem');
        button.setAttribute('data-item-id', item.id);
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', 'false');
        button.setAttribute('data-i18n-title', item.labelKey);
        button.setAttribute('data-i18n-aria-label', item.labelKey);
        const labelText = translate(item.labelKey, item.fallbackLabel);
        button.title = labelText;
        button.setAttribute('aria-label', labelText);
        button.draggable = false;

        const graphic = document.createElement('span');
        graphic.className = 'desktop-icon-graphic';
        if (item.icon) {
            const img = document.createElement('img');
            img.src = item.icon;
            img.alt = '';
            img.decoding = 'async';
            img.referrerPolicy = 'no-referrer';
            img.draggable = false;
            graphic.appendChild(img);
        } else if (item.emoji) {
            graphic.textContent = item.emoji;
        }
        button.appendChild(graphic);

        const label = document.createElement('span');
        label.className = 'desktop-icon-label no-select';
        label.textContent = labelText;
        label.setAttribute('data-i18n', item.labelKey);
        button.appendChild(label);

        button.addEventListener('pointerdown', event => {
            if (!event) return;
            if (event.pointerType) {
                button.dataset.activePointerType = event.pointerType;
            } else {
                delete button.dataset.activePointerType;
            }
        });
        button.addEventListener(
            'touchstart',
            () => {
                button.dataset.activePointerType = 'touch';
            },
            { passive: true }
        );
        button.addEventListener('mousedown', () => {
            button.dataset.activePointerType = 'mouse';
        });

        button.addEventListener('click', event => {
            event.preventDefault();
            const index = Number(button.dataset.desktopIndex || 0);
            const isMeta = event.ctrlKey || event.metaKey;
            const isShift = event.shiftKey;

            if (isShift && desktopLastFocusedIndex >= 0) {
                const start = Math.min(desktopLastFocusedIndex, index);
                const end = Math.max(desktopLastFocusedIndex, index);
                for (let i = start; i <= end; i++) {
                    const id = (DESKTOP_ITEMS[i] && DESKTOP_ITEMS[i].id) || null;
                    if (id) desktopSelectedIds.add(id);
                }
                desktopLastFocusedIndex = index;
                updateDesktopSelectionUI();
            } else if (isMeta) {
                if (desktopSelectedIds.has(item.id)) desktopSelectedIds.delete(item.id);
                else desktopSelectedIds.add(item.id);
                desktopLastFocusedIndex = index;
                updateDesktopSelectionUI();
            } else {
                desktopSelectedIds.clear();
                desktopSelectedIds.add(item.id);
                desktopLastFocusedIndex = index;
                updateDesktopSelectionUI();
            }

            const pointerType = button.dataset.activePointerType || '';
            const shouldOpenOnSingleTap = pointerType === 'touch' || pointerType === 'pen';
            // Double-click open is handled by ActionBus via data-action-dblclick
            if (shouldOpenOnSingleTap) {
                openDesktopItemById(item.id);
            }
            delete button.dataset.activePointerType;
        });

        button.addEventListener('keydown', handleDesktopKeydown);
        button.addEventListener('focus', () => {
            selectDesktopItem(item.id, { focus: false });
        });

        return button;
    }

    function renderDesktopIcons() {
        const container = getDesktopContainerElement();
        if (!container) return;
        container.innerHTML = '';
        desktopItemsById.clear();
        desktopButtons.clear();
        DESKTOP_ITEMS.forEach((item, index) => {
            desktopItemsById.set(item.id, item);
            const button = createDesktopButton(item, index);
            desktopButtons.set(item.id, button);
            container.appendChild(button);
        });
        if (global.appI18n && typeof global.appI18n.applyTranslations === 'function') {
            global.appI18n.applyTranslations(container);
        }
    }

    function selectDesktopItem(itemId, options = {}) {
        const { focus = true } = options;
        if (desktopSelectedItemId && desktopSelectedItemId === itemId) {
            if (focus && desktopButtons.has(itemId)) {
                const btn = desktopButtons.get(itemId);
                if (typeof btn.focus === 'function') {
                    try {
                        btn.focus({ preventScroll: true });
                    } catch {
                        btn.focus();
                    }
                }
            }
            return;
        }
        if (desktopSelectedItemId && desktopButtons.has(desktopSelectedItemId)) {
            const previousButton = desktopButtons.get(desktopSelectedItemId);
            previousButton.removeAttribute('data-selected');
            previousButton.setAttribute('aria-selected', 'false');
        }
        desktopSelectedIds.clear();
        if (itemId) desktopSelectedIds.add(itemId);
        desktopLastFocusedIndex = DESKTOP_ITEMS.findIndex(entry => entry.id === itemId);
        updateDesktopSelectionUI();
        if (focus && itemId && desktopButtons.has(itemId)) {
            const nextButton = desktopButtons.get(itemId);
            if (typeof nextButton.focus === 'function') {
                try {
                    nextButton.focus({ preventScroll: true });
                } catch {
                    nextButton.focus();
                }
            }
        }
    }

    function clearDesktopSelection(options = {}) {
        const { blur = false } = options;
        const hadSelection = desktopSelectedIds.size > 0 || desktopSelectedItemId !== null;
        desktopSelectedIds.clear();
        desktopLastFocusedIndex = -1;
        desktopSelectedItemId = null;
        desktopButtons.forEach(btn => {
            btn.removeAttribute('data-selected');
            btn.setAttribute('aria-selected', 'false');
        });
        if (!hadSelection) return;
        if (blur) {
            const prev = document.querySelector('.desktop-icon-button[aria-selected="true"]');
            if (prev && typeof prev.blur === 'function') prev.blur();
        }
    }

    function focusDesktopItemByIndex(index) {
        if (!Array.isArray(DESKTOP_ITEMS) || DESKTOP_ITEMS.length === 0) return;
        if (index < 0) index = 0;
        if (index >= DESKTOP_ITEMS.length) index = DESKTOP_ITEMS.length - 1;
        const item = DESKTOP_ITEMS[index];
        if (!item) return;
        selectDesktopItem(item.id, { focus: true });
    }

    function moveDesktopSelection(offset) {
        if (!offset) return;
        if (!Array.isArray(DESKTOP_ITEMS) || DESKTOP_ITEMS.length === 0) return;
        const currentIndex = desktopSelectedItemId
            ? DESKTOP_ITEMS.findIndex(entry => entry.id === desktopSelectedItemId)
            : -1;
        let targetIndex;
        if (currentIndex === -1) {
            targetIndex = offset > 0 ? 0 : DESKTOP_ITEMS.length - 1;
        } else {
            targetIndex = currentIndex + offset;
            if (targetIndex < 0) targetIndex = 0;
            if (targetIndex >= DESKTOP_ITEMS.length) targetIndex = DESKTOP_ITEMS.length - 1;
        }
        focusDesktopItemByIndex(targetIndex);
    }

    function openDesktopItem(item) {
        if (!item) return false;
        if (typeof item.onOpen === 'function') return !!item.onOpen(item);
        if (item.modalId) {
            const dialog = global.dialogs && global.dialogs[item.modalId];
            if (dialog && typeof dialog.open === 'function') {
                dialog.open();
                return true;
            }
            const modalElement = document.getElementById(item.modalId);
            if (modalElement) {
                modalElement.classList.remove('hidden');
                if (typeof global.bringDialogToFront === 'function') {
                    global.bringDialogToFront(item.modalId);
                }
                if (typeof global.updateProgramLabelByTopModal === 'function') {
                    global.updateProgramLabelByTopModal();
                }
                return true;
            }
        }
        if (item.href) {
            const target = item.target || '_blank';
            global.open(item.href, target, 'noopener');
            return true;
        }
        return false;
    }

    function openDesktopItemById(itemId) {
        if (!itemId) return false;
        const item = desktopItemsById.get(itemId);
        if (!item) return false;
        selectDesktopItem(itemId, { focus: true });
        return openDesktopItem(item);
    }

    function handleDesktopKeydown(event) {
        const { key } = event;
        const target = event.currentTarget;
        if (!target || !target.dataset) return;
        const itemId = target.dataset.desktopItemId;
        if (!itemId) return;
        switch (key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                openDesktopItemById(itemId);
                return;
            case 'ArrowDown':
            case 'ArrowRight':
                event.preventDefault();
                moveDesktopSelection(1);
                return;
            case 'ArrowUp':
            case 'ArrowLeft':
                event.preventDefault();
                moveDesktopSelection(-1);
                return;
            case 'Home':
                event.preventDefault();
                focusDesktopItemByIndex(0);
                return;
            case 'End':
                event.preventDefault();
                focusDesktopItemByIndex(DESKTOP_ITEMS.length - 1);
                return;
            case 'Escape':
                event.preventDefault();
                clearDesktopSelection({ blur: true });
                return;
            default:
                break;
        }
    }

    function handleDesktopBackgroundPointer(event) {
        if (event && typeof event.button === 'number' && event.button !== 0) return;
        if (desktopSuppressBackgroundClick) return;
        if (event && event.target && event.target.closest('.desktop-icon-button')) return;
        clearDesktopSelection({ blur: true });
    }

    function initDesktop() {
        renderDesktopIcons();
        const desktopArea = getDesktopAreaElement();
        if (desktopArea) {
            desktopArea.addEventListener('click', handleDesktopBackgroundPointer);
            desktopArea.addEventListener('touchstart', handleDesktopBackgroundPointer, {
                passive: true,
            });

            let rubber = null;
            let rubberStart = null;
            const onPointerMove = e => {
                if (!rubber || !rubberStart) return;
                const x1 = Math.min(rubberStart.x, e.clientX);
                const y1 = Math.min(rubberStart.y, e.clientY);
                const x2 = Math.max(rubberStart.x, e.clientX);
                const y2 = Math.max(rubberStart.y, e.clientY);
                rubber.style.left = x1 + 'px';
                rubber.style.top = y1 + 'px';
                rubber.style.width = x2 - x1 + 'px';
                rubber.style.height = y2 - y1 + 'px';
                desktopButtons.forEach(btn => {
                    const rect = btn.getBoundingClientRect();
                    const intersects = !(
                        rect.right < x1 ||
                        rect.left > x2 ||
                        rect.bottom < y1 ||
                        rect.top > y2
                    );
                    if (intersects) btn.classList.add('rubber-selected');
                    else btn.classList.remove('rubber-selected');
                });
            };

            const onPointerUp = e => {
                if (!rubber || !rubberStart) return;
                const selected = [];
                desktopButtons.forEach((btn, id) => {
                    if (btn.classList.contains('rubber-selected')) {
                        selected.push(id);
                        btn.classList.remove('rubber-selected');
                    }
                });
                if (e.ctrlKey || e.metaKey) {
                    selected.forEach(id => {
                        if (desktopSelectedIds.has(id)) desktopSelectedIds.delete(id);
                        else desktopSelectedIds.add(id);
                    });
                } else {
                    desktopSelectedIds.clear();
                    selected.forEach(id => desktopSelectedIds.add(id));
                }
                if (selected.length > 0) {
                    const lastId = selected[selected.length - 1];
                    desktopLastFocusedIndex = DESKTOP_ITEMS.findIndex(entry => entry.id === lastId);
                }
                updateDesktopSelectionUI();
                cleanupRubber();
            };

            const onPointerCancel = () => cleanupRubber();
            const onWindowBlur = () => cleanupRubber();
            const onVisibilityChange = () => {
                if (document.visibilityState !== 'visible') cleanupRubber();
            };

            const cleanupRubber = () => {
                if (!rubber) return;
                desktopButtons.forEach(btn => btn.classList.remove('rubber-selected'));
                try {
                    rubber.remove();
                } catch {
                    /* ignore */
                }
                rubber = null;
                rubberStart = null;
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                window.removeEventListener('pointercancel', onPointerCancel);
                window.removeEventListener('blur', onWindowBlur);
                document.removeEventListener('visibilitychange', onVisibilityChange);
                desktopSuppressBackgroundClick = true;
                setTimeout(() => {
                    desktopSuppressBackgroundClick = false;
                }, 120);
            };

            desktopArea.addEventListener('pointerdown', e => {
                if (e.button !== 0) return;
                if (e.target && e.target.closest && e.target.closest('.desktop-icon-button'))
                    return;
                rubberStart = { x: e.clientX, y: e.clientY };
                rubber = document.createElement('div');
                rubber.className = 'desktop-rubberband';
                Object.assign(rubber.style, {
                    position: 'fixed',
                    left: rubberStart.x + 'px',
                    top: rubberStart.y + 'px',
                    width: '0px',
                    height: '0px',
                    zIndex: 99999,
                    border: '1px dashed rgba(255,255,255,0.6)',
                    background: 'rgba(59,130,246,0.12)',
                    pointerEvents: 'none',
                });
                document.body.appendChild(rubber);
                desktopSuppressBackgroundClick = true;
                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp);
                window.addEventListener('pointercancel', onPointerCancel);
                window.addEventListener('blur', onWindowBlur);
                document.addEventListener('visibilitychange', onVisibilityChange);
            });
        }
    }

    global.DesktopSystem = {
        initDesktop,
        renderDesktopIcons,
        selectDesktopItem,
        moveDesktopSelection,
        openDesktopItemById,
        clearDesktopSelection,
    };
})(window);
