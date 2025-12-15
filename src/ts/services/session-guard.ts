/**
 * Session Guard: centralized validation and clearing for legacy and multi-window sessions.
 * Keeps existing heuristics: too many windows/instances (>10) or too many per type (>3) → clear.
 */

export type MultiWindowSession = { windows?: Array<{ type?: string; id?: string }> };
export type LegacySession = { instances?: Array<{ type?: string; id?: string }> };

type ValidationResult<T> = {
    parsed: T | null;
    shouldClear: boolean;
    reason?: string;
};

const MULTI_KEY = 'multi-window-session';
const LEGACY_KEY = 'windowInstancesSession';

export function validateMultiWindowSession(
    storage: Storage = localStorage
): ValidationResult<MultiWindowSession> {
    const raw = storage.getItem(MULTI_KEY);
    if (!raw) return { parsed: null, shouldClear: false };
    try {
        const session = JSON.parse(raw) as MultiWindowSession;
        logFound('multi-window', session?.windows?.length || 0, session?.windows);
        if (isCountTooHigh(session?.windows)) {
            warnTooMany('multi-window');
            return { parsed: session, shouldClear: true, reason: 'too-many-windows' };
        }
        if (hasTypeOverflow(session?.windows)) {
            warnTypeOverflow('multi-window');
            return { parsed: session, shouldClear: true, reason: 'type-overflow' };
        }
        return { parsed: session, shouldClear: false };
    } catch (err) {
        console.warn('[SESSION-GUARD] Multi-window session invalid JSON:', err);
        return { parsed: null, shouldClear: true, reason: 'invalid-json' };
    }
}

export function validateLegacySession(
    storage: Storage = localStorage
): ValidationResult<LegacySession> {
    const raw = storage.getItem(LEGACY_KEY);
    if (!raw) {
        console.log('[SESSION-GUARD] Legacy session exists? false');
        return { parsed: null, shouldClear: false };
    }
    try {
        const session = JSON.parse(raw) as LegacySession;

        // Legacy session has instances as Record<string, Array>
        // e.g., { instances: { terminal: [...], "text-editor": [...] } }
        const instances = session?.instances;

        // Convert instances object to flat array for validation
        let flatInstances: Array<{ type?: string; id?: string }> = [];
        if (instances && typeof instances === 'object') {
            // Check if instances is an array (old format) or object (new format)
            if (Array.isArray(instances)) {
                flatInstances = instances;
            } else {
                // New format: { terminal: [...], "text-editor": [...] }
                flatInstances = Object.entries(instances).flatMap(([type, items]) => {
                    if (!Array.isArray(items)) return [];
                    return items.map(item => ({
                        type: item?.type || type,
                        id: item?.instanceId || item?.id,
                    }));
                });
            }
        }

        logFound('legacy', flatInstances.length, flatInstances);

        if (isCountTooHigh(flatInstances)) {
            warnTooMany('legacy');
            return { parsed: session, shouldClear: true, reason: 'too-many-instances' };
        }
        if (hasTypeOverflow(flatInstances)) {
            warnTypeOverflow('legacy');
            return { parsed: session, shouldClear: true, reason: 'type-overflow' };
        }
        return { parsed: session, shouldClear: false };
    } catch (err) {
        console.warn('[SESSION-GUARD] Legacy session invalid JSON:', err);
        return { parsed: null, shouldClear: true, reason: 'invalid-json' };
    }
}

export function clearSessionKey(key: string, storage: Storage = localStorage): void {
    try {
        storage.removeItem(key);
    } catch (err) {
        console.warn(`[SESSION-GUARD] Failed to clear ${key}:`, err);
    }
}

function isCountTooHigh(items?: Array<unknown>): boolean {
    if (!Array.isArray(items)) return false;
    return items.length > 50; // Increased limit for performance testing (Issue #125)
}

function hasTypeOverflow(items?: Array<{ type?: string }>): boolean {
    if (!Array.isArray(items)) return false;
    const typeCount = new Map<string, number>();
    for (const item of items) {
        const t = (item?.type as string) || '';
        if (!t) continue;
        const count = (typeCount.get(t) || 0) + 1;
        typeCount.set(t, count);
        if (count > 20) return true; // Increased limit for performance testing (Issue #125)
    }
    return false;
}

function logFound(
    label: 'legacy' | 'multi-window',
    count: number,
    items?: Array<{ type?: string; id?: string }>
): void {
    const plural = label === 'legacy' ? 'instances' : 'windows';
    console.log(`[SESSION-GUARD] Found ${label} session:`, {
        [`${label}Count`]: count,
        items: items?.map(i => ({ type: i?.type, id: i?.id })) || [],
        label,
        plural,
    });
}

function warnTooMany(label: 'legacy' | 'multi-window'): void {
    const noun = label === 'legacy' ? 'instances' : 'windows';
    console.warn(`[SESSION-GUARD] ${label} session corrupted (too many ${noun})`);
}

function warnTypeOverflow(label: 'legacy' | 'multi-window'): void {
    const noun = label === 'legacy' ? 'instances' : 'windows';
    console.warn(`[SESSION-GUARD] ${label} session has too many ${noun} per type (>3)`);
}
