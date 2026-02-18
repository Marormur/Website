/**
 * Shared helpers for ActionBus modules
 */

export type Params = Record<string, string | undefined>;
export type Handler = (params: Params, element: HTMLElement | null) => void;
export type ActionMap = Record<string, Handler>;

/**
 * Sanitize parameter key to prevent injection attacks.
 * Only allows lowercase letters, numbers, and hyphens.
 */
function sanitizeKey(key: string): string | null {
    // Only allow safe parameter names (lowercase letters, numbers, hyphens)
    if (!/^[a-z0-9-]+$/i.test(key)) {
        console.warn(`Potentially unsafe parameter key rejected: ${key}`);
        return null;
    }
    return key;
}

/**
 * Extract params from a dataset while ignoring ActionBus control keys.
 * Sanitizes parameter keys to prevent injection attacks.
 */
export function extractParams(dataset: DOMStringMap): Params {
    const params: Params = {};
    for (const key in dataset) {
        // Skip ActionBus control keys
        if (key === 'action' || key === 'actionHover' || key === 'actionDblclick') continue;

        // Sanitize key to prevent injection
        const sanitizedKey = sanitizeKey(key);
        if (sanitizedKey) {
            params[sanitizedKey] = dataset[key];
        }
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
