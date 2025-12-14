/**
 * Session import/export actions
 */
import type { ActionMap } from './helpers.js';
import { getGlobal } from './helpers.js';

export function getSessionActions(): ActionMap {
    return {
        'session:export': () => {
            const W = getGlobal<{
                SessionManager?: { exportSession?: () => string | null };
                appI18n?: { translate?: (key: string) => string };
            }>('');
            const translate = W?.appI18n?.translate || ((k: string) => k);

            if (!W?.SessionManager?.exportSession) {
                console.error('SessionManager not available');
                return;
            }

            const json = W.SessionManager.exportSession();
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

            console.log('Session exported successfully');
        },

        'session:import': () => {
            const W = getGlobal<{
                SessionManager?: { importSession?: (json: string) => boolean };
                appI18n?: { translate?: (key: string) => string };
            }>('');
            const translate = W?.appI18n?.translate || ((k: string) => k);

            if (!W?.SessionManager?.importSession) {
                console.error('SessionManager not available');
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

                    const success = W.SessionManager?.importSession?.(json);
                    if (success) {
                        console.log('Session imported successfully');
                    } else {
                        alert(translate('menu.session.importError'));
                    }
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
