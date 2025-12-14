/**
 * Shared helpers for ActionBus modules
 */

export type Params = Record<string, string | undefined>;
export type Handler = (params: Params, element: HTMLElement | null) => void;
export type ActionMap = Record<string, Handler>;

/**
 * Extract params from a dataset while ignoring ActionBus control keys.
 */
export function extractParams(dataset: DOMStringMap): Params {
    const params: Params = {};
    for (const key in dataset) {
        if (key === 'action' || key === 'actionHover') continue;
        params[key] = dataset[key];
    }
    return params;
}

/**
 * Safe wrapper to log errors without breaking execution flow.
 */
export function safeExecute(label: string, fn: () => void): void {
    try {
        fn();
    } catch (error) {
        console.warn(`${label} failed:`, error);
    }
}

/**
 * Resolve a nested window property via dot-notation.
 */
export function getGlobal<T = unknown>(path: string): T | undefined {
    const parts = path.split('.').filter(Boolean);
    let current: any = window;
    for (const p of parts) {
        if (current && typeof current === 'object' && p in current) {
            current = current[p];
        } else {
            return undefined;
        }
    }
    return current as T | undefined;
}
