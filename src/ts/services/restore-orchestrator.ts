import {
    clearSessionKey,
    validateLegacySession,
    validateMultiWindowSession,
} from './session-guard';
import logger from '../core/logger.js';

type SessionManagerLike = {
    init?: () => void;
    restoreSession?: (options?: { includeModernAppTypes?: boolean }) => boolean;
};

type MultiWindowSessionManagerLike = {
    init?: () => void;
    restoreSession?: () => Promise<boolean>;
};

type RestoreWindow = Window & {
    SessionManager?: SessionManagerLike;
    MultiWindowSessionManager?: MultiWindowSessionManagerLike;
    __MULTI_WINDOW_SESSION_ACTIVE?: boolean;
    __SESSION_RESTORE_IN_PROGRESS?: boolean;
    __SESSION_RESTORE_DONE?: boolean;
};

/**
 * PURPOSE: Coordinates all startup restore paths from a single place.
 * WHY: Legacy and multi-window restores must be strictly sequenced to avoid
 * race conditions, duplicate windows, and stale focus/menu context.
 *
 * CONTEXT FOR AI AGENTS:
 * - This is the transitional boundary between modern multi-window restore and legacy restore.
 * - Keep modern app windows (terminal/text/finder/preview/photos) on the multi-window path only.
 * - Legacy restore is intentionally retained for compatibility and should be reduced over time.
 */
export async function runSessionRestoreOrchestration(win: RestoreWindow): Promise<void> {
    try {
        const multiCheck = validateMultiWindowSession();
        const legacyCheck = validateLegacySession();

        if (legacyCheck.shouldClear) {
            logger.warn('APP', '[RESTORE-ORCHESTRATOR] Clearing ONLY legacy session (corrupted)');
            clearSessionKey('windowInstancesSession');
        }

        if (multiCheck.shouldClear) {
            logger.warn('APP', '[RESTORE-ORCHESTRATOR] Clearing multi-window session (corrupted)');
            clearSessionKey('multi-window-session');
        }

        win.MultiWindowSessionManager?.init?.();
        logger.debug('APP', '[RESTORE-ORCHESTRATOR] MultiWindowSessionManager initialized');

        win.SessionManager?.init?.();

        // Let manager wiring settle before restore starts.
        await new Promise(resolve => setTimeout(resolve, 150));

        let hasActiveMultiWindowSession = false;

        if (win.MultiWindowSessionManager?.restoreSession) {
            try {
                hasActiveMultiWindowSession =
                    !!(await win.MultiWindowSessionManager.restoreSession());
                if (hasActiveMultiWindowSession) {
                    logger.debug('APP', '[RESTORE-ORCHESTRATOR] Multi-window session restored');
                }
            } catch (err) {
                logger.warn(
                    'APP',
                    '[RESTORE-ORCHESTRATOR] Multi-window session restore failed:',
                    err
                );
            }
        }

        win.__MULTI_WINDOW_SESSION_ACTIVE = hasActiveMultiWindowSession;

        if (hasActiveMultiWindowSession) {
            logger.debug(
                'APP',
                '[RESTORE-ORCHESTRATOR] Skipping legacy SessionManager.restoreSession (multi-window session active)'
            );
            return;
        }

        if (win.SessionManager?.restoreSession) {
            // Migration rule: app window instances (terminal/text/finder/preview/photos) restore via
            // MultiWindowSessionManager only. Legacy restore remains for legacy-only state.
            // TODO(legacy-restore-migration): Remove this fallback after legacy-only instance types are migrated.
            win.SessionManager.restoreSession({ includeModernAppTypes: false });
        }
    } finally {
        win.__SESSION_RESTORE_IN_PROGRESS = false;
        win.__SESSION_RESTORE_DONE = true;
    }
}
