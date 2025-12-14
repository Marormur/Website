'use strict';
/**
 * Shared helpers for ActionBus modules
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.extractParams = extractParams;
exports.safeExecute = safeExecute;
exports.getGlobal = getGlobal;
/**
 * Extract params from a dataset while ignoring ActionBus control keys.
 */
function extractParams(dataset) {
    const params = {};
    for (const key in dataset) {
        if (key === 'action' || key === 'actionHover') continue;
        params[key] = dataset[key];
    }
    return params;
}
/**
 * Safe wrapper to log errors without breaking execution flow.
 */
function safeExecute(label, fn) {
    try {
        fn();
    } catch (error) {
        console.warn(`${label} failed:`, error);
    }
}
/**
 * Resolve a nested window property via dot-notation.
 */
function getGlobal(path) {
    const parts = path.split('.').filter(Boolean);
    let current = window;
    for (const p of parts) {
        if (current && typeof current === 'object' && p in current) {
            current = current[p];
        } else {
            return undefined;
        }
    }
    return current;
}
//# sourceMappingURL=helpers.js.map
