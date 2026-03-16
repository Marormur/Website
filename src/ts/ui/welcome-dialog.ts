/**
 * src/ts/ui/welcome-dialog.ts
 *
 * PURPOSE: Zeigt beim ersten Besuch ein modernes macOS-artiges Willkommensfenster.
 *
 * BEHAVIOR:
 * - Wird genau einmal pro Browser angezeigt (localStorage-Flag 'portfolio_welcome_shown').
 * - Erscheint als normales Fenster ohne abgedunkelten Rest der Website.
 * - Traffic-Light-Buttons sind funktional: close, minimize/collapse, zoom/maximize.
 * - Das Fenster ist über die Titelleiste verschiebbar.
 *
 * INVARIANT: document.body muss existieren bevor show() aufgerufen wird.
 * DEPENDENCY: Kein Import von anderen App-Modulen notwendig (eigenständig).
 */

import logger from '../core/logger.js';

const WELCOME_SHOWN_KEY = 'portfolio_welcome_shown';

type WelcomeDialogWindow = Window & {
    showWelcomeDialog?: () => void;
    resetWelcomeDialogAndShow?: () => void;
};

type DragState = {
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startLeft: number;
    startTop: number;
};

type WindowBounds = {
    left: number;
    top: number;
    width: number;
    height: number;
};

const ROOT_ID = 'welcome-dialog-overlay';
const WINDOW_ID = 'welcome-dialog-window';
const TITLEBAR_ID = 'welcome-dialog-titlebar';
const CONTENT_ID = 'welcome-dialog-content';
const WINDOW_CAPTION_ID = 'welcome-dialog-caption';
const SUBTITLE_ID = 'welcome-dialog-subtitle';
const CONTINUE_ID = 'welcome-dialog-continue';
const CLOSE_ID = 'welcome-dialog-close';
const MINIMIZE_ID = 'welcome-dialog-minimize';
const ZOOM_ID = 'welcome-dialog-zoom';
const MIN_TOP_OFFSET = 44;
const HORIZONTAL_EDGE_PADDING = 0;
const VERTICAL_EDGE_PADDING = 16;

function getViewportBounds() {
    const top = Math.max(MIN_TOP_OFFSET, Math.round(window.getMenuBarBottom?.() || MIN_TOP_OFFSET));
    const left = HORIZONTAL_EDGE_PADDING;
    return {
        minLeft: left,
        minTop: top,
        maxWidth: Math.max(320, window.innerWidth - HORIZONTAL_EDGE_PADDING * 2),
        maxHeight: Math.max(260, window.innerHeight - top - VERTICAL_EDGE_PADDING),
    };
}

function clampWindowPosition(left: number, top: number, width: number, height: number) {
    const viewport = getViewportBounds();
    const maxLeft = Math.max(viewport.minLeft, window.innerWidth - width - HORIZONTAL_EDGE_PADDING);
    const maxTop = Math.max(viewport.minTop, window.innerHeight - height - VERTICAL_EDGE_PADDING);
    return {
        left: Math.min(Math.max(viewport.minLeft, left), maxLeft),
        top: Math.min(Math.max(viewport.minTop, top), maxTop),
    };
}

function centerWindow(width: number, height: number) {
    const left = Math.round((window.innerWidth - width) / 2);
    // Center against the real viewport and then enforce menu bar / edge boundaries.
    const top = Math.round((window.innerHeight - height) / 2);
    return clampWindowPosition(left, top, width, height);
}

function storeRestoreBounds(win: HTMLElement) {
    const rect = win.getBoundingClientRect();
    win.dataset.restoreLeft = `${Math.round(rect.left)}`;
    win.dataset.restoreTop = `${Math.round(rect.top)}`;
    win.dataset.restoreWidth = `${Math.round(rect.width)}`;
    win.dataset.restoreHeight = `${Math.round(rect.height)}`;
}

function readRestoreBounds(win: HTMLElement): WindowBounds | null {
    const left = Number(win.dataset.restoreLeft);
    const top = Number(win.dataset.restoreTop);
    const width = Number(win.dataset.restoreWidth);
    const height = Number(win.dataset.restoreHeight);
    if ([left, top, width, height].some(value => !Number.isFinite(value) || value <= 0)) {
        return null;
    }
    return { left, top, width, height };
}

function applyWindowBounds(win: HTMLElement, bounds: WindowBounds) {
    const position = clampWindowPosition(bounds.left, bounds.top, bounds.width, bounds.height);
    win.style.left = `${position.left}px`;
    win.style.top = `${position.top}px`;
    win.style.width = `${bounds.width}px`;
    win.style.height = `${bounds.height}px`;
}

function fitWindowToContent(win: HTMLElement, options: { center?: boolean } = {}) {
    const viewport = getViewportBounds();
    const width = Math.min(Number.parseFloat(win.style.width) || 540, viewport.maxWidth);
    win.style.width = `${width}px`;
    win.style.height = 'auto';

    const measuredHeight = Math.min(Math.ceil(win.scrollHeight), viewport.maxHeight);
    const measuredWidth = Math.min(Math.ceil(win.getBoundingClientRect().width), viewport.maxWidth);
    const currentLeft = Number.parseFloat(win.style.left);
    const currentTop = Number.parseFloat(win.style.top);

    const position =
        options.center || !Number.isFinite(currentLeft) || !Number.isFinite(currentTop)
            ? centerWindow(measuredWidth, measuredHeight)
            : clampWindowPosition(currentLeft, currentTop, measuredWidth, measuredHeight);

    applyWindowBounds(win, {
        left: position.left,
        top: position.top,
        width: measuredWidth,
        height: measuredHeight,
    });
}

/** Gibt true zurück wenn der Benutzer den Dialog bereits gesehen hat. */
function hasSeenWelcome(): boolean {
    try {
        return localStorage.getItem(WELCOME_SHOWN_KEY) === '1';
    } catch {
        return false;
    }
}

/** Persistiert den "gesehen"-Status in localStorage. */
function markWelcomeSeen(): void {
    try {
        localStorage.setItem(WELCOME_SHOWN_KEY, '1');
    } catch {
        // localStorage nicht verfügbar — kein Fehler, Dialog wird beim nächsten Besuch erneut gezeigt
    }
}

/** Entfernt den "gesehen"-Status, damit der Dialog erneut angezeigt werden kann. */
function resetWelcomeSeen(): void {
    try {
        localStorage.removeItem(WELCOME_SHOWN_KEY);
    } catch {
        // localStorage nicht verfügbar — ignorieren
    }
}

/**
 * Erstellt einen transparenten Host mit einem modernen macOS-artigen Fenster.
 * Der Host blockiert die Website nicht; nur das Fenster selbst nimmt Pointer-Events an.
 */
function buildOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.id = ROOT_ID;
    overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:2147483490',
        'pointer-events:none',
        'opacity:0',
        'transition:opacity 0.26s ease',
    ].join(';');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'welcome-dialog-title');

    overlay.innerHTML = `
        <style>
            #${WINDOW_ID} {
                position: fixed;
                width: 540px;
                max-width: calc(100vw - 32px);
                min-width: 360px;
                border-radius: 20px;
                overflow: hidden;
                pointer-events: auto;
                background: linear-gradient(180deg, rgba(255,255,255,0.86), rgba(246,247,249,0.82));
                border: 1px solid rgba(255,255,255,0.7);
                box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22), 0 10px 28px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255,255,255,0.6);
                backdrop-filter: blur(22px) saturate(1.25);
                -webkit-backdrop-filter: blur(22px) saturate(1.25);
                display: flex;
                flex-direction: column;
                transform: translateY(14px) scale(0.985);
                opacity: 0;
                transition: transform 0.26s ease, opacity 0.26s ease, box-shadow 0.18s ease;
                user-select: none;
            }

            html.dark #${WINDOW_ID} {
                background: linear-gradient(180deg, rgba(38,41,48,0.88), rgba(28,31,36,0.84));
                border: 1px solid rgba(255,255,255,0.08);
                box-shadow: 0 26px 80px rgba(0, 0, 0, 0.45), 0 14px 30px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255,255,255,0.08);
            }

            #${WINDOW_ID}.is-active {
                box-shadow: 0 28px 90px rgba(15, 23, 42, 0.25), 0 14px 36px rgba(15, 23, 42, 0.14), inset 0 1px 0 rgba(255,255,255,0.65);
            }

            html.dark #${WINDOW_ID}.is-active {
                box-shadow: 0 28px 90px rgba(0, 0, 0, 0.52), 0 14px 36px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.1);
            }

            #${WINDOW_ID}.is-minimized {
                height: 36px !important;
                overflow: hidden;
            }

            #${WINDOW_ID}.is-minimized #${CONTENT_ID} {
                opacity: 0;
                pointer-events: none;
                transform: translateY(-8px);
            }

            #${TITLEBAR_ID} {
                height: 42px;
                padding: 0 14px;
                display: flex;
                align-items: center;
                position: relative;
                flex-shrink: 0;
                background: linear-gradient(180deg, rgba(255,255,255,0.72), rgba(238,240,243,0.58));
                border-bottom: 1px solid rgba(15, 23, 42, 0.07);
                cursor: grab;
            }

            html.dark #${TITLEBAR_ID} {
                background: linear-gradient(180deg, rgba(72,77,87,0.42), rgba(45,49,57,0.34));
                border-bottom: 1px solid rgba(255,255,255,0.07);
            }

            #${TITLEBAR_ID}:active {
                cursor: grabbing;
            }

            #${CONTENT_ID} {
                padding: 32px 48px 38px;
                display: flex;
                flex-direction: column;
                align-items: center;
                background: linear-gradient(180deg, rgba(252,252,253,0.78) 0%, rgba(243,244,247,0.74) 100%);
                transition: opacity 0.18s ease, transform 0.18s ease;
            }

            html.dark #${CONTENT_ID} {
                background: linear-gradient(180deg, rgba(41,45,53,0.72) 0%, rgba(27,30,37,0.68) 100%);
            }

            html.dark #${WINDOW_CAPTION_ID} {
                color: rgba(243,244,246,0.82) !important;
            }

            html.dark #welcome-dialog-title {
                color: #f9fafb !important;
            }

            html.dark #${SUBTITLE_ID} {
                color: rgba(229,231,235,0.72) !important;
            }

            html.dark #${SUBTITLE_ID} strong {
                color: #f3f4f6;
            }

            html.dark #${CONTENT_ID} > div[style*='height:1px'] {
                background: rgba(255,255,255,0.1) !important;
            }

            .welcome-traffic-lights {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .welcome-traffic-light {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: none;
                padding: 0;
                margin: 0;
                cursor: pointer;
                position: relative;
                box-shadow: inset 0 0.5px 0 rgba(255,255,255,0.45), 0 0 0 0.5px rgba(0,0,0,0.16);
            }

            .welcome-traffic-light::after {
                position: absolute;
                inset: 0;
                display: grid;
                place-items: center;
                font-size: 8px;
                line-height: 1;
                color: rgba(40,40,40,0.65);
                opacity: 0;
                transition: opacity 0.12s ease;
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            }

            html.dark .welcome-traffic-light::after {
                color: rgba(15,23,42,0.78);
            }

            .welcome-traffic-lights:hover .welcome-traffic-light::after,
            .welcome-traffic-lights:focus-within .welcome-traffic-light::after {
                opacity: 1;
            }

            #${CLOSE_ID} {
                background: #ff5f57;
            }

            #${CLOSE_ID}::after {
                content: '×';
            }

            #${MINIMIZE_ID} {
                background: #febc2e;
            }

            #${MINIMIZE_ID}::after {
                content: '−';
            }

            #${ZOOM_ID} {
                background: #28c840;
            }

            #${ZOOM_ID}::after {
                content: '+';
            }

            #${CONTINUE_ID} {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px 16px;
                border-radius: 12px;
                transition: opacity 0.15s ease, transform 0.15s ease, background-color 0.15s ease;
            }

            #${CONTINUE_ID}:hover {
                opacity: 0.82;
                transform: scale(1.04);
                background: rgba(0,0,0,0.035);
            }

            html.dark #${CONTINUE_ID}:hover {
                background: rgba(255,255,255,0.05);
            }

            html.dark #${CONTINUE_ID} span:first-child {
                border-color: rgba(255,255,255,0.1) !important;
                background: linear-gradient(180deg, rgba(90,95,108,0.5), rgba(57,61,70,0.5)) !important;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 18px rgba(0,0,0,0.2) !important;
            }

            html.dark #${CONTINUE_ID} span:last-child {
                color: #f3f4f6 !important;
            }

            html.dark #${CONTINUE_ID} svg path {
                stroke: #f3f4f6;
            }

            #${CONTINUE_ID}:focus-visible,
            .welcome-traffic-light:focus-visible {
                outline: 2px solid rgba(0, 122, 255, 0.55);
                outline-offset: 2px;
            }

            @media (max-width: 640px) {
                #${WINDOW_ID} {
                    min-width: 0;
                    width: calc(100vw - 20px);
                    border-radius: 18px;
                }

                #${CONTENT_ID} {
                    padding: 24px 24px 30px;
                }
            }
        </style>
        <div
            id="${WINDOW_ID}"
        >
            <div
                id="${TITLEBAR_ID}"
                style="
                    position: relative;
                "
            >
                <div class="welcome-traffic-lights">
                    <button
                        id="${CLOSE_ID}"
                        title="Schließen"
                        aria-label="Fenster schließen"
                        data-i18n-title="welcomeDialog.controls.closeTitle"
                        data-i18n-aria-label="welcomeDialog.controls.closeAria"
                        class="welcome-traffic-light"
                    ></button>
                    <button
                        id="${MINIMIZE_ID}"
                        title="Fenster minimieren"
                        aria-label="Fenster minimieren"
                        data-i18n-title="welcomeDialog.controls.minimizeTitle"
                        data-i18n-aria-label="welcomeDialog.controls.minimizeAria"
                        class="welcome-traffic-light"
                    ></button>
                    <button
                        id="${ZOOM_ID}"
                        title="Fenster zoomen"
                        aria-label="Fenster zoomen"
                        data-i18n-title="welcomeDialog.controls.zoomTitle"
                        data-i18n-aria-label="welcomeDialog.controls.zoomAria"
                        class="welcome-traffic-light"
                    ></button>
                </div>
                <span
                    id="${WINDOW_CAPTION_ID}"
                    data-i18n="welcomeDialog.caption"
                    style="
                        position: absolute;
                        left: 50%; transform: translateX(-50%);
                        font-size: 13px;
                        font-weight: 600;
                        color: rgba(17,24,39,0.78);
                        letter-spacing: 0.01em;
                        pointer-events: none;
                        white-space: nowrap;
                    "
                >Willkommen</span>
            </div>

            <div
                id="${CONTENT_ID}"
                style="gap:0;"
            >
                <div style="
                    width: 120px; height: 120px;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 4px solid rgba(255,255,255,0.92);
                    box-shadow: 0 14px 36px rgba(15,23,42,0.16), 0 0 0 1px rgba(255,255,255,0.8);
                    flex-shrink: 0;
                    margin-bottom: 22px;
                ">
                    <img
                        src="./img/profil.jpg"
                        alt="Marvin Temmen"
                        style="width:100%;height:100%;object-fit:cover;"
                        draggable="false"
                    />
                </div>

                <h1
                    id="welcome-dialog-title"
                    data-i18n="welcomeDialog.title"
                    style="
                        font-size: 26px;
                        font-weight: 500;
                        color: #111827;
                        margin: 0 0 10px;
                        letter-spacing: -0.03em;
                        text-align: center;
                    "
                >Marvins Portfolio</h1>

                <p
                    id="${SUBTITLE_ID}"
                    data-i18n-html="welcomeDialog.subtitle"
                    style="
                    font-size: 14px;
                    color: rgba(31,41,55,0.72);
                    text-align: center;
                    margin: 0 0 32px;
                    line-height: 1.55;
                    max-width: 340px;
                ">
                    Um das Portfolio zu erkunden, klicke auf <strong>Fortfahren</strong>.
                </p>

                <div style="width:100%;height:1px;background:rgba(15,23,42,0.08);margin-bottom:24px;"></div>

                <button
                    id="${CONTINUE_ID}"
                    aria-label="Fortfahren"
                    data-i18n-aria-label="welcomeDialog.controls.continueAria"
                >
                    <span style="
                        width: 44px; height: 44px;
                        border-radius: 50%;
                        border: 1px solid rgba(0,0,0,0.12);
                        display: flex; align-items: center; justify-content: center;
                        background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(232,235,240,0.88));
                        box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 18px rgba(15,23,42,0.12);
                    ">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M7 4l5 5-5 5" stroke="#1f2937" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </span>
                    <span
                        data-i18n="welcomeDialog.continue"
                        style="font-size:12px;color:#1f2937;font-weight:600;letter-spacing:0.01em;"
                    >Fortfahren</span>
                </button>
            </div>
        </div>
    `;

    window.appI18n?.applyTranslations?.(overlay);

    const win = overlay.querySelector<HTMLElement>(`#${WINDOW_ID}`);
    if (win) {
        const centered = centerWindow(Math.min(540, getViewportBounds().maxWidth), 460);
        win.style.left = `${centered.left}px`;
        win.style.top = `${centered.top}px`;
        win.style.width = `${Math.min(540, getViewportBounds().maxWidth)}px`;
        win.style.height = 'auto';
    }

    return overlay;
}

/**
 * Blendet den Overlay animiert aus und entfernt ihn anschließend aus dem DOM.
 * Markiert außerdem den Besuch als gesehen.
 */
function dismiss(overlay: HTMLElement): void {
    markWelcomeSeen();

    overlay.style.opacity = '0';
    const win = overlay.querySelector<HTMLElement>(`#${WINDOW_ID}`);
    if (win) {
        win.style.transform = 'translateY(14px) scale(0.985)';
        win.style.opacity = '0';
    }

    setTimeout(() => {
        overlay.remove();
    }, 350);
}

function toggleMinimize(win: HTMLElement) {
    const isMinimized = win.classList.contains('is-minimized');
    if (isMinimized) {
        const restoreBounds = readRestoreBounds(win);
        win.classList.remove('is-minimized');
        if (restoreBounds) {
            applyWindowBounds(win, restoreBounds);
        } else {
            fitWindowToContent(win);
        }
        return;
    }

    storeRestoreBounds(win);
    const rect = win.getBoundingClientRect();
    const minimizedWidth = Math.min(320, Math.max(260, rect.width));
    const position = clampWindowPosition(rect.left, rect.top, minimizedWidth, 36);
    win.classList.add('is-minimized');
    win.style.left = `${position.left}px`;
    win.style.top = `${position.top}px`;
    win.style.width = `${minimizedWidth}px`;
    win.style.height = '36px';
}

function toggleZoom(win: HTMLElement) {
    const isZoomed = win.dataset.zoomed === 'true';
    if (isZoomed) {
        const restoreBounds = readRestoreBounds(win);
        if (restoreBounds) {
            applyWindowBounds(win, restoreBounds);
        }
        win.dataset.zoomed = 'false';
        return;
    }

    if (win.classList.contains('is-minimized')) {
        win.classList.remove('is-minimized');
    }

    storeRestoreBounds(win);
    const viewport = getViewportBounds();
    applyWindowBounds(win, {
        left: EDGE_PADDING,
        top: viewport.minTop,
        width: viewport.maxWidth,
        height: viewport.maxHeight,
    });
    win.dataset.zoomed = 'true';
}

function attachDragging(win: HTMLElement, titlebar: HTMLElement) {
    let dragState: DragState | null = null;

    titlebar.addEventListener('pointerdown', event => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('button')) {
            return;
        }
        if (win.classList.contains('is-minimized')) {
            return;
        }

        const rect = win.getBoundingClientRect();
        dragState = {
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startLeft: rect.left,
            startTop: rect.top,
        };

        titlebar.setPointerCapture(event.pointerId);
        win.classList.add('is-active');
    });

    titlebar.addEventListener('pointermove', event => {
        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }
        const nextLeft = dragState.startLeft + (event.clientX - dragState.startClientX);
        const nextTop = dragState.startTop + (event.clientY - dragState.startClientY);
        const rect = win.getBoundingClientRect();
        const position = clampWindowPosition(nextLeft, nextTop, rect.width, rect.height);
        win.style.left = `${position.left}px`;
        win.style.top = `${position.top}px`;
    });

    const endDrag = (event: PointerEvent) => {
        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }
        if (titlebar.hasPointerCapture(event.pointerId)) {
            titlebar.releasePointerCapture(event.pointerId);
        }
        dragState = null;
    };

    titlebar.addEventListener('pointerup', endDrag);
    titlebar.addEventListener('pointercancel', endDrag);
}

function attachWindowControls(overlay: HTMLElement) {
    const win = overlay.querySelector<HTMLElement>(`#${WINDOW_ID}`);
    const titlebar = overlay.querySelector<HTMLElement>(`#${TITLEBAR_ID}`);
    const closeButton = overlay.querySelector<HTMLButtonElement>(`#${CLOSE_ID}`);
    const minimizeButton = overlay.querySelector<HTMLButtonElement>(`#${MINIMIZE_ID}`);
    const zoomButton = overlay.querySelector<HTMLButtonElement>(`#${ZOOM_ID}`);
    const continueButton = overlay.querySelector<HTMLButtonElement>(`#${CONTINUE_ID}`);

    if (!win || !titlebar || !closeButton || !minimizeButton || !zoomButton || !continueButton) {
        return;
    }

    attachDragging(win, titlebar);

    closeButton.addEventListener('click', event => {
        event.stopPropagation();
        dismiss(overlay);
    });

    minimizeButton.addEventListener('click', event => {
        event.stopPropagation();
        if (win.dataset.zoomed === 'true') {
            win.dataset.zoomed = 'false';
        }
        toggleMinimize(win);
    });

    zoomButton.addEventListener('click', event => {
        event.stopPropagation();
        toggleZoom(win);
    });

    continueButton.addEventListener('click', event => {
        event.stopPropagation();
        dismiss(overlay);
    });

    win.addEventListener('mousedown', () => {
        win.classList.add('is-active');
    });

    window.addEventListener(
        'resize',
        () => {
            if (win.dataset.zoomed === 'true') {
                const viewport = getViewportBounds();
                applyWindowBounds(win, {
                    left: EDGE_PADDING,
                    top: viewport.minTop,
                    width: viewport.maxWidth,
                    height: viewport.maxHeight,
                });
                return;
            }

            if (win.classList.contains('is-minimized')) {
                const rect = win.getBoundingClientRect();
                const position = clampWindowPosition(rect.left, rect.top, rect.width, rect.height);
                win.style.left = `${position.left}px`;
                win.style.top = `${position.top}px`;
                return;
            }

            fitWindowToContent(win);
        },
        { passive: true }
    );
}

/**
 * Erstellt den Overlay, hängt ihn ans DOM und startet die Einblend-Animation.
 * ASSUMPTION: Wird nur augerufen wenn document.body existiert.
 */
function showWelcomeDialog(force = false): void {
    if (!force && hasSeenWelcome()) {
        logger.debug('WELCOME', '[welcome-dialog] Already seen – skipping');
        return;
    }

    if (document.getElementById('welcome-dialog-overlay')) {
        return;
    }

    const overlay = buildOverlay();
    document.body.appendChild(overlay);
    attachWindowControls(overlay);
    const win = overlay.querySelector<HTMLElement>(`#${WINDOW_ID}`);
    if (win) {
        fitWindowToContent(win, { center: true });
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            const dialogWindow = overlay.querySelector<HTMLElement>(`#${WINDOW_ID}`);
            if (dialogWindow) {
                dialogWindow.style.transform = 'translateY(0) scale(1)';
                dialogWindow.style.opacity = '1';
                dialogWindow.classList.add('is-active');
            }
        });
    });

    logger.debug('WELCOME', '[welcome-dialog] Shown');
}

/**
 * Erzwingt die erneute Anzeige des Willkommensdialogs.
 * Wird vom Menüpunkt "Fenster zurücksetzen" genutzt.
 */
function resetWelcomeDialogAndShow(): void {
    resetWelcomeSeen();
    showWelcomeDialog(true);
}

const w = window as WelcomeDialogWindow;
w.showWelcomeDialog = () => showWelcomeDialog();
w.resetWelcomeDialogAndShow = resetWelcomeDialogAndShow;

// Initialisierung – auf DOM warten
if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        () => {
            showWelcomeDialog();
        },
        { once: true }
    );
} else {
    // DOM bereits bereit (z. B. bei defer/module-Scripts)
    showWelcomeDialog();
}

export {};
