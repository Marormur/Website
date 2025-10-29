"use strict";
/*
 * src/ts/compat/expose-globals.ts
 * Central adapter to expose modern TS modules on window for legacy consumers.
 * This file is used as the single esbuild entry to produce an IIFE bundle.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
console.log('[BUNDLE] expose-globals.ts loading...');
// Import the modern module(s) we want to expose explicitly
const DOMUtils = __importStar(require("../dom-utils"));
// Import core constants first (needed by storage, app-init, etc.)
require("../constants");
// Import legacy/global modules for their side effects so they register on window.*
require("../api");
require("../window-manager");
require("../action-bus");
require("../dialog-utils");
require("../snap-utils");
require("../program-actions");
require("../program-menu-sync");
require("../menu");
require("../dock");
require("../dialog");
require("../menubar-utils");
require("../context-menu");
require("../storage");
require("../theme");
require("../base-window-instance"); // Must come before instance types
require("../instance-manager");
require("../window-chrome");
require("../window-tabs");
require("../terminal-instance");
require("../text-editor-instance");
require("../text-editor");
require("../image-viewer-utils");
require("../logger");
require("../keyboard-shortcuts");
require("../github-api");
// Include compiled Photos App JS into the bundle to expose window.PhotosApp
// Using the compiled JS avoids TS encoding issues and ensures identical runtime behavior
require("../photos-app");
// Legacy JS modules (copied to src/ts/legacy/ for esbuild compatibility)
require("../legacy/window-configs.js"); // Must load before windows are registered
require("../legacy/finder-instance.js");
require("../legacy/launchpad.js");
require("../multi-instance-integration");
require("../legacy/desktop.js");
require("../legacy/system.js");
// Finally, include the TypeScript app initialization to bootstrap and signal readiness
// This sets window.__APP_READY = true when the app finishes loading. It must come
// AFTER all side-effect imports above so that globals like WindowManager/Dialog exist.
require("../app-init");
const w = window;
if (!('DOMUtils' in w)) {
    w['DOMUtils'] = DOMUtils;
}
// Trigger app initialization manually since the IIFE in app-init.ts
// runs in module scope and may not execute due to esbuild bundling
if (typeof w.initApp === 'function') {
    console.log('[BUNDLE] Triggering initApp; readyState:', document.readyState);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', w.initApp);
    }
    else {
        w.initApp();
    }
}
else {
    console.error('[BUNDLE] window.initApp is not defined; app initialization failed');
}
// Optional ready flag for tests
w.__BUNDLE_READY__ = true;
//# sourceMappingURL=expose-globals.js.map