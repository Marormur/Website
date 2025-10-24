// ============================================================================
// js/system.js — System Status UI Module
// ============================================================================
// Manages:
// - WiFi, Bluetooth, Focus, Dark Mode, Battery status
// - Volume, Brightness sliders
// - Audio device selection
// - Network and Bluetooth device selection
// - Icon updates and UI state synchronization
//
// Exports window.SystemUI with API:
// - initSystemStatusControls()
// - updateAllSystemStatusUI()
// - handleSystemToggle(toggleKey)
// - handleSystemAction(actionKey)
// - handleSystemSliderInput(type, value)
// - setConnectedNetwork(network, options)
// - setBluetoothDevice(deviceName, options)
// - setAudioDevice(deviceKey, options)
// - getSystemStatus() — returns current state object
// ============================================================================

(function () {
    'use strict';

    console.log('✅ SystemUI loaded');

    // ===== Module Dependencies =====
    const appI18n = window.appI18n || {
        translate: (key) => key,
        applyTranslations: () => { },
        getActiveLanguage: () => 'en'
    };

    const IconSystem = window.IconSystem || {};
    const SYSTEM_ICONS = IconSystem.SYSTEM_ICONS || {};
    const ensureSvgNamespace = IconSystem.ensureSvgNamespace || ((svg) => svg);
    const renderIconIntoElement = IconSystem.renderIconIntoElement || (() => { });

    const ThemeSystem = window.ThemeSystem || {};
    const setThemePreference = ThemeSystem.setThemePreference || (() => { });

    // Helper to hide all menu dropdowns (expected to be in app.js or global)
    const hideMenuDropdowns = window.hideMenuDropdowns || (() => {
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
    const systemStatus = {
        wifi: true,
        bluetooth: true,
        focus: false,
        darkMode: document.documentElement.classList.contains('dark'),
        brightness: 80,
        volume: 65,
        audioDevice: 'speakers',
        network: 'HomeLAN',
        battery: 100,
        connectedBluetoothDevice: 'AirPods'
    };

    // ===== UI Helper Functions =====

    function applySystemIcon(iconToken, iconKey) {
        const svg = SYSTEM_ICONS[iconKey];
        const markup = svg ? ensureSvgNamespace(svg) : '';
        document.querySelectorAll(`[data-icon="${iconToken}"]`).forEach(el => {
            renderIconIntoElement(el, markup, iconToken);
        });
    }

    function updateSystemStateText(stateKey, text) {
        document.querySelectorAll(`[data-state="${stateKey}"]`).forEach(el => {
            el.textContent = text != null ? String(text) : '';
        });
    }

    function updateSystemToggleState(toggleKey, active) {
        const toggle = document.querySelector(`[data-system-toggle="${toggleKey}"]`);
        if (toggle) {
            toggle.classList.toggle('is-active', !!active);
            toggle.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
    }

    function updateSystemMenuCheckbox(actionKey, checked) {
        const checkbox = document.querySelector(`[data-system-action="${actionKey}"]`);
        if (checkbox) {
            checkbox.setAttribute('aria-pressed', checked ? 'true' : 'false');
            checkbox.classList.toggle('is-active', !!checked);
        }
    }

    function updateSystemSliderValue(type, value) {
        document.querySelectorAll(`[data-system-slider="${type}"]`).forEach(slider => {
            if (Number(slider.value) !== value) {
                slider.value = value;
            }
        });
        document.querySelectorAll(`[data-state="${type}"]`).forEach(label => {
            label.textContent = `${value}%`;
        });
    }

    // ===== Status Update Functions =====

    function updateWifiUI() {
        const iconKey = systemStatus.wifi ? 'wifiOn' : 'wifiOff';
        applySystemIcon('wifi', iconKey);
        updateSystemStateText('wifi', appI18n.translate(systemStatus.wifi ? 'menubar.state.on' : 'menubar.state.off'));
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

    function updateBluetoothUI() {
        const iconKey = systemStatus.bluetooth ? 'bluetoothOn' : 'bluetoothOff';
        applySystemIcon('bluetooth', iconKey);
        updateSystemStateText('bluetooth', appI18n.translate(systemStatus.bluetooth ? 'menubar.state.on' : 'menubar.state.off'));
        updateSystemToggleState('bluetooth', systemStatus.bluetooth);
        updateSystemMenuCheckbox('toggle-bluetooth', systemStatus.bluetooth);
        const devices = document.querySelectorAll('#bluetooth-menu [data-device]');
        devices.forEach(btn => {
            const indicator = btn.querySelector('.system-network-indicator');
            if (indicator && !indicator.dataset.default) {
                indicator.dataset.default = indicator.textContent || '';
            }
            const disabled = !systemStatus.bluetooth;
            if (disabled) {
                btn.setAttribute('aria-disabled', 'true');
            } else {
                btn.removeAttribute('aria-disabled');
            }
        });
        setBluetoothDevice(systemStatus.connectedBluetoothDevice, { silent: true, syncAudio: false });
    }

    function updateFocusUI() {
        updateSystemToggleState('focus', systemStatus.focus);
        updateSystemStateText('focus', appI18n.translate(systemStatus.focus ? 'menubar.state.active' : 'menubar.state.off'));
    }

    function updateDarkModeUI() {
        const isDark = systemStatus.darkMode;
        updateSystemToggleState('dark-mode', isDark);
        updateSystemStateText('dark-mode', appI18n.translate(isDark ? 'menubar.state.active' : 'menubar.state.off'));
        applySystemIcon('appearance', isDark ? 'appearanceDark' : 'appearanceLight');
    }

    function updateVolumeUI() {
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

    function updateBrightnessUI() {
        const value = Math.max(0, Math.min(100, Number(systemStatus.brightness) || 0));
        systemStatus.brightness = value;
        updateSystemSliderValue('brightness', value);
    }

    function updateBatteryUI() {
        applySystemIcon('battery', 'batteryFull');
        updateSystemStateText('battery', `${systemStatus.battery}%`);
    }

    function updateAudioDeviceUI() {
        const active = systemStatus.audioDevice;
        document.querySelectorAll('[data-audio-device]').forEach(btn => {
            const isActive = btn.dataset.audioDevice === active;
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            btn.classList.toggle('is-active', isActive);
        });
    }

    // ===== Device Selection Functions =====

    function setConnectedNetwork(network, options = {}) {
        if (network) {
            systemStatus.network = network;
        }
        const activeNetwork = systemStatus.network;
        document.querySelectorAll('#wifi-menu [data-network]').forEach(btn => {
            const indicator = btn.querySelector('.system-network-indicator');
            if (indicator && !indicator.dataset.default) {
                indicator.dataset.default = indicator.textContent || '';
            }
            const isActive = !btn.hasAttribute('aria-disabled') && btn.dataset.network === activeNetwork && systemStatus.wifi;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            if (indicator) {
                if (!systemStatus.wifi) {
                    indicator.textContent = indicator.dataset.default || '';
                } else if (isActive) {
                    indicator.textContent = appI18n.translate('menubar.state.connected');
                } else {
                    indicator.textContent = indicator.dataset.default || '';
                }
            }
        });
        if (!options.silent) {
            hideMenuDropdowns();
        }
    }

    function setBluetoothDevice(deviceName, options = {}) {
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
            if (indicator && !indicator.dataset.default) {
                indicator.dataset.default = indicator.textContent || '';
            }
            const isActive = systemStatus.bluetooth && btn.dataset.device === activeDevice;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            if (indicator) {
                if (!systemStatus.bluetooth) {
                    indicator.textContent = indicator.dataset.default || '';
                } else if (isActive) {
                    indicator.textContent = appI18n.translate('menubar.state.connected');
                } else {
                    indicator.textContent = indicator.dataset.default || '';
                }
            }
        });
        updateAudioDeviceUI();
        if (!options.silent) {
            hideMenuDropdowns();
        }
    }

    function setAudioDevice(deviceKey, options = {}) {
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

    function handleSystemToggle(toggleKey) {
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

    function handleSystemAction(actionKey) {
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
                if (window.dialogs && window.dialogs['settings-modal']) {
                    window.dialogs['settings-modal'].open();
                } else {
                    console.info(`Aktion "${actionKey}" würde Einstellungen öffnen.`);
                }
                hideMenuDropdowns();
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

    function handleSystemSliderInput(type, value) {
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

    function updateAllSystemStatusUI() {
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

    function initSystemStatusControls() {
        document.querySelectorAll('.system-network-indicator').forEach(indicator => {
            indicator.dataset.default = indicator.textContent || '';
        });

        document.querySelectorAll('[data-system-menu-trigger]').forEach(trigger => {
            // bindDropdownTrigger is expected in app.js or global scope
            if (typeof window.bindDropdownTrigger === 'function') {
                window.bindDropdownTrigger(trigger, { hoverRequiresOpen: true });
            }
        });

        document.querySelectorAll('[data-system-toggle]').forEach(toggle => {
            toggle.addEventListener('click', (event) => {
                event.stopPropagation();
                handleSystemToggle(toggle.dataset.systemToggle);
            });
        });

        document.querySelectorAll('[data-system-slider]').forEach(slider => {
            ['pointerdown', 'mousedown', 'touchstart'].forEach(evt => {
                slider.addEventListener(evt, e => e.stopPropagation());
            });
            slider.addEventListener('input', (event) => {
                event.stopPropagation();
                const value = Number(slider.value);
                handleSystemSliderInput(slider.dataset.systemSlider, value);
            });
        });

        document.querySelectorAll('[data-system-action]').forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                handleSystemAction(btn.dataset.systemAction);
            });
        });

        document.querySelectorAll('[data-audio-device]').forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                if (btn.getAttribute('aria-disabled') === 'true') return;
                setAudioDevice(btn.dataset.audioDevice);
            });
        });

        document.querySelectorAll('[data-network]').forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                if (btn.getAttribute('aria-disabled') === 'true') return;
                setConnectedNetwork(btn.dataset.network);
            });
        });

        document.querySelectorAll('[data-device]').forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                if (btn.getAttribute('aria-disabled') === 'true') return;
                setBluetoothDevice(btn.dataset.device, { syncAudio: true });
            });
        });

        updateAllSystemStatusUI();
    }

    // ===== Public API =====

    window.SystemUI = {
        initSystemStatusControls,
        updateAllSystemStatusUI,
        handleSystemToggle,
        handleSystemAction,
        handleSystemSliderInput,
        setConnectedNetwork,
        setBluetoothDevice,
        setAudioDevice,
        getSystemStatus: () => Object.assign({}, systemStatus)
    };

})();
