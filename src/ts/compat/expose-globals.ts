/*
 * src/ts/compat/expose-globals.ts
 * Central adapter to expose modern TS modules on window for legacy consumers.
 * This file is used as the single esbuild entry to produce an IIFE bundle.
 */

console.log('[BUNDLE] expose-globals.ts loading...');

// Import the modern module(s) we want to expose explicitly
import * as DOMUtils from '../dom-utils';

// Import core constants first (needed by storage, app-init, etc.)
import '../constants';

// Import legacy/global modules for their side effects so they register on window.*
import '../api';
import '../window-manager';
import '../action-bus';
import '../dialog-utils';
import '../snap-utils';
import '../program-actions';
import '../program-menu-sync';
import '../menu';
import '../dock';
import '../dialog';
import '../menubar-utils';
import '../context-menu';
import '../storage';
import '../session-manager'; // Auto-save system for instances
import '../theme';
import '../base-window-instance'; // Must come before instance types
import '../instance-manager';
import '../window-chrome';
import '../window-tabs';
import '../terminal-instance';
import '../text-editor-instance';
import '../text-editor';
import '../image-viewer-utils';
import '../logger';
import '../keyboard-shortcuts';
import '../github-api';
// Include compiled Photos App JS into the bundle to expose window.PhotosApp
// Using the compiled JS avoids TS encoding issues and ensures identical runtime behavior
import '../photos-app';

// Legacy JS modules (copied to src/ts/legacy/ for esbuild compatibility)
import '../legacy/window-configs.js'; // Must load before windows are registered
import '../legacy/finder-instance.js';
import '../legacy/launchpad.js';
import '../multi-instance-integration';
import '../legacy/desktop.js';
import '../legacy/system.js';

// Finally, include the TypeScript app initialization to bootstrap and signal readiness
// This sets window.__APP_READY = true when the app finishes loading. It must come
// AFTER all side-effect imports above so that globals like WindowManager/Dialog exist.
import '../app-init';

// Guarded attach for modern modules not yet on window
type WindowWithBundle = Window & { __BUNDLE_READY__?: boolean; initApp?: () => void } & Record<
        string,
        unknown
    >;
const w = window as unknown as WindowWithBundle;

if (!('DOMUtils' in w)) {
    w['DOMUtils'] = DOMUtils;
}

// Trigger app initialization manually since the IIFE in app-init.ts
// runs in module scope and may not execute due to esbuild bundling
if (typeof w.initApp === 'function') {
    console.log('[BUNDLE] Triggering initApp; readyState:', document.readyState);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', w.initApp);
    } else {
        w.initApp();
    }
} else {
    console.error('[BUNDLE] window.initApp is not defined; app initialization failed');
}

// Optional ready flag for tests
w.__BUNDLE_READY__ = true;

