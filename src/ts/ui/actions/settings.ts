/**
 * Settings-related actions for the ActionBus
 */
import type { ActionMap, Params } from './helpers.js';

export function getSettingsActions(): ActionMap {
    return {
        'settings:showSection': (params: Params, element: HTMLElement | null) => {
            const section = params.section || element?.getAttribute('data-section');
            if (!section) {
                console.warn('[Settings Action] No section specified for settings:showSection');
                return;
            }

            const win = window as Window & {
                SettingsSystem?: {
                    showSection(section: string): void;
                };
            };

            if (win.SettingsSystem && typeof win.SettingsSystem.showSection === 'function') {
                win.SettingsSystem.showSection(section as 'general' | 'display' | 'language');
            } else {
                console.warn(
                    '[Settings Action] SettingsSystem not available or showSection method missing'
                );
            }
        },
    };
}
