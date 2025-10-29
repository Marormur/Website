"use strict";
/**
 * src/ts/app-ready.ts
 * Tiny helper to run code when the DOM is ready, without duplicating boilerplate.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAppReady = onAppReady;
function onAppReady(handler) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handler, { once: true });
    }
    else {
        // Queue microtask to keep behavior consistent with event timing
        Promise.resolve().then(handler);
    }
}
//# sourceMappingURL=app-ready.js.map