import logger from '../core/logger.js';
import { getJSON, setJSON } from './storage-utils.js';
/**
 * system.ts
 * System Status UI Module
 *
 * Manages:
 * - WiFi, Bluetooth, Focus, Dark Mode, Battery status
 * - Volume, Brightness sliders
 * - Audio device selection
 * - Network and Bluetooth device selection
 * - Icon updates and UI state synchronization
 */

logger.debug('APP', '✅ SystemUI loaded');

(() => {
    'use strict';

    // ===== Types =====

    interface I18nSystem {
        translate(key: string): string;
        applyTranslations(): void;
        getActiveLanguage(): string;
    }

    interface IconSystemType {
        SYSTEM_ICONS?: Record<string, string>;
        ensureSvgNamespace?(svg: string): string;
        renderIconIntoElement?(el: HTMLElement | null, markup: string, fallbackKey: string): void;
    }

    interface ThemeSystemType {
        setThemePreference?(mode: string): void;
    }

    interface SystemStatus {
        wifi: boolean;
        bluetooth: boolean;
        focus: boolean;
        darkMode: boolean;
        brightness: number;
        volume: number;
        audioDevice: string;
        network: string;
        battery: number;
        connectedBluetoothDevice: string;
    }

    interface DeviceOptions {
        silent?: boolean;
        syncAudio?: boolean;
    }

    interface WifiNetworkPreset {
        id: string;
        labelKey: string;
        labelFallback: string;
        statusKey: string;
        statusFallback: string;
    }

    interface SystemUI {
        initSystemStatusControls(): void;
        updateAllSystemStatusUI(): void;
        handleSystemToggle(toggleKey: string): void;
        handleSystemAction(actionKey: string): void;
        handleSystemSliderInput(type: string, value: number): void;
        setConnectedNetwork(network: string, options?: DeviceOptions): void;
        setBluetoothDevice(deviceName: string, options?: DeviceOptions): void;
        setAudioDevice(deviceKey: string, options?: DeviceOptions): void;
        renderWifiNetworks(): void;
        getPreferredWifiNetworks(): WifiNetworkPreset[];
        getSystemStatus(): SystemStatus;
    }

    type PersistedSystemStatus = Partial<
        Pick<
            SystemStatus,
            | 'wifi'
            | 'bluetooth'
            | 'focus'
            | 'darkMode'
            | 'brightness'
            | 'volume'
            | 'audioDevice'
            | 'network'
            | 'connectedBluetoothDevice'
        >
    >;

    // ===== Module Dependencies =====
    const appI18n: I18nSystem = window.appI18n || {
        translate: key => key,
        applyTranslations: () => {},
        getActiveLanguage: () => 'en',
    };

    function getIconSystem(): IconSystemType {
        return window.IconSystem || {};
    }

    const ThemeSystem = window.ThemeSystem || {};
    const setThemePreference = ThemeSystem.setThemePreference || (() => {});

    const APP_CONSTANTS =
        (window as unknown as { APP_CONSTANTS?: Record<string, unknown> }).APP_CONSTANTS || {};
    const SYSTEM_STATUS_STORAGE_KEY =
        (APP_CONSTANTS.SYSTEM_STATUS_STORAGE_KEY as string) || 'systemStatus';

    const SYSTEM_ICON_FALLBACK: Record<string, string> = {
        wifi: '📶',
        bluetooth: '🔵',
        focus: '🌙',
        appearance: '🌓',
        volume: '🔊',
        battery: '🔋',
        sun: '☀️',
        moon: '🌙',
    };

    const SYSTEM_ICON_FALLBACK_BY_KEY: Record<string, string> = {
        wifiOn: '📶',
        wifiOff: '📵',
        bluetoothOn: '🔵',
        bluetoothOff: '⚪',
        brightnessLow: '🌙',
        brightnessMedium: '🌤️',
        brightnessHigh: '☀️',
        appearanceLight: '🌗',
        appearanceDark: '🌓',
        volumeMute: '🔇',
        volumeLow: '🔈',
        volumeMedium: '🔉',
        volumeHigh: '🔊',
        batteryFull: '🔋',
        sun: '☀️',
        moon: '🌙',
    };

    const preferredWifiNetworks: WifiNetworkPreset[] = [
        {
            id: 'HomeLAN',
            labelKey: 'menubar.networks.home',
            labelFallback: 'HomeLAN',
            // Use 'automatic' as default status — 'Verbunden' is only shown
            // when this network is actually active (set by setConnectedNetwork).
            statusKey: 'menubar.state.automatic',
            statusFallback: 'Automatisch',
        },
        {
            id: 'Office',
            labelKey: 'menubar.networks.office',
            labelFallback: 'Office',
            statusKey: 'menubar.state.automatic',
            statusFallback: 'Automatisch',
        },
        {
            id: 'Hotspot',
            labelKey: 'menubar.networks.hotspot',
            labelFallback: 'Marvin iPhone',
            statusKey: 'menubar.state.hotspot',
            statusFallback: 'Persönlicher Hotspot',
        },
    ];

    // Helper to hide all menu dropdowns
    const hideMenuDropdowns =
        window.hideMenuDropdowns ||
        (() => {
            const domUtils = window.DOMUtils;
            document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
                if (!dropdown.classList.contains('hidden')) {
                    if (domUtils && typeof domUtils.hide === 'function') {
                        domUtils.hide(dropdown as HTMLElement);
                    } else {
                        dropdown.classList.add('hidden');
                    }
                }
            });
            document.querySelectorAll('[data-menubar-trigger-button="true"]').forEach(button => {
                button.setAttribute('aria-expanded', 'false');
            });
            document.querySelectorAll('[data-system-menu-trigger]').forEach(button => {
                button.setAttribute('aria-expanded', 'false');
            });
        });

    // ===== System State =====
    const systemStatus: SystemStatus = {
        wifi: true,
        bluetooth: true,
        focus: false,
        darkMode: document.documentElement.classList.contains('dark'),
        brightness: 80,
        volume: 65,
        audioDevice: 'speakers',
        network: 'HomeLAN',
        battery: 100,
        connectedBluetoothDevice: 'AirPods',
    };

    function clampPercent(value: number, fallback: number): number {
        if (!Number.isFinite(value)) return fallback;
        return Math.max(0, Math.min(100, Math.round(value)));
    }

    function persistSystemStatus(): void {
        const payload: PersistedSystemStatus = {
            wifi: systemStatus.wifi,
            bluetooth: systemStatus.bluetooth,
            focus: systemStatus.focus,
            darkMode: systemStatus.darkMode,
            brightness: systemStatus.brightness,
            volume: systemStatus.volume,
            audioDevice: systemStatus.audioDevice,
            network: systemStatus.network,
            connectedBluetoothDevice: systemStatus.connectedBluetoothDevice,
        };
        setJSON(SYSTEM_STATUS_STORAGE_KEY, payload);
    }

    function restoreSystemStatus(): void {
        const saved = getJSON<PersistedSystemStatus>(SYSTEM_STATUS_STORAGE_KEY, {});

        if (typeof saved.wifi === 'boolean') {
            systemStatus.wifi = saved.wifi;
        }
        if (typeof saved.bluetooth === 'boolean') {
            systemStatus.bluetooth = saved.bluetooth;
        }
        if (typeof saved.focus === 'boolean') {
            systemStatus.focus = saved.focus;
        }
        if (typeof saved.brightness === 'number') {
            systemStatus.brightness = clampPercent(saved.brightness, systemStatus.brightness);
        }
        if (typeof saved.volume === 'number') {
            systemStatus.volume = clampPercent(saved.volume, systemStatus.volume);
        }
        if (typeof saved.audioDevice === 'string' && saved.audioDevice.trim()) {
            systemStatus.audioDevice = saved.audioDevice;
        }
        if (typeof saved.network === 'string' && saved.network.trim()) {
            systemStatus.network = saved.network;
        }
        if (
            typeof saved.connectedBluetoothDevice === 'string' &&
            saved.connectedBluetoothDevice.trim()
        ) {
            systemStatus.connectedBluetoothDevice = saved.connectedBluetoothDevice;
        }

        if (typeof saved.darkMode === 'boolean') {
            if (typeof setThemePreference === 'function') {
                setThemePreference(saved.darkMode ? 'dark' : 'light');
            } else {
                document.documentElement.classList.toggle('dark', saved.darkMode);
            }
        }

        systemStatus.darkMode = document.documentElement.classList.contains('dark');
    }

    // ===== UI Helper Functions =====

    function applySystemIcon(iconToken: string, iconKey: string): void {
        const iconSystem = getIconSystem();
        const svg = iconSystem.SYSTEM_ICONS?.[iconKey] || '';
        const ensureSvgNamespace = iconSystem.ensureSvgNamespace || ((value: string) => value);
        const renderIconIntoElement = iconSystem.renderIconIntoElement;
        const markup = svg ? ensureSvgNamespace(svg) : '';
        document.querySelectorAll(`[data-icon="${iconToken}"]`).forEach(el => {
            if (typeof renderIconIntoElement === 'function') {
                renderIconIntoElement(el as HTMLElement, markup, iconToken);
                return;
            }

            // Keep system controls functional even when IconSystem is not available.
            (el as HTMLElement).textContent =
                SYSTEM_ICON_FALLBACK_BY_KEY[iconKey] || SYSTEM_ICON_FALLBACK[iconToken] || '';
        });
    }

    function updateSystemStateText(
        stateKey: string,
        text: string | number | null | undefined
    ): void {
        document.querySelectorAll(`[data-state="${stateKey}"]`).forEach(el => {
            el.textContent = text !== null && text !== undefined ? String(text) : '';
        });
    }

    function updateSystemToggleState(toggleKey: string, active: boolean): void {
        document.querySelectorAll(`[data-system-toggle="${toggleKey}"]`).forEach(toggle => {
            toggle.classList.toggle('is-active', !!active);
            toggle.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }

    function updateSystemMenuCheckbox(actionKey: string, checked: boolean): void {
        document.querySelectorAll(`[data-system-action="${actionKey}"]`).forEach(checkbox => {
            checkbox.setAttribute('aria-pressed', checked ? 'true' : 'false');
            checkbox.classList.toggle('is-active', !!checked);
        });
    }

    function updateSystemSwitchState(toggleKey: string, active: boolean): void {
        document.querySelectorAll(`[data-state-switch="${toggleKey}"]`).forEach(toggle => {
            toggle.classList.toggle('is-active', !!active);
            toggle.setAttribute('aria-hidden', 'true');
        });
    }

    function getPreferredWifiNetworks(): WifiNetworkPreset[] {
        return preferredWifiNetworks.map(network => ({ ...network }));
    }

    function renderWifiNetworks(): void {
        document
            .querySelectorAll<HTMLElement>('[data-network-list="wifi-preferred"]')
            .forEach(container => {
                const isSettingsContext =
                    container.getAttribute('data-network-context') === 'settings';
                const itemClasses = isSettingsContext
                    ? 'menu-item system-menu-item settings-wifi-network-item'
                    : 'menu-item system-menu-item';

                container.innerHTML = preferredWifiNetworks
                    .map(
                        network => `
                            <button
                                type="button"
                                class="${itemClasses}"
                                data-network="${network.id}"
                                data-action="system:setNetwork"
                                aria-pressed="false"
                            >
                                <span class="menu-item-label" data-i18n="${network.labelKey}">${network.labelFallback}</span>
                                <span
                                    class="system-network-indicator"
                                    data-default-i18n="${network.statusKey}"
                                    data-default="${network.statusFallback}"
                                >${network.statusFallback}</span>
                            </button>
                        `
                    )
                    .join('');
            });
    }

    function resolveNetworkIndicatorDefault(indicator: Element): string {
        const i18nKey = indicator.getAttribute('data-default-i18n');
        if (i18nKey) {
            return appI18n.translate(i18nKey);
        }
        return indicator.getAttribute('data-default') || '';
    }

    function updateSystemSliderValue(type: string, value: number): void {
        document
            .querySelectorAll<HTMLInputElement>(`[data-system-slider="${type}"]`)
            .forEach(slider => {
                if (Number(slider.value) !== value) {
                    slider.value = String(value);
                }
            });
        document.querySelectorAll(`[data-state="${type}"]`).forEach(label => {
            label.textContent = `${value}%`;
        });
    }

    // ===== Status Update Functions =====

    function updateWifiUI(): void {
        const iconKey = systemStatus.wifi ? 'wifiOn' : 'wifiOff';
        applySystemIcon('wifi', iconKey);
        updateSystemStateText(
            'wifi',
            appI18n.translate(systemStatus.wifi ? 'menubar.state.on' : 'menubar.state.off')
        );
        updateSystemStateText('network', systemStatus.network);
        updateSystemStateText(
            'wifi-connection-status',
            appI18n.translate(systemStatus.wifi ? 'menubar.state.connected' : 'menubar.state.off')
        );
        updateSystemSwitchState('wifi', systemStatus.wifi);
        updateSystemToggleState('wifi', systemStatus.wifi);
        updateSystemMenuCheckbox('toggle-wifi', systemStatus.wifi);
        document.querySelectorAll('[data-network]').forEach(btn => {
            const disabled = !systemStatus.wifi;
            if (disabled) {
                btn.setAttribute('aria-disabled', 'true');
            } else {
                btn.removeAttribute('aria-disabled');
            }
        });
        setConnectedNetwork(systemStatus.network, { silent: true });
    }

    function updateBluetoothUI(): void {
        const iconKey = systemStatus.bluetooth ? 'bluetoothOn' : 'bluetoothOff';
        applySystemIcon('bluetooth', iconKey);
        updateSystemStateText(
            'bluetooth',
            appI18n.translate(systemStatus.bluetooth ? 'menubar.state.on' : 'menubar.state.off')
        );
        updateSystemSwitchState('bluetooth', systemStatus.bluetooth);
        updateSystemToggleState('bluetooth', systemStatus.bluetooth);
        updateSystemMenuCheckbox('toggle-bluetooth', systemStatus.bluetooth);
        const devices = document.querySelectorAll('[data-device]');
        devices.forEach(btn => {
            const indicator = btn.querySelector('.system-network-indicator');
            if (indicator && !indicator.getAttribute('data-default')) {
                indicator.setAttribute('data-default', indicator.textContent || '');
            }
            const disabled = !systemStatus.bluetooth;
            if (disabled) {
                btn.setAttribute('aria-disabled', 'true');
            } else {
                btn.removeAttribute('aria-disabled');
            }
        });
        setBluetoothDevice(systemStatus.connectedBluetoothDevice, {
            silent: true,
            syncAudio: false,
        });
    }

    function updateFocusUI(): void {
        updateSystemToggleState('focus', systemStatus.focus);
        updateSystemStateText(
            'focus',
            appI18n.translate(systemStatus.focus ? 'menubar.state.active' : 'menubar.state.off')
        );
    }

    function updateDarkModeUI(): void {
        const isDark = systemStatus.darkMode;
        updateSystemToggleState('dark-mode', isDark);
        updateSystemStateText(
            'dark-mode',
            appI18n.translate(isDark ? 'menubar.state.active' : 'menubar.state.off')
        );
        applySystemIcon('appearance', isDark ? 'appearanceDark' : 'appearanceLight');
    }

    function updateVolumeUI(): void {
        const value = Math.max(0, Math.min(100, Number(systemStatus.volume) || 0));
        systemStatus.volume = value;
        let iconKey = 'volumeMute';
        if (value === 0) {
            iconKey = 'volumeMute';
        } else if (value <= 33) {
            iconKey = 'volumeLow';
        } else if (value <= 66) {
            iconKey = 'volumeMedium';
        } else {
            iconKey = 'volumeHigh';
        }
        applySystemIcon('volume', iconKey);
        updateSystemSliderValue('volume', value);
    }

    function updateBrightnessUI(): void {
        const value = Math.max(0, Math.min(100, Number(systemStatus.brightness) || 0));
        systemStatus.brightness = value;
        let iconKey = 'brightnessLow';
        if (value > 66) {
            iconKey = 'brightnessHigh';
        } else if (value > 33) {
            iconKey = 'brightnessMedium';
        }
        applySystemIcon('sun', iconKey);
        updateSystemSliderValue('brightness', value);
    }

    function updateBatteryUI(): void {
        applySystemIcon('battery', 'batteryFull');
        updateSystemStateText('battery', `${systemStatus.battery}%`);
    }

    function updateAudioDeviceUI(): void {
        const active = systemStatus.audioDevice;
        document.querySelectorAll('[data-audio-device]').forEach(btn => {
            const isActive = btn.getAttribute('data-audio-device') === active;
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            btn.classList.toggle('is-active', isActive);
        });
    }

    // ===== Device Selection Functions =====

    function setConnectedNetwork(network: string, options: DeviceOptions = {}): void {
        if (network) {
            systemStatus.network = network;
        }
        const activeNetwork = systemStatus.network;
        updateSystemStateText('network', activeNetwork);
        updateSystemStateText(
            'wifi-connection-status',
            appI18n.translate(systemStatus.wifi ? 'menubar.state.connected' : 'menubar.state.off')
        );
        document.querySelectorAll('[data-network]').forEach(btn => {
            const indicator = btn.querySelector('.system-network-indicator');
            if (indicator && !indicator.getAttribute('data-default')) {
                indicator.setAttribute('data-default', indicator.textContent || '');
            }
            const isActive =
                !btn.hasAttribute('aria-disabled') &&
                btn.getAttribute('data-network') === activeNetwork &&
                systemStatus.wifi;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            if (indicator) {
                if (!systemStatus.wifi) {
                    indicator.textContent = resolveNetworkIndicatorDefault(indicator);
                } else if (isActive) {
                    indicator.textContent = appI18n.translate('menubar.state.connected');
                } else {
                    indicator.textContent = resolveNetworkIndicatorDefault(indicator);
                }
            }
        });
        if (!options.silent) {
            hideMenuDropdowns();
        }
        persistSystemStatus();
    }

    function setBluetoothDevice(deviceName: string, options: DeviceOptions = {}): void {
        const syncAudio = options.syncAudio !== false;
        if (deviceName) {
            systemStatus.connectedBluetoothDevice = deviceName;
            if (syncAudio && deviceName === 'AirPods') {
                systemStatus.audioDevice = 'airpods';
            }
        }
        const activeDevice = systemStatus.connectedBluetoothDevice;
        document.querySelectorAll('[data-device]').forEach(btn => {
            const indicator = btn.querySelector('.system-network-indicator');
            if (indicator && !indicator.getAttribute('data-default')) {
                indicator.setAttribute('data-default', indicator.textContent || '');
            }
            const isActive =
                systemStatus.bluetooth && btn.getAttribute('data-device') === activeDevice;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            if (indicator) {
                if (!systemStatus.bluetooth) {
                    indicator.textContent = indicator.getAttribute('data-default') || '';
                } else if (isActive) {
                    indicator.textContent = appI18n.translate('menubar.state.connected');
                } else {
                    indicator.textContent = indicator.getAttribute('data-default') || '';
                }
            }
        });
        updateAudioDeviceUI();
        if (!options.silent) {
            hideMenuDropdowns();
        }
        persistSystemStatus();
    }

    function setAudioDevice(deviceKey: string, options: DeviceOptions = {}): void {
        if (!deviceKey) return;
        systemStatus.audioDevice = deviceKey;
        if (deviceKey === 'airpods') {
            systemStatus.connectedBluetoothDevice = 'AirPods';
        }
        updateAudioDeviceUI();
        updateBluetoothUI();
        if (!options.silent) {
            hideMenuDropdowns();
        }
        persistSystemStatus();
    }

    // ===== Toggle and Action Handlers =====

    function handleSystemToggle(toggleKey: string): void {
        switch (toggleKey) {
            case 'wifi':
                systemStatus.wifi = !systemStatus.wifi;
                updateWifiUI();
                persistSystemStatus();
                break;
            case 'bluetooth':
                systemStatus.bluetooth = !systemStatus.bluetooth;
                updateBluetoothUI();
                persistSystemStatus();
                break;
            case 'focus':
                systemStatus.focus = !systemStatus.focus;
                updateFocusUI();
                persistSystemStatus();
                break;
            case 'dark-mode': {
                const next = !document.documentElement.classList.contains('dark');
                systemStatus.darkMode = next;
                if (typeof setThemePreference === 'function') {
                    setThemePreference(next ? 'dark' : 'light');
                } else {
                    document.documentElement.classList.toggle('dark', next);
                }
                updateDarkModeUI();
                persistSystemStatus();
                break;
            }
            default:
                break;
        }
    }

    function handleSystemAction(actionKey: string): void {
        switch (actionKey) {
            case 'toggle-wifi':
                handleSystemToggle('wifi');
                break;
            case 'toggle-bluetooth':
                handleSystemToggle('bluetooth');
                break;
            case 'open-network':
            case 'open-bluetooth':
            case 'open-sound':
                {
                    const dialogs = (
                        window as Window & { dialogs?: Record<string, { open(): void }> }
                    ).dialogs;
                    if (dialogs?.['settings-modal']) {
                        dialogs['settings-modal'].open();
                        if (actionKey === 'open-network' || actionKey === 'open-bluetooth') {
                            requestAnimationFrame(() => {
                                const settingsSystem = (
                                    window as Window & {
                                        SettingsSystem?: { showSection(section: string): void };
                                    }
                                ).SettingsSystem;
                                settingsSystem?.showSection?.(
                                    actionKey === 'open-network' ? 'wifi' : 'bluetooth'
                                );
                            });
                        }
                    } else {
                        logger.info('APP', `Aktion "${actionKey}" würde Einstellungen öffnen.`);
                    }
                    hideMenuDropdowns();
                }
                break;
            case 'open-spotlight':
            case 'open-siri':
                logger.info('APP', `Aktion "${actionKey}" ausgelöst.`);
                hideMenuDropdowns();
                break;
            default:
                break;
        }
    }

    function handleSystemSliderInput(type: string, value: number): void {
        if (!Number.isFinite(value)) return;
        if (type === 'volume') {
            systemStatus.volume = value;
            updateVolumeUI();
        } else if (type === 'brightness') {
            systemStatus.brightness = value;
            updateBrightnessUI();
        }
        persistSystemStatus();
    }

    // ===== Main Update Function =====

    function updateAllSystemStatusUI(): void {
        applySystemIcon('sun', 'sun');
        applySystemIcon('moon', 'moon');
        updateWifiUI();
        updateBluetoothUI();
        updateFocusUI();
        updateDarkModeUI();
        updateVolumeUI();
        updateBrightnessUI();
        updateBatteryUI();
        updateAudioDeviceUI();
    }

    // ===== Initialization =====

    function initSystemStatusControls(): void {
        restoreSystemStatus();

        renderWifiNetworks();

        document.querySelectorAll('.system-network-indicator').forEach(indicator => {
            indicator.setAttribute('data-default', indicator.textContent || '');
        });

        document.querySelectorAll('[data-system-menu-trigger]').forEach(trigger => {
            // bindDropdownTrigger is expected in app.js or global scope
            const bindFunc = (
                window as Window & {
                    bindDropdownTrigger?: (el: Element, opts: Record<string, unknown>) => void;
                }
            ).bindDropdownTrigger;
            if (typeof bindFunc === 'function') {
                bindFunc(trigger, {
                    hoverRequiresOpen: true,
                });
            }
        });

        // Route toggles through ActionBus
        document.querySelectorAll('[data-system-toggle]').forEach(toggle => {
            toggle.setAttribute('data-action', 'system:toggle');
            // ActionBus will stop propagation and execute
        });

        document.querySelectorAll('[data-system-slider]').forEach(slider => {
            ['pointerdown', 'mousedown', 'touchstart'].forEach(evt => {
                slider.addEventListener(evt, (e: Event) => e.stopPropagation());
            });
            slider.addEventListener('input', (event: Event) => {
                event.stopPropagation();
                const target = event.target as HTMLInputElement;
                const value = Number(target.value);
                const type = target.getAttribute('data-system-slider');
                if (type) {
                    handleSystemSliderInput(type, value);
                }
            });
        });

        document.querySelectorAll('[data-system-action]').forEach(btn => {
            btn.setAttribute('data-action', 'system:action');
        });

        document.querySelectorAll('[data-audio-device]').forEach(btn => {
            btn.setAttribute('data-action', 'system:setAudioDevice');
        });

        document.querySelectorAll('[data-network]').forEach(btn => {
            btn.setAttribute('data-action', 'system:setNetwork');
        });

        document.querySelectorAll('[data-device]').forEach(btn => {
            btn.setAttribute('data-action', 'system:setBluetoothDevice');
        });

        updateAllSystemStatusUI();
    }

    // ===== Public API =====

    const SystemUIInstance: SystemUI = {
        initSystemStatusControls,
        updateAllSystemStatusUI,
        handleSystemToggle,
        handleSystemAction,
        handleSystemSliderInput,
        setConnectedNetwork,
        setBluetoothDevice,
        setAudioDevice,
        renderWifiNetworks,
        getPreferredWifiNetworks,
        getSystemStatus: () => Object.assign({}, systemStatus),
    };

    (window as unknown as Window & { SystemUI: SystemUI }).SystemUI = SystemUIInstance;
})();

export {};
