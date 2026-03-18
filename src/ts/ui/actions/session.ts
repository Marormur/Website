/**
 * Session import/export actions
 */
import type { ActionMap } from './helpers.js';
import { getGlobal } from './helpers.js';
import logger from '../../core/logger.js';

export function getSessionActions(): ActionMap {
    return {
        'session:export': () => {
            const W = getGlobal<{
                SessionManager?: { exportSession?: () => string | null };
                MultiWindowSessionManager?: { exportSession?: () => string | null };
                appI18n?: { translate?: (key: string) => string };
            }>('');
            const translate = W?.appI18n?.translate || ((k: string) => k);

            const exportSession =
                W?.MultiWindowSessionManager?.exportSession || W?.SessionManager?.exportSession;

            if (!exportSession) {
                logger.error('UI', 'No session export API available');
                return;
            }

            const json = exportSession.call(
                W.MultiWindowSessionManager || W.SessionManager || undefined
            );
            if (!json) {
                alert(translate('menu.session.noSession'));
                return;
            }

            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            logger.debug('UI', 'Session exported successfully');
        },

        'session:import': () => {
            const W = getGlobal<{
                SessionManager?: { importSession?: (json: string) => boolean };
                MultiWindowSessionManager?: { importSession?: (json: string) => Promise<boolean> };
                appI18n?: { translate?: (key: string) => string };
            }>('');
            const translate = W?.appI18n?.translate || ((k: string) => k);

            const importSession =
                W?.MultiWindowSessionManager?.importSession || W?.SessionManager?.importSession;

            if (!importSession) {
                logger.error('UI', 'No session import API available');
                return;
            }

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json,.json';
            input.onchange = e => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = event => {
                    const json = event.target?.result;
                    if (typeof json !== 'string') {
                        alert(translate('menu.session.importError'));
                        return;
                    }

                    const importPromise = W?.MultiWindowSessionManager?.importSession
                        ? W.MultiWindowSessionManager.importSession(json)
                        : Promise.resolve(Boolean(W?.SessionManager?.importSession?.(json)));

                    importPromise
                        .then(success => {
                            if (success) {
                                logger.debug('UI', 'Session imported successfully');
                                return;
                            }
                            alert(translate('menu.session.importError'));
                        })
                        .catch(() => {
                            alert(translate('menu.session.importError'));
                        });
                };
                reader.onerror = () => {
                    alert(translate('menu.session.importError'));
                };
                reader.readAsText(file);
            };
            input.click();
        },
    };
}
