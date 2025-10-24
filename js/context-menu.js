// ============================================================================
// js/context-menu.js — Custom macOS-like Context Menu (right-click)
// ============================================================================
// Features:
// - Replaces browser default context menu on right-click
// - Uses existing .menu-dropdown/.menu-item styles for visual consistency
// - Positions near cursor with viewport clamping
// - Keyboard navigation (Up/Down, Home/End, Enter, Escape)
// - Closes on click outside, scroll, resize, or Escape
// - Integrates with existing app actions (open modals, toggle dark mode)
// ============================================================================

(function () {
    'use strict';

    // Guard: run only once
    if (window.__customContextMenuInit) return;
    window.__customContextMenuInit = true;

    const i18n = window.appI18n || {
        translate: (k) => k,
        applyTranslations: () => { }
    };

    // Prefer existing helpers if available
    const hideAllDropdowns = typeof window.hideMenuDropdowns === 'function'
        ? window.hideMenuDropdowns
        : () => {
            document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.add('hidden'));
            document.querySelectorAll('[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
        };

    // Actions
    function openModal(id) {
        // Prefer Dialog API if available
        const el = document.getElementById(id);
        if (!el) return;
        if (!window.dialogs) window.dialogs = {};
        if (!window.dialogs[id] && typeof window.Dialog === 'function') {
            try { window.dialogs[id] = new window.Dialog(id); } catch (e) { /* noop */ }
        }
        const dlg = window.dialogs[id];
        if (dlg && typeof dlg.open === 'function') {
            dlg.open();
        } else {
            el.classList.remove('hidden');
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

    // Build menu items depending on target if needed (extensible)
    function getMenuItemsForTarget(target) {
        const items = [];

        const inDesktop = !!(target && target.closest && target.closest('#desktop'));
        const inDockItem = !!(target && target.closest && target.closest('#dock .dock-item'));
        const inImageModal = !!(target && target.closest && target.closest('#image-modal'));

        // Dock item: offer "Open", "Quit", and "Options"
        if (inDockItem) {
            const dockItem = target.closest('#dock .dock-item');
            const winId = dockItem && dockItem.getAttribute('data-window-id');
            if (winId) {
                // Check if window is currently open
                const windowEl = document.getElementById(winId);
                const isOpen = windowEl && !windowEl.classList.contains('hidden');
                
                items.push({
                    id: 'open-dock-window',
                    label: i18n.translate('context.dock.open') || i18n.translate('context.open') || 'Öffnen',
                    action: () => openModal(winId)
                });
                
                if (isOpen) {
                    items.push({
                        id: 'quit-dock-window',
                        label: i18n.translate('context.dock.quit') || 'Beenden',
                        action: () => {
                            // Close the window
                            if (windowEl) {
                                windowEl.classList.add('hidden');
                                // Update indicator if present
                                const indicator = dockItem.querySelector('[id$="-indicator"]');
                                if (indicator) {
                                    indicator.classList.add('hidden');
                                }
                                // Update program label
                                if (typeof window.updateProgramLabelByTopModal === 'function') {
                                    window.updateProgramLabelByTopModal();
                                }
                            }
                        }
                    });
                }
                
                items.push({ type: 'separator' });
                items.push({
                    id: 'dock-options',
                    label: i18n.translate('context.dock.options') || 'Optionen',
                    action: () => {
                        // Could open settings or show dock preferences
                        openModal('settings-modal');
                    }
                });
                items.push({ type: 'separator' });
            }
        }

        // Image viewer: offer image actions if image present
        if (inImageModal && typeof window.getImageViewerState === 'function') {
            const st = window.getImageViewerState();
            if (st && st.hasImage) {
                items.push({
                    id: 'image-open-tab',
                    label: i18n.translate('context.image.openInTab') || i18n.translate('menu.image.openInTab') || 'Bild in neuem Tab öffnen',
                    action: () => { if (typeof window.openActiveImageInNewTab === 'function') window.openActiveImageInNewTab(); }
                });
                items.push({
                    id: 'image-save',
                    label: i18n.translate('context.image.save') || i18n.translate('menu.image.saveImage') || 'Bild sichern …',
                    action: () => { if (typeof window.downloadActiveImage === 'function') window.downloadActiveImage(); }
                });
                items.push({ type: 'separator' });
            }
        }

        // Desktop: show a slightly different primary set
        if (inDesktop) {
            items.push({ id: 'open-finder', label: i18n.translate('context.openFinder') || 'Finder öffnen', action: () => openModal('finder-modal') });
            items.push({ id: 'open-text', label: i18n.translate('context.openTextEditor') || 'Texteditor öffnen', action: () => openModal('text-modal') });
            items.push({ id: 'open-projects', label: i18n.translate('context.openProjects') || 'Projekte öffnen', action: () => openModal('projects-modal') });
            items.push({ type: 'separator' });
            items.push({ id: 'toggle-dark', label: i18n.translate('context.toggleDarkMode') || 'Dark Mode umschalten', action: toggleDarkMode });
            items.push({ id: 'open-settings', label: i18n.translate('context.openSettings') || 'Systemeinstellungen …', action: () => openModal('settings-modal') });
            items.push({ type: 'separator' });
            items.push({ id: 'about', label: i18n.translate('context.about') || 'Über Marvin', action: () => openModal('about-modal') });
            return items;
        }

        // Default generic menu
        items.push({ id: 'open-finder', label: i18n.translate('context.openFinder') || 'Finder öffnen', action: () => openModal('finder-modal') });
        items.push({ id: 'open-text', label: i18n.translate('context.openTextEditor') || 'Texteditor öffnen', action: () => openModal('text-modal') });
        items.push({ type: 'separator' });
        items.push({ id: 'toggle-dark', label: i18n.translate('context.toggleDarkMode') || 'Dark Mode umschalten', action: toggleDarkMode });
        items.push({ id: 'open-settings', label: i18n.translate('context.openSettings') || 'Systemeinstellungen …', action: () => openModal('settings-modal') });
        items.push({ type: 'separator' });
        items.push({ id: 'about', label: i18n.translate('context.about') || 'Über Marvin', action: () => openModal('about-modal') });
        return items;
    }

    // Create DOM once
    const menu = document.createElement('ul');
    menu.id = 'context-menu';
    menu.className = 'menu-dropdown context-menu hidden';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', i18n.translate('context.menuLabel') || 'Kontextmenü');
    // Ensure in DOM
    document.addEventListener('DOMContentLoaded', () => {
        if (!document.body.contains(menu)) {
            document.body.appendChild(menu);
        }
        // Apply translations to initial empty shell (safe no-op)
        try { i18n.applyTranslations(menu); } catch (e) { }
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
            btn.dataset.itemId = it.id || ('item-' + idx);
            const labelSpan = document.createElement('span');
            labelSpan.className = 'menu-item-label';
            labelSpan.textContent = it.label || '';
            btn.appendChild(labelSpan);
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                hideContextMenu();
                try { it.action && it.action(); } catch (e) { console.warn('Context action failed', e); }
            });
            li.appendChild(btn);
            fragment.appendChild(li);
            if (!firstFocusable) firstFocusable = btn;
        });
        menu.appendChild(fragment);
        // Translate labels if i18n present
        try { i18n.applyTranslations(menu); } catch (e) { }
        // Focus first item for accessibility when opened via keyboard
        return firstFocusable;
    }

    function clampPosition(x, y) {
        const rect = menu.getBoundingClientRect();
        const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        const margin = 6;
        let nx = Math.min(Math.max(margin, x), Math.max(margin, vw - rect.width - margin));
        let ny = Math.min(Math.max(margin, y), Math.max(margin, vh - rect.height - margin));
        return { x: nx, y: ny };
    }

    function showContextMenu(ev) {
        const target = ev.target instanceof Element ? ev.target : null;
        if (!target) return;

        // Don’t override in editable/inputs
        if (target.closest('input, textarea, [contenteditable="true"]')) {
            return; // allow native
        }

        ev.preventDefault();
        ev.stopPropagation();

        hideAllDropdowns();
        buildAndOpenAt(ev.clientX, ev.clientY, target);
    }

    function buildAndOpenAt(x, y, target) {
        const items = getMenuItemsForTarget(target);
        const firstFocusable = renderMenu(items);
        // ensure menu is last element for stacking within same z-index
        if (document.body && menu.parentElement !== document.body) {
            document.body.appendChild(menu);
        } else if (document.body && document.body.lastElementChild !== menu) {
            document.body.appendChild(menu);
        }
        menu.classList.remove('hidden');
        // Position roughly, then clamp using actual size
        menu.style.left = Math.max(0, x) + 'px';
        menu.style.top = Math.max(0, y) + 'px';
        const clamped = clampPosition(x, y);
        menu.style.left = clamped.x + 'px';
        menu.style.top = clamped.y + 'px';
        // Focus first item if invoked with keyboard (context key or Shift+F10)
        if (lastInvokeWasKeyboard && firstFocusable) {
            firstFocusable.focus();
        }
        bindAutoClose();
    }

    function hideContextMenu() {
        if (!menu.classList.contains('hidden')) {
            menu.classList.add('hidden');
        }
        unbindAutoClose();
    }

    // Auto-close bindings
    let onDocClick, onDocScroll, onResize, onKeyDown;
    function bindAutoClose() {
        unbindAutoClose();
        onDocClick = (e) => {
            const t = e.target instanceof Element ? e.target : null;
            if (!t) { hideContextMenu(); return; }
            if (t.closest('#context-menu')) return; // inside
            hideContextMenu();
        };
        onDocScroll = () => hideContextMenu();
        onResize = () => hideContextMenu();
        onKeyDown = (e) => {
            const items = Array.from(menu.querySelectorAll('.menu-item'));
            const focusIdx = items.findIndex(el => el === document.activeElement);
            if (e.key === 'Escape') {
                e.preventDefault(); hideContextMenu(); return;
            }
            if (!items.length) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = items[(Math.max(0, focusIdx) + 1) % items.length];
                next && next.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const next = items[(focusIdx > 0 ? focusIdx : items.length) - 1];
                next && next.focus();
            } else if (e.key === 'Home') {
                e.preventDefault(); items[0].focus();
            } else if (e.key === 'End') {
                e.preventDefault(); items[items.length - 1].focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
                if (document.activeElement && document.activeElement.classList.contains('menu-item')) {
                    e.preventDefault(); document.activeElement.click();
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
        if (onDocClick) document.removeEventListener('contextmenu', onDocClick, { capture: true });
        if (onDocScroll) document.removeEventListener('scroll', onDocScroll, { capture: true });
        if (onResize) window.removeEventListener('resize', onResize);
        if (onKeyDown) document.removeEventListener('keydown', onKeyDown);
        onDocClick = onDocScroll = onResize = onKeyDown = null;
    }

    // Track keyboard-invoked context menu (Shift+F10 or ContextMenu key)
    let lastInvokeWasKeyboard = false;
    document.addEventListener('keydown', (e) => {
        // ContextMenu key has key === 'ContextMenu' in some browsers; also Shift+F10
        if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
            lastInvokeWasKeyboard = true;
        }
    });
    document.addEventListener('keyup', () => { lastInvokeWasKeyboard = false; }, { capture: true });

    // Main hook: intercept right-clicks except in inputs/editable
    document.addEventListener('contextmenu', showContextMenu);

    // Also close if user clicks the menubar triggers (consistency with dropdowns)
    if (typeof window.bindDropdownTrigger === 'function') {
        document.querySelectorAll('[data-menubar-trigger-button="true"]').forEach(btn => {
            btn.addEventListener('click', () => hideContextMenu());
        });
    }
})();
