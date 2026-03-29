/**
 * MenuRegistry
 * Zentrale Registry für App-spezifische Menü-Contributions.
 * Ermöglicht, dass Apps (Finder, Terminal, TextEditor, etc.) ihre eigenen Menü-Abschnitte
 * registrieren können, ohne dass menu.ts diese hardcoden muss.
 *
 * DESIGN:
 * - menu.ts bleibt schlank und liefert nur globale/OS-ähnliche Menüs (File/Quit, Edit, Window, Help)
 * - Jede App (FinderWindow, TerminalWindow, etc.) registriert ihre Menü-Beitrag via MenuRegistry.register()
 * - Bei renderApplicationMenu() wird dynamisch abgefragt, welche Menus für die aktive App gelten
 *
 * TIMING:
 * - MenuRegistry wird während App-Init aufgerufen (z.B. in FinderWindow.create() oder app-init.ts)
 * - Keine Race Conditions, da Registration vor renderApplicationMenu() passiert
 */

export interface MenuSection {
    id: string;
    label: string | (() => string);
    items: MenuItemDefinition[];
}

export interface MenuItemDefinition {
    id?: string;
    label?: string | (() => string);
    shortcut?: string | (() => string);
    icon?: string;
    disabled?: boolean | (() => boolean);
    action?: () => void;
    href?: string;
    external?: boolean;
    checked?: boolean;
    title?: string;
    submenu?: boolean;
    submenuItems?: MenuItemDefinition[];
    type?: 'separator';
    trailingText?: string;
    onClick?: (e: Event) => boolean | void;
}

export type MenuBuilder = () => MenuSection[];

class MenuRegistry {
    private contributions = new Map<string, MenuBuilder>();

    /**
     * Registriert Menü-Contributions für einen App-Typ.
     * @param appType z.B. 'finder', 'terminal', 'text-editor', 'photos'
     * @param builder Funktion, die die MenuSections zurückgibt
     */
    register(appType: string, builder: MenuBuilder) {
        if (typeof builder !== 'function') {
            console.warn(`MenuRegistry.register(${appType}): builder ist nicht vom Typ 'function'`);
            return;
        }
        this.contributions.set(appType, builder);
    }

    /**
     * Gibt die Menü-Contributions für einen App-Typ zurück.
     * @param appType z.B. 'finder', 'terminal'
     * @returns Leeres Array, wenn keine Contributions registriert sind
     */
    getMenusForAppType(appType: string | undefined): MenuSection[] {
        if (!appType) return [];
        const builder = this.contributions.get(appType);
        if (!builder || typeof builder !== 'function') return [];

        try {
            const result = builder();
            return Array.isArray(result) ? result : [];
        } catch (e) {
            console.error(`MenuRegistry.getMenusForAppType(${appType}): builder threw an error`, e);
            return [];
        }
    }

    /**
     * Löscht die Registrierung für einen App-Typ (für Testing/Cleanup).
     */
    unregister(appType: string) {
        this.contributions.delete(appType);
    }

    /**
     * Löscht ALLE Registrierungen (für Testing/Cleanup).
     */
    clear() {
        this.contributions.clear();
    }

    /**
     * Gibt DEBUG-Info über alle registrierten App-Typen.
     */
    debug(): string[] {
        return Array.from(this.contributions.keys());
    }
}

// Globale Instanz
const menuRegistry = new MenuRegistry();

// Auch auf window exportieren für global access in Menu-Rendering-Code
declare global {
    interface Window {
        MenuRegistry?: MenuRegistry;
    }
}

if (!window.MenuRegistry) {
    window.MenuRegistry = menuRegistry;
}

export default menuRegistry;
