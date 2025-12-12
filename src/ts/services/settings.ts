/**
 * settings.ts
 * Settings Module - Inline settings UI with theme and language preferences
 */

console.log('Settings Module loaded');

(() => {
    'use strict';

    // ===== Types =====

    type SectionName = 'general' | 'display' | 'language';

    interface SettingsSystemType {
        currentSection: SectionName;
        container: HTMLElement | null;
        init(containerOrId: HTMLElement | string): void;
        render(): void;
        attachListeners(): void;
        syncThemePreference(): void;
        syncLanguagePreference(): void;
        showSection(section: SectionName): void;
        destroy(): void;
    }

    // ===== Settings System Implementation =====

    const SettingsSystem: SettingsSystemType = {
        currentSection: 'general',
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
                console.error('Settings container not found:', containerOrId);
                return;
            }

            this.container = container;
            this.render();
            this.attachListeners();
            this.syncThemePreference();
            this.syncLanguagePreference();
            this.showSection('general');
        },

        /**
         * Render settings UI
         */
        render(): void {
            if (!this.container) return;

            this.container.innerHTML = `
                <div class="flex dialog-content settings-panel rounded-b-xl overflow-hidden h-full">
                    <!-- Linke Seitenleiste -->
                    <div class="w-48 bg-gray-100 dark:bg-gray-700 p-4 space-y-1 overflow-auto">
                        <button type="button" class="w-full text-left cursor-pointer px-2 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded no-select"
                            data-action="settings:showSection"
                            data-section="general"
                            data-settings-page="general"
                            data-i18n="settingsPage.nav.general">
                            👤 Allgemein
                        </button>
                        <button type="button" class="w-full text-left cursor-pointer px-2 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded no-select"
                            data-action="settings:showSection"
                            data-section="display"
                            data-settings-page="display"
                            data-i18n="settingsPage.nav.display">
                            🖥️ Darstellung
                        </button>
                        <button type="button" class="w-full text-left cursor-pointer px-2 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded no-select"
                            data-action="settings:showSection"
                            data-section="language"
                            data-settings-page="language"
                            data-i18n="settingsPage.nav.language">
                            🌐 Sprache
                        </button>
                    </div>
                    <!-- Rechte Hauptansicht -->
                    <div class="flex-1 p-6 overflow-auto text-gray-800 dark:text-gray-200">
                        <!-- Sektion: Allgemein -->
                        <div id="settings-general" class="">
                            <div class="flex flex-col items-start text-gray-700 dark:text-gray-200 mt-8 w-full space-y-4">
                                <img src="./img/profil.jpg" alt="Bild" class="w-24 h-24 object-contain mb-2">
                                <h2 class="text-xl font-semibold" data-i18n="settingsPage.general.name">Marvin Temmen</h2>
                                <p class="text-sm" data-i18n="settingsPage.general.birth">März 1999</p>
                                <div class="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 w-full grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8">
                                    <div class="text-gray-600 dark:text-gray-300" data-i18n="settingsPage.general.locationLabel">Wohnort</div>
                                    <div class="text-gray-800 dark:text-gray-100" data-i18n="settingsPage.general.locationValue">Deutschland</div>
                                    <div class="text-gray-600 dark:text-gray-300" data-i18n="settingsPage.general.jobLabel">Beruf</div>
                                    <div class="text-gray-800 dark:text-gray-100" data-i18n="settingsPage.general.jobValue">Softwareentwickler</div>
                                </div>
                            </div>
                        </div>
                        <!-- Sektion: Darstellung -->
                        <div id="settings-display" class="hidden">
                            <div class="flex flex-col gap-6 mt-4 w-full">
                                <div>
                                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100"
                                        data-i18n="settingsPage.display.title">Darstellung</h2>
                                    <p class="text-sm text-gray-600 dark:text-gray-300 mt-1"
                                        data-i18n="settingsPage.display.description">
                                        Passe das visuelle Erscheinungsbild der Oberfläche an.
                                    </p>
                                </div>
                                <fieldset class="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                                    <legend class="text-sm font-medium text-gray-700 dark:text-gray-200 px-1"
                                        data-i18n="settingsPage.display.legend">Darkmode</legend>
                                    <label class="flex items-center gap-3 cursor-pointer select-none">
                                        <input type="radio" name="theme-mode" value="system" class="h-4 w-4 text-blue-600 focus:ring-blue-500">
                                        <div>
                                            <span class="block text-sm font-medium text-gray-800 dark:text-gray-100"
                                                data-i18n="settingsPage.display.options.system.label">System</span>
                                            <span class="block text-xs text-gray-600 dark:text-gray-300"
                                                data-i18n="settingsPage.display.options.system.description">Folgt den aktuellen Systemeinstellungen.</span>
                                        </div>
                                    </label>
                                    <label class="flex items-center gap-3 cursor-pointer select-none">
                                        <input type="radio" name="theme-mode" value="light" class="h-4 w-4 text-blue-600 focus:ring-blue-500">
                                        <div>
                                            <span class="block text-sm font-medium text-gray-800 dark:text-gray-100"
                                                data-i18n="settingsPage.display.options.light.label">Hell</span>
                                            <span class="block text-xs text-gray-600 dark:text-gray-300"
                                                data-i18n="settingsPage.display.options.light.description">Bleibt immer im hellen Erscheinungsbild.</span>
                                        </div>
                                    </label>
                                    <label class="flex items-center gap-3 cursor-pointer select-none">
                                        <input type="radio" name="theme-mode" value="dark" class="h-4 w-4 text-blue-600 focus:ring-blue-500">
                                        <div>
                                            <span class="block text-sm font-medium text-gray-800 dark:text-gray-100"
                                                data-i18n="settingsPage.display.options.dark.label">Dunkel</span>
                                            <span class="block text-xs text-gray-600 dark:text-gray-300"
                                                data-i18n="settingsPage.display.options.dark.description">Bleibt immer im dunklen Erscheinungsbild.</span>
                                        </div>
                                    </label>
                                </fieldset>
                            </div>
                        </div>
                        <!-- Sektion: Sprache -->
                        <div id="settings-language" class="hidden">
                            <div class="flex flex-col gap-6 mt-4 w-full">
                                <div>
                                    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100"
                                        data-i18n="settingsPage.language.title">Sprache</h2>
                                    <p class="text-sm text-gray-600 dark:text-gray-300 mt-1"
                                        data-i18n="settingsPage.language.description">
                                        Wähle, in welcher Sprache die Oberfläche angezeigt wird.
                                    </p>
                                </div>
                                <fieldset class="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                                    <legend class="text-sm font-medium text-gray-700 dark:text-gray-200 px-1"
                                        data-i18n="settingsPage.language.legend">Bevorzugte Sprache</legend>
                                    <label class="flex items-center gap-3 cursor-pointer select-none">
                                        <input type="radio" name="language-preference" value="system"
                                            class="h-4 w-4 text-blue-600 focus:ring-blue-500">
                                        <div>
                                            <span class="block text-sm font-medium text-gray-800 dark:text-gray-100"
                                                data-i18n="settingsPage.language.options.system.label">System</span>
                                            <span class="block text-xs text-gray-600 dark:text-gray-300"
                                                data-i18n="settingsPage.language.options.system.description">Verwendet automatisch die Sprache deines Systems.</span>
                                        </div>
                                    </label>
                                    <label class="flex items-center gap-3 cursor-pointer select-none">
                                        <input type="radio" name="language-preference" value="de"
                                            class="h-4 w-4 text-blue-600 focus:ring-blue-500">
                                        <div>
                                            <span class="block text-sm font-medium text-gray-800 dark:text-gray-100"
                                                data-i18n="settingsPage.language.options.de.label">Deutsch</span>
                                            <span class="block text-xs text-gray-600 dark:text-gray-300"
                                                data-i18n="settingsPage.language.options.de.description">Zeigt Inhalte immer auf Deutsch.</span>
                                        </div>
                                    </label>
                                    <label class="flex items-center gap-3 cursor-pointer select-none">
                                        <input type="radio" name="language-preference" value="en"
                                            class="h-4 w-4 text-blue-600 focus:ring-blue-500">
                                        <div>
                                            <span class="block text-sm font-medium text-gray-800 dark:text-gray-100"
                                                data-i18n="settingsPage.language.options.en.label">Englisch</span>
                                            <span class="block text-xs text-gray-600 dark:text-gray-300"
                                                data-i18n="settingsPage.language.options.en.description">Zeigt Inhalte immer auf Englisch.</span>
                                        </div>
                                    </label>
                                </fieldset>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Apply i18n translations
            const appI18n = (window as Window & { appI18n?: { applyTranslations(el: HTMLElement): void } }).appI18n;
            if (appI18n?.applyTranslations) {
                appI18n.applyTranslations(this.container);
            }
        },

        /**
         * Attach event listeners
         */
        attachListeners(): void {
            if (!this.container) return;

            // Theme preference change listeners
            const themeRadios = this.container.querySelectorAll<HTMLInputElement>('input[name="theme-mode"]');
            themeRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (!radio.checked) return;

                    const theme = radio.value;
                    // Call global API if available
                    const API = (window as Window & { API?: { theme?: { setThemePreference(mode: string): void } } }).API;
                    if (API?.theme?.setThemePreference) {
                        API.theme.setThemePreference(theme);
                    } else {
                        // Fallback to ThemeSystem
                        const ThemeSystem = (window as Window & { ThemeSystem?: { setThemePreference(mode: string): void } }).ThemeSystem;
                        if (ThemeSystem?.setThemePreference) {
                            ThemeSystem.setThemePreference(theme);
                        }
                    }
                });
            });

            // Language preference change listeners
            const languageRadios = this.container.querySelectorAll<HTMLInputElement>('input[name="language-preference"]');
            languageRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (!radio.checked) return;

                    const lang = radio.value;
                    // Call global API if available
                    const API = (window as Window & { API?: { i18n?: { setLanguagePreference(lang: string): void } } }).API;
                    if (API?.i18n?.setLanguagePreference) {
                        API.i18n.setLanguagePreference(lang);
                    } else {
                        // Fallback to appI18n
                        const appI18n = (window as Window & { appI18n?: { setLanguagePreference(lang: string): void } }).appI18n;
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
            const API = (window as Window & { API?: { theme?: { getThemePreference(): string } } }).API;
            const ThemeSystem = (window as Window & { ThemeSystem?: { getThemePreference(): string } }).ThemeSystem;

            if (API?.theme?.getThemePreference) {
                preference = API.theme.getThemePreference();
            } else if (ThemeSystem?.getThemePreference) {
                preference = ThemeSystem.getThemePreference();
            }

            const themeRadios = this.container.querySelectorAll<HTMLInputElement>('input[name="theme-mode"]');
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
            const API = (window as Window & { API?: { i18n?: { getLanguagePreference(): string } } }).API;
            const appI18n = (window as Window & { appI18n?: { getLanguagePreference(): string } }).appI18n;

            if (API?.i18n?.getLanguagePreference) {
                preference = API.i18n.getLanguagePreference();
            } else if (appI18n?.getLanguagePreference) {
                preference = appI18n.getLanguagePreference();
            }

            const languageRadios = this.container.querySelectorAll<HTMLInputElement>('input[name="language-preference"]');
            languageRadios.forEach(radio => {
                radio.checked = radio.value === preference;
            });
        },

        /**
         * Show specific settings section
         */
        showSection(section: SectionName): void {
            if (!this.container) return;

            this.currentSection = section;

            // Hide all sections
            const sections: SectionName[] = ['general', 'display', 'language'];
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
            const navItems = this.container.querySelectorAll('[data-action="settings:showSection"]');
            navItems.forEach(item => {
                const itemSection = item.getAttribute('data-section');
                if (itemSection === section) {
                    item.classList.add(
                        'bg-white',
                        'dark:bg-gray-600',
                        'text-gray-900',
                        'dark:text-gray-100',
                        'font-medium'
                    );
                } else {
                    item.classList.remove(
                        'bg-white',
                        'dark:bg-gray-600',
                        'text-gray-900',
                        'dark:text-gray-100',
                        'font-medium'
                    );
                }
            });
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
    (window as Window & { SettingsSystem: SettingsSystemType }).SettingsSystem = SettingsSystem;

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
