(function () {
    'use strict';

    type TriggerOptions = { hoverRequiresOpen?: boolean; forceOpen?: boolean };

    // Avoid redefining if legacy already provided these
    if (
        (window as unknown as { bindDropdownTrigger?: unknown }).bindDropdownTrigger &&
        (window as unknown as { hideMenuDropdowns?: unknown }).hideMenuDropdowns
    ) {
        return;
    }

    function hideMenuDropdowns(): void {
        const domUtils = (window as any).DOMUtils;
        
        document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
            if (!dropdown.classList.contains('hidden')) {
                if (domUtils && typeof domUtils.hide === 'function') {
                    domUtils.hide(dropdown);
                } else {
                    dropdown.classList.add('hidden');
                }
            }
        });
        document.querySelectorAll('[data-menubar-trigger-button="true"]').forEach(button => {
            (button as HTMLElement).setAttribute('aria-expanded', 'false');
        });
        document.querySelectorAll('[data-system-menu-trigger]').forEach(button => {
            (button as HTMLElement).setAttribute('aria-expanded', 'false');
        });
    }

    function isAnyDropdownOpen(): boolean {
        return Boolean(document.querySelector('.menu-dropdown:not(.hidden)'));
    }

    function toggleMenuDropdown(trigger: HTMLElement, options: TriggerOptions = {}): void {
        if (!trigger) return;
        const menuId = trigger.getAttribute('aria-controls');
        if (!menuId) return;

        const forceOpen = Boolean(options.forceOpen);
        let menu = document.getElementById(menuId);
        if (!menu) return;

        const wasOpen = !menu.classList.contains('hidden');
        const shouldOpen = forceOpen || !wasOpen;
        hideMenuDropdowns();

        if (shouldOpen) {
            // Only re-render menu if it was NOT already open (i.e., we're opening it fresh)
            // This prevents re-rendering during hover events when menu is already visible
            if (!wasOpen) {
                const MenuSystem = (
                    window as unknown as {
                        MenuSystem?: { renderApplicationMenu?: (modalId?: string | null) => void };
                    }
                ).MenuSystem;
                if (MenuSystem && typeof MenuSystem.renderApplicationMenu === 'function') {
                    // Get the current active modal to pass to menu renderer
                    const topModal = Array.from(
                        document.querySelectorAll('.modal:not(.hidden)')
                    ).sort((a, b) => {
                        const zA = parseInt(getComputedStyle(a).zIndex, 10) || 0;
                        const zB = parseInt(getComputedStyle(b).zIndex, 10) || 0;
                        return zB - zA;
                    })[0];
                    const activeModalId = topModal?.id || null;
                    MenuSystem.renderApplicationMenu(activeModalId);
                }

                // Re-get menu element after rendering (it may have been recreated)
                menu = document.getElementById(menuId);
                if (!menu) return;
            }

            const domUtils = (window as any).DOMUtils;
            if (domUtils && typeof domUtils.show === 'function') {
                domUtils.show(menu);
            } else {
                menu.classList.remove('hidden');
            }
            
            trigger.setAttribute('aria-expanded', 'true');
        }
    }

    function bindDropdownTrigger(el: HTMLElement | null, options: TriggerOptions = {}): void {
        if (!el) return;
        const hoverRequiresExisting =
            options.hoverRequiresOpen !== undefined ? options.hoverRequiresOpen : true;
        let clickJustOccurred = false;

        el.addEventListener('click', event => {
            event.stopPropagation();
            clickJustOccurred = true;
            const now = Date.now();
            (window as unknown as { __lastMenuInteractionAt?: number }).__lastMenuInteractionAt =
                now;
            const menuId = el.getAttribute('aria-controls');
            const menu = menuId ? document.getElementById(menuId) : null;
            const isOpen = menu ? !menu.classList.contains('hidden') : false;
            const sinceFocus =
                now -
                ((window as unknown as { __lastMenuFocusAt?: number }).__lastMenuFocusAt || 0);
            if (isOpen && sinceFocus > 200) {
                hideMenuDropdowns();
                el.setAttribute('aria-expanded', 'false');
            } else {
                toggleMenuDropdown(el, { forceOpen: true });
            }
            setTimeout(() => {
                clickJustOccurred = false;
            }, 200);
        });

        el.addEventListener('mouseenter', () => {
            if (clickJustOccurred) return;
            (window as unknown as { __lastMenuInteractionAt?: number }).__lastMenuInteractionAt =
                Date.now();
            if (hoverRequiresExisting && !isAnyDropdownOpen()) return;
            toggleMenuDropdown(el, { forceOpen: true });
        });

        el.addEventListener('focus', () => {
            const now = Date.now();
            (window as unknown as { __lastMenuInteractionAt?: number }).__lastMenuInteractionAt =
                now;
            (window as unknown as { __lastMenuFocusAt?: number }).__lastMenuFocusAt = now;
            toggleMenuDropdown(el, { forceOpen: true });
        });
    }

    function handleDocumentClickToCloseMenus(event: Event): void {
        const last = (window as unknown as { __lastMenuInteractionAt?: number })
            .__lastMenuInteractionAt;
        if (last && Date.now() - last < 200) {
            return;
        }
        const target = event.target instanceof Element ? (event.target as Element) : null;
        if (!target) return;
        if (target.closest('.menubar-trigger') || target.closest('.menu-dropdown')) return;
        hideMenuDropdowns();
    }

    function initMenubarWiring() {
        if ((window as unknown as { __menubarWired?: boolean }).__menubarWired) return;
        (window as unknown as { __menubarWired?: boolean }).__menubarWired = true;

        const appleMenuTrigger = document.getElementById('apple-menu-trigger');
        const programLabel = document.getElementById('program-label');
        bindDropdownTrigger(appleMenuTrigger, { hoverRequiresOpen: true });
        bindDropdownTrigger(programLabel, { hoverRequiresOpen: true });

        // Menu action activation from menu.js
        document.addEventListener('click', event => {
            const MenuSystem = (
                window as unknown as {
                    MenuSystem?: { handleMenuActionActivation?: (e: Event) => void };
                }
            ).MenuSystem;
            if (MenuSystem && typeof MenuSystem.handleMenuActionActivation === 'function') {
                MenuSystem.handleMenuActionActivation(event);
            }
        });

        document.addEventListener('click', handleDocumentClickToCloseMenus);
        document.addEventListener('pointerdown', handleDocumentClickToCloseMenus, {
            capture: true,
        });
        document.addEventListener('keydown', event => {
            if ((event as KeyboardEvent).key === 'Escape') hideMenuDropdowns();
        });
    }

    // Expose API
    (
        window as unknown as {
            hideMenuDropdowns: typeof hideMenuDropdowns;
            bindDropdownTrigger: typeof bindDropdownTrigger;
        }
    ).hideMenuDropdowns = hideMenuDropdowns;
    (window as unknown as { bindDropdownTrigger: typeof bindDropdownTrigger }).bindDropdownTrigger =
        bindDropdownTrigger;

    // Initialize on DOMContentLoaded (idempotent)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMenubarWiring, { once: true });
    } else {
        initMenubarWiring();
    }
})();

