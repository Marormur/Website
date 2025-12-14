'use strict';
/**
 * Session Guard: centralized validation and clearing for legacy and multi-window sessions.
 * Keeps existing heuristics: too many windows/instances (>10) or too many per type (>3) → clear.
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.validateMultiWindowSession = validateMultiWindowSession;
exports.validateLegacySession = validateLegacySession;
exports.clearSessionKey = clearSessionKey;
const MULTI_KEY = 'multi-window-session';
const LEGACY_KEY = 'windowInstancesSession';
function validateMultiWindowSession(storage = localStorage) {
    const raw = storage.getItem(MULTI_KEY);
    if (!raw) return { parsed: null, shouldClear: false };
    try {
        const session = JSON.parse(raw);
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
function validateLegacySession(storage = localStorage) {
    const raw = storage.getItem(LEGACY_KEY);
    if (!raw) {
        console.log('[SESSION-GUARD] Legacy session exists? false');
        return { parsed: null, shouldClear: false };
    }
    try {
        const session = JSON.parse(raw);
        logFound('legacy', session?.instances?.length || 0, session?.instances);
        if (isCountTooHigh(session?.instances)) {
            warnTooMany('legacy');
            return { parsed: session, shouldClear: true, reason: 'too-many-instances' };
        }
        if (hasTypeOverflow(session?.instances)) {
            warnTypeOverflow('legacy');
            return { parsed: session, shouldClear: true, reason: 'type-overflow' };
        }
        return { parsed: session, shouldClear: false };
    } catch (err) {
        console.warn('[SESSION-GUARD] Legacy session invalid JSON:', err);
        return { parsed: null, shouldClear: true, reason: 'invalid-json' };
    }
}
function clearSessionKey(key, storage = localStorage) {
    try {
        storage.removeItem(key);
    } catch (err) {
        console.warn(`[SESSION-GUARD] Failed to clear ${key}:`, err);
    }
}
function isCountTooHigh(items) {
    if (!Array.isArray(items)) return false;
    return items.length > 10; // existing heuristic
}
function hasTypeOverflow(items) {
    if (!Array.isArray(items)) return false;
    const typeCount = new Map();
    for (const item of items) {
        const t = item?.type || '';
        if (!t) continue;
        const count = (typeCount.get(t) || 0) + 1;
        typeCount.set(t, count);
        if (count > 3) return true; // existing heuristic
    }
    return false;
}
function logFound(label, count, items) {
    const plural = label === 'legacy' ? 'instances' : 'windows';
    console.log(`[SESSION-GUARD] Found ${label} session:`, {
        [`${label}Count`]: count,
        items: items?.map(i => ({ type: i?.type, id: i?.id })) || [],
        label,
        plural,
    });
}
function warnTooMany(label) {
    const noun = label === 'legacy' ? 'instances' : 'windows';
    console.warn(`[SESSION-GUARD] ${label} session corrupted (too many ${noun})`);
}
function warnTypeOverflow(label) {
    const noun = label === 'legacy' ? 'instances' : 'windows';
    console.warn(`[SESSION-GUARD] ${label} session has too many ${noun} per type (>3)`);
}
//# sourceMappingURL=session-guard.js.map
