import logger from '../core/logger.js';
/**
 * settings.ts
 * Settings Module - Inline settings UI with theme and language preferences
 */

logger.debug('APP', 'Settings Module loaded');

(() => {
    'use strict';

    // ===== Types =====

    type SectionName = 'general' | 'general-info' | 'display' | 'language';

    interface SettingsSystemType {
        currentSection: SectionName;
        sectionHistory: SectionName[];
        historyIndex: number;
        container: HTMLElement | null;
        init(containerOrId: HTMLElement | string): void;
        render(): void;
        attachListeners(): void;
        syncThemePreference(): void;
        syncLanguagePreference(): void;
        showSection(section: SectionName, options?: { pushHistory?: boolean }): void;
        getSectionTitle(section: SectionName): { key: string; fallback: string };
        translateLabel(key: string, fallback: string): string;
        resolveSidebarPage(section: SectionName): 'general' | 'display' | 'language';
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
            this.syncLanguagePreference();
            this.showSection('general', { pushHistory: false });
        },

        /**
         * Render settings UI
         */
        render(): void {
            if (!this.container) return;

            this.container.innerHTML = `
                <div class="settings-app">
                    <aside class="settings-sidebar-shell" aria-label="Settings Navigation" data-i18n-aria-label="settingsPage.sidebar.ariaLabel">
                        <div class="settings-sidebar-panel">
                            <div class="settings-sidebar-top draggable-header">
                                <div class="settings-window-controls">
                                    <button
                                        title="Schließen"
                                        data-i18n-title="common.close"
                                        id="close-settings-modal"
                                        data-action="closeWindow"
                                        data-window-id="settings-modal"
                                        class="settings-window-control settings-window-control--close finder-no-drag"
                                    ></button>
                                    <button
                                        type="button"
                                        class="settings-window-control settings-window-control--minimize bg-yellow-500 rounded-full"
                                        aria-label="Minimieren"
                                        title="Minimieren"
                                    ></button>
                                    <button
                                        type="button"
                                        class="settings-window-control settings-window-control--maximize bg-green-500 rounded-full"
                                        aria-label="Maximieren"
                                        title="Maximieren"
                                    ></button>
                                </div>
                            </div>
                            <div class="settings-sidebar">
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

                                <button type="button" class="settings-nav-item" data-action="settings:showSection" data-section="general" data-settings-page="general">
                                    <span class="settings-nav-icon" aria-hidden="true">⚙️</span>
                                    <span class="settings-nav-title" data-i18n="settingsPage.nav.general">Allgemein</span>
                                </button>
                                <button type="button" class="settings-nav-item" data-action="settings:showSection" data-section="display" data-settings-page="display">
                                    <span class="settings-nav-icon" aria-hidden="true">🖥️</span>
                                    <span class="settings-nav-title" data-i18n="settingsPage.nav.display">Darstellung</span>
                                </button>
                                <button type="button" class="settings-nav-item" data-action="settings:showSection" data-section="language" data-settings-page="language">
                                    <span class="settings-nav-icon" aria-hidden="true">🌐</span>
                                    <span class="settings-nav-title" data-i18n="settingsPage.nav.language">Sprache</span>
                                </button>
                            </div>
                        </div>
                    </aside>

                    <main class="settings-main-shell">
                        <div class="settings-content-topbar draggable-header">
                            <div class="settings-content-nav" role="group" aria-label="Navigation">
                                <button type="button" class="settings-content-nav-btn" data-settings-nav="back" data-dialog-action="navigate-back" aria-label="Zurück" title="Zurück">‹</button>
                                <button type="button" class="settings-content-nav-btn" data-settings-nav="forward" data-dialog-action="navigate-forward" aria-label="Vorwärts" title="Vorwärts">›</button>
                            </div>
                            <h2 class="settings-content-title" data-settings-current-title data-i18n="settingsPage.general.title">Allgemein</h2>
                        </div>

                        <div class="settings-main">
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
                                <p class="settings-device-subtitle" data-i18n="settingsPage.general.jobValue">Softwareentwickler</p>
                            </div>

                            <div class="settings-info-card">
                                <div class="settings-info-row">
                                    <span class="settings-info-key" data-i18n="settingsPage.general.roleLabel">Rolle</span>
                                    <span class="settings-info-value" data-i18n="settingsPage.general.jobValue">Softwareentwickler</span>
                                </div>
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
                        </section>

                        <section id="settings-display" class="settings-section hidden">

                            <fieldset class="settings-option-card">
                                <legend class="settings-option-legend" data-i18n="settingsPage.display.legend">Darkmode</legend>
                                <label class="settings-radio-row">
                                    <input type="radio" name="theme-mode" value="system" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.display.options.system.label">System</span>
                                        <span class="settings-radio-description" data-i18n="settingsPage.display.options.system.description">Folgt den aktuellen Systemeinstellungen.</span>
                                    </span>
                                </label>
                                <label class="settings-radio-row">
                                    <input type="radio" name="theme-mode" value="light" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.display.options.light.label">Hell</span>
                                        <span class="settings-radio-description" data-i18n="settingsPage.display.options.light.description">Bleibt immer im hellen Erscheinungsbild.</span>
                                    </span>
                                </label>
                                <label class="settings-radio-row">
                                    <input type="radio" name="theme-mode" value="dark" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.display.options.dark.label">Dunkel</span>
                                        <span class="settings-radio-description" data-i18n="settingsPage.display.options.dark.description">Bleibt immer im dunklen Erscheinungsbild.</span>
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
                                        <span class="settings-radio-title" data-i18n="settingsPage.language.options.system.label">System</span>
                                        <span class="settings-radio-description" data-i18n="settingsPage.language.options.system.description">Verwendet automatisch die Sprache deines Systems.</span>
                                    </span>
                                </label>
                                <label class="settings-radio-row">
                                    <input type="radio" name="language-preference" value="de" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.language.options.de.label">Deutsch</span>
                                        <span class="settings-radio-description" data-i18n="settingsPage.language.options.de.description">Zeigt Inhalte immer auf Deutsch.</span>
                                    </span>
                                </label>
                                <label class="settings-radio-row">
                                    <input type="radio" name="language-preference" value="en" class="settings-radio-input" />
                                    <span class="settings-radio-copy">
                                        <span class="settings-radio-title" data-i18n="settingsPage.language.options.en.label">Englisch</span>
                                        <span class="settings-radio-description" data-i18n="settingsPage.language.options.en.description">Zeigt Inhalte immer auf Englisch.</span>
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

            this.updateNavigationChrome();
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
            const sections: SectionName[] = ['general', 'general-info', 'display', 'language'];
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
                case 'general-info':
                    return { key: 'settingsPage.general.infoTitle', fallback: 'Info' };
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

        resolveSidebarPage(section: SectionName): 'general' | 'display' | 'language' {
            switch (section) {
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
})();

export {};
