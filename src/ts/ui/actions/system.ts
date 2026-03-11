/**
 * System Control Center ActionBus handlers
 */
import type { ActionMap, Params } from './helpers.js';
import { getGlobal } from './helpers.js';
import logger from '../../core/logger.js';

interface SystemUIApi {
    handleSystemToggle?: (toggleKey: string) => void;
    handleSystemAction?: (actionKey: string) => void;
    setAudioDevice?: (deviceKey: string) => void;
    setConnectedNetwork?: (network: string) => void;
    setBluetoothDevice?: (deviceName: string) => void;
}

export function getSystemActions(): ActionMap {
    return {
        'system:toggle': (params: Params) => {
            const toggleKey = params.systemToggle;
            if (!toggleKey) {
                logger.warn('UI', '[ActionBus] system:toggle: missing data-system-toggle');
                return;
            }

            const systemUI = getGlobal<SystemUIApi>('SystemUI');
            if (typeof systemUI?.handleSystemToggle !== 'function') {
                logger.warn(
                    'UI',
                    '[ActionBus] system:toggle: SystemUI.handleSystemToggle unavailable'
                );
                return;
            }

            systemUI.handleSystemToggle(toggleKey);
        },

        'system:action': (params: Params) => {
            const actionKey = params.systemAction;
            if (!actionKey) {
                logger.warn('UI', '[ActionBus] system:action: missing data-system-action');
                return;
            }

            const systemUI = getGlobal<SystemUIApi>('SystemUI');
            if (typeof systemUI?.handleSystemAction !== 'function') {
                logger.warn(
                    'UI',
                    '[ActionBus] system:action: SystemUI.handleSystemAction unavailable'
                );
                return;
            }

            systemUI.handleSystemAction(actionKey);
        },

        'system:setAudioDevice': (params: Params) => {
            const deviceKey = params.audioDevice;
            if (!deviceKey) {
                logger.warn('UI', '[ActionBus] system:setAudioDevice: missing data-audio-device');
                return;
            }

            const systemUI = getGlobal<SystemUIApi>('SystemUI');
            if (typeof systemUI?.setAudioDevice !== 'function') {
                logger.warn(
                    'UI',
                    '[ActionBus] system:setAudioDevice: SystemUI.setAudioDevice unavailable'
                );
                return;
            }

            systemUI.setAudioDevice(deviceKey);
        },

        'system:setNetwork': (params: Params) => {
            const network = params.network;
            if (!network) {
                logger.warn('UI', '[ActionBus] system:setNetwork: missing data-network');
                return;
            }

            const systemUI = getGlobal<SystemUIApi>('SystemUI');
            if (typeof systemUI?.setConnectedNetwork !== 'function') {
                logger.warn(
                    'UI',
                    '[ActionBus] system:setNetwork: SystemUI.setConnectedNetwork unavailable'
                );
                return;
            }

            systemUI.setConnectedNetwork(network);
        },

        'system:setBluetoothDevice': (params: Params) => {
            const deviceName = params.device;
            if (!deviceName) {
                logger.warn('UI', '[ActionBus] system:setBluetoothDevice: missing data-device');
                return;
            }

            const systemUI = getGlobal<SystemUIApi>('SystemUI');
            if (typeof systemUI?.setBluetoothDevice !== 'function') {
                logger.warn(
                    'UI',
                    '[ActionBus] system:setBluetoothDevice: SystemUI.setBluetoothDevice unavailable'
                );
                return;
            }

            systemUI.setBluetoothDevice(deviceName);
        },
    };
}
