(function () {
    if (window.appI18n) {
        return;
    }

    const LANGUAGE_PREFERENCE_KEY = 'languagePreference';
    const SUPPORTED_LANGUAGES = ['de', 'en'];
    const LANGUAGE_OPTIONS = ['system', ...SUPPORTED_LANGUAGES];
    const FALLBACK_LANGUAGE = 'en';

    const translations = {
        de: {
            context: {
                menuLabel: 'Kontextmenü',
                open: 'Öffnen',
                openFinder: 'Finder öffnen',
                openTextEditor: 'Texteditor öffnen',
                openProjects: 'Projekte öffnen',
                openSettings: 'Systemeinstellungen …',
                toggleDarkMode: 'Dark Mode umschalten',
                about: 'Über Marvin',
                image: {
                    openInTab: 'Bild in neuem Tab öffnen',
                    save: 'Bild sichern …',
                },
                finder: {
                    openItem: 'Öffnen',
                    getInfo: 'Informationen',
                    refresh: 'Aktualisieren',
                    newFolder: 'Neuer Ordner',
                    viewList: 'Als Liste',
                    viewGrid: 'Als Raster',
                    sortByName: 'Nach Name sortieren',
                    sortByDate: 'Nach Datum sortieren',
                    sortBySize: 'Nach Größe sortieren',
                },
            },
            common: {
                close: 'Schließen',
                system: 'System',
                german: 'Deutsch',
                english: 'Englisch',
            },
            header: {
                profile: {
                    about: 'Über Marvin',
                    resetLayout: 'Fenster zurücksetzen',
                    settings: 'Systemeinstellungen',
                    linkedin: 'LinkedIn',
                },
                program: {
                    close: 'Programm schließen',
                },
            },
            desktop: {
                finder: 'Sucher',
                projects: 'Projekte',
                github: 'GitHub Projekte',
                text: 'Texteditor',
                image: 'Bildbetrachter',
                settings: 'Systemeinstellungen',
                about: 'Über Marvin',
                launchpad: 'Launchpad',
                terminal: 'Terminal',
            },
            dock: {
                finder: 'Sucher',
                projects: 'GitHub Projekte',
                text: 'Texteditor',
                image: 'Bildbetrachter',
                settings: 'Systemeinstellungen',
                launchpad: 'Apps',
                terminal: 'Terminal',
            },
            menubar: {
                appleMenu: {
                    label: 'Apple-Menü',
                },
                applicationMenus: 'Anwendungsmenüs',
                controlCenter: {
                    label: 'Kontrollzentrum',
                    quickActions: 'Schnellaktionen',
                    quickActionsAria: 'Schnellaktionen',
                    brightness: 'Helligkeit',
                    volume: 'Lautstärke',
                },
                toggles: {
                    wifi: 'WLAN',
                    wifiStatus: 'WLAN-Status',
                    bluetooth: 'Bluetooth',
                    bluetoothStatus: 'Bluetooth-Status',
                    focus: 'Fokus',
                    darkMode: 'Dark Mode',
                },
                wifi: {
                    preferredNetworks: 'Bevorzugte Netzwerke',
                },
                bluetooth: {
                    devices: 'Geräte',
                    airpods: 'Marvins AirPods Pro',
                    keyboard: 'Magic Keyboard',
                    speaker: 'HomeSpeaker',
                },
                sound: {
                    label: 'Ton',
                    outputDevices: 'Ausgabegeräte',
                    devices: {
                        speakers: 'MacBook Lautsprecher',
                        airpods: 'Marvins AirPods Pro',
                        display: 'Samsung Monitor',
                    },
                },
                networks: {
                    home: 'HomeLAN',
                    office: 'Office',
                    hotspot: 'Marvin iPhone',
                },
                state: {
                    on: 'Ein',
                    off: 'Aus',
                    active: 'Aktiv',
                    connected: 'Verbunden',
                    ready: 'Bereit',
                    notConnected: 'Nicht verbunden',
                    hotspot: 'Persönlicher Hotspot',
                    automatic: 'Automatisch',
                },
                actions: {
                    networkSettings: 'Netzwerkeinstellungen …',
                    bluetoothSettings: 'Bluetooth-Einstellungen …',
                    soundSettings: 'Ton-Einstellungen …',
                    spotlight: 'Spotlight',
                    siri: 'Siri',
                },
                battery: {
                    label: 'Batteriestatus',
                    fullLabel: 'Batterie vollständig geladen',
                },
            },
            modals: {
                projects: {
                    title: 'Projekte',
                    repositories: 'Repositories',
                    placeholder: 'Wähle ein Repository aus, um dessen Dateien zu sehen.',
                },
                about: {
                    title: 'Über Marvin',
                    birth: 'März 1999',
                    locationLabel: 'Wohnort',
                    locationValue: 'Deutschland',
                    jobLabel: 'Beruf',
                    jobValue: 'Softwareentwickler',
                    employerLabel: 'Arbeitgeber',
                    employerValue: 'WinWorker',
                    moreButton: 'Mehr Infos …',
                    copyright: '© 2025 Marvin T. — Alle Rechte vorbehalten.',
                },
                settings: {
                    title: 'Systemeinstellungen',
                },
                text: {
                    title: 'Texteditor',
                },
                image: {
                    title: 'Bildbetrachter',
                    placeholder: 'Öffne eine Bilddatei aus dem Sucher, um die Vorschau zu sehen.',
                },
                finder: {
                    title: 'Sucher',
                },
                programInfo: {
                    title: 'Über dieses Programm',
                },
                launchpad: {
                    title: 'Launchpad',
                    searchPlaceholder: 'Programme suchen',
                },
                terminal: {
                    title: 'Terminal',
                },
            },
            finder: {
                // Toolbar
                toolbar: {
                    back: 'Zurück',
                    forward: 'Vorwärts',
                    listView: 'Listenansicht',
                    gridView: 'Rasteransicht',
                    search: 'Suchen',
                },
                // Sidebar
                sidebar: {
                    favorites: 'Favoriten',
                    computer: 'Computer',
                    recent: 'Zuletzt verwendet',
                    locations: 'Orte',
                    github: 'GitHub Projekte',
                    starred: 'Markiert',
                },
                back: 'Zurück',
                imageViewer: 'Bildbetrachter',
                textEditor: 'Texteditor',
                loadingFiles: 'Dateien werden geladen …',
                filesLoadError:
                    'Dateien konnten nicht geladen werden. Bitte versuche es später erneut.',
                emptyDirectory: 'Keine Dateien in diesem Verzeichnis.',
                noRepositories: 'Keine öffentlichen Repositories gefunden.',
                repositoriesError:
                    'Repos konnten nicht geladen werden. Bitte versuche es später erneut.',
                repoDescriptionMissing: 'Keine Beschreibung verfügbar.',
                repoUnnamed: 'Unbenanntes Repository',
                loadingImage: '{name} wird geladen …',
                imageLoadError: 'Bild konnte nicht geladen werden.',
                imageLoadErrorRetry:
                    'Das Bild konnte nicht geladen werden. Bitte versuche es später erneut.',
                fileLoadError: 'Die Datei konnte nicht geladen werden.',
                rateLimit: 'GitHub Rate Limit erreicht. Bitte versuche es später erneut.',
                pathNotFound: 'Der ausgewählte Pfad ist nicht mehr verfügbar.',
            },
            programs: {
                default: {
                    label: 'Sucher',
                    infoLabel: 'Über Sucher',
                    about: {
                        name: 'Sucher',
                        tagline: 'Dein persönlicher Dateimanager.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. Alle Rechte vorbehalten.',
                    },
                },
                finder: {
                    label: 'Sucher',
                    infoLabel: 'Über Sucher',
                    about: {
                        name: 'Sucher',
                        tagline: 'Der innovative Desktop-Dateimanager.',
                        version: 'Version 2.0',
                        copyright: '© Marvin Temmen. Alle Rechte vorbehalten.',
                    },
                },
                projects: {
                    label: 'GitHub Projekte',
                    infoLabel: 'Über GitHub Projekte',
                    about: {
                        name: 'GitHub Projekte',
                        tagline: 'Durchsuche deine GitHub-Repositories.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. Alle Rechte vorbehalten.',
                    },
                },
                settings: {
                    label: 'Systemeinstellungen',
                    infoLabel: 'Über Systemeinstellungen',
                    about: {
                        name: 'Systemeinstellungen',
                        tagline: 'Konfiguriere Erscheinungsbild, Accounts und mehr.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. Alle Rechte vorbehalten.',
                    },
                },
                text: {
                    label: 'Texteditor',
                    infoLabel: 'Über Texteditor',
                    about: {
                        name: 'Texteditor',
                        tagline: 'Leichtgewichtiger Editor für deine Notizen.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. Alle Rechte vorbehalten.',
                    },
                },
                image: {
                    label: 'Bildanzeige',
                    infoLabel: 'Über Bildanzeige',
                    about: {
                        name: 'Bildanzeige',
                        tagline: 'Betrachte Screenshots und Fotos mit Vorschau.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. Alle Rechte vorbehalten.',
                    },
                },
                about: {
                    label: 'Über Marvin',
                    infoLabel: 'Über dieses Fenster',
                    about: {
                        name: 'Über Marvin',
                        tagline: 'Erfahre mehr über Marvin Temmen.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. Alle Rechte vorbehalten.',
                    },
                },
                launchpad: {
                    label: 'Launchpad',
                    infoLabel: 'Über Launchpad',
                    about: {
                        name: 'Launchpad',
                        tagline: 'Starte alle deine Programme.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. Alle Rechte vorbehalten.',
                    },
                },
                terminal: {
                    label: 'Terminal',
                    infoLabel: 'Über Terminal',
                    about: {
                        name: 'Terminal',
                        tagline: 'Kommandozeilenschnittstelle für das Portfolio.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. Alle Rechte vorbehalten.',
                    },
                },
            },
            // Hinweis: Zusätzliche Finder-Schlüssel sind mit dem oberen finder-Block zusammengeführt
            textEditor: {
                title: 'Texteditor',
                documentTitle: 'Texteditor',
                documentTitleWithFile: 'Texteditor – {fileName}',
                toolbar: {
                    bold: 'Fett',
                    italic: 'Kursiv',
                    underline: 'Unterstrichen',
                    strikeThrough: 'Durchgestrichen',
                    heading1: 'Überschrift 1',
                    heading2: 'Überschrift 2',
                    heading3: 'Überschrift 3',
                    unorderedList: 'Aufzählungsliste',
                    orderedList: 'Nummerierte Liste',
                    alignLeft: 'Linksbündig',
                    alignCenter: 'Zentriert',
                    alignRight: 'Rechtsbündig',
                    insertLink: 'Link einfügen',
                    findReplace: 'Suchen & Ersetzen',
                    undo: 'Rückgängig',
                    redo: 'Wiederholen',
                    clear: 'Neu',
                    open: 'Öffnen',
                    save: 'Speichern',
                },
                findReplace: {
                    find: 'Suchen...',
                    replace: 'Ersetzen...',
                    next: 'Weiter',
                    replaceOne: 'Ersetzen',
                    replaceAll: 'Alle ersetzen',
                    close: 'Schließen',
                    noMatch: 'Keine Übereinstimmung gefunden',
                    replacedCount: '{count} Vorkommen ersetzt',
                },
                status: {
                    loading: 'Lade Datei …',
                    loadingWithLabel: '{label} (lädt …)',
                    loadError: 'Datei konnte nicht geladen werden.',
                    rateLimit: 'GitHub Rate Limit erreicht. Bitte versuche es später erneut.',
                    wordCount: 'Wörter: {words} | Zeichen: {chars}',
                    position: 'Zeile {line}, Spalte {col}',
                },
            },
            menu: {
                sections: {
                    file: 'Ablage',
                    edit: 'Bearbeiten',
                    view: 'Darstellung',
                    window: 'Fenster',
                    help: 'Hilfe',
                },
                finder: {
                    newWindow: 'Neues Finder-Fenster',
                    reload: 'Finder neu laden',
                    close: 'Fenster schließen',
                    help: 'Sucher-Hilfe anzeigen',
                },
                settings: {
                    close: 'Fenster schließen',
                    help: 'Einstellungs-Hilfe anzeigen',
                },
                text: {
                    newFile: 'Neu',
                    open: 'Öffnen …',
                    save: 'Speichern',
                    undo: 'Rückgängig',
                    redo: 'Wiederholen',
                    cut: 'Ausschneiden',
                    copy: 'Kopieren',
                    paste: 'Einfügen',
                    selectAll: 'Alles auswählen',
                    toggleWrap: 'Zeilenumbruch umschalten',
                    help: 'Texteditor-Hilfe anzeigen',
                },
                image: {
                    openInTab: 'Bild in neuem Tab öffnen',
                    saveImage: 'Bild sichern …',
                    close: 'Fenster schließen',
                    help: 'Bildbetrachter-Hilfe anzeigen',
                },
                terminal: {
                    newWindow: 'Neues Terminal-Fenster',
                    clear: 'Terminal löschen',
                    close: 'Fenster schließen',
                    help: 'Terminal-Hilfe anzeigen',
                },
                about: {
                    close: 'Fenster schließen',
                    help: 'Über Marvin',
                },
                programInfo: {
                    close: 'Fenster schließen',
                },
                window: {
                    minimize: 'Minimieren',
                    zoom: 'Zoomen',
                    bringToFront: 'Alle nach vorne bringen',
                    close: 'Fenster schließen',
                    closeAll: 'Alle schließen',
                    newInstance: 'Neue Instanz',
                    newFinder: 'Neuer Finder',
                    newTerminal: 'Neues Terminal',
                    newEditor: 'Neuer Editor',
                    closeAllConfirm: 'Alle {count} {type}-Instanzen schließen?',
                },
                help: {
                    showHelp: 'Programmhilfe anzeigen',
                },
            },
            settingsPage: {
                title: 'Einstellungen',
                nav: {
                    general: '👤 Allgemein',
                    display: '🖥️ Darstellung',
                    language: '🌐 Sprache',
                },
                general: {
                    title: 'Allgemein',
                    name: 'Marvin Temmen',
                    birth: 'März 1999',
                    locationLabel: 'Wohnort',
                    locationValue: 'Deutschland',
                    jobLabel: 'Beruf',
                    jobValue: 'Softwareentwickler',
                    employerLabel: 'Arbeitgeber',
                    employerValue: 'WinWorker',
                    copyright: '© 2025 Marvin T. — Alle Rechte vorbehalten.',
                },
                display: {
                    title: 'Darstellungsoptionen',
                    description: 'Passe an, wie der Desktop mit hellem und dunklem Design umgeht.',
                    legend: 'Darkmode',
                    options: {
                        system: {
                            label: 'System',
                            description: 'Folgt den aktuellen Systemeinstellungen.',
                        },
                        light: {
                            label: 'Hell',
                            description: 'Bleibt immer im hellen Erscheinungsbild.',
                        },
                        dark: {
                            label: 'Dunkel',
                            description: 'Bleibt immer im dunklen Erscheinungsbild.',
                        },
                    },
                },
                language: {
                    title: 'Sprache',
                    description: 'Wähle, in welcher Sprache die Oberfläche angezeigt wird.',
                    legend: 'Bevorzugte Sprache',
                    options: {
                        system: {
                            label: 'System',
                            description: 'Verwendet automatisch die Sprache deines Systems.',
                        },
                        de: {
                            label: 'Deutsch',
                            description: 'Zeigt Inhalte immer auf Deutsch.',
                        },
                        en: {
                            label: 'Englisch',
                            description: 'Zeigt Inhalte immer auf Englisch.',
                        },
                    },
                },
            },
            projectsPage: {
                title: 'Meine GitHub Projekte',
                empty: 'Keine öffentlichen Repositories gefunden.',
                repoUnnamed: 'Unbenanntes Repository',
                noDescription: 'Keine Beschreibung verfügbar.',
                error: 'Repos konnten nicht geladen werden. Bitte versuche es später erneut.',
            },
        },
        en: {
            context: {
                menuLabel: 'Context menu',
                open: 'Open',
                openFinder: 'Open Finder',
                openTextEditor: 'Open Text editor',
                openProjects: 'Open Projects',
                openSettings: 'System settings…',
                toggleDarkMode: 'Toggle dark mode',
                about: 'About Marvin',
                image: {
                    openInTab: 'Open image in new tab',
                    save: 'Save image…',
                },
                finder: {
                    openItem: 'Open',
                    getInfo: 'Get Info',
                    refresh: 'Refresh',
                    newFolder: 'New Folder',
                    viewList: 'View as List',
                    viewGrid: 'View as Grid',
                    sortByName: 'Sort by Name',
                    sortByDate: 'Sort by Date',
                    sortBySize: 'Sort by Size',
                },
            },
            common: {
                close: 'Close',
                system: 'System',
                german: 'German',
                english: 'English',
            },
            header: {
                profile: {
                    about: 'About Marvin',
                    resetLayout: 'Reset windows',
                    settings: 'System settings',
                    linkedin: 'LinkedIn',
                },
                program: {
                    close: 'Close program',
                },
            },
            desktop: {
                finder: 'Finder',
                projects: 'Projects',
                github: 'GitHub Projects',
                text: 'Text editor',
                image: 'Image viewer',
                settings: 'System settings',
                about: 'About Marvin',
                launchpad: 'Launchpad',
                terminal: 'Terminal',
            },
            dock: {
                finder: 'Finder',
                projects: 'GitHub Projects',
                text: 'Text editor',
                image: 'Image viewer',
                settings: 'System settings',
                launchpad: 'Apps',
                terminal: 'Terminal',
            },
            menubar: {
                appleMenu: {
                    label: 'Apple menu',
                },
                applicationMenus: 'Application menus',
                controlCenter: {
                    label: 'Control Center',
                    quickActions: 'Quick Actions',
                    quickActionsAria: 'Quick Actions',
                    brightness: 'Brightness',
                    volume: 'Volume',
                },
                toggles: {
                    wifi: 'Wi-Fi',
                    wifiStatus: 'Wi-Fi status',
                    bluetooth: 'Bluetooth',
                    bluetoothStatus: 'Bluetooth status',
                    focus: 'Focus mode',
                    darkMode: 'Dark mode',
                },
                wifi: {
                    preferredNetworks: 'Preferred networks',
                },
                bluetooth: {
                    devices: 'Devices',
                    airpods: "Marvin's AirPods Pro",
                    keyboard: 'Magic Keyboard',
                    speaker: 'HomeSpeaker',
                },
                sound: {
                    label: 'Sound',
                    outputDevices: 'Output devices',
                    devices: {
                        speakers: 'MacBook speakers',
                        airpods: "Marvin's AirPods Pro",
                        display: 'External display',
                    },
                },
                networks: {
                    home: 'HomeLAN',
                    office: 'Office',
                    hotspot: "Marvin's iPhone",
                },
                state: {
                    on: 'On',
                    off: 'Off',
                    active: 'Active',
                    connected: 'Connected',
                    ready: 'Ready',
                    notConnected: 'Not connected',
                    hotspot: 'Personal hotspot',
                    automatic: 'Automatic',
                },
                actions: {
                    networkSettings: 'Network settings…',
                    bluetoothSettings: 'Bluetooth settings…',
                    soundSettings: 'Sound settings…',
                    spotlight: 'Spotlight',
                    siri: 'Siri',
                },
                battery: {
                    label: 'Battery status',
                    fullLabel: 'Battery fully charged',
                },
            },
            modals: {
                projects: {
                    title: 'Projects',
                    repositories: 'Repositories',
                    placeholder: 'Select a repository to browse its files.',
                },
                about: {
                    title: 'About Marvin',
                    birth: 'March 1999',
                    locationLabel: 'Location',
                    locationValue: 'Germany',
                    jobLabel: 'Occupation',
                    jobValue: 'Software engineer',
                    employerLabel: 'Employer',
                    employerValue: 'WinWorker',
                    moreButton: 'More details…',
                    copyright: '© 2025 Marvin T. — All rights reserved.',
                },
                settings: {
                    title: 'System settings',
                },
                text: {
                    title: 'Text editor',
                },
                image: {
                    title: 'Image viewer',
                    placeholder: 'Open an image file from Finder to preview it.',
                },
                finder: {
                    title: 'Finder',
                },
                programInfo: {
                    title: 'About this app',
                },
                launchpad: {
                    title: 'Launchpad',
                    searchPlaceholder: 'Search apps',
                },
                terminal: {
                    title: 'Terminal',
                },
            },
            programs: {
                default: {
                    label: 'Finder',
                    infoLabel: 'About Finder',
                    about: {
                        name: 'Finder',
                        tagline: 'Your personal file manager.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. All rights reserved.',
                    },
                },
                finder: {
                    label: 'Finder',
                    infoLabel: 'About Finder',
                    about: {
                        name: 'Finder',
                        tagline: 'The innovative desktop file manager.',
                        version: 'Version 2.0',
                        copyright: '© Marvin Temmen. All rights reserved.',
                    },
                },
                projects: {
                    label: 'GitHub Projects',
                    infoLabel: 'About GitHub Projects',
                    about: {
                        name: 'GitHub Projects',
                        tagline: 'Browse your GitHub repositories.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. All rights reserved.',
                    },
                },
                settings: {
                    label: 'System settings',
                    infoLabel: 'About System settings',
                    about: {
                        name: 'System settings',
                        tagline: 'Configure appearance, accounts, and more.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. All rights reserved.',
                    },
                },
                text: {
                    label: 'Text editor',
                    infoLabel: 'About Text editor',
                    about: {
                        name: 'Text editor',
                        tagline: 'Lightweight editor for your notes.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. All rights reserved.',
                    },
                },
                image: {
                    label: 'Image viewer',
                    infoLabel: 'About Image viewer',
                    about: {
                        name: 'Image viewer',
                        tagline: 'Preview screenshots and photos with ease.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. All rights reserved.',
                    },
                },
                about: {
                    label: 'About Marvin',
                    infoLabel: 'About this window',
                    about: {
                        name: 'About Marvin',
                        tagline: 'Learn more about Marvin Temmen.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. All rights reserved.',
                    },
                },
                launchpad: {
                    label: 'Launchpad',
                    infoLabel: 'About Launchpad',
                    about: {
                        name: 'Launchpad',
                        tagline: 'Launch all your apps.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. All rights reserved.',
                    },
                },
                terminal: {
                    label: 'Terminal',
                    infoLabel: 'About Terminal',
                    about: {
                        name: 'Terminal',
                        tagline: 'Command-line interface for the portfolio.',
                        version: 'Version 1.0',
                        copyright: '© Marvin Temmen. All rights reserved.',
                    },
                },
            },
            finder: {
                // Toolbar
                toolbar: {
                    back: 'Back',
                    forward: 'Forward',
                    listView: 'List view',
                    gridView: 'Grid view',
                    search: 'Search',
                },
                // Sidebar
                sidebar: {
                    favorites: 'Favorites',
                    computer: 'Computer',
                    recent: 'Recent',
                    locations: 'Locations',
                    github: 'GitHub Projects',
                    starred: 'Starred',
                },
                back: 'Back',
                imageViewer: 'Image viewer',
                textEditor: 'Text editor',
                loadingFiles: 'Loading files…',
                filesLoadError: 'Files could not be loaded. Please try again later.',
                emptyDirectory: 'No files found in this directory.',
                noRepositories: 'No public repositories found.',
                repositoriesError: 'Repositories could not be loaded. Please try again later.',
                repoDescriptionMissing: 'No description available.',
                repoUnnamed: 'Untitled repository',
                loadingImage: 'Loading {name}…',
                imageLoadError: 'Could not load the image.',
                imageLoadErrorRetry: 'The image could not be loaded. Please try again later.',
                fileLoadError: 'The file could not be loaded. Please try again later.',
                rateLimit: 'GitHub rate limit reached. Please try again later.',
                pathNotFound: 'The selected path is no longer available.',
            },
            textEditor: {
                title: 'Text editor',
                documentTitle: 'Text editor',
                documentTitleWithFile: 'Text editor – {fileName}',
                toolbar: {
                    bold: 'Bold',
                    italic: 'Italic',
                    underline: 'Underline',
                    strikeThrough: 'Strikethrough',
                    heading1: 'Heading 1',
                    heading2: 'Heading 2',
                    heading3: 'Heading 3',
                    unorderedList: 'Bullet list',
                    orderedList: 'Numbered list',
                    alignLeft: 'Align left',
                    alignCenter: 'Center',
                    alignRight: 'Align right',
                    insertLink: 'Insert link',
                    findReplace: 'Find & Replace',
                    undo: 'Undo',
                    redo: 'Redo',
                    clear: 'New',
                    open: 'Open',
                    save: 'Save',
                },
                findReplace: {
                    find: 'Find...',
                    replace: 'Replace...',
                    next: 'Next',
                    replaceOne: 'Replace',
                    replaceAll: 'Replace all',
                    close: 'Close',
                    noMatch: 'No match found',
                    replacedCount: 'Replaced {count} occurrence(s)',
                },
                status: {
                    loading: 'Loading file…',
                    loadingWithLabel: '{label} (loading…)',
                    loadError: 'The file could not be loaded.',
                    rateLimit: 'GitHub rate limit was reached. Please try again later.',
                    wordCount: 'Words: {words} | Characters: {chars}',
                    position: 'Line {line}, Col {col}',
                },
            },
            menu: {
                sections: {
                    file: 'File',
                    edit: 'Edit',
                    view: 'View',
                    window: 'Window',
                    help: 'Help',
                },
                finder: {
                    newWindow: 'Create Finder Window',
                    reload: 'Reload Finder',
                    close: 'Close window',
                    help: 'Show Finder help',
                },
                settings: {
                    close: 'Close window',
                    help: 'Show settings help',
                },
                text: {
                    newFile: 'New',
                    open: 'Open…',
                    save: 'Save',
                    undo: 'Undo',
                    redo: 'Redo',
                    cut: 'Cut',
                    copy: 'Copy',
                    paste: 'Paste',
                    selectAll: 'Select all',
                    toggleWrap: 'Toggle line wrap',
                    help: 'Show text editor help',
                },
                image: {
                    openInTab: 'Open image in new tab',
                    saveImage: 'Save image…',
                    close: 'Close window',
                    help: 'Show image viewer help',
                },
                terminal: {
                    newWindow: 'New Terminal window',
                    clear: 'Clear Terminal',
                    close: 'Close window',
                    help: 'Show Terminal help',
                },
                about: {
                    close: 'Close window',
                    help: 'About Marvin',
                },
                programInfo: {
                    close: 'Close window',
                },
                window: {
                    minimize: 'Minimize',
                    zoom: 'Zoom',
                    bringToFront: 'Bring all to front',
                    close: 'Close window',
                    closeAll: 'Close All',
                    newInstance: 'New Instance',
                    newFinder: 'New Finder',
                    newTerminal: 'New Terminal',
                    newEditor: 'New Editor',
                    closeAllConfirm: 'Close all {count} {type} instances?',
                },
                help: {
                    showHelp: 'Show app help',
                },
            },
            settingsPage: {
                title: 'Settings',
                nav: {
                    general: '👤 General',
                    display: '🖥️ Appearance',
                    language: '🌐 Language',
                },
                general: {
                    title: 'General',
                    name: 'Marvin Temmen',
                    birth: 'March 1999',
                    locationLabel: 'Location',
                    locationValue: 'Germany',
                    jobLabel: 'Occupation',
                    jobValue: 'Software engineer',
                    employerLabel: 'Employer',
                    employerValue: 'WinWorker',
                    copyright: '© 2025 Marvin T. — All rights reserved.',
                },
                display: {
                    title: 'Appearance options',
                    description: 'Adjust how the desktop handles light and dark mode.',
                    legend: 'Dark mode',
                    options: {
                        system: {
                            label: 'System',
                            description: 'Follows the current system setting.',
                        },
                        light: {
                            label: 'Light',
                            description: 'Always stays in light appearance.',
                        },
                        dark: {
                            label: 'Dark',
                            description: 'Always stays in dark appearance.',
                        },
                    },
                },
                language: {
                    title: 'Language',
                    description: 'Choose which language the interface uses.',
                    legend: 'Preferred language',
                    options: {
                        system: {
                            label: 'System',
                            description: 'Automatically uses your system language.',
                        },
                        de: {
                            label: 'German',
                            description: 'Always display content in German.',
                        },
                        en: {
                            label: 'English',
                            description: 'Always display content in English.',
                        },
                    },
                },
            },
            projectsPage: {
                title: 'My GitHub projects',
                empty: 'No public repositories found.',
                repoUnnamed: 'Untitled repository',
                noDescription: 'No description available.',
                error: 'Repositories could not be loaded. Please try again later.',
            },
        },
    };

    function normalizeLanguage(input) {
        if (!input) return null;
        const value = String(input).trim().toLowerCase();
        if (!value) return null;
        const base = value.split(/[-_]/)[0];
        return SUPPORTED_LANGUAGES.includes(base) ? base : null;
    }

    function parsePreference(value) {
        if (value === null || value === undefined) return 'system';
        const normalized = String(value).trim();
        return LANGUAGE_OPTIONS.includes(normalized) ? normalized : 'system';
    }

    function getBrowserLanguages() {
        const langs = [];
        if (Array.isArray(navigator.languages)) {
            langs.push(...navigator.languages);
        }
        if (navigator.language) {
            langs.push(navigator.language);
        }
        if (navigator.userLanguage) {
            langs.push(navigator.userLanguage);
        }
        return langs.length ? langs : ['en'];
    }

    function detectSystemLanguage() {
        // Detect from the browser/OS preferences only (ignore current document lang to avoid sticky state)
        const candidates = getBrowserLanguages();
        for (const candidate of candidates) {
            const normalized = normalizeLanguage(candidate);
            if (normalized) {
                return normalized;
            }
        }
        return FALLBACK_LANGUAGE;
    }

    let languagePreference = parsePreference(localStorage.getItem(LANGUAGE_PREFERENCE_KEY));

    function resolveActiveLanguage(pref) {
        if (pref === 'system') {
            return detectSystemLanguage();
        }
        return SUPPORTED_LANGUAGES.includes(pref) ? pref : FALLBACK_LANGUAGE;
    }

    let activeLanguage = resolveActiveLanguage(languagePreference);

    function setDocumentLanguage(lang) {
        if (document && document.documentElement) {
            document.documentElement.lang = lang;
        }
    }

    function formatTemplate(template, params) {
        if (typeof template !== 'string') {
            return template;
        }
        if (!params || typeof params !== 'object') {
            return template;
        }
        return template.replace(/\{([^}]+)\}/g, (match, token) => {
            const key = token.trim();
            return Object.prototype.hasOwnProperty.call(params, key) ? params[key] : match;
        });
    }

    function resolveKey(lang, key) {
        const segments = key.split('.');
        let current = translations[lang];
        for (const segment of segments) {
            if (!current || typeof current !== 'object' || !(segment in current)) {
                return undefined;
            }
            current = current[segment];
        }
        return current;
    }

    function translate(key, params = {}, options = {}) {
        if (!key) return '';
        const lang = options.language || activeLanguage;
        let value = resolveKey(lang, key);
        if (value === undefined && lang !== FALLBACK_LANGUAGE) {
            value = resolveKey(FALLBACK_LANGUAGE, key);
        }
        if (value === undefined) {
            return options.fallback !== undefined ? options.fallback : key;
        }
        if (typeof value === 'string') {
            return formatTemplate(value, params);
        }
        return value;
    }

    function parseParams(element) {
        const paramsAttr = element.getAttribute('data-i18n-params');
        if (!paramsAttr) {
            return undefined;
        }
        try {
            return JSON.parse(paramsAttr);
        } catch (err) {
            console.warn('Could not parse data-i18n-params:', err);
            return undefined;
        }
    }

    function translateElement(element) {
        if (!(element instanceof Element)) {
            return;
        }
        const params = parseParams(element) || {};
        const textKey = element.getAttribute('data-i18n');
        if (textKey) {
            element.textContent = translate(textKey, params);
        }
        const htmlKey = element.getAttribute('data-i18n-html');
        if (htmlKey) {
            element.innerHTML = translate(htmlKey, params);
        }
        Array.from(element.attributes).forEach(attr => {
            if (!attr.name.startsWith('data-i18n-')) return;
            if (attr.name === 'data-i18n' || attr.name === 'data-i18n-html') return;
            const targetAttr = attr.name.substring('data-i18n-'.length);
            if (!targetAttr) return;
            element.setAttribute(targetAttr, translate(attr.value, params));
        });
    }

    function applyTranslations(root = document) {
        if (!root) return;
        const base = root === document ? document.documentElement : root;
        if (!base) return;
        translateElement(base);
        const elements = base.querySelectorAll('*');
        elements.forEach(translateElement);
    }

    function dispatchLanguageEvent() {
        const event = new CustomEvent('languagePreferenceChange', {
            detail: {
                preference: languagePreference,
                language: activeLanguage,
            },
        });
        window.dispatchEvent(event);
    }

    function refreshActiveLanguage(emitEvent = true) {
        const nextLanguage = resolveActiveLanguage(languagePreference);
        const languageChanged = nextLanguage !== activeLanguage;
        activeLanguage = nextLanguage;
        setDocumentLanguage(activeLanguage);
        applyTranslations(document);
        if (emitEvent || languageChanged) {
            dispatchLanguageEvent();
        }
    }

    function setLanguagePreference(pref) {
        const normalized = parsePreference(pref);
        if (normalized === languagePreference) {
            refreshActiveLanguage(true);
            return activeLanguage;
        }
        languagePreference = normalized;
        if (normalized === 'system') {
            localStorage.setItem(LANGUAGE_PREFERENCE_KEY, 'system');
        } else {
            localStorage.setItem(LANGUAGE_PREFERENCE_KEY, normalized);
        }
        refreshActiveLanguage(true);
        return activeLanguage;
    }

    window.addEventListener('languagechange', () => {
        if (languagePreference === 'system') {
            refreshActiveLanguage(true);
        }
    });

    window.addEventListener('storage', event => {
        if (event.key !== LANGUAGE_PREFERENCE_KEY) {
            return;
        }
        const newPreference = parsePreference(event.newValue);
        languagePreference = newPreference;
        refreshActiveLanguage(true);
    });

    setDocumentLanguage(activeLanguage);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => applyTranslations(document));
    } else {
        applyTranslations(document);
    }

    window.appI18n = {
        translate,
        applyTranslations,
        setLanguagePreference,
        getLanguagePreference: () => languagePreference,
        getActiveLanguage: () => activeLanguage,
        translations,
        supportedLanguages: SUPPORTED_LANGUAGES.slice(),
        languageOptions: LANGUAGE_OPTIONS.slice(),
    };
})();
