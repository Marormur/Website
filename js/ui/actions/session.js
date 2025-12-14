'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getSessionActions = getSessionActions;
const helpers_js_1 = require('./helpers.js');
function getSessionActions() {
    return {
        'session:export': () => {
            const W = (0, helpers_js_1.getGlobal)('');
            const translate = W?.appI18n?.translate || (k => k);
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
            const W = (0, helpers_js_1.getGlobal)('');
            const translate = W?.appI18n?.translate || (k => k);
            if (!W?.SessionManager?.importSession) {
                console.error('SessionManager not available');
                return;
            }
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json,.json';
            input.onchange = e => {
                const file = e.target.files?.[0];
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
//# sourceMappingURL=session.js.map
