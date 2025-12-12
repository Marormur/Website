/**
 * src/ts/app-ready.ts
 * Tiny helper to run code when the DOM is ready, without duplicating boilerplate.
 */

export function onAppReady(handler: () => void): void {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handler, { once: true });
    } else {
        // Queue microtask to keep behavior consistent with event timing
        Promise.resolve().then(handler);
    }
}
