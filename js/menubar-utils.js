"use strict";
(function () {
    'use strict';
    // Avoid redefining if legacy already provided these
    if (window.bindDropdownTrigger &&
        window.hideMenuDropdowns) {
        return;
    }
    function hideMenuDropdowns() {
        const domUtils = window.DOMUtils;
        document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
            if (!dropdown.classList.contains('hidden')) {
                if (domUtils && typeof domUtils.hide === 'function') {
                    domUtils.hide(dropdown);
                }
                else {
                    dropdown.classList.add('hidden');
                }
            }
        });
        document.querySelectorAll('[data-menubar-trigger-button="true"]').forEach(button => {
            button.setAttribute('aria-expanded', 'false');
        });
        document.querySelectorAll('[data-system-menu-trigger]').forEach(button => {
            button.setAttribute('aria-expanded', 'false');
        });
    }
    function isAnyDropdownOpen() {
        return Boolean(document.querySelector('.menu-dropdown:not(.hidden)'));
    }
    function toggleMenuDropdown(trigger, options = {}) {
        if (!trigger)
            return;
        const menuId = trigger.getAttribute('aria-controls');
        if (!menuId)
            return;
        const forceOpen = Boolean(options.forceOpen);
        let menu = document.getElementById(menuId);
        if (!menu)
            return;
        const wasOpen = !menu.classList.contains('hidden');
        const shouldOpen = forceOpen || !wasOpen;
        hideMenuDropdowns();
        if (shouldOpen) {
            // Only re-render menu if it was NOT already open (i.e., we're opening it fresh)
            // This prevents re-rendering during hover events when menu is already visible
            if (!wasOpen) {
                const MenuSystem = window.MenuSystem;
                if (MenuSystem && typeof MenuSystem.renderApplicationMenu === 'function') {
                    // Get the current active modal to pass to menu renderer
                    const topModal = Array.from(document.querySelectorAll('.modal:not(.hidden)')).sort((a, b) => {
                        const zA = parseInt(getComputedStyle(a).zIndex, 10) || 0;
                        const zB = parseInt(getComputedStyle(b).zIndex, 10) || 0;
                        return zB - zA;
                    })[0];
                    const activeModalId = topModal?.id || null;
                    MenuSystem.renderApplicationMenu(activeModalId);
                }
                // Re-get menu element after rendering (it may have been recreated)
                menu = document.getElementById(menuId);
                if (!menu)
                    return;
            }
            const domUtils = window.DOMUtils;
            if (domUtils && typeof domUtils.show === 'function') {
                domUtils.show(menu);
            }
            else {
                menu.classList.remove('hidden');
            }
            trigger.setAttribute('aria-expanded', 'true');
        }
    }
    function bindDropdownTrigger(el, options = {}) {
        if (!el)
            return;
        const hoverRequiresExisting = options.hoverRequiresOpen !== undefined ? options.hoverRequiresOpen : true;
        let clickJustOccurred = false;
        el.addEventListener('click', event => {
            event.stopPropagation();
            clickJustOccurred = true;
            const now = Date.now();
            window.__lastMenuInteractionAt =
                now;
            const menuId = el.getAttribute('aria-controls');
            const menu = menuId ? document.getElementById(menuId) : null;
            const isOpen = menu ? !menu.classList.contains('hidden') : false;
            const sinceFocus = now -
                (window.__lastMenuFocusAt || 0);
            if (isOpen && sinceFocus > 200) {
                hideMenuDropdowns();
                el.setAttribute('aria-expanded', 'false');
            }
            else {
                toggleMenuDropdown(el, { forceOpen: true });
            }
            setTimeout(() => {
                clickJustOccurred = false;
            }, 200);
        });
        el.addEventListener('mouseenter', () => {
            if (clickJustOccurred)
                return;
            window.__lastMenuInteractionAt =
                Date.now();
            if (hoverRequiresExisting && !isAnyDropdownOpen())
                return;
            toggleMenuDropdown(el, { forceOpen: true });
        });
        el.addEventListener('focus', () => {
            const now = Date.now();
            window.__lastMenuInteractionAt =
                now;
            window.__lastMenuFocusAt = now;
            toggleMenuDropdown(el, { forceOpen: true });
        });
    }
    function handleDocumentClickToCloseMenus(event) {
        const last = window
            .__lastMenuInteractionAt;
        if (last && Date.now() - last < 200) {
            return;
        }
        const target = event.target instanceof Element ? event.target : null;
        if (!target)
            return;
        if (target.closest('.menubar-trigger') || target.closest('.menu-dropdown'))
            return;
        hideMenuDropdowns();
    }
    function initMenubarWiring() {
        if (window.__menubarWired)
            return;
        window.__menubarWired = true;
        const appleMenuTrigger = document.getElementById('apple-menu-trigger');
        const programLabel = document.getElementById('program-label');
        bindDropdownTrigger(appleMenuTrigger, { hoverRequiresOpen: true });
        bindDropdownTrigger(programLabel, { hoverRequiresOpen: true });
        // Menu action activation from menu.js
        document.addEventListener('click', event => {
            const MenuSystem = window.MenuSystem;
            if (MenuSystem && typeof MenuSystem.handleMenuActionActivation === 'function') {
                MenuSystem.handleMenuActionActivation(event);
            }
        });
        document.addEventListener('click', handleDocumentClickToCloseMenus);
        document.addEventListener('pointerdown', handleDocumentClickToCloseMenus, {
            capture: true,
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape')
                hideMenuDropdowns();
        });
    }
    // Expose API
    window.hideMenuDropdowns = hideMenuDropdowns;
    window.bindDropdownTrigger =
        bindDropdownTrigger;
    // Initialize on DOMContentLoaded (idempotent)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMenubarWiring, { once: true });
    }
    else {
        initMenubarWiring();
    }
})();
//# sourceMappingURL=menubar-utils.js.map