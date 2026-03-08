/**
 * @file src/ts/services/storage-migration.ts
 * One-time migration helpers to clean up obsolete localStorage entries.
 *
 * Run these early in app initialization (before session restore) so that
 * stale data from previous app versions never reaches the restore logic.
 *
 * TODO: Remove after 3 months post-v2.0 release, or once analytics/logs confirm
 *       no `finder-modal` entries remain in active user sessions.
 */

import { getJSON, setJSON } from './storage-utils.js';
import logger from '../core/logger.js';

/**
 * Modal IDs that were migrated to the multi-instance system.
 * Any references to these IDs remaining in localStorage are considered stale.
 */
const OBSOLETE_MODAL_IDS = new Set<string>(['finder-modal']);

/**
 * Cleans up obsolete localStorage entries left over from the multi-instance migration.
 *
 * Specifically removes stale `finder-modal` entries from:
 * - `openModals`   – the list of windows to restore on next load
 * - `modalPositions` – saved window geometry keyed by modal ID
 * - `window-session` – legacy session format (modalState sub-object)
 *
 * Should be called once, early in `app-init.ts`, before any session restore.
 *
 * @returns The number of obsolete entries removed.
 */
export function cleanupObsoleteStorage(): number {
    let cleaned = 0;

    // --- openModals (string[]) -------------------------------------------------
    try {
        const openModals = getJSON<string[]>('openModals', []);
        if (Array.isArray(openModals)) {
            const filtered = openModals.filter(id => !OBSOLETE_MODAL_IDS.has(id));
            if (filtered.length !== openModals.length) {
                setJSON('openModals', filtered);
                cleaned += openModals.length - filtered.length;
            }
        }
    } catch (err) {
        logger.warn('STORAGE', '[STORAGE-MIGRATION] Failed to clean openModals:', err);
    }

    // --- modalPositions (Record<string, ...>) ----------------------------------
    try {
        const positions = getJSON<Record<string, unknown>>('modalPositions', {});
        if (positions && typeof positions === 'object') {
            let changed = false;
            for (const id of OBSOLETE_MODAL_IDS) {
                if (Object.prototype.hasOwnProperty.call(positions, id)) {
                    delete positions[id];
                    cleaned++;
                    changed = true;
                }
            }
            if (changed) {
                setJSON('modalPositions', positions);
            }
        }
    } catch (err) {
        logger.warn('STORAGE', '[STORAGE-MIGRATION] Failed to clean modalPositions:', err);
    }

    // --- window-session (legacy format) ---------------------------------------
    try {
        const legacy = getJSON<Record<string, unknown> | null>('window-session', null);
        if (legacy && typeof legacy === 'object') {
            const modalState = legacy['modalState'] as Record<string, unknown> | undefined;
            if (modalState && typeof modalState === 'object') {
                let changed = false;
                for (const id of OBSOLETE_MODAL_IDS) {
                    if (Object.prototype.hasOwnProperty.call(modalState, id)) {
                        delete modalState[id];
                        cleaned++;
                        changed = true;
                    }
                }
                if (changed) {
                    setJSON('window-session', legacy);
                }
            }
        }
    } catch (err) {
        logger.warn('STORAGE', '[STORAGE-MIGRATION] Failed to clean window-session:', err);
    }

    if (cleaned > 0) {
        logger.warn('STORAGE', `[STORAGE-MIGRATION] Cleaned ${cleaned} obsolete storage entries`);
    }

    return cleaned;
}
