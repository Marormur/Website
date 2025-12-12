// Minimal global declarations to reduce noise during TS migration
// Add more precise types as modules are migrated.

export {};

declare global {
    interface Window {
        // Instance managers (unknown to encourage explicit casts where used)
        TerminalInstanceManager?: any;
        TextEditorInstanceManager?: any;
        InstanceManager?: any;

        // Systems
        FinderSystem?: any;
        SettingsSystem?: any;
        TerminalSystem?: any;
        DockSystem?: any;
        WindowChrome?: any;
        SessionManager?: any;
        KeyboardShortcuts?: any;

        // Dialog and WindowManager
        Dialog?: any;
        WindowManager?: any;

        // Demo helpers attached to window by legacy scripts
        demoCreateTerminals?: () => void;

        // E2E hook
        __APP_READY?: boolean;

        // Generic stores
        dialogs?: Record<string, any>;
    }
}
// Placeholder globals file kept intentionally empty to avoid conflicting ambient declarations
// During migration we prefer targeted guards and existing types under /types
export {};
