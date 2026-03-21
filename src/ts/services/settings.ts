import logger from '../core/logger.js';
import { renderInsetSidebarShellHTML } from '../framework/controls/inset-sidebar-shell.js';
import { renderTrafficLightControlsHTML } from '../framework/controls/traffic-lights.js';
/**
 * settings.ts
 * Settings Module - Inline settings UI with theme and language preferences
 */

logger.debug('APP', 'Settings Module loaded');

(() => {
    'use strict';

    // ===== Types =====

    type SectionName =
        | 'wifi'
        | 'bluetooth'
        | 'general'
        | 'general-info'
        | 'desktop-dock'
        | 'display'
        | 'language';

    interface DockPreferencesShape {
        size: number;
        magnification: number;
        position: 'bottom' | 'left' | 'right';
        minimizeEffect: 'genie' | 'scale';
        titlebarDoubleClickAction: 'zoom' | 'minimize';
        minimizeWindowsIntoAppIcon: boolean;
        autoHide: boolean;
        animateOpeningApps: boolean;
        showOpenIndicators: boolean;
        showRecentApps: boolean;
    }

    type GitHubCommitResponse = Array<{
        sha?: string;
        commit?: {
            author?: {
                date?: string;
            };
        };
    }>;

    interface SettingsSystemType {
        currentSection: SectionName;
        sectionHistory: SectionName[];
        historyIndex: number;
        container: HTMLElement | null;
        init(containerOrId: HTMLElement | string): void;
        render(): void;
        attachListeners(): void;
        syncThemePreference(): void;
        syncUIModePreference(): void;
        syncIconThemePreference(): void;
        syncLanguagePreference(): void;
        syncDisplayScalePreference(): void;
        syncDockPreferences(): void;
        showSection(section: SectionName, options?: { pushHistory?: boolean }): void;
        getSectionTitle(section: SectionName): { key: string; fallback: string };
        translateLabel(key: string, fallback: string): string;
        resolveSidebarPage(
            section: SectionName
        ): 'wifi' | 'bluetooth' | 'general' | 'desktop-dock' | 'display' | 'language';
        syncWifiNetworkList(): void;
        syncBluetoothDeviceList(): void;
        syncGeneralInfoDetails(): void;
        fetchLatestGithubCommit(): Promise<void>;
        navigateHistory(direction: 'back' | 'forward'): void;
        updateNavigationChrome(): void;
        destroy(): void;
    }

    // ===== Settings System Implementation =====

    const SettingsSystem: SettingsSystemType = {
        currentSection: 'general',
        sectionHistory: ['general'],
        historyIndex: 0,
        container: null,

        /**
         * Initialize settings module in container
         */
        init(containerOrId: HTMLElement | string): void {
            const container =
                typeof containerOrId === 'string'
                    ? document.getElementById(containerOrId)
                    : containerOrId;

            if (!container) {
                logger.error('APP', 'Settings container not found:', containerOrId);
                return;
            }

            this.container = container;
            this.currentSection = 'general';
            this.sectionHistory = ['general'];
            this.historyIndex = 0;
            this.render();
            this.attachListeners();
            this.syncThemePreference();
            this.syncUIModePreference();
            this.syncIconThemePreference();
            this.syncLanguagePreference();
            this.syncDisplayScalePreference();
            this.syncDockPreferences();
            this.syncWifiNetworkList();
            this.syncBluetoothDeviceList();
            this.syncGeneralInfoDetails();
            void this.fetchLatestGithubCommit();
            this.showSection('general', { pushHistory: false });
        },

        /**
         * Render settings UI
         */
        render(): void {
            if (!this.container) return;

            this.container.innerHTML = `
                <div class="settings-app">
                    ${renderInsetSidebarShellHTML({
                        shellTag: 'aside',
                        shellClassName: 'settings-sidebar-shell',
                        shellAttributes: {
                            'aria-label': 'Settings Navigation',
                            'data-i18n-aria-label': 'settingsPage.sidebar.ariaLabel',
                        },
                        panelClassName: 'settings-sidebar-panel',
                        topClassName: 'settings-sidebar-top draggable-header',
                        topHtml: renderTrafficLightControlsHTML({
                            containerClassName: 'settings-window-controls traffic-light-controls',
                            defaults: {
                                tag: 'button',
                            },
                            close: {
                                className: 'settings-window-control settings-window-control--close',
                                title: 'Schließen',
                                i18nTitleKey: 'common.close',
                                id: 'close-settings-modal',
                                dataAction: 'closeWindow',
                                dataWindowId: 'settings-modal',
                                noDrag: true,
                            },
                            minimize: {
                                className:
                                    'settings-window-control settings-window-control--minimize',
                                title: 'Minimieren',
                                ariaLabel: 'Minimieren',
                            },
                            maximize: {
                                className:
                                    'settings-window-control settings-window-control--maximize',
                                title: 'Maximieren',
                                ariaLabel: 'Maximieren',
                            },
                        }),
                        bodyClassName: 'settings-sidebar',
                        bodyHtml: `
                            <div class="settings-search-wrap">
                                <span class="settings-search-icon" aria-hidden="true">⌕</span>
                                <input class="settings-search-input" type="search" placeholder="Suchen" aria-label="Suchen" data-i18n-placeholder="settingsPage.search.placeholder" data-i18n-aria-label="settingsPage.search.ariaLabel" />
                            </div>

                            <button type="button" class="settings-account" data-action="settings:showSection" data-section="general" data-settings-page="general">
                                <img src="./img/profil.jpg" alt="Profilbild" class="settings-account-avatar" />
                                <span class="settings-account-copy">
                                    <span class="settings-account-name" data-i18n="settingsPage.general.name">Marvin Temmen</span>
                                    <span class="settings-account-subline" data-i18n="settingsPage.account.subline">Apple Account</span>
                                </span>
                            </button>

                            <button type="button" class="settings-nav-item" data-action="settings:showSection" data-section="wifi" data-settings-page="wifi">
                                <span class="settings-nav-icon" aria-hidden="true">📶</span>
                                <span class="settings-nav-title" data-i18n="settingsPage.nav.wifi">WLAN</span>
                            </button>

                            <button type="button" class="settings-nav-item" data-action="settings:showSection" data-section="bluetooth" data-settings-page="bluetooth">
                                <span class="settings-nav-icon" aria-hidden="true">🔵</span>
                                <span class="settings-nav-title" data-i18n="settingsPage.nav.bluetooth">Bluetooth</span>
                            </button>

                            <button type="button" class="settings-nav-item" data-action="settings:showSection" data-section="general" data-settings-page="general">
                                <span class="settings-nav-icon" aria-hidden="true">⚙️</span>
                                <span class="settings-nav-title" data-i18n="settingsPage.nav.general">Allgemein</span>
                            </button>
                            <button type="button" class="settings-nav-item" data-action="settings:showSection" data-section="desktop-dock" data-settings-page="desktop-dock">
                                <span class="settings-nav-icon" aria-hidden="true">🧰</span>
                                <span class="settings-nav-title" data-i18n="settingsPage.nav.desktopDock">Schreibtisch &amp; Dock</span>
                            </button>
                            <button type="button" class="settings-nav-item" data-action="settings:showSection" data-section="display" data-settings-page="display">
                                <span class="settings-nav-icon" aria-hidden="true">🖥️</span>
                                <span class="settings-nav-title" data-i18n="settingsPage.nav.display">Darstellung</span>
                            </button>
                            <button type="button" class="settings-nav-item" data-action="settings:showSection" data-section="language" data-settings-page="language">
                                <span class="settings-nav-icon" aria-hidden="true">🌐</span>
                                <span class="settings-nav-title" data-i18n="settingsPage.nav.language">Sprache</span>
                            </button>
                        `,
                    })}

                    <main class="settings-main-shell">
                        <div class="settings-content-topbar draggable-header">
                            <div class="settings-content-nav" role="group" aria-label="Navigation">
                                <button type="button" class="settings-content-nav-btn" data-settings-nav="back" data-dialog-action="navigate-back" aria-label="Zurück" title="Zurück">‹</button>
                                <button type="button" class="settings-content-nav-btn" data-settings-nav="forward" data-dialog-action="navigate-forward" aria-label="Vorwärts" title="Vorwärts">›</button>
                            </div>
                            <h2 class="settings-content-title" data-settings-current-title data-i18n="settingsPage.general.title">Allgemein</h2>
                        </div>

                        <div class="settings-main">
                        <section id="settings-wifi" class="settings-section hidden">
                            <div class="settings-wifi-page" role="group" aria-label="WLAN Einstellungen" data-i18n-aria-label="settingsPage.wifi.ariaLabel">
                                <div class="settings-wifi-card settings-wifi-master-card">
                                    <button
                                        type="button"
                                        class="settings-wifi-master-button"
                                        data-system-toggle="wifi"
                                        data-action="system:toggle"
                                        aria-pressed="false"
                                    >
                                        <span class="settings-wifi-master-icon" aria-hidden="true">📶</span>
                                        <span class="settings-wifi-master-copy">
                                            <span class="settings-wifi-master-title" data-i18n="settingsPage.wifi.title">WLAN</span>
                                            <span class="settings-wifi-master-description" data-i18n="settingsPage.wifi.description">Verwalte WLAN, aktive Verbindungen und bevorzugte Netzwerke wie unter macOS.</span>
                                        </span>
                                        <span class="settings-wifi-switch" data-state-switch="wifi"></span>
                                    </button>
                                </div>

                                <div class="settings-wifi-group">
                                    <p class="settings-wifi-group-title" data-i18n="settingsPage.wifi.currentGroup">Aktives Netzwerk</p>
                                    <div class="settings-wifi-card settings-wifi-network-card settings-wifi-network-card--spacious">
                                        <button type="button" class="menu-item system-menu-item settings-wifi-network-item settings-wifi-network-item--active" data-network="HomeLAN" data-action="system:setNetwork" aria-pressed="false">
                                            <span class="settings-wifi-network-main">
                                                <span class="settings-wifi-network-title-row">
                                                    <span class="menu-item-label settings-wifi-network-title" data-state="network">HomeLAN</span>
                                                    <span class="settings-wifi-network-check" aria-hidden="true">✓</span>
                                                </span>
                                                <span class="settings-wifi-network-subline" data-state="wifi-connection-status">Verbunden</span>
                                            </span>
                                            <span class="settings-wifi-network-trailing">
                                                <span class="settings-wifi-network-lock" aria-hidden="true">🔒</span>
                                                <span class="settings-wifi-network-signal" aria-hidden="true">📶</span>
                                                <span class="settings-wifi-network-details" data-i18n="settingsPage.wifi.detailsAction">Details ...</span>
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div class="settings-wifi-group">
                                    <p class="settings-wifi-group-title" data-i18n="settingsPage.wifi.personalHotspots">Persönliche Hotspots</p>
                                    <div class="settings-wifi-card settings-wifi-network-card settings-wifi-network-card--spacious">
                                        <button type="button" class="menu-item system-menu-item settings-wifi-network-item settings-wifi-network-item--single" data-network="Hotspot" data-action="system:setNetwork" aria-pressed="false">
                                            <span class="settings-wifi-network-main">
                                                <span class="menu-item-label settings-wifi-network-title" data-i18n="menubar.networks.hotspot">Marvin iPhone</span>
                                            </span>
                                            <span class="settings-wifi-network-trailing">
                                                <span class="settings-wifi-network-lock" aria-hidden="true">🔒</span>
                                                <span class="settings-wifi-network-link" aria-hidden="true">🔗</span>
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div class="settings-wifi-group">
                                    <p class="settings-wifi-group-title" data-i18n="settingsPage.wifi.knownGroup">Bekanntes Netzwerk</p>
                                    <div class="settings-wifi-card settings-wifi-network-card settings-wifi-network-card--spacious">
                                        <button type="button" class="menu-item system-menu-item settings-wifi-network-item" data-network="Office" data-action="system:setNetwork" aria-pressed="false">
                                            <span class="settings-wifi-network-main">
                                                <span class="settings-wifi-network-title-row">
                                                    <span class="menu-item-label settings-wifi-network-title" data-i18n="menubar.networks.office">Office</span>
                                                </span>
                                            </span>
                                            <span class="settings-wifi-network-trailing">
                                                <span class="settings-wifi-network-lock" aria-hidden="true">🔒</span>
                                                <span class="settings-wifi-network-signal" aria-hidden="true">📶</span>
                                                <span class="settings-wifi-network-more" aria-hidden="true">•••</span>
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div class="settings-wifi-group">
                                    <p class="settings-wifi-group-title" data-i18n="settingsPage.wifi.otherGroup">Andere Netzwerke</p>
                                    <div class="settings-wifi-card settings-wifi-network-card settings-wifi-network-card--stacked">
                                        <button type="button" class="menu-item system-menu-item settings-wifi-network-item" data-network="GuestMesh" data-action="system:setNetwork" aria-pressed="false">
                                            <span class="settings-wifi-network-main">
                                                <span class="menu-item-label settings-wifi-network-title" data-i18n="settingsPage.wifi.networks.guestMesh">GuestMesh</span>
                                            </span>
                                            <span class="settings-wifi-network-trailing">
                                                <span class="settings-wifi-network-lock" aria-hidden="true">🔒</span>
                                                <span class="settings-wifi-network-signal" aria-hidden="true">📶</span>
                                                <span class="settings-wifi-network-more" aria-hidden="true">•••</span>
                                            </span>
                                        </button>
                                        <button type="button" class="menu-item system-menu-item settings-wifi-network-item" data-network="CafeFree" data-action="system:setNetwork" aria-pressed="false">
                                            <span class="settings-wifi-network-main">
                                                <span class="menu-item-label settings-wifi-network-title" data-i18n="settingsPage.wifi.networks.cafeFree">CafeFree</span>
                                            </span>
                                            <span class="settings-wifi-network-trailing">
                                                <span class="settings-wifi-network-lock" aria-hidden="true">🔒</span>
                                                <span class="settings-wifi-network-signal" aria-hidden="true">📶</span>
                                                <span class="settings-wifi-network-more" aria-hidden="true">•••</span>
                                            </span>
                                        </button>
                                        <button type="button" class="menu-item system-menu-item settings-wifi-network-item" data-network="StudioNet" data-action="system:setNetwork" aria-pressed="false">
                                            <span class="settings-wifi-network-main">
                                                <span class="menu-item-label settings-wifi-network-title" data-i18n="settingsPage.wifi.networks.studioNet">StudioNet</span>
                                            </span>
                                            <span class="settings-wifi-network-trailing">
                                                <span class="settings-wifi-network-lock" aria-hidden="true">🔒</span>
                                                <span class="settings-wifi-network-signal" aria-hidden="true">📶</span>
                                                <span class="settings-wifi-network-more" aria-hidden="true">•••</span>
                                            </span>
                                        </button>
                                        <button type="button" class="menu-item system-menu-item settings-wifi-network-item" data-network="DevHub" data-action="system:setNetwork" aria-pressed="false">
                                            <span class="settings-wifi-network-main">
                                                <span class="menu-item-label settings-wifi-network-title" data-i18n="settingsPage.wifi.networks.devHub">DevHub</span>
                                            </span>
                                            <span class="settings-wifi-network-trailing">
                                                <span class="settings-wifi-network-lock" aria-hidden="true">🔒</span>
                                                <span class="settings-wifi-network-signal" aria-hidden="true">📶</span>
                                                <span class="settings-wifi-network-more" aria-hidden="true">•••</span>
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section id="settings-bluetooth" class="settings-section hidden">
                            <div class="settings-wifi-page" role="group" aria-label="Bluetooth Einstellungen" data-i18n-aria-label="settingsPage.bluetooth.ariaLabel">
                                <div class="settings-wifi-card settings-wifi-master-card">
                                    <button
                                        type="button"
                                        class="settings-wifi-master-button"
                                        data-system-toggle="bluetooth"
                                        data-action="system:toggle"
                                        aria-pressed="false"
                                    >
                                        <span class="settings-wifi-master-icon" aria-hidden="true">🔵</span>
                                        <span class="settings-wifi-master-copy">
                                            <span class="settings-wifi-master-title" data-i18n="settingsPage.bluetooth.title">Bluetooth</span>
                                            <span class="settings-wifi-master-description" data-i18n="settingsPage.bluetooth.description">Verbinde Zubehör wie Kopfhörer, Tastaturen oder Lautsprecher.</span>
                                        </span>
                                        <span class="settings-wifi-switch" data-state-switch="bluetooth"></span>
                                    </button>
                                </div>

                                <div class="settings-wifi-card settings-bluetooth-details-card">
                                    <p class="settings-bluetooth-details-text" data-i18n="settingsPage.bluetooth.details">Dieser Mac wird als „Marvin's MacBook Pro“ angezeigt, während die Bluetooth-Einstellungen geöffnet sind.</p>
                                </div>

                                <div class="settings-wifi-group">
                                    <p class="settings-wifi-group-title" data-i18n="settingsPage.bluetooth.devicesGroup">Meine Geräte</p>
                                    <div class="settings-wifi-card settings-wifi-network-card">
                                        <div class="settings-wifi-network-list" data-network-context="settings-bluetooth">
                                            <button
                                                type="button"
                                                class="menu-item system-menu-item settings-wifi-network-item settings-bluetooth-device-row"
                                                data-device="AirPods"
                                                aria-pressed="false"
                                            >
                                                <span class="settings-bluetooth-device-icon" aria-hidden="true">🎧</span>
                                                <span class="settings-bluetooth-device-copy">
                                                    <span class="menu-item-label settings-bluetooth-device-title" data-i18n="menubar.bluetooth.airpods">Marvins AirPods Pro</span>
                                                    <span class="settings-bluetooth-device-meta">
                                                        <span
                                                            class="system-network-indicator"
                                                            data-i18n="menubar.state.connected"
                                                            data-default-i18n="menubar.state.ready"
                                                            data-default="Bereit"
                                                        >Verbunden</span>
                                                        <span class="settings-bluetooth-device-battery">67 %</span>
                                                    </span>
                                                </span>
                                                <span class="settings-bluetooth-device-info" aria-hidden="true">i</span>
                                            </button>
                                            <button
                                                type="button"
                                                class="menu-item system-menu-item settings-wifi-network-item settings-bluetooth-device-row"
                                                data-device="Keyboard"
                                                aria-pressed="false"
                                            >
                                                <span class="settings-bluetooth-device-icon" aria-hidden="true">⌨️</span>
                                                <span class="settings-bluetooth-device-copy">
                                                    <span class="menu-item-label settings-bluetooth-device-title" data-i18n="menubar.bluetooth.keyboard">Magic Keyboard</span>
                                                    <span class="settings-bluetooth-device-meta">
                                                        <span
                                                            class="system-network-indicator"
                                                            data-i18n="menubar.state.ready"
                                                            data-default-i18n="menubar.state.ready"
                                                            data-default="Bereit"
                                                        >Bereit</span>
                                                        <span class="settings-bluetooth-device-battery">97 %</span>
                                                    </span>
                                                </span>
                                                <span class="settings-bluetooth-device-info" aria-hidden="true">i</span>
                                            </button>
                                            <button
                                                type="button"
                                                class="menu-item system-menu-item settings-wifi-network-item settings-bluetooth-device-row"
                                                data-device="Speaker"
                                                aria-pressed="false"
                                            >
                                                <span class="settings-bluetooth-device-icon" aria-hidden="true">🔊</span>
                                                <span class="settings-bluetooth-device-copy">
                                                    <span class="menu-item-label settings-bluetooth-device-title" data-i18n="menubar.bluetooth.speaker">HomeSpeaker</span>
                                                    <span class="settings-bluetooth-device-meta">
                                                        <span
                                                            class="system-network-indicator"
                                                            data-i18n="menubar.state.notConnected"
                                                            data-default-i18n="menubar.state.notConnected"
                                                            data-default="Nicht verbunden"
                                                        >Nicht verbunden</span>
                                                    </span>
                                                </span>
                                                <span class="settings-bluetooth-device-info" aria-hidden="true">i</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section id="settings-general" class="settings-section">
                            <div class="settings-overview-panel" role="region" aria-labelledby="settings-general-overview-title">
                                <img src="./img/settings.png" alt="Settings App Icon" class="settings-overview-icon" />
                                <h2 id="settings-general-overview-title" class="settings-overview-title" data-i18n="settingsPage.general.title">Allgemein</h2>
                                <p class="settings-overview-description" data-i18n="settingsPage.general.description">
                                    Verwalte die allgemeinen Konfigurationen und Einstellungen.
                                </p>
                            </div>

                            <div class="settings-option-card settings-subcategory-list" role="list" aria-label="Allgemeine Unterkategorien" data-i18n-aria-label="settingsPage.general.subcategoriesAriaLabel">
                                <button type="button" class="settings-subcategory-item" role="listitem" data-action="settings:showSection" data-section="general-info">
                                    <span class="settings-subcategory-icon" aria-hidden="true">💻</span>
                                    <span class="settings-subcategory-copy">
                                        <span class="settings-subcategory-title" data-i18n="settingsPage.general.infoTitle">Info</span>
                                        <span class="settings-subcategory-description" data-i18n="settingsPage.general.infoDescription">Zeigt Geräte- und Profilinformationen an.</span>
                                    </span>
                                    <span class="settings-subcategory-chevron" aria-hidden="true">›</span>
                                </button>
                            </div>
                        </section>

                        <section id="settings-general-info" class="settings-section hidden">
                            <div class="settings-device-hero">
                                <img src="./img/profil.jpg" alt="Profilbild" class="settings-account-avatar settings-device-avatar" />
                                <h3 class="settings-device-name" data-i18n="settingsPage.general.name">Marvin Temmen</h3>
                                <p class="settings-device-subtitle">März 1999</p>
                            </div>

                            <div class="settings-info-card">
                                <div class="settings-info-row">
                                    <span class="settings-info-key" data-i18n="settingsPage.general.focusLabel">Schwerpunkt</span>
                                    <span class="settings-info-value" data-i18n="settingsPage.general.focusValue">C# im Beruf, privat etwas Web-Entwicklung und C++ Game Dev</span>
                                </div>
                                <div class="settings-info-row">
                                    <span class="settings-info-key" data-i18n="settingsPage.general.locationLabel">Wohnort</span>
                                    <span class="settings-info-value" data-i18n="settingsPage.general.locationValue">Deutschland</span>
                                </div>
                                <div class="settings-info-row">
                                    <span class="settings-info-key" data-i18n="settingsPage.general.jobLabel">Beruf</span>
                                    <span class="settings-info-value" data-i18n="settingsPage.general.jobValue">Softwareentwickler</span>
                                </div>
                            </div>

                            <h4 class="settings-info-group-title">Website Version</h4>
                            <div class="settings-info-card settings-info-card--system" data-github-owner="Marormur" data-github-repo="Website">
                                <div class="settings-info-row">
                                    <span class="settings-info-key settings-info-key--with-icon">
                                        <span class="settings-info-key-icon" aria-hidden="true">🧾</span>
                                        <span>Commit-ID</span>
                                    </span>
                                    <span class="settings-info-value" data-settings-info-field="github-commit-id">Wird geladen ...</span>
                                </div>
                                <div class="settings-info-row">
                                    <span class="settings-info-key">Letzter GitHub-Commit</span>
                                    <span class="settings-info-value" data-settings-info-field="github-commit-day">Wird geladen ...</span>
                                </div>
                            </div>

                            <h4 class="settings-info-group-title">Bildschirm</h4>
                            <div class="settings-info-card settings-info-card--system">
                                <div class="settings-info-row settings-info-row--stack-sm">
                                    <span class="settings-info-key settings-info-key--with-icon">
                                        <span class="settings-info-key-icon" aria-hidden="true">🌐</span>
                                        <span>Browser-Agent</span>
                                    </span>
                                    <span class="settings-info-value settings-info-value--multiline" data-settings-info-field="browser-user-agent">Wird geladen ...</span>
                                </div>
                                <div class="settings-info-row">
                                    <span class="settings-info-key">Viewport-Auflösung</span>
                                    <span class="settings-info-value" data-settings-info-field="browser-viewport">Wird geladen ...</span>
                                </div>
                            </div>
                        </section>

                        <section id="settings-desktop-dock" class="settings-section hidden">
                            <div class="settings-section-header">
                                <h3 class="settings-section-title" data-i18n="settingsPage.desktopDock.title">Schreibtisch &amp; Dock</h3>
                                <p class="settings-section-description" data-i18n="settingsPage.desktopDock.description">Passe das Dock-Verhalten mit macOS-aehnlichen Optionen fuer Groesse, Vergroesserung und Sichtbarkeit an.</p>
                            </div>

                            <div class="settings-dock-page">
                                <div class="settings-option-card settings-dock-slider-card">
                                    <div class="settings-dock-slider-grid">
                                        <label class="settings-dock-slider-field">
                                            <span class="settings-dock-slider-heading">
                                                <span class="settings-dock-row-title" data-i18n="settingsPage.desktopDock.size">Groesse</span>
                                                <output class="settings-dock-slider-value" data-settings-dock-size-value>72 px</output>
                                            </span>
                                            <input type="range" min="0" max="100" step="1" value="56" class="settings-dock-range" data-settings-dock-size />
                                            <span class="settings-dock-slider-scale settings-dock-slider-scale--ends" aria-hidden="true">
                                                <span data-i18n="settingsPage.desktopDock.small">Klein</span>
                                                <span data-i18n="settingsPage.desktopDock.large">Groß</span>
                                            </span>
                                        </label>

                                        <label class="settings-dock-slider-field">
                                            <span class="settings-dock-slider-heading">
                                                <span class="settings-dock-row-title" data-i18n="settingsPage.desktopDock.magnification">Vergrößerung</span>
                                                <output class="settings-dock-slider-value" data-settings-dock-magnification-value>52%</output>
                                            </span>
                                            <input type="range" min="0" max="100" step="1" value="52" class="settings-dock-range" data-settings-dock-magnification />
                                            <span class="settings-dock-slider-scale" aria-hidden="true">
                                                <span data-i18n="settingsPage.desktopDock.off">Aus</span>
                                                <span data-i18n="settingsPage.desktopDock.small">Klein</span>
                                                <span data-i18n="settingsPage.desktopDock.large">Groß</span>
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div class="settings-option-card settings-dock-list-card">
                                    <label class="settings-dock-row">
                                        <span class="settings-dock-row-copy">
                                            <span class="settings-dock-row-title" data-i18n="settingsPage.desktopDock.position">Position auf dem Bildschirm</span>
                                        </span>
                                        <select class="settings-dock-select" data-settings-dock-position>
                                            <option value="bottom" data-i18n="settingsPage.desktopDock.positionOptions.bottom">Unten</option>
                                            <option value="left" data-i18n="settingsPage.desktopDock.positionOptions.left">Links</option>
                                            <option value="right" data-i18n="settingsPage.desktopDock.positionOptions.right">Rechts</option>
                                        </select>
                                    </label>

                                    <label class="settings-dock-row">
                                        <span class="settings-dock-row-copy">
                                            <span class="settings-dock-row-title" data-i18n="settingsPage.desktopDock.minimizeEffect">Effekt beim Ablegen</span>
                                        </span>
                                        <select class="settings-dock-select" data-settings-dock-minimize-effect>
                                            <option value="genie" data-i18n="settingsPage.desktopDock.minimizeEffectOptions.genie">Trichter</option>
                                            <option value="scale" data-i18n="settingsPage.desktopDock.minimizeEffectOptions.scale">Skalieren</option>
                                        </select>
                                    </label>

                                    <label class="settings-dock-row">
                                        <span class="settings-dock-row-copy">
                                            <span class="settings-dock-row-title" data-i18n="settingsPage.desktopDock.titlebarDoubleClick">Doppelklick auf Titelleiste</span>
                                        </span>
                                        <select class="settings-dock-select" data-settings-dock-titlebar-double-click>
                                            <option value="zoom" data-i18n="settingsPage.desktopDock.titlebarDoubleClickOptions.zoom">Zoomen</option>
                                            <option value="minimize" data-i18n="settingsPage.desktopDock.titlebarDoubleClickOptions.minimize">Im Dock ablegen</option>
                                        </select>
                                    </label>

                                    <label class="settings-dock-row settings-dock-row--toggle">
                                        <span class="settings-dock-row-copy">
                                            <span class="settings-dock-row-title" data-i18n="settingsPage.desktopDock.minimizeIntoAppIcon">Fenster hinter Programmsymbol im Dock ablegen</span>
                                        </span>
                                        <span class="settings-dock-toggle">
                                            <input type="checkbox" class="settings-dock-toggle-input" data-settings-dock-minimize-to-app-icon />
                                            <span class="settings-dock-toggle-track"></span>
                                        </span>
                                    </label>

                                    <label class="settings-dock-row settings-dock-row--toggle">
                                        <span class="settings-dock-row-copy">
                                            <span class="settings-dock-row-title" data-i18n="settingsPage.desktopDock.autoHide">Dock automatisch ein- und ausblenden</span>
                                        </span>
                                        <span class="settings-dock-toggle">
                                            <input type="checkbox" class="settings-dock-toggle-input" data-settings-dock-auto-hide />
                                            <span class="settings-dock-toggle-track"></span>
                                        </span>
                                    </label>

                                    <label class="settings-dock-row settings-dock-row--toggle">
                                        <span class="settings-dock-row-copy">
                                            <span class="settings-dock-row-title" data-i18n="settingsPage.desktopDock.animateOpeningApps">Öffnen von Programmen animieren</span>
                                        </span>
                                        <span class="settings-dock-toggle">
                                            <input type="checkbox" class="settings-dock-toggle-input" data-settings-dock-animate-opening />
                                            <span class="settings-dock-toggle-track"></span>
                                        </span>
                                    </label>

                                    <label class="settings-dock-row settings-dock-row--toggle">
                                        <span class="settings-dock-row-copy">
                                            <span class="settings-dock-row-title" data-i18n="settingsPage.desktopDock.showOpenIndicators">Anzeige für geöffnete Programme einblenden</span>
                                        </span>
                                        <span class="settings-dock-toggle">
                                            <input type="checkbox" class="settings-dock-toggle-input" data-settings-dock-show-indicators />
                                            <span class="settings-dock-toggle-track"></span>
                                        </span>
                                    </label>

                                    <label class="settings-dock-row settings-dock-row--toggle">
                                        <span class="settings-dock-row-copy">
                                            <span class="settings-dock-row-title" data-i18n="settingsPage.desktopDock.showRecentApps">Vorgeschlagene und letzte Apps im Dock anzeigen</span>
                                        </span>
                                        <span class="settings-dock-toggle">
                                            <input type="checkbox" class="settings-dock-toggle-input" data-settings-dock-show-recents />
                                            <span class="settings-dock-toggle-track"></span>
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </section>

                        <section id="settings-display" class="settings-section hidden">

                            <fieldset class="settings-option-card">
                                <legend class="settings-option-legend" data-i18n="settingsPage.display.legend">Darkmode</legend>
                                <label class="settings-radio-row">
                                    <input type="radio" name="theme-mode" value="system" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.display.options.system.label">🖥️ System</span>
                                    </span>
                                </label>
                                <label class="settings-radio-row">
                                    <input type="radio" name="theme-mode" value="light" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.display.options.light.label">☀️ Hell</span>
                                    </span>
                                </label>
                                <label class="settings-radio-row">
                                    <input type="radio" name="theme-mode" value="dark" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.display.options.dark.label">🌙 Dunkel</span>
                                    </span>
                                </label>
                            </fieldset>

                            <fieldset class="settings-option-card">
                                <legend class="settings-option-legend" data-i18n="settingsPage.display.uiMode.legend">Oberflächenmodus</legend>
                                <label class="settings-radio-row">
                                    <input type="radio" name="ui-mode-preference" value="auto" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.display.uiMode.options.auto.label">✨ Automatisch</span>
                                        <span class="settings-radio-description" data-i18n="settingsPage.display.uiMode.options.auto.description">Passt den Modus je nach Gerät und Viewport an.</span>
                                    </span>
                                </label>
                                <label class="settings-radio-row">
                                    <input type="radio" name="ui-mode-preference" value="desktop" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.display.uiMode.options.desktop.label">🖥️ Desktop (macOS)</span>
                                        <span class="settings-radio-description" data-i18n="settingsPage.display.uiMode.options.desktop.description">Klassisches Fenster- und Dock-Layout.</span>
                                    </span>
                                </label>
                                <label class="settings-radio-row">
                                    <input type="radio" name="ui-mode-preference" value="mobile" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.display.uiMode.options.mobile.label">📱 Mobil (iOS-inspiriert)</span>
                                        <span class="settings-radio-description" data-i18n="settingsPage.display.uiMode.options.mobile.description">Aktiviert mobile Navigation und kompaktere UI-Größen.</span>
                                    </span>
                                </label>
                            </fieldset>

                            <fieldset class="settings-option-card settings-scale-card">
                                <legend class="settings-option-legend" data-i18n="settingsPage.display.scale.legend">Skalierung</legend>
                                <div class="settings-scale-row">
                                    <span class="settings-scale-copy">
                                        <span class="settings-scale-title" data-i18n="settingsPage.display.scale.title">UI-Skalierung</span>
                                        <span class="settings-scale-description" data-i18n="settingsPage.display.scale.description">Passe die Größe der Oberfläche für kleinere oder größere Viewports an.</span>
                                    </span>
                                    <output class="settings-scale-value" data-settings-display-scale-value>100%</output>
                                </div>
                                <input
                                    type="range"
                                    class="settings-scale-range"
                                    data-settings-display-scale-range
                                    min="70"
                                    max="130"
                                    step="5"
                                    value="100"
                                    aria-label="Darstellung skalieren"
                                    data-i18n-aria-label="settingsPage.display.scale.ariaLabel"
                                />
                                <div class="settings-scale-indicators" aria-hidden="true">
                                    <span>70%</span>
                                    <span>85%</span>
                                    <span>100%</span>
                                    <span>115%</span>
                                    <span>130%</span>
                                </div>
                                <div class="settings-scale-recommendation">
                                    <p class="settings-scale-recommendation-text">
                                        <span data-i18n="settingsPage.display.scale.recommendationLabel">Empfohlen für diesen Viewport:</span>
                                        <strong data-settings-display-scale-recommendation-value>100%</strong>
                                    </p>
                                    <button type="button" class="settings-scale-recommendation-btn" data-settings-display-scale-apply data-i18n="settingsPage.display.scale.applyRecommendation">Empfehlung übernehmen</button>
                                </div>
                            </fieldset>

                            <fieldset class="settings-option-card">
                                <legend class="settings-option-legend" data-i18n="settingsPage.display.iconTheme.legend">Programm-Icons</legend>
                                <label class="settings-radio-row">
                                    <input type="radio" name="icon-theme" value="emoji" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.display.iconTheme.options.emoji.label">🙂 Emojis</span>
                                    </span>
                                </label>
                                <label class="settings-radio-row">
                                    <input type="radio" name="icon-theme" value="custom" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.display.iconTheme.options.custom.label">🖼️ Eigene Icons</span>
                                    </span>
                                </label>
                            </fieldset>
                        </section>

                        <section id="settings-language" class="settings-section hidden">

                            <fieldset class="settings-option-card">
                                <legend class="settings-option-legend" data-i18n="settingsPage.language.legend">Bevorzugte Sprache</legend>
                                <label class="settings-radio-row">
                                    <input type="radio" name="language-preference" value="system" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.language.options.system.label">🖥️ System</span>
                                    </span>
                                </label>
                                <label class="settings-radio-row">
                                    <input type="radio" name="language-preference" value="de" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.language.options.de.label">🇩🇪 Deutsch</span>
                                    </span>
                                </label>
                                <label class="settings-radio-row">
                                    <input type="radio" name="language-preference" value="en" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.language.options.en.label">🇬🇧 Englisch</span>
                                    </span>
                                </label>
                                <label class="settings-radio-row">
                                    <input type="radio" name="language-preference" value="en-us" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.language.options.enUs.label">🇺🇸 Englisch (vereinfacht)</span>
                                    </span>
                                </label>
                            </fieldset>
                        </section>
                        </div>
                    </main>
                </div>
            `;

            // Apply i18n translations
            const appI18n = (
                window as Window & { appI18n?: { applyTranslations(el: HTMLElement): void } }
            ).appI18n;
            if (appI18n?.applyTranslations) {
                appI18n.applyTranslations(this.container);
            }
        },

        /**
         * Attach event listeners
         */
        attachListeners(): void {
            if (!this.container) return;

            const sectionButtons = this.container.querySelectorAll<HTMLButtonElement>(
                '[data-action="settings:showSection"][data-section]'
            );
            sectionButtons.forEach(button => {
                button.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    const targetSection = button.getAttribute('data-section') as SectionName | null;
                    if (!targetSection) return;
                    this.showSection(targetSection);
                });
            });

            const backBtn = this.container.querySelector<HTMLButtonElement>(
                '[data-settings-nav="back"]'
            );
            const forwardBtn = this.container.querySelector<HTMLButtonElement>(
                '[data-settings-nav="forward"]'
            );
            backBtn?.addEventListener('click', () => this.navigateHistory('back'));
            forwardBtn?.addEventListener('click', () => this.navigateHistory('forward'));

            // Theme preference change listeners
            const themeRadios = this.container.querySelectorAll<HTMLInputElement>(
                'input[name="theme-mode"]'
            );
            themeRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (!radio.checked) return;

                    const theme = radio.value;
                    // Call global API if available
                    const API = (
                        window as Window & {
                            API?: { theme?: { setThemePreference(mode: string): void } };
                        }
                    ).API;
                    if (API?.theme?.setThemePreference) {
                        API.theme.setThemePreference(theme);
                    } else {
                        // Fallback to ThemeSystem
                        const ThemeSystem = (
                            window as Window & {
                                ThemeSystem?: { setThemePreference(mode: string): void };
                            }
                        ).ThemeSystem;
                        if (ThemeSystem?.setThemePreference) {
                            ThemeSystem.setThemePreference(theme);
                        }
                    }
                });
            });

            const uiModeRadios = this.container.querySelectorAll<HTMLInputElement>(
                'input[name="ui-mode-preference"]'
            );
            uiModeRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (!radio.checked) return;

                    const preference = radio.value as 'auto' | 'desktop' | 'mobile';
                    const API = (
                        window as Window & {
                            API?: {
                                uiMode?: {
                                    setUIModePreference(pref: 'auto' | 'desktop' | 'mobile'): void;
                                };
                            };
                        }
                    ).API;
                    if (API?.uiMode?.setUIModePreference) {
                        API.uiMode.setUIModePreference(preference);
                        return;
                    }

                    const UiModeSystem = (
                        window as Window & {
                            UiModeSystem?: {
                                setUIModePreference(pref: 'auto' | 'desktop' | 'mobile'): void;
                            };
                        }
                    ).UiModeSystem;
                    UiModeSystem?.setUIModePreference?.(preference);
                });
            });

            const iconThemeRadios = this.container.querySelectorAll<HTMLInputElement>(
                'input[name="icon-theme"]'
            );
            iconThemeRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (!radio.checked) return;

                    const iconTheme = radio.value;
                    const API = (
                        window as Window & {
                            API?: {
                                iconTheme?: {
                                    setProgramIconTheme(theme: 'emoji' | 'custom'): void;
                                };
                            };
                        }
                    ).API;
                    if (API?.iconTheme?.setProgramIconTheme) {
                        API.iconTheme.setProgramIconTheme(iconTheme as 'emoji' | 'custom');
                        return;
                    }

                    const IconThemeSystem = (
                        window as Window & {
                            IconThemeSystem?: {
                                setProgramIconTheme(theme: 'emoji' | 'custom'): void;
                            };
                        }
                    ).IconThemeSystem;
                    IconThemeSystem?.setProgramIconTheme?.(iconTheme as 'emoji' | 'custom');
                });
            });

            // Language preference change listeners
            const languageRadios = this.container.querySelectorAll<HTMLInputElement>(
                'input[name="language-preference"]'
            );
            languageRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (!radio.checked) return;

                    const lang = radio.value;
                    // Call global API if available
                    const API = (
                        window as Window & {
                            API?: { i18n?: { setLanguagePreference(lang: string): void } };
                        }
                    ).API;
                    if (API?.i18n?.setLanguagePreference) {
                        API.i18n.setLanguagePreference(lang);
                    } else {
                        // Fallback to appI18n
                        const appI18n = (
                            window as Window & {
                                appI18n?: { setLanguagePreference(lang: string): void };
                            }
                        ).appI18n;
                        if (appI18n?.setLanguagePreference) {
                            appI18n.setLanguagePreference(lang);
                        }
                    }
                });
            });

            const displayScaleRange = this.container.querySelector<HTMLInputElement>(
                '[data-settings-display-scale-range]'
            );
            const displayScaleValue = this.container.querySelector<HTMLOutputElement>(
                '[data-settings-display-scale-value]'
            );
            const displayScaleRecommendationValue = this.container.querySelector<HTMLElement>(
                '[data-settings-display-scale-recommendation-value]'
            );
            const displayScaleRecommendation = this.container.querySelector<HTMLElement>(
                '.settings-scale-recommendation'
            );
            const displayScaleApplyRecommendation = this.container.querySelector<HTMLButtonElement>(
                '[data-settings-display-scale-apply]'
            );

            const getRecommendedScalePercent = (): number => {
                const API = (
                    window as Window & {
                        API?: {
                            display?: {
                                getRecommendedDisplayScale?: () => number;
                            };
                        };
                    }
                ).API;
                const ThemeSystem = (
                    window as Window & {
                        ThemeSystem?: {
                            getRecommendedDisplayScale?: () => number;
                        };
                    }
                ).ThemeSystem;

                const recommendedScale = API?.display?.getRecommendedDisplayScale
                    ? API.display.getRecommendedDisplayScale()
                    : ThemeSystem?.getRecommendedDisplayScale
                      ? ThemeSystem.getRecommendedDisplayScale()
                      : 1;

                return Math.max(70, Math.min(130, Math.round(recommendedScale * 100)));
            };

            const updateRecommendationState = (currentPercent: number) => {
                const recommendedPercent = getRecommendedScalePercent();
                const isRecommendationActive = currentPercent === recommendedPercent;

                if (displayScaleRecommendationValue) {
                    displayScaleRecommendationValue.textContent = `${recommendedPercent}%`;
                }

                if (displayScaleRecommendation) {
                    displayScaleRecommendation.classList.toggle('hidden', isRecommendationActive);
                }

                if (displayScaleApplyRecommendation) {
                    displayScaleApplyRecommendation.disabled = false;
                    displayScaleApplyRecommendation.textContent = this.translateLabel(
                        'settingsPage.display.scale.applyRecommendation',
                        'Empfehlung übernehmen'
                    );
                }
            };

            const updateDisplayScaleValue = (percentValue: number) => {
                if (displayScaleValue) {
                    displayScaleValue.value = `${percentValue}%`;
                    displayScaleValue.textContent = `${percentValue}%`;
                }

                updateRecommendationState(percentValue);
            };

            displayScaleRange?.addEventListener('input', () => {
                const percentValue = Number.parseInt(displayScaleRange.value, 10);
                if (!Number.isFinite(percentValue)) return;
                updateDisplayScaleValue(percentValue);
            });

            displayScaleRange?.addEventListener('change', () => {
                const percentValue = Number.parseInt(displayScaleRange.value, 10);
                if (!Number.isFinite(percentValue)) return;
                const scaleValue = percentValue / 100;

                const API = (
                    window as Window & {
                        API?: {
                            display?: { setDisplayScalePreference(scale: number): void };
                        };
                    }
                ).API;
                if (API?.display?.setDisplayScalePreference) {
                    API.display.setDisplayScalePreference(scaleValue);
                } else {
                    const ThemeSystem = (
                        window as Window & {
                            ThemeSystem?: {
                                setDisplayScalePreference(scale: number): void;
                            };
                        }
                    ).ThemeSystem;
                    ThemeSystem?.setDisplayScalePreference?.(scaleValue);
                }

                updateDisplayScaleValue(percentValue);
            });

            displayScaleApplyRecommendation?.addEventListener('click', () => {
                if (!displayScaleRange) return;
                const recommendedPercent = getRecommendedScalePercent();
                displayScaleRange.value = String(recommendedPercent);
                displayScaleRange.dispatchEvent(new Event('input', { bubbles: true }));
                displayScaleRange.dispatchEvent(new Event('change', { bubbles: true }));
            });

            const getDockSystem = () => {
                const API = (
                    window as Window & {
                        API?: {
                            dock?: {
                                getDockPreferences?: () => DockPreferencesShape;
                                updateDockPreferences?: (
                                    preferences: Partial<DockPreferencesShape>
                                ) => DockPreferencesShape;
                            };
                        };
                    }
                ).API;
                const DockSystem = (
                    window as Window & {
                        DockSystem?: {
                            getDockPreferences?: () => DockPreferencesShape;
                            updateDockPreferences?: (
                                preferences: Partial<DockPreferencesShape>
                            ) => DockPreferencesShape;
                        };
                    }
                ).DockSystem;

                return {
                    getDockPreferences:
                        API?.dock?.getDockPreferences || DockSystem?.getDockPreferences,
                    updateDockPreferences:
                        API?.dock?.updateDockPreferences || DockSystem?.updateDockPreferences,
                };
            };

            const dockSizeRange = this.container.querySelector<HTMLInputElement>(
                '[data-settings-dock-size]'
            );
            const dockSizeValue = this.container.querySelector<HTMLOutputElement>(
                '[data-settings-dock-size-value]'
            );
            const dockMagnificationRange = this.container.querySelector<HTMLInputElement>(
                '[data-settings-dock-magnification]'
            );
            const dockMagnificationValue = this.container.querySelector<HTMLOutputElement>(
                '[data-settings-dock-magnification-value]'
            );
            const dockPositionSelect = this.container.querySelector<HTMLSelectElement>(
                '[data-settings-dock-position]'
            );
            const dockMinimizeEffectSelect = this.container.querySelector<HTMLSelectElement>(
                '[data-settings-dock-minimize-effect]'
            );
            const dockTitlebarDoubleClickSelect = this.container.querySelector<HTMLSelectElement>(
                '[data-settings-dock-titlebar-double-click]'
            );
            const dockMinimizeToAppIcon = this.container.querySelector<HTMLInputElement>(
                '[data-settings-dock-minimize-to-app-icon]'
            );
            const dockAutoHide = this.container.querySelector<HTMLInputElement>(
                '[data-settings-dock-auto-hide]'
            );
            const dockAnimateOpening = this.container.querySelector<HTMLInputElement>(
                '[data-settings-dock-animate-opening]'
            );
            const dockShowIndicators = this.container.querySelector<HTMLInputElement>(
                '[data-settings-dock-show-indicators]'
            );
            const dockShowRecents = this.container.querySelector<HTMLInputElement>(
                '[data-settings-dock-show-recents]'
            );

            const renderDockSizeValue = (value: number) => {
                if (!dockSizeValue) return;
                const px = Math.round(48 + (value / 100) * 32);
                dockSizeValue.value = `${px} px`;
                dockSizeValue.textContent = `${px} px`;
            };

            const renderDockMagnificationValue = (value: number) => {
                if (!dockMagnificationValue) return;
                const label =
                    value <= 0
                        ? this.translateLabel('settingsPage.desktopDock.off', 'Aus')
                        : `${value}%`;
                dockMagnificationValue.value = label;
                dockMagnificationValue.textContent = label;
            };

            const updateDockPreference = (preferences: Partial<DockPreferencesShape>) => {
                const dockSystem = getDockSystem();
                if (typeof dockSystem.updateDockPreferences === 'function') {
                    dockSystem.updateDockPreferences(preferences);
                }
            };

            dockSizeRange?.addEventListener('input', () => {
                const value = Number.parseInt(dockSizeRange.value, 10);
                if (!Number.isFinite(value)) return;
                renderDockSizeValue(value);
            });
            dockSizeRange?.addEventListener('change', () => {
                const value = Number.parseInt(dockSizeRange.value, 10);
                if (!Number.isFinite(value)) return;
                updateDockPreference({ size: value });
                renderDockSizeValue(value);
            });

            dockMagnificationRange?.addEventListener('input', () => {
                const value = Number.parseInt(dockMagnificationRange.value, 10);
                if (!Number.isFinite(value)) return;
                renderDockMagnificationValue(value);
            });
            dockMagnificationRange?.addEventListener('change', () => {
                const value = Number.parseInt(dockMagnificationRange.value, 10);
                if (!Number.isFinite(value)) return;
                updateDockPreference({ magnification: value });
                renderDockMagnificationValue(value);
            });

            dockPositionSelect?.addEventListener('change', () => {
                updateDockPreference({
                    position: dockPositionSelect.value as DockPreferencesShape['position'],
                });
            });

            dockMinimizeEffectSelect?.addEventListener('change', () => {
                updateDockPreference({
                    minimizeEffect:
                        dockMinimizeEffectSelect.value as DockPreferencesShape['minimizeEffect'],
                });
            });

            dockTitlebarDoubleClickSelect?.addEventListener('change', () => {
                updateDockPreference({
                    titlebarDoubleClickAction:
                        dockTitlebarDoubleClickSelect.value as DockPreferencesShape['titlebarDoubleClickAction'],
                });
            });

            dockMinimizeToAppIcon?.addEventListener('change', () => {
                updateDockPreference({
                    minimizeWindowsIntoAppIcon: dockMinimizeToAppIcon.checked,
                });
            });

            dockAutoHide?.addEventListener('change', () => {
                updateDockPreference({ autoHide: dockAutoHide.checked });
            });

            dockAnimateOpening?.addEventListener('change', () => {
                updateDockPreference({ animateOpeningApps: dockAnimateOpening.checked });
            });

            dockShowIndicators?.addEventListener('change', () => {
                updateDockPreference({ showOpenIndicators: dockShowIndicators.checked });
            });

            dockShowRecents?.addEventListener('change', () => {
                updateDockPreference({ showRecentApps: dockShowRecents.checked });
            });
        },

        /**
         * Sync theme preference from global state
         */
        syncThemePreference(): void {
            if (!this.container) return;

            let preference = 'system';
            const API = (window as Window & { API?: { theme?: { getThemePreference(): string } } })
                .API;
            const ThemeSystem = (
                window as Window & { ThemeSystem?: { getThemePreference(): string } }
            ).ThemeSystem;

            if (API?.theme?.getThemePreference) {
                preference = API.theme.getThemePreference();
            } else if (ThemeSystem?.getThemePreference) {
                preference = ThemeSystem.getThemePreference();
            }

            const themeRadios = this.container.querySelectorAll<HTMLInputElement>(
                'input[name="theme-mode"]'
            );
            themeRadios.forEach(radio => {
                radio.checked = radio.value === preference;
            });
        },

        syncUIModePreference(): void {
            if (!this.container) return;

            let preference: 'auto' | 'desktop' | 'mobile' = 'auto';
            const API = (
                window as Window & {
                    API?: {
                        uiMode?: {
                            getUIModePreference(): 'auto' | 'desktop' | 'mobile';
                        };
                    };
                }
            ).API;
            const UiModeSystem = (
                window as Window & {
                    UiModeSystem?: {
                        getUIModePreference(): 'auto' | 'desktop' | 'mobile';
                    };
                }
            ).UiModeSystem;

            if (API?.uiMode?.getUIModePreference) {
                preference = API.uiMode.getUIModePreference();
            } else if (UiModeSystem?.getUIModePreference) {
                preference = UiModeSystem.getUIModePreference();
            }

            const uiModeRadios = this.container.querySelectorAll<HTMLInputElement>(
                'input[name="ui-mode-preference"]'
            );
            uiModeRadios.forEach(radio => {
                radio.checked = radio.value === preference;
            });
        },

        syncIconThemePreference(): void {
            if (!this.container) return;

            let preference: 'emoji' | 'custom' = 'custom';
            const API = (
                window as Window & {
                    API?: { iconTheme?: { getProgramIconTheme(): 'emoji' | 'custom' } };
                }
            ).API;
            const IconThemeSystem = (
                window as Window & {
                    IconThemeSystem?: { getProgramIconTheme(): 'emoji' | 'custom' };
                }
            ).IconThemeSystem;

            if (API?.iconTheme?.getProgramIconTheme) {
                preference = API.iconTheme.getProgramIconTheme();
            } else if (IconThemeSystem?.getProgramIconTheme) {
                preference = IconThemeSystem.getProgramIconTheme();
            }

            const iconThemeRadios = this.container.querySelectorAll<HTMLInputElement>(
                'input[name="icon-theme"]'
            );
            iconThemeRadios.forEach(radio => {
                radio.checked = radio.value === preference;
            });
        },

        /**
         * Sync language preference from global state
         */
        syncLanguagePreference(): void {
            if (!this.container) return;

            let preference = 'system';
            const API = (
                window as Window & { API?: { i18n?: { getLanguagePreference(): string } } }
            ).API;
            const appI18n = (window as Window & { appI18n?: { getLanguagePreference(): string } })
                .appI18n;

            if (API?.i18n?.getLanguagePreference) {
                preference = API.i18n.getLanguagePreference();
            } else if (appI18n?.getLanguagePreference) {
                preference = appI18n.getLanguagePreference();
            }

            const languageRadios = this.container.querySelectorAll<HTMLInputElement>(
                'input[name="language-preference"]'
            );
            languageRadios.forEach(radio => {
                radio.checked = radio.value === preference;
            });

            this.syncDisplayScalePreference();
            this.updateNavigationChrome();
        },

        syncDisplayScalePreference(): void {
            if (!this.container) return;

            let scalePreference = 1;
            const API = (
                window as Window & {
                    API?: { display?: { getDisplayScalePreference(): number } };
                }
            ).API;
            const ThemeSystem = (
                window as Window & {
                    ThemeSystem?: { getDisplayScalePreference(): number };
                }
            ).ThemeSystem;

            if (API?.display?.getDisplayScalePreference) {
                scalePreference = API.display.getDisplayScalePreference();
            } else if (ThemeSystem?.getDisplayScalePreference) {
                scalePreference = ThemeSystem.getDisplayScalePreference();
            }

            const scalePercent = Math.max(70, Math.min(130, Math.round(scalePreference * 100)));
            const displayScaleRange = this.container.querySelector<HTMLInputElement>(
                '[data-settings-display-scale-range]'
            );
            const displayScaleValue = this.container.querySelector<HTMLOutputElement>(
                '[data-settings-display-scale-value]'
            );
            const displayScaleRecommendationValue = this.container.querySelector<HTMLElement>(
                '[data-settings-display-scale-recommendation-value]'
            );
            const displayScaleRecommendation = this.container.querySelector<HTMLElement>(
                '.settings-scale-recommendation'
            );
            const displayScaleApplyRecommendation = this.container.querySelector<HTMLButtonElement>(
                '[data-settings-display-scale-apply]'
            );
            const recommendedScalePercent = (() => {
                const apiRecommended = API?.display?.getRecommendedDisplayScale;
                const themeRecommended = ThemeSystem?.getRecommendedDisplayScale;
                const recommendedScale = apiRecommended
                    ? apiRecommended()
                    : themeRecommended
                      ? themeRecommended()
                      : 1;
                return Math.max(70, Math.min(130, Math.round(recommendedScale * 100)));
            })();

            if (displayScaleRange) {
                displayScaleRange.value = String(scalePercent);
            }
            if (displayScaleValue) {
                displayScaleValue.value = `${scalePercent}%`;
                displayScaleValue.textContent = `${scalePercent}%`;
            }
            if (displayScaleRecommendationValue) {
                displayScaleRecommendationValue.textContent = `${recommendedScalePercent}%`;
            }
            if (displayScaleRecommendation) {
                displayScaleRecommendation.classList.toggle(
                    'hidden',
                    scalePercent === recommendedScalePercent
                );
            }
            if (displayScaleApplyRecommendation) {
                displayScaleApplyRecommendation.disabled = false;
                displayScaleApplyRecommendation.textContent = this.translateLabel(
                    'settingsPage.display.scale.applyRecommendation',
                    'Empfehlung übernehmen'
                );
            }
        },

        syncDockPreferences(): void {
            if (!this.container) return;

            const API = (
                window as Window & {
                    API?: { dock?: { getDockPreferences?: () => DockPreferencesShape } };
                }
            ).API;
            const DockSystem = (
                window as Window & {
                    DockSystem?: { getDockPreferences?: () => DockPreferencesShape };
                }
            ).DockSystem;

            const preferences =
                API?.dock?.getDockPreferences?.() || DockSystem?.getDockPreferences?.();
            if (!preferences) return;

            const dockSizeRange = this.container.querySelector<HTMLInputElement>(
                '[data-settings-dock-size]'
            );
            const dockSizeValue = this.container.querySelector<HTMLOutputElement>(
                '[data-settings-dock-size-value]'
            );
            const dockMagnificationRange = this.container.querySelector<HTMLInputElement>(
                '[data-settings-dock-magnification]'
            );
            const dockMagnificationValue = this.container.querySelector<HTMLOutputElement>(
                '[data-settings-dock-magnification-value]'
            );
            const dockPositionSelect = this.container.querySelector<HTMLSelectElement>(
                '[data-settings-dock-position]'
            );
            const dockMinimizeEffectSelect = this.container.querySelector<HTMLSelectElement>(
                '[data-settings-dock-minimize-effect]'
            );
            const dockTitlebarDoubleClickSelect = this.container.querySelector<HTMLSelectElement>(
                '[data-settings-dock-titlebar-double-click]'
            );
            const dockMinimizeToAppIcon = this.container.querySelector<HTMLInputElement>(
                '[data-settings-dock-minimize-to-app-icon]'
            );
            const dockAutoHide = this.container.querySelector<HTMLInputElement>(
                '[data-settings-dock-auto-hide]'
            );
            const dockAnimateOpening = this.container.querySelector<HTMLInputElement>(
                '[data-settings-dock-animate-opening]'
            );
            const dockShowIndicators = this.container.querySelector<HTMLInputElement>(
                '[data-settings-dock-show-indicators]'
            );
            const dockShowRecents = this.container.querySelector<HTMLInputElement>(
                '[data-settings-dock-show-recents]'
            );

            const sizePx = Math.round(48 + (preferences.size / 100) * 32);
            const magnificationLabel =
                preferences.magnification <= 0
                    ? this.translateLabel('settingsPage.desktopDock.off', 'Aus')
                    : `${preferences.magnification}%`;

            if (dockSizeRange) dockSizeRange.value = String(preferences.size);
            if (dockSizeValue) {
                dockSizeValue.value = `${sizePx} px`;
                dockSizeValue.textContent = `${sizePx} px`;
            }
            if (dockMagnificationRange) {
                dockMagnificationRange.value = String(preferences.magnification);
            }
            if (dockMagnificationValue) {
                dockMagnificationValue.value = magnificationLabel;
                dockMagnificationValue.textContent = magnificationLabel;
            }
            if (dockPositionSelect) dockPositionSelect.value = preferences.position;
            if (dockMinimizeEffectSelect) {
                dockMinimizeEffectSelect.value = preferences.minimizeEffect;
            }
            if (dockTitlebarDoubleClickSelect) {
                dockTitlebarDoubleClickSelect.value = preferences.titlebarDoubleClickAction;
            }
            if (dockMinimizeToAppIcon) {
                dockMinimizeToAppIcon.checked = preferences.minimizeWindowsIntoAppIcon;
            }
            if (dockAutoHide) dockAutoHide.checked = preferences.autoHide;
            if (dockAnimateOpening) {
                dockAnimateOpening.checked = preferences.animateOpeningApps;
            }
            if (dockShowIndicators) {
                dockShowIndicators.checked = preferences.showOpenIndicators;
            }
            if (dockShowRecents) dockShowRecents.checked = preferences.showRecentApps;
        },

        syncWifiNetworkList(): void {
            const systemUI = (
                window as Window & {
                    SystemUI?: { renderWifiNetworks(): void; updateAllSystemStatusUI(): void };
                }
            ).SystemUI;
            if (systemUI?.renderWifiNetworks) {
                systemUI.renderWifiNetworks();
                systemUI.updateAllSystemStatusUI?.();
            }
        },

        syncBluetoothDeviceList(): void {
            const systemUI = (
                window as Window & {
                    SystemUI?: { updateAllSystemStatusUI(): void };
                }
            ).SystemUI;
            systemUI?.updateAllSystemStatusUI?.();
        },

        syncGeneralInfoDetails(): void {
            if (!this.container) return;

            const browserAgentTarget = this.container.querySelector<HTMLElement>(
                '[data-settings-info-field="browser-user-agent"]'
            );
            const viewportTarget = this.container.querySelector<HTMLElement>(
                '[data-settings-info-field="browser-viewport"]'
            );

            if (browserAgentTarget) {
                browserAgentTarget.textContent = navigator.userAgent || 'Nicht verfügbar';
            }

            if (viewportTarget) {
                viewportTarget.textContent = `${window.innerWidth} x ${window.innerHeight}`;
            }
        },

        async fetchLatestGithubCommit(): Promise<void> {
            if (!this.container) return;

            const commitDayTarget = this.container.querySelector<HTMLElement>(
                '[data-settings-info-field="github-commit-day"]'
            );
            const commitIdTarget = this.container.querySelector<HTMLElement>(
                '[data-settings-info-field="github-commit-id"]'
            );
            const githubCard = this.container.querySelector<HTMLElement>(
                '[data-github-owner][data-github-repo]'
            );

            const owner = githubCard?.getAttribute('data-github-owner') || '';
            const repo = githubCard?.getAttribute('data-github-repo') || '';
            if (!owner || !repo) {
                if (commitDayTarget) commitDayTarget.textContent = 'Nicht konfiguriert';
                if (commitIdTarget) commitIdTarget.textContent = 'Nicht konfiguriert';
                return;
            }

            const commitUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=1`;
            const githubApi = (
                window as Window & {
                    GitHubAPI?: {
                        fetchJSON?: <T = unknown>(url: string) => Promise<T>;
                    };
                }
            ).GitHubAPI;

            try {
                let commitResponse: GitHubCommitResponse;
                if (githubApi?.fetchJSON) {
                    commitResponse = await githubApi.fetchJSON<GitHubCommitResponse>(commitUrl);
                } else {
                    const response = await fetch(commitUrl, {
                        headers: { Accept: 'application/vnd.github.v3+json' },
                    });
                    if (!response.ok) {
                        throw new Error(`GitHub API error: ${response.status}`);
                    }
                    commitResponse = (await response.json()) as GitHubCommitResponse;
                }

                const latestCommit = commitResponse[0];
                const commitSha = latestCommit?.sha || '';
                const commitDateRaw = latestCommit?.commit?.author?.date || '';

                const commitDate = commitDateRaw ? new Date(commitDateRaw) : null;
                const commitDateLabel =
                    commitDate && !Number.isNaN(commitDate.getTime())
                        ? commitDate.toLocaleDateString('de-DE', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                          })
                        : 'Nicht verfügbar';

                if (commitDayTarget) {
                    commitDayTarget.textContent = commitDateLabel;
                }
                if (commitIdTarget) {
                    commitIdTarget.textContent = commitSha
                        ? commitSha.slice(0, 8)
                        : 'Nicht verfügbar';
                }
            } catch (error) {
                logger.warn('APP', '[Settings] Konnte letzten GitHub-Commit nicht laden:', error);
                if (commitDayTarget) commitDayTarget.textContent = 'Nicht verfügbar';
                if (commitIdTarget) commitIdTarget.textContent = 'Nicht verfügbar';
            }
        },

        /**
         * Show specific settings section
         */
        showSection(section: SectionName, options?: { pushHistory?: boolean }): void {
            if (!this.container) return;

            const shouldPush = options?.pushHistory !== false;

            if (shouldPush) {
                const historyCurrent = this.sectionHistory[this.historyIndex];
                if (historyCurrent !== section) {
                    this.sectionHistory = this.sectionHistory.slice(0, this.historyIndex + 1);
                    this.sectionHistory.push(section);
                    this.historyIndex = this.sectionHistory.length - 1;
                }
            }

            this.currentSection = section;

            // Hide all sections
            const sections: SectionName[] = [
                'wifi',
                'bluetooth',
                'general',
                'general-info',
                'desktop-dock',
                'display',
                'language',
            ];
            sections.forEach(name => {
                const el = this.container?.querySelector(`#settings-${name}`);
                if (el) {
                    el.classList.add('hidden');
                }
            });

            // Show target section
            const target = this.container.querySelector(`#settings-${section}`);
            if (target) {
                target.classList.remove('hidden');
            }

            if (section === 'wifi') {
                this.syncWifiNetworkList();
            } else if (section === 'bluetooth') {
                this.syncBluetoothDeviceList();
            } else if (section === 'general-info') {
                this.syncGeneralInfoDetails();
                void this.fetchLatestGithubCommit();
            }

            // Update nav highlighting
            const activeSidebarPage = this.resolveSidebarPage(section);
            const navItems = this.container.querySelectorAll<HTMLElement>(
                '.settings-nav-item[data-action="settings:showSection"][data-settings-page]'
            );
            navItems.forEach(item => {
                const itemPage = item.getAttribute('data-settings-page');
                if (itemPage === activeSidebarPage) {
                    item.classList.add('settings-nav-item--active');
                } else {
                    item.classList.remove('settings-nav-item--active');
                }
            });

            this.updateNavigationChrome();
        },

        getSectionTitle(section: SectionName): { key: string; fallback: string } {
            switch (section) {
                case 'wifi':
                    return { key: 'settingsPage.wifi.title', fallback: 'WLAN' };
                case 'bluetooth':
                    return { key: 'settingsPage.bluetooth.title', fallback: 'Bluetooth' };
                case 'general-info':
                    return { key: 'settingsPage.general.infoTitle', fallback: 'Info' };
                case 'desktop-dock':
                    return {
                        key: 'settingsPage.desktopDock.title',
                        fallback: 'Schreibtisch & Dock',
                    };
                case 'display':
                    return { key: 'settingsPage.nav.display', fallback: 'Darstellung' };
                case 'language':
                    return { key: 'settingsPage.nav.language', fallback: 'Sprache' };
                case 'general':
                default:
                    return { key: 'settingsPage.general.title', fallback: 'Allgemein' };
            }
        },

        translateLabel(key: string, fallback: string): string {
            const API = (
                window as Window & {
                    API?: { i18n?: { translate(key: string, fallback?: string): string } };
                }
            ).API;
            if (API?.i18n?.translate) {
                return API.i18n.translate(key, fallback);
            }

            const appI18n = (
                window as Window & {
                    appI18n?: { translate(key: string, fallback?: string): string };
                }
            ).appI18n;
            if (appI18n?.translate) {
                return appI18n.translate(key, fallback);
            }

            return fallback;
        },

        resolveSidebarPage(
            section: SectionName
        ): 'wifi' | 'bluetooth' | 'general' | 'desktop-dock' | 'display' | 'language' {
            switch (section) {
                case 'wifi':
                    return 'wifi';
                case 'bluetooth':
                    return 'bluetooth';
                case 'desktop-dock':
                    return 'desktop-dock';
                case 'display':
                    return 'display';
                case 'language':
                    return 'language';
                case 'general':
                case 'general-info':
                    return 'general';
            }
        },

        navigateHistory(direction: 'back' | 'forward'): void {
            if (direction === 'back') {
                if (this.historyIndex <= 0) return;
                this.historyIndex -= 1;
            } else {
                if (this.historyIndex >= this.sectionHistory.length - 1) return;
                this.historyIndex += 1;
            }

            const targetSection = this.sectionHistory[this.historyIndex];
            if (targetSection === undefined) return;
            this.showSection(targetSection, { pushHistory: false });
        },

        updateNavigationChrome(): void {
            if (!this.container) return;

            const backBtn = this.container.querySelector<HTMLButtonElement>(
                '[data-settings-nav="back"]'
            );
            const forwardBtn = this.container.querySelector<HTMLButtonElement>(
                '[data-settings-nav="forward"]'
            );

            const canGoBack = this.historyIndex > 0;
            const canGoForward = this.historyIndex < this.sectionHistory.length - 1;

            if (backBtn) {
                backBtn.disabled = !canGoBack;
                backBtn.setAttribute('aria-disabled', String(!canGoBack));
            }

            if (forwardBtn) {
                forwardBtn.disabled = !canGoForward;
                forwardBtn.setAttribute('aria-disabled', String(!canGoForward));
            }

            const titleTarget = this.container.querySelector<HTMLElement>(
                '[data-settings-current-title]'
            );

            if (titleTarget) {
                const { key, fallback } = this.getSectionTitle(this.currentSection);
                titleTarget.setAttribute('data-i18n', key);
                titleTarget.textContent = this.translateLabel(key, fallback);
            }
        },

        /**
         * Destroy settings module
         */
        destroy(): void {
            if (this.container) {
                this.container.innerHTML = '';
                this.container = null;
            }
        },
    };

    // Export to global scope
    (window as unknown as Window & { SettingsSystem: SettingsSystemType }).SettingsSystem =
        SettingsSystem;

    // Auto-init if container exists on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const container = document.getElementById('settings-container');
            if (container) {
                SettingsSystem.init(container);
            }
        });
    } else {
        const container = document.getElementById('settings-container');
        if (container) {
            SettingsSystem.init(container);
        }
    }

    window.addEventListener('themePreferenceChange', () => {
        SettingsSystem.syncThemePreference();
    });
    window.addEventListener('uiModePreferenceChange', () => {
        SettingsSystem.syncUIModePreference();
    });
    window.addEventListener('uiModeEffectiveChange', () => {
        SettingsSystem.syncUIModePreference();
    });
    window.addEventListener('iconThemeChange', () => {
        SettingsSystem.syncIconThemePreference();
    });
    window.addEventListener('languagePreferenceChange', () => {
        SettingsSystem.syncLanguagePreference();
    });
    window.addEventListener('displayScalePreferenceChange', () => {
        SettingsSystem.syncDisplayScalePreference();
    });
    window.addEventListener('dockPreferenceChange', () => {
        SettingsSystem.syncDockPreferences();
    });
})();

export {};
