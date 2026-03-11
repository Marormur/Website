/**
 * Settings-related actions for the ActionBus
 */
import type { ActionMap, Params } from './helpers.js';
import logger from '../../core/logger.js';

export function getSettingsActions(): ActionMap {
    return {
        'settings:showSection': (params: Params, element: HTMLElement | null) => {
            const section = params.section || element?.getAttribute('data-section');
            if (!section) {
                logger.warn(
                    'UI',
                    '[Settings Action] No section specified for settings:showSection'
                );
                return;
            }

            const win = window as Window & {
                SettingsSystem?: {
                    showSection(section: string): void;
                };
            };

            if (win.SettingsSystem && typeof win.SettingsSystem.showSection === 'function') {
                win.SettingsSystem.showSection(section);
            } else {
                logger.warn(
                    'UI',
                    '[Settings Action] SettingsSystem not available or showSection method missing'
                );
            }
        },
    };
}
