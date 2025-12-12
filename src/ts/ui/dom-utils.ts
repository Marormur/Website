/**
 * DOM Utility Functions
 * Centralized helpers for common DOM manipulations
 *
 * @module dom-utils
 */

/**
 * Show an element by removing the 'hidden' class
 * @param element - The element to show (null-safe)
 */
export function show(element: HTMLElement | null): void {
    if (!element) return;
    element.classList.remove('hidden');
}

/**
 * Hide an element by adding the 'hidden' class
 * @param element - The element to hide (null-safe)
 */
export function hide(element: HTMLElement | null): void {
    if (!element) return;
    element.classList.add('hidden');
}

/**
 * Toggle element visibility
 * @param element - The element to toggle (null-safe)
 * @param visible - Optional boolean to force visible (true) or hidden (false)
 */
export function toggle(element: HTMLElement | null, visible?: boolean): void {
    if (!element) return;
    if (visible === undefined) {
        element.classList.toggle('hidden');
    } else {
        element.classList.toggle('hidden', !visible);
    }
}

/**
 * Check if an element is currently visible
 * @param element - The element to check (null-safe)
 * @returns true if element exists and does not have 'hidden' class
 */
export function isVisible(element: HTMLElement | null): boolean {
    if (!element) return false;
    return !element.classList.contains('hidden');
}

/**
 * Set element visibility explicitly
 * @param element - The element to update (null-safe)
 * @param visible - true to show, false to hide
 */
export function setVisibility(element: HTMLElement | null, visible: boolean): void {
    if (!element) return;
    element.classList.toggle('hidden', !visible);
}

/**
 * Show multiple elements at once
 * @param elements - Array of elements to show
 */
export function showAll(elements: (HTMLElement | null)[]): void {
    elements.forEach(show);
}

/**
 * Hide multiple elements at once
 * @param elements - Array of elements to hide
 */
export function hideAll(elements: (HTMLElement | null)[]): void {
    elements.forEach(hide);
}

/**
 * Get element by ID with type safety
 * @param id - Element ID
 * @returns The element or null if not found
 */
export function getById(id: string): HTMLElement | null {
    return document.getElementById(id);
}

/**
 * Query selector with type assertion
 * @param selector - CSS selector
 * @param parent - Optional parent element (defaults to document)
 * @returns The first matching element or null
 */
export function query<T extends HTMLElement = HTMLElement>(
    selector: string,
    parent: ParentNode = document
): T | null {
    return parent.querySelector<T>(selector);
}

/**
 * Query selector all with type assertion
 * @param selector - CSS selector
 * @param parent - Optional parent element (defaults to document)
 * @returns NodeList of matching elements
 */
export function queryAll<T extends HTMLElement = HTMLElement>(
    selector: string,
    parent: ParentNode = document
): NodeListOf<T> {
    return parent.querySelectorAll<T>(selector);
}

// Attach to window for compatibility with legacy code
if (typeof window !== 'undefined') {
    (window as Window & { DOMUtils?: typeof import('./dom-utils') }).DOMUtils = {
        show,
        hide,
        toggle,
        isVisible,
        setVisibility,
        showAll,
        hideAll,
        getById,
        query,
        queryAll,
    };
}

console.log('✅ DOMUtils loaded');

