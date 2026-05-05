/**
 * Mobile Paging System: iOS-like Home Screen + Launchpad Navigation
 * PLUS: Gesture Navigation Bar (transforms dock into iOS-style home button when app is open)
 * Handles screen transitions, page dots, swipe gestures, and dock management for mobile mode.
 */

import logger from '../core/logger.js';
import { translate } from '../services/i18n';
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
    const BACK_BUTTON_ID = 'mobile-status-back-button';
    const DOCK_ID = 'dock';
    const MAX_APP_HISTORY = 6;
    const TRANSITION_DURATION = 200; // ms
    const PAGE_TRANSITION = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    const SWIPE_AXIS_LOCK_THRESHOLD = 12;
    const SWIPE_PAGE_CHANGE_THRESHOLD = 64;
    const WHEEL_PAGE_CHANGE_THRESHOLD = 80;
    const WHEEL_PAGE_CHANGE_COOLDOWN = 280;

    let mobileStatusBackButton: HTMLButtonElement | null = null;
    let activeAppModalId: string | null = null;
    const appHistoryStack: string[] = [];
    let suppressNextHistoryPush = false;

    // ============================================================================
    // Wiggle / Edit Mode
    // ============================================================================

    /** Duration in ms before a stationary touch triggers wiggle mode. */
    const WIGGLE_LONG_PRESS_MS = 500;
    /** Touch movement threshold in px that cancels the long-press timer. */
    const WIGGLE_DRAG_THRESHOLD = 8;

    let isWiggleMode = false;
    let wiggleLongPressTimer: number | null = null;

    // Drag-to-dock state (only active in wiggle mode)
    let wiggleDragGhost: HTMLElement | null = null;
    let wiggleDragWindowId: string | null = null;
    let wiggleDragStartX = 0;
    let wiggleDragStartY = 0;
    let wiggleDragStarted = false;

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

    function getBackButtonElement(): HTMLButtonElement | null {
        if (mobileStatusBackButton && document.body.contains(mobileStatusBackButton)) {
            return mobileStatusBackButton;
        }
        mobileStatusBackButton = document.getElementById(
            BACK_BUTTON_ID
        ) as HTMLButtonElement | null;
        return mobileStatusBackButton;
    }

    function updateBackButtonVisibility(): void {
        const backButton = getBackButtonElement();
        if (!backButton) return;

        const shouldShow = isMobileMode() && isAppOpen && appHistoryStack.length > 0;
        backButton.classList.toggle('hidden', !shouldShow);
        backButton.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
    }

    function clearAppSwitchHistory(): void {
        activeAppModalId = null;
        appHistoryStack.length = 0;
        suppressNextHistoryPush = false;
        updateBackButtonVisibility();
    }

    function pushHistoryEntry(modalId: string): void {
        if (!modalId) return;
        if (appHistoryStack[appHistoryStack.length - 1] === modalId) return;

        appHistoryStack.push(modalId);
        while (appHistoryStack.length > MAX_APP_HISTORY) {
            appHistoryStack.shift();
        }
    }

    function trackForegroundAppChange(visibleApp: HTMLElement | null): void {
        const nextModalId = visibleApp?.id || null;

        if (!nextModalId) {
            clearAppSwitchHistory();
            return;
        }

        if (!activeAppModalId) {
            activeAppModalId = nextModalId;
            updateBackButtonVisibility();
            return;
        }

        if (activeAppModalId !== nextModalId) {
            if (suppressNextHistoryPush) {
                suppressNextHistoryPush = false;
            } else {
                pushHistoryEntry(activeAppModalId);
            }
            activeAppModalId = nextModalId;
        }

        updateBackButtonVisibility();
    }

    function openAppByWindowId(windowId: string): void {
        if (!windowId) return;

        const ActionBus = (
            window as unknown as {
                ActionBus?: {
                    execute?: (
                        actionName: string,
                        params?: Record<string, unknown>,
                        element?: HTMLElement | null
                    ) => void;
                };
            }
        ).ActionBus;

        if (ActionBus?.execute) {
            ActionBus.execute('openWindow', { windowId });
            return;
        }

        const wm = (window as unknown as { WindowManager?: { open?: (id: string) => void } })
            .WindowManager;
        wm?.open?.(windowId);
    }

    function goBackToPreviousApp(): void {
        if (!isMobileMode()) return;

        const previousAppId = appHistoryStack.pop() || null;
        updateBackButtonVisibility();
        if (!previousAppId) return;

        suppressNextHistoryPush = true;
        openAppByWindowId(previousAppId);
    }

    function initMobileStatusBackButton(): void {
        const backButton = getBackButtonElement();
        if (!backButton) return;

        if (backButton.dataset.mobileBackBound !== 'true') {
            backButton.dataset.mobileBackBound = 'true';
            backButton.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                goBackToPreviousApp();
            });
        }

        updateBackButtonVisibility();
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
        trackForegroundAppChange(visibleApp);
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
        updateBackButtonVisibility();

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
        clearAppSwitchHistory();

        // Return to home page
        transitionToPage(0);

        logger.debug('Mobile Paging', 'App closed - showing dock');
    }

    /**
     * Return to home (close all apps)
     */
    function returnToHome(): void {
        clearAppSwitchHistory();

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

        // Exit wiggle mode whenever the user navigates away from the home screen.
        if (pageId !== 0) exitWiggleMode();

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

    // ============================================================================
    // Wiggle / Edit Mode helpers
    // ============================================================================

    /**
     * Activates wiggle/edit mode: applies the iOS-style jiggle animation to all
     * home screen icons and marks the grid so tap-handlers know we are editing.
     * PURPOSE: Entry point called after a long-press is confirmed.
     * INVARIANT: safe to call when already in wiggle mode (no-op).
     */
    function enterWiggleMode(): void {
        if (isWiggleMode) return;
        isWiggleMode = true;

        const appGrid = homeScreen?.querySelector<HTMLElement>('.mobile-home-app-grid');
        if (!appGrid) return;

        appGrid.classList.add('mobile-home-app-grid--edit-mode');
        appGrid.querySelectorAll<HTMLElement>('.mobile-home-app-icon').forEach((icon, i) => {
            icon.classList.add('mobile-home-app-icon--wiggling');
            // Stagger delay cycles every 4 icons to mimic iOS natural randomness.
            icon.style.animationDelay = `${(i % 4) * 0.07}s`;
        });

        // Haptic feedback if available; navigator.vibrate is optional in the spec.
        if (typeof navigator.vibrate === 'function') navigator.vibrate(10);
        logger.debug('Mobile Paging', 'Wiggle mode entered');
    }

    /**
     * Deactivates wiggle/edit mode and removes all animation state.
     * Also cleans up any in-progress drag ghost.
     * INVARIANT: safe to call when not in wiggle mode (no-op).
     */
    function exitWiggleMode(): void {
        if (!isWiggleMode) return;
        isWiggleMode = false;

        cancelWiggleDrag();

        const appGrid = homeScreen?.querySelector<HTMLElement>('.mobile-home-app-grid');
        if (!appGrid) return;

        appGrid.classList.remove('mobile-home-app-grid--edit-mode');
        appGrid.querySelectorAll<HTMLElement>('.mobile-home-app-icon').forEach(icon => {
            icon.classList.remove('mobile-home-app-icon--wiggling');
            icon.style.animationDelay = '';
        });

        logger.debug('Mobile Paging', 'Wiggle mode exited');
    }

    // ============================================================================
    // Wiggle drag-to-dock helpers
    // ============================================================================

    /** Removes the drag ghost element and resets drag state. */
    function cancelWiggleDrag(): void {
        if (wiggleDragGhost) {
            wiggleDragGhost.remove();
            wiggleDragGhost = null;
        }
        // Re-enable pointer events on the dock drop zone
        const dock = document.getElementById(DOCK_ID);
        if (dock) dock.classList.remove('dock--wiggle-drag-over');

        wiggleDragWindowId = null;
        wiggleDragStarted = false;
    }

    /**
     * Returns true if the given screen coordinates are within the dock element.
     * Used during touch-drag to detect drop-over-dock.
     */
    function isTouchOverDock(clientX: number, clientY: number): boolean {
        const dock = document.getElementById(DOCK_ID);
        if (!dock) return false;
        const r = dock.getBoundingClientRect();
        // Extend hitbox slightly above the dock to allow easier drops.
        return (
            clientX >= r.left &&
            clientX <= r.right &&
            clientY >= r.top - 24 &&
            clientY <= r.bottom
        );
    }

    /**
     * Attaches touch handlers to a home screen icon for drag-to-dock in wiggle mode.
     * WHY: Native drag-and-drop API is not available on touch devices; we simulate
     *      it with touchmove + a ghost element following the finger.
     * DEPENDENCY: Must be called after the icon element is in the DOM.
     */
    function attachIconDragHandlers(btn: HTMLElement, windowId: string): void {
        let touchId: number | null = null;
        // Ghost half-dimensions cached when the ghost is created to avoid repeated
        // getBoundingClientRect() calls on every touchmove (layout thrash).
        let ghostHalfW = 0;
        let ghostHalfH = 0;

        const onTouchStart = (e: TouchEvent) => {
            if (!isWiggleMode) return;
            // Only start drag if icon has a dock-pinnable window ID.
            if (!windowId) return;
            // Guard: another icon drag is already in progress — don't steal the slot.
            if (wiggleDragWindowId !== null) return;
            const touch = e.changedTouches[0];
            if (!touch) return;
            touchId = touch.identifier;
            wiggleDragStartX = touch.clientX;
            wiggleDragStartY = touch.clientY;
            wiggleDragStarted = false;
            wiggleDragWindowId = windowId;
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!isWiggleMode || wiggleDragWindowId !== windowId) return;
            const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId);
            if (!touch) return;

            const dx = touch.clientX - wiggleDragStartX;
            const dy = touch.clientY - wiggleDragStartY;
            const dist = Math.hypot(dx, dy);

            if (!wiggleDragStarted) {
                if (dist < WIGGLE_DRAG_THRESHOLD) return;
                // Threshold crossed — create ghost and cache its dimensions.
                wiggleDragStarted = true;
                const iconGraphic = btn.querySelector<HTMLElement>('.mobile-home-app-icon-graphic');
                wiggleDragGhost = (iconGraphic || btn).cloneNode(true) as HTMLElement;
                wiggleDragGhost.style.cssText = `
                    position: fixed;
                    pointer-events: none;
                    z-index: 99999;
                    opacity: 0.9;
                    transform: scale(1.2);
                    transform-origin: center;
                    border-radius: 18px;
                    transition: none;
                `.trim();
                document.body.appendChild(wiggleDragGhost);
                const ghostRect = wiggleDragGhost.getBoundingClientRect();
                ghostHalfW = ghostRect.width / 2;
                ghostHalfH = ghostRect.height / 2;
            }

            if (!wiggleDragGhost) return;
            e.preventDefault(); // Prevent scroll during drag

            wiggleDragGhost.style.left = `${touch.clientX - ghostHalfW}px`;
            wiggleDragGhost.style.top = `${touch.clientY - ghostHalfH}px`;

            // Highlight dock when hovering over it
            const dock = document.getElementById(DOCK_ID);
            if (dock) {
                dock.classList.toggle('dock--wiggle-drag-over', isTouchOverDock(touch.clientX, touch.clientY));
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (!isWiggleMode || wiggleDragWindowId !== windowId) return;
            const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId);
            if (!touch) return;

            const wasDragged = wiggleDragStarted;
            const overDock = isTouchOverDock(touch.clientX, touch.clientY);

            cancelWiggleDrag();

            if (wasDragged && overDock) {
                // Attempt to pin app to dock; setDockItemPinned returns false if budget exhausted.
                if (!window.DockSystem?.setDockItemPinned) {
                    logger.warn('Mobile Paging', 'DockSystem.setDockItemPinned unavailable');
                } else if (!window.DockSystem.setDockItemPinned(windowId, true)) {
                    logger.debug('Mobile Paging', `Dock full — cannot pin ${windowId}`);
                }
            } else if (!wasDragged) {
                // Tap without drag while in wiggle mode → exit edit mode.
                exitWiggleMode();
            }
        };

        btn.addEventListener('touchstart', onTouchStart, { passive: true });
        btn.addEventListener('touchmove', onTouchMove, { passive: false });
        btn.addEventListener('touchend', onTouchEnd, { passive: true });
        btn.addEventListener('touchcancel', () => {
            if (wiggleDragWindowId === windowId) cancelWiggleDrag();
        }, { passive: true });
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
                label: translate('programs.finder.label', 'Finder'),
                action: 'openWindow',
                windowId: 'finder-modal',
            },
            {
                id: 'terminal',
                iconKey: 'terminal' as ProgramIconKey,
                label: translate('programs.terminal.label', 'Terminal'),
                action: 'openWindow',
                windowId: 'terminal',
            },
            {
                id: 'text-editor',
                iconKey: 'textEditor' as ProgramIconKey,
                label: translate('programs.text.label', 'Texteditor'),
                action: 'openWindow',
                windowId: 'text-modal',
            },
            {
                id: 'calendar',
                iconKey: 'calendar' as ProgramIconKey,
                label: translate('programs.calendar.label', 'Kalender'),
                action: 'openWindow',
                windowId: 'calendar-modal',
            },
            {
                id: 'photos',
                iconKey: 'photos' as ProgramIconKey,
                label: translate('programs.photos.label', 'Fotos'),
                action: 'openWindow',
                windowId: 'image-modal',
            },
            {
                id: 'settings',
                iconKey: 'settings' as ProgramIconKey,
                label: translate('programs.settings.label', 'Einstellungen'),
                action: 'openWindow',
                windowId: 'settings-modal',
            },
        ];

        // Build HTML for app grid
        mobileHomeContent.innerHTML = '';
        // Rebuilding DOM always exits wiggle mode (state no longer matches DOM).
        exitWiggleMode();
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

            // Attach drag-to-dock handlers for each icon (active only in wiggle mode).
            attachIconDragHandlers(btn, app.windowId);
        });

        // Long-press on grid background → enter wiggle mode (iOS-style).
        let lpTouchMoved = false;
        appGrid.addEventListener('touchstart', () => {
            lpTouchMoved = false;
            if (wiggleLongPressTimer !== null) window.clearTimeout(wiggleLongPressTimer);
            wiggleLongPressTimer = window.setTimeout(() => {
                wiggleLongPressTimer = null;
                if (!lpTouchMoved) enterWiggleMode();
            }, WIGGLE_LONG_PRESS_MS);
        }, { passive: true });
        appGrid.addEventListener('touchmove', () => {
            lpTouchMoved = true;
            if (wiggleLongPressTimer !== null) {
                window.clearTimeout(wiggleLongPressTimer);
                wiggleLongPressTimer = null;
            }
        }, { passive: true });
        appGrid.addEventListener('touchend', () => {
            if (wiggleLongPressTimer !== null) {
                window.clearTimeout(wiggleLongPressTimer);
                wiggleLongPressTimer = null;
            }
        }, { passive: true });

        // Tap on grid background (not on an icon) while in wiggle mode → exit.
        appGrid.addEventListener('click', e => {
            if (!isWiggleMode) return;
            const target = e.target as Element;
            if (!target.closest('.mobile-home-app-icon')) {
                exitWiggleMode();
            }
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
            initMobileStatusBackButton();
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
            clearAppSwitchHistory();
            exitWiggleMode();

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
        initMobileStatusBackButton();

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
        window.addEventListener('iconThemeChange', () => {
            if (!isMobileMode()) return;
            populateHomeScreen();
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
        exitWiggleMode,
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
            exitWiggleMode: () => void;
        };
    }
}
