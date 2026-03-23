/**
 * Mobile Paging System: iOS-like Home Screen + Launchpad Navigation
 * PLUS: Gesture Navigation Bar (transforms dock into iOS-style home button when app is open)
 * Handles screen transitions, page dots, swipe gestures, and dock management for mobile mode.
 */

import logger from '../core/logger.js';

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
    let pageGestureHandlersAttached = false;
    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeCurrentDeltaX = 0;
    let swipeAxisLock: 'x' | 'y' | null = null;
    let isTrackingSwipe = false;
    let wheelDeltaAccumulator = 0;
    let wheelAccumulatorResetTimer: number | null = null;
    let lastWheelPageChangeAt = 0;

    // ============================================================================
    // Mobile Gesture Navigation Bar (Dock Management)
    // ============================================================================

    let dockElement: HTMLElement | null = null;
    let gestureNavBar: HTMLElement | null = null;
    let isAppOpen = false;
    let windowChangeObserver: MutationObserver | null = null;
    let isInitialized = false;

    const GESTURE_NAV_ID = 'mobile-gesture-nav-bar';
    const DOCK_ID = 'dock';
    const TRANSITION_DURATION = 200; // ms
    const PAGE_TRANSITION = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    const SWIPE_AXIS_LOCK_THRESHOLD = 12;
    const SWIPE_PAGE_CHANGE_THRESHOLD = 64;
    const WHEEL_PAGE_CHANGE_THRESHOLD = 80;
    const WHEEL_PAGE_CHANGE_COOLDOWN = 280;

    function getMobileTopChromeHeight(): number {
        const raw = getComputedStyle(document.documentElement)
            .getPropertyValue('--ui-top-chrome-height')
            .trim();
        const parsed = Number.parseFloat(raw);
        return Number.isFinite(parsed) ? parsed : 42;
    }

    function getMobileHomeButtonReserveHeight(): number {
        const raw = getComputedStyle(document.documentElement)
            .getPropertyValue('--ui-mobile-home-button-reserve-height')
            .trim();
        const parsed = Number.parseFloat(raw);
        // Keep a conservative fallback so app content never sits beneath the home button.
        return Number.isFinite(parsed) ? parsed : 56;
    }

    function setScreensTranslatePercent(translatePercent: number, animated: boolean): void {
        if (!screensContainer) return;

        screensContainer.style.transition = animated ? PAGE_TRANSITION : 'none';
        screensContainer.style.transform = `translateX(${translatePercent}%)`;
    }

    function getPageTranslatePercent(pageId: PageId): number {
        return pageId === 0 ? 0 : -100;
    }

    function clampTranslatePercent(translatePercent: number): number {
        return Math.min(0, Math.max(-100, translatePercent));
    }

    function getPageFromSwipeDelta(deltaX: number): PageId | null {
        if (Math.abs(deltaX) < SWIPE_PAGE_CHANGE_THRESHOLD) {
            return null;
        }

        if (deltaX < 0 && currentPage < 1) {
            return 1;
        }

        if (deltaX > 0 && currentPage > 0) {
            return 0;
        }

        return currentPage;
    }

    function getPageFromWheelDelta(deltaX: number): PageId {
        return deltaX > 0 ? 1 : 0;
    }

    function resetWheelAccumulator(): void {
        wheelDeltaAccumulator = 0;
        if (wheelAccumulatorResetTimer !== null) {
            clearTimeout(wheelAccumulatorResetTimer);
            wheelAccumulatorResetTimer = null;
        }
    }

    function resetSwipeTracking(restoreAnimatedPosition = true): void {
        isTrackingSwipe = false;
        swipeAxisLock = null;
        swipeCurrentDeltaX = 0;

        if (restoreAnimatedPosition) {
            setScreensTranslatePercent(getPageTranslatePercent(currentPage), true);
        }
    }

    function fitModalToMobileViewport(modal: HTMLElement | null): void {
        if (!modal || !isMobileMode()) return;
        const appShell =
            (modal.querySelector<HTMLElement>('.autopointer') as HTMLElement | null) || modal;
        const topChrome = Math.max(0, Math.round(getMobileTopChromeHeight()));
        const bottomReserve = Math.max(0, Math.round(getMobileHomeButtonReserveHeight()));
        const height = Math.max(0, Math.round(window.innerHeight - topChrome - bottomReserve));

        appShell.style.position = 'fixed';
        appShell.style.left = '0px';
        appShell.style.top = `${topChrome}px`;
        appShell.style.bottom = `${bottomReserve}px`;
        appShell.style.width = '100vw';
        appShell.style.maxWidth = '100vw';
        appShell.style.height = `${height}px`;
        appShell.style.maxHeight = `${height}px`;
    }

    function closeModalElement(modal: HTMLElement): void {
        const closeBtn = modal.querySelector<HTMLElement>(
            '[data-action="closeWindow"], [data-close-window], [id^="close-"][id$="-modal"]'
        );
        if (closeBtn) {
            closeBtn.click();
            return;
        }

        // Last-resort fallback for legacy modal structures without close action wiring.
        modal.classList.add('hidden');
    }

    function enforceSingleForegroundAppForMobile(): void {
        if (!isMobileMode()) return;

        const openModals = getOpenAppModals();
        if (openModals.length === 0) {
            onAppClosed();
            return;
        }

        const registry = (window as unknown as { WindowRegistry?: Record<string, unknown> })
            .WindowRegistry as
            | {
                  getActiveWindow?: () => Record<string, unknown> | null;
                  getAllWindows?: () => Array<Record<string, unknown>>;
              }
            | undefined;

        const activeWindow = registry?.getActiveWindow?.() || null;
        const activeWindowId = activeWindow?.id || null;
        const activeWindowElement = (activeWindow?.element as HTMLElement | undefined) || undefined;

        const topMostModal = [...openModals].sort((a, b) => {
            const aZ = Number.parseInt(getComputedStyle(a).zIndex || '0', 10) || 0;
            const bZ = Number.parseInt(getComputedStyle(b).zIndex || '0', 10) || 0;
            return bZ - aZ;
        })[0];

        const modalToKeep =
            activeWindowElement && openModals.includes(activeWindowElement)
                ? activeWindowElement
                : topMostModal;

        const allWindows = registry?.getAllWindows?.() || [];
        allWindows.forEach(win => {
            const runtimeWindow = win as {
                id?: string;
                element?: HTMLElement;
                close?: () => void;
            };
            if (activeWindowId && runtimeWindow.id === activeWindowId) return;
            if (modalToKeep && runtimeWindow.element === modalToKeep) return;
            if (runtimeWindow.element?.classList?.contains('hidden')) return;
            runtimeWindow.close?.();
        });

        openModals.forEach(modal => {
            if (modal === modalToKeep) return;
            closeModalElement(modal);
        });

        const remaining = getOpenAppModals();
        const visibleApp =
            modalToKeep && !modalToKeep.classList.contains('hidden')
                ? modalToKeep
                : remaining[0] || null;

        if (!visibleApp) {
            onAppClosed();
            return;
        }

        fitModalToMobileViewport(visibleApp);
        onAppOpened();
    }

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
        const wasAppOpen = isAppOpen;
        isAppOpen = true;
        mobileScreensWrapper?.classList.add('mobile-screens-wrapper--app-open');
        positionGestureNavBar();
        showGestureNav();

        if (!wasAppOpen) {
            logger.debug('Mobile Paging', 'App opened - showing gesture nav');
        }
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
        const openModals = getOpenAppModals();
        openModals.forEach(modal => {
            const closeBtn = modal.querySelector<HTMLElement>('[data-action="closeWindow"]');
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

            enforceSingleForegroundAppForMobile();
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
        setScreensTranslatePercent(getPageTranslatePercent(pageId), true);

        // Update page dots
        if (pageDots) {
            pageDots.forEach((dot, index) => {
                dot.classList.toggle('mobile-page-dot--active', index === pageId);
            });
        }

        logger.debug('Mobile Paging', `Transitioned to page ${pageId}`);
    }

    /**
     * PURPOSE: Interpret horizontal touch gestures as page navigation while preserving
     * vertical scrolling inside each mobile screen.
     */
    function attachPageGestureHandlers(): void {
        if (!mobileScreensWrapper || !screensContainer || pageGestureHandlersAttached) return;

        const onTouchStart = (event: TouchEvent): void => {
            if (!isMobileMode() || isAppOpen || event.touches.length !== 1) {
                return;
            }

            const touch = event.touches.item(0);
            if (!touch) {
                return;
            }

            swipeStartX = touch.clientX;
            swipeStartY = touch.clientY;
            swipeCurrentDeltaX = 0;
            swipeAxisLock = null;
            isTrackingSwipe = true;
        };

        const onTouchMove = (event: TouchEvent): void => {
            if (!isTrackingSwipe || !isMobileMode() || isAppOpen || event.touches.length !== 1) {
                return;
            }

            const touch = event.touches.item(0);
            const containerElement = screensContainer;
            const wrapperElement = mobileScreensWrapper;
            if (!touch || !containerElement || !wrapperElement) {
                return;
            }

            const deltaX = touch.clientX - swipeStartX;
            const deltaY = touch.clientY - swipeStartY;
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);

            if (!swipeAxisLock) {
                const dominantDelta = Math.max(absDeltaX, absDeltaY);
                if (dominantDelta < SWIPE_AXIS_LOCK_THRESHOLD) {
                    return;
                }

                swipeAxisLock = absDeltaX > absDeltaY ? 'x' : 'y';
            }

            if (swipeAxisLock !== 'x') {
                return;
            }

            event.preventDefault();
            swipeCurrentDeltaX = deltaX;

            const containerWidth = containerElement.clientWidth || wrapperElement.clientWidth;
            if (containerWidth <= 0) {
                return;
            }

            const translateOffset = (deltaX / containerWidth) * 100;
            const translatePercent = clampTranslatePercent(
                getPageTranslatePercent(currentPage) + translateOffset
            );

            setScreensTranslatePercent(translatePercent, false);
        };

        const finalizeSwipe = (): void => {
            if (!isTrackingSwipe) {
                return;
            }

            const targetPage =
                swipeAxisLock === 'x' ? getPageFromSwipeDelta(swipeCurrentDeltaX) : null;
            resetSwipeTracking(false);

            if (targetPage === null) {
                transitionToPage(currentPage);
                return;
            }

            transitionToPage(targetPage);
        };

        const onWheel = (event: WheelEvent): void => {
            if (!isMobileMode() || isAppOpen) {
                return;
            }

            const absDeltaX = Math.abs(event.deltaX);
            const absDeltaY = Math.abs(event.deltaY);
            if (absDeltaX <= absDeltaY || absDeltaX < 4) {
                return;
            }

            wheelDeltaAccumulator += event.deltaX;

            if (wheelAccumulatorResetTimer !== null) {
                clearTimeout(wheelAccumulatorResetTimer);
            }

            wheelAccumulatorResetTimer = window.setTimeout(() => {
                resetWheelAccumulator();
            }, 140);

            if (Math.abs(wheelDeltaAccumulator) < WHEEL_PAGE_CHANGE_THRESHOLD) {
                return;
            }

            event.preventDefault();

            const now = Date.now();
            if (now - lastWheelPageChangeAt < WHEEL_PAGE_CHANGE_COOLDOWN) {
                return;
            }

            const targetPage = getPageFromWheelDelta(wheelDeltaAccumulator);
            resetWheelAccumulator();

            if (targetPage === currentPage) {
                return;
            }

            lastWheelPageChangeAt = now;
            transitionToPage(targetPage);
        };

        mobileScreensWrapper.addEventListener('touchstart', onTouchStart, { passive: true });
        mobileScreensWrapper.addEventListener('touchmove', onTouchMove, { passive: false });
        mobileScreensWrapper.addEventListener('touchend', finalizeSwipe);
        mobileScreensWrapper.addEventListener('touchcancel', () => {
            resetSwipeTracking();
        });
        mobileScreensWrapper.addEventListener('wheel', onWheel, { passive: false });

        pageGestureHandlersAttached = true;
        logger.debug('Mobile Paging', 'Page gesture handlers attached');
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
        screensContainer.style.transition = PAGE_TRANSITION;
        transitionToPage(0);
        attachPageGestureHandlers();

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
                emoji: '📁',
                label: 'Finder',
                action: 'openWindow',
                windowId: 'finder-modal',
            },
            {
                id: 'terminal',
                emoji: '⌨️',
                label: 'Terminal',
                action: 'openWindow',
                windowId: 'terminal',
            },
            {
                id: 'text-editor',
                emoji: '📝',
                label: 'Texteditor',
                action: 'openWindow',
                windowId: 'text-modal',
            },
            {
                id: 'preview',
                emoji: '👁️',
                label: 'Vorschau',
                action: 'openWindow',
                windowId: 'preview-modal',
            },
            {
                id: 'photos',
                emoji: '🖼️',
                label: 'Fotos',
                action: 'openWindow',
                windowId: 'image-modal',
            },
            {
                id: 'settings',
                emoji: '⚙️',
                label: 'Einstellungen',
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
            iconDiv.textContent = app.emoji;

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

            // Mobile mode supports one foreground app only.
            enforceSingleForegroundAppForMobile();
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
        if (isInitialized) {
            onUIModChange();
            return;
        }
        isInitialized = true;

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
