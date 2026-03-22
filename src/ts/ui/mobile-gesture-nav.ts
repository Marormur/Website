/**
 * Mobile Gesture Navigation Bar System
 * Converts the desktop dock into an iOS-like gesture navigation bar in mobile mode.
 *
 * PURPOSE: Provide an iOS-style bottom navigation experience:
 * - When an app is open: Hide the dock, show a slim "Home" gesture bar
 * - On home screen: Show the full dock
 * - Clicking the gesture bar returns to home screen
 *
 * INVARIANT: Dock visibility is controlled by whether any window modals are open
 * (excluding the mobile screens wrapper itself)
 */

import logger from '../core/logger.js';

logger.debug('UI', 'Mobile Gesture Navigation (TS) loaded');

(() => {
    'use strict';

    let dockElement: HTMLElement | null = null;
    let gestureNavBar: HTMLElement | null = null;
    let isAppOpen = false;
    let windowChangeObserver: MutationObserver | null = null;

    const GESTURE_NAV_ID = 'mobile-gesture-nav-bar';
    const DOCK_ID = 'dock';
    const TRANSITION_DURATION = 200; // ms

    /**
     * Check if mobile mode is active
     */
    function isMobileMode(): boolean {
        return document.documentElement.getAttribute('data-ui-mode') === 'mobile';
    }

    /**
     * Get all window modal elements excluding mobile-screens-wrapper
     * PURPOSE: Detect which app windows are currently open
     * INVARIANT: Any visible dialog (except mobile screens) = an app is open
     * ROBUSTNESS: Check both standard dialog[open] and visibility-based detection
     */
    function getOpenAppModals(): HTMLElement[] {
        // Primary: Check for native dialog elements with 'open' attribute
        let allDialogs = Array.from(document.querySelectorAll<HTMLElement>('dialog[open]'));

        // Fallback: If no native dialogs found, check for visible dialogs by display style
        if (allDialogs.length === 0) {
            const allPossibleDialogs = Array.from(document.querySelectorAll<HTMLElement>('dialog'));
            allDialogs = allPossibleDialogs.filter(dialog => {
                const style = window.getComputedStyle(dialog);
                return style.display !== 'none' && style.visibility !== 'hidden';
            });
        }

        // Filter out mobile screens and return app windows
        return allDialogs.filter(dialog => {
            const parent = dialog.closest('[id]');
            // Make sure it's not part of the mobile screens (home/launchpad screens)
            return (
                parent?.id !== 'mobile-screens-wrapper' && dialog.id !== 'mobile-screens-wrapper'
            );
        });
    }

    /**
     * Determine if any app is currently open
     * PURPOSE: Control navigation bar expansion/collapse
     */
    function isAnyAppOpen(): boolean {
        return getOpenAppModals().length > 0;
    }

    /**
     * Create the mobile gesture navigation bar
     * PURPOSE: Render a slim iOS-style bottom bar with only a Home button
     * DESIGN: Minimal, accessible, gesture-friendly
     */
    function createGestureNavBar(): HTMLElement {
        const navBar = document.createElement('div');
        navBar.id = GESTURE_NAV_ID;
        navBar.className = 'mobile-gesture-nav-bar fixed z-2001 flex items-center justify-center';
        navBar.setAttribute('role', 'navigation');
        navBar.setAttribute('aria-label', 'Mobile navigation');

        // Home button (large touch target for mobile)
        const homeBtn = document.createElement('button');
        homeBtn.className = 'mobile-gesture-nav-home-btn';
        homeBtn.setAttribute('aria-label', 'Return to Home screen');
        homeBtn.setAttribute('data-i18n-aria-label', 'mobile.nav.home');
        homeBtn.textContent = '🏠';
        homeBtn.addEventListener('click', () => {
            returnToHome();
        });

        navBar.appendChild(homeBtn);

        // Start hidden, will be shown when app opens
        navBar.style.opacity = '0';
        navBar.style.pointerEvents = 'none';
        navBar.style.transition = `opacity ${TRANSITION_DURATION}ms ease-in-out`;

        return navBar;
    }

    /**
     * Initialize gesture navigation bar in DOM
     */
    function initGestureNavBar(): void {
        const existingBar = document.getElementById(GESTURE_NAV_ID);
        if (existingBar) {
            gestureNavBar = existingBar;
        } else {
            gestureNavBar = createGestureNavBar();
            document.body.appendChild(gestureNavBar);
            logger.debug('Mobile Gesture Nav', 'Gesture navigation bar created');
        }
    }

    /**
     * Position gesture nav bar (same position as dock when it's hidden)
     * PURPOSE: Ensure bar appears in the same location where the dock was
     */
    function positionGestureNavBar(): void {
        if (!gestureNavBar || !dockElement) return;

        const dockRect = dockElement.getBoundingClientRect();

        // Match dock position
        gestureNavBar.style.left = dockElement.style.left || 'auto';
        gestureNavBar.style.right = dockElement.style.right || 'auto';
        gestureNavBar.style.bottom = dockElement.style.bottom || '10px';
        gestureNavBar.style.top = dockElement.style.top || 'auto';

        // Slim height for gesture bar (vs full dock height)
        gestureNavBar.style.height = '44px';
        gestureNavBar.style.width = 'auto';
        gestureNavBar.style.minWidth = '60px';
    }

    /**
     * Show gesture navigation bar and hide dock
     * PURPOSE: Transition from dock view to app view
     * PERFORMANCE: Uses CSS transitions for smooth 60fps animation
     */
    function showGestureNav(): void {
        if (!gestureNavBar || !dockElement) {
            logger.warn('Mobile Gesture Nav', 'Gesture nav or dock not initialized');
            return;
        }

        // Hide dock with fade
        dockElement.style.opacity = '0';
        dockElement.style.pointerEvents = 'none';

        // Show gesture nav with fade
        gestureNavBar.style.opacity = '1';
        gestureNavBar.style.pointerEvents = 'auto';

        logger.debug('Mobile Gesture Nav', 'Gesture navigation bar shown');
    }

    /**
     * Hide gesture navigation bar and show dock
     * PURPOSE: Transition from app view back to dock view
     */
    function hideGestureNav(): void {
        if (!gestureNavBar || !dockElement) {
            logger.warn('Mobile Gesture Nav', 'Gesture nav or dock not initialized');
            return;
        }

        // Show dock with fade
        dockElement.style.opacity = '1';
        dockElement.style.pointerEvents = 'auto';

        // Hide gesture nav with fade
        gestureNavBar.style.opacity = '0';
        gestureNavBar.style.pointerEvents = 'none';

        logger.debug('Mobile Gesture Nav', 'Gesture navigation bar hidden');
    }

    /**
     * Handle when app opens
     * PURPOSE: Transition from home screen to app view
     * DEPENDENCY: Called after a window modal opens
     */
    function onAppOpened(): void {
        if (isAppOpen) return; // Already in app mode

        isAppOpen = true;
        positionGestureNavBar();
        showGestureNav();

        logger.debug('Mobile Gesture Nav', 'App opened - gesture nav activated');
    }

    /**
     * Handle when app closes (returns to home screen)
     * PURPOSE: Transition from app view back to home screen
     * DEPENDENCY: Called after all window modals close
     */
    function onAppClosed(): void {
        if (!isAppOpen) return; // Already in home mode

        isAppOpen = false;
        hideGestureNav();

        // Ensure page transitions to home screen
        const MobilePagingSystem = (window as unknown as Record<string, unknown>)
            .MobilePagingSystem as { navigateToPage?: (pageId: 0 | 1) => void } | undefined;

        if (MobilePagingSystem?.navigateToPage) {
            MobilePagingSystem.navigateToPage(0);
        }

        logger.debug('Mobile Gesture Nav', 'App closed - returning to home screen');
    }

    /**
     * Return to home screen and close current app
     * PURPOSE: Home button action - simulate iOS home button press
     */
    function returnToHome(): void {
        // Close all open app modals
        const openModals = getOpenAppModals();
        openModals.forEach(modal => {
            const closeBtn = modal.querySelector<HTMLElement>(
                '[data-close-window], .js-modal-close, [aria-label*="close" i]'
            );
            if (closeBtn) {
                closeBtn.click();
            } else if (modal instanceof HTMLDialogElement) {
                modal.close();
            }
        });

        // Ensure we transition to home page
        setTimeout(() => {
            onAppClosed();
        }, 100);

        logger.debug('Mobile Gesture Nav', 'Home button pressed - closing app');
    }

    /**
     * Monitor for window modal changes
     * PURPOSE: Detect when apps open/close and update gesture nav accordingly
     * PERFORMANCE: Uses MutationObserver with debouncing to avoid excessive updates
     */
    function setupWindowChangeMonitor(): void {
        if (windowChangeObserver) {
            windowChangeObserver.disconnect();
        }

        let monitorTimeout: number | null = null;

        const checkWindowState = (): void => {
            const wasAppOpen = isAppOpen;
            const nowAppOpen = isAnyAppOpen();

            if (wasAppOpen && !nowAppOpen) {
                // App just closed
                onAppClosed();
            } else if (!wasAppOpen && nowAppOpen) {
                // App just opened
                onAppOpened();
            }
        };

        const debouncedCheck = (): void => {
            if (monitorTimeout !== null) {
                clearTimeout(monitorTimeout);
            }
            monitorTimeout = window.setTimeout(checkWindowState, 50);
        };

        windowChangeObserver = new MutationObserver(() => {
            debouncedCheck();
        });

        // Watch for dialog elements and their 'open' attribute
        windowChangeObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['open'],
            subtree: true,
            attributeOldValue: false,
        });

        logger.debug('Mobile Gesture Nav', 'Window change monitor setup');
    }

    /**
     * Initialize mobile gesture navigation system
     * PURPOSE: Set up all gesture navigation features when mobile mode is active
     * DEPENDENCY: Should be called during app initialization
     */
    function initMobileGestureNav(): void {
        logger.debug('Mobile Gesture Nav', 'Initializing');

        if (!isMobileMode()) {
            logger.debug('Mobile Gesture Nav', 'Not in mobile mode, skipping');
            return;
        }

        dockElement = document.getElementById(DOCK_ID);
        if (!dockElement) {
            logger.warn('Mobile Gesture Nav', 'Dock element not found');
            return;
        }

        // Ensure dock has transitions
        dockElement.style.transition = `opacity ${TRANSITION_DURATION}ms ease-in-out`;
        dockElement.style.opacity = '1';
        dockElement.style.pointerEvents = 'auto';

        // Create and init gesture nav bar
        initGestureNavBar();
        positionGestureNavBar();

        // Setup monitoring
        setupWindowChangeMonitor();

        // Check initial state
        const initiallyAppOpen = isAnyAppOpen();
        if (initiallyAppOpen) {
            onAppOpened();
        }

        logger.debug('Mobile Gesture Nav', 'Initialization complete');
    }

    /**
     * Clean up resources when mobile mode is disabled
     */
    function cleanupMobileGestureNav(): void {
        if (windowChangeObserver) {
            windowChangeObserver.disconnect();
            windowChangeObserver = null;
        }

        if (gestureNavBar) {
            gestureNavBar.style.opacity = '0';
            gestureNavBar.style.pointerEvents = 'none';
        }

        if (dockElement) {
            dockElement.style.opacity = '1';
            dockElement.style.pointerEvents = 'auto';
        }

        isAppOpen = false;

        logger.debug('Mobile Gesture Nav', 'Cleanup complete');
    }

    /**
     * Handle UI mode changes
     * PURPOSE: Enable/disable gesture nav based on mobile mode state
     */
    function onUIModChange(): void {
        if (isMobileMode()) {
            initMobileGestureNav();
        } else {
            cleanupMobileGestureNav();
        }
    }

    // Expose API on window for external communication
    const globalWindow = window as unknown as Record<string, unknown>;
    globalWindow.MobileGestureNav = {
        init: initMobileGestureNav,
        returnToHome,
    } as Record<string, unknown>;

    // Auto-initialize when script loads if already in mobile mode
    // DEPENDENCY: Wait for DOM to be fully ready and any existing app state to be established
    const initializeWhenReady = (): void => {
        if (!isMobileMode()) {
            logger.debug('Mobile Gesture Nav', 'Not in mobile mode, skipping');
            return;
        }

        // Wait a tick to ensure all app windows are established in DOM
        setTimeout(() => {
            initMobileGestureNav();
        }, 0);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeWhenReady();
        });
    } else {
        // DOM already loaded, use microtask queue instead
        Promise.resolve().then(() => {
            initializeWhenReady();
        });
    }

    // Listen for UI mode changes (if switching between mobile/desktop at runtime)
    window.addEventListener('uiModeEffectiveChange', onUIModChange);
})();

// Type declarations at module level
declare global {
    interface Window {
        MobileGestureNav?: {
            init: () => void;
            returnToHome: () => void;
        };
    }
}
