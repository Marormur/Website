/**
 * Framework Initialization
 *
 * Initializes MacUI Framework components and makes them globally available.
 * This should be loaded after the core API is initialized.
 */

import { toast } from '../framework/feedback/toast-manager.js';
import * as MacUI from '../framework/index.js';
import logger from './logger.js';

// Initialize toast manager and make it available via API
const win = window as typeof window & {
    API?: {
        toast?: typeof toast;
        // Allow additional properties on API without over-constraining its shape
        [key: string]: unknown;
    };
};

if (win.API) {
    win.API.toast = toast;
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

logger.debug('APP', '[MacUI] Framework initialized');

export {};
