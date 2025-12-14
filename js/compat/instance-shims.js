'use strict';
/**
 * Compatibility shim factory for legacy InstanceManager APIs.
 * Bridges old window.*InstanceManager callers to new multi-window/tab architecture.
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.installShim = installShim;
function installShim(opts, win) {
    if (typeof win[opts.legacyName] !== 'undefined') return; // already exists
    try {
        win[opts.legacyName] = {
            createInstance: opts.createInstance,
            getInstanceCount: opts.getInstanceCount,
            getAllInstances: opts.getAllInstances,
            getActiveInstance: opts.getActiveInstance,
            setActiveInstance: opts.setActiveInstance,
        };
        console.info(`[COMPAT] ${opts.legacyName} shim installed`);
    } catch (err) {
        console.warn(`[COMPAT] ${opts.legacyName} shim failed:`, err);
    }
}
//# sourceMappingURL=instance-shims.js.map
