/*
 * src/ts/compat/expose-globals.ts
 * Central adapter to expose modern TS modules on window for legacy consumers.
 * This file is used as the single esbuild entry to produce an IIFE bundle.
 */

console.log('[BUNDLE] expose-globals.ts loading...');

// i18n must load FIRST - provides window.appI18n for all modules
import '../i18n';

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

// Multi-window system (Phase 1: Foundation)
import '../base-tab'; // Base class for tab content
import '../base-window'; // Base class for windows
import '../window-registry'; // Central window management

// Multi-window system (Phase 2: Terminal)
import '../terminal-session'; // Terminal session tab
import '../terminal-window'; // Terminal window

// Multi-window system (Phase 3: TextEditor)
import '../text-editor-document'; // Text editor document tab
import '../text-editor-window'; // Text editor window

// Multi-window system (Phase 4: Finder)
import '../finder-view'; // Finder view tab
import '../finder-window'; // Finder window

// Multi-window system (Phase 6: Session Management)
import '../multi-window-session'; // Multi-window session persistence

import '../window-tabs';
import '../terminal-instance';
import '../text-editor-instance';
import '../text-editor';
import '../settings';
import '../image-viewer-utils';
import '../logger';
import '../keyboard-shortcuts';
import '../github-api';
// Include compiled Photos App JS into the bundle to expose window.PhotosApp
// Using the compiled JS avoids TS encoding issues and ensures identical runtime behavior
import '../photos-app';

// Window configurations (now in TypeScript)
import '../window-configs'; // Must load before windows are registered
// Remaining legacy JS modules (to be ported)
import '../finder-instance';
import '../launchpad';
import '../multi-instance-integration';
import '../desktop'; // Now in TypeScript
// Use modern TypeScript module instead of legacy JS
import '../system';

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
