/*
 * src/ts/compat/expose-globals.ts
 * Central adapter to expose modern TS modules on window for legacy consumers.
 * This file is used as the single esbuild entry to produce an IIFE bundle.
 */

console.log('[BUNDLE] expose-globals.ts loading...');

// i18n must load FIRST - provides window.appI18n for all modules
import '../services/i18n';

// Import the modern module(s) we want to expose explicitly
import * as DOMUtils from '../ui/dom-utils';

// Import core constants first (needed by storage, app-init, etc.)
import '../core/constants';

// Import core observability systems (error handling, performance monitoring)
import '../core/logger';
import '../core/error-handler';
import '../core/perf-monitor';

// Import VDOM core
import '../core/vdom';

// Import legacy/global modules for their side effects so they register on window.*
import '../core/api';
import '../windows/window-manager';
import '../ui/action-bus';
import '../ui/dialog-utils';
import '../ui/snap-utils';
import '../services/program-actions';
import '../services/program-menu-sync';
import '../ui/menu';
import '../ui/dock';
import '../ui/dialog';
import '../ui/menubar-utils';
import '../ui/context-menu';
import '../services/storage';
import '../services/theme';
import '../windows/base-window-instance'; // Must come before instance types
import '../windows/instance-manager';
import '../windows/window-chrome';

// Multi-window system (Phase 1: Foundation)
import '../windows/base-tab'; // Base class for tab content
import '../windows/base-window'; // Base class for windows
import '../windows/window-registry'; // Central window management

// Multi-window system (Phase 2: Terminal)
import '../apps/terminal/terminal-session'; // Terminal session tab
import { TerminalWindow as __TerminalWindow__ } from '../apps/terminal/terminal-window'; // Terminal window

// Multi-window system (Phase 3: TextEditor)
import '../apps/text-editor/text-editor-document'; // Text editor document tab
import '../apps/text-editor/text-editor-window'; // Text editor window
import '../apps/text-editor/text-editor-instance'; // Text editor instance manager

// Multi-window system (Phase 4: Finder)
// Import both side-effect and named to ensure symbols are retained and exposed
import { FinderView as __FinderView__ } from '../apps/finder/finder-view'; // Finder view tab
import { FinderWindow as __FinderWindow__ } from '../apps/finder/finder-window'; // Finder window

// Multi-window system (Phase 6: Session Management)
import '../services/multi-window-session'; // Multi-window session persistence
import '../services/session-manager'; // Auto-save system for instances - MUST come AFTER all instance managers

import '../windows/window-tabs';
import '../apps/terminal/terminal-instance';
import '../apps/text-editor/text-editor';
import '../services/settings';
import '../apps/photos/image-viewer-utils';
import '../core/logger';
import '../ui/keyboard-shortcuts';
import '../services/github-api';
// Include compiled Photos App JS into the bundle to expose window.PhotosApp
// Using the compiled JS avoids TS encoding issues and ensures identical runtime behavior
import '../apps/photos/photos-app';

// Window configurations (now in TypeScript)
import '../windows/window-configs'; // Must load before windows are registered
// Remaining legacy JS modules (to be ported)
import '../apps/finder/finder-instance';
import '../ui/launchpad';
import '../windows/multi-instance-integration';
import '../ui/desktop'; // Now in TypeScript
// Use modern TypeScript module instead of legacy JS
import '../services/system';

// Set bundle-ready flag BEFORE importing app-init to prevent duplicate initialization
// This allows app-init.ts to skip its own auto-attach to DOMContentLoaded
type WindowWithBundle = Window & { __BUNDLE_READY__?: boolean; initApp?: () => void } & Record<
        string,
        unknown
    >;
const w = window as unknown as WindowWithBundle;
w.__BUNDLE_READY__ = true;

// Finally, include the TypeScript app initialization to bootstrap and signal readiness
// This sets window.__APP_READY = true when the app finishes loading. It must come
// AFTER all side-effect imports above so that globals like WindowManager/Dialog exist.
import '../core/app-init';

// Guarded attach for modern modules not yet on window
if (!('DOMUtils' in w)) {
    w['DOMUtils'] = DOMUtils;
}

// Ensure critical classes are attached on window and not eliminated by tree-shaking
try {
    if (!(w as any).FinderView) (w as any).FinderView = __FinderView__;
    if (!(w as any).FinderWindow) (w as any).FinderWindow = __FinderWindow__;
    if (!(w as any).TerminalWindow) (w as any).TerminalWindow = __TerminalWindow__;
} catch {
    /* ignore */
}

try {
    console.log('[BUNDLE] Globals present:', {
        FinderView: !!(w as any).FinderView,
        FinderWindow: !!(w as any).FinderWindow,
        TerminalWindow: !!(w as any).TerminalWindow,
        WindowRegistry: !!(w as any).WindowRegistry,
        ActionBus: !!(w as any).ActionBus,
    });
} catch {
    /* ignore */
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
