/**
 * Compatibility shim factory for legacy InstanceManager APIs.
 * Bridges old window.*InstanceManager callers to new multi-window/tab architecture.
 */

export type ShimOptions = {
    legacyName:
        | 'FinderInstanceManager'
        | 'TerminalInstanceManager'
        | 'TextEditorInstanceManager'
        | string;
    registryType: string;
    createInstance: (opts?: {
        title?: string;
    }) => { instanceId: string; type: string; title?: string } | null;
    getInstanceCount: () => number;
    getAllInstances: () => Array<{
        instanceId: string;
        type: string;
        title?: string;
        show?: () => void;
        hide?: () => void;
    }>;
    getActiveInstance: () => { instanceId: string; type: string; title?: string } | null;
    setActiveInstance: (id: string) => void;
};

export function installShim(opts: ShimOptions, win: any): void {
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
