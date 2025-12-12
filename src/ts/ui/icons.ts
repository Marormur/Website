/**
 * icons.ts
 * Icon-Definitionen und SVG-Rendering-System für den macOS Desktop-Klon
 */

// ============================================================================
// System Icons (WiFi, Bluetooth, Appearance, etc.)
// ============================================================================
const SYSTEM_ICONS = {
    wifiOn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 18.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m0-3.75a4.75 4.75 0 0 1 3.35 1.37L12 19.22l-3.35-3.35A4.75 4.75 0 0 1 12 14.5m0-4.5a8.74 8.74 0 0 1 6.21 2.57L21.06 15l-1.77 1.77-1.63-1.63A6.24 6.24 0 0 0 12 12.5a6.24 6.24 0 0 0-4.66 2.64l-1.63 1.63L3.94 15l2.85-2.85A8.74 8.74 0 0 1 12 10z" fill="currentColor"/></svg>',
    wifiOff:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 18.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m0-3.75a4.75 4.75 0 0 1 3.35 1.37l-1.77 1.77-4.5-4.5A4.74 4.74 0 0 1 12 14.5m0-4.5a8.74 8.74 0 0 1 6.21 2.57l-1.77 1.77-10-10A12.78 12.78 0 0 1 12 6M4.27 3 3 4.27l4.2 4.2A8.64 8.64 0 0 0 3 12l1.77 1.77A10.72 10.72 0 0 1 12 10c1.2 0 2.37.2 3.46.58l1.7 1.7a8.62 8.62 0 0 0-1.39-.88l1.42 1.42a10.44 10.44 0 0 1 1.91 1.38l1.88-1.88z" fill="currentColor"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    bluetoothOn:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a1 1 0 0 1 .64.23l5 4.2a1 1 0 0 1-.05 1.58L14.28 12l3.31 3.99a1 1 0 0 1 .05 1.58l-5 4.2A1 1 0 0 1 11 21v-6.34L8.7 16.9l-1.4-1.4 3.7-3.5-3.7-3.5 1.4-1.4L11 9.34V3a1 1 0 0 1 1-1Zm1 4.85v3.28l1.82-1.64Zm1.82 9.94L13 13.38v3.77Z" fill="currentColor"/></svg>',
    bluetoothOff:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a1 1 0 0 1 .64.23l3.68 3.09-1.38 1.23-2.94-2.46V9.3L10.39 8l-1.1 1.1 3.71 3.52-1.08.98 1.08 1 1.11-1.01 1.44 1.36-2.37 2v-3.36l-2.26-2.15-2.78 2.64 1.4 1.4L11 14.66V21a1 1 0 0 1-1.64.77l-3.68-3.09 1.38-1.23 2.94 2.46v-3.5l-7-6.63L4.27 8 20 23.73 21.27 22 13 13.34l5-4.53a1 1 0 0 0-.05-1.58L12.64 2.23A1 1 0 0 0 12 2Z" fill="currentColor"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79Z" fill="currentColor"/></svg>',
    appearanceLight:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4a8 8 0 0 1 0 16" fill="currentColor" opacity="0.4"/></svg>',
    appearanceDark:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 20a8 8 0 0 0 0-16" fill="currentColor" opacity="0.75"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4a1 1 0 0 1-1-1V2h2v1a1 1 0 0 1-1 1Zm0 18a1 1 0 0 1-1-1v-1h2v1a1 1 0 0 1-1 1Zm8-9a1 1 0 0 1-1-1h1a1 1 0 0 1 1 1Zm-16 0a1 1 0 0 1-1-1h1a1 1 0 0 1-1 1Zm12.66 6.66-1.41-1.41 1.06-1.06 1.41 1.41ZM6.69 6.7 5.28 5.28 6.34 4.22 7.75 5.63ZM18.37 4.22l1.06 1.06-1.41 1.41-1.06-1.06ZM5.63 18.37l-1.41 1.41-1.06-1.06 1.41-1.41ZM12 7a5 5 0 1 1-5 5 5 5 0 0 1 5-5Z" fill="currentColor"/></svg>',
    volumeMute:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 9v6h4l5 5V4l-5 5H5z" fill="currentColor"/><path d="m16 9 5 5m0-5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    volumeLow:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 9v6h4l5 5V4l-5 5H5z" fill="currentColor"/><path d="M16.5 12a3 3 0 0 0-1.5-2.6v5.2a3 3 0 0 0 1.5-2.6Z" fill="currentColor"/></svg>',
    volumeMedium:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 9v6h4l5 5V4l-5 5H5z" fill="currentColor"/><path d="M16.5 12a3 3 0 0 0-1.5-2.6v5.2a3 3 0 0 0 1.5-2.6Z" fill="currentColor"/><path d="M19.5 12a5 5 0 0 0-2.5-4.33v8.66A5 5 0 0 0 19.5 12Z" fill="currentColor" opacity="0.7"/></svg>',
    volumeHigh:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 9v6h4l5 5V4l-5 5H5z" fill="currentColor"/><path d="M16.5 12a3 3 0 0 0-1.5-2.6v5.2a3 3 0 0 0 1.5-2.6Z" fill="currentColor"/><path d="M19.5 12a5 5 0 0 0-2.5-4.33v8.66A5 5 0 0 0 19.5 12Z" fill="currentColor" opacity="0.7"/><path d="M22 12a7 7 0 0 0-3.5-6.06v12.12A7 7 0 0 0 22 12Z" fill="currentColor" opacity="0.45"/></svg>',
    batteryFull:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17 7h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v1h-1v-1H8v1H7v-1H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1V6h1v1h8V6h1zM6 9v6h12V9z" fill="currentColor"/><rect x="7" y="10" width="10" height="4" rx="1" fill="currentColor"/></svg>',
} as const;

// ============================================================================
// Menu Icons (Finder, File operations, etc.)
// ============================================================================
const MENU_ICONS = {
    finder: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 4h8v6H4zm0 10h8v6H4zm10-10h6v6h-6zm0 10h6v6h-6z" fill="currentColor"/></svg>',
    reload: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-9.9 1H5a7 7 0 0 0 13.94 1A7 7 0 0 0 12 6z" fill="currentColor"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4L12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5z" fill="currentColor"/></svg>',
    settings:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6m0-7 2.25 2.5 3.22-.84.73 3.27 3.05 1.36-1.36 3.05 1.36 3.05-3.05 1.36-.73 3.27-3.22-.84L12 22l-2.25-2.5-3.22.84-.73-3.27-3.05-1.36L3.11 12 1.75 8.95l3.05-1.36.73-3.27 3.22.84Z" fill="currentColor"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 7h2V9h-2zm0 4h2v6h-2z" fill="currentColor"/><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Z" fill="currentColor"/></svg>',
    newFile:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm2 16H8v-2h8Zm0-4H8v-2h8Zm-3-6V3.5L18.5 8Z" fill="currentColor"/></svg>',
    open: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 19H8a2 2 0 0 1-2-2V5h7l2 2h6Z" fill="currentColor"/><path d="M5 9h16v9a2 2 0 0 1-2 2H9" fill="currentColor" opacity="0.4"/></svg>',
    save: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7Zm0 16H5v-6h12Zm0-8H5V5h10v4h2Z" fill="currentColor"/></svg>',
    undo: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5 9 8l3 3V9a5 5 0 0 1 5 5 5 5 0 0 1-4.77 4.99V21A7 7 0 0 0 19 14a7 7 0 0 0-7-7Z" fill="currentColor"/><path d="M9 8v3l3-3Z" fill="currentColor"/></svg>',
    redo: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 5 3 3-3 3V9a5 5 0 0 0-5 5 5 5 0 0 0 4.77 4.99V21A7 7 0 0 1 5 14a7 7 0 0 1 7-7Z" fill="currentColor"/><path d="M15 8v3l-3-3Z" fill="currentColor"/></svg>',
    cut: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 7.5 11.17 9 2 18.17 3.83 20 13 10.83 14.5 12.33l-5 5A3.5 3.5 0 1 0 12 19a3.49 3.49 0 0 0-.17-1.06l1.61-1.61L19 21h3l-8-8 4.35-4.35A3.49 3.49 0 0 0 20.5 9a3.5 3.5 0 1 0-3.5-3.5 3.49 3.49 0 0 0 .33 1.5L9 15.83 7.5 14.33l1.61-1.61A3.49 3.49 0 0 0 9 12a3.5 3.5 0 1 0-.33-6.5Z" fill="currentColor"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12Z" fill="currentColor"/><path d="M20 5H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h12Z" fill="currentColor"/></svg>',
    paste: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 4h-3.18A3 3 0 0 0 13 2h-2a3 3 0 0 0-2.82 2H5a2 2 0 0 0-2 2v1h18V6a2 2 0 0 0-2-2Zm-7-1h2a1 1 0 0 1 1 1h-4a1 1 0 0 1 1-1Z" fill="currentColor"/><path d="M4 9v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" fill="currentColor"/></svg>',
    selectAll:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 3H5v2h2V3Zm4 0H9v2h2V3Zm4 0h-2v2h2V3Zm4 0h-2v2h2V3ZM7 7H5v2h2V7Zm12 0h-2v2h2V7ZM7 11H5v2h2v-2Zm12 0h-2v2h2v-2ZM7 15H5v2h2v-2Zm12 0h-2v2h2v-2ZM7 19H5v2h2v-2Zm4 0H9v2h2v-2Zm4 0h-2v2h2v-2Zm4 0h-2v2h2v-2Z" fill="currentColor"/></svg>',
    wrap: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16v2H4Zm0 4h9v2H4Zm0 8h9v2H4Zm16-5h-5a3 3 0 0 0 0 6h3a1 1 0 0 0 0-2h-3a1 1 0 0 1 0-2h5Z" fill="currentColor"/></svg>',
    imageOpen:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5v14h14V5Zm12 12H7V7h10Z" fill="currentColor"/><path d="M9 13s1.5-2 3-2 3 2 3 2l2-3v6H7V9l2 4Z" fill="currentColor"/></svg>',
    download:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v10l3.5-3.5 1.5 1.5-6 6-6-6 1.5-1.5L11 13V3Z" fill="currentColor"/><path d="M5 18h14v2H5Z" fill="currentColor"/></svg>',
    window: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6H4Zm0 8v6a2 2 0 0 0 2 2h6v-8Z" fill="currentColor"/></svg>',
    help: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 18h2v-2h-2Zm1-16a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Zm0-14a4 4 0 0 1 4 4c0 3-4 3.25-4 5h-2c0-3 4-3.25 4-5a2 2 0 0 0-4 0H8a4 4 0 0 1 4-4Z" fill="currentColor"/></svg>',
    projects:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 4h8v6H4zm0 10h8v6H4zm10-10h6v6h-6zm0 10h6v6h-6z" fill="currentColor"/></svg>',
    appearance:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4a8 8 0 0 1 0 16" fill="currentColor" opacity="0.4"/></svg>',
    windowMinimize:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="2" rx="1" fill="currentColor"/></svg>',
    windowZoom:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5h6v2H7v4H5Zm8-2h6a2 2 0 0 1 2 2v6h-2V7h-4Zm8 16h-6v-2h4v-4h2Zm-8 2H5a2 2 0 0 1-2-2v-6h2v4h4Z" fill="currentColor"/></svg>',
    windowFront:
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h12v12H4Z" fill="currentColor" opacity="0.5"/><path d="M8 3h12v12H8Z" fill="currentColor"/></svg>',
} as const;

// ============================================================================
// Emoji Fallbacks (für Browser ohne SVG-Support)
// ============================================================================
const ICON_FALLBACK_EMOJI = {
    wifi: '📶',
    bluetooth: '🔵',
    focus: '🌙',
    'dark-mode': '🌓',
    sun: '☀️',
    moon: '🌙',
    appearance: '🎨',
    volume: '🔊',
    battery: '🔋',
    finder: '🗂️',
    reload: '🔄',
    close: '✖️',
    settings: '⚙️',
    info: 'ℹ️',
    newFile: '🆕',
    open: '📂',
    save: '💾',
    undo: '↩️',
    redo: '↪️',
    cut: '✂️',
    copy: '📄',
    paste: '📋',
    selectAll: '✅',
    wrap: '🧵',
    imageOpen: '🖼️',
    download: '⬇️',
    window: '🪟',
    windowMinimize: '➖',
    windowZoom: '🟢',
    windowFront: '⬆️',
    help: '❓',
    projects: '🧰',
} as const;

// ============================================================================
// SVG-Rendering-System
// ============================================================================
const svgParser = typeof DOMParser === 'function' ? new DOMParser() : null;

/**
 * Fügt xmlns-Attribut zu SVG hinzu, falls nicht vorhanden
 * @param svgMarkup - SVG-String
 * @returns SVG mit xmlns
 */
function ensureSvgNamespace(svgMarkup: string): string {
    if (typeof svgMarkup !== 'string' || !svgMarkup.length) {
        return '';
    }
    if (svgMarkup.includes('xmlns')) {
        return svgMarkup;
    }
    return svgMarkup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
}

/**
 * Holt SVG-Markup für ein Menu-Icon
 * @param iconKey - Schlüssel des Icons
 * @returns SVG-Markup mit xmlns
 */
function getMenuIconSvg(iconKey: string): string {
    if (!iconKey) return '';
    const svg = MENU_ICONS[iconKey as keyof typeof MENU_ICONS] || '';
    return ensureSvgNamespace(svg);
}

/**
 * Rendert ein SVG-Icon in ein DOM-Element
 * @param target - Ziel-Element
 * @param svgMarkup - SVG-String
 * @param fallbackKey - Schlüssel für Emoji-Fallback
 */
function renderIconIntoElement(
    target: HTMLElement | null,
    svgMarkup: string,
    fallbackKey?: string
): void {
    if (!target) return;

    // Clear existing content
    while (target.firstChild) {
        target.removeChild(target.firstChild);
    }

    // Try to parse and render SVG
    if (svgMarkup && svgParser) {
        try {
            const doc = svgParser.parseFromString(svgMarkup, 'image/svg+xml');
            const svgEl = doc?.documentElement;

            if (svgEl && svgEl.tagName && svgEl.tagName.toLowerCase() === 'svg') {
                const imported = target.ownerDocument.importNode(svgEl, true) as unknown as SVGSVGElement;

                // Set dimensions if not present
                if (!imported.getAttribute('width')) {
                    imported.setAttribute('width', target.dataset.iconSize || '16');
                }
                if (!imported.getAttribute('height')) {
                    imported.setAttribute('height', target.dataset.iconSize || '16');
                }

                // Accessibility
                imported.setAttribute('focusable', 'false');
                imported.setAttribute('aria-hidden', 'true');

                target.appendChild(imported);
                return;
            }
        } catch (err) {
            console.warn('SVG parsing failed; falling back to emoji.', err);
        }
    }

    // Fallback to emoji
    const fallback = fallbackKey
        ? ICON_FALLBACK_EMOJI[fallbackKey as keyof typeof ICON_FALLBACK_EMOJI]
        : undefined;
    if (fallback) {
        target.textContent = fallback;
    }
}

// ============================================================================
// Type Definitions
// ============================================================================
export type SystemIconKey = keyof typeof SYSTEM_ICONS;
export type MenuIconKey = keyof typeof MENU_ICONS;
export type FallbackEmojiKey = keyof typeof ICON_FALLBACK_EMOJI;

export interface IconSystem {
    SYSTEM_ICONS: typeof SYSTEM_ICONS;
    MENU_ICONS: typeof MENU_ICONS;
    ICON_FALLBACK_EMOJI: typeof ICON_FALLBACK_EMOJI;
    ensureSvgNamespace: typeof ensureSvgNamespace;
    getMenuIconSvg: typeof getMenuIconSvg;
    renderIconIntoElement: typeof renderIconIntoElement;
}

// ============================================================================
// Global Export
// ============================================================================
const IconSystemInstance: IconSystem = {
    SYSTEM_ICONS,
    MENU_ICONS,
    ICON_FALLBACK_EMOJI,
    ensureSvgNamespace,
    getMenuIconSvg,
    renderIconIntoElement,
};

if (typeof window !== 'undefined') {
    (window as typeof window & { IconSystem: IconSystem }).IconSystem = IconSystemInstance;
}

export default IconSystemInstance;
