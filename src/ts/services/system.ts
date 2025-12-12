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

console.log('✅ SystemUI loaded');

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

    interface SystemUI {
        initSystemStatusControls(): void;
        updateAllSystemStatusUI(): void;
        handleSystemToggle(toggleKey: string): void;
        handleSystemAction(actionKey: string): void;
        handleSystemSliderInput(type: string, value: number): void;
        setConnectedNetwork(network: string, options?: DeviceOptions): void;
        setBluetoothDevice(deviceName: string, options?: DeviceOptions): void;
        setAudioDevice(deviceKey: string, options?: DeviceOptions): void;
        getSystemStatus(): SystemStatus;
    }

    // ===== Module Dependencies =====
    const appI18n: I18nSystem = window.appI18n || {
        translate: key => key,
        applyTranslations: () => {},
        getActiveLanguage: () => 'en',
    };

    const IconSystem = window.IconSystem || {};
    const SYSTEM_ICONS = IconSystem.SYSTEM_ICONS || {};
    const ensureSvgNamespace = IconSystem.ensureSvgNamespace || ((svg: string) => svg);
    const renderIconIntoElement = IconSystem.renderIconIntoElement || (() => {});

    const ThemeSystem = window.ThemeSystem || {};
    const setThemePreference = ThemeSystem.setThemePreference || (() => {});

    // Helper to hide all menu dropdowns
    const hideMenuDropdowns =
        window.hideMenuDropdowns ||
        (() => {
            document.querySelectorAll('.menu-dropdown').forEach(dropdown => {
                if (!dropdown.classList.contains('hidden')) {
                    dropdown.classList.add('hidden');
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

    // ===== UI Helper Functions =====

    function applySystemIcon(iconToken: string, iconKey: string): void {
        const svg = SYSTEM_ICONS[iconKey];
        const markup = svg ? ensureSvgNamespace(svg) : '';
        document.querySelectorAll(`[data-icon="${iconToken}"]`).forEach(el => {
            renderIconIntoElement(el as HTMLElement, markup, iconToken);
        });
    }

    function updateSystemStateText(stateKey: string, text: string | number | null | undefined): void {
        document.querySelectorAll(`[data-state="${stateKey}"]`).forEach(el => {
            el.textContent = text !== null && text !== undefined ? String(text) : '';
        });
    }

    function updateSystemToggleState(toggleKey: string, active: boolean): void {
        const toggle = document.querySelector(`[data-system-toggle="${toggleKey}"]`);
        if (toggle) {
            toggle.classList.toggle('is-active', !!active);
            toggle.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
    }

    function updateSystemMenuCheckbox(actionKey: string, checked: boolean): void {
        const checkbox = document.querySelector(`[data-system-action="${actionKey}"]`);
        if (checkbox) {
            checkbox.setAttribute('aria-pressed', checked ? 'true' : 'false');
            checkbox.classList.toggle('is-active', !!checked);
        }
    }

    function updateSystemSliderValue(type: string, value: number): void {
        document.querySelectorAll<HTMLInputElement>(`[data-system-slider="${type}"]`).forEach(slider => {
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
        updateSystemToggleState('wifi', systemStatus.wifi);
        updateSystemMenuCheckbox('toggle-wifi', systemStatus.wifi);
        document.querySelectorAll('#wifi-menu [data-network]').forEach(btn => {
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
        updateSystemToggleState('bluetooth', systemStatus.bluetooth);
        updateSystemMenuCheckbox('toggle-bluetooth', systemStatus.bluetooth);
        const devices = document.querySelectorAll('#bluetooth-menu [data-device]');
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
        document.querySelectorAll('#wifi-menu [data-network]').forEach(btn => {
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
                    indicator.textContent = indicator.getAttribute('data-default') || '';
                } else if (isActive) {
                    indicator.textContent = appI18n.translate('menubar.state.connected');
                } else {
                    indicator.textContent = indicator.getAttribute('data-default') || '';
                }
            }
        });
        if (!options.silent) {
            hideMenuDropdowns();
        }
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
        document.querySelectorAll('#bluetooth-menu [data-device]').forEach(btn => {
            const indicator = btn.querySelector('.system-network-indicator');
            if (indicator && !indicator.getAttribute('data-default')) {
                indicator.setAttribute('data-default', indicator.textContent || '');
            }
            const isActive = systemStatus.bluetooth && btn.getAttribute('data-device') === activeDevice;
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
    }

    // ===== Toggle and Action Handlers =====

    function handleSystemToggle(toggleKey: string): void {
        switch (toggleKey) {
            case 'wifi':
                systemStatus.wifi = !systemStatus.wifi;
                updateWifiUI();
                break;
            case 'bluetooth':
                systemStatus.bluetooth = !systemStatus.bluetooth;
                updateBluetoothUI();
                break;
            case 'focus':
                systemStatus.focus = !systemStatus.focus;
                updateFocusUI();
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
                    const dialogs = (window as Window & { dialogs?: Record<string, { open(): void }> }).dialogs;
                    if (dialogs?.['settings-modal']) {
                        dialogs['settings-modal'].open();
                    } else {
                        console.info(`Aktion "${actionKey}" würde Einstellungen öffnen.`);
                    }
                    hideMenuDropdowns();
                }
                break;
            case 'open-spotlight':
            case 'open-siri':
                console.info(`Aktion "${actionKey}" ausgelöst.`);
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
        document.querySelectorAll('.system-network-indicator').forEach(indicator => {
            indicator.setAttribute('data-default', indicator.textContent || '');
        });

        document.querySelectorAll('[data-system-menu-trigger]').forEach(trigger => {
            // bindDropdownTrigger is expected in app.js or global scope
            const bindFunc = (window as Window & { bindDropdownTrigger?: (el: Element, opts: Record<string, unknown>) => void }).bindDropdownTrigger;
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
        getSystemStatus: () => Object.assign({}, systemStatus),
    };

    (window as unknown as Window & { SystemUI: SystemUI }).SystemUI = SystemUIInstance;
})();

export {};
