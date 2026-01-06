/**
 * Framework Initialization
 *
 * Initializes MacUI Framework components and makes them globally available.
 * This should be loaded after the core API is initialized.
 */

import { toast } from '../framework/feedback/toast-manager.js';
import * as MacUI from '../framework/index.js';

// Initialize toast manager and make it available via API
if (window.API) {
    (window.API as any).toast = toast;
}

// Make MacUI framework available globally
declare global {
    interface Window {
        MacUI: typeof MacUI;
        toast: typeof toast;
    }
}

window.MacUI = MacUI;
window.toast = toast;

console.log('[MacUI] Framework initialized');

export {};
