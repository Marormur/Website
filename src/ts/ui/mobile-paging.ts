/**
 * Mobile Paging System: iOS-like Home Screen + Launchpad Navigation
 * PLUS: Gesture Navigation Bar (transforms dock into iOS-style home button when app is open)
 * Handles screen transitions, page dots, swipe gestures, and dock management for mobile mode.
 */

import logger from '../core/logger.js';
import { renderProgramIcon, type ProgramIconKey } from '../windows/window-icons.js';

logger.debug('UI', 'Mobile Paging (TS) loaded');

(() => {
    'use strict';

    type PageId = 0 | 1;

    // ============================================================================
    // Screen Paging
    // ============================================================================

    let currentPage: PageId = 0;
    let screensContainer: HTMLElement | null = null;
    let homeScreen: HTMLElement | null = null;
    let launchpadScreen: HTMLElement | null = null;
    let mobileScreensWrapper: HTMLElement | null = null;
    let pageDots: NodeListOf<HTMLElement> | null = null;

    // ============================================================================
    // Mobile Gesture Navigation Bar (Dock Management)
    // ============================================================================

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
     * Get all open app modals (windows) excluding mobile screens
     * PURPOSE: Detect when to show/hide gesture nav bar
     * WHY: In this app, windows are `.modal` containers toggled via `.hidden`, not native dialog[open].
     */
    function getOpenAppModals(): HTMLElement[] {
        return Array.from(document.querySelectorAll<HTMLElement>('.modal:not(.hidden)')).filter(
            modal => {
                if (modal.id === 'mobile-screens-wrapper') return false;
                // Exclude utility overlays that are not app windows.
                if (modal.id === 'program-info-modal') return false;
                return true;
            }
        );
    }

    /**
     * Create the mobile gesture navigation bar
     * PURPOSE: Slim iOS-style home button bar that replaces dock when app is open
     */
    function createGestureNavBar(): HTMLElement {
        const navBar = document.createElement('div');
        navBar.id = GESTURE_NAV_ID;
        navBar.className = 'mobile-gesture-nav-bar fixed z-2001 flex items-center justify-center';
        navBar.setAttribute('role', 'navigation');
        navBar.setAttribute('aria-label', 'Mobile home navigation');

        const homeBtn = document.createElement('button');
        homeBtn.className = 'mobile-gesture-nav-home-btn';
        homeBtn.setAttribute('aria-label', 'Home');
        homeBtn.textContent = '🏠';
        homeBtn.addEventListener('click', returnToHome);

        navBar.appendChild(homeBtn);

        // Start hidden with CSS class for strong specificity
        navBar.classList.add('mobile-gesture-nav-hidden');
        navBar.style.transition = `opacity ${TRANSITION_DURATION}ms ease-in-out`;

        return navBar;
    }

    /**
     * Initialize gesture navigation bar
     */
    function initGestureNavBar(): void {
        let existingBar = document.getElementById(GESTURE_NAV_ID);
        if (!existingBar) {
            gestureNavBar = createGestureNavBar();
            document.body.appendChild(gestureNavBar);
            logger.debug('Mobile Paging', 'Gesture navigation bar created');
        } else {
            gestureNavBar = existingBar;
        }
    }

    /**
     * Position gesture nav bar
     * PURPOSE: Place gesture bar at the bottom center of the screen, matching dock area
     */
    function positionGestureNavBar(): void {
        if (!gestureNavBar) return;

        // Position at bottom center of viewport, matching dock placement
        const viewportHeight = window.innerHeight;
        const dockHeight = 44; // Our gesture bar height
        const edgeInset = 10;

        gestureNavBar.style.position = 'fixed';
        gestureNavBar.style.left = '50%';
        gestureNavBar.style.transform = 'translateX(-50%)';
        gestureNavBar.style.bottom = `${edgeInset}px`;
        gestureNavBar.style.top = 'auto';
        gestureNavBar.style.right = 'auto';
    }

    /**
     * Show gesture nav and hide dock
     */
    function showGestureNav(): void {
        if (!gestureNavBar || !dockElement) return;

        // Use CSS classes instead of inline styles for stronger specificity
        dockElement.classList.add('mobile-gesture-nav-hidden');
        dockElement.classList.remove('mobile-gesture-nav-visible');
        gestureNavBar.classList.add('mobile-gesture-nav-visible');
        gestureNavBar.classList.remove('mobile-gesture-nav-hidden');

        logger.debug('Mobile Paging', 'Gesture nav shown');
    }

    /**
     * Show dock and hide gesture nav
     */
    function hideGestureNav(): void {
        if (!gestureNavBar || !dockElement) return;

        // Use CSS classes instead of inline styles
        dockElement.classList.add('mobile-gesture-nav-visible');
        dockElement.classList.remove('mobile-gesture-nav-hidden');
        gestureNavBar.classList.add('mobile-gesture-nav-hidden');
        gestureNavBar.classList.remove('mobile-gesture-nav-visible');

        logger.debug('Mobile Paging', 'Gesture nav hidden');
    }

    /**
     * Handle app opening
     */
    function onAppOpened(): void {
        if (!isMobileMode()) return;
        if (isAppOpen) return;

        isAppOpen = true;
        mobileScreensWrapper?.classList.add('mobile-screens-wrapper--app-open');
        positionGestureNavBar();
        showGestureNav();

        logger.debug('Mobile Paging', 'App opened - showing gesture nav');
    }

    /**
     * Handle app closing
     */
    function onAppClosed(): void {
        if (!isAppOpen) {
            // Ensure desktop/mobile state stays clean even if close is requested redundantly.
            mobileScreensWrapper?.classList.remove('mobile-screens-wrapper--app-open');
            hideGestureNav();
            return;
        }

        isAppOpen = false;
        mobileScreensWrapper?.classList.remove('mobile-screens-wrapper--app-open');
        hideGestureNav();

        // Return to home page
        transitionToPage(0);

        logger.debug('Mobile Paging', 'App closed - showing dock');
    }

    /**
     * Return to home (close all apps)
     */
    function returnToHome(): void {
        // Immediately switch visual state back to home to avoid stale nav visibility
        // while app windows are still closing asynchronously.
        isAppOpen = false;
        mobileScreensWrapper?.classList.remove('mobile-screens-wrapper--app-open');
        hideGestureNav();
        transitionToPage(0);

        const openModals = getOpenAppModals();
        openModals.forEach(modal => {
            const closeBtn = modal.querySelector<HTMLElement>(
                '[data-action="closeWindow"], [data-action="window-close"], [data-close-window]'
            );
            if (closeBtn) {
                closeBtn.click();
                return;
            }

            // Fallback for modals without a close button binding.
            modal.classList.add('hidden');
        });

        setTimeout(() => {
            onAppClosed();
        }, 100);

        logger.debug('Mobile Paging', 'Home button pressed');
    }

    /**
     * Setup window change monitoring
     */
    function setupWindowChangeMonitor(): void {
        if (windowChangeObserver) {
            windowChangeObserver.disconnect();
        }

        let monitorTimeout: number | null = null;

        const checkWindowState = (): void => {
            // Gesture navigation is mobile-only; never mutate dock in desktop mode.
            if (!isMobileMode()) {
                if (isAppOpen) {
                    isAppOpen = false;
                    mobileScreensWrapper?.classList.remove('mobile-screens-wrapper--app-open');
                    hideGestureNav();
                }
                return;
            }

            const wasAppOpen = isAppOpen;
            const nowAppOpen = getOpenAppModals().length > 0;

            if (!nowAppOpen) {
                onAppClosed();
            } else if (!wasAppOpen) {
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

        windowChangeObserver.observe(document.body, {
            childList: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'open'],
            subtree: true,
        });

        logger.debug('Mobile Paging', 'Window change monitor setup');
    }

    // ============================================================================
    // Screen Paging Functions
    // ============================================================================

    /**
     * Transition to a specific page with smooth transform
     * PURPOSE: Animate the screens container horizontally to show the target page
     * INPUT: pageId (0 = home, 1 = launchpad)
     * PERFORMANCE: Uses transform for 60fps animation (GPU-accelerated)
     */
    function transitionToPage(pageId: PageId): void {
        if (!screensContainer) return;

        currentPage = pageId;

        // INVARIANT: Screen transitions are smooth via CSS transitions
        // Each page is 50% of container width, so translate by 50% per page
        const translateX = pageId === 0 ? '0%' : '-100%';
        screensContainer.style.transform = `translateX(${translateX})`;

        // Update page dots
        if (pageDots) {
            pageDots.forEach((dot, index) => {
                dot.classList.toggle('mobile-page-dot--active', index === pageId);
            });
        }

        logger.debug('Mobile Paging', `Transitioned to page ${pageId}`);
    }

    /**
     * Initialize mobile screens structure
     */
    function initMobileScreens(): void {
        mobileScreensWrapper = document.getElementById('mobile-screens-wrapper');
        screensContainer = document.getElementById('mobile-screens-container');
        homeScreen = document.getElementById('home-screen');
        launchpadScreen = document.getElementById('launchpad-screen');
        pageDots = document.querySelectorAll<HTMLElement>('.mobile-page-dot');

        if (!mobileScreensWrapper || !screensContainer) {
            logger.warn('Mobile Paging', 'Mobile screens structure not found in DOM');
            return;
        }

        // Set initial transform state
        screensContainer.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        transitionToPage(0);

        // Set display visible in mobile mode
        if (isMobileMode()) {
            showMobileScreens();
        }
    }

    /**
     * Show/hide mobile screens wrapper based on UI mode
     */
    function showMobileScreens(): void {
        if (mobileScreensWrapper) {
            mobileScreensWrapper.classList.remove('hidden');
        }
    }

    function hideMobileScreens(): void {
        if (mobileScreensWrapper) {
            mobileScreensWrapper.classList.add('hidden');
        }
    }

    function t(key: string, fallback: string): string {
        const apiTranslate = (
            window as Window & {
                API?: { i18n?: { translate?: (k: string, fb?: string) => string } };
            }
        ).API?.i18n?.translate;
        if (typeof apiTranslate === 'function') {
            return apiTranslate(key, fallback);
        }

        const globalTranslate = (
            window as Window & { translate?: (k: string, fb?: string) => string }
        ).translate;
        return typeof globalTranslate === 'function' ? globalTranslate(key, fallback) : fallback;
    }

    /**
     * Populate home screen with app icons
     * PURPOSE: Render app shortcuts on the first mobile screen
     */
    function populateHomeScreen(): void {
        if (!homeScreen) return;

        const mobileHomeContent = homeScreen.querySelector('.mobile-home-content');
        if (!mobileHomeContent) {
            logger.debug('Mobile Paging', 'Home screen content container not found');
            return;
        }

        // App shortcuts for mobile home screen
        const mobileApps = [
            {
                id: 'finder',
                iconKey: 'finder' as ProgramIconKey,
                label: t('dock.finder', 'Finder'),
                action: 'openWindow',
                windowId: 'finder-modal',
            },
            {
                id: 'terminal',
                iconKey: 'terminal' as ProgramIconKey,
                label: t('dock.terminal', 'Terminal'),
                action: 'openWindow',
                windowId: 'terminal',
            },
            {
                id: 'text-editor',
                iconKey: 'textEditor' as ProgramIconKey,
                label: t('dock.text', 'Text editor'),
                action: 'openWindow',
                windowId: 'text-modal',
            },
            {
                id: 'preview',
                iconKey: 'preview' as ProgramIconKey,
                label: t('dock.image', 'Image viewer'),
                action: 'openWindow',
                windowId: 'preview-modal',
            },
            {
                id: 'photos',
                iconKey: 'photos' as ProgramIconKey,
                label: t('dock.photos', 'Photos'),
                action: 'openWindow',
                windowId: 'image-modal',
            },
            {
                id: 'settings',
                iconKey: 'settings' as ProgramIconKey,
                label: t('dock.settings', 'System settings'),
                action: 'openWindow',
                windowId: 'settings-modal',
            },
        ];

        // Build HTML for app grid
        mobileHomeContent.innerHTML = '';
        const appGrid = document.createElement('div');
        appGrid.className = 'mobile-home-app-grid';

        mobileApps.forEach(app => {
            const btn = document.createElement('button');
            btn.className = 'mobile-home-app-icon';
            btn.setAttribute('data-action', app.action);
            btn.setAttribute('data-window-id', app.windowId);
            btn.setAttribute('aria-label', app.label);

            const iconDiv = document.createElement('div');
            iconDiv.className = 'mobile-home-app-icon-graphic';
            renderProgramIcon(iconDiv, app.iconKey);

            const labelDiv = document.createElement('span');
            labelDiv.className = 'mobile-home-app-icon-label';
            labelDiv.textContent = app.label;

            btn.appendChild(iconDiv);
            btn.appendChild(labelDiv);
            appGrid.appendChild(btn);
        });

        mobileHomeContent.appendChild(appGrid);
        logger.debug('Mobile Paging', 'Home screen populated with app icons');
    }

    /**
     * Populate launchpad screen
     * PURPOSE: Render launchpad grid in fullscreen mode (not modal-centered)
     * DEPENDENCY: Must be called after LaunchpadSystem initialization
     */
    function populateLaunchpadScreen(): void {
        if (!launchpadScreen) return;

        const launchpadContainer = launchpadScreen.querySelector<HTMLElement>(
            '#launchpad-fullscreen-container'
        );

        if (!launchpadContainer) {
            logger.warn('Mobile Paging', 'Launchpad screen container not found');
            return;
        }

        // Initialize LaunchpadSystem in fullscreen mode
        const LaunchpadSystem = (window as unknown as Record<string, unknown>).LaunchpadSystem as
            | { initFullscreen?: (container: HTMLElement) => void }
            | undefined;

        if (LaunchpadSystem?.initFullscreen) {
            LaunchpadSystem.initFullscreen(launchpadContainer);
        } else {
            logger.warn('Mobile Paging', 'LaunchpadSystem.initFullscreen not available yet');
        }

        logger.debug('Mobile Paging', 'Launchpad fullscreen screen initialized');
    }

    /**
     * Attach dot navigation handlers
     */
    function attachPageDotHandlers(): void {
        if (!pageDots) return;

        pageDots.forEach(dot => {
            dot.addEventListener('click', () => {
                const page = Number.parseInt(dot.getAttribute('data-page') || '0', 10) as PageId;
                transitionToPage(page);
            });
        });

        logger.debug('Mobile Paging', 'Page dot handlers attached');
    }

    /**
     * Handle UI mode changes
     */
    function onUIModChange(): void {
        const isMobile = isMobileMode();

        if (isMobile) {
            showMobileScreens();
            populateHomeScreen();
            populateLaunchpadScreen();
            setupWindowChangeMonitor();

            // Re-sync state after switching back to mobile mode.
            if (getOpenAppModals().length > 0) {
                onAppOpened();
            } else {
                onAppClosed();
            }
        } else {
            hideMobileScreens();
            isAppOpen = false;
            mobileScreensWrapper?.classList.remove('mobile-screens-wrapper--app-open');
            hideGestureNav();

            if (windowChangeObserver) {
                windowChangeObserver.disconnect();
                windowChangeObserver = null;
            }
        }

        logger.debug('Mobile Paging', `UI mode changed, mobile=${isMobile}`);
    }

    /**
     * Initialize mobile paging system
     * Should be called during app initialization (after framework is ready)
     * DEPENDENCY: Dock element must be in DOM
     */
    function initMobilePaging(): void {
        logger.debug('Mobile Paging', 'Initializing');

        initMobileScreens();
        attachPageDotHandlers();

        // Wait a small amount to ensure dock element is fully rendered
        setTimeout(() => {
            // Initialize gesture navigation bar system
            dockElement = document.getElementById(DOCK_ID);
            if (dockElement) {
                logger.debug(
                    'Mobile Paging',
                    `Dock found, setting up gestures. Initial app state: ${getOpenAppModals().length > 0}`
                );
                dockElement.style.transition = `opacity ${TRANSITION_DURATION}ms ease-in-out`;
                initGestureNavBar();
                // Initialize dock visibility class
                dockElement.classList.add('mobile-gesture-nav-visible');
                setupWindowChangeMonitor();

                // Check initial state
                if (getOpenAppModals().length > 0) {
                    logger.debug('Mobile Paging', 'Apps already open on init, showing gesture nav');
                    onAppOpened();
                }
            } else {
                logger.warn('Mobile Paging', 'Dock element not found for gesture nav');
            }
        }, 50);

        // Listen for UI mode changes
        window.addEventListener('uiModeEffectiveChange', onUIModChange);
        window.addEventListener('languagePreferenceChange', () => {
            if (isMobileMode()) {
                populateHomeScreen();
            }
        });

        // Initial call in case already in mobile mode
        onUIModChange();

        logger.debug('Mobile Paging', 'Initialization complete');
    }

    /**
     * Navigate to a page programmatically (e.g., from dock or app)
     */
    function navigateToPage(pageId: PageId): void {
        transitionToPage(pageId);
    }

    /**
     * Get current page
     */
    function getCurrentPage(): PageId {
        return currentPage;
    }

    const globalWindow = window as unknown as Record<string, unknown>;
    globalWindow.MobilePagingSystem = {
        initMobilePaging,
        navigateToPage,
        getCurrentPage,
    } as Record<string, unknown>;

    // Auto-initialize when script loads if already in mobile mode
    const initializeWhenReady = (): void => {
        if (!isMobileMode()) {
            logger.debug('Mobile Paging', 'Not in mobile mode, skipping');
            return;
        }

        // Wait a tick to ensure all app windows are established in DOM
        setTimeout(() => {
            initMobilePaging();
        }, 0);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeWhenReady();
        });
    } else {
        // DOM already loaded
        Promise.resolve().then(() => {
            initializeWhenReady();
        });
    }
})();

// Type declarations at module level
declare global {
    interface Window {
        MobilePagingSystem?: {
            initMobilePaging: () => void;
            navigateToPage: (pageId: 0 | 1) => void;
            getCurrentPage: () => 0 | 1;
        };
    }
}
