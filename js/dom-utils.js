"use strict";
/**
 * DOM Utility Functions
 * Centralized helpers for common DOM manipulations
 *
 * @module dom-utils
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.show = show;
exports.hide = hide;
exports.toggle = toggle;
exports.isVisible = isVisible;
exports.setVisibility = setVisibility;
exports.showAll = showAll;
exports.hideAll = hideAll;
exports.getById = getById;
exports.query = query;
exports.queryAll = queryAll;
/**
 * Show an element by removing the 'hidden' class
 * @param element - The element to show (null-safe)
 */
function show(element) {
    if (!element)
        return;
    element.classList.remove('hidden');
}
/**
 * Hide an element by adding the 'hidden' class
 * @param element - The element to hide (null-safe)
 */
function hide(element) {
    if (!element)
        return;
    element.classList.add('hidden');
}
/**
 * Toggle element visibility
 * @param element - The element to toggle (null-safe)
 * @param visible - Optional boolean to force visible (true) or hidden (false)
 */
function toggle(element, visible) {
    if (!element)
        return;
    if (visible === undefined) {
        element.classList.toggle('hidden');
    }
    else {
        element.classList.toggle('hidden', !visible);
    }
}
/**
 * Check if an element is currently visible
 * @param element - The element to check (null-safe)
 * @returns true if element exists and does not have 'hidden' class
 */
function isVisible(element) {
    if (!element)
        return false;
    return !element.classList.contains('hidden');
}
/**
 * Set element visibility explicitly
 * @param element - The element to update (null-safe)
 * @param visible - true to show, false to hide
 */
function setVisibility(element, visible) {
    if (!element)
        return;
    element.classList.toggle('hidden', !visible);
}
/**
 * Show multiple elements at once
 * @param elements - Array of elements to show
 */
function showAll(elements) {
    elements.forEach(show);
}
/**
 * Hide multiple elements at once
 * @param elements - Array of elements to hide
 */
function hideAll(elements) {
    elements.forEach(hide);
}
/**
 * Get element by ID with type safety
 * @param id - Element ID
 * @returns The element or null if not found
 */
function getById(id) {
    return document.getElementById(id);
}
/**
 * Query selector with type assertion
 * @param selector - CSS selector
 * @param parent - Optional parent element (defaults to document)
 * @returns The first matching element or null
 */
function query(selector, parent = document) {
    return parent.querySelector(selector);
}
/**
 * Query selector all with type assertion
 * @param selector - CSS selector
 * @param parent - Optional parent element (defaults to document)
 * @returns NodeList of matching elements
 */
function queryAll(selector, parent = document) {
    return parent.querySelectorAll(selector);
}
// Attach to window for compatibility with legacy code
if (typeof window !== 'undefined') {
    window.DOMUtils = {
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
//# sourceMappingURL=dom-utils.js.map