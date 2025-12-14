'use strict';
/*
 * src/ts/compat/expose-globals.ts
 * Central adapter to expose modern TS modules on window for legacy consumers.
 * This file is used as the single esbuild entry to produce an IIFE bundle.
 */
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              var desc = Object.getOwnPropertyDescriptor(m, k);
              if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
                  desc = {
                      enumerable: true,
                      get: function () {
                          return m[k];
                      },
                  };
              }
              Object.defineProperty(o, k2, desc);
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, 'default', { enumerable: true, value: v });
          }
        : function (o, v) {
              o['default'] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    (function () {
        var ownKeys = function (o) {
            ownKeys =
                Object.getOwnPropertyNames ||
                function (o) {
                    var ar = [];
                    for (var k in o)
                        if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
                    return ar;
                };
            return ownKeys(o);
        };
        return function (mod) {
            if (mod && mod.__esModule) return mod;
            var result = {};
            if (mod != null)
                for (var k = ownKeys(mod), i = 0; i < k.length; i++)
                    if (k[i] !== 'default') __createBinding(result, mod, k[i]);
            __setModuleDefault(result, mod);
            return result;
        };
    })();
Object.defineProperty(exports, '__esModule', { value: true });
console.log('[BUNDLE] expose-globals.ts loading...');
// i18n must load FIRST - provides window.appI18n for all modules
require('../services/i18n');
// Import the modern module(s) we want to expose explicitly
const DOMUtils = __importStar(require('../ui/dom-utils'));
// Import core constants first (needed by storage, app-init, etc.)
require('../core/constants');
// Import core observability systems (error handling, performance monitoring)
require('../core/logger');
require('../core/error-handler');
require('../core/perf-monitor');
// Import legacy/global modules for their side effects so they register on window.*
require('../core/api');
require('../windows/window-manager');
require('../ui/action-bus');
require('../ui/dialog-utils');
require('../ui/snap-utils');
require('../services/program-actions');
require('../services/program-menu-sync');
require('../ui/menu');
require('../ui/dock');
require('../ui/dialog');
require('../ui/menubar-utils');
require('../ui/context-menu');
require('../services/storage');
require('../services/theme');
require('../windows/base-window-instance'); // Must come before instance types
require('../windows/instance-manager');
require('../windows/window-chrome');
// Multi-window system (Phase 1: Foundation)
require('../windows/base-tab'); // Base class for tab content
require('../windows/base-window'); // Base class for windows
require('../windows/window-registry'); // Central window management
// Multi-window system (Phase 2: Terminal)
require('../apps/terminal/terminal-session'); // Terminal session tab
const terminal_window_1 = require('../apps/terminal/terminal-window'); // Terminal window
// Multi-window system (Phase 3: TextEditor)
require('../apps/text-editor/text-editor-document'); // Text editor document tab
require('../apps/text-editor/text-editor-window'); // Text editor window
require('../apps/text-editor/text-editor-instance'); // Text editor instance manager
// Multi-window system (Phase 4: Finder)
// Import both side-effect and named to ensure symbols are retained and exposed
const finder_view_1 = require('../apps/finder/finder-view'); // Finder view tab
const finder_window_1 = require('../apps/finder/finder-window'); // Finder window
// Multi-window system (Phase 6: Session Management)
require('../services/multi-window-session'); // Multi-window session persistence
require('../services/session-manager'); // Auto-save system for instances - MUST come AFTER all instance managers
require('../windows/window-tabs');
require('../apps/terminal/terminal-instance');
require('../apps/text-editor/text-editor');
require('../services/settings');
require('../apps/photos/image-viewer-utils');
require('../core/logger');
require('../ui/keyboard-shortcuts');
require('../services/github-api');
// Include compiled Photos App JS into the bundle to expose window.PhotosApp
// Using the compiled JS avoids TS encoding issues and ensures identical runtime behavior
require('../apps/photos/photos-app');
// Window configurations (now in TypeScript)
require('../windows/window-configs'); // Must load before windows are registered
// Remaining legacy JS modules (to be ported)
require('../apps/finder/finder-instance');
require('../ui/launchpad');
require('../windows/multi-instance-integration');
require('../ui/desktop'); // Now in TypeScript
// Use modern TypeScript module instead of legacy JS
require('../services/system');
// Finally, include the TypeScript app initialization to bootstrap and signal readiness
// This sets window.__APP_READY = true when the app finishes loading. It must come
// AFTER all side-effect imports above so that globals like WindowManager/Dialog exist.
require('../core/app-init');
const w = window;
if (!('DOMUtils' in w)) {
    w['DOMUtils'] = DOMUtils;
}
// Ensure critical classes are attached on window and not eliminated by tree-shaking
try {
    if (!w.FinderView) w.FinderView = finder_view_1.FinderView;
    if (!w.FinderWindow) w.FinderWindow = finder_window_1.FinderWindow;
    if (!w.TerminalWindow) w.TerminalWindow = terminal_window_1.TerminalWindow;
} catch {
    /* ignore */
}
try {
    console.log('[BUNDLE] Globals present:', {
        FinderView: !!w.FinderView,
        FinderWindow: !!w.FinderWindow,
        TerminalWindow: !!w.TerminalWindow,
        WindowRegistry: !!w.WindowRegistry,
        ActionBus: !!w.ActionBus,
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
// Optional ready flag for tests
w.__BUNDLE_READY__ = true;
//# sourceMappingURL=expose-globals.js.map
